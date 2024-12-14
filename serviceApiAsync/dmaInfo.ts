import sqldb from '../srcCommon/db';
import * as devsLastComm from '../srcCommon/helpers/devsLastComm';
import { isTemporaryId } from '../srcCommon/helpers/devInfo';
import servConfig from '../configfile';
import { getAllowedUnitsView, getPermissionsOnUnit, getUserGlobalPermissions, canSeeDevicesWithoutProductionUnit } from '../srcCommon/helpers/permissionControl';
import { SessionData } from '../srcCommon/types';
import * as httpRouter from './apiServer/httpRouter';
import type { ApiParams, ApiResps } from './apiServer/httpRouter';
import { setGetDevInfo } from './devInfo'
import { sendDmaCommand_mode, sendDmaCommand_setLogicLevel } from '../srcCommon/iotMessages/devsCommands';
import { sendCommandToDeviceWithConfigTimezone } from '../srcCommon/helpers/timezones';

export type TRegDevRaw = ({
  DMA_ID?: string;
  DRI_ID?: string;
  UNIT_ID: number;
  CLIENT_ID: number;
  UNIT_NAME: string;
  STATE_NAME: string;
  STATE_ID: number;
  CITY_ID: string;
  CITY_NAME: string;
  CLIENT_NAME: string;
} | {
  DRI_ID?: string;
  DMA_ID?: string;
  VARSCFG: string;
  UNIT_ID: number;
  CLIENT_ID: number;
  UNIT_NAME: string;
  CITY_NAME: string;
  CLIENT_NAME: string;
  STATE_NAME: string;
  STATE_ID: number;
  CITY_ID: string;
})

export type TRegDev = ({
  DMA_ID: string;
  UNIT_ID: number;
  CLIENT_ID: number;
  UNIT_NAME: string;
  STATE_NAME: string;
  STATE_ID: number;
  CITY_ID: string;
  CITY_NAME: string;
  CLIENT_NAME: string;
} & {
  status: "ONLINE" | "OFFLINE" | "LATE";
  unComis: boolean;
}) | ({
  DRI_ID: string;
  VARSCFG: string;
  UNIT_ID: number;
  CLIENT_ID: number;
  UNIT_NAME: string;
  CITY_NAME: string;
  CLIENT_NAME: string;
  STATE_NAME: string;
  STATE_ID: number;
  CITY_ID: string;
} & {
  status: "ONLINE" | "OFFLINE" | "LATE";
  unComis: boolean;
})

export function ownershipFilterClientNComsNAssoc(reqParams: {
  clientId?: number,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitId?: number,
  unitIds?: number[],
  SKIP?: number,
  LIMIT?: number,
  searchText?: string,
  searchTerms?: string[],
  ownershipFilter?: string,
  INCLUDE_INSTALLATION_UNIT?: boolean,
}, regDevRaw: TRegDevRaw, manufacturers: number[], regDev: TRegDev) {
  if (reqParams.ownershipFilter === 'CLIENTS') {
    if (!(regDevRaw.CLIENT_ID && (regDevRaw.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(regDevRaw.CLIENT_ID))) return true;
  }
  else if (reqParams.ownershipFilter === 'N-COMIS') {
    if (!(regDev.unComis)) return true;
  }
  else if (reqParams.ownershipFilter === 'N-ASSOC') {
    if (!((!regDevRaw.CLIENT_ID) && (!regDev.unComis))) return true;
  }
  return false;
}

export function verifyOwnerShipFilter(reqParams: {
  clientId?: number,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitId?: number,
  unitIds?: number[],
  SKIP?: number,
  LIMIT?: number,
  searchText?: string,
  searchTerms?: string[],
  ownershipFilter?: string,
  INCLUDE_INSTALLATION_UNIT?: boolean,
}, regDevRaw: TRegDevRaw, manufacturers: number[], regDev: TRegDev) {
  if (reqParams.ownershipFilter) {
    if (ownershipFilterClientNComsNAssoc(reqParams, regDevRaw, manufacturers, regDev)) return true;
    else if (reqParams.ownershipFilter === 'MANUFAC') {
      if (!(regDevRaw.CLIENT_ID && manufacturers.includes(regDevRaw.CLIENT_ID))) return true;
    }
    else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
      if (!(regDevRaw.CLIENT_ID === servConfig.dielClientId)) return true;
    }
  }
  return false;
}

function verifyIncludeTermInSearchTerm(searchTerm : string, regDevRaw: TRegDevRaw, regDev: TRegDev) {
  if (regDevRaw.STATE_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDevRaw.CITY_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDevRaw.UNIT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDevRaw.CLIENT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDevRaw.DMA_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDevRaw.DRI_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (regDev.status?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

export function verifySearchTermsFilter(searchTerms: string[], regDevRaw: TRegDevRaw, regDev: TRegDev) {
  if (searchTerms && searchTerms.length > 0) {
    let shouldNotInclude = false;
    for (const searchTerm of searchTerms) {
      if (verifyIncludeTermInSearchTerm(searchTerm, regDevRaw, regDev)) {
        continue;
      }
      shouldNotInclude = true;
      break;
    }
    if (shouldNotInclude) { return true; }
  }
  return false;
}

function formatListDmasForSendToFront(
  reqParams: ApiParams['/dma/get-dmas-list'],
  rows: Awaited<ReturnType<typeof sqldb.DMAS_DEVICES.getList>>,
  manufacturers: number[],
  searchTerms: string[],
  totalItems: number,
  skipRows: number,
  list: ApiResps['/dma/get-dmas-list']['list'],
  lastMessagesTimes: Awaited<ReturnType<typeof devsLastComm.loadLastMessagesTimes>>,
) {
  for (const regDevRaw of rows) {
    const status = lastMessagesTimes.connectionStatus(regDevRaw.DMA_ID) || 'OFFLINE';
    const regDev = Object.assign(regDevRaw, {
      status,
      unComis: (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DMA_ID),
    })

    if (verifyOwnerShipFilter(reqParams, regDevRaw, manufacturers, regDev)) {
      continue;
    }

    if (verifySearchTermsFilter(searchTerms, regDevRaw, regDev)) {
      continue;
    }

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (!(reqParams.LIMIT && list.length >= reqParams.LIMIT)) {
      list.push(regDev);
    }
  }
}

export async function getDmasList (reqParams: ApiParams['/dma/get-dmas-list'], session: SessionData) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const qPars: Parameters<typeof sqldb.DMAS_DEVICES.getList>[0] = {
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }
  const rows = await sqldb.DMAS_DEVICES.getList(qPars);
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DMA_ID) : undefined,
  });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText?.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list: {
    DMA_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: number
    STATE_NAME: string
    CITY_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    status: "ONLINE" | "OFFLINE" | "LATE";
    unComis: boolean;
  }[] = [];

  formatListDmasForSendToFront(reqParams, rows, manufacturers, searchTerms, totalItems, skipRows, list, lastMessagesTimes);

  return { list, totalItems };
}

export async function deleteDma (qPars: { DEV_ID: string }, userId: string) {
  const dmaInfo = await sqldb.DMAS_DEVICES.getExtraInfo({DEVICE_CODE: qPars.DEV_ID})
  await sqldb.DMAS_IMAGES.w_deleteFromDma({DEVICE_CODE: qPars.DEV_ID}, userId);
  await sqldb.DMAS_DEVICES.w_deleteFromDma({ DEVICE_CODE: qPars.DEV_ID }, userId);
  await sqldb.LEAK_ANALYSIS.w_deleteRow({ID: dmaInfo.LEAK_ANALYSIS_ID}, userId);
}

export async function deleteClientDmas (qPars: { CLIENT_ID: number }, userId: string) {
  const dmaInfo = await sqldb.DMAS_DEVICES.getDmaInfoByClient(qPars)
  for (const dma of dmaInfo) {
    await sqldb.DMAS_IMAGES.w_deleteFromClientDmas(qPars, userId);
    await sqldb.DMAS_DEVICES.w_deleteFromClient(qPars, userId);
    await sqldb.LEAK_ANALYSIS.w_deleteRow({ID: dma.LEAK_ANALYSIS_ID}, userId);
  }
}

httpRouter.privateRoutes['/dma/set-dma-info'] = async function (reqParams, session) {
  // Check required params
  if (reqParams.DMA_ID && reqParams.DMA_ID.length !== 12) throw Error('Id do DMA inválido').HttpStatus(400);
  const { userCanEditDev } = await setGetDevInfo(session, {
    DEV_ID: reqParams.DMA_ID,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    allowInsert: reqParams.DMA_ID.startsWith('DMA'),
  });
  if (!userCanEditDev) {
    throw Error('Sem permissão para editar o DMA').HttpStatus(403);
  }

  if (reqParams.UNIT_ID != null && reqParams.DMA_ID) {
    const dmaByUnit = await sqldb.DMAS_DEVICES.getList({unitIds: [reqParams.UNIT_ID]});
    if (dmaByUnit.length !== 0 && reqParams.DMA_ID !== dmaByUnit[0].DMA_ID) {
      if (reqParams.CHANGED_BY_UNIT) {
        // const dateDmaInf = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: dmaByUnit[0].DMA_ID });
        await setGetDevInfo(session, {
          DEV_ID: dmaByUnit[0].DMA_ID,
          UNIT_ID: null,
          CLIENT_ID: null,
          allowInsert: reqParams.DMA_ID.startsWith('DMA'),
        });
      } else {
        throw Error('Unidade já possui DMA associado.').HttpStatus(400);
      }
    }

    const listLaager = await sqldb.LAAGER.getListWithUnitInfo({ unitIds: [reqParams.UNIT_ID] });
    if (listLaager.length !== 0) {
      if (reqParams.CHANGED_BY_UNIT) {
        await sqldb.LAAGER.w_updateInfo({ LAAGER_CODE: listLaager[0].LAAGER_CODE, WATER_ID: null, CARDSCFG: null, INSTALLATION_LOCATION: null, INSTALLATION_DATE: null}, session.user)
      } else {
        throw Error('A unidade escolhida já possui um medidor de água Laager associado a ela.').HttpStatus(400);
      }
    }
  } 
  
  const perms = reqParams.DMA_ID ? await setGetDevInfo(session, {
    DEV_ID: reqParams.DMA_ID,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    allowInsert: reqParams.DMA_ID ? reqParams.DMA_ID.startsWith('DMA') : null,
  }) : null;

  const waterId = await checkWaterInfo(reqParams.UNIT_ID, reqParams.DMA_ID);
  const paramWatersSet: Parameters<typeof sqldb.WATERS.w_update>[0] = { ID: waterId }
  if (reqParams.UNIT_ID !== undefined) paramWatersSet.UNIT_ID = reqParams.UNIT_ID;
  if (reqParams.HYDROMETER_MODEL === '') reqParams.HYDROMETER_MODEL = null;
  if (reqParams.HYDROMETER_MODEL !== undefined) {
    const hydrometerId = await sqldb.HYDROMETER_MODELS.getHydrometerId({HYDROMETER_MODEL: reqParams.HYDROMETER_MODEL});
    if (hydrometerId) paramWatersSet.HYDROMETER_MODELS_ID = hydrometerId.HYDROMETER_ID;
  };
  if (reqParams.QUANTITY_OF_RESERVOIRS !== undefined) paramWatersSet.QUANTITY_OF_RESERVOIRS = reqParams.QUANTITY_OF_RESERVOIRS;
  if (reqParams.TOTAL_CAPACITY !== undefined) paramWatersSet.TOTAL_CAPACITY = reqParams.TOTAL_CAPACITY;

  if (Object.keys(paramWatersSet).length > 1) {
    await sqldb.WATERS.w_update(paramWatersSet, session.user);
  }
  
   return setDmaInfo(reqParams, session.user, perms, waterId);
}

export async function setDmaInfo(
  reqParams: httpRouter.ApiParams['/dma/set-dma-info'],
  userId: string,
  perms: { userCanEditDev: boolean, userCanAddNewInfo: boolean, clientChanged: boolean },
  water: number
) {
  const devId = reqParams.DMA_ID;
  if(!devId) return null

  const { userCanEditDev, userCanAddNewInfo, clientChanged } = perms;
  if (!userCanEditDev) throw Error('Could not check basic dev info').HttpStatus(500);
  const device = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: devId });
  if (!device) throw Error('Could not find device!').HttpStatus(500);

  // Check if new dev
  let currentDevInfo = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: devId })
  if (currentDevInfo) {
    if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);
  } else {
    if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
    await sqldb.DMAS_DEVICES.w_insertIgnore({ DEVICE_ID: device.ID, WATER_ID: water}, userId);
    currentDevInfo = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: devId });
    sendDmaCommand_mode(devId, 1, userId);
  }


  const paramDmasSet: Parameters<typeof sqldb.DMAS_DEVICES.w_update>[0] = { DEVICE_CODE: devId }
  const paramLeakAnalysisSet: Parameters<typeof sqldb.LEAK_ANALYSIS.w_update>[0] = { DEVICE_CODE: devId }

  if (reqParams.INSTALLATION_LOCATION === '') reqParams.INSTALLATION_LOCATION = null;
  if (reqParams.INSTALLATION_LOCATION !== undefined) paramDmasSet.INSTALLATION_LOCATION = reqParams.INSTALLATION_LOCATION;
  if (reqParams.INSTALLATION_DATE === '') reqParams.INSTALLATION_DATE = null;
  if (reqParams.INSTALLATION_DATE !== undefined) paramDmasSet.INSTALLATION_DATE = reqParams.INSTALLATION_DATE;
  paramDmasSet.WATER_ID = water;

  if (reqParams.LEAK_ANALYSIS !== undefined) paramLeakAnalysisSet.LEAK_ANALYSIS = reqParams.LEAK_ANALYSIS;
  if (reqParams.LA_CONTINUOUS_CONSUMPTION !== undefined) paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION = reqParams.LA_CONTINUOUS_CONSUMPTION;
  if (reqParams.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL !== undefined) paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION_TIME_INTERVAL = reqParams.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL;
  if (reqParams.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE !== undefined) paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION_MIN_VALUE = reqParams.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE;
  if (reqParams.LA_HISTORY_CONSUMPTION !== undefined) paramLeakAnalysisSet.HISTORY_CONSUMPTION = reqParams.LA_HISTORY_CONSUMPTION;
  if (reqParams.LA_HISTORY_CONSUMPTION_TIMES !== undefined) paramLeakAnalysisSet.HISTORY_CONSUMPTION_TIMES = reqParams.LA_HISTORY_CONSUMPTION_TIMES;
  if (reqParams.LA_CAPACITY_CONSUMPTION !== undefined) paramLeakAnalysisSet.CAPACITY_CONSUMPTION = reqParams.LA_CAPACITY_CONSUMPTION;
  if (reqParams.LA_CAPACITY_CONSUMPTION_TIMES !== undefined) paramLeakAnalysisSet.CAPACITY_CONSUMPTION_TIMES = reqParams.LA_CAPACITY_CONSUMPTION_TIMES;
  

  if (Object.keys(paramDmasSet).length > 1) {
    await sqldb.DMAS_DEVICES.w_update(paramDmasSet, userId);
    await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({DEVICE_CODE: devId}, userId);
    await sqldb.DEVICES_UNITS.w_insertIgnore({DEVICE_ID: device.ID, UNIT_ID: reqParams.UNIT_ID}, userId)
    await sendCommandToDeviceWithConfigTimezone({ userId, devCode: devId });
  }

  if (Object.keys(paramLeakAnalysisSet).length > 1) {
    const dmaInfo = await sqldb.DMAS_DEVICES.getExtraInfo({DEVICE_CODE: devId})
    if(dmaInfo.LEAK_ANALYSIS_ID){
      await sqldb.LEAK_ANALYSIS.w_update(paramLeakAnalysisSet, userId);
    }
    else{
      const leakAnalysis = await sqldb.LEAK_ANALYSIS.w_insert({
        LEAK_ANALYSIS: paramLeakAnalysisSet.LEAK_ANALYSIS,
        CAPACITY_CONSUMPTION: paramLeakAnalysisSet.CAPACITY_CONSUMPTION,
        CAPACITY_CONSUMPTION_TIMES: paramLeakAnalysisSet.CAPACITY_CONSUMPTION_TIMES,
        CONTINUOUS_CONSUMPTION: paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION,
        CONTINUOUS_CONSUMPTION_MIN_VALUE: paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION_MIN_VALUE,
        CONTINUOUS_CONSUMPTION_TIME_INTERVAL: paramLeakAnalysisSet.CONTINUOUS_CONSUMPTION_TIME_INTERVAL,
        HISTORY_CONSUMPTION: paramLeakAnalysisSet.HISTORY_CONSUMPTION,
        HISTORY_CONSUMPTION_TIMES: paramLeakAnalysisSet.HISTORY_CONSUMPTION_TIMES
      }, userId)
      await sqldb.DMAS_DEVICES.w_update({DEVICE_CODE: devId, LEAK_ANALYSIS_ID: leakAnalysis.insertId}, userId);
    }
  
  }

  const info = await sqldb.DMAS_DEVICES.getDevExtraInfo({ DEVICE_CODE: devId });

  if(info.HYDROMETER_MODEL?.toLowerCase().includes("saga")){
    sendDmaCommand_setLogicLevel(info.DMA_ID, 1, userId);
  }else{
    sendDmaCommand_setLogicLevel(info.DMA_ID, 0, userId);
  }

  return {
    DMA_ID: info.DMA_ID,
    UNIT_NAME: info.UNIT_NAME,
    CLIENT_ID: info.CLIENT_ID,
    UNIT_ID: info.UNIT_ID,
    HYDROMETER_MODEL: info.HYDROMETER_MODEL,
    INSTALLATION_LOCATION: info.INSTALLATION_LOCATION,
    INSTALLATION_DATE: info.INSTALLATION_DATE,
    TOTAL_CAPACITY: info.TOTAL_CAPACITY,
    QUANTITY_OF_RESERVOIRS: info.QUANTITY_OF_RESERVOIRS,
  }
}

httpRouter.privateRoutes['/dma/get-dmas-list'] = async function (reqParams, session) {
  return getDmasList(reqParams, session);
}

httpRouter.privateRoutes['/dma/get-disassociated-dmas'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  const rows = await sqldb.DMAS_DEVICES.getDisassociatedDmas();

  const data = rows.map((e) =>{ return { dataSource: e.DMA_ID }});

  return {
    list: data
  };
}

httpRouter.privateRoutes['/dma/get-dma-info'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.dmaId) throw Error('Invalid parameters! Missing DMA_ID').HttpStatus(400)

  const info = await sqldb.DMAS_DEVICES.getDevExtraInfo({ DEVICE_CODE: reqParams.dmaId });
  if (!info) { throw Error('Could not find DMA information').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, info.CLIENT_ID, info.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const devLastComm = await devsLastComm.loadDeviceConnectionStatus(info.DMA_ID);
  const status = devLastComm.status || 'OFFLINE';

  return {
    DMA_ID: info.DMA_ID,
    UNIT_NAME: info.UNIT_NAME,
    CLIENT_ID: info.CLIENT_ID,
    UNIT_ID: info.UNIT_ID,
    HYDROMETER_MODEL: info.HYDROMETER_MODEL,
    INSTALLATION_LOCATION: info.INSTALLATION_LOCATION,
    INSTALLATION_DATE: info.INSTALLATION_DATE,
    TOTAL_CAPACITY: info.TOTAL_CAPACITY,
    QUANTITY_OF_RESERVOIRS: info.QUANTITY_OF_RESERVOIRS,
    STATUS: status
  }
}

export const checkWaterInfo = async function (UNIT_ID: number, deviceId: string) {
  if (!UNIT_ID) {
    return null;
  }

  const waterInfo = await sqldb.WATERS.getWaterInfoByUnit({UNIT_ID: UNIT_ID});
  if (!waterInfo) {
    const waterId = await sqldb.WATERS.w_insert({UNIT_ID: UNIT_ID}, '[SYSTEM]'); 
    return waterId.insertId;
  }
  else {
    if (waterInfo.DEVICE_CODE && waterInfo.DEVICE_CODE !== deviceId) {
      if (waterInfo.DEVICE_CODE.startsWith('DMA')) {
        await sqldb.DMAS_DEVICES.w_update({DEVICE_CODE: waterInfo.DEVICE_CODE, WATER_ID: null}, '[SYSTEM]')
        await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({DEVICE_CODE: waterInfo.DEVICE_CODE}, '[SYSTEM]')
      }
      else await sqldb.LAAGER.w_updateInfo({LAAGER_CODE: waterInfo.DEVICE_CODE, WATER_ID: null}, '[SYSTEM]')
    }
    return waterInfo.ID;
  }
}

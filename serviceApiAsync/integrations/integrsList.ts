import * as httpRouter from '../apiServer/httpRouter';
import sqldb from '../../srcCommon/db';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import * as laager from '../extServices/laagerApi'
import { apiLaarger } from '../../srcCommon/extServices/laagerApi'
import * as coolAutomation from './coolAutomation';
import { getAllowedUnitsView, canSeeDevicesWithoutProductionUnit } from '../../srcCommon/helpers/permissionControl';
import { logger } from '../../srcCommon/helpers/logger';
import { getDmasList } from '../dmaInfo';
import { SessionData } from '../../srcCommon/types';
import configfile from '../../configfile';
import { verifyPermsParams } from '../clientData/machines';

httpRouter.privateRoutes['/get-integrations-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const list = [] as {
    STATE_ID: number // Estado
    STATE_NAME: string
    CITY_NAME: string // cidade
    CITY_ID: string
    CLIENT_ID: number // Cliente
    CLIENT_NAME: string // Cliente
    UNIT_ID: number // unidade
    UNIT_NAME: string // unidade
    machineName: string // máquina
    roomName: string // ambiente
    vertical: string // vertical (energia, hvac, água)
    supplier: 'Diel'|'NESS'|'GreenAnt'|'CoolAutomation'|'Laager'
    dataSource: string // fonte de dado (ID-GreenAnt)
    integrId: string
    equipType: string // Tipo (físico, virtual)
    method: string // método (MQTT, api, bucket)
    status: string // status
  }[];


  if (reqParams.supplier === 'laager') {
    return httpRouter.privateRoutes['/get-integrations-list/laager'](reqParams, session);
  }

  if(reqParams.supplier === 'diel-dma'){
    const {list: rows} = await getDmasList(reqParams, session);
    for (const row of rows) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Água',
        supplier: 'Diel',
        dataSource: row.DMA_ID,
        integrId: row.DMA_ID,
        equipType: 'Físico',
        method: 'MQTT',
        status: row.status,
      });
    }
    return {list};
  }

  if(reqParams.supplier === 'greenant'){
    const rows = await sqldb.CLUNITS.getUnitsList2({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    }, { onlyWithGA: true });
    for (const row of rows) {
      list.push({
        STATE_ID: row.STATE_ID,
        CITY_NAME: row.CITY_NAME,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Energia',
        supplier: 'GreenAnt',
        dataSource: String(row.GA_METER),
        integrId: String(row.GA_METER),
        equipType: 'físico',
        method: 'API',
        status: null,
      });
    }
    return {list};
  }  
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  if ((reqParams.supplier === undefined) || (reqParams.supplier === 'diel')) { // DRI
    const { list: rows } = await httpRouter.privateRoutes['/dri/get-dris-list']({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    }, session);
    for (const row of rows) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'HVAC',
        supplier: 'Diel',
        dataSource: row.DRI_ID,
        integrId: row.DRI_ID,
        equipType: 'físico',
        method: 'MQTT',
        status: row.status,
      });
    }
  }

  if ((reqParams.supplier === undefined) || (reqParams.supplier === 'ness')) { // NESS
    const rows = await sqldb.INTEGRNESS.getListWithUnitInfo({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    });
    for (const row of rows) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'HVAC',
        supplier: 'NESS',
        dataSource: row.NESS_ID,
        integrId: row.NESS_ID,
        equipType: 'físico',
        method: 'API',
        status: null,
      });
    }
  }

  if ((reqParams.supplier === undefined) || (reqParams.supplier === 'energy')) { // Energia
    const listGreenAnt = await sqldb.CLUNITS.getUnitsList2({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    }, { onlyWithGA: true });
    for (const row of listGreenAnt) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Energia',
        supplier: 'GreenAnt',
        dataSource: String(row.GA_METER),
        integrId: String(row.GA_METER),
        equipType: 'físico',
        method: 'API',
        status: null,
      });
    }

    const {list: rows} = await httpRouter.privateRoutes['/energy/get-energy-list']({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    }, session);


    for (const row of rows) {
      if (row.MANUFACTURER === 'Diel Energia') {
        
        list.push({
          STATE_ID: row.STATE_ID,
          STATE_NAME: row.STATE_NAME,
          CITY_ID: row.CITY_ID,
          CITY_NAME: row.CITY_NAME,
          CLIENT_ID: row.CLIENT_ID,
          CLIENT_NAME: row.CLIENT_NAME,
          UNIT_ID: row.UNIT_ID,
          UNIT_NAME: row.UNIT_NAME,
          machineName: null,
          roomName: null,
          vertical: 'Energia',
          supplier: 'Diel',
          dataSource: row.ENERGY_DEVICE_ID,
          integrId: row.ENERGY_DEVICE_ID,
          equipType: 'físico',
          method: 'MQTT',
          status: null,
        });
      }         
    }
  }  

  if ((reqParams.supplier === undefined) || (reqParams.supplier === 'coolautomation')) { // CoolAutomation
    const [
      rowsDevices,
      allDevices,
    ] = await Promise.all([
      sqldb.INTEGRCOOLAUT.getListWithUnitInfo({ 
        clientIds: reqParams.clientIds,
        unitIds: reqParams.unitIds,
        INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
        stateIds: reqParams.stateIds,
        cityIds: reqParams.cityIds,
      }),
      (async () => (configfile.coolautApi ? await coolAutomation.getAllDevices() : []))(),
    ]);
    for (const rowDevice of rowsDevices) {
      const coolAutDevice = allDevices.find((device) => device.id === rowDevice.COOLAUT_ID);
      if (!coolAutDevice) {
        logger.info('ERROR 136: invalid CoolAutomation device');
        continue;
      }
      list.push({
        STATE_ID: rowDevice.STATE_ID,
        STATE_NAME: rowDevice.STATE_NAME,
        CITY_ID: rowDevice.CITY_ID,
        CITY_NAME: rowDevice.CITY_NAME,
        CLIENT_ID: rowDevice.CLIENT_ID,
        CLIENT_NAME: rowDevice.CLIENT_NAME,
        UNIT_ID: rowDevice.UNIT_ID,
        UNIT_NAME: rowDevice.UNIT_NAME,
        machineName: null, // rowSystem.name,
        roomName: null,
        vertical: 'HVAC',
        supplier: 'CoolAutomation',
        dataSource: coolAutDevice.name || rowDevice.COOLAUT_ID,
        integrId: rowDevice.COOLAUT_ID,
        equipType: 'físico',
        method: 'API',
        status: (coolAutDevice.isConnected === true) ? 'ONLINE' : (coolAutDevice.isConnected === false) ? 'OFFLINE' : null,
      });
    }
  }

  if ((reqParams.supplier === undefined) || (reqParams.supplier === 'water')){
    const { list: listLaager } = await httpRouter.privateRoutes['/get-integrations-list/laager']({
      clientIds: reqParams.clientIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT
    }, session);
    for (const row of listLaager) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: row.machineName,
        roomName: row.roomName,
        vertical: row.vertical,
        supplier: row.supplier,
        dataSource: row.dataSource,
        integrId: row.integrId,
        equipType: row.equipType,
        method: row.method,
        status: row.status,
      });
    }
    
    const { list: rows } = await getDmasList({clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT }, session);
   
    for (const row of rows) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Água',
        supplier: 'Diel',
        dataSource: row.DMA_ID,
        integrId: row.DMA_ID,
        equipType: 'Físico',
        method: 'MQTT',
        status: row.status,
      });
    }
  }
  

  return { list };
}

httpRouter.privateRoutes['/get-integrations-list/water'] = async function (reqParams, session) {

  const list = [] as {
    STATE_ID: number // Estado
    STATE_NAME: string
    CITY_ID: string
    CITY_NAME: string // cidade
    CLIENT_ID: number // Cliente
    CLIENT_NAME: string // Cliente
    UNIT_ID: number // unidade
    UNIT_NAME: string // unidade
    machineName: string // máquina
    roomName: string // ambiente
    vertical: string // vertical (energia, hvac, água)
    supplier: 'Diel'|'Laager'
    dataSource: string // fonte de dado (ID-GreenAnt)
    integrId: string
    equipType: string // Tipo (físico, virtual)
    method: string // método (MQTT, api, bucket)
    status: string // status
  }[];

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }
  
  const { list: listLaager } = await httpRouter.privateRoutes['/get-integrations-list/laager']({ 
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT
  }, session);
  for (const row of listLaager) {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: row.machineName,
        roomName: row.roomName,
        vertical: row.vertical,
        supplier: row.supplier,
        dataSource: row.dataSource,
        integrId: row.integrId,
        equipType: row.equipType,
        method: row.method,
        status: row.status,
      });
    }
  
    const { list: rows } = await getDmasList({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT
    }, session);

    for (const row of rows) {     
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Água',
        supplier: 'Diel',
        dataSource: row.DMA_ID,
        integrId: row.DMA_ID,
        equipType: 'Físico',
        method: 'MQTT',
        status: row.status,
      });
    }

    const  waters  = await sqldb.WATERS.getListDisassociate({
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
    });
    for (const row of waters) {     
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Água',
        supplier: 'Diel',
        dataSource: null,
        integrId: null,
        equipType: 'Virtual',
        method: '',
        status: null,
      });
    }
  return { list };
}

export async function verifyPermissionsListEnergy(session: SessionData, reqParams: {
  clientIds?: number[];
  unitIds?: number[];
  INCLUDE_INSTALLATION_UNIT?: boolean;
}) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }
}

export const getIntegrationsListEnergy = async (reqParams: {
  clientIds?: number[];
  unitIds?: number[];
  INCLUDE_INSTALLATION_UNIT?: boolean;
  stateIds?: string[];
  cityIds?: string[];
  status?: string[];
}, session: SessionData) => {
  const list = [] as {
    STATE_ID: number // Estado
    STATE_NAME: string
    CITY_ID: string
    CITY_NAME: string // cidade
    CLIENT_ID: number // Cliente
    CLIENT_NAME: string // Cliente
    UNIT_ID: number // unidade
    UNIT_NAME: string // unidade
    machineName: string // máquina
    roomName: string // ambiente
    vertical: string // vertical (energia, hvac, água)
    supplier: 'Diel'|'GreenAnt'
    dataSource: string // fonte de dado (ID-GreenAnt)
    integrId: string
    equipType: string // Tipo (físico, virtual)
    method: string // método (MQTT, api, bucket)
    status: string // status
  }[];

  await verifyPermissionsListEnergy(session, reqParams)

  let includeUnit = true;
  if(reqParams.INCLUDE_INSTALLATION_UNIT === false) includeUnit = false;

  const listGreenAnt = await sqldb.CLUNITS.getUnitsList2({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
  }, { onlyWithGA: true }); 

  for (const row of listGreenAnt) {
    let status = ''
    if (row.STATUS_GA === 1) status = 'ONLINE';
    if (row.STATUS_GA === 0) status = 'OFFLINE';
    list.push({
      STATE_ID: row.STATE_ID,
      STATE_NAME: row.STATE_NAME,
      CITY_ID: row.CITY_ID,
      CITY_NAME: row.CITY_NAME,
      CLIENT_ID: row.CLIENT_ID,
      CLIENT_NAME: row.CLIENT_NAME,
      UNIT_ID: row.UNIT_ID,
      UNIT_NAME: row.UNIT_NAME,
      machineName: null,
      roomName: null,
      vertical: 'Energia',
      supplier: 'GreenAnt',
      dataSource: String(row.GA_METER),
      integrId: String(row.GA_METER),
      equipType: 'físico',
      method: 'API',
      status,
    });
  }
  
  const rows = await sqldb.ENERGY_DEVICES_INFO.getList({
    serials: null,
    manufacturers: null,
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
  }, {
    addUnownedDevs: !!session.permissions.MANAGE_UNOWNED_DEVS
  });
  const drisList = await sqldb.DRIS.getListBasic({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (drisList.length <= 500) ? drisList.map((x) => x.DRI_ID) : undefined,
  });

  for (const row of rows) {
    const dri = drisList.find((dri) => dri.DRI_ID === row.ENERGY_DEVICE_ID);
    if (row.ENERGY_DEVICE_ID && row.MANUFACTURER === 'Diel Energia') {
      list.push({
        STATE_ID: row.STATE_ID,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CITY_NAME: row.CITY_NAME,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Energia',
        supplier: 'Diel',
        dataSource: row.ENERGY_DEVICE_ID,
        integrId: row.ENERGY_DEVICE_ID,
        equipType: 'físico',
        method: 'MQTT',
        status: dri ? (lastMessagesTimes.connectionStatus(dri.DRI_ID) || 'OFFLINE') : undefined,
      });
    }  
  }
  return { list };
}

httpRouter.privateRoutes['/get-integrations-list/energy'] = getIntegrationsListEnergy;

httpRouter.privateRoutes['/get-integrations-list/laager'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const rows = await sqldb.LAAGER.getListWithUnitInfo({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT });

  let statusList = [] as { integrId: string, status: string }[];
  if (!reqParams.noStatus) {
    const { list: statuses } = await httpRouter.privateRoutes['/get-integrations-list/laager-status'](reqParams, session);
    statusList = statuses;
  }

  const list = [] as {
    STATE_ID: number // Estado
    STATE_NAME: string
    CITY_ID: string
    CITY_NAME: string // cidade
    CLIENT_ID: number // Cliente
    CLIENT_NAME: string // Cliente
    UNIT_ID: number // unidade
    UNIT_NAME: string // unidade
    machineName: string // máquina
    roomName: string // ambiente
    vertical: string // vertical (energia, hvac, água)
    supplier: 'Laager'
    dataSource: string // fonte de dado (ID-GreenAnt)
    integrId: string
    equipType: string // Tipo (físico, virtual)
    method: string // método (MQTT, api, bucket)
    status: string // status
  }[];
  const metersWithError = [] as string[];

  for (const row of rows) {
    try{
      const statusResult = statusList.find((x) => x.integrId === row.LAAGER_CODE);
      const status = statusResult && statusResult.status;
      if (status == null) metersWithError.push(row.LAAGER_CODE);

      list.push({
        STATE_ID: row.STATE_ID,
        CITY_NAME: row.CITY_NAME,
        STATE_NAME: row.STATE_NAME,
        CITY_ID: row.CITY_ID,
        CLIENT_ID: row.CLIENT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        machineName: null,
        roomName: null,
        vertical: 'Água',
        supplier: 'Laager',
        dataSource: row.LAAGER_CODE,
        integrId: row.LAAGER_CODE,
        equipType: 'Físico',
        method: 'API',
        status,
      });
    }
    catch (error) {
      logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      metersWithError.push(row.LAAGER_CODE);
    }
  }

  let outputMsg = null;
  if (metersWithError.length > 0){
    outputMsg = `Erro no(s) seguinte(s) dispositivo(s): ${metersWithError.join(',')}`;
  }

  return { list, outputMsg };
}

httpRouter.privateRoutes['/get-integrations-list/laager-status'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const [
    rows,
    allMeters,
  ] = await Promise.all([
    sqldb.LAAGER.getListWithUnitInfo({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT }),
    apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1),
  ]);

  const customer_ids = rows.map((row) => row.LAAGER_CODE).filter(x => x != null);
  const filteredMeters = allMeters
    .filter((meter) => customer_ids.includes(meter.customer_id));

  const list = await Promise.all(
    filteredMeters.map(async (meter) => {
      try {
        const statusResult = await laager.returnStatus(meter.rf_device_id.toString());
        return {
          integrId: meter.customer_id,
          status: statusResult ? 'ONLINE' : 'OFFLINE',
        };
      } catch (err) {
        logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
        return {
          integrId: meter.customer_id,
          status: null,
        };
      }
    })
  );

  return { list };
}

async function processDevice(dev: { DEVICE: any; ENERGY_DEVICES_INFO_ID?: number; }, response: any[]) {
  const status = await devsLastComm.loadLastMessagesTimes({
    devIds: [dev.DEVICE],
  });

  const connectionStatus = status.connectionStatus(dev.DEVICE);
  let statusText = null;

  switch (connectionStatus) {
    case 'ONLINE':
      statusText = 'ONLINE';
      break;
    case 'OFFLINE':
      statusText = 'OFFLINE';
      break;
    case 'LATE':
      statusText = 'LATE';
      break;
  }

  response.push({
    ...dev,
    STATUS: statusText,
  });
}


httpRouter.privateRoutesDeprecated['/energy/get-energy-list-overview'] = async function (reqParams, session) {
  const list = [] as {
    DEVICE: string
    ENERGY_DEVICES_INFO_ID: number;
    STATUS: string // status
  }[];

  await verifyPermissionsListEnergy(session, reqParams)

  let includeUnit = true;
  if(reqParams.INCLUDE_INSTALLATION_UNIT === false) includeUnit = false;

  const listGreenAnt = await sqldb.CLUNITS.getUnitsList2({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: includeUnit }, { onlyWithGA: true }); 
  
  const rows = await sqldb.ENERGY_DEVICES_INFO.getList({
    serials: null,
    manufacturers: null,
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit
  }, {
    addUnownedDevs: !!session.permissions.MANAGE_UNOWNED_DEVS
  });

  for (const row of listGreenAnt) {
    let status = ''
    if (row.STATUS_GA === 1) status = 'ONLINE';
    if (row.STATUS_GA === 0) status = 'OFFLINE';
    const energyDeviceInfo = rows.find(item => item.ENERGY_DEVICE_ID === row.GA_METER.toString());
    list.push({
      DEVICE: row.GA_METER.toString(),
      ENERGY_DEVICES_INFO_ID: energyDeviceInfo ? energyDeviceInfo.ID : null,
      STATUS: status,
    });
  }
  
  const drisList = await sqldb.DRIS.getListBasic({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (drisList.length <= 500) ? drisList.map((x) => x.DRI_ID) : undefined,
  });

  for (const row of rows) {
    const dri = drisList.find((dri) => dri.DRI_ID === row.ENERGY_DEVICE_ID);
    if (row.ENERGY_DEVICE_ID && row.MANUFACTURER === 'Diel Energia') {
      list.push({
        DEVICE: row.ENERGY_DEVICE_ID,
        ENERGY_DEVICES_INFO_ID: row.ID,
        STATUS: dri ? (lastMessagesTimes.connectionStatus(dri.DRI_ID) || 'OFFLINE') : undefined,
      });
    }  
  }

  return { device: list };
}

httpRouter.privateRoutes['/energy/get-energy-list-overview-v2'] = async function (reqParams, session) {
  await verifyPermissionsListEnergy(session, reqParams);

  let includeUnit = true;
  if(reqParams.INCLUDE_INSTALLATION_UNIT === false) includeUnit = false;

  const listGreenAnt = await sqldb.CLUNITS.getUnitsList2({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: includeUnit }, { onlyWithGA: true }); 

  let count = {
    total: 0,
    online: 0,
    offline: 0,
  }

  for (const row of listGreenAnt) {
    if (row.STATUS_GA === 1) {
      count.online++;
    } else {
      count.offline++;
    }    
  }

  const rows = await sqldb.ENERGY_DEVICES_INFO.getList({
    serials: null,
    manufacturers: null,
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit
  }, {
    addUnownedDevs: !!session.permissions.MANAGE_UNOWNED_DEVS
  });

  const drisList = await sqldb.DRIS.getListBasic({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (drisList.length <= 500) ? drisList.map((x) => x.DRI_ID) : undefined,
  });

  const rowsCurrent = rows.filter((dri) => dri.ENERGY_DEVICE_ID);

  for (const row of rowsCurrent) {
    const dri = drisList.find((dri) => dri.DRI_ID === row.ENERGY_DEVICE_ID);
    if (row.ENERGY_DEVICE_ID && row.MANUFACTURER === 'Diel Energia') {
      if(dri?.DRI_ID && lastMessagesTimes.connectionStatus(dri.DRI_ID) === 'ONLINE') {
        count.online++;
      }
      else {
        count.offline++;
      }
    }  
  }

  return { count: count};
}


httpRouter.privateRoutesDeprecated['/get-integrations-list/water-overview'] = async function (reqParams, session) {
  await verifyPermsParams(session, reqParams);

  const response = [] as {
    DEVICE: string;
    STATUS?: string | null; 
  }[];

  const devices = await sqldb.WATERS.getWaterDevicesOverview({ unitIds: reqParams.unitIds, clientIds: reqParams.clientIds, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT})

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (devices.length <= 500) ? devices.map((x) => x.DEVICE) : undefined,
  });

  for(const dev of devices) {
    response.push({
      DEVICE: dev.DEVICE,
      STATUS: lastMessagesTimes.connectionStatus(dev.DEVICE) || 'OFFLINE'
    });
  }

  return { list: response };
}

httpRouter.privateRoutes['/get-integrations-list/water-overview-v2'] = async function (reqParams, session) {
  await verifyPermsParams(session, reqParams);

  let count = {
    total: 0,
    online: 0,
    offline: 0,
  }

  const devices = await sqldb.WATERS.getWaterDevicesOverview({ unitIds: reqParams.unitIds, clientIds: reqParams.clientIds, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT})

  let statusList = [] as { integrId: string, status: string }[];

  const { list: statuses } = await httpRouter.privateRoutes['/get-integrations-list/laager-status']({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }, session);
  statusList = statuses;

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (devices.length <= 500) ? devices.map((x) => x.DEVICE) : undefined,
  });

  for(const dev of devices) {
    if(lastMessagesTimes.connectionStatus(dev.DEVICE) === 'ONLINE') {
      count.online++;
    }
    else {
      count.offline++;
    }
  }

  for(const status of statusList) {
    if(status.status === 'ONLINE') {
      count.online++;
    }
    else {
      count.offline++;
    }
  }

  return { count: count };
}
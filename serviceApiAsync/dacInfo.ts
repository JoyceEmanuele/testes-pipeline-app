import * as httpRouter from './apiServer/httpRouter'
import * as dacData from '../srcCommon/helpers/dacData'
import { ComboItem, SessionData } from '../srcCommon/types'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm'
import * as damInfo from './damInfo'
import * as dielServices from '../srcCommon/dielServices'
import * as groups from './clientData/machines'
import * as devInfo from './devInfo'
import sqldb from '../srcCommon/db'
import { setGetDevInfo } from './devInfo'
import servConfig from '../configfile'
import { healthLevelDesc } from '../srcCommon/helpers/healthTypes'
import { powerConv_kW } from '../srcCommon/helpers/conversion'
import { PROFILECODES, adjustUnitsViewFilter, getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, canSeeDevicesWithoutProductionUnit } from '../srcCommon/helpers/permissionControl'
import { zeroPad } from '../srcCommon/helpers/dates'
import { getOffsetDevCode } from '../srcCommon/helpers/timezones'
import { isTemporaryId } from '../srcCommon/helpers/devInfo'
import * as eventHooks from './realTime/eventHooks'
import { parseDriConfig } from '../srcCommon/helpers/ramcacheLoaders/drisCfgLoader'
import * as brokerMQTT from '../srcCommon/iotMessages/brokerMQTT'
import { logger } from '../srcCommon/helpers/logger'
import * as momentTimezone from 'moment-timezone';
import { corrigirHorario } from './clientData/units_getEnvironmentsListPage'
import { calculateDateByTimezone } from '../srcCommon/helpers/timezones'

httpRouter.privateRoutes['/dac/get-dacs-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.groupId) { reqParams.groupIds = [reqParams.groupId]; }
  delete reqParams.groupId;
  if (reqParams.unitId) { reqParams.unitIds = [reqParams.unitId]; }
  delete reqParams.unitId;
  if (reqParams.stateId) { reqParams.stateIds = [reqParams.stateId]; }
  delete reqParams.stateId;
  if (reqParams.cityId) { reqParams.cityIds = [reqParams.cityId]; }
  delete reqParams.cityId;

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

  const admPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[1] = {
    includeHealthDesc: reqParams.includeHealthDesc,
    includeCapacity: reqParams.includeCapacityKW,
    includeSensorInfo: (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS && reqParams.includeSensorInfo),
    includeFaultsData: (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS),
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
    includeTarifa: reqParams.includeConsumption,
    // orderBy: [{ col: 'DEVACS.DAC_ID', asc: true }],
  }
  const qPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[0] = {
    dacId: reqParams.dacId,
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    machineIds: reqParams.groupIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    // SKIP: reqParams.SKIP,
    // LIMIT: reqParams.LIMIT,
  }
  let rows = await sqldb.DACS_DEVICES.buildDacsListSentence(qPars, admPars)
  // const nowShifted = new Date(Date.now() - 3 * 60 * 60 * 1000)
  // const numDays = 7
  // const periodIni = reqParams.includeMeanUse ? (new Date(nowShifted.getTime() - numDays * 24 * 60 * 60 * 1000)).toISOString().substr(0, 10) : null
  const list = [];
  let totalItems = 0;
  let skipRows = reqParams.SKIP || 0;

  function rowSorter (a: { UNIT_ID: number, DAC_ID: string }, b: { UNIT_ID: number, DAC_ID: string }) {
    if ((a.UNIT_ID == null) && (b.UNIT_ID != null)) return 1;
    if ((a.UNIT_ID != null) && (b.UNIT_ID == null)) return -1;
    if (a.UNIT_ID !== b.UNIT_ID) return b.UNIT_ID - a.UNIT_ID;
    if (a.DAC_ID > b.DAC_ID) return -1;
    if (b.DAC_ID > a.DAC_ID) return 1;
    return 0;
  }
  rows = rows.sort(rowSorter);

  const searchTerms = reqParams.searchTerms || (reqParams.searchText && reqParams.searchText.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { delete reqParams.ownershipFilter; }
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }

  const lastTelemetries = await devsLastComm.loadLastTelemetries_dac({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DAC_ID) : undefined,
  });

  for (const regDevRaw of rows) {
    const lastComms = lastTelemetries.lastDacTelemetry(regDevRaw.DAC_ID);
    const regDev = Object.assign(regDevRaw, {
      status: (lastComms && lastComms.status) || 'OFFLINE',
      lastCommTs: (lastComms && lastComms.lastMessageTS && new Date(lastComms.lastMessageTS).toISOString().substr(0, 19)),
      // Lcmp: (lastComms && lastComms.lastTelemetry && lastComms.lastTelemetry.Lcmp),
      Lcmp: lastComms && lastComms.lastTelemetry && (
        (regDevRaw.SELECTED_L1_SIM === 'fancoil')
          ? ((lastComms.lastTelemetry.Tsuc - lastComms.lastTelemetry.Tliq) >= 1.5) ? 1 : 0
          : (lastComms.lastTelemetry?.Lcmp)
      ),
      Tamb: <number>undefined,
      Tsuc: <number>undefined,
      Tliq: <number>undefined,
      P0Raw: <number>undefined,
      P1Raw: <number>undefined,
      MEAN_USE: <string>undefined,
      CONSUMPTION: <{
        DAT_REPORT: string;
        DAY_HOURS_ON: number;
        DAY_HOURS_OFF: number;
        DAY_NUM_DEPARTS: number;
        meanT: number;
        maxT: number;
        minT: number;
      }[]>undefined,
      FAULTSDATA: undefined,
      unComis: (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DAC_ID),
      automationEnabled: (regDevRaw.AUTOM_HW) && (!regDevRaw.AUTOM_DISAB),
      capacityKW: <number>undefined,
    })

    if (reqParams.includeLastMeasures && lastComms?.lastTelemetry) {
      regDev.Tamb = lastComms.lastTelemetry.Tamb;
      regDev.Tsuc = lastComms.lastTelemetry.Tsuc;
      regDev.Tliq = lastComms.lastTelemetry.Tliq;
      regDev.P0Raw = lastComms.lastTelemetry.P0raw;
      regDev.P1Raw = lastComms.lastTelemetry.P1raw;
    }

    delete regDev.AUTOM_HW;
    delete regDev.AUTOM_DISAB;
    if (regDev.H_INDEX == null) {
      if (admPars.includeHealthDesc) {
        regDev.H_DESC = 'Sem informação'
      }
    }

    if (reqParams.ownershipFilter) {
      if (reqParams.ownershipFilter === 'CLIENTS') {
        if (!(regDevRaw.CLIENT_ID && (regDevRaw.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if (reqParams.ownershipFilter === 'N-COMIS') {
        if (!(regDev.unComis)) continue;
      }
      else if (reqParams.ownershipFilter === 'N-ASSOC') {
        if (!((!regDevRaw.CLIENT_ID) && (!regDev.unComis))) continue;
      }
      else if (reqParams.ownershipFilter === 'MANUFAC') {
        if (!(regDevRaw.CLIENT_ID && manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
        if (!(regDevRaw.CLIENT_ID === servConfig.dielClientId)) continue;
      }
    }
    if (searchTerms && searchTerms.length > 0) {
      let shouldNotInclude = false;
      const col_H_DESC = healthLevelDesc[String(regDevRaw.H_INDEX)] || regDevRaw.H_DESC || 'Sem informação';
      const col_H_GREY = ([25, 50, 75, 100].includes(regDevRaw.H_INDEX) ? '' : 'Sem informação'); // Para aparecer quando filtrar índice cinza ("Sem informação")
      for (const searchTerm of searchTerms) {
        if (regDevRaw.STATE_ID && regDevRaw.STATE_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.CITY_NAME && regDevRaw.CITY_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.UNIT_NAME && regDevRaw.UNIT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.CLIENT_NAME && regDevRaw.CLIENT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.GROUP_NAME && regDevRaw.GROUP_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.DAC_ID && regDevRaw.DAC_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (regDev.status && regDev.status.toLowerCase().includes(searchTerm)) { continue; }
        if (col_H_DESC && col_H_DESC.toLowerCase().includes(searchTerm)) { continue; }
        if (col_H_GREY && col_H_GREY.toLowerCase().includes(searchTerm)) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }
    // if (reqParams.includeMeanUse && regDev.DAC_APPL) {
    //   let mean = 0
    //   const dailyUse = await dacHist.getDailyUsage(regDev.DAC_ID, periodIni, numDays, regDev.DAC_KW)
    //   for (const dayStats of dailyUse) {
    //     if (regDev.DAC_APPL === 'ar-condicionado') {
    //       const weekDay = new Date(dayStats.day + 'T00:00:00Z').getUTCDay()
    //       if (weekDay === 0 || weekDay === 6) { // Ignore SUN and SAT
    //         continue
    //       }
    //       mean += (dayStats.hoursOn / 5)
    //     } else {
    //       mean += (dayStats.hoursOn / 7)
    //     }
    //   }
    //   mean = Math.round(mean * 60) / 60
    //   const hours = String(Math.trunc(mean)).padStart(2, '0')
    //   const minutes = String(Math.round((mean % 1) * 60)).padStart(2, '0')
    //   regDev.MEAN_USE = `${hours}:${minutes}`
    // }

    if (reqParams.includeConsumption) {
      const datIniD = new Date(reqParams.dateStart + 'T00:00:00Z');
      const datFinD = new Date(reqParams.dateEnd + 'T00:00:00Z');
      const nDays = Math.round((datFinD.getTime() - datIniD.getTime()) / 1000 / 60 / 60 / 24);
      const dailyUse = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDailyUsage', { dacId: regDev.DAC_ID, datIni: reqParams.dateStart, numDays: nDays, DAC_KW: regDev.DAC_KW });
      regDev.CONSUMPTION = dailyUse.map((item) => {
        return {
          DAT_REPORT: item.day,
          DAY_HOURS_ON: item.hoursOn,
          DAY_HOURS_OFF: item.hoursOff,
          DAY_NUM_DEPARTS: item.numDeparts,
          meanT: item.meanT,
          maxT: item.maxT,
          minT: item.minT,
        }
      })
    }

    if (reqParams.includeCapacityKW) {
      if (regDevRaw.ASSET_CAPACITY_POWER == null || regDevRaw.ASSET_CAPACITY_UNIT == null || powerConv_kW[regDevRaw.ASSET_CAPACITY_UNIT] == null) {
        regDev.capacityKW = null;
      } else {
        regDev.capacityKW = Math.round(regDevRaw.ASSET_CAPACITY_POWER / powerConv_kW[regDevRaw.ASSET_CAPACITY_UNIT] * 10) / 10;
      }
    }
    delete regDev.ASSET_CAPACITY_POWER;
    delete regDev.ASSET_CAPACITY_UNIT;

    totalItems++;

    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) { }
    else {
      list.push(regDev);
    }
  }

  // const totalItems = rows.length;
  if ((reqParams as any).includeDams) {
    const dams = await httpRouter.privateRoutes['/dam/get-dams-list'](qPars, session);
    return { list, dams: dams.list, totalItems };
  }
  return { list, totalItems };
}

httpRouter.privateRoutes['/get-dacs-and-assets-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }
  const addUnownedDevs = (!!session.permissions.MANAGE_UNOWNED_DEVS);

  type ResponseList = httpRouter.ApiResps['/get-dacs-and-assets-list']['list']; 
  const [
    rowsDacs,
    rowsAssets,
    rowsVavs,
    rowsDutDuo,
  ] = await Promise.all([
    sqldb.DACS_DEVICES.getDacsList_dacsAndAssets({
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      machineIds: reqParams.groupIds,
      healthIndexes: reqParams.healthIndexes,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    }, { addUnownedDevs }),
    sqldb.ASSETS.getAssetsList_dacsAndAssets({
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      machineIds: reqParams.groupIds,
      healthIndex: reqParams.healthIndexes,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      machineScreen: true,
    }, { addUnownedDevs }),
    sqldb.VAVS.getVavsList_vavsAndAssets({
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      machineIds: reqParams.groupIds,
    }, { addUnownedDevs }),
    sqldb.DUTS_DUO.getDutsDuoList_dutsAndAssetsFancoil({
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      machineIds: reqParams.groupIds,
      healthIndexes: reqParams.healthIndexes,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    }, { addUnownedDevs }),
  ]);

  let lastTelemetries_dac;
  let lastTelemetries_dri;
  let lastTelemetries_dutDuo;
  if ((rowsDacs.length > 500) || (rowsVavs.length > 500) || (rowsDutDuo.length > 500)) {
    const lastTelemetries = await devsLastComm.loadLastTelemetries({});
    lastTelemetries_dac = lastTelemetries;
    lastTelemetries_dri = lastTelemetries;
    lastTelemetries_dutDuo = lastTelemetries;
  } else {
    lastTelemetries_dac = await devsLastComm.loadLastTelemetries_dac({
      devIds: (rowsDacs.length <= 500) ? rowsDacs.map((x) => x.DAC_ID) : undefined,
    });
    lastTelemetries_dri = await devsLastComm.loadLastTelemetries_dri({
      devIds: (rowsVavs.length <= 500) ? rowsVavs.map((x) => x.VAV_ID) : undefined,
    });
    lastTelemetries_dutDuo = await devsLastComm.loadLastTelemetries_dut({
      devIds: (rowsDutDuo.length <= 500) ? rowsDutDuo.map((x) => x.DUT_DUO_ID) : undefined,
    });
  }

  for (const row of (rowsDacs as ResponseList)) {
    const lastComms = lastTelemetries_dac.lastDacTelemetry(row.DAC_ID) || undefined;
    row.status = (lastComms && lastComms.status) || 'OFFLINE';
    row.lastCommTs = lastComms && lastComms.lastMessageTS ? await corrigirHorario(lastComms.lastMessageTS, row.TIMEZONE_ID, row.TIMEZONE_AREA, row.TIMEZONE_OFFSET) : null;
    row.Lcmp = (lastComms && lastComms.lastTelemetry && lastComms.lastTelemetry.Lcmp);
    if (row.H_INDEX == null) {
      row.H_DESC = 'Sem informação'
    }
  }

  for (const vav of rowsVavs) {
    const driCfg = parseDriConfig(vav);
    const row = vav as ResponseList[number];
    const lastComms = lastTelemetries_dri.lastDriTelemetry(row.VAV_ID, driCfg) || undefined;
    row.status = (lastComms && lastComms.status) || 'OFFLINE';
    row.lastCommTs = lastComms && lastComms.lastMessageTS ? await corrigirHorario(lastComms.lastMessageTS, row.TIMEZONE_ID, row.TIMEZONE_AREA, row.TIMEZONE_OFFSET) : null;
  }

  for (const dut of rowsDutDuo) {
    const row = dut as ResponseList[number];
    const lastComms = lastTelemetries_dutDuo.lastDutTelemetry(row.DUT_DUO_ID) || undefined;
    row.status = (lastComms && lastComms.status) || 'OFFLINE';
    
    let lastCommTs: string | null = null;
    if (lastComms && lastComms.lastMessageTS) {
      if (row.TIMEZONE_ID) {
        lastCommTs = calculateDateByTimezone({
          DATE: new Date(lastComms.lastMessageTS).toISOString(),
          TIMEZONE_ID: row.TIMEZONE_ID,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET
        });
      } else {
        lastCommTs = new Date(lastComms.lastMessageTS).toISOString().substring(0, 19);
      }
    }
    row.lastCommTs = lastCommTs;
  }
  

  let orderValueGetter: (a: ResponseList[0], b: ResponseList[0]) => [string|number, string|number] = null;
  if (reqParams.orderByProp === 'DEV_ID') orderValueGetter = (a, b) => [a.DAC_ID||a.DAT_ID, b.DAC_ID||b.DAT_ID];
  if (reqParams.orderByProp === 'STATE_ID') orderValueGetter = (a, b) => [a.STATE_ID, b.STATE_ID];
  if (reqParams.orderByProp === 'CITY_NAME') orderValueGetter = (a, b) => [a.CITY_NAME, b.CITY_NAME];
  if (reqParams.orderByProp === 'CLIENT_NAME') orderValueGetter = (a, b) => [a.CLIENT_NAME, b.CLIENT_NAME];
  if (reqParams.orderByProp === 'UNIT_NAME') orderValueGetter = (a, b) => [a.UNIT_NAME, b.UNIT_NAME];
  if (reqParams.orderByProp === 'GROUP_NAME') orderValueGetter = (a, b) => [a.GROUP_NAME, b.GROUP_NAME];
  if (reqParams.orderByProp === 'H_INDEX') orderValueGetter = (a, b) => [a.H_INDEX, b.H_INDEX];
  if (reqParams.orderByProp === 'H_DESC') orderValueGetter = (a, b) => [a.H_DESC, b.H_DESC];
  if (reqParams.orderByProp === 'DAC_COMIS') orderValueGetter = (a, b) => [a.DAC_COMIS, b.DAC_COMIS];
  if (reqParams.orderByProp === 'status') orderValueGetter = (a, b) => [a.status, b.status];
  if (reqParams.orderByProp === 'lastCommTs') orderValueGetter = (a, b) => [a.lastCommTs, b.lastCommTs];
  const orderAsc = !reqParams.orderByDesc;

  function rowSorter (a: ResponseList[0], b: ResponseList[0]) {
    if (orderValueGetter) {
      const [valorA, valorB] = orderValueGetter(a, b);
      if ((valorA == null) && (valorB != null)) return orderAsc ? 1 : -1;
      if ((valorA != null) && (valorB == null)) return orderAsc ? -1 : 1;
      if (valorA > valorB) return orderAsc ? 1 : -1;
      if (valorA < valorB) return orderAsc ? -1 : 1;
    }

    if ((a.UNIT_ID == null) && (b.UNIT_ID != null)) return orderAsc ? 1 : -1;
    if ((a.UNIT_ID != null) && (b.UNIT_ID == null)) return orderAsc ? -1 : 1;
    if (a.UNIT_ID > b.UNIT_ID) return orderAsc ? -1 : 1;
    if (a.UNIT_ID < b.UNIT_ID) return orderAsc ? 1 : -1;
    const [a_DEV_ID, b_DEV_ID] = [a.DAC_ID||a.DAT_ID, b.DAC_ID||b.DAT_ID];
    if (a_DEV_ID > b_DEV_ID) return orderAsc ? -1 : 1;
    if (a_DEV_ID < b_DEV_ID) return orderAsc ? 1 : -1;
    return 0;
  }
  const rows: ResponseList = [...rowsDacs].sort(rowSorter);

  if (!reqParams.healthIndexes) {
    rows.push(...rowsAssets, ...rowsVavs, ...rowsDutDuo);
    rows.sort(rowSorter);
  }
  
  const searchTerms = reqParams.searchTerms;
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { delete reqParams.ownershipFilter; }
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }

  const list: ResponseList = [];
  let totalItems = 0;
  let skipRows = reqParams.SKIP || 0;

  for (const row of rows) {
    const DEV_ID = row.DAC_ID || row.VAV_ID || row.DUT_DUO_ID;
    const unComis = (row.CLIENT_ID == null) && DEV_ID && isTemporaryId(DEV_ID);

    if (reqParams.ownershipFilter) {
      if (reqParams.ownershipFilter === 'CLIENTS') {
        if (!(row.CLIENT_ID && (row.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(row.CLIENT_ID))) continue;
      }
      else if (reqParams.ownershipFilter === 'N-COMIS') {
        if (!(unComis)) continue;
      }
      else if (reqParams.ownershipFilter === 'N-ASSOC') {
        if (!((!row.CLIENT_ID) && (!unComis))) continue;
      }
      else if (reqParams.ownershipFilter === 'MANUFAC') {
        if (!(row.CLIENT_ID && manufacturers.includes(row.CLIENT_ID))) continue;
      }
      else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
        if (!(row.CLIENT_ID === servConfig.dielClientId)) continue;
      }
    }

    if (reqParams.status && !reqParams.status.includes(row.status)) { continue; }

    if (searchTerms && searchTerms.length > 0) {
      let shouldNotInclude = false;
      const col_H_DESC = (row.H_INDEX === undefined) ? '' : (healthLevelDesc[String(row.H_INDEX)] || row.H_DESC || 'Sem informação');
      const col_H_GREY = ([25, 50, 75, 100, undefined].includes(row.H_INDEX) ? '' : 'Sem informação'); // Para aparecer quando filtrar índice cinza ("Sem informação")
      for (const searchTerm of searchTerms) {
        if (row.STATE_ID && row.STATE_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (row.CITY_NAME && row.CITY_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.UNIT_NAME && row.UNIT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.CLIENT_NAME && row.CLIENT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.GROUP_NAME && row.GROUP_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (DEV_ID && DEV_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (row.DAT_ID && row.DAT_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (row.status && row.status.toLowerCase().includes(searchTerm)) { continue; }
        if (col_H_DESC && col_H_DESC.toLowerCase().includes(searchTerm)) { continue; }
        if (col_H_GREY && col_H_GREY.toLowerCase().includes(searchTerm)) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }

    if (reqParams.searchMachine) {
      if (searchMachineFilter(row, reqParams.searchMachine) === 0) { continue; }
    }

    totalItems++;

    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) { }
    else {
      list.push(row);
    }
  }  
  return { list, totalItems };
}

function searchMachineFilter(row: httpRouter.ApiResps['/get-dacs-and-assets-list']['list'][0], searchMachine?: string) {
  const searchMachineItem = searchMachine?.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  let countInclude = 0;
  for (const machine of searchMachineItem) {
    if (containsSearchTerms_pt3(row, machine)) countInclude++
  }
  return countInclude;
}

function containsSearchTerms_pt3(row: httpRouter.ApiResps['/get-dacs-and-assets-list']['list'][0], searchMachine?: string): boolean {
  const fixMachine = searchMachine?.replace(/"/g, '').trim().toLowerCase();
  if (searchMachine.includes(' ')) {
    if (row.GROUP_NAME?.toLowerCase().includes(fixMachine)) { return true; }
  }
  if (row.GROUP_NAME?.toLowerCase().split(' ').includes(fixMachine)) { return true; }
  return false;
}

httpRouter.privateRoutes['/dac/get-dacs-list-by-unit'] = async function (reqParams, session) {
  const LIMIT = reqParams.LIMIT;
  let skipUnits = reqParams.SKIP || 0;
  delete reqParams.LIMIT;
  delete reqParams.SKIP;
  const { list } = await httpRouter.privateRoutes['/dac/get-dacs-list'](reqParams, session);

  const units = [] as {
    UNIT_ID: number
    dacs: (typeof list)
  }[];
  const unitIds: number[] = [];
  for (const row of list) {
    if (!row.UNIT_ID) continue;
    if (!unitIds.includes(row.UNIT_ID)) {
      unitIds.push(row.UNIT_ID);
    }
    if (skipUnits > 0) {
      if (unitIds.length <= skipUnits) {
        continue;
      }
    }
    let unit = units.find(x => x.UNIT_ID === row.UNIT_ID);
    if (!unit) {
      if (LIMIT && units.length >= LIMIT) {
        unit = null;
      } else {
        unit = {
          UNIT_ID: row.UNIT_ID,
          dacs: [],
        };
        units.push(unit);
      }
    }
    if (unit) {
      unit.dacs.push(row);
    }
  }

  const totalItems = unitIds.length;
  return { units, totalItems };
}

httpRouter.privateRoutes['/dac/get-dac-usage'] = async function (reqParams, session) {
  // # Verifica permissão
  const dacId = reqParams.DAC_ID
  if (!dacId) throw Error('Invalid parameters! Missing DAC_ID').HttpStatus(400)
  const row = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: dacId })
  if (!row) {
    // DAC information not set yet
    throw Error('Could not find DAC information').HttpStatus(400)
  }

  const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const info = Object.assign(row, {
    MEAN_USE: <string>null,
    usageHistory: <{DAY_HOURS_ON: number, DAT_REPORT: string}[]>null,
  })

  if (!info.DAC_APPL) {
    info.MEAN_USE = null
    return { info }
  }

  const nowShifted = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const periodIni = (new Date(nowShifted.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString().substr(0, 10)

  const rows = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDailyUsage', { dacId: info.DAC_ID, datIni: periodIni, numDays: 7, DAC_KW: null });
  const usageHistory = [];
  for (const dayStats of rows) {
    if (dayStats.hoursOn == null) { continue; }
    if (info.DAC_APPL === 'ar-condicionado') {
      const weekDay = new Date(dayStats.day + 'T00:00:00Z').getUTCDay()
      if (weekDay === 0 || weekDay === 6) { // Ignore SUN and SAT
        continue;
      }
    }
    usageHistory.push({ DAY_HOURS_ON: dayStats.hoursOn, DAT_REPORT: dayStats.day });
  }
  let mean = 0
  for (const dayStats of usageHistory) {
    mean += (dayStats.DAY_HOURS_ON / usageHistory.length)
  }
  mean = Math.round(mean * 60) / 60
  const hours = String(Math.trunc(mean)).padStart(2, '0')
  const minutes = String(Math.round((mean % 1) * 60)).padStart(2, '0')
  info.MEAN_USE = `${hours}:${minutes}`
  info.usageHistory = usageHistory

  return { info }
}

/**
 * @swagger
 * /dac/get-dac-info:
 *   post:
 *     summary: Retorna informações de um DAC
 *     description: Retorna informações de um DAC
 *     tags:
 *       - DAC
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações do DAC
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             DAC_ID:
 *               type: string
 *               description: ID do DAC
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações do DAC
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: object
 *                   description: Informações do DAC
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/dac/get-dac-info'] = async function (reqParams, session) {
  // # Verifica permissão
  const dacId = reqParams.DAC_ID
  if (!dacId) throw Error('Invalid parameters! Missing DAC_ID').HttpStatus(400)
  const results = await sqldb.DACS_DEVICES.getExtraInfoFull({ DAC_ID: dacId })
    .then(results => ({
      P0_MULT: results.P0_MULT_LIN,
      P1_MULT: results.P1_MULT_LIN,
      ...results
    }));
  if (!results) {
    // DAC information not set yet
    throw Error('Could not find DAC information').HttpStatus(400)
  }

  const perms = await getPermissionsOnUnit(session, results.CLIENT_ID, results.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const hwCfg = dacData.dacHwCfg(results.DAC_ID, results);
  const info = Object.assign(results, {
    P0Psuc: hwCfg.P0Psuc,
    P1Psuc: hwCfg.P1Psuc,
    P0Pliq: hwCfg.P0Pliq,
    P1Pliq: hwCfg.P1Pliq,
    P0mult: hwCfg.P0multLin,
    P1mult: hwCfg.P1multLin,
    P0multLin: hwCfg.P0multLin,
    P0multQuad: hwCfg.P0multQuad,
    P1multLin: hwCfg.P1multLin,
    P1multQuad: hwCfg.P1multQuad,
    P0ofst: hwCfg.P0ofst,
    P1ofst: hwCfg.P1ofst,
    hasAutomation: hwCfg.hasAutomation,
    isVrf: hwCfg.isVrf,
    calculate_L1_fancoil: hwCfg.calculate_L1_fancoil,
    virtualL1: hwCfg.simulateL1,
  })

  return { info }
}

interface FormatPropertyParams {
  [x: string]: any;
  DAC_ID?: string;
  CLIENT_ID?: number;
  UNIT_ID?: number;
  DAC_DESC?: string;
  DAC_NAME?: string;
  DAC_MODEL?: string;
  CAPACITY_UNIT?: string;
  CAPACITY_PWR?: number;
  DAC_COP?: number;
  DAC_KW?: number;
  FLUID_TYPE?: string;
  GROUP_ID?: number;
  DAC_APPL?: string;
  DAC_TYPE?: string;
  DAC_ENV?: string;
  DAC_BRAND?: string;
  DAC_MODIF?: string;
  DAC_COMIS?: string;
  DAC_HEAT_EXCHANGER_ID?: number;
  USE_RELAY?: 0 | 1;
  REL_DUT_ID?: string;
  P0_POSITN?: string;
  P1_POSITN?: string;
  P0_SENSOR?: string;
  P1_SENSOR?: string;
  DAC_APPLCFG?: string;
  PRESSURE_SENSOR?: string;
  ENABLE_ECO?: 0 | 2 | 1;
  ECO_CFG?: string;
  ECO_OFST_START?: number;
  ECO_OFST_END?: number;
  ECO_INT_TIME?: number;
  T0_T1_T2?: [string, string, string];
  FU_NOM?: number;
  SELECTED_L1_SIM?: string;
  SCHEDULE_START_BEHAVIOR?: string;
  SETPOINT?: number;
  LTC?: number;
  LTI?: number;
  UPPER_HYSTERESIS?: number;
  LOWER_HYSTERESIS?: number;
  EQUIPMENT_POWER?: string;
  COMPRESSOR_NOMINAL_CURRENT?: number;
  EVAPORATOR_MODEL_ID?: number;
}

interface ParamSetDac {
  DAC_ID: string,
  DAC_NAME?: string,
  MACHINE_ID?: number,
  DAC_DESC?: string,
  ASSET_MODEL?: string,
  ASSET_CAPACITY_UNIT?: string,
  ASSET_CAPACITY_POWER?: number,
  MACHINE_COP?: number,
  MACHINE_KW?: number,
  MACHINE_FLUID_TYPE?: string,
  MACHINE_APPLICATION?: string,
  MACHINE_TYPE?: string,
  DAC_ENV?: string,
  FAULTS_DATA?: string,
  DAC_MODIF?: string,
  MACHINE_BRAND?: string,
  DAC_COMIS?: string,
  HEAT_EXCHANGER_ID?: number,
  P0_POSITN?: string,
  P1_POSITN?: string,
  P0_SENSOR?: string,
  P1_SENSOR?: string,
  DATE_COMIS?: string,
  T0_T1_T2?: string[],
  FAULTSCFG?: string
  SELECTED_L1_SIM?: string,
  EQUIPMENT_POWER?: string,
  COMPRESSOR_NOMINAL_CURRENT?: number,
  EVAPORATOR_MODEL_ID?: number,
  TYPE_CFG?: string,
  APPL_CFG?: string,
  INSUFFLATION_SPEED?: number,
}

function formatProperty(reqParams?: FormatPropertyParams, propName?: string, targetType?: string) {
  if (reqParams[propName] !== undefined) {
    if (targetType === 'number' && typeof reqParams[propName] === 'string') {
      reqParams[propName] = Number(reqParams[propName]);
      if (isNaN(reqParams[propName])) throw Error(`Invalid ${propName}!`).HttpStatus(400);
    } else if (targetType === 'number' && reqParams[propName] === null) {
      reqParams[propName] = undefined;
    } else if (targetType === 'boolean') {
      if (reqParams[propName] !== '0' && reqParams[propName] !== '1' && reqParams[propName] !== null) {
        throw Error(`Invalid ${propName}`).HttpStatus(400);
      }
    }
  }
}

async function determinePermissions(
  reqParams: {
    DAC_ID?: string;
    CLIENT_ID?: number;
    UNIT_ID?: number;
    DAC_DESC?: string;
    DAC_NAME?: string;
    DAC_MODEL?: string;
    CAPACITY_UNIT?: string;
    CAPACITY_PWR?: number;
    DAC_COP?: number;
    DAC_KW?: number;
    FLUID_TYPE?: string;
    GROUP_ID?: number;
    DAC_APPL?: string;
    DAC_TYPE?: string;
    DAC_ENV?: string;
    DAC_BRAND?: string;
    DAC_MODIF?: string;
    DAC_COMIS?: string;
    DAC_HEAT_EXCHANGER_ID?: number;
    USE_RELAY?: 0 | 1;
    REL_DUT_ID?: string;
    P0_POSITN?: string;
    P1_POSITN?: string;
    P0_SENSOR?: string;
    P1_SENSOR?: string;
    DAC_APPLCFG?: string;
    PRESSURE_SENSOR?: string;
    ENABLE_ECO?: 0 | 2 | 1;
    ECO_CFG?: string;
    ECO_OFST_START?: number;
    ECO_OFST_END?: number;
    ECO_INT_TIME?: number;
    T0_T1_T2?: [string, string, string];
    FU_NOM?: number;
    SELECTED_L1_SIM?: string;
    SCHEDULE_START_BEHAVIOR?: string;
    SETPOINT?: number;
    LTC?: number;
    LTI?: number;
    UPPER_HYSTERESIS?: number;
    LOWER_HYSTERESIS?: number;
    EQUIPMENT_POWER?: string;
    COMPRESSOR_NOMINAL_CURRENT?: number;
    EVAPORATOR_MODEL_ID?: number
  },
  deviceCode: string,
  session: SessionData
) {
  let userCanEditDev = false;
  let userCanAddNewInfo = false;
  let clientChanged = false;
  let perms;

  const client = await sqldb.DEVICES.getClientInfo({ devId: deviceCode });
  if (reqParams.CLIENT_ID) {
    perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  } else {
    const client = await sqldb.DEVICES.getClientInfo({ devId: deviceCode });
    perms = await getPermissionsOnClient(session, client.CLIENT_ID);
  }

  const devPerms = await setGetDevInfo(session, {
    DEV_ID: deviceCode,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    allowInsert: deviceCode.startsWith('DAC'),
  });
  userCanEditDev = devPerms.userCanEditDev;
  userCanAddNewInfo = devPerms.userCanAddNewInfo;
  clientChanged = devPerms.clientChanged;
  

  let canEditProgramming = perms.canEditProgramming || false;

  return { userCanEditDev, userCanAddNewInfo, clientChanged, canEditProgramming };
}

async function handleDevicePermissions(deviceCode: string, userCanEditDev: boolean, canEditProgramming: boolean, userCanAddNewInfo: boolean, session: SessionData) {
  let currentDevInfo = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: deviceCode });

  if (currentDevInfo) {
    if (!userCanEditDev && !canEditProgramming) {
      throw new Error('Permission denied').HttpStatus(403);
    }
  } else {
    if (!userCanAddNewInfo) {
      throw new Error('Permission denied').HttpStatus(403);
    }

    const deviceInfo = await sqldb.DEVICES.getDeviceIdByDeviceCode({ DEVICE_CODE: deviceCode });
    if (!deviceInfo) {
      throw new Error('Device not found').HttpStatus(400);
    }

    await sqldb.DACS_DEVICES.w_insertIgnore({ DEVICE_ID: deviceInfo.DEVICE_ID }, session.user);
    currentDevInfo = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: deviceCode });
  }

  return currentDevInfo;
}

function setParamIfDefined(
  reqParams: FormatPropertyParams, 
  reqParamName: string,
  paramSet: { [x: string]: any; DAC_ID?: string; DAC_NAME?: string; MACHINE_ID?: number; DAC_DESC?: string; ASSET_MODEL?: string; ASSET_CAPACITY_UNIT?: string; ASSET_CAPACITY_POWER?: number; MACHINE_COP?: number; MACHINE_KW?: number; MACHINE_FLUID_TYPE?: string; MACHINE_APPLICATION?: string; MACHINE_TYPE?: string; DAC_ENV?: string; FAULTS_DATA?: string; DAC_MODIF?: string; MACHINE_BRAND?: string; DAC_COMIS?: string; HEAT_EXCHANGER_ID?: number; P0_POSITN?: string; P1_POSITN?: string; P0_SENSOR?: string; P1_SENSOR?: string; DATE_COMIS?: string; T0_T1_T2?: string[]; FAULTSCFG?: string; SELECTED_L1_SIM?: string; EQUIPMENT_POWER?: string; COMPRESSOR_NOMINAL_CURRENT?: number; EVAPORATOR_MODEL_ID?: number; TYPE_CFG?: string; APPL_CFG?: string; INSUFFLATION_SPEED?: number },
  paramSetName: string, 
  ) {
  if (reqParams[reqParamName] !== undefined) {
    paramSet[paramSetName] = reqParams[reqParamName];
  }
}

httpRouter.privateRoutes['/dac/set-dac-info'] = async function (reqParams, session) {
  // Check required params
  if (!reqParams.DAC_ID) throw Error('There was an error!\nInvalid properties. Missing DAC_ID.').HttpStatus(400);
  const deviceCode = reqParams.DAC_ID
  const hasRelay = dacData.hasRelay(deviceCode);

  // Format some property values
  formatProperty(reqParams, 'CLIENT_ID');
  formatProperty(reqParams, 'GROUP_ID');
  formatProperty(reqParams, 'DAC_DESC');
  formatProperty(reqParams, 'DAC_NAME');
  formatProperty(reqParams, 'DAC_MODEL');
  formatProperty(reqParams, 'CAPACITY_UNIT');
  formatProperty(reqParams, 'CAPACITY_PWR');
  formatProperty(reqParams, 'DAC_COP');
  formatProperty(reqParams, 'DAC_KW');
  formatProperty(reqParams, 'FLUID_TYPE');
  formatProperty(reqParams, 'COMPRESSOR_NOMINAL_CURRENT');
  formatProperty(reqParams, 'EQUIPMENT_POWER');
  formatProperty(reqParams, 'EVAPORATOR_MODEL_ID');
  formatProperty(reqParams, 'DAC_APPL');
  formatProperty(reqParams, 'DAC_TYPE');
  formatProperty(reqParams, 'DAC_ENV');
  formatProperty(reqParams, 'DAC_BRAND');
  formatProperty(reqParams, 'DAC_MODIF');
  formatProperty(reqParams, 'DAC_COMIS');
  formatProperty(reqParams, 'CAPACITY_PWR', 'number');
  formatProperty(reqParams, 'DAC_COP', 'number');
  formatProperty(reqParams, 'DAC_KW', 'number');
  formatProperty(reqParams, 'DAC_COMIS', 'boolean');
  formatProperty(reqParams, 'DAC_HEAT_EXCHANGER_ID', 'undefined');

  let { userCanEditDev, userCanAddNewInfo, clientChanged, canEditProgramming } = await determinePermissions(reqParams, deviceCode, session);

  // Check if new dev
  let currentDevInfo = await handleDevicePermissions(deviceCode, userCanEditDev, canEditProgramming, userCanAddNewInfo, session);
  
  let paramSet: ParamSetDac = { DAC_ID: deviceCode }

  if (reqParams.DAC_COMIS !== undefined) {
    if (reqParams.DAC_COMIS !== currentDevInfo.DAC_COMIS) {
      if (reqParams.DAC_COMIS === '1') {
        paramSet.DATE_COMIS = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19)
      } else if (reqParams.DAC_COMIS === '0') {
        paramSet.DATE_COMIS = null;
      } else {
        throw Error('Error checking DAC_COMIS').HttpStatus(500);
      }
    }
  }

  let machineChanged = false;
  // Check if GROUP_ID is valid
  if (!currentDevInfo.UNIT_ID) {
    paramSet.MACHINE_ID  = null;
  } else if (reqParams.GROUP_ID !== undefined && reqParams.GROUP_ID !== currentDevInfo.GROUP_ID) {
    machineChanged = true;
    if (userCanEditDev) { } // OK
    else if (currentDevInfo.GROUP_ID == null && userCanAddNewInfo) { } // OK
    else throw Error('Permission denied! Profile cannot change the group.').HttpStatus(403);
    paramSet.MACHINE_ID = reqParams.GROUP_ID || null;
  }
  const finalMachine = paramSet?.MACHINE_ID ?? currentDevInfo.GROUP_ID;
  if (finalMachine) {
    const machineInfo = await sqldb.MACHINES.getBasicInfo({ MACHINE_ID: finalMachine });
    if (!machineInfo) throw Error('Could not find machine').HttpStatus(400);
    if (machineInfo.CLIENT_ID !== currentDevInfo.CLIENT_ID) throw Error('Invalid machine client').HttpStatus(400).DebugInfo({ currentDevInfo, finalMachine, machineInfo });
    if (machineInfo.UNIT_ID !== currentDevInfo.UNIT_ID) throw Error('Invalid machine unit').HttpStatus(400).DebugInfo({ currentDevInfo, finalMachine, machineInfo });
  }

  
  // If machine was changed, check if there was associated DAC with different group, then disassociate
  if (machineChanged) {
    const clientAssetDev = await sqldb.ASSETS.getDevsClientAssets({ DEV_ID: paramSet.DAC_ID });
    if (clientAssetDev.length > 0) {
      const dacInfo = await sqldb.ASSETS.getBasicInfo({ ASSET_ID: clientAssetDev[0].ASSET_ID });
      if (dacInfo && dacInfo.MACHINE_ID !== paramSet.MACHINE_ID) {
        if (clientAssetDev[0].DAC_CONDENSER_ID) {
          await sqldb.DACS_CONDENSERS.w_deleteRow({ DAC_CONDENSER_ID: clientAssetDev[0].DAC_CONDENSER_ID }, session.user);
        } else if (clientAssetDev[0].DAC_EVAPORATOR_ID){
          await sqldb.DACS_EVAPORATORS.w_deleteRow({ DAC_EVAPORATOR_ID: clientAssetDev[0].DAC_EVAPORATOR_ID }, session.user);
        }
        else if (clientAssetDev[0].DAC_ASSET_HEAT_EXCHANGER_ID) {
          await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteRow( { DAC_ASSET_HEAT_EXCHANGER_ID: clientAssetDev[0].DAC_ASSET_HEAT_EXCHANGER_ID }, session.user);
        }
      }
    }
  }

  if (!machineChanged) paramSet.MACHINE_ID = finalMachine
  setParamIfDefined(reqParams, 'DAC_DESC', paramSet, 'DAC_DESC');
  setParamIfDefined(reqParams, 'DAC_NAME', paramSet, 'DAC_NAME');
  setParamIfDefined(reqParams, 'DAC_MODEL', paramSet, 'ASSET_MODEL');
  setParamIfDefined(reqParams, 'CAPACITY_UNIT', paramSet, 'ASSET_CAPACITY_UNIT');
  setParamIfDefined(reqParams, 'CAPACITY_PWR', paramSet, 'ASSET_CAPACITY_POWER');
  setParamIfDefined(reqParams, 'DAC_COP', paramSet, 'MACHINE_COP');
  setParamIfDefined(reqParams, 'DAC_KW', paramSet, 'MACHINE_KW');
  setParamIfDefined(reqParams, 'FLUID_TYPE', paramSet, 'MACHINE_FLUID_TYPE');
  setParamIfDefined(reqParams, 'DAC_APPL', paramSet, 'APPL_CFG');
  setParamIfDefined(reqParams, 'DAC_TYPE', paramSet, 'TYPE_CFG');
  setParamIfDefined(reqParams, 'DAC_ENV', paramSet, 'DAC_ENV');
  setParamIfDefined(reqParams, 'DAC_BRAND', paramSet, 'MACHINE_BRAND');
  setParamIfDefined(reqParams, 'DAC_MODIF', paramSet, 'DAC_MODIF');
  setParamIfDefined(reqParams, 'DAC_COMIS', paramSet, 'DAC_COMIS');
  setParamIfDefined(reqParams, 'DAC_HEAT_EXCHANGER_ID', paramSet, 'HEAT_EXCHANGER_ID');
  setParamIfDefined(reqParams, 'P0_POSITN', paramSet, 'P0_POSITN');
  setParamIfDefined(reqParams, 'P1_POSITN', paramSet, 'P1_POSITN');
  setParamIfDefined(reqParams, 'P0_SENSOR', paramSet, 'P0_SENSOR');
  setParamIfDefined(reqParams, 'P1_SENSOR', paramSet, 'P1_SENSOR');
  setParamIfDefined(reqParams, 'SELECTED_L1_SIM', paramSet, 'SELECTED_L1_SIM');
  setParamIfDefined(reqParams, 'EQUIPMENT_POWER', paramSet, 'EQUIPMENT_POWER');
  setParamIfDefined(reqParams, 'COMPRESSOR_NOMINAL_CURRENT', paramSet, 'COMPRESSOR_NOMINAL_CURRENT');
  setParamIfDefined(reqParams, 'EVAPORATOR_MODEL_ID', paramSet, 'EVAPORATOR_MODEL_ID');
  setParamIfDefined(reqParams, 'INSUFFLATION_SPEED', paramSet, 'INSUFFLATION_SPEED');

  if (reqParams.DAC_APPLCFG) { // TODO: retirar quando não estiver mais no app
    if (!reqParams.PRESSURE_SENSOR) {
      reqParams.PRESSURE_SENSOR = null
    }
    const [appl, hwCfg] = String(reqParams.DAC_APPLCFG).split(';')
    if (hwCfg === '+Pliq-Psuc')      { paramSet.P0_POSITN = null;   paramSet.P1_POSITN = 'Pliq'; paramSet.P0_SENSOR = null; paramSet.P1_SENSOR = reqParams.PRESSURE_SENSOR }
    else if (hwCfg === '-Pliq+Psuc') { paramSet.P0_POSITN = null;   paramSet.P1_POSITN = 'Psuc'; paramSet.P0_SENSOR = null; paramSet.P1_SENSOR = reqParams.PRESSURE_SENSOR }
    else if (hwCfg === '+Pliq+Psuc') { paramSet.P0_POSITN = 'Psuc'; paramSet.P1_POSITN = 'Pliq'; paramSet.P0_SENSOR = paramSet.P1_SENSOR = reqParams.PRESSURE_SENSOR }
    else if (hwCfg === '-Pliq-Psuc') { paramSet.P0_POSITN = null;   paramSet.P1_POSITN = null;   paramSet.P0_SENSOR = paramSet.P1_SENSOR = null }
    else throw Error('Invalid DAC_APPLCFG').HttpStatus(400)
    paramSet.APPL_CFG = appl
  }

  if (paramSet.APPL_CFG !== undefined) {
    if ((paramSet.APPL_CFG === 'fancoil' && paramSet.SELECTED_L1_SIM !== 'fancoil')
      ||(paramSet.APPL_CFG !== 'fancoil' && paramSet.SELECTED_L1_SIM === 'fancoil')
    ) {

      paramSet.SELECTED_L1_SIM = null;
    }
  }

  if (reqParams.T0_T1_T2 !== undefined) {
    if (reqParams.T0_T1_T2 === null) {
      paramSet.T0_T1_T2 = null;
    } else {
      if (!(reqParams.T0_T1_T2 instanceof Array)) throw Error('Invalid T0_T1_T2').HttpStatus(400);
      if (reqParams.T0_T1_T2.length !== 3) throw Error('Invalid T0_T1_T2').HttpStatus(400);
      // Fancoil:
      // Temperatura de ar de entrada: T0/Tamb
      // Temperatura de saída de água: T1/Tsuc
      // Temperatura entrada de água: T2/Tliq
      const allowed = [null, 'Tamb', 'Tsuc', 'Tliq'];
      if (!allowed.includes(reqParams.T0_T1_T2[0])) throw Error('Invalid T0_T1_T2').HttpStatus(400);
      if (!allowed.includes(reqParams.T0_T1_T2[1])) throw Error('Invalid T0_T1_T2').HttpStatus(400);
      if (!allowed.includes(reqParams.T0_T1_T2[2])) throw Error('Invalid T0_T1_T2').HttpStatus(400);
      paramSet.T0_T1_T2 = reqParams.T0_T1_T2;
    }
  }

  // CHECKS IF TYPE CHANGED TO INVERTER -> CLEAR CACHE HISTORY FROM DAT_BEGMON
  const lastDacType = currentDevInfo.DAC_TYPE;
  const newDacType = paramSet.TYPE_CFG;
  const inverterTypes = ['split-inverter', 'splitao-inverter', 'vrf'];
  if (newDacType && !inverterTypes.includes(lastDacType) && inverterTypes.includes(newDacType)) {
    const offset = await getOffsetDevCode(deviceCode);
    const currentDate = new Date(new Date().getTime() + offset * 60 * 60 * 1000).toISOString().split('T')[0];
    const devDatBegMonInfo = await sqldb.DEVICES.getDevDatBegMon({ DEVICE_ID: currentDevInfo.DEVICE_ID });
    const datBegMon = (devDatBegMonInfo && devDatBegMonInfo.DAT_BEGMON) ? new Date(new Date(devDatBegMonInfo.DAT_BEGMON).getTime() + offset * 60 * 60 * 1000).toISOString().split('T')[0] : currentDate;
    await sqldb.cache_cond_tel.w_deleteFromPeriod({
      devId: deviceCode,
      startDate: datBegMon,
      endDate: currentDate,
    }, session.user);
  }

  if (Object.keys(paramSet).length > 1) {
    const lastCfgModif = new Date();
    const lastCfgModifToUpdate = `${lastCfgModif.getUTCFullYear()}-${zeroPad(lastCfgModif.getUTCMonth() + 1, 2)}-${zeroPad(lastCfgModif.getUTCDate(), 2)} ${zeroPad(lastCfgModif.getUTCHours(), 2)}:${zeroPad(lastCfgModif.getUTCMinutes(), 2)}:${zeroPad(lastCfgModif.getUTCSeconds(), 2)}`;
    await sqldb.DEVICES.w_updateInfo({ ID: currentDevInfo.DEVICE_ID, LAST_CFG_MODIF: lastCfgModifToUpdate }, session.user);

    if (paramSet.MACHINE_ID && (paramSet.MACHINE_FLUID_TYPE || paramSet.MACHINE_BRAND || paramSet.MACHINE_APPLICATION || paramSet.MACHINE_TYPE || paramSet.MACHINE_COP)) {
      await sqldb.MACHINES.w_update({
        MACHINE_ID: paramSet.MACHINE_ID,
        MACHINE_FLUID_TYPE: paramSet.MACHINE_FLUID_TYPE,
        MACHINE_BRAND: paramSet.MACHINE_BRAND,
        MACHINE_APPLICATION: paramSet.MACHINE_APPLICATION,
        MACHINE_TYPE: paramSet.MACHINE_TYPE,
        MACHINE_COP: paramSet.MACHINE_COP
      }, session.user);
    }

    if (currentDevInfo.ASSET_ROLE) {
      if (paramSet.ASSET_MODEL !== undefined) {
        await sqldb.ASSETS.w_update({
          ASSET_ID: currentDevInfo.ASSET_ID,
          MODEL: paramSet.ASSET_MODEL,
        }, session.user);
      }

      if (currentDevInfo.ASSET_ROLE === 'CONDENSER') {
        await sqldb.CONDENSERS.w_updateInfoByAssetId({ 
          ASSET_ID: currentDevInfo.ASSET_ID,
          CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
          CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
          MACHINE_KW: paramSet.MACHINE_KW,
          MACHINE_ID: paramSet.MACHINE_ID,
          EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
          COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
          INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
          EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
          TYPE_CFG: paramSet.TYPE_CFG,
          APPL_CFG: paramSet.APPL_CFG,
        }, session.user);
      } else if (currentDevInfo.ASSET_ROLE === 'HEAT EXCHANGER') {
        await sqldb.ASSET_HEAT_EXCHANGERS.w_updateInfoByAssetId({ 
          ASSET_ID: currentDevInfo.ASSET_ID,
          CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
          CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
          MACHINE_KW: paramSet.MACHINE_KW,
          MACHINE_ID: paramSet.MACHINE_ID,
          EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
          COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
          EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
          TYPE_CFG: paramSet.TYPE_CFG,
          APPL_CFG: paramSet.APPL_CFG,
          HEAT_EXCHANGER_ID: paramSet.HEAT_EXCHANGER_ID
        }, session.user);
      } else {
        await sqldb.EVAPORATORS.w_updateInfoByAssetId({
          ASSET_ID: currentDevInfo.ASSET_ID,
          CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
          CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
          MACHINE_KW: paramSet.MACHINE_KW,
          MACHINE_ID: paramSet.MACHINE_ID,
          EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
          COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
          EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
          TYPE_CFG: paramSet.TYPE_CFG,
          APPL_CFG: paramSet.APPL_CFG,
          INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
        }, session.user);
      }
    }

    if (paramSet.SELECTED_L1_SIM !== undefined) {
      await sqldb.L1_SOURCE.w_insertOrUpdate({
        DAC_DEVICE_ID: currentDevInfo.DAC_DEVICE_ID,
        SELECTED_L1_SIM: paramSet.SELECTED_L1_SIM,
      }, session.user);
    }

    if (!reqParams.MULT_PROG_SCREEN && checkThereFieldsToDacsDevices(paramSet)) {
      await sqldb.DACS_DEVICES.w_update({
        DAC_DEVICE_ID: currentDevInfo.DAC_DEVICE_ID,
        DESCRIPTION: paramSet.DAC_DESC,
        P0_POSITN: paramSet.P0_POSITN,
        P1_POSITN: paramSet.P1_POSITN,
        P0_SENSOR: paramSet.P0_SENSOR,
        P1_SENSOR: paramSet.P1_SENSOR,
        T0: paramSet.T0_T1_T2 ? paramSet.T0_T1_T2[0] : undefined,
        T1: paramSet.T0_T1_T2 ? paramSet.T0_T1_T2[1] : undefined,
        T2: paramSet.T0_T1_T2 ? paramSet.T0_T1_T2[2] : undefined,
        DATE_COMIS: paramSet.DATE_COMIS
      }, session.user);
    }
    

    if (paramSet.HEAT_EXCHANGER_ID != null) {
      const assetInfo = await sqldb.ASSETS.getAssetByDacDeviceId({ DAC_DEVICE_ID: currentDevInfo.DAC_DEVICE_ID })
      if (assetInfo?.CONDENSER_ID) {
        await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_insertOrUpdate({
          CONDENSER_ID: assetInfo.CONDENSER_ID,
          HEAT_EXCHANGER_ID: paramSet.HEAT_EXCHANGER_ID,
        }, session.user);
      } else if (assetInfo?.EVAPORATOR_ID){
        await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_insertOrUpdate({
          EVAPORATOR_ID: assetInfo.EVAPORATOR_ID,
          HEAT_EXCHANGER_ID: paramSet.HEAT_EXCHANGER_ID
        }, session.user)
      }
      
    } else if (currentDevInfo.HEAT_EXCHANGER_ID != paramSet.HEAT_EXCHANGER_ID){
      await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_deleteRow({
        HEAT_EXCHANGER_ID: currentDevInfo.HEAT_EXCHANGER_ID
      }, session.user);
      await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_deleteRow({
        HEAT_EXCHANGER_ID: currentDevInfo.HEAT_EXCHANGER_ID
      }, session.user);
    }
  }

  if (hasRelay) {
    await damInfo.setCondenserAutomationInfo({
      DAM_ID: deviceCode,
      FW_MODE: 'DAC-1R',
      REL_DUT_ID: reqParams.REL_DUT_ID,
      ENABLE_ECO: reqParams.ENABLE_ECO,
      ECO_CFG: reqParams.ECO_CFG,
      ECO_OFST_START: reqParams.ECO_OFST_START,
      ECO_OFST_END: reqParams.ECO_OFST_END,
      FU_NOM: reqParams.FU_NOM,
      DAC_USE_RELAY: reqParams.USE_RELAY,
      ECO_INT_TIME: reqParams.ECO_INT_TIME,
      SCHEDULE_START_BEHAVIOR: reqParams.SCHEDULE_START_BEHAVIOR,
      SETPOINT: reqParams.SETPOINT,
      LTC: reqParams.LTC,
      LTI: reqParams.LTI,
      UPPER_HYSTERESIS: reqParams.UPPER_HYSTERESIS,
      LOWER_HYSTERESIS: reqParams.LOWER_HYSTERESIS,
      groups: finalMachine ? [finalMachine] : [],
    }, {
      canEditProgramming,
      userCanEditDev,
      userCanAddNewInfo,
      clientChanged,
      isDac: true,
    }, session.user);
  }
  if (finalMachine && reqParams.REL_DUT_ID !== undefined) {
    await groups.setMachineDut(finalMachine, reqParams.REL_DUT_ID, session.user);
  }

  // TODO: DELETE FROM DEVACS WHERE DEVACS.GROUP_ID IS NOT NULL AND CLUNITS.CLIENT_ID <> DEVACS.CLIENT_ID

  await eventHooks.ramCaches_DEVACS_loadDacDbInfo(deviceCode);
  brokerMQTT.publish_iotRelay_informDeviceChanges(deviceCode);

  // const resultInfo = {
  //   DAC_ID: freshInfo.DAC_ID,
  //   CLIENT_ID: freshInfo.CLIENT_ID,
  //   UNIT_ID: freshInfo.UNIT_ID,
  //   DAC_DESC: freshInfo.DAC_DESC,
  //   DAC_NAME: freshInfo.DAC_NAME,
  //   DAC_MODEL: freshInfo.DAC_MODEL,
  //   CAPACITY_UNIT: freshInfo.CAPACITY_UNIT,
  //   CAPACITY_PWR: freshInfo.CAPACITY_PWR,
  //   DAC_COP: freshInfo.DAC_COP,
  //   DAC_KW: freshInfo.DAC_KW,
  //   FLUID_TYPE: freshInfo.FLUID_TYPE,
  //   GROUP_ID: freshInfo.GROUP_ID,
  //   DAC_APPL: freshInfo.DAC_APPL,
  //   DAC_TYPE: freshInfo.DAC_TYPE,
  //   DAC_ENV: freshInfo.DAC_ENV,
  //   DAC_BRAND: freshInfo.DAC_BRAND,
  //   DAC_MODIF: freshInfo.DAC_MODIF,
  //   DAC_COMIS: freshInfo.DAC_COMIS,
  //   P0_POSITN: freshInfo.P0_POSITN,
  //   P1_POSITN: freshInfo.P1_POSITN,
  //   P0_SENSOR: freshInfo.P0_SENSOR,
  //   P1_SENSOR: freshInfo.P1_SENSOR,
  // }

  return 'SET OK'
}

function checkThereFieldsToDacsDevices(paramSet: ParamSetDac) {
  if (paramSet.DAC_DESC || paramSet.P0_POSITN !== undefined || paramSet.P1_POSITN !== undefined ||
    paramSet.P0_SENSOR !== undefined || paramSet.P1_SENSOR !== undefined || paramSet.T0_T1_T2 || paramSet.DATE_COMIS !== undefined) {
      return true;
  } 
  return false;
}
interface ComboOptsResults {
  units?: { value: number, label: string }[]
  groups?: { value: number, label: string, unit: number }[]
  rtypes?: { RTYPE_ID: number, RTYPE_NAME: string }[]
  ambientes?: { value: string, label: string }[]
  fluids?: ComboItem[]
  applics?: ComboItem[]
  types?: ComboItem[]
  envs?: ComboItem[]
  brands?: ComboItem[]
  dutapl?: ComboItem[]
  psens?: ComboItem[]
  ecoModeCfg?: ComboItem[]
  applicsCfg?: ComboItem[]
  roles?: { value: string, label: string }[]
  dutPlacement?: { value: string, label: string }[]
  vavs?: { value: string, label: string, type: string }[]
  fancoils?: { value: string, label: string, type: string }[]
  scheduleStartBehavior?: ComboItem[]
  dutScheduleStartBehavior?: ComboItem[]
  dutScheduleEndBehavior?: ComboItem[]
  dutForcedBehavior?: ComboItem[]
  damInstallationLocation?: ComboItem[]
  evaporatorModels?: ComboItem[]
  chillerModels?: ComboItem[]
  chillerLines?: ComboItem[]
}

interface ComboOptsReqParams {
  DEVICE_CODE?: string
  CLIENT_ID?: number
  UNIT_ID?: number
  units?: boolean
  groups?: boolean
  rtypes?: boolean
  ambientes?: boolean
  fluids?: boolean
  applics?: boolean
  types?: boolean
  envs?: boolean
  brands?: boolean
  dutapl?: boolean
  psens?: boolean
  ecoModeCfg?: boolean
  applicsCfg?: boolean
  roles?: boolean
  dutPlacement?: boolean
  vavs?: boolean
  fancoils?: boolean
  scheduleStartBehavior?: boolean
  dutScheduleStartBehavior?: boolean
  dutScheduleEndBehavior?: boolean
  dutForcedBehavior?: boolean
  damInstallationLocation?: boolean
  evaporatorModels?: boolean
  chillerModels?: boolean
  chillerLines?: boolean
}

type TPromiseWithTag = Promise<{
  value: string;
  label: string;
  tags: string;
}[]>

type TPromiseWithoutTag = Promise<{
  value: string;
  label: string;
}[]>

async function getResultsComboOptions(queries: {
  units: Promise<any[]>
  groups: Promise<any[]>
  rtypes: Promise<any[]>
  ambientes: Promise<any[]>
  fluids: TPromiseWithTag
  applics: TPromiseWithTag
  types: TPromiseWithTag
  envs: TPromiseWithTag
  brands: TPromiseWithTag
  psens: TPromiseWithoutTag
  ecoModeCfg: TPromiseWithTag
  applicsCfg: TPromiseWithTag
  dutapl: TPromiseWithTag
  scheduleStartBehavior: TPromiseWithTag
  dutScheduleStartBehavior: TPromiseWithTag
  dutScheduleEndBehavior: TPromiseWithTag
  dutForcedBehavior: TPromiseWithTag
  damInstallationLocation: TPromiseWithoutTag
  evaporatorModels: TPromiseWithoutTag
  chillerModels: TPromiseWithoutTag
  chillerLines: TPromiseWithoutTag
  dutPlacement: {
    value: string;
    label: string;
  }[]
  roles: TPromiseWithoutTag
  vavs:  Promise<{
    value: string;
    label: string;
    type: string;
}[]>
  fancoils: Promise<{
    value: string;
    label: string;
    type: string;
}[]>
}) {
  const result: ComboOptsResults = {
    units: queries.units && await queries.units,
    groups: queries.groups && await queries.groups,
    rtypes: queries.rtypes && await queries.rtypes,
    ambientes: queries.ambientes && await queries.ambientes,
    fluids: queries.fluids && await queries.fluids,
    applics: queries.applics && await queries.applics,
    types: queries.types && await queries.types,
    envs: queries.envs && await queries.envs,
    brands: queries.brands && await queries.brands,
    psens: queries.psens && await queries.psens,
    ecoModeCfg: queries.ecoModeCfg && await queries.ecoModeCfg,
    dutapl: queries.dutapl && await queries.dutapl,
    scheduleStartBehavior: queries.scheduleStartBehavior && await queries.scheduleStartBehavior,
    dutScheduleStartBehavior: queries.dutScheduleStartBehavior && await queries.dutScheduleStartBehavior,
    dutScheduleEndBehavior: queries.dutScheduleEndBehavior && await queries.dutScheduleEndBehavior,
    dutForcedBehavior: queries.dutForcedBehavior && await queries.dutForcedBehavior,
    roles: queries.roles && await queries.roles,
    dutPlacement: queries.dutPlacement,
    vavs: queries.vavs && await queries.vavs,
    fancoils: queries.fancoils && await queries.fancoils,
    damInstallationLocation: queries.damInstallationLocation && await queries.damInstallationLocation,
    evaporatorModels: queries.evaporatorModels && await queries.evaporatorModels,
    chillerModels: queries.chillerModels && await queries.chillerModels,
    chillerLines: queries.chillerLines && await queries.chillerLines,
  }
  return result;
}

const isValidReqParam = (param: any) => (param || undefined);

const getOptsOfTypeQueries = (reqParams: {
  CLIENT_ID?: number
  UNIT_ID?: number
  units?: boolean
  groups?: boolean
  rtypes?: boolean
  ambientes?: boolean
  fluids?: boolean
  applics?: boolean
  types?: boolean
  envs?: boolean
  brands?: boolean
  dutapl?: boolean
  psens?: boolean
  ecoModeCfg?: boolean
  applicsCfg?: boolean
  roles?: boolean
  dutPlacement?: boolean
  vavs?: boolean
  fancoils?: boolean
  scheduleStartBehavior?: boolean
  dutScheduleStartBehavior?: boolean
  dutScheduleEndBehavior?: boolean
  dutForcedBehavior?: boolean
  damInstallationLocation?: boolean
  evaporatorModels?: boolean
  chillerModels?: boolean
  chillerLines?: boolean
}) => ({
  fluids:     isValidReqParam(reqParams.fluids) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'FLUID' }),
  applics:    isValidReqParam(reqParams.applics) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'APLIC' }),
  types:      isValidReqParam(reqParams.types) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'TIPO' }),
  envs:       isValidReqParam(reqParams.envs) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'AMB' }),
  brands:     isValidReqParam(reqParams.brands) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'BRAND' }),
  ecoModeCfg: isValidReqParam(reqParams.ecoModeCfg) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'ECOMD' }),
  applicsCfg: isValidReqParam(reqParams.applicsCfg) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'APLIC' }),
  dutapl: isValidReqParam(reqParams.dutapl) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'APDUT' }),
  scheduleStartBehavior: isValidReqParam(reqParams.scheduleStartBehavior) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'SCHEDULESTARTBEHAVIOR'}),
  dutScheduleStartBehavior: isValidReqParam(reqParams.dutScheduleStartBehavior) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'DUTSCHEDULESTARTBEHAVIOR'}),
  dutScheduleEndBehavior: isValidReqParam(reqParams.dutScheduleEndBehavior) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'DUTSCHEDULEENDBEHAVIOR'}),
  dutForcedBehavior: isValidReqParam(reqParams.dutForcedBehavior) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'DUTFORCEDBEHAVIOR'}),
  damInstallationLocation: isValidReqParam(reqParams.damInstallationLocation) && sqldb.AV_OPTS.getOptsOfType({ OPT_TYPE: 'DAMINSTALLATIONLOCATION'}),
  roles: isValidReqParam(reqParams.roles) && sqldb.VTMACHINETYPES.getOptsOfType(),
});

const getQueries = (reqParams: ComboOptsReqParams) => (
  {
    units: getQueryUnits(reqParams),
    groups: getQueryGroups(reqParams),
    rtypes:  getQueryRtypes(reqParams),
    ambientes: getQueryAmbientes(reqParams),
    psens: getQueryPsens(reqParams),
    ...getOptsOfTypeQueries(reqParams),
    dutPlacement: getQueryDutPlacement(reqParams),
    vavs: getQueryVavs(reqParams),
    fancoils: getQueryFancoils(reqParams),
    evaporatorModels: getQueryEvaporatorModels(reqParams),
    chillerModels: getQueryChillerModels(reqParams),
    chillerLines: getQueryChillerLines(reqParams),
  }
)

const getQueryUnits = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.units) && ((!reqParams.CLIENT_ID) ? Promise.resolve([]) : sqldb.CLUNITS.dacInfoComboOpts({ CLIENT_ID: reqParams.CLIENT_ID }));
}
const getQueryGroups = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.groups) && ((!reqParams.CLIENT_ID) ? Promise.resolve([]) : sqldb.MACHINES.dacInfoComboOpts({ CLIENT_ID: reqParams.CLIENT_ID, UNIT_ID: reqParams.UNIT_ID }));
}
const getQueryRtypes = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.rtypes) && ((!reqParams.CLIENT_ID) ? Promise.resolve([]) : sqldb.ROOMTYPES.getRoomTypesList({ CLIENT_ID: reqParams.CLIENT_ID }));
}
const getQueryAmbientes = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.ambientes) && ((!reqParams.CLIENT_ID) ? Promise.resolve([]) : sqldb.DUTS.buildDevsListSentence({ clientIds: [reqParams.CLIENT_ID] }, {}).then(list => list.map(x => ({ value: x.DEV_ID, label: x.ROOM_NAME || x.DEV_ID }))));
}
const getQueryPsens = (reqParams: ComboOptsReqParams) => {
  if (!isValidReqParam(reqParams.psens)) return undefined;
  if (reqParams.DEVICE_CODE != null) {
    return sqldb.SENSORS.filteredDacInfoComboOpts( { DEVICE_CODE: reqParams.DEVICE_CODE } );
  }
  return sqldb.SENSORS.dacInfoComboOpts();
  
}
const getQueryDutPlacement = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.dutPlacement) && [{ value: 'INS', label: 'INS (Insuflamento)' }, { value: 'AMB', label: 'AMB (Ambiente)' }, { value: 'DUO', label: 'DUO (DUT Duo)' }];
}
const getQueryVavs = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.vavs) && sqldb.AV_OPTS.getOptsOfTag({ TAGS: '(vav)' });
}
const getQueryFancoils = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.fancoils) && sqldb.AV_OPTS.getOptsOfTag({ TAGS: '(fancoil)' });
}
const getQueryEvaporatorModels = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.evaporatorModels) && sqldb.EVAPORATORS_MODELS.getEvaporatorModelsComboOpts();
}
const getQueryChillerModels = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.chillerModels) && sqldb.CHILLER_CARRIER_MODELS.getChillerModelsComboOpts();
}
const getQueryChillerLines = (reqParams: ComboOptsReqParams) => {
  return isValidReqParam(reqParams.chillerModels) && sqldb.CHILLER_CARRIER_LINES.getChillerLinesComboOpts();
}


httpRouter.privateRoutes['/dev/dev-info-combo-options'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS && session.permissions.isInstaller) {
    const adjusted = await adjustUnitsViewFilter(session, {
      clientIds: session.permissions.PER_CLIENT.map((item) => item.clientId)
    });
    session.permissions.PER_CLIENT = adjusted.clientIds.map((item) => ({ clientId: item, p: [PROFILECODES.PERCLIENT.Instalador] }))
  }
  if (reqParams.CLIENT_ID) {
    const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
    //TODO: PERMS filtrar as unidades
    if (!perms.canViewDevs && !perms.canEditProgramming) {
        throw Error('Permission denied!').HttpStatus(403);
      }
  }
  else {
    delete reqParams.CLIENT_ID;
  }

  const queries = getQueries(reqParams);

  const result = await getResultsComboOptions(queries);

  if (session.permissions.isInstaller) {
    if (result.psens) {
      result.psens = result.psens.filter((item) => item.value === '3RHO_8814');
    }
  }

  if (queries.applicsCfg) {
    result.applicsCfg = []
    const applics = await queries.applicsCfg;
    applics.forEach((item) => {
      result.applicsCfg.push({ value: `${item.value};+Pliq-Psuc`, label: `${item.label} com Pliq` })
      result.applicsCfg.push({ value: `${item.value};-Pliq+Psuc`, label: `${item.label} com Psuc` })
      result.applicsCfg.push({ value: `${item.value};+Pliq+Psuc`, label: `${item.label} com Pliq e Psuc` })
      result.applicsCfg.push({ value: `${item.value};-Pliq-Psuc`, label: `${item.label} sem Pliq e Psuc` })
    })
  }
  return result
}

httpRouter.privateRoutes['/dacs-with-automation-enabled'] = async function (reqParams, session) {
  if (!reqParams.clientId) throw Error('ID de cliente não informado').HttpStatus(400);
  const perms = await getPermissionsOnClient(session, reqParams.clientId);
  if (!perms.canViewDevs && !perms.canEditProgramming) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  // responder todos os DACs de um cliente\unidade que possuem automação habilitada informando o GROUP_ID em que eles estão
  const rows = await sqldb.DAMS.getListDacWithGroup({ clientId: reqParams.clientId, unitId: reqParams.unitId });
  const list = [];
  for (const row of rows) {
    if (row.DISAB === 1) continue;
    list.push({
      DAC_ID: row.DAM_ID,
      UNIT_ID: row.UNIT_ID,
      GROUP_ID: row.GROUP_ID,
    });
  }
  return { list };
}

httpRouter.privateRoutes['/dac/delete-dac-info'] = async function (reqParams, session) {
  const devInf = reqParams.dacId && await sqldb.DEVICES.getBasicInfo({ devId: reqParams.dacId });
  if (!devInf) throw Error(`Dispositivo não encontrado: ${reqParams.dacId}`).HttpStatus(400);
  const perms = await getPermissionsOnClient(session, devInf.CLIENT_ID);
  if (!perms.canDeleteDevs) throw Error('Permission denied!').HttpStatus(403);

  const { affectedRows } = await devInfo.deleteDev({ DEV_ID: reqParams.dacId }, session.user);

  return 'DELETED ' + affectedRows;
}

export async function deleteClientDacs (reqParams: { CLIENT_ID: number }, userId: string) {
  await sqldb.DAC_IMAGES.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, userId);
  await sqldb.L1_SOURCE.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, userId);
  await sqldb.DACS_CONDENSERS.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, userId);
  await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, userId);
  await sqldb.DACS_DEVICES.w_deleteFromClientDacs({ CLIENT_ID: reqParams.CLIENT_ID }, {
    DAC_IMAGES: true,
    L1_SOURCE: true,
    DACS_EVAPORATORS: true,
    DACS_CONDENSERS: true,
  }, userId);
  return 'clientDacsDeleted'
}

export async function removeUnitMachines (qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.DACS_CONDENSERS.w_deleteFromUnitAssets(qPars, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteFromUnitAssets(qPars, userId);
  await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteFromUnitAssets(qPars, userId);
}

export async function removingClientMachines (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DACS_CONDENSERS.w_deleteFromClientDacs(qPars, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteFromClientDacs(qPars, userId);
  await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteFromClientDacs(qPars, userId);
}

export async function removingMachine (qPars: { MACHINE_ID: number }, userId: string) {
  await sqldb.DACS_CONDENSERS.w_deleteFromMachine(qPars, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteFromMachine(qPars, userId);
  await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteFromMachine(qPars, userId);
}


export async function deleteDacInfo (qPars: { DEV_ID: string }, userId: string) {
  const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: qPars.DEV_ID });
  if (!dacInfo) throw Error('Device not found').HttpStatus(400);

  await sqldb.DAC_IMAGES.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, userId);
  await sqldb.L1_SOURCE.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID  }, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID  }, userId);
  await sqldb.DACS_CONDENSERS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID  }, userId);
  await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID  }, userId);
  await sqldb.DACS_DEVICES.w_deleteDacInfo({ dacId: dacInfo.DAC_DEVICE_ID  }, {
      DAC_IMAGES: true,
      L1_SOURCE: true,
      DACS_EVAPORATORS: true,
      DACS_CONDENSERS: true,
    }, userId);
}

export async function removingSensor (qPars: { SENSOR_ID: string }, userId: string) {
  await sqldb.DACS_DEVICES.w_deleteFk_SENSORS_P0(qPars, userId);
  await sqldb.DACS_DEVICES.w_deleteFk_SENSORS_P1(qPars, userId);
}

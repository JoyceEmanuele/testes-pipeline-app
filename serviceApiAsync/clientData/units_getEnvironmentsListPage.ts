import * as httpRouter from '../apiServer/httpRouter'
import type { ApiParams, ApiResps } from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import servConfig from '../../configfile'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { adjustUnitsViewFilter } from '../../srcCommon/helpers/permissionControl'
import { calculateDateByTimezone } from '../../srcCommon/helpers/timezones'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo'
import { getRtypeTemprtAlert, descOper } from './units'
import { parseDriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { compareValues } from '../../srcCommon/helpers/orderColumns';

interface EnvRowDb {
  DEV_ID: string,
  ROOM_NAME?: string,
  AUTOM_HW?: string,
  CLIENT_ID?: number,
  AUTOM_DISAB?: number,
  RTYPE_ID?: number,
  STATE_ID?: string,
  CITY_NAME?: string,
  UNIT_NAME?: string,
  UNIT_ID?: number,
  CLIENT_NAME?: string,
  MCHN_BRAND?: string,
  MCHN_MODEL?: string,
  TUSEMAX: number,
  TUSEMIN: number,
  RTYPE_SCHED: string,
  ISVISIBLE?: number,
  VARSCFG?: string,
  TIMEZONE_ID?: number,
  TIMEZONE_AREA?: string,
  TIMEZONE_OFFSET?: number
}
type EnvRow = ApiResps['/get-environments-list-page']['list'][number];
type LastMessagesObject = Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>;

function rowSorter (params:{ a: EnvRow, b: EnvRow, orderByProp?: string, orderByDesc?: boolean }) {
  let orderValueGetter: (a: EnvRow, b: EnvRow) => [string|number, string|number] = null;
  if (params.orderByProp === 'DEV_ID') orderValueGetter = (a, b) => [a.DEV_ID, b.DEV_ID];
  if (params.orderByProp === 'STATE_ID') orderValueGetter = (a, b) => [a.STATE_ID, b.STATE_ID];
  if (params.orderByProp === 'CITY_NAME') orderValueGetter = (a, b) => [a.CITY_NAME, b.CITY_NAME];
  if (params.orderByProp === 'CLIENT_NAME') orderValueGetter = (a, b) => [a.CLIENT_NAME, b.CLIENT_NAME];
  if (params.orderByProp === 'UNIT_NAME') orderValueGetter = (a, b) => [a.UNIT_NAME, b.UNIT_NAME];
  if (params.orderByProp === 'ROOM_NAME') orderValueGetter = (a, b) => [a.ROOM_NAME, b.ROOM_NAME];
  if (params.orderByProp === 'Temperature') orderValueGetter = (a, b) => [a.Temperature, b.Temperature];
  if (params.orderByProp === 'Humidity') orderValueGetter = (a, b) => [a.Humidity, b.Humidity];
  if (params.orderByProp === 'eCO2') orderValueGetter = (a, b) => [a.eCO2, b.eCO2];
  if (params.orderByProp === 'status') orderValueGetter = (a, b) => [a.status, b.status];
  if (params.orderByProp === 'lastCommTs') orderValueGetter = (a, b) => [new Date(a.lastCommTs).getTime() || 0, new Date(b.lastCommTs).getTime() || 0];
  const orderAsc = !params.orderByDesc;

  if (orderValueGetter) {
    const [valorA, valorB] = orderValueGetter(params.a, params.b);
    return compareValues(valorA, valorB, orderAsc)
  }

  return 0;
}

function verifySkipRowsAndLimit(params: { list: EnvRow[], skipRows: number, limit?: number }) {
  let sortedList = []
  let totalItems = 0;
  let skipRows = params.skipRows;

  for (const regDev of params.list) {
    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }

    if (params.limit && sortedList.length >= params.limit) {
      continue;
    }

    sortedList.push(regDev);
  }

  return { totalItems, sortedList }
}

httpRouter.privateRoutes['/get-environments-list-page'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const adjusted = await adjustUnitsViewFilter(session, {
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
    });
    reqParams.clientIds = adjusted.clientIds;
    reqParams.unitIds = adjusted.unitIds;
  }

  const qPars = buildQPars(reqParams);

  const dutsList = await sqldb.DUTS.buildDevsListSentence(qPars, {
    onlyWithAutomation: false,
    onlyPossibleAutomation: false,
  });

  const vavsList = await sqldb.VAVS.getVAVsList(qPars);

  const environments = await sqldb.ENVIRONMENTS.getEnvironmentsInfoList({ ...qPars, withoutDev: true});
  const environmentsWithoutDev = environments.map(item => ({
    DEV_ID: '-',
    ROOM_NAME: item.ENVIRONMENT_NAME,
    CLIENT_ID: item.CLIENT_ID,
    AUTOM_DISAB: 1,
    RTYPE_ID: item.RTYPE_ID,
    TUSEMIN: item.TUSEMIN,
    TUSEMAX: item.TUSEMAX,
    RTYPE_SCHED: item.RTYPE_SCHED,
    STATE_ID: item.STATE_ID,
    CITY_NAME: item.CITY_NAME,
    UNIT_NAME: item.UNIT_NAME,
    UNIT_ID: item.UNIT_ID,
    CLIENT_NAME: item.CLIENT_NAME,
    MCHN_BRAND: '-',
    MCHN_MODEL: '-',
    ISVISIBLE: item.IS_VISIBLE,
    TIMEZONE_ID: item.TIMEZONE_ID,
    TIMEZONE_AREA: item.TIMEZONE_AREA,
    TIMEZONE_OFFSET: item.TIMEZONE_OFFSET,
  }))

  const dbList: EnvRowDb[] = [...dutsList, ...vavsList, ...environmentsWithoutDev];

  const lastTelemetries = await devsLastComm.loadLastTelemetries({
    devIds: (dbList.length <= 500) ? dbList.map((x) => x.DEV_ID) : undefined,
  });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText?.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  const list = [];

  for (const regDevRaw of dbList) {
    const { regDev, unComis, lastMessageTS } = fillExtraProps(regDevRaw, lastTelemetries);

    const shouldBeSkipped = checkIfExcludedByFilters(reqParams, regDev, manufacturers, unComis, searchTerms, reqParams.searchEnvironment);
    if (shouldBeSkipped) continue;
    
    if (lastMessageTS) {
      regDev.lastCommTs = await corrigirHorario(lastMessageTS, regDevRaw.TIMEZONE_ID, regDevRaw.TIMEZONE_AREA, regDevRaw.TIMEZONE_OFFSET);
    }

    list.push(regDev);
  }

  const rows = [...list].sort((a, b) => rowSorter({ a, b, orderByProp: reqParams.orderByProp, orderByDesc: reqParams.orderByDesc }));

  const { sortedList, totalItems } = verifySkipRowsAndLimit({ list: rows, skipRows, limit: reqParams.LIMIT });

  return { list: sortedList, totalItems };
}

const buildQPars = function (reqParams: ApiParams['/get-environments-list-page']) {
  const qPars: Parameters<typeof sqldb.CLUNITS.getUnitsList2>[0] = {};
  if (reqParams.cityIds?.length > 0) qPars.cityIds = reqParams.cityIds;
  if (reqParams.stateIds?.length > 0) qPars.stateIds = reqParams.stateIds;
  if (reqParams.clientIds?.length > 0) qPars.clientIds = reqParams.clientIds;
  if (reqParams.unitIds?.length > 0) qPars.unitIds = reqParams.unitIds;
  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) qPars.INCLUDE_INSTALLATION_UNIT = reqParams.INCLUDE_INSTALLATION_UNIT;

  return Object.assign(qPars, {
    rtypeId: reqParams.rtypeId,
  });
}

export async function corrigirHorario(lastMessageTS: number, TIMEZONE_ID: number, TIMEZONE_AREA: string, TIMEZONE_OFFSET: number): Promise<string> {
  return calculateDateByTimezone({
    DATE: new Date(lastMessageTS).toISOString(),
    TIMEZONE_ID: TIMEZONE_ID,
    TIMEZONE_AREA: TIMEZONE_AREA,
    TIMEZONE_OFFSET: TIMEZONE_OFFSET,
  });
}

function fillExtraProps(regDevRaw: EnvRowDb, lastTelemetries: LastMessagesObject): { regDev: EnvRow, unComis: boolean, lastMessageTS?: number } {
  const devDut = lastTelemetries.lastDutTelemetry(regDevRaw.DEV_ID);
  const devDutAut = lastTelemetries.lastDutAutTelemetry(regDevRaw.DEV_ID);
  const driCfg = regDevRaw.VARSCFG ? parseDriConfig({ VARSCFG: regDevRaw.VARSCFG }) : undefined;
  const devDri = lastTelemetries.lastDriTelemetry(regDevRaw.DEV_ID, driCfg);
  const status = lastTelemetries.connectionStatus(regDevRaw.DEV_ID) || 'OFFLINE';
  const lastTelemetryDut = ((status !== 'OFFLINE') && devDut && devDut.lastTelemetry) || null;
  const lastTelemetryDutAut = (devDutAut?.status && (devDutAut.status !== 'OFFLINE') && devDutAut.lastTelemetry) || null;
  const lastTelemetryDri = ((status !== 'OFFLINE') && devDri && devDri.lastTelemetry) || null;
  let lastTelemetry = (lastTelemetryDut || lastTelemetryDutAut || lastTelemetryDri) as {
    Temperature?: number
    Temperature_1?: number
    Humidity?: number
    eCO2?: number
    TVOC?: number
    TempAmb?: number
  }
  const unComis = (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID);

  const regDev = Object.assign(regDevRaw, {
    status,
    lastCommTs: null, // Será calculado após a filtragem
    GROUP_NAME: regDevRaw.ROOM_NAME,
    automationEnabled: regDevRaw.DEV_ID.startsWith('DRI') ? true : (regDevRaw.AUTOM_HW) && (!regDevRaw.AUTOM_DISAB),
    Temperature_1: lastTelemetry?.Temperature_1,
    Humidity: lastTelemetry?.Humidity,
    eCO2: lastTelemetry?.eCO2,
    TVOC: lastTelemetry?.TVOC,
    Mode: lastTelemetryDutAut?.Mode,
    State: lastTelemetryDutAut?.State,
    temprtAlert: getRtypeTemprtAlert(regDevRaw, lastTelemetry?.Temperature),
    Temperature: lastTelemetry?.Temperature,
  });
  delete regDev.AUTOM_HW;
  delete regDev.AUTOM_DISAB;

  if (regDev.Temperature === undefined) {
    regDev.Temperature = lastTelemetry?.TempAmb; // VAVtemperature
  }

  return {
    regDev,
    unComis,
    lastMessageTS: lastTelemetries.lastTS(regDevRaw.DEV_ID),
  };
}

function checkIfExcludedByFilters(reqParams: ApiParams['/get-environments-list-page'], row: EnvRow, manufacturers: number[], unComis: boolean, searchTerms: string[], environmentsTerms?: string): boolean {
  if (checkIfExcludedByOwnershipFilter(reqParams.ownershipFilter, row, manufacturers, unComis)) {
    return true;
  }

  if (reqParams.temprtAlerts) {
    if (reqParams.temprtAlerts.includes('no data')) {
      reqParams.temprtAlerts.push(null);
    }
    if (!reqParams.temprtAlerts.includes(row.temprtAlert)) { return true; }
  }

  if (reqParams.status && !reqParams.status.includes(row.status)) { return true; }

  if (checkIfExcludedBySearchTerms(row, searchTerms, environmentsTerms)) {
    return true;
  }

  // "false" = não deve ser excluído do resultado (pelo filtro)
  return false;
}

function checkIfExcludedByOwnershipFilter(ownershipFilter: string|undefined, row: EnvRow, manufacturers: number[], unComis: boolean): boolean {
  switch (ownershipFilter) {
    case 'CLIENTS': {
      return !(row.CLIENT_ID && (row.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(row.CLIENT_ID));
    }
    case 'N-COMIS': {
      return !unComis;
    }
    case 'N-ASSOC': {
      return !((!row.CLIENT_ID) && (!unComis));
    }
    case 'MANUFAC': {
      return !(row.CLIENT_ID && manufacturers.includes(row.CLIENT_ID));
    }
    case 'D-TESTS': {
      return (row.CLIENT_ID !== servConfig.dielClientId);
    }
    default: {
      return false;
    }
  }
}

function checkIfExcludedBySearchTerms(row: EnvRow, searchTerms: string[], searchEnvironment?: string): boolean {
  if (!searchTerms?.length && !searchEnvironment?.length) {
    return false;
  }
  for (const searchTerm of searchTerms) {
    if (containsSearchTerms_pt1(row, searchTerm.toLowerCase())) continue;
    if (containsSearchTerms_pt2(row, searchTerm.toLowerCase())) continue;
    return true;
  }
  const splitTerms =  searchEnvironment?.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) || [];
  let include = 0;
  for (const environment of splitTerms) {
    const fixEnv = environment.replace(/"/g, '')
    if (containsSearchTerms_pt3(row, fixEnv.trim().toLowerCase())) include++;
  }
  if (include === 0 && splitTerms.length) {
    return true;
  }
  return false;
}

function containsSearchTerms_pt1(row: EnvRow, searchTerm: string): boolean {
  if (row.STATE_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CITY_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.UNIT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CLIENT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.ROOM_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.DEV_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.MCHN_BRAND?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.MCHN_MODEL?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

function containsSearchTerms_pt2(row: EnvRow, searchTerm: string): boolean {
  const damState = (descOper as { [n: string]: string })[row.State] || row.State;
  const damMode = (row.Mode === 'Auto') ? 'Automático' : row.Mode;
  if (row.status?.toLowerCase().includes(searchTerm)) { return true; }
  if (damState?.toLowerCase().includes(searchTerm)) { return true; }
  if (damMode?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

function containsSearchTerms_pt3(row: EnvRow, searchTerm: string): boolean {
  if (searchTerm.includes(' ')) {
    if (row.ROOM_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  }
  if (row.ROOM_NAME?.toLowerCase().split(' ').includes(searchTerm)) { return true; }
  return false;
}
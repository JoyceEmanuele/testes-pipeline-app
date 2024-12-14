import * as httpRouter from './apiServer/httpRouter'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm';
import sqldb from '../srcCommon/db'
import { getRtypeTemprtAlert } from './clientData/units'
import servConfig from '../configfile'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse';
import { MeanTemperature_DAC_DUT_DRI, TelemetryDutAut } from '../srcCommon/types'
import { adjustUnitsViewFilter } from '../srcCommon/helpers/permissionControl'
import { isTemporaryId, lastTelemetryAsDut } from '../srcCommon/helpers/devInfo'
import type { ApiParams, ApiResps } from './apiServer/httpRouter'
import { getOffsetTimezone } from '../srcCommon/helpers/timezones'
import { canSeeDevicesWithoutProductionUnit } from '../srcCommon/helpers/permissionControl';


type EnvRowDb = Awaited<ReturnType<typeof sqldb.DUTS.buildDevsListSentence>>[number];
type EnvRow = ApiResps['/dut/get-duts-list']['list'][number];
type LastMessagesObject = Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries_dut>>;

const descOper = {
  'allow': 'Liberado',
  'forbid': 'Bloqueado',
  'onlyfan': 'Ventilação',
  'enabling': 'Habilitando',
  'disabling': 'Bloqueando',
  'eco': 'Eco-Mode',
}

httpRouter.privateRoutes['/dut/get-duts-list'] = async function (reqParams, session) {
  requiredFiltersCheck1(reqParams);
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const adjusted = await adjustUnitsViewFilter(session, {
      clientIds: reqParams.clientIds,
      unitIds: reqParams.unitIds,
    });
    reqParams.clientIds = adjusted.clientIds;
    reqParams.unitIds = adjusted.unitIds;
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit && reqParams.INCLUDE_INSTALLATION_UNIT !== null) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  if (reqParams.controlMode?.includes('6_BACKUP_CONTROL_V2')) reqParams.controlMode.push('8_ECO_2');

  let hasProgrammingMultString = undefined;
  if (reqParams.hasProgrammingMult != null) hasProgrammingMultString = reqParams.hasProgrammingMult ? '1' : '0'

  const dbList = await sqldb.DUTS.buildDevsListSentence({ // Parameters<typeof sqldb.DUTS.buildDevsListSentence>[0]
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    rtypeId: reqParams.rtypeId,
    needMultSchedules: hasProgrammingMultString, 
    controlModel: reqParams.controlMode
    // SKIP: reqParams.SKIP,
    // LIMIT: reqParams.LIMIT,
  },
  { // Parameters<typeof sqldb.DUTS.buildDevsListSentence>[1]
    onlyWithAutomation: !!reqParams.onlyWithAutomation,
    onlyPossibleAutomation: !!reqParams.onlyPossibleAutomation,
  });
  const lastTelemetries = await devsLastComm.loadLastTelemetries_dut({
    devIds: (dbList.length <= 500) ? dbList.map((x) => x.DEV_ID) : undefined,
  });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText?.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list = [];

  for (const regDevRaw of dbList) {
    const { regDev, unComis, lastMessageTS } = fillExtraProps(regDevRaw, lastTelemetries);

    const shouldBeSkipped = checkIfExcludedByFilters(reqParams, regDev, manufacturers, unComis, searchTerms);
    if (shouldBeSkipped) continue;

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) {
      continue;
    }

    if (reqParams.status && !reqParams.status.includes(regDev.status)) { continue; }


    if (reqParams.automationConfig) {
      const isAutomationConfig = checkAutomationConfig(reqParams.automationConfig, regDev.PORTCFG, regDev.automationEnabled);
      if (!isAutomationConfig) { continue; } 
    }

    if (reqParams.includeMeanTemperature && (!reqParams.checkQuantiyToMeanTemperature || dbList.length < 500)) {
      const tpFilter: Parameters<typeof sqldb.cache_cond_tel.getLatestMeanTp>[0] = { timezoneOffset: -3 };
      if (regDevRaw.TIMEZONE_ID) {
        tpFilter.timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: regDevRaw.TIMEZONE_ID, TIMEZONE_AREA: regDevRaw.TIMEZONE_AREA, TIMEZONE_OFFSET: regDevRaw.TIMEZONE_OFFSET });
      }
      tpFilter.devId = regDevRaw.DEV_ID;
      const tpRows = await sqldb.cache_cond_tel.getLatestMeanTp(tpFilter);
      const tpRow = tpRows[0];
      const dutMeanTp = tpRow && jsonTryParse<MeanTemperature_DAC_DUT_DRI>(tpRow.meantp);
      if (dutMeanTp) {
        delete dutMeanTp.secI;
        delete dutMeanTp.secF;
        regDev.tpstats = dutMeanTp;
      }
    }

    if (lastMessageTS) {
      regDev.lastCommTs = new Date(lastMessageTS).toISOString().substring(0, 19);
    }

    list.push(regDev);
  }

  return { list, totalItems };
}

const checkAutomationConfig = function (automationConfig: string[], portCfg: string, automationEnabled: boolean ) {
  let isAutomationConfig = false;
  if (portCfg === null) portCfg = 'IR';
  if (automationConfig?.includes('DISABLED') && portCfg === 'IR' && !automationEnabled) isAutomationConfig = true;   
  if (automationConfig?.includes('RELAY') && portCfg === 'RELAY' && !automationEnabled) isAutomationConfig = true;   
  if (automationConfig?.includes('IR') && portCfg === 'IR' && automationEnabled) isAutomationConfig = true;   
  return isAutomationConfig;
}

const requiredFiltersCheck1 = function (reqParams: ApiParams['/dut/get-duts-list']) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.unitId) { reqParams.unitIds = [reqParams.unitId]; }
  delete reqParams.unitId;
  if (reqParams.stateId) { reqParams.stateIds = [reqParams.stateId]; }
  delete reqParams.stateId;
  if (reqParams.cityId) { reqParams.cityIds = [reqParams.cityId]; }
  delete reqParams.cityId;
}

function fillTelemetryFields(regDevRaw: EnvRowDb, telemetry?: ReturnType<typeof lastTelemetryAsDut> | null) {
  if (telemetry) {
    return {
      Temperature: telemetry.Temperature !== undefined ? telemetry.Temperature : undefined,
      Temperature_1:telemetry.Temperature_1 !== undefined ? telemetry.Temperature_1 : undefined,
      Humidity:telemetry.Humidity !== undefined ? telemetry.Humidity : undefined,
      eCO2:telemetry.eCO2 !== undefined? telemetry.eCO2 : undefined,
      TVOC:telemetry.TVOC !== undefined ? telemetry.TVOC : undefined,
      temprtAlert: getRtypeTemprtAlert(regDevRaw, telemetry?.Temperature ?? null),
    }
  }

  return {
      Temperature: undefined,
      Temperature_1: undefined,
      Humidity: undefined,
      eCO2: undefined,
      TVOC: undefined,
      temprtAlert: null,
  }
}

function fillTelemetryDutAutFields(telemetry?: TelemetryDutAut | null): Pick<TelemetryDutAut, 'Mode' | 'State'> {
  if (telemetry) {
    return {
      Mode: telemetry.Mode,
      State: telemetry.State,
    }
  }

  return {
    Mode: undefined,
    State: undefined,
  }
}

function fillExtraProps(regDevRaw: EnvRowDb, lastTelemetries: LastMessagesObject): { regDev: EnvRow, unComis: boolean, lastMessageTS?: number } {
  const dev = lastTelemetries.lastDutTelemetry(regDevRaw.DEV_ID);
  const status = dev?.status || 'OFFLINE';
  const lastTelemetry = ((status !== 'OFFLINE') && dev?.lastTelemetry) || null;
  const devAut = lastTelemetries.lastDutAutTelemetry(regDevRaw.DEV_ID);
  const lastTelemetryDutAut = (devAut?.status && (devAut.status !== 'OFFLINE') && devAut.lastTelemetry) || null;
  const unComis = (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID);
  const ctrlOperation = regDevRaw.DUTAUT_CTRLOPER === '8_ECO_2' ? '6_BACKUP_CONTROL_V2' : regDevRaw.DUTAUT_CTRLOPER;

  const regDev = Object.assign(regDevRaw, {
    status,
    lastCommTs: null, // Será calculado após a filtragem
    GROUP_NAME: regDevRaw.ROOM_NAME,
    ENVIRONMENT_ID: regDevRaw.ENVIRONMENT_ID,
    ISVISIBLE: regDevRaw.ISVISIBLE,
    unComis: (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID),
    automationEnabled: (regDevRaw.AUTOM_HW) && (!regDevRaw.AUTOM_DISAB),
    tpstats: undefined as { med: number, max: number, min: number },
    CTRLOPER: ctrlOperation,
    ...fillTelemetryDutAutFields(lastTelemetryDutAut),
    ...fillTelemetryFields(regDevRaw, lastTelemetry),
  });
  delete regDev.AUTOM_HW;
  delete regDev.AUTOM_DISAB;
  delete regDev.DUTAUT_CTRLOPER;

  return {
    regDev,
    unComis,
    lastMessageTS: dev?.lastMessageTS,
  };
}

function checkIfExcludedByFilters(reqParams: ApiParams['/dut/get-duts-list'], row: EnvRow, manufacturers: number[], unComis: boolean, searchTerms: string[]): boolean {
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

  if (checkIfExcludedByAnySearchTerms(row, searchTerms)) {
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

function checkIfExcludedBySearchTerms(row: EnvRow, searchTerms: string[]): boolean {
  if (!searchTerms?.length) {
    return false;
  }
  for (const searchTerm of searchTerms) {
    if (containsSearchTerms_pt1(row, searchTerm)) continue;
    if (containsSearchTerms_pt2(row, searchTerm)) continue;
    return true;
  }
  return false;
}

function checkIfExcludedByAnySearchTerms(row: EnvRow, searchTerms: string[]): boolean {
  if (!searchTerms?.length) {
    return false;
  }
  for (const searchTerm of searchTerms) {
    if (containsSearchTerms_pt1(row, searchTerm) || containsSearchTerms_pt2(row, searchTerm)) {
      return false;
    };
  }
  return true;
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

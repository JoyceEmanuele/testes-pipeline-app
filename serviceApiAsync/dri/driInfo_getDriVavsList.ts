import sqldb from '../../srcCommon/db'
import * as httpRouter from '../apiServer/httpRouter'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import servConfig from '../../configfile';
import {
  adjustUnitsViewFilter,
} from '../../srcCommon/helpers/permissionControl';
import { getRtypeTemprtAlert } from '../clientData/units'
import {
  MeanTemperature_DAC_DUT_DRI,
} from '../../srcCommon/types'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo';
import type { ApiParams, ApiResps } from '../apiServer/httpRouter'
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { parseDriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';

type EnvRowDb = Awaited<ReturnType<typeof sqldb.VAVS.getVAVsList>>[number];
type EnvRow = ApiResps['/dri/get-dri-vavs-list']['list'][number];

const requiredFiltersCheck1 = function (reqParams: ApiParams['/dri/get-dri-vavs-list']) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.unitId) { reqParams.unitIds = [reqParams.unitId]; }
  delete reqParams.unitId;
  if (reqParams.stateId) { reqParams.stateIds = [reqParams.stateId]; }
  delete reqParams.stateId;
  if (reqParams.cityId) { reqParams.cityIds = [reqParams.cityId]; }
  delete reqParams.cityId;
}

httpRouter.privateRoutes['/dri/get-dri-vavs-list'] = async function (reqParams, session) {
  requiredFiltersCheck1(reqParams);
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
      const adjusted = await adjustUnitsViewFilter(session, {
        clientIds: reqParams.clientIds,
        unitIds: reqParams.unitIds,
      });
      reqParams.clientIds = adjusted.clientIds;
      reqParams.unitIds = adjusted.unitIds;
  }

  const dbList = await sqldb.VAVS.getVAVsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    rtypeId: reqParams.rtypeId,
    // SKIP: reqParams.SKIP,
    // LIMIT: reqParams.LIMIT,
  });
  const lastTelemetries = await devsLastComm.loadLastTelemetries_dri({
    devIds: (dbList.length <= 500) ? dbList.map((x) => x.DEV_ID) : undefined,
  });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText && reqParams.searchText.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list = [];

  for (const regDevRaw of dbList) {
    const { regDev, unComis } = fillExtraProps(regDevRaw, lastTelemetries);

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

    if (reqParams.includeMeanTemperature && (dbList.length < 500)) {
      const tpFilter: Parameters<typeof sqldb.cache_cond_tel.getLatestMeanTp>[0] = { timezoneOffset: -3 };
      if (regDevRaw.TIMEZONE_ID) {
        tpFilter.timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: regDevRaw.TIMEZONE_ID, TIMEZONE_AREA: regDevRaw.TIMEZONE_AREA, TIMEZONE_OFFSET: regDevRaw.TIMEZONE_OFFSET });
      }
      tpFilter.devId = regDevRaw.DEV_ID;
      const tpRows = await sqldb.cache_cond_tel.getLatestMeanTp(tpFilter);
      const tpRow = tpRows[0];
      const meanTp = tpRow && jsonTryParse<MeanTemperature_DAC_DUT_DRI>(tpRow.meantp);
      if (meanTp) {
        delete meanTp.secI;
        delete meanTp.secF;
        regDev.tpstats = meanTp;
      }
    }

    list.push(regDev);
  }

  return { list, totalItems };
}

type LastMessagesManager = Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries_dri>>;
function fillExtraProps(regDevRaw: EnvRowDb, lastTelemetries: LastMessagesManager): { regDev: EnvRow, unComis: boolean, lastMessageTS?: number } {
  const driCfg = parseDriConfig(regDevRaw);
  const dev = lastTelemetries.lastDriTelemetry(regDevRaw.DEV_ID, driCfg);
  const status = (dev && dev.status) || 'OFFLINE';
  const { lastTelemetry } = ((status !== 'OFFLINE') && lastTelemetries.lastDriTelemetry(regDevRaw.DEV_ID, driCfg)) || {};
  const unComis = (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID);
  const regDev = Object.assign(regDevRaw, {
    status,
    ISVISIBLE: regDevRaw.ISVISIBLE,
    lastCommTs: (dev && dev.lastMessageTS && new Date(dev.lastMessageTS).toISOString().substring(0, 19)),
    GROUP_NAME: regDevRaw.ROOM_NAME,
    Temperature: (lastTelemetry && (lastTelemetry.TempAmb !== undefined)) ? lastTelemetry.TempAmb : undefined,
    Mode: (lastTelemetry && lastTelemetry.Mode) || undefined,
    ValveState: (lastTelemetry && lastTelemetry.ValveOn != null) ? lastTelemetry.ValveOn : undefined,
    temprtAlert: getRtypeTemprtAlert(regDevRaw, (lastTelemetry && lastTelemetry.TempAmb)),
    tpstats: undefined as { med: number, max: number, min: number },
  })

  return {
    regDev,
    unComis,
  };
}


function checkIfExcludedByFilters(reqParams: ApiParams['/dri/get-dri-vavs-list'], row: EnvRow, manufacturers: number[], unComis: boolean, searchTerms: string[]): boolean {
  if (checkIfExcludedByOwnershipFilter(reqParams.ownershipFilter, row, manufacturers, unComis)) {
    return true;
  }

  if (checkIfExcludedBySearchTerms(row, searchTerms)) {
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
    if (containsSearchTerms(row, searchTerm)) continue;
    return true;
  }
  return false;
}

function containsSearchTerms(row: EnvRow, searchTerm: string): boolean {
  if (row.STATE_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CITY_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.UNIT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CLIENT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.ROOM_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.DEV_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.status?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

import type { API_External } from './httpApiRouter'
import * as faultDetection from './faultDetection'
import * as recurrentTasks from '../srcCommon/helpers/recurrentTasks'
import sqldb from '../srcCommon/db'
import { BaseFaultData, ChangeType, FaultsActs } from '../srcCommon/types'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import { createXlsx } from '../srcCommon/helpers/parseXlsx'
import { getPermissionsOnUnit, getUserGlobalPermissions, validateAllowedRequestedUnits } from '../srcCommon/helpers/permissionControl'
import { logger } from '../srcCommon/helpers/logger'
import { possibleCauses, healthIndexes, laudos, falhaAssociadaAoLaudo } from '../srcCommon/helpers/healthTypes'
import falhaRepApi from './extServices/falhaRep'
import { calculateDateByTimezone } from '../srcCommon/helpers/timezones'
import * as ramCaches from './ramCaches'
import { buildFaultsList, deleteSingleHistEntry, fetchFdetected, generateHealthRepr } from './assetHealth'
import { onHealthChange } from './dacHealthNotifs'
import { API_Internal } from './api-interface'

export interface FaultsConfig {
  ignore?: string[]
}

const healthIndexesS: {[k:number]:string} = {
  25: '1-red',
  50: '2-orange',
  75: '3-yellow',
  100: '4-green',
}

export const faults_getFaultCodes: API_External['/faults/get-fault-codes'] = async function (_reqParams, _session) {
  return { possibleCauses, healthIndexes, laudos }
}

export const dac_getHealthStatus: API_External['/dac/get-health-status'] = async function (reqParams, session) {
  if (!reqParams.dacId) throw Error('Invalid parameters, missing dacId!').HttpStatus(400);
  let row = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: reqParams.dacId })
  if (!row || !row.DAC_DEVICE_ID) throw Error('DAC not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const healthStatus = {
    H_INDEX: row.H_INDEX,
    H_DESC: row.H_DESC,
    P_CAUSES: row.P_CAUSES,
    UNIT_ID: row.UNIT_ID,
    H_REP: undefined as string,
    fdetected: undefined as {
      origin: string;
      id: string;
      faultName: string;
      faultLevel: number;
      lastActionTime: number;
      lastAction: FaultsActs[string]['lastAction'];
      lastDet?: number;
      lastRiseTS: number;
      firstRiseTS: number;
    }[]
  };

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: healthStatus.UNIT_ID });
  if (unitInfo && unitInfo.PRODUCTION === 0 && healthStatus.H_INDEX == null) {
    healthStatus.H_INDEX = 1
    healthStatus.H_DESC = 'Recém instalado'
  } else if (healthStatus.H_INDEX == null) {
    healthStatus.H_INDEX = 0
    healthStatus.H_DESC = 'Sem informação'
    healthStatus.P_CAUSES = null
  }

  healthStatus.H_REP = generateHealthRepr(healthStatus.H_DESC, healthStatus.P_CAUSES);

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const fdetected = await fetchFdetected({ DEV_ID: reqParams.dacId, FAULTS_DATA: row.FAULTS_DATA }, { area: unitInfo.TIMEZONE_AREA, offset: unitInfo.TIMEZONE_OFFSET });
    if (fdetected.length) {
      healthStatus.fdetected = fdetected;
    }
  }

  return { healthStatus }
}

export const dac_getFrHistory: API_External['/dac/get-fr-history'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.listAllDetectedFaults) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let history = await falhaRepApi['/fr-history'](reqParams);

  if (history.history) {
    history.history.forEach(f => {
      if (f.fault_id == 'comp_inoperante_l1_virtual') {
          f.name = 'Compressor Inoperante';
          f.fault_id = 'Compressor Inoperante';
      }
    });
  }

  return history
}

export const dac_getFaultDescs: API_External['/dac/get-fault-descs'] = async function (_reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.listAllDetectedFaults) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  return falhaRepApi['/definitions-fault']();
}

export async function getDacHIndex(reqParams: { dac_id: string }) {
  if (!reqParams.dac_id) throw Error('Invalid parameters, missing dacId!').HttpStatus(400);
  const row = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: reqParams.dac_id })
  if (!row || !row.DAC_DEVICE_ID) throw Error('DAC not found').HttpStatus(400);
  return { H_INDEX: row.H_INDEX };
}

function findAssociatedFault(desc:string, index: number, application: string) {
  return falhaAssociadaAoLaudo.find((falha) => {
    if (falha.laudo !== desc) return false;
    if (falha.healthIndex != null && falha.healthIndex !== index) return false;
    if (falha.application != null && falha.application !== application) return false;
    return true;
  });
}

async function insertPcauses(P_CAUSES: string, userId: string) {
  if (P_CAUSES) {
    const insert_p_causes = await sqldb.P_CAUSES.w_insert({
      CAUSES: P_CAUSES,
    }, userId);
    return insert_p_causes && insert_p_causes.insertId;
  }
  return null;
}

async function undoPartialHealthChange(insertedPcauseId: number | null, insertedHealthHistId: number | null, dataToLog: any, userId: string) {
  logger.error(`Erro alterando a saúde atual`, {
    data: dataToLog,
  });
  insertedHealthHistId && await sqldb.ASSETS_HEALTH_HIST.w_deleteById({ ID: insertedHealthHistId }, userId);
  insertedPcauseId && await sqldb.P_CAUSES.w_deleteRow({ P_CAUSE_ID: insertedPcauseId });
}

async function doHealthChange(
  deviceData: {
    ASSET_ID: number
    DEV_ID: string
  },
  nextHealthStatus: {
    H_INDEX: number,
    H_DESC: string,
    CT_ID: ChangeType,
    H_OFFL?: string,
    P_CAUSES?: string,
    userId: string,
  }
) {
  let pCauseInsertId: number | null = null;
  let ASSET_HEALTH_HIST_ID: number | null = null;
  let rowsInsertUpdate: { insertId: number, affectedRows: number } = null;
  try {
    pCauseInsertId = await insertPcauses(nextHealthStatus.P_CAUSES, nextHealthStatus.userId);

    ASSET_HEALTH_HIST_ID = (await sqldb.ASSETS_HEALTH_HIST.w_insert({
      ASSET_ID: deviceData.ASSET_ID,
      P_CAUSE_ID: pCauseInsertId,
      CT_ID: nextHealthStatus.CT_ID || ChangeType.Desconhecido,
      DAT_REPORT: Math.round(new Date().getTime() / 1000),
      H_INDEX: nextHealthStatus.H_INDEX,
      H_DESC: nextHealthStatus.H_DESC,
      H_DATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19)
    }, nextHealthStatus.userId))['insertId'];

    rowsInsertUpdate = await sqldb.ASSETS_HEALTH.w_insertOrUpdate({
      ASSET_ID: deviceData.ASSET_ID,
      HEALTH_HIST_ID: ASSET_HEALTH_HIST_ID,
    }, nextHealthStatus.userId);
  }
  catch (e) {
    await undoPartialHealthChange(pCauseInsertId, ASSET_HEALTH_HIST_ID, {
      ASSET_ID: deviceData.ASSET_ID,
      DEV_ID: deviceData.DEV_ID,
      H_DESC: nextHealthStatus.H_DESC,
      H_INDEX: nextHealthStatus.H_INDEX,
      exception: e,
    }, nextHealthStatus.userId);
  }


  if (rowsInsertUpdate !== null) {
    if (nextHealthStatus.H_OFFL !== undefined) {
      await sqldb.HEALTH_BEFORE_OFFLINE.w_insertOrUpdate({
        ASSET_HEALTH_ID: rowsInsertUpdate.insertId,
        H_OFFL: nextHealthStatus.H_OFFL
      }, nextHealthStatus.userId);
    }
  }
  return rowsInsertUpdate.affectedRows;
}

export async function setAssetHealthStatus(
  currentHealthStatus: {
    H_INDEX: number
    H_DESC: string
    ASSET_ID: number
    DEV_ID: string
    UNIT_ID: number,
    MACHINE_ID: number,
    CLIENT_ID: number,
    ASSET_ROLE: string,
  },
  nextHealthStatus: {
    H_INDEX: number,
    H_DESC: string,
    CT_ID: ChangeType,
    H_OFFL?: string,
    P_CAUSES?: string,
    userId: string,
  }) {
  // Verifica se a unidade está em produção se não tiver seta os valores da saúde, se estiver e production_timestamp > 1 dia seta os valores da saúde
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: currentHealthStatus.UNIT_ID });
  if (unitInfo && unitInfo.PRODUCTION === 0) {
    nextHealthStatus.H_DESC = 'Recém instalado';
    nextHealthStatus.H_INDEX = 1;
  }

  // set health only if it would actually change
  if (nextHealthStatus.H_DESC === currentHealthStatus.H_DESC && nextHealthStatus.H_INDEX === currentHealthStatus.H_INDEX) return null;

  let affectedRows = 0;

  if (nextHealthStatus.H_INDEX != null && currentHealthStatus.ASSET_ID != null) {
    affectedRows = await doHealthChange(currentHealthStatus, nextHealthStatus);
  } else {
    console.log('H_INDEX is null');
  }

  if (nextHealthStatus.CT_ID === ChangeType.Manual) {

    const appli = `${currentHealthStatus.ASSET_ROLE}-${currentHealthStatus.DEV_ID.substring(0,3)}`
    const falhaAssociada = findAssociatedFault(nextHealthStatus.H_DESC, nextHealthStatus.H_INDEX, appli);
    if (falhaAssociada) {
      const faultsData: FaultsActs = Object.fromEntries([[falhaAssociada.faultId, { lastAction: "APPROVED" }]]);
      await saveFaultsData(currentHealthStatus.DEV_ID, faultsData, nextHealthStatus.userId || '[?]');  
    }
    if (nextHealthStatus.H_INDEX === 100) { // if health was set manually to green, there aren't any faults that should have their status kept.
      await saveFaultsData(currentHealthStatus.DEV_ID, {}, nextHealthStatus.userId || '[?]')
    }
  }

  const prevIndex = currentHealthStatus?.H_INDEX;

  await onHealthChange({
    devId: currentHealthStatus.DEV_ID,
    prevIndex,
    newIndex: nextHealthStatus.H_INDEX,
    newReport: nextHealthStatus.H_DESC,
    clientId: currentHealthStatus.CLIENT_ID,
    unitId: currentHealthStatus.UNIT_ID,
    machineId: currentHealthStatus.MACHINE_ID,
  });

  return { affectedRows };
}

export async function setDacHealthStatus(qPars: {
  DAC_ID: string,
  H_INDEX: number,
  H_DESC: string,
  CT_ID: ChangeType,
  H_OFFL?: string,
  P_CAUSES?: string,
  userId: string,
}) {
  const healthStatus = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: qPars.DAC_ID });

  if (!healthStatus || !healthStatus.ASSET_ID) {
    return null;
  }

  return setAssetHealthStatus({ DEV_ID: qPars.DAC_ID, ...healthStatus }, qPars);
}

export const resendAssociatedFault = async function (
  reqParams: { devId: string, healthIndex: number, laudo?: string },
  devInfo?: { ASSET_ROLE: string },

) {
  let appli = undefined;
  if (devInfo) {
    appli = `${devInfo.ASSET_ROLE}-${reqParams.devId.substring(0,3)}`
  }
  const falhaAssociada = findAssociatedFault(reqParams.laudo, reqParams.healthIndex, appli);
  if (falhaAssociada) {
    await falhaRepApi['/new-fault']({
      dev_id: reqParams.devId,
      fault_id: falhaAssociada.faultId,
      restab: false,
    });
  }
}

export const dac_saveHealthInfo: API_External['/dac/save-health-info'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Permission denied!').HttpStatus(403)
  const indexInfo = healthIndexes[String(reqParams.healthIndex)]
  if (!indexInfo) throw Error('Invalid health index').HttpStatus(400)

  await setDacHealthStatus({
    DAC_ID: reqParams.dacId,
    H_INDEX: reqParams.healthIndex,
    P_CAUSES: (reqParams.possibleCauses && reqParams.possibleCauses.join(',')) || null,
    H_DESC: reqParams.laudo || indexInfo.laudo,
    H_OFFL: null,
    CT_ID: ChangeType.Manual,
    userId: session.user,
  });

  await resendAssociatedFault({devId: reqParams.dacId, ...reqParams});

  return dac_getHealthStatus(reqParams, session);
}

export const dac_saveObservationInfo: API_External['/dac/save-observation-info'] = async function (reqParams, session) {
  if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Permission denied!').HttpStatus(403)
  const assetInfo = await sqldb.ASSETS.getAssetByDeviceCode({ DEVICE_CODE: reqParams.dacId })
  if (!assetInfo) throw Error('Asset not found').HttpStatus(400);
  const saveInfo = await sqldb.ASSETS_HEALTH_OBS.w_insert({
    ASSET_ID: assetInfo.ASSET_ID,
    OBS_DESC: reqParams.observationDesc || '',
    DAT_REPORT: Math.round(new Date().getTime() / 1000),
    USER_REPORT: session.user,
  }, session.user);

  return `INSERT ${saveInfo.affectedRows}`;
}

export const dac_editObservationInfo: API_External['/dac/edit-observation-info'] = async function (reqParams, session) {
  if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Permission denied!').HttpStatus(403)

  const editInfo = await sqldb.ASSETS_HEALTH_OBS.w_updateObservation({
    OBS_ID: reqParams.observationId,
    OBS_DESC: reqParams.observationDesc || '',
  }, session.user)

  return `UPDATE ${editInfo.affectedRows}`;
}

export const deleteDacHealthHist: API_External['/delete-dac-health-hist'] = async function (reqParams, session) {
  if (session.permissions.HEALTH_MANAGEMENT) { } // OK
  else { throw Error('Ação não permitida para o seu usuário').HttpStatus(403); }

  if (reqParams.itemDate) { reqParams.itemsDates = [reqParams.itemDate]; }
  delete reqParams.itemDate;
  if (reqParams.itemsDates && reqParams.itemsDates.length > 0) { } // OK
  else { throw Error('Nenhum item informado').HttpStatus(400); }

  const healthHistInfo = await sqldb.ASSETS_HEALTH_HIST.getAssetHealthHistInfo({ DAC_ID: reqParams.dacId, itemDates: reqParams.itemsDates })
  if (!healthHistInfo) throw Error('Health Hist not found').HttpStatus(400);

  // se existe histórico, existe asset
  const assetId = healthHistInfo?.[0]?.ASSET_ID;

  let delInfo = {
    affectedRows: 0,
  };

  if (healthHistInfo.length > 0) {
    for (const hist of healthHistInfo) {
      delInfo.affectedRows += await deleteSingleHistEntry(
        assetId,
        hist,
        session.user
      );
    }
  }

  return `DELETED ${delInfo.affectedRows}`;
}

export const cleanHistory = function(
  rows: {
    DEV_ID: string;
    DAT_REPORT: number;
    H_INDEX: number;
    H_DESC: string;
    P_CAUSES: string;
    CT_ID: number;
    TYPECHANGE: string;
    UNIT_ID: number;
    DAT_BEGMON?: string;
    HEALTH_HIST_ID: number;
    ASSET_ID: number;
  }[],
  timezoneInfo: {
    TIMEZONE_ID: number;
    TIMEZONE_AREA: string;
    TIMEZONE_OFFSET: number;
  }) {
  return rows.filter((row) => {
    const dateBegMon = new Date(row.DAT_BEGMON);
    const dateReport = new Date(row.DAT_REPORT * 1000);
    if (dateReport < dateBegMon) return false;
    if (row.CT_ID === 5) return false;
    if ((row.CT_ID === 4) && (row.H_INDEX === 2)) return false;
    return true;
  })
  .sort((a, b) => {
    if (a.DAT_REPORT === b.DAT_REPORT) {
      return b.H_INDEX - a.H_INDEX;
    }
    return a.DAT_REPORT - b.DAT_REPORT;
  }).reverse()
  .map((row) => {
    return {
      dacId: row.DEV_ID,
      devId: row.DEV_ID,
      DAT_REPORT: row.DAT_REPORT,
      date: timezoneInfo ? calculateDateByTimezone({ DATE: new Date(row.DAT_REPORT * 1000).toISOString(), TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET }) : new Date(row.DAT_REPORT * 1000 - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300',
      healthIndex: healthIndexesS[row.H_INDEX] || null,
      H_INDEX: row.H_INDEX,
      desc: row.H_DESC,
      changeType: row.TYPECHANGE,
      possCauses: (row.P_CAUSES && row.P_CAUSES.split(',').map(id => (possibleCauses[id] && possibleCauses[id].text))) || null,
      UNIT_ID: row.UNIT_ID,
      assetId: row.ASSET_ID,
    };
  });
}

export const dac_getHealthHist: API_External['/dac/get-health-hist'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.unitId !== undefined) {
    reqParams.unitIds = [reqParams.unitId];
  }
  delete reqParams.unitId;

  const allowed = await validateAllowedRequestedUnits(reqParams, session);
  reqParams.clientIds = allowed.clientIds;
  reqParams.unitIds = allowed.unitIds;

  return dac_getHealthHist_internal(reqParams);
}
export const dac_getHealthHist_internal: API_Internal['/diel-internal/health/dac/get-health-hist'] = async function (reqParams) {
  if (reqParams.LIMIT != null) {
    if (reqParams.SKIP == null) { reqParams.SKIP = 0; }
  }
  const calculated: { since?: number } = {};
  if (reqParams.SINCE != null) {
    if (reqParams.SINCE.length === 19) { reqParams.SINCE += '-0300'; }
    calculated.since = Math.trunc(new Date(reqParams.SINCE).getTime() / 1000);
    if (!calculated.since) { throw Error('Invalid parameter: SINCE'); }
  }

  const rows = await sqldb.ASSETS_HEALTH_HIST.getList({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    machineId: reqParams.groupId,
    dacId: reqParams.dacId,
    SKIP: reqParams.SKIP,
    LIMIT: reqParams.LIMIT,
    since: calculated.since,
    withDatBegMon: true,
  });

  const timezoneInfo = reqParams.dacId && await sqldb.DEVICES.getTimezoneInfoByDev({ devId: reqParams.dacId });

  return { list: cleanHistory(rows, timezoneInfo) }
}

export const deleteDacObservation: API_External['/delete-dac-observation'] = async function (reqParams, session) {

  if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Ação não permitida para o seu usuário').HttpStatus(403);

  if (reqParams.itemDate) { reqParams.itemsDates = [reqParams.itemDate]; }
  delete reqParams.itemDate;
  if (!(reqParams.itemsDates && reqParams.itemsDates.length > 0)) throw Error('Nenhum item informado').HttpStatus(400);

  const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: reqParams.dacId });
  if (!dacInfo) throw Error('Device not found').HttpStatus(400);

  const delInfo = await sqldb.ASSETS_HEALTH_OBS.w_deleteRow({
    DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID,
    itemsDates: reqParams.itemsDates,
  }, session.user);

  return `DELETED ${delInfo.affectedRows}`;
}

export const dac_getObservation: API_External['/dac/get-observation'] = async function (reqParams, session) {
  if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Ação não permitida para o seu usuário').HttpStatus(403);

  const calculated: { since?: number } = {};
  if (reqParams.SINCE != null) {
    if (reqParams.SINCE.length === 19) { reqParams.SINCE += '-0300'; }
    calculated.since = Math.trunc(new Date(reqParams.SINCE).getTime() / 1000);
    if (!calculated.since) { throw Error('Invalid parameter: SINCE'); }
  }

  const rows = await sqldb.ASSETS_HEALTH_OBS.getList({
    dacId: reqParams.dacId,
    SINCE: calculated.since,
  });

  const timezoneInfo = reqParams.dacId && await sqldb.DEVICES.getTimezoneInfoByDev({ devId: reqParams.dacId });

  const list = rows.map((row) => {
    return {
      dacId: row.DEV_ID,
      date: timezoneInfo ? calculateDateByTimezone({ DATE: new Date(row.DAT_REPORT * 1000).toISOString(), TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET }) : new Date(row.DAT_REPORT * 1000 - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300',
      OBS_DESC: row.OBS_DESC,
      userId: row.USER_REPORT,
      observationId: row.OBS_ID
    };
  });

  return { list }
}

const handlePossibleHealthChange = async (
  faultsActs: FaultsActs,
  knownFaults: Awaited<ReturnType<typeof faultDetection.getKnownFaults>>,
  action: 'APPROVED' | 'REJECTED' | 'ERASED' | 'RESTABLISHED',
  fdetect: Awaited<ReturnType<typeof faultDetection.getDevDetectedFaults>>['list'],
  devInf: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH.getDevHealthStatus>> & { currFaultId: string },
  userId: string,
) => {
  const faultId = devInf.currFaultId;
  let faultsToRestablish: string[] = [];
  if (action === 'APPROVED' || action === 'RESTABLISHED') {
    faultsActs = faultDetection.cleanFaultsActs(faultsActs, knownFaults);
    faultsToRestablish = forceFaultsActsHealth(faultsActs, { faultId, action });
    const targetHealth = calculateHealth(
      faultsActs,
      knownFaults,
      fdetect,
      {
        H_DATE: devInf.H_DAT_REPORT,
        faultId,
        ...devInf,
      }
    );
    const indexInfo = healthIndexes[String(targetHealth.H_INDEX)]
    if (!indexInfo) throw Error('Invalid health index').HttpStatus(500)
    const laudo = targetHealth.laudo;
    if (devInf.H_INDEX !== targetHealth.H_INDEX) {
      await setDacHealthStatus({
        DAC_ID: devInf.DEV_ID,
        H_INDEX: targetHealth.H_INDEX,
        P_CAUSES: laudo?.pcauses?.join(',') ?? null,
        H_DESC: laudo?.text ?? indexInfo.laudo,
        CT_ID: ChangeType.FDD,
        userId,
      });
    }
  }
  return faultsToRestablish;
}

export const dac_detectedFaultConfirmation: API_External['/dac/detected-fault-confirmation'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Permission denied!').HttpStatus(403)
  const devInf = await sqldb.ASSETS_HEALTH.getDevHealthStatus({ DEV_ID: reqParams.devId });
  if (!devInf) throw Error('Invalid dac!').HttpStatus(400)

  let action: 'APPROVED' | 'REJECTED' | 'ERASED' | 'RESTABLISHED' = reqParams.action;
  if (!['APPROVED', 'REJECTED', 'ERASED', 'RESTABLISHED'].includes(action)) {
    throw Error('Invalid approval value!').HttpStatus(400);
  }

  const appli = `${devInf.ASSET_ROLE}-${reqParams.devId.substring(0,3)}`
  const currAssocFault = findAssociatedFault(devInf.H_DESC, devInf.H_INDEX, appli);

  // Recuperar os dados da falha
  const faultId = reqParams.faultId;
  const knownFaults = await faultDetection.getKnownFaults();
  const sudFaultData = knownFaults?.[faultId];
  if (!sudFaultData) {
    throw Error('No fault information found!').HttpStatus(400);
  }
  let faultsActs = jsonTryParse<FaultsActs>(devInf?.FAULTS_DATA) ?? {};
  if (!faultsActs[faultId]) faultsActs[faultId] = {};
  const faultActs = faultsActs[faultId];
  if (['APPROVED', 'REJECTED', 'ERASED'].includes(action)) {
    // Acabei de checar quais variantes 'action' pode ser
    // @ts-ignore
    faultActs.lastAction = action;
  }
  else {
    faultsActs[faultId].lastAction = faultDetection.getNextFaultState(faultsActs, faultId, "restab", true);
  }
  faultActs.lastActionTime = Date.now();
  if (faultActs.lastAction === 'REJECTED') delete faultActs.firstRiseTS;

  const { list: fdetect } = await faultDetection.getDevDetectedFaults(devInf.DEV_ID);
  const faultsToRestablish = await handlePossibleHealthChange(
    faultsActs,
    knownFaults,
    action,
    fdetect,
    {
      currFaultId: currAssocFault?.faultId,
      ...devInf,
    },
    session.user
  );
  
  let restablishments_feedback = faultsToRestablish.map(async (faultId) => {
    await falhaRepApi['/fault-feedback']({
      dev_id: devInf.DEV_ID,
      fault_id: faultId,
      state: 'APPROVED',
      notif_type: 'RESTAB',
      update_first_detect: false,
    })
  });

  await saveFaultsData(devInf.DEV_ID, faultsActs, session.user);

  let faultState: "APPROVED" | "REJECTED";
  let notifType: "DETECT" | "RESTAB" = "DETECT";
  if (action === "ERASED") {
    faultState = "REJECTED";
  }
  else if (action === "RESTABLISHED") {
    faultState = "APPROVED";
    notifType = "RESTAB";
  }
  else {
    faultState = action;
  }

  await falhaRepApi['/fault-feedback']({
    dev_id: devInf.DEV_ID,
    fault_id: faultId,
    state: faultState,
    notif_type: notifType,
    update_first_detect: true,
  })

  for (const result of await Promise.allSettled(restablishments_feedback)) {
    if (result.status === 'rejected') {
      logger.warn(result.reason);
    }
  }

  return 'DONE'
}

export async function saveFaultsData(DAC_ID: string, faultsActs: FaultsActs, userId: string) {
  //atualizar em faults_datas, através do condenser_health_id <- dac_condensers
  const assetInfo = await sqldb.ASSETS_HEALTH.getAssetHealthByDevCode({ DEVICE_CODE: DAC_ID });
  if (!assetInfo) throw Error('Condenser Health not found').HttpStatus(400);

  const result = await sqldb.FAULTS_DATAS.w_insertOrUpdate({ ASSET_HEALTH_ID: assetInfo.ASSET_HEALTH_ID, DATA: JSON.stringify(faultsActs) }, userId)
  ramCaches.DEVACS.setDacFActs(DAC_ID, faultsActs);
  return result;
}

export const getDacsFaults: API_External['/get-dacs-faults'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else { throw Error('Not allowed').HttpStatus(403) }

  const admPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[1] = {
    includeHealthDesc: true,
    includeFaultsData: true,
    addUnownedDevs: true,
    orderBy: [{ col: 'DEVICES.DEVICE_CODE', asc: true }],
  }
  const qPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[0] = {
    clientIds: reqParams.clientIds,
  }
  const limitDays = Date.now() - 14 * 24 * 60 * 60 * 1000; // 14 dias, duas semanas
  //const limitMonth = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 dias, um mês
  const limit24h = Date.now() - 24 * 60 * 60 * 1000; // 24 horas, um dia
  const list = [];
  const rows = await sqldb.DACS_DEVICES.buildDacsListSentence(qPars, admPars)
  const knownFaults = await faultDetection.getKnownFaults();
  const { list: detectedFaults } = await faultDetection.getAllDetectedFaults();

  let ids = [];
  ids.push(...rows.map((x) => x.DAC_ID));

  let value = await falhaRepApi['/detected-faults/list-dacs']({
    dacs_id: ids,
  });
  
  const fixedRows: Parameters<typeof buildFaultsList>[0] = rows.map((x) => {
    return {
      DEV_ID: x.DAC_ID,
      ...x,
    };
  })

  const deviceFaults = buildFaultsList(
    fixedRows,
    knownFaults,
    detectedFaults,
    value['list'],
    limit24h,
    limitDays,
  );

  const rowsByDac = Object.fromEntries(rows.map((x) => [x.DAC_ID, x]));


  // re-preenchendo os campos que o endpoint novo não retorna (pois não são usados)
  const faults: Awaited<ReturnType<typeof getDacsFaults>>['list'] = deviceFaults['list'].map((entry) => {
    let dac = rowsByDac[entry.DEV_ID];
    return {
      DAC_ID: entry.DEV_ID,
      CITY_NAME: dac?.CITY_NAME,
      CITY_ID: dac?.CITY_ID,
      STATE_ID: dac?.STATE_ID,
      status: null as string, // mesma coisa que o antigo
      GROUP_ID: dac.GROUP_ID,
      GROUP_NAME: dac?.GROUP_NAME,
      DAC_NAME: dac?.DAC_NAME,
      DAC_COMIS: dac?.DAC_COMIS,
      ...entry,
  }
})

  return { list: faults, expirationLimit: deviceFaults.expirationLimit };
}

export const exportDacsFaults: API_External['/export-dacs-faults'] = async function (reqParams, session, { res }) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else { throw Error('Not allowed').HttpStatus(403) }

  const admPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[1] = {
    includeHealthDesc: true,
    includeFaultsData: true,
    addUnownedDevs: true,
    includeLastHealthHistEntry: true,
  }
  const qPars: Parameters<typeof sqldb.DACS_DEVICES.buildDacsListSentence>[0] = {
    clientIds: reqParams.clientIds,
  }
  const data: (string | number)[][] = [
    [
      'Cliente',
      'Estado',
      'Cidade',
      'Unidade',
      'Máquina',
      'DAC_ID',
      'Nome',
      'Saúde',
      'Índice', // grau do problema como risco iminente, manutenção urgente...
      'Data da saúde',
      'Tipo de mudança de saúde',
      'Offline',
      'Último verde',
      'Falhas',
    ]
  ];
  const rows = await sqldb.DACS_DEVICES.buildDacsListSentence(qPars, admPars);
  const knownFaults = await faultDetection.getKnownFaults();
  const { list: detectedFaults } = await faultDetection.getAllDetectedFaults();
  const devIds = rows.map((x) => x.DAC_ID);
  const lastGreens = Object.fromEntries(
    (await sqldb.ASSETS_HEALTH_HIST.getLastGreen({ DAC_IDS: devIds }))
    ?.map((x) => [x.DAC_ID, x])
  );
  for (const row of rows) {
    const dacFaults = detectedFaults.find((x) => x.dev_id === row.DAC_ID);
    const fdetect = dacFaults && dacFaults.faults;
    const approvedFaults = [];
    const faultsActs = (row.FAULTS_DATA && jsonTryParse<FaultsActs>(row.FAULTS_DATA)) || {};
    if (Array.isArray(fdetect)) {
      for (const faultType of fdetect) {
        const faultActs = faultsActs[faultType.fault_id] || {};
        if (faultActs.lastAction !== 'APPROVED') {
          continue;
        }

        const faultInfo = knownFaults[faultType.fault_id];
        if (!faultInfo) continue;
        approvedFaults.push(faultInfo.faultName);
      }
    }

    let isOffline = false;
    if ((row.H_INDEX === 2) && row.H_OFFL) {
      isOffline = true;
      const H_OFFL = jsonTryParse<{
        H_INDEX: number
        H_DESC: string
        P_CAUSES: string
      }>(row.H_OFFL);
      if (H_OFFL) {
        row.H_INDEX = H_OFFL.H_INDEX;
        row.H_DESC = H_OFFL.H_DESC;
        row.P_CAUSES = H_OFFL.P_CAUSES;
      }
    }

    const isHealthFault = [4, 25, 50, 75].includes(row.H_INDEX); // && laudosDeFalha.includes(row.H_DESC);

    if ((!isHealthFault) && (!approvedFaults.length)) { continue; }

    if (row.H_INDEX == null) {
      row.H_DESC = 'Sem informação'
    }

    let hInfo = healthIndexes[String(row.H_INDEX)];
    const lastGreen = lastGreens[row.DAC_ID] ?? { DAC_ID: row.DAC_ID, DAT_REPORT: undefined, DAT_UNTIL: undefined };

    data.push([
      row.CLIENT_NAME || '',
      row.STATE_ID || '',
      row.CITY_NAME || '',
      row.UNIT_NAME || '',
      row.GROUP_NAME || '',
      row.DAC_ID || '',
      row.DAC_NAME || '',
      row.H_DESC || '',
      (hInfo && hInfo.titulo) || '',
      row.H_DATE || '',
      row.TYPECHANGE || '',
      isOffline ? 'Offline' : '',
      (lastGreen && lastGreen.DAT_UNTIL && (new Date(lastGreen.DAT_UNTIL * 1000 - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300')) || '',
      approvedFaults.join(', '),
    ]);
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('Content-Disposition', 'attachment; filename="Falhas.xlsx"');
  res.append('filename', `Falhas.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

export const ignoreFaultCheck: API_External['/ignore-fault-check'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Permission denied!').HttpStatus(403);
  if (!reqParams.dev_id) throw Error('Parâmetros inválidos, faltou "dev_id"').HttpStatus(400);
  if (!reqParams.faultId) throw Error('Parâmetros inválidos, faltou "faultId"').HttpStatus(400);
  if (![true, false].includes(reqParams.ignore)) throw Error('Parâmetros inválidos, faltou "ignore"').HttpStatus(400);

  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: reqParams.dev_id });
  if (!dacInf) throw Error('DAC não encontrado').HttpStatus(400);
  const knownFaults = await faultDetection.getKnownFaults();
  const validFaults = Object.keys(knownFaults);
  if (!validFaults.includes(reqParams.faultId)) throw Error('A falha não é ignorável').HttpStatus(400);

  let faultsCfg = jsonTryParse<FaultsConfig>(dacInf.FAULTSCFG) || {};
  if (!faultsCfg.ignore) faultsCfg.ignore = [];
  faultsCfg.ignore = faultsCfg.ignore.filter(id => validFaults.includes(id));

  if (reqParams.ignore) {
    if (!faultsCfg.ignore.includes(reqParams.faultId)) {
      faultsCfg.ignore.push(reqParams.faultId);
    }
  } else {
    faultsCfg.ignore = faultsCfg.ignore.filter(id => (id !== reqParams.faultId));
  }

  if (faultsCfg.ignore.length === 0) {
    delete faultsCfg.ignore;
  }
  if (Object.keys(faultsCfg).length === 0) {
    faultsCfg = null;
  }

  return { success: true };
}


export function startHealthDurationsService() {
  recurrentTasks.runLoop({
    iterationPause_ms: 8 * 60 * 60 * 1000, // 8h wait
    initialDelay_ms: 3 * 60 * 1000,
    taskName: "DAC_HEALTH_DUR",
  }, updateDacsHealthDurations);
}
async function updateDacsHealthDurations () {
  const maxChanges = 3000;
  const dacsList = await sqldb.DACS_DEVICES.getListBasic1({});
  let changesCount = 0;
  for (const row of dacsList) {
    const healthHist = await sqldb.ASSETS_HEALTH_HIST.getListDurations({ DEV_ID: row.DAC_ID });
    for (let i = 0; i < healthHist.length; i++) {
      const currentEntry = healthHist[i];
      const DAT_UNTL_expected = (i > 0) ? healthHist[i - 1].DAT_REPORT : null;
      if (currentEntry.DAT_UNTIL !== DAT_UNTL_expected) {
        await sqldb.ASSETS_HEALTH_HIST.w_updateDuration({
          DAC_ID: currentEntry.DEV_ID,
          DAT_REPORT: currentEntry.DAT_REPORT,
          DAT_UNTIL: DAT_UNTL_expected,
        });
        changesCount++;
      }
    }
    if (changesCount >= maxChanges) {
      logger.info(`DBG72 stopping at ${row.DAC_ID}`);
      break;
    }
  }
}

function forceFaultsActsHealth(
  faultsActs: FaultsActs,
  targetFault: { faultId: string, action: 'APPROVED'|'RESTABLISHED' }
): string[] {
  let now = Date.now();
  let altered: string[] = [];
  if (targetFault.action === 'APPROVED') {
    for (const [id, fa] of Object.entries(faultsActs)) {
      const currentAction = fa.lastAction;
      if (currentAction === "PENDING") {
        fa.lastAction = 'RESTABLISHED';
        fa.lastActionTime = now;
        altered.push(id);
      }
    }
  }  
  faultsActs[targetFault.faultId] = Object.assign(faultsActs[targetFault.faultId] ?? {}, { lastAction: targetFault.action, lastActionTime: now })
  return altered;
}

export function calculateHealth(
  faultsActs: FaultsActs,
  knownFaults: { [faultId: string]: BaseFaultData },
  dacFaults: { fault_id: string; last_det: number; }[],
  currentHealth: { H_DESC: string, H_INDEX: number, faultId?: string, H_DATE: number, H_TYPECHANGE: string }
): {
  laudo: { text: string, pcauses?: string[] },
  H_INDEX: number,
} {
  // "faultsActs" contém o último evento de aprovação de cada falha
  // "selectedFault" é a falha mais grave ou mais antiga detectada para o dispositivo
  let selectedFault: {
    faultData: BaseFaultData,
    lastDet: number,
  } = null;

  const approvedFaultTimeLimit = 20 * 24 * 3600 * 1000;
  const now = Date.now();

  for (const [id, faultAct] of Object.entries(faultsActs)) {
    if (faultAct.lastAction === 'APPROVED' || faultAct.lastAction === 'RESTAB_WAITING' || faultAct.lastAction === 'RESTAB_PENDING') { /* OK */ }
    else continue;

    const faultData: BaseFaultData = knownFaults[id];
    if (!faultData) continue;

    const fdet = dacFaults && dacFaults.find((x) => x.fault_id === id);
    const lastDet = (fdet && fdet.last_det) ?? faultAct.lastRiseTS;
    // Comentei a linha baixo porque mesmo que não tenha registro da data da última detecção a falha deve ser considerada.
    // if (!lastDet) continue;

    // Se a falha for muito antiga, ignora na hora de calcular saúde.
    // Se não soubermos quando a falha aconteceu, também ignoramos.
    if ((!lastDet || now - lastDet > approvedFaultTimeLimit) && faultData.faultId !== currentHealth.faultId) continue;

    // Verifica se a falha é mais grave
    if ((!selectedFault) || (faultData.faultLevel < selectedFault.faultData.faultLevel)) {
      selectedFault = {
        faultData,
        lastDet,
      };
      continue;
    }

    // Verifica se a falha é mais antiga
    if ((faultData.faultLevel === selectedFault.faultData.faultLevel)
      && (lastDet != null) && (selectedFault.lastDet == null || lastDet < selectedFault.lastDet)
      && faultData.faultId === currentHealth.faultId
    ) {
      selectedFault = {
        faultData,
        lastDet,
      };
    }
  }

  if (selectedFault) {
    const faultData = selectedFault.faultData;
    const laudo = laudos.find((l) => l.text === faultData.faultName) || null;
    return {
      H_INDEX: faultData.faultLevel,
      laudo,
    };
  }
  else {
    return {
      H_INDEX: 100,
      laudo: { text: "Sistema operando corretamente" },
    };
  }
}

export const dac_getInstallationFaults: API_External['/dac/get-installation-faults'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.listAllDetectedFaults) throw Error('Not allowed').HttpStatus(403);

  const falhasQuery = {
    dev_id: reqParams.devId,
    fault_name: reqParams.faultName,
    start_time: reqParams.startTime,
    end_time: reqParams.endTime,
    notif_type: reqParams.notifType,
  };

  const falhas = await falhaRepApi['/falhas-instalacao'](falhasQuery);
  logger.info(`Resultado do falhas-instalacao: ${JSON.stringify(falhas)}`);

  if (falhas && falhas.falhas) {
    const dacs: {
      [devId: string]: {
        DAC_ID: string,
        CLIENT_ID: number,
        UNIT_ID: number,
        GROUP_ID: number,
        DAC_APPL: string,
        GROUP_NAME: string,
        UNIT_NAME: string,
        CLIENT_NAME: string,
      }
    } = {};
    const devIds = Object.keys(falhas.falhas);
    if (devIds.length > 0) {
      const dacInfos = await sqldb.DACS_DEVICES.getDacsFromList({ devIds });
      for (const dacInfo of dacInfos) {
        if (falhas.falhas[dacInfo.DAC_ID]) {
          dacs[dacInfo.DAC_ID] = dacInfo;
        }
      }
    }
    return {
      falhas: falhas.falhas,
      dacs: dacs,
      success: true
    }
  }
  else {
    return {
      falhas: {},
      dacs: {},
      success: false,
    };
  }
}

export const dac_postEnableFaults: API_External['/dac/enable-faults'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Not allowed').HttpStatus(403);

  return falhaRepApi['/enabled-faults']({
    dev_id: reqParams.dev_id,
    fault_id: reqParams.fault_id,
    enabled: reqParams.enabled,
    description: reqParams.description,
    user: reqParams.user,
    client: reqParams.client,
    unit: reqParams.unit,
    unit_id: reqParams.unit_id,
  });
}

export const dac_getEnableFaultsDac: API_External['/dac/enable-faults-dac'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Not allowed').HttpStatus(403);

  return falhaRepApi['/enabled-faults/list-dac']({
    dev_id: reqParams.dev_id,
  });
}

export const dac_getEnableFaultsAll: API_External['/dac/get-enable-faults-all'] = async function (reqParams: {}, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Not allowed').HttpStatus(403);

  return falhaRepApi['/enabled-faults/list-all']();
}

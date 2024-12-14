import { FaultsActs } from '../types'
import sqldb from '../db'
import jsonTryParse from '../helpers/jsonTryParse';
import { logger } from '../helpers/logger';

async function registerFault (faultData: { id: string, name: string }, damInf: { DAM_ID: string, FAULTSDATA: string }, userId: string): Promise<boolean> {
  const faultsActs = (damInf.FAULTSDATA && jsonTryParse<FaultsActs>(damInf.FAULTSDATA)) || {};
  if (!faultsActs[faultData.id]) faultsActs[faultData.id] = {};
  const faultActs = faultsActs[faultData.id];

  faultActs.lastRiseTS = Date.now();
  if (!faultActs.firstRiseTS) faultActs.firstRiseTS = Date.now();

  const limit24h = Date.now() - 24 * 60 * 60 * 1000

  if (faultActs.lastAdmMessage > limit24h || faultActs.lastActionTime > limit24h) {
    // Ignore
    await saveFaultsData(damInf.DAM_ID, faultsActs, userId);
    return false;
  }

  faultActs.lastAdmMessage = Date.now();
  await saveFaultsData(damInf.DAM_ID, faultsActs, userId);

  return true;
}

export async function takeFaultAction (damId: string, faultData: { id: string, name: string }, userId: string) {
  try {
    const damInf = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: damId });
  
    await registerFault(faultData, damInf, userId);
  } catch(err) {
    logger.error({
      message: "Erro genérico em takeFaultAction",
      error: err,
      stack: (err as Error).stack,
      device: {
        devId: damId
      }
    });
  }
}

export async function saveFaultsData (DAM_ID: string, faultsActs: FaultsActs, userId: string) {
  try {
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: DAM_ID});
    if (currentAutomationId) {
      return sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        FAULTS_DATA: JSON.stringify(faultsActs),
      }, userId);
    }
  } catch(err) {
    logger.error({
      message: "Erro genérico em saveFaultsData",
      error: err,
      stack: (err as Error).stack,
      device: {
        devId: DAM_ID
      }
    });
  }
  
  return null;
}

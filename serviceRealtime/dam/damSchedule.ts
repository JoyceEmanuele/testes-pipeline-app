import * as ramCaches from '../ramCaches';
import { MsgDamProgBasic, MsgDamProgExcepts } from '../../srcCommon/types/devicesMessages'
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import * as eventWarn from '../../srcCommon/helpers/eventWarn';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import sqldb from '../../srcCommon/db';
import { mergeProgramming } from '../../srcCommon/helpers/scheduleData';
import { logger } from '../../srcCommon/helpers/logger';

let devProgData: {
  [devId: string]: FullProg_v4 & { numExceptions?: number }
} = {};
export function tryGetTempSched (devId: string) {
  return devProgData[devId];
}

export function onMsgDamProgBasic (devId: string, payload: MsgDamProgBasic) {
  devProgData[devId] = mergeProgramming(null, payload, null)
  devProgData[devId].numExceptions = payload.exceptions;
  delete payload.exceptions;
  const tempProg = devProgData[devId];
  if (!tempProg.numExceptions) {
    saveLastprogDAM(devId, tempProg).catch(logger.error);
  }
}

export function onMsgDamProgExcepts (devId: string, payload: MsgDamProgExcepts) {
  devProgData[devId] = mergeProgramming(devProgData[devId], null, payload);
  const tempProg = devProgData[devId];
  if (tempProg && Object.keys(tempProg.exceptions || {}).length === (tempProg.numExceptions || 0)) {
    saveLastprogDAM(devId, tempProg).catch(logger.error);
  }
}

async function saveLastprogDAM (devId: string, LASTPROG: FullProg_v4) {
  try {
    const fullProg = scheduleData.checkFullProgV4(LASTPROG);
    ramCaches.DAMS.onDamFullProg(devId, fullProg);
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        LAST_PROG: JSON.stringify(fullProg),
      }, '[SYSTEM]');
    }
  } catch (err) {
    logger.error(`INVALID_DEV_PROG, O ${devId} informou uma programação inválida: ${JSON.stringify(LASTPROG)}\n${err}`);
    eventWarn.typedWarn('INVALID_DEV_PROG', `O ${devId} informou uma programação inválida: ${err}`);
  }
}

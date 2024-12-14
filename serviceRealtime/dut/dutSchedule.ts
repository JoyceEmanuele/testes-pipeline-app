import {
  MsgDamProgBasic,
  MsgDamProgExcepts,
} from '../../srcCommon/types/devicesMessages'
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import * as eventWarn from '../../srcCommon/helpers/eventWarn';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import sqldb from '../../srcCommon/db';
import { mergeProgramming } from '../../srcCommon/helpers/scheduleData';
import { logger } from '../../srcCommon/helpers/logger'
import * as ramCaches from '../ramCaches';

export function getCurrentProgState (devId: string, shiftedTimestamp: Date): "allow" | "forbid" | "onlyfan" {
  if (!shiftedTimestamp) return null;
  const dutSched = ramCaches.AUTOM_EVAP.tryGetDutSched(devId);
  if (!dutSched) return null;
  if (!dutSched.todayEvents) return null;
  if (!dutSched.todayEvents.length) return null;

  // const RTYPE_ID = dutInfo.tryGetDutRTypeId(devId);
  // const dutSched = RTYPE_ID && roomTypes.tryGetRTypeSched(RTYPE_ID);
  // const todayEvents = dutSched && dutSched.todayEvents;

  // const timestampD = new Date(devTimestamp + 'Z');
  const index = shiftedTimestamp.getUTCHours() * 60 + shiftedTimestamp.getUTCMinutes();
  for (const item of dutSched.todayEvents) {
    if ((index >= item.start_m) && (index < (item.start_m + item.duration_m))) {
      return item.state;
    }
  }
  return null;
}

let devProgData: {
  [devId: string]: FullProg_v4 & { numExceptions?: number }
} = {};

export function onMsgDamProgBasic (devId: string, payload: MsgDamProgBasic) {
  devProgData[devId] = mergeProgramming(null, payload, null)
  devProgData[devId].numExceptions = payload.exceptions;
  delete payload.exceptions;
  const tempProg = devProgData[devId];
  if (!tempProg.numExceptions) {
    saveLastprogDUT(devId, tempProg).catch(logger.error);
  }
}

export function onMsgDamProgExcepts (devId: string, payload: MsgDamProgExcepts) {
  devProgData[devId] = mergeProgramming(devProgData[devId], null, payload);
  const tempProg = devProgData[devId];
  if (tempProg && Object.keys(tempProg.exceptions || {}).length === (tempProg.numExceptions || 0)) {
    saveLastprogDUT(devId, tempProg).catch(logger.error);
  }
}

async function saveLastprogDUT (devId: string, LASTPROG: FullProg_v4) {
  try {
    const fullProg = scheduleData.checkFullProgV4(LASTPROG);
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        LAST_PROG: JSON.stringify(fullProg),
      }, '[SYSTEM]');
    }
    ramCaches.AUTOM_EVAP.onDutFullProg(devId, fullProg);
  } catch (err) {
    logger.error('INVALID_DEV_PROG', `O ${devId} informou uma programação inválida: ${err}`, LASTPROG);
    eventWarn.typedWarn('INVALID_DEV_PROG', `O ${devId} informou uma programação inválida: ${err}`);
  }
}

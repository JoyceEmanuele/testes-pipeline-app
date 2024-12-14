import { MsgDamProgBasic, MsgDamProgExcepts } from '../../srcCommon/types/devicesMessages'
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import { mergeProgramming } from '../../srcCommon/helpers/scheduleData';
import { requestDevSchedule } from '../../srcCommon/iotMessages/devsCommands';
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener';

export async function collectFullDamProg (reqParams: { devId: string, userId: string }): Promise<FullProg_v4> {
  const { devId, userId } = reqParams;
  let progComplete: FullProg_v4 = null;
  let tempProg: FullProg_v4 & { numExceptions?: number } = null;

  const promise = iotMessageListener.waitForDamControl((payload) => {
    if (!payload) return false
    if (payload.dev_id !== devId) return false

    const payloadAsProg = payload as MsgDamProgBasic;
    const payloadAsExcepts = payload as MsgDamProgExcepts;

    if (payloadAsProg.message_type === 'programming') {
      tempProg = mergeProgramming(null, payloadAsProg, null)
      tempProg.numExceptions = payloadAsProg.exceptions;
      delete payloadAsProg.exceptions;

      const complete = (!!tempProg) && (Object.keys(tempProg.exceptions || {}).length >= tempProg.numExceptions);
      if (complete) progComplete = tempProg;
    }
    else if (payloadAsExcepts.message_type === 'exceptions') {
      tempProg = mergeProgramming(tempProg, null, payloadAsExcepts);

      const complete = (!!tempProg) && (Object.keys(tempProg.exceptions || {}).length >= tempProg.numExceptions);
      if (complete) progComplete = tempProg;
    }
    else {
      return false;
    }

    return !!progComplete;
  }, 5000);

  requestDevSchedule(devId, userId);
  await promise;

  return progComplete;
}

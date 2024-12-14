import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger'
import { SetMultProg } from '../../srcCommon/types/devicesCommands';
import { MsgMultProgFlag } from '../../srcCommon/types/devicesMessages';
import { sendDutCommand } from '../../srcCommon/iotMessages/devsCommands'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import { VersionNumber, parseFirmwareVersion, compareVersions } from '../../srcCommon/helpers/fwVersion';

// Tarefa automática para envio do comando de DUT não automatizar/automatizar máquina quando estiver offline de acordo
// com flag de utilizar multiplos cards, quando há mudança de versão ou envio teve erro
export function startServiceSendNeedMultProg() {
    recurrentTasks.runLoop({
      iterationPause_ms: 60 * 60 * 1000,
      initialDelay_ms: 15 * 60 * 1000,
      taskName: "DUT-SEND-NEED-MULT-PROG",
      hideIterationsLog: true,
    }, async () => { await dutSendNeedMultProgTask() });
  }

async function dutSendNeedMultProgTask() {
  const duts = await sqldb.DUTS_DEVICES.getDutsToSendMultProgError();
  const minimumVersion: VersionNumber = {
    vMajor: 2,
    vMinor: 3,
    vPatch: 13,
  };

  const filteredDuts = duts.filter(item => {
    const parsedVersion = parseFirmwareVersion(item.CURRFW_VERS);
    const devParsedVersion: VersionNumber = parsedVersion || {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    };
    return compareVersions(devParsedVersion, minimumVersion, false) >= 0;
  })

  for (const dut of filteredDuts) {
    try {
      const promise = iotMessageListener.waitForDutControl((message) => {
        if (!message) return false;
        message = message as MsgMultProgFlag;
        if (message.dev_id !== dut.DEVICE_CODE) return false;
        if (message.msgtype !== 'return-multprog-flag') return false;
        if (message.multprog_flag_enabled !== (dut.NEED_MULT_SCHEDULES === '1')) throw Error('Error setting status').HttpStatus(400);
        return true;
      }, 5000);
    
      const multProgCommand = {
        "msgtype": "set-mult-prog",
        "status": dut.NEED_MULT_SCHEDULES === '1',
      } as SetMultProg;
    
      sendDutCommand(dut.DEVICE_CODE, multProgCommand, '[SYSTEM]');
  
      (await promise) as MsgMultProgFlag;
      await sqldb.DUTS_DEVICES.w_updateInfo({ ID: dut.DUT_DEVICE_ID, SENDED_MULT_PROG_BEHAVIOR: 1 }, '[SYSTEM]');
    }
    catch (err) {
      await sqldb.DUTS_DEVICES.w_updateInfo({ ID: dut.DUT_DEVICE_ID, SENDED_MULT_PROG_BEHAVIOR: 2 }, '[SYSTEM]');
      logger.error(`Error resending set-mult-prog: ${err}`);
    }
  }
}
import { logger } from 'elastic-apm-node';
import sqldb from '../../srcCommon/db';
import { sendDamCommand_setEcoCfg, sendDamCommand_setEcoLocalCfg } from '../../srcCommon/iotMessages/devsCommands';
import { DamCmd_SetEcoCfg, DamCmd_SetLocalEcoCfg } from '../../srcCommon/types/devicesCommands';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';

type DevsLastMessagesTime = Awaited<ReturnType<typeof devsLastComm.loadLastMessagesTimes>>;
type DamAutomationInfo = Awaited<ReturnType<typeof sqldb.DAMS_AUTOMATIONS.getDamsAutomationsListToScript>>[number];

export function startService() {
  recurrentTasks.runAtHour({
    taskName: "DAM-FORCE-ECO-LOCAL",
    atHour: 1,
  }, async () => {
    await forceDamsToEcoLocalMode();
  });
}

const ignoreDam = (damAutomationInfo: DamAutomationInfo, lastMessagesTimes: DevsLastMessagesTime) => {
  if (!damAutomationInfo || !damAutomationInfo.CAN_SELF_REFERENCE || damAutomationInfo.CONFIG_ECO_LOCAL_SENT) { 
    return true;
  }

  if (lastMessagesTimes.connectionStatus(damAutomationInfo.DAM_CODE) !== 'ONLINE') {
    logger.info(`Erro ao enviar Modo Eco Local - Dispositivo ${damAutomationInfo.DAM_CODE} não está online`);
    return true;
  }

  return false;
}

const forceDamsToEcoLocalMode = async () => {
  const dams = await sqldb.DAMS_AUTOMATIONS.getDamsAutomationsListToScript();

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (dams.length <= 500) ? dams.map((dam) => dam.DAM_CODE) : undefined,
  });

  for(const damAutomationInfo of dams) {
    const notValid = ignoreDam(damAutomationInfo, lastMessagesTimes);
    if (notValid) continue;

    const damCmdEcoCfg = {
      "msgtype": "set-eco-cfg",
      "en_eco": damAutomationInfo.ENABLE_ECO ? 1 : 0,     // 0 = eco desativado, 1 = eco ativado
      "remote_dut": !damAutomationInfo.SELF_REFERENCE ? 1 : 0, // 0 = sem dut de referência, 1 = com dut de referência
    } as DamCmd_SetEcoCfg;
  
    sendDamCommand_setEcoCfg(damAutomationInfo.DAM_CODE, damCmdEcoCfg, '[SYSTEM]');
  
    const enEcoLocalToSend = 0; // sempre enviar zero no primeiro envio
    const damCmdSetLocalEcoCfg = {
      "msgtype": "set-eco-local-cfg",
      "en_ecolocal": enEcoLocalToSend || 0,
      "setpoint": damAutomationInfo.SETPOINT ?? -99,
      "hist_sup": damAutomationInfo.UPPER_HYSTERESIS ?? -99,
      "hist_inf": damAutomationInfo.LOWER_HYSTERESIS ?? -99,
      "interval": damAutomationInfo.ECO_INT_TIME != null ? damAutomationInfo.ECO_INT_TIME * 60 : -99,
    } as DamCmd_SetLocalEcoCfg;
  
    sendDamCommand_setEcoLocalCfg(damAutomationInfo.DAM_CODE, damCmdSetLocalEcoCfg, '[SYSTEM]');

    await sqldb.DAMS_AUTOMATIONS.w_updateInfo({ID: damAutomationInfo.DAMS_AUTOMATION_ID, DAM_DEVICE_ID: damAutomationInfo.DAM_ID, CONFIG_ECO_LOCAL_SENT: 1}, '[SYSTEM]');
  };
}

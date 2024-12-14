import { logger } from "../../srcCommon/helpers/logger";
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import sqldb from '../../srcCommon/db'
import {
  sendDamCommand_setEcoLocalCfg,
  sendDamCommand_setEcoCfg
} from '../../srcCommon/iotMessages/devsCommands';
import {
  DamCmd_SetLocalEcoCfg,
  DamCmd_SetEcoCfg,
} from '../../srcCommon/types/devicesCommands'
import { compareVersions, parseFirmwareVersion, VersionNumber } from '../../srcCommon/helpers/fwVersion';
import * as dielServices from '../../srcCommon/dielServices';
import { loadAutomationRefs } from "../../srcCommon/helpers/ramcacheLoaders/automationRefsLoader";

interface DamInfoBasic {
  DAM_ID: string
  CLIENT_ID: number
  UNIT_ID: number
  ENABLE_ECO: number
  ENABLE_ECO_LOCAL: number
  ECO_CFG: string
  ECO_OFST_START: number
  ECO_OFST_END: number
  ECO_INT_TIME: number
  SCHEDULE_START_BEHAVIOR: string
  SETPOINT: number
  LTC: number
  LTI: number
  UPPER_HYSTERESIS: number
  LOWER_HYSTERESIS: number
  SELF_REFERENCE: number
  MINIMUM_TEMPERATURE: number
  MAXIMUM_TEMPERATURE: number
  SETPOINT_ECO_REAL_TIME: number
  CAN_SELF_REFERENCE: number
  FIRST_COMMANDS_ECO_SENT: number
}
interface DamExtraInfo {
  DAM_ID: string
  BT_ID: string
  FU_NOM: number
  UNIT_ID: number
  CLIENT_ID: number
  UNIT_NAME: string
  CITY_ID: string
  LAT: string
  LON: string
  STATE_ID: string
  CITY_NAME: string
  CLIENT_NAME: string
  CURRFW_MSG: string
  DESIREDPROG: string
  LASTPROG: string
  FAULTSDATA: string
  ENABLE_ECO: number
  ENABLE_ECO_LOCAL: number
  FW_MODE: string
  ECO_CFG: string
  SETPOINT: number
  LTC: number
  LTI: number
  UPPER_HYSTERESIS: number
  LOWER_HYSTERESIS: number
  SELF_REFERENCE: number
  MINIMUM_TEMPERATURE: number
  MAXIMUM_TEMPERATURE: number
  ECO_INT_TIME: number
  SETPOINT_ECO_REAL_TIME: number
  CAN_SELF_REFERENCE: number
  ECO_OFST_START: number
  ECO_OFST_END: number
  PLACEMENT: 'RETURN'|'DUO'
  T0_POSITION: 'RETURN'|'INSUFFLATION'
  T1_POSITION: 'RETURN'|'INSUFFLATION'
}

// Tarefa para envio de primeiro comando de configuração de eco local, devido migração feita gradualmente via banco
export async function startTaskEcoLocMigr() {
  recurrentTasks.runLoop({
    taskName: "ECOLOC-MIGR",
    initialDelay_ms: 5 * 60 * 1000,
    iterationPause_ms: 5 * 60 * 1000,
  }, async () => {
    const damsToSendCommand = await sqldb.DAMS.getListBasic({ CAN_SELF_REFERENCE: 1, FIRST_COMMANDS_ECO_SENT_LOWER_THAN: 3 });

    for (const dam of damsToSendCommand) {
      let logAux = 'antes de enviar';
      try {
        logAux = 'para enviar primeiro';

        const damCmdEcoCfg = {
          "msgtype": "set-eco-cfg",
          "en_eco": dam.ENABLE_ECO ? 1 : 0,     // 0 = eco desativado, 1 = eco ativado
          "remote_dut": !dam.SELF_REFERENCE ? 1 : 0, // 0 = sem dut de referência, 1 = com dut de referência
        } as DamCmd_SetEcoCfg;

        sendDamCommand_setEcoCfg(dam.DAM_ID, damCmdEcoCfg, '[SYSTEM]');

        logAux = 'para enviar segundo';

        const damCmdSetLocalEcoCfg = setLocalEcoCfg(dam, dam.SETPOINT, dam.UPPER_HYSTERESIS);

        sendDamCommand_setEcoLocalCfg(dam.DAM_ID, damCmdSetLocalEcoCfg, '[SYSTEM]');

        const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: dam.DAM_ID});
          if (currentAutomationId && currentAutomationId.DAM_DEVICE_ID) {
            await sqldb.DAMS_DEVICES.w_updateInfo({ID: currentAutomationId.DAM_DEVICE_ID, FIRST_COMMANDS_ECO_SENT: dam.FIRST_COMMANDS_ECO_SENT + 1, }, '[SYSTEM]');
          }
      }
      catch (err) {
        logger.error(`Erro ${logAux} comando de modo eco para ${dam.DAM_ID}. Msg: ${err}`);
      }
    }
  });
}


// Migração automática de DAMs para campos novos quando há atualização de Firmware
export async function startTaskDamEcoMigr() {
  recurrentTasks.runLoop({
    taskName: "DAMECO-MIGR",
    initialDelay_ms: 7 * 60 * 1000,
    iterationPause_ms: 7 * 60 * 1000,
  }, async () => {
    const damsToActiveFlag = await sqldb.DEVFWVERS.getListDamPendingNewParameters({ dateToFilter: '2023-02-08T23:59:59-0300' });
    let needUpdateDamDutRef = false;

    const { damDutsRef } = await loadAutomationRefs({});
  
    for (const dam of damsToActiveFlag) {
      const parsedVersion = parseFirmwareVersion(dam.CURRFW_VERS);
      const compareVersion: VersionNumber = {
        vMajor: 2,
        vMinor: 2,
        vPatch: 0,
      };

      // Se não for maior ou igual que 2_2_0, não atualiza flag
      try {
        if (compareVersions(parsedVersion, compareVersion, false) >= 0) {
          const damInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: dam.DEV_ID });
          const REL_DUT_IDS = damDutsRef[dam.DEV_ID];

          const {setPoint, upperHysteresis} = await getCurrentSetPointUpperHysteresis(REL_DUT_IDS, damInfo);

          await sqldb.DAMS_DEVICES.w_updateInfo({ID: dam.DAM_DEVICE_ID, FIRST_COMMANDS_ECO_SENT: 1, CAN_SELF_REFERENCE: 1,  }, '[SYSTEM]');
          
          const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: dam.DEV_ID});
          if (currentAutomationId?.DAM_DEVICE_ID) {
            needUpdateDamDutRef = true;
            await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
              ID: currentAutomationId.ID,
              SETPOINT: setPoint, UPPER_HYSTERESIS: upperHysteresis,
            }, '[SYSTEM]');
          }

          const damCmdEcoCfg = setEcoCfg(damInfo)

          sendDamCommand_setEcoCfg(damInfo.DAM_ID, damCmdEcoCfg, '[SYSTEM]');

          const damCmdSetLocalEcoCfg = setLocalEcoCfg(damInfo, setPoint, upperHysteresis)

          sendDamCommand_setEcoLocalCfg(dam.DEV_ID, damCmdSetLocalEcoCfg, '[SYSTEM]');
        }

      }
      catch (err) {
        logger.error(`Erro ao atualizar flag de DAM ${dam.DEV_ID}. Msg: ${err}`);
      }
    }
    if (needUpdateDamDutRef) {
      logger.info('Recarregando dados de memória de DAM para DUTs de referência devido atualização de DAM.');
      await dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', {
        DEVGROUPS_loadAutomationRefs: { motivo: 'DAMECO-MIGR-needUpdateDamDutRef' },
      });
    }
  });
}

async function getCurrentSetPointUpperHysteresis(REL_DUT_IDS: string[], damInfo: DamExtraInfo) {
  let setPoint: number;
  let upperHysteresis: number;

  if (REL_DUT_IDS && REL_DUT_IDS.length > 0) {
    const dutInfo = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: REL_DUT_IDS[0]});

    if (dutInfo?.TUSEMIN != null) {
      setPoint = dutInfo.TUSEMIN + damInfo.ECO_OFST_START;
      upperHysteresis = damInfo.ECO_OFST_END;
    }
  } 

  return {setPoint, upperHysteresis}
}

function setEcoCfg(dam: DamExtraInfo) {

  const damCmdEcoCfg = {
    "msgtype": "set-eco-cfg",
    "en_eco": dam.ENABLE_ECO ? 1 : 0,     // 0 = eco desativado, 1 = eco ativado
    "remote_dut": !dam.SELF_REFERENCE ? 1 : 0, // 0 = sem dut de referência, 1 = com dut de referência
  } as DamCmd_SetEcoCfg;

  return damCmdEcoCfg;  
}

function setLocalEcoCfg(dam: DamInfoBasic | DamExtraInfo, setPoint: number, upperHysteresis: number) {

  const damCmdSetLocalEcoCfg = {
    "msgtype": "set-eco-local-cfg",
    "en_ecolocal": (dam.ENABLE_ECO && dam.ENABLE_ECO_LOCAL) || 0,
    "setpoint": setPoint ?? -99,
    "hist_sup": upperHysteresis ?? -99,
    "hist_inf": dam.LOWER_HYSTERESIS ?? -99,
    "interval": dam.ECO_INT_TIME != null ? dam.ECO_INT_TIME * 60 : -99,
  } as DamCmd_SetLocalEcoCfg;

  return damCmdSetLocalEcoCfg;  
}

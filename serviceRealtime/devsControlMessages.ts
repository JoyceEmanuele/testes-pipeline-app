import * as dutAutomation from './dut/dutAutomation'
import * as driInfo from './dri/driInfo'
import * as damSchedule from './dam/damSchedule'
import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener'
import {
  ControlMsgDAC,
  ControlMsgDAM,
  ControlMsgDUT,
  ControlMsgDMT,
  MsgDamProgBasic,
  ControlMsgFirmwareVersion,
  DevOtaConfirmation,
  MsgDamProgExcepts,
  DutIrRead,
  DutSensorAutomRead,
  DevDebugSystemInfo,
  ControlMsgDRI,
  DriMsg_GetVarsConfig,
  DriMsg_GetConfigsHash,
  DutMsg_TemperatureControlState,
  ControlMsgDMA,
  CurrentDmaOperationMode,
  DutIrReadDeprecated,
  DevLTEDebugSystemInfo,
  ControlMsgDEV,
} from '../srcCommon/types/devicesMessages'
import { deviceInformedFwVersion, deviceReceivedOtaCommand } from './devsFw/otaUpdates'
import * as dutSchedule from './dut/dutSchedule'
import { receivedDevSysDebug } from './ramCaches/devsSystemDebug'
import { logger } from '../srcCommon/helpers/logger'
import { sendDmaCommand_mode } from '../srcCommon/iotMessages/devsCommands'
import { updateLTENetwork } from './lteConnetcion/updateLteInfo'
import { verifyMacDevice } from './devsMac/macUpdates'

export async function controlMessageReceived_common (payload: ControlMsgDEV): Promise<void> {
  try {
    if ((payload as ControlMsgFirmwareVersion).firmware_version) {
      await deviceInformedFwVersion(payload as ControlMsgFirmwareVersion);
    }
  } catch (err) { 
    logger.error({
      message: 'Erro deviceInformedFwVersion',
      payload,
      err: `${err && (err as Error).message || 'ERROR'}`,
      trace: (err as Error).stack
    });
   }

  try {
    if ((payload as ControlMsgFirmwareVersion).message_type === 'device_data' || (payload as ControlMsgFirmwareVersion).msgtype === 'device_data') { 
      if ((payload as ControlMsgFirmwareVersion).mac) {
        await verifyMacDevice(payload.dev_id, (payload as ControlMsgFirmwareVersion).mac)
      }
    }
  } catch (err) { 
    logger.error({
      message: 'Erro verifyMacDevice',
      payload,
      err: `${err && (err as Error).message || 'ERROR'}`,
      trace: (err as Error).stack
    }); 
   }

  try {
    if ((payload as DevOtaConfirmation).ota_command) {
      await deviceReceivedOtaCommand(payload as DevOtaConfirmation);
    }
  } catch (err) { 
    logger.error({
      message: 'Erro deviceReceivedOtaCommand',
      payload,
      err: `${err && (err as Error).message || 'ERROR'}`,
      trace: (err as Error).stack
    });
  }

  try {
    if ((payload as DevDebugSystemInfo).msgtype === 'debug-device') {
      receivedDevSysDebug(payload.dev_id, payload as DevDebugSystemInfo);
    }
  } catch (err) { 
    logger.error({
      message: 'Erro receivedDevSysDebug',
      payload,
      err: `${err && (err as Error).message || 'ERROR'}`,
      trace: (err as Error).stack
    });
   }
}

export async function controlMessageReceived_DAC (payload: ControlMsgDAC): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);

  try {
    if ((payload as MsgDamProgBasic).message_type === "programming") {
      damSchedule.onMsgDamProgBasic(payload.dev_id, payload as MsgDamProgBasic);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as MsgDamProgExcepts).message_type === "exceptions") {
      damSchedule.onMsgDamProgExcepts(payload.dev_id, payload as MsgDamProgExcepts);
    }
  } catch (err) { logger.error(err) }

  iotMessageListener.dacControlReceived(payload)
}

export async function controlMessageReceived_DUT (payload: ControlMsgDUT): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);

  try {
    if ((payload as DutIrRead).msgtype === 'ir_received') {
      await dutAutomation.registerDutIrCode(payload as DutIrRead, payload.dev_id, '[SYSTEM]');
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as DutIrReadDeprecated).msgtype === 'ir-read') {
      await dutAutomation.registerDutIrCode(payload as DutIrReadDeprecated, payload.dev_id, '[SYSTEM]');
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as DutSensorAutomRead).msgtype === 'sensor-automation') {
      await dutAutomation.updateDutSensorAutomConfig(payload as DutSensorAutomRead, '[SYSTEM]');
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as MsgDamProgBasic).message_type === 'programming') {
      dutSchedule.onMsgDamProgBasic(payload.dev_id, payload as MsgDamProgBasic);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as MsgDamProgExcepts).message_type === 'exceptions') {
      dutSchedule.onMsgDamProgExcepts(payload.dev_id, payload as MsgDamProgExcepts);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as DutMsg_TemperatureControlState).msgtype === 'temperature-control-state') {
      dutAutomation.onTemperatureControlState(payload.dev_id, payload as DutMsg_TemperatureControlState);
    }
  } catch (err) { logger.error(err) }

  iotMessageListener.dutControlReceived(payload)
}

export async function controlMessageReceived_DAM (payload: ControlMsgDAM): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);

  try {
    if ((payload as MsgDamProgBasic).message_type === "programming") {
      damSchedule.onMsgDamProgBasic(payload.dev_id, payload as MsgDamProgBasic);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as MsgDamProgExcepts).message_type === "exceptions") {
      damSchedule.onMsgDamProgExcepts(payload.dev_id, payload as MsgDamProgExcepts);
    }
  } catch (err) { logger.error(err) }

  iotMessageListener.damControlReceived(payload)
}

export async function controlMessageReceived_DRI (payload: ControlMsgDRI): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);

  try {
    if ((payload as ControlMsgFirmwareVersion).firmware_version) {
      await deviceInformedFwVersion(payload as ControlMsgFirmwareVersion);
    }
    if ((payload as DevOtaConfirmation).ota_command) {
      await deviceReceivedOtaCommand(payload as DevOtaConfirmation);
    }
    if ((payload as DevDebugSystemInfo).msgtype === 'debug-device') {
      receivedDevSysDebug(payload.dev_id, payload as DevDebugSystemInfo);
    }
    if ((payload as DevLTEDebugSystemInfo).message_type === 'device_data' || (payload as ControlMsgFirmwareVersion).msgtype === 'device_data') { 
      await verifyMacDevice(payload.dev_id, (payload as ControlMsgFirmwareVersion).mac)
      await updateLTENetwork(payload as DevLTEDebugSystemInfo);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as DriMsg_GetVarsConfig).msgtype === "get-vars-config") {
      driInfo.onMsgDriGetVarsConfig(payload.dev_id, payload as DriMsg_GetVarsConfig);
    }
  } catch (err) { logger.error(err) }

  try {
    if ((payload as DriMsg_GetConfigsHash).msgtype === "get-hash") {
      driInfo.driGetVarsConfig({ driId: payload.dev_id, sendConfigs: false });
    }
  } catch (err) { logger.error(err) }

  iotMessageListener.driControlReceived(payload)
}

export async function controlMessageReceived_DMA (payload: ControlMsgDMA): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);
  
  try {
    if ((payload as CurrentDmaOperationMode).operation_mode === 0) {
      logger.info(`Configurando modo de operação do ${payload.dev_id}`);
      sendDmaCommand_mode(payload.dev_id, 1, '[SYSTEM]');
    }
  } catch (err) { logger.error(err) }

  iotMessageListener.dmaControlReceived(payload)
}

export async function controlMessageReceived_DMT (payload: ControlMsgDMT): Promise<void> {
  await controlMessageReceived_common(payload as ControlMsgDEV);

  iotMessageListener.dmtControlReceived(payload)
}

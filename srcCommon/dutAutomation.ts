import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener'
import sqldb from '../srcCommon/db'
import {
  DutMsg_RespSetIrCode,
  DutMsg_TemperatureControlState,
  DutMsg_ReturnRmtCycle,
  DutMsg_V3ControlState,
} from '../srcCommon/types/devicesMessages';
import * as devsCommands from '../srcCommon/iotMessages/devsCommands'
import { DutCmd_SetTemperatureControl, DutCmd_SetV3Control, DutCmd_ForcedParams } from '../srcCommon/types/devicesCommands';

const dutCommandTypes = [
  'AC_OFF',
  'AC_COOL',
  'AC_FAN',
]

const getEnabledAndMode = (dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>) => {
  let mode = 0;
  let enabled = (dut.DISAB !== 1);
  if (enabled) {
    switch (dut.CTRLOPER) {
      case '0_NO_CONTROL': mode = 0; break;
      case '1_CONTROL': mode = 1; break;
      case '2_SOB_DEMANDA': mode = 2; break;
      case '3_BACKUP': mode = 3; break;
      case '4_BLOCKED': mode = 4; break;
      case '5_BACKUP_CONTROL': mode = 5; break;
      case '6_BACKUP_CONTROL_V2': mode = 6; break;
      case '7_FORCED': mode = 7; break;
      case '8_ECO_2': mode = 8; break;
      default: mode = 0; break;
    };
  }
  
  return { enabled, mode };
}

const getTempControlCommand = (mode: number, enabled: boolean, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>) => {
  const modeHasLti = mode === 2 || mode === 6;

  return {
    msgtype: "set-temperature-control",
    mode, // 0_NO_CONTROL, 1_CONTROL, 2_SOB_DEMANDA, 3_BACKUP, 4_BLOCKED, 5_BACKUP_CONTROL, 6_BACKUP_CONTROL_V2, 7_FORCED
    temperature: dut.TSETPOINT ?? -99,
    LTC: dut.LTCRIT ?? -99,
    LTI: (!dut.LTINF || !modeHasLti) ? -99 : dut.LTINF,
    enabled,
    action: dut.ACTION_MODE,
    action_interval: dut.ACTION_TIME,
    action_post: dut.ACTION_POST_BEHAVIOR
  } as DutCmd_SetTemperatureControl;
 }

const getV3ControlCommand = (mode: number, enabled: boolean, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>) => {
  return {
    msgtype: "set-v3-control",
    mode, // 8_ECO_2
    temperature: (dut.TSETPOINT == null) ? -990 : dut.TSETPOINT * 10,
    setpoint: (dut.TSETPOINT == null) ? -990 : dut.TSETPOINT * 10,
    LTC: (dut.LTCRIT == null) ? -990 : dut.LTCRIT * 10,
    LTI: (dut.LTINF == null) ? -990 : dut.LTINF * 10,
    enabled,
    hist_sup: dut.UPPER_HYSTERESIS == null ? 10 : dut.UPPER_HYSTERESIS * 10,
    hist_inf: dut.LOWER_HYSTERESIS == null ? 10 : dut.LOWER_HYSTERESIS * 10,
  } as DutCmd_SetV3Control;
}


const getControlCommand = (mode: number, enabled: boolean, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>) => {
  let command: DutCmd_SetTemperatureControl|DutCmd_SetV3Control;
  
  if (mode !== 8) {
    command = getTempControlCommand(mode, enabled, dut);
  }
  else {
    command = getV3ControlCommand(mode, enabled, dut)
  }

  return command;
}

const sendSetControlConfig = (devId: string, mode: number, enabled: boolean, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>, user: string) => {
  let command: DutCmd_SetTemperatureControl|DutCmd_SetV3Control = getControlCommand(mode, enabled, dut);

  if(mode !== 2){
    //@ts-ignore
    delete command.action;
    //@ts-ignore
    delete command.action_interval;
    //@ts-ignore
    delete command.action_post;
  }

  if (mode === 7){
    delete command.temperature;
    delete command.LTC;
    delete command.enabled;
    delete command.LTI;

    devsCommands.sendDutCommand(devId, command, user);
    
    const commandForced: DutCmd_ForcedParams = {
      msgtype: 'set-lock-mode',
      mode: dut.FORCED_BEHAVIOR === 'dut-forced-cool' ? 0 : 2,
    }
    
    devsCommands.sendDutCommand(devId, commandForced, user);
  }
  else {
    devsCommands.sendDutCommand(devId, command, user);
  };
}

const sendDutAutConfig = (devId: string, mode: number, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>, user: string) => {
  devsCommands.sendDutCommand(devId, {
    msgtype: "set-rmt-cycle",
    period: dut.RESENDPER || -99,
  }, user);
  if (!dut.PORTCFG) dut.PORTCFG = 'IR';
  if (['IR', 'RELAY'].includes(dut.PORTCFG)) {
    devsCommands.sendDutCommand(devId, {
      msgtype: "set-control-mode",
      mode: (dut.PORTCFG === 'RELAY') ? 1 : 0,
    }, user);
    devsCommands.sendDutCommand(devId, {
      msgtype: "get-control-mode",
    }, user);
  }

  if (mode !== 8) {
    devsCommands.sendDutCommand(devId, {
      msgtype: "get-temperature-control-state",
    }, user);
  }
  else {
    devsCommands.sendDutCommand(devId, {
      msgtype: "get-v3-control-state",
    }, user);
  }
}

const formatReturnObj = (setpointConfirmation: DutMsg_TemperatureControlState, setpointV3Confirmation: DutMsg_V3ControlState, mode: number ) => {
  let returObject = {
    enabled: setpointConfirmation != null ? setpointConfirmation.enabled : setpointV3Confirmation.enabled,
    setpoint: setpointConfirmation != null ? setpointConfirmation.setpoint : setpointV3Confirmation.setpoint,
    ctrl_mode: setpointConfirmation != null ? setpointConfirmation.ctrl_mode : '8_ECO_2',
    LTC: setpointConfirmation != null ? setpointConfirmation.LTC : setpointV3Confirmation.LTC,
    LTI: setpointConfirmation != null ? setpointConfirmation.LTI : setpointV3Confirmation.LTI,
  };

  let temperature = mode !== 8 ? setpointConfirmation.setpoint : setpointV3Confirmation.setpoint;
  if ((mode !== 8) && (temperature == null) && (setpointConfirmation.temperature != null)) {
    temperature = Number(setpointConfirmation.temperature);
  }

  return {returObject, temperature};
}

function compareConfigSetpointConfirmation(config: DutCmd_SetTemperatureControl, setpoint: DutMsg_TemperatureControlState) {
  if (config.mode === 7) {
    if (setpoint.enabled) {
      throw Error(`Dispositivo não configurado. - config: ${JSON.stringify(config)} - setpoint: ${JSON.stringify(setpoint)}`).HttpStatus(400);
    }
    return;
  }

  const comparisons = [
    config.mode === setpoint.mode,
    config.enabled === setpoint.enabled,
    String(config.temperature) === String(setpoint.temperature),
    config.LTC === setpoint.LTC,
    config.LTI === setpoint.LTI,
  ];

  if (comparisons.every((comparison) => comparison)) {
    return;
  }
  throw Error(`Dispositivo não configurado. - config: ${JSON.stringify(config)} - setpoint: ${JSON.stringify(setpoint)}`).HttpStatus(400);
}

function compareConfigSetpointV3Confirmation(config: DutCmd_SetV3Control, setpointV3: DutMsg_V3ControlState) {
  const comparisons = [
    config.mode === setpointV3.mode,
    config.enabled === setpointV3.enabled,
    String(config.temperature) === String(setpointV3.setpoint),
    config.LTC === setpointV3.LTC,
    config.LTI === setpointV3.LTI,
    config.hist_inf === setpointV3.hist_inf,
    config.hist_sup === setpointV3.hist_sup,
  ];

  if (comparisons.every((comparison) => comparison)) {
    return;
  }

  throw Error(`Dispositivo não configurado. - config: ${JSON.stringify(config)} - setpoint: ${JSON.stringify(setpointV3)}`).HttpStatus(400);
}

function compareConfigPeriodConfirmation(period: number, periodConfirmation: DutMsg_ReturnRmtCycle) {
  if (period === periodConfirmation.period) {
    return;
  }

  throw Error(`Dispositivo não configurado. - period: ${period} - periodConfirmation: ${periodConfirmation}`).HttpStatus(400);
}

function compareDutConfig(
  dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>>,
  confirmations: {
    setpoint: DutMsg_TemperatureControlState | null,
    period: DutMsg_ReturnRmtCycle | null,
    setpointV3: DutMsg_V3ControlState | null,
  }
) {
  const { period, setpoint, setpointV3 } = confirmations;
  const currentModes = getEnabledAndMode(dut);
  const controlConfig = getControlCommand(currentModes.mode, currentModes.enabled, dut);

  if (period) {
    compareConfigPeriodConfirmation(dut.RESENDPER || -99, period);
  }

  if (setpoint) {
    compareConfigSetpointConfirmation(controlConfig as DutCmd_SetTemperatureControl, setpoint);
  }

  if (setpointV3) {
    compareConfigSetpointV3Confirmation(controlConfig as DutCmd_SetV3Control, setpointV3);
  }

}

export async function resendDutAutConfig(reqParams: { devId: string, user: string }) {
  const devId = reqParams.devId;
  const user = reqParams.user;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  let setpointConfirmation: DutMsg_TemperatureControlState = null;
  let setpointV3Confirmation: DutMsg_V3ControlState = null;
  let periodConfirmation: DutMsg_ReturnRmtCycle = null;
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    if ((message as DutMsg_TemperatureControlState).dev_id !== devId) return false;
    if ((message as DutMsg_TemperatureControlState).msgtype === 'temperature-control-state') {
      setpointConfirmation = message as DutMsg_TemperatureControlState;
    }
    if ((message as DutMsg_ReturnRmtCycle).msgtype === 'return-rmt-cycle') {
      periodConfirmation = message as DutMsg_ReturnRmtCycle;
    }
    if ((message as DutMsg_V3ControlState).msgtype === 'v3-control-state') {
      setpointV3Confirmation = message as DutMsg_V3ControlState;
    }
    return ((!!setpointConfirmation) || (!!setpointV3Confirmation)) && (!!periodConfirmation);
  }, 5000);

  const { mode, enabled } = getEnabledAndMode(dut);

  sendSetControlConfig(devId, mode, enabled, dut, user);

  sendDutAutConfig(devId, mode, dut, user);

  await promise;

  const { returObject, temperature } = formatReturnObj(setpointConfirmation, setpointV3Confirmation, mode);

  compareDutConfig(dut, {
    period: periodConfirmation,
    setpoint: setpointConfirmation,
    setpointV3: setpointV3Confirmation,
  });

  return Object.assign(returObject, { temperature });
}

const sendDutIrCode = async (devId: string, row: Awaited<ReturnType<typeof sqldb.IR_CODES.getAllCodes>>[number]) => {
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsg_RespSetIrCode;
    if (message.dev_id !== devId) return false;
    if (message.msgtype !== 'resp:set-ir-code') return false;
    if (message.error) throw Error(String(message.error)).HttpStatus(400);
    if (message.success !== true) throw Error('Error setting codes').HttpStatus(400);
    return true;
  }, 5000);

  devsCommands.sendDutCommand(devId, {
    msgtype: "set-ir-code",
    name: row.CMD_TYPE,
    data: JSON.parse(row.CODE_DATA),
    data_id: row.IR_ID,
    temperature: row.TEMPERATURE ?? undefined,
  }, '[SYSTEM]');

  const response = (await promise) as DutMsg_RespSetIrCode;

  return response;
};

export async function resendDutIrCodes (reqParams: { devId: string }) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  const devId = reqParams.devId;

  const irCodes = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: [devId] });

  const responses: DutMsg_RespSetIrCode[] = [];

  for (const row of irCodes) {
    if (dutCommandTypes.includes(row.CMD_TYPE)) {
      const response = await sendDutIrCode(devId, row);
      responses.push(response);
    }
  }

  return { responses };
}

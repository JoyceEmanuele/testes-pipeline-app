import * as httpRouter from './apiServer/httpRouter'
import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener'
import sqldb from '../srcCommon/db'
import {
  DutMsg_RespSendCommand,
  DutMsg_RespSendIrCode,
  DutMsg_RespSetIrCode,
  DutMsg_TemperatureControlState,
  DutMsg_ReturnSensorAutomation,
  DutMsg_V3ControlState,
  DutMsg_ReturnReset,
  DutMsgEchoJson,
  MsgDutEchoJson,
  MsgMultProgFlag
} from '../srcCommon/types/devicesMessages';
import * as devsCommands from '../srcCommon/iotMessages/devsCommands'
import { SetMultProg } from '../srcCommon/types/devicesCommands';
import jsonTryParse from '../srcCommon/helpers/jsonTryParse';
import { logger } from '../srcCommon/helpers/logger'
import { getPermissionsOnUnit, checkDevEditPermission, getUserGlobalPermissions } from '../srcCommon/helpers/permissionControl';
import { ControlMode } from '../srcCommon/helpers/dutAutomation';
import { ScheduleDutCache } from '../srcCommon/types/api-private';
import { resendDutAutConfig } from '../srcCommon/dutAutomation';
import { VersionNumber, parseFirmwareVersion, compareVersions } from '../srcCommon/helpers/fwVersion';

const dutCommandTypes = [
  'AC_OFF',
  'AC_COOL',
  'AC_FAN',
]

const sendDutAutCmd = async (devId: string, CMD_TYPE: string, IR_ID: string, userId: string) => {
  const command = await sqldb.IR_CODES.getCode({
    DUT_CODE: devId,
    CMD_TYPE: CMD_TYPE,
    IR_ID: IR_ID
  })
  if (!command.length) throw Error('Invalid command request.').HttpStatus(400);
  const ir_code = jsonTryParse(command[0].CODE_DATA);
  if (!ir_code) {
    logger.info('Invalid CODE_DATA:');
    logger.info(command[0].CODE_DATA);
    throw Error('Invalid CODE_DATA').HttpStatus(500);
  }

  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsg_RespSendIrCode;
    if (message.dev_id !== devId) return false;
    if (message.msgtype !== 'resp:send-ir-code') return false;
    if (message.error) throw Error(String(message.error)).HttpStatus(400);
    if (message.success !== true) throw Error('Error sending ir code').HttpStatus(400);
    return true;
  }, 5000);

  devsCommands.sendDutCommand(devId, {
    msgtype: "send-ir-code",
    ir_code,
  }, userId)

  return (await promise) as DutMsg_RespSendCommand
}

httpRouter.privateRoutes['/send-dut-aut-command'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (reqParams.CMD_TYPE) { } // OK
  else if (reqParams.IR_ID) { } // OK
  else throw Error('There was an error! Missing CMD_TYPE or IR_ID.').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const response = await sendDutAutCmd(devId, reqParams.CMD_TYPE, reqParams.IR_ID, session.user);
  return response;
}

httpRouter.privateRoutes['/write-dut-command-by-ircode'] = async function (reqParams, session) {

  if (!reqParams.configs) throw Error('Missing fields!').HttpStatus(400);
  if (!reqParams.targetDutId) throw Error('Missing fields!').HttpStatus(400)
  const devId = reqParams.targetDutId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const list_ircodes = await Promise.all(reqParams.configs.map(x => sqldb.IR_CODES.getCodesByIrIdCmdType(x)
    .then(res => {
      return { ...x, ...res }
    })
  ));
  
  for (const {CODE_DATA, IR_ID, CMD_TYPE, CMD_DESC,TEMPERATURE} of list_ircodes) {
    if (!CODE_DATA) continue;
    if (CMD_TYPE) await sqldb.IR_CODES.w_removeAction({ DUT_CODE: devId, CMD_TYPE }, session.user);
    const irCodesFromDut = await sqldb.IR_CODES.getCode({DUT_CODE: devId, IR_ID: IR_ID});
    if (!irCodesFromDut.length) {
      const irCode = await sqldb.IR_CODES.w_insertNewCommand({ IR_ID: IR_ID, CMD_TYPE: CMD_TYPE, CODE_DATA: CODE_DATA, CMD_DESC: CMD_DESC, TEMPERATURE: TEMPERATURE }, session.user);
      const dutInfo = await sqldb.DUTS_DEVICES.getDutDevice({ DEVICE_CODE: devId });
      await sqldb.DUTS_IR_CODES.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, IR_CODE_ID: irCode.insertId}, session.user);
    }
    else {
      await sqldb.IR_CODES.w_update({
        DUT_CODE: devId,
        IR_ID,
        CMD_TYPE,
        CMD_DESC,
        TEMPERATURE,
      }, session.user);
    }
  }
  
  return { success: true }

}

const generateCommandNameToNewFw = (cmdType: string, temperature: number) => {
  if (cmdType === 'AC_OFF') {
    return 'OFF';
  } else if (cmdType === 'AC_FAN') {
    return 'FAN';
  } else if (cmdType === 'AC_COOL' && temperature) {
    return 'SET'+temperature.toString().split('.')[0];
  }
  return null;
}

const resendDutIrCodesDeprecatedFw = async (devId: string, row: Awaited<ReturnType<typeof sqldb.IR_CODES.getAllCodes>>[number], userId: string) => {
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
  }, userId);

  const response = (await promise) as DutMsg_RespSetIrCode;

  return response;
}

const resendDutIrCodesNewFw = async (devId: string, row: Awaited<ReturnType<typeof sqldb.IR_CODES.getAllCodes>>[number], userId: string) => {
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsgEchoJson;
    if (message.dev_id !== devId) return false;
    if (message.msgtype !== 'echo_json') return false;
    if (message.json_status !== true) throw Error('Error setting codes').HttpStatus(400);
    return true;
  }, 5000);

  devsCommands.sendDutCommand(devId, {
    msgtype: "save_raw_ir",
    command: generateCommandNameToNewFw(row.CMD_TYPE, row.TEMPERATURE),
    ir_code: JSON.parse(row.CODE_DATA),
  }, userId);

  const response: DutMsgEchoJson = (await promise) as DutMsgEchoJson;

  return response;
}


const resendDutIrCodesBasedOnFwVersion = async (devId: string, responses: DutMsg_RespSetIrCode[]  & DutMsgEchoJson[], row: Awaited<ReturnType<typeof sqldb.IR_CODES.getAllCodes>>[number], fwVers: VersionNumber,  userId: string) => {
  if (fwVers?.vMajor >= 4 && generateCommandNameToNewFw(row.CMD_TYPE, row.TEMPERATURE)) {
    const response = await resendDutIrCodesNewFw(devId, row, userId);
    responses.push({...response, ...(response.json_status && {success: true}), ...(!response.json_status && {error: "Erro ao salvar Comando IR"}) });
  } else if (fwVers.vMajor < 4) {
    const response = await resendDutIrCodesDeprecatedFw(devId, row, userId);
    responses.push(response);
  }
}

httpRouter.privateRoutes['/resend-dut-ir-codes'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const irCodes = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: [devId] });
  const responses: DutMsg_RespSetIrCode[] & DutMsgEchoJson[] = [];

  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId});
  const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;

  for (const row of irCodes) {
    if (dutCommandTypes.includes(row.CMD_TYPE)) {
      await resendDutIrCodesBasedOnFwVersion(devId, responses, row, fwVers, session.user);
    } 
  }

  return { responses };
}

const requestDutAutConfig = async (devId: string, dut: Awaited<ReturnType<typeof sqldb.AUTOM_EVAP.getDevBasicInfo>> , userId: string) => {
  let response;

  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    if ((message as DutMsg_TemperatureControlState).dev_id !== devId) return false;
    if ((message as DutMsg_TemperatureControlState).msgtype !== 'temperature-control-state' && (message as DutMsg_V3ControlState).msgtype !== 'v3-control-state') return false;
    return true;
  }, 5000);

  const msgType = dut.CTRLOPER !== '8_ECO_2' ? "get-temperature-control-state" : "get-v3-control-state";
  devsCommands.sendDutCommand(devId, {
    msgtype: msgType,
  }, userId);

  response = (await promise) as DutMsg_TemperatureControlState|DutMsg_V3ControlState;

  return response;
}

const logRequestDutConfigError = (i: number, attemptsQuantity: number, devId: string, err: unknown) => {
  logger.warn(`Erro na tentativa ${i + 1} de /request-dut-aut-config do dispositivo ${devId}: ${err && (err as Error).message || 'ERROR 419'}`);
  if (i === attemptsQuantity - 1) {
    logger.error({
      message: 'Erro ao solicitar parametros de automação (/request-dut-aut-config)',
      devId: devId,
      err: `${err && (err as Error).message || 'ERROR 419'}`
    });
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }
}

httpRouter.privateRoutes['/request-dut-aut-config'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const attemptsQuantity = 4;
  let response;
  let returObject = {} as {
    enabled: boolean,
    setpoint: number
    ctrl_mode: ControlMode
    LTC: number,
    LTI: number,
  };
  let temperature;
  for (let i = 0; i < attemptsQuantity; i++) {
    try{

      response = await requestDutAutConfig(devId, dut, session.user);
      
      returObject.enabled = response.enabled;
      returObject.LTC = response.LTC;
      returObject.LTI = response.LTI;
      returObject.setpoint = response.setpoint;
      temperature = response.setpoint;
      if (dut.CTRLOPER !== '8_ECO_2'){
        if ((temperature == null) && ((response as DutMsg_TemperatureControlState).temperature != null)) {
          temperature = Number((response as DutMsg_TemperatureControlState).temperature);
        }
      } 
      else if (dut.CTRLOPER === '8_ECO_2'){
        returObject.ctrl_mode = '8_ECO_2';
      }
        
     break;
    }
    catch(err) {
      logRequestDutConfigError(i, attemptsQuantity, devId, err);
    }
  }
  return Object.assign(returObject, { temperature });
}

httpRouter.privateRoutes['/resend-dut-aut-config'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);

  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  let response;

  const attemptsQuantity = 4;

  for (let i = 0; i < attemptsQuantity; i++) {
    try{
      response = await resendDutAutConfig({devId: devId, user: session.user});
      break;
    }
    catch(err) {
      logger.warn(`Erro na tentativa ${i + 1} de resendDutAutConfig do dispositivo ${devId}: ${err && (err as Error).message || 'ERROR 419'}`);
      if (i === attemptsQuantity - 1) {
        logger.error({
          message: 'Erro ao reenviar automação (resendDutAutConfig)',
          devId: devId,
          err: `${err && (err as Error).message || 'ERROR 419'}`
        });
        throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
      }
    }
  }

  return response;
}


export const setTemperatureSensors = async (devId: string, numbersOfSensors: number, placement: string, index: number, user: string) => {
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as MsgDutEchoJson;
    if (message.dev_id !== devId) return false;
    if (message.msgtype !== 'echo_json') return false;
    if ((message as any).number_sensors !== numbersOfSensors) throw Error('Error setting DUT sensors').HttpStatus(400);
    if (message.json_status === false) throw Error('Error setting DUT sensors').HttpStatus(400);
    return true;
  }, 5000);

  if (placement === "DUO") { 
    devsCommands.sendDutCommand(devId, {
      msgtype: "set_sensor_temperature",
      number_sensors: 2,
      sensor_autom_index: index
    }, user);
  } else {
    devsCommands.sendDutCommand(devId, {
      msgtype: "set_sensor_temperature",
      number_sensors: 1,
      sensor_autom_index: 0,
    }, user);
  }

  const result = (await promise) as MsgDutEchoJson

  if (placement !==  "DUO") return result;
  
  const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({DUT_CODE: devId});
  if (!dutDuo) throw Error('There was an error! Dutduo not found!').HttpStatus(400);
  if (result.number_sensors === numbersOfSensors) {
    await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, SENSOR_AUTOM: index }, user);
  }

  return result;
};


const resetDutDevice = async (devId: string, user: string) =>  {
  try {
    const promiseReset = iotMessageListener.waitForDutControl((payload) => {
      if (!payload) return false
      if ((payload as DutMsg_ReturnReset).dev_id !== devId) return false
      if ((payload as DutMsg_ReturnReset).message_type !== 'device_data') return false
      return true;
    }, 35000);
  
    devsCommands.sendDutCommand(devId, {
      msgtype: "software-reset-device",
    }, user);
  
  
    (await promiseReset) as DutMsg_ReturnReset;
  }
  catch (err) {
    logger.error('Erro receber confirmação de reset do dispositivo.');
  }
}

export const sendDutTempSensorsDeprecated = async (devId: string, index: number, sendNumberSensors: boolean, numberSensors: number, user: string) => {
  
  if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(devId)) logger.info(`DBG-DUO-P01 ${devId}`);
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsg_ReturnSensorAutomation;
    if (message.dev_id !== devId) return false;
    if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(devId)) logger.info(`DBG-DUO-P05 ${JSON.stringify(message)}`);
    if (message.msgtype !== 'return-sensor-automation') return false;
    if ((message.number_sensors || message.number_sensors === 0) && message.number_sensors !== 2) throw Error('Error setting sensor automation').HttpStatus(400);
    return true;
  }, 10000);

  devsCommands.sendDutCommand(devId, {
    msgtype: "set-sensor-automation",
    index: index,
    number_sensors: sendNumberSensors ? numberSensors : undefined,
  }, user);
  
  if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(devId)) logger.info(`DBG-DUO-P02 envio de comando ${devId}`);
  const result = (await promise) as DutMsg_ReturnSensorAutomation

  await resetDutDevice(devId, user);

  return result
}

const setTemperatureSensorsDeprecated = async (devId: string, index: number, placement: string, sendNumberSensors: boolean, user: string) => {
  const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({DUT_CODE: devId});

  if (dutDuo && !dutDuo.REDEFINED_SENSORS) {
    const resultRedefined = await sendDutTempSensorsDeprecated(devId, -1, sendNumberSensors, 2, user);

    if (resultRedefined) {
      await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, REDEFINED_SENSORS: 1}, user);
    }
  }

  if(dutDuo.SENSOR_AUTOM === index && dutDuo.PLACEMENT === placement) return  { dev_id: devId };

  const result = await sendDutTempSensorsDeprecated(devId, index, sendNumberSensors, placement === 'DUO' ? 2 : 1, user);

  if (result?.index != null) {
    await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, SENSOR_AUTOM: result.index }, user);
  }

  return result;
};

httpRouter.privateRoutes['/dut/set-temperature-sensors'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (reqParams.placement === 'DUO' && ![0,1].includes(reqParams.value)) throw Error('There was an error! Missing value (0 or 1)').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.DUTS.getBasicInfo({ devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId});
  const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;

  let result;
  if (fwVers?.vMajor >= 4) {
    const numbersOfSensors = reqParams.placement === "DUO" ? 2 : 1;
    result = await setTemperatureSensors(devId, numbersOfSensors, reqParams.placement, reqParams.value, session.user);
  }else if (fwVers?.vMajor === 2) {
    const sendNumberSensors = fwVers?.vMinor > 3 || (fwVers?.vMinor === 3 && fwVers?.vPatch >= 10);
    result = await setTemperatureSensorsDeprecated(devId, reqParams.value, reqParams.placement, sendNumberSensors, session.user);
  }
  else {
    return { dev_id: reqParams.devId };
  }
  
  return result;
}

httpRouter.privateRoutes['/define-ircode-action'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (!reqParams.IR_ID) throw Error('There was an error! Missing IR_ID.').HttpStatus(400);
  if (reqParams.TEMPER != null && (typeof reqParams.TEMPER !== 'number')) throw Error('Temperatura inválida').HttpStatus(400);
  if (dutCommandTypes.includes(reqParams.CMD_TYPE)) { } // OK
  else if (reqParams.CMD_TYPE === null) { } // OK
  else if (reqParams.CMD_TYPE === undefined) { } // OK
  else throw Error('Invalid CMD_TYPE').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const affectedRows = await defineIrCodeAction(reqParams, devId, session.user);

  await updateForcedSetpoint(devId, session.user);
  
  return `UPDATED ${affectedRows}`
}


const sendCmdToDelete = async (devId: string, userId: string, irCommand: Awaited<ReturnType<typeof sqldb.IR_CODES.getCode>> ) => {
  const promise = iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsgEchoJson;
    if (message.dev_id !== devId) return false;
    if (message.msgtype !== 'echo_json') return false;
    if (message.json_status !== true) throw Error('Error deleting dut ir code').HttpStatus(400);
    return true;
  }, 5000);

  devsCommands.sendDutCommand(devId, {
    msgtype: "erase_raw_ir",
    command: generateCommandNameToNewFw(irCommand[0].CMD_TYPE, irCommand[0].TEMPERATURE),
  }, userId);


  const result = (await promise) as DutMsgEchoJson;
  if (!result) throw Error('Unable to delete dut ir command').HttpStatus(400);
}

httpRouter.privateRoutes['/delete-dut-ircode'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (!reqParams.IR_ID) throw Error('There was an error! Missing IR_ID.').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const irCommand = await sqldb.IR_CODES.getCode({DUT_CODE: devId, IR_ID: reqParams.IR_ID})
  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId});
  const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;
  if (fwVers?.vMajor >= 4 && irCommand[0]?.CMD_TYPE && dutCommandTypes.includes(irCommand[0].CMD_TYPE) 
      && generateCommandNameToNewFw(irCommand[0].CMD_TYPE, irCommand[0].TEMPERATURE)) {
    await sendCmdToDelete(devId, session.user, irCommand);
  }

  const irCodes = await sqldb.DUTS_IR_CODES.getAllCodesByDutCodeAndIrId({DUT_CODE: devId, IR_ID: reqParams.IR_ID});
  const irCodesIds = irCodes.map((ir) => (ir.ID));

  await sqldb.DUTS_IR_CODES.w_deleteDutsIrCode({DUT_CODE: devId, IR_ID: reqParams.IR_ID}, session.user);

  let affectedRows = 0;
  if (irCodesIds.length) {
    const { affectedRows: rows } = await sqldb.IR_CODES.w_deleteIrCodeByIds({IDs: irCodesIds}, session.user);
    affectedRows = rows;
  }

  return `DELETED ${affectedRows}`
}

httpRouter.privateRoutes['/get-dut-ircodes-list'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  const devId = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });
  if (!dut) throw Error('DUT inválido').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const irCodes = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: [devId] });
  const list = irCodes.map(row => {
    return {
      IR_ID: row.IR_ID,
      CMD_TYPE: row.CMD_TYPE,
      CMD_DESC: row.CMD_DESC,
      TEMPER: row.TEMPERATURE,
    }
  })

  return { list, dutCommandTypes };
}

export const addIrCodeinList = async (resData : httpRouter.ApiResps['/get-duts-ircodes-list'], devId: string) => {
  const irCodes = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: [devId] });
  const list = irCodes.map(row => {
    return {
      IR_ID: row.IR_ID,
      CMD_TYPE: row.CMD_TYPE,
      CMD_DESC: row.CMD_DESC,
      TEMPER: row.TEMPERATURE,
    }
  });
  const currData = { list, dutCommandTypes };
  resData[devId] = currData;
}

httpRouter.privateRoutes['/get-duts-ircodes-list'] = async function (reqParams, session) {
  if (!reqParams.devIds) throw Error('There was an error! Missing devIds.').HttpStatus(400);

  const resData : httpRouter.ApiResps['/get-duts-ircodes-list'] = {};

  for(const devId of reqParams.devIds){

    const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });
    if (!dut) throw Error('DUT inválido').HttpStatus(400);
  
    const perms = await getPermissionsOnUnit(session, dut.CLIENT_ID, dut.UNIT_ID);
    if (!perms.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403);
    }
  
    await addIrCodeinList(resData, devId);
  }
  
  return resData;
}

async function getDutsIrCodes(dutIds: string[]) {
  const dutsIrCodes: {
    [dutId:string]: Awaited<ReturnType<typeof sqldb.IR_CODES.getAllCodes>>,
  } = {};
  const fullList = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: dutIds });
  for (const row of fullList) {
    let dutCodes = dutsIrCodes[row.DUT_CODE];
    if (!dutCodes) {
      dutsIrCodes[row.DUT_CODE] = dutCodes = [];
    }
    dutCodes.push(row);
  }
  return dutsIrCodes;
}

httpRouter.privateRoutes['/get-dut-ircodes-by-model'] = async function (reqParams, session) {
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);

  const devId = reqParams.devId;
  const dev_info = await sqldb.AUTOM_EVAP.getDevProductInfo({ DUT_ID: devId });

  const perms = await getPermissionsOnUnit(session, dev_info.CLIENT_ID, dev_info.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const list_dev_match = await sqldb.AUTOM_EVAP.getAllDevsByBrandModel({ MCHN_BRAND: dev_info.MCHN_BRAND });

  const list = [] as {
    ircodes: {
      DUT_ID : string,
      IR_ID: string
      CMD_TYPE: string
      CMD_DESC: string
      TEMPER: number
    }[],
    dutCommandTypes: string[]
    model: string,
    DUT_ID: string
  }[];
  if (!list_dev_match.length) {
    return { list };
  }
  const dutsIrCodes = await getDutsIrCodes(list_dev_match.map((x) => x.DUT_ID));
  for (const x of list_dev_match) {
    const query = dutsIrCodes[x.DUT_ID] || [];

    list.push({
      ircodes: query.map(x => {
        return {
          DUT_ID: x.DUT_CODE,
          IR_ID: x.IR_ID,
          CMD_TYPE: x.CMD_TYPE,
          CMD_DESC: x.CMD_DESC,
          TEMPER: x.TEMPERATURE,
        }
      }),
      dutCommandTypes: dutCommandTypes,
      model: x.MCHN_MODEL,
      DUT_ID: x.DUT_ID,
    });
  }
  return { list };
}

httpRouter.privateRoutes['/disable-dut-aut-commands'] = async function (reqParams, session) {
  // Remove os códigos IR do DUT para desabilitar a automação. Acho que esta função foi criada para contornar um problema no firmware que nem deve existir mais.
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) throw Error('Permission denied!').HttpStatus(403);
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (!reqParams.insertFakes) throw Error('"insertFakes" deve estar habilitado').HttpStatus(400);

  const DUT_ID = reqParams.devId;
  const dut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID });
  if (!dut) throw Error('DUT não encontrado').HttpStatus(400);

  const dutInfo = await sqldb.DUTS_DEVICES.getDutDevice({DEVICE_CODE: DUT_ID});

  const cmd1 = await sqldb.IR_CODES.w_insertIgnore({ IR_ID: 'FAKE001', CODE_DATA: '[101,0]' }, session.user);
  await sqldb.DUTS_IR_CODES.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, IR_CODE_ID: cmd1.insertId}, session.user);

  const cmd2 = await sqldb.IR_CODES.w_insertIgnore({ IR_ID: 'FAKE002', CODE_DATA: '[102,0]' }, session.user);
  await sqldb.DUTS_IR_CODES.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, IR_CODE_ID: cmd2.insertId}, session.user);

  const cmd3 = await sqldb.IR_CODES.w_insertIgnore({ IR_ID: 'FAKE003', CODE_DATA: '[103,0]' }, session.user);
  await sqldb.DUTS_IR_CODES.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, IR_CODE_ID: cmd3.insertId}, session.user);


  await sqldb.IR_CODES.w_removeAction({ DUT_CODE: DUT_ID, CMD_TYPE: 'AC_OFF' }, session.user);
  await sqldb.IR_CODES.w_removeAction({ DUT_CODE: DUT_ID, CMD_TYPE: 'AC_COOL' }, session.user);
  await sqldb.IR_CODES.w_removeAction({ DUT_CODE: DUT_ID, CMD_TYPE: 'AC_FAN' }, session.user);


  await sqldb.IR_CODES.w_update({ DUT_CODE: DUT_ID, IR_ID: 'FAKE001', CMD_TYPE: 'AC_OFF', CMD_DESC: 'FAKE001', TEMPERATURE: -99 }, session.user);
  await sqldb.IR_CODES.w_update({ DUT_CODE: DUT_ID, IR_ID: 'FAKE002', CMD_TYPE: 'AC_COOL', CMD_DESC: 'FAKE002', TEMPERATURE: -99 }, session.user);
  await sqldb.IR_CODES.w_update({ DUT_CODE: DUT_ID, IR_ID: 'FAKE003', CMD_TYPE: 'AC_FAN', CMD_DESC: 'FAKE003', TEMPERATURE: -99 }, session.user);

  const { responses } = await httpRouter.privateRoutes['/resend-dut-ir-codes']({ devId: reqParams.devId }, session);
  if ((!responses[0]) || (!responses[1]) || (!responses[2])) {
    throw Error('Não foi possível salvar os 3 comandos').HttpStatus(400);
  }
  if (responses[0].error || responses[1].error || responses[2].error) {
    throw Error('Não foi possível salvar os 3 comandos').HttpStatus(400);
  }
  return { responses };
}

httpRouter.privateRoutes['/dut/get-dut-schedules'] = async function (reqParams, session) {

  if (!reqParams.DUT_ID) throw Error('There was an error! Missing DUT_ID.').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const schedules = await sqldb.DUTS_SCHEDULES.getDutScheds({ DUT_ID: reqParams.DUT_ID });

  let result = [] as {
    DUT_SCHEDULE_ID: number
    SCHEDULE_TITLE: string
    SCHEDULE_STATUS: boolean
    BEGIN_TIME: string
    END_TIME: string
    CTRLOPER: ControlMode
    PERMISSION: 'allow'|'forbid'
    DAYS: {
        mon: boolean
        tue: boolean
        wed: boolean
        thu: boolean
        fri: boolean
        sat: boolean
        sun: boolean
    }
    SETPOINT?: number
    LTC?: number
    LTI?: number
    UPPER_HYSTERESIS?: number
    LOWER_HYSTERESIS?: number
    SCHEDULE_START_BEHAVIOR?: string
    SCHEDULE_END_BEHAVIOR?: string
    FORCED_BEHAVIOR?: string
    ACTION_MODE?: string
    ACTION_TIME?: number
    ACTION_POST_BEHAVIOR?: string
  }[];

  for (const config of schedules) {
    const item = {
      DUT_SCHEDULE_ID: config.DUT_SCHEDULE_ID,
      SCHEDULE_TITLE: config.SCHEDULE_TITLE,
      SCHEDULE_STATUS: config.SCHEDULE_STATUS === '1' ? true : false,
      BEGIN_TIME: config.BEGIN_TIME,
      END_TIME: config.END_TIME,
      CTRLOPER: config.CTRLOPER as ControlMode,
      PERMISSION: config.PERMISSION,
      DAYS: JSON.parse(config.DAYS) as { mon: boolean, tue: boolean, wed: boolean, thu: boolean, fri: boolean, sat: boolean, sun: boolean },
      SETPOINT: config.SETPOINT,
      LTC: config.LTC,
      LTI: config.LTI,
      UPPER_HYSTERESIS: config.UPPER_HYSTERESIS,
      LOWER_HYSTERESIS: config.LOWER_HYSTERESIS,
      SCHEDULE_START_BEHAVIOR: config.SCHEDULE_START_BEHAVIOR,
      SCHEDULE_END_BEHAVIOR: config.SCHEDULE_END_BEHAVIOR,
      FORCED_BEHAVIOR: config.FORCED_BEHAVIOR,
      ACTION_MODE: config.ACTION_MODE,
      ACTION_TIME: config.ACTION_TIME,
      ACTION_POST_BEHAVIOR: config.ACTION_POST_BEHAVIOR,
    }
    result.push(item);
  }

  return {schedules: result};
}

httpRouter.privateRoutes['/dut/set-dut-schedules'] = async function (reqParams, session) {
  if (!reqParams.DUT_ID) throw Error('There was an error! Missing DUT_ID.').HttpStatus(400);
  if (!reqParams.schedules) throw Error('There was an error! Missing schedules.').HttpStatus(400);
  if (reqParams.NEED_MULT_SCHEDULES == null) throw Error('There was an error! Missing NEED_MULT_SCHEDULES.').HttpStatus(400);

  const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DUT_ID })
  const { userCanEditDev } = await checkDevEditPermission(session, currentDevInfo, {
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_ID: reqParams.UNIT_ID,
  });

  const schedules = reqParams.schedules.sort((a, _b) => {
    if (a.DELETE) {
      return -1;
    }
    return 1;
  });

  if (!userCanEditDev) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const parsedVersion = parseFirmwareVersion(currentDevInfo.CURRFW_VERS);
  const devParsedVersion: VersionNumber = parsedVersion || {
    vMajor: 0,
    vMinor: 0,
    vPatch: 0,
  };
  const minimumVersion: VersionNumber = {
    vMajor: 2,
    vMinor: 3,
    vPatch: 13,
  };

  const needSendCommandMultProg = compareVersions(devParsedVersion, minimumVersion, false) >= 0;
  let needMultScheduleOld = 0;
  
  if (needSendCommandMultProg) {
    const dutSchedulesInfo = await sqldb.DUTS_SCHEDULES.getDutScheds({ DUT_ID: reqParams.DUT_ID });
    needMultScheduleOld = dutSchedulesInfo.length > 0 ? Number(dutSchedulesInfo[0].NEED_MULT_SCHEDULES) : 0;
  }

  for (let config of schedules) {
    if (config.DELETE == null) throw Error('There was an error! Missing DELETE on a schedule.').HttpStatus(400);
    if (!config.SCHEDULE_TITLE) throw Error('There was an error! Missing SCHEDULE_TITLE on a schedule.').HttpStatus(400);
    if (!config.SCHEDULE_STATUS == null) throw Error('There was an error! Missing SCHEDULE_STATUS on a schedule.').HttpStatus(400);
    if (!config.PERMISSION) throw Error('There was an error! Missing PERMISSION on a schedule.').HttpStatus(400);
    if (!config.BEGIN_TIME) throw Error('There was an error! Missing BEGIN_TIME on a schedule.').HttpStatus(400);
    if (!config.END_TIME) throw Error('There was an error! Missing END_TIME on a schedule.').HttpStatus(400);
    if (!config.DAYS) throw Error('There was an error! Missing DAYS on a schedule.').HttpStatus(400);

    const paramSet = {} as {
      DUT_SCHEDULE_ID: number,  
      DUT_ID: string,
      DUT_AUTOMATION_PARAMETERS_ID: number,
      TITLE: string,
      AUTOMATION_PERIOD_STATUS: string,
      PERMISSION: string,
      BEGIN_TIME: string,
      END_TIME: string,
      DAYS: string,
      MODE: string,
      SETPOINT: number,
      LTC: number,
      LTI: number,
      UPPER_HYSTERESIS: number,
      LOWER_HYSTERESIS: number, 
      SCHEDULE_START_BEHAVIOR: string,
      SCHEDULE_END_BEHAVIOR: string,
      FORCED_BEHAVIOR: string,
      NEED_MULT_SCHEDULES: string,
      IR_ID_COOL: string,
      ACTION_MODE: string,
      ACTION_TIME: number,
      CURRENT_IN_DEVICE: string,
      ACTION_POST_BEHAVIOR: string
    };

    if (config.DELETE) {
      const dutScheduleInfo = await sqldb.DUTS_SCHEDULES.getDutScheds({DUT_SCHEDULE_ID: config.DUT_SCHEDULE_ID});
      await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: config.DUT_SCHEDULE_ID}, session.user);
      await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: config.DUT_SCHEDULE_ID}, session.user);;
      await sqldb.AUTOMATIONS_PARAMETERS.w_delete({ID: dutScheduleInfo[0].DUT_AUTOMATION_PARAMETERS_ID}, session.user);
      await sqldb.SCHEDULES.w_deleteByAutomationPeriod({AUTOMATION_PERIOD_ID: config.DUT_SCHEDULE_ID}, session.user);
      await sqldb.AUTOMATIONS_PERIODS.w_deleteRow({ID: config.DUT_SCHEDULE_ID}, session.user);

      continue;
    }
    else {
      paramSet.DUT_ID = reqParams.DUT_ID;
      paramSet.NEED_MULT_SCHEDULES = reqParams.NEED_MULT_SCHEDULES ? '1' : '0';
      paramSet.TITLE = config.SCHEDULE_TITLE;
      paramSet.AUTOMATION_PERIOD_STATUS = config.SCHEDULE_STATUS ? '1' : '0';
      paramSet.PERMISSION = config.PERMISSION;
      paramSet.BEGIN_TIME = config.BEGIN_TIME; 
      paramSet.END_TIME = config.END_TIME;
      paramSet.MODE = config.CTRLOPER;
      paramSet.DAYS = JSON.stringify(config.DAYS);
      paramSet.CURRENT_IN_DEVICE = '0';
      if (config.SETPOINT !== undefined) { paramSet.SETPOINT = config.SETPOINT; }
      if (config.LTC !== undefined) { paramSet.LTC = config.LTC; }
      if (config.LTI !== undefined) { paramSet.LTI = config.LTI; }
      if (config.UPPER_HYSTERESIS !== undefined) { paramSet.UPPER_HYSTERESIS = config.UPPER_HYSTERESIS; }
      if (config.LOWER_HYSTERESIS !== undefined) { paramSet.LOWER_HYSTERESIS = config.LOWER_HYSTERESIS; }
      if (config.SCHEDULE_START_BEHAVIOR !== undefined) { paramSet.SCHEDULE_START_BEHAVIOR = config.SCHEDULE_START_BEHAVIOR; }
      if (config.SCHEDULE_END_BEHAVIOR !== undefined) { paramSet.SCHEDULE_END_BEHAVIOR = config.SCHEDULE_END_BEHAVIOR; }
      if (config.FORCED_BEHAVIOR !== undefined) { paramSet.FORCED_BEHAVIOR = config.FORCED_BEHAVIOR; }
      if (config.IR_ID_COOL !== undefined) { paramSet.IR_ID_COOL = config.IR_ID_COOL; }
      if (config.ACTION_MODE !== undefined) { paramSet.ACTION_MODE = config.ACTION_MODE; }
      if (config.ACTION_TIME !== undefined) { paramSet.ACTION_TIME = config.ACTION_TIME; }
      if (config.ACTION_POST_BEHAVIOR !== undefined) { paramSet.ACTION_POST_BEHAVIOR = config.ACTION_POST_BEHAVIOR; }

      const dutAutomationInfo = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo({DEVICE_CODE: paramSet.DUT_ID});
      if (config.DUT_SCHEDULE_ID) {
        paramSet.DUT_SCHEDULE_ID = config.DUT_SCHEDULE_ID;
        const dutScheduleInfo = await sqldb.DUTS_SCHEDULES.getDutScheds({DUT_SCHEDULE_ID: config.DUT_SCHEDULE_ID});
        paramSet.DUT_AUTOMATION_PARAMETERS_ID = dutScheduleInfo[0].DUT_AUTOMATION_PARAMETERS_ID;
        await sqldb.AUTOMATIONS_PERIODS.w_updateInfo({ID: config.DUT_SCHEDULE_ID, ...paramSet}, session.user);
        await sqldb.SCHEDULES.w_updateInfo({ID: dutScheduleInfo[0].SCHEDULE_ID, ...paramSet}, session.user);
        await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: dutScheduleInfo[0].DUT_AUTOMATION_PARAMETERS_ID, ...paramSet}, session.user);
      }
      else{
        const insertedAutomationsPeriods = await sqldb.AUTOMATIONS_PERIODS.w_insert({
          TITLE: paramSet.TITLE, 
          AUTOMATION_PERIOD_STATUS: paramSet.AUTOMATION_PERIOD_STATUS,
          BEGIN_TIME: paramSet.BEGIN_TIME,
          END_TIME: paramSet.END_TIME,
        }, session.user);
        const insertedAutomationParameters = await sqldb.AUTOMATIONS_PARAMETERS.w_insert({
          ...paramSet, OPERATION: null, 
        }, session.user);
        await sqldb.SCHEDULES.w_insert({
          AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
          DAYS: paramSet.DAYS,
          NEED_MULT_SCHEDULES: paramSet.NEED_MULT_SCHEDULES
        },session.user);
        for (const machines of dutAutomationInfo) {
          await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_insert({
            MACHINE_ID: machines.MACHINE_ID,
            AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId
          },session.user);
        }
        const insertedAutomationPeriodParameters = await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_insert({
          AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
          AUTOMATION_PARAMETERS_ID: insertedAutomationParameters.insertId
        }, session.user);
        
        paramSet.DUT_AUTOMATION_PARAMETERS_ID = insertedAutomationPeriodParameters.insertId;
        config.DUT_SCHEDULE_ID = insertedAutomationsPeriods.insertId;
      }

      let schedule = {
        currentOnDut: false,
        active: config.SCHEDULE_STATUS,
        beginHour: config.BEGIN_TIME,
        endHour: config.END_TIME,
        modeTag: config.CTRLOPER as ControlMode,
        days: config.DAYS,
        permission: config.PERMISSION,
        temperature: config.SETPOINT,
        LTC: config.LTC,
        LTI: config.LTI,
        UPPER_HYSTERESIS: config.UPPER_HYSTERESIS,
        LOWER_HYSTERESIS: config.LOWER_HYSTERESIS,
        SCHEDULE_START_BEHAVIOR: config.SCHEDULE_START_BEHAVIOR,
        SCHEDULE_END_BEHAVIOR: config.SCHEDULE_END_BEHAVIOR,
        FORCED_BEHAVIOR: config.FORCED_BEHAVIOR,
        IR_ID_COOL: config.IR_ID_COOL,
        ACTION_MODE: config.ACTION_MODE,
        ACTION_TIME: config.ACTION_TIME,
        ACTION_POST_BEHAVIOR: config.ACTION_POST_BEHAVIOR
      } as ScheduleDutCache;
    }
  }

  if (needSendCommandMultProg) {
    const dutInfo = await sqldb.DUTS_DEVICES.getDutDevice({ DEVICE_CODE: reqParams.DUT_ID });

    // SENDED_MULT_PROG_BEHAVIOR: 0 indica que comando nunca foi enviado; 2 indica que houve tentativa mas sem retorno de sucesso
    if ([0,2].includes(dutInfo.SENDED_MULT_PROG_BEHAVIOR) || needMultScheduleOld !== Number(reqParams.NEED_MULT_SCHEDULES)) {
      try {
        const promise = iotMessageListener.waitForDutControl((message) => {
          if (!message) return false;
          message = message as MsgMultProgFlag;
          if (message.dev_id !== reqParams.DUT_ID) return false;
          if (message.msgtype !== 'return-multprog-flag') return false;
          if (message.multprog_flag_enabled !== reqParams.NEED_MULT_SCHEDULES) throw Error('Error setting status').HttpStatus(400);
          return true;
        }, 5000);
      
        const multProgCommand = {
          "msgtype": "set-mult-prog",
          "status": reqParams.NEED_MULT_SCHEDULES,
        } as SetMultProg;
      
        devsCommands.sendDutCommand(reqParams.DUT_ID, multProgCommand, session.user);
    
        (await promise) as MsgMultProgFlag;
        await sqldb.DUTS_DEVICES.w_updateInfo({ ID: dutInfo.DUT_DEVICE_ID, SENDED_MULT_PROG_BEHAVIOR: 1 }, session.user);
      }
      catch (err) {
        // Em caso de erro, altera status de envio para 2, para ser feito nova tentativa em rotina automática
        await sqldb.DUTS_DEVICES.w_updateInfo({ ID: dutInfo.DUT_DEVICE_ID, SENDED_MULT_PROG_BEHAVIOR: 2 }, session.user);
        logger.error(`Error resending set-mult-prog: ${err}`);
      }
    }
  }
  const response = await httpRouter.privateRoutes['/dut/get-dut-schedules']({ CLIENT_ID: reqParams.CLIENT_ID, UNIT_ID: reqParams.UNIT_ID, DUT_ID: reqParams.DUT_ID}, session);

  return response;
}

httpRouter.privateRoutes['/dut/get-dut-exceptions'] = async function (reqParams, session) {

  if (!reqParams.DUT_ID) throw Error('There was an error! Missing DUT_ID.').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const exceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: reqParams.DUT_ID });

  let result = [] as {
    DUT_EXCEPTION_ID: number
    EXCEPTION_TITLE: string
    REPEAT_YEARLY: boolean
    EXCEPTION_DATE: string
    BEGIN_TIME: string
    END_TIME: string
    PERMISSION: 'allow'|'forbid'
    EXCEPTION_STATUS_ID: number
    CTRLOPER: ControlMode
    SETPOINT?: number
    LTC?: number
    LTI?: number
    UPPER_HYSTERESIS?: number
    LOWER_HYSTERESIS?: number
    SCHEDULE_START_BEHAVIOR?: string
    SCHEDULE_END_BEHAVIOR?: string
    FORCED_BEHAVIOR?: string
    ACTION_MODE?: string
    ACTION_TIME?: number
    ACTION_POST_BEHAVIOR?: string
  }[];

  for (const config of exceptions) {
    const item = {
      DUT_EXCEPTION_ID: config.DUT_EXCEPTION_ID,
      EXCEPTION_TITLE: config.EXCEPTION_TITLE,
      REPEAT_YEARLY: config.REPEAT_YEARLY === '1' ? true : false,
      EXCEPTION_DATE: config.EXCEPTION_DATE,
      BEGIN_TIME: config.BEGIN_TIME,
      END_TIME: config.END_TIME,
      PERMISSION: config.PERMISSION,
      EXCEPTION_STATUS_ID: config.AUTOMATION_PERIOD_STATUS,
      CTRLOPER: config.CTRLOPER as ControlMode,
      SETPOINT: config.SETPOINT,
      LTC: config.LTC,
      LTI: config.LTI,
      UPPER_HYSTERESIS: config.UPPER_HYSTERESIS,
      LOWER_HYSTERESIS: config.LOWER_HYSTERESIS,
      SCHEDULE_START_BEHAVIOR: config.SCHEDULE_START_BEHAVIOR,
      SCHEDULE_END_BEHAVIOR: config.SCHEDULE_END_BEHAVIOR,
      FORCED_BEHAVIOR: config.FORCED_BEHAVIOR,
      ACTION_MODE: config.ACTION_MODE,
      ACTION_TIME: config.ACTION_TIME,
      ACTION_POST_BEHAVIOR: config.ACTION_POST_BEHAVIOR,
    }
    result.push(item);
  }

  return {exceptions: result};
}

httpRouter.privateRoutes['/dut/set-dut-exceptions'] = async function (reqParams, session) {
  if (!reqParams.DUT_ID) throw Error('There was an error! Missing DUT_ID.').HttpStatus(400);
  if (!reqParams.exceptions) throw Error('There was an error! Missing exceptions.').HttpStatus(400);
  const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DUT_ID })
  const { userCanEditDev } = await checkDevEditPermission(session, currentDevInfo, {
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_ID: reqParams.UNIT_ID,
  });

  const exceptions = reqParams.exceptions.sort((a, _b) => {
    if (a.DELETE) {
      return -1;
    }
    return 1;
  });

  if (!userCanEditDev) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  for (let config of exceptions) {
    if (config.DELETE == null) throw Error('There was an error! Missing DELETE on a exception.').HttpStatus(400);
    if (!config.EXCEPTION_TITLE) throw Error('There was an error! Missing EXCEPTION_TITLE on a exception.').HttpStatus(400);
    if (config.REPEAT_YEARLY == null) throw Error('There was an error! Missing REPEAT_YEARLY on a exception.').HttpStatus(400);
    if (!config.EXCEPTION_DATE) throw Error('There was an error! Missing EXCEPTION_DATE on a exception.').HttpStatus(400);
    if (!config.BEGIN_TIME) throw Error('There was an error! Missing BEGIN_TIME on a exception.').HttpStatus(400);
    if (!config.END_TIME) throw Error('There was an error! Missing END_TIME on a exception.').HttpStatus(400);
    if (!config.PERMISSION) throw Error('There was an error! Missing PERMISSION on a exception.').HttpStatus(400);
    if (config.EXCEPTION_STATUS_ID == null) throw Error('There was an error! Missing EXCEPTION_STATUS_ID on a exception.').HttpStatus(400);
    
    const paramSet = {} as {
      DUT_ID: string
      DUT_EXCEPTION_ID: number
      TITLE: string
      REPEAT_YEARLY: string
      EXCEPTION_DATE: string
      BEGIN_TIME: string
      END_TIME: string
      PERMISSION: 'allow'|'forbid'
      AUTOMATION_PERIOD_STATUS: string
      MODE: string,
      SETPOINT: number,
      LTC: number,
      LTI: number,
      UPPER_HYSTERESIS: number,
      LOWER_HYSTERESIS: number, 
      SCHEDULE_START_BEHAVIOR: string,
      SCHEDULE_END_BEHAVIOR: string,
      FORCED_BEHAVIOR: string,
      IR_ID_COOL: string,
      DUT_AUTOMATION_PARAMETERS_ID: number,
      ACTION_MODE: string,
      ACTION_TIME: number
      ACTION_POST_BEHAVIOR: string
    };

    const dutAutomationInfo = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo({DEVICE_CODE: reqParams.DUT_ID});
    if (config.DELETE) {
      const dutExceptionInfo = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({DUT_EXCEPTION_ID: config.DUT_EXCEPTION_ID});
      await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: config.DUT_EXCEPTION_ID}, session.user);
      await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: config.DUT_EXCEPTION_ID}, session.user);
      if (dutExceptionInfo[0].DUT_AUTOMATION_PARAMETERS_ID) {
        await sqldb.AUTOMATIONS_PARAMETERS.w_delete({ID: dutExceptionInfo[0].DUT_AUTOMATION_PARAMETERS_ID}, session.user);
      }
      await sqldb.EXCEPTIONS.w_deleteByAutomationPeriod({AUTOMATION_PERIOD_ID: config.DUT_EXCEPTION_ID}, session.user);
      await sqldb.AUTOMATIONS_PERIODS.w_deleteRow({ID: config.DUT_EXCEPTION_ID}, session.user);
      
      continue;
    }
    else {
      paramSet.DUT_ID = reqParams.DUT_ID;
      paramSet.TITLE = config.EXCEPTION_TITLE;
      paramSet.REPEAT_YEARLY = config.REPEAT_YEARLY ? '1' : '0';
      paramSet.EXCEPTION_DATE = config.EXCEPTION_DATE;
      paramSet.BEGIN_TIME = config.BEGIN_TIME; 
      paramSet.END_TIME = config.END_TIME;
      paramSet.PERMISSION = config.PERMISSION;
      paramSet.AUTOMATION_PERIOD_STATUS = config.EXCEPTION_STATUS_ID ? '1' : '0';
      paramSet.MODE = config.CTRLOPER;
      if (config.SETPOINT !== undefined) { paramSet.SETPOINT = config.SETPOINT; }
      if (config.LTC !== undefined) { paramSet.LTC = config.LTC; }
      if (config.LTI !== undefined) { paramSet.LTI = config.LTI; }
      if (config.UPPER_HYSTERESIS !== undefined) { paramSet.UPPER_HYSTERESIS = config.UPPER_HYSTERESIS; }
      if (config.LOWER_HYSTERESIS !== undefined) { paramSet.LOWER_HYSTERESIS = config.LOWER_HYSTERESIS; }
      if (config.SCHEDULE_START_BEHAVIOR !== undefined) { paramSet.SCHEDULE_START_BEHAVIOR = config.SCHEDULE_START_BEHAVIOR; }
      if (config.SCHEDULE_END_BEHAVIOR !== undefined) { paramSet.SCHEDULE_END_BEHAVIOR = config.SCHEDULE_END_BEHAVIOR; }
      if (config.FORCED_BEHAVIOR !== undefined) { paramSet.FORCED_BEHAVIOR = config.FORCED_BEHAVIOR; }
      if (config.IR_ID_COOL !== undefined) { paramSet.IR_ID_COOL = config.IR_ID_COOL; }
      if (config.ACTION_MODE !== undefined) { paramSet.ACTION_MODE = config.ACTION_MODE; }
      if (config.ACTION_TIME !== undefined) { paramSet.ACTION_TIME = config.ACTION_TIME; }
      if (config.ACTION_POST_BEHAVIOR !== undefined) { paramSet.ACTION_POST_BEHAVIOR = config.ACTION_POST_BEHAVIOR; }


      if (config.DUT_EXCEPTION_ID) {
        const dutExceptionInfo = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({DUT_EXCEPTION_ID: config.DUT_EXCEPTION_ID});
        paramSet.DUT_AUTOMATION_PARAMETERS_ID = dutExceptionInfo[0].DUT_AUTOMATION_PARAMETERS_ID;
        paramSet.DUT_EXCEPTION_ID = config.DUT_EXCEPTION_ID;
        await sqldb.AUTOMATIONS_PERIODS.w_updateInfo({ID: config.DUT_EXCEPTION_ID, ...paramSet}, session.user);
        await sqldb.EXCEPTIONS.w_updateInfo({ID: dutExceptionInfo[0].EXCEPTION_ID, ...paramSet}, session.user);
        await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: dutExceptionInfo[0].DUT_AUTOMATION_PARAMETERS_ID, ...paramSet}, session.user);
      
      }
      else{
        const insertedAutomationsPeriods = await sqldb.AUTOMATIONS_PERIODS.w_insert({
          TITLE: paramSet.TITLE, 
          AUTOMATION_PERIOD_STATUS: paramSet.AUTOMATION_PERIOD_STATUS.toString(),
          BEGIN_TIME: paramSet.BEGIN_TIME,
          END_TIME: paramSet.END_TIME,
        }, session.user);
        const insertedAutomationParameters = await sqldb.AUTOMATIONS_PARAMETERS.w_insert({
          ...paramSet, OPERATION: null, 
        }, session.user);
        await sqldb.EXCEPTIONS.w_insert({
          AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
          EXCEPTION_DATE: paramSet.EXCEPTION_DATE,
          REPEAT_YEARLY: paramSet.REPEAT_YEARLY
        },session.user);
        for (const machines of dutAutomationInfo) {
          await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_insert({
            MACHINE_ID: machines.MACHINE_ID,
            AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId
          },session.user);
        }
        const insertedAutomationPeriodParameters = await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_insert({
          AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
          AUTOMATION_PARAMETERS_ID: insertedAutomationParameters.insertId
        }, session.user);
        paramSet.DUT_AUTOMATION_PARAMETERS_ID = insertedAutomationPeriodParameters.insertId;
        config.DUT_EXCEPTION_ID = insertedAutomationsPeriods.insertId;
      }
    }
  }

  const response = await httpRouter.privateRoutes['/dut/get-dut-exceptions']({ CLIENT_ID: reqParams.CLIENT_ID, UNIT_ID: reqParams.UNIT_ID, DUT_ID: reqParams.DUT_ID}, session);

  return response;
}

// Function trazida de frontv3
export function identifyDutIrCommands(dutIrCmds: {
  IR_ID: string;
  CMD_TYPE: string;
  CMD_DESC: string;
  TEMPERATURE: number;
}[]) {

  const getCmdName = (M: string, T: string) => {
    let avaliacao = '';
    if ((M === 'AC_OFF') || (M === 'AC_FAN')) { avaliacao = 'OK'; }
    else if ((M === 'AC_COOL') && T && (T.length === 2)) { avaliacao = 'OK'; }
    const identificado = ((avaliacao === 'OK') && `${M}${(M === 'AC_COOL') ? (`:${T}`) : ''}`) || null;
    return identificado;
  }

  const getCmdInfo = (item: {
    IR_ID: string;
    CMD_TYPE: string;
    CMD_DESC: string;
    TEMPERATURE: number;
  }) => {
    const desc = (item.CMD_DESC || '').toUpperCase();
    const t1 = (item.TEMPERATURE == null) ? null : String(item.TEMPERATURE);
    const t2 = (desc.match(/(\d+)/g) || []).join(';') || null;
    const T = (t1 === t2) ? t1 : [t1, t2].filter((x) => x).join(';');
    const ehDesl = !!((item.CMD_TYPE === 'AC_OFF') || desc.includes('DESL') || desc.includes('OFF'));
    const ehVent = !!((item.CMD_TYPE === 'AC_FAN') || desc.includes('VENT') || desc.includes('FAN'));
    const ehRefr_pre = !!((item.CMD_TYPE === 'AC_COOL') || desc.includes('COOL') || desc.includes('REFR') || desc.includes('SET') || desc.match(/\bLIG/) || desc.match(/\bON/)) || (item.CMD_DESC && item.CMD_DESC === t2);
    const ehRefr = ehRefr_pre || !!(T && (!ehDesl) && (!ehVent));

    return {desc, ehDesl, ehVent, ehRefr, T};
  };

  return dutIrCmds.map((item) => {
    const {desc, ehDesl, ehVent, ehRefr, T} = getCmdInfo(item);
    const M = (desc.startsWith('FAKE') ? 'FAKE' : [ehDesl && 'AC_OFF', ehVent && 'AC_FAN', ehRefr && 'AC_COOL'].filter((x) => x).join(';')) || '?';
    const identificado = getCmdName(M, T);
    // identificado = 'AC_OFF' ou 'AC_FAN' ou 'AC_COOL:21' ...
    return { ...item, cmdName: identificado };
  }) || null;
}

export async function defineIrCodeAction(reqParams: {IR_ID: string, CMD_TYPE: string, CMD_DESC: string, TEMPER: number, }, DUT_ID: string, userId: string ){
  if (reqParams.CMD_TYPE) {
    await sqldb.IR_CODES.w_removeAction({
      DUT_CODE: DUT_ID,
      CMD_TYPE: reqParams.CMD_TYPE,
    }, userId);
  }
  const { affectedRows } = await sqldb.IR_CODES.w_update({
    DUT_CODE: DUT_ID,
    IR_ID: reqParams.IR_ID,
    CMD_TYPE: reqParams.CMD_TYPE,
    CMD_DESC: reqParams.CMD_DESC,
    TEMPERATURE: reqParams.TEMPER,
  }, userId);

  return affectedRows;
}

export async function updateForcedSetpoint(devId: string, userId: string){
    // Se está atualizando comando AC_COOL, necessário atualizar do DUT caso esteja Refrigerando em modo forçado sem rotina da programação múltipla;
    const dutInfo = await sqldb.AUTOM_EVAP.getDevBasicInfo({DUT_ID: devId});
    if (dutInfo && dutInfo.CTRLOPER === '7_FORCED' && dutInfo.FORCED_BEHAVIOR === 'dut-forced-cool') {
      const dutSchedules = await sqldb.DUTS_SCHEDULES.getDutScheds({DUT_ID: devId, SCHEDULE_STATUS: '1'});
      if (dutSchedules.length > 0 && dutSchedules[0].NEED_MULT_SCHEDULES === '0') {
        const dutIrCodes = await sqldb.IR_CODES.getAllCodes({ DUT_CODES: [devId] });
        const irCommands = identifyDutIrCommands(dutIrCodes)
        .filter((command) => {
          const cmdSetpoint = Number(command?.cmdName?.split(':')[1]) || null;
          if (cmdSetpoint != null) return command;
          return null;
        })
        .map((command) => (
          {
            IR_ID: command.IR_ID,
            CMD_NAME: command?.cmdName,
            CMD_TYPE: command?.CMD_TYPE,
            TEMPER: Number(command?.cmdName?.split(':')[1]),
          }
        ))
        .sort((a, b) => {
          if (a.TEMPER > b.TEMPER) {
            return 1;
          }
          return -1;
        });
  
        const newCool = irCommands.find(item => item.CMD_TYPE === 'AC_COOL' && item.TEMPER != null);
        if (newCool) {
          const schedulesFiltered = dutSchedules.filter(item => item.CTRLOPER === '7_FORCED' && item.FORCED_BEHAVIOR === 'dut-forced-cool');
          for (const schedule of schedulesFiltered) {
            await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: schedule.DUT_AUTOMATION_PARAMETERS_ID, SETPOINT: newCool.TEMPER, IR_ID_COOL: newCool.IR_ID, CURRENT_IN_DEVICE: '0'}, userId);
          }
  
          const exceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({DUT_ID: devId});
  
          for (const exception of exceptions) {
            if (exception.CTRLOPER === '7_FORCED' && exception.FORCED_BEHAVIOR === 'dut-forced-cool') {
              await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: exception.DUT_AUTOMATION_PARAMETERS_ID, SETPOINT: newCool.TEMPER, IR_ID_COOL: newCool.IR_ID, CURRENT_IN_DEVICE: '0'}, userId);
            }
          }
          const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
          if (currentAutomationId) {
            await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
              ID: currentAutomationId.ID,
              SETPOINT: newCool.TEMPER,
              IR_ID_COOL: newCool.IR_ID,
            },userId);
          }
        }
      }
    }
}

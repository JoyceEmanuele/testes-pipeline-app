import sqldb from '../../srcCommon/db'
import * as crypto from 'crypto'
import {
  SessionData,
  WebSocketClient,
} from '../../srcCommon/types';
import {
  DutIrRead, DutIrReadDeprecated, DutMsg_TemperatureControlState, DutSensorAutomRead,
} from '../../srcCommon/types/devicesMessages';
import * as webSocketServer from '../apiServer/webSocketServer'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands'
import * as WebSocket from 'ws'
import servConfig from '../../configfile'
import { logger } from '../../srcCommon/helpers/logger'
import { getAllowedUnitsManage, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import { parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion';



let irLearnDisableCmd: {
  [dutId: string]: number
} = {};

const sendDisableIrLearning = async (devId: string, userId: string) => {
  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId});
  const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;
  if (fwVers?.vMajor >= 4) {
    devsCommands.setDutIrLearn(devId, false, userId)
  } else {
    devsCommands.setDutIrLearnDeprecated(devId, false, userId) 
  }
}

const sendEnableIrLearning = async (devId: string, userId: string) => {
  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId});
  const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;
  if (fwVers?.vMajor >= 4) {
    devsCommands.setDutIrLearn(devId, true, userId)
  } else {
    devsCommands.setDutIrLearnDeprecated(devId, true, userId) 
  }
}

const handleEmptyWssClients = async (devId: string, userId: string) => {
  if (servConfig.isProductionServer) {
    logger.info(`[DUT-IR-DEBUG] handleEmptyWssClients: ${devId}`);
    if (irLearnDisableCmd[devId] > (Date.now() - 30 * 1000)) { } // Ignore
    else {
      irLearnDisableCmd[devId] = Date.now()
      await sendDisableIrLearning(devId, userId);
    }
  }
}

const validateWs = (ws: WebSocketClient) => {
  logger.info(`[DUT-IR-DEBUG] validateWs: ${ws ? ws.readyState : 'null'}`);
  if (!ws) return false;
  if (ws.readyState !== WebSocket.OPEN) return false;

  return true;
}

export async function registerDutIrCode(payload: DutIrRead | DutIrReadDeprecated, devId: string, userId: string) {
  const CODE_DATA = JSON.stringify(payload.ir_code);
  const IR_ID = crypto.createHash('md5').update(CODE_DATA).digest("base64");
  
  logger.info(`[DUT-IR-DEBUG] registerDutIrCode DEV_ID: ${devId}`);

  if (!webSocketServer.wss?.clients) {
    await handleEmptyWssClients(devId, userId);
    return;
  }

  let saved = false;
  let someoneSubscr = false;

  for (const ws of webSocketServer.wss.clients) {
    if(!validateWs(ws)) continue;

    if (ws.subscrDutIrRead?.includes(devId)) {
      // OK
      logger.info(`[DUT-IR-DEBUG] someoneSubscr true`);
      someoneSubscr = true;
    }
    else continue

    if (!saved) {
      saved = true;
      const insertedIrCode = await sqldb.IR_CODES.w_insertIgnore({
        IR_ID,
        CODE_DATA
      }, userId);
      const dutInfo = await sqldb.DUTS_DEVICES.getDutDevice({ DEVICE_CODE: devId});
      await sqldb.DUTS_IR_CODES.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, IR_CODE_ID: insertedIrCode.insertId}, userId);
    }

    ws.send(JSON.stringify({ type: 'dutIrRead', data: { devId, IR_ID } }));
  }

  if (servConfig.isProductionServer && !someoneSubscr) {
    logger.info(`[DUT-IR-DEBUG] someoneSubscr false ${webSocketServer.wss.clients}`);
    if (irLearnDisableCmd[devId] > (Date.now() - 30 * 1000)) { } // Ignore
    else {
      irLearnDisableCmd[devId] = Date.now()
      sendDisableIrLearning(devId, userId);
    }
  }
}

async function checkDisableIrLearn(prevSubs: string[], userId: string) {
  if (!prevSubs) return;
  if (!prevSubs.length) return;
  if (!webSocketServer.wss?.clients) return;
  if (!servConfig.isProductionServer) return;
  for (const dutId of prevSubs) {
    // if (irLearnDisableCmd[dutId] > (Date.now() - 30 * 1000)) continue; // Ignore
    let someoneSubscr = false;
    for (const ws of webSocketServer.wss.clients) {
      if(!validateWs(ws)) continue;

      if (ws.subscrDutIrRead?.includes(dutId)) {
        someoneSubscr = true;
        break;
      }
    }
    if (!someoneSubscr) {
      sendDisableIrLearning(dutId, userId);
    }
  }
}

webSocketRouter.wSocketRoute('dutUnsubscribeIrRead', dutUnsubscribeIrRead)
async function dutUnsubscribeIrRead(session: SessionData, message: { [k: string]: any }, ws: WebSocketClient) {
  logger.info(`[DUT-IR-DEBUG] dutUnsubscribeIrRead DEV_ID: ${ws.subscrDutIrRead}`);
  const prevSubs = ws.subscrDutIrRead;
  ws.subscrDutIrRead = null
  await checkDisableIrLearn(prevSubs, session.user);
}

webSocketRouter.wSocketRoute('dutSubscribeIrRead', dutSubscribeIrRead)
async function dutSubscribeIrRead(session: SessionData, reqParams: {
  DUT_ID: string
}, ws: WebSocketClient) {
  ws.subscrDutIrRead = null
  logger.info(`[DUT-IR-DEBUG] dutSubscribeIrRead DEV_ID: ${reqParams.DUT_ID}`);

  const perms = getUserGlobalPermissions(session);
  const allowedUnits = perms.manageAllClientsUnitsAndDevs
    ? undefined
    : await getAllowedUnitsManage(session);

  if (allowedUnits?.clientIds && allowedUnits.clientIds.length === 0) {
    return;
  }
  if (allowedUnits?.unitIds && allowedUnits.unitIds.length === 0) {
    return;
  }

  const qPars: Parameters<typeof sqldb.DUTS.selectedDevsInfoToIr>[0] = {
    CLIENT_IDS: allowedUnits?.clientIds,
    UNIT_IDS: allowedUnits?.unitIds,
    DEV_ID: reqParams.DUT_ID,
  }
  if (!qPars.DEV_ID) {
    throw Error('Invalid subscription parameters!').HttpStatus(400)
  }

  const rows = await sqldb.DUTS.selectedDevsInfoToIr(qPars)
  if (!rows.length) {
    logger.info('No DEVs found for filter', qPars)
  } else {
    ws.subscrDutIrRead = rows.map(x => x.DEV_ID)
    for (const dutId of ws.subscrDutIrRead) {
      sendEnableIrLearning(dutId, session.user);
    }
  }
}

export async function updateDutSensorAutomConfig(payload: DutSensorAutomRead, user: string) {
  const devId = payload.dev_id;
  const dutInfo = await sqldb.DUTS.getBasicInfo({ devId });
  if (dutInfo?.SENSOR_AUTOM !== payload.index) {
    const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({DUT_CODE: devId});
    if (dutDuo) {
      await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, SENSOR_AUTOM: payload.index }, user );
    }
    else {
      logger.info(`DUT-DUO ${devId} não cadastrado.`);
    }
  }
  return;
}

export async function onTemperatureControlState (devId: string, payload: DutMsg_TemperatureControlState) {
  // Salvar no banco de dados
  const dutDevice = await sqldb.DUTS_DEVICES.getDutDevice({ DEVICE_CODE: devId });
  if (dutDevice) {
    await sqldb.DUTS_DEVICES.w_updateInfo({
      ID: dutDevice.DUT_DEVICE_ID,
      LAST_TEMPERATURE_CONTROL_CFG: JSON.stringify(payload),
    }, '[SYSTEM]')
  }
}

import * as webSocketServer from '../apiServer/webSocketServer';
import * as lastMessages from '../ramCaches/lastMessages'
import * as WebSocket from 'ws'
import * as webSocketRouter from './../apiServer/webSocketRouter'
import {
  WebSocketClient,
  TelemetryDAL,
  SessionData,
} from '../../srcCommon/types'
import {
  TelemetryRawDAL,
} from '../../srcCommon/types/devicesMessages'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener';
import * as checkManualMode from '../realTime/checkManualMode';
import * as momentTimezone from 'moment-timezone';
import * as ramCaches from '../ramCaches';

export async function telemetryReceived (payload: TelemetryRawDAL, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  let subscrUsers: WebSocketClient[] = []
  if (webSocketServer.wss && webSocketServer.wss.clients) {
    subscrUsers = getAllowedUsers(webSocketServer.wss.clients, devId)
  }
  let timestampTelemetry;
  if (payloadShiftedTs) {
    timestampTelemetry = momentTimezone(payloadShiftedTs).format('YYYY-MM-DD HH:mm:ss');
  }
  const telemetry: TelemetryDAL = {
    dev_id: devId,
    status: lastMessages.getStatus(devId),
    timestamp: timestampTelemetry,
    State: payload.State,
    Mode: payload.Mode,
    Feedback: payload.Feedback,
    Relays: payload.Relays,
    GMT: payload.GMT,
  };

  checkManualMode.onDalModeTelemetry(telemetry, payloadShiftedTs.getTime());

  if (subscrUsers.length > 0) {
    const lastRssiMsg = tryGetDevSysDebug(devId);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const dalTelemetry = { ...telemetry, RSSI };
    for (const ws of subscrUsers) {
      ws.send(JSON.stringify({ type: 'dalTelemetry', data: dalTelemetry }))
    }
  }

  iotMessageListener.dalTelemetryReceived(telemetry);
}


function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.realTimeDALs && ws.realTimeDALs.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('dalUnsubscribeRealTime', dalUnsubscribeRealTime)
async function dalUnsubscribeRealTime (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.realTimeDALs = null
}

webSocketRouter.wSocketRoute('dalSubscribeRealTime', dalSubscribeRealTime)
async function dalSubscribeRealTime (session: SessionData, reqParams: {
  DAL_CODE: string
  UNIT_ID: number
}, ws: WebSocketClient) {
  ws.realTimeDALs = null

  let unitIds = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : undefined;

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  let dalsList = await sqldb.DALS.getDalsList({ unitIds });
  if (reqParams.DAL_CODE) {
    dalsList = dalsList.filter((dal) => dal.DEVICE_CODE === reqParams.DAL_CODE);
  }
  if (dalsList.length === 0) {
    logger.info('No DEVs found for filter', reqParams);
    logger.info({ reqParams, dalsList });
    return
  }
  ws.realTimeDALs = dalsList.map(x => x.DEVICE_CODE);

  for (const row of dalsList) {
    const lastComm = lastMessages.lastDalTelemetry(row.DEVICE_CODE);
    const lastTelemetry = lastComm?.lastTelemetry;
    const lastRssiMsg = tryGetDevSysDebug(row.DEVICE_CODE);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const dalTelemetry = {
      ...(lastTelemetry||{}),
      dev_id: row.DEVICE_CODE,
      status: (lastComm?.status) || 'OFFLINE',
      RSSI,
      GMT: lastComm?.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'dalTelemetry', data: dalTelemetry }))
  }
}

import * as webSocketServer from '../apiServer/webSocketServer'
import * as lastMessages from '../ramCaches/lastMessages'
import * as WebSocket from 'ws'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import {
  WebSocketClient,
  TelemetryDMT,
  SessionData,
} from '../../srcCommon/types'
import {
  TelemetryPackRawDMT,
} from '../../srcCommon/types/devicesMessages'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger'

export async function telemetryReceived (payload: TelemetryPackRawDMT, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  const subscrUsers = (webSocketServer.wss && webSocketServer.wss.clients && getAllowedUsers(webSocketServer.wss.clients, devId)) || [];

  if (subscrUsers.length > 0) {
    const telemetry: TelemetryDMT = {
      dev_id: devId,
      status: lastMessages.getStatus(devId),
      samplingTime: payload.samplingTime,
      F1: payload.F1,
      F2: payload.F2,
      F3: payload.F3,
      F4: payload.F4,
      GMT: payload.GMT,
      timestamp: payloadShiftedTs.toISOString().substring(0, 19),
    };

    const lastRssiMsg = tryGetDevSysDebug(devId);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const dmtTelemetry = { ...telemetry, RSSI };
    for (const ws of subscrUsers) {
      ws.send(JSON.stringify({ type: 'dmtTelemetry', data: dmtTelemetry }))
    }
  }
}


function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.realTimeDMTs && ws.realTimeDMTs.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('dmtUnsubscribeRealTime', dmtUnsubscribeRealTime)
async function dmtUnsubscribeRealTime (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.realTimeDMTs = null
}

webSocketRouter.wSocketRoute('dmtSubscribeRealTime', dmtSubscribeRealTime)
async function dmtSubscribeRealTime (session: SessionData, reqParams: {
  DMT_CODE: string
  UNIT_ID: number
}, ws: WebSocketClient) {
  ws.realTimeDMTs = null

  let unitIds = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : undefined;

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  let dmtsList = await sqldb.DMTS.getDmtsList({ unitIds });
  if (reqParams.DMT_CODE) {
    dmtsList = dmtsList.filter((dmt) => dmt.DEVICE_CODE === reqParams.DMT_CODE);
  }
  if (dmtsList.length === 0) {
    logger.info('No DEVs found for filter', reqParams);
    logger.info({ reqParams, dmtsList });
    return
  }
  ws.realTimeDMTs = dmtsList.map(x => x.DEVICE_CODE);

  for (const row of dmtsList) {
    const lastComm = lastMessages.lastDmtTelemetry(row.DEVICE_CODE);
    const lastTelemetry = lastComm?.lastTelemetry;
    const lastRssiMsg = tryGetDevSysDebug(row.DEVICE_CODE);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const dmtTelemetry = {
      ...(lastTelemetry||{}),
      dev_id: row.DEVICE_CODE,
      status: lastComm?.status || 'OFFLINE',
      RSSI,
      GMT: lastComm?.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'dmtTelemetry', data: dmtTelemetry }))
  }
}

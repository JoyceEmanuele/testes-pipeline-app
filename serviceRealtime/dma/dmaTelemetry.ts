import * as webSocketServer from '../apiServer/webSocketServer'
import * as lastMessages from '../ramCaches/lastMessages'
import * as WebSocket from 'ws'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import {
  WebSocketClient,
  TelemetryDMA,
  SessionData,
} from '../../srcCommon/types'
import {
  TelemetryPackRawDMA,
} from '../../srcCommon/types/devicesMessages'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import sqldb from '../../srcCommon/db'

export async function telemetryReceived (payload: TelemetryPackRawDMA, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  const subscrUsers = (webSocketServer.wss && webSocketServer.wss.clients && getAllowedUsers(webSocketServer.wss.clients, devId)) || [];

  const telemetry: TelemetryDMA = {
    dev_id: devId,
    pulses: payload.pulses,
    status: lastMessages.getStatus(devId),
    operation_mode: payload.operation_mode,
    samplingTime: payload.samplingTime,
    mode: payload.mode,
    saved_data: payload.saved_data,
    GMT: payload.GMT,
    timestamp: payloadShiftedTs.toISOString().substring(0, 19),
  };

  if (subscrUsers.length > 0) {
    const lastRssiMsg = tryGetDevSysDebug(devId);
    let RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    if (lastRssiMsg?.LTE_RSRP) {
      RSSI = convertLteToWifi(lastRssiMsg?.LTE_RSRP);
    }
    const dmaTelemetry = { ...telemetry, RSSI };
    for (const ws of subscrUsers) {
      ws.send(JSON.stringify({ type: 'dmaTelemetry', data: dmaTelemetry }))
    }
  }
}


function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.realTimeDMAs && ws.realTimeDMAs.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('dmaUnsubscribeRealTime', dmaUnsubscribeRealTime)
async function dmaUnsubscribeRealTime (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.realTimeDMAs = null
}

webSocketRouter.wSocketRoute('dmaSubscribeRealTime', dmaSubscribeRealTime)
async function dmaSubscribeRealTime (session: SessionData, reqParams: {
  DMA_ID: string
}, ws: WebSocketClient) {
  ws.realTimeDMAs = null

  if (!reqParams.DMA_ID) throw Error('ID do DMA_ID não foi informado').HttpStatus(400);
  const dmaInf = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: reqParams.DMA_ID });
  if (!dmaInf) throw Error('DMA_ID não encontrado').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Não permitido').HttpStatus(403);

  ws.realTimeDMAs = [dmaInf.DMA_ID];

  for (const row of [dmaInf]) {
    const lastComm = lastMessages.lastDmaTelemetry(row.DMA_ID);
    const lastTelemetry = lastComm && lastComm.lastTelemetry;
    const lastRssiMsg = tryGetDevSysDebug(row.DMA_ID);
    let RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    if (lastRssiMsg?.LTE_RSRP) {
      RSSI = convertLteToWifi(lastRssiMsg?.LTE_RSRP);
    }
    const dmaTelemetry = {
      ...(lastTelemetry||{}),
      dev_id: row.DMA_ID,
      status: (lastComm && lastComm.status) || 'OFFLINE',
      RSSI,
      GMT: lastComm?.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'dmaTelemetry', data: dmaTelemetry }))
  }
}

// função baseaa nos valores de Wifi: (converti o LTE para ter o mesmo significado)
// (RSSI > -50) : Excelente
// (-50 > RSSI > -60): Bom
// (-60 > RSSI > -70) : Regular
// (RSSI < -70) : Ruim

function convertLteToWifi(RSSI: number): number {
  if (RSSI >= -80) return -49;
  if (RSSI >= -90 && RSSI < -80) return -51;
  if (RSSI >= -100 && RSSI < -90) return -61;
  return -71;
}

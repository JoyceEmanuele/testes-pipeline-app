import * as webSocketServer from '../apiServer/webSocketServer'
import * as damData from '../../srcCommon/helpers/damData'
import * as lastMessages from '../ramCaches/lastMessages'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import * as WebSocket from 'ws'
import {
  WebSocketClient,
  TelemetryDAM,
} from '../../srcCommon/types'
import {
  TelemetryRawDAM,
} from '../../srcCommon/types/devicesMessages'
// import { ecoStateExpected } from '../realTime/ecoMode'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import * as checkManualMode from '../realTime/checkManualMode'

// RAM-CACHE
const lastDamState: Map<string,string> = new Map();

export async function telemetryReceived (payload: TelemetryRawDAM, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  let subscrUsers: WebSocketClient[] = []
  if (webSocketServer.wss && webSocketServer.wss.clients) {
    subscrUsers = getAllowedUsers(webSocketServer.wss.clients, devId)
  }

  const telemetry: TelemetryDAM = Object.assign(
    damData.processRawTelemetry(payload),
    {
      timestamp: payloadShiftedTs.toISOString().substr(0, 19),
      dev_id: devId,
      status: lastMessages.getStatus(devId),
      GMT: payload.GMT,
    }
  );
  // const expectedEcoState = ecoStateExpected(devId);
  // const ecoModeActing = (expectedEcoState && telemetry.State === expectedEcoState) || false;
  const ecoModeActing: boolean = undefined;

  const currentState = `${telemetry.Mode} | ${telemetry.State} | ${ecoModeActing} | ${telemetry.Temperature}`;
  const changedState = lastDamState.get(devId) !== currentState;
  if (changedState) lastDamState.set(devId, currentState);
  checkManualMode.onDamModeTelemetry(telemetry, payloadShiftedTs.getTime());

  if (subscrUsers.length > 0) {
    const lastRssiMsg = tryGetDevSysDebug(devId);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    for (const ws of subscrUsers) {
      if (changedState && ws.subscrStat && ws.subscrStat.includes(devId)) {
        ws.send(JSON.stringify({ type: 'damStatus', data: {
          ...telemetry,
          GMT: payload.GMT,
          deviceTimestamp: payload.timestamp,
          // ecoModeActing,
          RSSI,
        } }))
      }
    }
  }

  iotMessageListener.damTelemetryReceived(telemetry)
}

function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.subscrStat && ws.subscrStat.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

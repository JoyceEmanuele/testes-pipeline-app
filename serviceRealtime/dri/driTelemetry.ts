import * as webSocketServer from '../apiServer/webSocketServer'
import * as lastMessages from '../ramCaches/lastMessages'
import * as driData from '../../srcCommon/helpers/driData'
import * as WebSocket from 'ws'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import {
  WebSocketClient,
  SessionData,
  TelemetryDRI,
} from '../../srcCommon/types'
import {
  TelemetryRawDRI,

} from '../../srcCommon/types/devicesMessages'
import sqldb from '../../srcCommon/db'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import * as ramCaches from '../ramCaches';
import { parseDriVarsCfg } from '../../srcCommon/dri/driInfo'

export async function telemetryReceived (payload: TelemetryRawDRI, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  let subscrUsers: WebSocketClient[] = []
  if (webSocketServer.wss && webSocketServer.wss.clients) {
    subscrUsers = getAllowedUsers(webSocketServer.wss.clients, devId)
  }
 
  const driCfg = ramCaches.DRIS.tryGetDriCfg(devId);
  const telemetry: TelemetryDRI = Object.assign(
    driData.processRawTelemetry(payload, driCfg),
    {
      timestamp: payloadShiftedTs.toISOString().substr(0, 19),
      dev_id: devId,
      status: lastMessages.getStatus(devId),
      GMT: payload.GMT,
    }
  );

  saveDriLastTelemetryCache(devId, telemetry);
  await verifyDriChillerAlarms(devId, telemetry);

  if (subscrUsers.length > 0) {
    const lastRssiMsg = tryGetDevSysDebug(devId);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;

    const driTelemetry = { ...telemetry, RSSI };
    for (const ws of subscrUsers) {
      ws.send(JSON.stringify({ type: 'driTelemetry', data: driTelemetry }))
    }
  }
}

function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.realTimeDRIs && ws.realTimeDRIs.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('driUnsubscribeRealTime', driUnsubscribeRealTime)
async function driUnsubscribeRealTime (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.realTimeDRIs = null
}

webSocketRouter.wSocketRoute('driSubscribeRealTime', driSubscribeRealTime)
async function driSubscribeRealTime (session: SessionData, reqParams: {
  DRI_ID?: string
  UNIT_ID?: number
}, ws: WebSocketClient) {
  ws.realTimeDRIs = null

  let unitIds = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : undefined;

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  const rows = await sqldb.DRIS.getList({ driId: reqParams.DRI_ID, unitIds });

  ws.realTimeDRIs = rows.map(x => x.DRI_ID);

  for (const row of rows) {
    const driCfg = parseDriVarsCfg(row.VARSCFG);
    const lastComm = lastMessages.lastDriTelemetry(row.DRI_ID, driCfg);
    const lastTelemetry = lastComm && lastComm.lastTelemetry;
    const lastRssiMsg = tryGetDevSysDebug(row.DRI_ID);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const driTelemetry = {
      ...(lastTelemetry||{}),
      dev_id: row.DRI_ID,
      status: (lastComm && lastComm.status) || 'OFFLINE',
      RSSI,
      GMT: lastComm?.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'driTelemetry', data: driTelemetry }))
  }
}

const drisLastTelemetries = {} as {
  [driId: string]: TelemetryDRI,
};

export function saveDriLastTelemetryCache(driId: string, telemetry: TelemetryDRI) {
  drisLastTelemetries[driId] = telemetry;
}

export function getDriLastTelemetryCache(driId: string) {
  return drisLastTelemetries[driId];
}

async function verifyDriChillerAlarms(driId: string, telemetry: TelemetryDRI) {
  // Se vier nulo, undefined, não verifico alarmes
  if ([telemetry.alarm_1, telemetry.alarm_2, telemetry.alarm_3, telemetry.alarm_4, telemetry.alarm_5].every((alarm) => alarm == null)) {
    return;
  }

  const alarms = {
    alarm_1: telemetry.alarm_1,
    alarm_2: telemetry.alarm_2,
    alarm_3: telemetry.alarm_3,
    alarm_4: telemetry.alarm_4,
    alarm_5: telemetry.alarm_5,
  };

  const actualAlarms = await sqldb.DRIS_CHILLER_ALARMS_HIST.getAlarmsHist({ DEVICE_CODE: driId, ACTUAL_ALARMS: true, HOUR_INTERVAL: 0 });
  const newAlarms: number[] = [];
  const resolvedAlarmsIds = [];

  Object.values(alarms).forEach((payloadAlarm) => {
    if (payloadAlarm && actualAlarms.findIndex((alarm) => alarm.ALARM_CODE === payloadAlarm.toString()) === -1) {
      newAlarms.push(payloadAlarm);
    }
  });

  for (const alarm of actualAlarms) {
    if (Object.values(alarms).indexOf(Number(alarm.ALARM_CODE)) === -1) {
      resolvedAlarmsIds.push(alarm.ID);
    }
  }

  if (resolvedAlarmsIds.length) {
    await sqldb.DRIS_CHILLER_ALARMS_HIST.w_update({ END_DATE: new Date().toISOString().substring(0, 19), HIST_IDS: resolvedAlarmsIds }, '[SYSTEM]')
  }

  if (newAlarms.length) {
    const startDate = new Date().toISOString().substring(0, 19);
    const driInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: driId });

    const promisesAlarms = newAlarms.map(async (alarmCode) => {
      const alarmInfo = await sqldb.CHILLER_CARRIER_ALARMS.getAlarmIdByCode({ ALARM_CODE: alarmCode.toString() });
      let alarmId = alarmInfo?.ID;
      if (!alarmInfo) {
        const { insertId} = await sqldb.CHILLER_CARRIER_ALARMS.w_insert({ ALARM_CODE: String(alarmCode) }, "[SYSTEM]")
        alarmId = insertId;
      }

      await sqldb.DRIS_CHILLER_ALARMS_HIST.w_insert({ ALARM_ID: alarmId, DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID, START_DATE: startDate }, '[SYSTEM]')
    });

    await Promise.all(promisesAlarms);
  }
}

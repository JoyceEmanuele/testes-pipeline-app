import * as webSocketServer from '../apiServer/webSocketServer'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import * as dutData from '../../srcCommon/helpers/dutData'
import * as ramCaches from '../ramCaches'
import * as dutStats from '../realTime/dutStats'
import * as lastMessages from '../ramCaches/lastMessages'
import * as dutSchedule from './dutSchedule'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import * as WebSocket from 'ws'
import {
  WebSocketClient,
  SessionData,
  TelemetryDUT,
  TelemetryDutAut,
} from '../../srcCommon/types'
import {
  TelemetryPackRawDUT,
  TelemetryPackRawDutAut,
} from '../../srcCommon/types/devicesMessages'
import { setDevRT } from '../../srcCommon/iotMessages/devsCommands'
import configfile from '../../configfile'
import sqldb from '../../srcCommon/db'
// import { ecoStateExpected } from '../realTime/ecoMode'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import { logger } from '../../srcCommon/helpers/logger'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import * as momentTimezone from 'moment-timezone';

export async function telemetryReceived (payload: TelemetryPackRawDUT|TelemetryPackRawDutAut, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;

  if (((payload as TelemetryPackRawDUT).Temperature instanceof Array) || (payload as TelemetryPackRawDUT).eCO2 instanceof Array) {
    telemetryReceived_DUT(payload as TelemetryPackRawDUT, devId, payloadShiftedTs);
  }

  if ((payload as TelemetryPackRawDutAut).Mode) {
    telemetryReceived_DUT_AUT(payload as TelemetryPackRawDutAut, devId, payloadShiftedTs);
  }
}

async function telemetryReceived_DUT (payload: TelemetryPackRawDUT, devId: string, payloadShiftedTs: Date) {
  const subscrUsers = (webSocketServer.wss && webSocketServer.wss.clients && getAllowedUsers(webSocketServer.wss.clients, devId)) || [];

  const co2Tel = (payload.eCO2 instanceof Array);
  const tempTel = (payload.Temperature instanceof Array);
  const temp1Tel = (payload.Temperature_1 instanceof Array);

  const telLen = (tempTel && payload.Temperature.length) || (co2Tel && payload.eCO2.length) || (temp1Tel && payload.Temperature_1.length);
  let vars = ''

  if (payload.Temperature || payload.Temperature_1) {vars += 'T'} 
  if (payload.Humidity) {vars += 'H'}
  if (payload.eCO2) {vars += 'D'} //dioxide
  if (payload.TVOC) {vars += 'O'} //organic

  let dut = ramCaches.DUTS.tryGetDutRoomPars(devId);

  if (vars.length > 0 && dut && vars !== dut.vars) {
    logger.info(`DUT ${devId} has stored vars ${dut.vars}, received telemetry with vars ${vars}!`)
    dut.vars = vars
    Promise.resolve().then(async () => {
      const dutDevice = await sqldb.DUTS_DEVICES.getDutsDevicesInfo({ DEVICE_CODE: devId });
      if (dutDevice) {
        await sqldb.DUTS_DEVICES.w_updateInfo({
          ID : dutDevice[0].DUT_DEVICE_ID,
          VARS : vars,
        }, '[SYSTEM]')
      } 
    }).catch(logger.error)
  }

  const applyOffset = ['DUT307211292', 'DUT307211281', 'DUT307211256'].includes(devId); // TODO: remover. Colocado em 2021-11-04.
  const samplingTime = (payload.samplingTime && Number(payload.samplingTime)) || 5; // de quantos em quantos segundos o firmware lê os sensores e insere nos vetores.
  // Log temporário
  if (['DUT311222598', 'DUT308221659'].includes(devId)) {
    logger.info(`[LOG ECOMODE DUT DAM] devId: ${devId},
      samplingTime: ${samplingTime}
      telLen: ${telLen}
    `);
  }
  for (let i = 0; i < telLen; i++) {
    const remainingSteps = telLen - 1 - i;
    let timestampTelemetryFormated;
    let dateTimestampTelemetry;
    if (payloadShiftedTs) {
      const ith_timestampD = momentTimezone(payloadShiftedTs);
      ith_timestampD.subtract(remainingSteps * samplingTime, 'seconds');
      timestampTelemetryFormated = ith_timestampD.format('YYYY-MM-DD HH:mm:ss');
      dateTimestampTelemetry = new Date(timestampTelemetryFormated);
    }
    if (applyOffset && tempTel && payload.Temperature[i] != null) payload.Temperature[i] -= 2.5;
    const telemetry: TelemetryDUT = {
      dev_id: devId,
      Temperature: payload.Temperature && payload.Temperature[i],
      Temperature_1: payload.Temperature_1 && payload.Temperature_1[i],
      operation_mode: payload.operation_mode,
      Humidity: payload.Humidity && payload.Humidity[i],
      eCO2: payload.eCO2 && payload.eCO2[i],
      TVOC: payload.TVOC && payload.TVOC[i],
      GMT: payload.GMT && payload.GMT,
      raw_eCO2: payload.raw_eCO2 && payload.raw_eCO2[i],
      Tmp: payload.Tmp && payload.Tmp[i],
      status: lastMessages.getStatus(devId),
      timestamp: timestampTelemetryFormated,
    };

    try {
      await dutStats.updateStatistics(devId, telemetry, dateTimestampTelemetry);
    } catch (err) {
      logger.error(err)
    }

    if (subscrUsers.length > 0) {
      const lastRssiMsg = tryGetDevSysDebug(devId);
      const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;

      const dutTelemetry = { ...telemetry, RSSI };
      for (const ws of subscrUsers) {
        ws.send(JSON.stringify({ type: 'dutTelemetry', data: dutTelemetry }))
      }
    }
  }

  if (configfile.isProductionServer && subscrUsers.length === 0 && telLen === 1) {
    let devRT = devsRTstatus[devId];
    if (!devRT) {
      devsRTstatus[devId] = { lastRT0: 0, lastTelmTS: 0 };
      devRT = devsRTstatus[devId];
    }
    if (devRT.lastRT0 > (Date.now() - 30 * 1000)) { } // Ignore
    else {
      devRT.lastRT0 = Date.now();
      setDevRT(devId, false, '[SYSTEM]')
    }
    devRT.lastTelmTS = Date.now();
  }
}

const devsRTstatus: {
  [devId: string]: {
    lastTelmTS: number, // timestamp da última telemetria para identificar modo RT pelo tempo entre telemetrias. Ainda não está sendo usado.
    lastRT0: number, // timestamp da última vez que enviou um comando "RT: 0" para evitar ficar enviando repetidamente.
  },
} = {};

function telemetryReceived_DUT_AUT (payload: TelemetryPackRawDutAut, devId: string, payloadShiftedTs: Date) {
  const subscrUsers = (webSocketServer.wss && webSocketServer.wss.clients && getAllowedUsers(webSocketServer.wss.clients, devId)) || [];

  const telemetry: TelemetryDutAut = Object.assign(
    dutData.processRawTelemetry_AUT(payload),
    {
      timestamp: payloadShiftedTs.toISOString().substr(0, 19),
      dev_id: devId,
      GMT: payload.GMT,
      status: lastMessages.getStatus(devId),
    }
  )
  // const expectedEcoState = ecoStateExpected(devId);
  // const ecoModeActing = (expectedEcoState && telemetry.State === expectedEcoState) || false;

  if (subscrUsers.length > 0) {
    const progState = dutSchedule.getCurrentProgState(devId, payloadShiftedTs) || undefined;
    // const infoUpdate = (lastTelemetry == null) || (lastTelemetry.Mode !== telemetry.Mode) || (lastTelemetry.State !== telemetry.State) || (lastTelemetry.ecoModeActing !== ecoModeActing)
    const lastRssiMsg = tryGetDevSysDebug(devId);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;

    const dutTelemetry = {
      ...telemetry,
      progState,
      // ecoModeActing,
      RSSI,
    };
    for (const ws of subscrUsers) {
      ws.send(JSON.stringify({ type: 'dutAutTelemetry', data: dutTelemetry }));
    }
  }

  iotMessageListener.dutAutTelemetryReceived(telemetry)
}

function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.realTimeDUTs && ws.realTimeDUTs.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}
function getAllowedUsers_AUT (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.subscrStat && ws.subscrStat.includes(devId)) { } // OK
    else continue

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('dutUnsubscribeRealTime', dutUnsubscribeRealTime)
async function dutUnsubscribeRealTime (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.realTimeDUTs = null
}

webSocketRouter.wSocketRoute('dutSubscribeRealTime', dutSubscribeRealTime)
async function dutSubscribeRealTime (session: SessionData, reqParams: {
  CLIENT_ID?: number
  CLIENT_IDS?: number[]
  DUT_ID?: string
  GROUP_ID?: number
  UNIT_ID?: number
}, ws: WebSocketClient) {
  ws.realTimeDUTs = null

  if (reqParams.CLIENT_ID) { reqParams.CLIENT_IDS = [reqParams.CLIENT_ID]; }
  delete reqParams.CLIENT_ID;

  let unitIds = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : undefined;

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.CLIENT_IDS) { reqParams.CLIENT_IDS = allowedClients; }
    reqParams.CLIENT_IDS = reqParams.CLIENT_IDS.filter(x => allowedClients.includes(x));
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  const qPars: Parameters<typeof sqldb.DUTS.refreshSelectedDevsInfo>[0] = {
    CLIENT_IDS: reqParams.CLIENT_IDS,
    UNIT_IDS: unitIds,
  }
  if (reqParams.DUT_ID) {
    qPars.DEV_ID = reqParams.DUT_ID;
  } else if (reqParams.UNIT_ID) {
    // qPars.UNIT_IDS = [reqParams.UNIT_ID];
  } else {
    // throw Error('Invalid subscription parameters!').HttpStatus(400)
  }

  const rows = await sqldb.DUTS.refreshSelectedDevsInfo(qPars)
  if (!rows.length) {
    logger.info('No DEVs found for filter', reqParams)
    return
  }
  ws.realTimeDUTs = rows.map(x => x.DEV_ID)

  for (const row of rows) {
    const dev = lastMessages.lastDutTelemetry(row.DEV_ID);
    const lastRssiMsg = tryGetDevSysDebug(row.DEV_ID);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    const dutTelemetry = {
      dev_id: row.DEV_ID,
      Temperature: dev.lastTelemetry?.Temperature,
      Temperature_1: dev.lastTelemetry?.Temperature_1,
      Humidity: dev.lastTelemetry?.Humidity,
      status: dev.status || 'OFFLINE',
      timestamp: dev.lastTelemetry?.timestamp,
      GMT: dev.lastTelemetry?.GMT,
      RSSI,
    }
    ws.send(JSON.stringify({ type: 'dutTelemetry', data: dutTelemetry }))

    const { lastTelemetry, status: statusAut } = lastMessages.lastDutAutTelemetry(row.DEV_ID) || {};
    if (statusAut) {
      // const expectedEcoState = ecoStateExpected(row.DEV_ID);
      const telemetry = {
        dev_id: row.DEV_ID,
        status: statusAut || 'OFFLINE',
        timestamp: lastTelemetry?.timestamp,
        Mode: lastTelemetry?.Mode,
        State: lastTelemetry?.State,
        GMT: dutTelemetry?.GMT,
        // ecoModeActing: expectedEcoState && lastTelemetry && lastTelemetry.State === expectedEcoState,
        RSSI,
      }
      ws.send(JSON.stringify({ type: 'dutAutTelemetry', data: telemetry }))
    }

    if (rows.length <= 100) {
      setDevRT(row.DEV_ID, true, session.user)
    }
  }
}

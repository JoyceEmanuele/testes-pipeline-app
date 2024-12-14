import * as WebSocket from 'ws'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import * as dacStats from '../realTime/dacStats'
import * as lastMessages from '../ramCaches/lastMessages'
import * as webSocketServer from '../apiServer/webSocketServer'
import * as damTelemetry from '../dam/damTelemetry'
import { setDevRT } from '../../srcCommon/iotMessages/devsCommands'
import {
  WebSocketClient,
  SessionData,
  TelemetryDAC,
  TelemetryPackDAC,
} from '../../srcCommon/types'
import servConfig from '../../configfile'
import sqldb from '../../srcCommon/db'
// import { ecoStateExpected } from '../realTime/ecoMode'
import { tryGetDevSysDebug } from '../ramCaches/devsSystemDebug'
import * as damNOp from '../realTime/damNOp';
import { logger } from '../../srcCommon/helpers/logger'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import * as ramCaches from '../ramCaches';
import * as momentTimezone from 'moment-timezone';

// RAM-CACHE
const lastDacLcmp: Map<string,0|1> = new Map();

export async function telemetryReceived (payload: TelemetryPackDAC, payloadShiftedTs: Date): Promise<void> {
  const devId = payload.dev_id;
  const { hwCfg, GROUP_ID } = ramCaches.DEVACS.tryGetDacInfo(devId) || {
    GROUP_ID: null as number,
    hwCfg: {
      hasAutomation: false,
    },
  };

  let subscrUsers: WebSocketClient[] = []
  if (webSocketServer.wss && webSocketServer.wss.clients) {
    subscrUsers = getAllowedUsers(webSocketServer.wss.clients, devId)
  }

  const samplingTime = (payload.samplingTime && Number(payload.samplingTime)) || 1; // de quantos em quantos segundos o firmware lê os sensores e insere nos vetores.
  for (let i = 0; i < payload.Lcmp.length; i++) {
    const remainingSteps = payload.Lcmp.length - 1 - i;
    let dateTimestampTelemetry;
    let timestampTelemetryFormated;

    if (payloadShiftedTs) {
      const ith_timestampD = momentTimezone(payloadShiftedTs);
      ith_timestampD.subtract(remainingSteps * samplingTime, 'seconds');
      timestampTelemetryFormated = ith_timestampD.format('YYYY-MM-DD HH:mm:ss');
      dateTimestampTelemetry = new Date(timestampTelemetryFormated);
    }

    const telemetry: TelemetryDAC = {
      dac_id: devId,
      Tamb: payload.Tamb && payload.Tamb[i],
      Tsuc: payload.Tsuc && payload.Tsuc[i],
      Tliq: payload.Tliq && payload.Tliq[i],
      Psuc: payload.Psuc && payload.Psuc[i],
      Pliq: payload.Pliq && payload.Pliq[i],
      Levp: payload.Levp && payload.Levp[i],
      Lcmp: payload.Lcmp && payload.Lcmp[i],
      Lcut: payload.Lcut && payload.Lcut[i],
      status: lastMessages.getStatus(devId),
      Tsc: payload.Tsc && payload.Tsc[i],
      Tsh: payload.Tsh && payload.Tsh[i],
      P0raw: payload.P0 && payload.P0[i],
      P1raw: payload.P1 && payload.P1[i],
      timestamp: timestampTelemetryFormated,
      GMT: payload?.GMT != null && payload.GMT,
    };

    const LcmpSwitched = lastDacLcmp.get(devId) !== telemetry.Lcmp;
    if (LcmpSwitched) lastDacLcmp.set(devId, telemetry.Lcmp);

    try {
      dacStats.updateStatistics(devId, telemetry, dateTimestampTelemetry)
    } catch (err) {
      logger.error(err)
    }

    try {
      damNOp.damNaoOperante(telemetry.Lcmp, dateTimestampTelemetry, GROUP_ID);
    } catch (err) {
      logger.error(err)
    }

    if (subscrUsers.length > 0) {
      const lastRssiMsg = tryGetDevSysDebug(devId);
      const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
      let telemetryData = (RSSI ? { ...telemetry, RSSI } : telemetry);

      for (const ws of subscrUsers) {
        if (ws.subscrTelm && ws.subscrTelm.includes(devId)) {
          ws.send(JSON.stringify({ type: 'dacTelemetry', data: telemetryData }))
        } else if (LcmpSwitched && ws.subscrStat && ws.subscrStat.includes(devId)) {
          const statusData = { dac_id: telemetry.dac_id, Lcmp: telemetry.Lcmp, status: telemetry.status, RSSI }
          ws.send(JSON.stringify({ type: 'dacOnlineStatus', data: statusData }))
        }
      }
    }
  }

  if (servConfig.isProductionServer && subscrUsers.length === 0 && payload.Lcmp.length === 1) {
    let devRT = devsRTstatus[devId];
    if (!devRT) {
      devsRTstatus[devId] = { lastRT0: 0, lastTelmTS: 0 };
      devRT = devsRTstatus[devId];
    }
    if (devRT.lastRT0 > (Date.now() - 30 * 1000)) { } // Ignore
    else {
      devRT.lastRT0 = Date.now();
      setDevRT(devId, false, '[SYSTEM]');
    }
    devRT.lastTelmTS = Date.now();
  }

  if (payload.Mode && payload.State && hwCfg && hwCfg.hasAutomation) {
    await damTelemetry.telemetryReceived(payload, payloadShiftedTs)
  }
}

const devsRTstatus: {
  [devId: string]: {
    lastTelmTS: number, // timestamp da última telemetria para identificar modo RT pelo tempo entre telemetrias. Ainda não está sendo usado.
    lastRT0: number, // timestamp da última vez que enviou um comando "RT: 0" para evitar ficar enviando repetidamente.
  },
} = {};

function getAllowedUsers (wssClients: Set<WebSocketClient>, devId: string) {
  const list = []
  for (const ws of wssClients) {
    if (!ws) continue
    if (ws.readyState !== WebSocket.OPEN) continue

    if ((!ws.subscrTelm || !ws.subscrTelm.includes(devId))
      && (!ws.subscrStat || !ws.subscrStat.includes(devId))) {
      continue;
    }

    list.push(ws)
  }
  return list
}

webSocketRouter.wSocketRoute('subscribeTelemetry', subscribeTelemetry)
async function subscribeTelemetry (session: SessionData, message: {
  dac_id: string
  group_id: number
  unit_id: number
  clientId: number
  clientIds: number[]
}, ws: WebSocketClient) {
  ws.subscrTelm = null

  if (message.clientId) { message.clientIds = [message.clientId]; }
  delete message.clientId;

  let unitIds = message.unit_id ? [message.unit_id] : undefined;

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!message.clientIds) { message.clientIds = allowedClients; }
    message.clientIds = message.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  let qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] = {
    clientIds: message.clientIds,
    unitIds,
  };
  if (message.dac_id) {
    qPars.DAC_ID = message.dac_id
  } else if (message.group_id) {
    qPars.MACHINE_ID = message.group_id
  } else if (message.unit_id) {
    // qPars.UNIT_ID = message.unit_id
  } else {
    // Just unsubscribe
    // throw Error('Invalid subscription parameters!').HttpStatus(400)
    logger.info('Telemetry unsubscribed for ' + session.user)
    return
  }

  const dacsList = await sqldb.DACS_DEVICES.getExtraInfoList(qPars, { addUnownedDevs: session.permissions.MANAGE_UNOWNED_DEVS });

  if (dacsList.length === 0) {
    logger.info('No DEVs found for filter', qPars)
    logger.info({ message, dacsList })
    return
  }
  ws.subscrTelm = dacsList.map(x => x.DAC_ID)

  for (const row of dacsList) {
    if (dacsList.length <= 100) {
      setDevRT(row.DAC_ID, true, session.user)
    }
    const lastComm = lastMessages.lastDacTelemetry(row.DAC_ID);
    if (!lastComm) continue;
    const fakeTelemetry = {
      dac_id: row.DAC_ID,
      timestamp: lastComm.lastTelemetry?.timestamp,
      status: lastComm.status,
      Lcmp: lastComm.lastTelemetry?.Lcmp,
      GMT: lastComm.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'dacOnlineStatus', data: fakeTelemetry }))
  }
}

const sendTelemetriesWithouDamId = async (ws: WebSocketClient, session: SessionData, qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] & Parameters<typeof sqldb.DAMS.getDamsBasicInfo>[0]) => {
  const rowsDacs = await sqldb.DACS_DEVICES.getExtraInfoList(qPars, { addUnownedDevs: false });
  const dacsList = rowsDacs.map(dac => dac.DAC_ID)
  for (const row of rowsDacs) {
    if (rowsDacs.length <= 100) {
      setDevRT(row.DAC_ID, true, session.user)
    }
    const lastComm = lastMessages.lastDacTelemetry(row.DAC_ID);
    const lastRssiMsg = tryGetDevSysDebug(row.DAC_ID);
    const RSSI = lastRssiMsg?.AP_CON_RSSI ?? lastRssiMsg?.WIFI_STA_RSSI ?? undefined;
    if (!lastComm) continue;
    const fakeTelemetry = {
      dac_id: row.DAC_ID,
      timestamp: lastComm.lastTelemetry?.timestamp,
      status: lastComm.status,
      Lcmp: lastComm.lastTelemetry?.Lcmp,
      GMT: lastComm.lastTelemetry?.GMT,
      RSSI,
    }
    ws.send(JSON.stringify({ type: 'dacOnlineStatus', data: fakeTelemetry }))
  }

  return dacsList;
}

const sendDutsTelemetry = async (ws: WebSocketClient, qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] & Parameters<typeof sqldb.DAMS.getDamsBasicInfo>[0]) => {
  const rowDuts = await sqldb.DUTS.getListBasic(qPars, { includeTempLimits: false });
  for (const row of rowDuts) {
    const lastComm = lastMessages.lastDutTelemetry(row.DEV_ID);
    if (!lastComm) continue;
    const emptyTelemetry = {
      dev_id: row.DEV_ID,
      status: lastMessages.getStatus(row.DEV_ID),
      timestamp: lastComm.lastTelemetry?.timestamp,
      Temperature: (lastComm.lastTelemetry ? lastComm.lastTelemetry.Temperature : null),
      Temperature_1: (lastComm.lastTelemetry ? lastComm.lastTelemetry.Temperature_1 : null),
      GMT: lastComm.lastTelemetry?.GMT,
    }
    ws.send(JSON.stringify({ type: 'dutStatus', data: emptyTelemetry }))
  }
};

const sendTelemetriesWithouDacId = async (ws: WebSocketClient, session: SessionData, qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] & Parameters<typeof sqldb.DAMS.getDamsBasicInfo>[0],  message: {
  dac_id: string
  dam_id: string
  group_id: number
  unit_id: number
  clientId: number
  clientIds: number[]
}) => {
  const rowsDams = await sqldb.DAMS.getDamsBasicInfo(qPars)
  const damsList = rowsDams.map(dam => dam.DAM_ID)
  for (const row of rowsDams) {
    const lastComm = lastMessages.lastDamTelemetry(row.DAM_ID);
    const lastRssiMsg = tryGetDevSysDebug(row.DAM_ID);
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    if (!lastComm) continue;
    // const expectedEcoState = ecoStateExpected(row.DAM_ID);
    const emptyTelemetry = {
      dev_id: row.DAM_ID,
      status: lastMessages.getStatus(row.DAM_ID),
      timestamp: lastComm.lastTelemetry?.timestamp,
      deviceTimestamp: lastComm.lastTelemetry?.timestamp,
      GMT: lastComm.lastTelemetry?.GMT,
      Mode: (lastComm.lastTelemetry ? lastComm.lastTelemetry.Mode : null),
      State: (lastComm.lastTelemetry ? lastComm.lastTelemetry.State : null),
      // ecoModeActing: expectedEcoState && lastComm.lastTelemetry && lastComm.lastTelemetry.State === expectedEcoState,
      Temperature: (lastComm.lastTelemetry ? lastComm.lastTelemetry.Temperature : null),
      Temperature_1: (lastComm.lastTelemetry ? lastComm.lastTelemetry.Temperature_1 : null),
      RSSI,
    }
    ws.send(JSON.stringify({ type: 'damStatus', data: emptyTelemetry }))
  }

  if (message.unit_id) {
    sendDutsTelemetry(ws, qPars);
  }

  return damsList;
};

const sendSubscribeStatus = async (ws: WebSocketClient, session: SessionData, qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] & Parameters<typeof sqldb.DAMS.getDamsBasicInfo>[0], message: {
  dac_id: string
  dam_id: string
  group_id: number
  unit_id: number
  clientId: number
  clientIds: number[]
}) => {
  let dacsList: string[] = [];
  if (!qPars.DAM_ID) {
    dacsList = await sendTelemetriesWithouDamId(ws, session, qPars);
  }

  let damsList: string[] = [];
  if (!qPars.DAC_ID) {
    damsList = await sendTelemetriesWithouDacId(ws, session, qPars, message);
  }

  ws.subscrStat = [...dacsList, ...damsList]
}

webSocketRouter.wSocketRoute('subscribeStatus', subscribeStatus)
async function subscribeStatus (session: SessionData, message: {
  dac_id: string
  dam_id: string
  group_id: number
  unit_id: number
  clientId: number
  clientIds: number[]
}, ws: WebSocketClient) {
  ws.subscrStat = null

  if (message.clientId) { message.clientIds = [message.clientId]; }
  delete message.clientId;

  let unitIds = message.unit_id ? [message.unit_id] : undefined;

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!message.clientIds) { message.clientIds = allowedClients; }
    message.clientIds = message.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !unitIds) { unitIds = allowedUnits; }
    if (allowedUnits) unitIds = unitIds.filter(x => allowedUnits.includes(x));
  }

  const qPars: Parameters<typeof sqldb.DACS_DEVICES.getExtraInfoList>[0] & Parameters<typeof sqldb.DAMS.getDamsBasicInfo>[0] = {
    clientIds: message.clientIds,
    unitIds,
  };
  if (message.dac_id) {
    qPars.DAC_ID = message.dac_id
  } else if (message.dam_id) {
    qPars.DAM_ID = message.dam_id
   } else if (message.group_id) {
    qPars.MACHINE_ID = message.group_id
  } else if (message.unit_id) {
    qPars.UNIT_ID = message.unit_id
  }
  
  await sendSubscribeStatus(ws, session, qPars, message);
}

webSocketRouter.wSocketRoute('unsubscribeStatus', unsubscribeStatus)
async function unsubscribeStatus (session: SessionData, _message: {[k:string]:any}, ws: WebSocketClient) {
  ws.subscrStat = null
}

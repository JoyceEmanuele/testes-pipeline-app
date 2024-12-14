import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import * as lastMessages from '../ramCaches/lastMessages';
import * as webSocketServer from '../apiServer/webSocketServer';
import { parseDriVarsCfg } from '../../srcCommon/dri/driInfo'
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands';
import sqldb from '../../srcCommon/db';
import { setDevRT } from '../../srcCommon/iotMessages/devsCommands';
import * as WebSocket from 'ws';

/** Função que envia mensagem de { rt: 1 } para manter em modo tempo-real os dispositivos que estão sendo monitorados */
export function devsRealTime () {
  if (webSocketServer.wss && webSocketServer.wss.clients) {
    const enviados = new Set();
    for (const ws of webSocketServer.wss.clients) {
      if (!ws) continue
      if (ws.readyState !== WebSocket.OPEN) continue

      if (ws.subscrTelm && ws.subscrTelm.length <= 100) {
        for (const devId of ws.subscrTelm) {
          if (!(devId.startsWith('DAC') || devId.startsWith('DUT'))) { continue; }
          if (enviados.has(devId)) continue;
          enviados.add(devId);
          setDevRT(devId, true, '[SYSTEM]');
        }
      }

      if (ws.subscrStat && ws.subscrStat.length <= 100) {
        for (const devId of ws.subscrStat) {
          if (!(devId.startsWith('DAC') || devId.startsWith('DUT'))) { continue; }
          if (enviados.has(devId)) continue;
          enviados.add(devId);
          setDevRT(devId, true, '[SYSTEM]');
        }
      }
    }
  }
}

export function startService() {
    recurrentTasks.runLoop({
        taskName: "CHECK-REAL-TIME",
        iterationPause_ms: 20 * 60 * 1000,
        initialDelay_ms: 4 * 60 * 1000,
    }, checkRealTimeDRI)
}

export async function checkRealTimeDRI() {
    const devsInRealTime = lastMessages.getDrisInRealTime();
    if (devsInRealTime.length) {
        for (const dev of devsInRealTime) {
            const statusDev = lastMessages.getStatus(dev.devId);
            if (statusDev !== 'ONLINE') continue;

            const usersList = webSocketServer.getSubscribedUsers(dev.devId)
            if (!usersList.length) {
                await sendDriInterval(dev.devId);
            }
        }
    }
}

async function sendDriInterval(driId: string) {
    const driInfo = await sqldb.DRIS.getBasicInfo({ driId });
    const driCfg = parseDriVarsCfg(driInfo.VARSCFG);
    const intervalConfig = driCfg.driConfigs?.find(config => config.protocol === 'interval');
    if (intervalConfig) {
        devsCommands.sendDriVarConfig(driId, JSON.stringify(intervalConfig), '[SYSTEM]');
    }
}

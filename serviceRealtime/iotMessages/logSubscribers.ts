import * as webSocketServer from '../apiServer/webSocketServer'
import * as webSocketRouter from '../apiServer/webSocketRouter'
import * as WebSocket from 'ws'
import { SessionData, WebSocketClient } from "../../srcCommon/types";
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import { logger } from '../../srcCommon/helpers/logger';

let thereIsDevLogSubscriber = false;

const logSubscribers = {
  // log_dev_cmd (devId: string, topic: string, payload: any, userId: string) {
  //   const entry = {
  //     devId,
  //     ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 23),
  //     topic,
  //     payload,
  //     userId,
  //   };
  //   if (thereIsDevLogSubscriber) publishLogEntry(devId, 'log_dev_cmd', entry);
  //   // return putDynamoItem('log_dev_cmd', entry);
  //   // return Promise.resolve();
  // },
  log_dev_ctrl (devId: string, topic: string, payload: any) {
    const entry = {
      devId,
      ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 23),
      topic,
      payload,
    };
    if (thereIsDevLogSubscriber) {
      publishLogEntry(devId, 'log_dev_ctrl', entry)
        .catch((err) => logger.error('DBG 38', err));
    }
    // return putDynamoItem('log_dev_ctrl', entry);
    // return Promise.resolve();
  },
};

export default logSubscribers;

export async function publishLogEntry (devId: string, table: string, entry: {}) {
  if (!webSocketServer.wss) return;
  if (!webSocketServer.wss.clients) return;

  for (const ws of webSocketServer.wss.clients) {
    if (!ws) continue
    if (ws.readyState !== WebSocket.OPEN) continue

    if (ws.subscrDevLog && ws.subscrDevLog.includes(devId)) { } // OK
    else continue

    ws.send(JSON.stringify({ type: 'logEntry', data: { table, entry } }));
  }
}

webSocketRouter.wSocketRoute('subscribeDevLog', subscribeDevLog)
async function subscribeDevLog (session: SessionData, reqParams: { devId: string }, ws: WebSocketClient) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllDevsLogs) return;
  ws.subscrDevLog = reqParams.devId || null;
  thereIsDevLogSubscriber = !!ws.subscrDevLog;
}

webSocketRouter.wSocketRoute('unsubscribeDevLog', unsubscribeDevLog)
async function unsubscribeDevLog (session: SessionData, message: {[k:string]:any}, ws: WebSocketClient) {
  ws.subscrDevLog = null
  thereIsDevLogSubscriber = Array.from(webSocketServer.wss.clients).some(ws => !!ws.subscrDevLog);
}

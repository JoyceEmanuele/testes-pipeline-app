import * as WebSocket from 'ws'
import * as webSocketServer from './apiServer/webSocketServer'
import * as webSocketRouter from './apiServer/webSocketRouter'
import { SessionData, WebSocketClient } from '../srcCommon/types'
import { logger } from '../srcCommon/helpers/logger'
import { getUserGlobalPermissions } from '../srcCommon/helpers/permissionControl'
import { API_External } from './httpApiRouter'
import * as ramCaches from './ramCaches'
// import * as ecoMode from './realTime/ecoMode'
// import * as coolAutomation from './integrations/coolAutomation'
import * as devsCommands from '../srcCommon/iotMessages/devsCommands'
// import * as ecoModeTools from './realTime/ecoModeTools'
// import * as serversStatus from './realTime/serversStatus'

let iotMonitoring = false

export function iotMessageReceived (topic: string, payload: string) {
  if (!iotMonitoring) return

  let foundWatcher = false
  for (const ws of webSocketServer.wss.clients) {
    if (!ws) continue
    if (ws.readyState !== WebSocket.OPEN) continue
    if (!ws.subscrDevMessages) continue
    foundWatcher = true
    if (payload.includes(ws.subscrDevMessages)) {
      ws.send(JSON.stringify({ type: 'iotMessage', data: { topic, payload } }))
    }
  }
  if (!foundWatcher) {
    logger.info('Disabling iotMonitoring')
    iotMonitoring = false
  }
}

webSocketRouter.wSocketRoute('monitorDevMessages', monitorDevMessages)
async function monitorDevMessages (session: SessionData, reqParams: { devId: string }, ws: WebSocketClient) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllDevsLogs) return;
  ws.subscrDevMessages = reqParams.devId;
  if (ws.subscrDevMessages) {
    iotMonitoring = true;
    logger.info('Enabling iotMonitoring for', ws.subscrDevMessages);
  }
}

export const publish_dev_cmd: API_External['/realtime/devtools/publish_dev_cmd'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);

  if (!reqParams.devId) throw Error('Faltou "devId"').HttpStatus(400);
  if (!reqParams.payload) throw Error('Faltou "payload"').HttpStatus(400);
  if (typeof reqParams.payload !== 'object') throw Error('"payload" inválido').HttpStatus(400);
  if (!/^[A-Z0-9-]+$/.test(reqParams.devId)) throw Error('"devId" inválido').HttpStatus(400);
  // Aqui estou usando "sendOtaCommand" passando o parâmetro como "any" como forma de acessar o "sendDevCommand" que não é público.
  devsCommands.sendOtaCommand(reqParams.devId, reqParams.payload as any, session.user);
  return 'DONE';
}

export const get_uNotifs: API_External['/realtime/devtools/get_uNotifs'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  return ramCaches.NOTIFSCFG.debugUNotifs();
}

export const buildCoolAutNotifs: API_External['/realtime/devtools/buildCoolAutNotifs'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  throw Error('Não implementado!').HttpStatus(501);
  // return JSON.stringify(await coolAutomation.buildCoolAutNotifs());
}

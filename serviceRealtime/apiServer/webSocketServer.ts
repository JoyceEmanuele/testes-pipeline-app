import { Server as WebSocketServerLib } from 'ws'
import * as https from 'https'
import * as http from 'http'
import * as net from 'net'
import * as url from 'url'
import * as webSocketRouter from './webSocketRouter'
import { WebSocketClient } from '../../srcCommon/types'
import { verifyClient_classicLogin } from '../../srcCommon/helpers/auth'
import { logger } from '../../srcCommon/helpers/logger';
import * as WebSocket from 'ws'

class WebSocketServer extends WebSocketServerLib<typeof WebSocketClient> {
  clients: Set<WebSocketClient>
}

function configureWebSocketServer (onMessage: (ws: WebSocketClient, message: any) => void) {
  // const newwss = new WebSocket.Server({ port: servConfig.httpServer.port, login.verifyClient })
  // const newwss = new WebSocket.Server({ server: httpsServer })
  const newwss: WebSocketServer = new WebSocketServer({ noServer: true });

  newwss.on('close', function (ws: WebSocketClient) {
    logger.info(`wsserv:close: ${ws}`);
  })

  newwss.on('error', function (err: any) {
    logger.info(`wsserv:error: ${err}`);
  })

  newwss.on('headers', function (headers: any, req: http.IncomingMessage) {
    logger.info(`wsserv:headers: ${headers}`);
  })

  newwss.on('listening', function (ws: WebSocketClient) {
    logger.info(`wsserv:listening ${ws}`);
  })

  newwss.on('connection', function (ws: WebSocketClient, req: http.IncomingMessage) {
    newClientConnection(ws, req, onMessage);
  })

  setInterval(() => {
    newwss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping(() => {
        // empty
      });
    })
  }, 30000);

  return newwss;
}

function newClientConnection (ws: WebSocketClient, _req: http.IncomingMessage, onMessage: (ws: WebSocketClient, message: any) => void) {
  logger.info('wsserv:connection');
  ws.isAlive = true;

  ws.on('pong', (data) => {
    ws.isAlive = true;
  })

  ws.on('message', function (message) {
    try {
      onMessage(ws, message);
    } catch (err) {
      logger.error(err);
    }
  })

  ws.on('close', function (code, reason) {
    logger.info(`wscli:close - code:${code} - reason:${reason && reason.toString()}`)
  })

  ws.on('error', function (error) {
    logger.info(`wscli:error - ${error}`)
  })

  ws.on('unexpected-response', function (request, response) {
    logger.info(`wscli:unexpected-response - request:${request.path} - message:${response.statusMessage}`)
  })
}

let wssFrontUsers: WebSocketServer = null;
// let wssBackendServices: WebSocketServer = null;
export {
  wssFrontUsers as wss,
  // wssBackendServices,
};

export function attatchWss (server: https.Server|http.Server) {
  if (!wssFrontUsers) {
    wssFrontUsers = configureWebSocketServer(webSocketRouter.frontendMessageReceived);
  }
  // wssBackendServices = configureWebSocketServer(onServiceMessage);

  async function httpToWebsocket (req: http.IncomingMessage, socket: net.Socket, head: Buffer) {
    try {
      const { pathname, query } = url.parse(req.url, true);
      logger.info(`httpToWebsocket - Path: ${pathname} - Query ${JSON.stringify(query)}`);
      
      /*if (pathname === '/subscribe/devs-hw-config') {
        // req.socket: { remoteAddress, remotePort, localAddress, localPort }
        if (req.socket.remoteAddress !== '127.0.0.1') {
          socket.destroy();
          return;
        }

        wssBackendServices.handleUpgrade(req, socket, head, (ws) => {
          ws.session = null;
          ws.wsEndpoint = pathname;
          wssBackendServices.emit('connection', ws, req);
          try {
            onServiceConnected(ws);
          } catch (err) { logger.error(err); }
        });
      }
      else {
        // wssFrontUsers
      }*/
      const session = await verifyClient_classicLogin(query);
      if (!session) {
        socket.destroy();
        return;
      }
      wssFrontUsers.handleUpgrade(req, socket, head, (ws) => {
        ws.session = session;
        /*ws.wsEndpoint = pathname;*/
        wssFrontUsers.emit('connection', ws, req);
      });
    } catch (err) {
      logger.error(err);
      socket.destroy();
    }
  }

  server.on('upgrade', httpToWebsocket);
}

function onServiceConnected (ws: WebSocketClient) {
  logger.info('onServiceConnected', ws.url);
}

function onServiceMessage (_ws: WebSocketClient, message: any) {
  message = JSON.parse(message);
  logger.info('onServiceWsMessage', JSON.stringify(message));
}

export function getSubscribedUsers (devId: string) {
  const wssClients: Set<WebSocketClient> = wssFrontUsers?.clients;
  const list = [];

  for (const ws of (wssClients || [])) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    if (
      ws.subscrStat?.includes(devId)
      || ws.realTimeDUTs?.includes(devId)
      || ws.realTimeDMTs?.includes(devId)
      || ws.realTimeDRIs?.includes(devId)
      || ws.realTimeDALs?.includes(devId)
      || ws.subscrTelm?.includes(devId)
    ) {
      list.push(ws);
    }
    else continue;
  }

  return list;
}

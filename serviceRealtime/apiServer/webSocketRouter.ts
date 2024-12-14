import { SessionData, WebSocketClient } from '../../srcCommon/types'

import { logger } from '../../srcCommon/helpers/logger';

const webSocketHandlers: {[k:string]:(ws: WebSocketClient, message: any) => Promise<void>} = {}

export function wSocketRoute (routeName: string, callback: (session: SessionData, message: any, ws: WebSocketClient) => any, responseType?: string) {
  webSocketHandlers[routeName] = async function (ws: WebSocketClient, message: any) {
    let response = await callback((ws as any).session, message.data || message, ws)
    if (response && responseType) {
      if (responseType === 'alert' && (typeof response === 'string')) {
        response = { message: response }
      }
      if (responseType === response) {
        response = { }
      }
      response = { type: responseType, ...response }
      response.type = responseType
      ws.send(JSON.stringify(response))
    }
  }
}

export function frontendMessageReceived (ws: WebSocketClient, message: any) {
  Promise.resolve().then(async () => {
    message = JSON.parse(message)
    if (message.type !== 'virtualTelemetry') {
      logger.info(`onWsMessage - ${message.type} - ${JSON.stringify(message)}`)
    }
    if (webSocketHandlers[message.type]) {
      await webSocketHandlers[message.type](ws, message)
    }
  })
  .catch((err) => {
    logger.error(`frontendMessageReceived:error ${err} - ${ws.session}`)
    if (err && err.Status) ws.send(JSON.stringify({ type: 'alert', message: String(err) }))
    else ws.send(JSON.stringify({ type: 'alert', message: `There was an error!\n${String(err)}` }))
  })
}

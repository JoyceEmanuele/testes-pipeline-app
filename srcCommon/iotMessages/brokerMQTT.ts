import * as mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { logger } from '../helpers/logger';
import * as eventWarn from '../helpers/eventWarn';
import * as topicRouter from './topicRouter';

let iotBroker: {
  readOnly: boolean,
  client: MqttClient,
} = null;

export function publish(topic: string, payload: string) {
  try {
    if (!iotBroker) {
      throw Error("Error: iotrelay socket is disconnected for sending packets");
    }
    if (iotBroker.readOnly) {
      // if (topic.startsWith('commands/sync/')) {
      //   return;
      // }
      if (payload.length > 150) { payload = payload.substring(0, 150) + '...'; }
      logger.info('NÃO publicando:', topic, payload);
      // logger.info(`NÃO publicando: ${topic} - Date: ${new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 23)} - Command ${JSON.stringify(payload)}`)
      return;
    }
    iotBroker.client.publish(topic, payload, { qos: 1 });
  } catch (err) { logger.error(err); }
}
export function publish_iotRelay_informDeviceChanges(dev_id: string) {
  publish('apiserver/hwcfg-change', JSON.stringify({ dev_id }));
}

interface IoTrelayServiceParams {
  // waitSecs: number, // tempo em segundos entre tentativas de conexão ao iotrelay (configfile.isTestServer ? 100 : 5)
  // host: string, // '127.0.0.1'  configfile.iotrelay.host
  // port: number, // 29546  configfile.iotrelay.port
  // readOnly: boolean, // = (!configfile.isProductionServer)
  // onIotMessageReceived: (meta: { topic?: string, msgtype?: string }, payload: string) => void,
  // onIotrelayConnect: (tcpClient: IoTRelayClient) => void,
  // onIotrelayDisconnect: (err?: any) => void,

  connectionString: string // 'mqtt://clustermqtt.lan.dielenergia.com:1883'
  username: string
  password: string
}

// export interface IoTRelayClient {
//   socket: TCPClient|null,
//   writePackage: (meta: { msgtype: 'get-db-update-token'|'set-devs-cfg' }, payload: string) => Promise<void>,
//   isConnected: () => boolean,
//   isReadOnly: () => boolean,
//   disconnect: () => void,
// }

export function connectService(configfile: IoTrelayServiceParams, readOnly: boolean) {
  // const waitSecs = configfile.isTestServer ? 100 : 5; // tempo em segundos entre tentativas de conexão ao broker
  const clientInstance = mqtt.connect(configfile.connectionString, {
    reconnectPeriod: 3000, // 3 seconds
    username: configfile.username,
    password: configfile.password,
  });
  clientInstance.subscribe('iotrelay/data/#');
  clientInstance.subscribe('iotrelay/control/#');
  clientInstance.on('message', (topic, payload, _packet) => {
    onIotMessageReceived(topic, payload.toString());
  });
  // clientInstance.on('connect', onIotrelayConnect);
  // clientInstance.on('disconnect', onIotrelayDisconnect);
  const mqttReadOnly = readOnly;
  iotBroker = { client: clientInstance, readOnly: mqttReadOnly };
}

function onIotMessageReceived(topic: string, payload: string) {
  try {
    if (topic.startsWith('iotrelay/')) {
      topic = topic.substring(9);
    }
    topicRouter.iotMessageReceived(topic, payload);
  } catch (err) { logger.error(err) }
}

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import configfileGlobal from "../configfile";
import { logger } from "../srcCommon/helpers/logger";
import * as brokerMQTT from "../srcCommon/iotMessages/brokerMQTT";
import * as topicRouter from '../srcCommon/iotMessages/topicRouter';
import * as iotMessageReceived from './iotMessages/iotMessageReceived';
import * as memoryMonitor from '../srcCommon/helpers/monitoring/memoryMonitor'
import * as dbRamCache from './ramCaches/dbRamCache';
import { initDriAutomation } from './dri/driAutomation';
import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import configfile, { serviceName } from "./configs";
import * as httpApiRouter from "./httpApiRouter";

async function main() {
  // Serviço que finaliza o processo se estiver consumindo muita memória RAM
  memoryMonitor.startMemoryMonitor(configfileGlobal.isTestServer);

  // Inicia as tarefas que rodam em segundo plano
  await dbRamCache.startService();
  initDriAutomation();

  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  await startHttpServer(
    `${serviceName}/internal`,
    httpApiRouter.createInternalApi(),
    configfile.httpPortListenInternalServices || null
  );

  // Abre a conexão para começar a receber as telemetrias dos dispositivos
  logger.info('Conectando ao broker MQTT...');
  brokerMQTT.connectService(configfileGlobal.mqttBroker, !configfileGlobal.isProductionServer);
  topicRouter.setEventsCallbacks(iotMessageReceived.rtcb);
}

main().catch((err) => {
  logger.error("Finalizando o serviço por erro: " + err);
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

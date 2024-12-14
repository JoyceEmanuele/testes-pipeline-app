import { apmServiceTelegram } from './apmTelegram';
apmServiceTelegram.startElasticTelegram();

import * as http from "node:http";
import servconfig from "./configfile";
import * as httpServer from "./httpServer";
import * as tgClient from "./tgClient";
import { logger } from "../srcCommon/helpers/logger";
import { startHttpServer } from "../srcCommon/helpers/network/httpTools";

const serviceName = "telegram";

async function init () {
  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  await startHttpServer(`${serviceName}/internal`, httpServer.createInternalApi(), servconfig.telegramService.httpPort);

  await tgClient.start();
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 5000);
});

import { apmServiceInvoice } from './apmInvoice';
apmServiceInvoice.startElasticInvoice();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import configfile from "./configfile";
import * as _types from "../srcCommon/types";
import * as httpApiRouter from "./httpApiRouter";
import { logger } from "../srcCommon/helpers/logger";
import "./invoice";

const serviceName = "invoice";

async function init () {
  // Inicializa o servidor HTTP de requisições externas (usuários) com limite aumentado para requisições json para recebimento de faturas
  logger.info('Criando o servidor para recebimento de Faturas..');
  await startHttpServer(`${serviceName}/external`, httpApiRouter.createExternalApi(), configfile.httpPortListenExternalUsers);
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

import { apmServiceAuth } from './apmAuth';
apmServiceAuth.startElasticAuth();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import configfile from "./configfile";
import * as httpApiRouter from "./httpApiRouter";
import { logger } from "../srcCommon/helpers/logger";

const serviceName = "auth";

async function init () {
  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  await startHttpServer(`${serviceName}/internal`, httpApiRouter.createInternalApi(), configfile.httpPortListenInternalServices);
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});
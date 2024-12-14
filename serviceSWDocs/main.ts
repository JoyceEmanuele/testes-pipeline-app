import { apmServiceSWDocs } from './apmSWDocs';
apmServiceSWDocs.startElasticSWDocs();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import configfile from "./configfile";
import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import * as httpApiRouter from './httpApiRouter';
import { logger } from "../srcCommon/helpers/logger";

const serviceName = "swdocs";

async function init () {
  // Inicializa o servidor HTTP de requisições externas (usuários)
  await startHttpServer(`${serviceName}/external`, httpApiRouter.createExternalApi(), configfile.httpPortListenExternalUsers);
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

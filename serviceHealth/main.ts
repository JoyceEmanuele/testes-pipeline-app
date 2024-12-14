import { apmServiceHealth } from './apmHealth';
apmServiceHealth.startElasticHealth();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import configfile from "./configfile";
import * as _faultDetection from "./faultDetection";
import * as _dacRTchecks from "./dacRTchecks";
import * as dacHealth from "./dacHealth";
import * as httpApiRouter from "./httpApiRouter";
import * as msgInterService from "./extServices/msgInterService";
import { logger } from "../srcCommon/helpers/logger";

const serviceName = "health";

async function init () {
  dacHealth.startHealthDurationsService();
  msgInterService.startService();

  // Inicializa o servidor HTTP de requisições externas (usuários)
  await startHttpServer(`${serviceName}/external`, httpApiRouter.createExternalApi(), configfile.httpPortListenExternalUsers);

  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  await startHttpServer(`${serviceName}/internal`, httpApiRouter.createInternalApi(), configfile.httpPortListenInternalServices);
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

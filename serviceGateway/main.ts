(Error.prototype as any).HttpStatus = function (status: number) {
  this.Status = status;
  return this;
};
(Error.prototype as any).DebugInfo = function (info: any) {
  this.debugInfo = info;
  return this;
};
(Error.prototype as any).Details = function (
  status: number,
  pars: { errorCode: string; frontDebug?: any; debugInfo?: any }
) {
  return Object.assign(this, { Status: status }, pars || {});
};

import * as https from "node:https";
import * as fs from "node:fs";
import configfile from "./configfile";
import { onReqPort80 } from "./onReqPort80";
import { onReqPublicApiHttps } from "./onReqPublicApiHttps";
import { onReqInternalApi } from "./onReqInternalApi";
import { logger } from "../srcCommon/helpers/logger";
import { checkLocalCertificates } from "../srcCommon/helpers/network/checkTls";
import { startHttpServer, startHttpsServer } from '../srcCommon/helpers/network/httpTools';

main();
function main() {
  const disableTls = configfile.publicApiHttps.disableTls === true;
  checkLocalCertificates(
    disableTls,
    configfile.publicApiHttps.publicCert,
    configfile.publicApiHttps.clientsCaCert,
  );

  {
    const cfgPortPublic = process.argv.find((x) => x.startsWith('--port-public='));
    if (cfgPortPublic) {
      configfile.publicApiHttps.listenPort = Number(cfgPortPublic.split('=')[1]);
    }
    const cfgPortInternal = process.argv.find((x) => x.startsWith('--port-internal='));
    if (cfgPortInternal) {
      configfile.internalApi.listenPort = Number(cfgPortInternal.split('=')[1]);
    }
    const cfgPort80 = process.argv.find((x) => x.startsWith('--port-80='));
    if (cfgPort80) {
      configfile.publicHttp.listenPort = Number(cfgPort80.split('=')[1]);
    }
  }

  startListeners();
}

function startListeners() {
  // Port 80: LetsEncrypt/certbot, devices QR-codes
  startHttpServer("gateway/onReqPort80", onReqPort80, configfile.publicHttp.listenPort);

  // Used by microservices to communicate with each other
  startHttpServer("gateway/onReqInternalApi", onReqInternalApi, configfile.internalApi.listenPort);

  // Public (external) API
  if (configfile.publicApiHttps.disableTls) {
    // pure HTTP, no TLS
    startHttpServer("gateway/onReqPublicApiHttps (pure HTTP, no TLS)", onReqPublicApiHttps, configfile.publicApiHttps.listenPort);
  } else {
    // with TLS
    const options: https.ServerOptions = {
      cert: fs.readFileSync(configfile.publicApiHttps.publicCert),
      key: fs.readFileSync(configfile.publicApiHttps.privateKey),
    };
    if (configfile.publicApiHttps.clientsCaCert) {
      // https://letsencrypt.org/certs/isrgrootx1.pem.txt
      options.ca = fs.readFileSync(configfile.publicApiHttps.clientsCaCert);
      options.requestCert = true;
      options.rejectUnauthorized = false;
    }
    startHttpsServer("gateway/onReqPublicApiHttps", onReqPublicApiHttps, configfile.publicApiHttps.listenPort, options);
  }

  logger.info("Server Gateway is running");
}

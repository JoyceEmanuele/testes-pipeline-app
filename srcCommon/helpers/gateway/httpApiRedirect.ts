import * as tls from 'node:tls';
import * as http from 'node:http';
import * as express from 'express';
import { pipeRequest_withoutTls_v1, pipeRequest_withoutTls_v2 } from '../network/httpTools';
import { API_serviceHealth, API_serviceRealtime } from '../../types/api-private'
import * as dieldevVirtualServer from './dieldevVirtualServer';

type ConfigFile = {
  publicServices: {
    "api-async": { host: string, port: number },
    "health":    { host: string, port: number },
    "swdocs":    { host: string, port: number },
    "realtime":  { host: string, port: number },
  },
  dieldevDefaultLink: string
  dieldevLinks?: {
    [path: string]: string
  }
};

const routes_health: Set<keyof API_serviceHealth> = new Set([
  '/faults/get-fault-codes',
  '/dac/get-health-status',
  '/dac/save-health-info',
  '/dac/save-observation-info',
  '/dac/edit-observation-info',
  '/dac/detected-fault-confirmation',
  '/get-dacs-faults',
  '/dev/get-faults',
  '/export-dacs-faults',
  '/dac/falha-repentina-detectada-v2',
  '/dev/get-fr-list-updates',
  '/dev/get-fr-list-updates-v2',
  '/dac/get-health-hist',
  '/delete-dac-health-hist',
  '/dac/get-observation',
  '/delete-dac-observation',
  '/dac/get-installation-faults',
  '/dac/falha-instalacao-detectada',
  '/ignore-fault-check',
  '/dac/get-fr-history',
  '/dac/get-fault-descs',
  '/dac/enable-faults',
  '/dac/enable-faults-dac',
  '/dac/get-enable-faults-all',
  '/asset/get-health-status',
  '/asset/save-health-info',
  '/asset/get-health-hist',
  '/asset/delete-health-hist',
  '/asset/list-enabled-faults',
  '/asset/enable-faults',
  '/asset/save-observation-info',
  '/asset/edit-observation-info',
  '/asset/get-observation',
  '/asset/delete-observation',
]);

const routes_realtime: Set<keyof API_serviceRealtime> = new Set([
  '/dma/set-sampling-period',
  '/realtime/devtools/publish_dev_cmd',
  '/realtime/devtools/get_uNotifs',
  // '/realtime/devtools/get_damEcoMonitor',
  '/realtime/devtools/buildCoolAutNotifs',
  // '/realtime/devtools/debug_dam_ecomode',
]);

const getFwHeaders = (req: http.IncomingMessage, origHeaders: http.IncomingMessage["headers"], gwDataO: null|{
  tls?: {
    authorized: boolean
    cert: { valid_to: string, fingerprint: string }, // tls.PeerCertificate
  }
}) => {
  const fwHeaders: http.IncomingHttpHeaders = req.headers;
  if (origHeaders['origin']) fwHeaders['origin'] = origHeaders['origin'];
  if (origHeaders['host']) fwHeaders['host'] = origHeaders['host'];
  if (origHeaders['content-length']) fwHeaders['content-length'] = origHeaders['content-length'];
  if (origHeaders['content-type']) fwHeaders['content-type'] = origHeaders['content-type'];
  if (origHeaders['authorization']) fwHeaders['authorization'] = origHeaders['authorization'];
  if (origHeaders['connection']) fwHeaders['connection'] = origHeaders['connection'];
  if (origHeaders['upgrade']) fwHeaders['upgrade'] = origHeaders['upgrade'];
  if (gwDataO) fwHeaders['x-diel-gwdata'] = JSON.stringify(gwDataO);
  fwHeaders['x-forwarded-for'] = origHeaders['x-forwarded-for'] || String(req.socket.remoteAddress);

  return fwHeaders;
}

const handleDiffOtaRoutes = (req: http.IncomingMessage, gwDataO: null|{
  tls?: {
    authorized: boolean
    cert: { valid_to: string, fingerprint: string }, // tls.PeerCertificate
  }
}) => {
  const socket = req.socket as tls.TLSSocket;
  const authorized = socket.authorized;
  const cert = socket.getPeerCertificate && socket.getPeerCertificate();
  if (cert) delete cert.raw;
  gwDataO.tls = { authorized, cert };
}

const handleOtaRoutes = (req: http.IncomingMessage, origHeaders: http.IncomingMessage["headers"]) => {
  // Dados que o GW envia para o micro-serviço
  let gwDataO = null as null|{
    tls?: {
      authorized: boolean
      cert: { valid_to: string, fingerprint: string }, // tls.PeerCertificate
    }
  };
  if (req.url.startsWith('/ota')) {
    console.log('DBG-CERT-84', JSON.stringify(origHeaders));
    if (req.url.startsWith('/ota/') || req.url.startsWith('/ota-') || req.url === '/ota') {
      if (!gwDataO) gwDataO = {};
      if (origHeaders['x-ssl-client-sha1']) {
        // Hoje só existe 1 certificado sendo usado pelos dispositivos, certificado que expirou em 2021.
        // Temporariamente estamos usando o HAProxy até implementarmos kubernetes, então estou verificando só
        // o SHA1 do certificado. Depois que passar para kubernetes vemos como fazer esta validação.
        const authorizedSHA1s = ['D48328817C735F1A22BA0891535DF4CB1B544748', '12D3679E3583C4902CFD7A4B25BE0D54A8CF711B'];
        const sha1 = origHeaders['x-ssl-client-sha1'].toString().toUpperCase();
        const authorized = authorizedSHA1s.includes(sha1);
        let valid_to: string;
        if (origHeaders['x-ssl-client-notafter']) {
          valid_to = origHeaders['x-ssl-client-notafter'].toString();
          valid_to = `20${valid_to.substring(0, 2)}-${valid_to.substring(2, 4)}-${valid_to.substring(4, 6)}T${valid_to.substring(6, 8)}:${valid_to.substring(8, 10)}:${valid_to.substring(10)}`;
        }
        gwDataO.tls = { authorized, cert: { valid_to, fingerprint: sha1 } };
      } else {
        handleDiffOtaRoutes(req, gwDataO);
      }
    }
    console.log('DBG-CERT-84', JSON.stringify(gwDataO));
  }
  return gwDataO;
}

export async function onReqPublicApiHttps(req: http.IncomingMessage, res: http.ServerResponse, next: express.NextFunction, configfile: ConfigFile) {
  try {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-body-parts");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }

    if (req.headers['host'] === "dieldev.com") {
      const location = dieldevVirtualServer.convertLink(req, configfile);
      res.writeHead(302, { location });
      res.end();
      return;
    }

    const origHeaders = req.headers;

    // As rotas de OTA usam certificado do cliente
    const gwDataO = handleOtaRoutes(req, origHeaders);

    // Cabeçalhos que são passados para o micro-serviço
    const fwHeaders = getFwHeaders(req, origHeaders, gwDataO);

    req.headers = fwHeaders;

    let serviceInfo: { host: string, port: number } = null;

    if ((routes_health as Set<string>).has(req.url)) {
      serviceInfo = configfile.publicServices['health'];
    }

    if ((req.headers['host'] || '').startsWith('devdocs.')) {
      serviceInfo = configfile.publicServices['swdocs'];
    }

    const isWebsocket = !!req.headers.upgrade;
    if (isWebsocket) {
      serviceInfo = configfile.publicServices['realtime'];
    }
    if ((routes_realtime as Set<string>).has(req.url)) {
      serviceInfo = configfile.publicServices['realtime'];
    }

    if (serviceInfo) {
      const reqOpts: http.RequestOptions = {
        host: serviceInfo.host,
        port: serviceInfo.port,
        path: req.url,
        method: req.method,
        headers: fwHeaders,
      };

      if (isWebsocket) {
        pipeRequest_withoutTls_v2(req, res, reqOpts);
      } else {
        pipeRequest_withoutTls_v1(req, res, reqOpts);
      }
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

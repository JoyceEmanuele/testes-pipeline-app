import * as tls from 'node:tls';
import * as http from 'node:http';
import configfile from './configfile';
import { pipeRequest_withoutTls_v1, pipeRequest_withoutTls_v2 } from '../srcCommon/helpers/network/httpTools';
import { logger } from '../srcCommon/helpers/logger';
import * as dieldevVirtualServer from '../srcCommon/helpers/gateway/dieldevVirtualServer';

export async function onReqPublicApiHttps(req: http.IncomingMessage, res: http.ServerResponse) {
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

    // Dados que o GW envia para o micro-serviço
    let gwDataO = null as null|{
      tls?: {
        authorized: boolean
        cert: { valid_to: string, fingerprint: string }, // tls.PeerCertificate
      }
    };

    // As rotas de OTA usam certificado do cliente
    if (req.url.startsWith('/ota')) {
      console.log('DBG-CERT-84', JSON.stringify(origHeaders));
      if (req.url.startsWith('/ota/') || req.url.startsWith('/ota-') || req.url === '/ota') {
        // Tenho que enviar informações se o dispositivo enviou certificado de usuário
        // {
        //   "x-ssl-client-sha1":"D48328817C735F1A22BA0891535DF4CB1B544748",
        //   "x-ssl-client-verify":"10",
        //   "x-ssl-client-notafter":"210126151131Z",
        // }
        // {
        //   "x-ssl-client-sha1":"12D3679E3583C4902CFD7A4B25BE0D54A8CF711B",
        //   "x-ssl-client-verify":"21",
        //   "x-ssl-client-notafter":"300214143528Z",
        // }
        // {
        //   "x-ssl-client-sha1":"",
        //   "x-ssl-client-verify":"0",
        //   "x-ssl-client-notafter":"",
        // }
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
          const socket = req.socket as tls.TLSSocket;
          const authorized = socket.authorized;
          const cert = socket.getPeerCertificate && socket.getPeerCertificate();
          if (cert) delete cert.raw;
          gwDataO.tls = { authorized, cert };
        }
      }
      console.log('DBG-CERT-84', JSON.stringify(gwDataO));
    }

    // Cabeçalhos que são passados para o micro-serviço
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

    let serviceInfo: { host: string, port: number } = null;

    if ((req.headers['host'] || '').startsWith('devdocs.')) {
      serviceInfo = configfile.publicServices['swdocs'];
    }

    const isWebsocket = !!req.headers.upgrade;
    if (isWebsocket) {
      serviceInfo = configfile.publicServices['realtime'];
    }

    if (!serviceInfo) {
      serviceInfo = configfile.publicServices['api-async'];
    }

    if (!serviceInfo) {
      logger.error(`Unknown address for api-async`);
      res.statusCode = 500;
      res.end('No api-workers available');
      return;
    }

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
  } catch (err) {
    logger.error(err);
    res.statusCode = 500;
    res.end('Erro');
    return;
  }
}

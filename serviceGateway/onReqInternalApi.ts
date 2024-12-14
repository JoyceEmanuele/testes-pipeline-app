import * as http from 'node:http';
import { pipeRequest_withoutTls_v1, readBody } from '../srcCommon/helpers/network/httpTools';
import configfile from './configfile';
import { logger } from '../srcCommon/helpers/logger';
import { getReqClientIP, ipIsLAN } from '../srcCommon/helpers/network/ipTools';

export function onReqInternalApi(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    if (req.url === '/hello') { res.end('hello'); return; }

    // Só aceitar conexões internas
    const { clientIP } = getReqClientIP(req);
    if (!ipIsLAN(clientIP)) {
      logger.error(`ERRIP101: ${req.socket.remoteAddress} / ${req.headers['x-forwarded-for']}`);
      return;
    }

    let serviceInfo: { host: string, port: number } = Object.values(configfile.internalServices).find(
      (service) => req.url.startsWith(service?.prefix)
    );

    if (serviceInfo) {
      const reqOpts: http.RequestOptions = {
        host: serviceInfo.host,
        port: serviceInfo.port,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      pipeRequest_withoutTls_v1(req, res, reqOpts);
      return
    }

    logger.warn(`Não foi encontrado servidor para ${req.url}`);

    res.statusCode = 404;
    res.end('Service not found: ' + req.url);
  } catch (err) {
    logger.error(err);
    res.statusCode = 500;
    res.end('Erro');
  }
}

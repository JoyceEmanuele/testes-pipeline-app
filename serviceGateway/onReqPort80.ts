import * as http from 'node:http';
import configfile from './configfile';
import { pipeRequest_withoutTls_v1 } from '../srcCommon/helpers/network/httpTools';
import { logger } from '../srcCommon/helpers/logger';
import * as dieldevVirtualServer from '../srcCommon/helpers/gateway/dieldevVirtualServer';

export function onReqPort80(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    if (req.url.startsWith('/.well-known/')) {
      const reqOpts: http.RequestOptions = {
        host: configfile.publicHttp.certbotHost,
        port: configfile.publicHttp.certbotPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      pipeRequest_withoutTls_v1(req, res, reqOpts);
      return;
    }

    if (req.headers['host'] === "dieldev.com") {
      const location = dieldevVirtualServer.convertLink(req, configfile);
      res.writeHead(302, { location });
      res.end();
      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  } catch (err) {
    logger.error(err);
    res.statusCode = 500;
    res.end('Erro');
  }
}

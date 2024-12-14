import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import { logger } from '../logger';

export function pipeRequest_withoutTls_v2(reqClient2Gw: http.IncomingMessage, resGw2Client: http.ServerResponse, reqOpts: http.RequestOptions) {
  const httpRawHeader = `${reqOpts.method} ${reqOpts.path} HTTP/1.1\r\n`
    + Object.entries(reqClient2Gw.headers)
      .map(([name, content]) => `${name}: ${content}\r\n`)
      .join('')
    + '\r\n';

  const sockClient = reqClient2Gw.socket;
  const sockServer = net.connect({ host: reqOpts.host, port: reqOpts.port as number }, () => {
    sockServer.write(httpRawHeader);
    reqClient2Gw.on('data', (data) => { sockServer.write(data); })
    sockClient.on('data', (data) => { sockServer.write(data); })
    sockServer.on('data', (data) => { resGw2Client.socket.write(data); })
  });

  reqClient2Gw.on('error', (err) => {
    logger.error(err);
    try { sockServer.end(); } catch(err2) { logger.error(err2); }
    sockServer.destroy();
  });

  sockServer.on('error', (err) => {
    logger.error(err);
    try { resGw2Client.end(); } catch(err2) { logger.error(err2); }
    resGw2Client.destroy();
  });
}

export function pipeRequest_withoutTls_v1(reqClient2Gw: http.IncomingMessage, resGw2Client: http.ServerResponse, reqOpts: http.RequestOptions, preBody: Buffer = null) {
  const reqGw2Serv = http.request(reqOpts, (respServ2Gw) => {
    resGw2Client.writeHead(respServ2Gw.statusCode, respServ2Gw.headers);
    respServ2Gw.pipe(resGw2Client);
  });

  reqClient2Gw.on('error', (e) => {
    logger.error(`problem with request (${reqOpts.path}): ${e.message}`);
    reqGw2Serv.end();
    reqGw2Serv.destroy();
  });

  reqGw2Serv.on('error', (e) => {
    logger.error(`problem with request (${reqOpts.path}): ${e.message}`);
    resGw2Client.statusCode = 500;
    resGw2Client.end('Erro ao processar ' + reqOpts.path);
    resGw2Client.destroy();
  });

  if (preBody) reqGw2Serv.write(preBody);
  reqClient2Gw.pipe(reqGw2Serv);
}

export function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const bodyLen = Number(req.headers['content-length'] || '0');
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => { chunks.push(chunk); });
      req.on('error', (err) => { reject(err); });
      req.on('end', () => {
        const fullBody = Buffer.concat(chunks);
        if (fullBody.length !== bodyLen) {
          reject(Error('Inconsistent body length E67'));
          return;
        }
        resolve(fullBody);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function startHttpServer(serviceName: string, requestListener: http.RequestListener, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const server = http.createServer(requestListener);
      server.listen(port || 0, () => {
        const address = server.address() as net.AddressInfo;
        logger.info(`HTTP server (${serviceName}) started on port ${address.port}`);
        resolve(address.port);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function startHttpsServer(serviceName: string, requestListener: http.RequestListener, port: number, options: https.ServerOptions): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const server = https.createServer(options, requestListener);
      server.listen(port || 0, () => {
        const address = server.address() as net.AddressInfo;
        logger.info(`HTTPS server (${serviceName}) started on port ${address.port}`);
        resolve(address.port);
      });
    } catch (err) {
      reject(err);
    }
  });
}

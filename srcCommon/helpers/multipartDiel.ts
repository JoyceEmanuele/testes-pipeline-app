import * as express from 'express';
import * as dielServices from '../dielServices';
import { logger } from './logger';

async function dielMultipartBodyParser (req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.get('content-type') !== 'x-diel-multipart') {
    next();
    return;
  }
  try {
    const parts = await multipartDiel(req);
    // if (parts.length < 2) throw Error('Invalid request E208');
    const gwData = (parts[0] && JSON.parse(parts[0].toString())) || undefined;
    const bodyStr = (parts[1] && parts[1].toString());
    req.body = (bodyStr && JSON.parse(bodyStr)) || undefined;
    (req as any).gwData = gwData;
    (req as any).session = gwData && gwData.session;
    (req as any).bodyExtra = (parts.length > 2) ? parts.slice(2) : undefined;
    next();
  } catch (err) {
    logger.error('DBG-DIELMP');
    logger.error(err);
    next(err);
  }
}

export async function dielMultipartSimParser (req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    if (req.headers['authorization']) {
      const { session, extraSessionData, realUserSession } = await dielServices.authInternalApi('/diel-internal/auth/get-user-session', { authHeader });
      if (session) req.session = session;
      if (extraSessionData) req.extraSessionData = extraSessionData;
      if (realUserSession) req.realUserSession = realUserSession;
    }
    if (req.headers['x-diel-gwdata']) {
      req.gwData = JSON.parse(req.headers['x-diel-gwdata'] as string);
    }
    next();
  } catch (err: any) {
    logger.error(err)
    const err2 = new Error(err.errorMessage || (err.errorCode && err.message) || 'Auth error').Details(401, {
      errorCode: err.errorCode || undefined,
      frontDebug: err.frontDebug || undefined,
    });
    next(err2);
  }
}

async function dielMultipartGwParser (req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.get('content-type') !== 'x-diel-multipart') {
    next();
    return;
  }
  try {
    const gwDataBuffer = await extractDielGw(req);
    const gwData = JSON.parse(gwDataBuffer.toString());
    (req as any).gwData = gwData;
    (req as any).session = gwData && gwData.session;

    const fullLengthStr = req.get('content-length');
    const fullLength = Math.round(Number(fullLengthStr));
    req.headers['content-length'] = String(fullLength - gwDataBuffer.length);
    req.headers['content-type'] = gwData.bodyContentType;
    next();
  } catch (err) {
    logger.error('DBG-DIELMP');
    logger.error(err);
    next(err);
  }
}

function extractDielGw(req: express.Request, maxBodySize: number = 20 * 1000 * 1000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      if (req.get('content-type') !== 'x-diel-multipart') {
        throw Error('Invalid content-type');
      }
      const fullLengthStr = req.get('content-length');
      const fullLength = Math.round(Number(fullLengthStr));
      if ((fullLength >= 0) && Number.isFinite(fullLength)) { /* OK */ }
      else throw Error('Invalid multipart-diel');
      if (String(fullLength) !== fullLengthStr) throw Error('Invalid multipart-diel');
      if (fullLength > maxBodySize) throw Error('Invalid multipart-diel'); // 20 Mb limit
      const partsLengthsStr = req.get('x-body-parts');
      const partsLengths = (partsLengthsStr || '')
        .split('+')
        .map((x) => Number(x || NaN))
        .filter((x) => ((x >= 0) && Number.isFinite(x)));
      // if (partsLengths.length < 2) throw Error('Invalid multipart-diel');
      if (partsLengths.join('+') !== partsLengthsStr) throw Error('Invalid multipart-diel');
      let partsTotal = 0;
      partsLengths.forEach((partLen) => { partsTotal += partLen; });
      if (partsTotal !== fullLength) throw Error('Invalid multipart-diel');

      req.on('error', (err) => { reject(err); });
      req.on('readable', () => {
        if (!partsLengths[0]) {
          reject(Error('E51 Empty GW data'));
          return;
        }
        const gwchunk = req.read(partsLengths[0]);
        resolve(gwchunk);
      });
      req.on('end', () => {
        reject(Error('E53 Unexpected stream end'));
      });
    } catch (err) {
      reject(err);
    }
  });
}

function multipartDiel(req: express.Request, maxBodySize: number = 20 * 1000 * 1000): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    try {
      if (req.get('content-type') !== 'x-diel-multipart') {
        throw Error('Invalid content-type');
      }
      const fullLengthStr = req.get('content-length');
      const fullLength = Math.round(Number(fullLengthStr));
      if ((fullLength >= 0) && Number.isFinite(fullLength)) { /* OK */ }
      else throw Error('Invalid multipart-diel');
      if (String(fullLength) !== fullLengthStr) throw Error('Invalid multipart-diel');
      if (fullLength > maxBodySize) throw Error('Invalid multipart-diel'); // 20 Mb limit
      const partsLengthsStr = req.get('x-body-parts');
      const partsLengths = (partsLengthsStr || '')
        .split('+')
        .map((x) => Number(x || NaN))
        .filter((x) => ((x >= 0) && Number.isFinite(x)));
      // if (partsLengths.length < 2) throw Error('Invalid multipart-diel');
      if (partsLengths.join('+') !== partsLengthsStr) throw Error('Invalid multipart-diel');
      let partsTotal = 0;
      partsLengths.forEach((partLen) => { partsTotal += partLen; });
      if (partsTotal !== fullLength) throw Error('Invalid multipart-diel');
      const chunks = [] as Buffer[];
      req.on('data', (chunk) => { chunks.push(chunk); });
      req.on('error', (err) => { reject(err); });
      req.on('end', () => {
        const fullBody = Buffer.concat(chunks);
        if (fullBody.length !== fullLength) {
          reject(Error('Incomplete data E238'));
          return;
        }
        const parts = [] as Buffer[];
        let pointer = 0;
        for (const pLen of partsLengths) {
          parts.push(fullBody.subarray(pointer, pointer + pLen));
          pointer += pLen;
        }
        resolve(parts);
      });
    } catch (err) {
      reject(err);
    }
  });
}

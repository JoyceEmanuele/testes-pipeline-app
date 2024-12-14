import * as fs from 'fs';
import { now_shiftedTS_s } from '../helpers/dates';

import { logger } from '../../srcCommon/helpers/logger';

export type OperationLogData = string;

export function saveOperationLog (table: string, sentence: string, qPars: {}, user: OperationLogData) { // , affectedRows: {}[]
  return saveLog(`${table}\t${user}\t${sentence}\t${JSON.stringify(qPars)}`, 'DB', 'legado_');
}

export function saveLogCommand (devId: string, user: string, payload: {}) {
  return saveLog(`${devId}\t${user}\t${JSON.stringify(payload)}`, 'CMD', 'legado_');
}

export function saveLogRequest (path: string, user: string, reqParams: any) {
  if (reqParams) {
    if (reqParams.password) reqParams.password = '*****';
    if (reqParams.pass) reqParams.pass = '*****';
  }
  return saveLog(`${path}\t${user}\t${JSON.stringify(reqParams)}`, 'REQ', 'legado_');
}

export function saveLogRequestError (path: string, user: string, httpStatus: number, message: string) {
  return saveLog(`${path}\t${user}\t${httpStatus}\t${message}`, 'REQERR', 'legado_');
}

let criouPasta = false;
function saveLog (message: string, category: string, filePrefix: string) {
  if (!criouPasta) {
    fs.mkdirSync('./log', { recursive: true });
    criouPasta = true;
  }
  return new Promise((resolve, reject) => {
    const ts = now_shiftedTS_s(true);
    const numBytes = ts.length + 1 + Buffer.byteLength(message, 'utf8');
    fs.appendFile(`./log/${filePrefix}${ts.substring(0, 10)}.log`, `\n[${numBytes}+${category.length}:${category}]${ts}\t${message}`, function (err) {
      if (err) logger.error(err);
      resolve(true);
    });
  });
}

export function saveInvoiceLogRequest (path: string, user: string, reqParams: any) {
  return saveLog(`${path}\t${user}\t${JSON.stringify(reqParams)}`, 'REQ', 'invoice_');
}

export function saveInvoiceLogRequestError (path: string, user: string, httpStatus: number, message: string) {
  return saveLog(`${path}\t${user}\t${httpStatus}\t${message}`, 'REQERR', 'invoice_');
}

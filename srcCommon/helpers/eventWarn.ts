import { admLogger, logger } from '../helpers/logger';

// Aqui devemos evitar que vários emails repetidos sobre o mesmo problema
// Definir tipos de problemas:
//  - exceção não tratada no código
//  - uso excessivo de memória RAM ou de armazenamento em disco

let otaCertUnauth_pause = 0;
export function otaCertUnauth (reqParams: { devId: string }) {
  if (otaCertUnauth_pause > Date.now()) return;
  otaCertUnauth_pause = Date.now() + 1 * 60 * 60 * 1000;
  const message = `otaCertUnauth: ${JSON.stringify(reqParams)}`;
  admLogger(message);
}

let expiringCertificate_pause = 0;
export function expiringCertificate (name: string) {
  if (expiringCertificate_pause > Date.now()) return;
  expiringCertificate_pause = Date.now() + 1 * 60 * 60 * 1000;
  const message = `expiringCertificate: ${name}`;
  admLogger(message);
}

export function highRamUsage (desc: string) {
  const message = `highRamUsage: ${desc}`;
  admLogger(message);
}

const pausesByType = {
  RAM_USAGE: 1 * 60 * 60 * 1000,
  CERT_EXP_FILE: 0,
  CERT_EXP_MQTTSERV: 1 * 60 * 60 * 1000,
  CERT_EXP_OTA: 1 * 60 * 60 * 1000,
  CERT_EXP_INTERSERV: 1 * 60 * 60 * 1000,
  DB_CONSISTENCY: 10 * 60 * 1000,
  DYNAMODB_TABLE_CREATION: 0,
  NESS_INTEGR: 24 * 60 * 60 * 1000,
  UNHANDLED_SQL: 1 * 60 * 60 * 1000,
  UNHANDLED: 1 * 60 * 60 * 1000,
  SYSTEM_INIT: 1 * 60 * 60 * 1000,
  UNEXPECTED: 1 * 60 * 60 * 1000,
  SCHED_TURN: 6 * 60 * 60 * 1000,
  EMAIL_SEND: 6 * 60 * 60 * 1000,
  INVALID_DEV_PROG: 1 * 60 * 60 * 1000,
  MONIT_BROKERS: 1 * 60 * 60 * 1000,
  IOTRELAY_ERROR: 1 * 60 * 60 * 1000,
};
const pauses: { [type: string]: number } = {};
export type WarnTypes = keyof typeof pausesByType;
export function typedWarn (type: WarnTypes, desc: string) {
  if (pauses[type] > Date.now()) return;
  pauses[type] = Date.now() + (pausesByType[type]||0);
  const msgText = `${type}: ${desc}`;
  admLogger(msgText);
}

export function checkUnexpectedError (err: any) {
  logger.error(err);
  typedWarn('UNEXPECTED', String(err));
}

const devError_c: {
  [devId: string]: number
} = {};
export function devError (errorType: string, devId: string, topic: string, payload: any, err?: any) {
  if (devError_c[devId] > Date.now()) return;
  devError_c[devId] = Date.now() + 1 * 60 * 60 * 1000;
  logger.info(`${errorType}: topic '${topic}' payload: ${JSON.stringify(payload)}`);
  if (err) logger.error(err);
}

const topicError_c: {
  [topic: string]: number
} = {};
export function topicError (errorType: string, topic: string, payload: any, err?: any) {
  if (topicError_c[topic] > Date.now()) return;
  topicError_c[topic] = Date.now() + 10 * 60 * 1000;
  logger.info(`${errorType}: topic '${topic}' payload: ${JSON.stringify(payload)}`);
  if (err) logger.error(err);
}

const devTimestampError_c: {
  [devId: string]: number
} = {};
export function devTimestampError (errorType: string, devId: string, topic: string, payload: any, err?: any) {
  if (devTimestampError_c[devId] > Date.now()) return;
  devTimestampError_c[devId] = Date.now() + 1 * 60 * 60 * 1000;
  logger.warn(`${errorType}: topic '${topic}' payload: ${JSON.stringify(payload)}`);
  if (err) logger.error(err);
}

import { logger } from '../../srcCommon/helpers/logger';
import * as fs from 'node:fs/promises';
import { TopicType } from '../../srcCommon/types';
import * as devInfo from '../../srcCommon/helpers/devInfo';
import { DriConfig } from '../../srcCommon/helpers/driData';

const TIMEOUT_OFFLINE = 48 * 60 * 60 * 1000; // 48 hours
const TIMEOUT_LATE = 330 * 1000; // ~5 minutes

let lastMessages: {
  [devId: string]: {
    tsBefore: number // Timestamp do servidor da telemetria anterior à atual
    ts: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
    topic?: TopicType // Tópico 'data/...' que foi usado, e não o tipo do dispositivo. O DMA por exemplo usa tópico de DUT.
    telemetry?: any // último JSON que chegou em tópico 'data/...'
  }
} = {};

let deviceLastTs: {
  [devId: string]: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
} = {};

// O serviço do realtime usa este mecanismo para saber quando um dispositivo muda de status ONLINE/OFFLINE para poder
// avisar o front através do websocket.
let listenerForStatusChange: (devId: string, currState: "ONLINE" | "OFFLINE" | "LATE") => void = null;
export function setListenerForStatusChange(listener: typeof listenerForStatusChange) {
  listenerForStatusChange = listener;
}

export function onDataMessage(devId: string, payload: any, topicType: TopicType) {
  const { devLastMessages, wasOffline, tsBefore } = onDeviceMessage(devId);
  devLastMessages.telemetry = payload;
  devLastMessages.topic = topicType;

  if (devId.startsWith('DRI')) {
    devLastMessages.tsBefore = tsBefore;
  }

  return { wasOffline };
}

export function onControlMessage(devId: string, payload: any) {
  const { wasOffline } = onDeviceMessage(devId);
  return { wasOffline };
}

function onDeviceMessage(devId: string) {
  let devLastMessages = lastMessages[devId];
  const prevTS = devLastMessages?.ts;

  if (devLastMessages) {
    devLastMessages.ts = Date.now();
  } else {
    devLastMessages = lastMessages[devId] = {
      tsBefore: null,
      ts: Date.now(),
    };
  }
  deviceLastTs[devId] = devLastMessages.ts;

  const becameOnline = !!(prevTS && ((devLastMessages.ts - prevTS) > TIMEOUT_LATE));
  const wasOffline = !!(prevTS && ((devLastMessages.ts - prevTS) > TIMEOUT_OFFLINE));
  const tsBefore = prevTS || null;
  if (becameOnline) {
    // Avisa o front através do websocket
    listenerForStatusChange?.(devId, 'ONLINE');
  }

  return { devLastMessages, wasOffline, tsBefore };
}


export async function iterateLastTs_async(cb: (devId: string, ts: number) => Promise<void>) {
  for (const [devId, ts] of Object.entries(deviceLastTs)) {
    await cb(devId, ts);
  }
}

export async function iterateLastTelemetry_async(cb: (devId: string, telemetry: any) => Promise<void>) {
  for (const [devId, info] of Object.entries(lastMessages)) {
    await cb(devId, info.telemetry);
  }
}

export async function startSavingService() {
  await fs.mkdir('./cache', { recursive: true });
  await loadCacheFiles();

  // Organizar o cache com base na lista de dispositivos cadastrados:
  // const rows = await sqldb.DEVICES.getVolatileData();

  (async function () {
    while(true) {
      try {
        await fs.writeFile('./cache/lastMessages-tmp.json', JSON.stringify(lastMessages));
        await fs.rename('./cache/lastMessages-tmp.json', './cache/lastMessages.json');
      } catch (err) {
        logger.error('Error on lastMessages SavingService');
        logger.error(err);
      }
      await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
    }
  }());
}

async function loadCacheFiles() {
  // TODO: se der erro no parse do JSON (por exemplo arquivo corrompido) o sistema não vai conseguir se recuperar

  let savedLastMessages = '{}';
  try {
    savedLastMessages = await fs.readFile('./cache/lastMessages.json', 'utf8');
  } catch (err) { logger.warn('File not found: ./cache/lastMessages.json') };
  const recentLastMessages = lastMessages;
  lastMessages = JSON.parse(savedLastMessages);
  for (const [devId, devLastMessages] of Object.entries(recentLastMessages)) {
    Object.assign(lastMessages[devId], devLastMessages);
  }
  for (const [devId, devLastMessages] of Object.entries(lastMessages)) {
    deviceLastTs[devId] = devLastMessages.ts;
  }
}

export const lastDacTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDac(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDamTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDam(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDutTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDut(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDutAutTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDutAut(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDriTelemetry = function (devId: string, driCfg: DriConfig) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDri(lastCommInfo, driCfg) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDmaTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDma(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDmtTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDmt(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export const lastDalTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDal(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

export function getStatus (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return status;
}

export function lastDevTS (devId: string) {
  return lastMessages[devId]?.ts;
}

/** Lista de dispositivos que estão com automação em "Mode: Manual" */
export function getListModeManual () {
  const list: string[] = [];
  for (const [devId, lastCommInfo] of Object.entries(lastMessages)) {
    if (!lastCommInfo.telemetry) continue;
    const lastTelemetry = devInfo.lastTelemetryAsDam(lastCommInfo) || undefined;
    if (!lastTelemetry) continue;
    if (lastTelemetry.Mode === 'Manual' && (!lastTelemetry.State || lastTelemetry.State.toLowerCase() !== 'thermostat')) {
      list.push(devId);
    }
  }
  return list;
}

/** Lista de DALs que estão com automação de algum relé em "MANUAL" */
export function getDalListModeManual () {
  const list: string[] = [];
  for (const [devId, lastCommInfo] of Object.entries(lastMessages)) {
    const lastTelemetry = devInfo.lastTelemetryAsDal(lastCommInfo) || undefined;
    if (!(lastTelemetry?.Mode instanceof Array)) continue;
    if (lastTelemetry.Mode.some((mode) => mode === 'MANUAL')) {
      list.push(devId);
    }
  }
  return list;
}

export function getDrisInRealTime() {
  const list: { devId: string, type: string }[] = [];
  for (const [devId, lastCommInfo] of Object.entries(lastMessages)) {
    if (devId.startsWith('DRI') && lastCommInfo.ts - lastCommInfo.tsBefore <= 5000) {
      list.push({ devId, type: lastCommInfo.telemetry?.type });
    } 
  }

  return list;
}

export function getFull_lastMessages() {
  return lastMessages;
}

export function getFull_deviceLastTs() {
  return deviceLastTs;
}

import { TelemetryPackDAC, TopicType } from "../types";
import {
  TelemetryPackRawDMT,
  TelemetryPackRawDUT,
  TelemetryPackRawDutAut,
  TelemetryRawDAM,
  TelemetryRawDRI,
  TelemetryPackRawDMA,
  TelemetryRawDAL,
} from "../types/devicesMessages";
import * as damData from './damData';
import * as dutData from './dutData';
import * as driData from './driData';
import { logger } from "./logger";

const TIMEOUT_OFFLINE = 48 * 60 * 60 * 1000; // 48 hours
const TIMEOUT_LATE = 330 * 1000; // ~5 minutes

export function isTemporaryId (devId: string) {
  // DAC122223333
  if (devId?.length !== 12) return true;
  if (devId.includes('-') || devId.includes('_')) return true;
  return false;
}

export function isDacId (devId: string) {
  return devId?.startsWith('DAC');
}

// Tanto o "lastMessageTS" quanto o "now" devem estar no mesmo fuso horário, de preferência o GMT-0.
export function calculateStatus(lastMessageTS: number, now?: number): 'ONLINE'|'OFFLINE'|'LATE'|undefined {
  if (!lastMessageTS) {
    return undefined;
  }
  if (!now) now = Date.now();
  const timeSinceLastMessage = (now - lastMessageTS);
  // Esta função foi feita para mensagens que chegam em tempo real no servidor.
  // Os dois parâmetros são timestamps do servidor, então nunca deve acontecer de o atual ser menor que o anterior.
  // Não vou verificar esta situação, o que implica retornar ONLINE se "timeSinceLastMessage" for negativo.
  if (timeSinceLastMessage <= TIMEOUT_LATE) return 'ONLINE';
  else if (timeSinceLastMessage <= TIMEOUT_OFFLINE) return 'LATE';
  return 'OFFLINE';
}

export function lastTelemetryAsDac(lastMessage: { telemetry?: TelemetryPackDAC, topic?: TopicType }) {
  const payload = lastMessage && (lastMessage.topic === 'dac' || lastMessage.telemetry?.dev_id?.startsWith('DAC')) && lastMessage.telemetry;
  if (!payload) return null;
  if (!payload.Lcmp) return null;
  return {
    dac_id: payload.dev_id,
    timestamp: payload.timestamp,
    Tamb: payload.Tamb && payload.Tamb[payload.Tamb.length - 1],
    Tsuc: payload.Tsuc && payload.Tsuc[payload.Tsuc.length - 1],
    Tliq: payload.Tliq && payload.Tliq[payload.Tliq.length - 1],
    Psuc: payload.Psuc && payload.Psuc[payload.Psuc.length - 1],
    Pliq: payload.Pliq && payload.Pliq[payload.Pliq.length - 1],
    Levp: payload.Levp && payload.Levp[payload.Levp.length - 1],
    Lcmp: payload.Lcmp && payload.Lcmp[payload.Lcmp.length - 1],
    Lcut: payload.Lcut && payload.Lcut[payload.Lcut.length - 1],
    Tsc: payload.Tsc && payload.Tsc[payload.Tsc.length - 1],
    Tsh: payload.Tsh && payload.Tsh[payload.Tsh.length - 1],
    P0raw: payload.P0 && payload.P0[payload.P0.length - 1],
    P1raw: payload.P1 && payload.P1[payload.P1.length - 1],
    GMT: payload.GMT,
  };
}
export function lastTelemetryAsDam(lastMessage: { telemetry?: TelemetryRawDAM, topic?: TopicType }) {
  const payload = lastMessage && (lastMessage.topic === 'dam' || lastMessage.telemetry?.dev_id?.startsWith('DAM')) && lastMessage.telemetry;
  if (!payload) return null;
  if (!payload.State) return null;
  return damData.processRawTelemetry(payload);
}
export function lastTelemetryAsDut(lastMessage: { telemetry?: TelemetryPackRawDUT, topic?: TopicType }) {
  const payload = lastMessage && (lastMessage.topic === 'dut' || lastMessage.telemetry?.dev_id?.startsWith('DUT')) && lastMessage.telemetry;
  if (!payload) return null;
  return {
    dev_id: payload.dev_id,
    timestamp: payload.timestamp,
    Temperature: payload.Temperature && payload.Temperature[payload.Temperature.length - 1],
    Temperature_1: payload.Temperature_1 && payload.Temperature_1[payload.Temperature_1.length - 1],
    Humidity: payload.Humidity && payload.Humidity[payload.Humidity.length - 1],
    eCO2: payload.eCO2 && payload.eCO2[payload.eCO2.length - 1],
    TVOC: payload.TVOC && payload.TVOC[payload.TVOC.length - 1],
    raw_eCO2: payload.raw_eCO2 && payload.raw_eCO2[payload.raw_eCO2.length - 1],
    Tmp: payload.Tmp && payload.Tmp[payload.Tmp.length - 1],
    operation_mode: payload.operation_mode,
    L1: payload.L1 && payload.L1[payload.L1.length - 1],
    GMT: payload.GMT,
  };
}
export function lastTelemetryAsDutAut(lastMessage: { telemetry?: TelemetryPackRawDutAut, topic?: TopicType }) {
  const payload = lastMessage && (lastMessage.topic === 'dut' || lastMessage.telemetry?.dev_id?.startsWith('DUT')) && lastMessage.telemetry;
  if (!payload) return null;
  if (!payload.State) return null;
  return dutData.processRawTelemetry_AUT(payload);
}
export function lastTelemetryAsDri(lastMessage: { telemetry?: TelemetryRawDRI, topic?: TopicType }, driCfg: driData.DriConfig) {
  const payload = lastMessage && (lastMessage.topic === 'dri' || lastMessage.telemetry?.dev_id?.startsWith('DRI')) && lastMessage.telemetry;
  if (!payload) return null;
  return driData.processRawTelemetry(payload, driCfg);
}
export function lastTelemetryAsDri_raw(lastMessage: { telemetry?: TelemetryRawDRI, topic?: TopicType }) {
  const payload = lastMessage && (lastMessage.topic === 'dri' || lastMessage.telemetry?.dev_id?.startsWith('DRI')) && lastMessage.telemetry;
  if (!payload) return null;
  return payload;
}
export function lastTelemetryAsDma(lastMessage: { telemetry?: TelemetryPackRawDMA, topic?: TopicType }) {
  // O DMA usa tópico "data/dut"
  const payload = lastMessage && (lastMessage.topic === 'dut' || lastMessage.telemetry?.dev_id?.startsWith('DMA')) && lastMessage.telemetry;
  if (!payload) return null;
  return payload;
}
export function lastTelemetryAsDmt(lastMessage: { telemetry?: TelemetryPackRawDMT, topic?: TopicType }) {
  // O DMT usa tópico "data/dac"
  const payload = lastMessage && (lastMessage.topic === 'dac' || lastMessage.telemetry?.dev_id?.startsWith('DMT')) && lastMessage.telemetry;
  if (!payload) return null;
  return payload;
}
export function lastTelemetryAsDal(lastMessage: { telemetry?: TelemetryRawDAL, topic?: TopicType }) {
  // O DAL usa tópico "data/dam"
  const payload = lastMessage && (lastMessage.topic === 'dam' || lastMessage.telemetry?.dev_id?.startsWith('DAL')) && lastMessage.telemetry;
  if (!payload) return null;
  return payload;
}

export function checkDevId(devId: string) {
  return /^[A-Z]{3}[0-9]{9}$/.test(devId);
}

export function checkDevIdWithDevType(devId: string, devType: string) {
  if (!/^[A-Z]{3}$/.test(devType)) { return false; }
  if (!checkDevId(devId)) { return false; }
  if(devId.startsWith(devType)) { return true; }
  else if ((devType === 'DUT') && devId.startsWith('DMA')) { return true; }
  else if ((devType === 'DUT') && devId.startsWith('DMT')) { return true; }
  else if ((devType === 'DAM') && devId.startsWith('DAL')) { return true; }
  else return false;
}

export function checkDeviceOnline(devCode: string, connectionStatus: "ONLINE" | "LATE" | "OFFLINE"): void {
  if (connectionStatus !== 'ONLINE') {
    const message = `Dispositivo ${devCode} não está online`;

    logger.error(message);
    throw new Error(message).HttpStatus(400);
  }
}

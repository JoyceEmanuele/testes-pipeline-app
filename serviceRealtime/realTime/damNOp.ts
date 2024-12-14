import * as damHealth from '../../srcCommon/dam/damHealth'
import * as ramCaches from '../ramCaches';
import { PeriodData, TelemetryDAC } from "../../srcCommon/types";
import { logger } from '../../srcCommon/helpers/logger';

let damNOpMsgTs: {
  [damId: string]: number
} = {};
export function damNaoOperante (Lcmp: 0|1, shiftedServerTime: Date, groupId: number) {
  if (Lcmp !== 1) return;
  if (!groupId) return;
  const damId = ramCaches.DEVGROUPS.tryGetGroupDam(groupId);
  if (!damId) return;
  const damSched = ramCaches.DAMS.tryGetDamSched(damId);
  if ((!damSched) || (!damSched.current)) return;

  if (!damNaoOperante_getS(shiftedServerTime, damSched.current)) return;

  const limit24h = Date.now() - 24 * 60 * 60 * 1000;
  if (damNOpMsgTs[damId] && damNOpMsgTs[damId] > limit24h) return;
  damNOpMsgTs[damId] = Date.now();

  logger.info(`DBG: FAULT DETECTION!! Error: damNaoOperante - DamId: ${damId} - Timestamp: ${shiftedServerTime.toISOString()}`);
  damHealth.takeFaultAction(damId, { id: 'DAMNOP', name: 'DAM inoperante' }, '[SYSTEM]');
}
function damNaoOperante_getS (shiftedServerTime: Date, currentSched: PeriodData) {
  const index = shiftedServerTime.getUTCHours() * 60 + shiftedServerTime.getUTCMinutes();
  if ((index < (currentSched.indexIni - 10)) && (currentSched.permission === 'allow')) return true;
  if ((index > (currentSched.indexEnd + 10)) && (currentSched.permission === 'allow')) return true;
  if ((index >= (currentSched.indexIni + 10)) && (index <= (currentSched.indexEnd - 10)) && (currentSched.permission === 'forbid')) return true;
  return false;
}
export function clearDamNOp (reqParams: { damId: string }) {
  const { damId } = reqParams;
  if (damNOpMsgTs[damId] != null) {
    damNOpMsgTs[damId] = null; // Date.now();
  }
}
export function tryGetDamNOpMsgTs (damId: string) {
  return damNOpMsgTs[damId];
}

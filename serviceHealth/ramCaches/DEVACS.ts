import { FaultsActs } from '../../srcCommon/types'

// TAG: RAM-CACHE DEVACS
let dacsFaultsActs: {
  [dacId: string]: {
    [notifId: string]: {
      approved: boolean,
      noNotifUntil: number,
    }
  }
} = {};
export function tryGetDacFActs (dacId: string) {
  return dacsFaultsActs[dacId];
}
export function setDacFActs (dacId: string, faultsActs: FaultsActs) {
  dacsFaultsActs[dacId] = {};
  for (const [notifId, faultActs] of Object.entries(faultsActs)) {
    let noNotifUntil = 0;
    if (faultActs.lastActionTime || faultActs.lastAdmMessage) {
      noNotifUntil = Math.max(faultActs.lastActionTime || 0, faultActs.lastAdmMessage || 0) + 24 * 60 * 60 * 1000;
    }
    dacsFaultsActs[dacId][notifId] = { approved: faultActs.lastAction === 'APPROVED', noNotifUntil };
  }
}

import { AlertParams } from '../../srcCommon/types';
import { logger } from '../../srcCommon/helpers/logger';
import configfile from '../../configfile';
import { AllUsersNotifs, loadUserNotifs } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';

// TAG: RAM-CACHE NOTIFSCFG
let uNotifs: AllUsersNotifs = {};

export function tryGetDevUNotifs (devId: string) {
  return uNotifs[devId];
}

export function tryGetClientUNotifs (unitId: number) {
  return uNotifs[`CLIENT${unitId}`]
}

export async function updateAllUserNotifs (reqParams?: {}) { // compileAllUserNotifs
  const newUNotifs = await loadUserNotifs();
  const nowShifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  for (const devId of Object.keys(newUNotifs)) {
    configureTimeAlerts(devId, nowShifted, newUNotifs[devId]);
  }
  syncNotifs(newUNotifs);
}


export function configureTimeAlerts (dacId: string, nowShifted: Date, devAlerts: (typeof uNotifs)[string]) {
  if (!devAlerts) return;

  delete devAlerts.beforeTime
  delete devAlerts.afterTime
  if (devAlerts['COMP_TIME <']) {
    const today = nowShifted.toISOString().substr(0, 10);
    for (const row of devAlerts['COMP_TIME <']) {
      const beforeTime = new Date(today + 'T' + row.value + ':00Z')
      if (Number.isNaN(beforeTime.getTime())) continue;
      if (beforeTime < nowShifted) continue
      if ((!devAlerts.beforeTime) || (beforeTime > devAlerts.beforeTime)) {
        devAlerts.beforeTime = beforeTime
        devAlerts.beforeTime_notifId = row.NOTIF_ID
      }
    }
    if (devAlerts.beforeTime) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME before ${devAlerts.beforeTime}`)
      }
    } else {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME before => missed`)
      }
    }
  }
  if (devAlerts['COMP_TIME >']) {
    const today = nowShifted.toISOString().substr(0, 10);
    for (const row of devAlerts['COMP_TIME >']) {
      const afterTime = new Date(today + 'T' + row.value + ':00Z')
      if (Number.isNaN(afterTime.getTime())) continue;
      if ((!devAlerts.afterTime) || (afterTime < devAlerts.afterTime)) {
        devAlerts.afterTime = afterTime
        devAlerts.afterTime_notifId = row.NOTIF_ID
      }
    }
    if (devAlerts.afterTime) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME after ${devAlerts.afterTime}`)
      }
    } else {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME after => missed`)
      }
    }
  }
}

function syncNotifs (newUNotifs: typeof uNotifs) {
  for (const devId of Object.keys(uNotifs)) {
    if (!newUNotifs[devId]) delete uNotifs[devId];
  }
  for (const [devId, notifsD] of Object.entries(newUNotifs)) {
    if (uNotifs[devId]) {
      // 'DUT_T T<>T' stores extra information in AlertParams
      transferExtraData(uNotifs[devId]['DUT_T T<>T'], newUNotifs[devId]['DUT_T T<>T']);
      transferExtraData(uNotifs[devId]['DUT_T T>T'], newUNotifs[devId]['DUT_T T>T']);
      // transferExtraData(uNotifs[devId]['DUT_T DUT<>DUT'], newUNotifs[devId]['DUT_T DUT<>DUT']);
    }
    uNotifs[devId] = newUNotifs[devId];
  }
}

function transferExtraData (currArr: AlertParams[], newArr: AlertParams[]) {
  if (!currArr) return;
  if (!newArr) return;
  for (let i = 0; i < newArr.length; i++) {
    const notifD = newArr[i];
    const existing = currArr.find(x => x.NOTIF_ID === notifD.NOTIF_ID);
    if (!existing) continue;
    newArr[i] = { ...existing, ...notifD };
  }
}

export function debugUNotifs () {
  return JSON.parse(JSON.stringify(uNotifs)) as typeof uNotifs;
}

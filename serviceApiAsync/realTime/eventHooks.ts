import * as dielServices from '../../srcCommon/dielServices';

function onDacInfoChange (dacId: string) {
  // update faults data, hwCfg might have changed
  // TODO: recarregar as detecções de falha repentina!! Pode ter definido ou alterado a aplicação, as regras de detecção mudam. Usar eventos on('changeDAC')
  // TODO: update alerts
  // dac.alerts = await compileDacAlerts(devId, dac.UNIT_ID, dac.GROUP_ID, dac.CLIENT_ID)
}

function onDevInfoChange (devId: string) {
  // update notifications and subscription data, the device might have changed unit/client
  // check devices and machines association, unit may have changed
}

// When device become online

export function onDevDeleted (devId: string): void {
  // delete dacs[devId];
  // delete dams[devId];
  // delete duts[devId];
  // delete devs[devId];
  // ramCaches_TIMEZONES_deleteDeviceInfo(qPars.DEV_ID);
}

// await dacInfo.loadDacsDbInfo()
// await dacInfo.loadDacsFaultsdata()
// await dutInfo.loadDutRoomTypes()
// await roomTypes.loadRtypesScheds()
// await damSchedule.loadDamsScheds()
// await groups.loadGroupDams()
// await damInfo.loadDutDamsEco()
// await usersNotifs.updateAllUserNotifs()

export const ramCaches_DAMS_loadDamsEcoCfg = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DAMS_loadDamsEcoCfg: { motivo: '' } });
};
export const ramCaches_DEVACS_loadDacDbInfo = function (dacId: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DEVACS_loadDacDbInfo: { dacId, motivo: '' } });
};
export const ramCaches_DEVGROUPS_loadAutomationRefs = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DEVGROUPS_loadAutomationRefs: { motivo: '' } });
};
export const ramCaches_DRIS_loadDrisCfg = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DRIS_loadDrisCfg: { motivo: '' } });
};
export const ramCaches_DUTS_loadDutRoomTypes = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DUTS_loadDutRoomTypes: { motivo: '' } });
};
export const ramCaches_ROOMTYPES_loadRtypeSched = function (rtypeId: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { ROOMTYPES_loadRtypeSched: { rtypeId, motivo: '' } });
};
export const ramCaches_ROOMTYPES_loadRtypesScheds = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { ROOMTYPES_loadRtypesScheds: { motivo: '' } });
};
export const ramCaches_NOTIFSCFG_updateAllUserNotifs = function () {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { NOTIFSCFG_updateAllUserNotifs: { motivo: '' } });
};
export const ramCaches_DAMS_setDamThermostatCfg = function (damCode: string, valueThermostat: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DAMS_setDamThermostatCfg: { damCode, valueThermostat, motivo: '' } });
}


export const ramCaches_DEVGROUPS_deleteGroupDam = function (machineId: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DEVGROUPS_deleteGroupDam: { machineId, motivo: '' } });
};
export const ramCaches_DEVGROUPS_setGroupDam = function (machineId: number, DEV_AUT: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DEVGROUPS_setGroupDam: { machineId, DEV_AUT, motivo: '' } });
};
export const ramCaches_DUTS_deleteDutRoomPars = function (dutId: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DUTS_deleteDutRoomPars: { dutId, motivo: '' } });
};
export const ramCaches_DUTS_setDutRTypeId = function (devId: string, RTYPE_ID: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DUTS_setDutRTypeId: { devId, RTYPE_ID, motivo: '' } });
};
export const ramCaches_DUTS_setDutRoomPars = function (DEV_ID: string, RTYPE_ID: number, VARS: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { DUTS_setDutRoomPars: { DEV_ID, RTYPE_ID, VARS, motivo: '' } });
};
export const ramCaches_ROOMTYPES_deleteRType = function (rtypeId: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { ROOMTYPES_deleteRType: { rtypeId, motivo: '' } });
};


export const damFaults_clearDamNOp = function (damId: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { damFaults_clearDamNOp: { damId, motivo: '' } });
}
// export const iotRelay_informDacChanges = function () {
//   return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { iotRelay_informDacChanges: { motivo: '' } });
// }
// export const timezoneDevicesInfo = function () {
//   return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { timezoneDevicesInfo: { motivo: '' } });
// }

// export const ramCaches_TIMEZONES_updateLastDate = function (deviceCode: string, lastHour: string) {
//   return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { TIMEZONES_updateLastDate: { motivo: '', deviceCode, lastHour } });
// }

export const ramCaches_TIMEZONES_updateTimezoneId = function (deviceCode: string, timezoneId: number) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { TIMEZONES_updateTimezoneId: { motivo: '', deviceCode, timezoneId } });
}

// export const ramCaches_TIMEZONES_deleteDeviceInfo = function (deviceCode: string) {
//   return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { TIMEZONES_deleteDeviceInfo: { motivo: '', deviceCode } });
// }

export const ramCaches_TIMEZONES_updatePosixTimezone = function (idTimezone: string, posix: string) {
  return dielServices.realtimeInternalApi('/diel-internal/realtime/triggerRamCacheUpdate', { TIMEZONES_updatePosixTimezone: { motivo: '', idTimezone, posix } });
}

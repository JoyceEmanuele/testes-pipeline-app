import { API_Internal } from '../api-internal';
import * as ramCaches from '../ramCaches';
import * as damNOp from '../realTime/damNOp';

export * as AUTOM_EVAP from './AUTOM_EVAP';
export * as DAMS from './DAMS';
export * as DEVACS from './DEVACS';
export * as DEVGROUPS from './DEVGROUPS';
export * as DRIS from './DRIS';
export * as DUTS from './DUTS';
export * as NOTIFSCFG from './NOTIFSCFG';
export * as ROOMTYPES from './ROOMTYPES';
export * as TIMEZONES from './TIMEZONES';

export const triggerRamCacheUpdate: API_Internal['/diel-internal/realtime/triggerRamCacheUpdate'] = async function (reqParams) {
  if (reqParams.DAMS_loadDamsEcoCfg) await ramCaches.DAMS.loadDamsEcoCfg(reqParams.DAMS_loadDamsEcoCfg); // {}
  if (reqParams.DEVACS_loadDacDbInfo) await ramCaches.DEVACS.loadDacDbInfo(reqParams.DEVACS_loadDacDbInfo); // { deviceCode: string }
  if (reqParams.DEVGROUPS_loadAutomationRefs) await ramCaches.DEVGROUPS.loadAutomationRefs(reqParams.DEVGROUPS_loadAutomationRefs); // {}
  if (reqParams.DRIS_loadDrisCfg) await ramCaches.DRIS.loadDrisCfg(reqParams.DRIS_loadDrisCfg); // {}
  if (reqParams.DUTS_loadDutRoomTypes) await ramCaches.DUTS.loadDutRoomTypes(reqParams.DUTS_loadDutRoomTypes); // {}
  if (reqParams.ROOMTYPES_loadRtypeSched) await ramCaches.ROOMTYPES.loadRtypeSched(reqParams.ROOMTYPES_loadRtypeSched); // { RTYPE_ID: number }
  if (reqParams.ROOMTYPES_loadRtypesScheds) await ramCaches.ROOMTYPES.loadRtypesScheds(reqParams.ROOMTYPES_loadRtypesScheds); // {}
  if (reqParams.NOTIFSCFG_updateAllUserNotifs) await ramCaches.NOTIFSCFG.updateAllUserNotifs(reqParams.NOTIFSCFG_updateAllUserNotifs); // {}
  if (reqParams.DEVGROUPS_deleteGroupDam) await ramCaches.DEVGROUPS.deleteGroupDam(reqParams.DEVGROUPS_deleteGroupDam); // { machineId: number }
  if (reqParams.DEVGROUPS_setGroupDam) await ramCaches.DEVGROUPS.setGroupDam(reqParams.DEVGROUPS_setGroupDam); // { machineId: number, DEV_AUT: string }
  if (reqParams.DUTS_deleteDutRoomPars) await ramCaches.DUTS.deleteDutRoomPars(reqParams.DUTS_deleteDutRoomPars); // { DEV_ID: string }
  if (reqParams.DUTS_setDutRTypeId) await ramCaches.DUTS.setDutRTypeId(reqParams.DUTS_setDutRTypeId); // { devId: string, RTYPE_ID: number }
  if (reqParams.DUTS_setDutRoomPars) await ramCaches.DUTS.setDutRoomPars(reqParams.DUTS_setDutRoomPars); // { DEV_ID: string, RTYPE_ID: number, VARS: string }
  if (reqParams.ROOMTYPES_deleteRType) await ramCaches.ROOMTYPES.deleteRType(reqParams.ROOMTYPES_deleteRType); // { RTYPE_ID: number }
  if (reqParams.damFaults_clearDamNOp) await damNOp.clearDamNOp(reqParams.damFaults_clearDamNOp); // { damId: string }
  if (reqParams.DAMS_setDamThermostatCfg) await ramCaches.DAMS.setDamThermostatCfg(reqParams.DAMS_setDamThermostatCfg); // { damCode: string, valueThermostat: number}
  if (reqParams.TIMEZONES_updateTimezoneId) ramCaches.TIMEZONES.updateTimezoneId(reqParams.TIMEZONES_updateTimezoneId)// {}
  if (reqParams.TIMEZONES_updatePosixTimezone) ramCaches.TIMEZONES.updatePosixTableTimezone(reqParams.TIMEZONES_updatePosixTimezone) // {}
  return {};
}

import {
  DamMessage_EcoMode,
  DacCommand,
  DutCommand,
  DamCommand,
  DalCommand,
  OtaCommand,
  DamMessage_EraseException,
  DamMessage_EraseProgramming,
  DamMessage_SetProgramming,
  DamMessage_SetVentilation,
  DamMessage_SetException,
  DamMessage_SetMode,
  DamMessage_SetBypass,
  DutCmd_SetTemperatureControl,
  DevMessage_TimeSync,
  DutCmd_GetTemperatureControlState,
  DutCmd_SetV3Control,
  DutCmd_ForcedParams,
  DmaCommand,
  DamCmd_SetLocalEcoCfg,
  DamCmd_SetEcoCfg,
  DamCmd_SetExtThermCfg,
  DamMessage_SetSchedulerWeek,
  DamMessage_SetSchedulerException,
  DalMessage_SetMode,
  DalMessage_SetRelays,
  DamCmd_SetSensorsTemperature,
  DamCmd_Reset,
  DevSetTimezoneRefatorado,
  DamMessageGetSchedulerInfo,
  DamMessage_SetSchedulerConfig,
} from '../types/devicesCommands'
import { saveLogCommand } from '../db/dbModifLog';
import { cmdLogger } from '../helpers/logger';
import * as brokerMQTT from './brokerMQTT';

function sendDevCommand (dev_id: string, commandData: DamCommand | DacCommand | DutCommand | DmaCommand | DalCommand | DevMessage_TimeSync | DutCmd_ForcedParams | DevSetTimezoneRefatorado, userId: string) {
  brokerMQTT.publish(`commands/${dev_id}`, JSON.stringify(commandData))

  saveLogCommand(dev_id, userId, commandData);
  cmdLogger(dev_id, userId, commandData, new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 23));
}

function sendDevSyncCommand (dev_id: string, commandData: string, userId: string) {
  brokerMQTT.publish(`commands/sync/${dev_id}`, commandData)
}

export function sendDriVarConfig (dev_id: string, commandData: string, userId: string) {
  brokerMQTT.publish(`commands/${dev_id}`, commandData)

  saveLogCommand(dev_id, userId, commandData);
  cmdLogger(dev_id, userId, commandData, new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 23));
}

export function setDevRT (devId: string, rt: boolean, userId: string) {
  sendDevCommand(devId, { rt: rt ? 1 : 0 }, userId);
}

export function setDutIrLearnDeprecated (devId: string, active: boolean, userId: string) {
  sendDevCommand(devId, { msgtype: "set-ir-learn", enabled: !!active }, userId);
}

export function setDutIrLearn (devId: string, active: boolean, userId: string) {
  sendDevCommand(devId, { msgtype: "set_ir_learning", enabled: !!active }, userId);
}

export function requestDevSchedule (devId: string, userId: string) {
  sendDevCommand(devId, { ['programming-request']: 1 }, userId)
}

export function confirmOtaFwVersion (devId: string, userId: string) {
  sendDevCommand(devId, { ['validate-version']: true }, userId);
}

export function sendDutCommand (dutId: string, command: DutCommand, userId: string) {
  sendDevCommand(dutId, command, userId)
}

export type ScheduleCommand = DamMessage_SetProgramming
                            | DamMessage_EraseProgramming
                            | DamMessage_SetException
                            | DamMessage_EraseException
                            | DamMessage_SetVentilation
                            | DutCmd_GetTemperatureControlState
                            | DutCmd_SetTemperatureControl
                            | DutCmd_SetV3Control
                            | DutCmd_ForcedParams;
export function sendDamCommand_sched (damId: string, command: ScheduleCommand, userId: string) {
  sendDevCommand(damId, command, userId)
}

export type FirmwareSchedulerCommand = DamMessage_SetSchedulerWeek
  | DamMessage_SetSchedulerException | DamMessageGetSchedulerInfo | DamMessage_SetSchedulerConfig;
export function sendDamCommand_scheduler (damId: string, command: FirmwareSchedulerCommand, userId: string) {
  sendDevCommand(damId, command, userId);
}

export type DamCommandSetOper = DamMessage_SetMode
                              | DamMessage_SetBypass
                              | DamCmd_SetEcoCfg
                              | DamCmd_SetLocalEcoCfg
                              | DamCmd_SetExtThermCfg;
export function sendDamCommand_oper (damId: string, command: DamCommandSetOper, userId: string) {
  sendDevCommand(damId, command, userId)
}
export function sendDamCommand_eco (damId: string, command: DamMessage_EcoMode, userId: string) {
  sendDevCommand(damId, command, userId)
}

export function sendDamCommand_setEcoLocalCfg (damId: string, command: DamCmd_SetLocalEcoCfg, userId: string) {
  sendDevCommand(damId, command, userId)
}

export function sendDamCommand_setEcoCfg (damId: string, command: DamCmd_SetEcoCfg, userId: string) {
  sendDevCommand(damId, command, userId)
}

export function sendDamCommand_setExtThermCfg (damId: string, command: DamCmd_SetExtThermCfg, userId: string) {
  sendDevCommand(damId, command, userId)
}

export function sendDamCommand_setSensorsTemperature (damId: string, command: DamCmd_SetSensorsTemperature, userId: string) {
  sendDevCommand(damId, command, userId)
}

export function sendDamCommand_reset (damId: string, command: DamCmd_Reset, userId: string) {
  sendDevCommand(damId, command, userId)
}

export type DalCommandSetOper = DalMessage_SetMode
                              | DalMessage_SetRelays;
export function sendDalCommand_oper (dalCode: string, command: DalCommandSetOper, userId: string) {
  sendDevCommand(dalCode, command, userId)
}

export function sendSyncTimestamp(devId: string, oldFormat: boolean, newFormat: boolean, userId: string, posix: string) {
  if (!posix || !devId) return;
  sendDevCommand_CommandWithTimezone(devId, userId, posix);
}

export function sendOtaCommand (devId: string, command: OtaCommand, userId: string) {
  sendDevCommand(devId, command, userId)
}

export function sendDmaCommand(devId: string, samplingPeriod: number, userId: string ){
  sendDevCommand(devId, {msgtype: "set-sampling-config", samplingPeriod: samplingPeriod, samplesPerPackage: 1}, userId);
}
export function sendDmaCommand_mode(devId: string, operation_mode: number, userId: string ){
  sendDevCommand(devId, {operation_mode: operation_mode}, userId);
}

export function sendDmaCommand_setLogicLevel(devId: string, mode: number, userId: string ){
  sendDevCommand(devId, {msgtype: "set-pcnt-logic-level", mode: mode}, userId);
}

export function sendDevCommand_CommandWithTimezone(devId: string, userId: string, tzPosix: string) {
  const timestamp = Math.round(Date.now() / 1000);
  sendDevCommand(devId, { msgtype: "SYNC", TZ: tzPosix, TIME: timestamp }, userId);
  sendDevCommand(devId, { msgtype: "SYNC", tz: tzPosix, time: timestamp }, userId);
}
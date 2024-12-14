import * as httpRouter from './apiServer/httpRouter'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm'
import * as eventHooks from './realTime/eventHooks'
import sqldb from '../srcCommon/db'
import * as scheduleData from '../srcCommon/helpers/scheduleData'
import { setGetDevInfo } from './devInfo'
import * as devInfo from './devInfo'
import * as groups from './clientData/machines'
import { now_shiftedTS_s, zeroPad } from '../srcCommon/helpers/dates'
import { logger } from '../srcCommon/helpers/logger'
import { ControlMode } from '../srcCommon/helpers/dutAutomation';
import { canSeeDevicesWithoutProductionUnit, getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit } from '../srcCommon/helpers/permissionControl'
import { defineIrCodeAction } from './dutAutomation'
import * as arraySort from '../srcCommon/helpers/alphabeticArraySort'
import { controlAutomMachine } from './clientData/machines'
import { SessionData } from '../srcCommon/types'
import { API_Internal } from './api-internal'
import * as brokerMQTT from '../srcCommon/iotMessages/brokerMQTT'
import { getOffsetDevCode } from '../srcCommon/helpers/timezones'

interface AssetsDutsDuo{
  DUT_DUO_ID: string
  CITY_NAME: string
  STATE_ID: string
  GROUP_ID: number
  GROUP_NAME: string
  UNIT_ID: number
  UNIT_NAME: string
  H_INDEX: number
  CLIENT_NAME: string
  CLIENT_ID: number
  H_DESC: string
  DAT_ID: string
  AST_DESC: string
  ASSET_ID: number
  TIMEZONE_ID: number
  TIMEZONE_AREA: string
  TIMEZONE_OFFSET: number
  TEMPERATURE?: number,
  TEMPERATURE_1?: number,
  STATUS?: 'ONLINE' | 'OFFLINE' | 'LATE',
}

export async function getFreshDevInfo (devId: string) {
  if (!devId) return null
  return await sqldb.DUTS.getFreshDevInfo({ devId })
}

httpRouter.privateRoutes['/dut/get-dut-info'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.DEV_ID) throw Error('Invalid parameters! Missing DEV_ID').HttpStatus(400)

  const row = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.DEV_ID });
  if (!row) { throw Error('Could not find DUT information').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const fullProg = scheduleData.parseFullProgV4(row.USEPERIOD);
  const { workPeriods, workPeriodExceptions } = scheduleData.FullProgV4_to_deprecated_WorkPeriods(fullProg);
  delete row.USEPERIOD;

  const info = Object.assign(row, {
    status: <string>null,
    GROUP_NAME: row.ROOM_NAME,
    VARS: (row.VARS || '').split('').map((varCode) => {
      switch (varCode) {
        case 'T': //temperature
          return 'Temperature'
        case 'H': //humidity
          return 'Humidity'
        case 'D': //dioxide
          return 'CO2'
        case 'O': //organic
          return 'TVOC'
        default:
          return null
      }
    }).filter((x) => !!x)
  })

  const dev = await devsLastComm.loadLastDutTelemetry(row.DEV_ID);
  info.status = (dev && dev.status) || 'OFFLINE'

  return {
    info,
    fullProg,
    workPeriods,
    workPeriodExceptions,
    telemetry: dev && dev.lastTelemetry && {
      timestamp: dev.lastTelemetry.timestamp,
      Temperature: dev.lastTelemetry.Temperature,
      Humidity: dev.lastTelemetry.Humidity,
    }
  }
}

httpRouter.privateRoutes['/dut/set-dut-info'] = async function (reqParams, session) {
  // Check required params
  if (!reqParams.DEV_ID) throw Error('There was an error!\nInvalid properties. Missing DEV_ID.').HttpStatus(400);
  const perms = await setGetDevInfo(session, {
    DEV_ID: reqParams.DEV_ID,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    allowInsert: reqParams.DEV_ID.startsWith('DUT'),
  });
  return setDutInfo(reqParams, session.user, perms);
}

const handleDutDuo = async (paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string}, infos: Awaited<ReturnType<typeof sqldb.DUTS.getDevExtraInfo>>, userId: string) => {
  if (paramSet.PLACEMENT === 'DUO') {
    if (!infos.DUT_DUO_ID) {
      await sqldb.DUTS_DUO.w_insert({ DUT_DEVICE_ID: infos.DUT_DEVICE_ID, SENSOR_AUTOM: paramSet.SENSOR_AUTOM, REDEFINED_SENSORS: 0 }, userId);
    }
  }
  else if (infos.PLACEMENT === 'DUO') {
    let result;
    if (result) {
      const dutInfo = await sqldb.DUTS_DUO.getDutDuoInfo({ DUT_CODE: infos.DEV_ID });

      await deleteDutsAssociations(dutInfo, userId);

      await sqldb.DUTS_DUO.w_deleteFromDeviceCode({DEVICE_CODE: paramSet.DEV_ID}, userId);
    }
  }
}

async function deleteDutsAssociations(dutInfo?: { ASSET_HEAT_EXCHANGER_ID?: number, EVAPORATOR_ID?: number, CONDENSER_ID?: number, AIR_CURTAIN_ID?: number }, userId?: string) {
  if (dutInfo.ASSET_HEAT_EXCHANGER_ID) {
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_deleteRow({ DUT_DUO_ASSET_HEAT_EXCHANGER_ID: dutInfo.ASSET_HEAT_EXCHANGER_ID }, userId);
  }
  else if (dutInfo.EVAPORATOR_ID) {
    await sqldb.DUTS_DUO_EVAPORATORS.w_deleteRow({ DUT_DUO_EVAPORATORS_ID: dutInfo.EVAPORATOR_ID }, userId);
  }
  else if (dutInfo.CONDENSER_ID) {
    await sqldb.DUTS_DUO_CONDENSERS.w_deleteRow({ DUT_DUO_CONDENSER_ID: dutInfo.CONDENSER_ID }, userId);
  }
  else if (dutInfo.AIR_CURTAIN_ID) {
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_deleteRow({ DUT_DUO_AIR_CURTAIN_ID: dutInfo.AIR_CURTAIN_ID }, userId);
  }
}

const checkRelationWithRooms = async (paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string}, infos: Awaited<ReturnType<typeof sqldb.DUTS.getDevExtraInfo>>, userId: string) => {
  const roomEnvironment = await sqldb.DEVICES.getRoomFromDevicesInfo({ DEVICE_CODE: paramSet.DEV_ID });
  if (roomEnvironment) {
    if (infos.ROOM_ID !== paramSet.ROOM_ID) {
      await sqldb.DUTS_DEVICES_ROOMS.w_deleteRow({ ID: roomEnvironment.DUT_DEVICE_ROOM_ID }, userId);
      await sqldb.DUTS_DEVICES_ROOMS.w_insert({ DUT_DEVICE_ID: roomEnvironment.DUT_DEVICE_ID, ROOM_ID:paramSet.ROOM_ID }, userId);
    }
  }
  else if (paramSet.ROOM_ID) {
    await sqldb.DUTS_DEVICES_ROOMS.w_insert({ DUT_DEVICE_ID: infos.DUT_DEVICE_ID, ROOM_ID: paramSet.ROOM_ID }, userId);
  }
}

const handleEnvironmentChanges = async (paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string}, infos: Awaited<ReturnType<typeof sqldb.DUTS.getDevExtraInfo>>, userId: string) => { 
  // Se ficará sem ambiente (novo environment nulo), apaga tabelas de relação que utiliza dut e ambiente
  if (paramSet.ENVIRONMENT_ID === null) {
    await sqldb.DUTS_REFERENCE.w_deleteFromDeviceCode({ DEVICE_CODE: infos.DEV_ID}, userId);
    await sqldb.DUTS_MONITORING.w_deleteFromDeviceCode({ DEVICE_CODE: infos.DEV_ID}, userId);

    // Se trocou ambiente, faça nova seleção dos dados
    infos = await sqldb.DUTS.getDevExtraInfo({DEV_ID: paramSet.DEV_ID });
  }  
  // Se trocar ambiente, retirna relação de duts com ambiente atual e adiciona nova
  else if (paramSet.ENVIRONMENT_ID !== undefined && paramSet.ENVIRONMENT_ID !== infos.ENVIRONMENT_ID) {
    await sqldb.DUTS_REFERENCE.w_deleteFromDeviceCode({ DEVICE_CODE: infos.DEV_ID}, userId);
    await sqldb.DUTS_MONITORING.w_deleteFromDeviceCode({ DEVICE_CODE: infos.DEV_ID}, userId);
    
    const idMonitoring = await sqldb.DUTS_MONITORING.w_insert({ DUT_DEVICE_ID: infos.DUT_DEVICE_ID, ENVIRONMENT_ID: paramSet.ENVIRONMENT_ID }, userId);
    if (infos.MACHINE_REFERENCE) {
      await sqldb.DUTS_REFERENCE.w_insert({ DUT_MONITORING_ID: idMonitoring.insertId, MACHINE_ID: infos.MACHINE_REFERENCE }, userId);
    }
    await sqldb.ENVIRONMENTS.w_updateInfo({ ID: paramSet.ENVIRONMENT_ID, ...paramSet }, userId);

    // await sqldb.ENVIRONMENTS.w_deleteRow({ ID: infos.ENVIRONMENT_ID }, userId);
    // Se trocou ambiente, faça nova seleção dos dados
    infos = await sqldb.DUTS.getDevExtraInfo({DEV_ID: paramSet.DEV_ID });
  }
  // Caso contrário apenas atualiza demais dados que já estão inserido ou realiza inserção
  else if (paramSet.ENVIRONMENT_NAME) {
    if (!infos.ENVIRONMENT_ID) {
      const inserted = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: infos.UNIT_ID, ENVIRONMENT_NAME: paramSet.ENVIRONMENT_NAME, IS_VISIBLE: true, ENVIRONMENT_TYPE: ''}, userId);
      await sqldb.DUTS_MONITORING.w_insert({DUT_DEVICE_ID: infos.DUT_DEVICE_ID, ENVIRONMENT_ID: inserted.insertId}, userId);
      infos = await sqldb.DUTS.getDevExtraInfo({DEV_ID: paramSet.DEV_ID });
    }
    else {
      await sqldb.ENVIRONMENTS.w_updateInfo({ID: infos.ENVIRONMENT_ID, ENVIRONMENT_NAME: paramSet.ENVIRONMENT_NAME }, userId);
    }
  }
}

const handleRoomTypeChanges = async (paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string}, infos: Awaited<ReturnType<typeof sqldb.DUTS.getDevExtraInfo>>, userId: string) => {

  if (paramSet.RTYPE_ID !== undefined && paramSet.ENVIRONMENT_ID !== null && infos.RTYPE_ID !== paramSet.RTYPE_ID) {
    if (infos.RTYPE_ID) {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ID: infos.ENVIRONMENT_ROOM_TYPE_ID}, userId);
    }
    if (paramSet.RTYPE_ID) {
      if (!infos.ENVIRONMENT_ID) {
        const inserted = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: infos.UNIT_ID, ENVIRONMENT_NAME: paramSet.ENVIRONMENT_NAME || paramSet.DEV_ID, IS_VISIBLE: true, ENVIRONMENT_TYPE: ''}, userId);
        await sqldb.DUTS_MONITORING.w_insert({DUT_DEVICE_ID: infos.DUT_DEVICE_ID, ENVIRONMENT_ID: inserted.insertId}, userId);
        await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ ENVIRONMENT_ID: inserted.insertId, RTYPE_ID: paramSet.RTYPE_ID}, userId);
        infos = await sqldb.DUTS.getDevExtraInfo({DEV_ID: paramSet.DEV_ID });
      }
      else {
        await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ ENVIRONMENT_ID: infos.ENVIRONMENT_ID, RTYPE_ID: paramSet.RTYPE_ID}, userId);
      }
    }
  }
}

async function updateEnvironmentInfos(paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string}, userId: string){
  // OBS: Como ainda não há interface de cadastro de Ambientes, caso a rota esteja com paramSet.ENVIRONMENT_ID = undefined, é considerado o atual do banco (cadastrado via migração)
  let infos = await sqldb.DUTS.getDevExtraInfo({DEV_ID: paramSet.DEV_ID });

  await handleDutDuo(paramSet, infos, userId);

  // verifica se precisa atualizar relação com rooms
  await checkRelationWithRooms(paramSet, infos, userId);

  // Se trocou unidade, considera que está removendo o ambiente antigo oo DUT. Ambiente se manterá com unidade anterior
  if (infos.ENVIRONMENT_ID) {
    const environmentInfo = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: infos.ENVIRONMENT_ID});
    if (environmentInfo.UNIT_ID !== infos.UNIT_ID && paramSet.ENVIRONMENT_ID !== infos.ENVIRONMENT_ID) {
      paramSet.ENVIRONMENT_ID = null;
    }
  }

  await handleEnvironmentChanges(paramSet, infos, userId);

  if (paramSet.PLACEMENT !== undefined || paramSet.VARS !== undefined || paramSet.TEMPERATURE_OFFSET !== undefined) {
    await sqldb.DUTS_DEVICES.w_updateInfo({ID: infos.DUT_DEVICE_ID, ...paramSet}, userId);
  }

  await handleRoomTypeChanges(paramSet, infos, userId);
}

export async function setDutInfo(
  reqParams: httpRouter.ApiParams['/dut/set-dut-info'],
  userId: string,
  perms: { userCanEditDev: boolean, userCanAddNewInfo: boolean, clientChanged: boolean },
) {
  const devId = reqParams.DEV_ID;
  const hasIR = /^DUT[^0-2]/.test(devId); // Começa com DUT mas não pode ser DUT0, nem DUT1 nem DUT2.

  const { userCanEditDev, userCanAddNewInfo, clientChanged } = perms;
  if (!userCanEditDev) throw Error('Could not check basic dev info').HttpStatus(500);

  // Check if new dev
  let currentDevInfo = await sqldb.DUTS.getBasicInfo({ devId })
  if (currentDevInfo) {
    if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);
  } else {
    if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
    const deviceInfo = await sqldb.DEVICES.getDevicesInfo({ DEVICE_CODE: devId });
    if (!deviceInfo) throw Error('Could not find device!').HttpStatus(500);
    await sqldb.DUTS_DEVICES.w_insertIgnore({DEVICE_ID: deviceInfo.DEVICE_ID}, '[SYSTEM]');  
    currentDevInfo = await sqldb.DUTS.getBasicInfo({ devId })
  }

  const oldOffset = currentDevInfo.TEMPERATURE_OFFSET || null;
  const paramSet: Parameters<typeof sqldb.DUTS.w_update>[0]&{ENVIRONMENT_ID?: number, ENVIRONMENT_NAME?: string} = { DEV_ID: devId }
  if (reqParams.ROOM_NAME === '') reqParams.ROOM_NAME = null;
  if (reqParams.ROOM_NAME !== undefined) paramSet.ENVIRONMENT_NAME = reqParams.ROOM_NAME;
  if ((reqParams.RTYPE_ID as any) === '') reqParams.RTYPE_ID = null;
  if (reqParams.RTYPE_ID !== undefined) paramSet.RTYPE_ID = reqParams.RTYPE_ID;
  if (reqParams.ENVIRONMENT_ID !== undefined) paramSet.ENVIRONMENT_ID = reqParams.ENVIRONMENT_ID;
  if (reqParams.PLACEMENT !== undefined) {
    if (!['AMB', 'INS', 'DUO'].includes(reqParams.PLACEMENT)) throw Error('Valor inválido para o PLACEMENT').HttpStatus(400);
    paramSet.PLACEMENT = reqParams.PLACEMENT;
    if (reqParams.PLACEMENT !== 'DUO') paramSet.SENSOR_AUTOM = null;
  }
  if (reqParams.TEMPERATURE_OFFSET !== undefined) paramSet.TEMPERATURE_OFFSET = reqParams.TEMPERATURE_OFFSET;

  if (Object.keys(paramSet).length > 1) {
    await updateEnvironmentInfos(paramSet, userId);
  }

  if (reqParams.RTYPE_ID !== undefined) {
    eventHooks.ramCaches_DUTS_setDutRTypeId(devId, reqParams.RTYPE_ID);
  }

  if (hasIR) {
    // Se necessita alterar dados de automação (quando há multiprogramação, apenas a recurrent task responsável por isso pode executar alteração de automação)
    if ((reqParams.UPDATE_AUTOM_INFO === undefined || reqParams.UPDATE_AUTOM_INFO)){
      await setDutAutInfo({
        devId,
        USE_IR: reqParams.USE_IR,
        groups: reqParams.groups,
        MCHN_BRAND: reqParams.MCHN_BRAND,
        MCHN_MODEL: reqParams.MCHN_MODEL,
        ECO_OFST_START: reqParams.ECO_OFST_START,
        ECO_OFST_END: reqParams.ECO_OFST_END,
        TSETPOINT: reqParams.TSETPOINT,
        LTCRIT: reqParams.LTCRIT,
        RESENDPER: reqParams.RESENDPER,
        CTRLOPER: reqParams.CTRLOPER,
        PORTCFG: reqParams.PORTCFG,
        LTINF: reqParams.LTINF,
        UPPER_HYSTERESIS: reqParams.UPPER_HYSTERESIS,
        LOWER_HYSTERESIS: reqParams.LOWER_HYSTERESIS,
        SCHEDULE_START_BEHAVIOR: reqParams.SCHEDULE_START_BEHAVIOR,
        SCHEDULE_END_BEHAVIOR: reqParams.SCHEDULE_END_BEHAVIOR,
        FORCED_BEHAVIOR: reqParams.FORCED_BEHAVIOR,
        IR_ID_COOL: reqParams.IR_ID_COOL,
        ACTION_TIME: reqParams.ACTION_TIME,
        ACTION_MODE: reqParams.ACTION_MODE,
        ACTION_POST_BEHAVIOR: reqParams.ACTION_POST_BEHAVIOR
        }, perms, userId);
    }
    // Atualiza apenas informações de máquina e resender
    else {
      await setDutAutInfo({
        devId,
        USE_IR: undefined,
        groups: reqParams.groups,
        MCHN_BRAND: reqParams.MCHN_BRAND,
        MCHN_MODEL: reqParams.MCHN_MODEL,
        ECO_OFST_START: undefined,
        ECO_OFST_END: undefined,
        TSETPOINT: undefined,
        LTCRIT: undefined,
        RESENDPER: reqParams.RESENDPER,
        CTRLOPER: undefined,
        PORTCFG: undefined,
        LTINF: undefined,
        UPPER_HYSTERESIS: undefined,
        LOWER_HYSTERESIS: undefined,
        SCHEDULE_START_BEHAVIOR: undefined,
        SCHEDULE_END_BEHAVIOR: undefined,
        FORCED_BEHAVIOR: undefined,
        IR_ID_COOL: undefined,
        ACTION_TIME: undefined,
        ACTION_MODE: undefined,
        ACTION_POST_BEHAVIOR: undefined,
        }, perms, userId);
    }
  }
  const offset = await getOffsetDevCode(devId);
  const lastCfgModif = new Date(Date.now() + offset * 60 * 60 * 1000);
  const lastCfgModifToUpdate = `${lastCfgModif.getUTCFullYear()}-${zeroPad(lastCfgModif.getUTCMonth() + 1, 2)}-${zeroPad(lastCfgModif.getUTCDate(), 2)} ${zeroPad(lastCfgModif.getUTCHours(), 2)}:${zeroPad(lastCfgModif.getUTCMinutes(), 2)}:${zeroPad(lastCfgModif.getUTCSeconds(), 2)}`;
  await sqldb.DEVICES.w_updateInfo({ DEVICE_CODE: devId, LAST_CFG_MODIF: lastCfgModifToUpdate }, null);

  const info = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: devId });
  eventHooks.ramCaches_DUTS_setDutRoomPars(info.DEV_ID, info.RTYPE_ID, info.VARS);

  if (reqParams.TEMPERATURE_OFFSET !== oldOffset) {
    brokerMQTT.publish_iotRelay_informDeviceChanges(info.DEV_ID);
  }
  
  return {
    DEV_ID: info.DEV_ID,
    ROOM_NAME: info.ROOM_NAME,
    UNIT_ID: info.UNIT_ID,
    RTYPE_ID: info.RTYPE_ID,
    RTYPE_NAME: info.RTYPE_NAME,
    CLIENT_ID: info.CLIENT_ID,
    UNIT_NAME: info.UNIT_NAME,
    ENVIRONMENT_ID: info.ENVIRONMENT_ID
  }
}

export const updateDutInfoSchedule: API_Internal['/diel-internal/api-async/updateDutInfoSchedule'] = async function (reqParams) {
  return setDutInfo({
    DEV_ID: reqParams.DEV_ID,
    CTRLOPER: reqParams.CTRLOPER,
    LTCRIT: reqParams.LTCRIT,
    LTINF: reqParams.LTINF,
    PORTCFG: reqParams.PORTCFG,
    TSETPOINT: reqParams.TSETPOINT,
    USE_IR: reqParams.USE_IR,
    groups: reqParams.groups,
    UPPER_HYSTERESIS: reqParams.UPPER_HYSTERESIS,
    LOWER_HYSTERESIS: reqParams.LOWER_HYSTERESIS,
    SCHEDULE_START_BEHAVIOR: reqParams.SCHEDULE_START_BEHAVIOR,
    SCHEDULE_END_BEHAVIOR: reqParams.SCHEDULE_END_BEHAVIOR,
    FORCED_BEHAVIOR: reqParams.FORCED_BEHAVIOR,
    UPDATE_AUTOM_INFO: reqParams.UPDATE_AUTOM_INFO,
    IR_ID_COOL: reqParams.IR_ID_COOL,
    ACTION_MODE: reqParams.ACTION_MODE,
    ACTION_TIME: reqParams.ACTION_TIME,
    ACTION_POST_BEHAVIOR: reqParams.ACTION_POST_BEHAVIOR
  }, reqParams.userId, { userCanEditDev: true, userCanAddNewInfo: false, clientChanged: false });
}

httpRouter.privateRoutes['/dut/delete-dut-info'] = async function deleteDevInfo (reqParams, session) {
  const devInf = reqParams.dutId && await sqldb.DEVICES.getBasicInfo({ devId: reqParams.dutId });
  if (!devInf) throw Error(`Dispositivo não encontrado: ${reqParams.dutId}`).HttpStatus(400);
  const perms = await getPermissionsOnClient(session, devInf.CLIENT_ID);
  if (!perms.canDeleteDevs) throw Error('Permission denied!').HttpStatus(403);

  const { affectedRows } = await devInfo.deleteDev({ DEV_ID: reqParams.dutId }, session.user);

  return 'DELETED ' + affectedRows;
}

async function setDutAutInfo (reqParams: {
  devId: string,
  USE_IR: 0|1,
  groups: string[],
  MCHN_BRAND: string,
  MCHN_MODEL: string,
  ECO_OFST_START: number,
  ECO_OFST_END: number,
  TSETPOINT: number,
  LTCRIT: number,
  RESENDPER: number,
  CTRLOPER: ControlMode,
  PORTCFG: 'IR'|'RELAY',
  LTINF: number,
  UPPER_HYSTERESIS: number,
  LOWER_HYSTERESIS: number,
  SCHEDULE_START_BEHAVIOR: string,
  SCHEDULE_END_BEHAVIOR: string,
  FORCED_BEHAVIOR: string,
  IR_ID_COOL: string,
  ACTION_MODE: string,
  ACTION_TIME: number,
  ACTION_POST_BEHAVIOR: string
}, extras: {
  userCanEditDev: boolean,
  userCanAddNewInfo: boolean,
  clientChanged: boolean,
}, userId: string) {
  const { userCanEditDev, userCanAddNewInfo, clientChanged } = extras;

  let currentDutInfo = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: reqParams.devId });
  // Check if new dev to automation on each machine
  if(reqParams.groups && reqParams.groups.length > 0){
    for (const group of reqParams.groups) {
      let currentDutInfoMachine = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: reqParams.devId, MACHINE_ID: Number(group) });
      if (currentDutInfoMachine) {
        if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);
      } else {
        if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
        await controlAutomMachine({groupId: Number(group), automation: {DEV_AUT: reqParams.devId, DUT_ID: reqParams.devId}}, userId);  
        currentDutInfo = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: reqParams.devId });
      }
    }
  }

  if ([0, 1, null, undefined].includes(reqParams.USE_IR)) {
    // OK
  }
  else throw Error('Invalid USE_IR value').HttpStatus(400)
  if (['0_NO_CONTROL', '1_CONTROL', '2_SOB_DEMANDA', '3_BACKUP', '4_BLOCKED', '5_BACKUP_CONTROL', '6_BACKUP_CONTROL_V2', '7_FORCED', '8_ECO_2', undefined].includes(reqParams.CTRLOPER)) {
    // OK
  }
  else throw Error('Invalid CTRLOPER value').HttpStatus(400);
  if (['IR', 'RELAY', undefined].includes(reqParams.PORTCFG)) {
    // OK
  }
  else throw Error('Invalid PORTCFG value').HttpStatus(400);

  const currentlyUsingRelay = currentDutInfo && (currentDutInfo.DISAB !== 1);
  const finalIrEnabled = !!((reqParams.USE_IR !== undefined) ? reqParams.USE_IR : (currentDutInfo && !currentDutInfo.DISAB));
  if (finalIrEnabled && !currentlyUsingRelay) {
    await groups.onDutAutomEnabling(reqParams.devId, userId);
  }

  const paramSet: {
    DUT_ID: string,
    DISAB: number
    LAST_AUTOMATION_DEVICE_TYPE?: string,
    LAST_PROG?: string,
    DESIRED_PROG?: string,
    ACTION_MODE?: string,
    ACTION_POST_BEHAVIOR?: string,
    ACTION_TIME?: number,
    MODE?: string,
    FORCED_BEHAVIOR?: string,
    IR_ID_COOL?: string,
    LOWER_HYSTERESIS?: number,
    UPPER_HYSTERESIS?: number,
    LTC?: number,
    LTI?: number,
    SCHEDULE_END_BEHAVIOR?: string,
    SCHEDULE_START_BEHAVIOR?: string,
    SETPOINT?: number,
    LAST_CHANGE_IN_MULTIPLE_SCHEDULE?: string,
    PORT_CFG?: string,
    RESENDPER?: number,
    DAT_BEGAUT?: string,
    ECO_CFG?: string,
    ECO_INT_TIME?: number,
    ECO_OFST_START?: number,
    ECO_OFST_END?: number,
    ENABLE_ECO?: number,
    EXT_THERM_CFG?: string,
    FAULTS_DATA?: string,
    FU_NOM?: number,
    MAXIMUM_TEMPERATURE?: number,
    MINIMUM_TEMPERATURE?: number,
    SELF_REFERENCE?: number,
    SETPOINT_ECO_REAL_TIME?: number,
    MCHN_BRAND?: string
    MCHN_MODEL?: string
  } = {
    DUT_ID: reqParams.devId,
    DISAB: finalIrEnabled ? 0 : 1,
    MCHN_BRAND: reqParams.MCHN_BRAND,
    MCHN_MODEL: reqParams.MCHN_MODEL,
    MODE: reqParams.CTRLOPER,
    PORT_CFG: reqParams.PORTCFG,
  };

  paramSet.LAST_AUTOMATION_DEVICE_TYPE = 'DUT';
  if (reqParams.TSETPOINT !== undefined) paramSet.SETPOINT = Number(reqParams.TSETPOINT);
  if (reqParams.RESENDPER !== undefined) paramSet.RESENDPER = Number(reqParams.RESENDPER);
  if (reqParams.LTCRIT !== undefined) paramSet.LTC = Number(reqParams.LTCRIT);
  if (reqParams.LTINF !== undefined) paramSet.LTI = Number(reqParams.LTINF);
  if (reqParams.UPPER_HYSTERESIS !== undefined) paramSet.UPPER_HYSTERESIS = Number(reqParams.UPPER_HYSTERESIS);
  if (reqParams.LOWER_HYSTERESIS !== undefined) paramSet.LOWER_HYSTERESIS = Number(reqParams.LOWER_HYSTERESIS);
  if (reqParams.SCHEDULE_START_BEHAVIOR !== undefined) paramSet.SCHEDULE_START_BEHAVIOR = reqParams.SCHEDULE_START_BEHAVIOR;
  if (reqParams.SCHEDULE_END_BEHAVIOR !== undefined) paramSet.SCHEDULE_END_BEHAVIOR = reqParams.SCHEDULE_END_BEHAVIOR;
  if (reqParams.FORCED_BEHAVIOR !== undefined) paramSet.FORCED_BEHAVIOR = reqParams.FORCED_BEHAVIOR;
  if (reqParams.IR_ID_COOL !== undefined) paramSet.IR_ID_COOL = reqParams.IR_ID_COOL;
  if (reqParams.ACTION_MODE !== undefined) paramSet.ACTION_MODE = reqParams.ACTION_MODE;
  if (reqParams.ACTION_TIME !== undefined) paramSet.ACTION_TIME = Number(reqParams.ACTION_TIME);
  if (reqParams.ACTION_POST_BEHAVIOR !== undefined) paramSet.ACTION_POST_BEHAVIOR = reqParams.ACTION_POST_BEHAVIOR;

  if (clientChanged) {
    paramSet.DAT_BEGAUT = null;
  }
  const isAutomationEnabled = !!reqParams.USE_IR;
  if (isAutomationEnabled && (clientChanged || !currentDutInfo.DAT_BEGAUT)) {
    paramSet.DAT_BEGAUT = now_shiftedTS_s(true);
  }
  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: paramSet.DUT_ID});
  if (currentAutomationId) {
    await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
      ID: currentAutomationId.ID,
      ...paramSet,
    }, userId);
  }

  const dutsAutomation = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo({ DEVICE_CODE: reqParams.devId });
  if (dutsAutomation.length) {
    for (const dutAutomation of dutsAutomation) {
      await sqldb.DUTS_AUTOMATION.w_updateInfo({ ID: dutAutomation.DUT_AUTOMATION_ID, DISAB: paramSet.DISAB }, userId);
    }
  }

  currentDutInfo = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: reqParams.devId });

  if (paramSet.IR_ID_COOL && paramSet.MODE === '7_FORCED' && paramSet.FORCED_BEHAVIOR === 'dut-forced-cool') {
    await defineIrCodeAction({ IR_ID: reqParams.IR_ID_COOL, CMD_TYPE: 'AC_COOL', CMD_DESC: undefined, TEMPER: reqParams.TSETPOINT }, paramSet.DUT_ID, userId);
  }

  
  // Setar modelo de máquinas
  if (reqParams.groups && (reqParams.MCHN_MODEL || reqParams.MCHN_BRAND)) {
    for (const group of reqParams.groups) {
      if (reqParams.MCHN_BRAND) {
        await sqldb.MACHINES.w_update({MACHINE_ID: Number(group), MACHINE_BRAND: reqParams.MCHN_BRAND }, userId);
      }
      if (reqParams.MCHN_MODEL) {
        const assetsFromMachine = await sqldb.ASSETS.getAssetInfoList({MACHINE_ID: Number(group)});
        if (assetsFromMachine.length > 0) {
          for (const asset of assetsFromMachine) {
            await sqldb.ASSETS.w_update({ASSET_ID: asset.ASSET_ID, MODEL: reqParams.MCHN_MODEL}, userId);
          }
        }
        else {
          const machineInfo = await sqldb.MACHINES.getMachineInfo({MACHINE_ID: Number(group)});
          if (machineInfo) {
            const insertedAsset = await sqldb.ASSETS.w_insertIgnore({MODEL: reqParams.MCHN_MODEL, NAME: 'Ativo - EV'}, userId);
            const inserted = await sqldb.EVAPORATORS.w_insert({MACHINE_ID: Number(group), ASSET_ID: insertedAsset.insertId}, userId);
          }
        }
      }
    }
  }

  //Check GROUP(s)
  if (currentDutInfo && currentDutInfo.UNIT_ID == null) {
    reqParams.groups = [];
  }
  if (reqParams.groups) {
    const allowedMachines = await sqldb.MACHINES.getMachinesList({ UNIT_ID: currentDutInfo.UNIT_ID, CLIENT_IDS: [currentDutInfo.CLIENT_ID] });
    const allowedMachinesIds = allowedMachines.map(machine => machine.MACHINE_ID);
    const filteredMachines = reqParams.groups.map(x => Number(x)).filter(id => allowedMachinesIds.includes(id));
    await groups.setMachinesDut(reqParams.devId, finalIrEnabled, filteredMachines, userId);
  }
}

export async function deleteDut (qPars: { DEV_ID: string }, userId: string) {
  await sqldb.DUTS_DEVICES_IMAGES.w_deleteFromDut(qPars, userId);
  await groups.removingDut({ DUT_ID: qPars.DEV_ID }, userId);
  await sqldb.FANCOILS.w_removeDut({DUT_ID_FROM_ROOM: qPars.DEV_ID}, userId);

  const irCodes = await sqldb.DUTS_IR_CODES.getAllCodesByDutCode({DUT_CODE: qPars.DEV_ID});
  const irCodesIds = irCodes.map((ir) => ir.ID);
  await sqldb.DUTS_IR_CODES.w_deleteFromDut({DUT_CODE: qPars.DEV_ID}, userId);
  if (irCodesIds.length) {
    await sqldb.IR_CODES.w_deleteIrCodeByIds({IDs: irCodesIds}, userId);
  }
  
  await sqldb.DUTS_REFERENCE.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  await sqldb.DUTS_MONITORING.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);

  // Delete DUT_DUO e suas relações
  const dutInfo = await sqldb.DUTS_DUO.getDutDuoInfo({ DUT_CODE: qPars.DEV_ID });
  await deleteDutsAssociations(dutInfo, userId);
  await sqldb.DUTS_DUO.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  
  await sqldb.DUTS_AUTOMATION.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  await sqldb.DUTS_DEVICES_ROOMS.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  const { affectedRows } = await sqldb.DUTS_DEVICES.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  eventHooks.ramCaches_DUTS_deleteDutRoomPars(qPars.DEV_ID);
}

export async function verifyIdsNotNullDutsDuo(assetHeatExchangerIds?: number[], evaporatorIds?: number[], condenserIds?: number[], air_curtainIds?: number[], userId?: string) {
  if (assetHeatExchangerIds && assetHeatExchangerIds.length) {
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_deleteRowsAssetHeatExchangers(assetHeatExchangerIds, userId);
  }
  else if (evaporatorIds && evaporatorIds.length) {
    await sqldb.DUTS_DUO_EVAPORATORS.w_deleteRowsEvaporators(evaporatorIds, userId);
  }
  else if (condenserIds && condenserIds.length) {
    await sqldb.DUTS_DUO_CONDENSERS.w_deleteRowsCondensers(condenserIds, userId);
  }
  else if (air_curtainIds && air_curtainIds.length) {
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_deleteRowsAirCurtains(air_curtainIds, userId);
  }
}

export async function deleteClientDuts (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DUTS_DEVICES_IMAGES.w_deleteFromClientDuts(qPars, userId);
  await groups.removingClientDuts(qPars, userId);

  const irCodes = await sqldb.DUTS_IR_CODES.getAllCodesByClientId({ CLIENT_ID: qPars.CLIENT_ID});
  const irCodesId = irCodes.map((ir) => (ir.ID));
  await sqldb.DUTS_IR_CODES.w_deleteFromClientDuts({CLIENT_ID: qPars.CLIENT_ID}, userId);
  if (irCodesId.length) {
    await sqldb.IR_CODES.w_deleteIrCodeByIds({IDs: irCodesId }, userId);
  }

  await sqldb.DUTS_REFERENCE.w_deleteFromClient(qPars, userId);
  await sqldb.DUTS_MONITORING.w_deleteFromClient(qPars, userId);
  
  const duts_info = await sqldb.DUTS_DUO.getDutDuoInfoByClient({ CLIENT_ID: qPars.CLIENT_ID}, userId);

  const assetHeatExchangerIds = duts_info.map(dut => dut.ASSET_HEAT_EXCHANGER_ID).filter(Boolean);
  const evaporatorIds = duts_info.map(dut => dut.EVAPORATOR_ID).filter(Boolean);
  const condenserIds = duts_info.map(dut => dut.CONDENSER_ID).filter(Boolean);
  const air_curtainIds = duts_info.map(dut => dut.AIR_CURTAIN_ID).filter(Boolean);

  await verifyIdsNotNullDutsDuo(assetHeatExchangerIds, evaporatorIds, condenserIds, air_curtainIds, userId);
  
  await sqldb.DUTS_DUO.w_deleteFromClient(qPars, userId);

  await sqldb.DUTS_AUTOMATION.w_deleteFromClient(qPars, userId);
  await sqldb.DUTS_DEVICES_ROOMS.w_deleteFromClient(qPars, userId);
  await sqldb.DUTS_DEVICES.w_deleteFromClient(qPars, userId);
  await eventHooks.ramCaches_DUTS_loadDutRoomTypes();
}

httpRouter.privateRoutes['/dut/set-visibility'] = async function (reqParams, session) {
  if (!reqParams.dutsList || !reqParams.unitId || !reqParams.clientId ) throw Error('There was an error!\nInvalid properties. Missing dutsList.').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, reqParams.clientId, reqParams.unitId );
  if (!perms.canManageDevs) throw Error('You dont have the permission').HttpStatus(403);
  await Promise.all(
    reqParams.dutsList.map(async (dut) => {
      if (dut.DEV_ID.startsWith('DUT')) { await sqldb.DUTS.setVisibilityofDuts({ dutId: dut.DEV_ID, isVisible: dut.ISVISIBLE });}
      else { await sqldb.VAVS.setVisibilityofVAVs({ vavId: dut.DEV_ID, isVisible: dut.ISVISIBLE }) }
    })
  ).catch((err) => {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error change visibility ').HttpStatus(408);
  });
  const dutsList = await sqldb.DEVICES.getDutsInnerDevsToGetVisibility({ CLIENT_ID: reqParams.clientId, UNIT_ID: reqParams.unitId });
  const formatedDutList = arraySort.alphabeticOrderVisibilityDEV_ID(dutsList);
  return formatedDutList;
}

httpRouter.privateRoutes['/dut/get-visibility'] = async function (reqParams, session) {
  if (!reqParams.unitId || !reqParams.clientId) throw Error('There was an error!\nInvalid properties.').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, reqParams.clientId, reqParams.unitId );
  if (!perms.canViewDevs) throw Error('You dont have the permission').HttpStatus(401);
  try {
    const devsList = await sqldb.DEVICES.getDutsInnerDevsToGetVisibility({ CLIENT_ID: reqParams.clientId, UNIT_ID: reqParams.unitId })
    const formatedDutList = arraySort.alphabeticOrderVisibilityDEV_ID(devsList);
    return formatedDutList;
  } catch (err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error get list of duts').HttpStatus(408);
  };
}

/**
 * @swagger
 * /dut/set-dut-rtype-v2:
 *   post:
 *     summary: Editar room type dos dispositivos
 *     description: Editar room type dos dispositivos
 *     tags:
 *       - DUT - RoomType
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados dos dispositivos
 *         schema:
 *           type: object
 *           properties:
 *             DEV_INFO:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    DEV_ID:
 *                      type: string
 *                    ENV_ID:
 *                      type: number
 *               exemple:
 *                 - DEV_ID: DUT0000001
 *                   ENV_ID: 1
 *               description: Array de objetos contendo as informações do ambiente.
 *               default: []
 *               required: true
 *             RTYPE_ID:
 *               type: number
 *               description: ID do tipo de sala
 *               default: 1
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: CLIENT_ID
 *               default: 1
 *               required: true
 *     responses:
 *       200:
 *         description: Edição feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       401:
 *         description: Sem permissão para editar
 *       500:
 *         description: Erro interno do servidor
 */
 
const deleteOrInsertUpdade = async (devs: {
  DEV_ID: string;
  ENV_ID: number;
}, session: SessionData, reqParams: httpRouter.ApiParams['/dut/set-dut-rtype-v2']) => {
  if (reqParams.RTYPE_ID === null) {
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ ENVIRONMENT_ID: devs.ENV_ID }, session.user);
  } else {
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insertUpdate({ ENVIRONMENT_ID: devs.ENV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
  }    
}

export const setDutRTypeV2 = async (reqParams: httpRouter.ApiParams['/dut/set-dut-rtype-v2'], session: SessionData) => {
  if (!reqParams.DEVS_INFO || (reqParams.RTYPE_ID === undefined)) throw Error('There was an error! Invalid properties.').HttpStatus(400);

  try {
    for (const devs of reqParams.DEVS_INFO) {
      const devClient = await sqldb.DEVICES.getClientInfo({ devId: devs.DEV_ID });
      const permission = await getPermissionsOnClient(session, devClient && devClient.CLIENT_ID);
      if (!permission.canManageDevs) {
        throw Error('You dont have permission').HttpStatus(401);
      }
      if (devs.DEV_ID.startsWith('DUT')) {
        await DutOrWithoutIdDutSetTypeOfEnvironmentV2(devs, reqParams, session);
      }
      else if (devs.DEV_ID.startsWith('DRI')) {
        if (reqParams.RTYPE_ID === null) {
          await sqldb.VAVS.w_insertUpdateNullRType({ VAV_ID: devs.DEV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
        } else {
          await sqldb.VAVS.w_insertUpdate({ VAV_ID: devs.DEV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
        }
      }
      else if (!devs.DEV_ID.startsWith('DUT') && !devs.DEV_ID.startsWith('DRI')) {
        await deleteOrInsertUpdade(devs, session, reqParams);
      }
    }
  } catch(err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error update room type of environments').HttpStatus(408);
  };
  return 'OK';
}

async function DutOrWithoutIdDutSetTypeOfEnvironmentV2(dev: {
  DEV_ID: string;
  ENV_ID: number;
}, reqParams: httpRouter.ApiParams['/dut/set-dut-rtype-v2'], session: SessionData) {
  if (!dev.ENV_ID) {
    return;
  }
  if (reqParams.RTYPE_ID !== null) {
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insertUpdate({ ENVIRONMENT_ID: dev.ENV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
  }
  else if (reqParams.RTYPE_ID === null) {
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ ENVIRONMENT_ID: dev.ENV_ID }, session.user);
  }
  const devInfo = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: dev.DEV_ID })
  eventHooks.ramCaches_DUTS_setDutRTypeId(dev.DEV_ID, reqParams.RTYPE_ID);
  eventHooks.ramCaches_DUTS_setDutRoomPars(dev.DEV_ID, devInfo.RTYPE_ID, devInfo.VARS);
}

httpRouter.privateRoutes['/dut/set-dut-rtype-v2'] = setDutRTypeV2;

export const setDutRType = async (reqParams:{
  DEV_IDS: {
    DEV_ID: string,
    ENVIRONMENT_ID: number,
    ROOM_NAME: string,
    RTYPE_ID: number,
    ENVIRONMENTS_ROOM_TYPES_ID: number
  }[],
  RTYPE_ID: number | null,
  CLIENT_ID: number }, session: SessionData) => {
  if (!reqParams.DEV_IDS || !reqParams.CLIENT_ID) throw Error('There was an error! Invalid properties.').HttpStatus(400);
  const permission = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!permission.canManageDevs) {
    throw Error('You dont have permission').HttpStatus(401);
  }
  await Promise.all(
    reqParams.DEV_IDS.map(async (dev) => {
      if (dev.RTYPE_ID !== reqParams.RTYPE_ID) {
        if (!dev.DEV_ID.startsWith('DRI') && dev.ENVIRONMENT_ID !== null) {
          await DutOrWithoutIdDutSetTypeOfEnvironment(dev, reqParams, session);
        }
        else if (dev.DEV_ID?.startsWith('DRI')) {
          if (reqParams.RTYPE_ID === null) {
            await sqldb.VAVS.w_insertUpdateNullRType({ VAV_ID: dev.DEV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
          } else {
            await sqldb.VAVS.w_insertUpdate({ VAV_ID: dev.DEV_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user);
          }
        }
      }
    })
  ).catch((err) => {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error update room type of environments').HttpStatus(408);
  });
  return 'OK';
}

async function DutOrWithoutIdDutSetTypeOfEnvironment(dev: {
  DEV_ID: string;
  ENVIRONMENT_ID: number;
  ROOM_NAME: string;
  RTYPE_ID: number;
  ENVIRONMENTS_ROOM_TYPES_ID: number;
}, reqParams: {
  DEV_IDS: {
    DEV_ID: string,
    ENVIRONMENT_ID: number,
    ROOM_NAME: string,
    RTYPE_ID: number,
    ENVIRONMENTS_ROOM_TYPES_ID: number
  }[],
  RTYPE_ID: number | null,
  CLIENT_ID: number
}, session: SessionData) {
  if (dev.ROOM_NAME && reqParams.RTYPE_ID !== null) {
    if (dev.ENVIRONMENTS_ROOM_TYPES_ID && dev.ENVIRONMENTS_ROOM_TYPES_ID !== null) {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_updateInfo({ ID: dev.ENVIRONMENTS_ROOM_TYPES_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user)
    }
    else if (dev.ENVIRONMENT_ID !== null) {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ ENVIRONMENT_ID: dev.ENVIRONMENT_ID, RTYPE_ID: reqParams.RTYPE_ID }, session.user)
    }
  } 
  else if (dev.ROOM_NAME && reqParams.RTYPE_ID === null) {
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ID: dev.ENVIRONMENTS_ROOM_TYPES_ID}, session.user);
  }
  if (dev.DEV_ID.startsWith('DUT')) {
    const devInfo = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: dev.DEV_ID })
    eventHooks.ramCaches_DUTS_setDutRTypeId(dev.DEV_ID, reqParams.RTYPE_ID);
    eventHooks.ramCaches_DUTS_setDutRoomPars(dev.DEV_ID, dev.RTYPE_ID, devInfo.VARS);
  }
}

httpRouter.privateRoutesDeprecated['/dut/set-dut-rtype'] = setDutRType;

/**
 * @swagger
 * /dut/delete-environments:
 *   post:
 *     summary: Editar room type dos dispositivos
 *     description: Editar room type dos dispositivos
 *     tags:
 *       - DUT - Delete Environment
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados dos dispositivos
 *         schema:
 *           type: object
 *           properties:
 *             DEV_INFO:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    DEV_ID:
 *                      type: string
 *                    ENV_ID:
 *                      type: number
 *               exemple:
 *                 - DEV_ID: DUT0000001
 *                   ENV_ID: 1
 *               description: Array de objetos contendo as informações do ambiente.
 *               default: []
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: CLIENT_ID
 *               default: 1
 *               required: true
 *     responses:
 *       200:
 *         description: Edição feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       401:
 *         description: Sem permissão para editar
 *       500:
 *         description: Erro interno do servidor
 */

export const deleteEnvironmentMultiProgDuts = async (reqParams:  httpRouter.ApiParams['/dut/delete-environments'], session: SessionData) => {
  if (!reqParams.DEVS_INFO) throw Error('There was an error! Invalid properties.').HttpStatus(400);
  try {
    for (const devs of reqParams.DEVS_INFO) {
      if (!devs.ENV_ID) {
        continue;
      }
      const info = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ ENVIRONMENT_ID: devs.ENV_ID });
      const permission = await getPermissionsOnClient(session, info && info.CLIENT_ID);
      if (!permission.canManageDevs) {
        throw Error('You dont have permission').HttpStatus(401);
      }
      await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({ DEVICE_CODE: devs.DEV_ID }, session.user);
      await sqldb.DEVICES_CLIENTS.w_deleteFromDeviceCode({ DEVICE_CODE: devs.DEV_ID }, session.user);
      await sqldb.DUTS_REFERENCE.w_deleteRowFromEnvironment({ ENVIRONMENT_ID: devs.ENV_ID }, session.user);
      await sqldb.DUTS_MONITORING.w_deleteRow({ ENVIRONMENT_ID: devs.ENV_ID }, session.user);
      await sqldb.REFRIGERATES.w_deleteRow({ ENVIRONMENT_ID: devs.ENV_ID }, session.user);
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ ENVIRONMENT_ID: devs.ENV_ID }, session.user);
      await sqldb.ENVIRONMENTS.w_deleteRow({ ID: devs.ENV_ID }, session.user);
    }
  } catch(err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error delete environments').HttpStatus(408);
  };
  return 'OK';
}

httpRouter.privateRoutes['/dut/delete-environments'] = deleteEnvironmentMultiProgDuts;

/**
 * @swagger
 * /dut/get-dut-duo-list:
 *   post:
 *     summary: Obter lista de DUT e Duo
 *     description: Retorna uma lista de DUT e dispositivos Duo com base nos parâmetros fornecidos.
 *     tags:
 *       - DUT - Get DUT Duo List
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: reqParams
 *         in: body
 *         description: Parâmetros de requisição para filtrar os dispositivos.
 *         schema:
 *           type: object
 *           properties:
 *             clientId:
 *               type: number
 *               description: ID do cliente. Será convertido para um array de IDs de clientes.
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: Array de IDs de clientes.
 *             stateId:
 *               type: string
 *               description: ID do estado.
 *             stateIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: Array de IDs de estados.
 *             cityId:
 *               type: string
 *               description: ID da cidade.
 *             cityIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: Array de IDs de cidades.
 *             unitId:
 *               type: number
 *               description: ID da unidade. Será convertido para um array de IDs de unidades.
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: Array de IDs de unidades.
 *             groupId:
 *               type: number
 *               description: ID do grupo. Será convertido para um array de IDs de grupos.
 *             groupIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: Array de IDs de grupos.
 *             INCLUDE_INSTALLATION_UNIT:
 *               type: boolean
 *               description: Indica se deve incluir a unidade de instalação.
 *         required: true
 *     responses:
 *       200:
 *         description: Lista de DUT e Duo obtida com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Lista de dispositivos DUT e Duo.
 *                 totalItems:
 *                   type: number
 *                   description: Número total de itens na lista.
 *       400:
 *         description: Parâmetros de requisição inválidos.
 *       401:
 *         description: Sem permissão para acessar.
 *       500:
 *         description: Erro interno do servidor.
 */

httpRouter.privateRoutes['/dut/get-dut-duo-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.groupId) { reqParams.groupIds = [reqParams.groupId]; }
  delete reqParams.groupId;
  if (reqParams.unitId) { reqParams.unitIds = [reqParams.unitId]; }
  delete reqParams.unitId;
  
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const addUnownedDevs = (!!session.permissions.MANAGE_UNOWNED_DEVS);

  const qPars: Parameters<typeof sqldb.DUTS_DUO.getDutsDuoList_dutsAndAssetsFancoil>[0] = {
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    machineIds: reqParams.groupIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }

  const assetsDutsDuo = await sqldb.DUTS_DUO.getDutsDuoList_dutsAndAssetsFancoil(qPars, { addUnownedDevs });

  const totalItems = assetsDutsDuo.length;

  return {list: assetsDutsDuo, totalItems};
}


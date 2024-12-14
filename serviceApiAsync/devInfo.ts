import sqldb from '../srcCommon/db'
import { SessionData } from '../srcCommon/types'
import { ControlMsgFirmwareVersion, TelemetryPackRawDMT } from '../srcCommon/types/devicesMessages'
import * as dacInfo from './dacInfo'
import * as dutInfo from './dutInfo'
import * as damInfo from './damInfo'
import * as driInfo from './dri/driInfo'
import * as dmaInfo from './dmaInfo'
import * as dmtInfo from './dmt/dmtInfo'
import * as dalInfo from './dal/dalInfo'
import * as eventHooks from './realTime/eventHooks'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm'
import * as httpRouter from './apiServer/httpRouter'
import { ApiResps } from './apiServer/httpRouter'
import * as dacData from '../srcCommon/helpers/dacData'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import * as scheduleData from '../srcCommon/helpers/scheduleData'
import servConfig from '../configfile'
import { compareVersions, parseFirmwareVersion, versionIsAtLeast, VersionNumber } from '../srcCommon/helpers/fwVersion'
import { logger } from '../srcCommon/helpers/logger'
import { ControlMode, operatesEcoMode } from '../srcCommon/helpers/dutAutomation';
import { canSeeDevicesWithoutProductionUnit, checkDevEditPermission, getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit } from '../srcCommon/helpers/permissionControl';
import { sendCommandToDeviceWithConfigTimezone } from '../srcCommon/helpers/timezones'
import * as momentTimezone from 'moment-timezone';
import { calculateStatus, isTemporaryId } from '../srcCommon/helpers/devInfo'
import { getDutsUsedAsRefByDam } from '../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'
import { parseDriVarsCfg } from '../srcCommon/dri/driInfo'
import { getDrisCfgFormulas, loadDrisCfg } from '../srcCommon/helpers/ramcacheLoaders/drisCfgLoader'
import { applicationType, loadDriCfg } from './telemHistory/driHist'
import API_private from '../srcCommon/types/api-private'
import { powerConv_kW } from '../srcCommon/helpers/conversion'
import { hoursMinutesToSeconds } from '../srcCommon/helpers/dates';

const dutModeMinimumVersion: { mode: ControlMode|string, minimumVersion: VersionNumber }[] = [
  {
    mode: '0_NO_CONTROL',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    }
  },
  {
    mode: '1_CONTROL',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    }
  },
  {
    mode: '2_SOB_DEMANDA',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    },
  },
  {
    mode: '3_BACKUP',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    }
  },
  {
    mode: '4_BLOCKED',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    }
  },
  {
    mode: '5_BACKUP_CONTROL',
    minimumVersion: {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    }
  },
  {
    mode: '6_BACKUP_CONTROL_V2',
    minimumVersion: {
      vMajor: 2,
      vMinor: 1,
      vPatch: 3,
    }
  },
  {
    mode: '7_FORCED',
    minimumVersion: {
      vMajor: 2,
      vMinor: 1,
      vPatch: 3,
    }
  },
  {
    mode: '8_ECO_2',
    minimumVersion: {
      vMajor: 2,
      vMinor: 3,
      vPatch: 8,
    }
  },
  {
    mode: 'dut-forced-cool',
    minimumVersion: {
      vMajor: 2,
      vMinor: 1,
      vPatch: 3,
    }
  },
  {
    mode: 'dut-forced-fan',
    minimumVersion: {
      vMajor: 2,
      vMinor: 3,
      vPatch: 6,
    }
  },
];

async function deleteDutDuoAndAssociations(dut: string, dev_id:string, sessionUser: string, ): Promise<void> {
  const dutInfo = await sqldb.DUTS_DUO.getDutDuoInfo({ DUT_CODE: dut });

  if (dutInfo && dutInfo.ASSET_HEAT_EXCHANGER_ID) {
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_deleteRow({ DUT_DUO_ASSET_HEAT_EXCHANGER_ID: dutInfo.ASSET_HEAT_EXCHANGER_ID }, sessionUser);
  }

  else if (dutInfo && dutInfo.EVAPORATOR_ID) {
    await sqldb.DUTS_DUO_EVAPORATORS.w_deleteRow({ DUT_DUO_EVAPORATORS_ID: dutInfo.EVAPORATOR_ID }, sessionUser);
  }

  else if (dutInfo && dutInfo.CONDENSER_ID) {
    await sqldb.DUTS_DUO_CONDENSERS.w_deleteRow({ DUT_DUO_CONDENSER_ID: dutInfo.CONDENSER_ID }, sessionUser);
  }

  else if (dutInfo && dutInfo.AIR_CURTAIN_ID) {
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_deleteRow({ DUT_DUO_AIR_CURTAIN_ID: dutInfo.AIR_CURTAIN_ID }, sessionUser);
  }

  await sqldb.DUTS_DUO.w_deleteFromDeviceCode({ DEVICE_CODE: dev_id }, sessionUser);
}

async function deleteDriElectricCircuitAssociations(dri: string, dev_id:string, sessionUser: string, ): Promise<void> {
  const driCircuit = await sqldb.ELECTRIC_CIRCUITS.getInfoDeviceCode({ DEVICE_CODE: dri });

  if (driCircuit) {
    await sqldb.DRIS_ENERGY_DEVICES.w_delete({ DEVICE_CODE: dri }, sessionUser);
  }
}

export async function setGetDevInfo (session: SessionData, reqParams: {
  DEV_ID: string
  UNIT_ID?: number
  CLIENT_ID?: number
  allowInsert: boolean
}) {
  const newStruct = ['DAC', 'DAM', 'DUT', 'DMA', 'DRI'].includes(reqParams.DEV_ID.substring(0,3));
  if (!reqParams.DEV_ID) { throw Error('There was an error!\nInvalid properties. Missing DEV_ID.').HttpStatus(400); }

  // Format some property values
  if (<any>reqParams.UNIT_ID === '') reqParams.UNIT_ID = null;
  if (reqParams.UNIT_ID && ((typeof reqParams.UNIT_ID) === 'string')) {
    reqParams.UNIT_ID = Number(reqParams.UNIT_ID)
    if (isNaN(reqParams.UNIT_ID)) throw Error('Invalid UNIT_ID!').HttpStatus(400)
  }
  const devId = reqParams.DEV_ID
  let currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId });

  // Verifica as permissões do usuário para o cliente e unidade do dispositivo
  const { userCanEditDev, finalClient, clientChanged, userCanAddNewInfo } = await checkDevEditPermission(session, currentDevInfo, {
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_ID: reqParams.UNIT_ID,
  });

  // Check if new dev
  if (!currentDevInfo) {
    if (!userCanAddNewInfo) {
      throw Error('Permission denied! Profile cannot add new DEVs.').HttpStatus(403);
    }
    const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
    if (!perms.canConfigureNewUnits) {
      throw Error('Permission denied! Profile cannot add new DEVs to selected client.').HttpStatus(403)
    }

    if (devId !== devId.toUpperCase()) {
      throw Error('Invalid DEV ID! Lower case not allowed.').HttpStatus(400)
    }
    if (!reqParams.allowInsert) {
      throw Error('Não é permitido inserir o ID informado').HttpStatus(400);
    }

    const insertedDev = await sqldb.DEVICES.w_insert({
      DEVICE_CODE: devId.toUpperCase(),
      DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }, session.user);

    if (reqParams.CLIENT_ID != null) {
      await sqldb.DEVICES_CLIENTS.w_insert({ DEVICE_ID: insertedDev.insertId, CLIENT_ID: reqParams.CLIENT_ID }, session.user);
    }

    currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId });
  }

  const { finalUnit, unitChanged } = await checkFinalUnit({ userCanEditDev }, currentDevInfo.UNIT_ID, reqParams.UNIT_ID, finalClient);

  const paramSet: {
    DEV_ID: string,
    CLIENT_ID?: number,
    UNIT_ID?: number,
    DAT_BEGMON?: string,
  } = { DEV_ID: devId };
  if (clientChanged) {
    paramSet.CLIENT_ID = finalClient;
    paramSet.DAT_BEGMON = new Date().toISOString();
  }
  if (unitChanged) {
    paramSet.UNIT_ID = finalUnit;

    // deleta dut duo caso exista e suas associações
    await deleteDutDuoAndAssociations(devId, paramSet.DEV_ID, session.user);
    // deleta circuito de energia caso exista
    await deleteDriElectricCircuitAssociations(devId, paramSet.DEV_ID, session.user);
    // deleta automação caso exista
    await sqldb.DRIS_AUTOMATIONS.w_deleteFromDeviceCode({ DEVICE_CODE: devId }, session.user);
  }

  if (Object.keys(paramSet).length > 1) {
    if (newStruct) {
      const persistedInfo = await sqldb.DEVICES.getBasicInfo({devId: paramSet.DEV_ID});
      await updateDevicesRelashionship(persistedInfo, paramSet, session.user);
    }
    else {
      await sqldb.DEVICES.w_updateInfo(paramSet, session.user);
    }
    // TODO: Atualizar os dados no devStatus. Verificar as assinaturas, as notificações, os relatórios semanais.
    if (paramSet.CLIENT_ID !== undefined) {
      // TODO: rodar queries para remover unidades, grupos, tipos de ambiente, notificações, etc...
      // Como Room Type é relacionado ao ambiente, não é necessário fix caso o DUT seja dessassociado do cliente.
    }
  }

  // Neste ponto se o dispositivo não existia no banco ele foi inserido e já está associado ao cliente e unidade solicitados.
  return { userCanEditDev, userCanAddNewInfo, clientChanged };
}

export async function updateDevicesRelashionship(persistedInfo: Awaited<ReturnType<typeof sqldb.DEVICES.getBasicInfo>>, paramSet: { CLIENT_ID?: number, UNIT_ID?: number }, userId: string){
  let needNewDataBegMon = false;
  // valida se mudou de cliente
  if (paramSet.CLIENT_ID !== undefined && persistedInfo.CLIENT_ID !== paramSet.CLIENT_ID) {
    if (persistedInfo.DEVICE_CLIENT_ID) {
      await sqldb.DEVICES_CLIENTS.w_deleteRow({ID: persistedInfo.DEVICE_CLIENT_ID}, userId);
    }
    if (paramSet.CLIENT_ID) {
      needNewDataBegMon = true;
      await sqldb.DEVICES_CLIENTS.w_insert({DEVICE_ID: persistedInfo.DEVICE_ID, CLIENT_ID: paramSet.CLIENT_ID}, userId);
    }
  }

  // valida se mudou de unidade
  if (paramSet.UNIT_ID !== undefined && persistedInfo.UNIT_ID !== paramSet.UNIT_ID) {
    if (persistedInfo.DEVICE_UNIT_ID) {
      await sqldb.DEVICES_UNITS.w_deleteRow({ID: persistedInfo.DEVICE_UNIT_ID}, userId);
    }
    if (paramSet.UNIT_ID) {
      needNewDataBegMon = true;
      await sqldb.DEVICES_UNITS.w_insert({DEVICE_ID: persistedInfo.DEVICE_ID, UNIT_ID: paramSet.UNIT_ID}, userId);
      //// enviar comando para a o dispositivo para trocar o timezone caso necessário.
      await sendCommandToDeviceWithConfigTimezone({ userId, devId: persistedInfo.DEVICE_ID });
    }
  }  

  if (needNewDataBegMon) {
    await sqldb.DEVICES.w_updateInfo({ID: persistedInfo.DEVICE_ID, DAT_BEGMON: new Date(Date.now())?.toISOString().replace('T', ' ').substring(0, 19)}, userId);
  }
}

export async function checkFinalUnit (perms: { userCanEditDev: boolean }, current_UNIT_ID: number, wanted_UNIT_ID: number, finalClient: number) {
  // Check if UNIT_ID is valid
  const finalUnit = ((wanted_UNIT_ID !== undefined) ? wanted_UNIT_ID : current_UNIT_ID) || null;
  const unitChanged = finalUnit !== current_UNIT_ID;

  if (unitChanged) {
    if (!perms.userCanEditDev) {
      throw Error('Permission denied! Profile cannot change the unit.').HttpStatus(403);
    }
  }
  if ((finalClient == null) && (finalUnit != null)) {
    throw Error('Cannot set unit without client').HttpStatus(400);
  }
  if (finalUnit) {
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: finalUnit, CLIENT_ID: finalClient });
    if (!unitInfo) throw Error('Could not find unit').HttpStatus(400).DebugInfo({ finalUnit, finalClient });
    if (unitInfo.CLIENT_ID !== finalClient) throw Error('Invalid unit client').HttpStatus(400);
  }

  return { finalUnit, unitChanged };
}

export async function checkFinalMachine (perms: { userCanEditDev: boolean }, current_MACHINE_ID: number, wanted_MACHINE_ID: number, finalUnit: number) {
  // Check if GROUP_ID is valid
  const finalMachine = ((wanted_MACHINE_ID !== undefined) ? wanted_MACHINE_ID : current_MACHINE_ID) || null;
  const machineChanged = finalMachine !== current_MACHINE_ID;

  if (machineChanged) {
    if (!perms.userCanEditDev) {
      throw Error('Permission denied! Profile cannot change the machine.').HttpStatus(403);
    }
  }
  if ((finalUnit == null) && (finalMachine != null)) {
    throw Error('Cannot set machine without unit').HttpStatus(400);
  }
  if (finalMachine) {
    const machineInfo = await sqldb.MACHINES.getBasicInfo({ MACHINE_ID: finalMachine });
    if (!machineInfo) throw Error('Could not find machine').HttpStatus(400).DebugInfo({ finalMachine, finalUnit });
    if (machineInfo.UNIT_ID !== finalUnit) throw Error('Invalid machine unit').HttpStatus(400);
  }

  return { finalMachine, machineChanged };
}

export async function removingClient (qPars: { CLIENT_ID: number }, keepDevsData: boolean, userId: string) {
  // TODO: update in-memory data (devStatus, subscriptions, etc)
  if (keepDevsData) {
    await sqldb.DEVICES_CLIENTS.w_deleteRowByClientId(qPars, userId);
    await sqldb.DEVICES_UNITS.w_deleteFromClient(qPars, userId);
  }
  else {
    const devicesToDelete = await sqldb.DEVICES.getDevicesList(qPars)
    await dacInfo.deleteClientDacs(qPars, userId);
    await dutInfo.deleteClientDuts(qPars, userId);
    await damInfo.deleteClientDams(qPars, userId);
    await dmaInfo.deleteClientDmas(qPars, userId);
    await dmtInfo.deleteClientDmts(qPars, userId);
    await dalInfo.deleteClientDals(qPars, userId);
    await sqldb.VAVS.w_deleteFromClientDris(qPars, userId);
    await sqldb.FANCOILS.w_deleteFromClientDris(qPars, userId);
    await driInfo.deleteClientDris(qPars, userId);
    await sqldb.DEVFWVERS.w_deleteFromClientDevs(qPars, userId);
    await sqldb.REFRIGERATES.w_deleteFromClient(qPars, userId);
    await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteFromClient(qPars, userId);
    await sqldb.ENVIRONMENTS.w_deleteFromClient(qPars, userId);
    await sqldb.DEV_POINTS.w_deleteFromClient(qPars, userId);
    await sqldb.DEVICES_CLIENTS.w_deleteFromClient(qPars, userId);
    await sqldb.DEVICES_UNITS.w_deleteFromClient(qPars, userId);
    await sqldb.DEVICES.w_deleteRows({ ID: devicesToDelete.map(item => item.DEVICE_ID) }, userId);
  }
}

export async function removingClientUnits (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DEVICES_UNITS.w_removeClientUnits(qPars, userId);
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.DEVICES_UNITS.w_deleteRowByUnit(qPars, userId);
}

export async function deleteDev (qPars: { DEV_ID: string }, userId: string) {
  await dacInfo.deleteDacInfo(qPars, userId);
  await dutInfo.deleteDut(qPars, userId);
  await dmaInfo.deleteDma(qPars, userId);
  await dmtInfo.deleteDmt({DMT_CODE: qPars.DEV_ID}, userId);
  await damInfo.deleteDamInfo({ DAM_ID: qPars.DEV_ID }, userId);
  await driInfo.deleteDriInfo({ DRI_ID: qPars.DEV_ID }, userId);
  await sqldb.DEVFWVERS.w_deleteFromDev(qPars, userId);
  await sqldb.DEV_POINTS.w_deleteByDeviceCode({ DEVICE_CODE: qPars.DEV_ID }, userId);
  await sqldb.DEVICES_CLIENTS.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);
  await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DEV_ID}, userId);

  const { affectedRows } = await sqldb.DEVICES.w_deleteRow({ DEVICE_CODE: qPars.DEV_ID }, userId);
  eventHooks.onDevDeleted(qPars.DEV_ID);
  return { affectedRows };
}

export async function getAvOptsDescs (avOptsIds: string[]) {
  let descs: { [id: string]: string } = {};
  if (avOptsIds && avOptsIds.length > 0) {
    const rows = await sqldb.AV_OPTS.getOptsDesc({ avOptsIds });
    for (const row of rows) {
      descs[row.OPT_ID] = row.OPT_LABEL;
    }
  }
  return descs;
}

const getOptsDescsByInfoDb = async (infoDb: {
  DAC_APPL?: string
  DAC_TYPE?: string
  DAC_ENV?: string
  DAC_BRAND?: string
  FLUID_TYPE?: string
  DUTAUT_MCHN_BRAND?: string
}) => {
  let optsIds = [];
  if (infoDb.DAC_APPL) optsIds.push(infoDb.DAC_APPL);
  if (infoDb.DAC_TYPE) optsIds.push(infoDb.DAC_TYPE);
  if (infoDb.DAC_ENV) optsIds.push(infoDb.DAC_ENV);
  if (infoDb.DAC_BRAND) optsIds.push(infoDb.DAC_BRAND);
  if (infoDb.FLUID_TYPE) optsIds.push(infoDb.FLUID_TYPE);
  if (infoDb.DUTAUT_MCHN_BRAND) optsIds.push(infoDb.DUTAUT_MCHN_BRAND);

  const optsDescs = await getAvOptsDescs(optsIds);

  return optsDescs;
}


const handleDamInfoDb = async (
  infoDb: {
    DEV_ID: string
    DEVICE_ID: number
    UNIT_ID: number
    CLIENT_ID: number
    CURRFW_MSG: string
    SELF_REFERENCE: number
    MINIMUM_TEMPERATURE: number
    MAXIMUM_TEMPERATURE: number
    EXT_THERM_CFG: string
    SETPOINT_ECO_REAL_TIME: number
    CAN_SELF_REFERENCE: number
    DESIREDPROG: string
    INSTALLATION_LOCATION: string
    LASTPROG: string
    ENABLE_ECO: 0|1|2
    ENABLE_ECO_LOCAL: 0|1
    FW_MODE: string
    ECO_CFG: string
    ECO_OFST_START: number
    ECO_OFST_END: number
    DISABLED: 0|1
    FU_NOM: number
    ECO_INT_TIME: number
    SCHEDULE_START_BEHAVIOR: string
    SETPOINT: number
    LTC: number
    LTI: number
    UPPER_HYSTERESIS: number
    LOWER_HYSTERESIS: number
    DAM_PLACEMENT: 'RETURN'|'DUO'
    T0_POSITION: 'RETURN'|'INSUFFLATION'
    T1_POSITION: 'RETURN'|'INSUFFLATION'
  },
  user: string,
  reqParams: any
) => {
  const machinesList = await sqldb.MACHINES.getDamMachines({ DEV_AUT: infoDb.DEV_ID })
    let dam_mode: string = null;
    try {
      if (infoDb.CURRFW_MSG) {
        const fwInfo = jsonTryParse<ControlMsgFirmwareVersion>(infoDb.CURRFW_MSG);
        dam_mode = fwInfo?.dam_mode;
      }
    } catch (err) { 
      logger.error(`API: /get-dev-full-info msg: ${err} - user: ${user} - params: ${JSON.stringify(reqParams)}`, err);
    }
    const REL_DUT_IDS = await getDutsUsedAsRefByDam(infoDb.DEV_ID, infoDb.CLIENT_ID, infoDb.UNIT_ID);

    const devFwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: infoDb.DEV_ID });
    const fwVersionRaw = devFwInfo ? devFwInfo.CURRFW_VERS : '';
    const fwVersion = parseFirmwareVersion(fwVersionRaw);

    const dam = {
      REL_DUT_ID: REL_DUT_IDS?.[0],
      ENABLE_ECO: infoDb.ENABLE_ECO,
      ENABLE_ECO_LOCAL: infoDb.ENABLE_ECO_LOCAL,
      ECO_CFG: infoDb.ECO_CFG,
      ECO_OFST_START: infoDb.ECO_OFST_START,
      ECO_OFST_END: infoDb.ECO_OFST_END,
      ECO_INT_TIME: infoDb.ECO_INT_TIME,
      FW_MODE: infoDb.FW_MODE,
      DESIREDPROG: infoDb.DESIREDPROG,
      INSTALLATION_LOCATION: infoDb.INSTALLATION_LOCATION,
      LASTPROG: infoDb.LASTPROG,
      DAM_DISABLED: infoDb.DISABLED,
      FU_NOM: infoDb.FU_NOM,
      SCHEDULE_START_BEHAVIOR: infoDb.SCHEDULE_START_BEHAVIOR,
      SETPOINT: infoDb.SETPOINT,
      LTC: infoDb.LTC,
      LTI: infoDb.LTI,
      UPPER_HYSTERESIS: infoDb.UPPER_HYSTERESIS,
      LOWER_HYSTERESIS: infoDb.LOWER_HYSTERESIS,
      SELF_REFERENCE: infoDb.SELF_REFERENCE === 1,
      MINIMUM_TEMPERATURE: infoDb.MINIMUM_TEMPERATURE,
      MAXIMUM_TEMPERATURE: infoDb.MAXIMUM_TEMPERATURE,
      groups: machinesList,
      dam_mode,
      supportsVentEnd: (fwVersion?.vMajor ?? 0) >= 2,
      EXT_THERM_CFG: infoDb.EXT_THERM_CFG,
      supportsExtTherm: infoDb.DEV_ID.startsWith('DAM3') && versionIsAtLeast(fwVersion, 2, 2, 2),
      SETPOINT_ECO_REAL_TIME: infoDb.SETPOINT_ECO_REAL_TIME,
      CAN_SELF_REFERENCE: infoDb.CAN_SELF_REFERENCE === 1,
      PLACEMENT: infoDb.DAM_PLACEMENT,
      T0_POSITION: infoDb.T0_POSITION,
      T1_POSITION: infoDb.T1_POSITION,
    };

  return dam;
}

const handleDacInfoDb = async (infoDb: {
  DEV_ID: string
  DAC_NAME: string
  DAC_DESC: string
  DAC_MODEL: string
  CAPACITY_UNIT: string
  CAPACITY_PWR: number
  DAC_COP: number
  DAC_KW: number
  FLUID_TYPE: string
  GROUP_ID: number
  DAC_APPL: string
  DAC_TYPE: string
  DAC_ENV: string
  DAC_MODIF: string
  DAC_COMIS: string
  DAC_BRAND: string
  HEAT_EXCHANGER_ID: number
  GROUP_NAME: string 
  REL_DUT_ID_GROUP: string
  T0_T1_T2: string
  P0_POSITN: string
  P0_SENSOR: string
  P1_POSITN: string
  P1_SENSOR: string 
  P0_MULT_QUAD: number
  P0_MULT_LIN: number
  P0_OFST: number
  P1_MULT_QUAD: number
  P1_MULT_LIN: number
  P1_OFST: number
  SELECTED_L1_SIM: string
  EQUIPMENT_POWER: string
  COMPRESSOR_NOMINAL_CURRENT: number
  DAM_DISABLED: number
}) => {
  const hwCfg = dacData.dacHwCfg(infoDb.DEV_ID, infoDb);
  const assetInfo = await sqldb.ASSETS.getAssetInfo({DEV_ID: infoDb.DEV_ID});
  
  const dac = {
    DAC_NAME: infoDb.DAC_NAME,
    DAC_DESC: infoDb.DAC_DESC,
    DAC_MODEL: infoDb.DAC_MODEL,
    CAPACITY_UNIT: infoDb.CAPACITY_UNIT,
    CAPACITY_PWR: infoDb.CAPACITY_PWR,
    DAC_COP: infoDb.DAC_COP,
    DAC_KW: infoDb.DAC_KW,
    FLUID_TYPE: infoDb.FLUID_TYPE,
    GROUP_ID: infoDb.GROUP_ID,
    DAC_APPL: infoDb.DAC_APPL,
    DAC_TYPE: infoDb.DAC_TYPE,
    DAC_ENV: infoDb.DAC_ENV,
    DAC_MODIF: infoDb.DAC_MODIF,
    DAC_COMIS: infoDb.DAC_COMIS,
    DAC_BRAND: infoDb.DAC_BRAND,
    HEAT_EXCHANGER_ID: infoDb.HEAT_EXCHANGER_ID,
    GROUP_NAME: infoDb.GROUP_NAME,
    REL_DUT_ID: infoDb.REL_DUT_ID_GROUP,
    T0_T1_T2: infoDb.T0_T1_T2,
    P0_POSITN: infoDb.P0_POSITN,
    P0_SENSOR: infoDb.P0_SENSOR,
    P1_POSITN: infoDb.P1_POSITN,
    P1_SENSOR: infoDb.P1_SENSOR,
    P0_MULT_QUAD: infoDb.P0_MULT_QUAD,
    P0_MULT_LIN: infoDb.P0_MULT_LIN,
    P0_OFST: infoDb.P0_OFST,
    P1_MULT_QUAD: infoDb.P1_MULT_QUAD,
    P1_MULT_LIN: infoDb.P1_MULT_LIN,
    P1_OFST: infoDb.P1_OFST,
    P0Psuc: hwCfg.P0Psuc,
    P1Psuc: hwCfg.P1Psuc,
    P0Pliq: hwCfg.P0Pliq,
    P1Pliq: hwCfg.P1Pliq,
    hasAutomation: hwCfg.hasAutomation,
    SELECTED_L1_SIM: infoDb.SELECTED_L1_SIM,
    EQUIPMENT_POWER: infoDb.EQUIPMENT_POWER,
    COMPRESSOR_NOMINAL_CURRENT: infoDb.COMPRESSOR_NOMINAL_CURRENT,
    EVAPORATOR_MODEL: assetInfo ? assetInfo.EVAPORATOR_MODEL : null,
    EVAPORATOR_MODEL_ID: assetInfo ? assetInfo.EVAPORATOR_MODEL_ID : null,
    INSUFFLATION_SPEED: assetInfo ? assetInfo.INSUFFLATION_SPEED_INPUT : null,
    AST_DESC: assetInfo ? assetInfo.AST_DESC : null,
    AST_ROLE: assetInfo ? assetInfo.AST_ROLE : null,
    AST_ROLE_NAME: assetInfo ? assetInfo.AST_ROLE_NAME : null,
  };

  return dac;
};

const handleDutInfoDb = async (infoDb: {
  DEV_ID: string
  ROOM_NAME: string
  PLACEMENT: 'DUO'|'AMB'|'INS'
  TUSEMAX: number
  TUSEMIN: number
  HUMIMAX: number
  HUMIMIN: number
  CO2MAX: number
  VARS: string
  GROUP_ID: number
  USEPERIOD: string
  TEMPERATURE_OFFSET: number
  SENSOR_AUTOM: number
  ENVIRONMENT_ID: number
  APPLICATION: string
}) => {
  const fullProg = scheduleData.parseFullProgV4(infoDb.USEPERIOD);
  const { workPeriods, workPeriodExceptions } = scheduleData.FullProgV4_to_deprecated_WorkPeriods(fullProg);

  let DAC_KW: number = null;
  if (infoDb.PLACEMENT === 'DUO' && infoDb.GROUP_ID) {
    const machineInfo = await sqldb.MACHINES.getMachineRatedPower({ MACHINE_ID: infoDb.GROUP_ID });
    DAC_KW = machineInfo.RATED_POWER;
  }

  const lastCom = await devsLastComm.loadLastDutTelemetry(infoDb.DEV_ID)

  const dut = {
    ROOM_NAME: infoDb.ROOM_NAME,
    PLACEMENT: infoDb.PLACEMENT,
    TUSEMAX: infoDb.TUSEMAX,
    TUSEMIN: infoDb.TUSEMIN,
    HUMIMAX: infoDb.HUMIMAX,
    HUMIMIN: infoDb.HUMIMIN,
    CO2MAX: infoDb.CO2MAX,
    VARS: infoDb.VARS,
    fullProg,
    workPeriods,
    workPeriodExceptions,
    TEMPERATURE_OFFSET: infoDb.TEMPERATURE_OFFSET,
    SENSOR_AUTOM: infoDb.SENSOR_AUTOM,
    ENVIRONMENT_ID: infoDb.ENVIRONMENT_ID,
    DAC_KW: DAC_KW ?? undefined,
    APPLICATION: infoDb.APPLICATION || null,
    operation_mode: lastCom.lastTelemetry?.operation_mode,
  };

  return dut;
};

const handleDutAutInfoDb = async (infoDb: {
  DEV_ID: string
  TSETPOINT: number
  LTCRIT: number
  RESENDPER: number
  DESIRED_PROG: string
  LAST_PROG: string
  DISABLED: number
  MCHN_BRAND: string
  MCHN_MODEL: string
  FU_NOM: number
  CTRLOPER: ControlMode
  CURRFW_VERS: string
  PORT_CFG: string
  TEMPERATURE_OFFSET : number
  LTINF: number
  UPPER_HYSTERESIS : number
  LOWER_HYSTERESIS : number
  SCHEDULE_START_BEHAVIOR: string
  SCHEDULE_END_BEHAVIOR: string
  FORCED_BEHAVIOR: string
}) => {
  const dutGroups = await sqldb.MACHINES.getDutMachines({ DUT_ID: infoDb.DEV_ID, withReference: true });
  // Filtra versão compatível ou caso dispositivo já esteja com configuração errada, considera a informação para que seja possível corrigir no front
  const parsedVersion = parseFirmwareVersion(infoDb.CURRFW_VERS);
  const devParsedVersion: VersionNumber = parsedVersion || {
    vMajor: 0,
    vMinor: 0,
    vPatch: 0,
  };
  const modesCompatible = dutModeMinimumVersion.filter(item => 
    compareVersions(devParsedVersion, item.minimumVersion, false) >= 0 || (infoDb.CTRLOPER === item.mode) || (infoDb.FORCED_BEHAVIOR === item.mode)
  )
  .map(item => item.mode);

  const ctrlOper = infoDb.CTRLOPER === '8_ECO_2' ? '6_BACKUP_CONTROL_V2' : infoDb.CTRLOPER;
  let portCfg: 'IR'|'RELAY'; 
  if (infoDb.PORT_CFG === 'IR' || infoDb.PORT_CFG === 'RELAY') {
    portCfg = infoDb.PORT_CFG;
  } 

  const dut_aut = {
    TSETPOINT: infoDb.TSETPOINT,
    LTCRIT: infoDb.LTCRIT,
    RESENDPER: infoDb.RESENDPER,
    DESIREDPROG: infoDb.DESIRED_PROG,
    LASTPROG: infoDb.LAST_PROG,
    DUTAUT_DISABLED: infoDb.DISABLED as 0|1,
    MCHN_BRAND: infoDb.MCHN_BRAND,
    MCHN_MODEL: infoDb.MCHN_MODEL,
    FU_NOM: infoDb.FU_NOM,
    CTRLOPER: ctrlOper,
    PORTCFG: portCfg,
    groups: dutGroups.map(({ GROUP_ID, GROUP_NAME }) => ({ GROUP_ID, GROUP_NAME })),
    TEMPERATURE_OFFSET: infoDb.TEMPERATURE_OFFSET,
    LTINF: infoDb.LTINF,
    UPPER_HYSTERESIS: infoDb.UPPER_HYSTERESIS,
    LOWER_HYSTERESIS: infoDb.LOWER_HYSTERESIS,
    COMPATIBLE_MODES: modesCompatible,
    IS_ECO_2_WITH_HYSTERESIS: infoDb.CTRLOPER === '8_ECO_2',
    SCHEDULE_START_BEHAVIOR: infoDb.SCHEDULE_START_BEHAVIOR,
    SCHEDULE_END_BEHAVIOR: infoDb.SCHEDULE_END_BEHAVIOR,
    FORCED_BEHAVIOR: infoDb.FORCED_BEHAVIOR
  };

  return dut_aut;
};

const handleDriInfoDb = async (infoDb: { DRI_GROUP: number }, devCode: string) => {
  const driData = await sqldb.DRIS.getExtraInfo({ driId: devCode });
  const vavData = await sqldb.VAVS.getDriVav({ VAV_ID: devCode  });
  const fancoilData = await sqldb.FANCOILS.getDriFancoil({ FANCOIL_ID: devCode  });

  const varsCfg = parseDriVarsCfg(driData.VARSCFG);
  const associatedDacs = infoDb.DRI_GROUP && await sqldb.DACS_DEVICES.getAssociatedMachineDacs({ MACHINE_ID: infoDb.DRI_GROUP })
  const associatedDutsDuo = infoDb.DRI_GROUP && fancoilData && await sqldb.DUTS_DUO.getDutsDuoList_dutsAndAssetsFancoil({ machineIds: [infoDb.DRI_GROUP]});

  const dri = {
    varsCfg,
    ecoCfg: {
      DUT_ID: driData.DUT_ID,
      ENABLE_ECO: driData.ENABLE_ECO,
      ECO_CFG: driData.ECO_CFG,
      ECO_OFST_START: driData.ECO_OFST_START,
      ECO_OFST_END: driData.ECO_OFST_END,
      ECO_INT_TIME: driData.ECO_INT_TIME,
      DAT_BEGAUT: driData.DAT_BEGAUT,
    },
    automationCfg: {
      AUTOMATION_INTERVAL: driData.AUTOMATION_INTERVAL,
    },
    associatedDutsDuo,
    associatedDacs,
    vavCfg: vavData,
    fancoilCfg: fancoilData
  };

  return dri;
}

const handleDmaInfoDb = async (devCode: string) => {
  const dmaData = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: devCode });
  const dma = {
    DMA_ID: dmaData.DMA_ID,
    INSTALLATION_LOCATION: dmaData.INSTALLATION_LOCATION,
    INSTALLATION_DATE: dmaData.INSTALLATION_DATE,
    TOTAL_CAPACITY: dmaData.TOTAL_CAPACITY,
    QUANTITY_OF_RESERVOIRS: dmaData.QUANTITY_OF_RESERVOIRS,
    HYDROMETER_MODEL: dmaData.HYDROMETER_MODEL,
  };

  return dma;
}

const handleDalInfoDb = async (devCode: string) => {
  const dalIllumList = await sqldb.DALS_ILLUMINATIONS.getDalIllumList({ DAL_CODE: devCode });
  const dal = {
    illuminationList: dalIllumList,
  };

  return dal;
}
const handleDmtInfoDb = async (devCode: string, lastTelemetry: TelemetryPackRawDMT, connectionStatus: string) => {
  const dmtNobreaksList: Awaited<ReturnType<typeof sqldb.DMTS_NOBREAKS.getDmtNobreaksList>> & {STATUS?: string}[] = await sqldb.DMTS_NOBREAKS.getDmtNobreaksList({ DMT_CODE: devCode });
  for (const nobreak of dmtNobreaksList) {
    const nobreakStatusInfo = await dmtInfo.getNobreakStatus(devCode, nobreak.NOBREAK_ID, lastTelemetry, connectionStatus);
    nobreak.STATUS = nobreakStatusInfo.status;
  }
  const dmtIllumList: Awaited<ReturnType<typeof sqldb.DMTS_ILLUMINATIONS.getDmtIllumList>> & {STATUS?: string}[] = await sqldb.DMTS_ILLUMINATIONS.getDmtIllumList({ DMT_CODE: devCode });
  for (const illum of dmtIllumList) {
    const illumStatusInfo = await dmtInfo.getIlluminationStatus(devCode, illum.ILLUMINATION_ID, lastTelemetry, connectionStatus);
    illum.STATUS = illumStatusInfo.status;
  }
  const dmtInfoId = await sqldb.DMTS.getIdByCode({DEVICE_CODE: devCode});
  const dmtElectricNetwork = await sqldb.DMTS_NOBREAK_CIRCUITS.getDmtUsedPorts({DMT_ID: dmtInfoId.ID});
  const dmtElectricNetworkFormatted = dmtElectricNetwork.map((e) => { const aux = {...e, CIRCUIT_ID: e.ID, DMT_CODE: devCode}; return aux; })
  const dmtUtilitiesList = [...(dmtElectricNetworkFormatted.map((util) => ({...util, 'APPLICATION': 'Electric Network'}))), 
                            ...(dmtNobreaksList.map((util) => ({...util, 'APPLICATION': 'Nobreak'}))),
                            ...(dmtIllumList.map((util) => ({...util, 'APPLICATION': 'Illumination'})))];
  const dmt = {
    nobreaksList: dmtNobreaksList,
    illuminationList: dmtIllumList,
    utilitiesList: dmtUtilitiesList,
  };

  return dmt;
}

const getInfoFromInfoDb = (infoDb: {
  DEV_ID: string
  CLIENT_ID: number
  UNIT_ID: number
  UNIT_NAME: string
  TIMEZONE_AREA: string
  TIMEZONE_OFFSET: number
  CLIENT_NAME: string
  MACHINE_ID: number
  MACHINE_NAME: string
  BT_ID: string
  STATE_ID: string
  CITY_NAME: string
  DAT_BEGMON: string
  DAT_BEGAUT_DAM: string
  DAT_BEGAUT_DUT_AUT: string
  ASSET_ID: number
  LTE_NETWORK: string
  LTE_RSRP: number
  DEVICE_ID: number
}, lastMessageTS: number, isDutDuo: boolean) => {
  let lastMessage;
  if (lastMessageTS) {
    lastMessage = new Date(lastMessageTS);
    lastMessage?.setTime(lastMessage?.getTime() + 3);
  }
  const info = {
    DEV_ID: infoDb.DEV_ID,
    CLIENT_ID: infoDb.CLIENT_ID,
    UNIT_ID: infoDb.UNIT_ID,
    UNIT_NAME: infoDb.UNIT_NAME,
    TIMEZONE_AREA: infoDb.TIMEZONE_AREA,
    TIMEZONE_OFFSET: infoDb.TIMEZONE_OFFSET,
    CLIENT_NAME: infoDb.CLIENT_NAME,
    GROUP_ID: infoDb.MACHINE_ID,
    GROUP_NAME: infoDb.MACHINE_NAME,
    BT_ID: infoDb.BT_ID,
    STATE_ID: infoDb.STATE_ID,
    CITY_NAME: infoDb.CITY_NAME,
    DAT_BEGMON: momentTimezone(infoDb.DAT_BEGMON).tz(infoDb.TIMEZONE_AREA || 'America/Sao_Paulo').format('MMM D, YYYY h:mm A'),
    DAT_BEGAUT: momentTimezone(infoDb.DAT_BEGAUT_DAM || infoDb.DAT_BEGAUT_DUT_AUT).tz(infoDb.TIMEZONE_AREA || 'America/Sao_Paulo').format('MMM D, YYYY h:mm A'),
    status: calculateStatus(lastMessageTS) || 'OFFLINE',
    ASSET_ID: infoDb.ASSET_ID,
    lastMessageTS: lastMessage?.toISOString() || '',
    LTE_NETWORK: infoDb.LTE_NETWORK,
    LTE_RSRP: infoDb.LTE_RSRP,
    isDutDuo,
    DEVICE_ID: infoDb.DEVICE_ID,
  }

  return info;
}

const getDacFullInfo = async (devId: string) => {
  const dacRawData = await sqldb.DACS_DEVICES.getExtraInfoFull({ DAC_ID: devId })
  const dacData: Parameters<typeof handleDacInfoDb>[0] = {
    DEV_ID: dacRawData?.DAC_ID,
    REL_DUT_ID_GROUP: dacRawData?.REL_DUT_ID,
    ...dacRawData
  };
  const dac = await handleDacInfoDb(dacData)
    .then(x => ({
      P0_MULT: x.P0_MULT_LIN,
      P1_MULT: x.P1_MULT_LIN,
      ...x
    }));
  const dacOptDescs = getOptsDescsByInfoDb(dacRawData);
  return { dac, optDescs: dacOptDescs }
}

const getDamFullInfo = async (devId: string, devFwInfo: { CURRFW_MSG: string }, user: string, reqParams: any) => {
  let dam;
  let damAutParams;
  const damRawData = await sqldb.DAMS.getDevExtraInfo({ DAM_ID : devId});
  const otherData = await sqldb.DAMS_DEVICES.getDamByCode({ DEVICE_CODE: devId });
  const autInfo = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({ DEVICE_CODE: devId });
  if (damRawData || otherData) {
    if (autInfo) {
      damAutParams = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParameters({ ID: autInfo.ID });
    }
    const damData: Parameters<typeof handleDamInfoDb>[0] = {
      DEV_ID: damRawData.DAM_ID,
      CURRFW_MSG: devFwInfo.CURRFW_MSG,
      CAN_SELF_REFERENCE: damRawData.SELF_REFERENCE,
      INSTALLATION_LOCATION: otherData?.INSTALLATION_LOCATION,
      DISABLED: (otherData?.DISAB ? 1 : 0),
      DAM_PLACEMENT: damRawData.PLACEMENT,
      // @ts-ignore
      ENABLE_ECO: [0, 1, 2].includes(damRawData.ENABLE_ECO) ? damRawData.ENABLE_ECO : null, // no checks in the original query
      // @ts-ignore
      ENABLE_ECO_LOCAL: [0, 1].includes(damRawData.ENABLE_ECO_LOCAL) ? damRawData.ENABLE_ECO_LOCAL : null, // no checks in the original query either
      ...damRawData
    };
    dam = await handleDamInfoDb(damData, user, reqParams);
  }
  return { dam, damAutParams };
}

const getDutFullInfo = async (devId: string, currFwVers: string) => {
  const infoParams: { DAT_BEGAUT_DUT_AUT: string } = { DAT_BEGAUT_DUT_AUT: undefined };
  const dutRawInfo = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: devId });
  const machine = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: [dutRawInfo.MACHINE_REFERENCE] }).then(x => x?.[0]);
  const envParams = await sqldb.DUTS.getListDutsBasicGroundPlant({ UNIT_ID: dutRawInfo.UNIT_ID });
  const envParam = envParams.find((env) => env.DEV_ID === devId);
  const dutInfo: Parameters<typeof handleDutInfoDb>[0] = {
    GROUP_ID: dutRawInfo.MACHINE_REFERENCE,
    APPLICATION: dutRawInfo.MACHINE_APPLICATION,
    ...dutRawInfo, ...envParam
  };

  const dut = await handleDutInfoDb(dutInfo);
  const dutOptDescs = await getOptsDescsByInfoDb({ DUTAUT_MCHN_BRAND: machine?.BRAND });
  const dutAutInfo = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({ DEVICE_CODE: devId });
  let dut_aut;
  let dutAutParams;
  let mode: ControlMode = null;
  let ctrlOper: ControlMode = null;
  let disabled = null;
  if (dutAutInfo?.ID) {
    dutAutParams = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParameters({ ID: dutAutInfo.ID });
    const dutAutOtherParams = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo( { DEVICE_CODE: devId } ).then(x => x?.[0]);
    mode = dutAutParams.MODE as ControlMode;
    ctrlOper = operatesEcoMode(mode) ?  mode : null;
    infoParams.DAT_BEGAUT_DUT_AUT = dutAutParams.DAT_BEGAUT;
    disabled = dutAutOtherParams.DISAB;
  }

  const dutAut: Parameters<typeof handleDutAutInfoDb>[0] = {
    DEV_ID: devId,
    TSETPOINT: dutAutParams?.SETPOINT,
    LTCRIT: dutAutParams?.LTC,
    CTRLOPER: ctrlOper,
    LTINF: dutAutParams?.LTI,
    TEMPERATURE_OFFSET: dutRawInfo.TEMPERATURE_OFFSET,
    CURRFW_VERS: currFwVers,
    MCHN_MODEL: machine?.MODEL,
    MCHN_BRAND: machine?.BRAND,
    DISABLED: disabled,
    ...dutAutParams,
  };

  dut_aut = await handleDutAutInfoDb(dutAut);
  return { dut, dut_aut, infoParams, dutOptDescs};
}

httpRouter.privateRoutes['/get-dev-full-info'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.DEV_ID) throw Error('Invalid parameters! Missing DEV_ID').HttpStatus(400)

  let deviceType = reqParams.DEV_ID.substring(0, 3);
  let deviceRev = Number(reqParams.DEV_ID[3]);

  const deviceDb = await sqldb.DEVICES.getDeviceExtraInfo({ DEVICE_CODE: reqParams.DEV_ID });
  if (!deviceDb) { throw Error('Could not find DEV information').HttpStatus(400) }
  const perms = await getPermissionsOnUnit(session, deviceDb.CLIENT_ID, deviceDb.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const deviceMapping = await sqldb.DEVICES.getDevsDetails({ devIds : [reqParams.DEV_ID]}).then(x => x?.[0]);
  const infoParams: Parameters<typeof getInfoFromInfoDb>[0] = {
    DAT_BEGAUT_DAM: undefined, // it'll be filled IF the device counts as a DAM
    DAT_BEGAUT_DUT_AUT: undefined, // it'll be filled IF the device is an automating DUT
    ...deviceDb, ...deviceMapping
  };
  
  const isDutDuo = deviceDb.DEV_ID.startsWith('DUT') ? !!(await sqldb.DUTS_DUO.getIdDutDuoByDeviceCode({ DUT_CODE: deviceDb.DEV_ID })) : false;

  const devFwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: deviceDb.DEV_ID });
  const optsDescs: ApiResps['/get-dev-full-info']['optsDescs'] = {};
  const lastTelemetries = await devsLastComm.loadLastTelemetries({ devIds: [deviceDb.DEV_ID] });

  let dac: Awaited<ReturnType<typeof httpRouter.privateRoutes['/get-dev-full-info']>>['dac'];
  if (deviceType === 'DAC') {
    const {dac: dacData, optDescs: dacOptDescs} = await getDacFullInfo(reqParams.DEV_ID);
    dac = dacData;
    Object.assign(optsDescs, dacOptDescs);
  }

  let dam;
  if (deviceType === 'DAM' || (deviceType === 'DAC' && deviceRev >= 3)) {
    const { dam: damData, damAutParams } = await getDamFullInfo(reqParams.DEV_ID, devFwInfo, session.user, reqParams);
    dam = damData;
    infoParams.DAT_BEGAUT_DAM = damAutParams?.DAT_BEGAUT;
  }
  
  let dut;
  let dut_aut;
  if (deviceType === 'DUT') {
    const { dut: dutInfo, dut_aut: dutAutInfo, infoParams: info, dutOptDescs } = await getDutFullInfo(reqParams.DEV_ID, devFwInfo.CURRFW_VERS);
    dut = dutInfo;
    dut_aut = dutAutInfo;
    infoParams.DAT_BEGAUT_DUT_AUT = info?.DAT_BEGAUT_DUT_AUT;
    Object.assign(optsDescs, dutOptDescs);
  }

  let dri;
  if (deviceType === 'DRI') {
    const driAutomData = await sqldb.DRIS_AUTOMATIONS.getDrisAutomationInfo({ DEVICE_CODE: reqParams.DEV_ID }).then(x => x?.[0]);
    dri = await handleDriInfoDb({
      DRI_GROUP: driAutomData?.MACHINE_ID
    }, reqParams.DEV_ID);
  }

  let dma;
  if (deviceType === 'DMA') {
    dma = await handleDmaInfoDb(reqParams.DEV_ID);
  }

  let dal;
  if (deviceType === 'DAL') {
    dal = await handleDalInfoDb(reqParams.DEV_ID);
  }
  
  let dmt;
  if (deviceType === 'DMT') {
    const { lastTelemetry, status: connectionStatus } = lastTelemetries.lastDmtTelemetry(reqParams.DEV_ID);
    dmt = await handleDmtInfoDb(reqParams.DEV_ID, lastTelemetry, connectionStatus);
  }
  

  const info = getInfoFromInfoDb(infoParams, lastTelemetries.lastTS(reqParams.DEV_ID), isDutDuo);

  return {
    info,
    dac,
    dut,
    dam,
    dut_aut,
    dri,
    dma,
    dal,
    dmt,
    optsDescs
  }
}

httpRouter.privateRoutes['/get-devs-full-info'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.DEV_IDs) throw Error('Invalid parameters! Missing DEV_IDs').HttpStatus(400)

  const resData : httpRouter.ApiResps['/get-devs-full-info'] = {};
  for(const DEV_ID of reqParams.DEV_IDs) {
    resData[DEV_ID] = await httpRouter.privateRoutes['/get-dev-full-info']({ DEV_ID }, session)
      .then((res) => ({
        ...res, ...res.info
      }));
  }
  return resData;
}

httpRouter.privateRoutes['/get-devs-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const rows = await sqldb.DEVICES.getDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
  });
  const machinesList = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: reqParams.clientIds });
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DEV_ID) : undefined,
  });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText && reqParams.searchText.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list = [];

  for (const regDevRaw of rows) {
    const status = lastMessagesTimes.connectionStatus(regDevRaw.DEV_ID) || 'OFFLINE';
    const damMachine = machinesList.filter((machine) => ((machine.DEV_AUT === regDevRaw.DEV_ID) || (machine.DUT_ID === regDevRaw.DEV_ID))).map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null;
    const unComis = (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID);

    const regDev = {
      DEV_ID: regDevRaw.DEV_ID,
      UNIT_ID: regDevRaw.UNIT_ID,
      UNIT_NAME: regDevRaw.UNIT_NAME,
      CITY_NAME: regDevRaw.CITY_NAME,
      STATE_ID: regDevRaw.STATE_ID,
      CLIENT_ID: regDevRaw.CLIENT_ID,
      CLIENT_NAME: regDevRaw.CLIENT_NAME,
      status,
      machineName: damMachine,
      // devType: regDevRaw.DEV_ID.substr()
    };

    if (reqParams.ownershipFilter) {
      if (reqParams.ownershipFilter === 'CLIENTS') {
        if (!(regDevRaw.CLIENT_ID && (regDevRaw.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if (reqParams.ownershipFilter === 'N-COMIS') {
        if (!(unComis)) continue;
      }
      else if (reqParams.ownershipFilter === 'N-ASSOC') {
        if (!((!regDevRaw.CLIENT_ID) && (!unComis))) continue;
      }
      else if (reqParams.ownershipFilter === 'MANUFAC') {
        if (!(regDevRaw.CLIENT_ID && manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
        if (!(regDevRaw.CLIENT_ID === servConfig.dielClientId)) continue;
      }
    }
    if (searchTerms && searchTerms.length > 0) {
      let shouldNotInclude = false;
      for (const searchTerm of searchTerms) {
        if (regDevRaw.STATE_ID && regDevRaw.STATE_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.CITY_NAME && regDevRaw.CITY_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.UNIT_NAME && regDevRaw.UNIT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.CLIENT_NAME && regDevRaw.CLIENT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (damMachine && damMachine.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.DEV_ID && regDevRaw.DEV_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (regDev.status && regDev.status.toLowerCase().includes(searchTerm)) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) {
      continue;
    }
    list.push(regDev);
  }

  return { list, totalItems };
}

httpRouter.privateRoutes['/dut/get-compatibility-list'] = async function (reqParams, session) {
  if (!reqParams.dutIds) throw Error('Invalid parameters! Missing dutIds').HttpStatus(400);

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS && !(reqParams.dutIds.length && await verifyClientsDuts(reqParams.dutIds, session))) { 
    throw Error('Not allowed').HttpStatus(403)
  }

  const ctrloper = dutModeMinimumVersion.find(item => (reqParams.CTRLOPER && item.mode === reqParams.CTRLOPER) || (reqParams.FORCED_BEHAVIOR && item.mode === reqParams.FORCED_BEHAVIOR));
  const ctrloperMinimumVersion: VersionNumber = ctrloper ? ctrloper.minimumVersion : {
    vMajor: 0,
    vMinor: 0,
    vPatch: 0,
  };
  const response = [] as {
    DUT_ID: string,
    compatible: boolean
  }[];

  for (const dutId of reqParams.dutIds) {
    const infoDb = await sqldb.DEVFWVERS.getDevFwInfo({ devId: dutId });
    const parsedVersion = parseFirmwareVersion(infoDb.CURRFW_VERS);
    const devParsedVersion: VersionNumber = parsedVersion || {
      vMajor: 0,
      vMinor: 0,
      vPatch: 0,
    };

    response.push({
      DUT_ID: dutId,
      compatible: compareVersions(devParsedVersion, ctrloperMinimumVersion, false) >= 0
    });

  }

  return {dutsCompatibility: response};
}

async function verifyClientsDuts(duts: string[], session: SessionData) {
  const dutsClients = await sqldb.DUTS.getClientDuts({ devIds: duts });
  for (const dut of dutsClients) {
    const perms = await getPermissionsOnClient(session, dut.CLIENT_ID);
    if (!perms.canEditProgramming) return false;
  }

  return !!dutsClients.length
}

/**
 * @swagger
 * /devices/get-offline-device-info:
 *   post:
 *     summary: Informações dos dipositivos offline
 *     description: Buscar as informações sobre o Cliente e Unidade do dispositivo
 *     tags:
 *       - Devices
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Dispositivo
 *         schema:
 *           type: object
 *           properties:
 *             DEVICE_CODE:
 *               type: string
 *               description: Código do dispositivo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações do Dispositivo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   DEVICE:
 *                     type: object
 *                     properties:
 *                       DEVICE_CODE:
 *                         type: string
 *                         description: Código do dispositivo
 *                       UNIT_ID:
 *                         type: number
 *                         description: ID da Unidade
 *                       UNIT_NAME:
 *                         type: string
 *                         description: Nome da Unidade
 *                       CLIENT_ID:
 *                         type: number
 *                         description: ID do Cliente
 *                       CLIENT_NAME:
 *                         type: string
 *                         description: Nome do Cliente
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Erro de Permissão.
 *       500:
 *         description: Erro interno do servidor.
 */
httpRouter.privateRoutes['/devices/get-offline-device-info'] = async function (reqParams, session) {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE.').HttpStatus(400);
  const deviceInfo = await sqldb.DEVICES.getDeviceInfo({DEVICE_CODE: reqParams.DEVICE_CODE });
  
  if (!deviceInfo) return { device: null };

  const perms = await getPermissionsOnUnit(session, deviceInfo.CLIENT_ID, deviceInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  return { device: deviceInfo };
}

/**
 * @swagger
 * /devices/get-config-devices:
 *   post:
 *     summary: Lista de dispositivos e suas configurações
 *     description: Retorna uma lista de dispositivos e suas configurações para fazer querys no dynamoDB
 *     tags:
 *       - Devices
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               required: true
 *               type: number
 *               default: null
 *               description: Id da Unidade
 *             DAY:
 *               required: true
 *               type: string
 *               default: null
 *               description: Dia que está sendo processado os dispositivos
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   devices:
 *                     type: array
 *                     items:
 *                        type: object
 *                        properties:
 *                          dacs_devices:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  MACHINE_ID:
 *                                    type: number
 *                                    description: ID da máquina
 *                                  MACHINE_NAME:
 *                                    type: string
 *                                    description: Nome da máquina
 *                                  MACHINE_KW:
 *                                    type: number
 *                                    description: Potência nominal da máquina
 *                                  IS_VRF:
 *                                    type: boolean
 *                                    description: Se o tipo da máquina é VRF
 *                                  CALCULATE_L1_FANCOIL:
 *                                    type: boolean
 *                                    description: Se é pra calcular o L1 Fancoil
 *                                  HAS_AUTOMATION:
 *                                    type: boolean
 *                                    description: Se tem automação
 *                                  FLUID_TYPE:
 *                                    type: string
 *                                    description: O tipo de fluído da máquina
 *                                  P0_PSUC:
 *                                    type: boolean
 *                                    description: Se o P0 é psuc
 *                                  P1_PSUC:
 *                                    type: boolean
 *                                    description: Se o P1 é psuc
 *                                  P0_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P0 é pliq
 *                                  P1_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P1 é pliq
 *                                  P0_MULT:
 *                                    type: number
 *                                    description: Valor do p0_mult
 *                                  P1_MULT:
 *                                    type: number
 *                                    description: Valor do p1_mult
 *                                  P0_OFST:
 *                                    type: number
 *                                    description: Valor do p0_ofst
 *                                  P1_OFST:
 *                                    type: number
 *                                    description: Valor do p1_ofst
 *                                  T0_T1_T2:
 *                                    type: array
 *                                    description: Array T0 T1 T2
 *                                  VIRTUAL_L1:
 *                                    type: boolean
 *                                    description: Se tem L1 virtual
 *                            dacs_to_l1_automation:
 *                              type: array
 *                              items:
 *                                type: object
 *                                properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  MACHINE_ID:
 *                                    type: number
 *                                    description: ID da máquina
 *                                  MACHINE_NAME:
 *                                    type: string
 *                                    description: Nome da máquina
 *                                  MACHINE_KW:
 *                                    type: number
 *                                    description: Potência nominal da máquina
 *                                  IS_VRF:
 *                                    type: boolean
 *                                    description: Se o tipo da máquina é VRF
 *                                  CALCULATE_L1_FANCOIL:
 *                                    type: boolean
 *                                    description: Se é pra calcular o L1 Fancoil
 *                                  HAS_AUTOMATION:
 *                                    type: boolean
 *                                    description: Se tem automação
 *                                  FLUID_TYPE:
 *                                    type: string
 *                                    description: O tipo de fluído da máquina
 *                                  P0_PSUC:
 *                                    type: boolean
 *                                    description: Se o P0 é psuc
 *                                  P1_PSUC:
 *                                    type: boolean
 *                                    description: Se o P1 é psuc
 *                                  P0_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P0 é pliq
 *                                  P1_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P1 é pliq
 *                                  P0_MULT:
 *                                    type: number
 *                                    description: Valor do p0_mult
 *                                  P1_MULT:
 *                                    type: number
 *                                    description: Valor do p1_mult
 *                                  P0_OFST:
 *                                    type: number
 *                                    description: Valor do p0_ofst
 *                                  P1_OFST:
 *                                    type: number
 *                                    description: Valor do p1_ofst
 *                                  T0_T1_T2:
 *                                    type: array
 *                                    description: Array T0 T1 T2
 *                                  VIRTUAL_L1:
 *                                    type: boolean
 *                                    description: Se tem L1 virtual
 *                                  machine_autom_intervals:
 *                                    type: array
 *                                    items:
 *                                      type: object
 *                                      properties:
 *                                        seconds_start:
 *                                          type: number
 *                                          description: seconds to start automation
 *                                        seconds_end:
 *                                          type: number
 *                                          description: seconds to end automation
 *                                        must_be_on:
 *                                          type: boolean
 *                                          description: indicates whether the machine must be on
 *                          dacs_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  MACHINE_ID:
 *                                    type: number
 *                                    description: ID da máquina
 *                                  MACHINE_NAME:
 *                                    type: string
 *                                    description: Nome da máquina
 *                                  MACHINE_KW:
 *                                    type: number
 *                                    description: Potência nominal da máquina
 *                                  IS_VRF:
 *                                    type: boolean
 *                                    description: Se o tipo da máquina é VRF
 *                                  CALCULATE_L1_FANCOIL:
 *                                    type: boolean
 *                                    description: Se é pra calcular o L1 Fancoil
 *                                  HAS_AUTOMATION:
 *                                    type: boolean
 *                                    description: Se tem automação
 *                                  FLUID_TYPE:
 *                                    type: string
 *                                    description: O tipo de fluído da máquina
 *                                  P0_PSUC:
 *                                    type: boolean
 *                                    description: Se o P0 é psuc
 *                                  P1_PSUC:
 *                                    type: boolean
 *                                    description: Se o P1 é psuc
 *                                  P0_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P0 é pliq
 *                                  P1_PLIQ:
 *                                    type: boolean
 *                                    description: Se o P1 é pliq
 *                                  P0_MULT:
 *                                    type: number
 *                                    description: Valor do p0_mult
 *                                  P1_MULT:
 *                                    type: number
 *                                    description: Valor do p1_mult
 *                                  P0_OFST:
 *                                    type: number
 *                                    description: Valor do p0_ofst
 *                                  P1_OFST:
 *                                    type: number
 *                                    description: Valor do p1_ofst
 *                                  T0_T1_T2:
 *                                    type: array
 *                                    description: Array T0 T1 T2
 *                                  VIRTUAL_L1:
 *                                    type: boolean
 *                                    description: Se tem L1 virtual
 *                          duts_devices:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  MACHINE_ID:
 *                                    type: number
 *                                    description: ID da máquina
 *                                  MACHINE_NAME:
 *                                    type: string
 *                                    description: Nome da máquina
 *                                  MACHINE_KW:
 *                                    type: number
 *                                    description: Potência nominal da máquina
 *                                  TEMPERATURE_OFFSET:
 *                                    type: number
 *                                    description: Valor do offset de temperatura
 *                                  has_energy_efficiency:
 *                                    type: boolean
 *                                    description: Indicates wheter will be considereted in ennergy efficiency
 *                          duts_to_l1_automation:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  MACHINE_ID:
 *                                    type: number
 *                                    description: ID da máquina
 *                                  MACHINE_NAME:
 *                                    type: string
 *                                    description: Nome da máquina
 *                                  MACHINE_KW:
 *                                    type: number
 *                                    description: Potência nominal da máquina
 *                                  TEMPERATURE_OFFSET:
 *                                    type: number
 *                                    description: Valor do offset de temperatura
 *                                  machine_autom_intervals:
 *                                    type: array
 *                                    items:
 *                                      type: object
 *                                      properties:
 *                                        seconds_start:
 *                                          type: number
 *                                          description: seconds to start automation
 *                                        seconds_end:
 *                                          type: number
 *                                          description: seconds to end automation
 *                                        must_be_on:
 *                                          type: boolean
 *                                          description: indicates whether the machine must be on
 *                                  has_energy_efficiency:
 *                                    type: boolean
 *                                    description: Indicates wheter will be considereted in ennergy efficiency
 *                          duts_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  TEMPERATURE_OFFSET:
 *                                    type: number
 *                                    description: Valor do offset de temperatura
 *                          dma_device:
 *                            type: object
 *                            properties:
 *                               DEVICE_CODE:
 *                                 type: string
 *                                 description: Código do dispositivo
 *                               LITERS_PER_PULSE:
 *                                 type: number
 *                                 description: Quantidade de litros por pulso 
 *                               INSTALLATION_DATE:
 *                                 type: string
 *                                 description: Data de instalação
 *                          laager_device:
 *                            type: object
 *                            properties:
 *                               LAAGER_CODE:
 *                                 type: string
 *                                 description: Código do dispositivo Laager
 *                               INSTALLATION_DATE:
 *                                 type: string
 *                                 description: Data de instalação
 *                          dmts_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                          dals_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                          dams_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                          dris_to_disponibility:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  DRI_TYPE:
 *                                    type: string
 *                                    description: Tipo do DRI
 *                                  DRI_INTERVAL:
 *                                    type: number
 *                                    description: Intervalo do DRI
 *                                  formulas:
 *                                    type: object
 *                                    description: Fórmulas do DRI
 *                          energy_devices:
 *                            type: array
 *                            items:
 *                               type: object
 *                               properties:
 *                                  DEVICE_CODE:
 *                                    type: string
 *                                    description: Código do dispositivo
 *                                  SERIAL:
 *                                    type: string
 *                                    description: Serial do medidor de energia
 *                                  MANUFACTURER:
 *                                    type: string
 *                                    description: Fornecedor do medidor de energia
 *                                  MODEL:
 *                                    type: string
 *                                    description: Modelo do medidor de energia
 *                                  ELECTRIC_CIRCUIT_ID:
 *                                    type: number
 *                                    description: ID do circuito elétrico
 *                                  ELECTRIC_CIRCUIT_NAME:
 *                                    type: string
 *                                    description: Nome do circuito elétrico
 *                                  formulas:
 *                                    type: object
 *                                    description: Fórmulas do medidor de energia
 *                                  DRI_INTERVAL:
 *                                    type: number
 *                                    description: Intervalo do DRI
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */


export const getConfigDevices = async (reqParams: httpRouter.ApiParams['/devices/get-config-devices'], session: SessionData) => {
  if (!reqParams.UNIT_ID) throw Error('Invalid properties. Missing UNIT_ID').HttpStatus(400);
  if (!reqParams.DAY) throw Error ('Invalid properties. Missing Day').HttpStatus(400);
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission Denied!').HttpStatus(403);
  }

  // CONSUMO DE ÁGUA
  const { dma_device, laager_device } = await verifyWaterDevice(reqParams.UNIT_ID, reqParams.DAY);

  // DACS to l1 automation and energy efficiency
  const dacs_devices = await sqldb.DACS_DEVICES.getDacsByUnitWithMachineInfo({ UNIT_ID: unitInfo.UNIT_ID });

  const dacs_to_l1_automation = [];
  const dacs_devices_info: ApiResps['/devices/get-config-devices']['devices']['dacs_devices'] = [];
  for (const data of dacs_devices) {
    const hwCfg = dacData.dacHwCfg(data.DEVICE_CODE, data);
    if (data.MACHINE_ID && data.ASSET_ID) {
      const automInfo = await sqldb.MACHINES.getMachineAutInfo({ MACHINE_ID: data.MACHINE_ID});
      let machine_autom_intervals: {
        seconds_start: number,
        seconds_end: number,
        must_be_on: boolean
      }[] = [];
      if (automInfo?.DEV_AUT) {
        machine_autom_intervals = await getSecondsCurrentProgAutom({ machineId: data.MACHINE_ID, deviceCode: automInfo.DEV_AUT, day: reqParams.DAY});
        
        if (machine_autom_intervals.length > 0) {
          dacs_to_l1_automation.push({
            DEVICE_CODE: data.DEVICE_CODE,
            MACHINE_ID: data.MACHINE_ID,
            MACHINE_NAME: data.MACHINE_NAME,
            MACHINE_KW: data.MACHINE_KW,
            IS_VRF: hwCfg.isVrf,
            CALCULATE_L1_FANCOIL: hwCfg.calculate_L1_fancoil,
            HAS_AUTOMATION: hwCfg.hasAutomation,
            FLUID_TYPE: hwCfg.FLUID_TYPE,
            P0_PSUC: hwCfg.P0Psuc,
            P1_PSUC: hwCfg.P1Psuc,
            P0_PLIQ: hwCfg.P0Pliq,
            P1_PLIQ: hwCfg.P1Pliq,
            P0_MULT_QUAD: hwCfg.P0multQuad,
            P0_MULT_LIN: hwCfg.P0multLin,
            P0_MULT: hwCfg.P0multLin,
            P1_MULT_QUAD: hwCfg.P1multQuad,
            P1_MULT_LIN: hwCfg.P1multLin,
            P1_MULT: hwCfg.P1multLin,
            P0_OFST: hwCfg.P0ofst,
            P1_OFST: hwCfg.P1ofst,
            T0_T1_T2: hwCfg.TsensRename && [
              hwCfg.TsensRename.T0,
              hwCfg.TsensRename.T1,
              hwCfg.TsensRename.T2,
            ],
            VIRTUAL_L1: hwCfg.simulateL1,
            DEVICE_CODE_AUTOM: automInfo.DEV_AUT,
            ASSET_ID: data.ASSET_ID,
            ASSET_NAME: data.ASSET_NAME,
            machine_autom_intervals,
            V_MAJOR: data.V_MAJOR,
          });
          continue;
        }
      }
    }

    dacs_devices_info.push({
      DEVICE_CODE: data.DEVICE_CODE,
      MACHINE_ID: data.MACHINE_ID,
      MACHINE_NAME: data.MACHINE_NAME,
      MACHINE_KW: data.MACHINE_KW,
      IS_VRF: hwCfg.isVrf,
      CALCULATE_L1_FANCOIL: hwCfg.calculate_L1_fancoil,
      HAS_AUTOMATION: hwCfg.hasAutomation,
      FLUID_TYPE: hwCfg.FLUID_TYPE,
      P0_PSUC: hwCfg.P0Psuc,
      P1_PSUC: hwCfg.P1Psuc,
      P0_PLIQ: hwCfg.P0Pliq,
      P1_PLIQ: hwCfg.P1Pliq,
      P0_MULT_QUAD: hwCfg.P0multQuad,
      P0_MULT_LIN: hwCfg.P0multLin,
      P0_MULT: hwCfg.P0multLin,
      P1_MULT_QUAD: hwCfg.P1multQuad,
      P1_MULT_LIN: hwCfg.P1multLin,
      P1_MULT: hwCfg.P1multLin,
      P0_OFST: hwCfg.P0ofst,
      P1_OFST: hwCfg.P1ofst,
      T0_T1_T2: hwCfg.TsensRename && [
        hwCfg.TsensRename.T0,
        hwCfg.TsensRename.T1,
        hwCfg.TsensRename.T2,
      ],
      VIRTUAL_L1: hwCfg.simulateL1,
      V_MAJOR: data.V_MAJOR,
    });
  };

  // DUTS to l1 automation and energy efficiency
  const dutsDuoToEnergyEfficiencyByUnit = await sqldb.DUTS.getDutsDuoByUnit({ UNIT_ID: unitInfo.UNIT_ID, GROUP_BY_DEVICE: true });
  const dutsDuoToL1Automation = await sqldb.DUTS.getDutsDuoToL1AutomationByUnit({ UNIT_ID: unitInfo.UNIT_ID, GROUP_BY_DEVICE: true });
  const duts_devices: (Awaited<ReturnType<typeof sqldb.DUTS.getDutsDuoByUnit>>[0]&{has_energy_efficiency: boolean})[] =  [];

  const duts_to_l1_automation = [];

  for (const dutDuo of dutsDuoToL1Automation) {
    if (dutDuo.MACHINE_ID) {
      const automInfo = await sqldb.MACHINES.getMachineAutInfo({ MACHINE_ID: dutDuo.MACHINE_ID});
      let machine_autom_intervals: {
        seconds_start: number,
        seconds_end: number,
        must_be_on: boolean
      }[] = [];

      if (automInfo?.DEV_AUT) {
        machine_autom_intervals = await getSecondsCurrentProgAutom({ machineId: dutDuo.MACHINE_ID, deviceCode: automInfo.DEV_AUT, day: reqParams.DAY});
        
        if (machine_autom_intervals.length > 0) {
          const dutInfoToEfficiency = dutsDuoToEnergyEfficiencyByUnit.find(item => item.DEVICE_CODE === dutDuo.DEVICE_CODE);
          duts_to_l1_automation.push({
            ...dutDuo,
            MACHINE_KW: dutInfoToEfficiency ? dutInfoToEfficiency.MACHINE_KW : dutDuo.MACHINE_KW,
            DEVICE_CODE_AUTOM: automInfo.DEV_AUT,
            machine_autom_intervals,
            has_energy_efficiency: !!dutInfoToEfficiency
          });
          continue;
        }
      }
    }
  }

  for (const dutDuo of dutsDuoToEnergyEfficiencyByUnit) {
    if (!dutsDuoToL1Automation.find(item => item.DEVICE_CODE === dutDuo.DEVICE_CODE)) {
      duts_devices.push({...dutDuo, has_energy_efficiency: true});
    }
  }

  // MEDIDOR DE ENERGIA
  const energy_devices = await sqldb.ENERGY_DEVICES_INFO.getEnergyDevicesDriByUnit({ UNIT_ID: unitInfo.UNIT_ID });
  
  let energy_devices_info = await Promise.all(energy_devices.map(async (data) => {
    const { drisCfg } = await loadDrisCfg({
      skipSchedule: true,
      devIds: [data.DEVICE_CODE],
    });
    const formulas = getDrisCfgFormulas(drisCfg[data.DEVICE_CODE]);
    const dri_interval = Number(drisCfg[data.DEVICE_CODE]?.driConfigs?.find((cfg) => cfg.protocol === 'interval')?.value) || 300;

    return {
      DEVICE_CODE: data.DEVICE_CODE,
      SERIAL: data.SERIAL,
      MANUFACTURER: data.MANUFACTURER,
      MODEL: data.MODEL,
      ELECTRIC_CIRCUIT_ID: data.ELECTRIC_CIRCUIT_ID,
      ELECTRIC_CIRCUIT_NAME: data.ELECTRIC_CIRCUIT_NAME,
      formulas,
      DRI_INTERVAL: dri_interval,
    }
  }))
  
  const {
    duts_to_disponibility,
    dacs_to_disponibility,
    dris_to_disponibility,
    dmts_to_disponibility,
    dals_to_disponibility,
    dams_to_disponibility,
  } = await getDevicesToDisponibility(unitInfo.UNIT_ID, dacs_devices_info, duts_devices, energy_devices, duts_to_l1_automation);

  return {
    devices: {
      energy_devices: energy_devices_info,
      dacs_devices: dacs_devices_info,
      dacs_to_l1_automation,
      duts_devices,
      duts_to_l1_automation,
      dma_device,
      laager_device,
      duts_to_disponibility,
      dacs_to_disponibility,
      dris_to_disponibility,
      dmts_to_disponibility,
      dals_to_disponibility,
      dams_to_disponibility,
    },
  };
}

httpRouter.privateRoutes['/devices/get-config-devices'] = getConfigDevices;

export async function getSecondsCurrentProgAutom(pars: {machineId: number, deviceCode: string, day: string}): Promise<{seconds_start: number, seconds_end: number, must_be_on: boolean}[]> {
  const weekDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const date = momentTimezone(pars.day);
  let daySchedule = weekDay[date.day()];

  try {
    if (pars.deviceCode.startsWith('DAM') || pars.deviceCode.startsWith('DAC')) {
      const currentData = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: pars.deviceCode});
      const currentProg = currentData.LAST_PROG ? JSON.parse(currentData.LAST_PROG) : {};
      if (!currentProg.week[daySchedule] || !currentProg.week[daySchedule].start || !currentProg.week[daySchedule].end) {
        return [];
      }
      const seconds_start = hoursMinutesToSeconds(currentProg.week[daySchedule].start);
      const seconds_end = hoursMinutesToSeconds(currentProg.week[daySchedule].end);
      return [{seconds_start, seconds_end, must_be_on: currentProg.week[daySchedule].permission === 'allow'}];
    }
    if (pars.deviceCode.startsWith('DUT') || pars.deviceCode.startsWith('DRI')) {
      const schedules = await sqldb.SCHEDULES.getSchedulesHoursFromDay({ MACHINE_ID: pars.machineId, weekDay: daySchedule });
      const automIntervals: {seconds_start: number, seconds_end: number, must_be_on: boolean}[] = [];
      if (schedules.length === 0) {
        return [];
      }
  
      schedules.forEach(schedule => automIntervals.push({
        seconds_start: hoursMinutesToSeconds(schedule.BEGIN_TIME),
        seconds_end: hoursMinutesToSeconds(schedule.END_TIME),
        must_be_on: schedule.PERMISSION !== 'forbid'
      }))
      return automIntervals;
    }
  }
  catch (err) {
    logger.error({
      message: `Error getSecondsCurrentProgAutom`,
      parameters: pars,
      err: err,
      stack: (err as Error).stack
    });
    return [];
  }
  return [];
}

export const getDevicesToDisponibility = async (
  unitId: number,
  dacs_devices_list: ApiResps['/devices/get-config-devices']['devices']['dacs_devices'],
  duts_devices_list: Awaited<ReturnType<typeof sqldb.DUTS.getDutsDuoByUnit>>,
  dris_energy_devices_list : Awaited<ReturnType<typeof sqldb.ENERGY_DEVICES_INFO.getEnergyDevicesDriByUnit>>,
  duts_to_l1_automation: Awaited<ReturnType<typeof sqldb.DUTS.getDutsDuoByUnit>>,
  ) => {
  const allDuts = await sqldb.DUTS.getAllDutsByUnit({ UNIT_ID: unitId });
  const duts_to_disponibility = allDuts.filter(dut => !duts_devices_list.some(device => device.DEVICE_CODE === dut.DEVICE_CODE) && !duts_to_l1_automation.some(device => device.DEVICE_CODE === dut.DEVICE_CODE));


  const dacs_to_disponibility = [];

  for (let i = dacs_devices_list.length - 1; i >= 0; i--) {
    if (!dacs_devices_list[i].MACHINE_ID) {
      dacs_to_disponibility.push(dacs_devices_list.pop());
    }
  }

  const allDris = await sqldb.DRIS_DEVICES.getAllDrisByUnit({ UNIT_ID: unitId });
  const dris_filtered = allDris.filter(dri => !dris_energy_devices_list.some(device => device.DEVICE_CODE === dri.DEVICE_CODE));

  const dris_to_disponibility = await Promise.all(dris_filtered.map(async (data) => {
    const driCfg = await loadDriCfg(data.DEVICE_CODE);
    const formulas = driCfg?.formulas;
    const dri_type = applicationType[driCfg?.application];
    const dri_interval = Number(driCfg?.driConfigs?.find((cfg) => cfg.protocol === 'interval')?.value) || undefined;
    

    return {
      DEVICE_CODE: data.DEVICE_CODE,
      DRI_TYPE: dri_type,
      DRI_INTERVAL: dri_interval,
      formulas,
    }
  }));

  const dmts_to_disponibility = await sqldb.DMTS.getAllDmtsByUnit({ UNIT_ID: unitId });

  const dals_to_disponibility = await sqldb.DALS.getAllDalsByUnit({ UNIT_ID: unitId });

  const dams_to_disponibility = await sqldb.DAMS_DEVICES.getAllDamsByUnit({ UNIT_ID: unitId});

  return { duts_to_disponibility, dacs_to_disponibility, dris_to_disponibility, dmts_to_disponibility, dals_to_disponibility, dams_to_disponibility }
}

export const verifyWaterDevice = async (UNIT_ID: number, DAY: string) => {
  let dma_device: { DEVICE_CODE: string, LITERS_PER_PULSE?: number, INSTALLATION_DATE?: string } = null;
  let laager_device: { LAAGER_CODE: string, INSTALLATION_DATE?: string } = null;
  const dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID, dateStart: DAY, dateEnd: DAY });
  const laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID, dateStart: DAY, dateEnd: DAY });

  const actualDmaInfo = await sqldb.DMAS_DEVICES.getDmaInfoByUnit({ UNIT_ID });
  const actualLaagerInfo = await sqldb.LAAGER.getLaagerByUnit({ UNIT_ID });

  const foundDeviceExchangeDay = !!(dmaIds.length && laagerIds.length);
  const lastDeviceIsDma = foundDeviceExchangeDay && laagerIds[laagerIds.length -1].FULL_START_DATE < dmaIds[dmaIds.length - 1].FULL_START_DATE;

  if (laagerIds.length && laagerIds[laagerIds.length -1].LAAGER_ID && !lastDeviceIsDma) {
    const device = laagerIds[laagerIds.length -1].LAAGER_ID;
    const laagerInfo = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: device });
    laager_device = { LAAGER_CODE: device, INSTALLATION_DATE: laagerInfo.INSTALLATION_DATE };
  } else if (dmaIds.length && dmaIds[dmaIds.length -1].DMA_ID) {
    const dmaId = dmaIds[dmaIds.length - 1].DMA_ID;
    const dmaDevice = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: dmaId });
    const litersPerPulse = dmaDevice.HYDROMETER_MODEL && Number(dmaDevice.HYDROMETER_MODEL.substring(
      dmaDevice.HYDROMETER_MODEL.indexOf("(") + 1, 
      dmaDevice.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);
    dma_device = { DEVICE_CODE: dmaId, LITERS_PER_PULSE: litersPerPulse, INSTALLATION_DATE: dmaDevice.INSTALLATION_DATE_YMD };
  }

  if (!dma_device && actualDmaInfo) {
    const litersPerPulse = actualDmaInfo.HYDROMETER_MODEL && Number(actualDmaInfo.HYDROMETER_MODEL.substring(
      actualDmaInfo.HYDROMETER_MODEL.indexOf("(") + 1, 
      actualDmaInfo.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);
    dma_device = { DEVICE_CODE: actualDmaInfo.DMA_ID, LITERS_PER_PULSE: litersPerPulse, INSTALLATION_DATE: actualDmaInfo.INSTALLATION_DATE_YMD };
  } else if (!laager_device && actualLaagerInfo) {
    laager_device = { LAAGER_CODE: actualLaagerInfo.LAAGER_CODE, INSTALLATION_DATE: actualLaagerInfo.INSTALLATION_DATE };
  }

  return { dma_device, laager_device }
}


/**
 * @swagger
 * /dev/get-health-power-data:
 *   post:
 *     summary: Informações de saúde e potência associados a dispositivos
 *     description: Obtém a saúde dos ativos associados a cada dispositivo, se existir. Obtém a potência associada aos ativos de cada dispositivo.
 *     tags:
 *       - Devices
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros de query
 *         schema:
 *           type: object
 *           properties:
 *             clientIds:
 *               type: array
 *               description: Ids de cliente nos quais buscar os resultados.
 *               default: ""
 *               required: false
 *             unitIds:
 *               type: array
 *               description: Ids de unidades nas quais buscar os resultados.
 *               default: ""
 *               required: false
 *             cityIds:
 *               type: array
 *               description: Ids de cidades nas quais buscar os resultados.
 *               default: ""
 *               required: false
 *             stateIds:
 *               type: array
 *               description: Ids de estados nos quais buscar os resultados.
 *               default: ""
 *               required: false
 *             groupIds:
 *               type: array
 *               description: Ids de máquinas nas quais buscar os resultados.
 *               default: ""
 *               required: false
 *             SKIP:
 *               type: number
 *               description: Índice do primeiro resultado. Usado para paginação.
 *               required: false
 *             LIMIT:
 *               type: array
 *               description: Número máximo de resultados adicionados. Usado para paginação.
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Informações do Dispositivo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   list:
 *                     type: array
 *                     properties:
 *                       DEV_ID:
 *                         type: string
 *                         description: Código do dispositivo
 *                       UNIT_ID:
 *                         type: number
 *                         description: ID da Unidade
 *                       UNIT:
 *                         type: string
 *                         description: Nome da Unidade
 *                       CLIENT_ID:
 *                         type: number
 *                         description: ID do Cliente
 *                       CLIENT:
 *                         type: string
 *                         description: Nome do Cliente
 *                       STATE_NAME:
 *                         type: string
 *                         description: Nome do estado
 *                       CITY_NAME:
 *                         type: string
 *                         description: Nome da cidade
 *                       capacityKw:
 *                         type: number
 *                         description: Potência associada ao ativo do dispositivo, convertida para kW.
 *                       H_INDEX:
 *                         type: number
 *                         description: Índice de saúde, de acordo com formato padrão (0, 1, 2, 3, 4, 25, 50, 75 e 100 são valores válidos).
 *                       H_DATE:
 *                         type: string
 *                         description: Data da saúde em formato ISO8601.
 *                       MACHINE_ID:
 *                         type: number
 *                         description: ID da máquina associada ao dispositivo.
 *                   totalItems:
 *                     type: number
 *                     description: Número total de itens no conjunto de resultados total (ie desconsiderando SKIP e LIMIT), para uso de paginação.
 *       403:
 *         description: Erro de Permissão.
 *       500:
 *         description: Erro interno do servidor.
 */
export const getDevicesHealthPower : API_private['/dev/get-health-power-data'] = async function (reqParams, session) {
  let filteredParams: (typeof reqParams) & { INCLUDE_INSTALLATION_UNIT?: boolean } = reqParams;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { 
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    filteredParams.clientIds = filteredParams.clientIds ?? allowedClients;
    filteredParams.clientIds = filteredParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits) {
      filteredParams.unitIds = filteredParams.unitIds ?? allowedUnits;
      filteredParams.unitIds = filteredParams.unitIds.filter(x => allowedUnits.includes(x));
    }
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(filteredParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) {
      filteredParams = {
        INCLUDE_INSTALLATION_UNIT: true,
        ...filteredParams
      }
    }
  }
  
  const manufacturers: number[] = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);

  const excludedClients = [servConfig.dielClientId, ...manufacturers];

  const qPars: Parameters<typeof sqldb.DEVICES.getDevicesMachineHealthPower>[0] = {
    clientIds: filteredParams.clientIds,
    stateIds: filteredParams.stateIds,
    cityIds: filteredParams.cityIds,
    unitIds: filteredParams.unitIds,
    machineIds: filteredParams.groupIds,
    INCLUDE_INSTALLATION_UNIT: filteredParams.INCLUDE_INSTALLATION_UNIT,
    SKIP: filteredParams.SKIP,
    LIMIT: filteredParams.LIMIT,
    excludeClients: excludedClients,
  }
  let {rows, totalItems} = await sqldb.DEVICES.getDevicesMachineHealthPower(qPars);
  
  const list = rows.map((regDevRaw) => {
    const unitConversion = powerConv_kW[regDevRaw.ASSET_CAPACITY_UNIT] ?? NaN;
    let capacityKW = ((regDevRaw.ASSET_CAPACITY_POWER) ?? NaN) / unitConversion;
    capacityKW = Math.round(capacityKW * 10) / 10;
    
    if (Number.isNaN(capacityKW)) {
      capacityKW = null;
    }

    const regDev = Object.assign(regDevRaw, {
      capacityKW,
    })

    delete regDev.ASSET_CAPACITY_POWER;
    delete regDev.ASSET_CAPACITY_UNIT;
    return regDev;
  });
  
  return { list, totalItems };
}

httpRouter.privateRoutes['/dev/get-health-power-data'] = getDevicesHealthPower;
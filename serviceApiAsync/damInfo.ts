import * as httpRouter from './apiServer/httpRouter'
import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener'
import * as devStatus from '../srcCommon/helpers/devsLastComm'
import { FaultsActs, SessionData } from '../srcCommon/types'
import { ControlMsgFirmwareVersion, MsgDamExtThermCfg, MsgDamEchoJson, DutMsg_TemperatureControlState } from '../srcCommon/types/devicesMessages'
import sqldb from '../srcCommon/db'
import { setGetDevInfo } from './devInfo'
import * as groups from './clientData/machines'
import * as devInfo from './devInfo'
import { FullProgV4_to_deprecated_FullProgV3, parseFullProgV4 } from '../srcCommon/helpers/scheduleData'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import servConfig from '../configfile'
import * as dacData from '../srcCommon/helpers/dacData'
import { operatesEcoMode } from '../srcCommon/helpers/dutAutomation'
import { now_shiftedTS_s, zeroPad } from '../srcCommon/helpers/dates'
import { logger } from '../srcCommon/helpers/logger'
import { getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, canSeeDevicesWithoutProductionUnit } from '../srcCommon/helpers/permissionControl'
import {
  DamCmd_SetLocalEcoCfg,
  DamCmd_SetEcoCfg,
} from '../srcCommon/types/devicesCommands'
import { sendDamCommand_setEcoLocalCfg, sendDamCommand_setEcoCfg, sendDamCommand_setExtThermCfg, sendDamCommand_setSensorsTemperature, sendDamCommand_reset } from '../srcCommon/iotMessages/devsCommands';
import { parseFirmwareVersion, versionIsAtLeast, compareVersions, VersionNumber } from '../srcCommon/helpers/fwVersion';
import { isTemporaryId } from '../srcCommon/helpers/devInfo'
import * as eventHooks from './realTime/eventHooks'
import * as damEcoEventHooks from './ecoModeDam/eventHooks'
import { setMachineCurrentAutomation } from './clientData/machines';
import { loadAutomationRefs } from '../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'
import { loadDrisCfg } from '../srcCommon/helpers/ramcacheLoaders/drisCfgLoader'
import { loadDamsEcoCfg } from '../srcCommon/helpers/ramcacheLoaders/damsEcoCfgLoader'
import { corrigirHorario } from './clientData/units_getEnvironmentsListPage'
import { getRtypeTemprtAlert } from './clientData/units'
import { compareValues } from '../srcCommon/helpers/orderColumns'

type EnvRow = httpRouter.ApiResps['/dam/get-dams-list']['list'][number];

const descOper = {
  'allow': 'Liberado',
  'forbid': 'Bloqueado',
  'onlyfan': 'Ventilação',
  'enabling': 'Habilitando',
  'disabling': 'Bloqueando',
  'eco': 'Eco-Mode',
  'thermostat': 'Thermostat'
}

const vavDescOper = ['Fechado', 'Aberto'];

type AutomationRow = httpRouter.ApiResps['/get-autom-devs-list']['list'][number];

function checkIfExcludedByAnySearchTerms(row: EnvRow, searchTerms: string[], damGroup?: string): boolean {
  if (!searchTerms?.length) {
    return false;
  }
  for (const searchTerm of searchTerms) {
    if (containsSearchTerms_pt1(row, searchTerm) || containsSearchTerms_pt2(row, searchTerm, damGroup)) {
      return false;
    };
  }
  return true;
}

function containsSearchTerms_pt1(row: EnvRow, searchTerm: string): boolean {
  if (row.STATE_ID?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CITY_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.UNIT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.CLIENT_NAME?.toLowerCase().includes(searchTerm)) { return true; }
  if (row.DAM_ID?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

function containsSearchTerms_pt2(row: EnvRow, searchTerm: string, damGroup?: string): boolean {
  const damMode = (row.Mode === 'Auto') ? 'Automático' : (row.Mode ?? undefined);
  const damState = descOper[row.State as keyof typeof descOper] || row.State;

  if (row.status?.toLowerCase().includes(searchTerm)) { return true; }
  if (damGroup?.toLowerCase().includes(searchTerm)) { return true; }
  if (damState?.toLowerCase().includes(searchTerm)) { return true; }
  if (damMode?.toLowerCase().includes(searchTerm)) { return true; }
  return false;
}

httpRouter.privateRoutes['/dam/get-dams-list'] = async function (reqParams, session) {
  if ((reqParams as any).clientId) { reqParams.clientIds = [(reqParams as any).clientId]; }
  if ((reqParams as any).unitId) { reqParams.unitIds = [(reqParams as any).unitId]; }
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

  if (reqParams.controlMode && reqParams.controlMode.includes('Sem controle')) {
    reqParams.controlMode.push(undefined);
    reqParams.controlMode.push('');
  }

  const qPars: Parameters<typeof sqldb.DAMS.getDamsList>[0] = {
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    removeIlluminations: reqParams.removeIlluminations,
    // SKIP: reqParams.SKIP,
    // LIMIT: reqParams.LIMIT,
  }
  const rows = await sqldb.DAMS.getDamsList(qPars, { includeDacs: reqParams.includeDacs, includeFaultsData: true });
  const machinesList = await sqldb.MACHINES.getMachinesList({ UNIT_IDS: reqParams.unitIds, CLIENT_IDS: reqParams.clientIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT });

  const searchTerms = reqParams.searchTerms || (reqParams.searchText && reqParams.searchText.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list = [];

  const lastTelemetries = await devStatus.loadLastTelemetries_dam({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DAM_ID) : undefined,
  });

  for (const regDevRaw of rows) {
    const dev = lastTelemetries.lastDamTelemetry(regDevRaw.DAM_ID);
    const status = (dev && dev.status) || 'OFFLINE';
    const lastTelemetry = ((status !== 'OFFLINE') && dev && dev.lastTelemetry) || null;
    const faultsData = jsonTryParse<FaultsActs>(regDevRaw.FAULTSDATA) || {};
    const damGroupInfo = machinesList.filter((machine) => machine.DEV_AUT === regDevRaw.DAM_ID);
    const programming = parseFullProgV4(regDevRaw.LAST_PROG);
    const hasProgramming = Object.keys(programming.week).length > 0 || !!(programming?.exceptions && Object.keys(programming.exceptions).length > 0);

    const regDev = Object.assign(regDevRaw, {
      status,
      unComis: (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DAM_ID),
      Mode: (lastTelemetry && lastTelemetry.Mode) || null,
      State: (lastTelemetry && lastTelemetry.State) || null,
      isDac: (reqParams.includeDacs && regDevRaw.DAM_ID.startsWith('DAC') && regDevRaw.DISAB != null),
      damInop: !!faultsData['DAMNOP'],
      groupsIds: damGroupInfo.map(item => item.MACHINE_ID || item.ILLUMINATION_ID),
      groupsNames: damGroupInfo.map(item => item.MACHINE_NAME || item.ILLUMINATION_NAME),
      DUT_ID: damGroupInfo.length > 0 ? damGroupInfo[0].DUT_ID : '',
      SELF_REFERENCE: !!regDevRaw.DAM_SELF_REFERENCE,
      hasProgramming,
    })

    const damMode = (regDev.Mode === 'Auto') ? 'Automático' : (regDev.Mode ?? undefined);

    if (reqParams.ownershipFilter) {
      if (reqParams.ownershipFilter === 'CLIENTS') {
        if (!(regDevRaw.CLIENT_ID && (regDevRaw.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if (reqParams.ownershipFilter === 'N-COMIS') {
        if (!(regDev.unComis)) continue;
      }
      else if (reqParams.ownershipFilter === 'N-ASSOC') {
        if (!((!regDevRaw.CLIENT_ID) && (!regDev.unComis))) continue;
      }
      else if (reqParams.ownershipFilter === 'MANUFAC') {
        if (!(regDevRaw.CLIENT_ID && manufacturers.includes(regDevRaw.CLIENT_ID))) continue;
      }
      else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
        if (!(regDevRaw.CLIENT_ID === servConfig.dielClientId)) continue;
      }
    }
    if (searchTerms && searchTerms.length > 0) {
      const damGroup = machinesList.filter((machine) => machine.DEV_AUT === regDevRaw.DAM_ID).map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null;
      if (checkIfExcludedByAnySearchTerms(regDev, searchTerms, damGroup)) {
        continue;
      }
    }

    if (reqParams.controlMode && !reqParams.controlMode.includes(damMode)) { continue; }
    if (reqParams.status && !reqParams.status.includes(regDev.status)) { continue; }
    if (reqParams.ecoMode) {
      const ecoModeEnabled = !!regDev.ENABLE_ECO; 
      if (reqParams.ecoMode.includes('habilitado') && !reqParams.ecoMode.includes('desabilitado') && !ecoModeEnabled) { continue; }
      if (reqParams.ecoMode.includes('desabilitado') && !reqParams.ecoMode.includes('habilitado') && ecoModeEnabled) { continue; }
    }

    if (reqParams.hasProgramming !== undefined) {
      if (reqParams.hasProgramming && !regDev.hasProgramming) { continue; }
      if (!reqParams.hasProgramming && regDev.hasProgramming) { continue; }
    }

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) { }
    else {
      list.push(regDev);
    }
  }

  return { list, totalItems };
}

httpRouter.privateRoutes['/get-autom-devs-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(Number(x)));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const rows = await sqldb.DEVICES.getAutomDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  const [
    machinesList,
    { drisCfg },
    damsEcoCfg,
    dutsInfos,
    automationRefs,
    lastTelemetries,
  ] = await Promise.all([
    sqldb.MACHINES.getMachinesList({ CLIENT_IDS: reqParams.clientIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT }),
    loadDrisCfg({ skipSchedule: true, clientIds: reqParams.clientIds, unitIds: reqParams.unitIds }),
    loadDamsEcoCfg(),
    sqldb.DUTS.getListBasic({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds }, { includeTempLimits: true }),
    loadAutomationRefs({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds }),
    devStatus.loadLastTelemetries({
      devIds: (rows.length <= 500) ? rows.map((x) => x.DEV_ID) : undefined,
    }),
  ]);

  const searchTerms = reqParams.searchTerms || (reqParams.searchText && reqParams.searchText.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  const list = [];

  if (reqParams.controlMode && reqParams.controlMode.includes('Sem controle')) {
    reqParams.controlMode.push(undefined);
    reqParams.controlMode.push('');
  }
  if (reqParams.operationStatus && reqParams.operationStatus.includes('Sem status')) {
    reqParams.operationStatus.push(undefined);
  }

  for (const regDevRaw of rows) {
    const driCfg = (regDevRaw.HAS_DRI && drisCfg[regDevRaw.DEV_ID]) || null;
    if (regDevRaw.DEV_ID.startsWith('DRI') && !regDevRaw.IS_VAV) {
      if (!driCfg || !['modbus-generico', 'carrier-ecosplit'].includes(driCfg?.application)) {
        continue;
      }
    }
    const lastDevComm = lastTelemetries.lastMessages[regDevRaw.DEV_ID];
    const status = lastTelemetries.connectionStatus(regDevRaw.DEV_ID) || 'OFFLINE';
    const { lastTelemetry: lastTelemetryDam } = ((status !== 'OFFLINE') && lastTelemetries.lastDamTelemetry(regDevRaw.DEV_ID)) || {};
    const { lastTelemetry: lastTelemetryDutAut } = ((status !== 'OFFLINE') && lastTelemetries.lastDutAutTelemetry(regDevRaw.DEV_ID)) || {};
    const { lastTelemetry: lastTelemetryDri } = ((status !== 'OFFLINE') && lastTelemetries.lastDriTelemetry(regDevRaw.DEV_ID, driCfg)) || {};
    const lastTelemetry = lastTelemetryDutAut || lastTelemetryDam;
    const automMachine = machinesList.filter((machine) => ((machine.DEV_AUT === regDevRaw.DEV_ID) || (machine.DUT_ID === regDevRaw.DEV_ID))).map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null;
    const damState = lastTelemetry && lastTelemetry.State && (descOper[lastTelemetry.State] || lastTelemetry.State);
    const vavState = lastTelemetryDri && lastTelemetryDri.ValveOn && (vavDescOper[lastTelemetryDri.ValveOn] || null);
    const damMode = lastTelemetry && ((lastTelemetry.Mode === 'Auto') ? 'Automático' : lastTelemetry.Mode);
    const unComis = (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DEV_ID);
    const automationState = damState || vavState || undefined;
    const automationMode = (damMode && damMode.toString()) || undefined;

    let ecoModeEnabled = (!regDevRaw.IS_VAV) ? !!(regDevRaw.ENABLE_ECO_DAM || operatesEcoMode(regDevRaw.DUTAUT_CTRLOPER) || regDevRaw.DRI_ENABLE_ECO) : null;
    const lastDutAutCfg = regDevRaw.LAST_TEMPERATURE_CONTROL_CFG && jsonTryParse<DutMsg_TemperatureControlState>(regDevRaw.LAST_TEMPERATURE_CONTROL_CFG);
    if (lastDutAutCfg?.ctrl_mode) {
      ecoModeEnabled = operatesEcoMode(lastDutAutCfg.ctrl_mode);
    }

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
        if (automMachine && automMachine.toLowerCase().includes(searchTerm)) { continue; }
        if (regDevRaw.DEV_ID && regDevRaw.DEV_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (status && status.toLowerCase().includes(searchTerm)) { continue; }
        if (damState && damState.toLowerCase().includes(searchTerm)) { continue; }
        if (damMode && damMode.toString().toLowerCase().includes(searchTerm)) { continue; }
        if ((ecoModeEnabled && searchTerm.toLowerCase() === 'habilitado') || (!ecoModeEnabled && searchTerm.toLowerCase() === 'desabilitado')) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }

    if (reqParams.controlMode && !reqParams.controlMode.includes(automationMode)) { continue; }
    if (reqParams.operationStatus && !reqParams.operationStatus.includes(automationState)) { continue; }
    if (reqParams.status && !reqParams.status.includes(status)) { continue; }
    if (reqParams.ecoMode) {
      if (reqParams.ecoMode.includes('habilitado') && !reqParams.ecoMode.includes('desabilitado') && !ecoModeEnabled) { continue; }
      if (reqParams.ecoMode.includes('desabilitado') && !reqParams.ecoMode.includes('habilitado') && ecoModeEnabled) { continue; }
    }

    let temprtSetpoint: number = undefined;
    if (lastTelemetryDutAut && lastDutAutCfg) {
      const temperature = lastDutAutCfg.temperature && Number(lastDutAutCfg.temperature);
      if (typeof temperature === 'number') temprtSetpoint = temperature;
    }
    else if (ecoModeEnabled && regDevRaw.HAS_DAM) {
      try {
        const ecoCfg = damsEcoCfg[regDevRaw.DEV_ID];
        // If Temporário para migração gradual de novos campos DAM3. Todo este if será excluído quando a migração total for feita, ficando apenas o conteúdo do else.
        if (!ecoCfg?.CAN_SELF_REFERENCE) {
          const refDutIds = automationRefs.damDutsRef[regDevRaw.DEV_ID] || [];
          const minTemps = refDutIds.map((dutId) => {
            const dutInf = dutsInfos.find((dut) => dut.DEV_ID === dutId);
            let Tlimit = dutInf?.TUSEMIN;
            if ((Tlimit != null) && (ecoCfg != null)) {
              Tlimit += (ecoCfg.ECO_OFST_START || 0);
            }
            return Tlimit;
          }).filter(x => (x != null));
          if (minTemps.length > 0) {
            temprtSetpoint = minTemps[0];
          }
        }
        else {
          temprtSetpoint = ecoCfg.SETPOINT;
        }
      } catch (err) {
        logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      }
    }
    else if (ecoModeEnabled && regDevRaw.HAS_DRI) {
      try {
        const refDutId = regDevRaw.DUT_REF_ID;
        const ecoCfg = driCfg?.ecoModeCfg;
        const dutInf = dutsInfos.find((dut) => dut.DEV_ID === refDutId);
        let Tlimit = dutInf?.TUSEMIN;
        if ((Tlimit != null) && (ecoCfg != null)) {
          Tlimit += (ecoCfg.ECO_OFST_START || 0);
        }
        if (Tlimit) temprtSetpoint = Tlimit;
      } catch (err) {
        logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      }
    } else if (regDevRaw.IS_VAV) {
      temprtSetpoint = lastTelemetryDri?.Setpoint;
    }

    let referenceTemperature: number = undefined;
    let temprtAlert: string = null;
    if (regDevRaw.HAS_DUT_AUT) {
      const devDut = lastTelemetries.lastDutTelemetry(regDevRaw.DEV_ID);
      const lastTelemetryDut = ((status !== 'OFFLINE') && devDut && devDut.lastTelemetry) || null;
      referenceTemperature = (lastTelemetryDut || undefined) && lastTelemetryDut.Temperature;
      temprtAlert = getRtypeTemprtAlert({ TUSEMIN: regDevRaw.TUSEMIN, TUSEMAX: regDevRaw.TUSEMAX, RTYPE_SCHED: regDevRaw.DUT_LASTPROG }, referenceTemperature);
    }
    else if (regDevRaw.HAS_DAM) {
      if (!regDevRaw.SELF_REFERENCE) {
        const refDutIds = automationRefs.damDutsRef[regDevRaw.DEV_ID] || [];
        const temprts = refDutIds.map((dutId) => {
          const devDut = lastTelemetries.lastDutTelemetry(dutId);
          const lastTelemetryDut = (devDut?.status && (devDut.status !== 'OFFLINE') && devDut.lastTelemetry) || null;
          return lastTelemetryDut?.Temperature;
        }).filter(x => (x != null));
        if (temprts.length > 0) {
          referenceTemperature = temprts[0];
        }
        temprtAlert = getRtypeTemprtAlert({ TUSEMIN: regDevRaw.TUSEMIN, TUSEMAX: regDevRaw.TUSEMAX, RTYPE_SCHED: regDevRaw.DUT_LASTPROG }, referenceTemperature);
      }
      else {
        const devDam = lastTelemetries.lastDamTelemetry(regDevRaw.DEV_ID);
        const lastTelemetryDam = (devDam?.status && (devDam.status !== 'OFFLINE') && devDam.lastTelemetry) || null;
        if (lastTelemetryDam?.Temperature != null) {
          referenceTemperature = Number(lastTelemetryDam.Temperature) || undefined;
        }
        temprtAlert = getRtypeTemprtAlert({ TUSEMIN: regDevRaw.MINIMUM_TEMPERATURE, TUSEMAX: regDevRaw.MAXIMUM_TEMPERATURE, RTYPE_SCHED: regDevRaw.DAM_LASTPROG }, referenceTemperature);
      }
    }
    else if (regDevRaw.HAS_DRI) {
      const refDutId = regDevRaw.DUT_REF_ID;
      const devDut = lastTelemetries.lastDutTelemetry(refDutId);
      const lastTelemetryDut = (devDut?.status && (devDut.status !== 'OFFLINE') && devDut.lastTelemetry) || null;
      if (lastTelemetryDut) {
        referenceTemperature = lastTelemetryDut.Temperature;
      }
      if (regDevRaw.IS_VAV) referenceTemperature = lastTelemetryDri?.TempAmb;
      temprtAlert = getRtypeTemprtAlert({ TUSEMIN: regDevRaw.TUSEMIN, TUSEMAX: regDevRaw.TUSEMAX, RTYPE_SCHED: regDevRaw.DRI_LASTPROG }, referenceTemperature);
    }

    let lastCommTs = null as string;
    if (lastDevComm?.ts) {
      const lastMessageTSshifted = lastDevComm.ts;
      lastCommTs = await corrigirHorario(lastMessageTSshifted, regDevRaw.TIMEZONE_ID, regDevRaw.TIMEZONE_AREA, regDevRaw.TIMEZONE_OFFSET);
    }

    temprtAlert = temprtAlert || 'no data';
    if (reqParams.temprtAlerts?.length > 0 && !reqParams.temprtAlerts.includes(temprtAlert)) { continue; }

    const faultsData = (regDevRaw.FAULTSDATA_DAM && jsonTryParse<FaultsActs>(regDevRaw.FAULTSDATA_DAM)) || {};

    const regDev = {
      DEV_ID: regDevRaw.DEV_ID,
      UNIT_ID: regDevRaw.UNIT_ID,
      UNIT_NAME: regDevRaw.UNIT_NAME,
      CITY_NAME: regDevRaw.CITY_NAME,
      STATE_ID: regDevRaw.STATE_ID,
      CLIENT_ID: regDevRaw.CLIENT_ID,
      CLIENT_NAME: regDevRaw.CLIENT_NAME,
      DAM_LASTPROG: (regDevRaw.DAM_LASTPROG && parseFullProgV4(regDevRaw.DAM_LASTPROG)) || null,
      DUT_LASTPROG: (regDevRaw.DUT_LASTPROG && parseFullProgV4(regDevRaw.DUT_LASTPROG)) || null,
      status,
      lastCommTs,
      machineName: automMachine,
      State: damState || vavState || undefined,
      Mode: (damMode && damMode.toString()) || undefined,
      damInop: !!(faultsData && faultsData['DAMNOP']),
      ecoModeEnabled,
      temprtSetpoint,
      referenceTemperature: referenceTemperature || undefined,
      temprtAlert,
      DUT_NEED_MULT_SCHEDULES: regDevRaw.DUT_NEED_MULT_SCHEDULES != null ? regDevRaw.DUT_NEED_MULT_SCHEDULES === '1'  : null,
    };

    list.push(regDev);
  }

  const rowsSorted = [...list].sort((a, b) => rowSorter({ a, b, orderByProp: reqParams.orderByProp, orderByDesc: reqParams.orderByDesc }));

  const { sortedList, totalItems } = verifySkipRowsAndLimit({ list: rowsSorted, skipRows, limit: reqParams.LIMIT });

  return { list: sortedList, totalItems };
}

function verifySkipRowsAndLimit(params: { list: AutomationRow[], skipRows: number, limit?: number }) {
  let sortedList = []
  let totalItems = 0;
  let skipRows = params.skipRows;

  for (const regDev of params.list) {
    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }

    if (params.limit && sortedList.length >= params.limit) {
      continue;
    }

    sortedList.push(regDev);
  }

  return { totalItems, sortedList }
}

function rowSorter (params:{ a: AutomationRow, b: AutomationRow, orderByProp?: string, orderByDesc?: boolean }) {
  let orderValueGetter: (a: AutomationRow, b: AutomationRow) => [string|number, string|number] = null;
  if (params.orderByProp === 'STATE_ID') orderValueGetter = (a, b) => [a.STATE_ID, b.STATE_ID];
  if (params.orderByProp === 'CITY_NAME') orderValueGetter = (a, b) => [a.CITY_NAME, b.CITY_NAME];
  if (params.orderByProp === 'CLIENT_NAME') orderValueGetter = (a, b) => [a.CLIENT_NAME, b.CLIENT_NAME];
  if (params.orderByProp === 'UNIT_NAME') orderValueGetter = (a, b) => [a.UNIT_NAME, b.UNIT_NAME];
  if (params.orderByProp === 'DEV_ID') orderValueGetter = (a, b) => [a.DEV_ID, b.DEV_ID];
  if (params.orderByProp === 'MACHINE_NAME') orderValueGetter = (a, b) => [a.machineName, b.machineName];
  if (params.orderByProp === 'MODE') orderValueGetter = (a, b) => [a.Mode, b.Mode];
  if (params.orderByProp === 'STATE') orderValueGetter = (a, b) => [a.State, b.State];
  if (params.orderByProp === 'ECO_MODE_ENABLED' ) orderValueGetter = (a, b) => [Number(a.ecoModeEnabled), Number(b.ecoModeEnabled)];
  if (params.orderByProp === 'TEMPRT_SETPOINT' ) orderValueGetter = (a, b) => [Number(a.temprtSetpoint) || 0, Number(b.temprtSetpoint) || 0];
  if (params.orderByProp === 'REFERENCE_TEMPERATURE' ) orderValueGetter = (a, b) => [a.referenceTemperature, b.referenceTemperature];
  if (params.orderByProp === 'STATUS') orderValueGetter = (a, b) => [a.status, b.status];
  if (params.orderByProp === 'LAST_SEEN') orderValueGetter = (a, b) => [new Date(a.lastCommTs).getTime() || 0, new Date(b.lastCommTs).getTime() || 0];
  const orderAsc = !params.orderByDesc;

  if (orderValueGetter) {
    const [valorA, valorB] = orderValueGetter(params.a, params.b);
    return compareValues(valorA, valorB, orderAsc)
  }

  return 0;
}

httpRouter.privateRoutes['/automation-type-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const machinesRows = await sqldb.MACHINES.getMachinesAutInfo2({
    CLIENT_IDS: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }, { extraInfo: true });

  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list = [];
  const list_debug: string[] = ((reqParams as any).debug) ? [] : undefined;
  if (list_debug) {
    list_debug.push('{row.GROUP_ID}\t{row.UNIT_NAME}\t{automDevType}\t{automDevId}\t{useSchedule}\t{useEcoMode}\t{row.LASTPROG_DAM}\t{row.LASTPROG_DUT}');
  }

  for (const row of machinesRows) {
    let automDevType: "dac" | "dut" | "dam" = undefined;
    let automDevId: string = null;
    let useSchedule: boolean = undefined;
    let useEcoMode: boolean = undefined;
    if (row.DEV_AUT) {
      if (row.DAM_AS_DAC) {
        automDevType = 'dac';
        automDevId = row.DAM_AS_DAC;
      } else {
        automDevType = 'dam';
        automDevId = row.DEV_AUT;
      }
      useEcoMode = (row.ENABLE_ECO_DAM === 1 || row.ENABLE_ECO_DAM === 2) || undefined;
      if (row.LASTPROG_DAM) {
        let result;
        const reg =/\d\d:\d\d/gi;

        while (result = reg.exec(row.LASTPROG_DAM)) {
          if ((result[0] !== '00:00') && (result[0] !== '23:59')) {
            useSchedule = true;
            break;
          }
        }
      }
    }
    else if (row.DUT_AS_DUTAUT && row.DUT_AUT_DISABLED !== 1) {
      automDevType = 'dut';
      automDevId = row.DUT_AS_DUTAUT;
      useEcoMode = operatesEcoMode(row.DUT_AUT_CTRLOPER) || undefined;
      if (row.LASTPROG_DUT) {
        let result;
        const reg =/\d\d:\d\d/gi;
        while (result = reg.exec(row.LASTPROG_DUT)) {
          if ((result[0] !== '00:00') && (result[0] !== '23:59')) {
            useSchedule = true;
            break;
          }
        }
      }
    }

    if (!automDevId) continue;

    const regDev = {
      UNIT_NAME: row.UNIT_NAME,
      automDevType,
      automDevId,
      useSchedule,
      useEcoMode,
    };
    if (list_debug) {
      list_debug.push(`${row.MACHINE_ID}\t${row.UNIT_NAME||''}\t${automDevType||''}\t${automDevId||''}\t${useSchedule||''}\t${useEcoMode||''}\t${row.LASTPROG_DAM||''}\t${row.LASTPROG_DUT||''}`);
    }

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (!(reqParams.LIMIT && list.length >= reqParams.LIMIT)){
      list.push(regDev);
    }
  }

  return { list, totalItems, list_debug: list_debug && `\n${list_debug.join('\n')}\n` };
}

httpRouter.privateRoutes['/dam/get-dam-info'] = async function (reqParams, session) {
  if (!reqParams.DAM_ID) throw Error('Invalid parameters! Missing DAM_ID').HttpStatus(400)
  const infoDb = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.DAM_ID })
  if (!infoDb) {
    throw Error('Could not find DAM information').HttpStatus(400)
  }

  const perms = await getPermissionsOnUnit(session, infoDb.CLIENT_ID, infoDb.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const machines = await sqldb.MACHINES.getDamMachines({ DEV_AUT: infoDb.DAM_ID })
  let dam_mode: string = null;
  try {
    if (infoDb.CURRFW_MSG) {
      const fwInfo = jsonTryParse<ControlMsgFirmwareVersion>(infoDb.CURRFW_MSG);
      dam_mode = fwInfo && fwInfo.dam_mode;
    }
  } catch (err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
  }

  const info = {
    DAM_ID: infoDb.DAM_ID,
    BT_ID: infoDb.BT_ID,
    // REL_DUT_ID: infoDb.REL_DUT_ID,
    UNIT_ID: infoDb.UNIT_ID,
    CLIENT_ID: infoDb.CLIENT_ID,
    UNIT_NAME: infoDb.UNIT_NAME,
    CITY_ID: infoDb.CITY_ID,
    LAT: infoDb.LAT,
    LON: infoDb.LON,
    STATE_ID: infoDb.STATE_ID,
    CITY_NAME: infoDb.CITY_NAME,
    CLIENT_NAME: infoDb.CLIENT_NAME,
    ENABLE_ECO: infoDb.ENABLE_ECO,
    ECO_CFG: infoDb.ECO_CFG,
    FW_MODE: infoDb.FW_MODE,
  }

  return { info, groups: machines, dam_mode }
}

async function determinePermissions(clientId: number, unitId: number, deviceCode: string, session: SessionData) {
  let userCanEditDev = false;
  let userCanAddNewInfo = false;
  let clientChanged = false;
  let perms;

  if (clientId) {
    perms = await getPermissionsOnClient(session, clientId);
  } else {
    const info = await sqldb.DEVICES.getBasicInfo({ devId: deviceCode });
    perms = await getPermissionsOnClient(session, info.CLIENT_ID);
  }

  const devPerms = await setGetDevInfo(session, {
    DEV_ID: deviceCode,
    UNIT_ID: unitId,
    CLIENT_ID: clientId,
    allowInsert: deviceCode.startsWith('DAM') || (deviceCode.startsWith('DAC') && dacData.hasRelay(deviceCode)),
  });

  userCanEditDev = devPerms.userCanEditDev;
  userCanAddNewInfo = devPerms.userCanAddNewInfo;
  clientChanged = devPerms.clientChanged;

  let canEditProgramming = perms.canEditProgramming || false;

  return { userCanEditDev, userCanAddNewInfo, clientChanged, canEditProgramming };
}

async function saveDamAsDac(devId: string, reqParams: Parameters<typeof httpRouter.privateRoutes['/dam/set-dam-info']>[0], session: SessionData) {
  let groupId;
  if (!reqParams.groups) { groupId = undefined; }
  else if (reqParams.groups.length === 0) { groupId = null; }
  else if (reqParams.groups.length === 1) { groupId = Number(reqParams.groups[0]); }
  else { throw Error("Não é permitido associar mais de uma máquina ao DAC").HttpStatus(400); }
  return httpRouter.privateRoutes['/dac/set-dac-info']({
    DAC_ID: devId,
    UNIT_ID: reqParams.CLIENT_ID,
    REL_DUT_ID: reqParams.REL_DUT_ID,
    GROUP_ID: groupId,
    ENABLE_ECO: reqParams.ENABLE_ECO,
    ECO_CFG: reqParams.ECO_CFG,
    ECO_OFST_START: reqParams.ECO_OFST_START,
    ECO_OFST_END: reqParams.ECO_OFST_END,
    ECO_INT_TIME: reqParams.ECO_INT_TIME,
    FU_NOM: reqParams.FU_NOM,
    SCHEDULE_START_BEHAVIOR: reqParams.SCHEDULE_START_BEHAVIOR,
    SETPOINT: reqParams.SETPOINT,
    LTC: reqParams.LTC,
    LTI: reqParams.LTI,
    UPPER_HYSTERESIS: reqParams.UPPER_HYSTERESIS,
    LOWER_HYSTERESIS: reqParams.LOWER_HYSTERESIS,
  }, session);
}

async function setDamEcoParameters(reqParams: Parameters<typeof httpRouter.privateRoutes['/dam/set-dam-info']>[0], damInfo: Awaited<ReturnType<typeof sqldb.DAMS.getDevExtraInfo>>) {
  // Mantendo lógica para caso alguém realize programação com versão antiga do front
  if (reqParams.DAM_ID.startsWith('DAM3') && reqParams.HAD_AUTOMATION_SETTING_CHANGED && damInfo && damInfo.CAN_SELF_REFERENCE && reqParams.SETPOINT == null && reqParams.ECO_OFST_START != null) {
    if (!reqParams.SELF_REFERENCE) {
      if (reqParams.REL_DUT_ID) {
        const dutInformations = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.REL_DUT_ID});
  
        if (dutInformations && dutInformations.TUSEMIN != null) {
          reqParams.SETPOINT = dutInformations.TUSEMIN + reqParams.ECO_OFST_START;
          reqParams.UPPER_HYSTERESIS = reqParams.ECO_OFST_END;
          reqParams.LOWER_HYSTERESIS = damInfo.LOWER_HYSTERESIS || 1;
        }
      }
    }
    else {
      reqParams.SETPOINT = reqParams.MINIMUM_TEMPERATURE + reqParams.ECO_OFST_START;
      reqParams.UPPER_HYSTERESIS = reqParams.ECO_OFST_END;
      reqParams.LOWER_HYSTERESIS = damInfo.LOWER_HYSTERESIS || 1;
    }
  }
  // Nova lógica para converter parâmetros novos para DAMs que utiliza parâmetros antigos
  else if (reqParams.HAD_AUTOMATION_SETTING_CHANGED && damInfo && !damInfo.CAN_SELF_REFERENCE && reqParams.SETPOINT != null && reqParams.ECO_OFST_START == null) {
    if (reqParams.REL_DUT_ID) {
      const dutInformations = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.REL_DUT_ID});
  
      if (dutInformations && dutInformations.TUSEMIN != null) {
        reqParams.ECO_OFST_START = reqParams.SETPOINT - dutInformations.TUSEMIN;
        reqParams.ECO_OFST_END = reqParams.UPPER_HYSTERESIS;
      }
    }
  }
}

httpRouter.privateRoutes['/dam/set-dam-info'] = async function (reqParams, session) {
  // Check required params
  if (!reqParams.DAM_ID) {
    throw Error('There was an error!\nInvalid properties. Missing DAM_ID.').HttpStatus(400)
  }

  const devId = reqParams.DAM_ID;
  const isDac = devId.startsWith('DAC');
  if (isDac) {
    return saveDamAsDac(devId, reqParams, session);
  }

  const damInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.DAM_ID });
  if (reqParams.CLIENT_ID === undefined) {
    reqParams.CLIENT_ID = damInfo?.CLIENT_ID;
  }

  let { userCanEditDev, userCanAddNewInfo, clientChanged, canEditProgramming } = await determinePermissions(reqParams.CLIENT_ID, reqParams.UNIT_ID, devId, session);

  await setDamEcoParameters(reqParams, damInfo);

  if (damInfo && (reqParams.INSTALLATION_LOCATION !== undefined || reqParams.PLACEMENT !== undefined || reqParams.T0_POSITION !== undefined || reqParams.T1_POSITION !== undefined )) {
    const damCodeInfo = await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: reqParams.DAM_ID})
    if (damCodeInfo?.ID) {
      await sqldb.DAMS_DEVICES.w_updateInfo({ ID: damCodeInfo.ID , INSTALLATION_LOCATION: reqParams.INSTALLATION_LOCATION, PLACEMENT: reqParams.PLACEMENT, T0_POSITION: reqParams.T0_POSITION, T1_POSITION: reqParams.T1_POSITION }, session.user);
    }
  }

  await setCondenserAutomationInfo({
    DAM_ID: reqParams.DAM_ID, // : string
    ENABLE_ECO: reqParams.ENABLE_ECO, // ?: 0|1|2|null
    ENABLE_ECO_LOCAL: reqParams.ENABLE_ECO_LOCAL, // ?: 0|1|null
    FW_MODE: reqParams.FW_MODE, // ?: string|null
    ECO_CFG: reqParams.ECO_CFG, // ?: string|null
    REL_DUT_ID: reqParams.REL_DUT_ID, // ?: string|null
    ECO_OFST_START: reqParams.ECO_OFST_START, // ?: number|null
    ECO_OFST_END: reqParams.ECO_OFST_END, // ?: number|null
    ECO_INT_TIME: reqParams.ECO_INT_TIME, // ?: number
    FU_NOM: reqParams.FU_NOM, // ?: number|null
    groups: reqParams.groups, // ?: string[]
    SCHEDULE_START_BEHAVIOR: reqParams.SCHEDULE_START_BEHAVIOR,
    SETPOINT: reqParams.SETPOINT,
    LTC: reqParams.LTC,
    LTI: reqParams.LTI,
    UPPER_HYSTERESIS: reqParams.UPPER_HYSTERESIS,
    LOWER_HYSTERESIS: reqParams.LOWER_HYSTERESIS,
    SELF_REFERENCE: reqParams.SELF_REFERENCE,
    MINIMUM_TEMPERATURE: reqParams.MINIMUM_TEMPERATURE,
    MAXIMUM_TEMPERATURE: reqParams.MAXIMUM_TEMPERATURE,
    EXT_THERM_CFG: reqParams.EXT_THERM_CFG,
  }, {
    userCanEditDev,
    userCanAddNewInfo,
    clientChanged,
    isDac,
    canEditProgramming,
  }, session.user);

  if (reqParams.HAD_AUTOMATION_SETTING_CHANGED && damInfo) {
    await controlEcoLocalParameters(reqParams.DAM_ID, reqParams.REL_DUT_ID, session.user, reqParams.ENABLE_ECO_LOCAL);
  }

  if (!reqParams.IGNORE_SET_SENSORS) {
    let numersSensors = reqParams.PLACEMENT === 'DUO' ? 2 : 1;
    sendDamCommand_setSensorsTemperature(reqParams.DAM_ID, { msgtype: 'set-sensors-temperature', number_sensors: numersSensors }, session.user);
  }

  return 'SET OK'
}

export async function controlEcoLocalParameters(damCode: string, dutReferenceCode: string,  userId: string, enEcoLocal?:number) {
  const damAutomationInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: damCode });
  if (!damAutomationInfo || !damAutomationInfo.CAN_SELF_REFERENCE) {
    return;
  }

  const parsedVersion = parseFirmwareVersion(damAutomationInfo.CURRFW_VERS);
  const damMinimumVersion: VersionNumber = {
    vMajor: 2,
    vMinor: 7,
    vPatch: 0,
  };

  if (parsedVersion.vMajor === damMinimumVersion.vMajor && compareVersions(parsedVersion, damMinimumVersion, false) >= 0) {
    const damEcoValidationVersion: VersionNumber = {
      vMajor: 2,
      vMinor: 7,
      vPatch: 4,
    };
    const needEcoValidation = compareVersions(parsedVersion, damEcoValidationVersion, false) >= 0;
    await controlSendEcoLocalWithDut({damAutomationInfo, dutReferenceCode, enEcoLocal}, userId, needEcoValidation);
  }
  else {
    sendEcoLocalOldVersion({ damAutomationInfo, enEcoLocal }, userId);
  }
}

function sendEcoLocalOldVersion(qPars: { damAutomationInfo: Awaited<ReturnType<typeof sqldb.DAMS.getDevExtraInfo>>, enEcoLocal?: number }, userId: string) {
  const damCmdEcoCfg = {
    "msgtype": "set-eco-cfg",
    "en_eco": qPars.damAutomationInfo.ENABLE_ECO ? 1 : 0,     // 0 = eco desativado, 1 = eco ativado
    "remote_dut": !qPars.damAutomationInfo.SELF_REFERENCE ? 1 : 0, // 0 = sem dut de referência, 1 = com dut de referência
  } as DamCmd_SetEcoCfg;

  sendDamCommand_setEcoCfg(qPars.damAutomationInfo.DAM_ID, damCmdEcoCfg, userId);

  const enEcoLocalToSend = qPars.damAutomationInfo.ENABLE_ECO && (qPars.enEcoLocal || qPars.damAutomationInfo.ENABLE_ECO_LOCAL);
  const damCmdSetLocalEcoCfg = {
    "msgtype": "set-eco-local-cfg",
    "en_ecolocal": enEcoLocalToSend || 0,
    "setpoint": qPars.damAutomationInfo.SETPOINT != null ? qPars.damAutomationInfo.SETPOINT : -99,
    "hist_sup": qPars.damAutomationInfo.UPPER_HYSTERESIS != null ? qPars.damAutomationInfo.UPPER_HYSTERESIS : -99,
    "hist_inf": qPars.damAutomationInfo.LOWER_HYSTERESIS != null ? qPars.damAutomationInfo.LOWER_HYSTERESIS : -99,
    "interval": qPars.damAutomationInfo.ECO_INT_TIME != null ? qPars.damAutomationInfo.ECO_INT_TIME * 60 : -99,
  } as DamCmd_SetLocalEcoCfg;

  sendDamCommand_setEcoLocalCfg(qPars.damAutomationInfo.DAM_ID, damCmdSetLocalEcoCfg, userId);
}

async function controlSendEcoLocalWithDut(
  qPars: {
    damAutomationInfo: Awaited<ReturnType<typeof sqldb.DAMS.getDevExtraInfo>>,
    dutReferenceCode: string,
    enEcoLocal?: number
  },
  userId: string,
  needEcoValidation: boolean
) {
  if (!qPars.dutReferenceCode?.length) { return; }

  const dutMinimumVersion: VersionNumber = {
    vMajor: 2,
    vMinor: 5,
    vPatch: 0,
  };

  const dutInfo = await sqldb.DUTS.getInfoToEcoLocal({ devId: qPars.dutReferenceCode });
  const parsedVersion = parseFirmwareVersion(dutInfo.CURRFW_VERS);
  const extRefDevId = (dutMinimumVersion.vMajor === parsedVersion.vMajor && compareVersions(parsedVersion, dutMinimumVersion, false) >= 0) ? qPars.dutReferenceCode : '';

  await sendEcoLocalWithDut(
    { damAutomationInfo: qPars.damAutomationInfo, dutInfo, dutReferenceCode: qPars.dutReferenceCode, extRefDevId, enEcoLocal: qPars.enEcoLocal },
    userId,
    needEcoValidation
  );

  await sqldb.DAMS_AUTOMATIONS.w_updateInfo({ ID: qPars.damAutomationInfo.DEVICE_AUTOMATION_ID, READ_DUT_TEMPERATURE_FROM_BROKER: extRefDevId.length > 0}, userId);
  await eventHooks.ramCaches_DAMS_loadDamsEcoCfg();
}

async function sendEcoLocalWithDut(qPars: {
  damAutomationInfo: Awaited<ReturnType<typeof sqldb.DAMS.getDevExtraInfo>>,
  dutInfo: Awaited<ReturnType<typeof sqldb.DUTS.getInfoToEcoLocal>>,
  dutReferenceCode: string,
  extRefDevId: string,
  enEcoLocal?: number,
}, userId: string, needValidation?: boolean) {
  const enEcoLocalToSend = qPars.damAutomationInfo.ENABLE_ECO && (qPars.enEcoLocal || qPars.damAutomationInfo.ENABLE_ECO_LOCAL);

  const damCmdSetLocalEcoCfg = {
    "msgtype": "set-eco-local-cfg",
    "en_ecolocal": enEcoLocalToSend || 0,
    "setpoint": qPars.damAutomationInfo.SETPOINT != null ? qPars.damAutomationInfo.SETPOINT * 10 : -99,
    "hist_sup": qPars.damAutomationInfo.UPPER_HYSTERESIS != null ? qPars.damAutomationInfo.UPPER_HYSTERESIS * 10 : -99,
    "hist_inf": qPars.damAutomationInfo.LOWER_HYSTERESIS != null ? qPars.damAutomationInfo.LOWER_HYSTERESIS * 10 : -99,
    "interval": qPars.damAutomationInfo.ECO_INT_TIME != null ? qPars.damAutomationInfo.ECO_INT_TIME * 60 : -99,
    "en_eco": qPars.damAutomationInfo.ENABLE_ECO ? 1 : 0,
    "en_remote_dut": !qPars.damAutomationInfo.SELF_REFERENCE ? 1 : 0,
    "ext_ref_devid": qPars.extRefDevId,
    "ext_ref_offset": qPars.dutInfo?.TEMPERATURE_OFFSET != null ? qPars.dutInfo.TEMPERATURE_OFFSET * 10 : -99,
    "int_ref_offset": -99,
  } as DamCmd_SetLocalEcoCfg;

  sendDamCommand_setEcoLocalCfg(qPars.damAutomationInfo.DAM_ID, damCmdSetLocalEcoCfg, userId);

  //TODO - Remove condition when not necessary (v2.7.0 - v2.7.3 needed)
  if (needValidation) {
    const promise = iotMessageListener.waitForDamControl((message) => {
      if (!message) return false;
      if (message.dev_id !== qPars.damAutomationInfo.DAM_ID) return false;
      message = message as MsgDamEchoJson;
      if (message.msgtype !== 'echo_json') return false;
      if (message.json_data !== 'set-eco-local-cfg') return false;
      if (message.json_status !== 1) throw Error('Error setting local eco config').HttpStatus(400);
      return true;
    }, 5000);
    await promise;
  }

}

httpRouter.privateRoutes['/dam/delete-dam-info'] = async function (reqParams, session) {
  const devInf = reqParams.damId && await sqldb.DEVICES.getBasicInfo({ devId: reqParams.damId });
  if (!devInf) throw Error(`Dispositivo não encontrado: ${reqParams.damId}`).HttpStatus(400);
  const perms = await getPermissionsOnClient(session, devInf.CLIENT_ID);
  if (!perms.canDeleteDevs) throw Error('Permission denied!').HttpStatus(403);

  const { affectedRows } = await devInfo.deleteDev({ DEV_ID: reqParams.damId }, session.user);

  return 'DELETED ' + affectedRows;
}

async function handleDamInfo(
  currentDamInfo: { DEV_ID: string; DEVICE_ID: number; CLIENT_ID: number; UNIT_ID: number; DISAB: number; ENABLE_ECO: number; ECO_CFG: string; DAT_BEGAUT: string; FWVERS: string },
  userCanEditDev: boolean,
  canEditProgramming: boolean,
  userCanAddNewInfo: boolean,
  isDac: boolean,
  reqParams: CondenserAutomationInfo,
  userId: string
) {
  if (currentDamInfo) {
    if (!userCanEditDev && !canEditProgramming) {
      throw Error('Permission denied').HttpStatus(403);
    }
  } else {
    if (!userCanAddNewInfo) {
      throw Error('Permission denied').HttpStatus(403);
    }

    const deviceInfo = await sqldb.DEVICES.getDevicesInfo({ DEVICE_CODE: reqParams.DAM_ID });

    if (!isDac) {
      await sqldb.DAMS_DEVICES.w_insert({
        DEVICE_ID: deviceInfo.DEVICE_ID,
        CAN_SELF_REFERENCE: 0,
        FW_MODE: 'S',
        DISAB: null,
        FIRST_COMMANDS_ECO_SENT: 0,
        INSTALLATION_LOCATION: reqParams.INSTALLATION_LOCATION,
      }, userId);
    }
  }
}

async function deleteAutomationRows(
  isDac: boolean, 
  reqParams: CondenserAutomationInfo, 
  userId: string
) {
  if (!isDac) {
    await deleteDamAutomationList(reqParams.DAM_ID, reqParams.groups, userId);
  } else if (reqParams.DAM_ID && reqParams.DAM_ID.length > 0) {
    await deleteDacAutomationList(reqParams.DAM_ID, reqParams.groups, userId);
  }
}

async function deleteDamAutomationList(
  deviceCode: string, 
  groups: (string | number)[], 
  userId: string
) {
  const automationList = await sqldb.DAMS_AUTOMATIONS.getDamsAutomationsList({ DEVICE_CODE: deviceCode });
  for (const automation of automationList) {
    if (groups && automation.MACHINE_ID && !groups.includes(automation.MACHINE_ID?.toString())) {
      await sqldb.DAMS_AUTOMATIONS.w_deleteRow({ ID: automation.DAM_AUTOMATION_ID }, userId);
    }
    if (groups && automation.ILLUMINATION_ID && !groups.includes(automation.ILLUMINATION_ID.toString())) {
      await sqldb.DAMS_ILLUMINATIONS.w_deleteRow({ID: automation.ILLUMINATION_ID}, userId);
    }
  }
}

async function deleteDacAutomationList(
  deviceCode: string, 
  groups: (string | number)[], 
  userId: string
) {
  const automationList = await sqldb.DACS_AUTOMATIONS.getDacsAutomationsList({ DEVICE_CODE: deviceCode });
  for (const automation of automationList) {
    if(automation) {
      if (groups && !groups.includes(automation.MACHINE_ID?.toString())) {
        await sqldb.DACS_AUTOMATIONS.w_deleteRow({ID: automation.DAC_AUTOMATION_ID}, userId);
      }
    }
  }
}

function setParamIfDefined(
  reqParams: {
    [key: string]: any,
    DAM_ID: string,
    REL_DUT_ID?: string,
    ENABLE_ECO?: 0|1|2,
    DAC_USE_RELAY?: 0|1,
    FW_MODE?: string,
  }, 
  paramSet: { [x: string]: any; DAM_ID?: string; DAT_BEGAUT?: string; FW_MODE?: string; DISAB?: number; DESIRED_PROG?: string; LASTPROG?: string; FAULTS_DATA?: string; ENABLE_ECO?: number; ECO_CFG?: string; ECO_OFST_START?: number; ECO_OFST_END?: number; ECO_INT_TIME?: number; FU_NOM?: number; SCHEDULE_START_BEHAVIOR?: string; SETPOINT?: number; LTC?: number; LTI?: number; UPPER_HYSTERESIS?: number; LOWER_HYSTERESIS?: number; SELF_REFERENCE?: number; MINIMUM_TEMPERATURE?: number; MAXIMUM_TEMPERATURE?: number; PREVIOUS_SETPOINT_ECO?: number; DATE_RESEND_ECO_CFG?: string; EXT_THERM_CFG?: string; SETPOINT_ECO_REAL_TIME?: number; FIRST_COMMANDS_ECO_SENT?: number; CAN_SELF_REFERENCE?: number }, 
  paramName: string
  ) {
  if (reqParams[paramName] !== undefined) {
    paramSet[paramName] = reqParams[paramName];
  }
}

function setECOIntTime(reqParams: CondenserAutomationInfo, paramSet: { [x: string]: any; DAM_ID?: string; DAT_BEGAUT?: string; FW_MODE?: string; DISAB?: number; DESIRED_PROG?: string; LASTPROG?: string; FAULTS_DATA?: string; ENABLE_ECO?: number; ECO_CFG?: string; ECO_OFST_START?: number; ECO_OFST_END?: number; ECO_INT_TIME?: number; FU_NOM?: number; SCHEDULE_START_BEHAVIOR?: string; SETPOINT?: number; LTC?: number; LTI?: number; UPPER_HYSTERESIS?: number; LOWER_HYSTERESIS?: number; SELF_REFERENCE?: number; MINIMUM_TEMPERATURE?: number; MAXIMUM_TEMPERATURE?: number; PREVIOUS_SETPOINT_ECO?: number; DATE_RESEND_ECO_CFG?: string; EXT_THERM_CFG?: string; SETPOINT_ECO_REAL_TIME?: number; FIRST_COMMANDS_ECO_SENT?: number; CAN_SELF_REFERENCE?: number }) {
  if (reqParams.ECO_INT_TIME != null && !(reqParams.ECO_INT_TIME >= 1 && reqParams.ECO_INT_TIME <= 15)) {
    throw Error("Valor inválido. ECO_INT_TIME deve estar entre 1 e 15 minutos.").HttpStatus(400);
  }
  if (reqParams.ECO_INT_TIME !== undefined) {
    paramSet.ECO_INT_TIME = reqParams.ECO_INT_TIME;
  }
}

function handleEnableEco(reqParams: CondenserAutomationInfo, paramSet: { [x: string]: any; DAM_ID?: string; DAT_BEGAUT?: string; FW_MODE?: string; DISAB?: number; DESIRED_PROG?: string; LASTPROG?: string; FAULTS_DATA?: string; ENABLE_ECO?: number; ENABLE_ECO_LOCAL?: number; ECO_CFG?: string; ECO_OFST_START?: number; ECO_OFST_END?: number; ECO_INT_TIME?: number; FU_NOM?: number; SCHEDULE_START_BEHAVIOR?: string; SETPOINT?: number; LTC?: number; LTI?: number; UPPER_HYSTERESIS?: number; LOWER_HYSTERESIS?: number; SELF_REFERENCE?: number; MINIMUM_TEMPERATURE?: number; MAXIMUM_TEMPERATURE?: number; PREVIOUS_SETPOINT_ECO?: number; DATE_RESEND_ECO_CFG?: string; EXT_THERM_CFG?: string; SETPOINT_ECO_REAL_TIME?: number; FIRST_COMMANDS_ECO_SENT?: number; CAN_SELF_REFERENCE?: number }) {
  if ([0, 1, 2, null].includes(reqParams.ENABLE_ECO)) {
    paramSet.ENABLE_ECO = reqParams.ENABLE_ECO;
  }
  if ([0, 1, null].includes(reqParams.ENABLE_ECO_LOCAL)) {
    paramSet.ENABLE_ECO_LOCAL = reqParams.ENABLE_ECO_LOCAL;
  }
  if (reqParams.ECO_CFG !== undefined) {
    paramSet.ECO_CFG = reqParams.ECO_CFG;
  }
  if ((paramSet.ECO_CFG !== undefined) || (paramSet.ENABLE_ECO !== undefined)) {
    if (!paramSet.ECO_CFG) paramSet.ENABLE_ECO = 0;
    if (!paramSet.ENABLE_ECO) paramSet.ECO_CFG = null;
  }
}

function handleFwMode(reqParams: CondenserAutomationInfo, paramSet: { [x: string]: any; DAM_ID?: string; DAT_BEGAUT?: string; FW_MODE?: string; DISAB?: number; DESIRED_PROG?: string; LASTPROG?: string; FAULTS_DATA?: string; ENABLE_ECO?: number; ECO_CFG?: string; ECO_OFST_START?: number; ECO_OFST_END?: number; ECO_INT_TIME?: number; FU_NOM?: number; SCHEDULE_START_BEHAVIOR?: string; SETPOINT?: number; LTC?: number; LTI?: number; UPPER_HYSTERESIS?: number; LOWER_HYSTERESIS?: number; SELF_REFERENCE?: number; MINIMUM_TEMPERATURE?: number; MAXIMUM_TEMPERATURE?: number; PREVIOUS_SETPOINT_ECO?: number; DATE_RESEND_ECO_CFG?: string; EXT_THERM_CFG?: string; SETPOINT_ECO_REAL_TIME?: number; FIRST_COMMANDS_ECO_SENT?: number; CAN_SELF_REFERENCE?: number }) {
  if (reqParams.FW_MODE === '') {
    reqParams.FW_MODE = null;
  }
  if (reqParams.FW_MODE !== undefined) {
    paramSet.FW_MODE = reqParams.FW_MODE;
  }
}

interface CondenserAutomationInfo {
  DAM_ID: string,
  REL_DUT_ID?: string,
  ENABLE_ECO?: 0|1|2,
  ENABLE_ECO_LOCAL?: 0|1,
  DAC_USE_RELAY?: 0|1,
  FW_MODE?: string,
  ECO_CFG?: string,
  ECO_OFST_START?: number
  ECO_OFST_END?: number
  FU_NOM?: number
  ECO_INT_TIME?: number
  groups?: (number|string)[]
  SCHEDULE_START_BEHAVIOR?: string
  SETPOINT?: number
  LTC?: number
  LTI?: number
  UPPER_HYSTERESIS?: number
  LOWER_HYSTERESIS?: number
  SELF_REFERENCE?: boolean|null
  MINIMUM_TEMPERATURE?: number|null
  MAXIMUM_TEMPERATURE?: number|null
  EXT_THERM_CFG?: string|null
  INSTALLATION_LOCATION?: string|null
}

export async function setCondenserAutomationInfo (reqParams: CondenserAutomationInfo, extras: {
  canEditProgramming?: boolean,
  userCanEditDev: boolean,
  userCanAddNewInfo: boolean,
  clientChanged: boolean,
  isDac: boolean,
}, userId: string) {
  const damId = reqParams.DAM_ID;
  const { canEditProgramming, userCanEditDev, userCanAddNewInfo, isDac, clientChanged } = extras;

  // Check if new dev
  let currentDamInfo = await sqldb.DAMS.getDamBasicInfo({ devId: damId });
  const fwVersionRaw = currentDamInfo?.FWVERS ? currentDamInfo.FWVERS : '';
  const fwVersion = parseFirmwareVersion(fwVersionRaw);
  
  await handleDamInfo(
    currentDamInfo,
    userCanEditDev,
    canEditProgramming,
    userCanAddNewInfo,
    isDac,
    reqParams,
    userId
  );

  // Verifica automações anteriores para exclusão
  await deleteAutomationRows(isDac, reqParams, userId);

  const paramSet: {
    DAM_ID: string,
    DAT_BEGAUT?: string,
    FW_MODE?: string,
    DISAB?: number,
    DESIRED_PROG?: string,
    LASTPROG?: string,
    FAULTS_DATA?: string,
    ENABLE_ECO?: number,
    ENABLE_ECO_LOCAL?: number,
    ECO_CFG?: string,
    ECO_OFST_START?: number,
    ECO_OFST_END?: number,
    ECO_INT_TIME?: number,
    FU_NOM?: number,
    SCHEDULE_START_BEHAVIOR?: string,
    SETPOINT?: number,
    LTC?: number,
    LTI?: number,
    UPPER_HYSTERESIS?: number,
    LOWER_HYSTERESIS?: number,
    SELF_REFERENCE?: number,
    MINIMUM_TEMPERATURE?: number, 
    MAXIMUM_TEMPERATURE?: number,
    PREVIOUS_SETPOINT_ECO?: number,
    DATE_RESEND_ECO_CFG?: string,
    EXT_THERM_CFG?: string,
    SETPOINT_ECO_REAL_TIME?: number,
    FIRST_COMMANDS_ECO_SENT?: number,
    CAN_SELF_REFERENCE?: number
  } = { DAM_ID: reqParams.DAM_ID };

  const supportsExtTherm = (reqParams.DAM_ID.startsWith('DAM3') && fwVersion && versionIsAtLeast(fwVersion, 2, 2, 2));
  if (supportsExtTherm && reqParams.EXT_THERM_CFG != undefined) {
    const value = reqParams.EXT_THERM_CFG === 'P' ? 1 : 0;
    await setExtThermCfg(reqParams.DAM_ID, value, userId);
    paramSet.EXT_THERM_CFG = reqParams.EXT_THERM_CFG;
  }

  setParamIfDefined(reqParams, paramSet, 'ECO_OFST_START');
  setParamIfDefined(reqParams, paramSet, 'ECO_OFST_END');
  setParamIfDefined(reqParams, paramSet, 'ECO_INT_TIME');
  setParamIfDefined(reqParams, paramSet, 'FU_NOM');
  setParamIfDefined(reqParams, paramSet, 'SCHEDULE_START_BEHAVIOR');
  setParamIfDefined(reqParams, paramSet, 'SETPOINT');
  setParamIfDefined(reqParams, paramSet, 'LTC');
  setParamIfDefined(reqParams, paramSet, 'LTI');
  setParamIfDefined(reqParams, paramSet, 'UPPER_HYSTERESIS');
  setParamIfDefined(reqParams, paramSet, 'LOWER_HYSTERESIS');
  setParamIfDefined(reqParams, paramSet, 'SELF_REFERENCE');
  setParamIfDefined(reqParams, paramSet, 'MINIMUM_TEMPERATURE');
  setParamIfDefined(reqParams, paramSet, 'MAXIMUM_TEMPERATURE');

  setECOIntTime(reqParams, paramSet);
  handleEnableEco(reqParams, paramSet);
  handleFwMode(reqParams, paramSet);

  if (clientChanged) {
    paramSet.DAT_BEGAUT = null;
  }
  let isAutomationEnabled;
  if (isDac) {
    if (reqParams.DAC_USE_RELAY === 1 || reqParams.DAC_USE_RELAY === 0 || reqParams.DAC_USE_RELAY == null) { /* OK */}
    else reqParams.DAC_USE_RELAY = null;
    const finalUseRelay = (reqParams.DAC_USE_RELAY !== undefined) ? reqParams.DAC_USE_RELAY : (currentDamInfo && !currentDamInfo.DISAB);
    if (!finalUseRelay) reqParams.groups = [];
    paramSet.FW_MODE = 'DAC-1R';
    paramSet.DISAB = finalUseRelay ? 0 : 1;
    isAutomationEnabled = !!finalUseRelay;
  } else {
    isAutomationEnabled = !!((paramSet.ENABLE_ECO !== undefined) ? paramSet.ENABLE_ECO : currentDamInfo.ENABLE_ECO);
  }
  if (isAutomationEnabled && (clientChanged || !currentDamInfo.DAT_BEGAUT)) {
    paramSet.DAT_BEGAUT = now_shiftedTS_s(true);
  }

  if (reqParams.groups && reqParams.groups.length > 0) {
    for (const machine of reqParams.groups) {
      const deviceAutomationInfo = await sqldb.DEVICES.getMachineAutomationInfo({DEVICE_CODE: reqParams.DAM_ID, MACHINE_ID: Number(machine)});  
      const deviceInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: reqParams.DAM_ID});
      if (!deviceAutomationInfo) {
        await setMachineCurrentAutomation(Number(machine), reqParams.DAM_ID, userId);
        if (!isDac) {
          await sqldb.DAMS_AUTOMATIONS.w_insert({
            DAM_DEVICE_ID: deviceInfo.DAM_DEVICE_ID,
            MACHINE_ID: Number(machine),
            READ_DUT_TEMPERATURE_FROM_BROKER: false,
          }, userId);
        }
        else if (isAutomationEnabled) {
          await sqldb.DACS_AUTOMATIONS.w_insert({
            DAC_DEVICE_ID: deviceInfo.DAC_DEVICE_ID,
            MACHINE_ID: Number(machine),
            FW_MODE: 'DAC-1R',
            DISAB: 0,
          }, userId);
        }
      }
    }
  }

  if (Object.keys(paramSet).length > 1) {
    const lastCfgModif = new Date();
    const lastCfgModifToUpdate = `${lastCfgModif.getUTCFullYear()}-${zeroPad(lastCfgModif.getUTCMonth() + 1, 2)}-${zeroPad(lastCfgModif.getUTCDate(), 2)} ${zeroPad(lastCfgModif.getUTCHours(), 2)}:${zeroPad(lastCfgModif.getUTCMinutes(), 2)}:${zeroPad(lastCfgModif.getUTCSeconds(), 2)}`;

    await sqldb.DEVICES.w_updateInfo({DEVICE_CODE: paramSet.DAM_ID, LAST_CFG_MODIF: lastCfgModifToUpdate}, userId);
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: reqParams.DAM_ID});
    if (currentAutomationId) {
      if (currentAutomationId.DAC_AUTOMATION_ID && (paramSet.DISAB || paramSet.FW_MODE)) {
        await sqldb.DACS_AUTOMATIONS.w_updateInfo({
          ID: currentAutomationId.DAC_AUTOMATION_ID,
          ...paramSet
        }, userId);
      }
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        ...paramSet,
      }, userId);
    }
  }

  currentDamInfo = await sqldb.DAMS.getDamBasicInfo({ devId: damId });

  //Check GROUP(s)
  if (currentDamInfo.UNIT_ID == null) {
    reqParams.groups = []
  }
  if (reqParams.groups) {
    const allowedMachines = await sqldb.MACHINES.getMachinesList({ UNIT_ID: currentDamInfo.UNIT_ID, CLIENT_IDS: [currentDamInfo.CLIENT_ID] });
    const allowedMachinesIds = allowedMachines.map(x => x.MACHINE_ID || x.ILLUMINATION_ID);
    const filteredMachines = reqParams.groups.map(x => Number(x)).filter(id => allowedMachinesIds.includes(id));
    await groups.setMachinesAutomatedByDam(damId, filteredMachines, reqParams.REL_DUT_ID, userId);
  }

  await damEcoEventHooks.ramCaches_DAMS_loadDamsEcoCfg();
}

export async function deleteDamInfo (qPars: { DAM_ID: string }, userId: string) {
  await groups.removingDam(qPars, userId);
  await sqldb.DAMS_DEVICES_IMAGES.w_deleteFromDam({DEV_ID: qPars.DAM_ID}, userId);
  await sqldb.DAMS_AUTOMATIONS.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DAM_ID}, userId);
  await sqldb.DAMS_DEVICES.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DAM_ID}, userId);
  await damEcoEventHooks.ramCaches_DAMS_loadDamsEcoCfg();
}

export async function deleteClientDams (qPars: { CLIENT_ID: number }, userId: string) {
  await groups.removingClientDams(qPars, userId);
  await sqldb.DAMS_DEVICES_IMAGES.w_deleteFromClientDams(qPars, userId);
  await sqldb.DAMS_AUTOMATIONS.w_deleteFromClient(qPars, userId);
  await sqldb.DAMS_DEVICES.w_deleteFromClient(qPars, userId);
  await damEcoEventHooks.ramCaches_DAMS_loadDamsEcoCfg();
}
// async function deleteClientDevs (session: SessionData, reqParams: { CLIENT_ID: number }) {
//   if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS) throw Error('Permission denied!').HttpStatus(403)
//   if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400)
//   await groups.removingClient({ CLIENT_ID: reqParams.CLIENT_ID });
//   await sqldb.DAMS.w_deleteFromClient({ CLIENT_ID: reqParams.CLIENT_ID }, { DEVGROUPS: true });
//   await loadDutDamsEco();
//   return 'DELETE_DONE'
// }

httpRouter.privateRoutes['/dam/get-sched-list-v2'] = async function (reqParams, session) {
  if (reqParams.damIds) {
    reqParams.damIds = [...reqParams.damIds.map(x => String(x))];
  }
  const damsList = await sqldb.DAMS.getListWithProgFU({ damIds: reqParams.damIds }, { includeDacs: true });
  if (reqParams.damIds) {
    if (damsList.length !== reqParams.damIds.length) throw Error('One or more DAMs not found!').HttpStatus(403)
  }

  const list = [];
  for (const damInf of damsList) {
    const perms = await getPermissionsOnUnit(session, damInf.CLIENT_ID, damInf.UNIT_ID);
  if (!perms.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403);
    }
  
    const lastProg = parseFullProgV4(damInf.LASTPROG);
    const desiredProg = parseFullProgV4(damInf.DESIREDPROG);

    list.push({ damId: damInf.DAM_ID, current: lastProg, desired: desiredProg });
  }

  return { list };
}

httpRouter.privateRoutes['/dam/get-sched'] = async function (reqParams, session) {
  if (!reqParams.damId) throw Error('Missing parameter "damId"').HttpStatus(400);
  
  const damsList = await sqldb.DAMS.getListWithProgFU({ damIds: [reqParams.damId] }, { includeDacs: true });
  if (damsList.length !== 1) throw Error('DAM not found!').HttpStatus(403)

  const damInf = damsList[0];

  const perms = await getPermissionsOnUnit(session, damInf.CLIENT_ID, damInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  
  const lastProg = parseFullProgV4(damInf.LASTPROG);
  const desiredProg = parseFullProgV4(damInf.DESIREDPROG);

  return { current: lastProg, desired: desiredProg };
}

httpRouter.privateRoutesDeprecated['/dam/get-sched-list'] = async function (reqParams, session) {
  const { list } = await httpRouter.privateRoutes['/dam/get-sched-list-v2'](reqParams, session);
  return {
    list: list.map((item) => ({
      damId: item.damId,
      current: FullProgV4_to_deprecated_FullProgV3(item.current && { version: 'v4', ...item.current }),
      desired: FullProgV4_to_deprecated_FullProgV3(item.desired && { version: 'v4', ...item.desired }),
    })),
  }
}

httpRouter.privateRoutes['/dam/set-local-setpoint'] = async function (reqParams, session) {
  const damInfo = reqParams.DAM_ID && await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.DAM_ID});
  if (!damInfo) throw Error(`DAM não encontrado: ${reqParams.DAM_ID}`).HttpStatus(400);
  if (reqParams.SETPOINT == null) throw Error('There was an error!\nInvalid properties. Missing SETPOINT.').HttpStatus(400);

  const { canManageDevs } = await getPermissionsOnUnit(session, damInfo.CLIENT_ID, damInfo.UNIT_ID);
  if (!canManageDevs) throw Error('Permission denied!').HttpStatus(403);

  // Comandos para enviar quando passar tempo que ficou em modo Local
  const command = {
    "msgtype": "set-eco-local-cfg",
    "en_ecolocal": (damInfo.ENABLE_ECO && damInfo.ENABLE_ECO_LOCAL) || 0,
    "setpoint": reqParams.SETPOINT != null ? reqParams.SETPOINT : -99,
    "hist_sup": damInfo.UPPER_HYSTERESIS != null ? damInfo.UPPER_HYSTERESIS : -99,
    "hist_inf": damInfo.LOWER_HYSTERESIS != null ? damInfo.LOWER_HYSTERESIS : -99,
    "interval": damInfo.ECO_INT_TIME != null ? damInfo.ECO_INT_TIME  * 60 : -99,
  } as DamCmd_SetLocalEcoCfg;
  
  try {
    sendDamCommand_setEcoLocalCfg(reqParams.DAM_ID, command, session.user);
  
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: reqParams.DAM_ID});
    if (currentAutomationId && currentAutomationId.DAM_DEVICE_ID) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        SETPOINT_ECO_REAL_TIME: reqParams.SETPOINT,
      }, session.user);
    }

  }
  catch (err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error(`There was an error trying send new setpoint to ecoLocal!\n ${err}`).HttpStatus(500);
  }

  const damResponseInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.DAM_ID});
  return { DAM_ID: damResponseInfo.DAM_ID, SETPOINT: damResponseInfo.SETPOINT };
}

async function setExtThermCfg(damId: string, value: number, user: string): Promise<void> {
  sendDamCommand_setExtThermCfg(damId, {
    msgtype: 'set-thermostat-cfg',
    value,
  }, user);

  const damInfo = await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: damId});
  if (damInfo) {
    await sqldb.DAMS_DEVICES.w_updateInfo({ ID: damInfo.ID, THERSMOSTAT_CFG: value }, user);
    await eventHooks.ramCaches_DAMS_setDamThermostatCfg(damId, value);
  }
}

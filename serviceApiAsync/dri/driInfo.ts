import sqldb from '../../srcCommon/db'
import * as httpRouter from '../apiServer/httpRouter'
import type { ApiParams, ApiResps } from '../apiServer/httpRouter'
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { setGetDevInfo } from '../devInfo';
import servConfig from '../../configfile';
import { getUploadedFile } from '../apiServer/getMultiparFiles';
import parseXlsx, { createXlsx } from '../../srcCommon/helpers/parseXlsx'
import {
  getAllowedUnitsView,
  getPermissionsOnClient,
  getPermissionsOnUnit,
  getUserGlobalPermissions,
  canSeeDevicesWithoutProductionUnit,
} from '../../srcCommon/helpers/permissionControl';
import { logger } from '../../srcCommon/helpers/logger'
import { checkEndDateNoLaterThanYesterday, formatISODate, now_shiftedTS_s, zeroPad } from '../../srcCommon/helpers/dates'
import * as devInfo from '../devInfo'
import { deleteElectricCircuits } from '../energyInfo';
import {
  DriParsedRowType as ParsedRowType,
  DriVarsConfig,
  SessionData,
  DriBodyVarsCfg,
  DriProg,
} from '../../srcCommon/types'
import { checkDeviceOnline, isTemporaryId } from '../../srcCommon/helpers/devInfo';
import * as driAutomationeventHooks from '../driAutomation/eventHooks';
import { loadDriCfg } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { verifyOwnerShipFilter, verifySearchTermsFilter } from '../dmaInfo';
import { DriInfo, sendDriCommand, MINIMUM_AUTOMATION_VERSION, isApplicationAutomationByVarsCfg, parseDriVarsCfg, validateSchedule, validateException, SchedulesDatabase } from '../../srcCommon/dri/driInfo';
import * as brokerMQTT from '../../srcCommon/iotMessages/brokerMQTT'
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes';
import { getLanguage, t, verifyTranslationExists } from '../../srcCommon/helpers/i18nextradution'
import { calculateDateByTimezone, getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import axios from 'axios';
import apiAsyncConfigFile from '../configfile';
import { processDriDay } from '../dayCompilers/dri';
import { applicationType, chillerRoutes, loadDriCfg as loadDriCfgAux } from '../telemHistory/driHist';
import * as groups from '../clientData/machines';
import moment = require('moment');
import { setTimeout } from "timers/promises";
import { compareVersions, parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion';
import { parseDriScheduleCardsToScheduler, parseDriScheduleToCards, sendDriScheduler, sendDriSchedulerConfig, validateDeviceSchedulerCards } from '../devsScheduler';
import { retryFunction } from '../../srcCommon/helpers/retries';
import { getCarrierEcosplitCommandsAutomation, getFancoilCommandsAutomation, getVavCommandsAutomation } from '../../srcCommon/dri/driAutomation';
import { ApiInternalParams } from '../api-internal';

function formatListDrisForSendToFront(
  reqParams: ApiParams['/dri/get-dris-list'],
  rows: Awaited<ReturnType<typeof sqldb.DRIS.getList>>,
  manufacturers: number[],
  searchTerms: string[],
  totalItems: number,
  skipRows: number,
  list: ApiResps['/dri/get-dris-list']['list'],
  lastMessagesTimes: Awaited<ReturnType<typeof devsLastComm.loadLastMessagesTimes>>,
) {
  for (const regDevRaw of rows) {
    const status = lastMessagesTimes.connectionStatus(regDevRaw.DRI_ID) || 'OFFLINE';
    const regDev = Object.assign(regDevRaw, {
      status,
      unComis: (regDevRaw.CLIENT_ID == null) && isTemporaryId(regDevRaw.DRI_ID),
    })

    if (verifyOwnerShipFilter(reqParams, regDevRaw, manufacturers, regDev)) {
      continue;
    }

    if (verifySearchTermsFilter(searchTerms, regDevRaw, regDev)) {
      continue;
    }

    totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (!(reqParams.LIMIT && list.length >= reqParams.LIMIT)) {
      list.push(regDev);
    }
  }
}

httpRouter.privateRoutes['/dri/get-dris-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  const qPars: Parameters<typeof sqldb.DRIS.getList>[0] = {
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }
  const rows = await sqldb.DRIS.getList(qPars);
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DRI_ID) : undefined,
  })

  const searchTerms = reqParams.searchTerms || (reqParams.searchText?.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }
  let skipRows = reqParams.SKIP || 0;
  let totalItems = 0;
  const list: {
    DRI_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    CITY_ID: string
    STATE_ID: number
    STATE_NAME: string
    CLIENT_ID: number
    CLIENT_NAME: string
    status: string
    unComis: boolean;
  }[] = [];

  formatListDrisForSendToFront(reqParams, rows, manufacturers, searchTerms, totalItems, skipRows, list, lastMessagesTimes);

  return { list, totalItems };
}

httpRouter.privateRoutes['/send-dri-command-reboot'] = async function (reqParams, session) {
  return {};
}

function paramSetDriInfo(reqParams: Parameters<typeof httpRouter.privateRoutes['/dri/set-dri-info']>[0], driId: string, clientChanged: boolean) {
  const paramSet: Parameters<typeof sqldb.DRIS.w_updateInfo>[0] = { DRI_ID: driId };

  if (reqParams.varsList !== undefined) paramSet.VARSCFG = (reqParams.varsList || null) && JSON.stringify({ varsList: reqParams.varsList });
  if (reqParams.SYSTEM_NAME !== undefined) paramSet.SYSTEM_NAME = reqParams.SYSTEM_NAME;
  if (reqParams.DUT_ID !== undefined) paramSet.DUT_ID = reqParams.DUT_ID;
  if (reqParams.ENABLE_ECO !== undefined) paramSet.ENABLE_ECO = reqParams.ENABLE_ECO;
  if (reqParams.ECO_CFG !== undefined) paramSet.ECO_CFG = reqParams.ECO_CFG;
  if (reqParams.ECO_OFST_START !== undefined) paramSet.ECO_OFST_START = reqParams.ECO_OFST_START;
  if (reqParams.ECO_OFST_END !== undefined) paramSet.ECO_OFST_END = reqParams.ECO_OFST_END;
  if (reqParams.ECO_INT_TIME != undefined) paramSet.ECO_INT_TIME = reqParams.ECO_INT_TIME;
  if (reqParams.AUTOMATION_INTERVAL !== undefined) paramSet.AUTOMATION_INTERVAL = reqParams.AUTOMATION_INTERVAL;
  if (clientChanged) paramSet.DAT_BEGAUT = null;

  return paramSet;
}

function paramSetDriDeviceInfo(reqParams: Parameters<typeof httpRouter.privateRoutes['/dri/set-dri-info']>[0], driId: number) {
  const paramSet: Parameters<typeof sqldb.DRIS_DEVICES.w_updateInfo>[0] = { ID: driId };

  if (reqParams.SYSTEM_NAME !== undefined) paramSet.SYSTEM_NAME = reqParams.SYSTEM_NAME;
  if (reqParams.varsList !== undefined) paramSet.VARSCFG = (reqParams.varsList || null) && JSON.stringify({ varsList: reqParams.varsList });
  return paramSet;
}

function verifyVarList(reqParams: Parameters<typeof httpRouter.privateRoutes['/dri/set-dri-info']>[0]) {
  if (reqParams.varsList) {
    for (const item of reqParams.varsList) {
      if (!item.address) throw Error('Configuração de variável inválida').HttpStatus(400);
      if (typeof item.address.protocol !== 'string') throw Error('Configuração de variável inválida').HttpStatus(400);
    }
    // TODO: verificar configuração por máquina
    // const paramSet: Parameters<typeof sqldb.DRIS.w_updateInfo>[0] = { DRI_ID: driId };
    // if (reqParams.varsList !== undefined) paramSet.VARSCFG = (reqParams.varsList || null) && JSON.stringify({ varsList: reqParams.varsList });
    // if (Object.keys(paramSet).length > 1) {
    //   await sqldb.DRIS.w_updateInfo(paramSet);
    // }
  }
}

async function updateDutDri(DRI_ID: string, user: string, DUT_ID?: string) {
  if (DUT_ID !== undefined) {
    const drisAutomation = await sqldb.DRIS_AUTOMATIONS.getDrisAutomationInfo({ DEVICE_CODE: DRI_ID });
    const driAutomation = (drisAutomation && drisAutomation.length > 0) ? drisAutomation[0] : null;

    if (driAutomation) {
      await groups.setMachineDut(driAutomation.MACHINE_ID, DUT_ID, user);
    }
  }
}

async function updateDriDeviceInfo(reqParams: Parameters<typeof httpRouter.privateRoutes['/dri/set-dri-info']>[0], user: string, lastCfgToUpdate: string) {
  const driDeviceInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: reqParams.DRI_ID });

  const paramDeviceSet = paramSetDriDeviceInfo(reqParams, driDeviceInfo.DRI_DEVICE_ID);
  if (driDeviceInfo && Object.keys(paramDeviceSet).length > 1) {
    await sqldb.DRIS_DEVICES.w_updateInfo({
      ...paramDeviceSet,
      LASTCFGSEND: lastCfgToUpdate
    }, user);
  }
}

async function updateCurrentAutomationDri(paramSet: ReturnType<typeof paramSetDriInfo>, user: string) {
  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({ DEVICE_CODE: paramSet.DRI_ID });
  if (currentAutomationId) {
    try {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        ...paramSet,
      }, user);
    }
    catch (err) {
      logger.error(err);
    }
  }
}

async function verifyIsNewDevice(driId: string, user: string, { userCanEditDev, userCanAddNewInfo }: { userCanEditDev: boolean, userCanAddNewInfo: boolean }) {
  let currentDevInfo = await sqldb.DRIS.getBasicInfo({ driId });

  if (currentDevInfo) {
    if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);
  } else {
    if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
    const deviceInfo = await sqldb.DEVICES.getDevicesInfo({ DEVICE_CODE: driId });
    await sqldb.DRIS_DEVICES.w_insertIgnore({ DEVICE_ID: deviceInfo.DEVICE_ID }, user);
    currentDevInfo = await sqldb.DRIS.getBasicInfo({ driId });
  }

  return currentDevInfo;
}

const isCompatibleVerifySchedules = (currentVersion: string) => {
  const parsedVersion = parseFirmwareVersion(currentVersion);
  const minimumVersion = parseFirmwareVersion('v4.5.5');

  return compareVersions(parsedVersion, minimumVersion, false) >= 0;
}

export async function verifyDriCanSentScheduler(driId: string, currentVersion: string): Promise<boolean> {
  const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(driId);
  const versionNumber = parseFirmwareVersion(currentVersion);
  if (compareVersions(versionNumber, MINIMUM_AUTOMATION_VERSION, false) < 0) return false;

  checkDeviceOnline(driId, connectionStatus);

  return true;
}

export async function verifySentSchedules(
  driId: string, currentVersion: string, sentSchedules: DriProg[], driCfg: DriVarsConfig, user: string
): Promise<void> {
  if (isCompatibleVerifySchedules(currentVersion)) {

    await retryFunction(
      () => validateDeviceSchedulerCards(driId,
        true,
        true,
        {
          exceptions: sentSchedules.filter((item) => !!item.EXCEPTION_DATE),
          schedules: sentSchedules.filter((item) => !item.EXCEPTION_DATE),
        }, driCfg, user),
      3
    );
  }
}

async function verifyCurrentAutomationInterval(
  driId: string, 
  user: string, 
  automationIntervalDatabase?: number, 
  automationIntervalReq?: number
): Promise<number | undefined> {
  let currentAutomationInterval = automationIntervalDatabase;
  if (automationIntervalReq && automationIntervalReq !== automationIntervalDatabase) {
    currentAutomationInterval = automationIntervalReq;
    
    await updateCurrentAutomationDri(
      { AUTOMATION_INTERVAL: automationIntervalReq, DRI_ID: driId }, user
    );
  }

  return currentAutomationInterval;
}

export async function sendScheduleToDriDevice(reqParams: ApiParams['/dri/add-dri-sched'],
  schedules: SchedulesDatabase,
  driCfg: DriVarsConfig,
  user: string,
  automationInterval?: number,
): Promise<void> {
  if (reqParams.ACTIVE === '0') return;

  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: reqParams.DRI_ID });

  if (!(await verifyDriCanSentScheduler(reqParams.DRI_ID, fwInfo.CURRFW_VERS))) return;

  const newSchedule: DriProg = {
    SCHED_ID: 0,
    ACTIVE: reqParams.ACTIVE,
    BEGIN_TIME: reqParams.BEGIN_TIME,
    DAYS: reqParams.DAYS,
    DRI_ID: reqParams.DRI_ID,
    END_TIME: reqParams.END_TIME,
    EXCEPTION_DATE: reqParams.EXCEPTION_DATE ? formatISODate(reqParams.EXCEPTION_DATE) : undefined,
    EXCEPTION_REPEAT_YEARLY: reqParams.EXCEPTION_REPEAT_YEARLY,
    OPERATION: reqParams.OPERATION,
    SETPOINT: reqParams.SETPOINT,
    MODE: reqParams.MODE,
  }

  const schedulesToSend = [...parseDriScheduleToCards(schedules), newSchedule].filter((item) => item.ACTIVE === '1');
  const scheduler = await parseDriScheduleCardsToScheduler(schedulesToSend, driCfg);

  if (Object.values(scheduler.exceptions.exceptions).length === 0 && scheduler.week.length === 0) {
    const message = 'Erro ao construir scheduler.';
    logger.error({
      message,
      reqParams,
      scheduler,
      schedulesToSend,
    });
    throw new Error(message).HttpStatus(400);
  };

  const currentAutomationInterval = await verifyCurrentAutomationInterval(
    reqParams.DRI_ID, user, automationInterval, reqParams.AUTOMATION_INTERVAL
  );

  sendDriSchedulerConfig(reqParams.DRI_ID, driCfg, user, currentAutomationInterval);

  await sendDriScheduler(reqParams.DRI_ID, scheduler.week, scheduler.exceptions, user);

  await verifySentSchedules(reqParams.DRI_ID, fwInfo.CURRFW_VERS, schedulesToSend, driCfg, user);

}

function buildUpdateSchedule(
  schedule: Awaited<ReturnType<typeof sqldb.DRISCHEDS.getDriScheds>>[number],
  reqParams: ApiParams['/dri/update-dri-sched']
): DriProg {
  return {
    SCHED_ID: schedule.SCHED_ID,
    ACTIVE: reqParams.ACTIVE ?? schedule.ACTIVE,
    BEGIN_TIME: reqParams.BEGIN_TIME ?? schedule.BEGIN_TIME,
    DAYS: reqParams.DAYS ?? schedule.DAYS,
    DRI_ID: reqParams.DRI_ID ?? schedule.DRI_ID,
    END_TIME: reqParams.END_TIME ?? schedule.END_TIME,
    EXCEPTION_DATE: reqParams.EXCEPTION_DATE ? formatISODate(reqParams.EXCEPTION_DATE) : undefined,
    EXCEPTION_REPEAT_YEARLY: reqParams.EXCEPTION_REPEAT_YEARLY ?? schedule.EXCEPTION_REPEAT_YEARLY,
    OPERATION: reqParams.OPERATION ?? schedule.OPERATION,
    SETPOINT: reqParams.SETPOINT ?? schedule.SETPOINT,
    MODE: reqParams.MODE ?? schedule.MODE,
  }
}

async function sendUpdatedScheduleToDriDevice(
  reqParams: ApiParams['/dri/update-dri-sched'],
  schedules: SchedulesDatabase,
  driCfg: DriVarsConfig,
  user: string,
  automationInterval?: number
): Promise<void> {
  let schedule: typeof schedules[number] | undefined;

  const currentSchedules = schedules.filter((sched) => {
    if (sched.SCHED_ID === reqParams.SCHED_ID) {
      schedule = sched;
      return false;
    }
    return true;
  });

  if (!schedule) {
    const message = 'Programação/Exceção não encontrada';
    logger.error({
      message,
      reqParams
    })
    throw new Error(message).HttpStatus(400);
  }

  if (reqParams?.ACTIVE === '0' && schedule.ACTIVE === '0') return;

  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: reqParams.DRI_ID });

  if (!(await verifyDriCanSentScheduler(reqParams.DRI_ID, fwInfo.CURRFW_VERS))) return;

  const updatedSchedule = buildUpdateSchedule(schedule, reqParams);

  const schedulesToSend = [...parseDriScheduleToCards(currentSchedules), updatedSchedule].filter((sched) => sched.ACTIVE === '1');
  const scheduler = await parseDriScheduleCardsToScheduler(schedulesToSend, driCfg);

  const currentAutomationInterval = await verifyCurrentAutomationInterval(
    reqParams.DRI_ID, user, automationInterval, reqParams.AUTOMATION_INTERVAL
  );

  sendDriSchedulerConfig(reqParams.DRI_ID, driCfg, user, currentAutomationInterval);
  await sendDriScheduler(reqParams.DRI_ID, scheduler.week, scheduler.exceptions, user);

  await verifySentSchedules(reqParams.DRI_ID, fwInfo.CURRFW_VERS, schedulesToSend, driCfg, user);
}

async function sendScheduleToDriDeviceDeleting(
  reqParams: ApiParams['/dri/delete-dri-sched'],
  driCfg: DriVarsConfig,
  user: string,
  automationInterval?: number,
): Promise<void> {
  const { DRI_ID, SCHED_ID, AUTOMATION_INTERVAL } = reqParams;
  const schedules = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID });

  const currentSchedule = schedules.find((sched) => sched.SCHED_ID === SCHED_ID);

  if (currentSchedule) {
    if (currentSchedule.ACTIVE === '0') return;
  } else {
    const message = 'Programação/Exceção não encontrada';
    logger.error({
      message,
      schedId: SCHED_ID,
      driId: DRI_ID,
    })
    throw new Error(message).HttpStatus(400);
  }

  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: DRI_ID });

  if (!(await verifyDriCanSentScheduler(DRI_ID, fwInfo.CURRFW_VERS))) return;

  const currentSchedules = schedules.filter((sched) => sched.SCHED_ID !== SCHED_ID);

  const schedulesToSend = parseDriScheduleToCards(currentSchedules).filter((sched) => sched.ACTIVE === '1');
  const scheduler = await parseDriScheduleCardsToScheduler(schedulesToSend, driCfg);

  const currentAutomationInterval = await verifyCurrentAutomationInterval(
    DRI_ID, user, automationInterval, AUTOMATION_INTERVAL
  );

  sendDriSchedulerConfig(DRI_ID, driCfg, user, currentAutomationInterval);
  await sendDriScheduler(DRI_ID, scheduler.week, scheduler.exceptions, user);

  await verifySentSchedules(DRI_ID, fwInfo.CURRFW_VERS, schedulesToSend, driCfg, user);
}

httpRouter.privateRoutes['/dri/set-dri-info'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  const driInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });
  const permsClient = await getPermissionsOnClient(session, driInfo?.CLIENT_ID);

  if (!perms.manageAllClientsUnitsAndDevs && !session.permissions.isInstaller && !permsClient.canEditProgramming) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  // Check required params
  if (!reqParams.DRI_ID) {
    throw Error('There was an error!\nInvalid properties. Missing DRI_ID.').HttpStatus(400)
  }
  const driId = reqParams.DRI_ID;

  const { userCanEditDev, userCanAddNewInfo, clientChanged } = await setGetDevInfo(session, {
    DEV_ID: driId,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    allowInsert: driId.startsWith('DRI'),
  });

  // Check if new dev
  const currentDevInfo = await verifyIsNewDevice(driId, session.user, {
    userCanAddNewInfo,
    userCanEditDev
  })

  verifyVarList(reqParams);

  const paramSet = paramSetDriInfo(reqParams, driId, clientChanged);

  const isAutomationEnabled = !!((paramSet.ENABLE_ECO !== undefined) ? paramSet.ENABLE_ECO : currentDevInfo.ENABLE_ECO);

  if (isAutomationEnabled && (clientChanged || !currentDevInfo.DAT_BEGAUT)) {
    paramSet.DAT_BEGAUT = now_shiftedTS_s(true);
  }

  if (Object.keys(paramSet).length > 1) {
    const lastCfgModif = new Date();
    const lastCfgModifToUpdate = `${lastCfgModif.getUTCFullYear()}-${zeroPad(lastCfgModif.getUTCMonth() + 1, 2)}-${zeroPad(lastCfgModif.getUTCDate(), 2)} ${zeroPad(lastCfgModif.getUTCHours(), 2)}:${zeroPad(lastCfgModif.getUTCMinutes(), 2)}:${zeroPad(lastCfgModif.getUTCSeconds(), 2)}`;

    await sqldb.DEVICES.w_updateInfo({ DEVICE_CODE: paramSet.DRI_ID, LAST_CFG_MODIF: lastCfgModifToUpdate }, session.user);

    await updateDriDeviceInfo(reqParams, session.user, lastCfgModifToUpdate);

    await updateCurrentAutomationDri(paramSet, session.user);

    await updateDutDri(paramSet.DRI_ID, session.user, paramSet.DUT_ID);
  }

  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();

  return 'SET OK';
}

const validateAddDriSchedReqParams = (reqParams: {
  DRI_ID: string
  NAME: string
  ACTIVE: string
  OPERATION: string
  BEGIN_TIME: string
  END_TIME: string
  MODE?: string
  DAYS: string
  SETPOINT?: number
  EXCEPTION_DATE?: string
  EXCEPTION_REPEAT_YEARLY?: string
}) => {
  if (!reqParams.DRI_ID) throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  if (!reqParams.NAME) throw new Error('Parâmetro NAME não informado').HttpStatus(400);
  if (!reqParams.ACTIVE) throw new Error('Parâmetro ACTIVE não informado').HttpStatus(400);
  if (!reqParams.OPERATION) throw new Error('Parâmetro OPERATION não informado').HttpStatus(400);
  if (!reqParams.BEGIN_TIME) throw new Error('Parâmetro BEGIN_TIME não informado').HttpStatus(400);
  if (!reqParams.END_TIME) throw new Error('Parâmetro END_TIME não informado').HttpStatus(400);
  if (reqParams.OPERATION === '1') {
    if (!reqParams.DAYS) throw new Error('Parâmetro DAYS não informado');
    if (reqParams.MODE === 'COOL') {
      if (!reqParams.SETPOINT) throw new Error('Parâmetro SETPOINT não informado');
    }
  }
}

const validateNewUpdatedSchedule = async (
  reqParams: ApiParams['/dri/add-dri-sched'] | ApiParams['/dri/update-dri-sched'],
  schedules: SchedulesDatabase,
  language: string
): Promise<void> => {

  if (reqParams.EXCEPTION_DATE) {
    const exceptions = schedules.filter((row) => !!row.EXCEPTION_ID);

    const parsedExceptions = exceptions.map((except) => ({
      ACTIVE: except.ACTIVE,
      BEGIN_TIME: except.BEGIN_TIME,
      END_TIME: except.END_TIME,
      EXCEPTION_DATE: except.EXCEPTION_DATE,
      EXCEPTION_REPEAT_YEARLY: except.EXCEPTION_REPEAT_YEARLY,
      SCHED_ID: except.SCHED_ID
    }));

    validateException({
      ACTIVE: reqParams.ACTIVE,
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      EXCEPTION_DATE: formatISODate(reqParams.EXCEPTION_DATE),
      EXCEPTION_REPEAT_YEARLY: reqParams.EXCEPTION_REPEAT_YEARLY,
      SCHED_ID: (reqParams as ApiParams['/dri/update-dri-sched']).SCHED_ID,
    }, parsedExceptions, language);
  } else {
    const currentSchedules = schedules.filter((sched) => !!sched.SCHEDULE_ID);

    const parsedSchedules = currentSchedules.map((sched) => ({
      ACTIVE: sched.ACTIVE,
      BEGIN_TIME: sched.BEGIN_TIME,
      DAYS: sched.DAYS,
      END_TIME: sched.END_TIME,
      SCHED_ID: sched.SCHED_ID,
    }));

    validateSchedule({
      ACTIVE: reqParams.ACTIVE,
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      DAYS: reqParams.DAYS,
      SCHED_ID: (reqParams as ApiParams['/dri/update-dri-sched']).SCHED_ID,
    }, parsedSchedules, language);
  }
}

function validateUpdateDriSchedParams(reqParams: ApiParams['/dri/update-dri-sched']): void {
  if (!reqParams.DRI_ID) throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  if (!reqParams.SCHED_ID) throw new Error('Parâmetro SCHED_ID não informado').HttpStatus(400);
}

httpRouter.privateRoutes['/dri/add-dri-sched'] = async function (reqParams, session) {
  validateAddDriSchedReqParams(reqParams);

  const [driBasicInfo, prefsUser] = await Promise.all([
    sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID }),
    sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user }),
  ])
  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);

  if (!perms.canManageDevs) throw Error('Permission denied!').HttpStatus(403);

  const driCfg = parseDriVarsCfg(driBasicInfo.VARSCFG);
  const language = getLanguage(prefsUser[0]);
  const schedules = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID: reqParams.DRI_ID });

  await validateNewUpdatedSchedule(reqParams, schedules, language);
  await sendScheduleToDriDevice(reqParams, schedules, driCfg, session.user, driBasicInfo.AUTOMATION_INTERVAL ?? 5);

  const driAutomationInfo = await sqldb.DRIS_AUTOMATIONS.getDrisAutomationInfo({ DEVICE_CODE: reqParams.DRI_ID });

  const insertedAutomationsPeriods = await sqldb.AUTOMATIONS_PERIODS.w_insert({
    TITLE: reqParams.NAME,
    AUTOMATION_PERIOD_STATUS: reqParams.ACTIVE.toString(),
    BEGIN_TIME: reqParams.BEGIN_TIME,
    END_TIME: reqParams.END_TIME,
  }, session.user);

  const insertedAutomationParameters = await sqldb.AUTOMATIONS_PARAMETERS.w_insert({
    ACTION_MODE: null,
    ACTION_TIME: null,
    ACTION_POST_BEHAVIOR: null,
    MODE: reqParams.MODE,
    FORCED_BEHAVIOR: null,
    IR_ID_COOL: null,
    LOWER_HYSTERESIS: null,
    UPPER_HYSTERESIS: null,
    LTC: null,
    LTI: null,
    PERMISSION: null,
    SCHEDULE_END_BEHAVIOR: null,
    SCHEDULE_START_BEHAVIOR: null,
    SETPOINT: reqParams.SETPOINT,
    OPERATION: reqParams.OPERATION,
  }, session.user);
  if (!reqParams.EXCEPTION_DATE) {
    await sqldb.SCHEDULES.w_insert({
      AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
      DAYS: reqParams.DAYS,
      NEED_MULT_SCHEDULES: '1'
    }, session.user);
  }
  else {
    await sqldb.EXCEPTIONS.w_insert({
      AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
      EXCEPTION_DATE: reqParams.EXCEPTION_DATE,
      REPEAT_YEARLY: reqParams.EXCEPTION_REPEAT_YEARLY
    }, session.user);
  }

  for (const machines of driAutomationInfo) {
    await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_insert({
      MACHINE_ID: machines.MACHINE_ID,
      AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId
    }, session.user);
  }

  await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_insert({
    AUTOMATION_PERIOD_ID: insertedAutomationsPeriods.insertId,
    AUTOMATION_PARAMETERS_ID: insertedAutomationParameters.insertId
  }, session.user);

  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({ DEVICE_CODE: reqParams.DRI_ID });
  if (currentAutomationId?.ID && !currentAutomationId.FIRST_PROGRAMMING_DATE) {
    await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
      ID: currentAutomationId.ID,
      ...(!currentAutomationId.FIRST_PROGRAMMING_DATE && { FIRST_PROGRAMMING_DATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) })
    }, session.user);
  }
  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();

  return 'ADD OK';
}

httpRouter.privateRoutes['/dri/get-dri-scheds'] = async function (reqParams, session) {
  if (!reqParams.DRI_ID) throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const rows = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID: reqParams.DRI_ID });

  return { list: rows }
}

httpRouter.privateRoutes['/dri/update-dri-sched'] = async function (reqParams, session) {
  validateUpdateDriSchedParams(reqParams);

  const [driBasicInfo, prefsUser] = await Promise.all([
    sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID }),
    sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user }),
  ])
  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);

  if (!perms.canManageDevs) throw Error('Permission denied!').HttpStatus(403);

  const driCfg = parseDriVarsCfg(driBasicInfo.VARSCFG);
  const language = getLanguage(prefsUser[0]);
  const schedules = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID: reqParams.DRI_ID });

  await validateNewUpdatedSchedule(reqParams, schedules, language);
  await sendUpdatedScheduleToDriDevice(reqParams, schedules, driCfg, session.user, driBasicInfo.AUTOMATION_INTERVAL);

  const qPars = {
    SCHED_ID: reqParams.SCHED_ID,
    DRI_ID: reqParams.DRI_ID,
    TITLE: reqParams.NAME || undefined,
    AUTOMATION_PERIOD_STATUS: reqParams.ACTIVE || undefined,
    OPERATION: reqParams.OPERATION || undefined,
    BEGIN_TIME: reqParams.BEGIN_TIME || undefined,
    END_TIME: reqParams.END_TIME || undefined,
    DAYS: reqParams.DAYS || undefined,
    MODE: reqParams.MODE || null,
    SETPOINT: reqParams.SETPOINT || null,
    EXCEPTION_DATE: reqParams.EXCEPTION_DATE || null,
    REPEAT_YEARLY: reqParams.EXCEPTION_REPEAT_YEARLY || null,
  }

  const sched = schedules.find((sched) => sched.SCHED_ID === qPars.SCHED_ID);

  if (!sched) {
    const message = 'Programação/Exceção não encontrada';
    logger.error({
      message,
      reqParams
    })
    throw new Error(message).HttpStatus(400);
  }

  await sqldb.AUTOMATIONS_PERIODS.w_updateInfo({ ID: qPars.SCHED_ID, ...qPars }, session.user);
  if (sched?.SCHEDULE_ID) {
    await sqldb.SCHEDULES.w_updateInfo({
      ID: sched.SCHEDULE_ID, ...qPars
    }, session.user);
  }
  else if (sched?.EXCEPTION_ID) {
    await sqldb.EXCEPTIONS.w_updateInfo({
      ID: sched.EXCEPTION_ID, ...qPars
    }, session.user);
  }
  await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ ID: sched.AUTOMATION_PARAMETERS_ID, ...qPars }, session.user);

  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();

  return 'UPDATE OK';
}

httpRouter.privateRoutes['/dri/delete-dri-sched'] = async function (reqParams, session) {
  if (!reqParams.DRI_ID) throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  if (!reqParams.SCHED_ID) throw new Error('Parâmetro SCHED_ID não informado').HttpStatus(400);

  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });
  const driCfg = parseDriVarsCfg(driBasicInfo.VARSCFG);

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)


  await sendScheduleToDriDeviceDeleting(reqParams, driCfg, session.user, driBasicInfo.AUTOMATION_INTERVAL);

  const drisched = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID: reqParams.DRI_ID, SCHED_ID: reqParams.SCHED_ID });
  await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByAutomationPeriodId({ AUTOMATION_PERIOD_ID: reqParams.SCHED_ID }, '[SYSTEM]');
  await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_deleteByAutomationPeriodId({ AUTOMATION_PERIOD_ID: reqParams.SCHED_ID }, '[SYSTEM]');
  await sqldb.AUTOMATIONS_PARAMETERS.w_delete({ ID: drisched[0].AUTOMATION_PARAMETERS_ID }, '[SYSTEM]');
  await sqldb.EXCEPTIONS.w_deleteByAutomationPeriod({ AUTOMATION_PERIOD_ID: reqParams.SCHED_ID }, '[SYSTEM]');
  await sqldb.SCHEDULES.w_deleteByAutomationPeriod({ AUTOMATION_PERIOD_ID: reqParams.SCHED_ID }, '[SYSTEM]');
  await sqldb.AUTOMATIONS_PERIODS.w_deleteRow({ ID: reqParams.SCHED_ID }, '[SYSTEM]');
  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();

  return 'DELETE OK';
}

function verifyLeituraEscritaW(row: ParsedRowType, varsCfg: DriVarsConfig) {
  if (!(row.Array.startsWith('[') && row.Array.endsWith(']'))) {
    throw Error('Array inválido').HttpStatus(400);
  }
  const varCfg = {
    name: row.Descricao,
    address: {
      protocol: 'write-uart',
      values: JSON.parse(row.Array),
    },
    inputRow: row,
  }
  varsCfg.w_varsList.push(varCfg);
}

export function verifyWriteAndReadCarrier(rows: ParsedRowType[], varsCfg: DriVarsConfig) {
  for (const row of rows) {
    if (row['Leitura_Escrita']) {
      row['Leitura_Escrita'] = row['Leitura_Escrita'].trim();
    } else { continue; }

    if (row['Leitura_Escrita'] === 'W') {
      verifyLeituraEscritaW(row, varsCfg);
    } else {
      // TO DO - NO MOMENTO, PROTOCOLO CARRIER ECOSPLIT APENAS COM COMANDOS DE ESCRITA
      throw Error('Somente W são aceitos').HttpStatus(400);
    }
  }
}

function bodyVerificationParamsVarsCfg(body: any, varsCfg: DriVarsConfig) {
  if (body.application) {
    const applicationTypes = {
      'carrier-ecosplit': 'CCN',
      'cg-et330': 'CG-ET330',
      'abb-nexus-ii': 'ABB-NEXUS-II',
      'abb-ete-30': 'ABB-ETE-30',
      'abb-ete-50': 'ABB-ETE-50',
      'cg-em210': 'CG-EM210',
      'kron-mult-k': 'KRON-MULT-K',
      'kron-mult-k-05': 'KRON-MULT-K 05',
      'kron-mult-k-120': 'KRON-MULT-K 120',
      'kron-ikron-03': 'KRON-IKRON-03',
      'vav-bac-6000': 'VAV-BAC-6000',
      'vav-bac-6000-amln': 'VAV-BAC-6000-AMLN',
      'vav-bac-2000': 'VAV-BAC-2000',
      'fancoil-bac-6000': 'FANCOIL-BAC-6000',
      'fancoil-bac-6000-amln': 'FANCOIL-BAC-6000-AMLN',
      'fancoil-bac-2000': 'FANCOIL-BAC-2000',
      'schneider-eletric-pm2100': 'SCHNEIDER-ELETRIC-PM2100',
      'schneider-electric-pm210': 'SCHNEIDER-ELECTRIC-PM210',
      'schneider-electric-pm9c': 'SCHNEIDER-ELECTRIC-PM9C',
      'chiller-carrier-30hxe': 'CHILLER-CARRIER-30HXE',
      'chiller-carrier-30gxe': 'CHILLER-CARRIER-30GXE',
      'chiller-carrier-30hxf': 'CHILLER-CARRIER-30HXF',
      'chiller-carrier-30xab': 'CHILLER-CARRIER-30XAB',
      'chiller-carrier-30xab-hvar': 'CHILLER-CARRIER-30XAB-HVAR',
    } as { [name: string]: string };

    const typeConfig = {
      protocol: 'set-type',
      value: (applicationTypes[body.application] || '')
    }
    varsCfg.driConfigs.push(typeConfig);
  }
  if (body.modbusBaudRate) {
    const baudConfig = {
      protocol: 'mdb_baud',
      value: Number(body.modbusBaudRate), // 115200
    };
    if (!(baudConfig.value > 0)) throw Error('modbusBaudRate inválido, tem que ser um número positivo').HttpStatus(400);
    varsCfg.driConfigs.push(baudConfig);
  }
  if (body.telemetryInterval) {
    const intervalConfig = {
      protocol: 'interval',
      value: Number(body.telemetryInterval), // 60
    };
    if (!(intervalConfig.value > 0)) throw Error('telemetryInterval inválido, tem que ser um número positivo').HttpStatus(400);
    varsCfg.driConfigs.push(intervalConfig);
  }
  if (body.serialMode) {
    const serialModes: { [k: string]: number } = {
      'rs-485': 1,
      'rs-232': 2,
      'ethernet': 3,
    };
    const serialMode = {
      protocol: 'serial_mode',
      value: serialModes[body.serialMode],
    };
    if (!serialMode.value) throw Error('serialMode inválido').HttpStatus(400);
    varsCfg.driConfigs.push(serialMode);
  }
  if (body.parity) {
    const parities: { [k: string]: number } = {
      'desabilitado': 0,
      'impar': 1,
      'par': 2,
    };
    const parityConfig = {
      protocol: 'mdb_parity',
      value: parities[body.parity], // 0,1,2
    };
    if (parityConfig.value == null) throw Error('parity inválido').HttpStatus(400);
    varsCfg.driConfigs.push(parityConfig);
  }
  verifyStopBitsBodyVarsCfg(varsCfg, body);
}

function verifyStopBitsBodyVarsCfg(varsCfg: DriVarsConfig, body: any) {
  if (body.stopBits) {
    const stopBits: { [k: string]: number } = {
      '1-stop-bit': 0,
      '1.5-stop-bits': 1,
      '2-stop-bits': 2,
    }
    const stopBitsConfig = {
      protocol: 'mdb_stopbits',
      value: stopBits[body.stopBits],
    };
    if (stopBitsConfig.value == null) throw Error('stopBits inválido').HttpStatus(400);
    varsCfg.driConfigs.push(stopBitsConfig);
  }
}

function verificationOfAdressVarCfg(varCfg: {
  name: string;
  address: {
    alias: string;
    protocol?: string;
    machine: number;
    ip: string;
    id: number;
    function: number;
    size: number;
    address: number;
    signal?: true;
  };
  inputRow: ParsedRowType;
}) {
  if (!isFinite(varCfg.address.function)) throw Error('Função inválida').HttpStatus(400);
  if (!isFinite(varCfg.address.size)) throw Error('Size inválido').HttpStatus(400);
  if (!isFinite(varCfg.address.id)) throw Error('ID inválido').HttpStatus(400);
  if (!isFinite(varCfg.address.machine)) throw Error('Pacote inválido').HttpStatus(400);
  if (!isFinite(varCfg.address.address)) throw Error('Endereço inválido').HttpStatus(400);
}

function createWVarConfigLeituraEscrita(row: ParsedRowType, body: any) {
  const w_varCfg = {
    name: row.Descricao,
    address: {
      alias: row.Alias || row.Comando,
      protocol: `write-${body.protocol}`, // "write-modbus-tcp"
      machine: 1, // Number(row.Pacote || NaN),
      ip: row.IP || undefined,
      id: (['cg-em210', 'cg-et330', 'schneider-eletric-pm2100', 'chiller-carrier-30hxe', 'chiller-carrier-30gxe'].includes(body.application) && Number(body.slaveId || NaN)) || Number(row.ID || NaN),
      function: Number(row.Funcao || NaN),
      size: Number(row.Size || NaN),
      address: Number(row.Endereco || NaN),
    },
    inputRow: row,
  };
  return w_varCfg;
}

function createRVarConfigLeituraEscrita(row: ParsedRowType, body: any) {
  const varCfg = {
    name: row.Descricao,
    address: {
      alias: row.Alias || row.Comando,
      protocol: `read-${body.protocol}`, // "read-modbus-tcp"
      machine: 1, // Number(row.Pacote || NaN),
      ip: row.IP || undefined,
      id: (['abb-nexus-ii', 'cg-em210', 'abb-ete-30', 'abb-ete-50', 'kron-ikron-03', 'kron-mult-k', 'kron-mult-k-05', 'kron-mult-k-120', 'cg-et330', 'schneider-eletric-pm2100', 'schneider-electric-pm210', 'schneider-electric-pm9c', 'chiller-carrier-30hxe', 'chiller-carrier-30gxe', 'chiller-carrier-30hxf', 'chiller-carrier-30xab', 'chiller-carrier-30xab-hvar'].includes(body.application) && Number(body.slaveId || NaN)) || Number(row.ID || NaN),
      function: Number(row.Funcao || NaN),
      size: Number(row.Size || NaN),
      address: Number(row.Endereco || NaN),
      signal: (row.Sinal === '1') || undefined,
    },
    inputRow: row,
  };
  return varCfg;
}

function readAndWriteDriDiferrentCarrier(varsCfg: DriVarsConfig, rows: ParsedRowType[], body: any) {
  for (const row of rows) {
    if (row['Leitura_Escrita']) row['Leitura_Escrita'] = row['Leitura_Escrita'].trim();
    if (row['Leitura_Escrita'] === 'R') {
      const varCfg = createRVarConfigLeituraEscrita(row, body);
      verificationOfAdressVarCfg(varCfg);
      varsCfg.varsList.push(varCfg);
    }
    else if (row['Leitura_Escrita'] === 'W') {
      const w_varCfg = createWVarConfigLeituraEscrita(row, body);
      verificationOfAdressVarCfg(w_varCfg);
      varsCfg.w_varsList.push(w_varCfg);
    }
    else {
      throw Error('Somente R e W são aceitos').HttpStatus(400);
    }
  }
}


// intervalo deve ser string de 1 a 30 em minuto
function returnIntegrationInterval(secondsInterval: number): string {
  let result = Math.round(secondsInterval / 60);
  if (result > 30) result = 30;
  if (result < 1) result = 1;
  return String(result)
}

async function parseFancoilVavConfig(varsCfg: DriVarsConfig, rows: ParsedRowType[]): Promise<ParsedRowType[]> {
  if ((varsCfg.application?.startsWith('vav-bac') || varsCfg.application?.startsWith('fancoil-bac')) && !varsCfg.application.endsWith('amln'))
    return varsCfg_beca_bac(varsCfg);
  if (varsCfg.application === 'vav-bac-6000-amln' || varsCfg.application === 'fancoil-bac-6000-amln')
    return varsCfg_beca_bac_6000_amln(varsCfg);

  return rows;
}


async function applicationVerificationParamsVarsCfg(varsCfg: DriVarsConfig, file: Buffer, body: any) {
  let rows: ParsedRowType[] = parseFileRows(file);
  if (varsCfg.application === 'cg-et330') rows = await varsCfg_cg_et330(varsCfg);
  if (varsCfg.application === 'abb-nexus-ii') rows = await varsCfg_abb_nexus_ii(varsCfg);
  if (varsCfg.application === 'abb-ete-30' || varsCfg.application === 'abb-ete-50') rows = await varsCfg_ete_30_50(varsCfg);
  if (varsCfg.application === 'cg-em210') rows = await varsCfg_cg_em210(varsCfg);
  if (varsCfg.application === 'kron-mult-k') rows = await varsCfg_kron_mult_k(varsCfg, body);
  if (varsCfg.application === 'kron-mult-k-05') rows = await varsCfg_kron_mult_k_05(varsCfg, body);
  if (varsCfg.application === 'kron-mult-k-120') rows = await varsCfg_kron_mult_k_120(varsCfg, body);
  if (varsCfg.application === 'kron-ikron-03') rows = await varsCfg_kron_ikron_03(varsCfg, body);
  if (varsCfg.application === 'chiller-carrier-30hxe' || varsCfg.application === 'chiller-carrier-30gxe' || varsCfg.application === 'chiller-carrier-30hxf') rows = await varsCfg_chiller_carrier_hx_gx(varsCfg);
  if (varsCfg.application === 'chiller-carrier-30xab' || varsCfg.application === 'chiller-carrier-30xab-hvar') rows = await varsCfg_chiller_carrier_xab_hvar(varsCfg);
  rows = await verifySchneiderApplications(varsCfg, rows);
  rows = await parseFancoilVavConfig(varsCfg, rows);

  return rows;
}

async function verifySchneiderApplications(varsCfg: DriVarsConfig, rows: ParsedRowType[]) {
  if (varsCfg.application === 'schneider-eletric-pm2100') return await varsCfg_schneider_eletric_pm2100(varsCfg);
  if (varsCfg.application === 'schneider-electric-pm210') return await varsCfg_schneider_electric_pm210(varsCfg);
  if (varsCfg.application === 'schneider-electric-pm9c') return await varsCfg_schneider_electric_pm9c(varsCfg);

  return rows;
}

async function varsCfg_cg_et330(varsCfg: DriVarsConfig) {
  const list = await sqldb.CG_ET330_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Gavazzi ET330';
  const mdbLsw = {
    protocol: 'mdb_lsw',
    value: 1,
  }

  varsCfg.driConfigs.push(mdbLsw);

  return rows
}

async function varsCfg_abb_nexus_ii(varsCfg: DriVarsConfig) {
  const list = await sqldb.NEXUS_II_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Nexus II ABB';

  return rows
}

async function varsCfg_ete_30_50(varsCfg: DriVarsConfig) {
  const name = varsCfg.application === 'abb-ete-30' ? 'ETE-30' : 'ETE-50';
  const list = await sqldb.ETE_30_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = `Variáveis ${name} ABB`;

  return rows
}

async function varsCfg_schneider_eletric_pm2100(varsCfg: DriVarsConfig) {
  const list = await sqldb.SCHNEIDER_PM2100_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Schneider eletric PM2100';

  return rows
}


async function varsCfg_schneider_electric_pm210(varsCfg: DriVarsConfig) {
  const list = await sqldb.SCHNEIDER_PM210_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Schneider electric PM210';

  return rows;
}

async function varsCfg_schneider_electric_pm9c(varsCfg: DriVarsConfig) {
  const list = await sqldb.SCHNEIDER_PM9C_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Schneider electric PM9C';

  return rows
}

async function varsCfg_cg_em210(varsCfg: DriVarsConfig) {
  const list = await sqldb.CG_EM210_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Gavazzi EM210';
  const mdbLsw = {
    protocol: 'mdb_lsw',
    value: 1,
  }
  varsCfg.driConfigs.push(mdbLsw);

  return rows
}

async function varsCfg_kron_mult_k(varsCfg: DriVarsConfig, body: any) {
  if (!body.capacityTc) throw Error('É necessário informar a capacidade de corrente.').HttpStatus(400);
  const list = await sqldb.KRON_MULTK_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list, String(Number(body.capacityTc) / 5));
  varsCfg.worksheetName = 'Variáveis KRON MULT-K';
  const capacityTcConfig = {
    name: 'Capacidade TC',
    value: (Number(body.capacityTc) * 2).toString(),
  }
  varsCfg.varsList.push(capacityTcConfig);

  return rows
}

async function varsCfg_kron_mult_k_05(varsCfg: DriVarsConfig, body: any) {
  if (!body.capacityTc) throw Error('É necessário informar a capacidade de corrente.').HttpStatus(400);
  const list = await sqldb.KRON_MULTK_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list, String(Number(body.capacityTc) / 5));
  varsCfg.worksheetName = 'Variáveis KRON MULT-K 05';
  const capacityTcConfig = {
    name: 'Capacidade TC',
    value: (Number(body.capacityTc) * 2).toString(),
  }
  varsCfg.varsList.push(capacityTcConfig);

  return rows
}

async function varsCfg_kron_mult_k_120(varsCfg: DriVarsConfig, body: any) {
  const list = await sqldb.KRON_MULTK_120_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis KRON MULT-K 120';
  if (body.installationType) {
    const installationTypeConfig = {
      name: 'Tipo Instalação',
      value: body.installationType.toString(),
    }
    varsCfg.varsList.push(installationTypeConfig);
  }

  return rows
}

async function varsCfg_kron_ikron_03(varsCfg: DriVarsConfig, body: any) {
  const rows = await parseKroniKron03File();
  varsCfg.worksheetName = 'Variáveis KRON iKRON 03';

  const floatPointSequence = {
    name: 'Sequência Ponto Flutuante',
    address: {
      protocol: `write-${body.protocol}`,
      id: Number(body.slaveId || 1) || 1,
      function: 6,
      address: 2900,
      value: "291",
    },
  }

  varsCfg.varsList.push(floatPointSequence);

  return rows
}

async function varsCfg_beca_bac(varsCfg: DriVarsConfig) {
  const list = await sqldb.VAV_BAC_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Beca BAC';

  return rows
}

async function varsCfg_beca_bac_6000_amln(varsCfg: DriVarsConfig) {
  const list = await sqldb.VAV_BAC_6000_AMLN_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Beca BAC 6000 AMLN';

  return rows

}

async function varsCfg_chiller_carrier_hx_gx(varsCfg: DriVarsConfig) {
  const list = await sqldb.CHILLER_CARRIER_30HXE_GXE_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Chiller Carrier 30HXE/GXE';

  return rows
}

async function varsCfg_chiller_carrier_xab_hvar(varsCfg: DriVarsConfig) {
  const list = await sqldb.CHILLER_CARRIER_30XA_HVAR_COMMANDS.getCommandsList({});
  const rows = parseVarsFile(list);
  varsCfg.worksheetName = 'Variáveis Chiller Carrier 30XA/XW/XS/XV Gateway HVAR';

  return rows;
}

function verifyInstallationTypeAndCapacityTCVarsCfg(body: any, varsCfg: DriVarsConfig) {
  if (['cg-et330', 'cg-em210'].includes(varsCfg.application)) {
    if (body.installationType) {
      const instTypeConfig = {
        name: 'Tipo Instalação',
        address: {
          protocol: `write-${body.protocol}`,
          id: (['cg-em210', 'cg-et330'].includes(body.application) && Number(body.slaveId || 1)) || 1,
          function: 6,
          address: 4098,
          value: body.installationType.toString(),
        }
      };
      varsCfg.varsList.push(instTypeConfig);
    }

    if (body.capacityTc && Number(body.capacityTc)) {
      const capacityTcConfig = {
        name: 'Capacidade TC',
        address: {
          protocol: `write-${body.protocol}`,
          id: (['cg-em210', 'cg-et330'].includes(body.application) && Number(body.slaveId || 1)) || 1,
          function: 6,
          address: 4099,
          value: (Number(body.capacityTc) * 2).toString(),
        },
      }
      varsCfg.varsList.push(capacityTcConfig);
    }
  }
}

async function bodyVerificationAutomationVarsCfg(body: DriBodyVarsCfg, varsCfg: DriVarsConfig): Promise<void> {
  const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: body.driId });
  const versionNumber = parseFirmwareVersion(fwInfo.CURRFW_VERS);

  if (compareVersions(versionNumber, MINIMUM_AUTOMATION_VERSION, false) < 0 || !isApplicationAutomationByVarsCfg(varsCfg)) return;

  const commands = [];
  if (varsCfg.application.startsWith('fancoil')) {
    commands.push(...await getFancoilCommandsAutomation(varsCfg));
  }
  if (varsCfg.application.startsWith('vav')) {
    commands.push(...await getVavCommandsAutomation(varsCfg));
  }

  if (varsCfg.application === 'carrier-ecosplit') {
    commands.push(...await getCarrierEcosplitCommandsAutomation());
  }

  varsCfg.automationList = commands;
}

export async function verifyBodyDriVarsCfg(varsCfg: DriVarsConfig,
  body: DriBodyVarsCfg, file: Buffer, session: SessionData) {

  bodyVerificationParamsVarsCfg(body, varsCfg);

  await bodyVerificationAutomationVarsCfg(body, varsCfg);

  if (varsCfg.protocol === 'carrier-ecosplit') {
    const rows = await parseCarrierCCNFile();
    varsCfg.worksheetName = 'Comandos CCN';
    verifyWriteAndReadCarrier(rows, varsCfg);

  } else {
    let rows: ParsedRowType[] = await applicationVerificationParamsVarsCfg(varsCfg, file, body);

    verifyInstallationTypeAndCapacityTCVarsCfg(body, varsCfg);

    readAndWriteDriDiferrentCarrier(varsCfg, rows, body);
  }
}


export async function updateAndIotInformeChanges(body: any, session: SessionData, varsCfg: DriVarsConfig) {
  const driDeviceInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: body.driId });
  if (driDeviceInfo) {
    await sqldb.DRIS_DEVICES.w_updateInfo({
      ID: driDeviceInfo.DRI_DEVICE_ID,
      VARSCFG: varsCfg ? JSON.stringify(varsCfg) : null
    }, session.user);
  }
  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();

  brokerMQTT.publish_iotRelay_informDeviceChanges(body.driId);

  await sendResetCommand(body.driId, session.user);
}

httpRouter.privateRoutes['/upload-dri-varscfg'] = async function (_reqParams, session, { req, res }) {
  const perms = getUserGlobalPermissions(session);
  const file = await getUploadedFile(req, res, true);
  const body = req.body;

  if (!body.driId) throw Error('Não foi informado o driId').HttpStatus(400);
  const driInf = await sqldb.DRIS.getBasicInfo({ driId: body.driId });
  const permsClient = await getPermissionsOnClient(session, driInf?.CLIENT_ID);

  if (!perms.manageAllClientsUnitsAndDevs && !session.permissions.isInstaller && !permsClient.canEditProgramming) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  let varsCfg: DriVarsConfig;
  if (body.application) {
    if (!driInf) throw Error('DRI não encontrado').HttpStatus(400);
    const { status } = await devsLastComm.loadDeviceConnectionStatus(driInf.DRI_ID);
    if (!servConfig.isTestServer && status !== 'ONLINE') {
      throw Error('O dispositivo não está online').HttpStatus(403);
    }
    const perms = await getPermissionsOnUnit(session, driInf.CLIENT_ID, driInf.UNIT_ID);
    if (!perms.canViewDevs) throw Error('Não permitido').HttpStatus(403);

    varsCfg = {
      application: body.application,
      protocol: body.protocol,
      worksheetName: body.worksheetName,
      driConfigs: [],
      varsList: [],
      w_varsList: [],
      automationList: []
    };

    if (!body.application.includes('chiller-carrier')) {
      const driInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: body.driId });
      await sqldb.DRIS_CHILLERS.w_deleteDriInfo({ DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, session.user);
    }

    if (!['modbus-tcp', 'modbus-rtu', 'carrier-ecosplit'].includes(body.protocol)) throw Error('Somente protocolos modbus-tcp, modbus-rtu e carrier-ecosplit são aceitos').HttpStatus(400);

    await verifyBodyDriVarsCfg(varsCfg, body, file, session);
  }

  await updateAndIotInformeChanges(body, session, varsCfg);

  return { success: true };
}

httpRouter.privateRoutes['/dri/update-dri-vav'] = async function (reqParams, session) {
  if (!reqParams.VAV_ID) throw Error('Não foi informado o id do DRI VAV').HttpStatus(400);

  const perms = getUserGlobalPermissions(session);
  const driInf = await sqldb.DRIS.getBasicInfo({ driId: reqParams.VAV_ID });
  const permsClient = await getPermissionsOnClient(session, driInf?.CLIENT_ID);

  if (!perms.manageAllClientsUnitsAndDevs && !permsClient.canEditProgramming) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (reqParams.remove) {
    await sqldb.VAVS.w_delete({ VAV_ID: reqParams.VAV_ID }, session.user);
  } else {
    if (reqParams.VALVE_MODEL === '') reqParams.VALVE_MODEL = null;
    if (reqParams.BOX_MODEL === '') reqParams.BOX_MODEL = null;

    await sqldb.VAVS.w_insertUpdate({
      VAV_ID: reqParams.VAV_ID,
      THERM_MANUF: reqParams.THERM_MANUF,
      THERM_MODEL: reqParams.THERM_MODEL,
      VALVE_MANUF: reqParams.VALVE_MANUF,
      VALVE_MODEL: reqParams.VALVE_MODEL,
      VALVE_TYPE: reqParams.VALVE_TYPE,
      BOX_MANUF: reqParams.BOX_MANUF,
      BOX_MODEL: reqParams.BOX_MODEL,
      ROOM_NAME: reqParams.ROOM_NAME,
      RTYPE_ID: reqParams.RTYPE_ID,
    }, session.user);
  }

  return 'SUCCESS ON UPDATE DRI VAV';
}

httpRouter.privateRoutes['/dri/get-dri-vav-info'] = async function (reqParams, session) {
  if (!reqParams.VAV_ID) {
    throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  }
  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.VAV_ID });
  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  return await sqldb.VAVS.getDriVav({ VAV_ID: reqParams.VAV_ID });
}


async function updateValveManuf(fancoilStoredOpts: {
  value: string
  label: string
  type: string
}[], user: string, VALVE_MANUF?: string) {
  if (VALVE_MANUF) {
    const hasValveManuf = fancoilStoredOpts.find((e) => e.type === 'VALVE_MANUF' && e.label === VALVE_MANUF);
    if (!hasValveManuf) {
      await sqldb.AV_OPTS.w_insert({ OPT_ID: `valve-manuf-${VALVE_MANUF.toLowerCase().replace(' ', '-')}`, OPT_LABEL: VALVE_MANUF, OPT_TYPE: 'VALVE_MANUF', TAGS: '(fancoil)' }, user);
    }
  }
}

async function updateFancoilManuf(fancoilStoredOpts: {
  value: string
  label: string
  type: string
}[], user: string, FANCOIL_MANUF?: string) {
  if (FANCOIL_MANUF) {
    const hasFancoilManuf = fancoilStoredOpts.find((e) => e.type === 'FANCOIL_MANUF' && e.label === FANCOIL_MANUF);
    if (!hasFancoilManuf) {
      await sqldb.AV_OPTS.w_insert({ OPT_ID: `fancoil-manuf-${FANCOIL_MANUF.toLowerCase().replace(' ', '-')}`, OPT_LABEL: FANCOIL_MANUF, OPT_TYPE: 'FANCOIL_MANUF', TAGS: '(fancoil)' }, user);
    }
  }
}

/**
 * Function to workaround the definition of the mode refrigerator in the Fancoil BAC-6000
 */
async function coolDriFancoilWorkaround(driId: string, driCfg: DriInfo, type: string, value: string, user: string) {
  const lastTelemetries = await devsLastComm.loadLastTelemetries_dri({
    devIds: [driId]
  });
  const { lastTelemetry } = lastTelemetries.lastDriTelemetry(driId, driCfg);

  const noNeedWorkaround = lastTelemetry?.ThermOn === 1 && lastTelemetry?.Mode === '0';

  if (driCfg.application !== "fancoil-bac-6000" ||
    type !== 'mode' || value !== '0' ||
    noNeedWorkaround
  ) {
    return;
  }

  const setpointCool = "15";
  sendDriCommand(driId, driCfg, 'setpoint', setpointCool, user);
  await setTimeout(5000);
}

function parseFancoilInsertUpdateParams(reqParams: ApiParams['/dri/update-dri-fancoil']): Parameters<typeof sqldb.FANCOILS.w_insertUpdate>[0] {
  const hasRoomType = reqParams.RTYPE_ID && reqParams.RTYPE_ID !== -1;
  const noRoomTypeValue = reqParams.RTYPE_ID && reqParams.RTYPE_ID === -1 ? false : null;

  return {
    FANCOIL_ID: reqParams.FANCOIL_ID,
    THERM_MANUF: reqParams.THERM_MANUF,
    THERM_MODEL: reqParams.THERM_MODEL,
    THERM_T_MAX: reqParams.RTYPE_ID && reqParams.RTYPE_ID === -1 ? reqParams.THERM_T_MAX : null,
    THERM_T_MIN: reqParams.RTYPE_ID && reqParams.RTYPE_ID === -1 ? reqParams.THERM_T_MIN : null,
    VALVE_MANUF: reqParams.VALVE_MANUF,
    VALVE_MODEL: reqParams.VALVE_MODEL,
    VALVE_TYPE: reqParams.VALVE_TYPE,
    FANCOIL_MANUF: reqParams.FANCOIL_MANUF,
    FANCOIL_MODEL: reqParams.FANCOIL_MODEL,
    ROOM_NAME: reqParams.ROOM_NAME,
    RTYPE_ID: hasRoomType ? reqParams.RTYPE_ID : null,
    HAS_ROOMTYPE: hasRoomType ? true : noRoomTypeValue,
    DUT_ID_FROM_ROOM: hasRoomType ? reqParams.DUT_ID_FROM_ROOM : null,
  }
}

httpRouter.privateRoutes['/dri/update-dri-fancoil'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs && !session.permissions.isInstaller) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.FANCOIL_ID) throw Error('Não foi informado o id do DRI VAV').HttpStatus(400);
  if (reqParams.remove) {
    await sqldb.FANCOILS.w_delete({ FANCOIL_ID: reqParams.FANCOIL_ID }, session.user);
    return 'SUCCESS ON UPDATE DRI FANCOIL';
  }

  if (reqParams.VALVE_MODEL === '') reqParams.VALVE_MODEL = null;
  if (reqParams.FANCOIL_MODEL === '') reqParams.FANCOIL_MODEL = null;

  const fancoilStoredOpts = await sqldb.AV_OPTS.getOptsOfTag({ TAGS: '(fancoil)' });

  await updateValveManuf(fancoilStoredOpts, session.user, reqParams.VALVE_MANUF);
  await updateFancoilManuf(fancoilStoredOpts, session.user, reqParams.FANCOIL_MANUF);

  await sqldb.FANCOILS.w_insertUpdate(parseFancoilInsertUpdateParams(reqParams), session.user);

  return 'SUCCESS ON UPDATE DRI FANCOIL';
}

httpRouter.privateRoutes['/dri/get-dri-fancoil-info'] = async function (reqParams, session) {
  if (!reqParams.FANCOIL_ID) {
    throw new Error('Parâmetro FANCOIL_ID não informado').HttpStatus(400);
  }
  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.FANCOIL_ID });
  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const result = await sqldb.FANCOILS.getDriFancoil({ FANCOIL_ID: reqParams.FANCOIL_ID });

  if (result && result.HAS_ROOMTYPE === 0) {
    result.RTYPE_ID = -1;
  }
  return result;
}

httpRouter.privateRoutes['/dri/send-dri-command'] = async function (reqParams, session) {
  if (!reqParams.DRI_ID) throw new Error('Parâmetro DRI_ID não informado').HttpStatus(400);
  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  if (reqParams.TYPE == null) throw new Error('Parâmetro TYPE não informado').HttpStatus(400);
  if (reqParams.VALUE == null) throw new Error('Parâmetro VALUE não informado').HttpStatus(400);

  const driInfo = await loadDriCfg(driBasicInfo.DRI_ID, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);

  if (driInfo.protocol === 'carrier-ecosplit' || driInfo.application.startsWith('vav') || driInfo.application.startsWith('fancoil')) {
    sendDriCommand(reqParams.DRI_ID, driInfo, reqParams.TYPE, reqParams.VALUE, session.user);

    await coolDriFancoilWorkaround(reqParams.DRI_ID, driInfo, reqParams.TYPE, reqParams.VALUE, session.user);

    return 'COMMAND SENT';
  } else {
    throw new Error('O suporte para envio de comandos é só para protocolo "carrier-ecosplit", aplicação "vav" ou aplicação "fancoil"').HttpStatus(400);
  }
}

httpRouter.privateRoutes['/dri/delete-dri-info'] = async function (reqParams, session) {
  const devInf = reqParams.driId && await sqldb.DEVICES.getBasicInfo({ devId: reqParams.driId });
  if (!devInf) throw Error(`Dispositivo não encontrado: ${reqParams.driId}`).HttpStatus(400);
  const perms = await getPermissionsOnClient(session, devInf.CLIENT_ID);
  if (!perms.canDeleteDevs) throw Error('Permission denied!').HttpStatus(403);

  const { affectedRows } = await devInfo.deleteDev({ DEV_ID: reqParams.driId }, session.user);

  return 'DELETED ' + affectedRows;
}

httpRouter.privateRoutes['/dri/update-time-send-config'] = async function (reqParams, session) {
  if (!reqParams.DRI_ID) throw Error('Invalid properties. Missing driId.').HttpStatus(400);

  reqParams.VALUE = Math.round(Number(reqParams.VALUE) || 0) || 0;

  if (reqParams.VALUE >= 1) {
    // OK
  }
  else throw Error('Valor inválido!').HttpStatus(400)

  const driBasicInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }


  const command = {
    "protocol": "interval",
    "value": reqParams.VALUE
  };
  const commandData = JSON.stringify(command);

  devsCommands.sendDriVarConfig(reqParams.DRI_ID, commandData, session.user);

  return 'UPDATED';
}

interface VarsTableParam {
  COMMAND: string;
  SYS_ID: number;
  ADDRESS: number;
  DESCRIPTION: string;
  IP: string;
  ID: number;
  SIZE: number;
  FUNC_ID: number;
  R_W: string;
  UNIT: string;
  FORMULA: string;
  ALIAS: string;
  HAS_SIGNAL?: string;
}

export async function parseCarrierCCNFile() {
  const list = await sqldb.CARRIER_ECOSPLIT_COMMANDS.getCommandsList({});

  const tableRows: ParsedRowType[] = list.map((row) => ({
    Comando: row.COMMAND,
    Leitura_Escrita: row.R_W,
    Descricao: row.DESCRIPTION,
    Array: row.ARRAY,
  }));

  return tableRows;
}

function parseVarsFile(list: VarsTableParam[], capacityTC?: string) {
  return list.map((row) => ({
    Comando: row.COMMAND,
    Sistema: row.SYS_ID.toString(),
    Endereco: row.ADDRESS.toString(),
    Descricao: row.DESCRIPTION,
    IP: row.IP,
    ID: row.ID.toString(),
    Sinal: row.HAS_SIGNAL,
    Size: row.SIZE.toString(),
    Funcao: row.FUNC_ID.toString(),
    Leitura_Escrita: row.R_W,
    Unidade: row.UNIT,
    Formula: (capacityTC && row.FORMULA.indexOf('TC') >= 0) ? row.FORMULA.split('TC').join(capacityTC) : row.FORMULA,
    Alias: row.ALIAS,
  }));
}

async function parseKronMultKFile(capacityTC: string) {
  const list = await sqldb.KRON_MULTK_COMMANDS.getCommandsList({});

  const tableRows: ParsedRowType[] = list.map((row) => ({
    Comando: row.COMMAND,
    Sistema: row.SYS_ID.toString(),
    Endereco: row.ADDRESS.toString(),
    Descricao: row.DESCRIPTION,
    IP: row.IP,
    ID: row.ID.toString(),
    Size: row.SIZE.toString(),
    Funcao: row.FUNC_ID.toString(),
    Leitura_Escrita: row.R_W,
    Unidade: row.UNIT,
    Formula: row.FORMULA.indexOf('TC') >= 0 ? row.FORMULA.split('TC').join(capacityTC) : row.FORMULA,
    Alias: row.ALIAS,
  }));

  return tableRows;
}


export async function parseKroniKron03File() {
  const list = await sqldb.KRON_IKRON_03_COMMANDS.getCommandsList({});

  const tableRows: ParsedRowType[] = list.map((row) => ({
    Comando: row.COMMAND,
    Sistema: row.SYS_ID.toString(),
    Endereco: row.ADDRESS.toString(),
    Descricao: row.DESCRIPTION,
    IP: row.IP,
    ID: row.ID.toString(),
    Size: row.SIZE.toString(),
    Funcao: row.FUNC_ID.toString(),
    Leitura_Escrita: row.R_W,
    Unidade: row.UNIT,
    Formula: row.FORMULA,
    Alias: row.ALIAS,
  }));

  return tableRows;
}

async function parseVAV_FancoilBACFile() {
  const list = await sqldb.VAV_BAC_COMMANDS.getCommandsList({});

  const tableRows: ParsedRowType[] = list.map((row) => ({
    Comando: row.COMMAND,
    Sistema: row.SYS_ID.toString(),
    Endereco: row.ADDRESS.toString(),
    Descricao: row.DESCRIPTION,
    IP: row.IP,
    ID: row.ID.toString(),
    Size: row.SIZE.toString(),
    Funcao: row.FUNC_ID.toString(),
    Leitura_Escrita: row.R_W,
    Unidade: row.UNIT,
    Formula: row.FORMULA,
    Alias: row.ALIAS,
  }));

  return tableRows;
}

function parseFileRows(file: Buffer) {
  if (!file) return [];
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines.map(row => row.map(col => (col || '').toString()));

  const tableRows: ParsedRowType[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_Nome = headers.indexOf('Nome');
  const col_Pacote = headers.indexOf('Pacote');
  const col_IP = headers.indexOf('IP');
  const col_ID = headers.indexOf('ID');
  const col_Funcao = headers.indexOf('Função');
  const col_Size = headers.indexOf('Size');
  const col_Endereco = headers.indexOf('Endereço');
  const col_Descricao = headers.indexOf('Descrição');
  const col_Leitura_Escrita = headers.indexOf('Leitura/Escrita');
  const col_Tipo_de_variavel = headers.indexOf('Tipo de variável');
  const col_Unidade_de_medida = headers.indexOf('Unidade de medida');
  if (col_Nome < 0) throw Error(`Coluna não encontrada: Nome`).HttpStatus(400);
  if (col_Pacote < 0) throw Error(`Coluna não encontrada: Pacote`).HttpStatus(400);
  if (col_IP < 0) throw Error(`Coluna não encontrada: IP`).HttpStatus(400);
  if (col_ID < 0) throw Error(`Coluna não encontrada: ID`).HttpStatus(400);
  if (col_Funcao < 0) throw Error(`Coluna não encontrada: Função`).HttpStatus(400);
  if (col_Size < 0) throw Error(`Coluna não encontrada: Size`).HttpStatus(400);
  if (col_Endereco < 0) throw Error(`Coluna não encontrada: Endereço`).HttpStatus(400);
  if (col_Descricao < 0) throw Error(`Coluna não encontrada: Descrição`).HttpStatus(400);
  if (col_Leitura_Escrita < 0) throw Error(`Coluna não encontrada: Leitura/Escrita`).HttpStatus(400);
  if (col_Tipo_de_variavel < 0) throw Error(`Coluna não encontrada: Tipo de variável`).HttpStatus(400);
  if (col_Unidade_de_medida < 0) throw Error(`Coluna não encontrada: Unidade de medida`).HttpStatus(400);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    tableRows.push({
      Nome: cols[col_Nome],
      Pacote: cols[col_Pacote],
      IP: cols[col_IP],
      ID: cols[col_ID],
      Funcao: cols[col_Funcao],
      Size: cols[col_Size],
      Endereco: cols[col_Endereco],
      Descricao: cols[col_Descricao],
      Leitura_Escrita: cols[col_Leitura_Escrita],
      Tipo_de_variavel: cols[col_Tipo_de_variavel],
      Unidade_de_medida: cols[col_Unidade_de_medida],
    });
  }

  return tableRows;
}

export async function sendResetCommand(driId: string, userId: string) {
  const commandData = JSON.stringify({ protocol: 'restart' });
  devsCommands.sendDriVarConfig(driId, commandData, userId);
}

export async function deleteDriInfo(qPars: { DRI_ID: string }, userId: string) {
  const electricCircuitId = await sqldb.ELECTRIC_CIRCUITS.getInfoDeviceCode({ DEVICE_CODE: qPars.DRI_ID })

  await sqldb.DRIS_DEVICES_IMAGES.w_deleteFromDri({ DEV_ID: qPars.DRI_ID }, userId);
  await sqldb.VAVS.w_delete({ VAV_ID: qPars.DRI_ID }, userId);
  await sqldb.FANCOILS.w_delete({ FANCOIL_ID: qPars.DRI_ID }, userId);
  const driInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: qPars.DRI_ID });
  await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteDriInfo({ DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, userId);
  await sqldb.DRIS_CHILLERS.w_deleteDriInfo({ DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, userId);

  await sqldb.DRIS_ENERGY_DEVICES.w_delete({ DEVICE_CODE: qPars.DRI_ID }, userId);
  await sqldb.ENERGY_DEVICES_INFO.w_deleteByElectricCircuitId({ ELECTRIC_CIRCUIT_ID: electricCircuitId.ID }, userId);
  await deleteElectricCircuits(electricCircuitId.ID, userId);
  await sqldb.DRIS_AUTOMATIONS.w_deleteFromDeviceCode({ DEVICE_CODE: qPars.DRI_ID }, userId);
  await sqldb.DRIS_DEVICES.w_deleteFromDeviceCode({ DEVICE_CODE: qPars.DRI_ID }, userId);
  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();
}

export async function deleteClientDris(qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DRIS_DEVICES_IMAGES.w_deleteFromClientDris(qPars, userId);
  await sqldb.VAVS.w_deleteFromClientDris(qPars, userId);
  await sqldb.FANCOILS.w_deleteFromClientDris(qPars, userId);
  await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteFromClientDris({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DRIS_CHILLERS.w_deleteFromClientDris({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.ELECTRIC_CIRCUITS_TREE.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DRIS_ENERGY_DEVICES.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.ENERGY_DEVICES_INFO.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.ELECTRIC_CIRCUITS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DRIS_AUTOMATIONS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DRIS_DEVICES.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await driAutomationeventHooks.ramCaches_DRIS_loadDrisCfg();
}

/**
 * @swagger
 * /dri/get-chiller-alarms-list:
 *   post:
 *     summary: Alarmes do chiller
 *     description: Retorna uma lista de alarmes do chiller
 *     tags:
 *       - DriInfo
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Lista de alarmes do chillers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ID:
 *                         type: integer
 *                         description: ID do alarme
 *                       ALARM_CODE:
 *                         type: string
 *                         description: Código do alarme
 *                 
 *       500:
 *         description: Erro interno do servidor
 */
export const getChillerAlarmsList = async (reqParams: {}, _session: SessionData) => {
  const alarmsList = await sqldb.CHILLER_CARRIER_ALARMS.getAlarmsList();

  return { list: alarmsList };
}

httpRouter.privateRoutes['/dri/get-chiller-alarms-list'] = getChillerAlarmsList;

/**
 * @swagger
 * /dri/get-chiller-alarms-list-hist:
 *   post:
 *     summary: Histórico de alarmes de um chiller
 *     description: Buscar históricos de alarmes 
 *     tags:
 *       - DriInfo
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados para pesquisa
 *         schema:
 *           type: object
 *           properties:
 *             DEVICE_CODE:
 *               type: string
 *               description: Código do Dispositivo
 *               default: ""
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar alarmes
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar alarmes
 *               default: ""
 *               required: false
 *             ORDER_BY:
 *               type: object
 *               description: Ordenar resultados por uma coluna específica
 *               required: false
 *               properties:
 *                 column:
 *                   type: string
 *                   required: true
 *                 desc:
 *                   type: boolean
 *                   required: true
 *             SKIP:
 *               type: number
 *               description: Ignorar os primeiros n registros
 *               required: false
 *             LIMIT:
 *               type: number
 *               description: Limitar o número de resultados retornados
 *               required: false
 *             filterBy:
 *               type: array
 *               description: Filtro por coluna e valores por coluna
 *               required: false
 *               items:
 *                 type: object
 *                 properties:
 *                   column:
 *                     type: string
 *                     required: true
 *                   values:
 *                     type: array
 *                     required: true
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Lista de alarmes do chillers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: number
 *                   description: Quantidade de alarmes na tabela inteira
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ID:
 *                         type: integer
 *                         description: ID do alarme
 *                       ALARM_CODE:
 *                         type: string
 *                         description: Código do alarme
 *                       START_DATE:
 *                         type: string
 *                         description: Data inicial do alarme
 *                       END_DATE:
 *                         type: string
 *                         description: Data final do alarme
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const getChillerAlarmsHist = async (reqParams: httpRouter.ApiParams['/dri/get-chiller-alarms-list-hist'], session: SessionData) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE').HttpStatus(400);

  const driBasicInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: reqParams.DEVICE_CODE });
  if (!driBasicInfo) throw Error('Device not found').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let timezoneOffset = -3;
  const timezoneInfo = await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: driBasicInfo.UNIT_ID });
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const actualAlarms = [reqParams.START_DATE, reqParams.END_DATE].some((x) => x == null);
  let totalItems = null;

  const {
    FILTER_ALARM_CODE,
    FILTER_DESCRIPTION,
    FILTER_REASON_ALARM,
    FILTER_ACTION_TAKEN,
    FILTER_RESET_TYPE,
    FILTER_CAUSE,
  } = getFilterColumnsFormatted(reqParams.filterBy);

  if (!actualAlarms) {
    const allAlarms = await sqldb.DRIS_CHILLER_ALARMS_HIST.countAlarmsToPage({
      DEVICE_CODE: reqParams.DEVICE_CODE,
      START_DATE: reqParams.START_DATE,
      END_DATE: reqParams.END_DATE,
      HAS_FILTER: !!reqParams.filterBy,
      FILTER_ALARM_CODE,
      FILTER_DESCRIPTION,
      FILTER_REASON_ALARM,
      FILTER_ACTION_TAKEN,
      FILTER_RESET_TYPE,
      FILTER_CAUSE,
      HOUR_INTERVAL: timezoneOffset,
    });

    totalItems = allAlarms.TOTAL_ALARMS;
  }

  const alarmsHist = await sqldb.DRIS_CHILLER_ALARMS_HIST.getAlarmsHist({
    DEVICE_CODE: reqParams.DEVICE_CODE,
    START_DATE: reqParams.START_DATE,
    END_DATE: reqParams.END_DATE,
    ACTUAL_ALARMS: actualAlarms,
    SKIP: reqParams.SKIP,
    LIMIT: reqParams.LIMIT,
    ORDER_BY_COLUMN: reqParams.ORDER_BY?.column,
    ORDER_BY_DESC: reqParams.ORDER_BY && reqParams.ORDER_BY.desc,
    HAS_FILTER: !!reqParams.filterBy,
    FILTER_ALARM_CODE,
    FILTER_DESCRIPTION,
    FILTER_REASON_ALARM,
    FILTER_ACTION_TAKEN,
    FILTER_RESET_TYPE,
    FILTER_CAUSE,
    HOUR_INTERVAL: timezoneOffset,
  });

  return { list: alarmsHist, totalItems: totalItems ?? alarmsHist.length }
}

httpRouter.privateRoutes['/dri/get-chiller-alarms-list-hist'] = getChillerAlarmsHist;


export const getFilterColumnsFormatted = (filterParams?: { column: string, values: string[] }[]) => {
  let filterColumns = {
    FILTER_ALARM_CODE: [] as string[],
    FILTER_DESCRIPTION: [] as string[],
    FILTER_REASON_ALARM: [] as string[],
    FILTER_ACTION_TAKEN: [] as string[],
    FILTER_RESET_TYPE: [] as string[],
    FILTER_CAUSE: [] as string[],
  };

  if (filterParams) {
    filterParams.forEach(({ column, values }) => {
      switch (column) {
        case 'ALARM_CODE':
          filterColumns.FILTER_ALARM_CODE = values;
          break;
        case 'DESCRIPTION':
          filterColumns.FILTER_DESCRIPTION = values.map((alarm) => t(`alarm_${alarm}_description`, 'pt'));
          break;
        case 'REASON_ALARM':
          filterColumns.FILTER_REASON_ALARM = values.map((alarm) => t(`alarm_${alarm}_reason_alarm`, 'pt'));
          break;
        case 'ACTION_TAKEN':
          filterColumns.FILTER_ACTION_TAKEN = values.map((alarm) => t(`alarm_${alarm}_action_taken`, 'pt'));
          break;
        case 'RESET_TYPE':
          filterColumns.FILTER_RESET_TYPE = values.map((alarm) => t(`alarm_${alarm}_reset_type`, 'pt'));
          break;
        case 'CAUSE':
          filterColumns.FILTER_CAUSE = values.map((alarm) => t(`alarm_${alarm}_cause`, 'pt'));
          break;
        default:
          break;
      }
    });
  }

  return filterColumns;
}

/**
 * @swagger
 * /dri/export-chiller-alarms-hist:
 *   post:
 *     summary: Exportar histórico de alarmes do chiller
 *     description: Exporta o histórico de alarmes do chiller para um arquivo Excel (.xlsx).
 *     tags:
 *       - DriInfo
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados para pesquisa
 *         schema:
 *           type: object
 *           properties:
 *             DEVICE_CODE:
 *               type: string
 *               description: Código do Dispositivo
 *               default: ""
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar alarmes
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar alarmes
 *               default: ""
 *               required: false
 *             ORDER_BY:
 *               type: object
 *               description: Ordenar resultados por uma coluna específica
 *               required: false
 *               properties:
 *                 column:
 *                   type: string
 *                   required: true
 *                 desc:
 *                   type: boolean
 *                   required: true
 *             filterBy:
 *               type: array
 *               description: Filtro por coluna e valores por coluna
 *               required: false
 *               items:
 *                 type: object
 *                 properties:
 *                   column:
 *                     type: string
 *                     required: true
 *                   values:
 *                     type: array
 *                     required: true
 *                     items:
 *                       type: string
 *             columnsToExport:
 *               type: array
 *               description: Colunas para exportar
 *               required: true
 *               items:
 *                 type: string
 *     responses:
 *       200:
 *         description: Arquivo Excel contendo o histórico de alarmes do chiller.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const exportChillerAlarmsHist = async (reqParams: httpRouter.ApiParams['/dri/export-chiller-alarms-hist'], session: SessionData, { res }: ExtraRouteParams) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing DATES params').HttpStatus(400);
  if (!reqParams.columnsToExport?.length) throw Error('Invalid properties. Missing Export Columns');
  const driBasicInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: reqParams.DEVICE_CODE });
  if (!driBasicInfo) throw Error('Device not found').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user });
  const language = getLanguage(prefsUser[0]);

  const data: any[][] = [reqParams.columnsToExport.map(column => t(column.toLowerCase(), language))];

  const {
    FILTER_ALARM_CODE,
    FILTER_DESCRIPTION,
    FILTER_REASON_ALARM,
    FILTER_ACTION_TAKEN,
    FILTER_RESET_TYPE,
    FILTER_CAUSE,
  } = getFilterColumnsFormatted(reqParams.filterBy);


  const timezoneInfo = await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: driBasicInfo.UNIT_ID }) || { TIMEZONE_ID: null, TIMEZONE_AREA: null, TIMEZONE_OFFSET: null };
  let timezoneOffset = -3;
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const alarmsHist = await sqldb.DRIS_CHILLER_ALARMS_HIST.getAlarmsHist({
    DEVICE_CODE: reqParams.DEVICE_CODE,
    START_DATE: reqParams.START_DATE,
    END_DATE: reqParams.END_DATE,
    ORDER_BY_COLUMN: reqParams.ORDER_BY?.column,
    ORDER_BY_DESC: reqParams.ORDER_BY?.desc,
    HAS_FILTER: !!reqParams.filterBy,
    FILTER_ALARM_CODE,
    FILTER_DESCRIPTION,
    FILTER_REASON_ALARM,
    FILTER_ACTION_TAKEN,
    FILTER_RESET_TYPE,
    FILTER_CAUSE,
    HOUR_INTERVAL: timezoneOffset,
  });

  for (const row of alarmsHist) {
    const rowData = reqParams.columnsToExport.map(column => {
      switch (column) {
        case 'DESCRIPTION':
          return verifyTranslationExists(`alarm_${row.ALARM_CODE}_description`, language);
        case 'CAUSE':
          return verifyTranslationExists(`alarm_${row.ALARM_CODE}_cause`, language);
        case 'START_DATE':
          return new Date(calculateDateByTimezone({ DATE: row.START_DATE, TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET })).toLocaleString(language);
        case 'END_DATE':
          return row.END_DATE ? new Date(calculateDateByTimezone({ DATE: row.END_DATE, TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET })).toLocaleString(language) : '-';
        case 'REASON_ALARM':
          return verifyTranslationExists(`alarm_${row.ALARM_CODE}_reason_alarm`, language);
        case 'ACTION_TAKEN':
          return verifyTranslationExists(`alarm_${row.ALARM_CODE}_action_taken`, language);
        case 'RESET_TYPE':
          return verifyTranslationExists(`alarm_${row.ALARM_CODE}_reset_type`, language);
        case 'ALARM_CODE':
        default:
          return row.ALARM_CODE;
      }
    });
    data.push(rowData);
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `${t('nomeArquivoHistoricoAlarmesChiller', language)}.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/dri/export-chiller-alarms-hist'] = exportChillerAlarmsHist;

/**
 * @swagger
 * /dri/get-all-chiller-alarms-codes:
 *   post:
 *     summary: Todos códigos de alarmes de um chiller no histórico
 *     description: Buscar todos os códigos de alarmes de um chiller no histórico através das datas e do DRI passado.
 *     tags:
 *       - DriInfo
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados para pesquisa
 *         schema:
 *           type: object
 *           properties:
 *             DEVICE_CODE:
 *               type: string
 *               description: Código do Dispositivo
 *               default: ""
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar alarmes
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar alarmes
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de alarmes do chillers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ALARM_CODE:
 *                         type: string
 *                         description: Código do alarme
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const getAllChillerAlarmsCodesByDRI = async (reqParams: httpRouter.ApiParams['/dri/get-all-chiller-alarms-codes'], session: SessionData) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing DATES params').HttpStatus(400);

  const driBasicInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: reqParams.DEVICE_CODE });
  if (!driBasicInfo) throw Error('Device not found').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let timezoneOffset = -3;
  const timezoneInfo = await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: driBasicInfo.UNIT_ID });
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const alarmsCodes = await sqldb.DRIS_CHILLER_ALARMS_HIST.getAllChillerAlarmsCodes({ DEVICE_CODE: reqParams.DEVICE_CODE, START_DATE: reqParams.START_DATE, END_DATE: reqParams.END_DATE, HOUR_INTERVAL: timezoneOffset });

  return { list: alarmsCodes };
}

httpRouter.privateRoutes['/dri/get-all-chiller-alarms-codes'] = getAllChillerAlarmsCodesByDRI;

/**
 * @swagger
 * /dri/get-chiller-parameters-hist:
 *   post:
 *     summary: Histórico de parâmetros do chiller
 *     description: Buscar históricos de parâmetros 
 *     tags:
 *       - DriInfo
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do dispostivo e datas
 *         schema:
 *           type: object
 *           properties:
 *             DEVICE_CODE:
 *               type: string
 *               description: Código do Dispositivo
 *               default: ""
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar parâmetros
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar parâmetros
 *               default: ""
 *               required: false
 *             HOUR_GRAPHIC:
 *               type: boolean
 *               description: Gráfico será agrupado por hora ou não 
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de alarmes do chillers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paramsLists:
 *                   type: object
 *                   properties:
 *                     paramsChanged:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           device_code:
 *                             type: string
 *                             description: Código do Dispositivo
 *                           parameter_name:
 *                             type: string
 *                             description: Nome do parâmetro
 *                           parameter_value:
 *                             type: number
 *                             description: Valor do parâmetro
 *                           record_date:
 *                             type: string
 *                             description: Data do registro
 *                     paramsGrouped:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           device_code:
 *                             type: string
 *                             description: Código do Dispositivo
 *                           record_date:
 *                             type: string
 *                             description: Data do registro
*                           cap_t:
 *                             type: number
 *                             description: Capacidade total do chiller
 *                           dem_lim:
 *                             type: number
 *                             description: Limite de demanda ativado
 *                           lag_lim:
 *                             type: number
 *                             description: Limite de demanda LAG ativado
 *                           sp:
 *                             type: number
 *                             description: Setpoint atual
 *                           ctrl_pnt:
 *                             type: number
 *                             description: Setpoint do chiller
 *                           capa_t:
 *                             type: number
 *                             description: Capacidade total do circuito A
 *                           dp_a:
 *                             type: number
 *                             description: Pressão de descarga do circuito A
 *                           sp_a:
 *                             type: number
 *                             description: Pressão de sucção do circuito A
 *                           sct_a:
 *                             type: number
 *                             description: Temperatura saturada de cond. do circ. A
 *                           sst_a:
 *                             type: number
 *                             description: Temperatura saturada sucção do circ. A
 *                           capb_t:
 *                             type: number
 *                             description: Capacidade total do circuito B
 *                           dp_b:
 *                             type: number
 *                             description: Pressão de descarga do circuito B
 *                           sp_b:
 *                             type: number
 *                             description: Pressão de sucção do circuito B
 *                           sct_b:
 *                             type: number
 *                             description: Temperatura saturada de cond. do circ. B
 *                           sst_b:
 *                             type: number
 *                             description: Temperatura saturada sucção do circ. B
 *                           cond_lwt:
 *                             type: number
 *                             description: Temperatura de saída de água do condensador
 *                           cond_ewt:
 *                             type: number
 *                             description: Temperatura de entrada de água do condensador
 *                           cool_lwt:
 *                             type: number
 *                             description: Temperatura de saída de água do evaporador
 *                           cool_ewt:
 *                             type: number
 *                             description: Temperatura de entrada de água do evaporador
 *                           cpa1_op:
 *                             type: number
 *                             description: Pressão de óleo do compressor A1
 *                           cpa2_op:
 *                             type: number
 *                             description: Pressão de óleo do compressor A2
 *                           dop_a1:
 *                             type: number
 *                             description: Pressão diferencial de óleo do comp. A1
 *                           dop_a2:
 *                             type: number
 *                             description: Pressão diferencial de óleo do comp. A2
 *                           cpa1_dgt:
 *                             type: number
 *                             description: Temperatura de descarga do comp. A1
 *                           cpa2_dgt:
 *                             type: number
 *                             description: Temperatura de descarga do comp. A2
 *                           exv_a:
 *                             type: number
 *                             description: Posição da válvula de expansão do circ. A
 *                           hr_cp_a1:
 *                             type: number
 *                             description: Horímetro do compressor A1
 *                           hr_cp_a2:
 *                             type: number
 *                             description: Horímetro do compressor A2
 *                           cpa1_tmp:
 *                             type: number
 *                             description: Temperatura do compressor A1
 *                           cpa2_tmp:
 *                             type: number
 *                             description: Temperatura do compressor A2
 *                           cpa1_cur:
 *                             type: number
 *                             description: Corrente atual do compressor A1
 *                           cpa2_cur:
 *                             type: number
 *                             description: Corrente atual do compressor A2
 *                           cpb1_op:
 *                             type: number
 *                             description: Pressão de oléo do compressor B1
*                           cpb2_op:
 *                             type: number
 *                             description: Pressão de oléo do compressor B2
 *                           dop_b1:
 *                             type: number
 *                             description: Pressão diferencial de óleo do comp. B1
 *                           dop_b2:
 *                             type: number
 *                             description: Pressão diferencial de óleo do comp. B2
 *                           cpb1_dgt:
 *                             type: number
 *                             description: Temperatura de descarga do comp. B1
 *                           cpb2_dgt:
 *                             type: number
 *                             description: Temperatura de descarga do comp. B2
 *                           exv_b:
 *                             type: number
 *                             description: Posição da válvula de expansão do circ. B
 *                           hr_cp_b1:
 *                             type: number
 *                             description: Horímetro do compressor B1
 *                           hr_cp_b2:
 *                             type: number
 *                             description: Horímetro do compressor B2
 *                           cpb1_tmp:
 *                             type: number
 *                             description: Temperatura do compressor B1
 *                           cpb2_tmp:
 *                             type: number
 *                             description: Temperatura do compressor B2
 *                           cpb1_cur:
 *                             type: number
 *                             description: Corrente atual do compressor B1
 *                           cpb2_cur:
 *                             type: number
 *                             description: Corrente atual do compressor B2
 *                           cond_sp:
 *                             type: number
 *                             description: Setpoint atual de condensação
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */

export const getChillerParametersHist = async (reqParams: httpRouter.ApiParams['/dri/get-chiller-parameters-hist'], session: SessionData) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);

  const driBasicInfo = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: reqParams.DEVICE_CODE });
  if (!driBasicInfo) throw Error('Device not found').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, driBasicInfo.CLIENT_ID, driBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const endDateVerified = checkEndDateNoLaterThanYesterday(reqParams.END_DATE);

  const chiller_route = chillerRoutes[reqParams.MODEL];
  console.log("chiller_route", chiller_route)
  const response = await axios.post(`${apiAsyncConfigFile.computedDataServerUrl}${chiller_route}`, {
    start_date: reqParams.START_DATE,
    end_date: endDateVerified,
    device_code: reqParams.DEVICE_CODE,
    hour_graphic: !!reqParams.HOUR_GRAPHIC,
  });

  const paramsLists: httpRouter.ApiResps['/dri/get-chiller-parameters-hist']['paramsLists']
    = {
    paramsGrouped: response.data.parameters_grouped_hist,
    paramsChanged: response.data.parameters_changes_hist,
  };


  if (reqParams.END_DATE !== endDateVerified) {
    const driCfg = await loadDriCfgAux(reqParams.DEVICE_CODE);
    const formulas = driCfg?.formulas;
    const dri_type = applicationType[driCfg?.application];
    const dri_interval = Number(driCfg?.driConfigs?.find((cfg) => cfg.protocol === 'interval')?.value) || undefined;
    const driDayProcessed = await processDriDay({ motivo: `/dri/get-chiller-parameters-hist ${session.user}`, driId: reqParams.DEVICE_CODE, driType: dri_type, driInterval: dri_interval, day: reqParams.END_DATE, formulas, chiller_carrier_hour_graphic: !!reqParams.HOUR_GRAPHIC });
    paramsLists.paramsChanged = driDayProcessed.params_changed?.length ? paramsLists.paramsChanged.concat(driDayProcessed.params_changed) : paramsLists.paramsChanged;
    paramsLists.paramsGrouped = driDayProcessed.params_grouped?.length ? paramsLists.paramsGrouped.concat(driDayProcessed.params_grouped) : paramsLists.paramsGrouped;
  }

  return { paramsLists }
}

httpRouter.privateRoutes['/dri/get-chiller-parameters-hist'] = getChillerParametersHist;

/**
 * @swagger
 * /dri/get-chiller-models-list:
 *   post:
 *     summary: Modelos do chiller
 *     description: Retorna uma lista de modelos do chiller
 *     tags:
 *       - DriInfo
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Lista de modelos do Chiller
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do modelo
 *                       modelName:
 *                         type: string
 *                         description: Nome do Modelo de Chiller
 *                       lineName:
 *                         type: string
 *                         description: Nome da linha de Chiller
 *                       nominalCapacity:
 *                         type: integer
 *                         description: Capacidade Nominal
 *                       nominalVoltage:
 *                         type: integer
 *                         description: Tensão Nominal
 *                       nominalFrequency:
 *                         type: integer
 *                         description: Frequência Nominal
 *                 
 *       500:
 *         description: Erro interno do servidor
 */

export const getChillerModelsList = async (_reqParams: httpRouter.ApiParams['/dri/get-chiller-models-list'], session: SessionData) => {
  const modelList = await sqldb.CHILLER_CARRIER_MODELS.getModelsList({});

  const models = modelList.map((model) => {
    return {
      id: model.ID,
      modelName: model.MODEL_NAME,
      lineName: model.LINE_NAME,
      nominalCapacity: model.NOMINAL_CAPACITY,
      nominalVoltage: model.NOMINAL_VOLTAGE,
      nominalFrequency: model.NOMINAL_FREQUENCY
    }
  })

  return { list: models }
}

httpRouter.privateRoutes['/dri/get-chiller-models-list'] = getChillerModelsList;

httpRouter.privateRoutes['/dri/get-chiller-combo-opts'] = async function (_reqParams, session) {
  const chillerLines = await sqldb.CHILLER_CARRIER_LINES.getLinesList({});
  const chillerModelsData = await sqldb.CHILLER_CARRIER_MODELS.getModelsList({});
  let chillerModels: { ID: number; MODEL_NAME: string; }[] = [];
  if (chillerModelsData) {
    chillerModels = chillerModelsData.map((item) => ({ ID: item.ID, MODEL_NAME: item.MODEL_NAME }))
  }
  return {
    chillerLines,
    chillerModels,
  };
}


export const sendDriCurrentSchedules = async function (reqParams: ApiInternalParams['/diel-internal/api-async/sendDriCurrentSchedules']): Promise<boolean> {
  try {
    const { DRI_ID } = reqParams;
    const driInf = await sqldb.DRIS.getBasicInfo({ driId: DRI_ID });
    const driCfg = parseDriVarsCfg(driInf.VARSCFG);
    const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: DRI_ID });

    if (!driInf || !fwInfo) return false;

    const schedules = await sqldb.DRISCHEDS.getDriScheds({ DRI_ID: DRI_ID });

    const schedulesToSend = parseDriScheduleToCards(schedules).filter((sched) => sched.ACTIVE === '1');

    const { week, exceptions } = await parseDriScheduleCardsToScheduler(schedulesToSend, driCfg);

    sendDriSchedulerConfig(DRI_ID, driCfg, '[SYSTEM]', driInf.AUTOMATION_INTERVAL);
    await sendDriScheduler(DRI_ID, week, exceptions, '[SYSTEM]');

    await verifySentSchedules(DRI_ID, fwInfo.CURRFW_VERS, schedulesToSend, driCfg, '[SYSTEM]');

    return true;

  } catch (error) {
    const message = `Erro no envio de programações e exceções do DRI: ${reqParams.DRI_ID}`;

    logger.error({
      error,
      message,
      reqParams,
    });

    throw new Error(message);
  }
}
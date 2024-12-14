import { PeriodData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import * as rtypesSchedsLoader from '../../srcCommon/helpers/ramcacheLoaders/rtypesSchedsLoader';
import sqldb from '../../srcCommon/db'
import * as automationRefsLoader from '../../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'
import * as damsEcoCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/damsEcoCfgLoader';
import { logger } from '../../srcCommon/helpers/logger';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import * as timezoneLoader from '../../srcCommon/helpers/ramcacheLoaders/timezoneLoader';

/** Este serviço vai de 10 em 10 minutos carregar as informações do banco de dados para a RAM */
export async function startService() {
  logger.info('Pre-loading DEVs information...');
  await loadAllFromDb();
  logger.info('Pre-loading done.');

  // Inicia a tarefa que vai verificar a cada mudança de hora se a programação corrente está correta
  recurrentTasks.runAtEveryHourChange({ taskName: 'DAMECO-HOURCHANGE', runAtStart: true }, () => {
    onHourChange();
  });

  (async function () {
    while(true) {
      await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
      try {
        await loadAllFromDb();
      } catch (err) {
        logger.error('Error on eco-mode DAM database RAM caches service');
        logger.error(err);
      }
    }
  }());
}

async function loadAllFromDb() {
  await loadTableTimezone();
  await loadRtypesScheds();
  await loadDutRoomTypes();
  await loadAutomationRefs();
  await loadDamsEcoCfg();
  await loadDamsScheds();
}

let rtypeSched: {
  [rTypeId: string]: {
    TUSEMAX: number
    TUSEMIN: number
    CO2MAX: number
    fullProg: FullProg_v4
    current: PeriodData
  }
} = {};
export function tryGetRTypeSched (rtypeId: number) {
  return rtypeSched[(rtypeId || 0).toString()];
}
export async function loadRtypesScheds () {
  rtypeSched = await rtypesSchedsLoader.loadRtypesScheds();
}


let dutRoomType: {
  [dutId: string]: number
} = {};
export function tryGetDutRTypeId (dutId: string) {
  return dutRoomType[dutId];
}
export async function loadDutRoomTypes () {
  const list = await sqldb.DUTS.getListBasic({}, {});
  dutRoomType = {};
  for (const row of list) {
    dutRoomType[row.DEV_ID] = row.RTYPE_ID;
  }
}


let dutDamsRef: {
  [dutId: string]: {
    damId: string
    canSelfReference: boolean
  }[]
} = {};
export function tryGetDutDamsRef (dutId: string) {
  return dutDamsRef[dutId];
}
export async function loadAutomationRefs () {
  const response = await automationRefsLoader.loadAutomationRefs({});
  dutDamsRef = response.dutDamsRef;
}


let damsEcoCfg: {
  [damId: string]: {
    ENABLE_ECO: number
    ENABLE_ECO_LOCAL: number
    ECO_CFG: string
    ECO_OFST_START: number
    ECO_OFST_END: number
    ECO_INT_TIME: number
    SCHEDULE_START_BEHAVIOR: string
    SETPOINT: number
    LTC: number
    LTI: number
    UPPER_HYSTERESIS: number
    LOWER_HYSTERESIS: number
    SELF_REFERENCE: number
    MINIMUM_TEMPERATURE: number
    MAXIMUM_TEMPERATURE: number
    CAN_SELF_REFERENCE: number
    splitCond: boolean
    PLACEMENT: string
    TIMEZONE_ID: number
    READ_DUT_TEMPERATURE_FROM_BROKER: boolean,
  }
} = {};
export function tryGetDamEcoCfg (damId: string) {
  return damsEcoCfg[damId];
}
export async function loadDamsEcoCfg () {
  damsEcoCfg = await damsEcoCfgLoader.loadDamsEcoCfg();
}

let damSched: {
  [damId: string]: {
    fullProg: FullProg_v4
    current: PeriodData
  }
} = {};
export function tryGetDamSched (damId: string) {
  return damSched[damId];
}
export async function loadDamsScheds () {
  const list = await sqldb.DAMS.getListWithProgFU({}, { includeDacs: true });
  damSched = {};
  for (const row of list) {
    const fullProg = row.LASTPROG && scheduleData.parseFullProgV4(row.LASTPROG);
    damSched[row.DAM_ID] = {
      fullProg,
      current: fullProg && scheduleData.getDayPeriod(fullProg),
    };
  }
}


let tableTimezone: {
  [idTimezone: string]: {
    timezoneArea: string,
  }
} = {};
export function tryGetTableInfoTimezone(idTimezone: number): { timezoneArea: string } {
  return (idTimezone && tableTimezone[idTimezone.toString()]) || {
    timezoneArea: 'America/Sao_Paulo',
    // posix: 'BRT3',
    // offset: -3,
  };
}
export async function loadTableTimezone() {
  tableTimezone = await timezoneLoader.loaderTableTimezone();
}


// Em toda mudança de hora confere se trocou o dia do dispositivo e ajusta a programação "current"
export function onHourChange () {
  for (const rType of Object.values(rtypeSched)) {
    if (!rType.fullProg) continue;
    rType.current = scheduleData.getDayPeriod(rType.fullProg);
  }
  for (const row of Object.values(damSched)) {
    if (!row.fullProg) continue;
    row.current = scheduleData.getDayPeriod(row.fullProg);
  }
}

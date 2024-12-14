import { PeriodData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import * as rtypesSchedsLoader from '../../srcCommon/helpers/ramcacheLoaders/rtypesSchedsLoader';
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import * as drisCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import type { DriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import * as timezoneLoader from '../../srcCommon/helpers/ramcacheLoaders/timezoneLoader';

/** Este serviço vai de 10 em 10 minutos carregar as informações do banco de dados para a RAM */
export async function startService() {
  logger.info('Pre-loading DEVs information...');
  await loadAllFromDb();
  logger.info('Pre-loading done.');

  // Inicia a tarefa que vai verificar a cada mudança de hora se a programação corrente está correta
  recurrentTasks.runAtEveryHourChange({ taskName: 'AUTOMDRI-HOURCHANGE', runAtStart: true }, () => {
    onHourChange();
  });

  (async function () {
    while(true) {
      await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
      try {
        await loadAllFromDb();
      } catch (err) {
        logger.error('Error on DRI automation database RAM caches service');
        logger.error(err);
      }
    }
  }());
}

async function loadAllFromDb() {
  await loadTableTimezone();
  await loadRtypesScheds();
  await loadDutRoomTypes();
  await loadDrisCfg();
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


let drisCfg: {
  [driId: string]: DriConfig
} = {};
let dutDrisRef: {
  [dutId: string]: string[]
} = {};
export function tryGetDriCfg(driId: string) {
  return drisCfg[driId];
}
export function tryGetDutDrisRef(dutId: string) {
  return dutDrisRef[dutId];
}
export function getCachedDriCfgList() {
  return drisCfg;
}
export async function loadDrisCfg() {
  const response = await drisCfgLoader.loadDrisCfg();
  drisCfg = response.drisCfg;
  dutDrisRef = response.dutDrisRef;
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
}

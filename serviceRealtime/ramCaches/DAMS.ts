import { PeriodData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import * as damsEcoCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/damsEcoCfgLoader';
import sqldb from '../../srcCommon/db';

// TAG: RAM-CACHE DAMS
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
    READ_DUT_TEMPERATURE_FROM_BROKER: boolean
  }
} = {};
export function tryGetDamEcoCfg (damId: string) {
  return damsEcoCfg[damId];
}
export async function loadDamsEcoCfg (reqParams?: {}) { // TODO: recarregar quando houver alteração no BD
  damsEcoCfg = await damsEcoCfgLoader.loadDamsEcoCfg();
}

// TAG: RAM-CACHE DAMS
let damSched: {
  [damId: string]: {
    fullProg: FullProg_v4
    current: PeriodData
  }
} = {};

let damsThermostatCfg: string[] = [];

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
export function onDayChange () {
  for (const row of Object.values(damSched)) {
    if (!row.fullProg) continue;
    row.current = scheduleData.getDayPeriod(row.fullProg);
  }
}
export function onDamFullProg (damId: string, fullProg: FullProg_v4) {
  damSched[damId] = {
    fullProg,
    current: fullProg && scheduleData.getDayPeriod(fullProg),
  };
}

export async function loadDamsThermostat() {
  const dams = await sqldb.DAMS_DEVICES.getDamsByThermostat({THERSMOSTAT_CFG: 1});
  damsThermostatCfg = dams.map(item => item.DEVICE_CODE);
}

export function setDamThermostatCfg(qPars: { damCode: string, valueThermostat: number }) {
  if (qPars.valueThermostat === 1) {
    damsThermostatCfg.push(qPars.damCode);
  }
  else {
    const index = damsThermostatCfg.indexOf(qPars.damCode);
    if (index !== -1) {
      damsThermostatCfg.splice(index, 1);
    }
  }
}

export function tryGetDamsThermostatCfg () {
  return damsThermostatCfg;
}
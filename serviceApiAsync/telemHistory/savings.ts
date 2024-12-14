import sqldb from '../../srcCommon/db'
import { API_private2 } from '../../srcCommon/types/api-private'
import * as httpApiRouter from '../httpApiRouter'
import { addDays_YMD, getDaysList_YMD, lastDayComplete_YMD, now_shiftedTS_s } from '../../srcCommon/helpers/dates'
import { getAllowedUnitsView, getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { calculateUnitAutomSavings } from '../../srcCommon/helpers/savings'

export const calculateEcomodeSavings: API_private2['/calculate-ecomode-savings'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.dacIds) throw Error('Invalid parameters! Missing dacIds').HttpStatus(400);
  if (!(reqParams.dacIds instanceof Array)) throw Error('Invalid dacIds').HttpStatus(400);
  if (reqParams.numDays == null) throw Error('Invalid parameters! Missing numDays').HttpStatus(400);
  if (!(reqParams.numDays >= 1 && reqParams.numDays <= 366)) throw Error('Invalid numDays').HttpStatus(400);

  const dayNext = addDays_YMD(reqParams.dayStart, reqParams.numDays);

  const effectiveHours = {} as {
    [dacId: string]: {
      [day: string]: number
    }
  };

  for (const dacId of reqParams.dacIds) {
    const dacInf = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: dacId });
    const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  if (!perms.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403);
    }

    const machineInfo = dacInf.MACHINE_ID && await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: dacInf.MACHINE_ID });
    const devAut = machineInfo && machineInfo.DEV_AUT;

    if (!devAut) continue;

    const commandsHistory = await sqldb.ECOCMDHIST.getList({
      devId: devAut,
      dayStart: reqParams.dayStart,
      dayNext,
    });

    const list = commandsHistory.map((row) => {
      const d = new Date(row.ts + 'Z');
      const start = d.getTime() / 1000;

      let weight = 0;
      if (['Condenser 1', 'Condenser 2'].includes(row.mode)) weight = 0.5;
      else if (['Disabled', 'Ventilation'].includes(row.mode)) weight = 1;

      return {
        day: row.ts.substr(0, 10),
        start,
        end: start + (row.duration * 60),
        weight,
      }
    });

    for (let i = 1; i < list.length; i++) {
      if (list[i - 1].end > list[i].start) list[i - 1].end = list[i].start;
    }

    let devCounters = effectiveHours[dacId];
    if (!devCounters) {
      effectiveHours[dacId] = {};
      devCounters = effectiveHours[dacId];
    }
    for (const cmd of list) {
      if (!cmd.weight) continue;
      const hours = (cmd.end - cmd.start) / 60 / 60;
      devCounters[cmd.day] = (devCounters[cmd.day] || 0) + hours * cmd.weight;
    }
    for (const day of Object.keys(devCounters)) {
      devCounters[day] = Math.round(devCounters[day] * 1000) / 1000;
      if (devCounters[day] > 24) devCounters[day] = 24;
    }
  }

  // Temperature: (data.Temperature && parseCompressedChartData(data.Temperature)) || null,

  return {
    hoursBlocked: effectiveHours
  };
}

export const unitEcomodeSavings: API_private2['/unit-ecomode-savings'] = async function (reqParams, session) {
  const s1 = await httpApiRouter.externalRoutes['/unit-automation-savings'](reqParams, session);
  const hoursBlocked = {} as {
    [dacId: string]: {
        [day: string]: number;
    };
  };
  for (const [dacId, days] of Object.entries(s1.hoursBlocked)) {
    hoursBlocked[dacId] = {};
    for (const [day, counters] of Object.entries(days)) {
      hoursBlocked[dacId][day] = counters.totalEst;
    }
  }
  return { hoursBlocked };
}

export const unitsAutomationSavings: API_private2['/units-automation-savings'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }
  const unitsList = await sqldb.CLUNITS.getUnitsList2({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
  }, {});
  const units: {
    [unitId: string]: {
      [day: string]: {
        totalEst: number
      }
    }
  } = {};
  for (const unit of unitsList) {
    const savs = await httpApiRouter.externalRoutes['/unit-automation-savings']({
      unitId: unit.UNIT_ID,
      dayStart: reqParams.dayStart,
      numDays: reqParams.numDays,
    }, session);
    units[unit.UNIT_ID] = {};
    const unitSavings = units[unit.UNIT_ID];
    for (const [dacId, dacSavings] of Object.entries(savs.hoursBlocked)) {
      for (const [day, daySavings] of Object.entries(dacSavings)) {
        if (!unitSavings[day]) {
          unitSavings[day] = { totalEst: 0 };
        }
        if (daySavings.totalEst) {
          unitSavings[day].totalEst += daySavings.totalEst;
        }
      };
    };
  }
  return { units };
}


export const unitAutomationSavings: API_private2['/unit-automation-savings'] = async function (reqParams, session) {
  if (!reqParams.unitId) throw Error('Invalid parameters! Missing unitId').HttpStatus(400);
  if (typeof reqParams.unitId !== 'number') throw Error('Invalid unitId').HttpStatus(400);
  if (!isFinite(reqParams.unitId)) throw Error('Invalid unitId').HttpStatus(400);
  if (reqParams.numDays == null) throw Error('Invalid parameters! Missing numDays').HttpStatus(400);
  if (!(reqParams.numDays >= 1 && reqParams.numDays <= 366)) throw Error('Invalid numDays').HttpStatus(400);

  // # Verifica permissão
  const unitInf = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInf) throw Error('Invalid unitId').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, unitInf.CLIENT_ID, unitInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  // Só calcula saving para dias completos
  const lastDayComplete = lastDayComplete_YMD();
  if (reqParams.dayStart > lastDayComplete) {
    return { hoursBlocked: {} };
  }
  let dayNext = addDays_YMD(reqParams.dayStart, reqParams.numDays);
  const maxDayNext = addDays_YMD(lastDayComplete, 1);
  if (dayNext > maxDayNext) dayNext = maxDayNext;
  const daysList = getDaysList_YMD(reqParams.dayStart, reqParams.numDays).filter((day) => day <= lastDayComplete);

  const response = await calculateUnitAutomSavings(unitInf.UNIT_ID, reqParams.dayStart, dayNext, daysList, session.user);

  return response;
}

export async function getUnitAutomationSavings(unitId: number, dayStart: string, numDays: number, user: string) {
  // Só calcula saving para dias completos
  const lastDayComplete = lastDayComplete_YMD();
  if (dayStart > lastDayComplete) {
    return null;
  }

  let totalEst = 0;
  let dayNext = addDays_YMD(dayStart, numDays);
  const maxDayNext = addDays_YMD(lastDayComplete, 1);
  if (dayNext > maxDayNext) dayNext = maxDayNext;
  const daysList = getDaysList_YMD(dayStart, numDays).filter((day) => day <= lastDayComplete);

  const cachedData = await sqldb.cache_unit_autom_savings.getUnitDaysList({
    unitId,
    dayStart: daysList[0],
    dayEnd: daysList[daysList.length - 1],
  });
  for (const data of cachedData) {
    daysList.splice(daysList.findIndex((day) => day === data.YMD), 1);
    totalEst += data.totalEst;
  }

  if (daysList.length !== 0) {
    const dayTotalSaving = {} as {
      [day: string]: number,
    };
    const response = await calculateUnitAutomSavings(unitId, dayStart, dayNext, daysList, user);
    for(const item of Object.values(response.hoursBlocked)) {
      for (const [day, { totalEst }] of Object.entries(item)) {
        if (!dayTotalSaving[day]) dayTotalSaving[day] = 0;
        dayTotalSaving[day] += totalEst;
      }
    }

    for(const [day, totalEstDay] of Object.entries(dayTotalSaving)) {
      totalEst += totalEst;
      await sqldb.cache_unit_autom_savings.w_insertUpdate({
        YMD: day,
        unitId,
        totalEst: totalEstDay,
        datCache: now_shiftedTS_s(true),
      })
    }
  }

  return totalEst;
}

interface DamEvents { c: number[], v: string[] };
interface DacEvents { c: number[], v: number[] };
function mergeEvents (damEco: DamEvents, dac0: DacEvents, dac1: DacEvents, dac2: DacEvents, damState: DamEvents) {
  if (!damEco) damEco = { c: [], v: [] };
  if (!dac0) dac0 = { c: [], v: [] };
  if (!dac1) dac1 = { c: [], v: [] };
  if (!dac2) dac2 = { c: [], v: [] };
  if (!damState) damState = { c: [], v: [] };
  const eventsList = [] as {
    dur: number
    mode: string
    L1_0: number
    L1_1: number
    L1_2: number
    stat: string
  }[];
  let i_damE = 0;
  let i_damS = 0;
  let i_dac0 = 0;
  let i_dac1 = 0;
  let i_dac2 = 0;
  let v_damE = (i_damE < damEco.v.length) ? damEco.v[i_damE] : null;
  let v_damS = (i_damS < damState.v.length) ? damState.v[i_damS] : null;
  let v_dac0 = (i_dac0 < dac0.v.length) ? dac0.v[i_dac0] : null;
  let v_dac1 = (i_dac1 < dac1.v.length) ? dac1.v[i_dac1] : null;
  let v_dac2 = (i_dac2 < dac2.v.length) ? dac2.v[i_dac2] : null;
  let c_damE = damEco.c[i_damE] || 0;
  let c_damS = damState.c[i_damS] || 0;
  let c_dac0 = dac0.c[i_dac0] || 0;
  let c_dac1 = dac1.c[i_dac1] || 0;
  let c_dac2 = dac2.c[i_dac2] || 0;
  while (c_damE || c_dac0 || c_dac1 || c_dac2 || c_damS) {
    const maxStep = Math.max(c_damE, c_dac0, c_dac1, c_dac2, c_damS);
    const step = Math.min(c_damE||maxStep, c_dac0||maxStep, c_dac1||maxStep, c_dac2||maxStep, c_damS||maxStep);
    eventsList.push({
      dur: step,
      mode: v_damE,
      L1_0: v_dac0,
      L1_1: v_dac1,
      L1_2: v_dac2,
      stat: v_damS,
    });
    if (c_damE) c_damE -= step;
    if (c_dac0) c_dac0 -= step;
    if (c_dac1) c_dac1 -= step;
    if (c_dac2) c_dac2 -= step;
    if (c_damS) c_damS -= step;
    if (!c_damE) {
      if (i_damE < (damEco.v.length - 1)) { i_damE++; v_damE = damEco.v[i_damE]; c_damE = damEco.c[i_damE]; }
      else { v_damE = null; }
    }
    if (!c_dac0) {
      if (i_dac0 < (dac0.v.length - 1)) { i_dac0++; v_dac0 = dac0.v[i_dac0]; c_dac0 = dac0.c[i_dac0]; }
      else { v_dac0 = null; }
    }
    if (!c_dac1) {
      if (i_dac1 < (dac1.v.length - 1)) { i_dac1++; v_dac1 = dac1.v[i_dac1]; c_dac1 = dac1.c[i_dac1]; }
      else { v_dac1 = null; }
    }
    if (!c_dac2) {
      if (i_dac2 < (dac2.v.length - 1)) { i_dac2++; v_dac2 = dac2.v[i_dac2]; c_dac2 = dac2.c[i_dac2]; }
      else { v_dac2 = null; }
    }
    if (!c_damS) {
      if (i_damS < (damState.v.length - 1)) { i_damS++; v_damS = damState.v[i_damS]; c_damS = damState.c[i_damS]; }
      else { v_damS = null; }
    }
  }
  return eventsList;
}

import { PeriodData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import sqldb from '../../srcCommon/db';

// TAG: RAM-CACHE AUTOM_EVAP
let dutSched: {
  [dutId: string]: {
    fullProg: FullProg_v4
    current: PeriodData
    todayEvents: scheduleData.ProgEventItem[]
  }
} = {};
export function tryGetDutSched (dutId: string) {
  return dutSched[dutId];
}
export async function loadDutsScheds () {
  const list = await sqldb.AUTOM_EVAP.getListWithProg({});
  dutSched = {};
  for (const row of list) {
    const fullProg = row.LASTPROG && scheduleData.parseFullProgV4(row.LASTPROG);
    const current = fullProg && scheduleData.getDayPeriod(fullProg);
    const todayEvents = current && scheduleData.PeriodData_to_EventsList(current, fullProg.ventTime);
    dutSched[row.DUT_ID] = {
      fullProg,
      current,
      todayEvents,
    };
  }
}
export function onDayChange () {
  for (const row of Object.values(dutSched)) {
    if (!row.fullProg) continue;
    row.current = scheduleData.getDayPeriod(row.fullProg);
    row.todayEvents = scheduleData.PeriodData_to_EventsList(row.current, row.fullProg.ventTime);
  }
}
export function onDutFullProg (dutId: string, fullProg: FullProg_v4) {
  const current = fullProg && scheduleData.getDayPeriod(fullProg);
  const todayEvents = current && scheduleData.PeriodData_to_EventsList(current, fullProg.ventTime);
  dutSched[dutId] = {
    fullProg,
    current,
    todayEvents,
  };
}

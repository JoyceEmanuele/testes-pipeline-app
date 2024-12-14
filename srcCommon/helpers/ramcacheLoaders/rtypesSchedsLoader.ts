import { PeriodData } from '../../types';
import * as scheduleData from '../scheduleData';
import { FullProg_v4 } from '../scheduleData';
import sqldb from '../../db';

export async function loadRtypesScheds () {
  const list = await sqldb.ROOMTYPES.getRoomTypesList({});
  const rtypeSched: {
    [rTypeId: string]: {
      TUSEMAX: number
      TUSEMIN: number
      CO2MAX: number
      fullProg: FullProg_v4
      current: PeriodData
      todayEvents: scheduleData.ProgEventItem[]
    }
  } = {};
  for (const rowRType of list) {
    const fullProg = scheduleData.parseFullProgV4(rowRType.USEPERIOD);
    const current = fullProg && scheduleData.getDayPeriod(fullProg);
    const todayEvents = scheduleData.PeriodData_to_EventsList(current, fullProg.ventTime);
    rtypeSched[rowRType.RTYPE_ID.toString()] = {
      TUSEMAX: rowRType.TUSEMAX,
      TUSEMIN: rowRType.TUSEMIN,
      CO2MAX: rowRType.CO2MAX,
      fullProg,
      current,
      todayEvents,
    };
  }
  return rtypeSched;
}

export async function loadRtypeSched (rtypeId: number) {
  const rowRType = await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID: rtypeId });
  const fullProg = scheduleData.parseFullProgV4(rowRType.USEPERIOD);
  const current = fullProg && scheduleData.getDayPeriod(fullProg);
  const todayEvents = scheduleData.PeriodData_to_EventsList(current, fullProg.ventTime);
  return {
    TUSEMAX: rowRType.TUSEMAX,
    TUSEMIN: rowRType.TUSEMIN,
    CO2MAX: rowRType.CO2MAX,
    fullProg,
    current,
    todayEvents,
  };
}

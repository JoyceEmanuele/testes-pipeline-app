import { PeriodData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import * as rtypesSchedsLoader from '../../srcCommon/helpers/ramcacheLoaders/rtypesSchedsLoader';

// TAG: RAM-CACHE ROOMTYPES
let rtypeSched: {
  [rTypeId: string]: {
    TUSEMAX: number
    TUSEMIN: number
    CO2MAX: number
    fullProg: FullProg_v4
    current: PeriodData
    todayEvents: scheduleData.ProgEventItem[]
  }
} = {};
export function tryGetRTypeSched (rtypeId: number) {
  return rtypeSched[(rtypeId || 0).toString()];
}
export function deleteRType (reqParams: { rtypeId: number }) {
  const { rtypeId } = reqParams;
  delete rtypeSched[rtypeId.toString()];
}
export async function loadRtypesScheds (reqParams?: {}) { // TODO: recarregar quando houver alteração no BD
  rtypeSched = await rtypesSchedsLoader.loadRtypesScheds();
}
export async function loadRtypeSched (reqParams: { rtypeId: number }) { // TODO: recarregar quando houver alteração no BD
  const { rtypeId } = reqParams;
  rtypeSched[rtypeId.toString()] = await rtypesSchedsLoader.loadRtypeSched(rtypeId);
}
export function onDayChange () {
  for (const rType of Object.values(rtypeSched)) {
    if (!rType.fullProg) continue;
    rType.current = scheduleData.getDayPeriod(rType.fullProg);
    rType.todayEvents = scheduleData.PeriodData_to_EventsList(rType.current, rType.fullProg.ventTime);
  }
}

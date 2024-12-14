import {
  PeriodData,
} from '../types';
import {
  DamDayProg,
  DamProgramming,
  MsgDamProgBasic,
  MsgDamProgExcepts,
} from '../types/devicesMessages';
import { ControlMode } from './dutAutomation';

import { logger } from '../helpers/logger';

export interface WorkPeriods {
  workPeriods?: { [day: string]: string },
  workPeriodExceptions?: { [day: string]: string },
}

export interface DayProg {
  permission: 'allow'|'forbid',
  start: string, // '00:00'
  end: string, // '23:59'
  clearProg?: boolean,
}

export interface FullProg_v3 {
  version: "v3"
  week: {
    mon?: DayProg,
    tue?: DayProg,
    wed?: DayProg,
    thu?: DayProg,
    fri?: DayProg,
    sat?: DayProg,
    sun?: DayProg,
  }
  exceptions: {
    [day: string]: DayProg
  },
  ventilation?: number
  temprtControl?: {
    temperature: number
    LTC: number
    mode: ControlMode
    enabled?: boolean
    LTI: number
  }
}

export interface FullProg_v4 {
  version: "v4"
  week: {
    mon?: DayProg
    tue?: DayProg
    wed?: DayProg
    thu?: DayProg
    fri?: DayProg
    sat?: DayProg
    sun?: DayProg
  }
  exceptions?: {
    [day: string]: DayProg
  },
  ventTime?: { begin: number, end: number }
  temprtControl?: {
    temperature: number
    LTC: number
    mode: ControlMode
    LTI: number
    hist_sup?: number
    hist_inf?: number
    action?: string
    action_interval?: number
    action_post?: string
  }
  forced?: {
    forcedMode?: number,
  }
}

interface FullDamProgDesc {
  mon?: string
  tue?: string
  wed?: string
  thu?: string
  fri?: string
  sat?: string
  sun?: string
  exceptions: { [date: string]: string }
  ventilation?: number
}

// const rgxPeriodDesc = /^(\d\d\:\d\d)?-(\d\d\:\d\d)?;([\w,\d\-]*)(;(enabled|disabled|allow|forbid))?$/
// const rgxDayPeriodDesc = /^(enabled|disabled|allow|forbid)(\d\d\:\d\d)?-(\d\d\:\d\d)?$/
// const rgx = /^(\w+)(;(\d\d):(\d\d)-(\d\d):(\d\d))?$/
const rgxTimeHM = /^(\d\d):(\d\d)$/
const rgxTimespan = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/
const rgxDate = /^\d\d\d\d-\d\d-\d\d$/

function parseDamDayProg (prog: DamDayProg): PeriodData {
  if (!prog) return null;
  if (!prog.start) return null;
  if (!prog.end) return null;
  if (!prog.mode) return null;

  const modeConv: { [k: string]: 'allow'|'forbid' } = {
    'Enabled': 'allow',
    'Disabled': 'forbid',
  };

  if (!(prog.start.hour >= 0 && prog.start.hour <= 23)) return null;
  if (!(prog.start.minute >= 0 && prog.start.minute <= 59)) return null;
  if (!(prog.end.hour >= 0 && prog.end.hour <= 23)) return null;
  if (!(prog.end.minute >= 0 && prog.end.minute <= 59)) return null;
  if (!modeConv[prog.mode]) return null;

  const startHM = `${String(prog.start.hour).padStart(2, '0')}:${String(prog.start.minute).padStart(2, '0')}`;
  const endHM = `${String(prog.end.hour).padStart(2, '0')}:${String(prog.end.minute).padStart(2, '0')}`;

  const period: PeriodData = {
    permission: modeConv[prog.mode],
    start: startHM,
    end: endHM,
    indexIni: prog.start.hour * 60 + prog.start.minute * 1,
    indexEnd: prog.end.hour * 60 + prog.end.minute * 1,
    days: null,
    fullDay: (startHM === '00:00' && endHM === '23:59'),
  }

  return period;
}
export function FwDayProg_to_DayProg (prog: DamDayProg): DayProg {
  const period = prog && parseDamDayProg(prog);
  if (!period) return null;
  return {
    permission: period.permission,
    start: period.start,
    end: period.end,
  };
}
function PeriodDesc_to_DayProg (periodDesc: string, withDays: boolean): DayProg {
  const period = periodDesc && parsePeriodDesc(periodDesc, withDays);
  if (!period) return null;
  return {
    permission: period.permission,
    start: period.start,
    end: period.end,
  };
}
function DayProg_to_PeriodData (dayProg: DayProg, day: string): PeriodData {
  if (!dayProg) return null;

  if (!['allow', 'forbid'].includes(dayProg.permission)) return null;
  if (['sun','mon','tue','wed','thu','fri','sat'].includes(day)) { } // OK
  else if (rgxDate.test(day)) { } // OK
  else { return null; }

  let indexIni, indexEnd: number;
  // if (dayProg.clearProg) {
  //   const period: PeriodData = {
  //     permission: dayProg.permission,
  //     start: dayProg.start,
  //     end: dayProg.end,
  //     indexIni,
  //     indexEnd,
  //     days: [day],
  //     fullDay: (dayProg.start === '00:00' && dayProg.end === '23:59'),
  //   }
  //   return period;
  // }
  {
    const matched = dayProg.start && dayProg.start.match(rgxTimeHM);
    if (!matched) return null;
    const [, HH, MM] = matched;
    const nH = Number(HH);
    const nM = Number(MM);
    if (!(nH >= 0 && nH <= 23)) { return null; }
    if (!(nM >= 0 && nM <= 59)) { return null; }
    indexIni = nH * 60 + nM;
  }
  {
    const matched = dayProg.end && dayProg.end.match(rgxTimeHM);
    if (!matched) return null;
    const [, HH, MM] = matched;
    const nH = Number(HH);
    const nM = Number(MM);
    if (!(nH >= 0 && nH <= 23)) { return null; }
    if (!(nM >= 0 && nM <= 59)) { return null; }
    indexEnd = nH * 60 + nM;
  }
  if (!(indexIni <= indexEnd)) { return null; }

  const period: PeriodData = {
    permission: dayProg.permission,
    start: dayProg.start,
    end: dayProg.end,
    indexIni,
    indexEnd,
    days: [day],
    fullDay: (dayProg.start === '00:00' && dayProg.end === '23:59'),
  }

  return period;
}

function parsePeriodDesc (periodDesc: string, withDays: boolean): PeriodData {
  // "00:00-23:59;mon,tue,wed;allow"
  // "-;2020-06-07;forbid"
  // "-;sun"
  // "00:00-23:59;allow"

  if (!periodDesc) return null;
  let descPars = periodDesc.split(';');
  let matched;

  let type: string = null;
  if (descPars.includes('enabled')) type = 'allow';
  else if (descPars.includes('disabled')) type = 'forbid';
  else if (descPars.includes('allow')) type = 'allow';
  else if (descPars.includes('forbid')) type = 'forbid';
  descPars = descPars.filter(x => !['enabled', 'disabled', 'allow', 'forbid'].includes(x));

  let startHH = '00';
  let startMM = '00';
  let endHH = '23';
  let endMM = '59';
  let indexIni = 0;
  let indexEnd = 23 * 60 + 59;
  if (descPars[0] === '-') {
    if (!type) type = 'forbid';
    descPars = descPars.slice(1);
  }
  else if ((descPars[0] != null) && (matched = descPars[0].match(rgxTimespan))) {
    [, startHH, startMM, endHH, endMM] = matched;

    const nstartH = Number(startHH);
    const nstartM = Number(startMM);
    const nendH = Number(endHH);
    const nendM = Number(endMM);
    if (!(nstartH >= 0 && nstartH <= 23)) { return null; }
    if (!(nendH >= 0 && nendH <= 23)) { return null; }
    if (!(nstartM >= 0 && nstartM <= 59)) { return null; }
    if (!(nendM >= 0 && nendM <= 59)) { return null; }

    indexIni = nstartH * 60 + nstartM;
    indexEnd = nendH * 60 + nendM;
    if (!(indexIni <= indexEnd)) { return null; }

    if (!type) type = 'allow';
    descPars = descPars.slice(1);
  }
  const startHM = `${startHH}:${startMM}`;
  const endHM = `${endHH}:${endMM}`;

  let days: string[] = null;
  if ((!withDays) && descPars.length === 0) { } // OK
  else if ((withDays) && descPars.length === 1) {
    days = [];
    if (descPars[0] === '') { }
    else {
      for (const day of descPars[0].split(',')) {
        if (['sun','mon','tue','wed','thu','fri','sat'].includes(day)) days.push(day);
        else if (rgxDate.test(day)) days.push(day);
        else {
          return null;
        }
      }
    }
    // if (days.length === 0) { return null; }
  }
  else {
    return null;
  }

  const period: PeriodData = {
    permission: type as 'allow'|'forbid',
    start: startHM,
    end: endHM,
    indexIni,
    indexEnd,
    days,
    fullDay: (startHM === '00:00' && endHM === '23:59'),
  }

  return period;
}

export function FullProgV4_to_deprecated_FullProgV3 (fullProg: FullProg_v4): FullProg_v3 {
  return {
    version: 'v3',
    week: fullProg.week,
    exceptions: fullProg.exceptions || {},
    temprtControl: fullProg.temprtControl,
    ventilation: fullProg.ventTime && (fullProg.ventTime.end || fullProg.ventTime.begin),
  }
}
export function FullProgV3_to_FullProgV4 (fullProg: FullProg_v3): FullProg_v4 {
  return {
    version: 'v4',
    week: fullProg.week,
    exceptions: fullProg.exceptions,
    temprtControl: fullProg.temprtControl,
    ventTime: (fullProg.ventilation == null) ? undefined : { begin: fullProg.ventilation, end: fullProg.ventilation },
  }
}

export interface ProgEventItem {
  start_m: number
  duration_m: number
  state: 'allow'|'forbid'|'onlyfan'
}
export function PeriodData_to_EventsList (dayProg: PeriodData, ventTime: { begin: number, end: number }): ProgEventItem[] {
  // if (!dayProgDesc) return [];
  // const dayProg = parsePeriodDesc(dayProgDesc, false);
  if (!dayProg) return [];

  const ventilation_start = (ventTime && ventTime.begin && Number(ventTime.begin)) || 0;
  const ventilation_end = (ventTime && ventTime.end && Number(ventTime.end)) || 0;
  const total_ventilation = ventilation_start + ventilation_end;
  const mainProgDuration = dayProg.indexEnd - dayProg.indexIni + 1;
  const timeBeforeProg = dayProg.indexIni;
  const timeAfterProg = 1439 - dayProg.indexEnd;
  const events: ProgEventItem[] = [];

  if (dayProg.permission === 'allow') {
    if (timeBeforeProg > 0) {
      events.push({ start_m: 0, duration_m: timeBeforeProg, state: 'forbid' });
    }
    if (!total_ventilation) {
      events.push({ start_m: dayProg.indexIni, duration_m: mainProgDuration, state: 'allow' });
    } else {
      if (total_ventilation >= mainProgDuration) {
        events.push({ start_m: dayProg.indexIni, duration_m: mainProgDuration, state: 'onlyfan' });
      } else {
        events.push({ start_m: dayProg.indexIni, duration_m: ventilation_start, state: 'onlyfan' });
        events.push({ start_m: dayProg.indexIni + ventilation_start, duration_m: mainProgDuration - total_ventilation, state: 'allow' });
        events.push({ start_m: dayProg.indexEnd + 1 - ventilation_end, duration_m: ventilation_end, state: 'onlyfan' });
      }
    }
    if (timeAfterProg > 0) {
      events.push({ start_m: dayProg.indexEnd + 1, duration_m: timeAfterProg, state: 'forbid' });
    }
  }
  else if (dayProg.permission === 'forbid') {
    if (timeBeforeProg > 0) {
      if (!total_ventilation) {
        events.push({ start_m: 0, duration_m: timeBeforeProg, state: 'allow' });
      } else {
        if (ventilation_start >= timeBeforeProg) {
          events.push({ start_m: 0, duration_m: timeBeforeProg, state: 'onlyfan' });
        } else {
          events.push({ start_m: 0, duration_m: timeBeforeProg - ventilation_start, state: 'allow' });
          events.push({ start_m: dayProg.indexIni - ventilation_start, duration_m: ventilation_start, state: 'onlyfan' });
        }
      }
    }
    events.push({ start_m: dayProg.indexIni, duration_m: mainProgDuration, state: 'forbid' });
    if (timeAfterProg > 0) {
      if (!total_ventilation) {
        events.push({ start_m: dayProg.indexEnd + 1, duration_m: timeAfterProg, state: 'allow' });
      } else {
        if (ventilation_end >= timeAfterProg) {
          events.push({ start_m: dayProg.indexEnd + 1, duration_m: timeAfterProg, state: 'onlyfan' });
        } else {
          events.push({ start_m: dayProg.indexEnd + 1, duration_m: ventilation_end, state: 'onlyfan' });
          events.push({ start_m: dayProg.indexEnd + 1 + ventilation_end, duration_m: timeAfterProg - ventilation_end, state: 'allow' });
        }
      }
    }
  }
  else throw Error("A programação contém um estado inválido").HttpStatus(500);

  // for (const item of events) {
  //   const h1 = Math.floor(item.start_m / 60);
  //   const m1 = (item.start_m % 60).toString().padStart(2, '0');
  //   const h2 = Math.floor((item.start_m + item.duration_m - 1) / 60);
  //   const m2 = ((item.start_m + item.duration_m - 1) % 60).toString().padStart(2, '0');
  //   logger.info(`${h1}:${m1} - ${h2}:${m2} => ${item.state} (${item.duration_m})`);
  // }
  return events;
}

export function getDayPeriod (fullProg: FullProg_v4, day?: string): PeriodData {
  if (!fullProg) return null;
  const dayShifted = day ? new Date(day + 'Z') : new Date(Date.now() - 3 * 60 * 60 * 1000);
  const weekDay = (['sun','mon','tue','wed','thu','fri','sat'] as (keyof typeof fullProg.week)[])[dayShifted.getUTCDay()];
  day = dayShifted.toISOString().substr(0, 10);
  if (fullProg.exceptions && fullProg.exceptions[day]) {
    return DayProg_to_PeriodData(fullProg.exceptions[day], day);
  }
  if (fullProg.week && fullProg.week[weekDay]) {
    return DayProg_to_PeriodData(fullProg.week[weekDay], weekDay);
  }
  return null;
}

export function FullProgV4_to_deprecated_WorkPeriods (fullProg: FullProg_v4): WorkPeriods {
  const periods: WorkPeriods = {};
  for (const [dayString, dayProg] of Object.entries(fullProg.week || {})) {
    if (!periods.workPeriods) { periods.workPeriods = {}; }
    periods.workPeriods[dayString] = serializePeriodData(dayProg);
  }
  for (const [dayString, dayProg] of Object.entries(fullProg.exceptions || {})) {
    if (!periods.workPeriodExceptions) { periods.workPeriodExceptions = {}; }
    periods.workPeriodExceptions[dayString] = serializePeriodData(dayProg);
  }
  return periods;
}

function serializePeriodData (periodData: DayProg): string {
  let periodDesc: string = periodData.permission;
  const fullDay = (periodData.start === '00:00') && (periodData.end === '23:59');
  if (!fullDay) {
    periodDesc += `;${periodData.start}-${periodData.end}`;
  }
  const periodDataCheck = parsePeriodDesc(periodDesc, false);
  if (!periodDataCheck) throw Error('Error parsing schedule data [13]');
  if (periodDataCheck.start !== periodData.start) throw Error('Error parsing schedule data [13]');
  if (periodDataCheck.end !== periodData.end) throw Error('Error parsing schedule data [14]');
  if (periodDataCheck.permission !== periodData.permission) throw Error('Error parsing schedule data [15]');
  return periodDesc;
}

export function WorkPeriods_to_FullProgV4 (workPeriods: { [day: string]: string }): FullProg_v4 {
  if (!workPeriods) return null;

  const progDesc: FullProg_v4 = { version: 'v4', week: {} };
  for (const [day, progString] of Object.entries(workPeriods)) {
    const periodData = parsePeriodDesc(progString, false);
    if (!periodData) continue;
    const dayProg: DayProg = {
      permission: periodData.permission,
      start: periodData.start,
      end: periodData.end,
    };

    if (day.length === 3) {
      if (day === 'mon') progDesc.week.mon = dayProg;
      else if (day === 'tue') progDesc.week.tue = dayProg;
      else if (day === 'wed') progDesc.week.wed = dayProg;
      else if (day === 'thu') progDesc.week.thu = dayProg;
      else if (day === 'fri') progDesc.week.fri = dayProg;
      else if (day === 'sat') progDesc.week.sat = dayProg;
      else if (day === 'sun') progDesc.week.sun = dayProg;
    }
    else if ((day.length === 10) && rgxDate.test(day)) { // 'YYYY-MM-DD'
      if (!progDesc.exceptions) progDesc.exceptions = {};
      progDesc.exceptions[day] = dayProg;
    }
  }

  const checkedProg = checkFullProgV4(progDesc);
  return checkedProg;
}

export function isDayProgEqual (a: DayProg, b: DayProg): boolean {
  if (a && b) { } // will check
  else if ((!a) && (!b)) return true;
  else return false;
  if (a.permission !== b.permission) return false;
  if (a.start !== b.start) return false;
  if (a.end !== b.end) return false;
  return true;
}

export function parseFullProgV4 (text: string): FullProg_v4 {
  const progDesc: FullProg_v4 = { version: 'v4', week: {} };

  if (!text) return progDesc;

  if (text.startsWith('[') && text.endsWith(']')) {
    // [00:00-23:59;mon,tue,wed;allow][-;2020-06-07]
    const periodsDesc = text.substr(1, text.length - 2).split('][');
    for (const periodItem of periodsDesc) {
      if (periodItem.startsWith('#')) {
        if (periodItem.startsWith('#ventilation=')) {
          const ventilation = Number(periodItem.substr('#ventilation='.length)) || 0;
          progDesc.ventTime = { begin: ventilation, end: ventilation };
        }
      } else {
        const period = parsePeriodDesc(periodItem, true);
        if (period && period.days.length > 0) {
          for (const day of period.days) {
            const dayProg: DayProg = {
              permission: period.permission,
              start: period.start,
              end: period.end,
            };
            if (day.length === 3) {
              if (day === 'mon') progDesc.week.mon = dayProg;
              else if (day === 'tue') progDesc.week.tue = dayProg;
              else if (day === 'wed') progDesc.week.wed = dayProg;
              else if (day === 'thu') progDesc.week.thu = dayProg;
              else if (day === 'fri') progDesc.week.fri = dayProg;
              else if (day === 'sat') progDesc.week.sat = dayProg;
              else if (day === 'sun') progDesc.week.sun = dayProg;
            }
            else if ((day.length === 10) && rgxDate.test(day)) { // 'YYYY-MM-DD'
              if (!progDesc.exceptions) progDesc.exceptions = {};
              progDesc.exceptions[day] = dayProg;
            }
          }
        }
      }
    }
    return progDesc;
  }
  
  let fProg0: FullProg_v4 | FullProg_v3 | FullDamProgDesc | DamProgramming;
  try {
    fProg0 = JSON.parse(text);
  } catch (err) {
    logger.error('Error parsing schedule', err);
    return progDesc;
  }
  if (!fProg0) return progDesc;

  if ((fProg0 as FullProg_v4).week) {
    if ((fProg0 as FullProg_v3).ventilation != null) {
      const time = (fProg0 as FullProg_v3).ventilation;
      (fProg0 as FullProg_v4).ventTime = { begin: time, end: time };
    }
    return fProg0 as FullProg_v4;
  }

  const fProg1 = fProg0 as DamProgramming;
  const fProg2 = fProg0 as FullDamProgDesc;

  if (typeof (fProg0 as FullDamProgDesc).ventilation === 'number') {
    const time = (fProg0 as FullDamProgDesc).ventilation;
    progDesc.ventTime = { begin: time, end: time };
  }

  if ((fProg0 as FullDamProgDesc).exceptions) {
    for (const [day, prog] of Object.entries((fProg0 as FullDamProgDesc).exceptions)) {
      if (!rgxDate.test(day)) continue;
      if (!progDesc.exceptions) progDesc.exceptions = {};
      if (typeof prog === 'object') {
        const dayProg = FwDayProg_to_DayProg(prog);
        if (dayProg) progDesc.exceptions[day] = dayProg;
      }
      else {
        const dayProg = PeriodDesc_to_DayProg(prog, false);
        if (dayProg) progDesc.exceptions[day] = dayProg;
      }
    }
  }

  {
    if (typeof fProg1.monday === 'object') progDesc.week.mon = FwDayProg_to_DayProg(fProg1.monday) || undefined;
    if (typeof fProg1.tuesday === 'object') progDesc.week.tue = FwDayProg_to_DayProg(fProg1.tuesday) || undefined;
    if (typeof fProg1.wednesday === 'object') progDesc.week.wed = FwDayProg_to_DayProg(fProg1.wednesday) || undefined;
    if (typeof fProg1.thursday === 'object') progDesc.week.thu = FwDayProg_to_DayProg(fProg1.thursday) || undefined;
    if (typeof fProg1.friday === 'object') progDesc.week.fri = FwDayProg_to_DayProg(fProg1.friday) || undefined;
    if (typeof fProg1.saturday === 'object') progDesc.week.sat = FwDayProg_to_DayProg(fProg1.saturday) || undefined;
    if (typeof fProg1.sunday === 'object') progDesc.week.sun = FwDayProg_to_DayProg(fProg1.sunday) || undefined;
  }

  {
    if (typeof fProg2.mon === 'string') progDesc.week.mon = PeriodDesc_to_DayProg(fProg2.mon, false);
    if (typeof fProg2.tue === 'string') progDesc.week.tue = PeriodDesc_to_DayProg(fProg2.tue, false);
    if (typeof fProg2.wed === 'string') progDesc.week.wed = PeriodDesc_to_DayProg(fProg2.wed, false);
    if (typeof fProg2.thu === 'string') progDesc.week.thu = PeriodDesc_to_DayProg(fProg2.thu, false);
    if (typeof fProg2.fri === 'string') progDesc.week.fri = PeriodDesc_to_DayProg(fProg2.fri, false);
    if (typeof fProg2.sat === 'string') progDesc.week.sat = PeriodDesc_to_DayProg(fProg2.sat, false);
    if (typeof fProg2.sun === 'string') progDesc.week.sun = PeriodDesc_to_DayProg(fProg2.sun, false);
  }

  return progDesc;
}

export function MsgDamProgBasic_to_FullProgV4 (basic: MsgDamProgBasic): FullProg_v4 {
  if ((basic.ventilation_end === undefined) && (basic.ventilation !== undefined)) {
    basic.ventilation_end = basic.ventilation;
  }
  return {
    version: 'v4',
    week: {
      mon: ((typeof(basic.programming.monday) !== 'string') && FwDayProg_to_DayProg(basic.programming.monday)) || undefined,
      tue: ((typeof(basic.programming.tuesday) !== 'string') && FwDayProg_to_DayProg(basic.programming.tuesday)) || undefined,
      wed: ((typeof(basic.programming.wednesday) !== 'string') && FwDayProg_to_DayProg(basic.programming.wednesday)) || undefined,
      thu: ((typeof(basic.programming.thursday) !== 'string') && FwDayProg_to_DayProg(basic.programming.thursday)) || undefined,
      fri: ((typeof(basic.programming.friday) !== 'string') && FwDayProg_to_DayProg(basic.programming.friday)) || undefined,
      sat: ((typeof(basic.programming.saturday) !== 'string') && FwDayProg_to_DayProg(basic.programming.saturday)) || undefined,
      sun: ((typeof(basic.programming.sunday) !== 'string') && FwDayProg_to_DayProg(basic.programming.sunday)) || undefined,
    },
    ventTime: {
      begin: (basic.ventilation && Number(basic.ventilation)) || 0,
      end: (basic.ventilation_end && Number(basic.ventilation_end)) || 0,
    },
  };
}

export function checkFullProgV4 (fullProg: FullProg_v4): FullProg_v4 {
  if (!fullProg) throw Error('Programação não informada');
  if (!fullProg.week) throw Error('Programação inválida, faltou "week"');
  const response: FullProg_v4 = { version: 'v4', week: {} };
  {
    const days: (keyof FullProg_v4['week'])[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const day of days) {
      const dayProg = fullProg.week[day];
      if (!dayProg) continue;
      if (dayProg.clearProg) {
        dayProg.start = '00:00';
        dayProg.end = '23:59';
      }
      if (!DayProg_to_PeriodData(dayProg, day)) throw Error(`Programação inválida para o dia ${day}`);
      response.week[day] = { permission: dayProg.permission, start: dayProg.start, end: dayProg.end, clearProg: dayProg.clearProg };
    }
  }
  if (fullProg.exceptions) {
    for (const day of Object.keys(fullProg.exceptions)) {
      const dayProg = fullProg.exceptions[day];
      if (!dayProg) continue;
      if (dayProg.clearProg) {
        dayProg.start = '00:00';
        dayProg.end = '23:59';
      }
      if (!DayProg_to_PeriodData(dayProg, day)) throw Error(`Programação inválida para o dia ${day}`);
      if (!response.exceptions) response.exceptions = {};
      response.exceptions[day] = { permission: dayProg.permission, start: dayProg.start, end: dayProg.end, clearProg: dayProg.clearProg };
    }
  }
  if (fullProg.ventTime) {
    response.ventTime = {
      begin: (fullProg.ventTime.begin && Number(fullProg.ventTime.begin)) || 0,
      end: (fullProg.ventTime.end && Number(fullProg.ventTime.end)) || 0,
    };
  }
  if (fullProg.temprtControl) {
    if ((fullProg.temprtControl.mode != null) && !['0_NO_CONTROL', '1_CONTROL', '2_SOB_DEMANDA', '3_BACKUP', '4_BLOCKED', '5_BACKUP_CONTROL', '6_BACKUP_CONTROL_V2', '7_FORCED', '8_ECO_2'].includes(fullProg.temprtControl.mode)) {
      throw Error('Modo de controle inválido');
    }
    if (fullProg.temprtControl.temperature == null) { } // OK
    else if ((typeof fullProg.temprtControl.temperature !== 'number') || !Number.isFinite(fullProg.temprtControl.temperature)) {
      throw Error('Setpoint de temperatura inválido');
    }
    if (fullProg.temprtControl.LTC == null) { } // OK
    else if ((typeof fullProg.temprtControl.LTC !== 'number') || !Number.isFinite(fullProg.temprtControl.LTC)) {
      throw Error('Limiar de Temperatura Crítico inválido');
    }    
    if (fullProg.temprtControl.LTI == null) {
      // OK
    } 
    else if ((typeof fullProg.temprtControl.LTI !== 'number') || !Number.isFinite(fullProg.temprtControl.LTI)) {
      throw Error('Limiar de Temperatura Inferior inválido');
    }
    if (fullProg.temprtControl.hist_sup == null) {
      // OK
    } 
    else if ((typeof fullProg.temprtControl.hist_sup !== 'number') || !Number.isFinite(fullProg.temprtControl.hist_sup)) {
      throw Error('Limiar de Temperatura Inferior inválido');
    }
    if (fullProg.temprtControl.hist_inf == null) {
      // OK
    } 
    else if ((typeof fullProg.temprtControl.hist_inf !== 'number') || !Number.isFinite(fullProg.temprtControl.hist_inf)) {
      throw Error('Limiar de Temperatura Inferior inválido');
    }
    response.temprtControl = {
      mode: fullProg.temprtControl.mode,
      temperature: fullProg.temprtControl.temperature,
      LTC: fullProg.temprtControl.LTC,
      LTI: fullProg.temprtControl.LTI,
    };

    if (fullProg.temprtControl.hist_sup != null) {
      response.temprtControl.hist_sup = fullProg.temprtControl.hist_sup;
    }
    if (fullProg.temprtControl.hist_inf != null) {
      response.temprtControl.hist_inf = fullProg.temprtControl.hist_inf;
    }
  }
  return response;
}

export function mergeScheds (base: FullProg_v4, newSched: FullProg_v4): FullProg_v4 {
  if (!base) base = { version: 'v4', week: {} };
  if (!newSched) newSched = { version: 'v4', week: {} };
  Object.assign(base.week, newSched.week);
  if (base.exceptions || newSched.exceptions) {
    if (!base.exceptions) base.exceptions = newSched.exceptions;
    else Object.assign(base.exceptions, newSched.exceptions || {});
  }
  if (base.ventTime || newSched.ventTime) {
    if (!base.ventTime) base.ventTime = newSched.ventTime;
    else Object.assign(base.ventTime, newSched.ventTime || {});
  }
  if (base.temprtControl || newSched.temprtControl) {
    if (!base.temprtControl) base.temprtControl = newSched.temprtControl;
    else Object.assign(base.temprtControl, newSched.temprtControl || {});
  }
  return checkFullProgV4(base);
}

export function mergeProgramming (fullProg: FullProg_v4, basic: MsgDamProgBasic, msgExc: MsgDamProgExcepts): FullProg_v4 {
  if (basic) {
    fullProg = MsgDamProgBasic_to_FullProgV4(basic);
  }
  if (fullProg && msgExc && msgExc.exceptions) {
    for (const [day, dayProgInfo] of Object.entries(msgExc.exceptions)) {
      if (!rgxDate.test(day)) continue;
      const dayProgDesc = FwDayProg_to_DayProg(dayProgInfo);
      if (dayProgDesc) {
        if (!fullProg.exceptions) fullProg.exceptions = {};
        fullProg.exceptions[day] = dayProgDesc;
      }
    }
  }

  return fullProg;
}

export function getDamDaySchedChart_s (LASTPROG: string, day: string) {
  // damFreshInf.LASTPROG, reqParams.day
  let daySched = undefined;
  let schedChart = { v: [], c: [] } as {
    v: string[];
    c: number[];
  };
  const fullProg = LASTPROG && parseFullProgV4(LASTPROG);
  const daySchedData = fullProg && getDayPeriod(fullProg, day);
  if (daySchedData) {
    daySched = {
      type: daySchedData.permission,
      startHM: daySchedData.start,
      endHM: daySchedData.end,
      indexIni: daySchedData.indexIni,
      indexEnd: daySchedData.indexEnd,
    };
    if ((daySchedData.indexIni != null) && (daySchedData.indexEnd > daySchedData.indexIni)) {
      const inProg = daySchedData.permission;
      const outProg = (inProg === 'allow') ? 'forbid' : (inProg === 'forbid') ? 'allow' : null;
      if (daySchedData.indexIni > 0) {
        schedChart.c.push(daySchedData.indexIni * 60);
        schedChart.v.push(outProg);
      }
      schedChart.c.push((daySchedData.indexEnd - daySchedData.indexIni + 1) * 60);
      schedChart.v.push(inProg);
      if (daySchedData.indexEnd < 1439) {
        schedChart.c.push((1439 - daySchedData.indexEnd) * 60);
        schedChart.v.push(outProg);
      }
    }
  }
  return { daySched, schedChart };
}

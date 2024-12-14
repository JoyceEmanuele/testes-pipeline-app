import {
  MsgDamProgBasic,
  MsgDamProgExcepts,
  DutMsg_TemperatureControlState,
} from '../../srcCommon/types/devicesMessages'
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import { mergeProgramming } from '../../srcCommon/helpers/scheduleData';
import { ControlMode } from '../helpers/dutAutomation';
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import {
  requestDevSchedule,
} from '../../srcCommon/iotMessages/devsCommands'
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands'
import sqldb from '../db'
import { DayProg } from '../types/api-private';

async function requestFullDutProg(devId: string, userId: string) {
  let progComplete: FullProg_v4 = null;
  let tempControl: DutMsg_TemperatureControlState = null;
  let tempProg: FullProg_v4 & { numExceptions?: number } = null;

  const promise = iotMessageListener.waitForDutControl((payload) => {
    if (!payload) return false;
    if (payload.dev_id !== devId) return false;

    const payloadAsProg = payload as MsgDamProgBasic;
    const payloadAsExcepts = payload as MsgDamProgExcepts;

    if (payloadAsProg.message_type === 'programming') {
      tempProg = mergeProgramming(null, payloadAsProg, null)
      tempProg.numExceptions = payloadAsProg.exceptions;
      delete payloadAsProg.exceptions;

      const complete = (!!tempProg) && (Object.keys(tempProg.exceptions || {}).length >= tempProg.numExceptions);
      if (complete) progComplete = tempProg;
    }
    else if (payloadAsExcepts.message_type === 'exceptions') {
      tempProg = mergeProgramming(tempProg, null, payloadAsExcepts);

      const complete = (!!tempProg) && (Object.keys(tempProg.exceptions || {}).length >= tempProg.numExceptions);
      if (complete) progComplete = tempProg;
    }
    else if ((payload as DutMsg_TemperatureControlState).msgtype === 'temperature-control-state') {
      tempControl = payload as DutMsg_TemperatureControlState;
    }
    else {
      return false;
    }

    return !!(progComplete && tempControl);
  }, 5000)

  requestDevSchedule(devId, userId);
  devsCommands.sendDutCommand(devId, { msgtype: "get-temperature-control-state" }, userId);  
  await promise;

  return { progComplete, tempControl };
}

export async function collectFullDutProg(reqParams: { devId: string, userId: string }): Promise<FullProg_v4> {
  const { devId, userId } = reqParams;
  
  let { progComplete, tempControl } = await requestFullDutProg(devId, userId);

  progComplete.temprtControl = {
    mode: tempControl.ctrl_mode,
    temperature: tempControl.setpoint,
    LTC: tempControl.LTC,
    LTI: tempControl.LTI
  };

  if (tempControl.ctrl_mode === '8_ECO_2') {
    progComplete.temprtControl.hist_sup = tempControl.hist_sup;
    progComplete.temprtControl.hist_inf = tempControl.hist_inf;
  }

  if ((!progComplete.temprtControl.mode) && (progComplete.temprtControl.temperature === -99)) {
    progComplete.temprtControl.mode = '0_NO_CONTROL';
  }

  if (!progComplete.temprtControl.mode) {
    delete progComplete.temprtControl;
  }

  return progComplete;
}

function compareIncludeDayProg(key: string, value: DayProg, comparisonValue: Record<string, DayProg>) {
  return !!comparisonValue[key] &&
    comparisonValue[key].end === value.end &&
    comparisonValue[key].start === value.start &&
    comparisonValue[key].permission === value.permission;
}

function compareNotIncludeDayProg(key: string, value: DayProg, comparisonValue: Record<string, DayProg>) {
  return !comparisonValue[key] ||
    comparisonValue[key].end !== value.end ||
    comparisonValue[key].start !== value.start ||
    comparisonValue[key].permission !== value.permission;
}


export function compareDutProg(desiredProg: FullProg_v4, newProg: FullProg_v4) {
  const desiredWeekEntries = Object.entries(desiredProg.week);
  const desiredWeek = desiredWeekEntries.filter(([, value]) => !value.clearProg);
  const deletedWeek = desiredWeekEntries.filter(([, value]) => value.clearProg);

  const desiredExceptionEntries = Object.entries(desiredProg.exceptions);
  const desiredExceptions = desiredExceptionEntries.filter(([, value]) => !value.clearProg);
  const deletedExceptions = desiredExceptionEntries.filter(([, value]) => value.clearProg);

  const comparisons = [
    desiredWeek.every(
      ([key, value]) => compareIncludeDayProg(key, value, newProg.week || {})
    ),
    deletedWeek.every(
      ([key]) => !newProg.week[key as keyof typeof newProg.week]
    ),
    desiredExceptions.every(
      ([key, value]) => compareIncludeDayProg(key, value, newProg.exceptions || {})
    ),
    deletedExceptions.every(
      ([key, value]) => compareNotIncludeDayProg(key, value, newProg.exceptions || {})
    )
  ];

  if (comparisons.every((comparison) => comparison)) {
    return;
  }

  throw Error(`Dispositivo não configurado. - desiredProg: ${JSON.stringify(desiredProg)}, newProg: ${JSON.stringify(newProg)}`).HttpStatus(400);
}

export function buildObjectSchedules(dutSchedules: Awaited<ReturnType<typeof sqldb.DUTS_SCHEDULES.getDutScheds>>) {
  const dutsSchedulesObject = dutSchedules.map(item => ({
    DUT_SCHEDULE_ID: item.DUT_SCHEDULE_ID,
    DUT_AUTOMATION_PARAMETERS_ID: item.DUT_AUTOMATION_PARAMETERS_ID,
    SCHEDULE_STATUS: item.SCHEDULE_STATUS === '1',
    SCHEDULE_TITLE: item.SCHEDULE_TITLE,
    BEGIN_TIME: item.BEGIN_TIME,
    END_TIME: item.END_TIME,
    CTRLOPER: item.CTRLOPER as ControlMode,
    PERMISSION: item.PERMISSION,
    DAYS: JSON.parse(item.DAYS) as {
      mon: boolean
      tue: boolean
      wed: boolean
      thu: boolean
      fri: boolean
      sat: boolean
      sun: boolean
    },
    SETPOINT: item.SETPOINT,
    LTC: item.LTC,
    LTI: item.LTI,
    UPPER_HYSTERESIS: item.UPPER_HYSTERESIS, 
    LOWER_HYSTERESIS: item.LOWER_HYSTERESIS,
    SCHEDULE_START_BEHAVIOR: item.SCHEDULE_START_BEHAVIOR,
    SCHEDULE_END_BEHAVIOR: item.SCHEDULE_END_BEHAVIOR,
    FORCED_BEHAVIOR: item.FORCED_BEHAVIOR,
    IR_ID_COOL: item.IR_ID_COOL,
    ACTION_MODE: item.ACTION_MODE,
    ACTION_TIME: item.ACTION_TIME,
    ACTION_POST_BEHAVIOR: item.ACTION_POST_BEHAVIOR,
    CURRENT_IN_DUT: item.CURRENT_IN_DUT === '1',
  }));

  return dutsSchedulesObject;
}
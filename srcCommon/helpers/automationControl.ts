import {
  DamMessage_SetProgramming,
  DamMessage_EraseProgramming,
  DamMessage_SetException,
  DamMessage_EraseException,
  DamMessage_SetVentilation,
  DutCmd_SetTemperatureControl,
  DutCmd_GetTemperatureControlState,
  DutCmd_SetV3Control,
  DutCmd_ForcedParams,
} from '../types/devicesCommands'
import {
  parseFullProgV4,
  FullProg_v4,
  isDayProgEqual,
  checkFullProgV4,
  mergeScheds,
} from './scheduleData'
import sqldb from '../db'
import {
  sendDamCommand_sched,
  ScheduleCommand,
} from '../iotMessages/devsCommands'
import { lastDayComplete_YMD } from './dates'
import { logger } from './logger'
import jsonTryParse from './jsonTryParse'
import { getOffsetDevCode } from './timezones'

export async function sendDevSchedule (devId: string, commands: ScheduleCommand[], userId: string, motivo: string) {
  if (commands.length > 0) {
    logger.info(`Atualizando a programação do ${devId}, motivo: ${motivo} ${userId}`);
  }
  for (const command of commands) {
    sendDamCommand_sched(devId, command, userId);
    await new Promise((r) => setTimeout(r, 500))
  }
}


export async function saveDesiredprogDAM (devId: string, DESIREDPROG: FullProg_v4, userId: string) {
  let fullProg: FullProg_v4;
  try {
    fullProg = checkFullProgV4(DESIREDPROG);
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 461'}`);
    throw Error((err && (err as Error).message) || 'ERROR 461').HttpStatus(400);
  }
  const offset = await getOffsetDevCode(devId);
  delete fullProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
  if (currentAutomationId) {
    await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
      ID: currentAutomationId.ID,
      DESIRED_PROG: JSON.stringify(fullProg),
      ...(!currentAutomationId.FIRST_PROGRAMMING_DATE && { FIRST_PROGRAMMING_DATE: new Date(Date.now() + offset * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) })
    }, userId);
  }
}

export async function saveDesiredprogDAM_v2 (devId: string, DESIREDPROG: FullProg_v4, userId: string) {
  let desiredProg;
  try {
    desiredProg = checkFullProgV4(DESIREDPROG);
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 461'}`);
    throw Error((err && (err as Error).message) || 'ERROR 461').HttpStatus(400);
  }

  const { LASTPROG } = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId });

  if (!LASTPROG) {
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        DESIRED_PROG: JSON.stringify(desiredProg),
      }, userId);
    }
  } else {
    const fullProg = jsonTryParse(LASTPROG) as FullProg_v4;

    for (const key of Object.keys(desiredProg.week)) {
      const day = key as keyof FullProg_v4['week'];
      if (desiredProg.week[day]) {
        if (desiredProg.week[day].clearProg) delete fullProg.week[day];
        else {
          delete desiredProg.week[day].clearProg;
          fullProg.week[day] = desiredProg.week[day];
        }
      }
    }

    if (desiredProg.exceptions) {
      fullProg.exceptions = {};
      for (const key of Object.keys(desiredProg.exceptions)) {
        const day = key as keyof FullProg_v4['exceptions'];
        if (desiredProg.exceptions[day]) {
          if (desiredProg.exceptions[day].clearProg) delete fullProg.exceptions[day];
          else {
            delete desiredProg.exceptions[day].clearProg;
            fullProg.exceptions[day] = desiredProg.exceptions[day];
          }
        }
      }
    }

    if (desiredProg.ventTime) fullProg.ventTime = desiredProg.ventTime;

    delete fullProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
        ID: currentAutomationId.ID,
        DESIRED_PROG: JSON.stringify(fullProg),
      }, userId);
    }
  }
}

export async function saveDesiredprogDUT (devId: string, DESIREDPROG: FullProg_v4, userId: string) {
  let fullProg: FullProg_v4;
  try {
    fullProg = checkFullProgV4(DESIREDPROG);
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 471'}`);
    throw Error((err && (err as Error).message) || 'ERROR 471').HttpStatus(400);
  }

  delete fullProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
  if (currentAutomationId) {
    await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationId.ID, DESIRED_PROG: JSON.stringify(fullProg)}, userId);
  }
}

export async function saveDesiredprogDUT_v2 (devId: string, DESIREDPROG: FullProg_v4, userId: string) {
  let desiredProg;
  try {
    desiredProg = checkFullProgV4(DESIREDPROG);
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 471'}`);
    throw Error((err && (err as Error).message) || 'ERROR 471').HttpStatus(400);
  }

  const { LASTPROG } = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });

  if (!LASTPROG) {
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationId.ID, DESIRED_PROG: JSON.stringify(desiredProg)}, userId);
    }
  } else {
    const fullProg = jsonTryParse(LASTPROG) as FullProg_v4;

    for (const key of Object.keys(desiredProg.week)) {
      const day = key as keyof FullProg_v4['week'];
      if (desiredProg.week[day]) {
        if (desiredProg.week[day].clearProg) delete fullProg.week[day];
        else {
          delete desiredProg.week[day].clearProg;
          fullProg.week[day] = desiredProg.week[day];
        }
      }
    }

    if (desiredProg.exceptions) {
      fullProg.exceptions = {};
      for (const key of Object.keys(desiredProg.exceptions)) {
        const day = key as keyof FullProg_v4['exceptions'];
        if (desiredProg.exceptions[day]) {
          if (desiredProg.exceptions[day].clearProg) delete fullProg.exceptions[day];
          else {
            delete desiredProg.exceptions[day].clearProg;
            fullProg.exceptions[day] = desiredProg.exceptions[day];
          }
        }
      }
    }

    delete fullProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
    const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
    if (currentAutomationId) {
      await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationId.ID, DESIRED_PROG: JSON.stringify(fullProg)}, userId);
    }
  }
}

export async function sendDamScheduleCommands (USEPERIOD: string, damIds: string[], userId: string) {
  if (!USEPERIOD) return;
  if (!damIds.length) return;
  const desiredProg = parseFullProgV4(USEPERIOD);
  const promises = damIds.map((damId) => {
    return Promise.resolve().then(async () => {
      await saveDesiredprogDAM(damId, desiredProg, userId);
    })
  })
  await Promise.all(promises);
}

export async function checkDevPendingSched (devId: string, userId: string) {
  try {
    const devInf = await sqldb.DEVICES.getDevSchedInfo({ DEV_ID: devId });
    if (!devInf) return;
    if (devInf.AS_DAC && (devInf.DAM_DISAB !== 0)) return;
    if (devInf.DUTAUT_DISAB === 1) return;
    if (devInf.DAM_DESIREDPROG) {
      if (devInf.DAM_LASTPROG !== devInf.DAM_DESIREDPROG) {
        const currentProg = parseFullProgV4(devInf.DAM_LASTPROG);
        const desiredProg = parseFullProgV4(devInf.DAM_DESIREDPROG);
        delete desiredProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
        const commands = adjustSchedule(desiredProg, currentProg, true, null);
        await sendDevSchedule(devId, commands, userId, 'DESIREDPROG');
      }
    }
    if (devInf.DUT_DESIREDPROG) {
      if (devInf.DUT_LASTPROG !== devInf.DUT_DESIREDPROG) {
        const currentProg = parseFullProgV4(devInf.DUT_LASTPROG);
        const desiredProg = parseFullProgV4(devInf.DUT_DESIREDPROG);
        delete desiredProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
        const commands = adjustSchedule_v2(desiredProg, currentProg, true, devInf.DUTAUT_DISAB);
        await sendDevSchedule(devId, commands, userId, 'DESIREDPROG');
      }
    }
  } catch (err) { logger.error(err); }
}

export function adjustSchedule (requiredProg: FullProg_v4, currentProg: FullProg_v4, ignoreOldExceptions: boolean, dutAutDisab: number|null): ScheduleCommand[] {
  const modeConv: { [k: string]: 'Enabled'|'Disabled' } = {
    'allow': 'Enabled',
    'forbid': 'Disabled',
    'enabled': 'Enabled',
    'disabled': 'Disabled',
    'Enabled': 'Enabled',
    'Disabled': 'Disabled',
  };
  const list: ScheduleCommand[] = [];

  if (!requiredProg.week) requiredProg.week = {};
  if (!requiredProg.exceptions) requiredProg.exceptions = {};
  if (!currentProg.week) currentProg.week = {};
  if (!currentProg.exceptions) currentProg.exceptions = {};

  for (const key of Object.keys(currentProg.week)) {
    const day = key as keyof FullProg_v4['week'];
    if (currentProg.week[day] && !requiredProg.week[day]) {
      // remove weekday sched
      const command: DamMessage_EraseProgramming = {
        ['erase-programming']: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day),
      };
      list.push(command);
    }
  }

  for (const day of Object.keys(currentProg.exceptions)) {
    if (currentProg.exceptions[day] && !requiredProg.exceptions[day]) {
      // remove exception
      const command: DamMessage_EraseException = {
        ['erase-exception']: {
          date: { day: Number(day.substr(8, 2)), month: Number(day.substr(5, 2)), year: Number(day.substr(0, 4)) }
        }
      };
      list.push(command);
    }
  }

  for (const key of Object.keys(requiredProg.week)) {
    const day = key as keyof FullProg_v4['week'];
    if (!isDayProgEqual(currentProg.week[day], requiredProg.week[day])) {
      // set weekday sched
      const periodData = requiredProg.week[day];
      if (!periodData) continue;
      const command: DamMessage_SetProgramming = {
        begin: { hours: Number(periodData.start.substr(0, 2)), minutes: Number(periodData.start.substr(3, 2)) },
        end: { hours: Number(periodData.end.substr(0, 2)), minutes: Number(periodData.end.substr(3, 2)) },
        type: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day),
        command: modeConv[periodData.permission]
      };
      list.push(command);
    }
  }

  const yesterday = lastDayComplete_YMD();
  for (const day of Object.keys(requiredProg.exceptions)) {
    if (ignoreOldExceptions && (day < yesterday)) continue;
    if (!isDayProgEqual(currentProg.exceptions[day], requiredProg.exceptions[day])) {
      // set exception
      const periodData = requiredProg.exceptions[day];
      const command: DamMessage_SetException = {
        exception: {
          date: { day: Number(day.substr(8, 2)), month: Number(day.substr(5, 2)), year: Number(day.substr(0, 4)) },
          programming: {
            begin: { hours: Number(periodData.start.substr(0, 2)), minutes: Number(periodData.start.substr(3, 2)) },
            end: { hours: Number(periodData.end.substr(0, 2)), minutes: Number(periodData.end.substr(3, 2)) },
            command: modeConv[periodData.permission]
          }
        }
      };
      list.push(command);
    }
  }

  if (requiredProg.ventTime) {
    if ((!currentProg.ventTime) || ((requiredProg.ventTime.begin || 0) !== (currentProg.ventTime.begin)) || ((requiredProg.ventTime.end || 0) !== (currentProg.ventTime.end))) {
      const command: DamMessage_SetVentilation = {
        ventilation: (requiredProg.ventTime.begin || 0),
        ventilation_end: (requiredProg.ventTime.end || 0),
      };
      list.push(command);
    }
  }

  if (requiredProg.temprtControl !== undefined) {
    let mode = 0;
    switch(requiredProg.temprtControl.mode) {
      case '1_CONTROL': { mode = 1; break; }
      case '2_SOB_DEMANDA': { mode = 2; break; }
      case '3_BACKUP': { mode = 3; break; }
      case '4_BLOCKED': { mode = 4; break; }
      case '5_BACKUP_CONTROL': { mode = 5; break; }
      case '6_BACKUP_CONTROL_V2': { mode = 6; break; }
      case '7_FORCED': { mode = 7; break; }
      case '8_ECO_2': { mode = 8; break; }
    }
    let needUpdate = false;
    if (!currentProg.temprtControl) { needUpdate = true; }
    else if (requiredProg.temprtControl.mode != null && currentProg.temprtControl.mode !== requiredProg.temprtControl.mode) { needUpdate = true; }
    else if (requiredProg.temprtControl.temperature != null && currentProg.temprtControl.temperature !== requiredProg.temprtControl.temperature) { needUpdate = true; }
    else if (requiredProg.temprtControl.LTC != null && currentProg.temprtControl.LTC !== requiredProg.temprtControl.LTC) { needUpdate = true; }
    else if (requiredProg.temprtControl.LTI != null && currentProg.temprtControl.LTI !== requiredProg.temprtControl.LTI) { needUpdate = true; }
    else if (requiredProg.temprtControl.hist_sup != null && currentProg.temprtControl.hist_sup !== requiredProg.temprtControl.hist_sup) { needUpdate = true; }
    else if (requiredProg.temprtControl.hist_inf != null && currentProg.temprtControl.hist_inf !== requiredProg.temprtControl.hist_inf) { needUpdate = true; }
    else if (requiredProg.temprtControl.action != null && currentProg.temprtControl.action !== requiredProg.temprtControl.action) { needUpdate = true; }
    else if (requiredProg.temprtControl.action_interval != null && currentProg.temprtControl.action_interval !== requiredProg.temprtControl.action_interval) { needUpdate = true; }
    else if (requiredProg.temprtControl.action_post != null && currentProg.temprtControl.action_post !== requiredProg.temprtControl.action_post) { needUpdate = true; }

    if (needUpdate) {
      if (mode !== 8){
        const command: DutCmd_SetTemperatureControl = {
          msgtype: 'set-temperature-control',
          mode,
          temperature: requiredProg.temprtControl.temperature,
          LTC: requiredProg.temprtControl.LTC,
          enabled: (dutAutDisab !== 1),
          LTI: requiredProg.temprtControl.LTI,
          action: requiredProg.temprtControl.action,
          action_interval: requiredProg.temprtControl.action_interval,
          action_post: requiredProg.temprtControl.action_post
        };
        if (mode === 7){
          delete command.temperature;
          delete command.LTC;
          delete command.enabled;
          delete command.LTI;
          delete command.action;
          delete command.action_interval;
          delete command.action_post;

          list.push(command);

          const commandForced: DutCmd_ForcedParams = {
            msgtype: 'set-lock-mode',
            mode: requiredProg.forced ? requiredProg.forced.forcedMode || 0 : 0,
          }
          list.push(commandForced);
        }
        else {
          list.push(command);
        }

        const command2: DutCmd_GetTemperatureControlState = {
          msgtype: 'get-temperature-control-state',
        };
        list.push(command2);
      }
      else {
        const command: DutCmd_SetV3Control = {
          msgtype: 'set-v3-control',
          mode,
          temperature: requiredProg.temprtControl.temperature,
          setpoint: requiredProg.temprtControl.temperature,
          LTC: requiredProg.temprtControl.LTC,
          LTI: requiredProg.temprtControl.LTI,
          enabled: true,
          hist_inf: requiredProg.temprtControl.hist_inf,
          hist_sup: requiredProg.temprtControl.hist_sup
        };
        list.push(command);
      }
    }
  }

  return list;
}


export function adjustSchedule_v2 (requiredProg: FullProg_v4, currentProg: FullProg_v4, ignoreOldExceptions: boolean, dutAutDisab: number|null): ScheduleCommand[] {
  const modeConv: { [k: string]: 'Enabled'|'Disabled' } = {
    'allow': 'Enabled',
    'forbid': 'Disabled',
    'enabled': 'Enabled',
    'disabled': 'Disabled',
    'Enabled': 'Enabled',
    'Disabled': 'Disabled',
  };
  const list: ScheduleCommand[] = [];

  if (!requiredProg.week) requiredProg.week = {};
  if (!requiredProg.exceptions) requiredProg.exceptions = {};
  if (!currentProg.week) currentProg.week = {};
  if (!currentProg.exceptions) currentProg.exceptions = {};

  for (const key of Object.keys(currentProg.week)) {
    const day = key as keyof FullProg_v4['week'];
    if (currentProg.week[day] && requiredProg.week[day]?.clearProg) {
      // remove weekday sched
      const command: DamMessage_EraseProgramming = {
        ['erase-programming']: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day),
      };
      list.push(command);
    }
  }

  for (const day of Object.keys(currentProg.exceptions)) {
    if (currentProg.exceptions[day] && requiredProg.exceptions[day]?.clearProg) {
      // remove exception
      const command: DamMessage_EraseException = {
        ['erase-exception']: {
          date: { day: Number(day.substr(8, 2)), month: Number(day.substr(5, 2)), year: Number(day.substr(0, 4)) }
        }
      };
      list.push(command);
    }
  }

  for (const key of Object.keys(requiredProg.week)) {
    const day = key as keyof FullProg_v4['week'];
    if (!isDayProgEqual(currentProg.week[day], requiredProg.week[day])) {
      // set weekday sched
      const periodData = requiredProg.week[day];
      if (!periodData) continue;
      if (periodData.clearProg) continue;
      const command: DamMessage_SetProgramming = {
        begin: { hours: Number(periodData.start.substr(0, 2)), minutes: Number(periodData.start.substr(3, 2)) },
        end: { hours: Number(periodData.end.substr(0, 2)), minutes: Number(periodData.end.substr(3, 2)) },
        type: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day),
        command: modeConv[periodData.permission]
      };
      list.push(command);
    }
  }

  const yesterday = lastDayComplete_YMD();
  for (const day of Object.keys(requiredProg.exceptions)) {
    if (ignoreOldExceptions && (day < yesterday)) continue;
    if (requiredProg.exceptions[day].clearProg) continue;
    if (!isDayProgEqual(currentProg.exceptions[day], requiredProg.exceptions[day])) {
      // set exception
      const periodData = requiredProg.exceptions[day];
      const command: DamMessage_SetException = {
        exception: {
          date: { day: Number(day.substr(8, 2)), month: Number(day.substr(5, 2)), year: Number(day.substr(0, 4)) },
          programming: {
            begin: { hours: Number(periodData.start.substr(0, 2)), minutes: Number(periodData.start.substr(3, 2)) },
            end: { hours: Number(periodData.end.substr(0, 2)), minutes: Number(periodData.end.substr(3, 2)) },
            command: modeConv[periodData.permission]
          }
        }
      };
      list.push(command);
    }
  }

  if (requiredProg.ventTime) {
    if ((!currentProg.ventTime) || ((requiredProg.ventTime.begin || 0) !== (currentProg.ventTime.begin)) || ((requiredProg.ventTime.end || 0) !== (currentProg.ventTime.end))) {
      const command: DamMessage_SetVentilation = {
        ventilation: (requiredProg.ventTime.begin || 0),
        ventilation_end: (requiredProg.ventTime.end || 0),
      };
      list.push(command);
    }
  }

  if (requiredProg.temprtControl !== undefined) {
    let mode = 0;
    switch(requiredProg.temprtControl.mode) {
      case '1_CONTROL': { mode = 1; break; }
      case '2_SOB_DEMANDA': { mode = 2; break; }
      case '3_BACKUP': { mode = 3; break; }
      case '4_BLOCKED': { mode = 4; break; }
      case '5_BACKUP_CONTROL': { mode = 5; break; }
      case '6_BACKUP_CONTROL_V2': { mode = 6; break; }
      case '7_FORCED': { mode = 7; break; }
      case '8_ECO_2': { mode = 8; break; }
    }
    let needUpdate = false;
    if (!currentProg.temprtControl) { needUpdate = true; }
    else if (requiredProg.temprtControl.mode != null && currentProg.temprtControl.mode !== requiredProg.temprtControl.mode) { needUpdate = true; }
    else if (requiredProg.temprtControl.temperature != null && currentProg.temprtControl.temperature !== requiredProg.temprtControl.temperature) { needUpdate = true; }
    else if (requiredProg.temprtControl.LTC != null && currentProg.temprtControl.LTC !== requiredProg.temprtControl.LTC) { needUpdate = true; }
    else if (requiredProg.temprtControl.LTI != null && currentProg.temprtControl.LTI !== requiredProg.temprtControl.LTI) { needUpdate = true; }
    else if (requiredProg.temprtControl.hist_sup != null && currentProg.temprtControl.hist_sup !== requiredProg.temprtControl.hist_sup) { needUpdate = true; }
    else if (requiredProg.temprtControl.hist_inf != null && currentProg.temprtControl.hist_inf !== requiredProg.temprtControl.hist_inf) { needUpdate = true; }
    else if (requiredProg.temprtControl.action != null && currentProg.temprtControl.action !== requiredProg.temprtControl.action) { needUpdate = true; }
    else if (requiredProg.temprtControl.action_interval != null && currentProg.temprtControl.action_interval !== requiredProg.temprtControl.action_interval) { needUpdate = true; }
    else if (requiredProg.temprtControl.action_post != null && currentProg.temprtControl.action_post !== requiredProg.temprtControl.action_post) { needUpdate = true; }

    if (needUpdate) {
      if (mode !== 8){
        const command: DutCmd_SetTemperatureControl = {
          msgtype: 'set-temperature-control',
          mode,
          temperature: requiredProg.temprtControl.temperature,
          LTC: requiredProg.temprtControl.LTC,
          enabled: (dutAutDisab !== 1),
          LTI: requiredProg.temprtControl.LTI,
          action: requiredProg.temprtControl.action,
          action_interval: requiredProg.temprtControl.action_interval,
          action_post: requiredProg.temprtControl.action_post
        };
        
        if (mode === 7){
          delete command.temperature;
          delete command.LTC;
          delete command.enabled;
          delete command.LTI;
          delete command.action;
          delete command.action_interval;
          delete command.action_post;
          list.push(command);

          const commandForced: DutCmd_ForcedParams = {
            msgtype: 'set-lock-mode',
            mode: requiredProg.forced ? requiredProg.forced.forcedMode || 0 : 0,
          }
          list.push(commandForced);
        }
        else {
          list.push(command);
        }
        
        const command2: DutCmd_GetTemperatureControlState = {
          msgtype: 'get-temperature-control-state',
        };
        list.push(command2);
      }
      else {
        const command: DutCmd_SetV3Control = {
          msgtype: 'set-v3-control',
          mode,
          temperature: requiredProg.temprtControl.temperature,
          setpoint: requiredProg.temprtControl.temperature,
          LTC: requiredProg.temprtControl.LTC,
          LTI: requiredProg.temprtControl.LTI,
          enabled: true,
          hist_inf: requiredProg.temprtControl.hist_inf,
          hist_sup: requiredProg.temprtControl.hist_sup
        };
        list.push(command);
      }
    }
  }

  return list;
}

export async function updateDesiredProgDUT(devId: string, newProg: FullProg_v4, userId: string) {
  const dutInf = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });
  let desired = parseFullProgV4(dutInf.DESIREDPROG);
  desired = mergeScheds(desired, newProg);
  await saveDesiredprogDUT(devId, desired, userId);
}

export function verifyDutMultScheduleByDay(dutScheds: Awaited<ReturnType<typeof sqldb.DUTS_SCHEDULES.getDutScheds>>) {
  if (!dutScheds.length) return null;
  const dayCount = {
    sun: 0,
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
  };

  for (const sched of dutScheds) {
    const daysObj = JSON.parse(sched.DAYS) || {};

    for (const day in daysObj) {
      if (daysObj[day]) {
        dayCount[day as keyof typeof dayCount]++;
      }
    }
  }

  return {
    sun: dayCount.sun > 1,
    mon: dayCount.mon > 1,
    tue: dayCount.tue > 1,
    wed: dayCount.wed > 1,
    thu: dayCount.thu > 1,
    fri: dayCount.fri > 1,
    sat: dayCount.sat > 1,
  };
}

import sqldb from '../srcCommon/db';
import * as moment from 'moment';
import { parseFirmwareVersion } from '../srcCommon/helpers/fwVersion';
import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener';
import * as devsCommands from '../srcCommon/iotMessages/devsCommands';
import { DriProg, DriVarsConfig, WSListener } from '../srcCommon/types';
import { ControlMsgDAL, ControlMsgDRI, MsgDamGetExceptions, MsgDamGetScheduler, MsgDamScheduler } from '../srcCommon/types/devicesMessages';
import { formatISODate } from '../srcCommon/helpers/dates';
import { getAutomationDriCommandsByProg } from './dri/driAutomation';
import { logger } from '../srcCommon/helpers/logger';
import { DamCommand } from '../srcCommon/types/devicesCommands';

const weekDays = {
  'sun': 'sunday',
  'mon': 'monday',
  'tue': 'tuesday',
  'wed': 'wednesday',
  'thu': 'thursday',
  'fri': 'friday',
  'sat': 'saturday',
} as { [day: string]: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' }

interface DaySched {
  start: string,
  end: string,
  mode: string[],
}

interface Schedule {
  defaultMode: string[],
  days: {
    'sunday': DaySched[],
    'monday': DaySched[],
    'tuesday': DaySched[],
    'wednesday': DaySched[],
    'thursday': DaySched[],
    'friday': DaySched[],
    'saturday': DaySched[],
  }
}

class SchedulerWeek {
  machineScheduler: {
    [machine: number]: Schedule,
  }
  constructor(numberOfMachines: number) {
    this.machineScheduler = {};
    for (let i = 0; i < numberOfMachines; i++) {
      this.getOrCreateMachineScheduler(i);
    }
  }

  getOrCreateMachineScheduler(machineId: number) {
    if (!this.machineScheduler[machineId]) {
      return this.machineScheduler[machineId] = {
        defaultMode: [],
        days: {
          'sunday': [],
          'monday': [],
          'tuesday': [],
          'wednesday': [],
          'thursday': [],
          'friday': [],
          'saturday': [],
        }
      };
    }
    return this.machineScheduler[machineId];
  }
}

class SchedulerExceptions {
  machineExceptions: {
    [machine: number]: SchedulerExceptionJSON,
  }
  constructor(numberOfMachines: number) {
    this.machineExceptions = {};
    for (let i = 0; i < numberOfMachines; i++) {
      this.getOrCreateMachineException(i);
    }
  }

  getOrCreateMachineException(machineId: number) {
    if (!this.machineExceptions[machineId]) {
      return this.machineExceptions[machineId] = {
        msgtype: 'set-scheduler-exceptions',
        machine: machineId,
        exceptions: {},
      }
    }

    return this.machineExceptions[machineId];
  }
}

export interface SchedulerWeekJSON {
  msgtype: 'set-scheduler-week',
  machine: number,
  days: string[],
  default_mode: string[],
  schedule: DaySched[],
}

export interface SchedulerExceptionJSON {
  msgtype: "set-scheduler-exceptions";
  machine: number;
  exceptions: {
    [date: string]: {
      default_mode: string[];
      schedule: DaySched[];
    };
  };
}

function addMinutes(hour: string, minutes: number) {
  const [h, m] = hour.split(':');
  const now = moment();
  now.set({ hour: Number(h), minutes: Number(m) })
  now.add(minutes, 'minutes');

  return now.format('HH:mm');
}

function checkAdjustSchedConvergence(
  currentScheds: DaySched[],
  newSched: DaySched,
) {
  const convergence = currentScheds.find((x) => (
    (newSched.start >= x.start && newSched.start <= x.end)
    ||
    (newSched.end >= x.start && newSched.end <= x.end))
  );
  if (convergence) {
    // Verifica se a convergência é sequencial e ajusta, senão gera erro
    if (convergence.start === newSched.end) {
      newSched.end = addMinutes(newSched.end, -1);
    }
    else if (newSched.start === convergence.end) {
      convergence.end = addMinutes(convergence.end, -1);
    } else {
      throw new Error('Há programações sobrepostas');
    }
  }
}

function getFwVersion(sched: { CURRFW_VERS: string }) {
  const fwVersionRaw = sched.CURRFW_VERS ? sched.CURRFW_VERS : '';
  return parseFirmwareVersion(fwVersionRaw);
}

export async function parseDamCardsToScheduler(devId: string) {
  const scheds = await sqldb.DAM_SCHEDULES.getActiveSchedsWithFwVersion({ DAM_ID: devId });
  const fwVersion = getFwVersion(scheds[0]);
  if (!fwVersion || fwVersion.vMajor < 3) { return; } // Versão de DAM não compatível com o Firmware Scheduler
  const { week, exceptions } = await parseDamSchedCards(scheds);
}

/*
export async function parseDutCardsToScheduler(devId: string) {
  const scheds = await sqldb.DUTS_SCHEDULES.getActiveSchedsWithFwVersion({ DUT_ID: devId });
  const exceptionScheds = await sqldb.DUTS_EXCEPTIONS.getActiveSchedsWithFwVersion({ DUT_ID: devId });
  const fwVersion = getFwVersion(scheds[0]);
  if (!fwVersion || fwVersion.vMajor < 3) { return; } // Versão de DUT não compatível com o Firmware Scheduler
  const { week, exceptions } = await parseDutSchedCards(scheds, exceptionScheds);
}

async function parseDriCardsToScheduler(devId: string) {
  const scheds = await sqldb.DRISCHEDS.getActiveSchedsWithFwVersion({ DRI_ID: devId });
  const fwVersion = getFwVersion(scheds[0]);
  if (!fwVersion
    || !(versionIsAtLeast(fwVersion, 3, 3, 0) && fwVersion.vMajor < 4)
    || !versionIsAtLeast(fwVersion, 4, 1, 0)
  ) { return; } // Versão de DRI não compatível com o Firmware Scheduler
  const { week, exceptions } = await parseDriSchedCards(scheds);
}
*/

export async function parseCurrentDalCardsToScheduler(devId: string, userId: string, illuminationId?: number, hasProgToEdit?: boolean, hasExceptToEdit?: boolean) {
  const scheds = await sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion({ DAL_CODE: devId, ILLUMINATION_ID: illuminationId });
  const exceptionScheds = await sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion({ DAL_CODE: devId, ILLUMINATION_ID: illuminationId });

  await sendDalCardsToScheduler(
    devId, userId, { schedules: scheds, exceptions: exceptionScheds }, illuminationId, hasProgToEdit, hasExceptToEdit
  );
}

export async function sendDalCardsToScheduler(
  devId: string,
  userId: string,
  cards: {
    schedules: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>>,
    exceptions: Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>>
  },
  illuminationId?: number, hasProgToEdit?: boolean, hasExceptToEdit?: boolean
) {
  // TODO - Adicionar restrição de firmware
  // const fwVersion = getFwVersion(scheds[0]);
  // if (!fwVersion || fwVersion.vMajor < 3) { throw Error('Versão de DAL não compatível com o Firmware Scheduler').HttpStatus(400) }
  let { week, exceptions } = await parseDalSchedCards(cards.schedules, cards.exceptions);
  if (illuminationId) {
    const illumInfo = await sqldb.DALS_ILLUMINATIONS.getDalIllumByIllumId({ ILLUMINATION_ID: illuminationId });
    if (illumInfo.PORT) {
      week = week.filter((w) => (w.machine === illumInfo.PORT - 1));
      exceptions = exceptions.filter((e) => (e.machine === illumInfo.PORT - 1));
    }
    if (hasProgToEdit === false) {
      week = [];
    }
    if (hasExceptToEdit === false) {
      exceptions = [];
    }
  }

  await sendDalScheduler(devId, week, exceptions, userId);
}


export async function verifySchedules(
  devId: string,
  illuminationId: number,
  schedules: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>>,
) {
  const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumByIllumId({ ILLUMINATION_ID: illuminationId });
  const machine = dalIllumination.PORT - 1;

  const cards: Omit<SchedulerWeekJSON, 'msgtype' | 'machine'>[] = [];

  const dalCards = await parseDalSchedCards(schedules, []);
  const scheduleDalCardMachine = dalCards.week.filter((item) => item.machine === machine);

  const schedulePromise = iotMessageListener.waitForDalControl((message) => {
    if (!message) return false;
    if (message.dev_id !== devId) return false;
    message = message as MsgDamGetScheduler;
    if (message.msgtype !== 'get-scheduler-info-week') return false;
    if (message.machine !== machine) return false;

    const foundCardIndex = cards.findIndex((card) => {
      return (message as MsgDamGetScheduler).data.replace(/\s+/g, '') === JSON.stringify({ default_mode: card.default_mode, schedule: card.schedule });
    });

    if (foundCardIndex >= 0) {
      cards[foundCardIndex].days = [...cards[foundCardIndex].days, message.weekday];
    } else {
      const data = JSON.parse(message.data) as typeof cards[number];
      cards.push({
        days: [message.weekday],
        default_mode: data.default_mode,
        schedule: data.schedule,
      });
    }
    if (cards.length === scheduleDalCardMachine.length) {
      const response = scheduleDalCardMachine.every((card) => {
        const foundCard = cards.find((item) => item.days.every((day) => card.days.includes(day)) &&
          JSON.stringify({ default_mode: item.default_mode, schedule: item.schedule }) ===
          JSON.stringify({ default_mode: card.default_mode, schedule: card.schedule })
        );
        return !!foundCard;
      });

      if (!response) {
        throw Error('Invalid configuration').HttpStatus(400);
      }

      return true;
    }

    return false;
  }, 10000);

  await schedulePromise
}


export async function verifyExceptions(
  devId: string,
  illuminationId: number,
  exceptions: Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>>,
) {
  const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumByIllumId({ ILLUMINATION_ID: illuminationId });
  const machine = dalIllumination.PORT - 1;

  const dalCards = await parseDalSchedCards([], exceptions);
  const exceptionDalCardMachine = dalCards.exceptions.find((item) => item.machine === machine);

  const exceptionPromise = iotMessageListener.waitForDalControl((message) => {
    if (!message) return false;
    if (message.dev_id !== devId) return false;
    message = message as MsgDamGetExceptions;
    if (message.msgtype !== 'get-scheduler-info-exceptions') return false;
    if (message.machine !== machine) return false;

    if (message.data === JSON.stringify(exceptionDalCardMachine.exceptions)) {
      return true;
    } else {
      throw Error('Invalid configuration').HttpStatus(400);
    }
  }, 10000);

  await exceptionPromise;
}

export async function sendDalScheduler(
  devId: string,
  week: SchedulerWeekJSON[],
  exceptions: SchedulerExceptionJSON[],
  userId: string) {
  const weekPromises = [] as WSListener<ControlMsgDAL>[];
  week.forEach((sched) => {
    const promise = iotMessageListener.waitForDalControl((message) => {
      if (!message) return false;
      if (message.dev_id !== devId) return false;
      message = message as MsgDamScheduler;
      if (message.msgtype !== 'echo_json_scheduler') return false;
      if (message.json_data !== JSON.stringify(sched)) return false;
      if (!message.json_status) throw Error('Error sending schedule').HttpStatus(400);
      return true;
    }, 5000);
    weekPromises.push(promise);
    devsCommands.sendDamCommand_scheduler(devId, sched, userId);
  })

  const exceptionPromises = [] as WSListener<ControlMsgDAL>[];
  exceptions.forEach((exception) => {
    const promise = iotMessageListener.waitForDalControl((message) => {
      if (!message) return false;
      if (message.dev_id !== devId) return false;
      message = message as MsgDamScheduler;
      if (message.msgtype !== 'echo_json_scheduler') return false;
      if (message.json_data !== JSON.stringify(exception)) return false;
      if (!message.json_status) throw Error('Error sending schedule').HttpStatus(400);
      return true;
    }, 5000);
    exceptionPromises.push(promise);
    devsCommands.sendDamCommand_scheduler(devId, exception, userId);
  })

  await Promise.all([...weekPromises, ...exceptionPromises]);
  return 'SUCCESS';
}

export async function sendDriScheduler(
  devId: string,
  week: SchedulerWeekJSON[],
  exceptions: SchedulerExceptionJSON,
  userId: string) {
  const weekPromises = [] as WSListener<ControlMsgDRI>[];
  week.forEach((sched) => {
    const promise = iotMessageListener.waitForDriControl((message) => {
      if (!message) return false;
      if (message.dev_id !== devId) return false;
      message = message as MsgDamScheduler;
      if (message.msgtype !== 'echo_json_scheduler') return false;
      if (message.json_data !== JSON.stringify(sched)) return false;
      if (!message.json_status) throw Error('Error sending schedule').HttpStatus(400);
      return true;
    }, 5000);
    weekPromises.push(promise);
    devsCommands.sendDamCommand_scheduler(devId, sched, userId);
  })

  const exceptionPromises = [] as WSListener<ControlMsgDRI>[];

  if (exceptions) {
    const promise = iotMessageListener.waitForDriControl((message) => {
      if (!message) return false;
      if (message.dev_id !== devId) return false;
      message = message as MsgDamScheduler;
      if (message.msgtype !== 'echo_json_scheduler') return false;
      if (message.json_data !== JSON.stringify(exceptions)) return false;
      if (!message.json_status) throw Error('Error sending schedule').HttpStatus(400);
      return true;
    }, 5000);
    exceptionPromises.push(promise);
    devsCommands.sendDamCommand_scheduler(devId, exceptions, userId);
  }

  await Promise.all([...weekPromises, ...exceptionPromises]);
  return 'SUCCESS';
}



async function parseDamSchedCards(scheds: Awaited<ReturnType<typeof sqldb.DAM_SCHEDULES.getActiveSchedsWithFwVersion>>) {
  const schedulerWeek = new SchedulerWeek(4);
  const schedulerExceptions = new SchedulerExceptions(4);

  const defaultMode = ['DISABLED'];

  for (const sched of scheds) {
    const days = JSON.parse(sched.DAYS) || {};
    const newSched = {
      start: sched.BEGIN_TIME,
      end: sched.END_TIME,
      mode: [sched.MODE],
    };
    const machineDaysScheds = schedulerWeek.getOrCreateMachineScheduler(sched.MACHINE);
    machineDaysScheds.defaultMode = defaultMode;
    const machineException = schedulerExceptions.getOrCreateMachineException(sched.MACHINE);

    // Tratar programação de exceção
    if (sched.EXCEPTION_DATE) {
      if (!machineException.exceptions[sched.EXCEPTION_DATE]) {
        machineException.exceptions[sched.EXCEPTION_DATE] = {
          default_mode: defaultMode,
          schedule: [],
        }
      }
      checkAdjustSchedConvergence(machineException.exceptions[sched.EXCEPTION_DATE].schedule, newSched);
      machineException.exceptions[sched.EXCEPTION_DATE].schedule.push(newSched);
      continue;
    }

    // Tratar programação semanal
    buildMachineDayScheds(machineDaysScheds, newSched, days);
  }

  const schedulerWeekCommands = buildSchedulerWeekCommands(schedulerWeek.machineScheduler);

  return { week: schedulerWeekCommands, exceptions: Object.values(schedulerExceptions.machineExceptions) }
}

async function parseDutSchedCards(
  scheds: Awaited<ReturnType<typeof sqldb.DUTS_SCHEDULES.getActiveSchedsWithFwVersion>>,
  exceptions: Awaited<ReturnType<typeof sqldb.DUTS_EXCEPTIONS.getActiveSchedsWithFwVersion>>
) {
  const schedulerWeek = new SchedulerWeek(4);
  const schedulerExceptions = new SchedulerExceptions(4);

  const defaultMode = ['DISABLED'];

  // Tratar programação semanal
  for (const sched of scheds) {
    const days = JSON.parse(sched.DAYS) || {};
    const newSched = {
      start: sched.BEGIN_TIME,
      end: sched.END_TIME,
      mode: [''],
    };
    const machineDaysScheds = schedulerWeek.getOrCreateMachineScheduler(sched.MACHINE);
    machineDaysScheds.defaultMode = defaultMode;
    // Tratar programação semanal
    buildMachineDayScheds(machineDaysScheds, newSched, days);
  }

  // Tratar programação de exceção
  for (const exception of exceptions) {
    const newSched = {
      start: exception.BEGIN_TIME,
      end: exception.END_TIME,
      mode: [''],
    };
    const machineException = schedulerExceptions.getOrCreateMachineException(exception.MACHINE);
    buildMachineExceptions(machineException, exception.EXCEPTION_DATE, defaultMode, newSched);
  }

  const schedulerWeekCommands = buildSchedulerWeekCommands(schedulerWeek.machineScheduler);

  return { week: schedulerWeekCommands, exceptions: Object.values(schedulerExceptions.machineExceptions) }
}

async function parseDalSchedCards(
  scheds: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>>,
  exceptions: Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>>
) {
  const schedulerWeek = new SchedulerWeek(4);
  const schedulerExceptions = new SchedulerExceptions(4);

  // Tratar programação semanal
  for (const sched of scheds) {
    if (!sched.PORT) continue;
    const days = JSON.parse(sched.DAYS) || {};
    const command = sched.STATUS === '1' ? 'ON' : 'OFF';
    const defaultMode = returnDefaultMode(sched.DEFAULT_MODE);
    const newSched = {
      start: sched.BEGIN_TIME,
      end: sched.END_TIME,
      mode: [command],
    };
    const machineDaysScheds = schedulerWeek.getOrCreateMachineScheduler(sched.PORT - 1);
    machineDaysScheds.defaultMode = defaultMode;
    // Tratar programação semanal
    buildMachineDayScheds(machineDaysScheds, newSched, days);
  }

  // Tratar programação de exceção
  for (const exception of exceptions) {
    if (!exception.PORT) continue;
    const command = exception.STATUS === '1' ? 'ON' : 'OFF';
    const defaultMode = ['OFF'];
    const newSched = {
      start: exception.BEGIN_TIME,
      end: exception.END_TIME,
      mode: [command],
    };
    const machineException = schedulerExceptions.getOrCreateMachineException(exception.PORT - 1);
    buildMachineExceptions(machineException, formatISODate(exception.EXCEPTION_DATE), defaultMode, newSched);
  }

  const schedulerWeekCommands = buildSchedulerWeekCommands(schedulerWeek.machineScheduler);

  return { week: schedulerWeekCommands, exceptions: Object.values(schedulerExceptions.machineExceptions) }
}

function returnDefaultMode(defaultMode: string) {
  return defaultMode === '1' ? ['ON'] : (defaultMode === '0' ? ['OFF'] : []);
}

function buildMachineExceptions(
  machineException: SchedulerExceptionJSON,
  EXCEPTION_DATE: string,
  defaultMode: string[],
  newSched: DaySched
) {
  if (!machineException.exceptions[EXCEPTION_DATE]) {
    machineException.exceptions[EXCEPTION_DATE] = {
      default_mode: defaultMode,
      schedule: [],
    }
  }
  checkAdjustSchedConvergence(machineException.exceptions[EXCEPTION_DATE].schedule, newSched);
  machineException.exceptions[EXCEPTION_DATE].schedule.push(newSched);
}

function buildMachineDayScheds(machineDaysScheds: Schedule, newSched: DaySched, days: { day: string, selected: boolean }) {
  for (const [day, selected] of Object.entries(days)) {
    if (!selected) continue;
    const dayScheds = machineDaysScheds.days[weekDays[day]]
    checkAdjustSchedConvergence(dayScheds, newSched);
    dayScheds.unshift(newSched);
  }
}

function buildSchedulerWeekCommands(machineSchedules: typeof SchedulerWeek.prototype.machineScheduler) {
  const schedulerWeekCommands = [] as SchedulerWeekJSON[];
  for (const [machine, schedule] of Object.entries(machineSchedules)) {
    const { defaultMode, days: daySchedules } = schedule;
    for (const [day, schedule] of Object.entries(daySchedules)) {
      const dayWithSameSchedule = schedulerWeekCommands.find((command) => (
        JSON.stringify(command.schedule) === JSON.stringify(schedule)
        && command.machine === Number(machine)
      ));
      if (dayWithSameSchedule) {
        dayWithSameSchedule.days.push(day);
      } else {
        schedulerWeekCommands.push({
          msgtype: 'set-scheduler-week',
          machine: Number(machine),
          days: [day],
          default_mode: defaultMode?.length > 0 ? defaultMode : ["OFF"],
          schedule,
        });
      }
    }
  }

  return schedulerWeekCommands;
}


export async function parseDriScheduleCardsToScheduler(
  schedules: DriProg[],
  driCfg: DriVarsConfig
): Promise<{ week: SchedulerWeekJSON[], exceptions: SchedulerExceptionJSON }> {
  const schedulerWeek = new SchedulerWeek(1);
  const schedulerExceptions = new SchedulerExceptions(1);

  for (const sched of schedules) {
    const days = JSON.parse(sched.DAYS) || {};
    const { commands, defaultModeCmds } = getAutomationDriCommandsByProg(sched, driCfg)

    const newSched = {
      start: sched.BEGIN_TIME,
      end: sched.END_TIME,
      mode: commands,
    };

    const machineDaysScheds = schedulerWeek.getOrCreateMachineScheduler(0);
    machineDaysScheds.defaultMode = defaultModeCmds;
    const machineException = schedulerExceptions.getOrCreateMachineException(0);

    // Tratar programação de exceção
    if (sched.EXCEPTION_DATE) {
      if (!machineException.exceptions[sched.EXCEPTION_DATE]) {
        machineException.exceptions[sched.EXCEPTION_DATE] = {
          default_mode: defaultModeCmds,
          schedule: [],
        }
      }
      checkAdjustSchedConvergence(machineException.exceptions[sched.EXCEPTION_DATE].schedule, newSched);
      machineException.exceptions[sched.EXCEPTION_DATE].schedule.unshift(newSched);
      continue;
    }

    // Tratar programação semanal
    buildMachineDayScheds(machineDaysScheds, newSched, days);
  }

  const schedulerWeekCommands = buildSchedulerWeekCommands(schedulerWeek.machineScheduler);

  return { week: schedulerWeekCommands, exceptions: schedulerExceptions.machineExceptions[0] }
}


export function parseDriScheduleToCards(schedules: Awaited<ReturnType<typeof sqldb.DRISCHEDS.getDriScheds>>): DriProg[] {
  return schedules.map((schedule) => ({
    ACTIVE: schedule.ACTIVE,
    BEGIN_TIME: schedule.BEGIN_TIME,
    DAYS: schedule.DAYS,
    DRI_ID: schedule.DRI_ID,
    END_TIME: schedule.END_TIME,
    MODE: schedule.MODE,
    OPERATION: schedule.OPERATION,
    SCHED_ID: schedule.SCHED_ID,
    SETPOINT: schedule.SETPOINT,
    EXCEPTION_DATE: schedule.EXCEPTION_DATE ? formatISODate(schedule.EXCEPTION_DATE) : undefined,
    EXCEPTION_REPEAT_YEARLY: schedule.EXCEPTION_REPEAT_YEARLY,
  }))
}

function verifyExceptionMessageData(data: string, exceptions: SchedulerExceptionJSON['exceptions']): boolean {
  const dataParsed = JSON.parse(data) as SchedulerExceptionJSON['exceptions'];
  const dataEntries = Object.entries(dataParsed);

  if (dataEntries.length === 0) {
    return Object.entries(exceptions).length === 0;
  }

  return dataEntries.every(([key, value]) =>
    !!exceptions[key] && JSON.stringify(value) === JSON.stringify(exceptions[key]));
}

export async function verifyDriExceptions(devId: string, exceptionCards: DriProg[], driCfg: DriVarsConfig) {
  const { exceptions: schedulerExceptions } = await parseDriScheduleCardsToScheduler(exceptionCards, driCfg);

  const exceptionPromise = iotMessageListener.waitForDriControl((message) => {
    if (!message) return false;
    if (message.dev_id !== devId) return false;
    message = message as MsgDamGetExceptions;
    if (message.msgtype !== 'get-scheduler-info-exceptions') return false;
    if (verifyExceptionMessageData(message.data, schedulerExceptions.exceptions)) {
      return true;
    } else {
      logger.error({
        message: 'Invalid configuration',
        devId,
        exceptionCards,
        devExceptions: message.data,
        schedulerExceptions: JSON.stringify(schedulerExceptions),
      })
      throw Error('Invalid configuration').HttpStatus(400);
    }
  }, 10000);

  await exceptionPromise;
}

function verifyEveryCardByWeekdayMessage(cards: Omit<SchedulerWeekJSON, "msgtype" | "machine">[], messageCard: SchedulerWeekJSON): boolean {
  const foundCard = cards.find((item) => item.days.every((day) => messageCard.days.includes(day)) &&
    JSON.stringify({ default_mode: item.default_mode, schedule: item.schedule }) ===
    JSON.stringify({ default_mode: messageCard.default_mode, schedule: messageCard.schedule })
  );
  return !!foundCard;
}

function buildCardsByMessage(cards: Omit<SchedulerWeekJSON, "msgtype" | "machine">[], message: MsgDamGetScheduler): void {
  const foundCardIndex = cards.findIndex((card) => {
    return message.data.replace(/\s+/g, '') ===
      JSON.stringify({ default_mode: card.default_mode, schedule: card.schedule });
  });

  if (foundCardIndex >= 0) {
    cards[foundCardIndex].days = [...cards[foundCardIndex].days, message.weekday];
  } else {
    const data = JSON.parse(message.data) as typeof cards[number];
    cards.push({
      days: [message.weekday],
      default_mode: data.default_mode,
      schedule: data.schedule,
    });
  }
}

export async function verifyDriSchedules(
  devId: string,
  scheduleCards: DriProg[],
  driCfg: DriVarsConfig
) {
  const cards: Omit<SchedulerWeekJSON, 'msgtype' | 'machine'>[] = [];
  const { week: schedulerWeek } = await parseDriScheduleCardsToScheduler(scheduleCards, driCfg);

  const schedulePromise = iotMessageListener.waitForDriControl((message) => {
    if (!message) return false;
    if (message.dev_id !== devId) return false;
    message = message as MsgDamGetScheduler;
    if (message.msgtype !== 'get-scheduler-info-week') return false;

    buildCardsByMessage(cards, message);

    if (cards.length === schedulerWeek.length) {
      const response = schedulerWeek.every((messageCard) =>
        verifyEveryCardByWeekdayMessage(cards, messageCard)
      );

      if (!response) {
        logger.error({
          message: 'Invalid configuration',
          devId,
          devCards: cards,
          scheduleCards,
          schedulerWeek,
        })
        throw Error('Invalid configuration').HttpStatus(400);
      }

      return true;
    }

    return false;
  }, 10000);

  await schedulePromise;
}

export async function validateDeviceSchedulerCards(
  deviceCode: string, hasExceptionToEdit: boolean, hasProgToEdit: boolean,
  cards: { exceptions: DriProg[], schedules: DriProg[] },
  driCfg: DriVarsConfig,
  user: string
): Promise<void> {
  const promises = [];
  let mustSendCommand = false;
  if (hasExceptionToEdit) {
    mustSendCommand = true;
    promises.push(() => verifyDriExceptions(deviceCode, cards.exceptions, driCfg));
  }

  if (hasProgToEdit) {
    mustSendCommand = true;
    promises.push(() => verifyDriSchedules(deviceCode, cards.schedules, driCfg));
  }

  if (mustSendCommand) {
    devsCommands.sendDamCommand_scheduler(deviceCode,
      { msgtype: 'get-scheduler-info' }, user);
  }

  await Promise.all(promises.map((p) => p()));
}

export function sendSchedulerConfig(
  devId: string,
  user: string,
  automationInterval?: number,
  commandsInterval?: number,
): void {
  const command: DamCommand = { 
    msgtype: 'set-scheduler-cfg',
    automation_interval: automationInterval ?? 5 * 60,
    cmds_interval: commandsInterval ?? 0.1
  };

  devsCommands.sendDamCommand_scheduler(devId, command, user);
}

export function sendDriSchedulerConfig(
  driId: string,
  driCfg: DriVarsConfig,
  user: string,
  automationIntervalMinutes?: number,
): void {
  const commandInterval = driCfg.application.endsWith('bac-6000-amln') ? 5 : undefined;
  const automationInterval = automationIntervalMinutes ? automationIntervalMinutes * 60 : undefined;

  sendSchedulerConfig(driId, user,automationInterval, commandInterval);
}

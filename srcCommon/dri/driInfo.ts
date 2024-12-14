import * as devsCommands from '../iotMessages/devsCommands';
import jsonTryParse from '../helpers/jsonTryParse';
import { DriVarsConfig } from '../types';
import { parseFirmwareVersion, compareVersions, VersionNumber } from '../helpers/fwVersion';
import { logger } from '../helpers/logger';
import { t } from '../helpers/i18nextradution';
import { checkTimeConflict, checkWeekDayCommon } from '../helpers/validateSchedule';
import * as DRISCHEDS from '../db/sql/DRISCHEDS'

export interface DriInfo {
  application: string
  protocol: string
  machines?: {
    id: number
    vars: { name: string }[]
  }[],
  varsList?: {}[],
  w_varsList?: {
    name: string,
    address: {
      protocol?: string
      machine?: number
      ip?: string
      id?: number
      function?: number
      address?: number
      value?: string
      values?: number[],
    },
    inputRow?: {
      Formula?: string,
    }
  }[],
  driConfigs?: {},
  driScheds?: {
    SCHED_ID: number;
    DRI_ID: string;
    ACTIVE: string;
    OPERATION: string;
    BEGIN_TIME: string;
    END_TIME: string;
    MODE: string;
    DAYS: string;
    SETPOINT: number;
  }[],
}

interface BaseProgram {
  BEGIN_TIME: string,
  END_TIME: string,
  ACTIVE: string,
  SCHED_ID?: number
}

interface ValidateSchedule extends BaseProgram {
  DAYS: string,
}

interface ValidateException extends BaseProgram {
  EXCEPTION_DATE: string,
  EXCEPTION_REPEAT_YEARLY?: string,
}

export type SchedulesDatabase = Awaited<ReturnType<typeof DRISCHEDS.getDriScheds>>;

export const MINIMUM_AUTOMATION_VERSION = parseFirmwareVersion('v4.5.5');

export const modBusProtocols = ['read-modbus-rtu', 'read-modbus-tcp', 'write-modbus-rtu', 'write-modbus-tcp', 'write-uart'];

function calculateValue(value: string, formula: string) {
  const numberValue = Number(value) || null;
  if (!numberValue) return value;
  if (formula[0] === '*') {
    const opValue = Number(formula.split('*')[1]) || null;
    if (opValue) return (numberValue * opValue).toFixed(0);
  }
  if (formula[0] === '/') {
    const opValue = Number(formula.split('/')[1]) || null;
    if (opValue) return (numberValue / opValue).toFixed(0);
  }
  return value;
}

export function getDriCommand(driInfo: DriInfo, type: string, value: string) {
  let command;
  if (driInfo.protocol === 'carrier-ecosplit') {
    command = driInfo.w_varsList.find((item: any) => item.name.toLowerCase().includes(value.toString().toLowerCase()));
  }
  if (driInfo.application.startsWith('vav') || driInfo.application.startsWith('fancoil')) {
    const result = driInfo.w_varsList.find((item: any) => item.address?.alias?.toLowerCase().includes(type.toLowerCase()));
    const convertedValue = result.inputRow?.Formula ? calculateValue(value, result.inputRow.Formula) : value;
    result.address.value = convertedValue.toString();
    command = result;
  }

  return command;
}

export function getDriAutomationCommand(driVarsCfg: DriVarsConfig, alias?: string, description?: string): DriVarsConfig['automationList'][number] | undefined {
  return driVarsCfg.automationList.find((item) => (alias && item.alias === alias) || (description && item.description === description));
}

export function sendDriCommand(driId: string, driInfo: DriInfo, type: string, value: string, user: string) {
  const command = getDriCommand(driInfo, type, value);
  if (command) {
    devsCommands.sendDriVarConfig(driId, JSON.stringify(command.address), user);
  } else {
    throw new Error('Commando não foi encontrado nas configurações do DRI').HttpStatus(400);
  }
}

export function parseDriVarsCfg(VARSCFG: string): DriVarsConfig {
  const varsCfg = VARSCFG && jsonTryParse<DriVarsConfig>(VARSCFG);
  return varsCfg;
}

export function validateSchedule(newSchedule: ValidateSchedule,
  schedules: (ValidateSchedule & { SCHED_ID: number })[],
  language: string
): void {
  const {
    DAYS,
    BEGIN_TIME,
    ACTIVE,
    END_TIME,
    SCHED_ID
  } = newSchedule;
  if (ACTIVE === '0') return;

  for (const schedule of schedules) {
    if (!schedule.ACTIVE) { continue; }
    if (!!SCHED_ID && SCHED_ID === schedule.SCHED_ID) { continue; }
    if (!checkWeekDayCommon(JSON.parse(schedule.DAYS), JSON.parse(DAYS))) { continue; }
    if (checkTimeConflict(
      { startTime: schedule.BEGIN_TIME, endTime: schedule.END_TIME },
      { startTime: BEGIN_TIME, endTime: END_TIME },
    )) {
      const msgError = t('erroProgramacoesSobrepostas', language);
      logger.error({
        message: msgError,
        newSchedule,
        schedules,
      });
      throw new Error(msgError).HttpStatus(400);
    }
  }
}

export function checkExceptionDate(
  exceptionToCompare: Pick<ValidateException, 'EXCEPTION_DATE' | 'EXCEPTION_REPEAT_YEARLY'>,
  exception: Pick<ValidateException, 'EXCEPTION_DATE' | 'EXCEPTION_REPEAT_YEARLY'>,
): boolean {
  if (exceptionToCompare.EXCEPTION_REPEAT_YEARLY === '1' || exception.EXCEPTION_REPEAT_YEARLY === '1') {
    return exceptionToCompare.EXCEPTION_DATE.slice(0, 5) === exception.EXCEPTION_DATE.slice(0, 5);
  }
  return exceptionToCompare.EXCEPTION_DATE === exception.EXCEPTION_DATE;
}

export function validateException(newException: ValidateException,
  exceptions: (ValidateException & { SCHED_ID: number })[],
  language: string): void {
  const {
    BEGIN_TIME,
    ACTIVE,
    END_TIME,
    SCHED_ID,
    EXCEPTION_DATE,
    EXCEPTION_REPEAT_YEARLY,
  } = newException;

  if (ACTIVE === '0') return;

  for (const exception of exceptions) {
    if (exception.ACTIVE === '0') { continue; }
    if (!!SCHED_ID && SCHED_ID === exception.SCHED_ID) { continue; }
    if (!checkExceptionDate(exception, {
      EXCEPTION_DATE,
      EXCEPTION_REPEAT_YEARLY: EXCEPTION_REPEAT_YEARLY ?? '0',
    })) { continue; }
    if (checkTimeConflict({
      startTime: exception.BEGIN_TIME,
      endTime: exception.END_TIME,
    }, {
      startTime: BEGIN_TIME,
      endTime: END_TIME,
    })) {
      const msgError = t('erroProgramacoesSobrepostas', language);
      logger.error({
        message: msgError,
        newException,
        exceptions,
      });
      throw new Error(msgError).HttpStatus(400);
    }
  }
}
  
export function isApplicationAutomationByVarsCfg(varsCfg: DriVarsConfig): boolean {
  return varsCfg?.application === 'carrier-ecosplit' || varsCfg?.application.startsWith('fancoil') || varsCfg?.application.startsWith('vav');
}
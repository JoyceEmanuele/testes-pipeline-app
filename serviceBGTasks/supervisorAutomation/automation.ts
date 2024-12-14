import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger'
import { DayProg, FullProg_v4, checkFullProgV4, parseFullProgV4 } from '../../srcCommon/helpers/scheduleData'
import { ControlMode } from '../../srcCommon/helpers/dutAutomation';
import { ScheduleDut, ExceptionDut } from '../../srcCommon/types/api-private';
import { collectFullDutProg, buildObjectSchedules } from '../../srcCommon/dut/dutSchedule';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { resendDutAutConfig } from '../../srcCommon/dutAutomation';
import { adjustSchedule_v2, sendDevSchedule, adjustSchedule } from '../../srcCommon/helpers/automationControl'
import { collectFullDamProg } from '../../srcCommon/dam/damSchedule'

type DayKeys = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Tarefa automática para reenvio da programação de dispositivos
export function startServiceResendProgramming() {
  recurrentTasks.runLoop({
    iterationPause_ms: 2 * 60 * 60 * 1000,
    initialDelay_ms: 2 * 60 * 60 * 1000,
    taskName: "RESEND-PROG-FROM-SUPERVISOR",
    hideIterationsLog: true,
  }, async () => { await resendProgTaks() });
}

async function resendProgTaks() {
    const devicesToResend = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersToResendProgramming();

    
    for (let i = 0; i < devicesToResend.length; i += 50) {
      const batchToResend = devicesToResend.slice(i, i + 50); // Realizado reenvio  de 50 em 50 dispositivos
      const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
        devIds: batchToResend.map((x) => x.DEVICE_CODE),
      });
      await Promise.all(batchToResend.map(async (deviceInfo) => {
        try {
          const status = lastMessagesTimes.connectionStatus(deviceInfo.DEVICE_CODE);
          if (status !== 'ONLINE') {
            return;
          }

          let result = false;
          if (deviceInfo.DUT_DEVICE_ID) {
            result = await resendDutProgramming(deviceInfo);
          }
          else if (deviceInfo.DAC_DEVICE_ID || deviceInfo.DAM_DEVICE_ID) {
            result = await resendDamProgramming(deviceInfo);
          }

          if (result) {
            await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: deviceInfo.CURRENT_AUTOMATION_PARAMETERS_ID, RESEND_PROGRAMMING: 0}, '[SYSTEM]');
          }
        } catch (err) {
          logger.error({
            msg: 'Erro em rotina de reenvio de programações incorretas de DAM detectadas pelo Supervisor!',
            devId: deviceInfo.DEVICE_CODE,
            err,
          });
        }
      }));
    }
}

async function resendDamProgramming(deviceInfo: Awaited<ReturnType<typeof sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersToResendProgramming>>[0]): Promise<boolean> {
  const currentProg = parseFullProgV4(deviceInfo.LAST_PROG);
  const desiredProg = parseFullProgV4(deviceInfo.DESIRED_PROG);
  delete desiredProg.temprtControl; // this shouldn't be necessary, it should be removed in the future
  const commands = adjustSchedule(desiredProg, currentProg, true, null);

  for (let i = 0; i < 2; i++) {
    try {
      await sendDevSchedule(deviceInfo.DEVICE_CODE, commands, '[SYSTEM]', 'RESEND-PROG-FROM-SUPERVISOR');
      await collectFullDamProg({ devId: deviceInfo.DEVICE_CODE, userId: '[SYSTEM]' });
      return true;
    }
    catch (err) {
      if (i === 1) {
        logger.error({
          msg: 'Erro em reenvio de programação incorreta de DAM detectada pelo Supervisor!',
          devId: deviceInfo.DEVICE_CODE,
          err,
        });
        return false;
      }
    }
  }
  return true;
}
  
async function resendDutProgramming(deviceInfo: Awaited<ReturnType<typeof sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersToResendProgramming>>[0]): Promise<boolean> {
  const unshiftedDate = new Date();
  const date = new Date(unshiftedDate.getTime() - 3 * 60 * 60 * 1000  + 4 * 60 * 1000);
  const dateToExceptions = `${date.getUTCFullYear().toString()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
  
  try {
    // Busca cards de programação e exceção
    const schedules = await sqldb.DUTS_SCHEDULES.getDutScheds({ DUT_ID: deviceInfo.DEVICE_CODE, SCHEDULE_STATUS: '1' });    
    const exceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: deviceInfo.DEVICE_CODE, EXCEPTION_DATE_ABOVE: dateToExceptions });
    const lastProgramming = deviceInfo.LAST_PROG ? JSON.parse(deviceInfo.LAST_PROG) : {};
  
    // Converte cards para objetos para facilitar implementação
    const schedulesWithObject: ScheduleDut[] = buildObjectSchedules(schedules);
    const exceptionsWithObject: ExceptionDut[] = exceptions.map(item => ({
      DUT_EXCEPTION_ID: item.DUT_EXCEPTION_ID,
      EXCEPTION_TITLE: item.EXCEPTION_TITLE,
      REPEAT_YEARLY: item.REPEAT_YEARLY === '1' ? true : false,
      EXCEPTION_DATE: item.EXCEPTION_DATE_FORMATED,
      BEGIN_TIME: item.BEGIN_TIME,
      END_TIME: item.END_TIME,
      PERMISSION: item.PERMISSION,
      EXCEPTION_STATUS_ID: item.AUTOMATION_PERIOD_STATUS,
      CTRLOPER: item.CTRLOPER as ControlMode,
      SETPOINT: item.SETPOINT,
      LTC: item.LTC,
      LTI: item.LTI,
      UPPER_HYSTERESIS: item.UPPER_HYSTERESIS,
      LOWER_HYSTERESIS: item.LOWER_HYSTERESIS,
      SCHEDULE_START_BEHAVIOR: item.SCHEDULE_START_BEHAVIOR,
      SCHEDULE_END_BEHAVIOR: item.SCHEDULE_END_BEHAVIOR,
      FORCED_BEHAVIOR: item.FORCED_BEHAVIOR,
      ACTION_MODE: item.ACTION_MODE,
      ACTION_TIME: item.ACTION_TIME,
      ACTION_POST_BEHAVIOR: item.ACTION_POST_BEHAVIOR,
    }))
  
    // Monta programação horária desejada de acordo com cards de programação, enviando comando de apagar para dia que não tem programação cadastrada
    const weekDesired = buildDesiredWeekProg(schedulesWithObject);
    // Monta exceções desejadas de acordo com cards de exceções
    const desiredExceptions = buildDesiredExceptions(exceptionsWithObject);
  
    // Verifica exceções no dispositivo que não existem no banco para montar comandos para apagar exceção
    const exceptionsDateToClear = findUniqueKeys({...desiredExceptions}, {...lastProgramming.exceptions});
    const desiredExceptionsToClear = buildDesiredExceptionsToClear(exceptionsDateToClear, lastProgramming.exceptions || {});
    
    // Programação final que será enviada ao dispositivo
    const finalDesired: FullProg_v4 = checkFullProgV4({
      version: 'v4',
      week: weekDesired,
      exceptions: { ...desiredExceptions, ...desiredExceptionsToClear },
    });
  
    // Atualiza parâmetros de automação de acordo com cards de programação
    const automationsParameters = buildAutomationParameters(schedulesWithObject);
    await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: deviceInfo.CURRENT_AUTOMATION_PARAMETERS_ID, DESIRED_PROG: JSON.stringify(finalDesired), ...automationsParameters}, '[SYSTEM]');
    
    // Reenvio de programação horária e configuração de modo de automação
    await resendProgramming(deviceInfo, finalDesired, lastProgramming);

    return true;
  } catch (err) {
    logger.error({
      msg: 'Erro em rotina de reenvio de programação incorreta de DUT detectada pelo Supervisor!',
      devId: deviceInfo.DEVICE_CODE,
      err,
    });
    return false;
  }
} 

function buildDesiredWeekProg(schedulesMachine: ScheduleDut[]) {
  const daysOfWeek: DayKeys[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const defaultClearProg = {
    permission: 'forbid' as 'forbid'|'allow',
    start: '00:00',
    end: '23:59',
    clearProg: true
  };

  let desiredWeekProgramming: { [key in DayKeys]?: DayProg } = {};

  for (let day of daysOfWeek) {
    let scheduleAux = schedulesMachine.find(schedule => schedule.DAYS[day]);
    desiredWeekProgramming[day] = scheduleAux
      ? {
          permission: scheduleAux.PERMISSION,
          start: scheduleAux.BEGIN_TIME,
          end: scheduleAux.END_TIME
        }
      : defaultClearProg;
  }

  return desiredWeekProgramming;
}

function buildDesiredExceptions(exceptionsMachine: ExceptionDut[]) {
  let desiredExceptions: {
    [day: string]: DayProg
  } = {};
  exceptionsMachine.forEach((exception) => {
	  desiredExceptions[exception.EXCEPTION_DATE] = {
      permission: exception.PERMISSION,
      start: exception.BEGIN_TIME,
      end: exception.END_TIME,
    };
  });
  return desiredExceptions;
}

function findUniqueKeys(obj1: { [day: string]: DayProg }, obj2: { [day: string]: DayProg }) {
  // Obter as chaves (dias) dos dois objetos
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  // Filtrar as chaves que estão em obj2 mas não estão em obj1
  const uniqueKeys = keys2.filter(key => !keys1.includes(key));
  
  return uniqueKeys;
}

function buildDesiredExceptionsToClear(exceptionsDateList: string[], exceptionsInDevice: { [day: string]: DayProg }) {
  const desiredExceptionsToClear:{ [day: string]: DayProg } = {};
  exceptionsDateList.forEach((exception) => {
    desiredExceptionsToClear[exception] = {
      permission: exceptionsInDevice[exception].permission,
      start: exceptionsInDevice[exception].start,
      end: exceptionsInDevice[exception].end,
	  clearProg: true,
    };
  });
  
  return desiredExceptionsToClear;
}

function buildAutomationParameters(schedules: ScheduleDut[]) {
  const schedule = schedules.find(item => item.PERMISSION === 'allow') ?? schedules[0];
  // Comparar parâmetros de automação
  const automationParameters = {
    MODE: schedule?.CTRLOPER,
    FORCED_BEHAVIOR: schedule?.FORCED_BEHAVIOR,
    IR_ID_COOL: schedule.IR_ID_COOL,
    LOWER_HYSTERESIS: schedule?.LOWER_HYSTERESIS || 0,
    UPPER_HYSTERESIS: schedule?.UPPER_HYSTERESIS || 0,
    LTC: schedule?.LTC || 0,
    LTI: schedule?.LTI || 0,
    SCHEDULE_START_BEHAVIOR: schedule?.SCHEDULE_START_BEHAVIOR,
    SCHEDULE_END_BEHAVIOR: schedule?.SCHEDULE_END_BEHAVIOR,
    SETPOINT: schedule?.SETPOINT || 0,
    ACTION_MODE: schedule?.ACTION_MODE,
    ACTION_TIME: schedule?.ACTION_TIME || 0,
    ACTION_POST_BEHAVIOR: schedule?.ACTION_POST_BEHAVIOR,
  }
  
  return automationParameters;
}

async function resendProgramming(
  deviceInfo: Awaited<ReturnType<typeof sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersToResendProgramming>>[0],
  finalDesired: FullProg_v4,
  lastProgramming: FullProg_v4
) {

  // Considerado 2 tentativas de reenvio
  for (let i = 0; i < 2; i++) {
    try {
      const commands = adjustSchedule_v2(finalDesired, lastProgramming, false, 0);
      await sendDevSchedule(deviceInfo.DEVICE_CODE, commands, '[SYSTEM]', 'RESEND-PROG-FROM-SUPERVISOR');
      await collectFullDutProg({ devId:deviceInfo.DEVICE_CODE, userId: '[SYSTEM]'});
      await resendDutAutConfig({ devId:deviceInfo.DEVICE_CODE, user: '[SYSTEM]' });
    } catch (err) {
      if (i === 1) {
        logger.error({
          msg: 'Erro em reenvio de programação incorreta de DUT detectada pelo Supervisor!',
          devId: deviceInfo.DEVICE_CODE,
          err,
        });
        return;
      }
    }
  }
}
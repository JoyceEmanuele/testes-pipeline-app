import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import sqldb from '../../srcCommon/db'
import servConfig from '../../configfile'
import { logger } from '../../srcCommon/helpers/logger'
import { DayProg, FullProg_v4, checkFullProgV4, parseFullProgV4 } from '../../srcCommon/helpers/scheduleData'
import { ControlMode } from '../../srcCommon/helpers/dutAutomation';
import { DaysOfWeek } from '../../srcCommon/helpers/dates';
import { ScheduleDutToMultiple } from '../../srcCommon/types/api-private';
import { zeroPad } from '../../srcCommon/helpers/dates'
import { collectFullDutProg, buildObjectSchedules, compareDutProg } from '../../srcCommon/dut/dutSchedule';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import * as dielServices from '../../srcCommon/dielServices';
import { resendDutAutConfig, resendDutIrCodes } from '../../srcCommon/dutAutomation';
import { adjustSchedule_v2, saveDesiredprogDUT, sendDevSchedule } from '../../srcCommon/helpers/automationControl';
import * as momentTimezone from 'moment-timezone';

const weekDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Tarefa automática para envio da próxima programação do DUT
export function startServiceMultiProg() {
  recurrentTasks.runLoop({
    iterationPause_ms: 3 * 60 * 1000,
    initialDelay_ms: 3 * 60 * 1000,
    taskName: "DUT-MULTIPROG",
    hideIterationsLog: true,
  }, async () => { await dutMultiProgTask() });
}

// Tarefa diária para enviar exceções anuais quando passou a data
export function startServiceAnnualExcepts() {
  recurrentTasks.runLoop({
    taskName: "DUT-ANNUALEXCEPTS",
    initialDelay_ms: 5 * 60 * 1000,
    iterationPause_ms: 24 * 60 * 60 * 1000, // 24 hours wait
  }, async () => { await taskDutAnnualExcepts() });
}

// Tarefa automática para envio da próxima programação do DUT
async function dutMultiProgTask() {
  try {
    const dutsWithMultipleSchedule = await sqldb.DUTS_SCHEDULES.getDutsToMultSchedule({NEED_MULT_SCHEDULES: '1'});
    const promises: Promise<void>[] = [];
    const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
      devIds: (dutsWithMultipleSchedule.length <= 500) ? dutsWithMultipleSchedule.map((x) => x.DUT_ID) : undefined,
    });

    // Para cada DUT que precisa de rodar pelo script, verifica a próxima programação e envia
    for (const item of dutsWithMultipleSchedule) {
      const status = lastMessagesTimes.connectionStatus(item.DUT_ID);
      if (status !== 'ONLINE') {
        continue;
      }

      const dutSchedules = await sqldb.DUTS_SCHEDULES.getDutScheds({DUT_ID: item.DUT_ID, SCHEDULE_STATUS: '1' });
      const dateAcorddingTimezone = momentTimezone().tz(item.TIME_ZONE_AREA);
      const lastChange = item.FULL_END_DATE ? momentTimezone(item.FULL_END_DATE) : dateAcorddingTimezone;

      const dutConfig = {
        dutId: item.DUT_ID,
        lastChange,
        schedules: buildObjectSchedules(dutSchedules)
      };

      // soma 4 minutos, para minimizar gargalo de tempo que DUT passará a utilizar nova programação enviada, devido cards com apenas 1 minuto de diferença (ex card 1: acabar 12:30 e card2: começar 12:31)
      const date = momentTimezone(dateAcorddingTimezone).add(4, 'minutes');
      const dateToLastProg = momentTimezone(dateAcorddingTimezone).add(4, 'minutes');;
      const hourNow = `${date.format('HH')}:${date.format('mm')}`;

      let dateSchedule = date;
      const dateException = `${dateSchedule.year().toString()}-${(dateSchedule.month() + 1).toString().padStart(2, '0')}-${dateSchedule.date().toString().padStart(2, '0')}`;
      const dayScheduleOriginal = weekDay[date.day()] as DaysOfWeek;
      let daySchedule = weekDay[date.day()] as DaysOfWeek;
      let dayNextSchedule: DaysOfWeek;
      // Seleciona programação atual
      let currentConfig = getDutConfigId('CURRENT_ON_DUT', dutConfig.schedules, hourNow, daySchedule);
      const changeDay = date.day() !== dutConfig.lastChange.day();
      let newConfig = null as ScheduleDutToMultiple|null;
      let nextDayConfig = null as ScheduleDutToMultiple|null;

      if (servConfig.debugScriptMultScheduleDut) {
        logger.info(`hourNow: ${hourNow} - date: ${date.toString()} - daySchedule: ${daySchedule} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
        logger.info(`schedules: ${JSON.stringify(dutConfig)} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
      }

      // Se é primeira configuração via function, ou se acabou o agendamento atual ou se mudou de dia:
      // Necessário filtrar próximo agendamento
      if (!currentConfig || currentConfig.END_TIME < hourNow || currentConfig.BEGIN_TIME > hourNow || changeDay) {

        // Para primeira configuração ou caso haja problemas de conexão nas tentativas de configuração anteriores,
        // necessário considerar que horário atual já pode estar entre as horas definidas
        newConfig = getDutConfigId('BETWEEN_HOUR', dutConfig.schedules, hourNow, daySchedule);
        if (servConfig.debugScriptMultScheduleDut) {
          logger.info(`newConfigId Try 1: ${newConfig != null ? JSON.stringify(newConfig) : '-'} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
        }

        // Se não encontrou configuração entre horas definidas, necessário pegar a próxima do dia atual
        if (!newConfig) {
          newConfig = getDutConfigId('GREATER_THAN_HOUR', dutConfig.schedules, hourNow, daySchedule);
          if (servConfig.debugScriptMultScheduleDut) {
            logger.info(`newConfigId Try 2: ${newConfig != null ? JSON.stringify(newConfig) : '-'} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
          }
        }

        // Caso próxima config seja no dia seguinte, deve considerar hourNow como se tivesse virado o dia
        // Deve ser feito ate dar a volta de uma semana, já que nem todos os dias necessáriamente terão configuração de comando
        if (!newConfig) {
          for (let i = 0; i < weekDay.length; i++) {
            const dayNext = weekDay[(date.day() + i + 1) % 7] as DaysOfWeek;
            newConfig = getDutConfigId('GREATER_THAN_HOUR', dutConfig.schedules, '00:00', dayNext);
            dateSchedule.add(1, 'days');
            if (newConfig) {
              daySchedule = dayNext;
              if (servConfig.debugScriptMultScheduleDut) {
                logger.info(`newConfigId Try 3: ${newConfig != null ? JSON.stringify(newConfig) : '-'} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
              }
              break;
            }
          }
        }

        // Se tem configuração, e configuração é diferente da configuração atual (evitar ficar reenviando comando quando próxima configuração é a primeira do dia seguinte)
        if (newConfig && (!currentConfig || (currentConfig.DUT_SCHEDULE_ID !== newConfig.DUT_SCHEDULE_ID) || changeDay)) {
          // OK
        } else {
          logger.info(`currentConfig: ${currentConfig != null ? JSON.stringify(currentConfig) : '-'} - changeDay: ${changeDay} - user: [SYSTEM] - dutId: ${dutConfig.dutId}`);
          continue;
        }

        // Caso seja última deste dia, deve selecionar a primeira do próximo dia para que seja enviada neste momento, evitando que
        // não fique em funcionamento incorreto ate que o comando seja enviado no próximo dia
        const endHourConfig = newConfig.END_TIME;
        const configAux = getDutConfigId('GREATER_THAN_HOUR', dutConfig.schedules, endHourConfig, daySchedule);
        if (!configAux) {
          for (let i = 0; i < weekDay.length; i++) {
            const dayNext = weekDay[(date.date() + i + 1) % 7] as DaysOfWeek;
            if (dayNext === daySchedule){
              break;
            }
            nextDayConfig = getDutConfigId('GREATER_THAN_HOUR', dutConfig.schedules, '00:00', dayNext);
            if (nextDayConfig) {
              dayNextSchedule = dayNext;
              break;
            }
          }
        }

        const exception = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: dutConfig.dutId, EXCEPTION_DATE: dateException});
        const isExceptionDay = exception.length > 0 && dayScheduleOriginal === daySchedule;

        if (servConfig.debugScriptMultScheduleDut) {
          logger.info(`exception: ${exception.length} - dateException: ${dateException.toString()} - daySchedule: ${daySchedule} - dayScheduleOriginal: ${dayScheduleOriginal} - user: [SYSTEM] - params: ${dutConfig.dutId}`);
        }

        let dayConfig: {
          [day: string]: DayProg
        } = {};

        dayConfig[daySchedule] = {
          permission: !isExceptionDay ? newConfig.PERMISSION: exception[0].PERMISSION,
          start: !isExceptionDay ? newConfig.BEGIN_TIME: exception[0].BEGIN_TIME,
          end: !isExceptionDay ? newConfig.END_TIME: exception[0].END_TIME,
        };

        // Enviará apenas dia considerado no agendamento e a primeira do dia seguinte se o modo não for outro
        if (nextDayConfig && nextDayConfig.CTRLOPER === newConfig.CTRLOPER) {
          dayConfig[dayNextSchedule] = {
            permission: nextDayConfig.PERMISSION,
            start: nextDayConfig.BEGIN_TIME,
            end: nextDayConfig.END_TIME,
          };
        }

        // Caso mudou de dia, mantem a última programação do dia atual. Caso a mesma não exista, apague
        if (daySchedule !== dayScheduleOriginal) {
          const currentDutProg = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: dutConfig.dutId });
          if (currentDutProg && currentDutProg.DESIREDPROG) {
            const parsedDesired = JSON.parse(currentDutProg.DESIREDPROG);
            if (parsedDesired.week && parsedDesired.week[dayScheduleOriginal] && parsedDesired.week[dayScheduleOriginal].permission && parsedDesired.week[dayScheduleOriginal].start && parsedDesired.week[dayScheduleOriginal].end) {
              dayConfig[dayScheduleOriginal] = {
                permission: parsedDesired.week[dayScheduleOriginal].permission,
                start: parsedDesired.week[dayScheduleOriginal].start,
                end: parsedDesired.week[dayScheduleOriginal].end,
              }
            }
            else {
              delete dayConfig[dayScheduleOriginal];
            }
          }
          else {
            delete dayConfig[dayScheduleOriginal];
          }
        }

        // Considera exceções anteriormente cadastradas para setar no DESIREDPROG, evitando remoção quando executa rotinas
        // reenvio de comandos pendentes, que compara LASTPROG com DESIREDPROG
        const dutExceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: dutConfig.dutId, EXCEPTION_DATE_ABOVE: dateException });
        let exceptions = {} as {
          [day: string]: DayProg
        };

        if (!dutExceptions) {
          exceptions = {};
        }
        else {
          dutExceptions.forEach((exception) => {
            const day = `${exception.EXCEPTION_DATE.substring(6, 10)}-${exception.EXCEPTION_DATE.substring(3, 5)}-${exception.EXCEPTION_DATE.substring(0, 2)}`;
            exceptions[day] = {
              permission: exception.PERMISSION,
              start: exception.BEGIN_TIME,
              end: exception.END_TIME,
            };
          });
        }

        const reqParamsSetProgramming: FullProg_v4 = {
            exceptions: exceptions,
            version: 'v4' as 'v4' ,
            week: dayConfig
        };

        let configToSchedule: ScheduleDutToMultiple;
        // Se não tiver exceção ou for programação do dia seguinte, envia configuração da programação; se não envia da exceção
        if (!isExceptionDay) {
          configToSchedule = newConfig;
        }
        else {
          configToSchedule = {
            BEGIN_TIME: newConfig.BEGIN_TIME,
            DUT_SCHEDULE_ID: newConfig.DUT_SCHEDULE_ID,
            DUT_AUTOMATION_PARAMETERS_ID: exception[0].DUT_AUTOMATION_PARAMETERS_ID,
            SCHEDULE_STATUS: newConfig.SCHEDULE_STATUS,
            END_TIME: newConfig.END_TIME,
            CTRLOPER: exception[0].CTRLOPER as ControlMode,
            DAYS: newConfig.DAYS,
            PERMISSION: exception[0].PERMISSION,
            SETPOINT: exception[0].SETPOINT,
            LTC: exception[0].LTC,
            LTI: exception[0].LTI,
            UPPER_HYSTERESIS: exception[0].UPPER_HYSTERESIS,
            LOWER_HYSTERESIS: exception[0].LOWER_HYSTERESIS,
            SCHEDULE_START_BEHAVIOR: exception[0].SCHEDULE_START_BEHAVIOR,
            SCHEDULE_END_BEHAVIOR: exception[0].SCHEDULE_END_BEHAVIOR,
            FORCED_BEHAVIOR: exception[0].FORCED_BEHAVIOR,
            CURRENT_IN_DUT: true,
            ACTION_MODE: exception[0].ACTION_MODE,
            ACTION_TIME: exception[0].ACTION_TIME,
            ACTION_POST_BEHAVIOR: exception[0].ACTION_POST_BEHAVIOR,
          }
        }

        promises.push(enviarProg({
          dutId: dutConfig.dutId,
          newConfig,
          daySchedule,
          reqParamsSetProgramming,
          configToSchedule,
          currentConfig,
          date: new Date(dateToLastProg.format('YYYY-MM-DDTHH:mm:ss')),
        }));
        await new Promise((r) => setTimeout(r, 20)); // Sleep for 20ms
      }
    }

    await Promise.all(promises).catch((perr) => {
      logger.error(`Error [2] multiple schedules to DUTs: ${perr} - user: '[SYSTEM]'`);
    });
  } catch(perr) {
    logger.error(`Error [1] multiple schedules to DUTs: ${perr} - user: '[SYSTEM]'`);
  }
}

async function enviarProg(params: {
  dutId: string,
  newConfig: ScheduleDutToMultiple,
  daySchedule: DaysOfWeek,
  reqParamsSetProgramming: FullProg_v4,
  configToSchedule: ScheduleDutToMultiple,
  currentConfig: ScheduleDutToMultiple,
  date: Date,
}) {
  const { dutId, newConfig, daySchedule, reqParamsSetProgramming, configToSchedule, currentConfig, date } = params;
  // chamar rota para programar novo horário de dut: /dut/set-programming-v3
  {
    const trySetProgramming = 3; // Será feito 3 tentativas
    let resultSetProgramming = false;
    for (let i = 0; i < trySetProgramming; i++) {
      resultSetProgramming = await controlSetProgramming(dutId, daySchedule, reqParamsSetProgramming, configToSchedule.CTRLOPER === '7_FORCED');
      if (servConfig.debugScriptMultScheduleDut) {
        logger.info(`resultSetProgramming resultSetProgramming: ${JSON.stringify(resultSetProgramming)} - user: [SYSTEM] - params: ${dutId}`);
      }
      if (resultSetProgramming) {
        i = trySetProgramming;
      }
    }
    if (!resultSetProgramming) {
      return;
    }
  }

  // chamar rota para alterar informações de dut: /dut/set-dut-info
  {
    const resultControlSetDutInfo = await controlSetDutInfo(dutId, configToSchedule);
    if (!resultControlSetDutInfo) {
      return;
    }
  }

  // chamar rota para reenvio de configuração de dut: /resend-dut-aut-config
  {
    const tryResendConfig = 3; // Será feito 3 tentativas
    for (let i = 0; i < tryResendConfig; i++) {
      try {
        const dutResendConfig = await resendDutAutConfig({devId: dutId, user: '[SYSTEM]'});
        if (servConfig.debugScriptMultScheduleDut) {
          logger.info(`resendDutAutConfig result: ${JSON.stringify(dutResendConfig)} - user: [SYSTEM] - params: ${dutId}`);
        }

        if (dutResendConfig) {
          i = 3;
        }
      }
      catch (err) {
        logger.error({
          message: `msg resendDutAutConfig: ${err} - user: [SYSTEM] - params: ${dutId}`,
          stack: (err as Error).stack,
        });
        if (i === 2) {
          return;
        }
      }
    }
  }

  // Altera parâmetros para indicar qual a programação atual
  {
    try {
      const currentDeviceProg = await collectFullDutProg({ devId: dutId, userId: '[SYSTEM]' });
      if (servConfig.debugScriptMultScheduleDut) {
        logger.info(`collectFullDutProg result: ${JSON.stringify(currentDeviceProg)} - user: [SYSTEM] - params: ${dutId}`);
      }
      if (currentDeviceProg.week) {
      // Atualizou programação para o dia atual
        let hasUpdatedProgramming = newConfig.BEGIN_TIME === currentDeviceProg.week[daySchedule].start &&
                                    newConfig.END_TIME === currentDeviceProg.week[daySchedule].end &&
                                    newConfig.PERMISSION === currentDeviceProg.week[daySchedule].permission;

        if (hasUpdatedProgramming) {
          if (currentConfig) {
            await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentConfig.DUT_AUTOMATION_PARAMETERS_ID, CURRENT_IN_DEVICE: '0'}, '[SYSTEM]');
          }
          const dateToInsert = `${date.getFullYear()}-${zeroPad(date.getMonth() + 1, 2)}-${zeroPad(date.getDate(), 2)} ${zeroPad(date.getHours(), 2)}:${zeroPad(date.getMinutes(), 2)}:${zeroPad(date.getSeconds(), 2)}`
          await sqldb.AUTOMATIONS_PARAMETERS.w_updateInfo({ID: newConfig.DUT_AUTOMATION_PARAMETERS_ID, CURRENT_IN_DEVICE: '1'}, '[SYSTEM]');
          const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: dutId});
          if (currentAutomationId) {
            await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({
              ID: currentAutomationId.ID,
              LAST_CHANGE_IN_MULTIPLE_SCHEDULE: dateToInsert,
            }, '[SYSTEM]');
          }
        }
      }
    }
    catch (err) {
      logger.error(`msg updateCurrent: ${err} - user: [SYSTEM]`);
      return;
    }
  }
}

// Tarefa diária para enviar exceções anuais quando passou a data
async function taskDutAnnualExcepts () {
  const dutsWithExceptions = await sqldb.DUTS_EXCEPTIONS.getDutsWithExceptions();
  const unshiftedDate = new Date();
  const date = new Date(unshiftedDate.getTime() - 3 * 60 * 60 * 1000);
  const dateToday = `${date.getUTCFullYear()}-${zeroPad(date.getUTCMonth(), 2)}-${zeroPad(date.getUTCDate(), 2)}`;
  await Promise.all(
    dutsWithExceptions.map( async (dut) => {
      const exceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: dut.DUT_ID });
      const exceptionsToDelete = exceptions.filter(exception => exception.EXCEPTION_DATE_FORMATED < dateToday && exception.REPEAT_YEARLY !== '1');
      const exceptionsToUpdate = exceptions.filter(exception => exception.EXCEPTION_DATE_FORMATED < dateToday && exception.REPEAT_YEARLY === '1');
      const dutSchedules = await sqldb.DUTS_SCHEDULES.getDutScheds({ DUT_ID: dut.DUT_ID});

      for (const exception of exceptionsToDelete) {
        const dutExceptionInfo = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({DUT_EXCEPTION_ID: exception.DUT_EXCEPTION_ID});
        await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: exception.DUT_EXCEPTION_ID}, '[SYSTEM]');
        await sqldb.AUTOMATIONS_PERIODS_PARAMETERS.w_deleteByAutomationPeriodId({AUTOMATION_PERIOD_ID: exception.DUT_EXCEPTION_ID}, '[SYSTEM]');;
        await sqldb.AUTOMATIONS_PARAMETERS.w_delete({ID: dutExceptionInfo[0].DUT_AUTOMATION_PARAMETERS_ID}, '[SYSTEM]');
        await sqldb.EXCEPTIONS.w_deleteByAutomationPeriod({AUTOMATION_PERIOD_ID: exception.DUT_EXCEPTION_ID}, '[SYSTEM]');
        await sqldb.AUTOMATIONS_PERIODS.w_deleteRow({ID: exception.DUT_EXCEPTION_ID}, '[SYSTEM]');
      }

      for (const exception of exceptionsToUpdate) {
        const exceptionCard = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({DUT_EXCEPTION_ID: exception.DUT_EXCEPTION_ID});
        await sqldb.EXCEPTIONS.w_updateIncreaseYear({ID: exceptionCard[0].EXCEPTION_ID}, '[SYSTEM]');
      }

      // Se não é DUT que precisa de script de programação múltipla, já realiza envio de programação para DESIREDPROG
      if (exceptionsToUpdate.length > 0 && dutSchedules.length > 0 && !dutSchedules[0].NEED_MULT_SCHEDULES) {
        const currentDeviceProg = await collectFullDutProg({ devId: dut.DUT_ID, userId: '[SYSTEM]' });

        const dutExceptions = await sqldb.DUTS_EXCEPTIONS.getDutExceptions({ DUT_ID: dut.DUT_ID });
        let exceptions = {} as {
          [day: string]: DayProg
        };

        if (!dutExceptions) {
          exceptions = {}
        }
        else {
          dutExceptions.forEach((exception) => {
            const day = `${exception.EXCEPTION_DATE.substring(6, 10)}-${exception.EXCEPTION_DATE.substring(3, 5)}-${exception.EXCEPTION_DATE.substring(0, 2)}`;
            exceptions[day] = {
              permission: exception.PERMISSION,
              start: exception.BEGIN_TIME,
              end: exception.END_TIME,
            }
          })
        }

        const reqParamsSetProgramming: FullProg_v4 = {
            exceptions: exceptions,
            version: 'v4' as 'v4' ,
            week: currentDeviceProg.week
        };

        // chamar rota para programar novo horário de dut: /dut/set-programming-v3
        try {
          const resultSetProgramming = await setProgrammingV3(dut.DUT_ID, reqParamsSetProgramming, false);
        }
        catch (err) {
          logger.error(`Erro ao enviar exceções em rotina de rotação de exceções anuais. Msg: ${err}`);
        }
      }
    })
  ).catch((perr) => {
    logger.error(`Error updating yearly exceptions: ${perr} - user: '[SYSTEM]'`);
  });
}

type DutConfigFilter = 'CURRENT_ON_DUT'|'BETWEEN_HOUR'|'GREATER_THAN_HOUR';

function getDutConfigId(
  configFilter: DutConfigFilter,
  schedules: ScheduleDutToMultiple[],
  hourNow: string,
  daySchedule: string
): ScheduleDutToMultiple|null {
  schedules.sort((a, b) => {
    if (a.BEGIN_TIME > b.BEGIN_TIME) return 1;
    else return -1;
  });

  if (configFilter === 'CURRENT_ON_DUT') {
    for (const schedule of schedules){
      if (schedule.CURRENT_IN_DUT && schedule.SCHEDULE_STATUS) {
        return schedule;
      }
    }
  }
  else if (configFilter === 'BETWEEN_HOUR'){
    for (const schedule of schedules){
      if (schedule.BEGIN_TIME <= hourNow && schedule.END_TIME >= hourNow && checkDayDutMultSchedulePermission(daySchedule, schedule.DAYS) && schedule.SCHEDULE_STATUS) {
        return schedule;
      }
    }
  }
  else if (configFilter === 'GREATER_THAN_HOUR'){
    for (const schedule of schedules){
      if (schedule.BEGIN_TIME >= hourNow && checkDayDutMultSchedulePermission(daySchedule, schedule.DAYS) && schedule.SCHEDULE_STATUS) {
        return schedule;
      }
    }
  }

  return null;
}

async function controlSetProgramming(dutId: string, daySchedule: DaysOfWeek, reqParamsSetProgramming: FullProg_v4, needResendIr: boolean) {
  try {
    const resultSetProgramming = await setProgrammingV3(dutId, reqParamsSetProgramming, needResendIr);

    if (servConfig.debugScriptMultScheduleDut) {
      logger.info(`setProgrammingV3 result: ${resultSetProgramming} - user: [SYSTEM] - params: ${JSON.stringify(reqParamsSetProgramming)}`);
    }

    if (!checkDayDutsMultScheduleConfig(daySchedule, reqParamsSetProgramming.week[daySchedule], reqParamsSetProgramming.week)) {
      logger.error(`msg: Programação Horária do dispositivo não está igual programação desejada para o dia ${daySchedule} -
      dispositivo: ${JSON.stringify(resultSetProgramming)} - esperada: ${JSON.stringify(reqParamsSetProgramming)}`);
      return false;
    }
  }
  catch (err){
    logger.error({
      devId: dutId,
      message: `msg setProgrammingV3: ${err} - user: [SYSTEM] - params: ${JSON.stringify(reqParamsSetProgramming)} dutId: ${dutId}`,
      stack: (err as Error).stack,
    });
    return false;
  }
  return true;
}

async function controlSetDutInfo(dutId: string, schedule: ScheduleDutToMultiple) {
  const machines = await sqldb.MACHINES.getDutMachines({ DUT_ID: dutId })
  const reqParamsDutInfo = {
    DEV_ID: dutId,
    CTRLOPER: schedule.CTRLOPER,
    LTCRIT: schedule.LTC || null,
    LTINF: schedule.LTI || null,
    PORTCFG: 'IR' as 'RELAY'|'IR',
    // RESENDPER: infoDb.RESENDPER_DUT || null,
    TSETPOINT: schedule.SETPOINT || null,
    USE_IR: 1 as 0|1,
    groups: machines.map(machine => machine.GROUP_ID.toString()),
    UPPER_HYSTERESIS: schedule.UPPER_HYSTERESIS,
    LOWER_HYSTERESIS: schedule.LOWER_HYSTERESIS,
    SCHEDULE_START_BEHAVIOR: schedule.SCHEDULE_START_BEHAVIOR || null,
    SCHEDULE_END_BEHAVIOR: schedule.SCHEDULE_END_BEHAVIOR || null,
    FORCED_BEHAVIOR: schedule.FORCED_BEHAVIOR || null,
    UPDATE_AUTOM_INFO: true,
    IR_ID_COOL: schedule.IR_ID_COOL || null,
    ACTION_MODE: schedule.ACTION_MODE,
    ACTION_TIME: schedule.ACTION_TIME,
    ACTION_POST_BEHAVIOR: schedule.ACTION_POST_BEHAVIOR,
    userId: '[SYSTEM]',
  };

  try {
    const resultSetProgramming = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/updateDutInfoSchedule', reqParamsDutInfo);
    if (servConfig.debugScriptMultScheduleDut) {
      logger.info(`setDutInfo result: ${resultSetProgramming} - user: [SYSTEM] - params: ${JSON.stringify(reqParamsDutInfo)}`);
    }
  }
  catch (err){
    logger.error(`msg setDutInfo: ${err} - user: [SYSTEM] - params: ${JSON.stringify(reqParamsDutInfo)}`);
    return false;
  }

  return true;
}

function checkDayDutMultSchedulePermission(dayNow: string, days: {
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
  sun: boolean,
}): boolean {
  switch(dayNow) {
    case 'mon': { return days.mon; }
    case 'tue': { return days.tue; }
    case 'wed': { return days.wed; }
    case 'thu': { return days.thu; }
    case 'fri': { return days.fri; }
    case 'sat': { return days.sat; }
    case 'sun': { return days.sun; }
  }

  return false;
}

function checkDayDutsMultScheduleConfig(dayNow: string, day: DayProg, newConfig: {
  mon?: DayProg,
  tue?: DayProg,
  wed?: DayProg,
  thu?: DayProg,
  fri?: DayProg,
  sat?: DayProg,
  sun?: DayProg,
}): boolean {
  switch(dayNow) {
    case 'mon': { 
      return day.permission === newConfig.mon.permission && day.start === newConfig.mon.start && day.end === newConfig.mon.end;
    }
    case 'tue': { 
      return day.permission === newConfig.tue.permission && day.start === newConfig.tue.start && day.end === newConfig.tue.end;
    }
    case 'wed': { 
      return day.permission === newConfig.wed.permission && day.start === newConfig.wed.start && day.end === newConfig.wed.end;
    }
    case 'thu': { 
      return day.permission === newConfig.thu.permission && day.start === newConfig.thu.start && day.end === newConfig.thu.end;
    }
    case 'fri': { 
      return day.permission === newConfig.fri.permission && day.start === newConfig.fri.start && day.end === newConfig.fri.end;
    }
    case 'sat': { 
      return day.permission === newConfig.sat.permission && day.start === newConfig.sat.start && day.end === newConfig.sat.end;
    }
    case 'sun': { 
      return day.permission === newConfig.sun.permission && day.start === newConfig.sun.start && day.end === newConfig.sun.end;
    }
  }

  return false;
}

async function setProgrammingV3 (devId: string, reqParams: FullProg_v4, needResendIr: boolean) {
  const dutDbInfo = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });
  if (!dutDbInfo) { throw Error('DUT not found').HttpStatus(400) }

  const currentProg = parseFullProgV4(dutDbInfo.LASTPROG);
  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      week: reqParams.week,
      exceptions: reqParams.exceptions,
      ventTime: reqParams.ventTime,
      temprtControl: reqParams.temprtControl,
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: '[SYSTEM]' - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDUT(devId, desiredProg, '[SYSTEM]');

  const commands = adjustSchedule_v2(desiredProg, currentProg, false, dutDbInfo.DISAB);

  await sendDevSchedule(devId, commands, '[SYSTEM]', 'setProgrammingV3');
  if (needResendIr) {
    await resendDutIrCodes({ devId });
  }
  const programming: FullProg_v4 = await collectFullDutProg({ devId, userId: '[SYSTEM]' });
  if (!programming.week) programming.week = {};

  compareDutProg(desiredProg, programming);

  return programming;
}

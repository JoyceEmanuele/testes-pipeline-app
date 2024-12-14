import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands';
import { getDriEcoMonitor } from '../realTime/ecoMode';
import { logger } from '../../srcCommon/helpers/logger';
import { setTimeout } from "timers/promises";
import * as dbRamCache from '../ramCaches/dbRamCache'
import { MINIMUM_AUTOMATION_VERSION, sendDriCommand } from '../../srcCommon/dri/driInfo';
import type { DriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { loadLastTelemetries_dri } from '../../srcCommon/helpers/devsLastComm';
import { compareVersions, parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion';

const weekDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface DriCfg {
  application: string;
  protocol: string;
  machines?: {
    id: number;
    vars: {
      name: string;
    }[];
  }[];
  varsList?: {}[];
  w_varsList?: {
    name: string,
    address: {
      protocol?: string
      machine?: number
      ip?: string
      id?: number
      function?: number
      address?: number
      values?: number[],
    },
  }[];
  driConfigs?: {};
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
  }[]
}

interface DriProg {
  SCHED_ID: number;
  DRI_ID: string;
  ACTIVE: string;
  OPERATION: string;
  BEGIN_TIME: string;
  END_TIME: string;
  MODE: string;
  DAYS: string;
  SETPOINT: number;
  EXCEPTION_DATE?: string;
  EXCEPTION_REPEAT_YEARLY?: string;
}

interface Command {
  name: string;
  address: {
    protocol?: string
    machine?: number
    ip?: string
    id?: number
    function?: number
    address?: number
    values?: number[],
  },

  type: string;
  value: string;
};

/**
 * Function to workaround the definition of the mode refrigerator in the Fancoil BAC-6000
 */
async function coolDriFancoilWorkaround(driId: string, driCfg: DriCfg, driProg: DriProg) {
  const lastTelemetries = await loadLastTelemetries_dri({
    devIds: [driId]
  });
  const { lastTelemetry } = lastTelemetries.lastDriTelemetry(driId, driCfg);

  const noNeedWorkaround = lastTelemetry?.ThermOn === 1 && lastTelemetry?.Mode === '0';

  if (driCfg.application !== "fancoil-bac-6000" ||
    (driProg.MODE.toLowerCase() !== 'cool') ||
    (driProg.OPERATION === '0') ||
    noNeedWorkaround) {
    return;
  }

  const setpointCool = "15";
  sendDriCommand(driId, driCfg, 'setpoint', setpointCool, '[SYSTEM][Sched]');
  await setTimeout(5000);
}

async function sendDriSched(driId: string, driCfg: DriCfg, prog: DriProg, date: Date, user: string) {
  const commands = [] as Command[];

  if (driCfg.application === 'carrier-ecosplit') {
    schedCarrierEcosplit(prog, driCfg, commands);
  }

  if (driCfg.application?.startsWith('vav')) {
    schedVav(prog, driCfg, driId);
  }

  if (driCfg.application?.startsWith('fancoil')) {
    if (prog.OPERATION === '1') {
      await setTimeout(10000);
      sendDriCommand(driId, driCfg, 'therm', '1', '[SYSTEM][Sched]');
      await setTimeout(10000);

      if (prog.MODE) {
        sendDriCommand(driId, driCfg, 'mode', prog.MODE.toLowerCase() === 'cool' ? '0' : '2', '[SYSTEM][Sched]');
        sendDriCommand(driId, driCfg, 'fanspeed', '1', '[SYSTEM][Sched]');
      }

      await coolDriFancoilWorkaround(driId, driCfg, prog);

      if (prog.SETPOINT) {
        sendDriCommand(driId, driCfg, 'setpoint', prog.SETPOINT.toString(), '[SYSTEM][Sched]');
      }
    } else {
      sendDriCommand(driId, driCfg, 'therm', '0', '[SYSTEM][Sched]');
      sendDriCommand(driId, driCfg, 'mode', '2', '[SYSTEM][Sched]');
    }
  }

  commands.forEach((command) => {
    devsCommands.sendDriVarConfig(driId, JSON.stringify(command.address), user);
  })
}

function schedCarrierEcosplit(prog: DriProg, driCfg: DriCfg, commands: Command[]) {
  if (prog.OPERATION === '1') {
    if (prog.MODE) {
      const result = driCfg.w_varsList.find((item) => item.name.toLowerCase().includes(prog.MODE.toString().toLowerCase()));
      commands.push({ ...result, type: 'mode', value: prog.MODE });
    }
    if (prog.SETPOINT) {
      const result = driCfg.w_varsList.find((item) => item.name.toLowerCase().includes(prog.SETPOINT.toString().toLowerCase()));
      commands.push({ ...result, type: 'setpoint', value: prog.SETPOINT.toString() });
    }
  } else {
    const result = driCfg.w_varsList.find((item) => item.name.toLowerCase().includes('OFF'.toLowerCase()));
    commands.push({ ...result, type: 'on/off', value: 'OFF' });
  }
}

function schedVav(prog: DriProg, driCfg: DriCfg, driId: string) {
  if (prog.OPERATION === '1') {
    if (prog.SETPOINT) {
      sendDriCommand(driId, driCfg, 'setpoint', prog.SETPOINT.toString(), '[SYSTEM][Sched]');
    }
  } else {
    const setpointCloseVAV = '30';
    sendDriCommand(driId, driCfg, 'setpoint', setpointCloseVAV, '[SYSTEM][Sched]');
  }
}

function getExceptions(driScheds: DriProg[], formattedDate: string) {
  return (
    driScheds.filter((sched) => (
      sched.EXCEPTION_DATE && sched.ACTIVE === '1'
        && sched.EXCEPTION_REPEAT_YEARLY === '1'
        ? sched.EXCEPTION_DATE.substring(0, 5) === formattedDate.substring(0, 5)
        : sched.EXCEPTION_DATE === formattedDate
    )))
}

function getClosestProg(progs: DriProg[]) {
  return (
    progs.reduce((closest, sched) => {
      if (!closest) return sched;
      const schedEndTimeNumber = Number(sched.END_TIME.replace(':', ''));
      const closestEndTimeNumber = Number(closest.END_TIME.replace(':', ''));
      return schedEndTimeNumber < closestEndTimeNumber ? sched : closest
    }, undefined)
  );
}

function verifyAutomationByDevice(currentVersion?: string): boolean {
  if (!currentVersion) return false;
  
  const versionNumber = parseFirmwareVersion(currentVersion);
  
  if (compareVersions(versionNumber, MINIMUM_AUTOMATION_VERSION, false) >= 0) return true;
  return false;
}

function verifyNeedAutomation(driCfg?: DriConfig): boolean {
  return !!driCfg && !!driCfg.driScheds && !verifyAutomationByDevice(driCfg.CURRFW_VERS);
}

export function initDriAutomation() {
  recurrentTasks.runLoop({
    taskName: 'AUTOM_DRI',
    iterationPause_ms: 60 * 1000, // 1 minute
    subExecTimeFromPause: true,
    data: { verificationTimer: Date.now() + 15 * 60 * 1000 },
    hideIterationsLog: true,
  }, async (opts) => {
    const unshiftedDate = new Date();
    const currentDate = new Date(unshiftedDate.getTime() - 3 * 60 * 60 * 1000);
    const formattedDate = currentDate.toISOString().split('T')[0].split('-').reverse().join('/');
    const currentDay = weekDay[currentDate.getUTCDay()];
    const currentHours = `${currentDate.getUTCHours().toString().padStart(2, '0')}:${currentDate.getUTCMinutes().toString().padStart(2, '0')}`;
    const enablePasso2 = !(opts.data.verificationTimer > Date.now());
    if (enablePasso2) opts.data.verificationTimer = Date.now() + 15 * 60 * 1000;

    const drisList = dbRamCache.getCachedDriCfgList();

    for (const [driId, driCfg] of Object.entries(drisList)) {
      try {
        if (!verifyNeedAutomation(driCfg)) continue;

        let dayProgs: DriProg[] = [];
        const exceptions = getExceptions(driCfg.driScheds, formattedDate);
        if (exceptions.length) {
          dayProgs = exceptions;
        } else {
          dayProgs = driCfg.driScheds.filter((sched) => JSON.parse(sched.DAYS)[currentDay] && sched.ACTIVE === '1');
        }

        let schedSent = passo1(driId, driCfg, unshiftedDate, currentDate, dayProgs, currentHours);

        if ((!schedSent) && enablePasso2) {
          schedSent = passo2(driId, driCfg, unshiftedDate, dayProgs, currentHours);
        }
      } catch (err) {
        logger.error(err);
      }
    }
  });
}

function passo1(driId: string, driCfg: DriConfig, unshiftedDate: Date, currentDate: Date, dayProgs: DriProg[], currentHours: string): boolean {
  const nextProg = dayProgs.find((sched) => sched.BEGIN_TIME === currentHours || sched.END_TIME === currentHours);
  if (!nextProg) return false;

  if (nextProg && nextProg.BEGIN_TIME === currentHours) {
    // HORÁRIO DE INÍCIO DE UMA PROGRAMAÇÃO -> EXECUTA A PROGRAMAÇÃO
    sendDriSched(driId, driCfg, nextProg, unshiftedDate, '[SYSTEM][Sched]').catch((e) => logger.error(e));
    return true;
  }

  // HORÁRIO DE TÉRMINO DE UMA PROGRAMAÇÃO
  const progs = dayProgs.filter((sched) => currentHours > sched.BEGIN_TIME && currentHours < sched.END_TIME);
  const closestProg = getClosestProg(progs);
  if (closestProg) {
    // HORÁRIO PERTENCE A OUTRA PROGRAMAÇÃO -> EXECUTA AQUELA PROGRAMAÇÃO
    sendDriSched(driId, driCfg, closestProg, unshiftedDate, '[SYSTEM][Sched]').catch((e) => logger.error(e));
    return true;
  }

  // HORÁRIO NÃO PERTENCE A OUTRA PROGRAMAÇÃO

  // VERIFICA SE O HORARIO DE TÉRMINO É 23:59 E SE NO PRÓXIMO DIA TEM ALGUMA PROGRAMAÇÃO
  // PARA LIGAR AS 00:00
  const nextDay = weekDay[(currentDate.getUTCDay() + 1) % 7];
  const nextDayProgs = driCfg.driScheds.filter((sched) => JSON.parse(sched.DAYS)[nextDay] && sched.ACTIVE === '1');
  if (
    nextProg.END_TIME === '23:59' && nextProg.OPERATION === '1'
    && nextDayProgs.some((prog) => prog.BEGIN_TIME === '00:00' && prog.OPERATION === '1')) {
    // NÃO DESLIGA A MÁQUINA
    return false;
  }

  // DESLIGA A MÁQUINA
  if (driCfg.application === 'carrier-ecosplit') {
    sendDriCommand(driId, driCfg, 'on/off', 'OFF', '[SYSTEM][Sched]');
    return true;
  }
  if (driCfg.application?.startsWith('vav')) {
    const setpointCloseVAV = '30';
    sendDriCommand(driId, driCfg, 'setpoint', setpointCloseVAV, '[SYSTEM][Sched]');
    return true;
  }
  if (driCfg.application?.startsWith('fancoil')) {
    sendDriCommand(driId, driCfg, 'therm', '0', '[SYSTEM][Sched]');
    sendDriCommand(driId, driCfg, 'mode', '2', '[SYSTEM][Sched]');
    return true;
  }

  return false;
}

function passo2(driId: string, driCfg: DriConfig, unshiftedDate: Date, dayProgs: DriProg[], currentHours: string): boolean {
  // const lastTelemetry = getDriLastTelemetryCache(driId);
  // if (!lastTelemetry) continue;
  // lastTelemetry.timestamp -> 'YYYY-MM-DDTHH:MM:SS'
  // const [lastTelDate, lastTelTime] = lastTelemetry.timestamp ? lastTelemetry.timestamp.split('T') : [null, null];
  // HH:MM
  // const lastTelHours = lastTelTime && lastTelTime.substring(0, 5);
  // if (lastTelDate !== currentDate.toISOString().substring(0, 10)) continue;

  const ecoMonitor = getDriEcoMonitor(driId);
  if (ecoMonitor?.runningEco) return false;

  if (!dayProgs.length) return false;

  const progs = dayProgs.filter((sched) => (currentHours >= sched.BEGIN_TIME) && (currentHours < sched.END_TIME));

  if (progs.length === 0) {
    if (driCfg.application === 'carrier-ecosplit') {
      sendDriCommand(driId, driCfg, 'on/off', 'OFF', '[SYSTEM][SchedCheck]');
      return true;
    }
    if (driCfg.application?.startsWith('vav')) {
      const setpointCloseVAV = '30';
      sendDriCommand(driId, driCfg, 'setpoint', setpointCloseVAV, '[SYSTEM][SchedCheck]');
      return true;
    }

    if (driCfg.application.startsWith('fancoil') && dayProgs.some((item) => !!item.EXCEPTION_DATE)) {
      sendDriCommand(driId, driCfg, 'therm', '0', '[SYSTEM][Sched]');
      sendDriCommand(driId, driCfg, 'mode', '2', '[SYSTEM][Sched]');
      return true;
    }
    return false;
  }

  const closestProg = getClosestProg(progs);
  if (closestProg) {
    if (driCfg.application.startsWith('vav')) {
      sendDriCommand(driId, driCfg, 'therm', '1', '[SYSTEM][SchedCheck]');
      sendDriCommand(driId, driCfg, 'fanspeed', '1', '[SYSTEM][SchedCheck]');
      sendDriCommand(driId, driCfg, 'mode', '0', '[SYSTEM][SchedCheck]');
    }
    sendDriSched(driId, driCfg, closestProg, unshiftedDate, '[SYSTEM][SchedCheck]').catch((e) => logger.error(e));
    return true;
  }

  return false;
}

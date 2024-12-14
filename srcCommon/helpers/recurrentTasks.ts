import { logger, onNewReq, onReqEnd } from './logger'
import { checkUnexpectedError } from './eventWarn'
import configfile from '../../configfile';

interface RunLoopOpts<T=undefined> {
  taskName: string,
  iterationPause_ms: number,
  subExecTimeFromPause?: boolean,
  initialDelay_ms?: number,
  hideIterationsLog?: boolean,
  data?: T,
}
export function runLoop<T=undefined>(opts: RunLoopOpts<T>, callback: (opts?: RunBgOpts<T>) => PromiseLike<void>|void) {
  runBgTask({
    logBackgroundTask: function (message: string) { logger.info(`[BGTASK] ${this.taskName}: ${message}`); },
    taskName: opts.taskName,
    atHour: undefined,
    atEveryHourChange: undefined,
    atWeekDay: undefined,
    iterationPause_ms: opts.iterationPause_ms,
    subExecTimeFromPause: opts.subExecTimeFromPause,
    initialDelay_ms: opts.initialDelay_ms,
    runAtStart: undefined,
    data: opts.data,
    hideIterationsLog: opts.hideIterationsLog,
  }, callback);
}

interface RunAtHourOpts<T=undefined> {
  taskName: string,
  atHour: number,
  atWeekDay?: number,
  runAtStart?: boolean,
  initialDelay_ms?: number,
  data?: T,
}
export function runAtHour<T=undefined>(opts: RunAtHourOpts<T>, callback: (opts?: RunBgOpts<T>) => PromiseLike<void>|void) {
  runBgTask({
    logBackgroundTask: function (message: string) { logger.info(`[BGTASK] ${this.taskName}: ${message}`); },
    taskName: opts.taskName,
    atHour: opts.atHour,
    atEveryHourChange: undefined,
    atWeekDay: opts.atWeekDay,
    iterationPause_ms: 57607, // 57607 is an arbitrary number
    subExecTimeFromPause: false,
    initialDelay_ms: opts.initialDelay_ms,
    runAtStart: opts.runAtStart,
    data: opts.data,
    hideIterationsLog: false,
  }, callback);
}

interface RunAtEveryHourChangeOpts<T=undefined> {
  taskName: string,
  runAtStart?: boolean,
  initialDelay_ms?: number,
  data?: T,
}
export function runAtEveryHourChange<T=undefined>(opts: RunAtEveryHourChangeOpts<T>, callback: (opts?: RunBgOpts<T>) => PromiseLike<void>|void) {
  runBgTask({
    logBackgroundTask: function (message: string) { logger.info(`[BGTASK] ${this.taskName}: ${message}`); },
    taskName: opts.taskName,
    atHour: undefined,
    atEveryHourChange: true,
    atWeekDay: undefined,
    iterationPause_ms: 57607, // 57607 is an arbitrary number
    subExecTimeFromPause: false,
    initialDelay_ms: opts.initialDelay_ms,
    runAtStart: opts.runAtStart,
    data: opts.data,
    hideIterationsLog: false,
  }, callback);
}

interface RunBgOpts<T=undefined> {
  taskName: string,
  atHour: number,
  atEveryHourChange: boolean,
  atWeekDay: number,
  iterationPause_ms: number,
  subExecTimeFromPause: boolean,
  initialDelay_ms: number,
  runAtStart: boolean,
  data: T,
  hideIterationsLog: boolean,
  logBackgroundTask: (message: string) => void,
}
function runBgTask<T=undefined>(opts: RunBgOpts<T>, callback: (data?: RunBgOpts<T>) => PromiseLike<void>|void) {
  let now_shiftedBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
  let lastTickRec_shiftedBR = now_shiftedBR;

  logBackgroundTask(opts.taskName, "Iniciando serviço " + JSON.stringify(opts));
  (async function () {
    if (opts.initialDelay_ms) {
      await new Promise((r) => setTimeout(r, opts.initialDelay_ms));
    }
    let runAtStart = opts.runAtStart;
    while(true) {
      const iterationStart = Date.now();
      const lastTick_shiftedBR = lastTickRec_shiftedBR;
      now_shiftedBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
      lastTickRec_shiftedBR = now_shiftedBR;

      let canExecute = checkTimeRestriction(opts, now_shiftedBR, lastTick_shiftedBR);
      if (runAtStart) {
        canExecute = true;
        runAtStart = false;
      }
      if (canExecute) {
        await doExecute(opts, callback);
      }

      let pauseTime = opts.iterationPause_ms;
      if (opts.subExecTimeFromPause) {
        const iterationDuration = Date.now() - iterationStart;
        pauseTime -= iterationDuration;
      }
      if (pauseTime > 0) {
        await new Promise((r) => setTimeout(r, pauseTime));
      }
    }
  }());
}

async function doExecute<T=undefined>(opts: RunBgOpts<T>, callback: (data?: RunBgOpts<T>) => PromiseLike<void>|void) {
  const reqId = configfile.logUdpPort && onNewReq(opts.taskName, '(bgtask)', JSON.stringify(opts).substring(0, 1000));

  if (!opts.hideIterationsLog) {
    logBackgroundTask(opts.taskName, "Iniciando tarefa");
  }

  try {
    await callback(opts);
  } catch(err) {
    logBackgroundTask(opts.taskName, "Houve exceção");
    checkUnexpectedError(err);
    if (reqId) {
      onReqEnd(reqId);
    }
  }

  if (!opts.hideIterationsLog) {
    logBackgroundTask(opts.taskName, "Tarefa concluída");
  }
  if (reqId) {
    onReqEnd(reqId);
  }
}

function checkTimeRestriction(opts: RunBgOpts<any>, now_shiftedBR: Date, lastTick_shiftedBR: Date) {
  // Retorna true se puder executar, retorna false se não é hora/dia de executar a tarefa
  if (opts.atWeekDay != null) {
    if (opts.atWeekDay !== now_shiftedBR.getUTCDay()) {
      return false;
    }
  }
  if (opts.atHour != null) {
    const itIsTime = (lastTick_shiftedBR.getUTCHours() !== opts.atHour && now_shiftedBR.getUTCHours() === opts.atHour);
    if (!itIsTime) {
      return false;
    }
  }
  if (opts.atEveryHourChange) {
    const itIsTime = (lastTick_shiftedBR.getUTCHours() !== now_shiftedBR.getUTCHours());
    if (!itIsTime) {
      return false;
    }
  }
  return true;
}

function logBackgroundTask (servico: string, message: string) {
  logger.info(`[BGTASK] ${servico}: ${message}`);
}

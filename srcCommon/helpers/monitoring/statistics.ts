import { logger } from '../logger'
import * as recurrentTasks from '../recurrentTasks';

let isRunning = false;

/** Serviço para gerar estatísticas de debug */
export function startStatisticsService () {
  isRunning = true;
  recurrentTasks.runLoop({
    iterationPause_ms: 2 * 60 * 1000, // a cada 2 minutos
    taskName: 'STATISTICS',
    hideIterationsLog: true,
    subExecTimeFromPause: false,
    initialDelay_ms: 60 * 1000,
  }, printStatistics);
}

export const stats = {
  lastTs: Date.now(),
  c: {} as {
    [eventName: string]: number
  }
};

function printStatistics () {
  const interval = Math.round((Date.now() - stats.lastTs) / 1000);
  stats.lastTs = Date.now();
  logger.info(`STATS ` + JSON.stringify({
    ...stats,
    lastTs: undefined,
    interval,
  }));
  stats.c = {};
}

export function countEvent(eventName: string) {
  if (!isRunning) return;
  stats.c[eventName] = (stats.c[eventName] || 0) + 1;
}

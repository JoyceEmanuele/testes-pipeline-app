import * as eventWarn from '../eventWarn'
import { logger } from '../logger'

function printMemoryUsage (isTestServer: boolean) {
  const memInfo = process.memoryUsage()
  memInfo.rss = Math.round(memInfo.rss / 1000 / 1000 * 100) / 100
  memInfo.heapTotal = Math.round(memInfo.heapTotal / 1000 / 1000 * 100) / 100
  memInfo.heapUsed = Math.round(memInfo.heapUsed / 1000 / 1000 * 100) / 100
  memInfo.external = Math.round(memInfo.external / 1000 / 1000 * 100) / 100
  logger.info(`MEMORY ` + JSON.stringify(memInfo))
  if (isTestServer) return;
  if (memInfo.heapUsed > 3000) {
    eventWarn.highRamUsage(`heap ${memInfo.heapUsed} MB`);
  }
}

/** Serviço que finaliza o processo se estiver consumindo muita memória RAM */
export function startMemoryMonitor (isTestServer: boolean) {
  setTimeout(() => {
    printMemoryUsage(isTestServer)
    setInterval(printMemoryUsage, 5 * 60 * 1000 + Math.round(Math.random() * 1000))
  }, 10000 + Math.round(Math.random() * 1000))
}

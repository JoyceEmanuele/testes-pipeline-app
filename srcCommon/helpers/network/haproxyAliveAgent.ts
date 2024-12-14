import * as net from 'net';
import * as recurrentTasks from '../recurrentTasks';
import { logger } from '../logger';
import { getCurrentCpuUsage } from '../monitoring/cpuUsage';

export function startServiceHaproxyAgent(port: number) {
  recurrentTasks.runLoop({
    taskName: 'HAPROXY-AGENT',
    iterationPause_ms: 5000,
  }, async () => {
    const retErr = await new Promise((resolve, reject) => {
      const server = net.createServer(onClientConnected);
      server.on('error', reject);
      server.on('close', () => reject(null));
      server.listen(port, () => {
        // logger.info('listening haproxy agent');
      });
    }).catch((err) => err);
    logger.error(retErr);
    logger.error('Fail to listen for haproxy agent, waiting 5s to try again');
  });
}

function onClientConnected (socket: net.Socket) {
  const cpuUsage = getCurrentCpuUsage();
  let state = 'up\n';
  if (cpuUsage > 90) {
    state = 'down\n';
    logger.warn("Haproxy agent: high CPU detected", cpuUsage.toFixed(1));
  }

  // console.log("Haproxy agent client connected", cpuUsage, state.trimEnd());

  socket.write(state, () => {
    socket.end();
  });
}

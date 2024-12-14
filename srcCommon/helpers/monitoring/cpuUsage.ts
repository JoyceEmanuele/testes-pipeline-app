import * as fs from 'fs/promises';
import * as recurrentTasks from '../recurrentTasks';
import { logger } from '../logger';

let usedCpuInfo = null as {
    ts: Date,
    usedTime: number,
    cpuUsage?: number,
};

export function startTaskCpuUsage() {
    recurrentTasks.runLoop({
        iterationPause_ms: 3000,
        taskName: 'CPU-CHECK',
        hideIterationsLog: true,
        subExecTimeFromPause: false,
        initialDelay_ms: 1000,
    }, async (opts) => {
        try {
            const data = await fs.readFile("/proc/" + process.pid + "/stat");
            const elems = data.toString().split(' ');
            const utime = parseInt(elems[13]);
            const stime = parseInt(elems[14]);
            const usedTime = utime + stime;
            if (!Number.isFinite(usedTime)) {
                logger.error('ERROR on CPU-CHECK');
                return;
            }
            const ts = new Date();
            if (usedCpuInfo) {
                const deltaTime = ts.getTime() - usedCpuInfo.ts.getTime();
                const deltausage = usedTime - usedCpuInfo.usedTime;
                const cpuUsage = 100 * (deltausage / deltaTime);
                usedCpuInfo.ts = ts;
                usedCpuInfo.usedTime = usedTime;
                usedCpuInfo.cpuUsage = (0.7 * (usedCpuInfo.cpuUsage || 0)) + (0.3 * cpuUsage);
            } else {
                usedCpuInfo = { ts, usedTime };
            }
            // console.log('DBG-CPU', usedCpuInfo.cpuUsage?.toFixed(1), usedCpuInfo.usedTime);
        } catch(err) {
            logger.error(err);
            logger.error('ERROR on CPU-CHECK');
        }
    });
}

export function getCurrentCpuUsage() {
    return usedCpuInfo?.cpuUsage;
}

import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import configfile from '../../configfile'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import { admLogger, logger } from '../../srcCommon/helpers/logger';

export function weeklyService () {
  if (!configfile.isProductionServer) return;
  recurrentTasks.runAtHour({ atHour: 5, taskName: 'CL-RH-CACHE' }, async () => {
    try {
      const before = new Date(Date.now() - 3 * 60 * 60 * 1000 - 3 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10);
      await rusthistApi['/clear-cache']({ before }, "WeeklyCacheCleaner");
    } catch (err) {
      logger.error(err);
      admLogger('Houve erro na limpeza de cache do rusthist!');
    }
  });
}

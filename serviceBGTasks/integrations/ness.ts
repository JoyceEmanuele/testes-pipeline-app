import axios from 'axios';
import sqldb from '../../srcCommon/db';
import servConfig from '../../configfile';
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import { logger } from '../../srcCommon/helpers/logger';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'

export function startNessCheckerService() {
  recurrentTasks.runLoop({
    taskName: "NESS-STATUS",
    initialDelay_ms: 30 * 60 * 1000, // Waiting 30 minutes to start checking NESS
    iterationPause_ms: 3 * 60 * 60 * 1000,
  }, async () => {
    try {
      await checkAllNessUnits();
    } catch (err: any) {
      logger.error('ERROR16: checking for NESS status', JSON.stringify(err && err.nessCheckProgress), err);
      eventWarn.typedWarn('NESS_INTEGR', `Houve falha ao verificar o status da integração NESS. ${JSON.stringify((err && err.nessCheckProgress) || '')}`);
    }
  });
}

export async function checkAllNessUnits () {
  const nessIntegs = await sqldb.INTEGRNESS.getList();
  let success = 0;
  for (const row of nessIntegs) {
    const url = `https://app-dasa-nmonitor-01.azurewebsites.net/api/diel/${servConfig.ness.dashToken}/${row.NESS_ID}`;
    try {
      const html = await axios.get(url).then((r) => r.data);
      success += 1;
    } catch (err: any) {
      logger.error(err);
      err.nessCheckProgress = {
        success,
        total: nessIntegs.length,
        currId: row.NESS_ID,
      };
      throw err;
    }
    // const $ = cheerio.load(html);
    // const isOk = $('.cardEquipamentos').length > 0;
  }
  return true;
}

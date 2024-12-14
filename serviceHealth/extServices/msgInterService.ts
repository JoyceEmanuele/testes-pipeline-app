import { logger } from "../../srcCommon/helpers/logger";
import sqldb from "../../srcCommon/db";
import { setDacHealthStatus } from "../dacHealth";
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'

export async function startService() {
  recurrentTasks.runLoop({
    taskName: "MSG-TO-HEALTH",
    initialDelay_ms: 10 * 1000,
    iterationPause_ms: 30 * 1000,
    hideIterationsLog: true,
  }, async () => {
    try {
      const list = await sqldb.MSGTOSERVICE.getListWithDest({ DEST: 'health' });
      for (const row of list) {
        try {
          const msg = JSON.parse(row.MSG);
          if (msg.msgtype === 'dacInfoChanged') {
            await sqldb.MSGTOSERVICE.w_deleteRow({ MSG_ID: row.MSG_ID }, '[SYSTEM]');
          } else if (msg.msgtype === 'setDacHealthStatus') {
            const { DAC_ID, H_INDEX, H_DESC, P_CAUSES, H_OFFL, CT_ID, userId } = msg;
            await setDacHealthStatus({ DAC_ID, H_INDEX, H_DESC, P_CAUSES, H_OFFL, CT_ID, userId });
            await sqldb.MSGTOSERVICE.w_deleteRow({ MSG_ID: row.MSG_ID }, '[SYSTEM]');
          } else {
            logger.error(`ERROR29 - Mensagem desconhecida: ${JSON.stringify(row)}`);
          }
        } catch (err) { logger.error(err); }
      }
    } catch (err) { logger.error(err); }
  });
}

/*
{
  DEST: 'health',
  ORIG: 'api-main',
  MSG: JSON.stringify({
    msgtype: 'dacInfoChanged',
    DAC_ID: devId,
  }),
  DAT_SEND: now_shiftedTS_s(),
}
{
  DEST: 'health',
  ORIG: 'api-main',
  MSG: JSON.stringify({
    msgtype: 'setDacHealthStatus',
    DAC_ID: devId,
    H_INDEX: number,
    H_DESC: string,
    P_CAUSES: string,
    H_OFFL: JSON.stringify(recHealth),
    CT_ID: ChangeType.BackOnline,
    userId,
  }),
  DAT_SEND: now_shiftedTS_s(),
}
*/

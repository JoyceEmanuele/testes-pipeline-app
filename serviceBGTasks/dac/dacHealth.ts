// import * as lastMessages from '../ramCaches/lastMessages'
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm'
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger'
import { now_shiftedTS_s } from '../../srcCommon/helpers/dates'
import { hDescs } from '../../srcCommon/helpers/healthTypes';
import {
  ChangeType,
  RecHealthData,
} from '../../srcCommon/types';

async function setDacHealthOffline (devId: string, lastMessageTS: number) {
  try {
    if (!lastMessageTS) return;
    const dacInf = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: devId });
    if (!dacInf) return;
    if (dacInf.H_OFFL) return;
    const recHealth: RecHealthData = {
      H_INDEX: dacInf.H_INDEX,
      H_DESC: dacInf.H_DESC,
      P_CAUSES: dacInf.P_CAUSES,
    };

    const since = new Date(lastMessageTS - 3 * 60 * 60 * 1000).toISOString().substr(0, 19).replace('T', ' ') + ' (GMT-3)';
    logger.info(`Dispositivo ${devId} offline desde ${since}`);

    if (dacInf.H_INDEX !== 4) {
      const userId = '[SYSTEM]';
      const { insertId } = await sqldb.MSGTOSERVICE.w_insert({
        DEST: 'health',
        ORIG: 'realtime',
        MSG: JSON.stringify({
          msgtype: 'setDacHealthStatus',
          DAC_ID: devId,
          H_INDEX: 2,
          H_DESC: `${hDescs.equipamentoOffline} desde ${since}`,
          P_CAUSES: null,
          H_OFFL: JSON.stringify(recHealth),
          CT_ID: ChangeType.Timeout,
          userId,
        }),
        DAT_SEND: now_shiftedTS_s(),
      }, userId);
    }
  } catch (err) { logger.error(err); }
}

function setDacHealthStatusSender(pars: {
  DAC_ID: string,
  H_INDEX: number,
  H_DESC: string,
  CT_ID: ChangeType,
  userId: string,
  H_OFFL?: string
}) {
  return sqldb.MSGTOSERVICE.w_insert({
    DEST: 'health',
    ORIG: 'realtime',
    MSG: JSON.stringify({
      msgtype: 'setDacHealthStatus',
      DAC_ID: pars.DAC_ID,
      H_INDEX: pars.H_INDEX,
      H_DESC: pars.H_DESC,
      H_OFFL: pars.H_OFFL || null,
      CT_ID: pars.CT_ID,
      userId: pars.userId,
    }),
    DAT_SEND: now_shiftedTS_s(),
  }, pars.userId);
}

export function startServiceDacHealth() {
  recurrentTasks.runLoop({
    iterationPause_ms: 10 * 60 * 1000,
    initialDelay_ms: 8 * 60 * 1000,
    taskName: 'DAC_HEALTH_TIMEOUTS',
    hideIterationsLog: true,
  }, async () => {
    await setNonProdDeviceHealth();
    await setRecentProdDeviceHealth();
    const devs = await sqldb.ASSETS_HEALTH.healthDevs();
    const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
      devIds: (devs.length <= 500) ? devs.map((x) => x.DEV_ID) : undefined,
    });
    for (const dac of devs) {
      if ((dac.H_INDEX !== 2) && (dac.H_INDEX !== 4) && lastMessagesTimes.connectionStatus(dac.DEV_ID) === 'OFFLINE') {
        const lastMessageTS = lastMessagesTimes.lastTS(dac.DEV_ID);
        await setDacHealthOffline(dac.DEV_ID, lastMessageTS);
        continue;
      }
      if (filterHealth(dac.H_INDEX, dac.H_DESC, lastMessagesTimes.connectionStatus(dac.DEV_ID))) {
        if (dac.DAT_BEGMON) {
          // se índice de saúde cinza, e DAT_BEGMON > 24hs atrás => marca como verde
          try {
            logger.info(`Setting health = 'Sistema operando corretamente' for ${dac.DEV_ID} after 24h`)
            const userId = '[SYSTEM]';
            await setDacHealthStatusSender({
              DAC_ID: dac.DEV_ID,
              H_INDEX: 100,
              H_DESC: 'Sistema operando corretamente',
              H_OFFL: null,
              CT_ID: ChangeType.Timeout,
              userId,
            });
          } catch (err) {logger.error(err) }
        }
      }
    }
  });
}

async function setNonProdDeviceHealth() {
  // Busca os dacs em instalação
  const devsInstall = await sqldb.ASSETS_HEALTH.getAssetsHealthsByUnitProduction({ oldProd: false });
  for (const devInstall of devsInstall) {
    try {
      await setDacHealthStatusSender({ DAC_ID: devInstall.DEV_ID, H_INDEX: 1, H_DESC: 'Recém instalado', CT_ID: ChangeType.ApiServer, userId: 'SYSTEM' });
    } catch (err) {
      logger.error(err)
    }
  }
}

async function setRecentProdDeviceHealth() {
  const devsProd = await sqldb.ASSETS_HEALTH.getAssetsHealthsByUnitProduction({ oldProd: true });
    for (const devProd of devsProd) {
      try {
        const dacHealth = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: devProd.DEV_ID });
        // Depois de 10 minutos em produção e sem falhas, marca como sistema operando corretamente
        if(dacHealth && !dacHealth.FAULTS_DATA) {
          await setDacHealthStatusSender({ DAC_ID: devProd.DEV_ID, H_INDEX: 100, H_DESC: 'Sistema operando corretamente', CT_ID: ChangeType.ApiServer, userId: 'SYSTEM' });
        }
      } catch (err) {
        logger.error(err)
      }
    }
}

function filterHealth(h_index: number, h_desc: string, dac_online: string) {
  if(h_index === null && dac_online === 'ONLINE') {
    return true;
  } else if (h_index === 1 && dac_online === 'ONLINE') {
    return true;
  } else if ((h_index === 1 || h_index === 100) && h_desc !== "Recém instalado" && h_desc !== "Sistema operando corretamente" && dac_online === 'ONLINE') {
    return true;
  } else if (h_index === 2 && h_desc === "Equipamento sendo modificado por planilha" && dac_online === 'ONLINE') {
    return true;
  } 
  else {
    return false;
  }
}

import * as dacData from '../../srcCommon/helpers/dacData'
import sqldb from '../../srcCommon/db'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo'
import { apiAsyncInternalApi } from '../../srcCommon/dielServices';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import { logger } from '../../srcCommon/helpers/logger';
import { FullHist_DAC } from '../../srcCommon/types';
import * as moment from 'moment';

function listExpectedDays (numDays: number) {
  const timeLimitD = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000));
  const expectedDaysList = [];
  const dayCursor = new Date(timeLimitD.getTime());
  for (let i = 0; i < numDays; i++) {
    dayCursor.setUTCDate(dayCursor.getUTCDate() - 1);
    const day = dayCursor.toISOString().substr(0, 10);
    expectedDaysList.push(day);
  }
  // First element is the more recent day
  // Last element is the furthest day
  return expectedDaysList;
}

export async function startService () {
  recurrentTasks.runLoop({
    taskName: "TELMTR-DAY-COMP",
    initialDelay_ms: 1337 + 46412,
    iterationPause_ms: 3 * 60 * 60 * 1000,
    hideIterationsLog: true,
  }, async (opts) => {
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    if (now.getUTCDay() === 0 && now.getUTCHours() < 3) {
      // As of today, the server is restarted every sunday at 02:00.
      return;
    }

    try {
      opts.logBackgroundTask("Compilação iniciada");
      await checkCompileAllNeededDevs();
      opts.logBackgroundTask("Compilação concluída, iniciando intervalo de 30 minutos.");
      // opts.iterationPause_ms = 30 * 60 * 1000;
    } catch (err) {
      opts.logBackgroundTask(`Compilação interrompida por erro: ${err}`);
      logger.error(err);
      // opts.iterationPause_ms = 15117;
    }

    // try {
    //   await checkCompileAutomData();
    // } catch (err) {
    //   logger.error(err);
    //   await new Promise(r => setTimeout(r, 15117));
    // }

    // try {
    //   await checkCompileDacUse();
    //   await checkCompileDutMeanTp();
    //   // logger.info('DBG: [339] Compilação concluída, iniciando intervalo de 3 horas.')
    //   // await new Promise(r => setTimeout(r, 3 * 60 * 60 * 1000));
    //   logger.info('DBG: [339] Compilação concluída, iniciando intervalo de 30 minutos.')
    //   await new Promise(r => setTimeout(r, 30 * 60 * 1000));
    // } catch (err) {
    //   logger.error(err);
    //   await new Promise(r => setTimeout(r, 90117));
    // }
  });
}

async function checkCompileAllNeededDevs() {
  const expectedDaysList = listExpectedDays(31); // 31
  // First element is the more recent day
  // Last element is the furthest day

  for (const day of expectedDaysList) {
    {
      const dacIds = (await sqldb.cache_cond_tel.missingAutDacs({ day })).map(x => x.DAC_ID).filter(x => !isTemporaryId(x));
      for (const dacId of dacIds) {
        try {
          const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: dacId });
          const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
          if (!hwCfg) continue;
          const dac = { devId: dacId, hwCfg }
          const dacCompiled = await apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: 'EoD-DacAutL1', dac, day, hType: "TelemetryCharts", dacExtInf: dacInf });
          await verifyCompileDacWithSavedData(dacCompiled, dacInf, day);
        } catch(err) {
          logger.error(err);
          logger.error(`Erro ao compilar telemetrias do ${dacId}`);
          await new Promise(r => setTimeout(r, 1503));
        }
        await new Promise(r => setTimeout(r, 419));
      }
    }
    {
      const dutIds = (await sqldb.cache_cond_tel.missingAutDuts({ day })).map(x => x.DEV_ID).filter(x => !isTemporaryId(x));
      for (const dutId of dutIds) {
        try {
          const dutInf = await sqldb.DUTS.getFreshDevInfo({ devId: dutId });
          await apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: 'EoD-DutAutT', dutId, day, hType: "TelemetryCharts", dutExtInf: dutInf });
        } catch(err) {
          logger.error(err);
          logger.error(`Erro ao compilar telemetrias do ${dutId}`);
          await new Promise(r => setTimeout(r, 1503));
        }
        await new Promise(r => setTimeout(r, 419));
      }
    }
    {
      const damIds = (await sqldb.cache_cond_tel.missingAutDams({ day })).map(dam => dam.DAM_ID).filter(x => !isTemporaryId(x));
      for (const damId of damIds) {
        try {
          await apiAsyncInternalApi('/diel-internal/api-async/processDamDay', { motivo: 'EoD-Dam', damId, day });
        } catch(err) {
          logger.error(err);
          logger.error(`Erro ao compilar telemetrias do ${damId}`);
          await new Promise(r => setTimeout(r, 1503));
        }
        await new Promise(r => setTimeout(r, 419));
      }
    }
    {
      const dutIds = (await sqldb.cache_cond_tel.missingDutTp({ day })).map(x => x.DEV_ID).filter(x => !isTemporaryId(x));
      for (const dutId of dutIds) {
        try {
          const dutInf = await sqldb.DUTS.getFreshDevInfo({ devId: dutId });
          await apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: 'EoD-DutT', dutId, day, hType: "StatsT", dutExtInf: dutInf });
        } catch(err) {
          logger.error(err);
          logger.error(`Erro ao compilar telemetrias do ${dutId}`);
          await new Promise(r => setTimeout(r, 1503));
        }
        await new Promise(r => setTimeout(r, 419));
      }
    }
    {
      const dacIds = (await sqldb.cache_cond_tel.missingDacUse({ day })).map(x => x.DAC_ID).filter(x => !isTemporaryId(x));
      for (const dacId of dacIds) {
        try {
          const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: dacId });
          const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
          if (!hwCfg) continue;
          const dac = { devId: dacId, hwCfg }
          const dacCompiled = await apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: 'EoD-DacUse', dac, day, hType: "L1-Charts&Stats", dacExtInf: dacInf });
          await verifyCompileDacWithSavedData(dacCompiled, dacInf, day);
        } catch(err) {
          logger.error(err);
          logger.error(`Erro ao compilar telemetrias do ${dacId}`);
          await new Promise(r => setTimeout(r, 1503));
        }
        await new Promise(r => setTimeout(r, 419));
      }
    }
  }

  return {};
}

async function verifyCompileDacWithSavedData(dacCompiled: FullHist_DAC, dacInfo: Awaited<ReturnType<typeof sqldb.DACS_DEVICES.getExtraInfo>>, currentDay: string) {
  // if the first index of saved_data is equal to 1, i must process the previous days
  if (dacCompiled.first_saved_data_index !== null && dacCompiled.first_saved_data_index === 1) {
    const deletePromises: Promise<{ affectedRows: number; insertId: number; }>[] = [];

    for (let i = 1; i <= 15; i++) {
      const dayToCheck = moment(currentDay, 'YYYY-MM-DD').subtract(i, 'days').format('YYYY-MM-DD');
      const dacCachedHist = await sqldb.cache_cond_tel.getDevOnline({ devId: dacInfo.DAC_ID, day: dayToCheck });
      
      const endDate = moment(dayToCheck, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');

      // if chartBas is null or equal to {}, it means that it's been a whole day offline, 
      // I should delete it and continue in the loop looking for the previous one
      if (!dacCachedHist?.devOnline) {
        deletePromises.push(sqldb.cache_cond_tel.w_deleteFromPeriod({ devId: dacInfo.DAC_ID, startDate: dayToCheck, endDate }, '[SYSTEM]'));
      } 
      // if it falls on else, it means that it was a day that had some telemetry data, 
      // I delete it and stop the loop here
      else {
        deletePromises.push(sqldb.cache_cond_tel.w_deleteFromPeriod({ devId: dacInfo.DAC_ID, startDate: dayToCheck, endDate }, '[SYSTEM]'));
        break;
      }
    }

    await Promise.all(deletePromises);
  }
}

import sqldb from '../../srcCommon/db';
import * as dielServices from '../../srcCommon/dielServices';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { t, getLanguage } from '../../srcCommon/helpers/i18nextradution';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import { AlertParams, DmaLeakInfo } from '../../srcCommon/types';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import { NotifCfg, loadWaterNotifs } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';
import { getWaterMonthHistoryUsage, getWaterTotalHistoryUsage } from '../../serviceApiAsync/telemHistory/dmaHist';
import { apiMainService } from '../../serviceApiAsync/extServices/mainServiceApi';

export function startService() {
  recurrentTasks.runAtHour({
    taskName: "WATER-LEAK-DAILY",
    atHour: 1,
  }, async () => {
    await checkWaterLeakDaily();
  });

  recurrentTasks.runLoop({
    taskName: "WATER-LEAK-DMA",
    initialDelay_ms: 2 * 60 * 1000,
    iterationPause_ms: 60 * 60 * 1000,
    subExecTimeFromPause: true,
  }, async () => {
    await checkWaterLeak();
  });

  recurrentTasks.runAtHour({ atHour: 2, taskName: "WATER-TOTAL-HISTORY-USAGE" }, async () => {
    await getWaterTotalHistoryUsage();
  });

  recurrentTasks.runAtHour({ atHour: 5, taskName: "WATER-MONTH-HISTORY-USAGE" }, async () => {
    await getWaterMonthHistoryUsage();
  });
}

const jsWeekNumberToForecastIndex : {[key: number]: number} = {
  0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
};

interface AlertDetectionDMA {
  notifId: number
  dma: { UNIT_NAME: string, DMA_ID: string, CLIENT_ID: number, UNIT_ID?: number, DATE_DETECTION?: string, CONSUMPTION?: number }
  details: { text: string, html: string }
};

type DmaDeviceInfo = Awaited<ReturnType<typeof sqldb.DMAS_DEVICES.getListWithLeakAlgorithmInfo>>[number];
type waterData = {
  period_usage: number,
  history: {
    information_date: string,
    usage: number,
    readings_per_day: { time: string, usage: number }[],
    devId: string
  }[]
};


const checkContinuousConsumptionLastDay = (dma: DmaDeviceInfo, lastDayData: waterData) => {
  let lastDayHadContinuousConsumption = false;
  for(let i = 0; i < 24 - dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL + 1; i++){
    let foundConsumptionLowerThanExpected = false;
    for(let j = i; j <  i + dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL; j++){
      if(lastDayData.history[0].readings_per_day[j]?.usage != null && lastDayData.history[0].readings_per_day[j]?.usage <= dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE) foundConsumptionLowerThanExpected = true;
    }
    if(!foundConsumptionLowerThanExpected){
      lastDayHadContinuousConsumption = true;
      break;
    }
  }
  return lastDayHadContinuousConsumption;
}

const checkContinuousConsumptionCurrDay = (dma: DmaDeviceInfo, currDayData: waterData) => {
  let currentDayHadContinuousConsumption = false;
  for(let i = 0; i < 24 - dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL + 1; i++){
    let foundConsumptionLowerThanExpected = false;
    for(let j = i; j <  i + dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL; j++){
      if(currDayData.history[0].readings_per_day[j]?.usage != null && currDayData.history[0].readings_per_day[j].usage <= dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE) foundConsumptionLowerThanExpected = true;
    }
    if(!foundConsumptionLowerThanExpected){
      currentDayHadContinuousConsumption = true;
      break;
    }
  }
  return currentDayHadContinuousConsumption;
}

const checkContinuousConsumption = (dma: DmaDeviceInfo, lastDayData: waterData, currDayData: waterData, cachedLastDayData: DmaLeakInfo) => {
  let hasContinuousConsumption = false;

  if(cachedLastDayData && !(currDayData?.history[0]?.readings_per_day.length && dma.LA_CONTINUOUS_CONSUMPTION)) return { hasContinuousConsumption, lastDayHadContinuousConsumption: null };

  if(!cachedLastDayData && !(lastDayData?.history[0]?.readings_per_day.length && currDayData?.history[0]?.readings_per_day.length && dma.LA_CONTINUOUS_CONSUMPTION)) return { hasContinuousConsumption, lastDayHadContinuousConsumption: null };

  const lastDayHadContinuousConsumption = cachedLastDayData ? cachedLastDayData.checkContinuousConsumptionLastDayResult : checkContinuousConsumptionLastDay(dma, lastDayData);

  const currentDayHadContinuousConsumption = checkContinuousConsumptionCurrDay(dma, currDayData);

  if(lastDayHadContinuousConsumption && currentDayHadContinuousConsumption) hasContinuousConsumption = true;

  return { hasContinuousConsumption, lastDayHadContinuousConsumption };
}

const checkHistoryConsumption = async (dma: DmaDeviceInfo, lastDayData: waterData, currDayData: waterData, previousDate: Date, currentDate: Date) => {
  let hasHistoryConsumption = false;
  if(lastDayData && currDayData && dma.LA_HISTORY_CONSUMPTION){
    const meanHistoryData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaMeanHistory', { dmaId: dma.DMA_ID, userId: '[SYSTEM]', motivo: `WaterLeak P3` });

    const lastDayMeanIndex = jsWeekNumberToForecastIndex[previousDate.getUTCDay()];
    const lastDayMeanData = meanHistoryData[lastDayMeanIndex]?.averageConsumption;

    const currentDayMeanIndex = jsWeekNumberToForecastIndex[currentDate.getUTCDay()];
    const currentDayMeanData = meanHistoryData[currentDayMeanIndex]?.averageConsumption;

    if(lastDayData.period_usage > lastDayMeanData*dma.LA_HISTORY_CONSUMPTION_TIMES &&
      currDayData.period_usage > currentDayMeanData*dma.LA_HISTORY_CONSUMPTION_TIMES) hasHistoryConsumption = true;
  }

  return hasHistoryConsumption;
};

const checkCapacityConsumption = (dma: DmaDeviceInfo, lastDayData: waterData, currDayData: waterData) => {
  let hasCapacityConsumption = false;
  if(lastDayData && currDayData && dma.LA_CAPACITY_CONSUMPTION && dma.TOTAL_CAPACITY){
    if(lastDayData.period_usage > dma.LA_CAPACITY_CONSUMPTION_TIMES*dma.TOTAL_CAPACITY && currDayData.period_usage > dma.LA_CAPACITY_CONSUMPTION_TIMES*dma.TOTAL_CAPACITY) hasCapacityConsumption = true;
  }else if(dma.LA_CAPACITY_CONSUMPTION && !dma.TOTAL_CAPACITY) hasCapacityConsumption = true;

  return hasCapacityConsumption;
}

const checkRulesWaterLeak = async (dma: DmaDeviceInfo) => {
  const currentDate = new Date(Date.now() - 3*60*60*1000);
  const currentDateStr = currentDate.toISOString().substring(0, 10);

  const previousDate = new Date(Date.now() - 3*60*60*1000);
  previousDate.setUTCDate(previousDate.getUTCDate()-1);
  const previousDateStr = previousDate.toISOString().substring(0, 10);

  let cachedLastDayDataReturned = tryGetDmaLeakInfoDay({dmaCode: dma.DMA_ID, dateYMD: previousDateStr});
  let cachedLastDayData = cachedLastDayDataReturned ? (cachedLastDayDataReturned as DmaLeakInfo) : null;
  if (cachedLastDayData && (cachedLastDayData.dma_LA_CONTINUOUS_CONSUMPTION_MIN_VALUE !== dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE || cachedLastDayData.dma_LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL !== dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL)) {
    cachedLastDayData = null;
  }
  let lastDayData;

  if (!cachedLastDayData) {
    lastDayData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaDayUsage', { dmaId: dma.DMA_ID, dayYMD: previousDateStr, motivo: `WaterLeak P1` });
  }
  const currDayData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaDayUsage', { dmaId: dma.DMA_ID, dayYMD: currentDateStr, motivo: `WaterLeak P2` });

  // RULE 1
  const { hasContinuousConsumption, lastDayHadContinuousConsumption } = checkContinuousConsumption(dma, lastDayData, currDayData, cachedLastDayData);

  // RULE 2
  const hasHistoryConsumption = await checkHistoryConsumption(dma, lastDayData, currDayData, previousDate, currentDate);

  // RULE 3
  const hasCapacityConsumption = checkCapacityConsumption(dma, lastDayData, currDayData);

  // LOG PARA BANCO DO BRASIL E SANTANDER
  if ([21, 59, 120, 152, 145].some((clientId) => clientId === dma.CLIENT_ID)) {
    logger.info({
      msg: `[DEBUG AGUA] Verificando vazamentos de água - Unidade: ${dma.UNIT_NAME} - DMA: ${dma.DMA_ID} - Horário: ${new Date(Date.now() - 3*60*60*1000).toISOString()}`,
      hasCachedLastDayData: !!cachedLastDayData,
      hasContinuousConsumption,
      hasHistoryConsumption,
      hasCapacityConsumption,
      lastDayHadContinuousConsumption,
      currDayData,
      lastDayData,
    });
  }

  if (!cachedLastDayData && lastDayHadContinuousConsumption !== null) {
    setDmaLeakInfoDate({
      dmaCode: dma.DMA_ID,
      dateYMD: previousDateStr,
      dmaLeakInfo: {
        checkContinuousConsumptionLastDayResult: !!lastDayHadContinuousConsumption,
        period_usage: lastDayData.period_usage,
        dma_LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL: dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL,
        dma_LA_CONTINUOUS_CONSUMPTION_MIN_VALUE: dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE
      }
    });
  }


  return { hasContinuousConsumption, hasHistoryConsumption, hasCapacityConsumption, currDayData };
};

const formatAndSendNotif = async (dma: DmaDeviceInfo, notifs: AlertParams[], consumption: number, notifInfo: NotifCfg) => {
  const currentDate = new Date(Date.now() - 3*60*60*1000);

  const now = Date.now();
  const dateDetection = new Date(Date.now()).toISOString();

  let detection: AlertDetectionDMA;

  // Envia a notificação caso for instantânea ou COND_PARS não tiver sido atualizado ainda
  const limit24h = now - 24 * 60 * 60 * 1000;
  for (const row of notifs) {
    if (row.lastNotifSent > limit24h) {
      logger.info({
        msg: `[DEBUG AGUA] Notificação não será enviada ${row.lastNotifSent} > ${limit24h} DMA: ${dma.DMA_ID} - Horário: ${currentDate.toISOString()}`,
        row
      });
      continue;
    };
    if (row.NOTIF_ID !== notifInfo.NOTIF_ID) continue;
    if (row.UNIT_IDS) {
      for (const unit of row.UNIT_IDS) {
        if(unit == dma.UNIT_ID) {
          const notifDetails = {
            html: `#VERIFICAMOS_MEDIDOR_AGUA# <b>$DMA_ID$</b>, #NA_UNIDADE# <b>$UNIT_NAME$</b>, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
            text: `#VERIFICAMOS_MEDIDOR_AGUA# $DMA_ID$, #NA_UNIDADE# $UNIT_NAME$, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
          };
          detection = {
            notifId: row.NOTIF_ID,
            dma: { UNIT_NAME: dma.UNIT_NAME, DMA_ID: dma.DMA_ID, CLIENT_ID: dma.CLIENT_ID, UNIT_ID: dma.UNIT_ID, DATE_DETECTION: dateDetection, CONSUMPTION: consumption},
            details: notifDetails,
          };
          row.lastNotifSent = now;
        }
      }
    }
    else {
      const notifDetails = {
        html: `#VERIFICAMOS_MEDIDOR_AGUA# <b>$DMA_ID$</b>, #NA_UNIDADE# <b>$UNIT_NAME$</b>, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
        text: `#VERIFICAMOS_MEDIDOR_AGUA# $DMA_ID$, #NA_UNIDADE# $UNIT_NAME$, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
      };
      detection = {
        notifId: row.NOTIF_ID,
        dma: { UNIT_NAME: dma.UNIT_NAME, DMA_ID: dma.DMA_ID, CLIENT_ID: dma.CLIENT_ID, UNIT_ID: dma.UNIT_ID, DATE_DETECTION: dateDetection, CONSUMPTION: consumption},
        details: notifDetails,
      };
      row.lastNotifSent = now;
    }

    if (detection) {
      logger.info({
        msg: `[DEBUG AGUA] Preparando para envio ${dma.DMA_ID} - Horário: ${currentDate.toISOString()}`,
        notifs,
        notifInfo
      });
      const emailBody = templateFiles.genericNotificationEmail();
      const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: detection.notifId });
      const idioma = getLanguage(prefsUser[0]);
      detection.details.text = detection.details.text
        .replace(/\$DMA_ID\$/g, detection.dma.DMA_ID || '-')
        .replace(/\$UNIT_NAME\$/g, detection.dma.UNIT_NAME || '-')
        .replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosQueMedidorAgua', idioma))
        .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
        .replace(/\#DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA\#/g, t('detectouUmPossivelVazamentoAgua', idioma))
        .replace(/\#AS\#/g, t('as', idioma))
  
      detection.details.html = emailBody
        .replace(/\$DATEINFO\$/g, returnActualDate(false))
        .replace(/\$COLOR_HEX\$/g, '#2D81FF')
        .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')
        .replace(/\$NOTIFICATION\$/g, t('possivelVazementoAguaNaUnidade', idioma))
        .replace(/\$EMAIL_MESSAGE\$/g, detection.details.html)
        .replace(/\$DMA_ID\$/g, detection.dma.DMA_ID || '-')
        .replace(/\$UNIT_NAME\$/g, detection.dma.UNIT_NAME || '-')
        .replace(/\#OLA\#/g, t('ola', idioma))
        .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
        .replace(/\#UNIDADE\#/g, t('unidade', idioma))
        .replace(/\#AMBIENTE\#/g, t('ambiente', idioma))
        .replace(/\#LIMITES\#/g, t('limites', idioma))
        .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
        .replace(/\#AFERICAO\#/g, t('afericao', idioma))
        .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
        .replace(/\#EQUIPE\#/g, t('equipe', idioma))
        .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
        .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
        .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
        .replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosQueMedidorAgua', idioma))
        .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
        .replace(/\#DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA\#/g, t('detectouUmPossivelVazamentoAgua', idioma))
        .replace(/\#AS\#/g, t('as', idioma))
  
        
      await sendNotification(detection.notifId, detection.dma.UNIT_NAME, detection.dma.CLIENT_ID, detection.details, now);
      await sendFeedNotifWater(detection.notifId, detection.dma.UNIT_ID, detection.dma.DATE_DETECTION, detection.dma.CONSUMPTION);
    }
    else {      
      logger.info({
        msg: `[DEBUG AGUA] Notificação não será enviada detection vazio DMA: ${dma.DMA_ID} - Horário: ${currentDate.toISOString()}`,
        notifs,
        notifInfo
      });
    }
  }
}


export async function checkWaterLeak() {
  const { notifsByClient: configuredNotifs, clientIdsFilter, notifsInfo } = await loadWaterNotifs(false);
  const dmasList = await sqldb.DMAS_DEVICES.getListWithLeakAlgorithmInfo({clientIds: clientIdsFilter});

  for (const notifInfo of notifsInfo) {
    for (const dma of dmasList) {
      try {
        const notifs = configuredNotifs[`CLIENT${dma.CLIENT_ID}`];
        // Only calculate if needed
        if (notifs) {
          if(!dma.LEAK_ANALYSIS || !dma.HYDROMETER_MODEL || !dma.UNIT_ID || !dma.CLIENT_ID) continue;
  
          const { hasContinuousConsumption, hasHistoryConsumption, hasCapacityConsumption, currDayData } = await checkRulesWaterLeak(dma);
  
          // If has a leak, send notification
          if (
            (dma.LA_CONTINUOUS_CONSUMPTION == hasContinuousConsumption) &&
            (dma.LA_HISTORY_CONSUMPTION == hasHistoryConsumption) &&
            (dma.TOTAL_CAPACITY ? dma.LA_CAPACITY_CONSUMPTION == hasCapacityConsumption : true)
          ) {
            const currentDate = new Date(Date.now() - 3*60*60*1000);
            logger.info({
              msg: `[DEBUG AGUA] Possível vazamento identificado - Unidade: ${dma.UNIT_NAME} - DMA: ${dma.DMA_ID} - Horário: ${currentDate.toISOString()}`,
              notifs,
              notifInfo
            });
  
            
            await formatAndSendNotif(dma, notifs, currDayData.period_usage, notifInfo);
          }
        }
      } catch (err) {
        logger.error(err);
      }
    }
  }

  return {};
}

const checkRulesWaterLeakDaily = async (dma: DmaDeviceInfo, currentDate: Date, previousDate: Date) => {
  const currentDateStr = currentDate.toISOString().substring(0, 10);
  const previousDateStr = previousDate.toISOString().substring(0, 10);

  const cachedLastDayDataReturned = tryGetDmaLeakInfoDay({dmaCode: dma.DMA_ID, dateYMD: previousDateStr});
  let cachedLastDayData = cachedLastDayDataReturned ? cachedLastDayDataReturned as DmaLeakInfo : null;
  let lastDayData 
  if (cachedLastDayData && (cachedLastDayData.dma_LA_CONTINUOUS_CONSUMPTION_MIN_VALUE !== dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE || cachedLastDayData.dma_LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL !== dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL)) {
    cachedLastDayData = null;
  }
  if (!cachedLastDayData) {
    lastDayData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaDayUsage', { dmaId: dma.DMA_ID, dayYMD: previousDateStr, motivo: `WaterLeak P1` });
  }
  const currDayData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaDayUsage', { dmaId: dma.DMA_ID, dayYMD: currentDateStr, motivo: `WaterLeak P2` });

  // RULE 1
  const { hasContinuousConsumption, lastDayHadContinuousConsumption } = checkContinuousConsumption(dma, lastDayData, currDayData, cachedLastDayData);

  if (cachedLastDayData) {
    lastDayData = {
      period_usage: cachedLastDayData.period_usage,
      history: [] }
  }

  // RULE 2
  const hasHistoryConsumption = await checkHistoryConsumption(dma, lastDayData, currDayData, previousDate, currentDate);

  // RULE 3
  const hasCapacityConsumption = checkCapacityConsumption(dma, lastDayData, currDayData);

  if (!cachedLastDayData && lastDayHadContinuousConsumption !== null) {
    setDmaLeakInfoDate({
      dmaCode: dma.DMA_ID,
      dateYMD: previousDateStr,
      dmaLeakInfo: {
        checkContinuousConsumptionLastDayResult: !!lastDayHadContinuousConsumption,
        period_usage: lastDayData.period_usage,
        dma_LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL: dma.LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL,
        dma_LA_CONTINUOUS_CONSUMPTION_MIN_VALUE: dma.LA_CONTINUOUS_CONSUMPTION_MIN_VALUE
      }
    });
  }

  return { hasContinuousConsumption, hasHistoryConsumption, hasCapacityConsumption, currDayData };
};

const formatAndSendNotifications = async (detections: AlertDetectionDMA[]) => {
  if (detections.length) {
    const now = Date.now();
    const emailBody = templateFiles.notifEmailRelatorioVazamentoDiario();
    const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: detections[0].notifId });
    const idioma = getLanguage(prefsUser[0]);
    detections[0].details.text = detections[0].details.text.replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosQue', idioma))
    .replace(/\#OLA\#/g, t('ola', idioma))
    .replace(/\#NAS_ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
    .replace(/\#DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA\#/g, t('foramDetectadosPossiveisVazamentosAgua', idioma))
    .replace(/\#UNIDADES_ABAIXO\#/g, t('notificacao.nasUnidadesAbaixo', idioma))
    .replace(/\$DADOS\$/g, detections.map((d) => {
      return `◻  ${d.dma.UNIT_NAME || '-'} - ${d.dma.DMA_ID || '-'}\n`
    }).join(''));

    detections[0].details.html = emailBody
      .replace(/\$DATEINFO\$/g, returnActualDate(false))
      .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')
      .replace(/\$NOTIFICATION\$/g, t('possivelVazementoAguaNaUnidade', idioma))
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\#UNIDADE\#/g, t('unidade', idioma))
      .replace(/\#MEDIDOR\#/g, t('medidorAgua', idioma))
      .replace(/\#LIMITES\#/g, t('limites', idioma))
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#AFERICAO\#/g, t('afericao', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
      .replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosQue', idioma))
      .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
      .replace(/\#NAS_ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
      .replace(/\#DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA\#/g, t('foramDetectadosPossiveisVazamentosAgua', idioma))
      .replace(/\#UNIDADES_ABAIXO\#/g, t('notificacao.nasUnidadesAbaixo', idioma))
      .replace(/\#AS\#/g, t('as', idioma))
      .replace(/\$UNIT_LINK\$/g, detections.map((d) => {
        return `https://dap.dielenergia.com/analise/unidades/${d.dma.UNIT_ID}`
      }).join(''))
      .replace(/\$DMA_ID\$/g, detections.map((d) => {
        return `<p>${d.dma.DMA_ID || '-'}</p>`;
      }).join(''))
      .replace(/\$UNIDADE\$/g, detections.map((d) => {
        return `<p>${d.dma.UNIT_NAME || '-'}</p>`;
      }).join(''))
    sendNotification(detections[0].notifId, detections[0].dma.UNIT_NAME, detections[0].dma.CLIENT_ID, detections[0].details, now);
  }
     
};

const handleDetections = (detections: AlertDetectionDMA[], currentDate: Date, dma: Awaited<ReturnType<typeof sqldb.DMAS_DEVICES.getListWithLeakAlgorithmInfo>>[number], notifs: AlertParams[], consumption: number, dateDetection: string, notifInfo: NotifCfg) => {
  const now = Date.now();
  for (const row of notifs) {
    if (row.NOTIF_ID !== notifInfo.NOTIF_ID) continue;
    if (row.UNIT_IDS) {
      for (const unit of row.UNIT_IDS){
        if(unit == dma.UNIT_ID) {
          const notifDetails = {
            html: `#VERIFICAdacAlerts.sendNotification(detection.notifId, detection.dma.UNIT_NAME, detection.dma.CLIENT_ID, detection.details, now);MOS_MEDIDOR_AGUA# <b>$DMA_ID$</b>, #NA_UNIDADE# <b>$UNIT_NAME$</b>, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
            text: `<b>#OLA#, $USER_NAME$</b>   
              \n\n#VERIFICAMOS_MEDIDOR_AGUA# <b>#NAS_ULTIMAS_24H#</b> #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA# #UNIDADES_ABAIXO#:
              \n\n$DADOS$`,
          };
          detections.push({
            notifId: row.NOTIF_ID,
            dma: { UNIT_NAME: dma.UNIT_NAME, DMA_ID: dma.DMA_ID, CLIENT_ID: dma.CLIENT_ID, UNIT_ID: dma.UNIT_ID, DATE_DETECTION: dateDetection, CONSUMPTION: consumption },
            details: notifDetails,
          });
        }
      }
    }
    else {
      const notifDetails = {
        html: `#VERIFICAdacAlerts.sendNotification(detection.notifId, detection.dma.UNIT_NAME, detection.dma.CLIENT_ID, detection.details, now);MOS_MEDIDOR_AGUA# <b>$DMA_ID$</b>, #NA_UNIDADE# <b>$UNIT_NAME$</b>, #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA#, #AS# ${currentDate.toLocaleString("pt-BR",{timeZone: 'UTC'})}.`,
        text: `<b>#OLA#, $USER_NAME$</b>   
          \n\n#VERIFICAMOS_MEDIDOR_AGUA# <b>#NAS_ULTIMAS_24H#</b> #DETECTOU_UM_POSSIVEL_VAZAMENTO_AGUA# #UNIDADES_ABAIXO#:
          \n\n$DADOS$`,
      };
      detections.push({
        notifId: row.NOTIF_ID,
        dma: { UNIT_NAME: dma.UNIT_NAME, DMA_ID: dma.DMA_ID, CLIENT_ID: dma.CLIENT_ID, UNIT_ID: dma.UNIT_ID, DATE_DETECTION: dateDetection, CONSUMPTION: consumption },
        details: notifDetails,
      });
    }
  }
};

// Rotina de 24 horas
export async function checkWaterLeakDaily() {
  // Iniciando rotina para identificação de possível vazamento de água nas unidades com DMA - Diário
  const { notifsByClient: configuredNotifs, clientIdsFilter, notifsInfo} = await loadWaterNotifs(true);

  const dmasList = await sqldb.DMAS_DEVICES.getListWithLeakAlgorithmInfo({clientIds: clientIdsFilter});

  for(const notifInfo of notifsInfo) {
    let detections: AlertDetectionDMA[] = [];
    for(const dma of dmasList) {
      try {
        if(!dma.LEAK_ANALYSIS || !dma.HYDROMETER_MODEL || !dma.UNIT_ID || !dma.CLIENT_ID) continue;

        //Usa um for para verificar o último dia
        for(let i = 1; i <= 8; i++) {
          const currentDate = new Date(Date.now() - 3*60*60*1000*i);
          const dateDetection = new Date(Date.now() - 60*60*1000*i).toISOString();

          const previousDate = new Date(Date.now() - 3*60*60*1000*i);
          previousDate.setUTCDate(previousDate.getUTCDate()-1);

          const { hasContinuousConsumption, hasHistoryConsumption, hasCapacityConsumption, currDayData } = await checkRulesWaterLeakDaily(dma, currentDate, previousDate);
          
          // If has a leak, send notification
          if (
            (dma.LA_CONTINUOUS_CONSUMPTION == hasContinuousConsumption) &&
            (dma.LA_HISTORY_CONSUMPTION == hasHistoryConsumption) &&
            (dma.TOTAL_CAPACITY ? dma.LA_CAPACITY_CONSUMPTION == hasCapacityConsumption : true)
          ) {
            logger.info(`Notificação de vazamento de água diária encontrada - Unidade: ${dma.UNIT_NAME} - DMA: ${dma.DMA_ID} - Horário: ${currentDate.toISOString()}`);

            const notifs = configuredNotifs[`CLIENT${dma.CLIENT_ID}`];
            if (notifs) {
              handleDetections(detections, currentDate, dma, notifs, currDayData.period_usage, dateDetection, notifInfo);
            }
            break;
          }
        }
      } catch (err) {
        logger.error(err);
      }
    }
    await formatAndSendNotifications(detections);
    await sendFeedNotificationsWater(detections);
  }
};

const sendFeedNotificationsWater = async (detections: AlertDetectionDMA[]) => { 
  if (detections.length) {
    const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: detections[0].notifId });   
    const userIds = dests.map(dest => dest.USER_ID); 

    const  detectionsWater = [] as {
      unitId: number,
      dateDetection: string
      consumption: number
    }[]
    
    
    for (const detection of detections) {
      detectionsWater.push({
        unitId: detection.dma.UNIT_ID,
        dateDetection: detection.dma.DATE_DETECTION,
        consumption: detection.dma.CONSUMPTION
      });
    }

    if (detectionsWater.length > 0) {
      try {
        await apiMainService["POST /mainservice/notifications/create-notification-water"]({
          detections: detectionsWater,
          destinataryIds: userIds,
          isInstantaneous: false,
        });
      } catch (err) {
        logger.error(err);
      }
    }   
  }
}

const sendFeedNotifWater = async (notifId: number, unitId: number, dateDetection: string, consumption: number) => { 
  const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: notifId });   
  const userIds = dests.map(dest => dest.USER_ID); 

  try {
    await apiMainService["POST /mainservice/notifications/create-notification-water"]({
      detections: [
        {
          unitId: unitId,
          dateDetection: dateDetection,
          consumption: consumption
        }
      ],
      destinataryIds: userIds,
      isInstantaneous: true,
    });
  } catch (err) {
    logger.error(err);
  }
}

// TAG: RAM-CACHE DMAs
let dmasLeakInfo: {
  [dmaCode: string]: {
    [dateYMD: string]: DmaLeakInfo
  }
} = {};
function tryGetDmaLeakInfoDay (reqParams: { dmaCode: string, dateYMD: string }) {
  // /diel-internal/realtime/getDmaLeakInfoDay
  if (dmasLeakInfo[reqParams.dmaCode]?.[reqParams.dateYMD]) {
    return dmasLeakInfo[reqParams.dmaCode][reqParams.dateYMD]
  }
  return '';
}
// function deleteDmaLeakInfoByDay(reqParams: { dmaCode: string, dateYMD: string }) {
//   // /diel-internal/realtime/deleteDmaLeakInfo
//   if (dmasLeakInfo[reqParams.dmaCode]) {
//     delete dmasLeakInfo[reqParams.dmaCode][reqParams.dateYMD];
//   }
// }
function setDmaLeakInfoDate(
  reqParams: {
    dmaCode: string,
    dateYMD: string,
    dmaLeakInfo: DmaLeakInfo
  }) {
  if (!dmasLeakInfo[reqParams.dmaCode]) {
    dmasLeakInfo[reqParams.dmaCode] = {};
  }
  dmasLeakInfo[reqParams.dmaCode][reqParams.dateYMD] = reqParams.dmaLeakInfo;
}

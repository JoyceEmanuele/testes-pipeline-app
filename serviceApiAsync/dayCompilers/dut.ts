import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import {
  ChartsBasic_DUT_AUT,
  ChartsDetailed_DUT,
  HistoryTypeDUT,
  MeanTemperature_DAC_DUT_DRI,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { parseCompressedChartData } from '../../srcCommon/helpers/chartDataFormats';
import { meanChartValue } from '../../srcCommon/helpers/meanChartValue';
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { logger } from '../../srcCommon/helpers/logger';
import { API_Internal } from '../api-internal';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS';
import { CompiledStats_DUT_DUO } from '../../srcCommon/types/index';
import { formatDate } from '../telemHistory/dacHist';

const devHistRedirect: { [devId: string]: [string, string, string] } = {
  'DUT310211497': ['2022-01-01', '2022-04-19', 'DUT307211053'],
  'DUT310211488': ['2022-01-01', '2022-04-19', 'DUT307211375'],
  'DUT310211494': ['2022-01-01', '2022-04-19', 'DUT307211467'],
  'DUT310211003': ['2022-01-01', '2022-04-19', 'DUT307211592'],
  'DUT307211708': ['2022-01-01', '2022-04-20', 'DUT307211147'],
};

function redirectDutHist(dutId: string, day: string): string {
  if (devHistRedirect[dutId] && (day >= devHistRedirect[dutId][0]) && (day <= devHistRedirect[dutId][1])) {
    return devHistRedirect[dutId][2];
  }
  return dutId;
}

export async function loadRtypeSched (RTYPE_ID: number) {
  const rowRType = RTYPE_ID && await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID });
  const fullProg = rowRType && scheduleData.parseFullProgV4(rowRType.USEPERIOD);
  return fullProg;
}

function checkPeriodDataL1 (periodData: Awaited<ReturnType<typeof rusthistApi['/comp-dut']>>) {
  if (!periodData.numDeparts) periodData.numDeparts = 0;
  if (!periodData.hoursOnL1) periodData.hoursOnL1 = 0;
  if (!periodData.hoursOffL1) periodData.hoursOffL1 = 0;
  if (!periodData.hoursOnline) periodData.hoursOnline = 0;
}

export const processDutDay: API_Internal['/diel-internal/api-async/processDutDay'] = async function(reqParams) {
  const { day, hType, dutExtInf } = reqParams;
  let dutIdBeforeRedirect = reqParams.dutId;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(400).DebugInfo({ day, dutIdBeforeRedirect });
  }
  if (!dutIdBeforeRedirect) { logger.info('Invalid dutId'); return null; }
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDutDay', { dutId: dutIdBeforeRedirect, dayYMD: day, histType: hType, unitId: dutExtInf.UNIT_ID }).then((r) => r.data);
  }

  const redirectedDutId = redirectDutHist(dutIdBeforeRedirect, day);

  const { secI, secF } = await autTimeLimits(dutExtInf.RTYPE_ID, day);

  const dutInfo = await sqldb.DUTS.getDevExtraInfo({DEV_ID: redirectedDutId});
  const tempOffset = dutInfo?.TEMPERATURE_OFFSET || 0;

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substring(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substring(0, 10);
  if (day > dayLimitFuture) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const withDetailedCharts = (hType === "TelemetryCharts");

  let timezoneOffset = -3;
  const timezoneInfo = dutExtInf.UNIT_ID ? await getTimezoneByUnit({ UNIT_ID: dutExtInf.UNIT_ID }) : await getTimezoneInfoByDev({ devId: redirectedDutId });
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const existingData = await getExistingData(redirectedDutId, day, timezoneOffset, secI, secF, dutInfo.TEMPERATURE_OFFSET);

  const preexistingResult = treatHType(hType, existingData, dutInfo);
  if (preexistingResult !== undefined) return preexistingResult;

  const periodData = await rusthistApi['/comp-dut']({
    dev_id: redirectedDutId,
    day: day,
    offset_temp: tempOffset,
    timezoneOffset: timezoneInfo && timezoneOffset
  }, reqParams.motivo);

  const isDutDuo = dutInfo?.PLACEMENT === 'DUO';

  checkPeriodDataL1(periodData)

  if (isDutDuo) {
    periodData.hoursOnL1 = Math.round(periodData.hoursOnL1 * 1000) / 1000;
    periodData.hoursOffL1 = Math.round(periodData.hoursOffL1 * 1000) / 1000;
  }
  periodData.hoursOnline = Math.round(periodData.hoursOnline * 1000) / 1000;

  if (isDayComplete && periodData && !periodData.provision_error) {
    await updateFullCharts(periodData, withDetailedCharts, secI, secF, {
      dutId: redirectedDutId,
      day,
      timezoneOffset,
      tempOffset,
      isDutDuo,
    })
    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. Dut: ${redirectedDutId} - Day: ${day}`);
  }

  return periodData;
}


function calculateMeanPars(periodData: ChartsDetailed_DUT, autStartSec: number, autEndSec: number): MeanTemperature_DAC_DUT_DRI {
  const Temp = (periodData.Temp && parseCompressedChartData(periodData.Temp)) || null;
  const { med, max, min } = ((autStartSec != null) && (autEndSec != null)) ? meanChartValue(Temp, autStartSec, autEndSec) : { med: null, max: null, min: null };
  const meantp = {
    med,
    max,
    min,
    secI: autStartSec,
    secF: autEndSec,
  };
  if (meantp.med == null) {
    delete meantp.med;
    delete meantp.max;
    delete meantp.min;
    delete meantp.secI;
    delete meantp.secF;
  }

  return meantp
}

async function autTimeLimits(roomtypeId: number, day: string): Promise<{
  secI: number,
  secF: number
}> {
  const relatedSched = await loadRtypeSched(roomtypeId); // dutSchedule.tryGetDutSched(dutId) ||
  const current = relatedSched && scheduleData.getDayPeriod(relatedSched, day);
  let secI = (current && current.permission === 'allow') ? (current.indexIni * 60) : null;
  let secF = (current && current.permission === 'allow') ? ((current.indexEnd + 1) * 60) : null;
  if ((secI == null) && (secF == null)) {
    secI = 0 * 60 * 60; // 00:00
    secF = 24 * 60 * 60 - 1; // 23:59
  }
  return {
    secI,
    secF
  }
}

function treatHType(hType: HistoryTypeDUT, existingData: Awaited<ReturnType<typeof sqldb.cache_cond_tel.getItem>>, dutInfo: {TEMPERATURE_OFFSET: number, PLACEMENT: string }): Awaited<ReturnType<API_Internal['/diel-internal/api-async/processDutDay']>> {
  if (hType === "StatsT") {
    if (existingData && (existingData.vers === 'dut-2') && (existingData.meantp)) {
      return null;
    }
  }
  if (hType === "TelemetryCharts") {
    return treatTelemetryCharts(existingData, dutInfo);
  }
  return undefined;
}

function treatTelemetryCharts(existingData: Awaited<ReturnType<typeof sqldb.cache_cond_tel.getItem>>, dutInfo: {TEMPERATURE_OFFSET : number, PLACEMENT: string}) {
  if (existingData && existingData.vers === 'dut-2' && existingData.chartsDet && (existingData.meantp) && existingData.chartsBas && (existingData.hoursOnline != null) && existingData.temperatureOffset === dutInfo.TEMPERATURE_OFFSET && !(!existingData.cstats && dutInfo.PLACEMENT === 'DUO')) {
    return {
      ...(jsonTryParse<ChartsBasic_DUT_AUT>(existingData.chartsBas)||{}),
      ...(jsonTryParse<ChartsDetailed_DUT>(existingData.chartsDet)||{}),
      ...(jsonTryParse<MeanTemperature_DAC_DUT_DRI>(existingData.meantp||'{}')||{}),
      ...existingData.cstats && (jsonTryParse<CompiledStats_DUT_DUO>(existingData.cstats) || {}),
      hoursOnline: existingData.hoursOnline,
    };
  }
  return undefined
}

function generateFullDutCharts(periodData: ChartsBasic_DUT_AUT & ChartsDetailed_DUT, withDetailedCharts: boolean) {
  const chartsDet: ChartsDetailed_DUT = (!withDetailedCharts) ? null : {
    Temp: (periodData.Temp === '') ? null : periodData.Temp,
    Temp1: (periodData.Temp1 === '') ? null : periodData.Temp1,
    Hum: (periodData.Hum === '') ? null : periodData.Hum,
    eCO2: (periodData.eCO2 === '') ? null : periodData.eCO2,
    TVOC: (periodData.TVOC === '') ? null : periodData.TVOC,
    L1: (periodData.L1 === '') ? null : periodData.L1,
  };
  const chartsBas: ChartsBasic_DUT_AUT = {
    State: (periodData.State === '') ? null : periodData.State,
    Mode: (periodData.Mode === '') ? null : periodData.Mode,
  };

  return {
    chartsBas,
    chartsDet
  }
}

async function getExistingData(dutId:string, day: string, timezoneOffset: number, secI: number, secF: number, temperatureOffset: number) {
    // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
    let existingData = await sqldb.cache_cond_tel.getItem({ devId: dutId, YMD: day, timezoneOffset });

    if (existingData && existingData.vers === 'dut-2' && existingData.chartsDet && existingData.temperatureOffset === temperatureOffset) {
      if ((!existingData.meantp) && (secI != null) && (secF != null)) {
        existingData = await overwriteExistingData(
          existingData,
          {
            devId: dutId,
            YMD: day,
            timezoneOffset,
          },
          secI,
          secF
        );
      }
    }

    return existingData;
}

async function overwriteExistingData(
  existingData:Awaited<ReturnType<typeof sqldb.cache_cond_tel.getItem>>,
  cachedDevInfo: { devId: string, YMD: string, timezoneOffset: number },
  secI: number,
  secF: number
) {
  const { devId: dutId, YMD: day } = cachedDevInfo;
  const periodData = jsonTryParse<ChartsDetailed_DUT>(existingData.chartsDet);
  const meantp = calculateMeanPars(periodData, secI, secF);
  logger.info('DBG350 reaproveitando chartsDet para temperatura média', dutId, day);
  await sqldb.cache_cond_tel.w_updateMeanTp({
    meantp: JSON.stringify(meantp),
    ...cachedDevInfo
  });
  return await sqldb.cache_cond_tel.getItem(cachedDevInfo);
}

async function updateFullCharts(
  periodData: Awaited<ReturnType<typeof rusthistApi['/comp-dut']>>,
  withDetailedCharts: boolean,
  secI: number,
  secF: number,
  chartInfo: {
    dutId: string,
    day: string,
    timezoneOffset: number,
    tempOffset: number,
    isDutDuo: boolean
  }
) {
  const {dutId, day, timezoneOffset, tempOffset: temperatureOffset, isDutDuo} = chartInfo;
  const {
    chartsBas,
    chartsDet
  } = generateFullDutCharts(periodData, withDetailedCharts);

  const meantp = calculateMeanPars(periodData, secI, secF);

  const cstats: CompiledStats_DUT_DUO = {
    numDeparts: periodData.numDeparts,
    hoursOnL1: periodData.hoursOnL1,
    hoursOffL1: periodData.hoursOffL1,
  };

  const dateNow = Date.now();
  const date = formatDate(new Date(dateNow));

  await sqldb.cache_cond_tel.w_insertUpdate({
    devId: dutId,
    YMD: day,
    vers: 'dut-2',
    cstats: isDutDuo ? JSON.stringify(cstats) : null,
    chartsBas: JSON.stringify(chartsBas),
    meantp: meantp && JSON.stringify(meantp),
    chartsDet: chartsDet && JSON.stringify(chartsDet),
    chartsExt: null,
    devOnline: periodData.hoursOnline,
    TEMPERATURE_OFFSET: temperatureOffset,
    timezoneOffset,
    last_calculated_date: date
  });
}
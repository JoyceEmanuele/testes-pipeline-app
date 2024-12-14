import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import {
  MeanTemperature_DAC_DUT_DRI,
  ChartsBasic_DRI,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { parseCompressedChartData } from '../../srcCommon/helpers/chartDataFormats';
import { meanChartValue } from '../../srcCommon/helpers/meanChartValue';
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { logger } from '../../srcCommon/helpers/logger';
import { loadRtypeSched } from './dut';
import { API_Internal } from '../api-internal';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { formatDate } from '../telemHistory/dacHist';

export const processDriDay: API_Internal['/diel-internal/api-async/processDriDay'] = async function(reqParams) {
  const { driId, driType, driInterval, day, formulas } = reqParams;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, driId });
  }
  if (!driId) { 
    logger.error('Invalid driId: ' + driId); 
    return null; 
  }
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDriDay', { driId, driType, driInterval, dayYMD: day }).then((r) => r.data);
  }

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substr(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substr(0, 10);
  if (day > dayLimitFuture) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const timezoneInfo = await getTimezoneInfoByDev({ devId: driId });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  const existingData = await sqldb.cache_cond_tel.getItem({ devId: driId, YMD: day, timezoneOffset: timezoneOffset });
  if (existingData && existingData.vers === 'dri-3' && existingData.chartsBas) {
    return {
      ...(jsonTryParse<ChartsBasic_DRI>(existingData.chartsBas)||{}),
    };
  }

  const response = await rusthistApi['/comp-dri']({
    dev_id: driId,
    dri_type: driType,
    formulas,
    dri_interval: driInterval,
    day,
    timezone_offset: timezoneInfo && timezoneOffset,
    chiller_carrier_hour_graphic: reqParams.chiller_carrier_hour_graphic,
  }, reqParams.motivo);
  const periodData = response.data;

  if (isDayComplete && periodData && !driType.startsWith("CHILLER_CARRIER")) await process_cache_cond_tel(periodData, driId, day, timezoneOffset)

  return periodData;
}

const process_cache_cond_tel = async (periodData: any, driId: string, day: string, timezoneOffset: number) => {

  const {secI, secF} = await process_secI_secF(driId, day)

  const chartsBas: ChartsBasic_DRI = {
    Setpoint: (periodData.Setpoint === '') ? null : periodData.Setpoint,
    Status: (periodData.Status === '') ? null : periodData.Status,
    Mode: (periodData.Mode === '') ? null : periodData.Mode,
    ThermOn: (periodData.ThermOn === '') ? null : periodData.ThermOn,
    Fanspeed: (periodData.Fanspeed === '') ? null : periodData.Fanspeed,
    Lock: (periodData.Lock === '') ? null : periodData.Lock,
    TempAmb: (periodData.TempAmb === '') ? null : periodData.TempAmb,
    ValveOn: (periodData.ValveOn === '') ? null : periodData.ValveOn,
    FanStatus: (periodData.FanStatus === '') ? null : periodData.FanStatus,
  };

  let meantp: MeanTemperature_DAC_DUT_DRI = null;
  {
    const Temp = (periodData.TempAmb && parseCompressedChartData(periodData.TempAmb)) || null;
    const { med, max, min } = ((secI != null) && (secF != null)) ? meanChartValue(Temp, secI, secF) : { med: null, max: null, min: null };
    meantp = {
      med,
      max,
      min,
      secI: secI,
      secF: secF,
    };
    if (meantp.med == null) {
      delete meantp.med;
      delete meantp.max;
      delete meantp.min;
      delete meantp.secI;
      delete meantp.secF;
    }
  }

  const dateNow = Date.now();
  const date = formatDate(new Date(dateNow));

  await sqldb.cache_cond_tel.w_insertUpdate({
    devId: driId,
    YMD: day,
    vers: 'dri-3',
    cstats: null,
    chartsBas: JSON.stringify(chartsBas),
    meantp: JSON.stringify(meantp),
    chartsDet: null,
    chartsExt: null,
    devOnline: periodData?.hoursOnline,
    TEMPERATURE_OFFSET: null,
    timezoneOffset,
    last_calculated_date: date
  });
  logger.info(`DBG: Dados de telemetria compilados e salvos no banco. DriId: ${driId} - Day: ${day}`);
}

const process_secI_secF = async (driId: string, day: string) => {
  const driVav = await sqldb.VAVS.getDriVav({ VAV_ID: driId });
  const relatedSched = driVav?.RTYPE_ID && await loadRtypeSched(driVav.RTYPE_ID);
  const current = relatedSched && scheduleData.getDayPeriod(relatedSched, day);
  let secI = (current && current.permission === 'allow') ? (current.indexIni * 60) : null;
  let secF = (current && current.permission === 'allow') ? ((current.indexEnd + 1) * 60) : null;
  if ((secI == null) && (secF == null)) {
    secI = 0 * 60 * 60; // 00:00
    secF = 24 * 60 * 60 - 1; // 23:59
  }

  return {secI, secF}
}
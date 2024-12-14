import {
  ChartsBasic_DAL,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { logger } from '../../srcCommon/helpers/logger';
import { API_Internal } from '../api-internal';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneInfoByDal } from '../../srcCommon/db/sql/DALS';
import { formatDate } from '../telemHistory/dacHist';

const getDalDataFromRusthist = async (dalCode: string, day: string, motivo: string, isDayComplete: boolean, timezoneOffset: number ) => {
  const response = await rusthistApi['/comp-dal']({
    dev_id: dalCode,
    day,
    timezoneOffset: timezoneOffset,
  }, motivo);
  const periodData = response;

  if (isDayComplete && periodData) {
    const chartsBas: ChartsBasic_DAL = {
      Relays: periodData.Relays?.map((r) => (r === '') ? null : r) || [],
      Feedback: periodData.Feedback?.map((f) => (f === '') ? null : f) || [],
    }

    const dateNow = Date.now();
    const date = formatDate(new Date(dateNow));

    await sqldb.cache_cond_tel.w_insertUpdate({
      devId: dalCode,
      YMD: day,
      vers: 'dal-1',
      cstats: null,
      chartsBas: JSON.stringify(chartsBas),
      meantp: null,
      chartsDet: null,
      chartsExt: null,
      devOnline: periodData.hoursOnline,
      TEMPERATURE_OFFSET: null,
      timezoneOffset,
      last_calculated_date: date
    });

    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. dalCode: ${dalCode} - Day: ${day}`);
  }
  return periodData;
};

export const processDalDay: API_Internal['/diel-internal/api-async/processDalDay'] = async function(reqParams) {
  const { dalCode, day } = reqParams;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, dalCode });
  }
  if (!dalCode) { 
    logger.error('Invalid dmtCode: ' + dalCode); 
    return null; 
  }
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDalDay', { dalCode, dayYMD: day }).then((r) => r.data);
  }

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substring(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substring(0, 10);
  if (day > dayLimitFuture) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const timezoneInfo = await getTimezoneInfoByDal({ dalCode });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  const existingData = await sqldb.cache_cond_tel.getItem({ devId: dalCode, YMD: day, timezoneOffset });
  if (existingData && existingData.vers === 'dal-1' && existingData.chartsBas) {
    const chartsBas = (jsonTryParse<ChartsBasic_DAL>(existingData.chartsBas)||{});
    if (chartsBas.Relays?.length || chartsBas.Feedback?.length) return { ...chartsBas };
  }

  const periodData = await getDalDataFromRusthist(dalCode, day, reqParams.motivo, isDayComplete, timezoneOffset);

  return periodData;
}

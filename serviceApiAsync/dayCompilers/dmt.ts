import {
  ChartsBasic_DMT,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { logger } from '../../srcCommon/helpers/logger';
import { API_Internal } from '../api-internal';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneInfoByDmt } from '../../srcCommon/db/sql/DMTS';
import { formatDate } from '../telemHistory/dacHist';

const getDmtDataFromRusthist = async (dmtCode: string, day: string, motivo: string, isDayComplete: boolean, timezoneOffset: number ) => {
  const response = await rusthistApi['/comp-dmt']({
    dev_id: dmtCode,
    day,
    timezoneOffset: timezoneOffset,
  }, motivo);
  const periodData = response;

  if (isDayComplete && periodData) {
    const chartsBas: ChartsBasic_DMT = {
      F1: (periodData.F1 === '') ? null : periodData.F1,
      F2: (periodData.F2 === '') ? null : periodData.F2,
      F3: (periodData.F3 === '') ? null : periodData.F3,
      F4: (periodData.F4 === '') ? null : periodData.F4,
    };

    const dateNow = Date.now();
    const date = formatDate(new Date(dateNow));

    await sqldb.cache_cond_tel.w_insertUpdate({
      devId: dmtCode,
      YMD: day,
      vers: 'dmt-3',
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

    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. dmtCode: ${dmtCode} - Day: ${day}`);
  }
  return periodData;
};

export const processDmtDay: API_Internal['/diel-internal/api-async/processDmtDay'] = async function(reqParams) {
  const { dmtCode, day } = reqParams;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, dmtCode });
  }
  if (!dmtCode) { 
    logger.error('Invalid dmtCode: ' + dmtCode); 
    return null; 
  }
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDmtDay', { dmtCode, dayYMD: day }).then((r) => r.data);
  }

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substring(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substring(0, 10);
  if (day > dayLimitFuture) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const timezoneInfo = await getTimezoneInfoByDmt({ dmtCode: dmtCode });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  const existingData = await sqldb.cache_cond_tel.getItem({ devId: dmtCode, YMD: day, timezoneOffset: timezoneOffset });
  if (existingData && existingData.vers === 'dmt-3' && existingData.chartsBas) {
    return {
      ...(jsonTryParse<ChartsBasic_DMT>(existingData.chartsBas)||{}),
    };
  }

  const periodData = await getDmtDataFromRusthist(dmtCode, day, reqParams.motivo, isDayComplete, timezoneInfo && timezoneOffset);

  return periodData;
}

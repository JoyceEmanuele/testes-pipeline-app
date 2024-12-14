import {
  ChartsBasic_DMA,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { logger } from '../../srcCommon/helpers/logger';
import { API_Internal } from '../api-internal';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS';
import { formatDate } from '../telemHistory/dacHist';

export const processDmaDay: API_Internal['/diel-internal/api-async/processDmaDay'] = async function(reqParams) {
  const { dmaId, day, unitId } = reqParams;

  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, dmaId });
  }
  if (!dmaId) { 
    logger.error('Invalid dmaId: ' + dmaId); 
    return null; 
  }

  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDmaDay', { dmaId, dayYMD: day, unitId }).then((r) => r.data);
  }

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substr(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substr(0, 10);
  if (!(day <= dayLimitFuture)) {
    return null;
  }

  const isDayComplete = (day < dayLimitSave);

  let timezoneOffset = -3;
  const timezoneInfo = unitId ? await getTimezoneByUnit({ UNIT_ID: unitId }) : await getTimezoneInfoByDev({ devId: dmaId });

  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  const existingData = await sqldb.cache_cond_tel.getItem({ devId: dmaId, YMD: day, timezoneOffset: timezoneOffset });
  if (existingData && existingData.vers === 'dma-2' && existingData.chartsBas) {
    return {
      ...(jsonTryParse<ChartsBasic_DMA>(existingData.chartsBas)||{}),
    };
  }

  const response = await rusthistApi['/comp-dma']({
    dev_id: dmaId,
    day,
    timezoneOffset: timezoneInfo && timezoneOffset,
  }, reqParams.motivo);
  
  const periodData = response;

  if (isDayComplete && periodData) {
    const chartsBas: ChartsBasic_DMA = {
      TelemetryList: (periodData.TelemetryList && periodData.TelemetryList.length > 0) ? periodData.TelemetryList : null,
      timeOfTheLastTelemetry: periodData.timeOfTheLastTelemetry || null,
    };

    const dateNow = Date.now();
    const date = formatDate(new Date(dateNow));

    await sqldb.cache_cond_tel.w_insertUpdate({
      devId: dmaId,
      YMD: day,
      vers: 'dma-2',
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
    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. DmaId: ${dmaId} - Day: ${day}`);
  }

  return periodData;
}

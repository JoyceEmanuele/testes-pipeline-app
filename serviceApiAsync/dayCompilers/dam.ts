import {
  ChartsBasic_DAM,
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

export const processDamDay: API_Internal['/diel-internal/api-async/processDamDay'] = async function(reqParams) {
  const { damId, day, unitId } = reqParams;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, damId });
  }
  if (!damId) { logger.info('Invalid damId'); return null; }
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDamDay', { damId, dayYMD: day, unitId }).then((r) => r.data);
  }

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substr(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substr(0, 10);
  if (!(day <= dayLimitFuture)) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const timezoneInfo = unitId ? await getTimezoneByUnit({ UNIT_ID: unitId }) : await getTimezoneInfoByDev({ devId: damId });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  const existingData = await sqldb.cache_cond_tel.getItem({ devId: damId, YMD: day, timezoneOffset: timezoneOffset });
  if (existingData && existingData.vers === 'dam-2' && existingData.chartsBas && (existingData.hoursOnline != null)) {
    return {
      ...(jsonTryParse<ChartsBasic_DAM>(existingData.chartsBas)||{}),
      hoursOnline: existingData.hoursOnline,
    };
  }

  const periodData = await rusthistApi['/comp-dam']({
    dev_id: damId,
    day,
    timezoneOffset: timezoneInfo && timezoneOffset,
  }, reqParams.motivo);

  if (isDayComplete && periodData && !periodData.provision_error) {
    const chartsBas: ChartsBasic_DAM = {
      State: (periodData.State === '') ? null : periodData.State,
      Mode: (periodData.Mode === '') ? null : periodData.Mode,
      Temperature: (periodData.Temperature === '') ? null : periodData.Temperature,
      Temperature_1: (periodData.Temperature_1 === '') ? null : periodData.Temperature_1,
    };

    const dateNow = Date.now();
    const date = formatDate(new Date(dateNow));

    await sqldb.cache_cond_tel.w_insertUpdate({
      devId: damId,
      YMD: day,
      vers: 'dam-2',
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
    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. DamId: ${damId} - Day: ${day}`);
  }

  return periodData;
}

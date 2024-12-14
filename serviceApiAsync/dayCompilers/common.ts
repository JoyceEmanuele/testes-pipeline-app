import {
  CompiledStats_DAC,
  MeanTemperature_DAC_DUT_DRI,
} from '../../srcCommon/types';
import sqldb from '../../srcCommon/db'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';

export async function getPeriodsUseData (dacId: string, dayIni: string, dayEndExc: string) {
  const timezoneInfo = await getTimezoneInfoByDev({ devId: dacId });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }
  const rows = await sqldb.cache_cond_tel.getCompiledStats({
    devIds: [dacId],
    dayStart: dayIni,
    dayNext: dayEndExc,
    timezoneOffset: timezoneOffset,
  });
  const list = [];
  for (const item of rows) {
    if (!item.cstats) continue;
    const cstats = jsonTryParse<CompiledStats_DAC>(item.cstats);
    if (!cstats) continue;
    const meantp = jsonTryParse<MeanTemperature_DAC_DUT_DRI>(item.meantp);
    list.push(Object.assign(cstats, { YMD: item.YMD, meantp }));
  }
  return list;
}

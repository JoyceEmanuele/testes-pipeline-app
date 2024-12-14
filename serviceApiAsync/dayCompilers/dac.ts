import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import {
  ChartsBasic_DAC,
  ChartsDetailed_DAC,
  CompiledStats_DAC,
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
import { onDacDayStats } from '../notifs/dacEndOfDay';
import { API_Internal } from '../api-internal';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS';
import { formatDate } from '../telemHistory/dacHist';

function shouldCheckNotifications (reqDay: string) {
  const now = Date.now();
  const timeLimitD = new Date(now - 3 * 60 * 60 * 1000 - 15 * 60 * 1000);
  timeLimitD.setUTCHours(0);
  timeLimitD.setUTCMinutes(15);
  timeLimitD.setUTCSeconds(0);
  timeLimitD.setUTCMilliseconds(0);
  const lMin = timeLimitD.getTime() + 3 * 60 * 60 * 1000;
  const lMax = lMin + 10 * 60 * 60 * 1000;

  const yesterdayD = new Date(timeLimitD.getTime());
  yesterdayD.setUTCDate(yesterdayD.getUTCDate() - 1);
  const yesterdayYMD = yesterdayD.toISOString().substr(0, 10);

  return ((reqDay === yesterdayYMD) && (now > lMin) && (now < lMax));
}

export async function loadDamSched (GROUP_ID: number ) {
  const row = await sqldb.MACHINES.getAutDamProg({ GROUP_ID });
  // if (row.DAM_SELF_REFERENCE !== 0) return null;
  const fullProg = row.LASTPROG_DAM && scheduleData.parseFullProgV4(row.LASTPROG_DAM);
  return fullProg;
}

export const processDacDay: API_Internal['/diel-internal/api-async/processDacDay'] = async function(reqParams) {
  const { dac, day, hType, dacExtInf, debug_L1_fancoil } = reqParams;
  if (!/\d\d\d\d-\d\d-\d\d/.test(day)) {
    throw Error('Invalid day').HttpStatus(500).DebugInfo({ day, dac });
  }
  if ((!dac) || (!dac.devId)) { logger.info('Invalid dacId'); return null; }
  if (dac.devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PC1`, JSON.stringify(reqParams));
  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/devtools/processDacDay', { dacId: dac.devId, dayYMD: day, histType: hType, unitId: dacExtInf.UNIT_ID }).then((r) => r.data);
  }

  const relatedSched = (dacExtInf.GROUP_ID || null) && await loadDamSched(dacExtInf.GROUP_ID);
  const current = relatedSched && scheduleData.getDayPeriod(relatedSched, day);
  let secI = (current && current.permission === 'allow') ? (current.indexIni * 60) : null;
  let secF = (current && current.permission === 'allow') ? ((current.indexEnd + 1) * 60) : null;
  if ((secI == null) && (secF == null)) {
    secI = 8 * 60 * 60; // 08:00
    secF = 18 * 60 * 60; // 18:00
  }

  const withDetailedCharts = (hType === "TelemetryCharts");

  const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substring(0, 10);
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substring(0, 10);
  if (dac.devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PC2`);
  if (!(day <= dayLimitFuture)) {
    return null;
  }
  const isDayComplete = (day < dayLimitSave);

  const timezoneInfo = dacExtInf.UNIT_ID ? await getTimezoneByUnit({ UNIT_ID: dacExtInf.UNIT_ID }) : await getTimezoneInfoByDev({ devId: dac.devId });
  
  let timezoneOffset = -3;
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  // busco no DynamoDB se já existe esse dia compilado. Aí posso verificar a versão, sobrescrever esse dia ou pular.
  {
    const existingData = await sqldb.cache_cond_tel.getItem({ devId: dac.devId, YMD: day, timezoneOffset: timezoneOffset });
    if (existingData && existingData.vers === 'dac-3') {
      if (existingData.meantp && existingData.chartsBas && existingData.cstats && (existingData.hoursOnline != null)) {
        if (hType === "L1-Charts&Stats") {
          return {
            provision_error: false,
            ...(jsonTryParse<CompiledStats_DAC>(existingData.cstats)||{}),
            ...(jsonTryParse<ChartsBasic_DAC>(existingData.chartsBas)||{}),
            ...(jsonTryParse<MeanTemperature_DAC_DUT_DRI>(existingData.meantp)||{}),
          };
        }
        if ((hType === "TelemetryCharts") && existingData.chartsDet) {
          return {
            provision_error: false,
            ...(jsonTryParse<CompiledStats_DAC>(existingData.cstats)||{}),
            ...(jsonTryParse<ChartsBasic_DAC>(existingData.chartsBas)||{}),
            ...(jsonTryParse<MeanTemperature_DAC_DUT_DRI>(existingData.meantp)||{}),
            ...(jsonTryParse<ChartsDetailed_DAC>(existingData.chartsDet)||{}),
          };
        }
      }
    }
  }

  if (dac.devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PC3`);
  const hwCfg = dac.hwCfg;
  const periodData = await rusthistApi['/comp-dac-v2']({
    dev_id: dac.devId,
    ts_ini: day + 'T00:00:00',
    interval_length_s: 24 * 60 * 60,
    isVrf: hwCfg.isVrf,
    calculate_L1_fancoil: hwCfg.calculate_L1_fancoil,
    debug_L1_fancoil,
    hasAutomation: hwCfg.hasAutomation,
    fluid_type: hwCfg.FLUID_TYPE,
    P0Psuc: hwCfg.P0Psuc,
    P1Psuc: hwCfg.P1Psuc,
    P0Pliq: hwCfg.P0Pliq,
    P1Pliq: hwCfg.P1Pliq,
    P0mult: hwCfg.P0multLin,
    P1mult: hwCfg.P1multLin,
    P0multLin: hwCfg.P0multLin,
    P0multQuad: hwCfg.P0multQuad,
    P1multLin: hwCfg.P1multLin,
    P1multQuad: hwCfg.P1multQuad,
    P0ofst: hwCfg.P0ofst,
    P1ofst: hwCfg.P1ofst,
    T0_T1_T2: hwCfg.TsensRename && [
      hwCfg.TsensRename.T0,
      hwCfg.TsensRename.T1,
      hwCfg.TsensRename.T2,
    ],
    DAC_APPL: dac.hwCfg.DAC_APPL || undefined,
    DAC_TYPE: dac.hwCfg.DAC_TYPE,
    timezoneOffset: timezoneInfo && timezoneOffset,
    virtualL1: dac.hwCfg.simulateL1,
    L1CalcCfg: hwCfg.L1CalcCfg,
  }, reqParams.motivo);

  if (dac.devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PC4`, JSON.stringify(periodData));

  if (!periodData.numDeparts) periodData.numDeparts = 0;
  if (!periodData.hoursOn) periodData.hoursOn = 0;
  if (!periodData.hoursOff) periodData.hoursOff = 0;
  if (!periodData.hoursBlocked) periodData.hoursBlocked = 0;
  periodData.hoursOn = Math.round(periodData.hoursOn * 1000) / 1000;
  periodData.hoursOff = Math.round(periodData.hoursOff * 1000) / 1000;
  periodData.hoursBlocked = Math.round(periodData.hoursBlocked * 1000) / 1000;

  const hasPliq = hwCfg.P0Pliq || hwCfg.P1Pliq;
  const hasPsuc = hwCfg.P0Psuc || hwCfg.P1Psuc;
  if (!hasPsuc) delete periodData.Psuc;
  if (!hasPliq) delete periodData.Pliq;
  if (!hasPsuc) delete periodData.Tsh;
  if (!hasPliq) delete periodData.Tsc;

  if (isDayComplete && periodData && !periodData.provision_error) {
    const chartsDet: ChartsDetailed_DAC = (!withDetailedCharts) ? null : {
      Psuc: (periodData.Psuc === '') ? null : periodData.Psuc,
      Pliq: (periodData.Pliq === '') ? null : periodData.Pliq,
      Tamb: (periodData.Tamb === '') ? null : periodData.Tamb,
      Tsuc: (periodData.Tsuc === '') ? null : periodData.Tsuc,
      Tliq: (periodData.Tliq === '') ? null : periodData.Tliq,
      Tsc: (periodData.Tsc === '') ? null : periodData.Tsc,
      Tsh: (periodData.Tsh === '') ? null : periodData.Tsh,
      L1raw: (periodData.L1raw === '') ? null : periodData.L1raw,
      L1fancoil: (periodData.L1fancoil === '') ? null : periodData.L1fancoil,
    };

    const chartsBas: ChartsBasic_DAC = {
      Lcmp: (periodData.Lcmp === '') ? null : periodData.Lcmp,
      Levp: (periodData.Levp === '') ? null : periodData.Levp,
      Lcut: (periodData.Lcut === '') ? null : periodData.Lcut,
      State: (periodData.State === '') ? null : periodData.State,
      Mode: (periodData.Mode === '') ? null : periodData.Mode,
      SavedData: (periodData.SavedData === '') ? null : periodData.SavedData,
    };

    const Tamb = (periodData.Tamb && parseCompressedChartData(periodData.Tamb)) || null;
    const { med, max, min } = ((secI != null) && (secF != null)) ? meanChartValue(Tamb, secI, secF) : { med: null, max: null, min: null };
    const meantp: MeanTemperature_DAC_DUT_DRI = {
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

    const cstats: CompiledStats_DAC = {
      numDeparts: periodData.numDeparts || 0,
      hoursOn: periodData.hoursOn || 0,
      hoursOff: periodData.hoursOff || 0,
      hoursBlocked: periodData.hoursBlocked || 0,
      startLcmp: periodData.startLcmp,
      endLcmp: periodData.endLcmp,
    }

    const dateNow = Date.now();
    const date = formatDate(new Date(dateNow));
    
    await sqldb.cache_cond_tel.w_insertUpdate({
      devId: dac.devId,
      YMD: day,
      vers: 'dac-3',
      cstats: JSON.stringify(cstats),
      chartsBas: JSON.stringify(chartsBas),
      meantp: JSON.stringify(meantp),
      chartsDet: (chartsDet && JSON.stringify(chartsDet)) || undefined,
      devOnline: cstats.hoursOn + cstats.hoursOff,
      timezoneOffset,
      last_calculated_date: date
    });
    logger.info(`DBG: Dados de telemetria compilados e salvos no banco. devId: ${dac.devId} - day: ${day} - data: ${JSON.stringify({ chartsBas: !!chartsBas, chartsDet: !!chartsDet })}`)

    if (shouldCheckNotifications(day)) {
      onDacDayStats(dac.devId, cstats)
        .catch((err) => {
          logger.error(err);
        });
    }
  }

  if (dac.devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PC5`, JSON.stringify(periodData));

  return periodData;
}

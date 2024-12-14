import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import sqldb from '../../srcCommon/db'
import { processDutDay } from '../dayCompilers/dut';
import type { ChartsBasic_DUT_AUT, ChartsDetailed_DUT, FullHist_DUT } from '../../srcCommon/types'
import { API_private2 } from '../../srcCommon/types/api-private'
import { API_Internal } from '../api-internal'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo'
import { mergeVarsCommomX, parseCompressedChartData, processReceivedHistoryDUT } from '../../srcCommon/helpers/chartDataFormats'
import { addDays_YMD, getNumDays, timeToSeconds } from '../../srcCommon/helpers/dates'
import { meanChartValue } from '../../srcCommon/helpers/meanChartValue'
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS'
import { loadLastTelemetries } from '../../srcCommon/helpers/devsLastComm'
import { consumoPorHora, getDailyUsage as getDailyUsageDac } from './dacHist';

const verifyCommonSeconds = (listHumidity: { v: number[], c: number[] }[]) => {
  for (let i = 0; i < listHumidity.length - 1; i++) {
    const actual = listHumidity[i];
    const next = listHumidity[i + 1];
    for (let j = 0; j < actual.v.length; j++) {
      if (actual.c[j] > next.c[j]) {
        const secondsToFit = actual.c[j] - next.c[j];
        actual.c[j] = next.c[j];
        actual.c.splice(j + 1, 0, secondsToFit);
        actual.v.splice(j + 1, 0, actual.v[j]);

      }
      else if (actual.c[j] < next.c[j]) {
        const secondsToFit = next.c[j] - actual.c[j];
        next.c[j] = actual.c[j];
        next.c.splice(j + 1, 0, secondsToFit);
        next.v.splice(j + 1, 0, next.v[j]);
      }
    }
  }
}

const verifyFinalList = (listHumidity: { v: number[], c: number[] }[]) => {
  let hasChanges = true;

  while (hasChanges) {
    hasChanges = false;

    for (let i = 0; i < listHumidity.length - 1; i++) {
      const actual = listHumidity[i];
      const next = listHumidity[i + 1];

      for (let j = 0; j < actual.v.length; j++) {
        if (actual.c[j] > next.c[j]) {
          const secondsToFit = actual.c[j] - next.c[j];
          actual.c[j] = next.c[j];
          actual.c.splice(j + 1, 0, secondsToFit);
          actual.v.splice(j + 1, 0, actual.v[j]);
          hasChanges = true;
        }
      }
    }
  }
}

const calculateAverageWithHumidityOffset = (nonNullValues: number[], HUMIDITY_OFFSET: number) => {
  if (nonNullValues.length > 0) {
    const average = nonNullValues.reduce((acc, valor) => acc + valor, 0) / nonNullValues.length;
    const averageWithHumidityOffset = average + HUMIDITY_OFFSET; 

    return Math.round(averageWithHumidityOffset * 100) / 100;
  } else {
    return null;
  }
}

const manageHumidityDutQA = (HUMIDITY_OFFSET: number, listHumidity: { v: number[], c: number[] }[]) => {
  const averageList: { v: number[], c: number[] } = { v: [], c: [] };

  verifyCommonSeconds(listHumidity);

  verifyFinalList(listHumidity);

  const numPositions = listHumidity[0].v.length;
  const resultV: number[] = new Array(numPositions).fill(0);

  for (let i = 0; i < numPositions; i++) {
    const nonNullValues = listHumidity.map(obj => obj.v[i]).filter(valor => valor !== null);
    resultV[i] = calculateAverageWithHumidityOffset(nonNullValues, HUMIDITY_OFFSET);
  }

  averageList.c = listHumidity[0].c;
  averageList.v = resultV;

  return averageList;
}

export const getHumidity = async (UNIT_ID: number, day: string, rusthistDebug: { motivo: string }) => {
  const devsList = await sqldb.DUTS.getDutsMonitoringByUnit({ UNIT_ID });

  let dutQAListHumidity: {
    v: number[],
    c: number[],
  }[] = [];

  let humidityAverage: {
    v: number[],
    c: number[],
  } = { v: [], c: [] };

  const lastTelemetries = await loadLastTelemetries({
    devIds: (devsList.length <= 500) ? devsList.map((x) => x.DEVICE_CODE) : undefined,
  });
  for (const dut of devsList) {
    const dutInfo = lastTelemetries.lastDutTelemetry(dut.DEVICE_CODE);
    if (dutInfo?.lastTelemetry?.Humidity && (dutInfo?.lastTelemetry?.eCO2 || dutInfo?.lastTelemetry?.raw_eCO2) && (dutInfo?.lastTelemetry?.Temperature || dutInfo?.lastTelemetry?.Tmp)) {
      let compiledData = await getTelemetryByEnvironment(dut.DEVICE_CODE, [day], { RTYPE_ID: dut.RTYPE_ID, UNIT_ID: dut.UNIT_ID }, rusthistDebug);
      const { Humidity } = parseCompressedWithEnvironment(compiledData)
      dutQAListHumidity.push(Humidity);
    }
  }

  if (dutQAListHumidity.length) {
    humidityAverage = manageHumidityDutQA(devsList[0].HUMIDITY_OFFSET, dutQAListHumidity);
  }

  return humidityAverage;
}

const verifyDutDuoHumidity = async (dutFreshInf: { CLIENT_ID: number, UNIT_ID: number, DEVICE_CODE: string }, includeHumidity: boolean, day: string, humidity: { v: number[], c: number[] }, rusthistDebug: { motivo: string }) => {
  if(!includeHumidity) return humidity;

  const dutDuoInfo = await sqldb.DUTS.getDutsDuoMonitoringEvaporatorByDevice({ DEVICE_CODE: dutFreshInf.DEVICE_CODE });
  if (dutDuoInfo && [1, 145].includes(dutFreshInf.CLIENT_ID)) {
    humidity = await getHumidity(dutFreshInf.UNIT_ID, day, rusthistDebug);
  }

  return humidity;
}

export const getDayChartsData: API_private2['/dut/get-day-charts-data'] = async function (reqParams, session) {
  // TODO: detect when the connection is closed
  // req.on("close", function() {
  //   // request closed unexpectedly
  // });
  // req.on("end", function() {
  //   // request ended normally
  // });

  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.day)) throw Error('Invalid day').HttpStatus(400)

  // # Verifica permissão
  const devId = reqParams.devId;
  if (!devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  if (!dutFreshInf) throw Error('DUT não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (isTemporaryId(devId)) {
    return {};
  }
  

  let compiledData = await getTelemetryByEnvironment(reqParams.devId, [reqParams.day], dutFreshInf, { motivo: `/dut/get-day-charts-data ${session.user}`});
  let includeHumidity = true;

  if (!compiledData) compiledData = [{}];
  if (!reqParams.selectedParams.includes('Temperature')) compiledData.forEach(item => delete item.Temp);
  if (!reqParams.selectedParams.includes('Temperature_1')) compiledData.forEach(item => delete item.Temp1);
  if (!reqParams.selectedParams.includes('Humidity')) {
    compiledData.forEach(item => delete item.Hum);
    includeHumidity = false;
  }
  if (!reqParams.selectedParams.includes('eCO2')) compiledData.forEach(item => delete item.eCO2);
  if (!reqParams.selectedParams.includes('TVOC')) compiledData.forEach(item => delete item.TVOC);

  let daySched = undefined;
  const sched = (dutFreshInf.IS_DUT_AUT && !dutFreshInf.DISAB) ? dutFreshInf.DESIREDPROG : dutFreshInf.USEPERIOD;
  const roomSched = scheduleData.parseFullProgV4(sched);
  const daySchedData = roomSched && scheduleData.getDayPeriod(roomSched, reqParams.day);
  if (daySchedData) {
    daySched = {
      TUSEMAX: dutFreshInf.TUSEMAX,
      TUSEMIN: dutFreshInf.TUSEMIN,
      indexIni: daySchedData.indexIni,
      indexEnd: daySchedData.indexEnd,
    };
  }

  const {Temperature, Temperature_1, Humidity, eCO2, TVOC, L1, provision_error, numDeparts, hoursOnL1, hoursOffL1 } = parseCompressedWithEnvironment(compiledData);
  let humidity = Humidity;

  humidity = await verifyDutDuoHumidity({ CLIENT_ID: dutFreshInf.CLIENT_ID, UNIT_ID: dutFreshInf.UNIT_ID, DEVICE_CODE: devId }, includeHumidity, reqParams.day, humidity, { motivo: `/dut/get-day-charts-data ${session.user}` });

  const formatted = {
    Temperature,
    Temperature_1,
    Humidity: humidity,
    eCO2,
    TVOC,
    L1,
    provision_error,
    daySched,
    hoursOnL1,
    hoursOffL1,
    numDeparts,
  }


  return formatted;
}

export const getDayChartsDataCommonX: API_private2['/dut/get-day-charts-data-commonX'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.day)) throw Error('Invalid day').HttpStatus(400);
  if (!reqParams.numDays) { throw Error('"numDays" required').HttpStatus(400); }

  // # Verifica permissão
  const devId = reqParams.devId
  if (!devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  if (!dutFreshInf) throw Error('DUT não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (reqParams.numDays !== undefined) {
    if ((reqParams.numDays < 1) || (reqParams.numDays > 15)) {
      throw Error('O período aceitável é de 1 a 15 dias').HttpStatus(400);
    }
  }

  const days = [] as string[]
  for (let i = 0; i < reqParams.numDays; i++) {
    const dayAux = addDays_YMD(reqParams.day, i);
    days.push(dayAux);
  }

  let compiledData = await getTelemetryByEnvironment(reqParams.devId, days, dutFreshInf, { motivo: `/dut/get-day-charts-data-commonX ${session.user}`});
  compiledData = cleanCompiledData(compiledData, reqParams.selectedParams);

  const formatted = [] as {
    Temperature: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Temperature_1: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Humidity: Awaited<ReturnType<typeof parseCompressedChartData>>,
    eCO2: Awaited<ReturnType<typeof parseCompressedChartData>>,
    TVOC: Awaited<ReturnType<typeof parseCompressedChartData>>,
    L1: Awaited<ReturnType<typeof parseCompressedChartData>>
  }[];
  for (const day of days) {
    let telemetriesDay = compiledData.filter(data => data.day === day);
    const {Temperature, Temperature_1, Humidity, eCO2, TVOC, L1} = parseCompressedWithEnvironment(telemetriesDay);
    formatted.push({
      Temperature,
      Temperature_1,
      Humidity,
      eCO2,
      TVOC,
      L1
    });
  }

  // Calcula todos os valores de pontos X em horas para os dados recebidos, com um intervalo de 5 segundos.
  const graphData = formatted.map((data, index) => processReceivedHistoryDUT(data, true, index));

  // Calcula os valores mínimos e máximos para a temperatura, eCO2, humidade e TVOC.
  const axisInfo = {
    TVOCLimits: [graphData[0].axisInfo.TVOCLimits[0], graphData[0].axisInfo.TVOCLimits[0]] as [number, number],
    co2Limits: [graphData[0].axisInfo.co2Limits[0], graphData[0].axisInfo.co2Limits[1]] as [number, number],
    humLimits: [graphData[0].axisInfo.humLimits[0], graphData[0].axisInfo.humLimits[1]] as [number, number],
    tempLimits: [graphData[0].axisInfo.tempLimits[0], graphData[0].axisInfo.tempLimits[1]] as [number, number],
  };

  graphData.forEach((data) => {
    axisInfo.TVOCLimits[0] = Math.min(axisInfo.TVOCLimits[0], data.axisInfo.TVOCLimits[0]);
    axisInfo.co2Limits[0] = Math.min(axisInfo.co2Limits[0], data.axisInfo.co2Limits[0]);
    axisInfo.humLimits[0] = Math.min(axisInfo.humLimits[0], data.axisInfo.humLimits[0]);
    axisInfo.tempLimits[0] = Math.min(axisInfo.tempLimits[0], data.axisInfo.tempLimits[0]);

    axisInfo.TVOCLimits[1] = Math.max(axisInfo.TVOCLimits[1], data.axisInfo.TVOCLimits[1]);
    axisInfo.co2Limits[1] = Math.max(axisInfo.co2Limits[1], data.axisInfo.co2Limits[1]);
    axisInfo.humLimits[1] = Math.max(axisInfo.humLimits[1], data.axisInfo.humLimits[1]);
    axisInfo.tempLimits[1] = Math.max(axisInfo.tempLimits[1], data.axisInfo.tempLimits[1]);
  });

  interface IGraphData {
    x: number; y?: number; L?: number;
  }

  const parsedGraphData: {
    [name: string]: IGraphData[]
  } = {
    Humidity: [],
    TVOC: [],
    Temperature: [],
    Temperature_1: [],
    eCO2: [],
    L1: [],
  };

  graphData.forEach((data) => {
    parsedGraphData.Humidity.push(...data.parsedGraphData.Humidity);
    parsedGraphData.TVOC.push(...data.parsedGraphData.TVOC);
    parsedGraphData.Temperature.push(...data.parsedGraphData.Temperature);
    parsedGraphData.Temperature_1.push(...data.parsedGraphData.Temperature_1);
    parsedGraphData.eCO2.push(...data.parsedGraphData.eCO2);
    parsedGraphData.L1.push(...data.parsedGraphData.L1);
  });

  let cAux = [] as number[];
  let vAux = [] as number[];
  const varList = [] as { c: number[], v: number[] }[];

  // Une os dados de cada dia em um vetor por variável
  for (const propriedade in parsedGraphData) {
    if (parsedGraphData.hasOwnProperty(propriedade)) {
      parsedGraphData[propriedade].forEach((data) => {
        cAux.push(data.x);
        vAux.push(data.y);
      });
      varList.push({ c: cAux, v: vAux });
      cAux = [];
      vAux = [];
    }
  }
  let daySched = undefined;
  const sched = (dutFreshInf.IS_DUT_AUT && !dutFreshInf.DISAB) ? dutFreshInf.DESIREDPROG : dutFreshInf.USEPERIOD;
  const roomSched = scheduleData.parseFullProgV4(sched);
  const daySchedData = roomSched && scheduleData.getDayPeriod(roomSched, reqParams.day);
  if (daySchedData) {
    daySched = {
      TUSEMAX: dutFreshInf.TUSEMAX,
      TUSEMIN: dutFreshInf.TUSEMIN,
      indexIni: daySchedData.indexIni,
      indexEnd: daySchedData.indexEnd,
    };
  }

  const list = mergeVarsCommomX(varList, reqParams.numDays);

  const commonXGraphData = {
    axisInfo,
    Humidity: { y: list.vs[0] as number[] },
    Temperature: { y: list.vs[2] as number[] },
    Temperature_1: { y: list.vs[3] as number[] },
    eCO2: { y: list.vs[4] as number[] },
    L1: { y: list.vs[5] as number[] },
    commonX: list.c,
    daySched,
  };

  return commonXGraphData;
}

async function getTelemetryByEnvironment(devId: string, days: string[], dutFreshInf: { RTYPE_ID: number, UNIT_ID?: number }, rusthistDebug: { motivo: string }) {

    // Verifica se há ENVIRONMENT_ID para considerar outros DUT_ID no histórico 
    const clientSpotDev = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: devId });

    const devs = [] as {
      day: string,
      devId: string,
      index: number,
      startSeconds: number|null,
      endSeconds: number|null,
    }[];
  
    // Lista de dispositivos à considerar na busca da telemetria
    if (!clientSpotDev.ENVIRONMENT_ID) {
      days.forEach((day, index) => {
        devs.push({
          day,
          devId: devId,
          index,
          startSeconds: null,
          endSeconds: null,
        });
      });
    }
    else {
      let timezoneOffset = -3;
      const timezoneInfo = dutFreshInf.UNIT_ID ? await getTimezoneByUnit({ UNIT_ID: dutFreshInf.UNIT_ID }) : await getTimezoneInfoByDev({ devId: devId })
      if (timezoneInfo != null) {
        timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
      }

      const devsFromSpot = await sqldb.DUTS_SPOTS_HISTORY.getDevsToTelemetry({ENVIRONMENT_ID: clientSpotDev.ENVIRONMENT_ID, dateStart: days[0], dateEnd: days[days.length - 1], timezoneOffset: timezoneOffset});
      days.forEach((day, index) => {
        const dayFirstHour = `${day} 00:00:00`;
        const dayFinalHour = `${day} 23:59:59`;
        const selectedToDate = devsFromSpot.filter(dev => dev.START_DATE <= day && (dev.END_DATE >= day || dev.END_DATE === null));
        selectedToDate.forEach((dev) => {
          devs.push({
            day,
            devId: dev.DEV_ID,
            index,
            startSeconds: dayFirstHour >= dev.FULL_START_DATE ? null : timeToSeconds(dev.FULL_START_DATE),
            endSeconds: (dev.FULL_END_DATE == null || dayFinalHour <= dev.FULL_END_DATE) ? null : timeToSeconds(dev.FULL_END_DATE),
          });
        });
      })
    }
  
    let compiledData = [] as (FullHist_DUT & {
      day?: string
      devId?: string
      index?: number
      startSeconds?: number
      endSeconds?: number
    })[];
    compiledData = await Promise.all(
      devs.map(info => processDutDay({ motivo: rusthistDebug.motivo, dutId: info.devId, day: info.day, hType: "TelemetryCharts", dutExtInf: dutFreshInf }))
    );
    compiledData = compiledData.filter((x) => x != null);
    compiledData.forEach((_item, index) => {
      compiledData[index]['day'] = devs[index].day;
      compiledData[index]['devId'] = devs[index].devId;
      compiledData[index]['index'] = devs[index].index;
      compiledData[index]['startSeconds'] = devs[index].startSeconds;
      compiledData[index]['endSeconds'] = devs[index].endSeconds;
    })

    return compiledData;
}

function parseCompressedWithEnvironment(telemetriesDay: Awaited<ReturnType<typeof  getTelemetryByEnvironment>>){
  let Temperature = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Temperature_1 = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Humidity = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let eCO2 = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let TVOC = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let L1: Awaited<ReturnType<typeof parseCompressedChartData>> = {v: [], c: []};
  let provision_error = false;
  let numDeparts = 0;
  let hoursOnL1 = 0;
  let hoursOffL1 = 0;
  telemetriesDay.forEach((telemetry, i) => {
    provision_error = provision_error || telemetry.provision_error;
    numDeparts = numDeparts + telemetry.numDeparts;
    hoursOnL1 = hoursOnL1 + telemetry.hoursOnL1;
    hoursOffL1 = hoursOffL1 + telemetry.hoursOffL1;
    const startDaytime = i === 0 && telemetry.startSeconds != null && telemetry.startSeconds > 0;
    const endDaytime = i === telemetriesDay.length - 1 && telemetry.endSeconds != null && telemetry.endSeconds < 86400; 
    const betweenDevices = i > 0 && telemetriesDay[i-1].endSeconds !== telemetry.startSeconds;
    let secondsToFillStart = startDaytime ? telemetry.startSeconds : 0;
    secondsToFillStart = betweenDevices ? Math.abs(telemetry.startSeconds - telemetriesDay[i-1].endSeconds) : secondsToFillStart;
    let secondsToFillEnd = endDaytime ? 86400 - telemetry.endSeconds : 0;
    const secondsTotal = (telemetry.endSeconds || 86400) - (telemetry.startSeconds || 0);

    const indexData =  {
      startDaytime,
      endDaytime,
      betweenDevices,
      secondsToFillStart,
      secondsToFillEnd,
      index: i,
    };

    Temperature = concatenateCompressed(Temperature, parseCompressed(telemetry, "Temp", indexData));
    Temperature_1 = concatenateCompressed(Temperature_1, parseCompressed(telemetry, "Temp1", indexData));
    Humidity = concatenateCompressed(Humidity, parseCompressed(telemetry, "Hum", indexData));
    eCO2 = concatenateCompressed(eCO2, parseCompressed(telemetry, "eCO2", indexData));
    TVOC = concatenateCompressed(TVOC, parseCompressed(telemetry, "TVOC", indexData));
    L1 = concatenateCompressed(L1, parseCompressed(telemetry, "L1", indexData));
  })

  return { Temperature, Temperature_1, Humidity, eCO2, TVOC, L1, provision_error, numDeparts, hoursOnL1, hoursOffL1 };
}

function concatenateCompressed(original: Awaited<ReturnType<typeof parseCompressedChartData>>, addition: Awaited<ReturnType<typeof parseCompressedChartData>>) {
  return {
    v: original.v.concat(addition.v),
    c: original.c.concat(addition.c),
  };
}

export const getDayStats: API_private2['/dut/get-day-stats'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.dayIni)) throw Error('Invalid day').HttpStatus(400)
  if (!reqParams.devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  if (!reqParams.numDays) throw Error('Invalid parameters! Missing numDays').HttpStatus(400)

  // # Verifica permissão
  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId: reqParams.devId });
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  return getDutDaySimpleStats({ devId: reqParams.devId, dateIni: reqParams.dayIni, numDays: reqParams.numDays, progObrigatoria: false, motivo: `/dut/get-day-stats ${session.user}` });
}

export const getDutDaySimpleStats: API_Internal['/diel-internal/api-async/getDutDaySimpleStats'] = async function(reqParams) {
  let { devId, dateIni, numDays, progObrigatoria } = reqParams;
  if (isTemporaryId(devId)) {
    return {};
  }

  const iniDate = new Date(dateIni + 'T00:00:00Z')
  if (numDays <= 0 || numDays > 10) return {}

  const dutInfo = await sqldb.DUTS.getDutDetails({ DEV_ID: devId });
  const fullProg = scheduleData.parseFullProgV4(dutInfo.USEPERIOD);

  let calcState: {
    meds: number[],
    max: number,
    min: number,
    tAcima:  number,
    tAbaixo: number,
  } = {
    meds: [],
    max: Number.NEGATIVE_INFINITY,
    min: Number.POSITIVE_INFINITY,
    tAcima: null,
    tAbaixo: null,
  };

  for (let iday = 0; iday < numDays; iday++) {
    const iniTs = iniDate.getTime() + iday * 24 * 60 * 60 * 1000;

    const newState = await calcStats(
      iniTs,
      {
        prog: fullProg,
        mandatory: progObrigatoria,
      },
      {
        devId,
        dutInfo,
      },
      reqParams.motivo,
    );
    calcState = calcGraphLimits(calcState, newState)

  }
  let resMed = null;
  if (calcState.meds.length > 0) {
    resMed = calcState.meds.reduce((acc, med) => (acc + med), 0) / calcState.meds.length;
    resMed = Math.round(resMed * 10) / 10;
  }

  if (calcState.max === Number.NEGATIVE_INFINITY) calcState.max = null;
  if (calcState.min === Number.POSITIVE_INFINITY) calcState.min = null;
  return { med: resMed, max: calcState.max, min: calcState.min, accTacima: calcState.tAcima, accTabaixo: calcState.tAbaixo };
}

export const getDailyUsage = async (dutId: string, datIni: string, numDays: number, dutFreshInf: { UNIT_ID: number, RTYPE_ID: number }, rusthistDebug: { motivo: string }) => {
  if ((numDays <= 0) || (numDays > 370)) return null;
  const dateIni = new Date(datIni + 'T00:00:00Z')
  
  const daysData: {
      dutId: string,
      day: string,
      hoursOnL1: number,
      hoursOffL1: number,
      numDeparts: number,
    }[] = [];

  const dayNext = new Date(dateIni.getTime())
  for (let i = 0; i < numDays; i++) {
    const day = dayNext.toISOString().substring(0, 10);
    daysData.push({
      dutId: dutId,
      day: day,
      hoursOnL1: 0,
      hoursOffL1: 0,
      numDeparts: 0,
    })
    dayNext.setUTCDate(dayNext.getUTCDate() + 1);
  }

  const compiledData = await Promise.all(
    daysData.map(data => processDutDay({ motivo: rusthistDebug.motivo, dutId: dutId, day: data.day, hType: "TelemetryCharts", dutExtInf: dutFreshInf }))
  );

  compiledData.forEach((item, index) => {
    const data = daysData[index];
    data.hoursOnL1 = item?.hoursOnL1 || 0;
    data.hoursOffL1 = item?.hoursOffL1 || 0;
    data.numDeparts = item?.numDeparts || 0;
  })

  const list = Object.values(daysData);

  return list;
}

/**
 * @swagger
 * /dut/get-usage-per-day:
 *   post:
 *     summary: Busca dados de índice de uso de um DUT DUO
 *     description: Retorna o índice de uso de um DUT DUO por dia
 *     tags:
 *      - DutHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dutId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DUT
 *             datIni:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Dia de início para busca dos dados
 *             numDays:
 *               required: true
 *               type: number
 *               default: null
 *               description: Número de dias à partir do dia inicial para busca de dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         description: Dia do consumo
 *                       hoursOnL1:
 *                         type: number
 *                         description: Quantidade de horas ligado
 *                       hoursOffL1:
 *                         type: number
 *                         description: Quantidade de horas desligado
 *                       numDeparts:
 *                         type: number
 *                         description: Número de partidas
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDutDuoUsagePerDay: API_private2['/dut/get-usage-per-day'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.datIni)) throw Error('Invalid day').HttpStatus(400)
  if (!reqParams.dutId) throw Error('Invalid parameters! Missing dutId').HttpStatus(400)
  if (!reqParams.numDays) throw Error('Invalid parameters! Missing numDays').HttpStatus(400);

  
  const devId = reqParams.dutId;
  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  if (!dutFreshInf) throw Error('DUT não encontrado').HttpStatus(400);
  
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (isTemporaryId(devId)) {
    return { list: [] };
  }
  
  const list = await getDailyUsage(devId, reqParams.datIni, reqParams.numDays, dutFreshInf, { motivo: `/dut/get-usage-per-day ${session.user}`});

  return { list }
}

/**
 * @swagger
 * /dut/get-day-consumption:
 *   post:
 *     summary: Busca dados de consumo de um DUT
 *     description: Retorna o consumo de um DUT por dia
 *     tags:
 *      - DutHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dutId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DUT
 *             day:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Dia a ser buscado os dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consumption:
 *                   type: array
 *                   items:
 *                     type: number
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDutDuoConsumptionPerDay: API_private2['/dut/get-day-consumption'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.day)) throw Error('Invalid day').HttpStatus(400)

  const devId = reqParams.dutId
  if (!devId) throw Error('Invalid parameters! Missing dutId').HttpStatus(400);

  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  let consumption: number[] = []

  if (isTemporaryId(devId)) {
    return {
      consumption
    };
  }

  let compiledData = await processDutDay({ motivo: `/duy/get-day-consumption ${session.user}`, dutId: devId, day: reqParams.day, hType: "TelemetryCharts", dutExtInf: dutFreshInf });

  if (compiledData) {
    const Lcmp = (compiledData.L1 && parseCompressedChartData(compiledData.L1)) || undefined;
    consumption = consumoPorHora(Lcmp);
  }
  
  return { consumption }
}

export const verifyAverageExternalTemperature = (dacsList: { day: string, meanT: number, maxT: number, minT: number }[]) => {
  const result: { day: string, meanT: number, maxT: number, minT: number }[] = [];

  if(!dacsList.length) return result;

  const groupedByDay = dacsList.reduce((externalTemperature, { day, meanT, maxT, minT }) => {
    externalTemperature[day] = externalTemperature[day] || { meanT: 0, maxT: 0, minT: 0, count: 0 };

    externalTemperature[day].meanT += meanT || 0;
    externalTemperature[day].maxT += maxT || 0;
    externalTemperature[day].minT += minT || 0;

    if (meanT || maxT || minT) { 
      externalTemperature[day].count += 1;
    }

    return externalTemperature;
  }, {} as { [day: string]: { meanT: number, maxT: number, minT: number, count: number } });

  for (const day in groupedByDay) {
    const { meanT, maxT, minT, count } = groupedByDay[day];
    result.push({ day, meanT: meanT / count, maxT: maxT / count, minT: minT / count });
  }

  return result;
}

/**
 * @swagger
 * /dut/get-duts-duo-energy-efficiency:
 *   post:
 *     summary: Busca dados de eficiência energética de duts duo
 *     description: Retorna dados de eficiência energética de duts duo filtrados por unidade
 *     tags:
 *      - DutHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             unitId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID da Unidade
 *             dateStart:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data de início para busca dos dados
 *             dateEnd:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data final para busca dos dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       DEV_ID:
 *                         type: string
 *                         description: Data em YYYY-MM
 *                       DAC_KW:
 *                         type: string
 *                         description: Data em YYYY-MM
 *                       ASSET_NAME:
 *                         type: string
 *                         description: Data em YYYY-MM
 *                       GROUP_NAME:
 *                         type: string
 *                         description: Data em YYYY-MM 
 *                       GROUP_ID:
 *                         type: number
 *                         description: Quantidade de horas ligado
 *                       status:
 *                         type: number
 *                         description: Quantidade de horas desligado
 *                       CONSUMPTION:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             DAT_REPORT:
 *                               type: string
 *                               description: Data em yyyy-mm-dd
 *                             DAY_HOURS_ON:
 *                               type: number
 *                               description: Horas Online
 *                             maxT:
 *                               type: number
 *                               description: Média das temperaturas máximas dos DACS da unidade no dia
 *                             meanT:
 *                               type: number
 *                               description: Média das temperaturas dos DACS da unidade no dia
 *                             minT:
 *                               type: number
 *                               description: Média das temperaturas mínimas dos DACS da unidade no dia
 * 
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDutsDuoEnergyEfficiency: API_private2['/dut/get-duts-duo-energy-efficiency'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Invalid Parameters, missing unitId.').HttpStatus(400)}
  if (!reqParams.dateStart) { throw Error('Invalid Parameters, missing dateStart.').HttpStatus(400)}
  if (!reqParams.dateEnd) { throw Error('Invalid Parameters, missing dateEnd.').HttpStatus(400)}

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({
    UNIT_ID: reqParams.unitId,
  });

  if (!unitInfo) { throw Error('Unit not found.').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const dutsDuoList = await sqldb.DUTS.getDutsDuoByUnit({ UNIT_ID: reqParams.unitId });
  const datIniD = new Date(reqParams.dateStart + 'T00:00:00Z');
  const datFinD = new Date(reqParams.dateEnd + 'T00:00:00Z');
  const nDays = Math.round((datFinD.getTime() - datIniD.getTime()) / 1000 / 60 / 60 / 24);

  let result: {
    DEV_ID: string,
    DAC_KW: number,
    ASSET_NAME: string
    GROUP_NAME: string,
    GROUP_ID: number,
    status: string,
    CONSUMPTION: {
      DAT_REPORT: string;
      DAY_HOURS_ON: number;
      meanT: number;
      maxT: number;
      minT: number;
    }[]
  }[] = [];

  if (dutsDuoList.length) {
    const lastTelemetries = await loadLastTelemetries({devIds: dutsDuoList.map((x) => x.DEVICE_CODE)});
    
    const resultsPromise = await Promise.all(
      dutsDuoList.map((dut) => getDailyUsage(dut.DEVICE_CODE, reqParams.dateStart, nDays, { UNIT_ID: dut.UNIT_ID, RTYPE_ID: dut.RTYPE_ID }, { motivo: `/dut/get-dut-duo-enegy-efficiency ${session.user}`} ))
    )
    const dailyUseResults = resultsPromise.flat();

    const dacsByUnit = await sqldb.DACS_DEVICES.getDacsByUnit({ UNIT_ID: unitInfo.UNIT_ID });

    const resultsPromiseDac = await Promise.all(
      dacsByUnit.map((x) => getDailyUsageDac({ dacId: x.DEVICE_CODE, datIni: reqParams.dateStart, numDays: nDays, DAC_KW: 0 }))
    )

    const resultsDac = resultsPromiseDac.flat();
    const externalTemperatureDac = verifyAverageExternalTemperature(resultsDac);

    for (const dut of dutsDuoList) {
      const dailyUse = dailyUseResults.filter((result) => result.dutId === dut.DEVICE_CODE);
      const lastComms = lastTelemetries.lastDutTelemetry(dut.DEVICE_CODE);
      
      const consumptionData = dailyUse.map((item) => {
        const externalTemperature = externalTemperatureDac.find((temp) => temp.day === item.day);

        return {
          DAT_REPORT: item.day,
          DAY_HOURS_ON: item.hoursOnL1,
          meanT: externalTemperature?.meanT || 0,
          minT: externalTemperature?.minT || 0,
          maxT: externalTemperature?.maxT || 0,
        };
      });
  
      result.push({
        DEV_ID: dut.DEVICE_CODE,
        DAC_KW: dut.MACHINE_KW,
        GROUP_NAME: dut.MACHINE_NAME,
        GROUP_ID: dut.MACHINE_ID,
        ASSET_NAME: dut.ASSET_NAME,
        status: lastComms.lastTelemetry?.L1 ? 'ON' : 'OFFLINE',
        CONSUMPTION: consumptionData,
      })
    }
  }

  return { list: result }
}
/**
 * @swagger
 * /dut/get-usage-per-month:
 *   post:
 *     summary: Busca dados de índice de uso de um DUT
 *     description: Retorna o índice de uso de um DUT por mês
 *     tags:
 *      - DutHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dutId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DUT
 *             datIni:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data de início para busca dos dados
 *             numMonths:
 *               required: true
 *               type: number
 *               default: null
 *               description: Número de meses à partir da data inicial para busca de dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         description: Data em YYYY-MM
 *                       hoursOnL1:
 *                         type: number
 *                         description: Quantidade de horas ligado
 *                       hoursOffL1:
 *                         type: number
 *                         description: Quantidade de horas desligado
 *                       numDeparts:
 *                         type: number
 *                         description: Número de partidas
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDutDuoUsagePerMonth: API_private2['/dut/get-usage-per-month'] = async function (reqParams, session) {
  if (!reqParams.dutId) throw Error('Invalid parameters! Missing dutId').HttpStatus(400);
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.datIni)) throw Error('Invalid date').HttpStatus(400);
  if (!reqParams.numMonths) throw Error('Invalid parameters! Missing numMonths').HttpStatus(400);

  const devId = reqParams.dutId;
  const dutFreshInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  const datIni = reqParams.datIni;
  if (!dutFreshInf) throw Error('DUT não encontrado').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, dutFreshInf.CLIENT_ID, dutFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  if (isTemporaryId(devId)) {
    return { list: [] };
  }
  
  const numDays = getNumDays(datIni, reqParams.numMonths);
  const compiledData = await getDailyUsage(devId, datIni, numDays, dutFreshInf, { motivo: `/dut/get-usage-per-month ${session.user}` });
  const months: {
    [month: string] : {
      month: string,
      hoursOnL1: number,
      hoursOffL1: number,
      numDeparts: number,
    }
  } = {};

  const dayNext = new Date(`${reqParams.datIni}T00:00:00Z`);
  for (let i = 0; i < reqParams.numMonths; i++) {
    const month = dayNext.toISOString().substring(0, 7);
    months[month] = {
      month: month,
      hoursOnL1: 0,
      hoursOffL1: 0,
      numDeparts: 0,
    }
    dayNext.setUTCMonth(dayNext.getUTCMonth() + 1);
  }

  for (const stats of compiledData) {
    const month = stats.day.substring(0, 7);
    if (!months[month]) continue;
    months[month].hoursOnL1 += stats.hoursOnL1;
    months[month].hoursOffL1 += stats.hoursOffL1;
    months[month].numDeparts += stats.numDeparts;
  }

  const list = Object.values(months);

  return { list }  
}


type CompressedTelemetry = Awaited<ReturnType<typeof  getTelemetryByEnvironment>>[number];
type TelsKey = keyof (ChartsBasic_DUT_AUT & ChartsDetailed_DUT)

function parseCompressed(telemetry: CompressedTelemetry, varName: TelsKey, indexData: {
  startDaytime: boolean,
  endDaytime: boolean,
  betweenDevices: boolean,
  secondsToFillStart: number,
  secondsToFillEnd: number,
  index: number,
}) {
  const {
    startDaytime,
    endDaytime,
    betweenDevices,
    secondsToFillStart,
    secondsToFillEnd,
  } = indexData;
  const compressed: Awaited<ReturnType<typeof parseCompressedChartData>> = {v: [], c: []};
  const parseAux = (telemetry[varName] && parseCompressedChartData(telemetry[varName], telemetry.startSeconds, telemetry.endSeconds)) || undefined;
  if (startDaytime || betweenDevices){
    compressed.v = compressed.v.concat(null);
    compressed.c = compressed.c.concat(secondsToFillStart);
  }
  if (parseAux) {
    compressed.v = compressed.v.concat(parseAux.v)
    compressed.c = compressed.c.concat(parseAux.c) 
  }
  if (endDaytime) {
    compressed.v = compressed.v.concat(null);
    compressed.c = compressed.c.concat(secondsToFillEnd);
  }
  return compressed;
}

function cleanCompiledData(compiledData: Awaited<ReturnType<typeof getTelemetryByEnvironment>>, selectedParams: string[]) {
  if (!compiledData) compiledData = [{}];
  if (!selectedParams.includes('Temperature')) compiledData.forEach((data) => delete data.Temp);
  if (!selectedParams.includes('Temperature_1')) compiledData.forEach((data) => delete data.Temp1);
  if (!selectedParams.includes('Humidity')) compiledData.forEach((data) => delete data.Hum);
  if (!selectedParams.includes('eCO2')) compiledData.forEach((data) => delete data.eCO2);
  if (!selectedParams.includes('TVOC')) compiledData.forEach((data) => delete data.TVOC);
  if (!selectedParams.includes('L1')) compiledData.forEach((data) => delete data.L1)
  return compiledData;
}

function calcXLimits(day: string, fullProg: scheduleData.FullProg_v4) {
  const current = scheduleData.getDayPeriod(fullProg, day);
  const limitXi = (current && current.permission === 'allow') ? (current.indexIni * 60) : null;
  const limitXf = (current && current.permission === 'allow') ? ((current.indexEnd + 1) * 60) : null;
  return {
    limitXi,
    limitXf
  }
}

async function calcStats(
  iniTs: number,
  prog: {
    prog: scheduleData.FullProg_v4,
    mandatory: boolean,
  },
  dut: {
    devId: string,
    dutInfo: {
      TUSEMIN: number,
      TUSEMAX: number,
      RTYPE_ID: number,
    },
  },
  callReason: string
  ) {
  const day = new Date(iniTs).toISOString().substring(0, 10)
  const {prog: fullProg, mandatory: progObrigatoria} = prog;
  const {devId, dutInfo} = dut;
  
  const {limitXi, limitXf} = calcXLimits(day, fullProg);
  if (progObrigatoria) {
    if (limitXi == null) return {};
    if (limitXf == null) return {};
  }
  let data = await processDutDay({ motivo: callReason, dutId: devId, day, hType: "TelemetryCharts", dutExtInf: dutInfo });
  if (!data || !data.Temp) {
    return {};
  }
  const formatted = {
    Temperature: (data.Temp && parseCompressedChartData(data.Temp)) || null,
  }

  return meanChartValue(formatted.Temperature, limitXi, limitXf, dutInfo.TUSEMIN, dutInfo.TUSEMAX);
}

function calcGraphLimits(currentState: {
  meds: number[],
  max: number,
  min: number,
  tAcima: number,
  tAbaixo: number
}, newData: {
  med?: number,
  max?: number,
  min?: number,
  tAcima?: number,
  tAbaixo?: number
}, 

) {
  if (newData.med != null) {
    currentState.meds.push(newData.med);
    if (newData.max != null) { currentState.max = Math.max(currentState.max, newData.max)}
    if (newData.min != null) { currentState.min = Math.min(currentState.min, newData.min)}
  }
  if (newData.tAcima) {  currentState.tAcima = (currentState.tAcima || 0) + newData.tAcima; }
  if (newData.tAbaixo) { currentState.tAbaixo = (currentState.tAbaixo || 0) + newData.tAbaixo; }
  return currentState;
}
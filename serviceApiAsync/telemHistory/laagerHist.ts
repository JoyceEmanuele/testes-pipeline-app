import { getDatesOfLastFourDaysOfWeek, getDaysList2_YMD } from '../../srcCommon/helpers/dates'
import sqldb from '../../srcCommon/db';
import { getDmaDayUsage } from '../telemHistory/dmaHist';
import { apiLaarger, getCorrectedReading, insertDailyHist, normalizeLaagerConsumption } from '../../srcCommon/extServices/laagerApi';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import { API_private2 } from '../../srcCommon/types/api-private';
import { IWatersConsumption } from '../../srcCommon/db/sql/CURRENT_WATERS_CONSUMPTION';
import { SessionData } from '../../srcCommon/types'
import * as httpRouter from '../apiServer/httpRouter'
import * as moment from 'moment';
import { getWaterConsumption, getWaterForecast, handleDataHistory, verifyEmptyWaterConsumptionHist, WaterConsumption } from '../../srcCommon/helpers/waterData';

interface IReadingsPerDay {
  time: string,
  reading:number,
  usage:number
}

export const getDailyUsageHistory: API_private2['/laager/get-daily-usage-history'] = async function (reqParams, session) {
  if (!reqParams.unit_id) { throw Error('"unit_id" required').HttpStatus(400)}
  if (!reqParams.start_date) { throw Error('"start_date" required').HttpStatus(400)}
  if (!reqParams.end_date) { throw Error('"end_date" required').HttpStatus(400)}

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const meterInf = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.unit_id });
    const clientId = meterInf && meterInf.CLIENT_ID;
    const unitId = meterInf && meterInf.UNIT_ID; // TODO: PERMS: trocar essas linhas para indicar se o meter não foi encontrado
    const perms = await getPermissionsOnUnit(session, clientId, unitId);
    if (!perms.canViewDevs) throw Error('Permissão negada').HttpStatus(403);
  }

  return getLaagerDayUsage({ UN_LAAGER: reqParams.unit_id, START_DATE: reqParams.start_date, END_DATE: reqParams.end_date });
}

export const getLaagerDayUsage = async function (reqParams: { UN_LAAGER: string, START_DATE: string, END_DATE: string }) {
  const { UN_LAAGER, START_DATE, END_DATE } = reqParams;
  const datIniD = new Date(START_DATE + 'T00:00:00Z');
  const datFinD = new Date(END_DATE + 'T00:00:00Z');
  const dateList = getDaysList2_YMD(START_DATE, END_DATE);
  const nowDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')
  const dateNow = new Date();
  const today = `${dateNow.getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)}`
  let unLaager = UN_LAAGER;
  let dmaIds = [] as { 
    ID: number,
    UNIT_ID: number,
    DMA_ID: string,
    START_DATE: string,
    END_DATE: string,
  }[];
  let laagerIds = [] as { 
    ID: number,
    UNIT_ID: number,
    LAAGER_ID: string,
    START_DATE: string,
    END_DATE: string,
  }[];

  const meterInfo = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: unLaager });

  if (meterInfo.UNIT_ID) {
    dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: meterInfo.UNIT_ID, dateStart: START_DATE, dateEnd: END_DATE});
    laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: meterInfo.UNIT_ID, dateStart: START_DATE, dateEnd: END_DATE});
    
    // Verificando se o Dispositivo no dia filtrado é DMA ou medidor Laager
    if (dmaIds.length && dmaIds[dmaIds.length -1].DMA_ID) {
      return getDmaDayUsage({ dmaId: dmaIds[dmaIds.length -1].DMA_ID, dayYMD: START_DATE, motivo: `/dma/get-day-usage `, unitIdLaager: meterInfo.UNIT_ID });
    } 
    if(laagerIds.length && laagerIds[laagerIds.length -1].LAAGER_ID){
      unLaager = laagerIds[laagerIds.length -1].LAAGER_ID;
    }
    // Se houver mais de um dispositivo para o mesmo dia (dia que houve troca de dispositivo), considerar apenas o mais recente para o dia.

  }

  const dailyHist = await sqldb.LAAGER_DAILY_HISTORY_USAGE.getExtraInfo({ LAAGER_CODE: unLaager, initial_date: START_DATE });

  let rowMeterAux: {
    date: string;
    reading: number;
    usage: number;
    readings_per_day: IReadingsPerDay[];
    estimatedUsage?: boolean;
  }[];
  if (datIniD > nowDate || dailyHist.length === 0 || (dailyHist.length && (dailyHist[0].READING !== null || (dailyHist[0].READING === null && dailyHist[0].USAGE_AT_READING_TIME !== 0)))) {
    const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1);
    const meter = responseGroup.find((response) => response.customer_id === unLaager);

    if (!meter) throw Error('Medidor de água não encontrado').HttpStatus(400);

    const { rf_device_id } = meter;
    const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());

    normalizeLaagerConsumption(responseMeter.history);
    // insert only records from past days
    const hist = responseMeter.history.filter((row) => today > row.date);
    if (hist.length === 0) { throw Error('Consumption history not found').HttpStatus(404); }

    rowMeterAux = hist;

    await insertDailyHist(rowMeterAux, unLaager);
    rowMeterAux = responseMeter.history;
    
  } else {
    const date = START_DATE;
    const { reading, usageAtTime } = dailyHist.reduce((acc, cur) => {
      acc.reading = cur.READING > acc.reading ? cur.READING : acc.reading;
      acc.usageAtTime += cur.USAGE_AT_READING_TIME;

      return acc;
    }, { reading: 0, usageAtTime: 0 });

    const hist = dailyHist.map((dayHist) => ({
      time: dayHist.READING_TIME,
      reading: dayHist.READING,
      usage: dayHist.USAGE_AT_READING_TIME,
    }));
    let estimatedUsage = false;
    dailyHist.forEach((dayHist) => {
      if(dayHist.ESTIMATED_USAGE){
        estimatedUsage = true
      }
    });
    rowMeterAux = [{
      date,
      reading,
      usage: usageAtTime,
      estimatedUsage:estimatedUsage,
      readings_per_day: hist,
    }];
  }

  const history = [] as {
    information_date: string
    usage: number
    readings_per_day: IReadingsPerDay[]
    devId: string
    estimatedUsage: boolean
  }[];

  let historyAux;
  let usage;
  let dailyAverage;
  let periodUsage = 0;
  let predicted;
  let auxAverage = dateList.length;
  let diffDays = 0;

  // Defines the days to be considered when calculating the average
  // As the date range can be longer than today's date, the days to be considered in the average will not always be the total days in the range.
  if (datFinD > nowDate){
    diffDays = Math.round((datFinD.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    auxAverage -= diffDays;
  }

  for (const date of dateList) {
    historyAux = rowMeterAux.find((row) => row.date === date);

    if (historyAux) {
      usage = historyAux.usage ?? 0
    } else {
      usage = 0
    }
    periodUsage += usage // 'Period usage' equals sum of all usage on range

    history.push({
      information_date: date,
      usage: usage,
      readings_per_day: historyAux.readings_per_day,
      devId: unLaager,
      estimatedUsage: historyAux ? historyAux.estimatedUsage : false,
    })
  }

  dailyAverage = periodUsage / (auxAverage > 0 ? auxAverage : 1) // Daily Average equals 'Period Usage' by days to be considered
  predicted = periodUsage + (dailyAverage * diffDays) // 'Predicted' equals 'Period Usage' plus 'daily average' times days left in range

  const updatedReadings = [] as {
    time: string,
    reading: number,
    usage: number
  }[];
  const updatedHist = [] as {
    information_date: string
    usage: number
    readings_per_day: IReadingsPerDay[]
    correct_readings: boolean
    devId: string
    estimatedUsage: boolean
  }[];

  for (const hist of history) {
      for (let hour=0; hour<24; hour++){    
        let readings = hist.readings_per_day.find(function(reading) {
          return Number((reading.time).split(':')[0]) === hour;
        });  
        if (readings){
          let latestReadings = updatedReadings.find((read) => Number(read.time.split(':')[0]) === hour);
  
          if (latestReadings) {
            const updatedReading = readings.reading - latestReadings.reading;
            latestReadings = {
              time: `${hour}:00`,
              usage: readings.usage + latestReadings.usage,
              reading: readings.reading + updatedReading,
            };
         } else {
          updatedReadings.push({
            time: `${hour}:00`,
            usage: readings.usage,
            reading: readings.reading,
          });
        }
      }
      else{
        updatedReadings.push({
          time: `${hour}:00`,
          usage: null, 
          reading: null,
        });
      }  
      updatedHist.push({
        information_date: hist.information_date,
        usage: hist.usage,
        readings_per_day: updatedReadings,
        correct_readings: (hist.readings_per_day.length > 2) ? true : false,
        devId: hist.devId,
        estimatedUsage: hist.estimatedUsage
      });      
    }           
  } 

  for (const hist of updatedHist){
      if (!hist.correct_readings){ 
        const correctedReadings = getCorrectedReading(hist.readings_per_day);  
        hist.readings_per_day = correctedReadings;
      }      
  }  

  return {
    daily_average: dailyAverage,
    period_usage: periodUsage,
    predicted: predicted,
    history: updatedHist,
  };
}

/**
 * @swagger
 * /laager/get-consumption-history:
 *   post:
 *     summary: Histórico de consumo de água dispositivos Laager
 *     description: Retorna o histórico de consumo de água no período seleiconado
 *     tags:
 *       - LaagerHist
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             LAAGER_CODE:
 *               required: true
 *               type: string
 *               default: null
 *               description: Código do dispositivo
 *             START_DATE:
 *               type: string
 *               default: null
 *               description: Data de início do período
 *               required: true
 *             END_DATE:
 *               type: string
 *               default: null
 *               description: Data de fim do período
 *               required: true
 *             LAST_START_DATE:
 *               type: string
 *               default: null
 *               description: Data de início do período anterior
 *               required: true
 *             LAST_END_DATE:
 *               type: string
 *               default: null
 *               description: Data de fim do período anterior
 *               required: true
 *             YEAR_GRAPHIC:
 *               type: boolean
 *               default: false
 *               description: Se está na visão Ano
 *               required: true
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *                 type: object
 *                 properties:
 *                   daily_average:
 *                     type: number
 *                     description: Média diária de consumo no período
 *                   period_usage:
 *                     type: number
 *                     description: Consumo total no período
 *                   history:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         information_date:
 *                           type: string
 *                           description: Data do consumo
 *                         usage:
 *                           type: number
 *                           description: Consumo de água
 *                         device_code:
 *                           type: string
 *                           description: Código do dispositivo
 *                         estimatedUsage:
 *                           type: boolean
 *                           description: Uso estimado
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getLaagerConsumptionHistory = async (reqParams: httpRouter.ApiParams['/laager/get-consumption-history'], session: SessionData) => {
  if (!reqParams.LAAGER_CODE) throw Error('Invalid properties. Missing LAAGER_CODE').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);

  const laagerInf = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: reqParams.LAAGER_CODE });
  if (!laagerInf) throw Error('Laager device not found').HttpStatus(400)

  const result: {
    daily_average: number,
    period_usage: number,
    period_usage_last: number,
    history: WaterConsumption[]
  } = {
    daily_average: 0,
    period_usage: 0,
    period_usage_last: 0,
    history: []
  }

  if (!laagerInf.UNIT_ID) return result;
  const perms = await getPermissionsOnUnit(session, laagerInf.CLIENT_ID, laagerInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const {
    dataWithActualDay,
    isBeforeThanActualDate,
    endDateVerified,
    hourGraphic,
  } = await getWaterConsumption({ START_DATE: reqParams.START_DATE, END_DATE: reqParams.END_DATE, LAST_START_DATE: reqParams.LAST_START_DATE, LAST_END_DATE: reqParams.LAST_END_DATE, UNIT_ID: laagerInf.UNIT_ID, result, yearGraphic: reqParams.YEAR_GRAPHIC });


  if (!reqParams.YEAR_GRAPHIC && (dataWithActualDay || !isBeforeThanActualDate)) {
    const day = dataWithActualDay ? moment(endDateVerified).add(1, 'day').format('YYYY-MM-DD') : reqParams.END_DATE;
    const numDays = moment(day).diff(moment(reqParams.START_DATE), 'days') + 1;

    const { history, daily_average, period_usage } = await getLaagerConsumptionHistoryInActualDay(result.history, day, laagerInf.LAAGER_CODE, hourGraphic, { daily_average: result.daily_average, period_usage: result.period_usage, period_usage_last: result.period_usage_last, num_days: numDays });

    result.daily_average = daily_average;
    result.period_usage = period_usage;
    result.history = history;
  }

  // preencher dias e horas futuras com vazio com o atual device
  if (hourGraphic) {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 1, reqParams.LAAGER_CODE, reqParams.START_DATE, reqParams.END_DATE, false);
  } 
  else if (reqParams.YEAR_GRAPHIC) {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 1, reqParams.LAAGER_CODE, reqParams.START_DATE, reqParams.END_DATE, true);
  } 
  else {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 24, reqParams.LAAGER_CODE, reqParams.START_DATE, reqParams.END_DATE, false);
  }

  result.history =  handleDataHistory(result.history)

  return result;
}

httpRouter.privateRoutes['/laager/get-consumption-history'] = getLaagerConsumptionHistory;

export const getLaagerConsumptionHistoryInActualDay = async (history: WaterConsumption[], day: string, device_code: string, hour_graphic: boolean, periodInfoAux: { daily_average: number, period_usage: number, period_usage_last:number, num_days: number }) => {
  const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1)
  
  const meter = responseGroup.find((meter) => meter.customer_id === device_code);

  if (!meter) throw Error('Water meter not found').HttpStatus(400);

  const { rf_device_id } = meter;
  const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());
  normalizeLaagerConsumption(responseMeter.history);
  const rowMeterAux = responseMeter.history?.find((row) => row.date === day );

  const periodInfo: {
    daily_average: number,
    period_usage: number,
    history: WaterConsumption[],
  } = {
    daily_average: Number(periodInfoAux.daily_average),
    period_usage: Number(periodInfoAux.period_usage),
    history,
  }

  if (!rowMeterAux) { return periodInfo }

  const estimatedUsage = rowMeterAux.estimatedUsage;

  if (hour_graphic) {
    for (const row of rowMeterAux.readings_per_day) {
      periodInfo.history.push({
        device_code,
        information_date: moment(`${day} ${row.time}`, 'YYYY-MM-DD HH:mm').startOf('hour').format("YYYY-MM-DDTHH:mm:ss"),
        usage: row.usage,
        month: 0,
        year: 0,
        estimatedUsage,
      });

      periodInfo.period_usage += row.usage;
    }
  } else {
    periodInfo.history.push({
      device_code,
      information_date: moment(day).startOf('day').format("YYYY-MM-DDTHH:mm:ss"),
      usage: rowMeterAux.usage,
      month: 0,
      year: 0,
      estimatedUsage,
    })

    periodInfo.period_usage += rowMeterAux.usage;
  }

  periodInfo.daily_average = periodInfo.period_usage / periodInfoAux.num_days;

  return periodInfo;
}

export const getMeterMeanHistory: API_private2['/laager/get-meter-mean-history'] = async function (reqParams, session) {
  if (!reqParams.meterId) throw Error('Invalid parameters! Missing meterId').HttpStatus(400)

  const info = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.meterId });

  if (!info) { throw Error('Could not find meter information').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, info.CLIENT_ID, info.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const storedData = await sqldb.CURRENT_LAAGER_CONSUMPTION.getReport({LAAGER_CODE: reqParams.meterId, UNIT_ID: info.UNIT_ID});
  let storedDataLast;
  if(storedData && storedData.length > 0){
    storedDataLast = storedData[storedData.length-1];
  }
  if(storedDataLast && storedDataLast.REPORT_DATE){
    const currDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const reportDate = new Date(storedDataLast.REPORT_DATE).toISOString().substring(0, 10);
    
    if(currDate === reportDate){
      const ans: {
        day: string
        averageConsumption: number
        consideredDays: number
      }[] = [];
  
      ans.push({day: 'Segunda', averageConsumption: storedDataLast.MONDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.MONDAY_CONSIDERED_DAYS});
      ans.push({day: 'Terça', averageConsumption: storedDataLast.TUESDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.TUESDAY_CONSIDERED_DAYS});
      ans.push({day: 'Quarta', averageConsumption: storedDataLast.WEDNESDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.WEDNESDAY_CONSIDERED_DAYS});
      ans.push({day: 'Quinta', averageConsumption: storedDataLast.THURSDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.THURSDAY_CONSIDERED_DAYS});
      ans.push({day: 'Sexta', averageConsumption: storedDataLast.FRIDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.FRIDAY_CONSIDERED_DAYS});
      ans.push({day: 'Sábado', averageConsumption: storedDataLast.SATURDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.SATURDAY_CONSIDERED_DAYS});
      ans.push({day: 'Domingo', averageConsumption: storedDataLast.SUNDAY_AVERAGE_CONSUMPTION, consideredDays: storedDataLast.SUNDAY_CONSIDERED_DAYS});
  
      return ans;
    }
  }


  if(!info.INSTALLATION_DATE) throw Error('Installation date from meter not was informed').HttpStatus(400) 

  const installationDate = new Date(info.INSTALLATION_DATE);

  const res: {
    day: string
    averageConsumption: number
    consideredDays: number
  }[] = [];

  const dates = getDatesOfLastFourDaysOfWeek();
  const historyInfo = await sqldb.LAAGER_HIST.getLaagerHist({ LAAGER_CODE: reqParams.meterId, UNIT_ID: info.UNIT_ID})

  for(const dayOfWeek of dates){
    const currDayLabel = dayOfWeek.day;
    let consideredDays = 0;
    let totalConsumption = 0;
    for(const date of dayOfWeek.dates){
      if((historyInfo.length && date >= new Date(historyInfo[0].START_DATE) && date >= installationDate ) || date >= installationDate){
        const dateFormatted = date.toISOString().split('T')[0];
        const data = await getDailyUsageHistory({unit_id: reqParams.meterId, start_date: dateFormatted, end_date: dateFormatted}, session);
        if(!data) continue;

        totalConsumption += data.period_usage;
        consideredDays++;
      }
    }

    let averageConsumption = null;

    if(consideredDays !== 0){
      averageConsumption =  totalConsumption/consideredDays;
    }

    res.push({day: currDayLabel, consideredDays, averageConsumption})
    
  }
  
  const data : IWatersConsumption = {
    METER_ID: reqParams.meterId,

    MONDAY_AVERAGE_CONSUMPTION: res[0].averageConsumption,
    MONDAY_CONSIDERED_DAYS: res[0].consideredDays,

    TUESDAY_AVERAGE_CONSUMPTION: res[1].averageConsumption,
    TUESDAY_CONSIDERED_DAYS: res[1].consideredDays,

    WEDNESDAY_AVERAGE_CONSUMPTION: res[2].averageConsumption,
    WEDNESDAY_CONSIDERED_DAYS: res[2].consideredDays,

    THURSDAY_AVERAGE_CONSUMPTION: res[3].averageConsumption,
    THURSDAY_CONSIDERED_DAYS: res[3].consideredDays,

    FRIDAY_AVERAGE_CONSUMPTION: res[4].averageConsumption,
    FRIDAY_CONSIDERED_DAYS: res[4].consideredDays,

    SATURDAY_AVERAGE_CONSUMPTION: res[5].averageConsumption,
    SATURDAY_CONSIDERED_DAYS: res[5].consideredDays,

    SUNDAY_AVERAGE_CONSUMPTION: res[6].averageConsumption,
    SUNDAY_CONSIDERED_DAYS: res[6].consideredDays,
  };
  
  if(data.METER_ID){
    await sqldb.CURRENT_LAAGER_CONSUMPTION.w_delete({LAAGER_CODE: data.METER_ID}, session.user);  
    const laagerId = await sqldb.LAAGER.getLaagerId({LAAGER_CODE: data.METER_ID});
    const currentConsumption = await sqldb.CURRENT_WATERS_CONSUMPTION.w_insert(data, session.user);
    await sqldb.CURRENT_LAAGER_CONSUMPTION.w_insert({LAAGER_ID: laagerId.LAAGER_ID, CURRENT_WATERS_CONSUMPTION_ID: currentConsumption.insertId}, session.user);
  }

  return res;
}

/**
 * @swagger
 * /laager/get-forecast-usage:
 *   post:
 *     summary: Previsão do consumo de água de dispositivos Laager
 *     description: Retorna a previsão do consumo de água pra cada dia da semana
 *     tags:
 *       - LaagerHist
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             LAAGER_CODE:
 *               required: true
 *               type: string
 *               default: null
 *               description: Código do dispositivo
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *                 type: object
 *                 properties:
 *                   monday: 
 *                     type: number
 *                     description: Previsão do consumo na segunda-feira
 *                   tuesday:
 *                     type: number
 *                     description: Previsão do consumo na terça-feira
 *                   wednesday:
 *                     type: number
 *                     description: Previsão do consumo na quarta-feira
 *                   thursday:
 *                     type: number
 *                     description: Previsão do consumo na quinta-feira
 *                   friday:
 *                     type: number
 *                     description: Previsão do consumo na sexta-feira
 *                   saturday:
 *                     type: number
 *                     description: Previsão do consumo no sábado
 *                   sunday:
 *                     type: number
 *                     description: Previsão do consumo no domingo
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getLaagerForecastUsage = async (reqParams: httpRouter.ApiParams['/laager/get-forecast-usage'], session: SessionData) => {
  if (!reqParams.LAAGER_CODE) throw Error('Invalid parameters! Missing LAAGER_CODE').HttpStatus(400)
  const laagerInfo = await sqldb.LAAGER.getSimpleInfo(reqParams);

  if (!laagerInfo) { throw Error('Could not find LAAGER information').HttpStatus(400) }
  if (!laagerInfo.UNIT_ID) { throw Error('Could not find UNIT information').HttpStatus(400) }
  if(!laagerInfo.INSTALLATION_DATE) throw Error('Installation date from LAAGER device not was informed').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, laagerInfo.CLIENT_ID, laagerInfo.UNIT_ID);
  
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const forecastUsage = await getWaterForecast(laagerInfo.UNIT_ID);

  return forecastUsage;
};

httpRouter.privateRoutes['/laager/get-forecast-usage'] = getLaagerForecastUsage;


/**
 * @swagger
 * /laager/get-history-list:
 *   post:
 *     summary: Histórico de consumo de dispositivo laager
 *     description: Retorna uma lista de histórico de consumo de dispositivo laager
 *     tags:
 *       - Unit
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             LAAGER_CODE:
 *               required: true
 *               type: string
 *               default: null
 *               description: código do dispositivo Laager
 *             FILTER_BY_HISTORY_DATE:
 *               required: true
 *               type: string
 *               default: null
 *               description: Se teremos iremos filtrar por data em que ocorreu o consumo
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *                 type: object
 *                 properties:
 *                   history:
 *                     type: array
 *                     items:
 *                        type: object
 *                        properties:
 *                          date:
 *                            type: string
 *                            description: data do consumo
 *                          usage:
 *                            type: number
 *                            description: consumo do dia
 *                          reading:
 *                            type: number
 *                            description: leitura do dia
 *                          history:
 *                            type: array
 *                            items:
 *                              type: object
 *                              properties:
 *                                time:
 *                                  type: string
 *                                  description: horário do consumo
 *                                reading:
 *                                  type: number
 *                                  description: consumo do horário
 *                                usage:
 *                                  type: number
 *                                  description: leitura do horário
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getLaagerHistoryList = async (reqParams: httpRouter.ApiParams['/laager/get-history-list'], session: SessionData) => {
  if (!reqParams.LAAGER_CODE) throw Error('Invalid parameters! Missing LAAGER_CODE').HttpStatus(400);
  if (!reqParams.FILTER_BY_HISTORY_DATE) throw Error('Invalid parameters! Missing FILTER_BY_HISTORY_DATE').HttpStatus(400);

  const info = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.LAAGER_CODE });

  if (!info) { throw Error('Could not find meter information').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, info.CLIENT_ID, info.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const laagerList = await sqldb.LAAGER_DAILY_HISTORY_USAGE.getLaagerHistoryList({ LAAGER_CODE: reqParams.LAAGER_CODE, FILTER_BY_HISTORY_DATE: reqParams.FILTER_BY_HISTORY_DATE})

  let objectResponse = {
    date: '',
    usage: 0,
    reading: 0,
    readings_per_day:[]
  } as {
    date: string,
    usage: number,
    reading: number,
    readings_per_day: {
      time: string,
      reading: number,
      usage: number,
    }[]
  };

  if (laagerList?.length > 0) {
    const usage = laagerList.reduce((acc, cur) => { return acc + cur.USAGE_AT_READING_TIME }, 0); 
    const reading = laagerList[laagerList.length - 1].READING;
    const date = new Date(laagerList[0].HISTORY_DATE).toISOString().substring(0, 10);
    
    objectResponse = {
      date: date,
      usage: usage,
      reading: reading,
      readings_per_day: laagerList.map((laager) => ({
          time: laager.READING_TIME,
          reading: laager.READING,
          usage: laager.USAGE_AT_READING_TIME,
      }))
    }
  }
  
  return { history: [objectResponse] }; 
}

httpRouter.privateRoutes['/laager/get-history-list'] = getLaagerHistoryList;

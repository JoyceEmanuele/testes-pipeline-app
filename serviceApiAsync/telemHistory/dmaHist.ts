import axios, { AxiosError } from 'axios';
import sqldb from '../../srcCommon/db'
import * as dielServices from '../../srcCommon/dielServices'
import { getDatesOfLastFourDaysOfWeek, getDaysList2_YMD } from '../../srcCommon/helpers/dates';
import { getLaagerDayUsage } from './laagerHist';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS';
import { IWatersConsumption } from '../../srcCommon/db/sql/CURRENT_WATERS_CONSUMPTION';
import { API_Internal } from '../api-internal';
import * as httpRouter from '../apiServer/httpRouter'
import { getAllowedUnitsView, getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { calculateLaagerUsageHistoryByDay } from '../../srcCommon/extServices/laagerApi';
import { getDmaTotalDayUsageHistory } from '../../srcCommon/helpers/dmaData';
import configfile from '../configfile';
import { SessionData } from '../../srcCommon/types';
import * as moment from 'moment-timezone';
import {   getWaterConsumption, getWaterForecast, handleDataHistory, verifyEmptyWaterConsumptionHist, WaterConsumption } from '../../srcCommon/helpers/waterData';
import { logger } from '../../srcCommon/helpers/logger';

interface IWaterResponse {
  information_date: string;
  usage: number;
  devId: string;
  estimatedUsage?: boolean;
}
interface HistoryDma {
  ID: number;
  DMA_ID: string;
  START_DATE: string;
  END_DATE: string;
  UNIT_ID: number;
}
interface HistoryLaager {
  ID: number;
  LAAGER_ID: string;
  START_DATE: string;
  END_DATE: string;
  UNIT_ID: number;
}

interface GetDatesYearUsageData {
  unit_id: string,
  device_code: string,
  consumption: string,
  compilation_record_date: string,
}

interface IWaterUsage {
  device_code: string,
  consumption: string,
  compilation_record_date: string,
}

let dmasMeanCache: {
  [dmaId: string]: {
    dateConsider: string
    startDate: string
    installationDate: Date
    res: {
      day: string
      averageConsumption: number
      consideredDays: number
    }[]
  }
} = {};

export const getDmaDayUsage: API_Internal['/diel-internal/api-async/getDmaDayUsage'] = async (reqParams) => {
  const { dmaId, dayYMD, unitIdLaager } = reqParams;
  let dmaIds = [] as { 
    ID: number,
    DMA_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  let laagerIds = [] as { 
    ID: number,
    LAAGER_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];

  let devId = dmaId;

  const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: dmaId });
  if (!dmaInf) throw Error('DMA não encontrado').HttpStatus(400);

  if (!dmaInf.HYDROMETER_MODEL) throw Error('Modelo do hidrômetro não cadastrado.');

  if(dmaInf.UNIT_ID) {
    dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: dayYMD, dateEnd: dayYMD })
    laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: dayYMD, dateEnd: dayYMD })
    // Verificando se o Dispositivo no dia filtrado é DMA ou medidor Laager
    if (laagerIds.length && laagerIds[laagerIds.length -1].LAAGER_ID) {
      return getLaagerDayUsage({ UN_LAAGER: laagerIds[laagerIds.length -1].LAAGER_ID, START_DATE: dayYMD, END_DATE: dayYMD });
    } else if(dmaIds.length && dmaIds[dmaIds.length -1].DMA_ID){
      devId = dmaIds[dmaIds.length -1].DMA_ID;
    }
    // Se houver mais de um dispositivo para o mesmo dia (dia que houve troca de dispositivo), considerar apenas o mais recente para o dia.

  }

  const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: reqParams.motivo, dmaId: devId, day: dayYMD, unitId: unitIdLaager || dmaInf.UNIT_ID });

  let data = compiledData && compiledData["TelemetryList"] ? compiledData?.TelemetryList : [];

  const litersPerPulse = Number(dmaInf.HYDROMETER_MODEL.substring(
    dmaInf.HYDROMETER_MODEL.indexOf("(") + 1, 
    dmaInf.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);

  if(!litersPerPulse) throw Error("Não foi encontrado a quantidade de litros por pulso");

  const readings_per_day = [];
  let totalUsage = 0;
    
  for(const telemetry of data){
    totalUsage += (telemetry.pulses*litersPerPulse);
    readings_per_day.push({ time: telemetry.time, usage: telemetry.pulses*litersPerPulse });
  }
  return {
    "period_usage": totalUsage,
    "history": [{
      "information_date": dayYMD,
      "usage": totalUsage,
      "readings_per_day": readings_per_day,
      "devId": devId
    }]
  };
};

export const getDmaMeanHistory: API_Internal['/diel-internal/api-async/getDmaMeanHistory'] = async (reqParams) => {
  const { dmaId, userId } = reqParams;
  const info = await sqldb.DMAS_DEVICES.getDevExtraInfo({ DEVICE_CODE: dmaId });
  if (!info) { throw Error('Could not find DMA information').HttpStatus(400) }
  
  try {
    const timezoneInfo = await getTimezoneByUnit({ UNIT_ID: info.UNIT_ID });

    let timezoneOffset = -3;
    if (timezoneInfo != null) {
      timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
    }

    const storedData = await sqldb.CURRENT_DMAS_CONSUMPTION.getReport({DEVICE_CODE: dmaId, UNIT_ID: info.UNIT_ID, TIMEZONE_OFFSET: timezoneOffset });
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

    if(!info.HYDROMETER_MODEL) { 
      logger.warn({
        message: 'Hydrometer model from DMA not was informed',
        devId: dmaId,
      });
      
      return [];
    }

    if(!info.INSTALLATION_DATE) {
      logger.warn({
        message: 'Installation date from DMA not was informed',
        devId: dmaId,
      });
      
      return [];
    }

    const installationDate = new Date(info.INSTALLATION_DATE);

    const litersPerPulse = Number(info.HYDROMETER_MODEL.substring(
      info.HYDROMETER_MODEL.indexOf("(") + 1, 
      info.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);

    if(!litersPerPulse) throw Error("Not found the number of liters by pulse");

    let res: {
      day: string
      averageConsumption: number
      consideredDays: number
    }[] = [];

    const dates = getDatesOfLastFourDaysOfWeek();
    const historyInfo = await sqldb.DMAS_HIST.getDmaHist({ DMA_CODE: dmaId, UNIT_ID: info.UNIT_ID});

    const startDateDMA = historyInfo.length ? historyInfo[0].START_DATE : info.INSTALLATION_DATE;

    const dmaMeanHist = dmasMeanCache[dmaId];
    const dateConsider = (new Date()).toISOString().split('T')[0]
    if (dmaMeanHist && dmaMeanHist.dateConsider === dateConsider && dmaMeanHist.installationDate === installationDate && dmaMeanHist.startDate === startDateDMA) {
      res = dmaMeanHist.res;
    }
    else {
      for(const dayOfWeek of dates){
        const currDayLabel = dayOfWeek.day;
        let consideredDays = 0;
        let totalConsumption = 0;
        for(const date of dayOfWeek.dates){
          if((historyInfo.length && date >= new Date(historyInfo[0].START_DATE) && date >= installationDate ) || date >= installationDate){
            const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: reqParams.motivo, dmaId, day: date.toISOString().split('T')[0], unitId: info.UNIT_ID });
    
            if(!compiledData || !compiledData["TelemetryList"]) continue;
    
            let data = compiledData.TelemetryList;
    
            let sum = 0;
            data.forEach((e) => sum += e.pulses);
            sum *= litersPerPulse;
            totalConsumption += sum;
            consideredDays++;
          }
        }
    
        let averageConsumption = null;
    
        if(consideredDays !== 0){
          averageConsumption =  totalConsumption/consideredDays;
        }
    
        res.push({day: currDayLabel, consideredDays, averageConsumption})
        
      }
      dmasMeanCache[dmaId] = {
        dateConsider,
        installationDate,
        startDate: startDateDMA,
        res
      }
    }
    

    const data : IWatersConsumption = {
      METER_ID: dmaId,

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
      
      TIMEZONE_OFFSET: timezoneOffset
    };
    if(data.METER_ID){
      await sqldb.CURRENT_DMAS_CONSUMPTION.w_delete({DEVICE_CODE: data.METER_ID}, userId);  
      const dmaId = await sqldb.DMAS_DEVICES.getDmaIdByCode({DEVICE_CODE: data.METER_ID});
      const currentConsumption = await sqldb.CURRENT_WATERS_CONSUMPTION.w_insert(data, userId);
      await sqldb.CURRENT_DMAS_CONSUMPTION.w_insert({DMA_ID: dmaId.ID, CURRENT_WATERS_CONSUMPTION_ID: currentConsumption.insertId},userId);
    }
    return res;
  } catch (error) {
    logger.error({
      message: `There was an error processing getDmaMeanHistory`,
      err: error,
      stack: (error as Error).stack,
      params: reqParams,
    });

    throw error;
  }
}

httpRouter.privateRoutes['/dma/get-day-usage'] = async function (reqParams, session) {
  const devId = reqParams.dmaId
  if (!devId) throw Error('Invalid parameters! Missing dmaId').HttpStatus(400)

  const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: devId });
  if (!dmaInf) throw Error('DMA não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaDayUsage', { dmaId: devId, dayYMD: reqParams.dayYMD, motivo: `/dma/get-day-usage ${session.user}` });
}

httpRouter.privateRoutes['/dma/get-usage-history'] = async function (reqParams, session) {
  let devId = reqParams.dmaId
  let dmaIds = [] as { 
    ID: number,
    DMA_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  let laagerIds = [] as { 
    ID: number,
    LAAGER_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  if (!devId) throw Error('Invalid parameters! Missing dmaId').HttpStatus(400);
  if (!reqParams.start_date) throw Error('Invalid parameters! Missing start_date').HttpStatus(400);
  if (!reqParams.end_date) throw Error('Invalid parameters! Missing end_date').HttpStatus(400);

  const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: devId });

  if (!dmaInf) throw Error('DMA não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (!dmaInf.HYDROMETER_MODEL) throw Error('Modelo do hidrômetro não cadastrado.');

  if(dmaInf.UNIT_ID) {
    dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: reqParams.start_date, dateEnd: reqParams.end_date })
    laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: reqParams.start_date, dateEnd: reqParams.end_date })
  }

  const litersPerPulse = Number(dmaInf.HYDROMETER_MODEL.substring(
    dmaInf.HYDROMETER_MODEL.indexOf("(") + 1, 
    dmaInf.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);

  if(!litersPerPulse) throw Error("Não foi encontrado a quantidade de litros por pulso");

  const dateList = getDaysList2_YMD(reqParams.start_date, reqParams.end_date);

  let period_usage = 0;
  let history = [] as {
    information_date: string,
    usage: number,
    devId: string
  }[];

  for(const date of dateList){
    
    let historyDevDmas = dmaIds.length ? dmaIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []
    let historyDevLaager = laagerIds.length ? laagerIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []

    if (historyDevDmas.length && historyDevDmas[historyDevDmas.length - 1].DMA_ID){
      //se tem dma no histórico, calculo o consumo
      const dataHistory = await getDmaTotalDayUsageHistory(historyDevDmas[historyDevDmas.length - 1].DMA_ID, date, period_usage, { motivo: `/dma/get-usage-history ${session.user}`}, history, dmaInf.UNIT_ID,);
      if (dataHistory) continue;
      period_usage = dataHistory.period_usage;
      history = dataHistory.history;
    } else if(historyDevLaager.length && historyDevLaager[historyDevLaager.length - 1].LAAGER_ID){
      //se tem disp laager no histórico, calculo o consumo
      const dataHistory = await calculateLaagerUsageHistoryByDay(historyDevLaager[historyDevLaager.length - 1].LAAGER_ID, date, period_usage, history);
      period_usage = dataHistory.period_usage;
      history = dataHistory.history;
    } else {
      // se não tem histórico de associação, calcula o do dispositivo atual
      const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `/dma/get-usage-history ${session.user}`, dmaId: devId, day: date, unitId: dmaInf.UNIT_ID });

      let data = compiledData && compiledData["TelemetryList"] ? compiledData?.TelemetryList : [];

      let sum = 0;
      data.forEach((e) => {
        sum += e.pulses
      });
      sum *= litersPerPulse;
      period_usage += sum;
      history.push({"information_date": date, "usage": sum, "devId": devId});
    }
  }

  const startDate = new Date(reqParams.start_date);
  const currentDate = new Date();
  const endDate = new Date(reqParams.end_date);

  const diffInTime = Math.min(currentDate.getTime(), endDate.getTime()) - startDate.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
  const daily_average = period_usage/diffInDays;

  let diffInTimeToEnd = endDate.getTime() - currentDate.getTime();
  diffInTimeToEnd = (diffInTimeToEnd < 0 ? 0 : diffInTimeToEnd); 
  const diffInDaysToEnd = Math.ceil(diffInTimeToEnd / (1000 * 3600 * 24));
  const predicted = period_usage + (diffInDaysToEnd * daily_average);

  return {
    "daily_average": daily_average,
    "period_usage": period_usage,
    "predicted": predicted,
    "history": history
  };
}

/**
 * @swagger
 * /dma/get-consumption-history:
 *   post:
 *     summary: Histórico de consumo de água dispositivos DMA
 *     description: Retorna o histórico de consumo de água no período seleiconado
 *     tags:
 *       - DmaHist
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
 *             DEVICE_CODE:
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
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDmaConsumptionHistory = async (reqParams: httpRouter.ApiParams['/dma/get-consumption-history'], session: SessionData) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties. Missing DEVICE_CODE').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);

  const dmaInf = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: reqParams.DEVICE_CODE });
  if (!dmaInf) throw Error('DMA device not found.').HttpStatus(400);

  const litersPerPulse = Number(dmaInf.HYDROMETER_MODEL.substring(
    dmaInf.HYDROMETER_MODEL.indexOf("(") + 1, 
    dmaInf.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);

  if(!litersPerPulse) throw Error("Not found the number of liters by pulse");

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

  if (!dmaInf.UNIT_ID) return result;
  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const {
    dataWithActualDay,
    isBeforeThanActualDate,
    endDateVerified,
    hourGraphic,
  } = await getWaterConsumption({ START_DATE: reqParams.START_DATE, END_DATE: reqParams.END_DATE, LAST_START_DATE: reqParams.LAST_START_DATE, LAST_END_DATE: reqParams.LAST_END_DATE, UNIT_ID: dmaInf.UNIT_ID, result, yearGraphic: reqParams.YEAR_GRAPHIC });

  if (!reqParams.YEAR_GRAPHIC && (dataWithActualDay || !isBeforeThanActualDate)) {
    const day = dataWithActualDay ? moment(endDateVerified).add(1, 'day').format('YYYY-MM-DD') : reqParams.END_DATE;
    const numDays = moment(day).diff(moment(reqParams.START_DATE), 'days') + 1;
    const { history, daily_average, period_usage } = await getDmaConsumptionHistoryInActualDay(result.history, { day, device_code: dmaInf.DMA_ID, hourGraphic, litersPerPulse, unitId: dmaInf.UNIT_ID, userId: session.user},{ daily_average: result.daily_average, period_usage: result.period_usage, period_usage_last: result.period_usage_last, num_days: numDays })

    result.daily_average = daily_average;
    result.period_usage = period_usage;
    result.history = history;
  }

  // preencher dias e horas futuras com vazio com o atual Device
  if (hourGraphic) {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 1, reqParams.DEVICE_CODE, reqParams.START_DATE, reqParams.END_DATE, false);
  } 
  else if (reqParams.YEAR_GRAPHIC) {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 1, reqParams.DEVICE_CODE, reqParams.START_DATE, reqParams.END_DATE, true);
  } 
  else {
    result.history = verifyEmptyWaterConsumptionHist(result.history, 24, reqParams.DEVICE_CODE,  reqParams.START_DATE, reqParams.END_DATE, false);
  }

  result.history =  handleDataHistory(result.history)

  return result;
}

httpRouter.privateRoutes['/dma/get-consumption-history'] = getDmaConsumptionHistory;

export const getDmaConsumptionHistoryInActualDay = async (
  history: WaterConsumption[],
  processInformation: { day: string, litersPerPulse: number, device_code: string, userId: string, unitId: number, hourGraphic: boolean },
  periodInfoAux: { daily_average: number, period_usage: number, period_usage_last:number, num_days?: number }) => {
  const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `/dma/get-usage-history ${processInformation.userId}`, dmaId: processInformation.device_code, day: processInformation.day, unitId: processInformation.unitId });

  let data = compiledData && compiledData["TelemetryList"] ? compiledData?.TelemetryList : [];

  const periodInfo: {
    daily_average: number,
    period_usage: number,
    history: WaterConsumption[],
  } = {
    daily_average: Number(periodInfoAux.daily_average),
    period_usage: Number(periodInfoAux.period_usage),
    history,
  }

  if (!data.length) { return periodInfo }

  if (processInformation.hourGraphic) {
    for(const telemetry of data){
      const totalUsage = telemetry.pulses * processInformation.litersPerPulse;
      periodInfo.history.push({ information_date: moment(`${processInformation.day} ${telemetry.time}`, 'YYYY-MM-DD HH:mm').format("YYYY-MM-DDTHH:mm:ss"), usage: totalUsage, device_code: processInformation.device_code, month: 0, year: 0 });
      periodInfo.period_usage += totalUsage;
    }
  } else {
    let sum = 0;
    data.forEach((e) => {
      sum += e.pulses
    });
    sum *= processInformation.litersPerPulse;
    periodInfo.history.push({
      information_date: moment(processInformation.day).startOf('day').format("YYYY-MM-DDTHH:mm:ss"), 
      usage: sum, 
      device_code: processInformation.device_code,
      month: 0,
      year: 0
    });

    periodInfo.period_usage += sum;
  }

  if (periodInfoAux.num_days) {
    periodInfo.daily_average = periodInfo.period_usage / periodInfoAux.num_days;
  }

  return periodInfo;
}
// predicted: consumo total + (quantidade de dias que faltam para completar o período selecionado * media do consumo diario)

httpRouter.privateRoutes['/dma/get-last-reading-date'] = async function (reqParams, session) {
  const devId = reqParams.dmaId
  if (!devId) throw Error('Invalid parameters! Missing dmaId').HttpStatus(400);

  const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: devId });
  if (!dmaInf) throw Error('DMA não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const currDate = new Date().toISOString().split('T')[0];
  const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `/dma/get-last-reading-date ${session.user}`, dmaId: devId, day: currDate, unitId: dmaInf.UNIT_ID });

  if(compiledData && compiledData.TelemetryList) {
    let dateTime = compiledData.timeOfTheLastTelemetry;
    if(dateTime === '') return {"date": null};
    return {"date": dateTime}
  }

  return  {"date": null};
}

httpRouter.privateRoutes['/dma/get-dma-mean-history'] = async function (reqParams, session) {
  if (!reqParams.dmaId) throw Error('Invalid parameters! Missing DMA_ID').HttpStatus(400)

  const info = await sqldb.DMAS_DEVICES.getDevExtraInfo({ DEVICE_CODE: reqParams.dmaId });
  if (!info) { throw Error('Could not find DMA information').HttpStatus(400) }
  if (!info.UNIT_ID) { throw Error('Could not find UNIT information').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, info.CLIENT_ID, info.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDmaMeanHistory', { dmaId: reqParams.dmaId, userId: session.user, motivo: `/dma/get-dma-mean-history ${session.user}` });
}

/**
 * @swagger
 * /dma/get-forecast-usage:
 *   post:
 *     summary: Previsão do consumo de água de dispositivos DMA
 *     description: Retorna a previsão do consumo de água pra cada dia da semana
 *     tags:
 *       - DmaHist
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
 *             DEVICE_CODE:
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
export const getDmaForecastUsage = async (reqParams: httpRouter.ApiParams['/dma/get-forecast-usage'], session: SessionData) => {
  if (!reqParams.DEVICE_CODE) throw Error('Invalid properties! Missing DEVICE_CODE').HttpStatus(400)
  const dmaInfo = await sqldb.DMAS_DEVICES.getBasicInfo(reqParams);

  if (!dmaInfo) { throw Error('Could not find DMA information').HttpStatus(400) }
  if (!dmaInfo.UNIT_ID) { throw Error('Could not find UNIT information').HttpStatus(400) }
  if(!dmaInfo.HYDROMETER_MODEL) throw Error('Hydrometer model from DMA not was informed').HttpStatus(400);
  if(!dmaInfo.INSTALLATION_DATE) throw Error('Installation date from DMA not was informed').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, dmaInfo.CLIENT_ID, dmaInfo.UNIT_ID);
  
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const forecastUsage = await getWaterForecast(dmaInfo.UNIT_ID);

  return forecastUsage;
};

httpRouter.privateRoutes['/dma/get-forecast-usage'] = getDmaForecastUsage;

async function getInfo(reqParams: httpRouter.ApiParams['/dma/get-month-usage'], info: httpRouter.ApiResps['/dma/get-month-usage']['info'], unitIds: number[], startDate: string, endDate: string) {
  const watersInfo = await sqldb.WATERS.getList({
    clientIds: reqParams.client_ids,
    stateIds: reqParams.state_ids,
    cityIds: reqParams.city_ids,
    unitIds: reqParams.unit_ids,
  });

  const response = await axios.post(`${configfile.computedDataServerUrl}water/get-year-usage`, {unitIds, startDate, endDate})
  const listDmasTotalUsage: IWaterUsage[] = response.data

  if (watersInfo && watersInfo.length > 0) {
    for (const water of watersInfo) {
      const usageInfo = listDmasTotalUsage.filter((e) => e.device_code === water.DEVICE_CODE).map((e) => Number(e.consumption)).reduce((acc, valorAtual) => acc + valorAtual, 0);
      const consumptionCurrent = usageInfo || null;
      const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: water.UNIT_ID });
      info.push({
        state_name: water.STATE_NAME,
        client_id: water.CLIENT_ID,
        client_name: water.CLIENT_NAME,
        city_name: water.CITY_NAME,
        unit_id: water.UNIT_ID,
        city_id: water.CITY_ID,
        state_id: water.STATE_ID,
        unit_name: water.UNIT_NAME,
        period_usage: consumptionCurrent,
        device_code: water.DEVICE_CODE,
        usage_people: (unitInfo.AMOUNT_PEOPLE && consumptionCurrent && (consumptionCurrent / unitInfo.AMOUNT_PEOPLE)) || null,
        usage_area: (unitInfo.CONSTRUCTED_AREA && consumptionCurrent && (consumptionCurrent / unitInfo.CONSTRUCTED_AREA)) || null
      });
    }
  }
}

httpRouter.privateRoutes['/dma/get-dates-usage'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.client_ids) { reqParams.client_ids = allowedClients; }
    reqParams.client_ids = reqParams.client_ids.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unit_ids) { reqParams.unit_ids = allowedUnits; }
    if (allowedUnits) reqParams.unit_ids = reqParams.unit_ids.filter(x => allowedUnits.includes(x));
  }

  const unitParams = {
    clientIds: reqParams.client_ids,
    unitIds: reqParams.unit_ids,
    cityIds: reqParams.city_ids,
    stateIds: reqParams.state_ids,
  }

  const unitsInfo = await sqldb.CLUNITS.getUnitsMainService(unitParams);
  const unitIds = unitsInfo.map((unit) => unit.UNIT_ID);

  let times = [] as httpRouter.ApiResps['/dma/get-dates-usage']['times'];
  const timeType = reqParams.period;
  
  if( timeType === 'year') {
    try {
      const startDate = '2019-01-01';
      const endDate = new Date().toISOString().substring(0, 10);
        // Chama os anos que tem dados no computed-data-service
      const response = await axios.post(`${configfile.computedDataServerUrl}water/get-dates-year-usage`, {unitIds, startDate, endDate});
      const listInfoUsage: GetDatesYearUsageData[] = response.data
      const listYearsUsage = listInfoUsage.map((e) => e.compilation_record_date.substring(0, 4));
      getYearsNames(times, listYearsUsage)
    } catch (err) {
      throw Error(`Erro no serviço do CDS, ${(err as AxiosError).message}`).HttpStatus(400);
    }
  }
  return {times}
}


async function getYearsNames(times: httpRouter.ApiResps['/dma/get-dates-usage']['times'], listYearsUsage: string[] ) {
  const currentYear = new Date().getFullYear();
  const initialYear = 2019;
  for (let year = initialYear; year <= currentYear; year++) {
    if(listYearsUsage.includes(year.toString())){
      times.push({name: year.toString(), hasUsage: true});
    }
    else times.push({name: year.toString(), hasUsage: false});
  }
}


httpRouter.privateRoutes['/dma/get-month-usage'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.client_ids) { reqParams.client_ids = allowedClients; }
    reqParams.client_ids = reqParams.client_ids.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unit_ids) { reqParams.unit_ids = allowedUnits; }
    if (allowedUnits) reqParams.unit_ids = reqParams.unit_ids.filter(x => allowedUnits.includes(x));
  }

  let info = [] as httpRouter.ApiResps['/dma/get-month-usage']['info'];
  let history = [] as httpRouter.ApiResps['/dma/get-month-usage']['history'];

  const unitParams = {
    clientIds: reqParams.client_ids,
    unitIds: reqParams.unit_ids,
    cityIds: reqParams.city_ids,
    stateIds: reqParams.state_ids,
  }

  const unitsInfo = await sqldb.CLUNITS.getUnitsMainService(unitParams)
  const unitIds = unitsInfo.map((unit) => unit.UNIT_ID)
  const startDate = reqParams.startDate;
  const endDate = reqParams.endDate;
  await getInfo(reqParams, info, unitIds, startDate, endDate);
  const last13Months = getLast13Months(endDate);

  const response = await axios.post(`${configfile.computedDataServerUrl}water/get-month-usage`, {unitIds, startDate, endDate})
  const listDmasLast13Months: {
    device_code: string,
    consumption: string,
    compilation_record_date: string,
  }[] = response.data
  for (const date of last13Months){
    const listDmasOfMonth = listDmasLast13Months.filter((e) => {
      const currentDate = e.compilation_record_date.split("-");
      const ano = currentDate[0]; 
      const mes = currentDate[1]; 
      return Number(mes) === date.month && Number(ano) === date.year
    })
    
    const monthTotalUsage = listDmasOfMonth.map((e) => Number(e.consumption) ).reduce((acc, valorAtual) => acc + valorAtual, 0);
    const deviceCodesSet = new Set();
    listDmasOfMonth.forEach(obj => {
        deviceCodesSet.add(obj.device_code);
    });
    const numberDevices = deviceCodesSet.size;

    history.push({
      usage: monthTotalUsage,
      number_devices:  numberDevices,
      month: date.month - 1,
      year: date.year,
    })
  }

  return {info, history}
}

export async function getWaterMonthHistoryUsage(){
  const waterUnits = await sqldb.WATERS.getList({});
  const waterDevices = waterUnits.map((e) => e.DEVICE_CODE); 
  const datFinD = new Date();
  datFinD.setDate(datFinD.getDate()-1);

  // get month history usage by unit
  for (let waterDevice of waterDevices){
    const waterId = await sqldb.WATERS.getWatersIdByDevice({CODE: waterDevice})
    // get the last history's date inserted
    const lastDateString = await sqldb.WATERS_MONTH_HISTORY_USAGE.getLastData({ WATER_ID: waterId.ID });
    const lastDate = new Date((lastDateString != null ? lastDateString.RECORD_DATE : '2000-01-01') + 'T00:00:00Z');
    const nowDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateFormatted = nowDate.toISOString().split('T')[0];

    if (lastDateString === null || datFinD >= nowDate || lastDate <= datFinD){     
      const data = await getWaterUsage(waterDevice, dateFormatted, dateFormatted);      
      if (data) await insertWaterHistoryUsage(data.history, waterId.ID);
    }
  }
}

export const insertWaterHistoryUsage = async (history: IWaterResponse[], waterId: number) => {
  for(const hist of history) {
    const {historyMonth, historyYear} = getHistoryUsage(hist.information_date)
      if(hist.usage > 0){
        const hasHistoryUsage = await sqldb.WATERS_MONTH_HISTORY_USAGE.getRecordInfo({
          WATER_ID: waterId, 
          HISTORY_MONTH: historyMonth,
          HISTORY_YEAR: historyYear
        });

        if (!hasHistoryUsage) {
          await sqldb.WATERS_MONTH_HISTORY_USAGE.w_insert({
            WATER_ID: waterId,
            HISTORY_MONTH: historyMonth,
            HISTORY_YEAR: historyYear,
            MONTH_USAGE: hist.usage,
            ESTIMATED_USAGE: hist.estimatedUsage,
            RECORD_DATE: hist.information_date,
            LAST_USAGE: hist.usage
          });
        }
        else{
          await sqldb.WATERS_MONTH_HISTORY_USAGE.w_updateInfo({
            WATER_ID: waterId,
            HISTORY_MONTH: historyMonth,
            HISTORY_YEAR: historyYear,
            MONTH_USAGE: hasHistoryUsage.MONTH_USAGE + hist.usage,
            ESTIMATED_USAGE: hist.estimatedUsage,
            RECORD_DATE: hist.information_date,
            LAST_USAGE: hist.usage
          })
        }
      }       
  }
};

export const getWaterUsage = async (waterDevice: string, dateStart: string, dateEnd: string) => {
  let dmaIds = [] as { 
    ID: number,
    DMA_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  let laagerIds = [] as { 
    ID: number,
    LAAGER_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];

  const waterInfo = await sqldb.WATERS.getWaterInfoByCode({ DEVICE_CODE: waterDevice });

  if (!waterInfo.HYDROMETER_MODEL) return null;

  if(waterInfo.UNIT_ID) {
    dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: waterInfo.UNIT_ID, dateStart: dateStart, dateEnd: dateEnd })
    laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: waterInfo.UNIT_ID, dateStart: dateStart, dateEnd: dateEnd })
  }

  const litersPerPulse = Number(waterInfo.HYDROMETER_MODEL.substring(
    waterInfo.HYDROMETER_MODEL.indexOf("(") + 1, 
    waterInfo.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);

  if (!litersPerPulse) return null;

  const dateList = getDaysList2_YMD(dateStart, dateEnd);

  let period_usage = 0;
  let history = [] as {
    information_date: string,
    usage: number,
    devId: string
  }[];

  for(const date of dateList){
    
    let historyDevDmas = getHistoryDevDmas(dmaIds, date) 
    let historyDevLaager = getHistoryDevLaager(laagerIds, date) 

    if (historyDevDmas.length && historyDevDmas[historyDevDmas.length - 1].DMA_ID && historyDevDmas){
      //se tem dma no histórico, calculo o consumo
      const dataHistory = await getDmaTotalDayUsageHistory(historyDevDmas[historyDevDmas.length - 1].DMA_ID, date, period_usage, { motivo: `/dma/get-usage-history devmaster`}, history, waterInfo.UNIT_ID,);
      if (dataHistory) continue;
      period_usage = dataHistory.period_usage;
      history = dataHistory.history;
    } 
    else if(historyDevLaager.length && historyDevLaager[historyDevLaager.length - 1].LAAGER_ID){
      //se tem disp laager no histórico, calculo o consumo
      const dataHistory = await calculateLaagerUsageHistoryByDay(historyDevLaager[historyDevLaager.length - 1].LAAGER_ID, date, period_usage, history);
      period_usage = dataHistory.period_usage;
      history = dataHistory.history;
    } 
    else if (waterDevice.startsWith('DMA')){
      // se não tem histórico de associação, calcula o do dispositivo atual dma
      const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `/dma/get-usage-history devmaster`, dmaId: waterDevice, day: date, unitId: waterInfo.UNIT_ID });

      let data = compiledData && compiledData?.["TelemetryList"] ? compiledData?.TelemetryList : [];

      let sum = 0;
      data.forEach((e) => {
        sum += e.pulses
      });
      sum *= litersPerPulse;
      period_usage += sum;
      history.push({"information_date": date, "usage": sum, "devId": waterDevice});
    }
    else{
      // se não tem histórico de associação, calcula o do dispositivo atual laager
      const dataHistory = await calculateLaagerUsageHistoryByDay(waterDevice, date, period_usage, history);
      history = dataHistory.history;
      period_usage = dataHistory.period_usage;
    }
  }

  const startDate = new Date(dateStart);
  const currentDate = new Date();
  const endDate = new Date(dateEnd);

  const diffInTime = Math.min(currentDate.getTime(), endDate.getTime()) - startDate.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
  const daily_average = period_usage/diffInDays;

  let diffInTimeToEnd = endDate.getTime() - currentDate.getTime();
  diffInTimeToEnd = (diffInTimeToEnd < 0 ? 0 : diffInTimeToEnd); 
  const diffInDaysToEnd = Math.ceil(diffInTimeToEnd / (1000 * 3600 * 24));
  const predicted = period_usage + (diffInDaysToEnd * daily_average);

  return {
    "daily_average": daily_average,
    "period_usage": period_usage,
    "predicted": predicted,
    "history": history
  };
}

function getHistoryDevDmas(dmaIds: HistoryDma[], date: string) {
  return dmaIds.length ? dmaIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []  
}

function getHistoryDevLaager(laagerIds: HistoryLaager[], date: string) {
  return laagerIds.length ? laagerIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []  
}

function getHistoryUsage(date: string) {
  const dateArray = date.split('-');
  const historyYear = parseInt(dateArray[0], 10); 
  const historyMonth = parseInt(dateArray[1], 10);

  return {historyMonth, historyYear}
}

// ROTINA POPULAR TABELA WATERS_MONTH_HISTORY_USAGE

export async function getWaterTotalHistoryUsage(){
  const hasInclude = await sqldb.WATERS_MONTH_HISTORY_USAGE.getList({});
  if(hasInclude && hasInclude.length){ 
    // OK Tabela já foi populada
  }
  else {
    const waterUnits = await sqldb.WATERS.getList({});
    const waterDevices = waterUnits.map((e) => e.DEVICE_CODE); 
  
    const datFinD = new Date();
    datFinD.setDate(datFinD.getDate()-1);
  
    const nowDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const nowDateFormatted = nowDate.toISOString().split('T')[0];
    const lastYearDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const lastYearDateFormatted = lastYearDate.toISOString().split('T')[0];
  
    // get total history usage by unit
    for (let waterDevice of waterDevices){
      const waterId = await sqldb.WATERS.getWatersIdByDevice({CODE: waterDevice})      
      const data = await getWaterUsage(waterDevice, lastYearDateFormatted, nowDateFormatted);      
      if (data) await insertWaterHistoryUsage(data.history, waterId.ID);
    }
  }
}

function getLast13Months(dateCurrent: string): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const date = new Date(dateCurrent);
  for (let i = 12; i >= 0; i--) {
    const currentDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
    result.push({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 });
  }
  return result;
}

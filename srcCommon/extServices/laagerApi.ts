import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import configfile from '../../configfile';
import { logger } from '../../srcCommon/helpers/logger';
import sqldb from '../../srcCommon/db';
import { DmaIds, MeterSimpleInf, getDmaTotalDayUsageHistory } from '../../srcCommon/helpers/dmaData'
import { SessionData as sessionAux} from '../../srcCommon/types';
import { getDaysList2_YMD } from '../../srcCommon/helpers/dates'

interface SessionData {
  token: string
}

interface IReadingsPerDay {
  time: string,
  reading:number,
  usage:number
}

interface ILaagerResponse {
  date: string;
  reading: number;
  usage: number;
  readings_per_day: IReadingsPerDay[];
  estimatedUsage?: boolean;
}
export interface LaagerIds {
  ID: number,
  LAAGER_ID: string,
  START_DATE: string,
  END_DATE: string,
  UNIT_ID: number,
}

function isLaagerDisabled() {
  return (!configfile.isProductionServer) && (!configfile.laagerApi);
}

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações do Laager').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_LAAGER_HTTP' });
  }
  throw err;
}

async function laagerApiGet (session: SessionData, route: string) {
  if (!session.token) { throw Error('No access to Laager API').HttpStatus(400).DebugInfo(session) }
  const config: AxiosRequestConfig = {
    method: 'get',
    baseURL: configfile.laagerApi.url,
    url: route,
    headers: session && session.token && { 'Authorization': `Bearer ${session.token}`, 'Accept': 'application/json' },
  };
  return axios(config)
  .catch(checkAxiosError);
}

async function laargerApiPostPublic (route: string, body: any, outToken?: SessionData) {
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: configfile.laagerApi.url,
    url: route,
    data: body,
  };
  return axios(config).then((r) => {
    if (outToken) {
      outToken.token = r.data.access_token
    }
    return r
  })
  .catch(checkAxiosError);
}


const apiLaarger = {
  ['POST /login']: (body: { grant_type: string, client_id: string, client_secret: string, username: string, password: string }, session: SessionData) => laargerApiPostPublic('/oauth/token', body, session).then(response => {
    return response.data as {
      access_token: string,
      token_type: string,
      expires_in: number,
      refresh_token: string,
      created_at: string,
    }
  }),

  ['GET /leitura/:meter_type/:group_id']: async function (meter_type: string, group_id: number) {
      if (isLaagerDisabled()) {
        logger.warn('Laager access is disabled');
        return [];
      }
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/leitura/${meter_type}/${group_id}`)
      return response.data as {
          customer_id:string,
          address:string,
          rf_device_id:number,
          meter_serial_number:string,
          seal_number:string,
          batery_state:string,
          valve_status:string,
          reading:number,
          reading_date:string,
          latitude:string,
          longitude:string,
      }[]
    },

  ['GET /leitura/:meter_type/:group_id/:date']: async function (meter_type: string, group_id: number, date: string) {
      if (isLaagerDisabled()) {
        logger.warn('Laager access is disabled');
        return [];
      }
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/leitura/${meter_type}/${group_id}/${date}`)
      return response.data as {
          customer_id:string,
          address:string,
          rf_device_id:number,
          meter_serial_number:string,
          seal_number:string,
          batery_state:string,
          valve_status:string,
          reading:number,
          reading_date:string,
          latitude:string,
          longitude:string,
      }[]
    },

    ['GET /consumption/:unit_id']: async function (unit_id: string) {
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/consumption/${unit_id}`)
      return response.data as {
          customer_id:string,
          resume:{
            last_statement: string,
            next_statement: string,
            days_count: number,
            current_usage: number,
            current_month_usage_avg: number,
            last_month_usage_avg: number
          },
          last_statements:{
            months:[],
            usage:[]
          },
          daily_usage: {
            days:[],
            usage:[]
          }
      }
    },

    ['GET /consumption/meter_details/:unit_id']: async function (unit_id: string) {
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/consumption/meter_details/${unit_id}`)
      return response.data as {
          rgi: string,
          name: string,
          group_id: number,
          group_name: string,
          bussiness_unit_id: number,
          bussiness_unit_name: string,
          address: string,
          latitude: string,
          longitude: string,
          meter_serial_number: string,
          module_rf_id: number,
          current_reading: number,
          current_reading_flow: number,
          current_reading_at: string,
          history: {
            date: string,
            reading: number,
            usage: number,
            readings_per_day: IReadingsPerDay[],
            estimatedUsage?: boolean
          }[]
      }
    },

    ['GET /leitura/streaming.json:data:pagina:limite']: async function (data: string, pagina: number, limite: number) {
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/leitura/streaming.json${data}${pagina}${limite}`)
      return response.data as {
          costumer_id: string,
          valve_status: string,
          reading_date: string,
          bussiness_unit_id: number,
          bussiness_unit_name: string,
          reverse_flow: number
      }
    },

    ['GET /alarmes/historico.json:data:pagina:limite']: async function (data: string, pagina: number, limite: number) {
      if (isLaagerDisabled()) {
        logger.warn('Laager access is disabled');
        return [];
      }
      const session: SessionData = { token: null };
      await apiLaarger['POST /login']({ grant_type: configfile.laagerApi.grant_type,client_id: configfile.laagerApi.client_id, client_secret: configfile.laagerApi.client_secret, username: configfile.laagerApi.username, password: configfile.laagerApi.password}, session);
      const response = await laagerApiGet(session, `/api/v1/alarmes/historico.json?data=${data}&pagina=${pagina}&limite=${limite}`)
      return response.data as {
        customer_id: string,
        module_id: number,
        code: string,
        description: string,
        triggered_at: string,
      }[];
    },
}

export { apiLaarger };

export function getCorrectedReading (history: IReadingsPerDay[]){
  for (let i=0; i < history.length; i++){
    const nullList: IReadingsPerDay[] = [];

    if (history[i].usage === null){
      nullList.push(history[i]);
      for (var j=1; j < history.length - i; j++){
        if (history[i + j].usage === null){
          nullList.push(history[i + j])
          continue;
       }
        else if (history[i + j].usage !== null){
          nullList.push(history[i + j])
          nullList.forEach(function(item) {
            item.usage = (history[i+j].usage)/nullList.length
          })   
          break;
        }      
      }
    }    
  }
  return history;
}

export const insertDailyHist = async (history: ILaagerResponse[], unLaager: string) => {
  for(const hist of history) {
    if(hist.reading !== null || (hist.reading === null && hist.usage !== 0)){
      for (const readings of hist.readings_per_day) {
        const readingPersisted = await sqldb.LAAGER_DAILY_HISTORY_USAGE.getRecordInfo({
          LAAGER_CODE: unLaager, 
          HISTORY_DATE: hist.date,
          READING_TIME: readings.time,
        });

        if (readingPersisted == null) {
          await sqldb.LAAGER_DAILY_HISTORY_USAGE.w_insert({
            LAAGER_CODE: unLaager,
            HISTORY_DATE: hist.date,
            READING_TIME: readings.time,
            READING: readings.reading,
            USAGE_AT_READING_TIME: readings.usage,
            ESTIMATED_USAGE: hist.estimatedUsage,
          });
        }
      }
    }
   
  }
};

export const normalizeLaagerConsumption = (history: {
  date: string,
  reading: number,
  usage: number,
  readings_per_day?: any[],
  estimatedUsage?: boolean
  }[] 
  ) => {
  let firstNullIndex = null;
  for(let dayIndex = 0; dayIndex < history.length; dayIndex++){
    history[dayIndex].estimatedUsage = false;
    if(history[dayIndex].reading === null && firstNullIndex === null){
      firstNullIndex = dayIndex;

    }else if(history[dayIndex].reading !== null){
      if(firstNullIndex && firstNullIndex > 0){
        const lastReadingBeforeNull = history[firstNullIndex-1].reading;
        const quantityOfNullDays = dayIndex - firstNullIndex + 1;
        const intervalReading = history[dayIndex].reading - lastReadingBeforeNull;
        const estimatedConsumptionByDay = (intervalReading*1000)/quantityOfNullDays;

        for(let updateDayIndex = firstNullIndex; updateDayIndex <= dayIndex; updateDayIndex++){
          history[updateDayIndex].usage = estimatedConsumptionByDay;
          history[updateDayIndex].readings_per_day = [];
          history[updateDayIndex].estimatedUsage = true;
          const beginHour = 0;
          const endHour = 23;
          const quantityOfHours = endHour - beginHour + 1;

          for(let fakeHour = beginHour; fakeHour <= endHour; fakeHour++){
            history[updateDayIndex].readings_per_day.push({
              time: `${fakeHour < 10 ? `0${fakeHour}` : fakeHour}:30`,
              reading: null, 
              usage: (estimatedConsumptionByDay/quantityOfHours).toFixed(2)
            });
          }
        }
      }

      firstNullIndex = null;
    }
  }
}

export async function calculateLaagerUsageHistoryByDay(LAAGER_ID: string, day: string, periodUsage: number, historyList: { information_date: string, usage: number, devId: string, estimatedUsage?: boolean}[]){
  // get the last history's date inserted
  const lastDateString = await sqldb.LAAGER_HISTORY_USAGE.getLastData({ LAAGER_CODE: LAAGER_ID });
  const lastDate = new Date((lastDateString != null ? lastDateString.RECORD_DATE : '2000-01-01') + 'T00:00:00Z');
  const datFinD = new Date(day + 'T00:00:00Z');

  let period_usage = periodUsage;
  let history = historyList;

  let usage;
  let rowMeterAux = [] as {
    date: string
    reading: number
    usage: number
    readings_per_day?: IReadingsPerDay[]
    estimatedUsage?: boolean
  }[];


  if (day <= new Date().toISOString().split("T")[0] && (lastDateString === null || datFinD >= new Date(Date.now() - 24 * 60 * 60 * 1000) || lastDate <= datFinD)){
    const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1)
    const meter = responseGroup.find((meter) => meter.customer_id === LAAGER_ID);
    if (!meter) throw Error('Medidor de água não encontrado').HttpStatus(400);
    const { rf_device_id } = meter;
    const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());
    normalizeLaagerConsumption(responseMeter.history);
    await insertHistory(LAAGER_ID, responseMeter.history)
    rowMeterAux = responseMeter.history.filter((row) => row.date === day );

  }
  else {
    // else, read from data base (old information already persisted)
    const responseMeterDb = await sqldb.LAAGER_HISTORY_USAGE.getExtraInfo({ LAAGER_CODE: LAAGER_ID, start_date: day, end_date: day });

    for (const row of responseMeterDb){
      rowMeterAux.push({
        date: row.RECORD_DATE,
        reading: row.DAY_READING,
        usage: row.DAY_USAGE,
        readings_per_day: [],
        estimatedUsage: row.ESTIMATED_USAGE,
      });
    }
    normalizeLaagerConsumption(rowMeterAux);
  }
  let historyAux = rowMeterAux.find(row => row.date === day)
  if (historyAux) {
    usage = historyAux.usage ?? 0
  }
  else {
    usage = 0
  }
  period_usage += usage // 'Period usage' equals sum of all usage on range
  history.push({
    information_date: day,
    usage: usage,
    devId: LAAGER_ID,
    estimatedUsage: historyAux ? historyAux.estimatedUsage : false
  })

  return { period_usage: period_usage, history: history}
}

export async function insertHistory (UN_LAAGER: string,
  history: {
  date: string,
  reading: number,
  usage: number,
  estimatedUsage?: boolean
}[]) {
  const lastDataString = await sqldb.LAAGER_HISTORY_USAGE.getLastData({LAAGER_CODE: UN_LAAGER})
  let rowMeterAux
  if (lastDataString != null){
    let lastData = new Date(lastDataString.RECORD_DATE + 'T00:00:00Z')
    rowMeterAux = history.filter(row => lastData <= new Date(row.date + 'T00:00:00Z'))
  }
  else{
    rowMeterAux = history
  }

  for(let valueMeter of rowMeterAux) {
    if(valueMeter.reading !== null || (valueMeter.reading === null && valueMeter.usage !== 0)){
      if ( lastDataString != null && valueMeter.date === lastDataString.RECORD_DATE){
        await sqldb.LAAGER_HISTORY_USAGE.w_updateInfo({
        LAAGER_CODE: UN_LAAGER,
        RECORD_DATE: valueMeter.date,
        DAY_USAGE: valueMeter.usage,
        DAY_READING: valueMeter.reading,
        ESTIMATED_USAGE: valueMeter.estimatedUsage
        })
      }
      else{
        await sqldb.LAAGER_HISTORY_USAGE.w_insert({
        LAAGER_CODE: UN_LAAGER,
        RECORD_DATE: valueMeter.date,
        DAY_USAGE: valueMeter.usage,
        DAY_READING:valueMeter.reading,
        ESTIMATED_USAGE: valueMeter.estimatedUsage
        })
      }
    }
  }
}

export async function calculateAverageUsageHistory(reqParams:{
  unit_id: string;
  start_date: string;
  end_date: string;
}, dmaIds: DmaIds[], laagerIds: LaagerIds[], meterSimpleInf: MeterSimpleInf, unLaager: string, session: sessionAux ) {

  const datFinD = new Date(reqParams.end_date + 'T00:00:00Z');
  // get all dates in the range
  const dateList = getDaysList2_YMD(reqParams.start_date, reqParams.end_date)

  const nowDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let history = [] as {
    information_date: string
    usage: number,
    devId: string,
    estimatedUsage?: boolean,
  }[];

  let dailyAverage;
  let periodUsage = 0;
  let predicted;
  let auxAverage = dateList.length;
  let diffDays = 0;

   // Defines the days to be considered when calculating the average
  // As the date range can be longer than today's date, the days to be considered in the average will not always be the total days in the range.
  if (datFinD > nowDate){
    diffDays = Math.round((datFinD.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    auxAverage -= diffDays
  }

  for (let dateValue of dateList)
  {
    let historyDevDmas = newHistoryDevDmas(dmaIds, dateValue)
    let historyDevLaager = newHistoryDevLaager(laagerIds, dateValue)

    if (historyDevLaager.length && historyDevLaager[historyDevLaager.length - 1].LAAGER_ID) {
      //se tem disp laager no histórico, calculo o consumo
      const dataHistory = await calculateLaagerUsageHistoryByDay(historyDevLaager[historyDevLaager.length - 1].LAAGER_ID, dateValue, periodUsage, history);
      history = dataHistory.history;
      periodUsage = dataHistory.period_usage;
    } else if (historyDevDmas.length && historyDevDmas[historyDevDmas.length - 1].DMA_ID) {
      //se tem dma no histórico, calculo o consumo
      const dataHistory = await getDmaTotalDayUsageHistory(historyDevDmas[historyDevDmas.length - 1].DMA_ID, dateValue, periodUsage, { motivo: `/dma/get-usage-history ${session.user}` }, history, meterSimpleInf.UNIT_ID);
      if (dataHistory) continue;
      history = dataHistory.history;
      periodUsage = dataHistory.period_usage;
    } else{
      // se não tem histórico de associação, calcula o do dispositivo atual
      // get the last history's date inserted
      const dataHistory = await calculateLaagerUsageHistoryByDay(unLaager, dateValue, periodUsage, history);
      history = dataHistory.history;
      periodUsage = dataHistory.period_usage;
    }
  }

  dailyAverage = periodUsage / (auxAverage > 0 ? auxAverage : 1) // Daily Average equals 'Period Usage' by days to be considered
  predicted = periodUsage + (dailyAverage * diffDays) // 'Predicted' equals 'Period Usage' plus 'daily average' times days left in range

  return {dailyAverage, periodUsage, predicted, history}  
}

function newHistoryDevDmas(dmaIds: DmaIds[], dateValue: string) {
  return dmaIds.length ? dmaIds.filter((dev) => new Date(dev.START_DATE) <= new Date(dateValue) && (new Date(dev.END_DATE) >= new Date(dateValue) || dev.END_DATE === null)) : []
}

function newHistoryDevLaager(laagerIds:LaagerIds[], dateValue: string) {
  return laagerIds.length ? laagerIds.filter((dev) => new Date(dev.START_DATE) <= new Date(dateValue) && (new Date(dev.END_DATE) >= new Date(dateValue) || dev.END_DATE === null)) : []
}

import * as moment from 'moment';
import { checkEndDateNoLaterThanYesterdayWater } from './dates';
import configfile from '../../serviceApiAsync/configfile';
import axios from 'axios';

export type WaterConsumption = {
  usage: number
  information_date: string
  device_code: string
  day?: {
    dayDate: string
    dayWeek: string
    dayWeekName: string
  } 
  month: number
  year: number
  estimatedUsage?: boolean;
};

export type WaterConsumptionResponse =  {
  daily_average: number,
  period_usage: number,
  period_usage_last: number,
  history: {
    device_code: string,
    information_date: string,
    usage: number,
    estimatedUsage?: boolean
  }[] 
}

export type WaterForecastConsumption = {
  monday: number,
  tuesday: number,
  wednesday: number,
  thurdsday: number,
  friday: number,
  saturday: number,
  sunday: number,
}

export const verifyEmptyWaterConsumptionHist = (
  history: WaterConsumption[],
  interval: number,
  actualDevice: string,
  startDate: string,
  endDate: string,
  isYear: boolean
) => {
  const initDate = isYear ? moment(startDate).startOf('month').startOf("day") : moment(startDate).startOf("day");
  const finalDate = isYear ? moment(endDate).startOf('month').endOf("day") : moment(endDate).endOf("day");

  const consumptionMap = new Map(
    history.map((history) => [history.information_date, history])
  );
  const filledConsumption: WaterConsumption[] = [];
  let currentDate = initDate.clone();

  while (currentDate.isSameOrBefore(finalDate)) {
    const recordDate = currentDate.format("YYYY-MM-DDTHH:mm:ss");
    if (consumptionMap.has(recordDate)) {
      filledConsumption.push(consumptionMap.get(recordDate));
    } else {
      filledConsumption.push({
        information_date: recordDate,
        usage: 0,
        device_code: actualDevice,
        month: 0,
        year: 0
      });
    }
    isYear ? currentDate.add(interval, "months") : currentDate.add(interval, "hours"); 
  }

  return filledConsumption;
};

export const getWaterConsumption = async (params: {
  START_DATE: string,
  END_DATE: string,
  LAST_START_DATE: string,
  LAST_END_DATE: string,
  UNIT_ID: number,
  result: WaterConsumptionResponse
  yearGraphic: boolean
}) => {
  const hourGraphic = params.START_DATE == params.END_DATE;
  const {endDateVerified, lastEndDateVerified} = checkEndDateNoLaterThanYesterdayWater(params.START_DATE, params.END_DATE, params.LAST_START_DATE, params.LAST_END_DATE);

  const dataWithActualDay = params.END_DATE !== endDateVerified;

  const currentDate = moment();
  const isBeforeThanActualDate = moment(params.START_DATE).startOf('day').isBefore(currentDate.startOf('day'));

  const response = await axios.post(`${configfile.computedDataServerUrl}water/get-usage-history`, {
    start_date: params.START_DATE,
    end_date: endDateVerified,
    last_start_date: params.LAST_START_DATE,
    last_end_date: lastEndDateVerified,
    unit_id: params.UNIT_ID,
    hour_graphic: hourGraphic,
    year_graphic: params.yearGraphic,
  });

  params.result.history = response.data?.consumption_hist ?? [];
  params.result.daily_average = response.data?.consumption_info?.average_consumption ?? 0;
  params.result.period_usage = response.data?.consumption_info?.consumption ?? 0;
  params.result.period_usage_last = response.data?.consumption_info_last?.consumption ?? 0;

  return { dataWithActualDay, isBeforeThanActualDate, endDateVerified, hourGraphic }
}

export const getWaterForecast = async (UNIT_ID: number) => {

  let result: WaterForecastConsumption = null;

  const actualDay = moment().startOf('day');
  const isFirstDayOfMonth = actualDay.isSame(moment().startOf('month'));

  // se o moment for igual ao primeiro dia do mês, pegar a previsão do mês passado
  const forecastDate = isFirstDayOfMonth ? actualDay.subtract(1, 'month') : actualDay.startOf('month');

  const response = await axios.post(`${configfile.computedDataServerUrl}water/get-forecast-usage`, {
    forecast_date: forecastDate.format('YYYY-MM-DD'),
    unit_id: UNIT_ID,
  });

  result = response.data;

  return result;
}

export function handleDataHistory(history: WaterConsumption[]) {
  return history.map(item => {
    const date = new Date(item.information_date);
    const dayDate = date.getDate();
    const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const daysOfWeekName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return {
      ...item,
      hour: date.getHours().toString().padStart(2, "0"),
      month: date.getMonth(),        
      day: {
        dayDate: dayDate < 10 ? `0${dayDate}` : dayDate.toString(), 
        dayWeek: daysOfWeek[date.getDay()],  
        dayWeekName: daysOfWeekName[date.getDay()]  
      },        
      year: date.getFullYear()       
    };
  });
}

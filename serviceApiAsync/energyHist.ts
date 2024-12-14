import axios from 'axios';
import * as httpRouter from './apiServer/httpRouter'
import rusthistApi from '../srcCommon/dielServices/rusthistApi'
import sqldb from '../srcCommon/db'
import { getDrisCfgFormulas, loadDrisCfg } from '../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { adjustUnitsViewFilter, getPermissionsOnUnit } from '../srcCommon/helpers/permissionControl';
import { getTimezoneInfoByDev } from '../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../srcCommon/helpers/timezones';
import { SessionData } from '../srcCommon/types';
import * as dynamoDbHelper from '../srcCommon/db/connectDynamoDb'
import { logger } from '../srcCommon/helpers/logger';
import configfile from './configfile';
import { checkEndDateNoLaterThanYesterday } from '../srcCommon/helpers/dates';
import * as moment from 'moment';
import { ExtraRouteParams } from '../srcCommon/types/backendTypes';
import { getLanguage, t } from '../srcCommon/helpers/i18nextradution';
import { createXlsx } from '../srcCommon/helpers/parseXlsx';

interface EnergyBody {
    energy_device_id: string
    serial: string
    manufacturer: string
    model: string
    start_time: string
    end_time: string
    formulas?: {
      [key: string]: string
    },
    params?: string[],
    timezone_offset?: number,
  }

type energyFilterQueryResponse = {
  CLIENT_ID?: number
  CLIENT_NAME?: string
  STATE_ID?: number
  STATE_NAME?: string
  CITY_ID?: string
  CITY_NAME?: string
  UNIT_ID?: number
  UNIT_NAME?: string
}
  
type energyFilterParams = {
  CLIENTS: number[]
  STATES?: number[]
  CITIES?: string[]
  UNITS?: number[]
}

type energyFilterResponse = {
  clients: { id: number, name: string }[]
  states: { id: number, name: string }[]
  cities: { id: string, name: string }[]
  units: { id: number, name: string }[]
}
  
enum energyFilterQueryType {
  "CLIENT" = "CLIENT",
  "STATE" = "STATE",
  "CITY" = "CITY",
  "UNIT" = "UNIT"
}

type unitType = {
  unit_id: number
  city_name: string
  state_name: string
}

type paramsWithInsideFiltersType = {
  unitIds?: number[]
  stateIds?: number[]
  cityIds?: string[]
  clientIds?: number[]
  insideFilters?: {
    clientIds?: number[]
    stateIds?: number[]
    cityIds?: string[]
    unitIds?: number[]
  }
}

type energyHistResponseType = {
  time: Date
  consumption: string
  totalCharged: number
  dataIsInvalid: boolean
  dataIsProcessed: boolean
  totalUnits: number
}

type energyAnalysisResponseType = {
  clientId: number,
  clientName: string,
  unitId: number,
  unitName: string,
  stateId: number,
  stateName: string,
  cityId: string,
  cityName: string,
  consumption?: number,
  refrigerationConsumption?: number,
  refrigerationConsumptionPercentage?: number,
  refCapacity?: number,
  totalCharged?: number,
  consumptionByArea?: number,
  refrigerationConsumptionByArea?: number,
  dataIsInvalid: boolean,
  dataIsProcessed: boolean,
  procelRanking?: number,
  procelCategory?: string,
  consumptionPreviousPercentage?: number
}

type Demand = {
  record_date: string;
  average_demand: number | null;
  max_demand: number | null;
  min_demand: number | null;
};

httpRouter.privateRoutes['/energy/get-hist'] = async function (reqParams, session) {
    let energy_device_id;
    let manufacturer;
    let model;
    let serial;
    if (reqParams.energy_device_id) {
        energy_device_id = reqParams.energy_device_id;
    }

    if (!energy_device_id) {
        if (!reqParams.unit_id) throw Error('Faltou o parâmetro: energy_device_id ou unit_id').HttpStatus(400);
        const device = await sqldb.ENERGY_DEVICES_INFO.getList({
            unitIds: [reqParams.unit_id],
        }, {
            addUnownedDevs: true
        });
        if (device.length === 0)throw Error('Essa unidade não possui medidor de energia associado').HttpStatus(400);
        energy_device_id = device[0].ENERGY_DEVICE_ID;
        manufacturer = device[0].MANUFACTURER;
        model = device[0].MODEL;
        serial = device[0].SERIAL;
    }


    if (!manufacturer) manufacturer = reqParams.manufacturer;
    if (!model) model = reqParams.model;
    if (!serial) serial = reqParams.serial;

    if (!manufacturer) throw Error('Faltou o parâmetro: manufacturer').HttpStatus(400);
    if (!model) throw Error('Faltou o parâmetro: model').HttpStatus(400);
    if (!reqParams.start_time) throw Error('Faltou o parâmetro: start_time').HttpStatus(400);
    if (!reqParams.end_time) throw Error('Faltou o parâmetro: end_time').HttpStatus(400);

    if (!energy_device_id.startsWith("D")) throw Error('Não é um medidor da Diel').HttpStatus(400);

    const devInf = await sqldb.ENERGY_DEVICES_INFO.getItem({
        id: energy_device_id,
    });
    if (!devInf) { throw Error('Dispositivo não encontrado').HttpStatus(400) }

    const timezoneInfo = await getTimezoneInfoByDev({ devId: energy_device_id });
    const timezoneOffset = timezoneInfo && getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });

    const perms = await getPermissionsOnUnit(session, devInf.CLIENT_ID, devInf.UNIT_ID);
    if (!perms.canViewDevs) {
      throw Error('Permissão negada!').HttpStatus(403);
    }

    if (energy_device_id.startsWith('DRI')) {
      const { drisCfg } = await loadDrisCfg({
        skipSchedule: true,
        devIds: [energy_device_id],
        unitIds: devInf.UNIT_ID ? [devInf.UNIT_ID] : undefined,
        clientIds: devInf.CLIENT_ID ? [devInf.CLIENT_ID] : undefined,
      });
      reqParams.formulas = getDrisCfgFormulas(drisCfg[energy_device_id]);
    }
    
    let body: EnergyBody;
    if (!serial) serial = "";

    body = {
        energy_device_id: energy_device_id,     
        start_time: reqParams.start_time,
        end_time: reqParams.end_time,
        formulas: reqParams.formulas,
        params: reqParams.params,
        serial: serial,
        manufacturer: manufacturer,
        model:model,
        timezone_offset: timezoneInfo && timezoneOffset,
      }  
   
    const result = await rusthistApi['/energy-query'](body, `/energy/get-hist ${session.user}`);
    return result;
}

httpRouter.privateRoutes['/energy/get-stats'] = async function (reqParams, session) {
    if (!reqParams.serial) throw Error('Faltou o parâmetro: serial').HttpStatus(400);
    if (!reqParams.manufacturer) throw Error('Faltou o parâmetro: manufacturer').HttpStatus(400);
    // if (!reqParams.start_time) throw Error('Faltou o parâmetro: start_time').HttpStatus(400);
    // if (!reqParams.end_time) throw Error('Faltou o parâmetro: end_time').HttpStatus(400);
    // if (!reqParams.stats_interval_hours) throw Error('Faltou o parâmetro: stats_interval_hours').HttpStatus(400);

    const devInf = await sqldb.ENERGY_DEVICES_INFO.getItem({
        serial: reqParams.serial,
        manufacturer: reqParams.manufacturer,
    });
    if (!devInf) { throw Error('Dispositivo não encontrado').HttpStatus(400) }

    const perms = await getPermissionsOnUnit(session, devInf.CLIENT_ID, devInf.UNIT_ID);
    if (!perms.canViewDevs) {
      throw Error('Permissão negada!').HttpStatus(403);
    }

    return await rusthistApi['/energy-stats'](reqParams, `/energy/get-stats ${session.user}`)
}

type EnergyDev = {
  energy_device_id: string
  unit_id?: number
  serial: string
  manufacturer: string
  model: string
  start_time: string
  end_time: string
  formulas?: {
    [key: string]: string
  },
  params?: string[],
}

httpRouter.privateRoutes['/energy/get-hist-infograph'] = async function (reqParams, session) {
  // Desativando rota temporariamente
  return {
    max_demand: { value: 0, timestamp: '' },
    min_demand: { value: 0, timestamp: '' },
    avg_demand: 0,
    demands: []
  }
  const iniTS = Date.now();
  logger.info('DBGLENT - /energy/get-hist-infograph (1/5)', Date.now() - iniTS);

  const devicesEnergy: EnergyDev[] = []; 

  if (reqParams.devices.length === 0) throw Error('Faltou o parametro: devices').HttpStatus(400)

  if (!reqParams.intervalMin) throw Error('Faltou o parametro: intervalMin; parametro deve receber um number em minuto').HttpStatus(400) 
  if (reqParams.intervalMin !== 15 && reqParams.intervalMin !== 60) throw Error('Parametro incorreto: intervalMin; parametro deve receber um number de 15 ou 60').HttpStatus(400) 


  const timezoneInfo = await getTimezoneInfoByDev({ devId: reqParams.devices[0].energy_device_id });
  const timezoneOffset = timezoneInfo && getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });

  logger.info('DBGLENT - /energy/get-hist-infograph (2/5)', Date.now() - iniTS);

  for (const energyDev of reqParams.devices) {
    await checkReqParamsandDevInfo(energyDev, session, { start: reqParams.start_time, end: reqParams.end_time, addOneHour: true }, devicesEnergy, timezoneOffset, timezoneInfo);
  }

  const devFormula = devicesEnergy.filter((item) => item.model === 'ET330').find((item) => item.formulas)

  devicesEnergy.forEach((item) => { item.formulas = devFormula.formulas })

  const allDevicesEnergy = []

  logger.info('DBGLENT - /energy/get-hist-infograph (3/5)', Date.now() - iniTS);

  for (const dme of devicesEnergy) {
    if (dme.model === "ET330") {
      const result = await rusthistApi['/energy-query'](dme, `/energy/get-hist ${session.user}`);
      allDevicesEnergy.push(result);
    }
  }

  logger.info('DBGLENT - /energy/get-hist-infograph (4/5)', Date.now() - iniTS);

  const intervalMs = 15 * 60 * 1000; // intervalo minutos em milissegundos

  const result = getTelemetryInterval(allDevicesEnergy, intervalMs, reqParams.end_time, reqParams.start_time)

  const { max_demand, min_demand, avg_demand } = sumDmeTelemetries(result)

  if (reqParams.intervalMin === 60) {
    const intervalMsHour = reqParams.intervalMin * 60 * 1000; // intervalo minutos em milissegundos
    const resultHour = getTelemetryIntervalByHour(result, intervalMsHour, reqParams.end_time, reqParams.start_time);

    logger.info('DBGLENT - /energy/get-hist-infograph (5/5a)', Date.now() - iniTS);

    return {
      max_demand,
      min_demand,
      avg_demand,
      demands: resultHour,
    }
  }

  logger.info('DBGLENT - /energy/get-hist-infograph (5/5b)', Date.now() - iniTS);

  return {
    max_demand,
    min_demand,
    avg_demand,
    demands: result,
  };
}

/**
 * @swagger
 * /energy/get-demand-hist:
 *   post:
 *     summary: Histórico de demanda de energia
 *     description: Buscar históricos de demanda
 *     tags:
 *       - Energy
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do dispostivo e datas
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: Id da unidade
 *               default: null
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar histórico de demanda
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar histórico de demanda
 *               default: ""
 *               required: false
 *             ELECTRIC_CIRCUIT_IDS:
 *               type: array
 *               description: Ids de circuito elétrico
 *               required: true
 *               items:
 *                 type: number
 *     responses:
 *       200:
 *         description: Histórico de demanda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 max_demand:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                 min_demand:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                 avg_demand:
 *                   type: number
 *                 demands:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       record_date:
 *                         type: string
 *                       average_demand:
 *                         type: number
 *                       max_demand:
 *                         type: number
 *                       min_demand:
 *                         type: number
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const getEnergyDemandHist = async (reqParams: httpRouter.ApiParams['/energy/get-demand-hist'], session: SessionData) => {
  if (!reqParams.UNIT_ID) throw Error('Invalid properties. Missing UNIT_ID').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);
  if (!reqParams.ELECTRIC_CIRCUIT_IDS?.length) { throw Error ('Invalid properties. Missing ELECTRIC_CIRCUIT_IDS')}

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission Denied!').HttpStatus(403);
  }

  let result: {
    demand_info?: { average_demand: number, max_demand: number, min_demand: number, max_demand_date: string, min_demand_date: string, sum_demand: number, qtd_demand: number },
    demands?: Demand[],
  } = {};

  let demandMetrics: {
    max_demand: { value: number|null, timestamp: string },
    min_demand: { value: number|null, timestamp: string },
    avg_demand: number|null,
    sum_demand: number|null,
    qtd_demand: number|null,
  } = { 
    max_demand: { value: null, timestamp: '' },
    min_demand: { value: null, timestamp: '' },
    avg_demand: null,
    sum_demand: null,
    qtd_demand: null,
  };

  // Por enquanto, apenas ET330 traz demanda de energia
  const energy_devices = await sqldb.ENERGY_DEVICES_INFO.getEnergyDevicesDriByUnit({ UNIT_ID: unitInfo.UNIT_ID, MODELS: ['ET330'], ELECTRIC_CIRCUITS_IDS: reqParams.ELECTRIC_CIRCUIT_IDS });
  if (!energy_devices.length) return result;

  const endDateVerified = checkEndDateNoLaterThanYesterday(reqParams.END_DATE);

  const hourGraphic = reqParams.START_DATE !== reqParams.END_DATE;
  const dataWithActualDay = reqParams.END_DATE !== endDateVerified;

  const currentDate = moment();
  const isBeforeThanActualDate = moment(reqParams.START_DATE).startOf('day').isBefore(currentDate.startOf('day'));
  if (isBeforeThanActualDate) {
    const response = await axios.post(`${configfile.computedDataServerUrl}energy_demand/get-energy-demand-by-unit`, {
      start_date: reqParams.START_DATE,
      end_date: endDateVerified,
      unit_id: reqParams.UNIT_ID,
      hour_graphic: hourGraphic,
      electric_circuits_ids: reqParams.ELECTRIC_CIRCUIT_IDS
    });

    result = response.data;
    demandMetrics = {
      max_demand: { value: result.demand_info?.max_demand, timestamp: result.demand_info?.max_demand_date },
      min_demand: { value: result.demand_info?.min_demand, timestamp: result.demand_info?.min_demand_date },
      avg_demand: result.demand_info?.average_demand,
      sum_demand: result.demand_info?.sum_demand,
      qtd_demand: result.demand_info?.qtd_demand,
    };
  }

  if (dataWithActualDay || !isBeforeThanActualDate) {
    const day = dataWithActualDay ? moment(endDateVerified).add(1, 'day').format('YYYY-MM-DD') : reqParams.END_DATE;
    const demandsWithActualDate = await verifyDemandInActualDay(energy_devices, day, hourGraphic, demandMetrics, session.user);
    result.demands = result.demands ? result.demands.concat(demandsWithActualDate) : demandsWithActualDate;
  }

  // Se for gráfico de dia, preencher buracos entre os minutos
  if (!hourGraphic && result.demands?.length) {
    result.demands = verifyDemandMinutesHist(result.demands);
  }

  return {
    max_demand: demandMetrics.max_demand,
    min_demand: demandMetrics.min_demand,
    avg_demand: demandMetrics.avg_demand,
    demands: result.demands,
  }
}

export const verifyDemandInActualDay = async (
  energy_devices: Awaited<ReturnType< typeof sqldb.ENERGY_DEVICES_INFO.getEnergyDevicesDriByUnit>>, 
  day: string,
  hourInterval: boolean, 
  demandMetrics: {
    max_demand: { value: number|null, timestamp: string },
    min_demand: { value: number|null, timestamp: string },
    avg_demand: number|null,
    sum_demand: number|null,
    qtd_demand: number|null,
  },
  user: string
) => {
  let demand_info = await Promise.all(energy_devices.map(async (data) => {
    try {
      const { drisCfg } = await loadDrisCfg({
        skipSchedule: true,
        devIds: [data.DEVICE_CODE],
      });
      const formulas = getDrisCfgFormulas(drisCfg[data.DEVICE_CODE]);
      const params = {
        energy_device_id: data.DEVICE_CODE,
        serial: data.SERIAL ?? '',
        manufacturer: data.MANUFACTURER,
        model: data.MODEL,
        start_time: day + 'T00:00:00',
        end_time: day + 'T23:59:59',
        formulas,
        calculate_demand_hour_graphic: hourInterval,
      };
      const demandResponse = await rusthistApi['/energy-query'](params, `/energy/get-demand-hist ${user}`);
      return demandResponse.grouped_demand;
    } catch (error) {
      logger.error(`msg: ${error} - user: ${user}`);
      return null;
    }
  }));

  const aggregatedDemands: { record_date: string, average_demand: number, min_demand: number, max_demand: number }[] = [];
  let totalSum = 0;
  let countDemands = 0;

  demand_info.flat().forEach(demand => {
    if (demand) {
      let demand_by_record_date = aggregatedDemands.find((item) => item.record_date === demand.record_date);
      if (!demand_by_record_date) {
        demand_by_record_date = {
          record_date: demand.record_date,
          average_demand: 0,
          min_demand: 0,
          max_demand: 0,
        };
        aggregatedDemands.push(demand_by_record_date);
      }

      countDemands += 1;
      demand_by_record_date.average_demand += demand.average_demand;
      totalSum += demand.average_demand;
      demand_by_record_date.min_demand += demand.min_demand;
      demand_by_record_date.max_demand += demand.max_demand;

      demandMetrics.max_demand = verifyMaxValueDemand(demand_by_record_date.max_demand, demand.record_date, demandMetrics.max_demand.value, demandMetrics.max_demand.timestamp)
      demandMetrics.min_demand = verifyMinValueDemand(demand_by_record_date.min_demand, demand.record_date, demandMetrics.min_demand.value, demandMetrics.min_demand.timestamp)
    }
  });

  if (demandMetrics.avg_demand) {
    demandMetrics.avg_demand = Number(((Number(demandMetrics.sum_demand) + totalSum) / (countDemands + Number(demandMetrics.qtd_demand))).toFixed(2));
  } else {
    demandMetrics.avg_demand = Number((totalSum / countDemands).toFixed(2));
  }

  return aggregatedDemands;
}

export const verifyMinValueDemand = (valueToCompare: number, recordDateValueToCompare: string, oldValue: number, oldRecordDate: string) => {
  let minValue = { value: oldValue ?? Number.MAX_VALUE, timestamp: oldRecordDate }
  if (valueToCompare < minValue.value) {
    minValue = { value: valueToCompare, timestamp: recordDateValueToCompare }
  }

  return minValue;
}

export const verifyMaxValueDemand = (valueToCompare: number, recordDateValueToCompare: string, oldValue: number, oldRecordDate: string) => {
  let maxValue = { value: oldValue ?? Number.MIN_VALUE, timestamp: oldRecordDate }
  if (valueToCompare > maxValue.value) {
    maxValue = { value: valueToCompare, timestamp: recordDateValueToCompare }
  }

  return maxValue;
}

httpRouter.privateRoutes['/energy/get-demand-hist'] = getEnergyDemandHist;

export const verifyDemandMinutesHist = (demands: Demand[]) => {
  const initDate = moment(demands[0]?.record_date || moment().format('YYYY-MM-DD')).startOf('day');
    const endDate = initDate.clone().endOf('day');

    const demandsMap = new Map(demands.map(demand => [demand.record_date, demand]));
    const filledDemands: Demand[] = [];
    let currentDate = initDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
      const recordDate = currentDate.format('YYYY-MM-DDTHH:mm:ss');
      if (demandsMap.has(recordDate)) {
        filledDemands.push(demandsMap.get(recordDate));
      } else {
        filledDemands.push({
          record_date: recordDate,
          average_demand: null,
          max_demand: null,
          min_demand: null
        });
      }
      currentDate.add(15, 'minutes');
    }
  
    return filledDemands;
}

type Result = {
  timestamp: string;
  value: number;
  devices: {
    devId: string;
    value: number;
  }[];
}[]

 function generateTimestamps(startDate:string, endDate:string, interval: number) {
  const timestamps = [];
  let currentTimestamp = new Date (startDate);
  const endTimestamp = new Date(endDate);

  while (currentTimestamp <= endTimestamp) {
    timestamps.push({
        timestamp: currentTimestamp.toISOString(),
        telemetries: [] as {
          value: number,
          timestamp: string,
        }[],
        value: 0,
        devices: [] as {
          devId: string,
          value: number
        }[]
    });
    currentTimestamp.setTime(currentTimestamp.getTime() + interval);
  }

  return timestamps;
}

function sumDmeTelemetries(result: Result) {
  let max_demand = { value: 0, timestamp: '' }
  let min_demand;
  let avg_times = 0
  let sumTotal = 0
  for (const demand of result) {
    if (demand.devices.length === 0) {
      demand.value = null
    } else {
      let soma = 0;
      demand.devices.forEach((dev) => soma = soma + dev.value);
      demand.value = soma;
      if (max_demand.value < demand.value) {
        max_demand = { timestamp: demand.timestamp, value: demand.value };
      }
  
      if (!min_demand && demand.value > 0) min_demand = { value: demand.value, timestamp: demand.timestamp }
  
      if (min_demand && min_demand.value > demand.value && demand.value > 0) {
        min_demand = { timestamp: demand.timestamp, value: demand.value };
      }
      sumTotal = sumTotal + demand.value;
      if (demand.value > 0) avg_times++
    }
    }


  return { max_demand, min_demand, avg_times, avg_demand: sumTotal / avg_times || null }
}

function getTelemetryInterval(allDevicesEnergy: any, intervalMs: number, end_time: string, start_time: string){
  const result = generateTimestamps(start_time, end_time, intervalMs);

  for (const dme of allDevicesEnergy) {
    for (const r of result) {
      const actualTime = new Date(r.timestamp.substring(0, 19)).getTime();

      r.devices.push({ devId: dme.energy_device_id, value: 0 })
      let sum = 0;
      let qtd = 0;
      for (const { demanda_med_at, timestamp } of dme.data) {
        const actualDemand = new Date(timestamp.substring(0, 19)).getTime()
        const intervalStart = actualTime + intervalMs
        const intervalEnd = actualTime + (intervalMs * 2)

        if ((actualDemand >= intervalStart) && (actualDemand < intervalEnd && demanda_med_at > 0)) {
          sum = sum + demanda_med_at;
          qtd++;
        }
      }
      if (sum > 0 && qtd > 0) {
        r.devices.push({ devId: dme.energy_device_id, value: sum / qtd })
      }
      r.devices = r.devices.filter((dev) => dev.value !== 0)
    }
  }

  return result;
}

function getTelemetryIntervalByHour(resultTelemetrie: {
  timestamp: string;
  value: number | null;
  devices: {
      devId: string;
      value: number;
  }[];
}[], intervalMs: number, end_time: string, start_time: string){
  const result = generateTimestamps(start_time, end_time, intervalMs);

    for (const r of result) {
      const actualTime = new Date(r.timestamp.substring(0, 19)).getTime();
      let sum = 0;
      for(const item of resultTelemetrie) {
        const actualDemand = new Date(item.timestamp.substring(0, 19)).getTime()
        const intervalLimit = actualTime + intervalMs;

        if(actualDemand >= actualTime && actualDemand < intervalLimit) {
          r.telemetries.push({ value: item.value, timestamp: item.timestamp })
          if (item.value) sum = sum + item.value;
        }
      }
      r.value = null

      const telFiltered = r.telemetries.filter((item) => item.value)
      if (telFiltered.length > 0) {
        r.value = sum / telFiltered.length;
      } 
      
      r.telemetries = telFiltered;
    }

  return result;
}

async function checkReqParamsandDevInfo(energyDev: EnergyDev, session: SessionData, period: { start: string, end: string, addOneHour: boolean }, devicesEnergy: any, timezoneOffset: number, timezoneInfo: {
  TIMEZONE_ID: number;
  TIMEZONE_AREA: string;
  TIMEZONE_OFFSET: number;
}) {
  const { model, energy_device_id, serial, manufacturer } = await getDmeInfo(energyDev)
  
  const devInf = await sqldb.ENERGY_DEVICES_INFO.getItem({
    id: energy_device_id,
  });
  if (!devInf) { throw Error('Dispositivo não encontrado').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, devInf.CLIENT_ID, devInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permissão negada!').HttpStatus(403);
  }

if (energy_device_id.startsWith('DRI')) {
  const { drisCfg } = await loadDrisCfg({
    skipSchedule: true,
    devIds: [energy_device_id],
    unitIds: devInf.UNIT_ID ? [devInf.UNIT_ID] : undefined,
    clientIds: devInf.CLIENT_ID ? [devInf.CLIENT_ID] : undefined,
  });
  energyDev.formulas = getDrisCfgFormulas(drisCfg[energy_device_id]);
}

let body: EnergyBody;

const endTime = period.addOneHour ? new Date(new Date(period.end).getTime() + (60 * 60 * 1000)).toISOString().substring(0, 19) : period.end;

body = {
    energy_device_id: energy_device_id,     
    start_time: period.start,
    end_time: endTime,
    formulas: energyDev.formulas,
    params: energyDev.params,
    serial: serial || "",
    manufacturer: manufacturer,
    model:model,
    timezone_offset: timezoneInfo && timezoneOffset,
  }

devicesEnergy.push(body)
}

async function getDmeInfo(energyDev: EnergyDev) {
  let model, manufacturer, energy_device_id, serial;
  if (energyDev.energy_device_id) {
    energy_device_id = energyDev.energy_device_id;
  }

  if (!energy_device_id) {
      if (!energyDev.unit_id) throw Error('Faltou o parâmetro: energy_device_id ou unit_id').HttpStatus(400);
      const device = await sqldb.ENERGY_DEVICES_INFO.getList({
          unitIds: [energyDev.unit_id],
      }, {
          addUnownedDevs: true
      });
      if (device.length === 0)throw Error('Essa unidade não possui medidor de energia associado').HttpStatus(400);
      energy_device_id = device[0].ENERGY_DEVICE_ID;
      manufacturer = device[0].MANUFACTURER;
      model = device[0].MODEL;
      serial = device[0].SERIAL;
  }
  if (!manufacturer) manufacturer = energyDev.manufacturer;
  if (!model) model = energyDev.model;
  if (!serial) serial = energyDev.serial;
  //
  if (!manufacturer) throw Error('Faltou o parâmetro: manufacturer').HttpStatus(400);
  if (!model) throw Error('Faltou o parâmetro: model').HttpStatus(400);
  if (!energy_device_id.startsWith("D")) throw Error('Não é um medidor da Diel').HttpStatus(400);

  return { model, manufacturer, energy_device_id, serial }
}


httpRouter.privateRoutes['/energy/get-analysis-list'] = async function (reqParams, session) {
  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })
  
  const clientsAndUnitsAlloweds = await checkClientsAndUnitsAllowed({
    clients: params.clientList, 
    units: params.unitList
  }, session);

  const units: number[] = []
  const procel = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    f: 0,
    g: 0
  }

  const arrayEmpty: energyAnalysisResponseType[] = []

  const responseEmpty = {
    resume: {
      totalItems: 0,
      totalSTATES: 0,
      totalCITIES: 0,
      procel,
    },
    unitsList: arrayEmpty
  }

  if(params.clientList.length > 0 || params.cityList.length > 0 || params.stateList.length > 0) {

    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAlloweds.clients,
      UNIT_IDS: clientsAndUnitsAlloweds.units,
      STATE_IDS: params.stateList,
      CITY_IDS: params.cityList
    });

    if(filteredUnits.length == 0){
      return responseEmpty
    }

    filteredUnits.forEach((unit) => {
      units.push(unit.UNIT_ID)
    })

  }

  const unitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });

  if(unitsResponse.data.length === 0){
    return responseEmpty
  }
  
  const startDate = new Date(reqParams.startDate)

  const calculatedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)

  const analysisResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-list`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    limit: reqParams.pageSize,
    offset: (reqParams.page - 1) * reqParams.pageSize,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    orderByField: reqParams?.orderByField,
    orderByType: reqParams?.orderByType,
    isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
    previousStartDate: `${calculatedDate.previousStartDate.getFullYear()}-${calculatedDate.previousStartDate.getMonth() + 1}-${calculatedDate.previousStartDate.getDate()}`,
    previousEndDate: `${calculatedDate.previousEndDate.getFullYear()}-${calculatedDate.previousEndDate.getMonth() + 1}-${calculatedDate.previousEndDate.getDate()}`,
    minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24)),
    categoryFilter: reqParams?.insideFilters?.categoryFilter
  });


  const states = new Set()
  const cities = new Set()

  unitsResponse.data.forEach((element: unitType) => {
    states.add(element.state_name);
    cities.add(element.city_name);
  })

  if(reqParams?.insideFilters?.categoryFilter?.length > 0){

    const procelInsights = await axios.post(`${configfile.computedDataServerUrl}energy/get-procel-insights`, {
      units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
      startDate: reqParams.startDate.substring(0, 10),
      endDate: reqParams.endDate.substring(0, 10),
      previousStartDate: `${calculatedDate.previousStartDate.getFullYear()}-${calculatedDate.previousStartDate.getMonth() + 1}-${calculatedDate.previousStartDate.getDate()}`,
      previousEndDate: `${calculatedDate.previousEndDate.getFullYear()}-${calculatedDate.previousEndDate.getMonth() + 1}-${calculatedDate.previousEndDate.getDate()}`,
      minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
    })

    let unitsFiltered: unitType[] = []

    reqParams?.insideFilters?.categoryFilter.forEach((category: string) => {
      switch(category){
        case 'A':
          procel.a = procelInsights.data.a.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.a.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'B':
          procel.b = procelInsights.data.b.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.b.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'C':
          procel.c = procelInsights.data.c.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.c.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'D':
          procel.d = procelInsights.data.d.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.d.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'E':
          procel.e = procelInsights.data.e.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.e.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'F':
          procel.f = procelInsights.data.f.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.f.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
        case 'G':
          procel.g = procelInsights.data.g.units.length;
          (unitsResponse.data.filter((unit: unitType) =>  procelInsights.data.g.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element) })
          break;
      }
    });

    const statesFiltered = new Set()
    const citiesFiltered = new Set()

    unitsFiltered.forEach((element: unitType) => {
      statesFiltered.add(element.state_name);
      citiesFiltered.add(element.city_name);
    })


    return {
      resume: {
        totalItems: unitsFiltered.length,
        totalSTATES: Array.from(statesFiltered).length,
        totalCITIES: Array.from(citiesFiltered).length,
        procel,
      },
      unitsList: Object.values(analysisResponse.data.units)
    }
  }

  return {
    resume: {
      totalItems: unitsResponse.data.length,
      totalSTATES: Array.from(states).length,
      totalCITIES: Array.from(cities).length,
      procel: {
        a: analysisResponse.data.classA,
        b: analysisResponse.data.classB,
        c: analysisResponse.data.classC,
        d: analysisResponse.data.classD,
        e: analysisResponse.data.classE,
        f: analysisResponse.data.classF,
        g: analysisResponse.data.classG,
      }
    },
    unitsList: Object.values(analysisResponse.data.units)
  }
}

function getCalculatedDate (startDate: string, endDate: string) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const previousEndDate = new Date(start);
  previousEndDate.setDate(previousEndDate.getDate() - 1);

  const now = new Date();

  const numDays = Math.round((end.getTime() - start.getTime()) / (3600 * 1000 * 24)) + 1;

  const previousStartDate = new Date(start);
  previousStartDate.setDate(previousStartDate.getDate() - (numDays -1))

  let lastDay: Date

  if(now.getTime() < end.getTime()){
    lastDay = now
  } else {
    lastDay = end
  }

  return {
    previousStartDate,
    previousEndDate,
    lastDay
  }
}

export const exportEnergyAnalysisList = async (reqParams: httpRouter.ApiParams['/energy/export-energy-analysis-list'], session: SessionData, { res }: ExtraRouteParams) => {
  const clientsAndUnitsAlloweds = await checkClientsAndUnitsAllowed({
    clients: reqParams.clientIds || [], 
    units: reqParams.unitIds || []
  }, session);

  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user });
  const language = getLanguage(prefsUser[0]);

  const data: any[][] = [reqParams.columnsToExport.map(column => t(`col_${column}`, language))];

  const units: number[] = []

  if(reqParams.clientIds.length > 0 || reqParams.cityIds.length > 0 || reqParams.stateIds.length > 0) {

    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAlloweds.clients,
      UNIT_IDS: clientsAndUnitsAlloweds.units,
      STATE_IDS: reqParams.stateIds,
      CITY_IDS: reqParams.cityIds
    });

    if(filteredUnits.length == 0){
      const buffer = createXlsx(data);
      res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
      res.append('filename', `${t('nomeArquivoAnaliseEnergia', language)}.xlsx`);
      res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
      res.status(200).end(buffer);
      return res
    }

    filteredUnits.forEach((unit) => {
      units.push(unit.UNIT_ID)
    })

  }

  const unitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });

  if(unitsResponse.data.length === 0){
    const buffer = createXlsx(data);
    res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
    res.append('filename', `${t('nomeArquivoAnaliseEnergia', language)}.xlsx`);
    res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
    res.status(200).end(buffer);
    return res
  }
  
  const startDate = new Date(reqParams.startDate)

  const calculatedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)

  const result = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-list`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    orderByField: reqParams?.orderByField,
    orderByType: reqParams?.orderByType,
    isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
    previousStartDate: `${calculatedDate.previousStartDate.getFullYear()}-${calculatedDate.previousStartDate.getMonth() + 1}-${calculatedDate.previousStartDate.getDate()}`,
    previousEndDate: `${calculatedDate.previousEndDate.getFullYear()}-${calculatedDate.previousEndDate.getMonth() + 1}-${calculatedDate.previousEndDate.getDate()}`,
    minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24)),
    categoryFilter: reqParams?.categoryFilter
  });

  const analysisResponse: httpRouter.ApiResps['/energy/get-analysis-list']['unitsList'] = result.data.units;

  insertDataRowEnergyAnalysis(data, analysisResponse, reqParams.columnsToExport, language, session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS);

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `${t('nomeArquivoAnaliseEnergia', language)}.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

export const insertDataRowEnergyAnalysis = (data: any[][], analysisResponse:httpRouter.ApiResps['/energy/get-analysis-list']['unitsList'], columnsToExport: string[], language: string, isAdminUser: boolean) => {
  const indexColumnEnergyConsumption = columnsToExport.findIndex((col) => col === 'consumption');
  const indexColumnRefrigerationConsumption = columnsToExport.findIndex((col) => col === 'refrigerationConsumption');
  const indexColumnRefrigerationConsumptionPercentage = columnsToExport.findIndex((col) => col === 'refrigerationConsumptionPercentage');
  const indexColumnConsumptionByArea = columnsToExport.findIndex((col) => col === 'consumptionByArea');
  const indexColumnTotalCharged = columnsToExport.findIndex((col) => col === 'totalCharged');
  const indexConsumptionPreviousPercentage = columnsToExport.findIndex((col) => col === 'consumptionPreviousPercentage');

  for (const row of analysisResponse) {
    const rowData = columnsToExport.map(column => getColumnValue(row, column, language));
    if (!isAdminUser) {
      const refrigerationPercentage = Number(row.refrigerationConsumptionPercentage ?? 0);
      if (row.dataIsInvalid) {
        updateColumnWithIndex(indexColumnEnergyConsumption, rowData);
        updateColumnWithIndex(indexColumnRefrigerationConsumption, rowData);
        updateColumnWithIndex(indexColumnRefrigerationConsumptionPercentage, rowData);
        updateColumnWithIndex(indexColumnConsumptionByArea, rowData);
        updateColumnWithIndex(indexColumnTotalCharged, rowData);
        updateColumnWithIndex(indexConsumptionPreviousPercentage, rowData);
      }
      if (refrigerationPercentage < 10 || refrigerationPercentage > 90) {
        updateColumnWithIndex(indexColumnRefrigerationConsumptionPercentage, rowData);
        updateColumnWithIndex(indexColumnRefrigerationConsumption, rowData);
      }
    }

    data.push(rowData);
  }
}

const updateColumnWithIndex = (index: number, rowData: any[]) => {
  if (index !== -1) {
    rowData[index] = '-';
  }
}

const formatNumber = (params: { value: string|number, language: string, minimumDigits?: number, maximumDigits?: number}) => {
  return params.value ? Number(params.value).toLocaleString(params.language, 
    {
      minimumFractionDigits: params.minimumDigits,
      maximumFractionDigits: params.maximumDigits,
    }
  ) : '-';
}

const getColumnValue = (row: any, column: string, language: string) => {
  switch (column) {
    case 'stateName':
      return row.stateName;
    case 'cityName':
      return row.cityName;
    case 'unitName':
      return row.unitName;
    case 'consumption':
      return formatNumber({ value: row.consumption, language});
    case 'totalCharged':
      return formatNumber({ value: row.totalCharged, language, minimumDigits: 2 });
    case 'refrigerationConsumption':
      return formatNumber({ value: row.refrigerationConsumption, language });
    case 'refrigerationConsumptionPercentage':
      return row.refrigerationConsumptionPercentage ? formatNumber({ value: Math.floor(Number(row.refrigerationConsumptionPercentage)), language }) : '-';
    case 'consumptionByArea':
      return formatNumber({ value: row.consumptionByArea, language });
    case 'refCapacity':
      return formatNumber({ value: row.refCapacity, language });
    case 'refrigerationConsumptionByArea':
      return formatNumber({ value: row.refrigerationConsumptionByArea, language });
    case 'clientName':
      return row.clientName;
    case 'procelRanking':
      return formatNumber({ value: row.procelRanking, language });
    case 'procelCategory':
      return row.procelCategory
    case 'consumptionPreviousPercentage':
      return row.consumptionPreviousPercentage ? formatNumber({ value: Math.floor(Number(row.consumptionPreviousPercentage)), language}) : '-';
    default:
      return '-';
  }
}


httpRouter.privateRoutes['/energy/export-energy-analysis-list'] = exportEnergyAnalysisList;


httpRouter.privateRoutes['/energy/get-analysis-model'] = async function (reqParams, session) {

  const model = await sqldb.ANALYSIS_MODELS.getModelsById({ ID: reqParams.modelId });

  return {
      ...model[0],
      filters: JSON.parse(model[0].filters),
      shared: JSON.parse(model[0].shared)
  }
}

httpRouter.privateRoutes['/energy/get-analysis-models-list'] = async function (reqParams, session) {

  if(reqParams?.name){

    if(reqParams?.general){
      return sqldb.ANALYSIS_MODELS.getModelsGeneral({NAME: reqParams?.name.replace(/[^\w\s]/gi, '')});
    }

    return sqldb.ANALYSIS_MODELS.getModelsByUser({ USER: session.user, NAME: reqParams?.name.replace(/[^\w\s]/gi, '') });
    
  }
  else if(reqParams?.general){

    return sqldb.ANALYSIS_MODELS.getModelsGeneral({NAME: reqParams?.name});

  }

  return sqldb.ANALYSIS_MODELS.getModelsByUser({ USER: session.user, NAME: reqParams?.name });

}

httpRouter.privateRoutes['/energy/get-energy-analysis-filters'] = async function (reqParams, session) {
  let canViewAllClients = false
  
  const clientsAndUnitsAllowed = await checkClientsAndUnitsAllowed({
    clients: reqParams.clients || [],
    units: []
  }, session);


  const startDate = new Date(reqParams.startDate)
  
  const calculedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)

  const procelInsights = await axios.post(`${configfile.computedDataServerUrl}energy/get-procel-insights`, {
    units: clientsAndUnitsAllowed.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    previousStartDate: reqParams.startDate.substring(0, 10),
    previousEndDate: reqParams.endDate.substring(0, 10),
    minConsumption: Math.floor((calculedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
  })

  let unitsFiltered: number[] = []

  const allUnitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: clientsAndUnitsAllowed.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });


  if(reqParams?.categoryFilter){
    reqParams.categoryFilter.forEach((category: string) => {
      switch(category){
        case 'A':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.a.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'B':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.b.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'C':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.c.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'D':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.d.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'E':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.e.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'F':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.f.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
        case 'G':
          (allUnitsResponse.data.filter((unit: unitType) =>  procelInsights.data.g.units.includes(unit.unit_id)))
          .forEach((element: unitType) => { unitsFiltered.push(element.unit_id) })
          break;
      }
    });
  }


  const unitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: unitsFiltered.length > 0 ? unitsFiltered : clientsAndUnitsAllowed.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });

  if(unitsResponse.data.length === 0){
    return {
      clients: [],
      states: [],
      cities: [],
      units: []
    }
  }

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS){
    canViewAllClients = true
  }

  const filteredUnits = unitsResponse.data.map((element: { unit_id: number }) => { return element.unit_id })

  const [clients, states, cities, units] = await Promise.all([
    energyFilterQueryData({ CLIENTS: canViewAllClients ? [] : clientsAndUnitsAllowed.clients, UNITS: filteredUnits }, energyFilterQueryType.CLIENT),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, UNITS: filteredUnits }, energyFilterQueryType.STATE),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, STATES: reqParams?.states, UNITS: filteredUnits }, energyFilterQueryType.CITY),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, STATES: reqParams?.states, CITIES: reqParams?.cities, UNITS: filteredUnits  }, energyFilterQueryType.UNIT)
  ])

  return {
    clients: clients,
    states: states,
    cities: cities,
    units: units
  }
}

httpRouter.privateRoutes['/energy/get-energy-analysis-hist'] = async function (reqParams, session) {
  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })
  
  const clientsAndUnitsAlloweds = await checkClientsAndUnitsAllowed({
    clients: params.clientList, 
    units: params.unitList
  }, session);

  const units: number[] = []

  if(params.clientList.length > 0 || params.cityList.length > 0 || params.stateList.length > 0) {
    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAlloweds.clients,
      UNIT_IDS: clientsAndUnitsAlloweds.units,
      STATE_IDS: params.stateList,
      CITY_IDS: params.cityList
    });

    if(filteredUnits.length == 0){
      const responseNull = returnNull(reqParams.startDate, reqParams.endDate, reqParams.filterType)
    
      return {
        current: responseNull,
        compare: responseNull,
        totalUnits: 0,
        totalUnitsWithConstructedArea: 0,
      }
    }

    filteredUnits.forEach((unit) => {
      units.push(unit.UNIT_ID)
    })

  }

  const calculatedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)
  const startDate = new Date(reqParams.startDate)

  const responseCurrent = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-hist`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    filterType: reqParams.filterType,
    isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
    minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24)),
  });

  const current: energyHistResponseType[] = processEnergyAnalysisHist({
    startDate: reqParams.startDate,
    endDate: reqParams.endDate,
    filterType: reqParams.filterType
  }, responseCurrent.data?.energy_data ?? []);
  
  const compare: energyHistResponseType[] = await getEnergyAnalysisHistToCompare({
      startDate: reqParams.startDateToCompare,
      endDate: reqParams.endDateToCompare,
      filterType: reqParams.filterType,
      units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    },session )


  return {
    current,
    compare,
    totalUnits: responseCurrent.data?.units_count_with_consumption ?? 0,
    totalUnitsWithConstructedArea: responseCurrent.data?.units_count_with_constructed_area ?? 0
  }
}


function processEnergyAnalysisHist(params: { startDate: string, endDate: string, filterType: string }, response: energyHistResponseType[]): energyHistResponseType[] {
  const current: energyHistResponseType[] = []
  const currentStartDate = new Date(params.startDate.slice(0, -2))
  const currentEndDate = new Date(params.endDate.slice(0, -2))

  let iter = 0
  let iterResponse = 0

  if(params.filterType === 'month'){
    while(currentStartDate <= currentEndDate){
      const time = new Date(params.startDate.slice(0, -2))
      time.setDate(time.getDate() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: false,
        dataIsProcessed: false,
        totalUnits: 0,
      };
      if(new Date(response[iterResponse]?.time).getTime() == currentStartDate.getTime()){
        findedConsumption.consumption = response[iterResponse].consumption;
        findedConsumption.totalCharged = response[iterResponse].totalCharged;
        findedConsumption.dataIsInvalid = response[iterResponse].dataIsInvalid;
        findedConsumption.dataIsProcessed = response[iterResponse].dataIsProcessed;
        findedConsumption.totalUnits = response[iterResponse].totalUnits;
        iterResponse += 1
      }
      current.push(findedConsumption)
      currentStartDate.setDate(currentStartDate.getDate() + 1)
      iter += 1
    }
  }
  else{
    currentStartDate.setDate(1)
    while(currentStartDate <= currentEndDate){
      const time = new Date(params.startDate.slice(0, -2))
      time.setMonth(time.getMonth() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: false,
        dataIsProcessed: false,
        totalUnits: 0,
      };
      const date = new Date(response[iterResponse]?.time)
      date.setDate(1)
      if(date.getTime() == currentStartDate.getTime()){
        findedConsumption.consumption = response[iterResponse].consumption;
        findedConsumption.totalCharged = response[iterResponse].totalCharged;
        findedConsumption.dataIsInvalid = response[iterResponse].dataIsInvalid;
        findedConsumption.dataIsProcessed = response[iterResponse].dataIsProcessed;
        findedConsumption.totalUnits = response[iterResponse].totalUnits;
        iterResponse += 1
      }
      current.push(findedConsumption)
      currentStartDate.setMonth(currentStartDate.getMonth() + 1)
      iter += 1
    }
  }
  return current
}

httpRouter.privateRoutes['/energy/get-energy-analysis-hist-filter'] = async function (reqParams, session) {
  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })

  
  let clientsAndUnitsAllowed:{ clients: number[], units: number[] } = {
    clients: params.clientList,
    units: params.unitList
  }

  if(!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS){
  
    clientsAndUnitsAllowed = await checkClientsAndUnitsAllowed({
      clients: params.clientList,
      units: params.unitList
    }, session)
  }

  const units = await sqldb.CLUNITS.getUnitsByPage({ 
    CLIENT_IDS: clientsAndUnitsAllowed.clients,
    UNIT_IDS: clientsAndUnitsAllowed.units,
    STATE_IDS: params.stateList,
    CITY_IDS: params.cityList
  });

  if(units.length === 0){
    return {
      months: [],
      years: []
    }
  }

  const date = new Date(Date.now())
  date.setMonth(date.getMonth() + 1)
  const formatedDate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`


  const months = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-hist-filter`, {
    date: formatedDate,
    filterType: reqParams?.type ? reqParams.type : 'CONSUMPTION',
    units: units.map((unit) => { return unit.UNIT_ID })
  })

  let currentYear = ''
  const years: { time: Date }[] = []

  months.data?.forEach((element: { time: string }) => {
    const year = element.time.substring(0, 4)
    if(currentYear !== year){
      date.setFullYear(+year)
      years.push({ time: structuredClone(date) })
      currentYear = year
    }
  });

  return {
    months: months.data,
    years: years
  }
}

httpRouter.privateRoutes['/energy/get-energy-hist-filters'] = async function (reqParams, session) {

  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })
  
  const clientsAndUnitsAllowed = await checkClientsAndUnitsAllowed({
    clients: params.clientList, 
    units: params.unitList
  }, session);

  const unitsSelected: number[] = []

  if(params.clientList.length > 0 || params.cityList.length > 0 || params.stateList.length > 0) {

    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAllowed.clients,
      UNIT_IDS: clientsAndUnitsAllowed.units
    });

    if(filteredUnits.length == 0){
      return {
        clients: [],
        states: [],
        cities: [],
        units: []
      }
    }

    filteredUnits.forEach((unit) => {
      unitsSelected.push(unit.UNIT_ID)
    })
  }

  const unitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: unitsSelected.length > 0 ? unitsSelected : clientsAndUnitsAllowed.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });

  if(unitsResponse.data.length === 0){
    return {
      clients: [],
      states: [],
      cities: [],
      units: []
    }
  }

  const filteredUnits = unitsResponse.data.map((element: { unit_id: number }) => { return element.unit_id })

  const allClientsAlloweds = await checkClientsAndUnitsAllowed({
    clients: [], 
    units: []
  }, session);

  const allUnitsResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-units-list`, {
    units: allClientsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10)
  });

  const [clients, states, cities, units] = await Promise.all([
    energyFilterQueryData({ CLIENTS: allClientsAlloweds.clients, UNITS: allClientsAlloweds.units  }, energyFilterQueryType.CLIENT),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, UNITS: filteredUnits }, energyFilterQueryType.STATE),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, STATES: params.stateList, UNITS: filteredUnits }, energyFilterQueryType.CITY),
    energyFilterQueryData({ CLIENTS: clientsAndUnitsAllowed.clients, STATES: params.stateList, CITIES: params.cityList, UNITS: allUnitsResponse.data.map((element: { unit_id: number }) => { return element.unit_id })}, energyFilterQueryType.UNIT)
  ])

  return {
    clients: clients,
    states: states,
    cities: cities,
    units: units
  }
}

httpRouter.privateRoutes['/energy/get-procel-insights'] = async function (reqParams, session) {

  const emptyArray: number[] = []
  const responseEmpty = {
      containsAnalysisData: false,
      containsProcel: false,
      a: {
        units: emptyArray,
        percentage: 0
      },
      b: {
        units: emptyArray,
        percentage: 0
      },
      c: {
        units: emptyArray,
        percentage: 0
      },
      d: {
        units: emptyArray,
        percentage: 0
      },
      e: {
        units: emptyArray,
        percentage: 0
      },
      f: {
        units: emptyArray,
        percentage: 0
      },
      g: {
        units: emptyArray,
        percentage: 0
      }
    }

  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })

  const clientsAndUnitsAlloweds = await checkClientsAndUnitsAllowed({
    clients: params.clientList, 
    units: params.unitList
  }, session);

  const units: number[] = []

  if(params.clientList.length > 0 || params.cityList.length > 0 || params.stateList.length > 0) {

    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAlloweds.clients,
      UNIT_IDS: clientsAndUnitsAlloweds.units,
      STATE_IDS: params.stateList,
      CITY_IDS: params.cityList
    });

    if(filteredUnits.length == 0){
      return responseEmpty
    }

    filteredUnits.forEach((unit) => {
      units.push(unit.UNIT_ID)
    })

  }

  const previousStartDate = new Date( reqParams.startDate)
  previousStartDate.setMonth(previousStartDate.getMonth() - 1)
  
  const previousEndDate = new Date(previousStartDate.getFullYear(), previousStartDate.getMonth() + 1, 0)

  const startDate = new Date(reqParams.startDate)
  
  const calculatedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)
  

  const analysisResponse = await axios.post(`${configfile.computedDataServerUrl}energy/get-procel-insights`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    previousStartDate: `${previousStartDate.getFullYear()}-${previousStartDate.getMonth() + 1}-${previousStartDate.getDate()}`,
    previousEndDate: `${previousEndDate.getFullYear()}-${previousEndDate.getMonth() + 1}-${previousEndDate.getDate()}`,
    procelUnitsFilter: reqParams.procelUnitsFilter,
    minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
  });

  return analysisResponse.data
}

httpRouter.privateRoutes['/energy/get-energy-trends'] = async function (reqParams, session) {
  const params = getParamLisWithInsideFilters({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    insideFilters: reqParams.insideFilters
  })

  const clientsAndUnitsAlloweds = await checkClientsAndUnitsAllowed({
    clients: params.clientList, 
    units: params.unitList
  }, session);

  const arrayEmpty: number[] = []

  const responseEmpty = {
    trendData: arrayEmpty,
    monthlyForecast: 0,
    monthlyTarget: 0,
    totalConsumption: 0
  }

  let units: number[] = []

  if(params.clientList.length > 0 || params.cityList.length > 0 || params.stateList.length > 0) {

    const filteredUnits = await sqldb.CLUNITS.getUnitsByPage({ 
      CLIENT_IDS: clientsAndUnitsAlloweds.clients,
      UNIT_IDS: clientsAndUnitsAlloweds.units,
      STATE_IDS: params.stateList,
      CITY_IDS: params.cityList
    });

    if(filteredUnits.length == 0){
      return responseEmpty
    }

    filteredUnits.forEach((unit) => {
      units.push(unit.UNIT_ID)
    })

  }
  
  const startDate = new Date(reqParams.startDate)

  const calculatedDate = getCalculatedDate(reqParams.startDate, reqParams.endDate)

  if(reqParams?.insideFilters?.categoryFilter?.length > 0){

    const unitsFiltered: unitType[] = []

    const procelInsights = await axios.post(`${configfile.computedDataServerUrl}energy/get-procel-insights`, {
      units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
      startDate: reqParams.startDate.substring(0, 10),
      endDate: reqParams.endDate.substring(0, 10),
      previousStartDate: `${calculatedDate.previousStartDate.getFullYear()}-${calculatedDate.previousStartDate.getMonth() + 1}-${calculatedDate.previousStartDate.getDate()}`,
      previousEndDate: `${calculatedDate.previousEndDate.getFullYear()}-${calculatedDate.previousEndDate.getMonth() + 1}-${calculatedDate.previousEndDate.getDate()}`,
      minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
    })

    reqParams?.insideFilters?.categoryFilter.forEach((category: string) => {
      switch(category){
        case 'A':
          procelInsights.data.a.units.forEach((element: unitType) => { 
            unitsFiltered.push(element) 
          })
          break;
        case 'B':
          procelInsights.data.b.units.forEach((element: unitType) => { 
            unitsFiltered.push(element) 
          })
          break;
        case 'C':
          procelInsights.data.c.units.forEach((element: unitType) => {
            unitsFiltered.push(element)
          })
          break;
        case 'D':
          procelInsights.data.d.units.forEach((element: unitType) => {
            unitsFiltered.push(element)
          })
          break;
        case 'E':
          procelInsights.data.e.units.forEach((element: unitType) => {
            unitsFiltered.push(element)
          })
          break;
        case 'F':
          procelInsights.data.f.units.forEach((element: unitType) => {
            unitsFiltered.push(element)
          })
          break;
        case 'G':
          procelInsights.data.g.units.forEach((element: unitType) => { 
            unitsFiltered.push(element)
          })
          break;
      }
    });

    units = unitsFiltered.map((element: unitType) => { return element.unit_id })
  }

  const response = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-trends`, {
    units: units.length > 0 ? units : clientsAndUnitsAlloweds.units,
    startDate: reqParams.startDate.substring(0, 10),
    endDate: reqParams.endDate.substring(0, 10),
    days:  Math.floor(((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24)) + 1)
  });

  const responseFormatted =  fillMissingDates(response.data.trendsData, reqParams.startDate, reqParams.endDate);

  return {
    ...response.data,
    trendsData: responseFormatted,
  }

}

function fillMissingDates(trendsData: any[], startDate: string, endDate: string) {
  const filledData = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  while (start <= end) {
    const dateStr = start.toISOString().substring(0, 10);
    const existingData = trendsData.find(d => d.time.startsWith(dateStr));

    if (existingData) {
      filledData.push(existingData);
    } else {
      filledData.push({
        time: dateStr + "T00:00:00",
        consumption: 0,
        consumptionForecast: 0,
        consumptionOverTarget: 0,
        consumptionPercentage: 0,
        consumptionTarget: null,
      });
    }
    start.setDate(start.getDate() + 1);
  }

  return filledData;
}

function returnNull(startDate: string, endDate: string, filterType: string): energyHistResponseType[] {
  const currentStartDate = new Date(startDate.slice(0, -2))
  const currentEndDate = new Date(endDate.slice(0, -2))

  const response = []

  let iter = 0

  if(filterType === 'month'){
    while(currentStartDate <= currentEndDate){
      const time = new Date(startDate.slice(0, -2))
      time.setDate(time.getDate() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: null,
        dataIsProcessed: null,
        totalUnits: 0,
      };
      response.push(findedConsumption)
      currentStartDate.setDate(currentStartDate.getDate() + 1)
      iter += 1
    }
  }
  else{
    currentStartDate.setDate(1)
    while(currentStartDate <= currentEndDate){
      const time = new Date(startDate.slice(0, -2))
      time.setMonth(time.getMonth() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: null,
        dataIsProcessed: null,
        totalUnits: 0,
      };
      response.push(findedConsumption)
      currentStartDate.setMonth(currentStartDate.getMonth() + 1)
      iter += 1
    }
  }

  return response
}

function getParamLisWithInsideFilters(params: paramsWithInsideFiltersType): { clientList: number[], stateList: number[], cityList: string[], unitList: number[] }{
  let clientList: number[] = params.clientIds || []
  let stateList: number[] = params.stateIds || []
  let cityList: string[] = params.cityIds || []
  let unitList: number[] = params.unitIds || []

  if(params.insideFilters?.clientIds?.length > 0){
    clientList = params.insideFilters.clientIds
  }

  if(params.insideFilters?.stateIds?.length > 0){
    stateList = params.insideFilters.stateIds
  }

  if(params.insideFilters?.cityIds?.length > 0){
    cityList = params.insideFilters.cityIds
  }

  if(params.insideFilters?.unitIds?.length > 0){
    unitList = params.insideFilters.unitIds
  }

  return {
    clientList,
    stateList,
    cityList,
    unitList
  }
}

export async function checkClientsAndUnitsAllowed(filter: { clients: number[], units?: number[] }, session: SessionData): Promise<{ clients: number[], units: number[] }> {

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS){
    return {
      clients: filter.clients,
      units: filter.units || []
    }
  }
  
  let unitIds: number[] = []
  let clientIds: number[] = []
  
  if(session.permissions.PER_CLIENT){
    for (const { clientId } of session.permissions.PER_CLIENT) {
      const allUnits = await sqldb.CLUNITS.getAllUnitsByClient({CLIENT_ID: clientId})
      unitIds.push(...(allUnits.map((unit) => { return unit.UNIT_ID })))
      clientIds.push(clientId)
    }
  }
  if(session.permissions.PER_UNIT){
    for (const { clientId, units } of session.permissions.PER_UNIT) {
      unitIds.push(...units)
      clientIds.push(clientId)
    }
  }

  if(unitIds.length === 0 || clientIds.length === 0){
    throw Error('Usuário sem permissão').HttpStatus(400);
  }

  if(filter?.units?.length > 0){
    unitIds = filter.units.filter((unit) => unitIds.includes(unit))
  }
  if(filter.clients.length > 0){
    clientIds = filter.clients.filter((client) => clientIds.includes(client))
  }
  
  return {
    clients: clientIds,
    units: unitIds
  }
}

async function getEnergyAnalysisHistToCompare(filterParams: {startDate: string, endDate: string, filterType: string, units: number[]}, session: SessionData): Promise<energyHistResponseType[]>{
  if(!filterParams.startDate || !filterParams.endDate){
    return []
  }

  let iter = 0
  let iterResponse = 0
  const energyData: energyHistResponseType[] = []

  const startDate = new Date(filterParams.startDate)
  
  const calculatedDate = getCalculatedDate(filterParams.startDate, filterParams.endDate)

  if(filterParams.filterType === 'month'){
    const responseMonth = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-hist`, {
      startDate: filterParams.startDate.substring(0, 10),
      endDate: filterParams.endDate.substring(0, 10),
      filterType: 'month',
      units: filterParams.units,
      isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
      minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
    });
  
    const currentDateMonth = new Date(filterParams.startDate.slice(0, -2))
    const endDateMonth = new Date(filterParams.endDate.slice(0, -2))      

    while(currentDateMonth <= endDateMonth){
      const time = new Date(filterParams.startDate.slice(0, -2))
      time.setDate(time.getDate() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: false,
        dataIsProcessed: false,
        totalUnits: 0,
      };
      if(new Date(responseMonth.data?.energy_data[iterResponse]?.time).getTime() == currentDateMonth.getTime()){
        findedConsumption.consumption = responseMonth.data?.energy_data[iterResponse].consumption;
        findedConsumption.totalCharged = responseMonth.data?.energy_data[iterResponse].totalCharged;
        findedConsumption.dataIsInvalid = responseMonth.data?.energy_data[iterResponse].dataIsInvalid;
        findedConsumption.dataIsProcessed = responseMonth.data?.energy_data[iterResponse].dataIsProcessed;
        findedConsumption.totalUnits = responseMonth.data?.energy_data[iterResponse].totalUnits;
        iterResponse += 1
      }
      energyData.push(findedConsumption)
      currentDateMonth.setDate(currentDateMonth.getDate() + 1)
      iter += 1
    }


    return energyData
  }
    
  const currentDateYear = new Date(filterParams.startDate.slice(0, -2))
  const endDateYear = new Date(filterParams.endDate.slice(0, -2))

  currentDateYear.setDate(1)
  currentDateYear.setMonth(0)
  endDateYear.setDate(31)
  endDateYear.setMonth(12)

  const responseYear = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-analysis-hist`, {
    startDate: `${currentDateYear.getFullYear()}-${currentDateYear.getMonth()}-${currentDateYear.getDate()}`,
    endDate: `${endDateYear.getFullYear()}-${endDateYear.getMonth()}-${endDateYear.getDate()}`,
    filterType: 'year',
    units: filterParams.units,
    isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
    minConsumption: Math.floor((calculatedDate.lastDay.getTime() - startDate.getTime()) / (3600 * 1000 * 24))
  });
  
  while(currentDateYear <= endDateYear){
    const time = new Date(filterParams.startDate.slice(0, -2))
      time.setMonth(time.getMonth() + iter)
      const findedConsumption: energyHistResponseType = {
        time,
        consumption: null,
        totalCharged: null,
        dataIsInvalid: false,
        dataIsProcessed: false,
        totalUnits: 0,
      };
      const date = new Date(responseYear.data?.energy_data[iterResponse]?.time)
      date.setDate(1)
      if(date.getTime() == currentDateYear.getTime()){
        findedConsumption.consumption = responseYear.data?.energy_data[iterResponse].consumption;
        findedConsumption.totalCharged = responseYear.data?.energy_data[iterResponse].totalCharged;
        findedConsumption.dataIsInvalid = responseYear.data?.energy_data[iterResponse].dataIsInvalid;
        findedConsumption.dataIsProcessed = responseYear.data?.energy_data[iterResponse].dataIsProcessed;
        findedConsumption.totalUnits = responseYear.data?.energy_data[iterResponse].totalUnits;
        iterResponse += 1
      }
      energyData.push(findedConsumption)
      currentDateYear.setMonth(currentDateYear.getMonth() + 1)
      iter += 1
    }

  return energyData
}

async function energyFilterQueryData(params: energyFilterParams, type: energyFilterQueryType) {
  const units = await sqldb.CLUNITS.getEnergyFilterData(params);
  const filters: { id: any, name: string }[] = []
  switch (type){
    case energyFilterQueryType.CLIENT:
      units.forEach((element) => {    
        filters.push({ id: element.CLIENT_ID, name: element.CLIENT_NAME })
      })
      break;
    case energyFilterQueryType.STATE:
      units.forEach((element) => {    
        filters.push({ id: element.STATE_ID, name: element.STATE_NAME })
      })
      break;
    case energyFilterQueryType.CITY:
      units.forEach((element) => {    
        filters.push({ id: element.CITY_ID, name: element.CITY_NAME })
      })
      break;
    case energyFilterQueryType.UNIT:
      units.forEach((element) => {    
        filters.push({ id: element.UNIT_ID, name: element.UNIT_NAME })
      })
      break;
  }

  const map = new Map()
  const response: { id: any, name: string }[] = []

  filters.forEach((element) => {
    if(!map.has(element.id) && element.id !== null) {
      map.set(element.id, true)
      response.push(element)
    }
  });

  return response
}

const getInvoiceUnit = async (unitId: number, startPeriodstring: string, endPeriod: string) => {

  const dynamoFetcher = dynamoDbHelper.prepareQuery({
    tableName: 'UnitInvoices',
    selectedPropsList: null,
    partKeyName: 'unit_id',
    sortKeyName: 'invoice_date',
    partKeyValue: unitId.toString(),
    ...dynamoDbHelper.sortCompar_betweenInc({
      date_begin: startPeriodstring,
      date_end: endPeriod,
    })
  });

  const resultsPage = await dynamoFetcher.getPage();
  let totalCharged = 0;

  if (resultsPage.Items.length === 0) return null
  
  for (const item of resultsPage.Items) {
    const invoiceParsed = JSON.parse(item.invoice);
    totalCharged += invoiceParsed.totalCharges
  }

  return `R$ ${totalCharged.toFixed(1)}`
}

const getCapacityUnit = async (UNIT_ID: number): Promise<number> => {
  const unitPowers = await sqldb.CONDENSERS.getUnitCapacity({ UNIT_ID })
  let totalUnitCapacity = 0;
  unitPowers.forEach((item) => totalUnitCapacity += verifyCapacityUnit(item.CAPACITY_POWER))
  return totalUnitCapacity
}

const verifyCapacityUnit = (unit: number): number => {
  if (unit > 100) {
    return unit/12000
  }
  return unit
}


async function returnConsumptionUnit(energyDevs: {
  ID: number, 
  ELECTRIC_CIRCUIT_ID: number,
  ENERGY_DEVICE_ID: string,
  SERIAL: string,
  MODEL: string,
  MANUFACTURER: string
  ESTABLISHMENT_NAME: string
  CLIENT_ID: number
  CLIENT_NAME: string
  UNIT_ID: number
  UNIT_NAME: string
  CITY_NAME: string
  STATE_NAME: string
  STATE_ID: number
  CITY_ID: string
}[], session: SessionData, { start, end }: { start: string, end: string }): Promise<string> {
  if (energyDevs.length === 0) return null

  const timezoneInfo = await getTimezoneInfoByDev({ devId: energyDevs[0].ENERGY_DEVICE_ID });
  const timezoneOffset = timezoneInfo && getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  const devicesEnergy: EnergyDev[] = []; 

  for (const dev of energyDevs) {
    if (dev.ENERGY_DEVICE_ID && dev.MODEL) {
      const devObj = {
        energy_device_id: dev.ENERGY_DEVICE_ID,
        serial: '',
        manufacturer: dev.MANUFACTURER,
        model: dev.MODEL,
        start_time: start,
        end_time: end,
        params: ["en_at_tri"]
      }
      await checkReqParamsandDevInfo(devObj, session, { start, end, addOneHour: false }, devicesEnergy, timezoneOffset, timezoneInfo)
    }
  }

  const resultQueryDevices = []

  for (const dme of devicesEnergy) {
    const result = await rusthistApi['/energy-query'](dme, `/energy/get-hist ${session.user}`);
    resultQueryDevices.push(result);
  }

  const consumptions = []

  for(const { data } of resultQueryDevices) {
    let firstTel = 0
    let lastTel = 0
    if (data.length > 1) {
      firstTel = data[0].en_at_tri
      lastTel = data.pop().en_at_tri;

      consumptions.push(lastTel - firstTel)
    }
  } 

  const total = consumptions.reduce((accumulator, value) => {
    return accumulator + value
  }, 0) 


  return formatResult(total);
}


function formatResult(num: number): string {
  if (num > 1000) {
    return (`${(num / 1000).toFixed(1)} MWh`)
  } 
  return (`${(num.toFixed(1))} kWh`)
}
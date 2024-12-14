import type { API_External } from '../httpApiRouter'
import sqldb from '../../srcCommon/db'
import servConfig from '../../configfile'
import { operatesEcoMode } from '../../srcCommon/helpers/dutAutomation'
import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import { powerConv_kW } from '../../srcCommon/helpers/conversion'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse'
import { MeanTemperature_DAC_DUT_DRI, PeriodData } from '../../srcCommon/types'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import * as dacHist from '../telemHistory/dacHist'
import { lastDayComplete_YMD } from '../../srcCommon/helpers/dates'
import { get_units_power_consumption } from '../integrations/greenAnt'
import { getUnitAutomationSavings } from '../telemHistory/savings'
import { logger } from '../../srcCommon/helpers/logger'
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones'
import * as httpRouter from '../apiServer/httpRouter'
import { type ApiParams } from '../apiServer/httpRouter'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { TemprtAlert, getRtypeTemprtAlert } from '../clientData/units'

export const automationOverviewCard: API_External['/automation-overview-card'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  } 
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.CLIENT_IDS) { reqParams.CLIENT_IDS = allowedClients; }
    reqParams.CLIENT_IDS = reqParams.CLIENT_IDS.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const machinesRows = await sqldb.MACHINES.getMachinesAutInfo2({
    CLIENT_IDS: reqParams.CLIENT_IDS,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }, {});
  const machinesDacs = await sqldb.DACS_DEVICES.getClientMachinesPower({
    dielClientId: servConfig.dielClientId,
    CLIENT_IDS: reqParams.CLIENT_IDS,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  const machinesInfo: {
    [groupId: string]: {
      automDevType: "dac" | "dut" | "dam";
      powerTR: number;
      useEcoMode?: boolean;
      useSchedule?: boolean;
    }
  } = {};

  const reg = new RegExp("\\d\\d:\\d\\d", "gi");

  for (const machine of machinesRows) {
    const groupIdS = machine.MACHINE_ID.toString();
    machinesInfo[groupIdS] = { automDevType: null, powerTR: 0 };
    if (machine.DEV_AUT) {
      if (machine.DAM_AS_DAC) {
        machinesInfo[groupIdS].automDevType = 'dac';
        machinesInfo[groupIdS].useEcoMode = (machine.ENABLE_ECO_DAM === 1 || machine.ENABLE_ECO_DAM === 2) || undefined;
      } else if (machine.DUT_AS_DUTAUT && machine.DUT_AUT_DISABLED !== 1) {
        machinesInfo[groupIdS].automDevType = 'dut';
        machinesInfo[groupIdS].useEcoMode = operatesEcoMode(machine.DUT_AUT_CTRLOPER) || undefined;
      } else {
        machinesInfo[groupIdS].automDevType = 'dam';
        machinesInfo[groupIdS].useEcoMode = (machine.ENABLE_ECO_DAM === 1 || machine.ENABLE_ECO_DAM === 2) || undefined;
      }
      let result;
      if (machine.LASTPROG_DAM && machinesInfo[groupIdS].automDevType !== 'dut') {
        while (result = reg.exec(machine.LASTPROG_DAM)) {
          if ((result[0] !== '00:00') && (result[0] !== '23:59')) {
            machinesInfo[groupIdS].useSchedule = true;
            break;
          }
        }
      }
      if (machine.LASTPROG_DUT && machinesInfo[groupIdS].automDevType === 'dut') {
        while (result = reg.exec(machine.LASTPROG_DUT)) {
          if ((result[0] !== '00:00') && (result[0] !== '23:59')) {
            machinesInfo[groupIdS].useSchedule = true;
            break;
          }
        }
      }
    }
    else if (machine.DUT_AS_DUTAUT && machine.DUT_AUT_DISABLED !== 1) {
      machinesInfo[groupIdS].automDevType = 'dut';
      machinesInfo[groupIdS].useEcoMode = operatesEcoMode(machine.DUT_AUT_CTRLOPER) || undefined;
      if (machine.LASTPROG_DUT) {
        let result;
        while (result = reg.exec(machine.LASTPROG_DUT)) {
          if ((result[0] !== '00:00') && (result[0] !== '23:59')) {
            machinesInfo[groupIdS].useSchedule = true;
            break;
          }
        }
      }
    }
  }

  for (const dac of machinesDacs) {
    if (!dac.MACHINE_ID) continue;
    if (!dac.ASSET_CAPACITY_POWER) continue;
    if (!dac.ASSET_CAPACITY_UNIT) continue;
    if (!powerConv_kW[dac.ASSET_CAPACITY_UNIT]) continue;
    const groupIdS = dac.MACHINE_ID && dac.MACHINE_ID.toString();
    const machine = groupIdS && machinesInfo[groupIdS];
    if (!machine) continue;
    const capacityTR = (dac.ASSET_CAPACITY_POWER / powerConv_kW[dac.ASSET_CAPACITY_UNIT] * powerConv_kW.TR) || 0;
    machine.powerTR += capacityTR;
  }

  const stats = {
    automated: { machines: 0, powerTR: 0 },
    notAutomated: { machines: 0, powerTR: 0 },
    dacAutomation: { machines: 0, powerTR: 0 },
    damAutomation: { machines: 0, powerTR: 0 },
    dutAutomation: { machines: 0, powerTR: 0 },
    scheduleOnly: { machines: 0, powerTR: 0 },
    ecoOnly: { machines: 0, powerTR: 0 },
    scheduleAndEco: { machines: 0, powerTR: 0 },
    noEcoNoSched: { machines: 0, powerTR: 0 },
  }

  for (const machine of Object.values(machinesInfo)) {
    if (machine.automDevType) { stats.automated.machines += 1; stats.automated.powerTR += machine.powerTR; }
    else { stats.notAutomated.machines += 1; stats.notAutomated.powerTR += machine.powerTR; }
    if (!machine.automDevType) continue;
    if (machine.automDevType === 'dac') { stats.dacAutomation.machines += 1; stats.dacAutomation.powerTR += machine.powerTR; }
    if (machine.automDevType === 'dut') { stats.dutAutomation.machines += 1; stats.dutAutomation.powerTR += machine.powerTR; }
    if (machine.automDevType === 'dam') { stats.damAutomation.machines += 1; stats.damAutomation.powerTR += machine.powerTR; }
    if ((machine.useEcoMode) && (machine.useSchedule)) { stats.scheduleAndEco.machines += 1; stats.scheduleAndEco.powerTR += machine.powerTR; }
    if ((machine.useEcoMode) && (!machine.useSchedule)) { stats.ecoOnly.machines += 1; stats.ecoOnly.powerTR += machine.powerTR; }
    if ((!machine.useEcoMode) && (machine.useSchedule)) { stats.scheduleOnly.machines += 1; stats.scheduleOnly.powerTR += machine.powerTR; }
    if ((!machine.useEcoMode) && (!machine.useSchedule)) { stats.noEcoNoSched.machines += 1; stats.noEcoNoSched.powerTR += machine.powerTR; }
  }

  stats.automated.powerTR = Math.round(stats.automated.powerTR);
  stats.notAutomated.powerTR = Math.round(stats.notAutomated.powerTR);
  stats.dacAutomation.powerTR = Math.round(stats.dacAutomation.powerTR);
  stats.damAutomation.powerTR = Math.round(stats.damAutomation.powerTR);
  stats.dutAutomation.powerTR = Math.round(stats.dutAutomation.powerTR);
  stats.scheduleOnly.powerTR = Math.round(stats.scheduleOnly.powerTR);
  stats.ecoOnly.powerTR = Math.round(stats.ecoOnly.powerTR);
  stats.scheduleAndEco.powerTR = Math.round(stats.scheduleAndEco.powerTR);
  stats.noEcoNoSched.powerTR = Math.round(stats.noEcoNoSched.powerTR);

  return {
    automationStats: stats,
    debug_machinesRows: ((reqParams as any).includeDebug && machinesRows),
  }
}

export const healthOverviewCard: API_External['/health-overview-card'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    reqParams.clientIds = reqParams.clientIds ?? allowedClients;
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits) {
      reqParams.unitIds = reqParams.unitIds ?? allowedUnits;
      reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    }
  }

  let devsHealthPower;

  if (reqParams.atDayYMD) {
    devsHealthPower = await sqldb.DEVICES.getClientMachinesHealthPowerAtDate({
      DATELIMIT: Math.floor(new Date(`${reqParams.atDayYMD}T23:59:59-0300`).getTime() / 1000),
      excludeClient: servConfig.dielClientId,
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    });
  } else {
    devsHealthPower = await sqldb.DEVICES.getClientMachinesHealthPower({
      excludeClient: servConfig.dielClientId,
      clientIds: reqParams.clientIds,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: reqParams.unitIds,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    });
  }

  const health = {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    deactiv: 0,
    others: 0,
    // total: 0,
  };
  const powersTR: {[n: string]: number}  = {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    deactiv: 0,
    others: 0,
    // total: 0,
  };

  const hIndexToStr: {[n: number]: keyof typeof health} = {
    0: 'others',
    1: 'others',
    2: 'others',
    4: 'deactiv',
    25: 'red',
    50: 'orange',
    75: 'yellow',
    100: 'green',
  };

  for (const groupedDevs of devsHealthPower) {
    let capacityTR  = 0;
    let healthName = hIndexToStr[groupedDevs.H_INDEX] ?? 'others';
    if (groupedDevs.ASSET_CAPACITY_POWER && powerConv_kW[groupedDevs.ASSET_CAPACITY_UNIT]) {
      capacityTR = (groupedDevs.ASSET_CAPACITY_POWER / powerConv_kW[groupedDevs.ASSET_CAPACITY_UNIT] * powerConv_kW.TR) || 0;
    }
    health[healthName] += groupedDevs.N_DEVICES;
    powersTR[healthName] += capacityTR;
  }

  const powerTR = {
    green: Math.round(powersTR['green']),
    yellow: Math.round(powersTR['yellow']),
    orange: Math.round(powersTR['orange']),
    red: Math.round(powersTR['red']),
    deactiv: Math.round(powersTR['deactiv']),
    others: Math.round(powersTR['others']),
  };

  return { health, powerTR };
}

export const overviewCardRooms: API_External['/overview-card-rooms'] = async function (reqParams, session) {
  // TODO: compilar as estatísticas no final do dia
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const list = (reqParams.days && await overviewCardRooms_history(reqParams)) || undefined;
  const currentData = ((!reqParams.historyOnly) && await overviewCardRooms_current(reqParams)) || undefined;

  return { list, currentData };
}

const getEnvironments = async (dayYMD: string, reqParams: ApiParams['/overview-card-rooms']) => {
  const qPars = {
    INCLUDE_INSTALLATION_UNIT: true,
    dayYMD,
    dayBegMon: new Date(`${dayYMD}T23:59:59.999-0300`).toISOString(),
    excludeClient: servConfig.dielClientId,
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
  };

  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) {
    qPars.INCLUDE_INSTALLATION_UNIT = false;
  }

  const ambientes = await sqldb.cache_cond_tel.getCompiledRoomMeanTp(qPars);
  return ambientes;
}

type Temperature = {
  day: string;
  high: number;
  low: number;
  good: number;
  others: number;
  invisible: number;
  dutsList: {
      DEV_ID: string;
      ROOM_NAME: string;
      TUSEMIN: number;
      TUSEMAX: number;
      HUMIMIN: number;
      HUMIMAX: number;
      med: number;
      max: number;
      min: number;
      temprtAlert: 'low' | 'high' | 'good' | null;
  }[];
};

type RTypeSched = {
  TUSEMAX: number;
  TUSEMIN: number;
  HUMIMAX: number;
  HUMIMIN: number;
  CO2MAX: number;
  fullProg: scheduleData.FullProg_v4;
  current: PeriodData;
  todayEvents: scheduleData.ProgEventItem[];
}

const handleTemperatureAlert = (rtypeSched: RTypeSched, temperature: Temperature, meantp: Partial<MeanTemperature_DAC_DUT_DRI>, row: Awaited<ReturnType<typeof sqldb.cache_cond_tel.getCompiledRoomMeanTp>>[number]) => {

  let temprtAlert: 'low'|'high'|'good'|null;
  if ((!rtypeSched) || (rtypeSched.TUSEMAX == null) || (rtypeSched.TUSEMIN == null)) {
    temperature.good++;
    temprtAlert = 'good';
  } else {
    if ((row.meantp == null) || (row.meantp === '{}') || (meantp.med == null)) {
      temperature.others++;
      temprtAlert = null;
    } else {
      if (meantp.med < rtypeSched.TUSEMIN) {
        temperature.low++;
        temprtAlert = 'low';
      } else if (meantp.med > rtypeSched.TUSEMAX) {
        temperature.high++;
        temprtAlert = 'high';
      } else {
        temperature.good++;
        temprtAlert = 'good';
      }
    }
  }

  return temprtAlert;
}

const handleEnvLength = (ambientes: Awaited<ReturnType<typeof sqldb.cache_cond_tel.getCompiledRoomMeanTp>>, temperature: Temperature, rtypeSched: RTypeSched, row: Awaited<ReturnType<typeof sqldb.cache_cond_tel.getCompiledRoomMeanTp>>[number], meantp: Partial<MeanTemperature_DAC_DUT_DRI>, temprtAlert: 'low'|'high'|'good'|null) => {
  if (ambientes.length < 30) {
    if (!temperature.dutsList) temperature.dutsList = [];
    temperature.dutsList.push({
      DEV_ID: row.DEV_ID,
      ROOM_NAME: row.ROOM_NAME,
      TUSEMIN: rtypeSched?.TUSEMIN,
      TUSEMAX: rtypeSched?.TUSEMAX,
      HUMIMIN: rtypeSched?.HUMIMIN,
      HUMIMAX: rtypeSched?.HUMIMAX,
      med: meantp.med,
      max: meantp.max,
      min: meantp.min,
      temprtAlert,
    });
  }
}

async function overviewCardRooms_history(reqParams: ApiParams['/overview-card-rooms']) {
  const list = [];
  for (const dayYMD of reqParams.days) {
    const ambientes = await getEnvironments(dayYMD, reqParams);
    const temperature = {
      day: dayYMD,
      high: 0,
      low: 0,
      good: 0,
      others: 0,
      invisible: 0,
      dutsList: undefined as {
        DEV_ID: string
        ROOM_NAME: string
        TUSEMIN: number
        TUSEMAX: number
        HUMIMIN: number
        HUMIMAX: number
        med: number
        max: number
        min: number
        temprtAlert: 'low'|'high'|'good'|null,
      }[],
    }
    for (const row of ambientes) {
      let timezoneOffset = -3;
      if (row.TIMEZONE_ID) {
        timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: row.TIMEZONE_ID, TIMEZONE_AREA: row.TIMEZONE_AREA, TIMEZONE_OFFSET: row.TIMEZONE_OFFSET });
      } 
      if (row.timezoneOffset && timezoneOffset != row.timezoneOffset) continue ;
      
      const fullProg = scheduleData.parseFullProgV4(row.USEPERIOD);
      const current = fullProg && scheduleData.getDayPeriod(fullProg);
      const todayEvents = fullProg && scheduleData.PeriodData_to_EventsList(current, fullProg.ventTime);
      const rtypeSched = {
        TUSEMAX: row.TUSEMAX,
        TUSEMIN: row.TUSEMIN,
        HUMIMAX: row.HUMIMAX,
        HUMIMIN: row.HUMIMIN,
        CO2MAX: row.CO2MAX,
        fullProg,
        current,
        todayEvents,
      };
      if (row.ISVISIBLE !== 1) {
        temperature.invisible++;
        continue;
      }
      const meantp: Partial<MeanTemperature_DAC_DUT_DRI> = jsonTryParse<MeanTemperature_DAC_DUT_DRI>(row.meantp) || {};

      const temprtAlert = handleTemperatureAlert(rtypeSched, temperature, meantp, row);

      handleEnvLength(ambientes, temperature, rtypeSched, row, meantp, temprtAlert);
    }

    list.push(temperature);
  }

  return list;
}

type CurrentData = {
  day: string;
  high: number;
  low: number;
  good: number;
  others: number;
  invisible: number;
  dutsList: {
      DEV_ID: string;
      ROOM_NAME: string;
      TUSEMIN: number;
      TUSEMAX: number;
      tpstats: {
          med: number;
          max: number;
          min: number;
      };
      temprtAlert: 'low' | 'high' | 'good' | null;
  }[];
}
const handleDbListEnv = async (dbList: Awaited<ReturnType<typeof buildEnvsDevsList>>, row: Awaited<ReturnType<typeof buildEnvsDevsList>>[number], currentData: CurrentData, temprtAlert: TemprtAlert) => {
  if (dbList.length < 30) {
    const tpFilter: Parameters<typeof sqldb.cache_cond_tel.getLatestMeanTp>[0] = { timezoneOffset: -3};
    if (row.TIMEZONE_ID) {
      tpFilter.timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: row.TIMEZONE_ID, TIMEZONE_AREA: row.TIMEZONE_AREA, TIMEZONE_OFFSET: row.TIMEZONE_OFFSET });
    }
    tpFilter.devId = row.DEV_ID;
    const tpRows = await sqldb.cache_cond_tel.getLatestMeanTp(tpFilter);
    const tpRow = tpRows[0];
    const dutMeanTp = tpRow && jsonTryParse<MeanTemperature_DAC_DUT_DRI>(tpRow.meantp);
    if (!currentData.dutsList) currentData.dutsList = [];
    currentData.dutsList.push({
      DEV_ID: row.DEV_ID,
      ROOM_NAME: row.ROOM_NAME,
      TUSEMIN: row.TUSEMIN,
      TUSEMAX: row.TUSEMAX,
      tpstats: dutMeanTp,
      temprtAlert: temprtAlert,
    });
  }
}


async function overviewCardRooms_current(reqParams: ApiParams['/overview-card-rooms']) {
  const currentDay = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
  const currentData: CurrentData = {
    day: currentDay,
    high: 0,
    low: 0,
    good: 0,
    others: 0,
    invisible: 0,
    dutsList: undefined as {
      DEV_ID: string
      ROOM_NAME: string
      TUSEMIN: number
      TUSEMAX: number
      tpstats: { med: number, max: number, min: number }
      temprtAlert: 'low'|'high'|'good'|null,
    }[],
  }

  const dbList = await buildEnvsDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    excludeClient: servConfig.dielClientId,
    includeTempLimits: true,
    excludeManuf: true,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  for (const row of dbList) {
    const temprtAlert = row.temprtAlert;
    if (row.ISVISIBLE !== 1){
      currentData.invisible++;
      continue;
    }
    if (!(row.PLACEMENT && ['AMB', 'DUO'].includes(row.PLACEMENT))) continue;

    if (!temprtAlert) {
        currentData.others++;
    } else {
      currentData[temprtAlert]++;
    }

    await handleDbListEnv(dbList, row, currentData, temprtAlert);
  }

  return currentData;
}

export const overviewRoomsList: API_External['/overview-rooms-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (reqParams.unitId) { reqParams.unitIds = [reqParams.unitId]; }
  delete reqParams.unitId;
  if (reqParams.stateId) { reqParams.stateIds = [reqParams.stateId]; }
  delete reqParams.stateId;
  if (reqParams.cityId) { reqParams.cityIds = [reqParams.cityId]; }
  delete reqParams.cityId;

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const dbList = await buildEnvsDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    excludeClient: servConfig.dielClientId,
    SKIP: reqParams.SKIP,
    LIMIT: reqParams.LIMIT,
    includeTempLimits: true,
    excludeManuf: true,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  let totalItems = dbList[0]?.totalItems || 0;
  const list = [];
  for (const regDevRaw of dbList) {
    const { Temperature, status, temprtAlert } = regDevRaw;

    if (!(regDevRaw.PLACEMENT && ['AMB', 'DUO'].includes(regDevRaw.PLACEMENT))) continue;
    const regDev = Object.assign(regDevRaw, {
      status,
      Temperature: Temperature || undefined,
      temprtAlert,
    });

    list.push(regDev);
  }

  return { list, totalItems };
}

export const energyEfficiencyOverviewCard: API_External['/energy-efficiency-overview-card'] = async function (reqParams, session) {
  // const tsIni1 = Date.now();
  // logger.info('DBG211.1', (Date.now() - tsIni1) / 1000);
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }
  const unitsList = await sqldb.CLUNITS.getUnitsList2({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
    excludeClient: servConfig.dielClientId,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  }, { onlyWithGA: true });

  const dayStartD = new Date(reqParams.dayStart + 'Z');
  const dayEndD = new Date(dayStartD.getTime() + (reqParams.numDays - 1) * 24 * 60 * 60 * 1000);
  const dayEnd = dayEndD.toISOString().substr(0, 10);

  const result = {
    savings: { price: 0 },
    greenAntConsumption: { price: 0, kwh: 0 },
    condenserConsumption: { price: 0, kwh: 0 },
    unhealthyConsumption: { kwh: 0 },
  };

  // Caso seja o dia atual, entra na requisição com o dia anterior para que seja considerado os dados de L1 dos dacs do último dia compilado
  let dateNow = new Date(dayStartD.getTime());
  let dayToSavings = dateNow.toISOString().substr(0, 10);
  const lastDayComplete = lastDayComplete_YMD();
  if (dayToSavings > lastDayComplete) dayToSavings = lastDayComplete;

  const unitsPowerCons = await get_units_power_consumption(
    reqParams.dayStart,
    dayEnd, unitsList.map((x) => x.GA_METER)
  ).catch((err) => {
    logger.error(err);
    throw new Error(err).HttpStatus(400);
  });
  // let dbgTsGA = 0;
  // let dbgTsSavings = 0;
  // let dbgTsDacCons = 0;
  let i = 0;
  for (const unit of unitsList) {
    i++;
    if (!unit.GA_METER) { continue; }
    if (!servConfig.isProductionServer) { continue; }
    // const tsIniGA = Date.now();
    const consList = unitsPowerCons && unitsPowerCons[unit.GA_METER];
    if (!consList) { continue; }

    let gaCons_kWh = 0;
    let gaCons_price = 0;
    for (const consItem of consList) {
      gaCons_kWh += (consItem.consumedEnergy || 0) / 1000;
      gaCons_price += (consItem.invoice && consItem.invoice.value) || 0;
    }
    // dbgTsGA += (Date.now() - tsIniGA);

    const tarifa = ((!unit.TARIFA_DIEL) && gaCons_kWh && gaCons_price && (gaCons_price / gaCons_kWh)) || unit.TARIFA_KWH || 0;

    // const tsIniSavings = Date.now();
    const savs = await getUnitAutomationSavings(unit.UNIT_ID, dayToSavings, reqParams.numDays, session.user);
    if (savs) {
      result.savings.price += savs * tarifa;
    }
    // dbgTsSavings += (Date.now() - tsIniSavings);

    // const tsIniDacCons = Date.now();
    const machinesDacs = await sqldb.DACS_DEVICES.getClientMachinesHealthPower({ unitIds: [unit.UNIT_ID], INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT });
    let machines_kWh = 0;
    let unhealthyMachines_kWh = 0;
    for (const dac of machinesDacs) {
      const dailyUse = await dacHist.getDailyUsage({ dacId: dac.DAC_ID, datIni: reqParams.dayStart, numDays: reqParams.numDays, DAC_KW: dac.MACHINE_KW });
      for (const cons of dailyUse) {
        machines_kWh += (cons.hoursOn || 0) * (dac.MACHINE_KW || 0);
        if ([25, 50, 75].includes(dac.H_INDEX)) {
          unhealthyMachines_kWh += (cons.hoursOn || 0) * (dac.MACHINE_KW || 0);
        }
      }
    }
    // dbgTsDacCons += (Date.now() - tsIniDacCons);

    result.greenAntConsumption.kwh += gaCons_kWh;
    result.greenAntConsumption.price += gaCons_price;
    result.condenserConsumption.kwh += machines_kWh;
    result.condenserConsumption.price += machines_kWh * tarifa;
    result.unhealthyConsumption.kwh += unhealthyMachines_kWh;
  }

  result.savings.price = Math.round(result.savings.price * 100) / 100;
  result.greenAntConsumption.kwh = Math.round(result.greenAntConsumption.kwh * 100) / 100;
  result.greenAntConsumption.price = Math.round(result.greenAntConsumption.price * 100) / 100;
  result.condenserConsumption.kwh = Math.round(result.condenserConsumption.kwh * 100) / 100;
  result.condenserConsumption.price = Math.round(result.condenserConsumption.price * 100) / 100;
  result.unhealthyConsumption.kwh = Math.round(result.unhealthyConsumption.kwh * 100) / 100;

  // logger.info('DBG211.2', (Date.now() - tsIni1) / 1000, JSON.stringify({ dbgTsGA, dbgTsSavings, dbgTsDacCons }));
  return result;
}

httpRouter.publicRoutes['/diel-site-our-numbers'] = async function (reqParams, nosession) {
  // Dispositivos conectados
  // TRs monitorados
  // TRs automatizados
  const [
    { DEVS_COUNT: connectedDevices },
    clientDacs,
  ] = await Promise.all([
    sqldb.DEVICES.getClientDevsCount({ dielClientId: servConfig.dielClientId }),
    sqldb.DACS_DEVICES.getClientTRs({ dielClientId: servConfig.dielClientId }),
  ]);

  let monitoredTRs = 0;
  // let monitoredMachines: { [k: string]: true } = {};
  let monitoredMachines = 0;
  let automatedTRs = 0;
  // let automatedMachines: { [k: string]: true } = {};
  let automatedMachines = 0;

  for (const row of clientDacs) {
    // if (!row.GROUP_ID) continue;

    let capacityTR = 0;
    if (row.ASSET_CAPACITY_POWER && row.ASSET_CAPACITY_UNIT && powerConv_kW[row.ASSET_CAPACITY_UNIT]) {
      capacityTR = (row.ASSET_CAPACITY_POWER / powerConv_kW[row.ASSET_CAPACITY_UNIT] * powerConv_kW.TR) || 0;
    }

    monitoredTRs += capacityTR;
    // monitoredMachines[row.GROUP_ID.toString()] = true;
    monitoredMachines += 1;
    if (row.MACHINE_DEV_AUT || (row.DUT_AUT_DISAB === 0)) {
      automatedTRs += capacityTR;
      // automatedMachines[row.GROUP_ID.toString()] = true;
      automatedMachines += 1;
    }
  }

  return {
    connectedDevices,
    monitoredTRs: Math.round(monitoredTRs),
    monitoredMachines: monitoredMachines, // Object.values(monitoredMachines).length,
    automatedTRs: Math.round(automatedTRs),
    automatedMachines: automatedMachines, // Object.values(automatedMachines).length,
    meanSavings: 15,
  }
}

httpRouter.privateRoutes['/online-devices-overview'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const allDevs = await sqldb.DEVICES.getClientDevsList({
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    dielClientId: servConfig.dielClientId,
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
  });
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (allDevs.length <= 500) ? allDevs.map((x) => x.DEV_ID) : undefined,
  });
  const stats = {
    onlineDevs: 0,
    offlineDevs: 0,
  }
  for (const row of allDevs) {
    if (['ONLINE','LATE'].includes(lastMessagesTimes.connectionStatus(row.DEV_ID))) {
      stats.onlineDevs++;
    } else {
      stats.offlineDevs++;
    }
  }
  return stats;
}

const buildEnvsDevsList = async function (reqParams: {
  clientIds?: number[],
  unitIds?: number[],
  stateIds?: number[],
  cityIds?: string[],
  excludeClient?: number,
  SKIP?: number,
  LIMIT?: number,
  includeTempLimits?: boolean,
  excludeManuf?: boolean,
  INCLUDE_INSTALLATION_UNIT?: boolean,
}) {
  const dbList = await sqldb.DUTS.buildRoomsDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    excludeClient: servConfig.dielClientId,
    SKIP: reqParams.SKIP,
    LIMIT: reqParams.LIMIT,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });
  const lastTelemetries = await devsLastComm.loadLastTelemetries({
    devIds: (dbList.length <= 500) ? dbList.map((x) => x.DEV_ID) : undefined,
  });

  const response = dbList.map((row) => {
    if (row.DEV_ID.startsWith('DUT')) {
      const dev = lastTelemetries.lastDutTelemetry(row.DEV_ID);
      const status = (dev && dev.status) || 'OFFLINE';
      const temp = ((status !== 'OFFLINE') && dev && (dev.lastTelemetry?.Temperature)) || null;
      const temprtAlert = getRtypeTemprtAlert(row, temp);
      return { ...row, Temperature: temp, status, temprtAlert };
    }
    if (row.DEV_ID.startsWith('DRI')) {
      const dev = lastTelemetries.lastDriTelemetry_raw(row.DEV_ID);
      const status = (dev && dev.status) || 'OFFLINE';
      const temp = ((status !== 'OFFLINE') && dev && (dev.lastTelemetry?.TempAmb)) || null;
      const temprtAlert = getRtypeTemprtAlert(row, temp);
      return { ...row, Temperature: temp, status, temprtAlert };
    }
    return null;
  });
  return response.filter((row) => row);
}

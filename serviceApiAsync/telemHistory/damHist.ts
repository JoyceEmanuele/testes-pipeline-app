import { processDamDay } from '../dayCompilers/dam'
import { processDacDay } from '../dayCompilers/dac'
import { processDutDay } from '../dayCompilers/dut'
import sqldb from '../../srcCommon/db'
import * as httpApiRouter from '../httpApiRouter';
import { API_private2 } from '../../srcCommon/types/api-private'
import * as dacData from '../../srcCommon/helpers/dacData'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo'
import { convertStringHistory, mergeEventsList, parseCompressedChartData, parseCompressedChartDataS2 } from '../../srcCommon/helpers/chartDataFormats'
import { getDamEcoHist, getDacsL1Hist } from '../../srcCommon/helpers/savings';
import { addDays_YMD } from '../../srcCommon/helpers/dates'
import { get_unit_power_consumption } from '../integrations/greenAnt'
import { CompiledHistoryVar, SessionData } from '../../srcCommon/types'
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { logger } from '../../srcCommon/helpers/logger';
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';
import { getOffsetTimezone } from '../../srcCommon/helpers/timezones';
import { getHumidity } from './dutHist';
import { parseFirmwareVersion, versionIsAtLeast } from '../../srcCommon/helpers/fwVersion';

const getDutAutFreshData = async (dutsTemprt: any[], devId: string, day: string, requestDevId: string, requestUnitId: number, session: SessionData) => {
  const dutAutFreshInf = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });
  const fwVersion = await sqldb.DEVFWVERS.getDevFwInfo({ devId });
  const showOnDemandInfos = fwVersion && versionIsAtLeast(parseFirmwareVersion(fwVersion.CURRFW_VERS), 2, 5, 1);

  let data = await processDutDay({ motivo: `/get-autom-day-charts-data P1 ${session.user}`, dutId: devId, day: day, hType: "TelemetryCharts", dutExtInf: { RTYPE_ID: dutAutFreshInf.RTYPE_ID, UNIT_ID: requestUnitId } });
  
  if (!data) data = {};

  if (data.Mode) { data.Mode = data.Mode.replace(/AUTO/g, "Auto"); }
  let daySched = undefined;
  const dutSched = dutAutFreshInf.DESIREDPROG && scheduleData.parseFullProgV4(dutAutFreshInf.DESIREDPROG);
  const daySchedData = dutSched && scheduleData.getDayPeriod(dutSched, day);
  if (daySchedData) {
    daySched = {
      TUSEMAX: dutAutFreshInf.TUSEMAX,
      TUSEMIN: dutAutFreshInf.TUSEMIN,
      indexIni: daySchedData.indexIni,
      indexEnd: daySchedData.indexEnd,
      ...(showOnDemandInfos && {
        MODE: dutAutFreshInf.MODE,
        ACTION_MODE: dutAutFreshInf.ACTION_MODE,
        ACTION_POST_BEHAVIOR: dutAutFreshInf.ACTION_POST_BEHAVIOR,
        LTI: dutAutFreshInf.LTI,
      }),
    };
  }

  const Temperature = data.Temp && parseCompressedChartData(data.Temp);
  const Temperature_1 = data.Temp1 && parseCompressedChartData(data.Temp1);
  const dutL1 = data.L1 && parseCompressedChartData(data.L1);
  
  dutsTemprt.push({
    dutId: requestDevId,
    Temperature,
    Temperature_1,
    l1: dutL1,
    daySched,
  });

  return data;
}

const getTelemetryDutDuo = async (dutsTemprt: any[],  day: string, requestDevId: string, session: SessionData) => {
  const damMachines = await sqldb.MACHINES.getMachinesList({ DEV_AUT: requestDevId });
  
  for (const machine of damMachines) {
    if(machine.MACHINE_ID) {      
      const machineDutDuo = await sqldb.DUTS_DUO.getDutDuoByMachineId({ MACHINE_ID: machine.MACHINE_ID });
      if (machineDutDuo?.DUT_DUO_CODE){
        const { Temperature, Temperature_1, L1, daySched } = await httpApiRouter.externalRoutes['/dut/get-day-charts-data']({
          devId: machineDutDuo?.DUT_DUO_CODE,
          day,
          selectedParams: ['Temperature', 'Temperature_1', 'L1'],
        }, session);

        // flag criada exclusivamente para casos em que as temperaturas nos gráficos dos DAMS foram validados incorretamente.
        // anteriormente o comportamento esperado era que no gráfico as variáveis de temperaturas fossem invertidas quando
        // o sensor_autom fosse = 0, pois aqui mandava sem inverter mas no front invertia sempre, então 
        // foi alinhado para que esses casos já validados até o momento atual dessa correção continuem mostrando invertidos.
        // Mas os novos casos já irão parar de inverter tanto no API-Server quanto no front pois no front foi removido e aqui cairá no else.
        if (machineDutDuo.INVERT_TEMPERATURES) {
          dutsTemprt.push({
            dutId: machineDutDuo?.DUT_DUO_CODE,
            Temperature: Temperature_1,
            Temperature_1: Temperature,
            l1: L1,
            isDutDuo: true,
            daySched,
          });
        } else {
          dutsTemprt.push({
            dutId: machineDutDuo?.DUT_DUO_CODE,
            Temperature,
            Temperature_1,
            l1: L1,
            isDutDuo: true,
            daySched,
          });
        }
        
        break;
      }
    }
  }
}

const getOthersDevicesData = async (dutsTemprt: any[], devId: string, day: string, requestDevId: string, requestUnitId: number, session: SessionData) => {
  const isDac = devId.startsWith('DAC');
  let damTemperatureCompress;
  let damTemperature1Compress;
  let damTemperature;
  const damFreshInf = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId });
  let dataOthersDevices;
  if (isDac) {
    const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
    const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
    const dac = { devId, hwCfg };
    dataOthersDevices = await processDacDay({ motivo: `/get-autom-day-charts-data P2 ${session.user}`, dac, day: day, hType: 'L1-Charts&Stats', dacExtInf: { DAC_APPL: dacInf.DAC_APPL, GROUP_ID: dacInf.GROUP_ID, UNIT_ID: requestUnitId } });
 
  } else {
    dataOthersDevices = await processDamDay({ motivo: `/get-autom-day-charts-data P3 ${session.user}`, damId: devId, day: day, unitId: requestUnitId });
    damTemperatureCompress = dataOthersDevices.Temperature;
    damTemperature1Compress = dataOthersDevices.Temperature_1;

  }

  if (!dataOthersDevices) dataOthersDevices = {};

  const damMachines = await sqldb.MACHINES.getMachinesList({ DEV_AUT: requestDevId });
  for (const machine of damMachines) {
    if (damFreshInf.SELF_REFERENCE === 1) {
      const formatedTemperature = damTemperatureCompress && parseCompressedChartData(damTemperatureCompress);
      damTemperature = formatedTemperature; 
    }
    else {

      if (!machine.DUT_ID) continue;
      const { Temperature, Temperature_1, L1, daySched } = await httpApiRouter.externalRoutes['/dut/get-day-charts-data']({
        devId: machine.DUT_ID,
        day,
        selectedParams: ['Temperature', 'Temperature_1', 'L1'],
      }, session);
      dutsTemprt.push({
        dutId: machine.DUT_ID,
        Temperature,
        Temperature_1,
        l1: L1,
        daySched,
      });
      break;
    }
  }

  await getTelemetryDutDuo(dutsTemprt, day, requestDevId, session);

  return {dataOthersDevices, damTemperatureCompress, damTemperature1Compress};
}
const getAutomData = async (day: string, devId: string, requestDevId: string, requestUnitId: number, session: SessionData) => {
  const isDutAut = devId.startsWith('DUT');

  let data;
  let damTemperatureCompressFinal;
  let damTemperature1CompressFinal;
  const dutsTemprt: any[] = [];
  const dutAutFreshInf = isDutAut ? (await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId })) : undefined;

  if (dutAutFreshInf) {
    data = await getDutAutFreshData(dutsTemprt, devId, day, requestDevId, requestUnitId, session);

  } else {
    const {dataOthersDevices, damTemperatureCompress, damTemperature1Compress} = await getOthersDevicesData(dutsTemprt, devId, day, requestDevId,requestUnitId, session);
    data = dataOthersDevices;
    damTemperatureCompressFinal = damTemperatureCompress;
    damTemperature1CompressFinal = damTemperature1Compress;
  }

  return { damTemperatureCompress: damTemperatureCompressFinal, damTemperature1Compress: damTemperature1CompressFinal, data, dutsTemprt };
}

const fixSetpoint = async (day: string, devId: string, requestDevId: string) => {
  const setpointHist = {v: [], c: [], labels: []} as {
    v: number[],
    c: number[],
    labels: string[]
  };
  const machineInfo = await sqldb.DEVICES.getDevSchedInfo({DEV_ID: requestDevId});
  if (!machineInfo) return setpointHist;

  let timezoneOffset = -3;
  const timezoneInfo = await getTimezoneInfoByDev({ devId: devId });
  if (timezoneInfo != null) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }
  const machineSetpointHistory = await sqldb.MACHINES_SETPOINTS_AUTOMATION_HIST.getSetpointsToTelemetry({MACHINE_ID: machineInfo.MACHINE_ID, dateStart: day, dateEnd: day, timezoneOffset: timezoneOffset})
  

  machineSetpointHistory.forEach((item, i) => {
    let secsToAdd = 0;
    // Se início do primeiro registro é do dia atual, preenche horário anterior com nulo
    if (i === 0 && item.FULL_START_DATE > `${day} 00:00:00`) {
      secsToAdd = item.SECONDS_START;
      setpointHist.v.push(null);
      setpointHist.c.push(secsToAdd);
    }
    // Se entre dois registros existir gap de horário, preenche com nulo
    if (i !== 0 && item.SECONDS_START !== machineSetpointHistory[i-1].SECONDS_END) {
      secsToAdd = item.SECONDS_START - machineSetpointHistory[i-1].SECONDS_END;
      setpointHist.v.push(null);
      setpointHist.c.push(secsToAdd);
    }

    secsToAdd = (item.FULL_END_DATE && item.FULL_END_DATE <= `${day} 23:59:59` ? item.SECONDS_END : 86400) - (item.FULL_START_DATE >= `${day} 00:00:00` ? item.SECONDS_START : 0);
    setpointHist.v.push(item.SETPOINT);
    setpointHist.c.push(secsToAdd);
  });
  return setpointHist;
};


const getDamSelfRefInfo = async (devId: string) => {
  const damFreshInf = devId.startsWith('DUT') ? undefined : (await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId }));

  return damFreshInf?.SELF_REFERENCE ? {
    MAXIMUM_TEMPERATURE: damFreshInf.MAXIMUM_TEMPERATURE || 0,
    MINIMUM_TEMPERATURE: damFreshInf.MINIMUM_TEMPERATURE || 0,
    SETPOINT: damFreshInf.SETPOINT || 0,
  } : undefined;
}

const checkDevRealloc = async (requestDevId: string, day: string) =>  {
  let devId = requestDevId;

  // Verifica se há registro de histórico de movimentação de dispositivo que automatiza a máquina atualmente, para considerar outro dispositivo se necessário
  const automationInfo = await sqldb.AUTOM_GROUPS_HISTORY.getDevGroupToRealocationHistory({ DEV_ID: requestDevId });
  // Se o dispositivo automatiza mais de uma máquina, não utilizará essa estratégia
  if (automationInfo.length === 1) {
    const automDevs = await sqldb.AUTOM_GROUPS_HISTORY.getDevsToTelemetry({ GROUP_ID: automationInfo[0].GROUP_ID, dateStart: day, dateEnd: day })
    // Se houver mais de um dispositivo para o mesmo dia (dia que houve troca de dispositivo), foi decidido considerar apenas o mais recente para o dia.
    devId = automDevs.length > 0 ? automDevs[automDevs.length - 1].DEV_ID : devId;
  }

  return devId;
}

const getRequestedUnitId = async (requestDevId: string) => {
  let requestUnitId;
  if (requestDevId.startsWith('DUT')) {
    const dutInf = await sqldb.AUTOM_EVAP.getUnitByDevCode({ DUT_ID: requestDevId });
    requestUnitId = dutInf?.UNIT_ID;
  } else {
    const damInf = await sqldb.DAMS.getDamBasicInfo({ devId: requestDevId });
    requestUnitId = damInf?.UNIT_ID;
  }

  return requestUnitId;
}

const basicValidations = (day: string, devId: string) => {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(day)) throw Error('Invalid day').HttpStatus(400)
  
  if (!devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400);
  if (!day) throw Error('Invalid parameters! Missing day').HttpStatus(400);
}

const getFormattedData = async (devId: string, day: string, data: any, damTemperatures: { damTemperatureCompress: string, damTemperature1Compress: string }, LASTPROG: string, CLIENT_ID: number, requestUnitId: number, rusthistDebug: { motivo: string }) => {
  const isDutAut = devId.startsWith('DUT');
  const isDac = devId.startsWith('DAC');

  const dayNext = addDays_YMD(day, 1);
  const ecoCmds = await getDamEcoHist(day, dayNext, [devId]);
  const dayEcoCmds = ecoCmds?.[devId]?.[day];

  const { schedChart } = getDamDaySchedChart(LASTPROG, day);

  if (dayEcoCmds?.v?.length) {
    for (let i = 0; i < dayEcoCmds.v.length; i++) {
      if (dayEcoCmds.v[i] == null) dayEcoCmds.v[i] = 'Sem eco';
    }
  }

  const { damTemperatureCompress, damTemperature1Compress } = damTemperatures;

  const formatted = {
    prog: schedChart,
    damTemperature: damTemperatureCompress && parseCompressedChartData(damTemperatureCompress),
    damTemperature_1: damTemperature1Compress && parseCompressedChartData(damTemperature1Compress),
    Mode: data.Mode && parseCompressedChartDataS2(data.Mode, ['Manual', 'Auto']),
    State: data.State && parseCompressedChartDataS2(data.State, isDutAut ? ['Disabled', 'Ventilation', 'Enabled'] : ['Disabled', 'Ventilation', 'Condenser 1', 'Condenser 2', 'Enabled']),
    ecoCmd: dayEcoCmds && convertStringHistory(dayEcoCmds, isDutAut ? ['Disabled', 'Ventilation', 'Sem eco'] : ['Disabled', 'Ventilation', 'Condenser 1', 'Condenser 2', 'Sem eco']),
    provision_error: data.provision_error,
    humidity: !isDutAut && !isDac &&[1, 145].includes(CLIENT_ID) ? await getHumidity(requestUnitId, day, rusthistDebug) : undefined,
  }

  return formatted;
}

const getEnergyInfo = async (day: string, UNIT_ID: number, FU_NOM: number) => {
  const unitInf = UNIT_ID && await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: UNIT_ID });
  const averageTariff = unitInf && unitInf.TARIFA_KWH;
  let greenAntCons_kWh = null;
  if (unitInf && unitInf.GA_METER) {
    const gaCons = await get_unit_power_consumption({ dayStart: day, dayEndInc: day, greenantMeterId: unitInf.GA_METER}).catch((err) => { logger.error(err); return []; });
    for (const item of (gaCons || [])) {
      greenAntCons_kWh = item.consumedEnergy / 1000;
    }
  }
  const unitInfo = {
    greenAntCons_kWh,
    averageTariff,
  };
  const automInfo = {
    FU_NOM: FU_NOM,
  };

  return {unitInfo, automInfo};
}

const getGroupsInfo = async (requestDevId: string) => {
  const groupsInfo = {} as { [groupId: string]: { GROUP_NAME: string } };
  const machinesInfoList = await sqldb.MACHINES.getDamMachines({ DEV_AUT: requestDevId });
  for (const row of machinesInfoList) {
    groupsInfo[row.GROUP_ID.toString()] = {
      GROUP_NAME: row.GROUP_NAME,
    }
  }
  return groupsInfo;
}

const getDacsInfo = async (requestDevId: string) => {
  const machinesInfoList = await sqldb.MACHINES.getDamMachines({ DEV_AUT: requestDevId });

  const dacsInfo = {} as { [dacId: string]: { DAC_KW: number } };
  if (machinesInfoList.length) {
    const machineIds = machinesInfoList.map(machine => machine.GROUP_ID);
    const dacsInfoList = await sqldb.DACS_DEVICES.buildDacsListSentence({ machineIds: machineIds }, {});
    for (const row of dacsInfoList) {
      dacsInfo[row.DAC_ID] = {
        DAC_KW: row.DAC_KW,
      }
    }
  }
  return dacsInfo;
}

const getDevFreshInfo = async (devId: string, session: SessionData) => {
  const isDutAut = devId.startsWith('DUT');

  const dutAutFreshInf = isDutAut ? (await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId })) : undefined;
  const damFreshInf = isDutAut ? undefined : (await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId }));

  const devFreshInf = (damFreshInf || dutAutFreshInf);
  if (!devFreshInf) throw Error('Dispositivo não encontrado').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, devFreshInf.CLIENT_ID, devFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  return devFreshInf;
}

const getValueOrUndefined = (value: number[]) => value || undefined;

const getAsTable = (formatted: Awaited<ReturnType<typeof getFormattedData>>, dacsL1: Awaited<ReturnType<typeof getDacsL1>>) => {
  const varsList: CompiledHistoryVar[] = [
    formatted.prog,
    formatted.Mode,
    formatted.State,
    formatted.ecoCmd,
  ]

  const dacsWithHistNames = [];
  for (const [_, machineDacs] of Object.entries(dacsL1)) {
    for (const [dacId, dacL1Hist] of Object.entries(machineDacs)) {
      if (dacL1Hist) {
        dacsWithHistNames.push(dacId);
        varsList.push(dacL1Hist);
      }
    }
  }

  const asEventsList = mergeEventsList(varsList) as { c: number[], vs: number[][] };
  const asTable = {
    c: asEventsList.c,
    prog: getValueOrUndefined(formatted.prog && asEventsList.vs[0]),
    Mode: getValueOrUndefined(formatted.Mode && asEventsList.vs[1]),
    State: getValueOrUndefined(formatted.State && asEventsList.vs[2]),
    ecoCmd: getValueOrUndefined(formatted.ecoCmd && asEventsList.vs[3]),
    dacsCols: dacsWithHistNames,
    dacsRows: asEventsList.vs.slice(4),
    labels_State: (formatted.State && [...formatted.State.labels]) || undefined,
  };

  return asTable;
}

export const getAutomDayChartsData: API_private2['/get-autom-day-charts-data'] = async function (reqParams, session) {
  // Necessário que em pontos que utiliza o dispositivo para acessar dados da máquina (devgroups), seja considerado o dispositivo atual que veio na requisição

  let devId = reqParams.devId;  
  const day = reqParams.day;

  basicValidations(day, devId);

  const requestDevId = devId;
  const requestUnitId = await getRequestedUnitId(requestDevId);

  devId = await checkDevRealloc(devId, day);

  if (isTemporaryId(devId)) {
    return {
      prog: undefined,
      Mode: undefined,
      State: undefined,
      Temperature: undefined,
      ecoCmd: undefined,
      provision_error: undefined,
      asTable: undefined,
      dacsL1: undefined,
      dutsTemprt: undefined,
      daySched: undefined,
      dacsInfo: undefined,
      groupsInfo: undefined,
      unitInfo: undefined,
      automInfo: undefined,
      damTemperature: undefined,
      damTemperature_1: undefined,
      damSelfRefInfo: undefined,
      setpointHist: undefined,
    };
  }

  const devFreshInf = await getDevFreshInfo(devId, session);

  const { damTemperatureCompress, damTemperature1Compress, data, dutsTemprt } = await getAutomData(reqParams.day, devId, requestDevId, requestUnitId, session);

  const rusthistDebug = { motivo: `/get-autom-day-charts-data ${session.user}`};
  const formatted = await getFormattedData(devId, day, data, {damTemperatureCompress, damTemperature1Compress}, devFreshInf.LASTPROG, devFreshInf.CLIENT_ID, requestUnitId, rusthistDebug);

  const { daySched } = getDamDaySchedChart(devFreshInf.LASTPROG, reqParams.day);

  const dacsL1 = await getDacsL1({ DEV_AUT: requestDevId }, reqParams.day, { motivo: `/get-autom-day-charts-data P4 ${session.user}`});

  const groupsInfo = await getGroupsInfo(requestDevId);

  const dacsInfo = await getDacsInfo(requestDevId);

  const asTable = getAsTable(formatted, dacsL1);

  if (formatted.State) {
    removeTransitory(formatted.State);
  }

  const { automInfo, unitInfo } = await getEnergyInfo(reqParams.day, devFreshInf.UNIT_ID, devFreshInf.FU_NOM);

  const damSelfRefInfo = await getDamSelfRefInfo(devId);

  const setpointHist = await fixSetpoint(day, devId, requestDevId);

  return Object.assign(formatted, { asTable, dacsL1, dutsTemprt, daySched, dacsInfo, groupsInfo, unitInfo, automInfo, damInfo: automInfo, damSelfRefInfo, setpointHist: setpointHist });
}

function getDamDaySchedChart (LASTPROG: string, day: string) {
  // damFreshInf.LASTPROG, reqParams.day
  let daySched = undefined;
  let schedChart = { v: [], c: [], labels: [null] } as {
    v: number[];
    c: number[];
    labels: string[];
  };
  const fullProg = LASTPROG && scheduleData.parseFullProgV4(LASTPROG);
  const daySchedData = fullProg && scheduleData.getDayPeriod(fullProg, day);
  if (daySchedData) {
    daySched = {
      type: daySchedData.permission,
      startHM: daySchedData.start,
      endHM: daySchedData.end,
      indexIni: daySchedData.indexIni,
      indexEnd: daySchedData.indexEnd,
    };
    if ((daySchedData.indexIni != null) && (daySchedData.indexEnd > daySchedData.indexIni)) {
      const inProg = daySchedData.permission;
      const outProg = (inProg === 'allow') ? 'forbid' : (inProg === 'forbid') ? 'allow' : null;
      schedChart.labels.push(outProg || '?');
      schedChart.labels.push(inProg || '?');
      if (daySchedData.indexIni > 0) {
        schedChart.c.push(daySchedData.indexIni * 60);
        schedChart.v.push(1);
      }
      schedChart.c.push((daySchedData.indexEnd - daySchedData.indexIni + 1) * 60);
      schedChart.v.push(2);
      if (daySchedData.indexEnd < 1439) {
        schedChart.c.push((1439 - daySchedData.indexEnd) * 60);
        schedChart.v.push(1);
      }
    }
  }
  return { daySched, schedChart };
}

export function removeTransitory (State: { v: number[], c: number[], labels: string[] }) {
  if (!State) return;
  const conversions: { [k: string]: string } = {
    'Disabling': 'Disabled',
    'Enabling': 'Enabled',
    'Starting Ventilation': 'Ventilation',
    'Enabling Condenser 1': 'Condenser 1',
    'Enabling Condenser 2': 'Condenser 2',
  }
  const transitories = Object.keys(conversions);
  while (true) {
    if (!State.labels.length) return;
    const lastLabel = State.labels[State.labels.length - 1];
    if (!transitories.includes(lastLabel)) return;
    const replaceWithLabel = conversions[lastLabel];
    const iT = State.labels.indexOf(lastLabel);
    const iR = State.labels.indexOf(replaceWithLabel);
    if (!(iR >= 0)) return;
    for (let i = 0; i < State.v.length; i++) {
      if (State.v[i] === iT) {
        State.v[i] = iR;
      }
    }
    State.labels.pop();
  }
}

async function getDacsL1 (automDev: { DEV_AUT: string }, day: string, rusthistDebug: { motivo: string }) {
  const damMachines = {} as {
    [groupId: string]: string[]
  };
  {
    const dacsRows = await sqldb.DACS_DEVICES.getMachineDam(automDev);
    for (const row of dacsRows) {
      const groupId = row.MACHINE_ID.toString();
      if (!damMachines[groupId]) damMachines[groupId] = [];
      damMachines[groupId].push(row.DAC_ID);
    }
  }

  const dayNext = addDays_YMD(day, 1);

  const dacsL1 = {} as {
    [groupId: string]: {
      [dacId: string]: {
        v: number[];
        c: number[];
        hoursOn?: number;
        periodLcmp?: number;
      }
    }
  };
  for (const [groupId, machineDacs] of Object.entries(damMachines)) {
    const dacsL1hist = await getDacsL1Hist(day, dayNext, machineDacs, rusthistDebug);
    dacsL1[groupId] = {};
    for (const dacId of machineDacs) {
      dacsL1[groupId][dacId] = (dacsL1hist[dacId] && dacsL1hist[dacId][day]) || null;
    }
  }

  return dacsL1;
}

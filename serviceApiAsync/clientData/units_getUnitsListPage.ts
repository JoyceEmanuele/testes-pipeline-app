import * as httpRouter from '../apiServer/httpRouter'
import type { ApiParams } from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as machines from './machines'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { adjustUnitsViewFilter, getUnitsAndClients } from '../../srcCommon/helpers/permissionControl'
import { getRtypeTemprtAlert, descOper } from './units'
import { parseDriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';

interface UnitInfo {
  UNIT_ID: number
  UNIT_NAME: string
  CITY_NAME: string
  STATE_ID: string
  CLIENT_NAME: string
  CLIENT_ID: number
  COUNTRY_NAME: string
  TOTAL_CHARGES: number | null
  TOTAL_MEASURED: number | null
  PRODUCTION_TIMESTAMP: string
  dacs: {
    DEV_ID: string
    GROUP_NAME: string
    H_INDEX: number
    H_DESC: string
    insufDutId?: string
    GROUP_ID?: number
    DAT_ID?: string
    DEV_AUTO?: string | null
    status?: string | null
    H_DATE: string
  }[]
  dams: {
    DEV_ID: string
    groupName: string
    autMode: string
    autState: string
  }[]
  duts: {
    DEV_ID: string
    ROOM_NAME: string
    ISVISIBLE: number | null
    Temperature: number
    eCO2: number
    temprtAlert: 'low'|'high'|'good'|null
    PLACEMENT: 'AMB'|'INS'|'DUO'
    isAuto?: boolean
    status?: string | null
    co2Max?: number
  }[]
  vavs: {
    DEV_ID: string,
    GROUP_NAME?: string,
    GROUP_ID?: number,
    ISVISIBLE: number | null
    ROOM_NAME: string,
    Temperature?: number,
    isAuto?: boolean
    temprtAlert: 'low'|'high'|'good'|null,
    status?: string | null,
  }[]
  machineWithoutDevices: {
    MACHINE_NAME: string
    MACHINE_ID: number
    DEV_AUTO?: string
  }[]
}

type DevRow = Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitsAndDevsList>>[number];
type MachinesList = Awaited<ReturnType<typeof sqldb.MACHINES.getAutMachineInfo>>;
type LastMessagesObject = Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>;

httpRouter.privateRoutes['/get-units-list-page'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const adjusted = await getUnitsAndClients({ CLIENT_IDS: reqParams.clientIds ?? [], UNIT_IDS: reqParams.unitIds ?? [] }, session);
    reqParams.clientIds = adjusted.CLIENT_IDS;
    reqParams.unitIds = adjusted.UNIT_IDS;
  }

  const qPars = endpointGetUnitsListPageBuildQPars(reqParams);

  const devsList = await sqldb.CLUNITS.getUnitsAndDevsList(qPars);
  const unitIds = [] as number[];
  devsList.forEach((dev) => {
    if (!unitIds.includes(dev.UNIT_ID)) unitIds.push(dev.UNIT_ID);
  });
  const lastTelemetries = await devsLastComm.loadLastTelemetries({});

  const units = {} as httpRouter.ApiResps['/get-units-list-page']['list'];

  let totalItems = 0;
  if (devsList.length > 0) {
    totalItems = devsList[0].totalItems;
    const machinesList = await sqldb.MACHINES.getAutMachineInfo({ UNIT_IDS: unitIds });
    let index = 0;
    for (const row of devsList) {
      if (!units[row.UNIT_ID]) {
        const [invoiceByUnit] = await sqldb.INVOICES.getLastInvoicesGroupByUnit({ unitIds: [row.UNIT_ID] });
        const [dmaUnit] = await sqldb.DMAS_DEVICES.getList({ unitIds: [row.UNIT_ID] });
        const automationInfo = await sqldb.DEVICES.getAutomDevsList({ unitIds: [row.UNIT_ID] });
        const drisUnit = await sqldb.DRIS_DEVICES.getAllDrisVarsByUnit({ UNIT_ID: row.UNIT_ID });
        const arrayChiller = drisUnit.filter((item) => JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30hxe' || JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30gxe' || JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30hxf' || JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30xab');
        const automationIds = [] as string[];
        automationInfo.forEach((dev) => {
          automationIds.push(dev.DEV_ID);
        });

        units[row.UNIT_ID] = {
          UNIT_ID: row.UNIT_ID,
          UNIT_NAME: row.UNIT_NAME,
          UNIT_CODE_CELSIUS: row.UNIT_CODE_CELSIUS,
          UNIT_CODE_API: row.UNIT_CODE_API,
          CITY_NAME: row.CITY_NAME,
          STATE_ID: row.STATE_ID,
          STATE_ID_KEY: row.STATE_ID_KEY,
          CLIENT_NAME: row.CLIENT_NAME,
          CLIENT_ID: row.CLIENT_ID,
          PRODUCTION: row.PRODUCTION,
          PRODUCTION_TIMESTAMP: row.PRODUCTION_TIMESTAMP,
          COUNTRY_NAME: row.COUNTRY_NAME,         
          TOTAL_CHARGES:  rowCheckTotalCharges(invoiceByUnit), 
          TOTAL_MEASURED: rowCheckTotalMeasured(invoiceByUnit),
          chillers: arrayChiller,
          dmaId: rowCheckDmaId(dmaUnit),
          dacs: [],
          dams: [],
          duts: [],
          vavs: [],
          nobreaks: [],
          illumination: [],
          automation: automationIds,
          machineWithoutDevices: []
        }
      }
      const unit = units[row.UNIT_ID];

      await endpointGetUnitsListPageCheckRowDAC(unit, row, machinesList, lastTelemetries);
      await endpointGetUnitsListPageCheckRowDAM(unit, row, machinesList, lastTelemetries);
      await endpointGetUnitsListPageCheckRowDUT(unit, row, machinesList, lastTelemetries);
      await endpointGetUnitsListPageCheckRowVAV(unit, row, machinesList, lastTelemetries);

      // Quando acabar iteração de uma unidade preenche restante das máquinas
      index++;
      if (index === devsList.length || devsList[index].UNIT_ID !== row.UNIT_ID) {
        await endpointGetUnitsListPageCheckMachinesWithoutDevices(unit, machinesList);
      }
    }
  }
  await endpointGetUnitsListPageCheckUtilities(units, unitIds, lastTelemetries);
  return { list: Object.values(units), totalItems };
}

const endpointGetUnitsListPageBuildQPars = function (reqParams: ApiParams['/get-units-list-page']) {
  const qPars: Parameters<typeof sqldb.CLUNITS.getUnitsAndDevsList>[0] = {};
  qPars.LIMIT = reqParams.LIMIT;
  qPars.SKIP = reqParams.SKIP;
  qPars.startOperation = reqParams.startOperation;
  qPars.endOperation = reqParams.endOperation;

  // 0 = Em instalacao, 1 = Em operacao, 2 = Todas
  if (qPars.status !== '2') {
    qPars.status = reqParams.status;
  }
  if (reqParams.cityIds?.length > 0) qPars.cityIds = reqParams.cityIds;
  if (reqParams.stateIds?.length > 0) qPars.stateIds = reqParams.stateIds;
  if (reqParams.clientIds?.length > 0) qPars.clientIds = reqParams.clientIds;
  if (reqParams.unitIds?.length > 0) qPars.unitIds = reqParams.unitIds;
  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) qPars.INCLUDE_INSTALLATION_UNIT = reqParams.INCLUDE_INSTALLATION_UNIT;

  qPars.searchTerms = reqParams.searchTerms || (reqParams.searchText?.toLowerCase().split('/').map(x => x.trim()).filter(x => !!x));

  return qPars;
}

const endpointGetUnitsListPageCheckRowDAC = async function(unit: UnitInfo, row: DevRow, machinesList: MachinesList, lastTelemetries: LastMessagesObject) {
  if (row.DAC_ID) {
    const lastComms = lastTelemetries.lastDacTelemetry(row.DAC_ID) || undefined;
    const machine = machinesList.find((machine) => machine.MACHINE_ID === row.DAC_MACHINE_ID);
    const insufDutId = unit.duts.find((dut) => {
      if (dut.PLACEMENT === 'INS') {
        const machine = machinesList.find((machine) => (machine.DUT_ID === dut.DEV_ID) && (row.DAC_MACHINE_ID === machine.MACHINE_ID));
        if (machine) return true;
      }
      return false;
    })?.DEV_ID || undefined;
    unit.dacs.push({
      DEV_ID: row.DAC_ID,
      GROUP_NAME: machine?.MACHINE_NAME,
      H_INDEX: row.H_INDEX,
      H_DESC: row.H_DESC,
      H_DATE: row.H_DATE,
      GROUP_ID: row.DAC_MACHINE_ID,
      DAT_ID: row.DAT_ID,
      DEV_AUTO: machine?.DEV_AUT || machines.getAutInfo(machine),
      status: lastComms?.status || 'OFFLINE',
      insufDutId,
    })
  }
}

const endpointGetUnitsListPageCheckRowDAM = async function(unit: UnitInfo, row: DevRow, machinesList: MachinesList, lastTelemetries: LastMessagesObject) {
  if (row.DAM_ID) {
    const dev = lastTelemetries.lastDamTelemetry(row.DAM_ID);
    const lastTelemetry = (dev?.status && (dev.status !== 'OFFLINE') && dev.lastTelemetry) || null;
    unit.dams.push({
      DEV_ID: row.DAM_ID,
      groupName: machinesList.filter(machine => machine.MACHINE_NAME && (machine.DEV_AUT === row.DAM_ID)).map(x => x.MACHINE_NAME).join(', '),
      autMode: lastTelemetry && ((lastTelemetry.Mode === 'Auto') ? 'Automático' : lastTelemetry.Mode),
      autState: lastTelemetry && (descOper[lastTelemetry.State] || lastTelemetry.State),
    });
  }
}

const endpointGetUnitsListPageCheckRowDUT = async function(unit: UnitInfo, row: DevRow, machinesList: MachinesList, lastTelemetries: LastMessagesObject) {
  if (row.DUT_ID) {
    const dev = lastTelemetries.lastDutTelemetry(row.DUT_ID);
    const lastTelemetry = (dev?.status && (dev.status !== 'OFFLINE') && dev.lastTelemetry) || null;
    if (row.PLACEMENT === 'INS') {
      const machine = machinesList.find((machine) => machine.DUT_ID === row.DUT_ID);
      const dac = unit.dacs.find((dac) => dac.GROUP_ID === machine?.MACHINE_ID);
      if (dac) dac.insufDutId = row.DUT_ID;
    }
    unit.duts.push({
      DEV_ID: row.DUT_ID,
      ROOM_NAME: row.DUT_ROOM_NAME,
      ISVISIBLE: row.DUTS_VISIBLE,
      PLACEMENT: row.PLACEMENT as 'AMB'|'INS'|'DUO',
      co2Max: row.CO2MAX,
      Temperature: lastTelemetry?.Temperature,
      eCO2: lastTelemetry?.eCO2,
      temprtAlert: getRtypeTemprtAlert(row, lastTelemetry?.Temperature),
      isAuto: row.DISAB !== 1 && row.PORTCFG !== 'RELAY',
      status: dev?.status || 'OFFLINE',
    });
  }
}

const endpointGetUnitsListPageCheckRowVAV = async function(unit: UnitInfo, row: DevRow, machinesList: MachinesList, lastTelemetries: LastMessagesObject) {
  if (row.VAV_ID) {
    const driCfg = parseDriConfig({ VARSCFG: row.DRI_VARSCFG });
    const dev = lastTelemetries.lastDriTelemetry(row.VAV_ID, driCfg);
    const lastTelemetry = (dev?.status && (dev.status !== 'OFFLINE') && dev.lastTelemetry) || null;
    const machine = machinesList.find((group) => group.DEV_AUT === row.VAV_ID);
    unit.vavs.push({
      DEV_ID: row.VAV_ID,
      GROUP_NAME: machine?.MACHINE_NAME || '',
      GROUP_ID: machine?.MACHINE_ID,
      ISVISIBLE: row.VAVS_VISIBLE,
      ROOM_NAME: row.VAV_ROOM_NAME,
      Temperature: lastTelemetry?.TempAmb,
      isAuto: true,
      temprtAlert: getRtypeTemprtAlert(row, lastTelemetry?.TempAmb),
      status: dev?.status || 'OFFLINE',
    });
  }
}

const endpointGetUnitsListPageCheckUtilities = async function (units: httpRouter.ApiResps['/get-units-list-page']['list'], unitIds: number[], lastTelemetries: LastMessagesObject) {
  if (unitIds && unitIds.length > 0) {
    await endpointGetUnitsListPageCheckNobreak(units, lastTelemetries);
    await endpointGetUnitsListPageCheckIllumination(units, lastTelemetries);
  }
}

const rowCheckTotalCharges = function(invoiceByUnit: {
  UNIT_ID: number;
  UNIT_NAME: string;
  CLIENT_ID: number;
  INVOICE_DATE: string;
  TOTAL_CHARGES: number;
  TOTAL_MEASURED: number;
}){
  return invoiceByUnit ? invoiceByUnit.TOTAL_CHARGES : 0
}

const rowCheckTotalMeasured = function(invoiceByUnit: {
  UNIT_ID: number;
  UNIT_NAME: string;
  CLIENT_ID: number;
  INVOICE_DATE: string;
  TOTAL_CHARGES: number;
  TOTAL_MEASURED: number;
}){
  return invoiceByUnit ? invoiceByUnit.TOTAL_MEASURED : 0 
}

const rowCheckDmaId = function(dmaUnit: {
  DMA_ID: string;
  UNIT_ID: number;
  CLIENT_ID: number;
  UNIT_NAME: string;
  STATE_ID: number;
  CITY_NAME: string;
  CLIENT_NAME: string;
}){
  return dmaUnit ? dmaUnit.DMA_ID : ''  
}

type TEletricPorts = 'F1' | 'F2' | 'F3' | 'F4';

function getStatus(nobreak: {
  ID: number;
  UNIT_ID: number;
  DMT_CODE: string;
  DAT_CODE: string;
  NAME: string;
  MANUFACTURER: string;
  MODEL: string;
  INPUT_VOLTAGE: number;
  OUTPUT_VOLTAGE: number;
  NOMINAL_POTENTIAL: number;
  NOMINAL_BATTERY_LIFE: number;
  INSTALLATION_DATE: string;
  PORT: number;
  PORT_ELETRIC: number;
  UNIT_NAME: string;
}, lastTelemetries: LastMessagesObject) {
  const dmtStatus = lastTelemetries.lastDmtTelemetry(nobreak.DMT_CODE);
  const connection = dmtStatus?.status || null;
  let status = null;
  if (dmtStatus?.lastTelemetry) {
    if (nobreak.PORT_ELETRIC) {
      const portTelemetry = 'F' + nobreak.PORT_ELETRIC as TEletricPorts;
      if (dmtStatus.lastTelemetry[portTelemetry]) {
        status = 'Rede Elétrica';
      }
    } else {
      const portTelemetry = 'F' + nobreak.PORT as TEletricPorts;
      if (dmtStatus.lastTelemetry[portTelemetry]) {
        status = 'Bateria';
      } else {
        status = 'Desligado'
      }
    }
  }
  return { status, connection };
}

async function endpointGetUnitsListPageCheckNobreak(units: httpRouter.ApiResps['/get-units-list-page']['list'], lastTelemetries: LastMessagesObject) {
  const unitkeys = Object.keys(units);
  const nobreakUnit = await sqldb.NOBREAKS.getNobreakInfoListByUnit({ UNIT_IDs: unitkeys.map((id) => Number(id)) });
  if (nobreakUnit) {
    for (const nobreak of nobreakUnit) {
      const { status, connection } = getStatus(nobreak, lastTelemetries);
      units[nobreak.UNIT_ID]?.nobreaks.push({
        DAT_CODE: nobreak.DAT_CODE,
        DMT_CODE: nobreak.DMT_CODE,
        NOMINAL_POTENTIAL: nobreak.NOMINAL_POTENTIAL,
        NOBREAK_NAME: nobreak.NAME,
        NOMINAL_BATERY_LIFE: nobreak.NOMINAL_BATTERY_LIFE,
        INPUT_VOLTAGE: nobreak.INPUT_VOLTAGE,
        OUTPUT_VOLTAGE: nobreak.OUTPUT_VOLTAGE,
        STATUS: status,
        AVERAGEDUR: null,
        AUTON: null,
        CONNECTION: connection,
        NOBREAK_ID: nobreak.ID
      })
    }
  }
}


function getStatusDal(DEVICE_CODE: string, feedback: number, lastTelemetries: LastMessagesObject) {
  let status = null;
  let connection = null;
  const lastComms = lastTelemetries.lastDalTelemetry(DEVICE_CODE);
  if (lastComms) {
    if (lastComms.lastTelemetry?.Feedback && lastComms.lastTelemetry?.Feedback[feedback - 1]) {
      status = 'Ligado';
    } else {
      status = 'Desligado';
    }
    connection = lastComms?.status;
  } else {
    status = 'Desligado';
    connection = 'OFFLINE';
  }
  return { status, connection }
}

function getStatusDmt1(DEVICE_CODE: string, feedback: number, lastTelemetries: LastMessagesObject) {
  let status = null;
  let connection = null;
  const lastComms = lastTelemetries.lastDmtTelemetry(DEVICE_CODE);
  const portTelemetry = 'F' + feedback as TEletricPorts;
  if (lastComms) {
    if (lastComms.lastTelemetry && lastComms.lastTelemetry[portTelemetry]) {
      status = 'Ligado';
    } else {
      status = 'Desligado';
    }
    connection = lastComms?.status;
  } else {
    connection = 'OFFLINE';
  }
  return { status, connection };
}

function getStatusIllumination(DEVICE_CODE: string, feedback: number, lastTelemetries: LastMessagesObject) { 
  if (DEVICE_CODE?.startsWith('DAL')) {
    const { status, connection } = getStatusDal(DEVICE_CODE, feedback, lastTelemetries);
    return { status, connection };
  }

  if (DEVICE_CODE?.startsWith('DMT')) {
    const { status, connection } = getStatusDmt1(DEVICE_CODE, feedback, lastTelemetries);
    return { status, connection };
  }
  return { status: null, connection: null };
}

async function endpointGetUnitsListPageCheckIllumination(units: httpRouter.ApiResps['/get-units-list-page']['list'], lastTelemetries: LastMessagesObject) {
  const unitkeys = Object.keys(units);
  const illuminationUnit = await sqldb.ILLUMINATIONS.getAllIlluminationListByUnit({ UNIT_IDs: unitkeys.map((id) => Number(id)) });
  if (illuminationUnit) {
    for (const illumination of illuminationUnit) {
      const { status, connection } =  getStatusIllumination(illumination.DEVICE_CODE, illumination.FEEDBACK, lastTelemetries);
      units[illumination.UNIT_ID].illumination?.push({
        ID: illumination.ID,
        NAME: illumination.NAME,
        UNIT_ID: illumination.UNIT_ID,
        GRID_VOLTAGE: illumination.GRID_VOLTAGE,
        GRID_CURRENT: illumination.GRID_CURRENT,
        FEEDBACK: illumination.FEEDBACK,
        CONNECTION: connection,
        STATUS: status,
        DEVICE_CODE: illumination.DEVICE_CODE
      })
    }
  }
}

async function endpointGetUnitsListPageCheckMachinesWithoutDevices(unit: UnitInfo, machinesList: MachinesList) {
  const machinesWithDevices: number[] = [];
  const filteredMachinesList = machinesList.filter(item => item.UNIT_ID === unit.UNIT_ID);
  unit.dacs.forEach(dac => machinesWithDevices.push(dac.GROUP_ID));
  filteredMachinesList.forEach(machine => {
    if (!machinesWithDevices.includes(machine.MACHINE_ID)) {
      unit.machineWithoutDevices?.push({
        MACHINE_NAME: machine.MACHINE_NAME,
        MACHINE_ID: machine.MACHINE_ID,
        DEV_AUTO: machine.DEV_AUT
      })
    }
  });
}

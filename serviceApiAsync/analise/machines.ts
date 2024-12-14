import * as httpRouter from '../apiServer/httpRouter';
import { SessionData } from "../../srcCommon/types";
import { logger } from 'elastic-apm-node';
import sqldb from '../../srcCommon/db';
import { canSeeDevicesWithoutProductionUnit, getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl';
import { checkClientsAndUnitsAllowed } from '../energyHist';
import { verifyDutMultScheduleByDay } from '../../srcCommon/helpers/automationControl';
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { createXlsx } from '../../srcCommon/helpers/parseXlsx';

async function verifyPermissionsUserToAnalyse(reqParams: {
  clientIds?: number[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}, session: SessionData) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    return { allowedClients: [], allowedUnits: [] };
  }
  const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
  if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
  reqParams.clientIds = reqParams.clientIds.filter((x: number) => allowedClients.includes(Number(x)));
  if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
  if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter((x: number) => allowedUnits.includes(x));
  const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
  if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  return { allowedClients, allowedUnits };
}

/**
 * @swagger
 * /unit/get-list-analyse-machines:
 *   post:
 *     summary: Lista de máquinas
 *     description: Lista de máquinas
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros
 *         schema:
 *           type: object
 *           properties:
 *             INCLUDE_INSTALLATION_UNIT:
 *               type: boolean
 *               description: Incluir unidade de instalação na exportação
 *               default: false
 *               required: false
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs dos clientes para filtrar a lista
 *               required: false
 *             stateIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs dos estados para filtrar
 *               required: false
 *             cityIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs das cidades para filtrar
 *               required: false
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das unidades para filtrar a lista
 *               required: false
 *             groupIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das máquinas para filtrar a lista
 *               required: false
 *             machinesTypes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Tipos de máquinas para filtrar a lista
 *               required: false
 *             operation_modes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Modos de operação para filtrar a lista
 *               required: false
 *             health:
 *               type: array
 *               items:
 *                 type: number
 *               description: Índices de saúde para filtrar a lista
 *               required: false
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *               description: Status para filtrar a lista
 *               required: false
 *             ordered:
 *               type: string
 *               description: Ordenar por uma coluna específica
 *               required: false
 *             stateDev:
 *               type: array
 *               items:
 *                 type: string
 *               description: Estado dos dispositivos para filtrar
 *               required: false
 *             typeOrdered:
 *               type: string
 *               description: Tipo de ordenação
 *               required: false
 *             onlyAut:
 *               type: boolean
 *               description: Filtrar para incluir apenas dispositivos automatizados
 *               required: false
 *             tempAmb:
 *               type: array
 *               items:
 *                 type: string
 *               description: Intervalos de temperatura ambiente para filtrar
 *               required: false
 *             offset:
 *               type: string
 *               description: offset para paginacao
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações das Máquinas
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */

type GetResultsMachinesParams =
  | httpRouter.ApiParams['/unit/get-list-analyse-machines']
  | httpRouter.ApiParams['/machines/export-machines-analysis-list'];

async function getResultsMachines(reqParams: GetResultsMachinesParams, session: SessionData, hasOffset: boolean) {
  const { clients, units } = await checkClientsAndUnitsAllowed({
    clients: reqParams.clientIds,
    units: reqParams.unitIds,
  }, session);
  const machinesIds = [...reqParams.groupIds];
  if (reqParams.health?.length) {
    const machinesIdByHealth = await sqldb.ASSETS.getMachinesIds({
      clientIds: clients,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: units,
      machineIds: reqParams.groupIds,
      machinesTypes: reqParams.machinesTypes,
      operation_modes: reqParams.operation_modes,
      health: reqParams.health,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      stateDev: reqParams.stateDev,
      onlyAut: reqParams.onlyAut,
      tempAmb: reqParams.tempAmb,
    });
    machinesIds.push(...machinesIdByHealth.map((item) => item.MACHINE_ID));
  }
  if (reqParams.health?.length && !machinesIds.length) return [];
  const machinesGrouped = await sqldb.MACHINES.getMachinesInfoAnalysis({
    clientIds: clients,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: units,
    machineIds: machinesIds,
    machinesTypes: reqParams.machinesTypes,
    operation_modes: reqParams.operation_modes,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    offset: hasOffset ? reqParams.offset : null,
    ordered: reqParams.ordered,
    typeOrdered: reqParams.typeOrdered,
    onlyAut: reqParams.onlyAut,
    stateDev: reqParams.stateDev,
    tempAmb: reqParams.tempAmb,
  });
  const result = machinesGrouped.map(item => ({
    ...item,
    DUT_MULT_SCHEDULE_DAYS: null as Awaited<ReturnType<typeof verifyDutMultScheduleByDay>>,
    ASSETS: [] as Awaited<ReturnType<typeof sqldb.ASSETS.getListAssetMachinesAnalysis>>
  }));
  const arrayDutIds = machinesGrouped.filter((item) => item.DEV_AUT?.startsWith("DUT")).map((item) => item.DEV_AUT);

  const dutsSchedules = arrayDutIds.length? await sqldb.DUTS_SCHEDULES.getDutScheds({ DUT_IDS: arrayDutIds }) : [];

  for (const machine of result) {
    if (machine.DEV_AUT?.startsWith('DUT')) {
      const dutSchedules = dutsSchedules.filter((sched) => sched.DUT_ID === machine.DEV_AUT);
      machine.DUT_MULT_SCHEDULE_DAYS = verifyDutMultScheduleByDay(dutSchedules);
    }
  }

  const arrayMachineIds = machinesGrouped.map((item) => item.MACHINE_ID);
  const infoAssetsMachines = await sqldb.ASSETS.getListAssetMachinesAnalysis({
    machineIds: arrayMachineIds,
  });
  for (const asset of infoAssetsMachines) {
    const findMachine = result.find((item) => item.MACHINE_ID === asset.MACHINE_ID);
    if (findMachine) {
      findMachine.ASSETS.push(asset);
    }
  }
  return result; 
}

export const getListAnalyseMachinesRoutes = async (reqParams: httpRouter.ApiParams['/unit/get-list-analyse-machines'], session: SessionData) => {
  await verifyPermissionsUserToAnalyse(reqParams, session);
  if (reqParams.offset == null) {
    throw Error("Missing offset").HttpStatus(400);
  }
  try {
    return await getResultsMachines(reqParams, session, true);
  } catch (err) {
    logger.error('Não foi possivel buscar a analise do total, /unit/get-list-analyse-machines', reqParams, session.user);
    throw Error('Erro ao buscar dados de análise de máquinas').HttpStatus(500);
  }
}

httpRouter.privateRoutes['/unit/get-list-analyse-machines'] = getListAnalyseMachinesRoutes;

/**
 * @swagger
 * /unit/get-total-analyse-machines:
 *   post:
 *     summary: Lista de informações totais gerais
 *     description: Lista de informações totais gerais
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros
 *         schema:
 *           type: object
 *           properties:
 *             INCLUDE_INSTALLATION_UNIT:
 *               type: boolean
 *               description: Incluir unidade de instalação na exportação
 *               default: false
 *               required: false
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs dos clientes para filtrar a lista
 *               required: false
 *             stateIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs dos estados para filtrar
 *               required: false
 *             cityIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs das cidades para filtrar
 *               required: false
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das unidades para filtrar a lista
 *               required: false
 *             groupIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das máquinas para filtrar a lista
 *               required: false
 *             machinesTypes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Tipos de máquinas para filtrar a lista
 *               required: false
 *             operation_modes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Modos de operação para filtrar a lista
 *               required: false
 *             health:
 *               type: array
 *               items:
 *                 type: number
 *               description: Índices de saúde para filtrar a lista
 *               required: false
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *               description: Status para filtrar a lista
 *               required: false
 *             ordered:
 *               type: string
 *               description: Ordenar por uma coluna específica
 *               required: false
 *             stateDev:
 *               type: array
 *               items:
 *                 type: string
 *               description: Estado dos dispositivos para filtrar
 *               required: false
 *             typeOrdered:
 *               type: string
 *               description: Tipo de ordenação
 *               required: false
 *             onlyAut:
 *               type: boolean
 *               description: Filtrar para incluir apenas dispositivos automatizados
 *               required: false
 *             tempAmb:
 *               type: array
 *               items:
 *                 type: string
 *               description: Intervalos de temperatura ambiente para filtrar
 *               required: false
 *     responses:
 *       200:
 *         description: Informações gerais da lista
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */

export const getTotalAnalyseMachinesRoutes = async (reqParams: httpRouter.ApiParams['/unit/get-total-analyse-machines'], session: SessionData) => {
  await verifyPermissionsUserToAnalyse(reqParams, session);
  try {
    const { clients, units } = await checkClientsAndUnitsAllowed({
      clients: reqParams.clientIds,
      units: reqParams.unitIds,
    }, session);
    const machinesIds: number[] = [];
    if (!reqParams.health?.length) {
      machinesIds.push(...(await sqldb.ASSETS.machinesSelect({
        clientIds: clients,
        stateIds: reqParams.stateIds,
        cityIds: reqParams.cityIds,
        unitIds: units,
        machineIds: reqParams.groupIds,
        machinesTypes: reqParams.machinesTypes,
        stateDev: reqParams.stateDev,
        onlyAut: reqParams.onlyAut,
        tempAmb: reqParams.tempAmb,
      })).map((item) => item.MACHINE_ID));
    } else {
      const machinesIdByHealth = await sqldb.ASSETS.getMachinesIds({
        clientIds: clients,
        stateIds: reqParams.stateIds,
        cityIds: reqParams.cityIds,
        unitIds: units,
        machineIds: reqParams.groupIds,
        machinesTypes: reqParams.machinesTypes,
        operation_modes: reqParams.operation_modes,
        health: reqParams.health,
        INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
        stateDev: reqParams.stateDev,
        onlyAut: reqParams.onlyAut,
        tempAmb: reqParams.tempAmb,
      });
      machinesIds.push(...machinesIdByHealth.map((item) => item.MACHINE_ID));
    }
    if (reqParams.groupIds?.length) {
      reqParams.groupIds.forEach((item) => {
        if (!machinesIds.includes(item)) {
          machinesIds.push(item);
        }
      })
    }
    if (!machinesIds.length) {
      return {
        TOTAL_CAPACITY_PWR: 0,
        TOTAL_MACHINE_KW: 0,
        TOTAL_ASSETS: 0,
        TOTAL_CITY: 0,
        TOTAL_UNITS: 0,
        TOTAL_STATE: 0,
        TOTAL_MACHINES: 0,
        TOTAL_H_INDEX100: 0,
        TOTAL_H_INDEX50: 0,
        TOTAL_H_INDEX75: 0,
        TOTAL_H_INDEX25: 0,
        TOTAL_H_INDEX2: 0,
        TOTAL_H_INDEX4: 0,
        TOTAL_H_INDEX_NULL: 0,
        TOTAL_ONLINE: 0,
        TOTAL_OFFLINE: 0,
        TOTAL_LATE: 0,
      }
    }
    const totalInfo = await sqldb.ASSETS.getTotalInfoAssets({
      clientIds: clients,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: units,
      machineIds: machinesIds,
      machinesTypes: reqParams.machinesTypes,
      operation_modes: reqParams.operation_modes,
      stateDev: reqParams.stateDev,
      health: reqParams.health,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      onlyAut: reqParams.onlyAut,
      tempAmb: reqParams.tempAmb,
    })
    const totalRatedPower = await sqldb.MACHINES.getMachinesTotalRatedPower({
      clientIds: clients,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: units,
      machineIds: machinesIds,
      machinesTypes: reqParams.machinesTypes,
      operation_modes: reqParams.operation_modes,
      stateDev: reqParams.stateDev,
      healthIndex: reqParams.health,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      onlyAut: reqParams.onlyAut,
      tempAmb: reqParams.tempAmb,
    })
    const totalConectionInfo = await sqldb.MACHINES.getMachinesInfoConnectionAnalysis({
      clientIds: clients,
      stateIds: reqParams.stateIds,
      cityIds: reqParams.cityIds,
      unitIds: units,
      machineIds: machinesIds,
      machinesTypes: reqParams.machinesTypes,
      operation_modes: reqParams.operation_modes,
      stateDev: reqParams.stateDev,
      healthIndex: reqParams.health,
      INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
      onlyAut: reqParams.onlyAut,
      tempAmb: reqParams.tempAmb,
    });
    const result = {
      ...totalInfo,
      TOTAL_CAPACITY_PWR: totalInfo.TOTAL_CAPACITY_PWR_TR + (totalInfo.TOTAL_CAPACITY_PWR_BTU/12000),
      ...totalRatedPower,
      ...totalConectionInfo,
    } as httpRouter.ApiResps['/unit/get-total-analyse-machines'];
    return result;
  } catch (err) {
    logger.error('Não foi possivel buscar a analise do total, /unit/get-total-analyse-machines', reqParams, session.user);
    throw Error('Erro ao buscar parametros totais da aba de análise').HttpStatus(500);
  }
}
httpRouter.privateRoutes['/unit/get-total-analyse-machines'] = getTotalAnalyseMachinesRoutes;

/**
 * @swagger
 * /unit/get-filters-analyse-machines:
 *   post:
 *     summary: Filtros para a pagina de analise maquinas
 *     description: Filtros para a pagina de analise maquinas
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros
 *         schema:
 *           type: object
 *           properties:
 *             clientsIds:
 *               type: number
 *               description: ids do clientes para filtrar a lista
 *               default: null
 *               required: false
 *             stateIds:
 *               type: number
 *               description: ids dos estados para filtrar 
 *               default: null
 *               required: false
 *             unitIds:
 *               type: string
 *               description: ids das unidades para filtrar a lista
 *               default: ""
 *               required: false
 *             groupIds:
 *               type: string
 *               description: ids da maquina para filtrar a lista
 *               default: ""
 *               required: false
 *             healthIndexes:
 *               type: string
 *               description: numeros de health para filtrar a lista
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Informações gerais da lista
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */

export const getFiltersAnalysisMachines = async (reqParams: httpRouter.ApiParams['/unit/get-filters-analyse-machines'], session: SessionData) => {
  await verifyPermissionsUserToAnalyse(reqParams, session);
  try {
    const { clients, units } = await checkClientsAndUnitsAllowed({
      clients: reqParams.clientIds,
      units: reqParams.unitIds,
    }, session);
    const unitsFilters = await sqldb.CLUNITS.getListUnitsFilters({ clientIds: clients, stateIds: reqParams.stateIds, cityIds: reqParams.cityIds });
    const clientsFilters = await sqldb.CLIENTS.getAllClientsEnabled({ FILTER_BY_CLIENT_IDS: clients });
    const machinesFilters = await sqldb.MACHINES.getAllMachinesInfo({ clientIds: clients, unitIds: units, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds }, { addUnownedDevs: true });
    const cities = await sqldb.CITY.getAllCitiesFiltered({ clientIds: clients, statesIds: reqParams.stateIds });
    const states = (await sqldb.STATEREGION.selectStates({ clientIds: clients }, { full: true })).map((item) => ({ STATE_NAME: item.name, STATE_ID: item.id }));
    const machineTypes = (await sqldb.AV_OPTS.getMachineOpts({}));
    const modes = (await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getAllModes()).map((item) => item.MODE);
    const stateDevAut = (await sqldb.CURRENT_DEVICE_STATE.getStates()).map((state) => state.STATE);

    return {
      CLIENTS: clientsFilters,
      STATES: states,
      UNITS: unitsFilters,
      CITIES: cities,
      MACHINES: machinesFilters,
      MACHINES_TYPES: machineTypes,
      OPERATION_MODES: modes,
      STATE_DEV: stateDevAut,
    }
  } catch (err) {
    logger.error('Não foi possivel buscar os filtros das analises de maquinas, /unit/get-filters-analyse-machines', reqParams, session.user);
    throw Error('Erro ao buscar os filtros das analises de maquinas').HttpStatus(500);
  }
}
httpRouter.privateRoutes['/unit/get-filters-analyse-machines'] = getFiltersAnalysisMachines;

/**
 * @swagger
 * /machines/export-machines-analysis-list:
 *   post:
 *     summary: Exportação da tela de análise/máquinas
 *     description: Rota para exportar a tela de análise de máquinas com vários filtros
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros
 *         schema:
 *           type: object
 *           properties:
 *             INCLUDE_INSTALLATION_UNIT:
 *               type: boolean
 *               description: Incluir unidade de instalação na exportação
 *               default: false
 *               required: false
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs dos clientes para filtrar a lista
 *               required: false
 *             stateIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs dos estados para filtrar
 *               required: false
 *             cityIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs das cidades para filtrar
 *               required: false
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das unidades para filtrar a lista
 *               required: false
 *             groupIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das máquinas para filtrar a lista
 *               required: false
 *             machinesTypes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Tipos de máquinas para filtrar a lista
 *               required: false
 *             operation_modes:
 *               type: array
 *               items:
 *                 type: string
 *               description: Modos de operação para filtrar a lista
 *               required: false
 *             healthIndexes:
 *               type: array
 *               items:
 *                 type: number
 *               description: Índices de saúde para filtrar a lista
 *               required: false
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *               description: Status para filtrar a lista
 *               required: false
 *             ordered:
 *               type: string
 *               description: Ordenar por uma coluna específica
 *               required: false
 *             stateDev:
 *               type: array
 *               items:
 *                 type: string
 *               description: Estado dos dispositivos para filtrar
 *               required: false
 *             typeOrdered:
 *               type: string
 *               description: Tipo de ordenação
 *               required: false
 *             onlyAut:
 *               type: boolean
 *               description: Filtrar para incluir apenas dispositivos automatizados
 *               required: false
 *             tempAmb:
 *               type: array
 *               items:
 *                 type: string
 *               description: Intervalos de temperatura ambiente para filtrar
 *               required: false
 *             columnsToExport:
 *               type: array
 *               items:
 *                 type: string
 *               description: Colunas a serem incluídas na exportação
 *               required: true
 *     responses:
 *       200:
 *         description: Arquivo exportado
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */
export const exportMachinesAnalysisList = async (reqParams: httpRouter.ApiParams['/machines/export-machines-analysis-list'], session: SessionData, { res }: ExtraRouteParams) => {
  await verifyPermissionsUserToAnalyse(reqParams, session);

  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user });
  const language = getLanguage(prefsUser[0]);
  addExtraColumns(reqParams.columnsToExport);
  const data: any[][] = [reqParams.columnsToExport.map(column => t(`col_${column}`, language))];

  const result = await getResultsMachines(reqParams, session, false);
  insertDataRowMachineAnalysis(data, result, reqParams.columnsToExport, language, reqParams.haveProg);

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `${t('nomeArquivoAnaliseMaquina', language)}.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/machines/export-machines-analysis-list'] = exportMachinesAnalysisList;

export const addExtraColumns = (data: string[]) => {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 'MACHINE_NAME') {
      data.splice(i + 1, 0, 'ASSET_NAME');
    } else if (data[i] === 'MACHINE_TYPE') {
      data.splice(i + 1, 0, 'ASSET_FUNCTION');
    } else if (data[i] === 'CAPACITY_POWER') {
      data.splice(i + 1, 0, 'CAPACITY_UNIT');
    }
    else {
      continue;
    }
  }

  return data;
};

function formatProgHour({ PROG, DEVICE, DAY, language, DUT_MULT_SCHEDULE_DAYS }: { PROG: string, DEVICE: string, DAY: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', language: string, DUT_MULT_SCHEDULE_DAYS: {
  sun: boolean,
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
}}) {
  if (PROG && DEVICE) {
    const progParse = JSON.parse(PROG);
    const week = progParse.week;
    if (!week || Object.keys(week).length === 0) {
      return '-';
    }
    if (DEVICE.startsWith('DUT')) {
      if (DUT_MULT_SCHEDULE_DAYS && DUT_MULT_SCHEDULE_DAYS[DAY]) return t('MultiProg', language);
    }
    return `${week[DAY]?.start || ''} - ${week[DAY]?.end || ''}`
  }
  return '-';
}

export const getColumnValueMachine = (row: httpRouter.ApiResps['/unit/get-list-analyse-machines'][0], column: string, language: string, DUT_MULT_SCHEDULE_DAYS: {
  sun: boolean,
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
}) => {
  switch (column) {
    case 'STATE_NAME':
      return row.STATE_NAME;
    case 'CITY_NAME':
      return row.CITY_NAME;
    case 'CLIENT_NAME':
        return row.CLIENT_NAME;
    case 'UNIT_NAME':
      return row.UNIT_NAME;
    case 'MACHINE_NAME':
      return row.MACHINE_NAME;
    case 'tipoMaquina':
      return row.MACHINE_TYPE;
    case 'STATE': 
      return verifyExistsTranslation(`status_${row.STATE}`, language, row.STATE);
    case 'SETPOINT':
      return row.SETPOINT;
    case 'TEMPERATURE':
      return row.TEMPERATURE != null ? row.TEMPERATURE.toLocaleString(language) : '-';
    case 'TEMPERATURE1':
      return row.TEMPERATURE1 != null ? row.TEMPERATURE1.toLocaleString(language) : '-';
    case 'DEV_AUT':
      return row.DEV_AUT;
    case 'MODE': 
      return verifyExistsTranslation(`modoOperacao_${row.MODE}`, language, row.MODE);
    case 'TOTAL_DEV_COUNT':
      return row.TOTAL_DEV_COUNT;
    case 'conexao':
      return row.DEV_AUT != null ? row.STATE_CONN ?? 'OFFLINE': '-';
    case 'MCHN_BRAND':
      return row.MCHN_BRAND;
    case 'TOTAL_CAPACITY_CONDENSER':
      return row.TOTAL_CAPACITY_CONDENSER != null ? row.TOTAL_CAPACITY_CONDENSER.toLocaleString(language) : '-';
    case 'CAPACITY_UNIT': 
      return row.CAPACITY_UNIT;
    case 'RATED_POWER':
      return row.RATED_POWER != null ? row.RATED_POWER.toLocaleString(language) : '-';
    case 'LAST_PROG_MON':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'mon', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_TUE':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'tue', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_WED':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'wed', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_THU':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'thu', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_FRI':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'fri', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_SAT':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'sat', language, DUT_MULT_SCHEDULE_DAYS });
    case 'LAST_PROG_SUN':
      return formatProgHour({ PROG: row.LAST_PROG, DEVICE: row.DEV_AUT, DAY: 'sun', language, DUT_MULT_SCHEDULE_DAYS });
    default:
      return '-';
  }
}

export const verifyExistsTranslation = (key: string, language: string, value: string|number) => {
  const translatedValue = t(key, language);
  return translatedValue !== key ? translatedValue : value;
}

export const getColumnValueAsset = (machineInfoRow: Awaited<ReturnType<typeof sqldb.MACHINES.getMachinesInfoAnalysis>>[0], assetRow: Awaited<ReturnType<typeof sqldb.ASSETS.getListAssetMachinesAnalysis>>[0], column: string, language: string) => {
  switch (column) {
    case 'STATE_NAME':
      return machineInfoRow.STATE_NAME;
    case 'CITY_NAME':
      return machineInfoRow.CITY_NAME;
    case 'CLIENT_NAME':
        return machineInfoRow.CLIENT_NAME;
    case 'UNIT_NAME':
      return machineInfoRow.UNIT_NAME;
    case 'MACHINE_NAME':
      return machineInfoRow.MACHINE_NAME;
    case 'ASSET_NAME':
      return assetRow.ASSET_NAME;
    case 'ASSET_FUNCTION':
      return getAssetRole(assetRow.AST_ROLE_NAME, language);
    case 'saudeAtual': 
      return assetRow.H_INDEX ? t(`h_index_${assetRow.H_INDEX}`, language) : '-';
    case 'TOTAL_CAPACITY_CONDENSER':
      return assetRow.CAPACITY_PWR != null ? assetRow.CAPACITY_PWR.toLocaleString(language) : '-';
    case 'CAPACITY_UNIT': 
      return assetRow.CAPACITY_UNIT;
    case 'RATED_POWER':
      return assetRow.MACHINE_KW != null ? assetRow.MACHINE_KW.toLocaleString(language) : '-';
    case 'MODEL':
      return assetRow.MODEL;
    case 'STATE':
      return getAssetState(assetRow.AST_ROLE_NAME, assetRow.STATE, language);
    case 'CONNECTION':
      return assetRow.DEVICE_CODE != null ? assetRow.STATE_CONN ?? 'Offline': '-';
    default:
      return '-';
  }
}

export const getAssetRole = (AST_ROLE_NAME: string, language: string) => {
  switch (AST_ROLE_NAME) {
    case 'Evaporadora':
        return t('nomeAtivoEvaporadora', language)
    case 'Condensadora':
        return t('nomeAtivoCondensadora', language)
    case 'Trocador de Calor':
        return t('nomeAtivoTrocadorDeCalor', language)
    case 'Chiller':
        return t('nomeAtivoChiller', language)
    default:
      return '-'
  }
}

export const getAssetState = (AST_ROLE_NAME: string, STATE: string, language: string) => {
  if (STATE == null) return '-';

  switch (AST_ROLE_NAME) {
    case 'Evaporadora':
        return STATE === 'Disabled' ? t('stateAssetEvaporatorDisabled', language) : t('stateAssetEvaporatorOthers', language);
    case 'Condensadora':
      return STATE === 'Disabled' ? t('stateAssetCondenserDisabled', language) : t('stateAssetCondenserOthers', language);
    case 'Trocador de Calor':
      return STATE === 'Disabled' ? t('stateAssetHeatExchangerDisabled', language) : t('stateAssetHeatExchangerOthers', language);
    default:
      return '-'
  }
}

export const insertDataRowMachineAnalysis = (data: any[][], analysisResponse: httpRouter.ApiResps['/unit/get-list-analyse-machines'], columnsToExport: string[], language: string, haveProg: boolean) => {
  for (const row of analysisResponse) {
    const rowData = columnsToExport.map(column => getColumnValueMachine(row, column, language, row.DUT_MULT_SCHEDULE_DAYS));
    const machineInfo = row;
    data.push(rowData);
    for (const asset of row.ASSETS) {
      const rowDataAsset = columnsToExport.map(column => getColumnValueAsset(machineInfo, asset, column, language));
      data.push(rowDataAsset);
    }
  }
}

import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as machines from './machines'
import * as assets from './assets'
import * as rooms from './rooms'
import * as classes from './classes';
import * as devInfo from '../devInfo'
import * as simcards from '../painel/simcards'
import * as vtInfo from '../visitaTecnica/vtInfo'
import { apiGA } from '../../srcCommon/extServices/greenAntHelper'
import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import * as associations from './associations'
import * as dacData from '../../srcCommon/helpers/dacData'
import * as dielServices from '../../srcCommon/dielServices'
import * as energy from '../energyInfo'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { getUnitsWithInvoice, getDistributorFromDynamo } from '../invoices/invoices'
import { getAllowedUnitsManage, getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, getUnitsAndClients, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { calculateDateByTimezone, getOffsetTimezone } from '../../srcCommon/helpers/timezones'
import { getTimezoneByUnit } from '../../srcCommon/db/sql/CLUNITS';
import { SessionData } from '../../srcCommon/types'
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes';
import * as fs from 'fs'
import * as path from 'path'
import { t } from '../../srcCommon/helpers/i18nextradution'
import { returnActualDate } from '../../srcCommon/helpers/dates'
import { generateHtmlContainerItemMachine, generateSistemContainerItem } from './htmlGenerateFunctions';
import { runHtmlToPdfConverter } from '../../srcCommon/unitReport/healthReport'
import * as uuid from 'uuid';
import { addIrCodeinList } from '../dutAutomation'
import { logger } from '../../srcCommon/helpers/logger'
import { generateHtmlContainerItemEnvironment } from './htmlEnvrionmentGenerateFunction';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { applicationType, loadDriCfg } from '../telemHistory/driHist'
import { getDevicesOfUnitAndSetTimezone } from '../crossData/timezones'
import * as momentTimezone from 'moment-timezone';
import configfile from '../configfile'
import axios from 'axios'
import moment = require('moment')

interface UnitInfo {
    UNIT_ID: number;
    CLIENT_ID: number;
    PRODUCTION: number;
    PRODUCTION_TIMESTAMP?: string;
}

export const descOper = {
  'allow': 'Liberado',
  'forbid': 'Bloqueado',
  'onlyfan': 'Ventilação',
  'enabling': 'Habilitando',
  'disabling': 'Bloqueando',
  'eco': 'Eco-Mode',
  'thermostat': 'Thermostat'
}

export type TemprtAlert = 'low' | 'high' | 'good' | null;

httpRouter.privateRoutes['/dac/add-client-unit'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('ID do Cliente inválido.').HttpStatus(400);
  if (!reqParams.UNIT_NAME) throw Error('Nome da Unidade inválido.').HttpStatus(400);
  if (!reqParams.TIMEZONE_ID) throw Error('Fuso horário inválido.').HttpStatus(400);
  reqParams = formatReqParams(reqParams); 

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canConfigureNewUnits) throw Error('Permission denied!').HttpStatus(403)
  if ((!!reqParams.LAT) && (!/^-?\d+\.\d+$/.test(reqParams.LAT))) {
    throw Error('Invalid format for LAT.').HttpStatus(400)
  }
  if ((!!reqParams.LON) && (!/^-?\d+\.\d+$/.test(reqParams.LON))) {
    throw Error('Invalid format for LON.').HttpStatus(400)
  }

  const formatedConstructedArea = formatValueNumber(reqParams.CONSTRUCTED_AREA, 'ÁREA CONSTRUÍDA');
  const formatedAmountPeople = formatValueNumber(reqParams.AMOUNT_PEOPLE, 'NÚMERO DE PESSOAS');

  const { insertId } = await sqldb.CLUNITS.w_insert({
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_NAME: reqParams.UNIT_NAME,
    UNIT_CODE_CELSIUS: reqParams.UNIT_CODE_CELSIUS,
    UNIT_CODE_API: reqParams.UNIT_CODE_API,
    LAT: reqParams.LAT,
    LON: reqParams.LON,
    CITY_ID: reqParams.CITY_ID,
    EXTRA_DATA: reqParams.EXTRA_DATA,
    TIMEZONE_ID: reqParams.TIMEZONE_ID,
    ADDRESS: reqParams.ADDRESS,
    PRODUCTION: reqParams.PRODUCTION,
    PRODUCTION_TIMESTAMP: reqParams.PRODUCTION_TIMESTAMP,
    AMOUNT_PEOPLE: formatedAmountPeople,
    CONSTRUCTED_AREA: formatedConstructedArea,
  }, session.user);
  
  const unitInfo = await httpRouter.privateRoutes['/clients/get-unit-info']({ unitId: insertId }, session);
  return unitInfo;
}

const formatReqParams = (reqParams: httpRouter.ApiParams['/dac/add-client-unit']) => {
  if (!reqParams.LAT) reqParams.LAT = null
  if (!reqParams.LON) reqParams.LON = null
  if (!reqParams.CITY_ID) reqParams.CITY_ID = null
  if (!reqParams.EXTRA_DATA) reqParams.EXTRA_DATA = null
  if (!reqParams.ADDRESS) reqParams.ADDRESS = null
  if (!reqParams.PRODUCTION) reqParams.PRODUCTION = false // default PRODUCTION = false
  if (reqParams.PRODUCTION) reqParams.PRODUCTION_TIMESTAMP = new Date(Date.now() - 3 * 60 * 60 * 1000);
  if (!reqParams.AMOUNT_PEOPLE) reqParams.AMOUNT_PEOPLE = null
  if (!reqParams.CONSTRUCTED_AREA) reqParams.CONSTRUCTED_AREA = null

  return reqParams  
}

const buildQueryParameters = (reqParams: httpRouter.ApiParams['/clients/get-units-list']) => {
  const qPars: Parameters<typeof sqldb.CLUNITS.getUnitsList>[0] = {
    UNIT_IDS: reqParams.UNIT_ID ? [reqParams.UNIT_ID] : null,
    CLIENT_IDS: reqParams.CLIENT_ID ? [reqParams.CLIENT_ID] : null,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT === false ? reqParams.INCLUDE_INSTALLATION_UNIT : null
  };
  return qPars;
};

const fetchUnitsList = async (qPars: Parameters<typeof sqldb.CLUNITS.getUnitsList>[0]) => {
  if (qPars.UNIT_IDS && qPars.UNIT_IDS.length === 0) return [];
  if (qPars.CLIENT_IDS && qPars.CLIENT_IDS.length === 0) return [];
  const filterListUnits:  Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitsList>> = [];
  const list = await sqldb.CLUNITS.getUnitsList(qPars);
  list.forEach((unit) => {
    const duplicatedUnit = filterListUnits.some((item) => item.UNIT_ID === unit.UNIT_ID)
    if (!duplicatedUnit) {
      filterListUnits.push(unit);
    }
  });
  const unitsWithInvoice = await getUnitsWithInvoice();
  for (const item of filterListUnits) {
    if (item.DISTRIBUTOR_LABEL === null && unitsWithInvoice.includes(item.UNIT_ID.toString())) {
      item.DISTRIBUTOR_LABEL = await getDistributorFromDynamo(item.UNIT_ID.toString());
    }
  }

  return filterListUnits;
};

/**
 * @swagger
 * /clients/get-units-list:
 *   post:
 *     summary: Lista de unidades
 *     description: Retorna uma lista de unidades
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
 *             UNIT_ID:
 *               required: false
 *               type: number
 *               default: null
 *               description: Id da unidade
 *             CLIENT_ID:
 *               required: false
 *               type: number
 *               default: null
 *               description: id do Cliente
 *             INCLUDE_INSTALLATION_UNIT:
 *               required: false
 *               type: boolean
 *               default: null
 *               description: incluir unidades em instalação
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   UNIT_ID: 
 *                     type: number
 *                     description: id da unidade
 *                   UNIT_NAME:
 *                     type: string
 *                     description: nome da unidade
 *                   CLIENT_ID:
 *                     type: number
 *                     description: id do cliente
 *                   CLIENT_NAME:
 *                     type: string
 *                     description: nome do cliente
 *                   LAT:
 *                     type: string
 *                     description: latitude
 *                   LON:
 *                     type: string
 *                     description: longitude
 *                   TARIFA_KWH:
 *                     type: number
 *                     description: tarifa kwh
 *                   CITY_ID:
 *                     type: string
 *                     description: id da cidade
 *                   CITY_NAME:
 *                     type: string
 *                     description: nome da cidade
 *                   MODEL_NAME:
 *                     type: string
 *                     description: nome do modelo
 *                   RATE_MODEL_ID:
 *                     type: number
 *                     description: id do modelo
 *                   STATE_ID: 
 *                     type: string
 *                     description: id do estado
 *                   STATE_NAME: 
 *                     type: string
 *                     description: nome do estado
 *                   COUNTRY_NAME: 
 *                     type: string
 *                     description: id do pais
 *                   DISTRIBUTOR_ID: 
 *                     type: string
 *                     description: id do distribuidor
 *                   ADDITIONAL_DISTRIBUTOR_INFO: 
 *                     type: string
 *                     description: informações do distribuidor
 *                   LOGIN: 
 *                     type: string
 *                     description: etiqueta do distribuidor
 *                   CONSUMER_UNIT: 
 *                     type: string
 *                     description: 
 *                   LOGIN_EXTRA: 
 *                     type: string
 *                     description: 
 *                   DISTRIBUTOR_LABEL: 
 *                     type: string
 *                     description: etiqueta do distribuidor
 *                   BASELINE_ID:
 *                     type: number
 *                   TIMEZONE_AREA: 
 *                     type: string
 *                     description: timezone dlugar
 *                   TIMEZONE_ID:
 *                     type: number
 *                     description: timezone id
 *                   TIMEZONE_OFFSET:
 *                     type: number
 *                     description: offset do timezone
 *                   SUPERVISOR_ID: 
 *                     type: string
 *                     description: ID do supervisor
 *                   SUPERVISOR_NAME: 
 *                     type: string
 *                     description: nome do supervisor
 *                   SUPERVISOR_SOBRENOME: 
 *                     type: string
 *                     description: sobrenome do supervisor
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/clients/get-units-list'] = async function (reqParams, session) {
  const qPars = buildQueryParameters(reqParams);

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!qPars.CLIENT_IDS) { qPars.CLIENT_IDS = allowedClients; }
    qPars.CLIENT_IDS = qPars.CLIENT_IDS.filter(x => allowedClients.includes(x));
    if (allowedUnits && !qPars.UNIT_IDS) { qPars.UNIT_IDS = allowedUnits; }
    if (allowedUnits) qPars.UNIT_IDS = qPars.UNIT_IDS.filter(x => allowedUnits.includes(x));
  }

  return await fetchUnitsList(qPars);
}

async function notPermissionsViewAllClientsDacsGroupsUnits(qPars:{
  UNIT_IDS?: number[];
  CLIENT_IDS?: number[];
  INCLUDE_INSTALLATION_UNIT?: boolean;
}, session: SessionData) {
  const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
  if (!qPars.CLIENT_IDS) { qPars.CLIENT_IDS = allowedClients; }
  qPars.CLIENT_IDS = qPars.CLIENT_IDS.filter(x => allowedClients.includes(x));
  if (allowedUnits && !qPars.UNIT_IDS) { qPars.UNIT_IDS = allowedUnits; }
  if (allowedUnits) qPars.UNIT_IDS = qPars.UNIT_IDS.filter(x => allowedUnits.includes(x));
 return qPars
}

async function verifyPreFilters(reqParams: httpRouter.ApiParams['/clients/get-units-list-basic'], qPars: Parameters<typeof sqldb.CLUNITS.getUnitsListBasic>[0], session: SessionData ) {
  let ALLOW_CLIENT_IDS;
  let ALLOW_UNIT_IDS;
  if (reqParams.UNIT_ID) { qPars.UNIT_IDS = [reqParams.UNIT_ID]; }
  if (reqParams.UNIT_IDS?.length) { qPars.UNIT_IDS = reqParams.UNIT_IDS; }
  if (reqParams.STATE_IDS?.length) { qPars.STATE_IDS = reqParams.STATE_IDS; }
  if (reqParams.CITY_IDS?.length) { qPars.CITY_IDS = reqParams.CITY_IDS; }
  if (reqParams.CLIENT_IDS?.length) { qPars.CLIENT_IDS = reqParams.CLIENT_IDS; }
  if (reqParams.CLIENT_ID) { qPars.CLIENT_IDS = [reqParams.CLIENT_ID]; }
  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) { qPars.INCLUDE_INSTALLATION_UNIT = reqParams.INCLUDE_INSTALLATION_UNIT; }
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { CLIENT_IDS, UNIT_IDS } = await getUnitsAndClients({ CLIENT_IDS: reqParams.CLIENT_IDS ?? [], UNIT_IDS: reqParams.UNIT_IDS ?? [] }, session);
    ALLOW_CLIENT_IDS = CLIENT_IDS;
    ALLOW_UNIT_IDS = UNIT_IDS;
  }

  qPars.PRE_FILTERS_CLIENTS_UNITS = [reqParams.CLIENT_IDS?.length, reqParams.UNIT_IDS?.length].every((length) => length > 0);
  return { ALLOW_CLIENT_IDS, ALLOW_UNIT_IDS };
}

httpRouter.privateRoutes['/clients/get-units-list-basic'] = async function (reqParams, session) {
  let qPars: Parameters<typeof sqldb.CLUNITS.getUnitsListBasic>[0] = {};
  
  const { ALLOW_CLIENT_IDS, ALLOW_UNIT_IDS } = await verifyPreFilters(reqParams, qPars, session);

  let skipRows = reqParams.SKIP || 0;
  const response = {
    list: [] as {
      CLIENT_ID: number;
      UNIT_ID: number;
      UNIT_NAME: string;
      CITY_ID: string;
      STATE_ID: string;
      PRODUCTION: number;
      PRODUCTION_TIMESTAMP: string;
    }[],
    totalItems: 0,
  }

  if (qPars.UNIT_IDS?.length === 0 &&  qPars.CLIENT_IDS?.length === 0) return response;
  
  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) qPars.INCLUDE_INSTALLATION_UNIT = reqParams.INCLUDE_INSTALLATION_UNIT;

  const dbList = await sqldb.CLUNITS.getUnitsListBasic({ ...qPars, UNIT_IDS: ALLOW_UNIT_IDS, CLIENT_IDS: qPars.CLIENT_IDS });

  for (const unit of dbList) {
    response.totalItems++;
    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (checkReponseLimit(reqParams, response)) response.list.push(unit);
  }

  return response;
}

function checkReponseLimit(reqParams: {
  UNIT_ID?: number,
  CLIENT_ID?: number,
  LIMIT?: number,
  SKIP?: number,
  INCLUDE_INSTALLATION_UNIT?: boolean;
}, response: {
  list: {
    CLIENT_ID: number,
    UNIT_ID: number,
    UNIT_NAME: string,
    CITY_ID: string,
    STATE_ID: string,
    PRODUCTION: number,
    PRODUCTION_TIMESTAMP: string,
  }[],
  totalItems: number,
} ) {
  return !reqParams.LIMIT || response.list.length < reqParams.LIMIT  
}

httpRouter.privateRoutes['/clients/get-units-with-energy-device'] = async function (reqParams, session) {
  const qPars: Parameters<typeof sqldb.CLUNITS.getUnitsList2>[0] = {};
  if (reqParams.clientIds) { qPars.clientIds = reqParams.clientIds; }
  if (reqParams.unitIds) { qPars.unitIds = reqParams.unitIds; }
  if (reqParams.INCLUDE_INSTALLATION_UNIT === false) {
    qPars.INCLUDE_INSTALLATION_UNIT = false
  }

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS){
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!qPars.clientIds) { qPars.clientIds = allowedClients; }
    qPars.clientIds = qPars.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !qPars.unitIds) { qPars.unitIds = allowedUnits; }
    if (allowedUnits) qPars.unitIds = qPars.unitIds.filter(x => allowedUnits.includes(x));
  }
  
  //Começa aqui
  const list = await sqldb.CLUNITS.getUnitsListWithEnergyDevice(qPars);
  const units = {} as {
    [unitId: string]: {
      UNIT_ID: number,
      UNIT_NAME: string,
      devices: {
        ID: string,
        NAME: string,
      }[]
    }
  };
  for (const row of list) {
    if (!units[row.UNIT_ID]) {
      units[row.UNIT_ID] = {
        UNIT_ID: row.UNIT_ID,
        UNIT_NAME: row.UNIT_NAME,
        devices: [{ ID: row.ENERGY_DEVICE_ID, NAME: row.ESTABLISHMENT_NAME }],
      }
    } else {
      units[row.UNIT_ID].devices.push({ ID: row.ENERGY_DEVICE_ID, NAME: row.ESTABLISHMENT_NAME });
    }
  }

  return { list: Object.values(units) };
}

export function getRtypeTemprtAlert(rtypeSched: { TUSEMIN: number, TUSEMAX: number, RTYPE_SCHED: string }, Temperature: number|null): TemprtAlert {
  if (Temperature == null) return null;
  if (!rtypeSched) return 'good';

  const fullProg = scheduleData.parseFullProgV4(rtypeSched.RTYPE_SCHED); // USEPERIOD
  const current = fullProg && scheduleData.getDayPeriod(fullProg);

  if (current == null) return 'good';
  if (current.permission !== 'allow') return 'good';

  const nowShifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const nowIndex = nowShifted.getUTCHours() * 60 + nowShifted.getUTCMinutes() * 1;
  if (nowIndex >= current.indexIni && nowIndex <= current.indexEnd) {
    if ((rtypeSched.TUSEMIN != null) && (Temperature < rtypeSched.TUSEMIN)) {
      return 'low';
    }
    if ((rtypeSched.TUSEMAX != null) && (Temperature > rtypeSched.TUSEMAX)) {
      return 'high';
    }
  }
  return 'good';
}

type IUnitInfo = Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>> & {
  SUPERVISOR_ID?: string,
  SUPERVISOR_NAME?: string,
}

httpRouter.privateRoutes['/clients/get-unit-info'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Invalid properties. Missing unitId.').HttpStatus(400) }
  const unitInfo: IUnitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  const supervisors = await sqldb.UNITSUPERVISORS.getUnitSupervisors({ UNIT_IDS: [reqParams.unitId] });
  const supervisors_id = supervisors.map((item) => item.EMAIL);
  const supervisors_name = supervisors.map((item) => `${item.NOME} ${item.SOBRENOME}`);
  unitInfo.SUPERVISOR_ID = supervisors_id.join(', ');
  unitInfo.SUPERVISOR_NAME = supervisors_name.join(', ');
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const [
    nessUnit,
    waterUnit,
    laagerUnits,
    vrfEquips,
    drisUnit,
  ] = await Promise.all([
    sqldb.INTEGRNESS.getIntegrId({ UNIT_ID: reqParams.unitId }),
    sqldb.WATERS.getWaterInfoByUnit({UNIT_ID: reqParams.unitId}),
    sqldb.LAAGER.getListWithUnitInfo({ unitIds: [reqParams.unitId] }),
    sqldb.INTEGRCOOLAUT.getList({ UNIT_ID: reqParams.unitId }),
    sqldb.DRIS_DEVICES.getAllDrisVarsByUnit({ UNIT_ID: reqParams.unitId }),
  ]);
  const arrayChiller = drisUnit.filter((item) => JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30hxe' || JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30gxe' || JSON.parse(item.VARSCFG)?.application === 'chiller-carrier-30hxf' || JSON.parse(item.VARSCFG)?.application.startsWith('chiller-carrier-30xab'));
  const dmaId = (await sqldb.DMAS_DEVICES.getIntegrId({ UNIT_ID: reqParams.unitId }))?.DMA_ID || ''
  const hasChiller = arrayChiller.length > 0;
  const hasEnergyInfo = !!unitInfo.GA_METER;
  const hasNess = !!nessUnit;
  const hasWater = !!waterUnit;
  const hasOxyn = false;
  const hasLaager = laagerUnits.length > 0;
  const hasVrf = vrfEquips.length > 0;
    
  return Object.assign({ hasEnergyInfo, hasNess, hasWater, hasOxyn, hasLaager, hasVrf, dmaId, hasChiller, arrayChiller }, unitInfo);
}

httpRouter.privateRoutes['/clients/get-units-and-meters'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);

  if (perms.readAllIntegrationDevices && perms.manageAllClientsUnitsAndDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const units = await sqldb.CLUNITS.getUnitsAndMeters();
  const { dataSources } = await apiGA['GET /datasources']();
  const meters = dataSources.map((ds) => {
    return {
      id: ds.id,
      organizationName: ds.organizationName,
      organizationId: ds.organizationId,
      label: ds.label,
      uid: ds.uid,
    }
  })

  return { units, meters };
}

function formatValueNumber(value: string, name: string): number | null{
  if(value == null){
    return null
  }
  const numberValue = Number(value)
  if(isNaN(numberValue) || numberValue <= 0){
    throw Error(`Propriedades inválidas. ${name} DEVE SER UM NÚMERO E MAIOR QUE 0.`).HttpStatus(400)
  }
  return numberValue
}

httpRouter.privateRoutes['/clients/edit-unit'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canManageDevs) throw Error('Permission denied!').HttpStatus(403)

  if ((reqParams.DISABREP == null) || (reqParams.DISABREP === 0) || (reqParams.DISABREP === 1)) { } // OK
  else if (reqParams.DISABREP !== undefined) reqParams.DISABREP = null;
  if ((reqParams.TARIFA_DIEL == null) || (reqParams.TARIFA_DIEL === 0) || (reqParams.TARIFA_DIEL === 1)) { } // OK
  else if (reqParams.TARIFA_DIEL !== undefined) reqParams.TARIFA_DIEL = null;
  if ((reqParams.LAT !== undefined) && (!reqParams.LAT)) reqParams.LAT = null;
  if ((reqParams.LON !== undefined) && (!reqParams.LON)) reqParams.LON = null;
  if ((reqParams.UNIT_CODE_CELSIUS !== undefined) && (!reqParams.UNIT_CODE_CELSIUS)) reqParams.UNIT_CODE_CELSIUS = null;
  if ((reqParams.UNIT_CODE_API !== undefined) && (!reqParams.UNIT_CODE_API)) reqParams.UNIT_CODE_API = null;
  if ((reqParams.ADDRESS !== undefined) && (!reqParams.ADDRESS)) reqParams.ADDRESS = null;
  if ((!!reqParams.LAT) && (!/^-?\d+\.\d+$/.test(reqParams.LAT))) {
    throw Error('Invalid format for LAT.').HttpStatus(400)
  }
  if ((!!reqParams.LON) && (!/^-?\d+\.\d+$/.test(reqParams.LON))) {
    throw Error('Invalid format for LON.').HttpStatus(400)
  } 

  const formatedConstructedArea = formatValueNumber(reqParams.CONSTRUCTED_AREA, 'ÁREA CONSTRUÍDA');
  const formatedAmountPeople = formatValueNumber(reqParams.AMOUNT_PEOPLE, 'NÚMERO DE PESSOAS');

  const permsG = getUserGlobalPermissions(session);
  await updateClunits(permsG.manageAllClientsUnitsAndDevs, { ...reqParams, AMOUNT_PEOPLE: formatedAmountPeople, CONSTRUCTED_AREA: formatedConstructedArea}, session, unitInfo)

  // return `UPDATED ` + affectedRows
  return httpRouter.privateRoutes['/clients/get-unit-info']({ unitId: reqParams.UNIT_ID }, session);
}

 async function updateClunits(permsGManageAllClientsUnitsAndDevs:boolean, reqParams: {
  UNIT_ID: number,
  CLIENT_ID?: number,
  UNIT_NAME?: string,
  UNIT_CODE_CELSIUS?: string,
  UNIT_CODE_API?: string,
  CITY_ID?: string|null,
  LAT?: string|null,
  LON?: string|null,
  DISABREP?: 0|1,
  TARIFA_KWH?: number|null,
  EXTRA_DATA?: string|null,
  GA_METER?: number|null,
  TARIFA_DIEL?: 0|1,
  DISTRIBUTOR_ID?: number|null,
  CONSUMER_UNIT?: string|null,
  LOGIN?: string|null,
  PASSWORD?: string|null,
  LOGIN_EXTRA?: string|null,
  TIMEZONE_ID?: number|null,
  ADDRESS?: string|null,
  PRODUCTION?: boolean|null,
  PRODUCTION_TIMESTAMP?: Date|null,
  RATE_MODEL_ID?: number | null,
  AMOUNT_PEOPLE?: number | null,
  CONSTRUCTED_AREA?: number | null,
}, session: SessionData, unitInfo: UnitInfo) {
  if(unitInfo.PRODUCTION) {
    reqParams.PRODUCTION = true;
  }
  let time = undefined;
  if (reqParams.PRODUCTION === true && unitInfo.PRODUCTION === 0) {
    time = new Date(Date.now() - 3 * 60 * 60 * 1000);
  }
  if (permsGManageAllClientsUnitsAndDevs) {
    await sqldb.CLUNITS.w_update({
      UNIT_ID: reqParams.UNIT_ID,
      UNIT_CODE_CELSIUS: reqParams?.UNIT_CODE_CELSIUS,
      UNIT_CODE_API: reqParams?.UNIT_CODE_API,
      RATE_MODEL_ID: reqParams.RATE_MODEL_ID,
      UNIT_NAME: reqParams.UNIT_NAME,
      CITY_ID: reqParams.CITY_ID,
      LAT: reqParams.LAT,
      LON: reqParams.LON,
      DISABREP: reqParams.DISABREP,
      TARIFA_KWH: reqParams.TARIFA_KWH,
      EXTRA_DATA: reqParams.EXTRA_DATA,
      GA_METER: reqParams.GA_METER,
      TARIFA_DIEL: reqParams.TARIFA_DIEL,
      ADDRESS: reqParams.ADDRESS,
      PRODUCTION: reqParams.PRODUCTION,
      PRODUCTION_TIMESTAMP: time,
      TIMEZONE_ID: reqParams.TIMEZONE_ID,
      AMOUNT_PEOPLE: reqParams.AMOUNT_PEOPLE,
      CONSTRUCTED_AREA: reqParams?.CONSTRUCTED_AREA,
    }, session.user);
  } else {
    await sqldb.CLUNITS.w_update({
      UNIT_ID: reqParams.UNIT_ID,
      UNIT_NAME: reqParams.UNIT_NAME,
      UNIT_CODE_CELSIUS: reqParams.UNIT_CODE_CELSIUS,
      UNIT_CODE_API: reqParams.UNIT_CODE_API,
      RATE_MODEL_ID: reqParams.RATE_MODEL_ID,
      CITY_ID: reqParams.CITY_ID,
      LAT: reqParams.LAT,
      LON: reqParams.LON,
      TIMEZONE_ID: reqParams.TIMEZONE_ID,
      ADDRESS: reqParams.ADDRESS,
      PRODUCTION: reqParams.PRODUCTION,
      PRODUCTION_TIMESTAMP: time,
      AMOUNT_PEOPLE: reqParams.AMOUNT_PEOPLE,
      CONSTRUCTED_AREA: reqParams?.CONSTRUCTED_AREA,
    }, session.user);
  } 
  if (reqParams.TIMEZONE_ID) {
    await getDevicesOfUnitAndSetTimezone({ unitId: reqParams.UNIT_ID, timezoneIds: [reqParams.TIMEZONE_ID]}, session);
  }
}

httpRouter.privateRoutes['/clients/remove-unit'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = getUserGlobalPermissions(session);
  if (!perms.deleteClientUnitsMachinesRooms) {
    throw Error('Permission denied').HttpStatus(403);
  }

  const machinesList = await sqldb.MACHINES.getMachinesList({ UNIT_ID: reqParams.UNIT_ID });
  for (const machine of machinesList) {
    await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
    await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
    await sqldb.DAMS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
    await sqldb.DACS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
    await sqldb.DRIS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
    await sqldb.DUTS_AUTOMATION.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID }, session.user);
  }

  await energy.deleteUnitElectricCircuits({UNIT_ID: reqParams. UNIT_ID}, session.user);
  await deleteIlluminationsByUnit({UNIT_ID: reqParams. UNIT_ID}, session.user);
  await machines.deleteUnitMachines({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await rooms.removingUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await classes.removingUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await vtInfo.removingUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await devInfo.removingUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await simcards.removingUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.OBSERVATIONS.w_deleteByUnitId({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.INTEGROXYN.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.INTEGRNESS.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.LAAGER_IMAGES.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.LAAGER_HISTORY_USAGE.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.LAAGER_DAILY_HISTORY_USAGE.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.CURRENT_LAAGER_CONSUMPTION.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.CURRENT_DMAS_CONSUMPTION.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.DMAS_IMAGES.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.DMAS_DEVICES.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.LAAGER.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.WATERS_MONTH_HISTORY_USAGE.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.WATERS.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.INTEGRCOOLAUT.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.UNITSUPERVISORS.w_clearUnitSupervisors({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.ACCESS_DISTRIBUTORS.w_deleteAccessDistributorsInfo({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.INVOICES.w_deleteInvoicesPerUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.UNITS_SKETCHES.w_deleteFromUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  await sqldb.GROUND_PLANS.w_deletByUnit({ UNIT_ID: reqParams.UNIT_ID }, session.user);
  const { affectedRows } = await sqldb.CLUNITS.w_deleteRow({ UNIT_ID: reqParams.UNIT_ID }, {
    DEVGROUPS: true,
    ROOMS: true,
    UNITCLASSES: true,
    CLIENT_ASSETS: true,
    DEVS: true,
    SIMCARDS: true,
    INTEGROXYN: true,
    INTEGRNESS: true,
    LAAGER: true,
    INTEGRCOOLAUT: true,
    VISITATECNICA: true,
    UNITSUPERVISORS: true,
    ASSOCIATIONS: true,
  }, session.user);
  return `DELETED ` + affectedRows
}

export async function removingCity(qPars: { CITY_ID: string }, userId: string) {
  await sqldb.CLUNITS.w_removeCity({ CITY_ID: qPars.CITY_ID }, userId);
}

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await devInfo.removingClientUnits(qPars, userId);
  await machines.removingClient(qPars, userId);
  await assets.removingClient(qPars, userId);
  await rooms.removingClient(qPars, userId);
  await classes.removingClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await vtInfo.removingClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await simcards.removingClient(qPars, userId);
  await associations.removingClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.INTEGROXYN.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.INTEGRNESS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.LAAGER_IMAGES.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.LAAGER_DAILY_HISTORY_USAGE.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.LAAGER_HISTORY_USAGE.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.LAAGER.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.WATERS_MONTH_HISTORY_USAGE.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.WATERS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.INTEGRCOOLAUT.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.UNITSUPERVISORS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DUTS_MONITORING.w_deleteFromEnvironmentClient(qPars, userId);
  await sqldb.ENVIRONMENTS.w_deleteFromClient(qPars, userId);
  await sqldb.UNITS_SKETCHES.w_deleteFromClunits(qPars, userId);
  await sqldb.ELECTRIC_CIRCUITS_TREE.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.GREENANT_ENERGY_DEVICES.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.DRIS_ENERGY_DEVICES.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ENERGY_DEVICES_INFO.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ELECTRIC_CIRCUITS.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await deleteIlluminationsByClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.CLUNITS.w_deleteFromClient(qPars, {
    DEVS: true,
    DEVGROUPS: true,
    ROOMS: true,
    UNITCLASSES: true,
    CLIENT_ASSETS: true,
    SIMCARDS: true,
    INTEGROXYN: true,
    INTEGRNESS: true,
    LAAGER: true,
    INTEGRCOOLAUT: true,
    VISITATECNICA: true,
    UNITSUPERVISORS: true,
    ASSOCIATIONS: true,
  }, userId);
}

httpRouter.privateRoutesDeprecated['/clients/get-unit-devs-disp'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const list = [];

  const { startDate, endDate } = reqParams;

  const lastDay = new Date(endDate);
  lastDay.setDate(lastDay.getDate() - 1);

  let timezoneOffset = -3;
  const timezoneInfo = await getTimezoneByUnit({ UNIT_ID: reqParams.UNIT_ID });
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const devs = await sqldb.DEVICES.getDevsDetails({ unitIds: [reqParams.UNIT_ID] });
  const devIds = devs.map((dev) => dev.DEV_ID);
  const dataList = await sqldb.cache_cond_tel.getDevAvgHoursOn({
      devIds,
      dayStart: startDate,
      dayEnd: lastDay.toISOString().split('T')[0],
      timezoneOffset,
  });

  for (const dev of devs) {
    const devId = dev.DEV_ID;
    const devData = dataList.filter((info) => info.devId === devId);

    if (devData.length > 0 && devData.every((value) => value.devOnline !== null)) {
      // Dados já existentes no banco;
      let totalHours = 0;
      let avgDevDisp = 0;

      if (devId.startsWith('DAC')) {
        const cstats = devData.map((data) => JSON.parse(data.cstats));
        totalHours = cstats.reduce((acc, data) => acc += ((data.hoursOn + data.hoursOff) || 0), 0);
        avgDevDisp = totalHours * (100 / 24) / devData.length;
      } else {
        totalHours = devData.reduce((acc, data) => acc += (data.devOnline || 0), 0);
        avgDevDisp = totalHours * (100 / 24) / devData.length;
      }

      list.push({ devId, disponibility: parseFloat(avgDevDisp.toFixed(2)), startDate, endDate, daysCounted: devData.length, clientName: dev.CLIENT_NAME, unitName: dev.UNIT_NAME, groupName: dev.MACHINE_NAME, roomName: dev.ROOM_NAME });

    } else {
      // Necessita compilar os dados para apresentar;

      const days = ((new Date(endDate).getTime()) - (new Date(startDate).getTime())) / (24 * 60 * 60 * 1000);
      const devTelemetries = [];
      let totalHours = 0;
      let avgDevDisp = 0;

      if (devId.startsWith('DAC')) {
        const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
        if (!dacInf) throw Error(`${devId} não encontrado`).HttpStatus(400);
        const hwCfg = dacInf && dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
        if (!hwCfg) throw Error(`${devId} sem hwCfg`).HttpStatus(400);
        const dac = { devId: dacInf.DAC_ID, hwCfg }
        for (let index = 1; index <= days; index += 1) {
          const periodData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: `/clients/get-unit-devs-disp DAC ${session.user}`, dac, day: (startDate + '-' + index.toString().padStart(2, '0')), hType: 'L1-Charts&Stats', dacExtInf: dacInf });
          const dayTotalHours = (periodData && (periodData.hoursOn + periodData.hoursOff)) || 0;
          devTelemetries.push(dayTotalHours);
        }
      }

      if (devId.startsWith('DUT')) {
        const dutInf = await sqldb.DUTS.getFreshDevInfo({ devId });
        if (!dutInf) throw Error(`${devId} não encontrado`).HttpStatus(400);
        for (let index = 1; index <= days; index += 1) {
          const periodData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: `/clients/get-unit-devs-disp DUT ${session.user}`, dutId: devId, day: (startDate + '-' + index.toString().padStart(2, '0')), hType: "TelemetryCharts", dutExtInf: dutInf });
          const dayTotalHours = (periodData && periodData.hoursOnline) || 0;
          devTelemetries.push(dayTotalHours);
        }
      }

      if (devId.startsWith('DAM')) {
        for (let index = 1; index <= days; index += 1) {
          const periodData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDamDay', { motivo: `/clients/get-unit-devs-disp DAM ${session.user}`, damId: devId, day: (startDate + '-' + index.toString().padStart(2, '0')), unitId: reqParams.UNIT_ID });
          const dayTotalHours = (periodData && periodData.hoursOnline) || 0;
          devTelemetries.push(dayTotalHours);
        }
      }

      totalHours = devTelemetries.reduce((acc, value) => acc += value, 0);
      avgDevDisp = totalHours * (100 / 24) / devTelemetries.length;

      list.push({ devId, disponibility: parseFloat(avgDevDisp.toFixed(2)), startDate, endDate, daysCounted: devTelemetries.length, clientName: dev.CLIENT_NAME, unitName: dev.UNIT_NAME, groupName: dev.MACHINE_NAME, roomName: dev.ROOM_NAME });
    }
  }

  return { list };
}

httpRouter.privateRoutes['/clients/get-client-units-disp'] = async function (reqParams, session) {
  const iniTS = Date.now();
  logger.info('DBGLENT - /clients/get-client-units-disp (1)', Date.now() - iniTS);

  const { CLIENT_ID, startDate, endDate } = reqParams;

  if (!/\d\d\d\d-\d\d-\d\d/.test(startDate)) {
    throw Error('Invalid startDate').HttpStatus(500);
  }
  if (!/\d\d\d\d-\d\d-\d\d/.test(endDate)) {
    throw Error('Invalid startDate').HttpStatus(500);
  }

  let filterUnitIds: number[] = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : undefined;
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllClientsUnitsAndDevs) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsManage(session);
    if (!allowedClients.includes(CLIENT_ID)) {
      throw Error('Permission denied!').HttpStatus(403);
    }
    if (reqParams.UNIT_ID && !allowedUnits.includes(reqParams.UNIT_ID)) {
      throw Error('Permission denied!').HttpStatus(403);
    }
    filterUnitIds = reqParams.UNIT_ID ? [reqParams.UNIT_ID] : allowedUnits;
  }

  const unitsList = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [CLIENT_ID], UNIT_IDS: filterUnitIds });
  const unitIds = unitsList.map((unit) => unit.UNIT_ID);
  const rusthistDebug = { motivo: `/clients/get-client-units-disp ${session.user}` };
  const dataList = await getDisponibilityData(unitIds, startDate, endDate, rusthistDebug, iniTS);

  const result = {} as {
    [unitId: number]: {
      clientId: number;
      clientName: string;
      unitId: number;
      unitName: string;
      avgDisp: number;
      dispList: {
        disponibility: number;
        YMD: string;
      }[],
    }
  };

  unitsList.forEach((unit) => {
    const devsData = Object.values(dataList).filter((data) => data.unitName === unit.UNIT_NAME);
    const numberOfDays = ((new Date(endDate).getTime()) - (new Date(startDate).getTime())) / (24 * 60 * 60 * 1000) + 1;
    const dispList = [];
    for (let index = 0; index < numberOfDays; index += 1) {
      const date = new Date(new Date(startDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const devsDayData = devsData.map((data) => data.dispList.find((disp) => disp.YMD === date));
      const avgDevsDayDisp = devsDayData.reduce((acc, data) => acc += (data?.disponibility || 0), 0) / devsDayData.length;
      dispList.push({ disponibility: avgDevsDayDisp, YMD: date });
    }

    const avgUnitsDisp = dispList.reduce((acc, value) => acc += value.disponibility, 0) / dispList.length;

    result[unit.UNIT_ID] = {
      clientId: CLIENT_ID,
      clientName: unit.CLIENT_NAME,
      unitId: unit.UNIT_ID,
      unitName: unit.UNIT_NAME,
      avgDisp: avgUnitsDisp,
      dispList,
    }
  })

  logger.info('DBGLENT - /clients/get-client-units-disp (F)', Date.now() - iniTS);

  return result;
}

httpRouter.privateRoutes['/clients/get-unit-devs-disp-v2'] = async function (reqParams, session) {
  const iniTS = Date.now();
  logger.info('DBGLENT - /clients/get-unit-devs-disp-v2 (1)', Date.now() - iniTS);

  const { UNIT_ID, startDate, endDate } = reqParams;
  const flagExportCSV: boolean = (reqParams as any).flagExportCSV;
  const brHour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours();
  if ((brHour >= 9) && (brHour <= 18) && (!flagExportCSV)) {
    // Adicionado em 2024-02-26 para contornar problema de performance
    logger.warn("WARN859 - Endpoint /clients/get-unit-devs-disp-v2 desativado em horário comercial");
    return {};
  }

  if (!UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(startDate)) {
    throw Error('Invalid startDate').HttpStatus(500);
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(endDate)) {
    throw Error('Invalid startDate').HttpStatus(500);
  }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  logger.info('DBGLENT - /clients/get-unit-devs-disp-v2 (2)', Date.now() - iniTS);

  const rusthistDebug = { motivo: `/clients/get-unit-devs-disp-v2 ${session.user}` };
  const dataList = await getDisponibilityData([UNIT_ID], startDate, endDate, rusthistDebug, iniTS);

  logger.info('DBGLENT - /clients/get-unit-devs-disp-v2 (F)', Date.now() - iniTS);

  return dataList;
}

function isEmpty(object: {}) {
  return (Object.keys(object).length === 0);
}

const getCachedData = (devData :{
  devId: string
  cstats: string
  chartsBas: string
  chartsDet: string
  YMD: string
  devOnline: number
}[], devId: string, date: string) => {
  return devData.find((data) => {
    if (data.YMD !== date) return false; 

    const dataKey: {[key: string]: 'cstats' | 'chartsBas'} = {
      'DAC': 'cstats',
      'DUT': 'chartsBas', 
      'DAM': 'chartsBas', 
      'DRI': 'chartsBas',
      'DAL': 'chartsBas', 
      'DMT': 'chartsBas', 
      'DMA': 'chartsBas',
    };

    const devs = ['DAC', 'DUT', 'DAM', 'DRI', 'DAL', 'DMT', 'DMA'];
    for (const devType of devs) {
      if (!(devId.startsWith(devType) && data[dataKey[devType]])) continue;
      if (data[dataKey[devType]] === "{}") return true;
      if (data[dataKey[devType]] !== "{}" && (data.devOnline != null)) return true;
    }
    
    return false
  });
}

const getDataList = async (unitIds: number [], devs: Awaited<ReturnType<typeof sqldb.DEVICES.getDevsDetails>>, startDate: string, endDate: string) => {
  let dataList: {
    devId: string
    cstats: string
    chartsBas: string
    chartsDet: string
    YMD: string
    devOnline: number
  }[] = [];

  for (const unitId of unitIds) {
    const devIdsWithUnit = devs.filter((dev) => dev.UNIT_ID = unitId);
    const devIds = devIdsWithUnit.map((dev) => dev.DEV_ID);
    dataList = dataList.concat(await getDataListByUnit(unitId, startDate, endDate, devIds));
  }

  return dataList;
}

const getFilteredDevsInfo = (devId: string, dev: Awaited<ReturnType<typeof sqldb.DEVICES.getDevsDetails>>[number], 
                                            dataList:  {
                                              devId: string
                                              cstats: string
                                              chartsBas: string
                                              chartsDet: string
                                              YMD: string
                                              devOnline: number
                                            }[],
                                            machinesList: Awaited<ReturnType<typeof sqldb.MACHINES.getMachinesList>>,
                                            unitsDuts: Awaited<ReturnType<typeof sqldb.DUTS.getListBasic>>
) => {
  const devData = dataList.filter((info) => info.devId === devId);
  const dacMachine = machinesList.find((machine) => machine.MACHINE_ID === dev.MACHINE_ID);
  const dacMachineRoomName = unitsDuts.find((dut) => dut.DEV_ID === dacMachine?.DUT_ID);
  const autMachine = machinesList.filter((machine) => ((machine.DEV_AUT === devId) || (machine.DUT_ID === devId)));
  const damMachinesDuts = autMachine.map((machine) => machine.DUT_ID);
  const damMachineNames = autMachine.map((machine) => machine.MACHINE_NAME).join(', ') || null;
  const damMachineRoomNames = unitsDuts.filter((dut) => damMachinesDuts.includes(dut.DEV_ID)).map((dut) => dut.ROOM_NAME).join(', ') || null;
  const dutAndDamMachineRoomNames = devId.startsWith('DUT') ? dev.ROOM_NAME : damMachineRoomNames;

  return {devData, dacMachine, dacMachineRoomName, damMachineNames, dutAndDamMachineRoomNames};
}

const compileDacData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
  if (!dacInf) return;
  const hwCfg = dacInf && dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  if (!hwCfg) throw Error(`${devId} sem hwCfg`).HttpStatus(400);
  const dac = { devId: dacInf.DAC_ID, hwCfg };

  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: rusthistDebug.motivo, dac, day: date, hType: 'L1-Charts&Stats', dacExtInf: dacInf })
    .then(periodData => {
      const totalHours = (periodData && (periodData.hoursOn + periodData.hoursOff)) || 0;
      result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
    }).catch((err) => {
      result[devId].dispList.push({ disponibility: 0.00, YMD: date });
      logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
    }));
}

const compileDutData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  const dutInf = await sqldb.DUTS.getFreshDevInfo({ devId });
  if (!dutInf) return;

  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: rusthistDebug.motivo, dutId: devId, day: date, hType: "TelemetryCharts", dutExtInf: dutInf })
    .then(periodData => {
      const totalHours = (periodData?.hoursOnline) || 0;
      result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
    }).catch((err) => {
      result[devId].dispList.push({ disponibility: 0.00, YMD: date });
      logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
    }));
};

const compileDamData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDamDay', { motivo: rusthistDebug.motivo, damId: devId, day: date })
  .then(periodData => {
    const totalHours = (periodData?.hoursOnline) || 0;
    result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
  }).catch((err) => {
    result[devId].dispList.push({ disponibility: 0.00, YMD: date });
    logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
  }));
}

const compileDriData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  const driCfg = await loadDriCfg(devId);
  if(!driCfg.application) {
    throw new Error(`O dispositivo não possui aplicação definida. Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade.`);
  }
  const formulas = driCfg.formulas;
  const dri_type = applicationType[driCfg.application];
  if(!dri_type) {
    logger.error(`Não é possivel calcular disponibilidade do dispositivo com a aplicação ${driCfg.application}. Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade.`);
    return;
  }
  const dri_interval = Number(driCfg.driConfigs?.find((cfg) => cfg.protocol === 'interval')?.value) || undefined;
  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDriDay', { motivo: rusthistDebug.motivo, driId: devId, driInterval: dri_interval, driType: dri_type, formulas: formulas, day: date })
    .then(periodData => {
      const totalHours = (periodData?.hoursOnline) || 0;
      result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
    }).catch((err) => {
      result[devId].dispList.push({ disponibility: 0.00, YMD: date });
      logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
    }));
}

const compileDalData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDalDay', { motivo: rusthistDebug.motivo, dalCode: devId, day: date })
  .then(periodData => {
    const totalHours = (periodData?.hoursOnline) || 0;
    result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
  }).catch((err) => {
    result[devId].dispList.push({ disponibility: 0.00, YMD: date });
    logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
  }));
}

const compileDmtData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmtDay', { motivo: rusthistDebug.motivo, dmtCode: devId, day: date })
  .then(periodData => {
    const totalHours = (periodData?.hoursOnline) || 0;
    result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
  }).catch((err) => {
    result[devId].dispList.push({ disponibility: 0.00, YMD: date });
    logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
  }));

}

const compileDmaData = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  promises.push(dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: rusthistDebug.motivo, dmaId: devId, day: date })
  .then(periodData => {
    const totalHours = (periodData?.hoursOnline) || 0;
    result[devId].dispList.push({ disponibility: parseFloat((totalHours * (100 / 24)).toFixed(2)), YMD: date });
  }).catch((err) => {
    result[devId].dispList.push({ disponibility: 0.00, YMD: date });
    logger.error(`Impossível obter telemetrias do dispositivo ${devId} para realizar calculo de disponibilidade. Erro: ${err}`)
  }));
}

const compileDataByDev = async (devId: string, promises: any[], result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, date: string, rusthistDebug: { motivo: string }) => {
  if (devId.startsWith('DAC')) {
    await compileDacData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DUT')) {
    await compileDutData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DAM')) {
    await compileDamData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DRI')) {
    await compileDriData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DAL')) {
    await compileDalData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DMT')) {
    await compileDmtData(devId, promises, result, date, rusthistDebug);
  }

  if (devId.startsWith('DMA')) {
    await compileDmaData(devId, promises, result, date, rusthistDebug);
  }
}

const compileDevDataByDay = async (result: {
  [devId: string]: {
    devId: string
    startDate: string
    endDate: string
    clientName: string
    unitName: string
    groupName: string
    roomName: string
    avgDisp: number
    dispList: { disponibility: number, YMD: string }[]
  }
}, startDate: string, index: number, devId: string, rusthistDebug: { motivo: string }, promises: any[], devData: {
  devId: string
  cstats: string
  chartsBas: string
  chartsDet: string
  YMD: string
  devOnline: number
}[]) => {
  const date = new Date(new Date(startDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
  const cachedData = getCachedData(devData, devId, date);

  if (cachedData) {
    // Dados já existentes no banco;
    result[devId].dispList.push({
      disponibility: parseFloat(((cachedData.devOnline || 0) * (100 / 24)).toFixed(2)),
      YMD: date,
    });
  } else {
    // Necessita compilar os dados para calcular disponibilidade;
    await compileDataByDev(devId, promises, result, date, rusthistDebug);
  }
}

const getDisponibilityByDev = async (devs: Awaited<ReturnType<typeof sqldb.DEVICES.getDevsDetails>>, 
                                     dateInfo: { startDate: string, endDate: string, numberOfDays: number },
                                     rusthistDebug: { motivo: string }, dataList:  {
                                                                                    devId: string
                                                                                    cstats: string
                                                                                    chartsBas: string
                                                                                    chartsDet: string
                                                                                    YMD: string
                                                                                    devOnline: number
                                                                                  }[],
                                     machinesList: Awaited<ReturnType<typeof sqldb.MACHINES.getMachinesList>>,
                                     unitsDuts: Awaited<ReturnType<typeof sqldb.DUTS.getListBasic>>
) => {
  const {startDate, endDate, numberOfDays} = dateInfo;
  const result = {} as {
    [devId: string]: {
      devId: string
      startDate: string
      endDate: string
      clientName: string
      unitName: string
      groupName: string
      roomName: string
      avgDisp: number
      dispList: { disponibility: number, YMD: string }[]
    }
  };
  for (const dev of devs) {
    const devId = dev.DEV_ID;
    if (result[devId]) continue;
    if (devId.startsWith('DAC') && dev.H_INDEX === 4) continue;
    if (devId.startsWith('DAM') && dev.H_INDEX === 4) continue;
    const {devData, dacMachine, dacMachineRoomName, damMachineNames, dutAndDamMachineRoomNames} = getFilteredDevsInfo(devId, dev, dataList, machinesList, unitsDuts);

    result[devId] = {
      devId,
      startDate,
      endDate,
      clientName: dev.CLIENT_NAME,
      unitName: dev.UNIT_NAME,
      groupName: devId.startsWith('DAC') ? dacMachine?.MACHINE_NAME : damMachineNames,
      roomName: devId.startsWith('DAC') ? dacMachineRoomName?.ROOM_NAME : dutAndDamMachineRoomNames,
      avgDisp: 0,
      dispList: [],
    }
    let promises: any[] = [];
    for (let index = 0; index < numberOfDays; index += 1) {
      await compileDevDataByDay(result, startDate, index, devId, rusthistDebug, promises, devData);
    }

    await Promise.all(promises);

    const avgDevDisp = parseFloat((result[devId].dispList.reduce((acc, value) => acc += value.disponibility, 0) / result[devId].dispList.length).toFixed(2));
    result[devId].avgDisp = avgDevDisp;
  }

  return result;
}

async function getDisponibilityData(unitIds: number[], startDate: string, endDate: string, rusthistDebug: { motivo: string }, iniTS: number) {
  const devs = await sqldb.DEVICES.getDevsDetails({ unitIds });
  if (devs.length === 0) return {};
  const machinesList = await sqldb.MACHINES.getMachinesList({ UNIT_IDS: unitIds });
  const unitsDuts = await sqldb.DUTS.getListBasic({ unitIds }, {});

  logger.info(`DBGLENT - ${rusthistDebug.motivo} (3)`, Date.now() - iniTS);

  let dataList = await getDataList(unitIds, devs, startDate, endDate);

  const numberOfDays = ((new Date(endDate).getTime()) - (new Date(startDate).getTime())) / (24 * 60 * 60 * 1000) + 1;

  logger.info(`DBGLENT - ${rusthistDebug.motivo} (4)`, Date.now() - iniTS);

  const result = await getDisponibilityByDev(devs, {startDate, endDate, numberOfDays}, rusthistDebug, dataList, machinesList, unitsDuts);

  logger.info(`DBGLENT - ${rusthistDebug.motivo} (5)`, Date.now() - iniTS);

  return result;
}

async function getDataListByUnit(unitId: number, startDate: string, endDate: string, devIds: string[]){
  let timezoneOffset = -3;
  const timezoneInfo = await getTimezoneByUnit({ UNIT_ID: unitId });
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
  }

  const dataList = await sqldb.cache_cond_tel.getDevAvgHoursOn({
    devIds,
    dayStart: startDate.split('T')[0],
    dayEnd: endDate.split('T')[0],
    timezoneOffset,
  })

  return dataList;
}

/**
 * @swagger
 * /clients/multiple-configs-units:
 *   post:
 *     summary: Editar algumas configurações das unidades
 *     description: Editar algumas configurações das unidades
 *     tags:
 *       - UNITS - EditConfigs
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados dos dispositivos
 *         schema:
 *           type: object
 *           properties:
 *             UNITS_IDS:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    UNIT_ID:
 *                      type: string
 *                    SUPERVISOR_ID:
 *                      type: number
 *               exemple:
 *                 - UNIT_ID: 2
 *                   SUPERVISOR_ID: email
 *               description: Array de objetos contendo as informações da unidade.
 *               default: []
 *               required: true
 *             TYPE:
 *               type: string
 *               description: tipo de alterações a serem feitas, pode ser 'STATUS' | 'RESP' | 'WEEKLYR'
 *               default: 1
 *               required: true
 *             SELECTED:
 *               type: string
 *               description: opção selecionada
 *               default: 1
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: CLIENT_ID
 *               default: 1
 *               required: true
 *     responses:
 *       200:
 *         description: Edição feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       401:
 *         description: Sem permissão para editar.
 *       408:
 *         description: Erro modificando alguma unidade.
 *       500:
 *         description: Erro interno do servidor
 */


export const verifyStatus = async (reqParams: httpRouter.ApiParams['/clients/multiple-configs-units'], session: SessionData) => {
  if (reqParams.TYPE === 'setStatus') {
    let status: boolean;
    if (reqParams.SELECTED === 'operation') { status = true } else { status = false }
    try {
      for (const unit of reqParams.UNITS_IDS) {
        await sqldb.CLUNITS.w_update({ UNIT_ID: unit.UNIT_ID, PRODUCTION: status}, session.user);
      }
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      throw Error('Error update Units Status').HttpStatus(408);
    }
  }
}

export const setSupervisor = async (unit: {
  UNIT_ID: number;
  SUPERVISOR_ID: string;
}, session: SessionData, selected: string[] | string) => {
  if (typeof selected === 'string') {
    await sqldb.UNITSUPERVISORS.w_setUnitSupervisors({ USER_ID: selected, UNIT_ID: unit.UNIT_ID }, session.user);
  } else {
    for (const selectedUser of selected) {
      await sqldb.UNITSUPERVISORS.w_setUnitSupervisors({ USER_ID: selectedUser, UNIT_ID: unit.UNIT_ID }, session.user);
    }
  }
}

export const loopSetSupervisors = async (unit: {
  UNIT_ID: number;
  SUPERVISOR_ID: string;
}, session: SessionData, selected: string[] | string | null) => {
  try {
    if (selected === null) {
      await sqldb.UNITSUPERVISORS.w_clearUnitSupervisors({ UNIT_ID: unit.UNIT_ID }, session.user);
    }
    else if (!unit.SUPERVISOR_ID && selected) {
      await setSupervisor(unit, session, selected);
    } else {
      await sqldb.UNITSUPERVISORS.w_clearUnitSupervisors({ UNIT_ID: unit.UNIT_ID }, session.user);
      await setSupervisor(unit, session, selected);
    }
  } catch (err) {
    logger.error(`msg: ${err} - user: ${session.user} - UNIT: ${unit}`);
    throw Error('Error update Units Responsibles').HttpStatus(408);
  };
}

export const verifyResponsible = async (reqParams: httpRouter.ApiParams['/clients/multiple-configs-units'], session: SessionData) => {
  if (reqParams.TYPE === 'setResponsible') {
    let selected: string[] | string | null = reqParams.SELECTED;
    if (reqParams.SELECTED === 'clear') selected = null;
    for (const unit of reqParams.UNITS_IDS) {
      await loopSetSupervisors(unit, session, selected);
    }
  }
}

export const verifyWeeklyReport = async (reqParams: httpRouter.ApiParams['/clients/multiple-configs-units'], session: SessionData) => {
  if (reqParams.TYPE === 'setWeeklyReport') {
    let selected = 1;
    if (reqParams.SELECTED === 'enable') selected = 0;
    try {
      for (const unit of reqParams.UNITS_IDS) {
        await sqldb.CLUNITS.w_update({ UNIT_ID: unit.UNIT_ID, DISABREP: selected }, session.user);
      }
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      throw Error(`Error update weekly reports, ${err}`).HttpStatus(408);
    }
  }
}

export const multipleConfigsUnits = async (reqParams: httpRouter.ApiParams['/clients/multiple-configs-units'], session: SessionData) => {
  if (!reqParams.UNITS_IDS || !reqParams.TYPE || !reqParams.SELECTED) throw Error('There was an error! Invalid properties.').HttpStatus(400);  
  if (!session.permissions.isInstaller && !session.permissions.isAdminSistema && !session.permissions.isParceiroValidador) {
    throw Error('You dont have permission').HttpStatus(401);
  }
  await verifyResponsible(reqParams, session);
  await verifyWeeklyReport(reqParams, session);
  await verifyStatus(reqParams, session);
  return 'OK';
}

httpRouter.privateRoutes['/clients/multiple-configs-units'] = multipleConfigsUnits;


/**
 * @swagger
 * /unit/export-real-time:
 *   post:
 *     summary: Exporta um pdf da unidade em tempo real
 *     description: Exporta um pdf da unidade em tempo real
 *     tags:
 *      - Unit
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
 *             UNIT_ID:
 *               type: number
 *               description: numero da unidade
 *             CLIENT_ID: 
 *               type: number
 *               description: cliente da unidade.
 *             MODE:
 *               type: string
 *               description: tipo de exportação
 *             DATA_MACHINE:
 *               type: array
 *               description: dados para criar o pdf de machines
 *             DATA_ENVIRONMENTS:
 *               type: aray
 *               description: dados para criar o pdf de environment
 *     responses:
 *       200:
 *         description: arquivos baixados com sucesso.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão.
 *       500:
 *         description: Erro interno do servidor
 */

export const getMachineHtml = async (language: string, unitInfo: IUnitInfo, reqParams: httpRouter.ApiParams['/unit/export-real-time'], session: SessionData) => {
  let inicialValue = 0;
  const devIds: string[] = [];
  if (reqParams.DATA_MACHINE?.length) {
    reqParams.DATA_MACHINE.forEach((item) => { inicialValue += item.dats.filter((dat) => dat.DEV_ID !== null).length; item.dacs?.forEach((dac) => devIds.push(dac.DAC_ID)); item.duts?.forEach((dut) => devIds.push(dut.DEV_ID))});
  } 
  if (reqParams.DATA_SISTEM_MACHINE?.length) {
    reqParams.DATA_SISTEM_MACHINE.forEach((item) => item.GROUPS.forEach((sist) => { inicialValue += sist.dats.filter((dat) => dat.DEV_ID !== null).length; sist.dacs?.forEach((dac) => devIds.push(dac.DAC_ID)); sist.duts?.forEach((dut) => devIds.push(dut.DEV_ID))}));
  }
  let emailBody = fs.readFileSync(path.resolve('./assets/RelatorioTempoRealMaquinas.html'), 'utf-8');
  emailBody = emailBody
    .replace('#TITULO#', t('maquinas', language))
    .replace('#TEMPOREAL#', t('tempoReal', language))
    .replace('#LOCALIZACAO#', t('localizacao', language))
    .replace('#UNIDADE#', t('unidade', language))
    .replace('#RESPONSAVEL#', t('responsavel', language))
    .replace('#N_DISPOSITIVO#', t('numDispositivo', language))
    .replace('$LOCAL$', unitInfo.CITY_NAME)
    .replace('$DATEINFO$', returnActualDate(false, language))
    .replace('$UNIT_NAME$', unitInfo.UNIT_NAME)
    .replace('$RESPONSIBLE$', unitInfo.SUPERVISOR_NAME || '-')
    .replace('$NUM_DISP$', inicialValue.toString())
    .replace('$NUMERO$', '16px');

  // CASOS DE DUT DE AUTOMAÇÃO

    const devAutList: string[] = []
    let setPointList: {[key: string]: number};
    const listInfoDuts: httpRouter.ApiResps['/get-duts-ircodes-list'] = {}
    reqParams.DATA_MACHINE?.forEach((group) => { if (group.DEV_AUT?.startsWith('DUT')) devAutList.push(group.DEV_AUT); });
    reqParams.DATA_SISTEM_MACHINE?.forEach((group) => group.GROUPS.forEach((dacs) => {if (dacs.DEV_AUT?.startsWith('DUT')) devAutList.push(dacs.DEV_AUT); }));
    if (devAutList.length > 0) {
      for (const dut of devAutList) {
        await addIrCodeinList(listInfoDuts, dut);
      }
      setPointList = await getSetPointOfDuts(devAutList);
    }
  ////////////////////
  const lastTelemetries = await devsLastComm.loadLastTelemetries({
    devIds
  });

  // CASOS DE SISTEMA
  let bodySitems = '';
  if (reqParams.DATA_SISTEM_MACHINE?.length > 0) {
    let [_headerSistem, bodySitem, _footerSistem] = emailBody.split('<!-- SISTEM -->');
    for (let sistem of reqParams.DATA_SISTEM_MACHINE) {
      bodySitem += await generateSistemContainerItem(sistem, listInfoDuts, setPointList, language, session, lastTelemetries);
    }
    bodySitems = bodySitem;
  }

  let [header, body, footer] = emailBody.split('<!-- SPLIT -->');

  for (let item of reqParams.DATA_MACHINE) {
    body += await generateHtmlContainerItemMachine(item, listInfoDuts, setPointList, language, session, lastTelemetries);
  }
  emailBody = header + bodySitems + body + footer;
  return emailBody;
}

export const getSetPointOfDuts = async (devAutList: string[]) => {
  const setPointList: {[key: string]: number} = {}
  for (const dut of devAutList) {
    const infoDutSetpoint = await sqldb.DEVICES.getSetPointDutAut({ DEVICE_CODE: dut });
    if (infoDutSetpoint) {
      setPointList[dut] = infoDutSetpoint.SETPOINT;
    }
  }
  return setPointList;
}

export const getEnvironmentsHtml = (language: string, unitInfo: IUnitInfo, reqParams: httpRouter.ApiParams['/unit/export-real-time'], session: SessionData) => {
  let emailBody = fs.readFileSync(path.resolve('./assets/RelatorioTempoRealMaquinas.html'), 'utf-8');
  emailBody = emailBody
    .replace('#TITULO#', t('ambientes', language))
    .replace('#TEMPOREAL#', t('tempoReal', language))
    .replace('#LOCALIZACAO#', t('localizacao', language))
    .replace('#UNIDADE#', t('unidade', language))
    .replace('#RESPONSAVEL#', t('responsavel', language))
    .replace('#N_DISPOSITIVO#', t('numDispositivo', language))
    .replace('$LOCAL$', unitInfo.CITY_NAME)
    .replace('$DATEINFO$', returnActualDate(false, language))
    .replace('$UNIT_NAME$', unitInfo.UNIT_NAME)
    .replace('$RESPONSIBLE$', unitInfo.SUPERVISOR_NAME || '-')
    .replace('$NUM_DISP$', reqParams.DATA_ENVIRONMENTS?.length.toString())
    .replace('$NUMERO$', '30px');

  let [header, body, footer] = emailBody.split('<!-- SPLIT -->');
  reqParams.DATA_ENVIRONMENTS?.forEach((item) => {
    body += generateHtmlContainerItemEnvironment(item, session);
  })
  emailBody = header + body + footer;
  return emailBody;
}

export const getAssetsHtml = async (language: string, unitInfo:  Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>) => {
  console.log('Nao implementado');
}

export const generatePdfWithRandomNameToDownload = async (emailBody: string, { req, res}: ExtraRouteParams, nameFileToExport: string) => {
  const nameFile1 = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 10) + '-' + uuid.v4();
  const nameFile = path.join(process.cwd(), nameFile1);
  fs.writeFileSync(`${nameFile}.html`, emailBody, 'utf-8');
  await runHtmlToPdfConverter(nameFile);
  res.append('filename', `${nameFileToExport}.pdf`);
  // fs.unlinkSync(`${nameFile}.html`); // comente essa linha para o html continuar salvo na pasta raiz
  res.status(200).download(`${nameFile}.pdf`, `${nameFileToExport}.pdf`);
}

export const mosaicDecide = async (reqParams: httpRouter.ApiParams['/unit/export-real-time'], infoUnit: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, languageUser: string, { req, res }: ExtraRouteParams, session: SessionData) => {
  if (reqParams.MODE === 'mosaic') {
    if (reqParams.EXPORTATION === 'machine') {
      const emailBody = await getMachineHtml(languageUser, infoUnit, reqParams, session);
      await generatePdfWithRandomNameToDownload(emailBody, { req, res }, `MachineRealTime - ${reqParams.UNIT_ID}`)
    }
    else if (reqParams.EXPORTATION === 'environments') {
      const emailBody = getEnvironmentsHtml(languageUser, infoUnit, reqParams, session);
      await generatePdfWithRandomNameToDownload(emailBody, { req, res }, `EnvironmentRealTime - ${reqParams.UNIT_ID}`)
    }
    else if (reqParams.EXPORTATION === 'assets') {
      getAssetsHtml(languageUser, infoUnit);
    }
  }
}

export const exportReportRealTime = async (reqParams: httpRouter.ApiParams['/unit/export-real-time'], session: SessionData, { req, res }: ExtraRouteParams) => {
  if (!reqParams.UNIT_ID || !reqParams.EXPORTATION) {
    throw Error('Error in parameters').HttpStatus(400);
  }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  const permission = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, reqParams.UNIT_ID);
  if (!permission.canViewDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }
  const infoUnit = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!infoUnit) {
    throw Error('Unidade não encontrada').HttpStatus(400);
  }
  const languageUser = req.headers['accept-language']? req.headers['accept-language'] : 'pt';
  await mosaicDecide(reqParams, infoUnit, languageUser, { req, res }, session);
  return res;
}

httpRouter.privateRoutes['/unit/export-real-time'] = exportReportRealTime;

async function deleteIlluminationsByUnit(qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.DALS_ILLUMINATIONS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.DAMS_ILLUMINATIONS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.DALS_EXCEPTIONS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.DALS_SCHEDULES.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.DMTS_ILLUMINATIONS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.ILLUMINATION_IMAGES.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
  await sqldb.ILLUMINATIONS.w_deleteFromUnitIllumination({UNIT_ID: qPars.UNIT_ID}, userId);
}

async function deleteIlluminationsByClient(qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DALS_ILLUMINATIONS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.DAMS_ILLUMINATIONS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.DALS_EXCEPTIONS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.DALS_SCHEDULES.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.DMTS_ILLUMINATIONS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ILLUMINATION_IMAGES.w_deleteFromClientIlluminations({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ILLUMINATIONS.w_deleteFromClientIllumination({CLIENT_ID: qPars.CLIENT_ID}, userId);
}

/**
 * @swagger
 * /clients/get-all-units-by-client:
 *   post:
 *     summary: Lista de unidades
 *     description: Retorna uma lista de unidades
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
 *             CLIENT_ID:
 *               required: true
 *               type: number
 *               default: null
 *               description: id do Cliente
 *             UNITS_WITH_OTHERS_TIMEZONES:
 *               required: false
 *               type: boolean
 *               default: null
 *               description: Se teremos unidades com timezones diferentes de -3
 *             FILTER_BY_UNIT_IDS:
 *               required: false
 *               type: array
 *               items:
 *                 type: number
 *               default: ""
 *               description: Ids de unidades a se filtrar
 *             FILTER_BY_PRODUCTION_TIMESTAMP_DATE:
 *               required: false
 *               type: string
 *               default: null
 *               description: Se teremos iremos filtrar por data em que a unidade entrou em produção
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   list:
 *                     type: array
 *                     items:
 *                        type: object
 *                        properties:
 *                          UNIT_ID:
 *                            type: number
 *                            description: Id da unidade
 *                          UNIT_NAME:
 *                            type: string
 *                            description: Nome da unidade
 *                          CLIENT_NAME:
 *                            type: string
 *                            description: Nome do cliente
 *                          CITY_NAME:
 *                            type: string
 *                            description: Nome da cidade
 *                          STATE_NAME:
 *                            type: string
 *                            description: Nome do estado
 *                          TARIFA_KWH:
 *                            type: number
 *                            description: Tarifa da unidade
 *                          CONSTRUCTED_AREA:
 *                            type: number
 *                            description: Área construída
 *                          CAPACITY_POWER:
 *                            type: number
 *                            description: Somatório da capacidade de refrigeração da unidade
 *                          PRODUCTION_TIMESTAMP:
 *                            type: string
 *                            description: Data em que a unidade entrou em produção
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getAllUnitsProductionByClient = async (reqParams: httpRouter.ApiParams['/clients/get-all-units-by-client'], session: SessionData) => {
  if (!reqParams.CLIENT_ID) throw Error('Invalid properties. Missing CLIENT_ID').HttpStatus(400);
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) throw Error('Permission Denied!').HttpStatus(403);
  
  const units = await sqldb.CLUNITS.getAllUnitsByClient(reqParams);
  return { list: units }
}

httpRouter.privateRoutes['/clients/get-all-units-by-client'] = getAllUnitsProductionByClient;

/**
 * @swagger 
 * /unit/set-observation:
 *   post:
 *     summary: Editar ou criar observação
 *     description: Cria ou edita uma observação
 *     tags:
 *       - Observacao
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da observacao
 *         schema:
 *           type: object
 *           properties:
 *             ID:
 *               type: number
 *               description: ID da observação
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da unidade
 *               default: ""
 *               required: true
 *             DATE_OBS:
 *               type: date
 *               description: data da observação
 *               default: ""
 *               required: true
 *             OBS:
 *               type: string
 *               description: observação
 *               default: ""
 *               required: true
 *             ISVISIBLE:
 *               type: bool
 *               description: se está visivel
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: ok quando sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: OK
 *       401:
 *         description: Não foi possível encontrar o usuário
 *       500:
 *         description: Erro interno do servidor
 */

export const setObservationRoute = async (reqParams: httpRouter.ApiParams['/unit/set-observation'], session: SessionData) => {
  if (!reqParams.UNIT_ID || !reqParams.DATE_OBS || !reqParams.OBS) throw Error('Missing Params').HttpStatus(400);
  if (reqParams.OBS.length > 1500) throw Error('Too large').HttpStatus(400);
  const infoUnit = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: Number(reqParams.UNIT_ID) });
  const permissions = await getPermissionsOnUnit(session, infoUnit.CLIENT_ID, infoUnit.CLIENT_ID);
  if (!permissions.canManageObservations) throw Error('Permission denied!').HttpStatus(403);
  try {
    if (!reqParams.ID) {
      const id = await sqldb.OBSERVATIONS.w_insert({ ISVISIBLE: reqParams.ISVISIBLE, DATE_OBS: new Date(reqParams.DATE_OBS), USER_ID: session.user, OBS: reqParams.OBS });
      await sqldb.UNITS_OBSERVATIONS.w_insert({ UNIT_ID: reqParams.UNIT_ID, OBS_ID: id.insertId });
    } else {
      if (!session.permissions.isAdminSistema) {
        const OBS = await sqldb.OBSERVATIONS.getObsByObsId({ ID: reqParams.ID });
        if (OBS.USER_ID !== session.user) throw Error('Permission denied!').HttpStatus(403);
      }
      await sqldb.OBSERVATIONS.w_update({
        ID: reqParams.ID,
        ISVISIBLE: reqParams.ISVISIBLE,
        DATE_OBS: moment(reqParams.DATE_OBS, "DD/MM/YYYY HH:mm:ss").toDate(),
        OBS: reqParams.OBS
      });
    }
    return "OK";
  } catch(err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error set observation').HttpStatus(408);
  };
}

httpRouter.privateRoutes['/unit/set-observation'] = setObservationRoute;

/**
 * @swagger
 * /unit/get-observations:
 *   post:
 *     summary: Ver observaçoes por unidade
 *     description: Ver observaçoes por unidade
 *     tags:
 *       - Observacao
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da unidade
 *         schema:
 *           type: object
 *           properties:
 *             unitId:
 *               type: number
 *               description: ID da unidade
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: ok quando sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: OK
 *       401:
 *         description: Não foi possível encontrar o usuário
 *       500:
 *         description: Erro interno do servidor
 */

export const getObservationRoute = async (reqParams: httpRouter.ApiParams['/unit/get-observations'], session: SessionData) => {
  if (!reqParams.unitId) throw Error('Missing Params').HttpStatus(400);
  const infoUnit = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.unitId });
  const timezoneInfo = await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: reqParams.unitId });
  const permission = await getPermissionsOnUnit(session, infoUnit.CLIENT_ID, infoUnit.UNIT_ID);
  if (!permission.canViewObservations) throw Error('Permission denied!').HttpStatus(403);
  try {
    const newArray = [];
    const list = await sqldb.OBSERVATIONS.getObsByUnitId({ UNIT_ID: reqParams.unitId });
    for (const item of list) {
      const newDate = calculateDateByTimezone({ DATE: item.DATE_OBS.toISOString(), TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
      newArray.push(
        {
          ...item,
          DATE_OBS: moment(newDate).format("DD/MM/YYYY HH:mm:ss"),
        }
      )
    }
    if (permission.canManageObservations) {
      return newArray;
    }
    return newArray.filter((item) => item.ISVISIBLE === 1);
  } catch(err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error searching for observations').HttpStatus(408);
  };
}

httpRouter.privateRoutes['/unit/get-observations'] = getObservationRoute;

/**
 * @swagger
 * /unit/delete-observation:
 *   post:
 *     summary: Editar ou criar observação
 *     description: Cria ou edita uma observação
 *     tags:
 *       - Observacao
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da observacao
 *         schema:
 *           type: object
 *           properties:
 *             observations:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    ID:
 *                      type: number
 *                      description: ID da observação
 *                      default: ""
 *                      required: false
 *                    UNIT_ID:
 *                      type: number
 *                      description: ID da unidade
 *                      default: ""
 *                      required: true
 *                    DATE_OBS:
 *                      type: date
 *                      description: data da observação
 *                      default: ""
 *                      required: true
 *                    OBS:
 *                      type: string
 *                      description: observação
 *                      default: ""
 *                      required: true
 *                    ISVISIBLE:
 *                      type: bool
 *                      description: se está visivel
 *                      default: ""
 *                      required: true
 *             unitId:
 *               type: number
 *               description: id da unidade
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: ok quando sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: OK
 *       401:
 *         description: Não foi possível encontrar o usuário
 *       500:
 *         description: Erro interno do servidor
 */

export const deleteObservationRoute = async (reqParams: httpRouter.ApiParams['/unit/delete-observation'], session: SessionData) => {
  if (!reqParams.observation || !reqParams.unitId) throw Error('Missing Params').HttpStatus(400);
  const infoUnit = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: Number(reqParams.unitId) });
  const permissions = await getPermissionsOnUnit(session, infoUnit.CLIENT_ID, infoUnit.UNIT_ID);
  if (!permissions.canManageObservations) throw Error('Permission denied!').HttpStatus(403);
  try {
    if (!session.permissions.isAdminSistema) {
      const OBS = await sqldb.OBSERVATIONS.getObsByObsId({ ID: reqParams.observation.ID });
      if (OBS.USER_ID !== session.user) throw Error('Permission denied!').HttpStatus(403);
    }
    await sqldb.OBSERVATIONS.w_deleteRow({ OBS_ID: reqParams.observation.ID }, session.user);
    return "OK";
  } catch(err) {
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error delete observation').HttpStatus(408);
  };
}

httpRouter.privateRoutes['/unit/delete-observation'] = deleteObservationRoute;

/**
 * @swagger
 * /unit/get-refrigeration-consumption-unit:
 *   post:
 *     summary: Consumo de refrigeração da unidade
 *     description: Buscar consumo de refrigeração
 *     tags:
 *       -  Unit
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros a se pesquisar consumo 
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: Código da Unidade
 *               default: null
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar consumo
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar consumo
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de consumo de refrigeração da unidade 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_consumption:
 *                   type: number
 *                   description: Consumo total de refrigeração da unidade nesse período
 *                 consumption_by_device_machine:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties: 
 *                        device_code: 
 *                          type: string
 *                          description: Código do Dispositivo
 *                        machine_id:
 *                          type: number
 *                          description: Id da máquina
 *                        total_utilization_time:
 *                          type: number
 *                          description: Total de horas utilizadas
 *                        total_refrigeration_consumption:
 *                          type: string
 *                          description: Total de consumo de refrigeração
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const getRefrigerationConsumptionUnit = async (reqParams: httpRouter.ApiParams['/unit/get-refrigeration-consumption-unit'], session: SessionData) => {
  if (!reqParams.UNIT_ID) throw Error('Invalid properties. Missing UNIT_ID').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission Denied!').HttpStatus(403);
  }

  const response = await axios.post(`${configfile.computedDataServerUrl}energy_efficiency/get-total-consumption-by-unit`, {
    start_date: reqParams.START_DATE,
    end_date: reqParams.END_DATE,
    unit_id: reqParams.UNIT_ID,
  });

  const result: {
    total_consumption: number,
    consumption_by_device_machine: {
      machine_id: number,
      device_code: string,
      total_utilization_time: number,
      total_refrigeration_consumption: number
    }[]
  } = {
    total_consumption: response?.data?.total_refrigeration_consumption ?? 0,
    consumption_by_device_machine: response?.data?.consumption_by_device_machine ?? [],
  };

  return result;
}

httpRouter.privateRoutes['/unit/get-refrigeration-consumption-unit'] = getRefrigerationConsumptionUnit;

/**
 * @swagger
 * /unit/get-energy-consumption-unit:
 *   post:
 *     summary: Consumo de energia da unidade
 *     description: Buscar consumo de energia
 *     tags:
 *       -  Unit
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros a se pesquisar consumo 
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: Código da Unidade
 *               default: null
 *               required: true
 *             START_DATE:
 *               type: string
 *               description: Data inicial ao buscar consumo
 *               default: ""
 *               required: false
 *             END_DATE:
 *               type: string
 *               description: Data final ao buscar consumo
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de consumo de refrigeração da unidade 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consumptionByDevice:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties: 
 *                       device_code: 
 *                         type: string
 *                         description: Código do Dispositivo
 *                       consumption:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             day:
 *                               type: string
 *                               description: Dia do consumo no formato YYYY-MM-DD
 *                             totalMeasured:
 *                               type: number
 *                               description: Total de energia medida no dia
 *                             maxDayTotalMeasured:
 *                               type: number
 *                               description: Máximo de energia medida no dia
 *                             dataIsInvalid:
 *                               type: boolean
 *                               description: Dado contém leituras invalidas de energia
 *                             dataIsProcessed:
 *                               type: boolean
 *                               description: Dado contém leituras re-processadas de energia
 *                             hours:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   hour:
 *                                     type: string
 *                                     description: Hora do consumo no formato HH
 *                                   totalMeasured:
 *                                     type: number
 *                                     description: Total de energia medida na hora
 *                                   dataIsInvalid:
 *                                     type: boolean
 *                                     description: leitura invalida de energia
 *                                   dataIsProcessed:
 *                                     type: boolean
 *                                     description: leitura re-processada de energia
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Permissão negada.
 *       500:
 *         description: Erro interno do servidor
 */
export const getEnergyConsumptionUnit = async (reqParams: httpRouter.ApiParams['/unit/get-energy-consumption-unit'], session: SessionData) => {
  if (!reqParams.UNIT_ID) throw Error('Invalid properties. Missing UNIT_ID').HttpStatus(400);
  if ([reqParams.START_DATE, reqParams.END_DATE].some((date) => date == null)) throw Error('Invalid properties. Missing Dates').HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission Denied!').HttpStatus(403);
  }

  let energy_hist: {
    electric_circuit_reference_id: number,
    day: string,
    total_measured: number,
    max_day_total_measured: number,
    hours: {
      hour: string,
      totalMeasured: number,
    }[],
    contains_invalid: boolean,
    contains_processed: boolean
  }[]

  const consumptionByDevice: httpRouter.ApiResps['/unit/get-energy-consumption-unit']['consumptionByDevice'] = [];

  const energy_devices = await sqldb.ENERGY_DEVICES_INFO.getEnergyDevicesDriByUnit({ UNIT_ID: unitInfo.UNIT_ID });
  if (!energy_devices.length) return { consumptionByDevice }

  const response = await axios.post(`${configfile.computedDataServerUrl}energy/get-energy-consumption`, {
    start_date: reqParams.START_DATE,
    end_date: reqParams.END_DATE,
    unit_id: reqParams.UNIT_ID,
    get_hour_consumption: reqParams.GET_HOURS_CONSUMPTION,
    isDielUser: !!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS
  });

  energy_hist = response?.data?.energy_consumption_list || [];

  const startDate = new Date(reqParams.START_DATE);
  const endDate = new Date(reqParams.END_DATE);

  energy_devices.forEach(device => {
    const consumptionForDevice = energy_hist.filter(item => item.electric_circuit_reference_id === device.ELECTRIC_CIRCUIT_ID);
    const daysMap = new Map();

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayStr = date.toISOString().split('T')[0];
      daysMap.set(dayStr, {
        day: dayStr,
        totalMeasured: 0,
        maxDayTotalMeasured: 0,
        hours: reqParams.GET_HOURS_CONSUMPTION ? Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          totalMeasured: 0,
        })) : [],
      });
    }

    consumptionForDevice.forEach(x => {
      daysMap.set(x.day, {
        day: x.day,
        totalMeasured: x.total_measured || 0,
        maxDayTotalMeasured: x.max_day_total_measured || 0,
        hours: x.hours || [],
        dataIsInvalid: x.contains_invalid,
        dataIsProcessed: x.contains_processed
      });
    });

    const consumptionFormatted = Array.from(daysMap.values());

    consumptionByDevice.push({ device_code: device.DEVICE_CODE, consumption: consumptionFormatted })
  });

  return { consumptionByDevice }
}

httpRouter.privateRoutes['/unit/get-energy-consumption-unit'] = getEnergyConsumptionUnit;

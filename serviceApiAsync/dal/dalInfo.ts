import sqldb from '../../srcCommon/db';
import { getPermissionsOnClient, getPermissionsOnUnit, getUserGlobalPermissions, getAllowedUnitsView, canSeeDevicesWithoutProductionUnit } from '../../srcCommon/helpers/permissionControl';
import { SessionData } from '../../srcCommon/types';
import * as httpRouter from '../apiServer/httpRouter';
import { editDeviceUnit } from '../devices/devicesInfo';
import { parseCurrentDalCardsToScheduler, sendDalCardsToScheduler, verifyExceptions, verifySchedules } from '../devsScheduler';
import { logger } from '../../srcCommon/helpers/logger';
import { getIlluminationStatus } from '../dmt/dmtInfo';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { compareVersions, parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion';
import { parseFullProgV4 } from '../../srcCommon/helpers/scheduleData';
import { sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones';
import { ramCaches_TIMEZONES_updateTimezoneId } from '../realTime/eventHooks';
import { sendDamCommand_scheduler } from '../../srcCommon/iotMessages/devsCommands';
import { retryFunction } from '../../srcCommon/helpers/retries';

type ScheduleDatabase = Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>>[number];
type ExceptionDatabase = Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>>[number];

export const checkAvailablePorts = async (dalCode?: string) => {
  const dal = await sqldb.DALS.getIdByCode({DEVICE_CODE: dalCode});
  let usedPorts: {ID: number, DAL_ID: number, ILLUMINATION_ID: number, PORT: number, FEEDBACK: number}[] = [];

  if(dal){
    usedPorts = await sqldb.DALS_ILLUMINATIONS.getDalUsedPorts({DAL_ID: dal.ID});
  }

  const ans : {
    freePorts: boolean,
    freeFeedbacks: boolean,
    ports: {label: string, associated: boolean, port: number, illuminationId?: number}[],
    feedbacks: {label: string, associated: boolean, port: number, illuminationId?: number}[],
  } = {
    freePorts: usedPorts.length < 4,
    freeFeedbacks: usedPorts.length < 4,
    ports: [
      {label: '1', port: 1, associated: false},
      {label: '2', port: 2, associated: false},
      {label: '3', port: 3, associated: false},
      {label: '4', port: 4, associated: false},
    ],
    feedbacks: [
      {label: '1', port: 1, associated: false},
      {label: '2', port: 2, associated: false},
      {label: '3', port: 3, associated: false},
      {label: '4', port: 4, associated: false},
    ]
  }

  for(const illumination of usedPorts){
    if(illumination.PORT){
      ans.ports[illumination.PORT-1].associated = true;
      ans.ports[illumination.PORT-1].illuminationId = illumination.ILLUMINATION_ID;
    }
    if (illumination.FEEDBACK) {
      ans.feedbacks[illumination.FEEDBACK-1].associated = true;
      ans.feedbacks[illumination.FEEDBACK-1].illuminationId = illumination.ILLUMINATION_ID;
    }
  }

  return ans;
}

interface IDalIllumination {
  ID?: number | null
  UNIT_ID: number
  DAL_CODE?: string
  DMT_CODE?: string
  DAM_ILLUMINATION_CODE?: string
  NAME: string
  GRID_VOLTAGE?: number | null
  GRID_CURRENT?: number | null
  PORT?: number | null
  FEEDBACK?: number | null
  DEFAULT_MODE?: string | null
};
interface ListIllumination {
  ID: number
  UNIT_ID: number
  DAL_CODE: string
  DMT_CODE: string
  DAM_ILLUMINATION_CODE: string
  NAME: string
  GRID_VOLTAGE: number
  GRID_CURRENT: number
  DAL_PORT: number
  DMT_PORT: number
  FEEDBACK: number
  UNIT_NAME: string
  CLIENT_NAME: string
  CITY_NAME: string
  STATE_UF: string
  CLIENT_ID: number
};

const insertNewDal = async (reqParams: IDalIllumination, session: SessionData ) => {
  let dal;
  const devData = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: reqParams.DAL_CODE, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
  ramCaches_TIMEZONES_updateTimezoneId(reqParams.DAL_CODE, 31);
  await sqldb.DALS.w_insertIgnore({DEVICE_ID: devData.insertId}, session.user);
  dal = await sqldb.DALS.getIdByCode({DEVICE_CODE: reqParams.DAL_CODE});
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({UNIT_ID: reqParams.UNIT_ID});
  if(unitInfo){
    await sqldb.DEVICES_CLIENTS.w_insertIgnore({CLIENT_ID: unitInfo.CLIENT_ID, DEVICE_ID: devData.insertId }, session.user);
    await sqldb.DEVICES_UNITS.w_insertIgnore({UNIT_ID: reqParams.UNIT_ID, DEVICE_ID: devData.insertId}, session.user);
    await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devId: devData.insertId });
  }
  return dal;
};

const editOldDal = async (reqParams: IDalIllumination, session: SessionData) => {
  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: reqParams.DAL_CODE});
  if(devData?.ID){
    await editDeviceUnit(devData.ID, reqParams.UNIT_ID, session.user);
  }
}

export const setDal = async (reqParams: IDalIllumination, session: SessionData ) => {
  let dal;
  if (!reqParams.DAL_CODE) return dal;
  if (reqParams.DAL_CODE.length !== 12 || !reqParams.DAL_CODE.startsWith('DAL')) throw Error('There was an error!\nInvalid properties. Invalid DAL_CODE.').HttpStatus(400);

  dal = await sqldb.DALS.getIdByCode({DEVICE_CODE: reqParams.DAL_CODE});
  if(!dal?.ID){
    dal = await insertNewDal(reqParams, session);
  }else{
    await editOldDal(reqParams, session);
  }

  const availablePorts = await checkAvailablePorts(reqParams.DAL_CODE);
  if(!reqParams.ID && !availablePorts.freePorts) throw Error('There was an error!\nNo ports available.').HttpStatus(400);
  
  return dal;
}

const deleteIllumWithNoAssociationsInfo = async (reqParams: IDalIllumination, user: string) => {
  const currentIllumData = await sqldb.ILLUMINATIONS.getIllumination({ID: reqParams.ID});
  const dalAssociations = await sqldb.DALS_ILLUMINATIONS.getDalUsedPorts({ DAL_ID: currentIllumData.DAL_ID });
  const dmtIllumAssociations = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({ DMT_ID: currentIllumData.DMT_ID });
  const dmtNobreakAssociations = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: currentIllumData.DMT_ID});
  
  const associations = (dmtIllumAssociations.length && dmtIllumAssociations) || (dmtNobreakAssociations.length && dmtNobreakAssociations) || dalAssociations;
  if (!associations.length) {
    const devCode = currentIllumData.DMT_CODE || currentIllumData.DAL_CODE;
    const dev = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: devCode });
    if (dev) {
      await sqldb.DEVICES_UNITS.w_deleteRow({DEVICE_ID: dev.ID}, user);
      await sqldb.DEVICES_CLIENTS.w_deleteRow({DEVICE_ID: dev.ID}, user);
    }
    if(currentIllumData.DMT_ID){
      await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: currentIllumData.DMT_ID}, user);
    }
  }
};

const editOldIllumination = async (reqParams: IDalIllumination, user: string) => {
  const currentIllumData = await sqldb.ILLUMINATIONS.getIllumination({ID: reqParams.ID});
  const currentIllumPort = currentIllumData.DMT_PORT || currentIllumData.DAL_PORT;
  if(
    currentIllumData.DAL_CODE !== reqParams.DAL_CODE
    || currentIllumData.DMT_CODE !== reqParams.DMT_CODE
    || currentIllumData.DAM_ILLUMINATION_CODE !== reqParams.DAM_ILLUMINATION_CODE
    || currentIllumPort !== reqParams.PORT
    || currentIllumData.FEEDBACK !== reqParams.FEEDBACK
    || currentIllumData.DEFAULT_MODE !== reqParams.DEFAULT_MODE
  ){
    await sqldb.DALS_ILLUMINATIONS.w_deleteDalIllumByIllumId({ILLUMINATION_ID: reqParams.ID}, user);
    await sqldb.DMTS_ILLUMINATIONS.w_deleteDmtIlluminationstByIlluminationId({ILLUMINATION_ID: reqParams.ID}, user);
    await sqldb.DAMS_ILLUMINATIONS.w_deleteByIlluminationId({ILLUMINATION_ID: reqParams.ID}, user);

    await deleteIllumWithNoAssociationsInfo(reqParams, user);

    if (!reqParams.DAL_CODE) {
      await sqldb.DALS_SCHEDULES.w_updateByIllumId({ ILLUMINATION_ID: reqParams.ID, DAL_ID: null }, user);
      await sqldb.DALS_EXCEPTIONS.w_updateByIllumId({ ILLUMINATION_ID: reqParams.ID, DAL_ID: null }, user);
    }   

    if (!reqParams.DAM_ILLUMINATION_CODE) {
      await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({ DEVICE_CODE: currentIllumData.DAM_ILLUMINATION_CODE }, user);
      await sqldb.DEVICES_CLIENTS.w_deleteFromDeviceCode({ DEVICE_CODE: currentIllumData.DAM_ILLUMINATION_CODE }, user);
    }   
  }
  await sqldb.ILLUMINATIONS.w_updateInfo({
    ID: reqParams.ID,
    UNIT_ID: reqParams.UNIT_ID,
    NAME: reqParams.NAME,
    GRID_VOLTAGE: reqParams.GRID_VOLTAGE,
    GRID_CURRENT: reqParams.GRID_CURRENT,
  }, user);
}

export const setIllumination = async (reqParams: IDalIllumination, session: SessionData) => {
  let illumId = reqParams.ID;
  if(!reqParams.ID){
    const illumData = await sqldb.ILLUMINATIONS.w_insert({
      NAME: reqParams.NAME,
      UNIT_ID: reqParams.UNIT_ID,
      GRID_VOLTAGE: reqParams.GRID_VOLTAGE,
      GRID_CURRENT: reqParams.GRID_CURRENT,
    }, session.user);
    illumId = illumData.insertId;
  }else{
    await editOldIllumination(reqParams, session.user);
  }
  return illumId;
}

const checkAssociatedIllumination = async (reqParams: IDalIllumination, session: SessionData, dal: {ID: number}, illumId: number) => {
  const availablePorts = await checkAvailablePorts(reqParams.DAL_CODE);
  let illumAlreadyAssociated = false;
  const associations = await sqldb.DALS_ILLUMINATIONS.getDalUsedPorts({ DAL_ID: dal.ID });
  if (associations.some((x) => x.ILLUMINATION_ID === illumId && (x.PORT === reqParams.PORT || x.FEEDBACK === reqParams.FEEDBACK))) {
    return true;
  }
  const dev = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: reqParams.DAL_CODE });
  if(reqParams.ID && illumId){
    for(const port of availablePorts.ports){
      if(port.illuminationId === illumId){
        if(port.port !== reqParams.PORT){
          const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumination({DAL_ID: dal.ID, ILLUMINATION_ID: illumId});

          if (!dalIllumination) {
            await sqldb.DALS_ILLUMINATIONS.w_insert({
              DAL_ID: dal.ID,
              ILLUMINATION_ID: illumId,
              DEFAULT_MODE: reqParams.DEFAULT_MODE,
              PORT: reqParams.PORT,
              FEEDBACK: reqParams.FEEDBACK,
            }, session.user);
          }
          else {
            await sqldb.DALS_ILLUMINATIONS.w_update({
              DAL_ID: dal.ID,
              ILLUMINATION_ID: illumId,
              PORT: reqParams.PORT,
              DEFAULT_MODE: reqParams.DEFAULT_MODE,
              FEEDBACK: reqParams.FEEDBACK,
            }, session.user);
          }
          await editDeviceUnit(dev.ID, reqParams.UNIT_ID, session.user);
        }
        illumAlreadyAssociated = true;
      }
    }
  }
  return illumAlreadyAssociated;
};

export const associateIlluminationToDal = async (reqParams: IDalIllumination, session: SessionData, dal: {ID: number}, illumId: number) => {
  if(!reqParams.DAL_CODE || !dal || !dal.ID) return;

  const availablePorts = await checkAvailablePorts(reqParams.DAL_CODE);
  const illumAlreadyAssociated = await checkAssociatedIllumination(reqParams, session, dal, illumId);

  const dev = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: reqParams.DAL_CODE });

  if(!illumAlreadyAssociated && illumId){
    if(reqParams.PORT && ((reqParams.PORT > 4 && reqParams.PORT < 1) || (availablePorts.ports[reqParams.PORT-1].associated))) throw Error('There was an error!\nThe port has already been associated or unavailable.').HttpStatus(400);
    if(reqParams.FEEDBACK && ((reqParams.FEEDBACK > 4 && reqParams.FEEDBACK < 1) || (availablePorts.feedbacks[reqParams.FEEDBACK-1].associated))) throw Error('There was an error!\nThe feedback has already been associated or unavailable.').HttpStatus(400);
    const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumination({DAL_ID: dal.ID, ILLUMINATION_ID: illumId});
    if (!dalIllumination) {
      await sqldb.DALS_ILLUMINATIONS.w_insert({
        ILLUMINATION_ID: illumId,
        DAL_ID: dal.ID,
        DEFAULT_MODE: reqParams.DEFAULT_MODE,
        PORT: reqParams.PORT,
        FEEDBACK: reqParams.FEEDBACK,
      }, session.user);
    }
    else {
      await sqldb.DALS_ILLUMINATIONS.w_update({
        ILLUMINATION_ID: illumId,
        DAL_ID: dal.ID,
        PORT: reqParams.PORT,
        DEFAULT_MODE: reqParams.DEFAULT_MODE,
        FEEDBACK: reqParams.FEEDBACK,
      }, session.user);
    }
    await editDeviceUnit(dev.ID, reqParams.UNIT_ID, session.user);
    await sqldb.DALS_SCHEDULES.w_updateByIllumId({ ILLUMINATION_ID: reqParams.ID, DAL_ID: dal.ID }, session.user);
    await sqldb.DALS_EXCEPTIONS.w_updateByIllumId({ ILLUMINATION_ID: reqParams.ID, DAL_ID: dal.ID }, session.user);
  }
};

export const checkNeedResendScheds = async (DAL_CODE: string, ILLUMINATION_ID?: number) => {
  const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumByIllumId({ ILLUMINATION_ID: ILLUMINATION_ID });
  const currDalCode = dalIllumination?.DAL_CODE;
  const dalCode = DAL_CODE || currDalCode;
  const scheds = (await sqldb.DALS_SCHEDULES.getIllumScheds({ ILLUMINATION_ID: ILLUMINATION_ID }));
  const exceptions = (await sqldb.DALS_EXCEPTIONS.getIllumExceptions({ ILLUMINATION_ID: ILLUMINATION_ID }));
  const allProgs = [...scheds, ...exceptions];
  if (dalCode && allProgs.length) {
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(dalCode);
    checkDeviceOnline(dalCode, connectionStatus);
    return true;
  }
  return false;
}

const checkDeviceOnline = (DAL_CODE: string, connectionStatus: string) => {
  if (connectionStatus !== 'ONLINE') {
    throw new Error(`Dispositivo ${DAL_CODE} não está online`).HttpStatus(400);
  }
}

const getDeviceCode = (DMT_CODE: string, DAL_CODE: string, DAM_ILLUMINATION_CODE: string) => {
  return DMT_CODE || DAL_CODE || DAM_ILLUMINATION_CODE
}

const getFeedBack = (DMT_PORT: number, FEEDBACK: number) => {
  return DMT_PORT || FEEDBACK
}

const getConnection = (connection: "ONLINE" | "OFFLINE" | "LATE") => {
  return connection || "OFFLINE"
}

const getLastTelemetries = async (list: ListIllumination[]) => {
    // "devsCodes" é uma lista de "dev_id" para evitar chamar "loadLastTelemetries" sem filtro.
    const devsCodes = new Set<string>();
    list.forEach((row) => {
      if (row.DMT_CODE) devsCodes.add(row.DMT_CODE);
      if (row.DAL_CODE) devsCodes.add(row.DAL_CODE);
      if (row.DAM_ILLUMINATION_CODE) devsCodes.add(row.DAM_ILLUMINATION_CODE);
    });
    const lastTelemetries = await devsLastComm.loadLastTelemetries({
      devIds: (devsCodes.size <= 500) ? Array.from(devsCodes) : undefined,
    });

    return lastTelemetries
}
export const desasociateDalFromClientAndUnit = async (reqParams: httpRouter.ApiParams['/dal/set-dal-illumination'], session: SessionData, dalCode: string) => {
  if (reqParams.DAL_CODE || dalCode) {
    let infoDal: Awaited<ReturnType<typeof sqldb.DALS_ILLUMINATIONS.getDalIllumList>>;
    if (reqParams.DAL_CODE) {
      infoDal = await sqldb.DALS_ILLUMINATIONS.getDalIllumList({ DAL_CODE: reqParams.DAL_CODE });
    } else {
      infoDal = await sqldb.DALS_ILLUMINATIONS.getDalIllumList({ DAL_CODE: dalCode });
    }
    if (infoDal.length === 0) {
      const idDevice = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: reqParams.DAL_CODE || dalCode });
      await sqldb.DEVICES_UNITS.w_deleteRow({ DEVICE_ID: idDevice?.ID }, session.user);
      await sqldb.DEVICES_CLIENTS.w_deleteRow({ DEVICE_ID: idDevice?.ID }, session.user);
    }
  }
}

/**
 * @swagger
 * /dal/set-dal-illumination:
 *   post:
 *     summary: Criar e Editar DAL Iluminação
 *     description: Se o ID não for passado, cria DAL Iluminação, caso contrário edita o DAL Iluminação do ID passado.
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DAL
 *         schema:
 *           type: object
 *           properties:
 *             ID:
 *               type: number
 *               description: ID da Iluminação
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             NAME:
 *               type: string
 *               description: Nome da Iluminação
 *               default: ""
 *               required: true
 *             DAL_CODE:
 *               type: string
 *               description: Código Do DAL (DALXXXXXXXXX)
 *               default: ""
 *               required: false
 *             GRID_VOLTAGE:
 *               type: number
 *               description: Tensão da Rede (V)
 *               default: ""
 *               required: false
 *             GRID_CURRENT:
 *               type: number
 *               description: Corrente da Rede (A)
 *               default: ""
 *               required: false
 *             PORT:
 *               type: number
 *               description: Porta do DAL
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: DAL Iluminação criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos, portas indisponíveis ou porta já associada.
 *       403:
 *         description: Sem permissão para editar ou criar DAL Iluminação
 *       500:
 *         description: Erro interno do servidor
 */
export const setDalIlluminationRoute = async (reqParams: httpRouter.ApiParams['/dal/set-dal-illumination'], session: SessionData) => {
  if (!reqParams.NAME) throw Error('There was an error!\nInvalid properties. Missing NAME.').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  try {
    let dalCode;
    if (!reqParams.DAL_CODE && reqParams.ID) {
      dalCode = await sqldb.DEVICES.getDalCode({ ILLUM_ID: reqParams.ID });
    }
    const needDeviceOnline = await checkNeedResendScheds(reqParams.DAL_CODE, reqParams.ID);
    if (needDeviceOnline) await parseCurrentDalCardsToScheduler(reqParams.DAL_CODE, session.user);
    let dal = await setDal(reqParams, session);
    let illumId = await setIllumination(reqParams, session);
    await associateIlluminationToDal(reqParams, session, dal, illumId);
    await desasociateDalFromClientAndUnit(reqParams, session, dalCode?.DEVICE_CODE);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'SUCCESS ON SET DAL ILLUMINATION';
}

httpRouter.privateRoutes['/dal/set-dal-illumination'] = setDalIlluminationRoute;

/**
 * @swagger
 * /dal/get-dal-illumination-list:
 *   post:
 *     summary: Listar DAL Illuminations do Cliente
 *     description: Listar todas as informações dos DAL Illuminations
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Cliente
 *         schema:
 *           type: object
 *           properties:
 *             clientIds:
 *               type: array
 *               description: IDs de Clientes
 *               default: ""
 *               required: false
 *             unitIds:
 *               type: aray
 *               description: IDs de Unidades
 *               default: ""
 *               required: false
 *             INCLUDE_INSTALLATION_UNIT:
 *                type: boolean
 *                description: Incluir Unidade em instalação
 *                default: true
 *                required: false
 *             stateIds:
 *               type: aray
 *               description: IDs de Estados para filtragem
 *               default: ""
 *               required: false
 *             cityIds:
 *               type: aray
 *               description: IDs de Cidades para filtragem
 *               default: ""
 *               required: false
 *             connection:
 *               type: aray
 *               description: Conexões para filtragem
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de Nobreaks do Cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               description:
 *               items:
 *                 type: object
 *                 properties:
 *                   ID: 
 *                     type: number
 *                     description: ID do Ultiliário
 *                   UNIT_ID: 
 *                     type: number
 *                     description: ID da Unidade
 *                   UNIT_NAME: 
 *                     type: string
 *                     description: Nome da Unidade
 *                   DAL_CODE: 
 *                     type: string
 *                     description: Código do DAL
 *                   DMT_CODE: 
 *                     type: string
 *                     description: Código do DMT
 *                   DEVICE_CODE: 
 *                     type: string
 *                     description: Código do Device
 *                   NAME: 
 *                     type: string
 *                     description: Nome do Utilitário
 *                   GRID_VOLTAGE: 
 *                     type: number
 *                     description: Tensão
 *                   GRID_CURRENT: 
 *                     type: number
 *                     description: Corrente
 *                   PORT: 
 *                     type: number
 *                     description: Porta do DMT | DAL
 *                   FEEDBACK: 
 *                     type: number
 *                     description: Feedback do DMT | DAL
 *                   APPLICATION: 
 *                     type: string
 *                     description: Tipo de Aplicação do Utilitário 
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar iluminações do cliente
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dal/get-dal-illumination-list'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(Number(x)));
  }

  if ((!reqParams.clientIds) || await canSeeDevicesWithoutProductionUnit(reqParams.clientIds)) {
    reqParams.INCLUDE_INSTALLATION_UNIT = true;
  }

  let includeUnit = true;
  if(reqParams.INCLUDE_INSTALLATION_UNIT === false) {
    includeUnit = false;
  }

  const list = await sqldb.ILLUMINATIONS.getIllumInfoList({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
  });

  const lastTelemetries = await getLastTelemetries(list)


  return list.map((ilum) => {
    let connection;
    let status;
    if (ilum.DAL_CODE) {
      const lastComm = lastTelemetries.lastDalTelemetry(ilum.DAL_CODE);
      connection = getConnection(lastComm?.status);
      status = (ilum.FEEDBACK && (lastComm?.lastTelemetry?.Feedback?.[ilum.FEEDBACK - 1]) || null);
    }
    if (reqParams.connection && !reqParams.connection.includes(connection)) { return null; }
    return {
      ...ilum,
      PORT: ilum.DAL_PORT,
      FEEDBACK: getFeedBack(ilum.DMT_PORT, ilum.FEEDBACK),
      DEVICE_CODE: getDeviceCode(ilum.DMT_CODE, ilum.DAL_CODE, ilum.DAM_ILLUMINATION_CODE) ,
      APPLICATION: 'Iluminação',
      connection,
      status,
    }
  }).filter((item) => item !== null);;
}

const hasSched = async (deviceCode: string, illumId?: number) => {
  if (deviceCode.startsWith('DAM')) {
    const damsList = await sqldb.DAMS.getListWithProgFU({ damIds: [deviceCode] }, { includeDacs: true });
    if (damsList.length !== 1) throw Error('DAM not found!').HttpStatus(403)
  
    const damInf = damsList[0];
    const prog = parseFullProgV4(damInf.DESIREDPROG);
    if (Object.keys(prog.week || {}).length > 0 || Object.keys(prog?.exceptions || {}).length > 0) return true;
  } else if (deviceCode.startsWith('DAL')) { 
    const dalBasicInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: deviceCode });
    let scheds = [];
    let exceptions = [];
    if (illumId) {
      scheds = await sqldb.DALS_SCHEDULES.getIllumScheds({ ILLUMINATION_ID: illumId });
      exceptions = await sqldb.DALS_EXCEPTIONS.getIllumExceptions({ ILLUMINATION_ID: illumId });
    } else {
      scheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID });
      exceptions = await sqldb.DALS_EXCEPTIONS.getDalExceptions({ DAL_ID: dalBasicInfo.ID })
    }
    if (scheds.length > 0 || exceptions.length > 0) return true;
  }
  
  return false;
}

const formatIllumList = async (list: Awaited<ReturnType<typeof sqldb.ILLUMINATIONS.getIllumInfoListWithoutDmt>>) => {
  const ans = [] as {
    ILLUMINATION_ID: number,
    ILLUM_DEV_ID: number,
    DEVICE_CODE: string
    UNIT_NAME: string
    UNIT_ID: number
    CITY_NAME: string
    STATE_NAME: string
    ILLUMINATION_NAME: string
    PORT: number
    FEEDBACK: number
    HAS_SCHEDULE: boolean,
  }[];

 for (const circuit of list) {
    if (circuit.DAM_ILLUMINATION_CODE || (circuit.DAL_CODE && circuit.DAL_PORT)) {
      ans.push({
        ILLUMINATION_ID: circuit.ILLUMINATION_ID,
        ILLUM_DEV_ID: circuit.ILLUM_DEV_ID,
        DEVICE_CODE: getDeviceCode(circuit.DMT_CODE, circuit.DAL_CODE, circuit.DAM_ILLUMINATION_CODE),
        UNIT_NAME: circuit.UNIT_NAME,
        UNIT_ID: circuit.UNIT_ID,
        CITY_NAME: circuit.CITY_NAME,
        STATE_NAME: circuit.STATE_UF,
        ILLUMINATION_NAME: circuit.NAME,
        PORT: circuit.DAL_PORT,
        FEEDBACK: getFeedBack(circuit.DMT_PORT, circuit.FEEDBACK),
        HAS_SCHEDULE: await hasSched(getDeviceCode(circuit.DMT_CODE, circuit.DAL_CODE, circuit.DAM_ILLUMINATION_CODE), circuit.ILLUMINATION_ID),
      });
    }
  }

  return ans;
}

httpRouter.privateRoutes['/dal-dam/get-illumination-list'] = async function (reqParams, session) {
  const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }

    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));

    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  if ((!reqParams.clientIds) || await canSeeDevicesWithoutProductionUnit(reqParams.clientIds)) reqParams.INCLUDE_INSTALLATION_UNIT = true;
  

  let includeUnit = reqParams.INCLUDE_INSTALLATION_UNIT === false ? false : true;

  const list = await sqldb.ILLUMINATIONS.getIllumInfoListWithoutDmt({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds, INCLUDE_INSTALLATION_UNIT: includeUnit });

  const ans = await formatIllumList(list);

  return ans;
}

/**
 * @swagger
 * /dal/delete-dal-illumination:
 *   post:
 *     summary: Deletar DAL Iluminação
 *     description: Deletar DAL Iluminação através do ID
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Iluminação
 *         schema:
 *           type: object
 *           properties:
 *             ILLUMINATION_ID:
 *               type: number
 *               description: ID da Iluminação
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: DAL Iluminação criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para deletar DAL Iluminação
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dal/delete-dal-illumination'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.ILLUMINATION_ID) throw Error('There was an error!\nInvalid properties. Missing ILLUMINATION_ID.').HttpStatus(400);


  await sqldb.DALS_SCHEDULES.w_deleteByIllumId({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID }, session.user);
  await sqldb.DALS_EXCEPTIONS.w_deleteByIllumId({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID }, session.user);
  const illuminationInfo = await sqldb.ILLUMINATIONS.getIllumination({ID: reqParams.ILLUMINATION_ID});

  await sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteByIlluminationId({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID }, session.user);
  await sqldb.DAMS_ILLUMINATIONS.w_deleteByIlluminationId({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID }, session.user);
  await sqldb.DMTS_ILLUMINATIONS.w_deleteDmtIlluminationstByIlluminationId({ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.DALS_ILLUMINATIONS.w_deleteDalIllumByIllumId({ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.DAMS_ILLUMINATIONS.w_deleteByIlluminationId({ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.ELECTRIC_CIRCUITS_ILLUMINATIONS.w_deleteElectricCircuitsIlluminationsByID({ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.ELECTRIC_CIRCUITS.w_deleteByIlluminationId({ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.ILLUMINATION_IMAGES.w_deleteFromIllumination({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID}, session.user);
  await sqldb.ILLUMINATIONS.w_delete({ID: reqParams.ILLUMINATION_ID}, session.user);

  const dalUsedPorts = await sqldb.DALS_ILLUMINATIONS.getDalUsedPorts({DAL_ID: illuminationInfo.DAL_ID});
  const dmtIllumUsedPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: illuminationInfo.DMT_ID});
  const dmtNobreakUsedPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: illuminationInfo.DMT_ID});

  const usedPorts = (dmtIllumUsedPorts.length && dmtIllumUsedPorts) || (dmtNobreakUsedPorts.length && dmtNobreakUsedPorts) || dalUsedPorts;

  if((usedPorts && usedPorts.length === 0) || illuminationInfo.DAM_ILLUMINATION_CODE){
    const devDalData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: illuminationInfo.DAL_CODE || illuminationInfo.DAM_ILLUMINATION_CODE});
    if(devDalData?.ID){
      await sqldb.DEVICES_UNITS.w_deleteRow({DEVICE_ID: devDalData.ID}, session.user);
      await sqldb.DEVICES_CLIENTS.w_deleteRow({DEVICE_ID: devDalData.ID}, session.user);
    }
    if(illuminationInfo.DMT_ID){
      await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: illuminationInfo.DMT_ID}, session.user);
    }
  }

  return 'DELETED';
}

/**
 * @swagger
 * /dal/get-dal-ports-info:
 *   post:
 *     summary: Verificar disponibilidade de portas do DAL
 *     description: Verificar disponibilidade de portas do DAL através do DAL Code
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DAL
 *         schema:
 *           type: object
 *           properties:
 *             DAL_CODE:
 *               type: string
 *               description: Código do DAL (DALXXXXXXXXX)
 *               default: ""
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações das Portas do DAL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freePorts:
 *                   type: boolean
 *                   description: Se o DAL possui portas livres
 *                 ports:
 *                   type: array
 *                   description: Array com as informações de cada porta do DAL
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Label da porta do DAL
 *                       associated:
 *                         type: boolean
 *                         description: Se a porta está associada ou não
 *                       port:
 *                         type: number
 *                         description: Número da porta
 *                       illuminationId:
 *                         type: number
 *                         description: ID da Iluminação
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar portas do DAL
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dal/get-dal-ports-info'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);
  if (!reqParams.DAL_CODE) throw Error('There was an error!\nInvalid properties. Missing DAL_CODE.').HttpStatus(400);
  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  if (reqParams.DAL_CODE.length !== 12 || !reqParams.DAL_CODE.startsWith('DAL')) throw Error('There was an error!\nInvalid properties. Invalid DAL_CODE.').HttpStatus(400);

  const portsInfo = await checkAvailablePorts(reqParams.DAL_CODE);

  return portsInfo;
}

export async function deleteDal (qPars: { DAL_CODE: string }, userId: string) {
  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: qPars.DAL_CODE});
  if(devData?.ID){
    await sqldb.DEVICES_CLIENTS.w_deleteRowFromDeviceId({DEVICE_ID: devData.ID}, userId);
    await sqldb.DEVICES_UNITS.w_deleteRowByDeviceId({DEVICE_ID: devData.ID}, userId);
    const dalData = await sqldb.DALS.getIdByCode({DEVICE_CODE: qPars.DAL_CODE});
    if(dalData?.ID){
      await sqldb.DALS_ILLUMINATIONS.w_deleteDalIllumByDalId({DAL_ID:dalData.ID}, userId);
      await sqldb.DALS_SCHEDULES.w_deleteByDal({ DAL_ID: dalData.ID }, userId);
      await sqldb.DALS_EXCEPTIONS.w_deleteByDal({ DAL_ID: dalData.ID }, userId);
      await sqldb.DALS.w_delete({ID: dalData.ID}, userId);
      await sqldb.DEVICES.w_delete({ID: devData.ID}, userId);
    }
  }
}


export async function deleteClientDals (qPars: { CLIENT_ID: number }, userId: string) {
  const dals = await sqldb.DALS.getDalsByClient({CLIENT_ID: qPars.CLIENT_ID});
  for(const dal of dals){
    await deleteDal({DAL_CODE: dal.DEVICE_CODE}, userId);
  }
}

/**
 * @swagger
 * /dal/get-illumination-info:
 *   post:
 *     summary: Buscar informações de Iluminação
 *     description: Buscar informações completas de uma Iluminação, com o DAL que está associado
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Iluminação
 *         schema:
 *           type: object
 *           properties:
 *             ILLUMINATION_ID:
 *               type: number
 *               description: ID da Iluminação
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações da Iluminação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ID:
 *                   type: number
 *                   description: ID da Iluminação
 *                 NAME:
 *                   type: string
 *                   description: Nome da Iluminação
 *                 GRID_VOLTAGE:
 *                   type: number
 *                   description: Tensão da rede da Iluminação
 *                 GRID_CURRENT:
 *                   type: number
 *                   description: Corrente da rede da Iluminação
 *                 DAL_ID:
 *                   type: number
 *                   description: ID do DAL associado
 *                 DAL_CODE:
 *                   type: string
 *                   description: Código do DAL associado
 *                 DMT_ID:
 *                   type: number
 *                   description: ID do DMT associado
 *                 DMT_CODE:
 *                   type: string
 *                   description: Código do DMT associado
 *                 PORT:
 *                   type: number
 *                   description: PORTA do DAL ou DMT associado
 *                 FEEDBACK:
 *                   type: number
 *                   description: Porta de feedback do DAL associado
 *                 UNIT_ID:
 *                   type: number
 *                   description: ID da unidade
 *                 UNIT_NAME:
 *                   type: string
 *                   description: Nome da unidade
 *                 CLIENT_ID:
 *                   type: number
 *                   description: ID do cliente
 *                 CLIENT_NAME:
 *                   type: string
 *                   description: Nome do cliente
 *                 STATUS:
 *                   type: string
 *                   description: Status da Iluminação
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar portas do DAL
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dal/get-illumination-info'] = async function (reqParams, session) {
  if (!reqParams.ILLUMINATION_ID) throw Error('Invalid parameters! Missing ILLUMINATION_ID').HttpStatus(400)
  let illumInfo = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: reqParams.ILLUMINATION_ID });
  const port = illumInfo.DMT_PORT || illumInfo.DAL_PORT || null;
  const perms = await getPermissionsOnUnit(session, illumInfo.CLIENT_ID, illumInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (illumInfo.DMT_CODE) {
    const { lastTelemetry, status: connectionStatus } = await devsLastComm.loadLastDmtTelemetry(illumInfo.DMT_CODE);
    const dmtIllumStatus = await getIlluminationStatus(illumInfo.DMT_CODE, illumInfo.ID, lastTelemetry, connectionStatus);

    return {...illumInfo, PORT: port, STATUS: dmtIllumStatus.status };
  }

  if (illumInfo.DAM_ILLUMINATION_CODE) {
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(illumInfo.DAM_ILLUMINATION_CODE);

    return {...illumInfo, PORT: port, STATUS: connectionStatus};
  }

  if (illumInfo.DAL_CODE) {
    return {...illumInfo, PORT: port, isCommandAvailable: await isCommandDalAvailable(illumInfo.DAL_CODE) };
  }

  return {...illumInfo, PORT: port }; 
}

async function isCommandDalAvailable (devId: string) {
  const devFwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId });
  const fwVersion =  parseFirmwareVersion(devFwInfo.CURRFW_VERS ? devFwInfo.CURRFW_VERS : '');  

  // should return true if patch is 4.0.4 or higher
  if (fwVersion != null) {
    if (fwVersion.vMajor >= 5) return true
    if (fwVersion.vMajor >= 4 && fwVersion.vMinor >= 1) return true
    if (fwVersion.vMajor >= 4 && fwVersion.vPatch >= 4) return true 
  }
  
  return false
}

httpRouter.privateRoutes['/dal/get-dal-scheds'] = async function (reqParams, session) {
  if (!reqParams.DAL_CODE) throw new Error('Parâmetro DAL_CODE não informado').HttpStatus(400);
  const dalBasicInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: reqParams.DAL_CODE });

  const perms = await getPermissionsOnUnit(session, dalBasicInfo.CLIENT_ID, dalBasicInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let scheds = [];
  let exceptions = [];

  if (reqParams.ILLUMINATION_ID) {
    scheds = await sqldb.DALS_SCHEDULES.getIllumScheds({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID });
    exceptions = await sqldb.DALS_EXCEPTIONS.getIllumExceptions({ ILLUMINATION_ID: reqParams.ILLUMINATION_ID });
  } else {
    scheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID });
    exceptions = await sqldb.DALS_EXCEPTIONS.getDalExceptions({ DAL_ID: dalBasicInfo.ID })
  }

  return { scheds, exceptions }
}

interface DaySched {
  BEGIN_TIME: string;
  END_TIME: string;
  DAYS: string;
}

function checkConvergence(
  currentScheds: DaySched[],
  newSched: DaySched,
) {
  const convergence = currentScheds.find((x) => (
    (newSched.BEGIN_TIME >= x.BEGIN_TIME && newSched.BEGIN_TIME <= x.END_TIME)
    ||
    (newSched.END_TIME >= x.BEGIN_TIME && newSched.END_TIME <= x.END_TIME))
  );
  if (convergence) {
    // Se a convergência não for sequencial, gera erro
    if (convergence.BEGIN_TIME !== newSched.END_TIME && newSched.BEGIN_TIME !== convergence.END_TIME) {
      throw new Error('Há programações sobrepostas').HttpStatus(400);
    }
  }
}

function checkSchedsConvergence(
  currentScheds: DaySched[],
  newSched?: DaySched,
) {
  const daysProgs = {
    'sun': [],
    'mon': [],
    'tue': [],
    'wed': [],
    'thu': [],
    'fri': [],
    'sat': [],
  } as {[day: string]: DaySched[]}
  const scheds = newSched ? currentScheds.concat(newSched) : currentScheds;
  for (const sched of scheds) {
    const days = JSON.parse(sched.DAYS) || {}
    for (const [day, selected] of Object.entries(days)) {
      if (!selected) continue;
      const dayScheds = daysProgs[day]
      checkConvergence(dayScheds, sched);
      dayScheds.unshift(sched);
    }
  }
}

type NewSchedParams = httpRouter.ApiParams['/dal/add-illumination-sched']
type NewExceptionParams = httpRouter.ApiParams['/dal/add-illumination-exception']

function checkSchedParams(sched: NewSchedParams) {
  if (!sched.ILLUMINATION_ID) throw new Error('Parâmetro ILLUMINATION_ID não informado').HttpStatus(400);
  if (!sched.TITLE) throw new Error('Parâmetro TITLE não informado').HttpStatus(400);
  if (!sched.ACTIVE) throw new Error('Parâmetro ACTIVE não informado').HttpStatus(400);
  if (!sched.BEGIN_TIME) throw new Error('Parâmetro BEGIN_TIME não informado').HttpStatus(400);
  if (!sched.END_TIME) throw new Error('Parâmetro END_TIME não informado').HttpStatus(400);
  if (!sched.DAYS) throw new Error('Parâmetro DAYS não informado').HttpStatus(400);
  if (!sched.STATUS) throw new Error('Parâmetro STATUS não informado').HttpStatus(400);
}

function checkExceptionParams(exception: NewExceptionParams) {
  if (!exception.ILLUMINATION_ID) throw new Error('Parâmetro ILLUMINATION_ID não informado').HttpStatus(400);
  if (!exception.TITLE) throw new Error('Parâmetro TITLE não informado').HttpStatus(400);
  if (!exception.ACTIVE) throw new Error('Parâmetro ACTIVE não informado').HttpStatus(400);
  if (!exception.BEGIN_TIME) throw new Error('Parâmetro BEGIN_TIME não informado').HttpStatus(400);
  if (!exception.END_TIME) throw new Error('Parâmetro END_TIME não informado').HttpStatus(400);
  if (!exception.EXCEPTION_DATE) throw new Error('Parâmetro EXCEPTION_DATE não informado');
  if (!exception.REPEAT_YEARLY) throw new Error('Parâmetro REPEAT_YEARLY não informado');
  if (!exception.STATUS) throw new Error('Parâmetro STATUS não informado');
}

async function checkDalEditPermission(reqParams: { DAL_CODE: string }, session: SessionData) {
  if (!reqParams.DAL_CODE) throw new Error('Parâmetro DAL_CODE não informado').HttpStatus(400);
  const dalBasicInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: reqParams.DAL_CODE });

  const perms = await getPermissionsOnUnit(session, dalBasicInfo.CLIENT_ID, dalBasicInfo.UNIT_ID);
  if (perms.canManageDevs) {
    return dalBasicInfo;
  }
  else throw Error('Permission denied!').HttpStatus(403);
}


interface DayExcept {
  BEGIN_TIME: string;
  END_TIME: string;
  ID?: number;
}

interface ExceptionInfo {
  ID?: number;
  DAL_ID?: number;
  ILLUMINATION_ID: number;
  TITLE: string;
  ACTIVE: string;
  BEGIN_TIME: string;
  END_TIME: string;
  EXCEPTION_DATE: string;
  REPEAT_YEARLY: string;
  STATUS: string;
  DELETE?: boolean;
  INSERT?: boolean;
  EDIT?: boolean;
}

const compareTimes = (time_1: DayExcept, time_2: DayExcept) => ((time_1.BEGIN_TIME <= time_2.BEGIN_TIME && time_2.BEGIN_TIME <= time_1.END_TIME)
|| (time_2.BEGIN_TIME <= time_1.BEGIN_TIME && time_1.BEGIN_TIME <= time_2.END_TIME)
|| (time_1.BEGIN_TIME <= time_2.BEGIN_TIME && time_2.END_TIME <= time_1.END_TIME)
|| (time_2.BEGIN_TIME <= time_1.BEGIN_TIME && time_1.END_TIME <= time_2.END_TIME));

const hasHoursConflicts = (excepts: DayExcept[]) => {
  let foundConvergence = false;

  for (let i = 0; i < excepts.length; i++) {
    for (let j = i + 1; j < excepts.length; j++) {
      if (compareTimes(excepts[i], excepts[j])) {
        foundConvergence = true;
      }
    }
  }
  return foundConvergence;
};

const handleDayExceptsInsertion = (dayExcepts: {[date: string]: {[year: string]: DayExcept[]}}, dateDM: string, except: ExceptionInfo) => {
  if (except.REPEAT_YEARLY === '1') {
    if (!dayExcepts[dateDM]?.YEARLY) {
      dayExcepts[dateDM].YEARLY = [{ BEGIN_TIME: except.BEGIN_TIME, END_TIME: except.END_TIME, ID: except.ID }];
    } else {
      dayExcepts[dateDM].YEARLY.push({ BEGIN_TIME: except.BEGIN_TIME, END_TIME: except.END_TIME, ID: except.ID });
    }
  } else {
    const dateY = except.EXCEPTION_DATE.slice(6, 10);
    if (!dayExcepts[dateDM]?.[dateY]) {
      dayExcepts[dateDM][dateY] = [{ BEGIN_TIME: except.BEGIN_TIME, END_TIME: except.END_TIME, ID: except.ID }];
    } else {
      dayExcepts[dateDM][dateY].push({ BEGIN_TIME: except.BEGIN_TIME, END_TIME: except.END_TIME, ID: except.ID });
    }
  }
};

const getDayExcepts = (excepts: ExceptionInfo[]) => {

  const dayExcepts = {} as {[date: string]: {[year: string]: DayExcept[]}};
  for (const except of excepts) {
    if (except.ACTIVE === '0') continue;
    const dateDM = except.EXCEPTION_DATE.slice(0, 5);
    if (!dayExcepts[dateDM]) dayExcepts[dateDM] = {};

    handleDayExceptsInsertion(dayExcepts, dateDM, except);
  }

  return dayExcepts;
};

const checkNotYearlyExcept = (dayExcepts: {[date: string]: {[year: string]: DayExcept[]}}, date: string, yearlyExcepts: DayExcept[]) => {
  for (const year of Object.keys(dayExcepts[date])) {
    if (year === 'YEARLY') continue;
    const excepts = dayExcepts[date][year].concat(yearlyExcepts);
    const checkExceptsConvergence = hasHoursConflicts(excepts);
    if (checkExceptsConvergence) {
      return true;
    }
  }
  return false;
};

const checkExceptsConvergence = (excepts: ExceptionInfo[]) => {
  const dayExcepts = getDayExcepts(excepts);

  for (const date of Object.keys(dayExcepts)) {
    const yearlyExcepts = dayExcepts[date]?.YEARLY || [];
    const checkExceptsConvergence = hasHoursConflicts(yearlyExcepts);
    if (checkExceptsConvergence) {
      throw new Error('Há exceções sobrepostas').HttpStatus(400);
    }
    if (checkNotYearlyExcept(dayExcepts, date, yearlyExcepts)) {
      throw new Error('Há exceções sobrepostas').HttpStatus(400);
    }

  }
};

httpRouter.privateRoutes['/dal/add-illumination-multiple-scheds'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    reqParams.SCHEDS.forEach((sched) => checkSchedParams(sched));
    reqParams.EXCEPTIONS.forEach((exception) => checkExceptionParams(exception));

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    checkSchedsConvergence(reqParams.SCHEDS.filter((sched) => !sched.DELETE));
    checkExceptsConvergence(reqParams.EXCEPTIONS.filter((except) => !except.DELETE));

    let hasProgToEdit = false;
    let hasExceptToEdit = false;

    const schedsToDelete = reqParams.SCHEDS.filter((sched) => sched.DELETE);

    for (const sched of schedsToDelete) {
      hasProgToEdit = true;

      await sqldb.DALS_SCHEDULES.w_delete({
        SCHED_ID: sched.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        DAL_ID: dalBasicInfo.ID,

      }, session.user);
    }
    
    const schedsToEdit = reqParams.SCHEDS.filter((sched) => sched.EDIT);

    for (const sched of schedsToEdit) {
      hasProgToEdit = true;

      const currentScheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID,  });
      const illumCurrentScheds = currentScheds
        .filter((currSched) => currSched.ILLUMINATION_ID === reqParams.ILLUMINATION_ID && currSched.ID !== sched.ID);
      checkSchedsConvergence(illumCurrentScheds, {
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
      });
  
      const qPars = {
        SCHED_ID: sched.ID,
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: sched.TITLE || undefined,
        ACTIVE: sched.ACTIVE || undefined,
        BEGIN_TIME: sched.BEGIN_TIME || undefined,
        END_TIME: sched.END_TIME || undefined,
        STATUS: sched.STATUS || undefined,
        DAYS: sched.DAYS || undefined,
      }
      await sqldb.DALS_SCHEDULES.w_update(qPars, session.user);
    }

    const schedsToInsert = reqParams.SCHEDS.filter((sched) => sched.INSERT);

    for (const sched of schedsToInsert) {
      hasProgToEdit = true;

      const currentScheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID });
      const illumCurrentScheds = currentScheds.filter((currSched) => currSched.ILLUMINATION_ID === reqParams.ILLUMINATION_ID);
      checkSchedsConvergence(illumCurrentScheds, {
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
      });
  
      await updateDefaultMode(illumCurrentScheds, reqParams.ILLUMINATION_ID, session.user);
  
      await sqldb.DALS_SCHEDULES.w_insert({
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: sched.TITLE,
        ACTIVE: sched.ACTIVE,
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
        STATUS: sched.STATUS,
      }, session.user);
    }

    const exceptsToDelete = reqParams.EXCEPTIONS.filter((except) => except.DELETE);

    for (const except of exceptsToDelete) {
      hasExceptToEdit = true;

      await sqldb.DALS_EXCEPTIONS.w_delete({
        DAL_ID: dalBasicInfo.ID,
        EXCEPTION_ID: except.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID
      }, session.user);
    }

    const exceptsToEdit = reqParams.EXCEPTIONS.filter((except) => except.EDIT);

    for (const except of exceptsToEdit) {
      hasExceptToEdit = true;
      
      const qPars = {
        EXCEPTION_ID: except.ID,
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: except.TITLE || undefined,
        ACTIVE: except.ACTIVE || undefined,
        BEGIN_TIME: except.BEGIN_TIME || undefined,
        END_TIME: except.END_TIME || undefined,
        EXCEPTION_DATE: except.EXCEPTION_DATE || undefined,
        REPEAT_YEARLY: except.REPEAT_YEARLY || undefined,
        STATUS: except.STATUS || undefined
      }

      await sqldb.DALS_EXCEPTIONS.w_update(qPars, session.user);
    }

    const exceptsToInsert = reqParams.EXCEPTIONS.filter((except) => except.INSERT);
    for (const except of exceptsToInsert) {
      hasExceptToEdit = true;

      await sqldb.DALS_EXCEPTIONS.w_insert({
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: except.TITLE,
        ACTIVE: except.ACTIVE,
        BEGIN_TIME: except.BEGIN_TIME,
        END_TIME: except.END_TIME,
        EXCEPTION_DATE: except.EXCEPTION_DATE,
        REPEAT_YEARLY: except.REPEAT_YEARLY,
        STATUS: except.STATUS,
      }, session.user);
    }

    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, hasProgToEdit, hasExceptToEdit);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'ADD OK';
}

httpRouter.privateRoutes['/dal/add-illumination-sched'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    checkSchedParams(reqParams);
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    const currentScheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID });
    const illumCurrentScheds = currentScheds.filter((sched) => sched.ILLUMINATION_ID === reqParams.ILLUMINATION_ID);
    checkSchedsConvergence(illumCurrentScheds, {
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      DAYS: reqParams.DAYS,
    });

    if (!illumCurrentScheds.length) {
      const illum = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: reqParams.ILLUMINATION_ID });
      if (!illum.DEFAULT_MODE) {
        await sqldb.DALS_ILLUMINATIONS.updateDefaultMode({ DEFAULT_MODE: "0", ILLUMINATION_ID: reqParams.ILLUMINATION_ID }, session.user);
      }
    };

    await sqldb.DALS_SCHEDULES.w_insert({
      DAL_ID: dalBasicInfo.ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      TITLE: reqParams.TITLE,
      ACTIVE: reqParams.ACTIVE,
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      DAYS: reqParams.DAYS,
      STATUS: reqParams.STATUS,
    }, session.user);

    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, true, false);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'ADD OK';
}

const checkDalScheduleParams = async (SCHED_ID: number, ILLUMINATION_ID: number, dalBasicInfo: { ID: number }) => {
  if (!SCHED_ID) throw new Error('Parâmetro SCHED_ID não informado').HttpStatus(400);
  const sched = await sqldb.DALS_SCHEDULES.getDalSchedById({ ID: SCHED_ID });
  if (sched.DAL_ID !== dalBasicInfo.ID || sched.ILLUMINATION_ID !== ILLUMINATION_ID) {
    throw Error('Parâmetros incorretos!').HttpStatus(400)
  }
}

httpRouter.privateRoutes['/dal/update-illumination-sched'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    await checkDalScheduleParams(reqParams.SCHED_ID, reqParams.ILLUMINATION_ID, dalBasicInfo);

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    const currentScheds = await sqldb.DALS_SCHEDULES.getDalScheds({ DAL_ID: dalBasicInfo.ID });
    const illumCurrentScheds = currentScheds
      .filter((sched) => sched.ILLUMINATION_ID === reqParams.ILLUMINATION_ID && sched.ID !== reqParams.SCHED_ID);
    checkSchedsConvergence(illumCurrentScheds, {
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      DAYS: reqParams.DAYS,
    });

    const qPars = {
      SCHED_ID: reqParams.SCHED_ID,
      DAL_ID: dalBasicInfo.ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      TITLE: reqParams.TITLE || undefined,
      ACTIVE: reqParams.ACTIVE || undefined,
      BEGIN_TIME: reqParams.BEGIN_TIME || undefined,
      END_TIME: reqParams.END_TIME || undefined,
      STATUS: reqParams.STATUS || undefined,
      DAYS: reqParams.DAYS || undefined,
    }
    await sqldb.DALS_SCHEDULES.w_update(qPars, session.user);
    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, true, false);
  } catch (err) {
    logger.error(err);
    throw err;
  }
  return 'UPDATE OK';
}

httpRouter.privateRoutes['/dal/delete-illumination-sched'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    await checkDalScheduleParams(reqParams.SCHED_ID, reqParams.ILLUMINATION_ID, dalBasicInfo);
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    await sqldb.DALS_SCHEDULES.w_delete({
      SCHED_ID: reqParams.SCHED_ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      DAL_ID: dalBasicInfo.ID,

    }, session.user);

    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, true, false);
  
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'DELETE SCHED OK';
}

httpRouter.privateRoutes['/dal/delete-illumination-all-scheds'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);

    const [schedules, exceptions] = await Promise.all([
      sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID }),
      sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID })
    ]);

    const newSchedules = schedules.filter((schedule) => 
      schedule.ILLUMINATION_ID !== reqParams.ILLUMINATION_ID || schedule.DAL_ID !== dalBasicInfo.ID
    );

    await sendDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user,
      {
        schedules: newSchedules,
        exceptions,
      },
      reqParams.ILLUMINATION_ID, true, false);

    await sqldb.DALS_SCHEDULES.w_deleteByIllumIdAndDalId({
      DAL_ID: dalBasicInfo.ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
    }, session.user);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'DELETE ALL SCHEDS OK';
}

httpRouter.privateRoutes['/dal/add-illumination-exception'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    checkExceptionParams(reqParams);
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    await sqldb.DALS_EXCEPTIONS.w_insert({
      DAL_ID: dalBasicInfo.ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      TITLE: reqParams.TITLE,
      ACTIVE: reqParams.ACTIVE,
      BEGIN_TIME: reqParams.BEGIN_TIME,
      END_TIME: reqParams.END_TIME,
      EXCEPTION_DATE: reqParams.EXCEPTION_DATE,
      REPEAT_YEARLY: reqParams.REPEAT_YEARLY,
      STATUS: reqParams.STATUS,
    }, session.user);
  
    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, false, true);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'ADD OK';
}

const checkDalExceptionParams = async (EXCEPTION_ID: number, ILLUMINATION_ID: number, dalBasicInfo: { ID: number }) => {
  if (!EXCEPTION_ID) throw new Error('Parâmetro EXCEPTION_ID não informado').HttpStatus(400);
  const exception = await sqldb.DALS_EXCEPTIONS.getDalExceptionById({ ID: EXCEPTION_ID });
  if (exception.DAL_ID !== dalBasicInfo.ID || exception.ILLUMINATION_ID !== ILLUMINATION_ID) {
    throw Error('Parâmetros incorretos!').HttpStatus(400)
  }
}

httpRouter.privateRoutes['/dal/update-illumination-exception'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);
    const qPars = {
      EXCEPTION_ID: reqParams.EXCEPTION_ID,
      DAL_ID: dalBasicInfo.ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      TITLE: reqParams.TITLE || undefined,
      ACTIVE: reqParams.ACTIVE || undefined,
      BEGIN_TIME: reqParams.BEGIN_TIME || undefined,
      END_TIME: reqParams.END_TIME || undefined,
      EXCEPTION_DATE: reqParams.EXCEPTION_DATE || undefined,
      REPEAT_YEARLY: reqParams.REPEAT_YEARLY || undefined,
      STATUS: reqParams.STATUS || undefined,
    }

    await checkDalExceptionParams(reqParams.EXCEPTION_ID, reqParams.ILLUMINATION_ID, dalBasicInfo);
    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);
    await sqldb.DALS_EXCEPTIONS.w_update(qPars, session.user);
    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, false, true);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'UPDATE OK';
}

httpRouter.privateRoutes['/dal/delete-illumination-exception'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    await checkDalExceptionParams(reqParams.EXCEPTION_ID, reqParams.ILLUMINATION_ID, dalBasicInfo);

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);

    await sqldb.DALS_EXCEPTIONS.w_delete({
      DAL_ID: dalBasicInfo.ID,
      EXCEPTION_ID: reqParams.EXCEPTION_ID,
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID
    }, session.user);
    await parseCurrentDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, reqParams.ILLUMINATION_ID, false, true);
  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'DELETE EXCEPT OK';
}

httpRouter.privateRoutes['/dal/delete-illumination-all-exceptions'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);

    const [schedules, exceptionScheds] = await Promise.all([
      sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID }),
      sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID })
    ]);

    const newExceptions = exceptionScheds.filter((exception) => 
      exception.ILLUMINATION_ID !== reqParams.ILLUMINATION_ID || exception.DAL_ID !== dalBasicInfo.ID
    );

    await sendDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user,
      {
        schedules,
        exceptions: newExceptions,
      },
      reqParams.ILLUMINATION_ID, false, true);

    await sqldb.DALS_EXCEPTIONS.w_deleteByIllumIdAndDalId({
      ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
      DAL_ID: dalBasicInfo.ID,
    }, session.user);

  } catch (err) {
    logger.error(err);
    throw err;
  }

  return 'DELETE ALL EXCEPTS OK';
}

const updateDefaultMode = async (illumCurrentScheds: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getDalScheds>>, illuminationId: number, user: string) => {
  if (!illumCurrentScheds.length) {
    const illum = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: illuminationId });
    if (!illum.DEFAULT_MODE) {
      await sqldb.DALS_ILLUMINATIONS.updateDefaultMode({ DEFAULT_MODE: "0", ILLUMINATION_ID: illuminationId }, user);
    }
  };
};

const parseUpdateScheduleParams = (
  sched: httpRouter.ApiParams['/dal/handle-multiple-illumination-sched']['SCHEDS'][number],
  dalId: number,
  illuminationId: number
) => {
  return {
    SCHED_ID: sched.SCHED_ID,
    DAL_ID: dalId,
    ILLUMINATION_ID: illuminationId,
    TITLE: sched.TITLE || undefined,
    ACTIVE: sched.ACTIVE || undefined,
    BEGIN_TIME: sched.BEGIN_TIME || undefined,
    END_TIME: sched.END_TIME || undefined,
    STATUS: sched.STATUS || undefined,
    DAYS: sched.DAYS || undefined,
  }
}

const parseUpdateExceptionParams = (
  exception: httpRouter.ApiParams['/dal/handle-multiple-illumination-sched']['EXCEPTIONS'][number],
  dalId: number,
  illuminationId: number
) => {
  return {
    EXCEPTION_ID: exception.EXCEPTION_ID,
    DAL_ID: dalId,
    ILLUMINATION_ID: illuminationId,
    TITLE: exception.TITLE || undefined,
    ACTIVE: exception.ACTIVE || undefined,
    BEGIN_TIME: exception.BEGIN_TIME || undefined,
    END_TIME: exception.END_TIME || undefined,
    EXCEPTION_DATE: exception.EXCEPTION_DATE || undefined,
    REPEAT_YEARLY: exception.REPEAT_YEARLY || undefined,
    STATUS: exception.STATUS || undefined
  }
}

const verifyScheduleExceptionEdit = (sched?: ScheduleDatabase | ExceptionDatabase): void => {
  if (!sched) {
    throw Error('Programação/Exceção não encontrada!');
  }
}

const isCompatibleVerifySchedules = (currentVersion: string) => {
  const parsedVersion = parseFirmwareVersion(currentVersion);
  const minimumVersion = parseFirmwareVersion('v4.0.6');
  return compareVersions(parsedVersion, minimumVersion, false) >= 0;
}

const validateDeviceSchedulerCards = async (
  deviceCode: string,
  version: string,
  cards: {
    exceptions: Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>>,
    schedules: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>>,
  },
  userId: string,
  illuminationId: number,
  hasProgToEdit: boolean,
  hasExceptToEdit: boolean,
) => {
  if (isCompatibleVerifySchedules(version)) {
    const promises = [];
    let mustSendCommand = false;
    if (hasExceptToEdit) {
      mustSendCommand = true;
      promises.push(() => verifyExceptions(deviceCode, illuminationId, cards.exceptions));
    }

    if (hasProgToEdit) {
      mustSendCommand = true;
      promises.push(() => verifySchedules(deviceCode, illuminationId, cards.schedules));
    }

    if (mustSendCommand) {
      sendDamCommand_scheduler(deviceCode, { msgtype: 'get-scheduler-info' }, userId);
    }

    await Promise.all(promises.map((p) => p()));
  }
}

httpRouter.privateRoutes['/dal/handle-multiple-illumination-sched'] = async function (reqParams, session) {
  try {
    const dalBasicInfo = await checkDalEditPermission(reqParams, session);
    const illum = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: reqParams.ILLUMINATION_ID });

    const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(reqParams.DAL_CODE);
    checkDeviceOnline(reqParams.DAL_CODE, connectionStatus);

    const [currentScheds, currentExceptions] = await Promise.all([
      sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID }),
      sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion({ DAL_CODE: dalBasicInfo.DEVICE_CODE, ILLUMINATION_ID: reqParams.ILLUMINATION_ID })
    ]);

    const filteredCurrentSchedulesNotDeleted = currentScheds.filter((currSched) =>
      !reqParams.SCHEDS.find((sch) => sch.SCHED_ID === currSched.ID)?.DELETE
    );

    const filteredCurrentSchedules = filteredCurrentSchedulesNotDeleted.filter((currSched) => 
      !reqParams.SCHEDS.find((sch) => sch.SCHED_ID === currSched.ID)?.EDIT
    );

    const filteredCurrentExceptionsNotDeleted = currentExceptions.filter((currExcept) =>
      !reqParams.EXCEPTIONS.find((except) => except.EXCEPTION_ID === currExcept.ID)?.DELETE
    );
    const filteredCurrentExceptions = filteredCurrentExceptionsNotDeleted.filter((currExcept) =>
      !reqParams.EXCEPTIONS.find((except) => except.EXCEPTION_ID === currExcept.ID)?.EDIT
    );

    let hasProgToEdit = false;
    let hasExceptToEdit = false;

    const deletePromises: (() => Promise<unknown>)[] = [];
    const updateInsertPromises: (() => Promise<unknown>)[] = [];
    const schedulesToSend: Awaited<ReturnType<typeof sqldb.DALS_SCHEDULES.getActiveSchedsWithFwVersion>> = [...filteredCurrentSchedules];
    const exceptionsToSend: Awaited<ReturnType<typeof sqldb.DALS_EXCEPTIONS.getActiveSchedsWithFwVersion>> = [...filteredCurrentExceptions];

    const schedsToDelete = reqParams.SCHEDS.filter((sched) => sched.DELETE);

    for (const sched of schedsToDelete) {
      hasProgToEdit = true;

      deletePromises.push(() =>
        sqldb.DALS_SCHEDULES.w_delete({
          SCHED_ID: sched.SCHED_ID,
          ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
          DAL_ID: dalBasicInfo.ID,
        }, session.user)
      );
    }

    const schedsToEdit = reqParams.SCHEDS.filter((sched) => sched.EDIT);

    for (const sched of schedsToEdit) {
      hasProgToEdit = true;

      const scheduleEdit = currentScheds.find((schedule) => schedule.ID === sched.SCHED_ID);

      verifyScheduleExceptionEdit(scheduleEdit);

      checkSchedsConvergence(filteredCurrentSchedules, {
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
      });

      const qPars = parseUpdateScheduleParams(sched, dalBasicInfo.ID, reqParams.ILLUMINATION_ID);

      schedulesToSend.push({ 
        ...scheduleEdit, 
        ...qPars, 
        DEFAULT_MODE: illum.DEFAULT_MODE ?? '0'
      });

      updateInsertPromises.push(() => sqldb.DALS_SCHEDULES.w_update(qPars, session.user));
    }

    const schedsToInsert = reqParams.SCHEDS.filter((sched) => sched.INSERT);

    for (const sched of schedsToInsert) {
      hasProgToEdit = true;

      checkSchedsConvergence(filteredCurrentSchedules, {
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
      });

      const scheduleInsertPars = {
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: sched.TITLE,
        ACTIVE: sched.ACTIVE,
        BEGIN_TIME: sched.BEGIN_TIME,
        END_TIME: sched.END_TIME,
        DAYS: sched.DAYS,
        STATUS: sched.STATUS,
      };

      updateInsertPromises.push(() => sqldb.DALS_SCHEDULES.w_insert(scheduleInsertPars, session.user));

      schedulesToSend.push({
        ...scheduleInsertPars,
        CURRFW_VERS: dalBasicInfo.FWVERS,
        DAL_CODE: dalBasicInfo.DEVICE_CODE,
        ID: 0,
        PORT: illum.DAL_PORT,
        DEFAULT_MODE: illum.DEFAULT_MODE ?? '0'
      });
    }

    const exceptsToInsert = reqParams.EXCEPTIONS.filter((except) => except.INSERT);

    for (const except of exceptsToInsert) {
      hasExceptToEdit = true;

      const exceptionInsertPars = {
        DAL_ID: dalBasicInfo.ID,
        ILLUMINATION_ID: reqParams.ILLUMINATION_ID,
        TITLE: except.TITLE,
        ACTIVE: except.ACTIVE,
        BEGIN_TIME: except.BEGIN_TIME,
        END_TIME: except.END_TIME,
        EXCEPTION_DATE: except.EXCEPTION_DATE,
        REPEAT_YEARLY: except.REPEAT_YEARLY,
        STATUS: except.STATUS,
      }

      checkExceptsConvergence([...filteredCurrentExceptions, exceptionInsertPars])

      exceptionsToSend.push({
        ...exceptionInsertPars,
        CURRFW_VERS: dalBasicInfo.FWVERS,
        DAL_CODE: dalBasicInfo.DEVICE_CODE,
        ID: 0,
        PORT: illum.DAL_PORT,
        DEFAULT_MODE: illum.DEFAULT_MODE ?? '0'
      });

      updateInsertPromises.push(() => sqldb.DALS_EXCEPTIONS.w_insert(exceptionInsertPars, session.user))
    }

    const exceptsToEdit = reqParams.EXCEPTIONS.filter((except) => except.EDIT);

    for (const except of exceptsToEdit) {
      hasExceptToEdit = true;

      const exceptionEdit = currentExceptions.find((exception) => exception.ID === except.EXCEPTION_ID);
      
      verifyScheduleExceptionEdit(exceptionEdit);

      const qPars = parseUpdateExceptionParams(except, dalBasicInfo.ID, reqParams.ILLUMINATION_ID);

      checkExceptsConvergence([...filteredCurrentExceptions, qPars]);

      exceptionsToSend.push({
        ...exceptionEdit,
        ...qPars,
      });

      updateInsertPromises.push(() => sqldb.DALS_EXCEPTIONS.w_update(qPars, session.user))
    }

    const exceptsToDelete = reqParams.EXCEPTIONS.filter((except) => except.DELETE);

    for (const except of exceptsToDelete) {
      hasExceptToEdit = true;

      deletePromises.push(() =>
        sqldb.DALS_EXCEPTIONS.w_delete({
          DAL_ID: dalBasicInfo.ID,
          EXCEPTION_ID: except.EXCEPTION_ID,
          ILLUMINATION_ID: reqParams.ILLUMINATION_ID
        }, session.user)
      );
    }

    await sendDalCardsToScheduler(dalBasicInfo.DEVICE_CODE, session.user, {
      exceptions: exceptionsToSend,
      schedules: schedulesToSend,
    }, reqParams.ILLUMINATION_ID, hasProgToEdit, hasExceptToEdit);

    if (hasProgToEdit || hasExceptToEdit) {
      await retryFunction(
        () => validateDeviceSchedulerCards(dalBasicInfo.DEVICE_CODE, dalBasicInfo.FWVERS, {
          exceptions: exceptionsToSend,
          schedules: schedulesToSend,
        }, session.user, reqParams.ILLUMINATION_ID, hasProgToEdit, hasExceptToEdit),
        3
      );  
    }

    await Promise.all(deletePromises.map((promiseFn) => promiseFn()));
    await Promise.all(updateInsertPromises.map((promiseFn) => promiseFn()));

  } catch (err) {
    logger.error({
      err,
      reqParams,
      session,
    });
    throw err;
  }
  return 'OPERATIONS OK';
}

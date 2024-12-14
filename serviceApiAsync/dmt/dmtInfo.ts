import sqldb from '../../srcCommon/db';
import { getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, getUserGlobalPermissions, canSeeDevicesWithoutProductionUnit } from '../../srcCommon/helpers/permissionControl';
import { SessionData } from '../../srcCommon/types';
import * as httpRouter from '../apiServer/httpRouter';
import { editDeviceUnit } from '../devices/devicesInfo';
import { setIllumination } from '../dal/dalInfo';
import { logger } from '../../srcCommon/helpers/logger';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { TelemetryPackRawDMT } from '../../srcCommon/types/devicesMessages';
import { sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones';
import { getNobreakDmtsCircuitPorts, getNobreakDmtsNobreakPorts } from './dmtInfoHelper';
import { ramCaches_TIMEZONES_updateTimezoneId } from '../realTime/eventHooks';

export const getDmtUtilitiesPorts = async (dmtCode: string) => {
  const dmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: dmtCode});

  let illuminationUsedPorts: { ID: number, DMT_ID: number, ILLUMINATION_ID: number, PORT: number, NAME?: string }[] = [];
  let nobreakUsedPorts: {ID: number, DMT_ID: number, NOBREAK_ID: number, PORT: number, NAME?: string, DAT_CODE?: string}[] = [];
  let eletricCircuitUsedPorts: {ID: number, DMT_ID: number, PORT: number}[] = [];

  if(dmt){
    nobreakUsedPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: dmt.ID});
    illuminationUsedPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: dmt.ID});
    eletricCircuitUsedPorts = await sqldb.DMTS_NOBREAK_CIRCUITS.getDmtUsedPorts({DMT_ID: dmt.ID});
  }
  return { nobreakUsedPorts, illuminationUsedPorts, eletricCircuitUsedPorts };
};

export const checkAvailablePorts = async (dmtCode: string, newUtilityType?: string) => {
  const { nobreakUsedPorts, illuminationUsedPorts, eletricCircuitUsedPorts } = await getDmtUtilitiesPorts(dmtCode);
  
  const hasNobreak = (nobreakUsedPorts.length > 0 || newUtilityType === 'Nobreak') ? 1 : 0;

  const ans : {freePorts: boolean, ports: {label: string, associated: boolean, port: number, nobreakId?: number, illuminationId?: number, eletricCircuitId?: number, name?: string, datId?: string}[]} = {
    freePorts: nobreakUsedPorts.length + (eletricCircuitUsedPorts.length || hasNobreak) + illuminationUsedPorts.length < 4,
    ports: [{label: 'F1', port: 1, associated: false},
            {label: 'F2', port: 2, associated: false},
            {label: 'F3', port: 3, associated: false},
            {label: 'F4', port: 4, associated: false}]
  }

  for(const nobreak of nobreakUsedPorts){
    if(nobreak.PORT){
      ans.ports[nobreak.PORT-1].associated = true;
      ans.ports[nobreak.PORT-1].nobreakId = nobreak.NOBREAK_ID;
      ans.ports[nobreak.PORT-1].name = nobreak.NAME;
      ans.ports[nobreak.PORT-1].datId = nobreak.DAT_CODE;
    }
  }

  for(const illumination of illuminationUsedPorts){
    if(illumination.PORT){
      ans.ports[illumination.PORT-1].associated = true;
      ans.ports[illumination.PORT-1].illuminationId = illumination.ID;
    }
  }

  for(const eletricCircuit of eletricCircuitUsedPorts){
    if(eletricCircuit.PORT){
      ans.ports[eletricCircuit.PORT-1].associated = true;
      ans.ports[eletricCircuit.PORT-1].eletricCircuitId = eletricCircuit.ID;
    }
  }

  for(const illumination of illuminationUsedPorts){
    if(illumination.PORT){
      ans.ports[illumination.PORT-1].associated = true;
      ans.ports[illumination.PORT-1].illuminationId = illumination.ILLUMINATION_ID;
      ans.ports[illumination.PORT-1].name = illumination.NAME;
    }
  }

  return ans;
}

interface IDmtNobreak {
  ID?: number | null
  UNIT_ID: number
  DMT_CODE?: string
  DAT_CODE?: string | null
  NAME: string
  MANUFACTURER?: string | null
  MODEL?: string | null
  INPUT_VOLTAGE?: number | null
  OUTPUT_VOLTAGE?: number | null
  NOMINAL_POTENTIAL?: number | null
  NOMINAL_BATTERY_LIFE?: number | null
  INSTALLATION_DATE?: string | null
  PORT?: number | null
  INPUT_ELECTRIC_CURRENT?: number | null
  OUTPUT_ELECTRIC_CURRENT?: number | null
  NOMINAL_BATTERY_CAPACITY?: number | null
};

export const allowedInsertionInUnit = async (UNIT_ID: number, DMT_CODE?: string) : Promise<boolean> => {
  if(!DMT_CODE) return true;
  const dmtNobreaks = await sqldb.DMTS_NOBREAKS.getDmtNobreaksList({ DMT_CODE });
  const dmtIlluminations = await sqldb.DMTS_ILLUMINATIONS.getDmtIllumList({ DMT_CODE });

  if ((!dmtNobreaks || dmtNobreaks.length === 0) && (!dmtIlluminations || dmtIlluminations.length === 0)) return true;

  let unitId: number | null = null;
  for(const nobreak of dmtNobreaks) {
    if(nobreak.UNIT_ID){
      unitId = nobreak.UNIT_ID;
    }
  }

  for(const illumination of dmtIlluminations) {
    if(illumination.UNIT_ID){
      unitId = illumination.UNIT_ID;
    }
  }
  
  if(!unitId) return true;

  return unitId === UNIT_ID;
};

const insertNewDmt = async (reqParams: IDmtNobreak, session: SessionData ) => {
  let dmt;
  if(!reqParams.DMT_CODE) return dmt;
  const devData = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: reqParams.DMT_CODE, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
  ramCaches_TIMEZONES_updateTimezoneId(reqParams.DMT_CODE, 31);
  await sqldb.DMTS.w_insertIgnore({DEVICE_ID: devData.insertId}, session.user);
  dmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: reqParams.DMT_CODE});
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({UNIT_ID: reqParams.UNIT_ID});
  if(unitInfo){
    await sqldb.DEVICES_CLIENTS.w_insertIgnore({CLIENT_ID: unitInfo.CLIENT_ID, DEVICE_ID: devData.insertId },  session.user);
    await sqldb.DEVICES_UNITS.w_insertIgnore({UNIT_ID: reqParams.UNIT_ID, DEVICE_ID: devData.insertId},  session.user);
    await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devId: devData.insertId });
  }
  return dmt;
};

const editOldDmt = async (reqParams: IDmtNobreak, session: SessionData) => {
  if(!reqParams.DMT_CODE) return;
  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: reqParams.DMT_CODE});
  if(devData?.ID){
    await editDeviceUnit(devData.ID, reqParams.UNIT_ID, session.user);
  }
}

export const setDmt = async (reqParams: IDmtNobreak, session: SessionData, newUtilityType: string ) => {
  let dmt;
  if (!reqParams.DMT_CODE) return dmt; 
  if (reqParams.DMT_CODE.length !== 12 || !reqParams.DMT_CODE.startsWith('DMT')) throw Error('There was an error!\nInvalid properties. Invalid DMT_CODE.').HttpStatus(400);

  dmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: reqParams.DMT_CODE});
  if(!dmt?.ID){
    dmt = await insertNewDmt(reqParams, session);
  }else{
    await editOldDmt(reqParams, session);
  }

  const availablePorts = await checkAvailablePorts(reqParams.DMT_CODE, newUtilityType);
  if(!reqParams.ID && !availablePorts.freePorts) throw Error('There was an error!\nNo ports available.').HttpStatus(400);
  
  return dmt;
}

const editOldNobreak = async (reqParams: IDmtNobreak, user: string) => {
  const currentNobreakData = await sqldb.NOBREAKS.getNobreak({ID: reqParams.ID});
  if(currentNobreakData.DMT_CODE !== reqParams.DMT_CODE || currentNobreakData.PORT !== reqParams.PORT){
    await sqldb.DMTS_NOBREAKS.w_deleteDmtNobreakByNobreakId({NOBREAK_ID: reqParams.ID}, user);
  }
  if(currentNobreakData.DMT_CODE && currentNobreakData.DMT_CODE !== reqParams.DMT_CODE){
    const illuminationsUsedPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: currentNobreakData.DMT_ID});
    const nobreakUsedPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: currentNobreakData.DMT_ID});
    const usedPorts = (nobreakUsedPorts.length && nobreakUsedPorts) || illuminationsUsedPorts;
    if(usedPorts && usedPorts.length === 0){
      const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: currentNobreakData.DMT_CODE});
      if(devData?.ID){
        await sqldb.DEVICES_UNITS.w_deleteRow({DEVICE_ID: devData.ID}, user);
        await sqldb.DEVICES_CLIENTS.w_deleteRow({DEVICE_ID: devData.ID}, user);
      }
      
      if(currentNobreakData.DMT_ID){
        await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: currentNobreakData.DMT_ID}, user);
      }
    }
  }
  
  await sqldb.NOBREAKS.w_updateInfo({
    ID: reqParams.ID,
    INPUT_VOLTAGE: reqParams.INPUT_VOLTAGE,
    OUTPUT_VOLTAGE: reqParams.OUTPUT_VOLTAGE,
    NOMINAL_POTENTIAL: reqParams.NOMINAL_POTENTIAL,
    NOMINAL_BATTERY_LIFE: reqParams.NOMINAL_BATTERY_LIFE,
    NOMINAL_BATTERY_CAPACITY: reqParams.NOMINAL_BATTERY_CAPACITY,
    INPUT_ELECTRIC_CURRENT: reqParams.INPUT_ELECTRIC_CURRENT,
    OUTPUT_ELECTRIC_CURRENT: reqParams.OUTPUT_ELECTRIC_CURRENT,
    ASSET_ID: currentNobreakData.ASSET_ID
  }, user);
  await sqldb.ASSETS.w_updateInfo({
    ID: currentNobreakData.ASSET_ID,
    UNIT_ID: reqParams.UNIT_ID, 
    DAT_CODE: reqParams.DAT_CODE, 
    NAME: reqParams.NAME, 
    MANUFACTURER: reqParams.MANUFACTURER, 
    MODEL: reqParams.MODEL, 
    INSTALLATION_DATE: reqParams.INSTALLATION_DATE
  }, user);
};

export const setNobreak = async (reqParams: IDmtNobreak, session: SessionData) => {
  let nobreakId = reqParams.ID;
  if(!reqParams.ID){
    const assetData = await sqldb.ASSETS.w_insertIgnore({
      UNIT_ID: reqParams.UNIT_ID, 
      DAT_CODE: reqParams.DAT_CODE, 
      NAME: reqParams.NAME, 
      MANUFACTURER: reqParams.MANUFACTURER, 
      MODEL: reqParams.MODEL, 
      INSTALLATION_DATE: reqParams.INSTALLATION_DATE
    }, session.user);    
    const nobreakData = await sqldb.NOBREAKS.w_insert({
      INPUT_VOLTAGE: reqParams.INPUT_VOLTAGE,
      OUTPUT_VOLTAGE: reqParams.OUTPUT_VOLTAGE,
      NOMINAL_POTENTIAL: reqParams.NOMINAL_POTENTIAL,
      NOMINAL_BATTERY_LIFE: reqParams.NOMINAL_BATTERY_LIFE,
      NOMINAL_BATTERY_CAPACITY: reqParams.NOMINAL_BATTERY_CAPACITY,
      OUTPUT_ELECTRIC_CURRENT: reqParams.OUTPUT_ELECTRIC_CURRENT,
      INPUT_ELECTRIC_CURRENT: reqParams.INPUT_ELECTRIC_CURRENT,
      ASSET_ID: assetData.insertId
    }, session.user);
    nobreakId = nobreakData.insertId;
  }else{
    await editOldNobreak(reqParams, session.user);
  }
  return nobreakId;
}

const checkAssociatedNobreak = async (reqParams: IDmtNobreak, session: SessionData, dmt: {ID: number}, nobreakId: number, utilityAlreadyAssociated: boolean) => {
  const availablePorts = await checkAvailablePorts(reqParams.DMT_CODE, 'Nobreak');

  const associations = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({ DMT_ID: dmt.ID });
  if (associations.some((x) => x.NOBREAK_ID === nobreakId && x.PORT === reqParams.PORT)) {
    return true;
  }
  if(reqParams.ID){
    for(const port of availablePorts.ports){
      if(port.nobreakId === nobreakId){
        if(port.port !== reqParams.PORT){
          await sqldb.DMTS_NOBREAKS.w_insert_update({DMT_ID: dmt.ID, NOBREAK_ID: nobreakId, PORT: reqParams.PORT}, session.user);
        }
        utilityAlreadyAssociated = true;
      }
    }
  }
  return utilityAlreadyAssociated;
};

const checkAssociatedIllum = async (reqParams: IDmtNobreak, session: SessionData, dmt: {ID: number}, illuminationId: number, utilityAlreadyAssociated: boolean) => {
  const availablePorts = await checkAvailablePorts(reqParams.DMT_CODE,  'Illumination');

  const associations = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({ DMT_ID: dmt.ID });
  if (associations.some((x) => x.ILLUMINATION_ID === illuminationId && x.PORT === reqParams.PORT)) {
    return true;
  }
  if(reqParams.ID){
    for(const port of availablePorts.ports){
      if(port.illuminationId === illuminationId){
        if(port.port !== reqParams.PORT){
          await sqldb.DMTS_ILLUMINATIONS.w_insert({DMT_ID: dmt.ID, ILLUMINATION_ID: illuminationId, PORT: reqParams.PORT}, session.user);
        }
        utilityAlreadyAssociated = true;
      }
    }
  }
  return utilityAlreadyAssociated;
};

const checkAssociatedUtility = async (reqParams: IDmtNobreak, session: SessionData, dmt: {ID: number}, nobreakId: number, illuminationId: number) => {
  if(!reqParams.DMT_CODE) return true;
  let utilityAlreadyAssociated = false;

  if (nobreakId) {
    utilityAlreadyAssociated = await checkAssociatedNobreak(reqParams, session, dmt, nobreakId, utilityAlreadyAssociated);
  } else if (illuminationId) {
    utilityAlreadyAssociated = await checkAssociatedIllum(reqParams, session, dmt, illuminationId, utilityAlreadyAssociated);
  }
  return utilityAlreadyAssociated;
};

type utilityId = number | undefined | null;

const associateNobreakToDmt = async (reqParams: IDmtNobreak, session: SessionData, dmt: {ID: number}, nobreakId: utilityId ) => {
  const availablePorts = await checkAvailablePorts(reqParams.DMT_CODE, 'Nobreak');

  if(reqParams.PORT && ((reqParams.PORT > 4 && reqParams.PORT < 1) || (availablePorts.ports[reqParams.PORT-1].associated))) throw Error('There was an error!\nThe port has already been associated or unavailable.').HttpStatus(400);
  await sqldb.DMTS_NOBREAKS.w_insert_update({DMT_ID: dmt.ID, NOBREAK_ID: nobreakId, PORT: reqParams.PORT}, session.user);
};

const associateIllumToDmt = async (reqParams: IDmtNobreak, session: SessionData,  dmt: {ID: number}, illuminationId: utilityId) => {
  const availablePorts = await checkAvailablePorts(reqParams.DMT_CODE, 'Illumination');

  if(reqParams.PORT && ((reqParams.PORT > 4 && reqParams.PORT < 1) || (availablePorts.ports[reqParams.PORT-1].associated))) throw Error('There was an error!\nThe port has already been associated or unavailable.').HttpStatus(400);
  await sqldb.DMTS_ILLUMINATIONS.w_insert({DMT_ID: dmt.ID, ILLUMINATION_ID: illuminationId, PORT: reqParams.PORT}, session.user);
};

export const associateUtilityToDmt = async (reqParams: IDmtNobreak, session: SessionData, dmt: {ID: number}, nobreakId: utilityId, illuminationId: utilityId) => {
  if(!reqParams.DMT_CODE || !dmt || !dmt.ID || !(nobreakId || illuminationId )) return;
  
  const nobreakAlreadyAssociated = await checkAssociatedUtility(reqParams, session, dmt, nobreakId, illuminationId);

  if(!nobreakAlreadyAssociated && nobreakId){
    await associateNobreakToDmt(reqParams, session, dmt, nobreakId);
  }
  if(!nobreakAlreadyAssociated && illuminationId){
    await associateIllumToDmt(reqParams, session, dmt, illuminationId);
  }
};

 async function checkNobreakData(nobreakId: number, unitId: number, session: string) {
  const nobreakInfo = await sqldb.ELECTRIC_CIRCUITS_NOBREAKS.getInfoByNobreakId({NOBREAK_ID: nobreakId})
  if(!nobreakInfo){
    const electricCircuit = await sqldb.ELECTRIC_CIRCUITS.w_insert({
      UNIT_ID: unitId, 
    }, session);     
    await sqldb.ELECTRIC_CIRCUITS_NOBREAKS.w_insert({
      ELECTRIC_CIRCUIT_ID: electricCircuit.insertId, 
      NOBREAK_ID: nobreakId, 
    }, session);       
  }  
}

/**
 * @swagger
 * /dmt/set-dmt-nobreak:
 *   post:
 *     summary: Criar e Editar DMT Nobreak
 *     description: Se o ID não for passado, cria DMT Nobreak, caso contrário edita o DMT Nobreak do ID passado.
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DMT
 *         schema:
 *           type: object
 *           properties:
 *             ID:
 *               type: number
 *               description: ID do Nobreak
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             NAME:
 *               type: string
 *               description: Nome do Nobreak (Ativo)
 *               default: ""
 *               required: true
 *             DMT_CODE:
 *               type: string
 *               description: Código Do DMT (DMTXXXXXXXXX)
 *               default: ""
 *               required: false
 *             DAT_ID:
 *               type: string
 *               description: Código Do DAT
 *               default: ""
 *               required: false
 *             MANUFACTURER:
 *               type: string
 *               description: Fabricante do Nobreak (Ativo)
 *               default: ""
 *               required: false
 *             MODEL:
 *               type: string
 *               description: Modelo do Nobreak (Ativo)
 *               default: ""
 *               required: false
 *             INPUT_VOLTAGE:
 *               type: number
 *               description: Tensão de Entrada (V)
 *               default: ""
 *               required: false
 *             OUTPUT_VOLTAGE:
 *               type: number
 *               description: Tensão de Saída (V)
 *               default: ""
 *               required: false
 *             NOMINAL_POTENTIAL:
 *               type: number
 *               description: Potência Nominal (VA)
 *               default: ""
 *               required: false
 *             NOMINAL_BATTERY_LIFE:
 *               type: number
 *               description: Autonomia Nominal da Bateria Interna (Minutos)
 *               default: ""
 *               required: false
 *             INSTALLATION_DATE:
 *               type: string
 *               description: Data de Instalação (YYYY-MM-DD)
 *               default: ""
 *               required: false
 *             PORT:
 *               type: number
 *               description: Porta do DMT
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: DMT Nobreak criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dmtId:
 *                   type: number
 *                   description: ID do DMT
 *                 nobreakId:
 *                   type: number
 *                   description: ID do NOBREAK
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos, portas indisponíveis ou porta já associada.
 *       403:
 *         description: Sem permissão para editar ou criar DMT Nobreak
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/set-dmt-nobreak'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.NAME) throw Error('There was an error!\nInvalid properties. Missing NAME.').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);
  
  const allowedCreateNobreak = await allowedInsertionInUnit(reqParams.UNIT_ID, reqParams.DMT_CODE);
  if(!allowedCreateNobreak) throw Error('There was an error!\nInvalid properties. Cannot associate the same DMT in differents UNITs.').HttpStatus(400);
  let dmt = null;
  let nobreakId = null;
  try {
    dmt = await setDmt(reqParams, session, 'Nobreak');
    nobreakId = await setNobreak(reqParams, session);
    await associateUtilityToDmt(reqParams, session, dmt, nobreakId, undefined);

  } catch (err) {
    logger.error(err);
    throw err;
  }
  return { dmtId: dmt?.ID, nobreakId }
}

/**
 * @swagger
 * /dmt/set-dmt-illumination:
 *   post:
 *     summary: Criar e Editar DMT Iluminação
 *     description: Se o ID não for passado, cria DMT Iluminação, caso contrário edita o DMT Iluminação do ID passado.
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DMT
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
 *             DMT_CODE:
 *               type: string
 *               description: Código Do DMT (DMTXXXXXXXXX)
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
 *               description: Porta do DMT
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: DMT Iluminação criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos, portas indisponíveis ou porta já associada.
 *       403:
 *         description: Sem permissão para editar ou criar DMT Iluminação
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/set-dmt-illumination'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.NAME) throw Error('There was an error!\nInvalid properties. Missing NAME.').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);

  try {
    let dmt = await setDmt(reqParams, session, 'Illumination');
    let illumId = await setIllumination(reqParams, session);
    await associateUtilityToDmt(reqParams, session, dmt, undefined, illumId);
  } catch (err) {
    logger.error(err);
    throw err;
  }
  
  return 'SUCCESS ON SET DMT ILLUMINATION';
}

/**
 * @swagger
 * /dmt/get-dmt-nobreak-list:
 *   post:
 *     summary: Listar DMT Nobreaks do Cliente
 *     description: Listar todas as informações dos DMT Nobreaks
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Cliente
 *         schema:
 *           type: object
 *           properties:
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: ""
 *               required: true
 *             INCLUDE_INSTALLATION_UNIT:
 *              type: boolean
 *              description: Incluir Unidade de Instalação
 *              default: true
 *              required: false
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
 *             status:
 *               type: aray
 *               description: Status para filtragem
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
 *                   DMT_CODE: 
 *                     type: string
 *                     description: Código do DMT
 *                   DAT_CODE: 
 *                     type: string
 *                     description: Código do DAT
 *                   NAME: 
 *                     type: string
 *                     description: Nome do Utilitário
 *                   MANUFACTURER: 
 *                     type: string
 *                     description: Fabricante
 *                   MODEL: 
 *                     type: string
 *                     description: Modelo
 *                   INPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Entrada
 *                   OUTPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Saída
 *                   NOMINAL_POTENTIAL: 
 *                     type: number
 *                     description: Potência Nominal
 *                   NOMINAL_BATTERY_LIFE: 
 *                     type: number
 *                     description: Autonomia da Bateria Interna
 *                   INPUT_ELECTRIC_CURRENT: 
 *                     type: number
 *                     description: Corrente elétrica de entrada (A)
 *                   OUTPUT_ELECTRIC_CURRENT: 
 *                     type: number
 *                     description: Corrente elétrica de saída (A)
 *                   NOMINAL_BATTERY_CAPACITY: 
 *                     type: number
 *                     description: Capacidade nominal da bateria (Ah)
 *                   INSTALLATION_DATE: 
 *                     type: string
 *                     description: Data de Instalação do Utilitário
 *                   PORT: 
 *                     type: number
 *                     description: Porta Associada do DMT
 *                   APPLICATION: 
 *                     type: string
 *                     description: Aplicação do Utilitário
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar nobreaks do cliente
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-dmt-nobreak-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { unitIds: allowedUnits, clientIds: allowedClients } = await getAllowedUnitsView(session);
    
    if (!reqParams.clientIds) reqParams.clientIds = allowedClients;
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));

    if (allowedUnits && !reqParams.unitIds) reqParams.unitIds = allowedUnits;
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(Number(x)));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }

  let includeUnit = true;

  if(reqParams.INCLUDE_INSTALLATION_UNIT === false) {
    includeUnit = false;
  }

  let list = await sqldb.NOBREAKS.getNobreakInfoList({
    clientIds: reqParams.clientIds || null,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: includeUnit
  });
  const lastTelemetries = await devsLastComm.loadLastTelemetries({
    devIds: (list.length <= 500) ? list.filter((item) => item.DMT_CODE).map((x) => x.DMT_CODE) : undefined,
  });
  const listNobreak: httpRouter.ApiResps['/dmt/get-dmt-nobreak-list'] = [];

  const usedCircuitPorts = await getNobreakDmtsCircuitPorts({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds });
  const usedNobreakPorts = await getNobreakDmtsNobreakPorts({ clientIds: reqParams.clientIds, unitIds: reqParams.unitIds });

  const chunkSize = 20;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (dmt): Promise<void> => {
      const { lastTelemetry, status: connectionStatus } = lastTelemetries.lastDmtTelemetry(dmt.DMT_CODE);
      let addDmt = true;
      if (reqParams.connection && !reqParams.connection.includes(connectionStatus)) { addDmt = false; }
      const nobreakStatus = dmt.DMT_CODE && getNobreakStatusSync(dmt.DMT_ID, dmt.ID, lastTelemetry, connectionStatus, usedCircuitPorts, usedNobreakPorts);
      if (reqParams.status && (!dmt.DMT_CODE || !reqParams.status.includes(nobreakStatus?.status))) { addDmt = false; }
      if (addDmt) {
        listNobreak.push({
          ...dmt,
          APPLICATION: 'Nobreak',
          ...nobreakStatus,
        })
      }
    }));
  }

  return listNobreak;
}

/**
 * @swagger
 * /dmt/get-dmt-nobreak-list-unit:
 *   post:
 *     summary: Listar DMT Nobreaks da Unidade
 *     description: Listar todas as informações dos DMT Nobreaks
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Unidade
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de Nobreaks da Unidade
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
 *                   DMT_CODE: 
 *                     type: string
 *                     description: Código do DMT
 *                   DAT_CODE: 
 *                     type: string
 *                     description: Código do DAT
 *                   NAME: 
 *                     type: string
 *                     description: Nome do Utilitário
 *                   MANUFACTURER: 
 *                     type: string
 *                     description: Fabricante
 *                   MODEL: 
 *                     type: string
 *                     description: Modelo
 *                   INPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Entrada
 *                   OUTPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Saída
 *                   NOMINAL_POTENTIAL: 
 *                     type: number
 *                     description: Potência Nominal
 *                   NOMINAL_BATTERY_LIFE: 
 *                     type: number
 *                     description: Autonomia da Bateria Interna
 *                   INSTALLATION_DATE: 
 *                     type: string
 *                     description: Data de Instalação do Utilitário
 *                   PORT: 
 *                     type: number
 *                     description: Porta Associada do DMT
 *                   PORT_ELETRIC:
 *                     type: number
 *                     description: Porta Associada do DMT identificada para Rede Elétrica
 *                   APPLICATION: 
 *                     type: string
 *                     description: Aplicação do Utilitário
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar nobreaks do cliente
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-dmt-nobreak-list-unit'] = async function (reqParams, session) {
  const getUnitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.UNIT_ID });
  const perms = await getPermissionsOnUnit(session, getUnitInfo.CLIENT_ID, getUnitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);
  let list = await sqldb.NOBREAKS.getNobreakInfoListByUnit({ UNIT_IDs: [reqParams.UNIT_ID] });
   
  return list.map((dmt) => ({...dmt, APPLICATION: 'Nobreak'}));;
}

/**
 * @swagger
 * /dmt/delete-dmt-nobreak:
 *   post:
 *     summary: Deletar DMT Nobreak
 *     description: Deletar DMT Nobreak através do ID
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Nobreak
 *         schema:
 *           type: object
 *           properties:
 *             NOBREAK_ID:
 *               type: number
 *               description: ID do Nobreak
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: DMT Nobreak criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para deletar DMT Nobreak
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/delete-dmt-nobreak'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.NOBREAK_ID) throw Error('There was an error!\nInvalid properties. Missing NOBREAK_ID.').HttpStatus(400);

  const nobreakInf = await sqldb.NOBREAKS.getNobreak({ID: reqParams.NOBREAK_ID});

  await sqldb.DMTS_NOBREAKS.w_deleteDmtNobreakByNobreakId({NOBREAK_ID: reqParams.NOBREAK_ID}, session.user);
  await sqldb.ELECTRIC_CIRCUITS_NOBREAKS.w_deleteElectricCircuitsNobreakByID({NOBREAK_ID: reqParams.NOBREAK_ID}, session.user);
  await sqldb.ELECTRIC_CIRCUITS.w_deleteByNobreakId({NOBREAK_ID: reqParams.NOBREAK_ID}, session.user);
  await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.w_deleteByNobreakId({ NOBREAK_ID: reqParams.NOBREAK_ID }, session.user);
  await sqldb.NOBREAK_IMAGES.w_deleteRowByNobreakId({ NOBREAK_ID: reqParams.NOBREAK_ID }, session.user);
  await sqldb.NOBREAKS.w_delete({ID: reqParams.NOBREAK_ID}, session.user);
  await sqldb.ASSETS.w_delete({ID: nobreakInf.ASSET_ID }, session.user);

  const nobreakUsedPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: nobreakInf.DMT_ID});
  const illuminationsUsedPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: nobreakInf.DMT_ID});
  const usedPorts = (nobreakUsedPorts.length && nobreakUsedPorts) || illuminationsUsedPorts;
  if(usedPorts && usedPorts.length === 0){
    const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: nobreakInf.DMT_CODE});
    if(devData?.ID){
      await sqldb.DEVICES_UNITS.w_deleteRowByDeviceId({DEVICE_ID: devData.ID}, session.user);
      await sqldb.DEVICES_CLIENTS.w_deleteRowFromDeviceId({DEVICE_ID: devData.ID}, session.user);
    }
    
    const dmtData = await sqldb.DMTS.getIdByCode({DEVICE_CODE: nobreakInf.DMT_CODE});
    if(dmtData?.ID){
      await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: dmtData.ID}, session.user);
    }
  }

  return 'DELETED';
}

/**
 * @swagger
 * /dmt/get-dmt-ports-info:
 *   post:
 *     summary: Verificar disponibilidade de portas do DMT
 *     description: Verificar disponibilidade de portas do DMT através do DMT Code e do Utilitário  
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DMT
 *         schema:
 *           type: object
 *           properties:
 *             DMT_CODE:
 *               type: string
 *               description: Código Do DMT (DMTXXXXXXXXX)
 *               default: ""
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: ""
 *               required: true
 *             NEW_UTILITY_TYPE:
 *               type: string
 *               description: Novo tipo de utilitário (Necessário para idenficar se tem portas livres de acordo com o utiliário que vai ser adicionado)
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações das Portas do DMT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freePorts:
 *                   type: boolean
 *                   description: Se o DMT possui portas livres
 *                 ports:
 *                   type: array
 *                   description: Array com as informações de cada porta do DMT
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Label da porta do DMT
 *                       associated:
 *                         type: boolean
 *                         description: Se a porta está associada ou não
 *                       port:
 *                         type: number
 *                         description: Número da porta
 *                       nobreakId:
 *                         type: number
 *                         description: ID do Nobreak
 *                       eletricCircuitId:
 *                         type: number
 *                         description: ID do Circuito Elétrico
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar portas do DMT
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-dmt-ports-info'] = async function (reqParams, session) {
  if (!reqParams.DMT_CODE) throw Error('There was an error!\nInvalid properties. Missing DMT_CODE.').HttpStatus(400);
  const device = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DMT_CODE });
  if (!device) throw Error('There was an error!\nInvalid properties. Missing DMT_CODE.').HttpStatus(400);
  const perms = await getPermissionsOnClient(session, device.CLIENT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  
  if (reqParams.DMT_CODE.length !== 12 || !reqParams.DMT_CODE.startsWith('DMT')) throw Error('There was an error!\nInvalid properties. Invalid DMT_CODE.').HttpStatus(400);
  
  const portsInfo = await checkAvailablePorts(reqParams.DMT_CODE, reqParams.NEW_UTILITY_TYPE);

  return portsInfo;
}

export async function deleteDmt (qPars: { DMT_CODE: string }, userId: string) {
  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: qPars.DMT_CODE});
  if(devData?.ID){
    await sqldb.DEVICES_CLIENTS.w_deleteRowFromDeviceId({DEVICE_ID: devData.ID}, userId);
    await sqldb.DEVICES_UNITS.w_deleteRowByDeviceId({DEVICE_ID: devData.ID}, userId);
    const dmtData = await sqldb.DMTS.getIdByCode({DEVICE_CODE: qPars.DMT_CODE});
    if(dmtData?.ID){
      await sqldb.DMTS_NOBREAKS.w_deleteDmtNobreakByDmtId({DMT_ID:dmtData.ID}, userId);
      await sqldb.DMTS_ILLUMINATIONS.w_deleteDmtIllumByDmtId({DMT_ID: dmtData.ID}, userId);
      await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: dmtData.ID}, userId);
      await sqldb.DMTS.w_delete({ID: dmtData.ID}, userId);
      await sqldb.DEVICES.w_delete({ID: devData.ID}, userId);
    }
  }
}


export async function deleteClientDmts (qPars: { CLIENT_ID: number }, userId: string) {
  const dmts = await sqldb.DMTS.getDmtsByClient({CLIENT_ID: qPars.CLIENT_ID});
  for(const dmt of dmts){
    await deleteDmt({DMT_CODE: dmt.DEVICE_CODE}, userId);
  }
}

/**
 * @swagger
 * /dmt/get-nobreak-info:
 *   post:
 *     summary: Buscar informações de Nobreak
 *     description: Buscar informações completas de um Nobreak, com o DMT que está associado
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Nobreak
 *         schema:
 *           type: object
 *           properties:
 *             NOBREAK_ID:
 *               type: number
 *               description: ID do Nobreak
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações do Nobreak
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 NOBREAK_ID:
 *                   type: number
 *                   description: ID do Nobreak
 *                 NAME:
 *                   type: string
 *                   description: Nome do Nobreak
 *                 MANUFACTURER:
 *                   type: string
 *                   description: Fabricante do Nobreak
 *                 MODEL:
 *                   type: string
 *                   description: Modelo do Nobreak
 *                 INPUT_VOLTAGE:
 *                   type: number
 *                   description: Tensão de Entrada (V)
 *                 OUTPUT_VOLTAGE:
 *                   type: number
 *                   description: Tensão de Saída (V)
 *                 NOMINAL_POTENTIAL:
 *                   type: number
 *                   description: Potência Nominal (VA)
 *                 NOMINAL_BATTERY_LIFE:
 *                   type: number
 *                   description: Autonomia Nominal da Bateria Interna (Minutos)
 *                 INPUT_ELECTRIC_CURRENT:
 *                   type: number
 *                   description: Corrente elétrica de entrada (A)
 *                 OUTPUT_ELECTRIC_CURRENT:
 *                   type: number
 *                   description: Corrente elétrica de saída (A)
 *                 NOMINAL_BATTERY_CAPACITY:
 *                   type: number
 *                   description: Capacidade nominal da bateria (Ah)
 *                 INSTALLATION_DATE:
 *                   type: string
 *                   description: Data de Instalação (YYYY-MM-DD)
 *                 DMT_ID:
 *                   type: number
 *                   description: ID do DMT associado
 *                 DMT_CODE:
 *                   type: string
 *                   description: Código do DMT associado
 *                 PORT:
 *                   type: number
 *                   description: PORTA do DMT associado
 *                 DAT_CODE:
 *                   type: string
 *                   description: Código do Ativo
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
 *                   description: Status do Nobreak (Bateria, Rede Elétrica, Desligado e Indisponível)
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar portas do DMT
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-nobreak-info'] = async function (reqParams, session) {
  if (!reqParams.NOBREAK_ID) throw Error('Invalid parameters! Missing NOBREAK_ID').HttpStatus(400)
  const nobreakInfo = await sqldb.NOBREAKS.getNobreakFullInfo({ ID: reqParams.NOBREAK_ID });
  const perms = await getPermissionsOnUnit(session, nobreakInfo.CLIENT_ID, nobreakInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const lastTelemetries = await devsLastComm.loadLastTelemetries({
    devIds: [nobreakInfo.DMT_CODE],
  });
  const { lastTelemetry, status: connectionStatus } = lastTelemetries.lastDmtTelemetry(nobreakInfo.DMT_CODE);
  const dmtNobreakStatus = await getNobreakStatus(nobreakInfo.DMT_CODE, nobreakInfo.NOBREAK_ID, lastTelemetry, connectionStatus);

  return {
    ID: nobreakInfo.NOBREAK_ID, // Adicionado em 2023-08 temporariamente para manter compatibilidade
    ...nobreakInfo,
    STATUS: dmtNobreakStatus.status,
  };
}

/**
 * @swagger
 * /dmt/get-nobreak-additional-parameters:
 *   post:
 *     summary: Parâmetros adicionais do Nobreak
 *     description: Buscar parâmetros adicionais do Nobreak a partir do NOBREAK_ID
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Nobreak
 *         schema:
 *           type: object
 *           properties:
 *             NOBREAK_ID:
 *               type: number
 *               description: ID do Nobreak
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações do Nobreak
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ID:
 *                     type: number
 *                     description: ID do parâmetro adicional
 *                   COLUMN_NAME:
 *                     type: string
 *                     description: Nome da coluna do parâmetro adicional
 *                   COLUMN_VALUE:
 *                     type: string
 *                     description: Valor da coluna do parâmetro adicional
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-nobreak-additional-parameters'] = async function (reqParams, session) {
  if (!reqParams.NOBREAK_ID) throw Error('Invalid properties. Missing NOBREAK_ID.').HttpStatus(400);
  
  const nobreakInfo = await sqldb.NOBREAKS.getNobreakFullInfo({ ID: reqParams.NOBREAK_ID });
  const perms = await getPermissionsOnUnit(session, nobreakInfo.CLIENT_ID, nobreakInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  
  const parametersNobreak = await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.getAllParametersByNobreak({ NOBREAK_ID: reqParams.NOBREAK_ID });
  
  return parametersNobreak;
}

/**
 * @swagger
 * /dmt/get-dmt-utilities-list:
 *   post:
 *     summary: Listar Utiliários do Cliente
 *     description: Listar todas as informações dos Utilitários
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Cliente
 *         schema:
 *           type: object
 *           properties:
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: ""
 *               required: true
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
 *                   DMT_CODE: 
 *                     type: string
 *                     description: Código do DMT
 *                   DAT_CODE: 
 *                     type: string
 *                     description: Código do DAT
 *                   NAME: 
 *                     type: string
 *                     description: Nome do Utilitário
 *                   MANUFACTURER: 
 *                     type: string
 *                     description: Fabricante
 *                   MODEL: 
 *                     type: string
 *                     description: Modelo
 *                   INPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Entrada
 *                   OUTPUT_VOLTAGE: 
 *                     type: number
 *                     description: Tensão de Saída
 *                   NOMINAL_POTENTIAL: 
 *                     type: number
 *                     description: Potência Nominal
 *                   NOMINAL_BATTERY_LIFE: 
 *                     type: number
 *                     description: Autonomia da Bateria Interna
 *                   INPUT_ELECTRIC_CURRENT: 
 *                     type: number
 *                     description: Corrente elétrica de entrada (A)
 *                   OUTPUT_ELECTRIC_CURRENT: 
 *                     type: number
 *                     description: Corrente elétrica de saída (A)
 *                   NOMINAL_BATTERY_CAPACITY: 
 *                     type: number
 *                     description: Capacidade nominal da bateria (Ah)
 *                   INSTALLATION_DATE: 
 *                     type: string
 *                     description: Data de Instalação do Utilitário
 *                   PORT: 
 *                     type: number
 *                     description: Porta Associada do DMT
 *                   APPLICATION: 
 *                     type: string
 *                     description: Aplicação do Utilitário
 *                   GRID_VOLTAGE: 
 *                     type: number
 *                     description: Tensao da Iluminação
 *                   GRID_CURRENT: 
 *                     type: number 
 *                     description: Corrente da Iluminação
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para visualizar nobreaks do cliente
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dmt/get-dmt-utilities-list'] = async function (reqParams, session) {
  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);
  let nobreaks = await sqldb.NOBREAKS.getNobreakInfoList({clientIds: [reqParams.CLIENT_ID]});

  let illuminations = await sqldb.ILLUMINATIONS.getIllumDmtInfoList({CLIENT_ID: reqParams.CLIENT_ID});

  const utilities = [
    ...(nobreaks.map((dmt) => ({...dmt, APPLICATION: 'Nobreak'}))),
    ...(illuminations.map((dmt) => ({...dmt, APPLICATION: 'Illumination'})))
  ];
  
  return utilities;
}


export const removeDmtPorts = async (application: string, nobreakId: number, illuminationId: number, dmtCode: string, user: string) => {
  if (application === 'Nobreak') {
    await sqldb.DMTS_NOBREAKS.w_deleteDmtNobreakByNobreakId({NOBREAK_ID: nobreakId }, user);
  } else if (application === 'Illumination') {
    await sqldb.DMTS_ILLUMINATIONS.w_deleteDmtIlluminationstByIlluminationId({ ILLUMINATION_ID: illuminationId }, user);
  } else if (application === 'Electric Network') {
    const dmtInfo = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: dmtCode });
    if (dmtInfo?.ID) await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: dmtInfo.ID }, user);
  }

  const dmtData = await sqldb.DMTS.getIdByCode({DEVICE_CODE: dmtCode});
  const nobreakUsedPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: dmtData.ID});
  const illuminationsUsedPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: dmtData.ID});
  const usedPorts = (nobreakUsedPorts.length && nobreakUsedPorts) || illuminationsUsedPorts;
  if(usedPorts && usedPorts.length === 0){
    const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: dmtCode});
    console.log(dmtCode);
    console.log(devData);
    if(devData?.ID){
      await sqldb.DEVICES_UNITS.w_deleteRowByDeviceId({DEVICE_ID: devData.ID}, user);
      await sqldb.DEVICES_CLIENTS.w_deleteRowFromDeviceId({DEVICE_ID: devData.ID}, user);
    }
    
    const dmtData = await sqldb.DMTS.getIdByCode({DEVICE_CODE: dmtCode});
    if(dmtData?.ID){
      await sqldb.DMTS_NOBREAK_CIRCUITS.w_deleteDmtNobreakCircuitByDmtId({DMT_ID: dmtData.ID}, user);
    }
  }
}

export const insertDmtPorts = async (application: string, nobreakId: number, illuminationId: number, dmtCode: string, port: number, user: string) => {
  const dmtInfo = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: dmtCode });
  if (application === 'Nobreak') {
    sqldb.DMTS_NOBREAKS.w_insert_update({ NOBREAK_ID: nobreakId, DMT_ID: dmtInfo.ID, PORT: port }, user);
  } else if (application === 'Illumination') {
    sqldb.DMTS_ILLUMINATIONS.w_insert({ ILLUMINATION_ID: illuminationId, DMT_ID: dmtInfo.ID, PORT: port }, user);
  } else if (application === 'Electric Network') {
    sqldb.DMTS_NOBREAK_CIRCUITS.w_insert({ DMT_ID: dmtInfo.ID, PORT: port }, user);
  }
}

interface ISetDmtUtilities {
  DMT_CODE: string;
  UNIT_ID: number;
  utilities: {
    INSERT?: boolean;
    DISSOCIATE?: boolean;
    APPLICATION?: 'Nobreak'|'Illumination'|'Electric Network';
    NOBREAK_ID?: number;
    ILLUMINATION_ID?: number;
    CIRCUIT_ID?: number;
    PORT?: number;
    DMT_CODE?: string;
    UNIT_ID?: number;
  }[]
}

type utilitiesId = 'NOBREAK_ID'|'ILLUMINATION_ID'|'CIRCUIT_ID';
type portsId = 'nobreakId'|'illuminationId'|'eletricCircuitId';
interface IAppTypes {[key: string]: {utilitiesId : utilitiesId ; portsId: portsId; quantityId: string; }}

export const validateNumberOfUtilities = async (reqParams: ISetDmtUtilities, applicationsTypes: IAppTypes) => {
  const { nobreakUsedPorts, illuminationUsedPorts, eletricCircuitUsedPorts } = await getDmtUtilitiesPorts(reqParams.DMT_CODE);

  const quantity : {[key: string]: number} = {
    'nobreaks': nobreakUsedPorts.length,
    'illuminations': illuminationUsedPorts.length,
    'circuits': eletricCircuitUsedPorts.length
  };

  for (const util of reqParams.utilities){
    if (util.APPLICATION) continue;

    const appType = applicationsTypes[util.APPLICATION];
    if (!(appType && quantity[appType.quantityId] !== undefined)) continue;

    if (util.DISSOCIATE) {
      quantity[appType.quantityId] -= 1;
    } else if (!util.DISSOCIATE && util.INSERT) {
      quantity[appType.quantityId] += 1;
    }
  }

  if (quantity.nobreaks + quantity.illuminations + quantity.circuits > 4) throw Error('Impossible to associate this number of utilities.').HttpStatus(400);
}

const validadeDissociateFromPortsUtil = (util: ISetDmtUtilities["utilities"][number], applicationsTypes: IAppTypes, ports: { label: string; associated: boolean; port: number; nobreakId?: number; illuminationId?: number; eletricCircuitId?: number; }[]) => {
  const appType = applicationsTypes[util.APPLICATION];
  if (!appType) return;

  ports.forEach((port) => { if (util[appType.utilitiesId] && port[appType.portsId] === util[appType.utilitiesId]) { port.associated = false; delete port[appType.portsId];} })

}

const validadeRemoveUtilitiesPort = (reqParams: ISetDmtUtilities, applicationsTypes: IAppTypes, ports: { label: string; associated: boolean; port: number; nobreakId?: number; illuminationId?: number; eletricCircuitId?: number; }[]) => {
  for (const util of reqParams.utilities){
    if (!(util.DISSOCIATE && util.APPLICATION)) continue;

    validadeDissociateFromPortsUtil(util, applicationsTypes, ports);
  }

  for (const util of reqParams.utilities){
    if (!(!util.DISSOCIATE && !util.INSERT && util.APPLICATION)) continue;

    validadeDissociateFromPortsUtil(util, applicationsTypes, ports);
  }
}

const validadeAssociateFromPortsUtil = (util: ISetDmtUtilities["utilities"][number], applicationsTypes: IAppTypes, ports: { label: string; associated: boolean; port: number; nobreakId?: number; illuminationId?: number; eletricCircuitId?: number; }[]) => {
  const appType = applicationsTypes[util.APPLICATION];
  if (!(appType && util.PORT && ports[util.PORT-1])) return;

  if (!ports[util.PORT-1].associated) {
    ports[util.PORT-1].associated = true; 
    ports[util.PORT-1][appType.portsId] = util[appType.utilitiesId];
  } else throw Error(`Port ${util.PORT} already associated.`).HttpStatus(400);
};


const validadeInsertUtilitiesPort = (reqParams: ISetDmtUtilities, applicationsTypes: IAppTypes, ports: { label: string; associated: boolean; port: number; nobreakId?: number; illuminationId?: number; eletricCircuitId?: number; }[]) => {
  for (const util of reqParams.utilities){
    if (!(!util.DISSOCIATE && !util.INSERT && util.APPLICATION)) continue;

    validadeAssociateFromPortsUtil(util, applicationsTypes, ports);
  }

  for (const util of reqParams.utilities){
    if (!(!util.DISSOCIATE && util.INSERT && util.APPLICATION)) continue;

    validadeAssociateFromPortsUtil(util, applicationsTypes, ports);
  }
}

export const validateUtilitiesPorts = async (reqParams: ISetDmtUtilities, applicationsTypes: IAppTypes) => {
  const { ports } = await checkAvailablePorts(reqParams.DMT_CODE);

  validadeRemoveUtilitiesPort(reqParams, applicationsTypes, ports);

  validadeInsertUtilitiesPort(reqParams, applicationsTypes, ports);
}

const removeDmtUtilitiesPorts = async (reqParams: ISetDmtUtilities, user: string) => {
  for (const util of reqParams.utilities){
    if (!(util.DISSOCIATE && util.APPLICATION)) continue;
    await removeDmtPorts(util.APPLICATION, util.NOBREAK_ID, util.ILLUMINATION_ID, reqParams.DMT_CODE, user);
  }

  for (const util of reqParams.utilities){
    if (!(!util.DISSOCIATE && !util.INSERT && util.APPLICATION)) continue;
    await removeDmtPorts(util.APPLICATION, util.NOBREAK_ID, util.ILLUMINATION_ID, reqParams.DMT_CODE, user);
  }
}

export const setDmtUtilities = async (reqParams: ISetDmtUtilities, user: string) => {

  await removeDmtUtilitiesPorts(reqParams, user);

  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: reqParams.DMT_CODE});
  if(devData?.ID){
    const hasUtilityToAdd = !!reqParams.utilities.filter((util) => (!util.DISSOCIATE && util.APPLICATION)).length;
    if (hasUtilityToAdd) {
      await editDeviceUnit(devData.ID, reqParams.UNIT_ID, user);
    }
  }

  for (const util of reqParams.utilities){
    if (!(!util.DISSOCIATE && util.APPLICATION)) continue;
    await insertDmtPorts(util.APPLICATION, util.NOBREAK_ID, util.ILLUMINATION_ID, reqParams.DMT_CODE, util.PORT, user);
  }
}

/**
 * @swagger
 * /dmt/set-dmt-utilities:
 *   post:
 *     summary: Manipular utiliários de um DMT
 *     description: Inserir, Desassociar e Alterar Porta dos Utilitários de um DMT
 *     tags:
 *       - DMT
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Cliente
 *         schema:
 *           type: object
 *           properties:
 *             DMT_CODE:
 *               type: string
 *               description: Código do DMT
 *               default: ""
 *               required: true
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             utilities:
 *               type: array
 *               description:
 *               items:
 *                 type: object
 *                 properties:
 *                   INSERT: 
 *                     type: boolean
 *                     description: Se o utilitário deve ser associado com o DMT
 *                   DISSOCIATE: 
 *                     type: boolean
 *                     description: Se o utilitário deve ser desassociado com o DMT
 *                   APPLICATION: 
 *                     type: string
 *                     description: Tipo de aplicação do utiliário (Nobreak, Illumination, Electric Network)
 *                   NOBREAK_ID: 
 *                     type: number
 *                     description: ID do Nobreak
 *                   ILLUMINATION_ID: 
 *                     type: number
 *                     description: ID da Iluminação
 *                   CIRCUIT_ID: 
 *                     type: number
 *                     description: ID da Relação Rede Elétrica-DMT
 *                   PORT: 
 *                     type: number
 *                     description: Porta do DMT
 *                   DMT_CODE: 
 *                     type: string
 *                     description: Código do DMT
 *                   UNIT_ID: 
 *                     type: number
 *                     description: ID da Unidade do Utilitário
 *     responses:
 *       200:
 *         description: Operações de associação, desassociação e troca de portas realizadas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para realizar as operações entre o DMT e os utilitários
 *       500:
 *         description: Erro interno do servidor
 */
export const setDmtUtilitiesRouter = async (reqParams: httpRouter.ApiParams['/dmt/set-dmt-utilities'], session: SessionData) => {
  if (!reqParams.DMT_CODE) throw Error('Invalid parameters! Missing DMT_CODE').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('Invalid parameters! Missing UNIT_ID').HttpStatus(400);
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }

  const applicationsTypes : IAppTypes = {
    'Nobreak': {
      utilitiesId: 'NOBREAK_ID',
      portsId: 'nobreakId',
      quantityId: 'nobreaks',
    },
    'Illumination': {
      utilitiesId: 'ILLUMINATION_ID',
      portsId: 'illuminationId',
      quantityId: 'illuminations',
    },
    'Electric Network':  {
      utilitiesId: 'CIRCUIT_ID',
      portsId: 'eletricCircuitId',
      quantityId: 'circuits',
    },
  }

  await validateNumberOfUtilities(reqParams, applicationsTypes);
  await validateUtilitiesPorts(reqParams, applicationsTypes);
  await setDmtUtilities(reqParams, session.user);

  return 'SETTED';
}

httpRouter.privateRoutes['/dmt/set-dmt-utilities'] = setDmtUtilitiesRouter;

export async function getNobreakStatus(DMT_CODE: string, nobreakId: number, lastTelemetry: TelemetryPackRawDMT, connectionStatus: string) {
  const nobreakStatus = {
    status: 'Indisponível',
    connection: connectionStatus,
  };

  if (!lastTelemetry) return nobreakStatus;

  const dmtId = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: DMT_CODE});

  const electricPort = await sqldb.DMTS_NOBREAK_CIRCUITS.getDmtUsedPorts({ DMT_ID: dmtId?.ID });
  if (!(electricPort && electricPort.length === 1 && electricPort[0].PORT != null)) return nobreakStatus;
  const circuitPortTelemetry = 'F' + electricPort[0].PORT as 'F1' | 'F2' | 'F3' | 'F4';

  const nobreakPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({ DMT_ID: dmtId?.ID });
  const foundNobreak = nobreakPorts.find((nobreak) => nobreak.NOBREAK_ID === nobreakId);
  if (!foundNobreak || (foundNobreak && foundNobreak.PORT == null)) return nobreakStatus;
  const nobreakPortTelemetry = 'F' + foundNobreak.PORT as 'F1' | 'F2' | 'F3' | 'F4';

  if (lastTelemetry[circuitPortTelemetry]) {
    nobreakStatus.status = 'Rede Elétrica';
  } else if (lastTelemetry[nobreakPortTelemetry]) {
    nobreakStatus.status = 'Bateria';
  } else {
    nobreakStatus.status = 'Desligado'
  }

  return nobreakStatus;
}

export function getNobreakStatusSync(
  dmtId: number,
  nobreakId: number,
  lastTelemetry: TelemetryPackRawDMT,
  connectionStatus: string,
  circuitPorts: Map<number, { PORT: number }[]>,
  nobreakPorts: Map<number, { PORT: number, NOBREAK_ID: number }[]>,
) {
  const nobreakStatus = {
    status: 'Indisponível',
    connection: connectionStatus,
  };

  if (!lastTelemetry) return nobreakStatus;

  const electricPort = circuitPorts.get(dmtId);
  if (!(electricPort && electricPort.length === 1 && electricPort[0].PORT != null)) return nobreakStatus;
  const circuitPortTelemetry = 'F' + electricPort[0].PORT as 'F1' | 'F2' | 'F3' | 'F4';

  const portsNobreak = nobreakPorts.get(dmtId);
  const foundNobreak = portsNobreak.find((nobreak) => nobreak.NOBREAK_ID === nobreakId);
  if (!foundNobreak || (foundNobreak && foundNobreak.PORT == null)) return nobreakStatus;
  const nobreakPortTelemetry = 'F' + foundNobreak.PORT as 'F1' | 'F2' | 'F3' | 'F4';

  if (lastTelemetry[circuitPortTelemetry]) {
    nobreakStatus.status = 'Rede Elétrica';
  } else if (lastTelemetry[nobreakPortTelemetry]) {
    nobreakStatus.status = 'Bateria';
  } else {
    nobreakStatus.status = 'Desligado'
  }

  return nobreakStatus;
}

export async function getIlluminationStatus(DMT_CODE: string, illuminationId: number, lastTelemetry: TelemetryPackRawDMT, connectionStatus: string) {
  const illuminationStatus = {
    status: 'Indisponível',
    connection: connectionStatus,
  };

  if (!lastTelemetry) return illuminationStatus;

  const dmtId = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: DMT_CODE});

  const illuminationsPort = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({ DMT_ID: dmtId?.ID });
  const foundIllumination = illuminationsPort.find((illum) => illum.ILLUMINATION_ID === illuminationId);
  if (!foundIllumination || (foundIllumination && foundIllumination.PORT == null)) return illuminationStatus;
  const illumPortTelemetry = 'F' + foundIllumination.PORT as 'F1' | 'F2' | 'F3' | 'F4';

  if (lastTelemetry[illumPortTelemetry]) {
    illuminationStatus.status = 'Ligado';
  } else {
    illuminationStatus.status = 'Desligado'
  }

  return illuminationStatus;
}

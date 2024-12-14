import sqldb from '../../srcCommon/db';
import {  getPermissionsOnClient,  getUserGlobalPermissions} from '../../srcCommon/helpers/permissionControl';
import { SessionData } from '../../srcCommon/types';
import * as httpRouter from '../apiServer/httpRouter';
import { editDeviceUnit } from '../devices/devicesInfo';
import { setIllumination } from '../dal/dalInfo';
import { logger } from '../../srcCommon/helpers/logger';
import { sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones';
import { ramCaches_TIMEZONES_updateTimezoneId } from '../realTime/eventHooks';

interface IDamIllumination {
  ID?: number | null;
  UNIT_ID: number;
  DAM_ILLUMINATION_CODE?: string;
  NAME: string;
  GRID_VOLTAGE?: number | null;
  GRID_CURRENT?: number | null;
};
interface DeviceBasicInfo {
  
    DEV_ID: string;
    DEVICE_ID: number;
    CLIENT_ID: number;
    DEVICE_CLIENT_ID: number;
    UNIT_ID: number;
    DEVICE_UNIT_ID: number;
    DAC_ID: string;
    DAM_ID: string;
    DUT_ID: string;

};

const insertNewDamIllumination = async (reqParams: IDamIllumination, session: SessionData ) => {
  let damIllumination;
  if(!reqParams.DAM_ILLUMINATION_CODE) return damIllumination;
  const devData = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: reqParams.DAM_ILLUMINATION_CODE, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
  ramCaches_TIMEZONES_updateTimezoneId(reqParams.DAM_ILLUMINATION_CODE, 31);
  await sqldb.DAMS_DEVICES.w_insertIgnore({DEVICE_ID: devData.insertId}, session.user);
  damIllumination = await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: reqParams.DAM_ILLUMINATION_CODE});
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({UNIT_ID: reqParams.UNIT_ID});
  if(unitInfo){
    await sqldb.DEVICES_CLIENTS.w_insertIgnore({CLIENT_ID: unitInfo.CLIENT_ID, DEVICE_ID: devData.insertId },  session.user);
    await sqldb.DEVICES_UNITS.w_insertIgnore({UNIT_ID: reqParams.UNIT_ID, DEVICE_ID: devData.insertId},  session.user);
    await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devId: devData.insertId });
  }
  return damIllumination;
};

const editOldDamIllumination = async (reqParams: IDamIllumination, session: SessionData) => {
  if(!reqParams.DAM_ILLUMINATION_CODE) return;
  const devData = await sqldb.DEVICES.getIdByCode({DEVICE_CODE: reqParams.DAM_ILLUMINATION_CODE});
  if(devData?.ID){
    await editDeviceUnit(devData.ID, reqParams.UNIT_ID, session.user);
  }
}

export const setDamIllumination = async (reqParams: IDamIllumination, session: SessionData) => {
  let damIllumination;
  if (!reqParams.DAM_ILLUMINATION_CODE) return damIllumination; 
  if (reqParams.DAM_ILLUMINATION_CODE.length !== 12 || !reqParams.DAM_ILLUMINATION_CODE.startsWith('DAM')) throw Error('There was an error!\nInvalid properties. Invalid DAM_ILLUMINATION_CODE.').HttpStatus(400);

  damIllumination = await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: reqParams.DAM_ILLUMINATION_CODE});
  if(!damIllumination?.ID){
    damIllumination = await insertNewDamIllumination(reqParams, session);
  }else{
    await editOldDamIllumination(reqParams, session);
  }
  
  return damIllumination;
}


const checkAssociatedIllum = async (reqParams: IDamIllumination, session: SessionData, damIlluminationId: {ID: number}, illuminationId: number, utilityAlreadyAssociated: boolean) => {
  
  const associations = await sqldb.DAMS_ILLUMINATIONS.getDamIlluminationUsed({ DAM_DEVICE_ID: damIlluminationId.ID });
  
  if (associations.some((x) => x.ILLUMINATION_ID === illuminationId )) {
    return true;
  }
  if(reqParams.ID){
    await sqldb.DAMS_ILLUMINATIONS.w_insert({DAM_DEVICE_ID: damIlluminationId.ID, ILLUMINATION_ID: illuminationId}, session.user);
    const inserted = reqParams.DAM_ILLUMINATION_CODE ? await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({LAST_AUTOMATION_DEVICE_TYPE: reqParams.DAM_ILLUMINATION_CODE.substring(0,3)}, session.user) : await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({}, session.user);
    await sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.w_insert({ILLUMINATION_ID: illuminationId, CURRENT_AUTOMATION_PARAMETERS_ID: inserted.insertId}, session.user)
    utilityAlreadyAssociated = true;
  }
  return utilityAlreadyAssociated;
};

const checkAssociatedUtility = async (reqParams: IDamIllumination, session: SessionData, damIllumination: {ID: number}, illuminationId: number) => {
  if(!reqParams.DAM_ILLUMINATION_CODE) return true;
  let utilityAlreadyAssociated = false;
  if (illuminationId) {
    utilityAlreadyAssociated = await checkAssociatedIllum(reqParams, session, damIllumination, illuminationId, utilityAlreadyAssociated);
  }
  return utilityAlreadyAssociated;
};

type utilityId = number | undefined | null;

const associateIllumToDamIllumination = async (session: SessionData,  damIlluminationId: {ID: number}, illuminationId: utilityId, damIlluminationCode: string) => {

  await sqldb.DAMS_ILLUMINATIONS.w_insert({DAM_DEVICE_ID: damIlluminationId.ID, ILLUMINATION_ID: illuminationId}, session.user);
  const inserted = damIlluminationCode ? await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({LAST_AUTOMATION_DEVICE_TYPE: damIlluminationCode.substring(0,3)}, session.user) : await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({}, session.user);
  await sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.w_insert({ILLUMINATION_ID: illuminationId, CURRENT_AUTOMATION_PARAMETERS_ID: inserted.insertId}, session.user);
};

export const associateUtilityToDam = async (reqParams: IDamIllumination, session: SessionData, damIllumination: {ID: number},  illuminationId: utilityId) => {
  if(!reqParams.DAM_ILLUMINATION_CODE || !damIllumination || !damIllumination.ID || !illuminationId) return;
  
  const illuminationAlreadyAssociated = await checkAssociatedUtility(reqParams, session, damIllumination, illuminationId);

  if(!illuminationAlreadyAssociated && illuminationId){
    await associateIllumToDamIllumination(session, damIllumination, illuminationId, reqParams.DAM_ILLUMINATION_CODE);
  }
};


/**
 * @swagger
 * /dam/set-dam-illumination:
 *   post:
 *     summary: Criar e Editar DAM Iluminação
 *     description: Se o ID não for passado, cria DAM Iluminação, caso contrário edita o DAM Iluminação do ID passado.
 *     tags:
 *       - DAM
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DAM
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
 *             
 *             DAM_ILLUMINATION_CODE:
 *               type: string
 *               description: Código Do DAM (DAMXXXXXXXXX)
 *               default: ""
 *               required: false
 *             NAME:
 *               type: string
 *               description: Nome da Iluminação
 *               default: ""
 *               required: true
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
 *     responses:
 *       200:
 *         description: DAM Iluminação criado ou editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Sem permissão para editar ou criar DAM Iluminação
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dam/set-dam-illumination'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!reqParams.NAME) throw Error('There was an error!\nInvalid properties. Missing NAME.').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);

  try {
    let damIllumination = await setDamIllumination(reqParams, session);
    let illumId = await setIllumination(reqParams, session);
    await associateUtilityToDam(reqParams, session, damIllumination, illumId);
  } catch (err) {
    logger.error(err);
    throw err;
  }
  
  return 'SUCCESS ON SET DAM ILLUMINATION';
}


/**
 * @swagger
 * /dam/get-dam-illumination-validation:
 *   post:
 *     summary: Verificar disponibilidade do dispositvo DAM
 *     description: Verificar disponibilidade do dispositivo a patir do DAM Code  
 *     tags:
 *       - DAM
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do DAM
 *         schema:
 *           type: object
 *           properties:
 *             DAM_ILLUMINATION_CODE:
 *               type: string
 *               description: Código Do DAM (DAMXXXXXXXXX)
 *               default: ""
 *               required: true
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Informações do DAM de Iluminação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freeDevice:
 *                   type: boolean
 *                   description: Se o DAM está disponível para associação
 *       400:
 *         description: Faltando parâmetros obrigatórios ou dispositivo já associado a alguma unidade
 *       403:
 *         description: Sem permissão para visualizar DAM
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/dam/get-dam-illumination-validation'] = async function (reqParams, session) {
  let isNewDevice = false;
  let hasMachine = false;  
  checkReqParams(reqParams)
  
  const device = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DAM_ILLUMINATION_CODE });
  if (!device) isNewDevice = true;
  else {
    const damDevice = await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: device.DEV_ID})
    const deviceAssociatedMachine = await sqldb.DAMS_AUTOMATIONS.getDamAutomationUsed({ DAM_DEVICE_ID: damDevice.ID });
    if(deviceAssociatedMachine  && deviceAssociatedMachine.length > 0 && deviceAssociatedMachine[0].MACHINE_ID)  
      return {freeDevice: false, newDevice: false, hasMachine: true};
    const deviceAssociatedUtility = await sqldb.DAMS_ILLUMINATIONS.getDamIlluminationUsed({ DAM_DEVICE_ID: damDevice.ID });
    if(deviceAssociatedUtility && deviceAssociatedUtility.length > 0 && deviceAssociatedUtility[0].ILLUMINATION_ID)  throw Error('Device already associated to other utility!').HttpStatus(400);
    await checkAssociatedOtherUnits(reqParams, device);
    const perms = await getPermissionsOnClient(session, device.CLIENT_ID);
    if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
    }
  } 
  return {freeDevice: true, newDevice: isNewDevice, hasMachine: hasMachine};
}

 async function checkAssociatedOtherUnits(reqParams: {
  DAM_ILLUMINATION_CODE?: string;
  UNIT_ID?: number;
  CLIENT_ID?: number;
}, device: DeviceBasicInfo){
  const unitId = await sqldb.DEVICES_UNITS.getUnitByDevId({DEVICE_ID: device.DEVICE_ID});
  if(unitId && unitId.UNIT_ID !== reqParams.UNIT_ID)  throw Error('Device already associated to other unit!').HttpStatus(400); 
  const clientId = await sqldb.DEVICES_CLIENTS.getClientByDevId({DEVICE_ID: device.DEVICE_ID});
  if(clientId && clientId.CLIENT_ID !== reqParams.CLIENT_ID)  throw Error('Device already associated to other client!').HttpStatus(400); 
}

function checkReqParams(reqParams: {
  DAM_ILLUMINATION_CODE?: string;
  UNIT_ID?: number;
  CLIENT_ID?: number;
}) {
  if (!reqParams.DAM_ILLUMINATION_CODE) throw Error('There was an error!\nInvalid properties. Missing DAM_ILLUMINATION_CODE.').HttpStatus(400);
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('There was an error!\nInvalid properties. Missing UNIT_ID.').HttpStatus(400);
  if (reqParams.DAM_ILLUMINATION_CODE.length !== 12 || !reqParams.DAM_ILLUMINATION_CODE.startsWith('DAM')) throw Error('There was an error!\nInvalid properties. Invalid DAM_ILLUMINATION_CODE.').HttpStatus(400);   
}
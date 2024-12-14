import { SessionData } from "../../srcCommon/types";
import { ExtraRouteParams } from "../../srcCommon/types/backendTypes";
import { getUploadedPhoto } from "../apiServer/getMultiparFiles";
import * as httpRouter from '../apiServer/httpRouter';
import * as uuid from 'uuid';
import * as s3Helper from '../../srcCommon/s3/connectS3';
import sqldb from '../../srcCommon/db';
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import servConfig from '../../configfile';

type LastMessagesObject = Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries_dut>>;

/**
 * @swagger
 * /unit/update-ground-plan:
 *   post:
 *     summary: Editar uma planta baixa
 *     description: Editar uma planta baixa
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *             GROUNDPLAN_ID:
 *               type: number
 *               description: Id da planta baixa
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             NAME_GP:
 *               type: string
 *               description: Nome da planta baixa
 *               default: ""
 *               required: true
 *             POINTS:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                  POINT_ID:
 *                    type: number
 *                    description: id do ponto
 *                  DUT_ID:
 *                    type: number
 *                    description: Id do dispositivo de monitoramento do ambiente
 *                  x:
 *                    type: string
 *                    description: ponto x
 *                  y:
 *                    type: string
 *                    description: ponto y
 *     responses:
 *       200:
 *         description: Edição feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

async function editPoints(reqParams: httpRouter.ApiParams['/unit/update-ground-plan'], allPoints: Awaited<ReturnType<typeof sqldb.DEV_POINTS.getAllPointsUnit>>) {
  let pointsIds = allPoints.map((item) => item.POINT_ID);
  for (const point of reqParams.POINTS) {
    let id = point.POINT_ID;
    const searchDevice = allPoints.find((item) => item.DEVICE_ID === point.DUT_ID);
    if (searchDevice && !point.POINT_ID) {
      id = searchDevice.POINT_ID;
    }
    if (!point.POINT_ID && !searchDevice) {
      const idPoint = await sqldb.DEV_POINTS.w_insert({ POINT_X: point.x, POINT_Y: point.y, DEVICE_ID: point.DUT_ID });
      await sqldb.GROUND_PLANS_POINTS.w_insert({ GROUNDPLAN_ID: reqParams.GROUNDPLAN_ID, POINT_ID: idPoint.insertId });
    } else {
      await sqldb.DEV_POINTS.w_update({ POINT_ID: point.POINT_ID, POINT_X: point.x, POINT_Y: point.y, DEVICE_ID: point.DUT_ID });
    }
    if (id) {
      pointsIds = pointsIds.filter((item) => item !== id);
    }
  }
  return pointsIds
}

export const updateGroundPlanRoute = async (reqParams: httpRouter.ApiParams['/unit/update-ground-plan'], session: SessionData) => {
  if (!reqParams.GROUNDPLAN_ID || !reqParams.UNIT_ID) throw Error('Missing params').HttpStatus(400);
  await verifyPermissionsGroundPlan({ UNIT_ID: reqParams.UNIT_ID }, session);
  const gp = await sqldb.GROUND_PLANS.getByIdAndUnit({ GROUNDPLAN_ID: reqParams.GROUNDPLAN_ID, UNIT_ID: reqParams.UNIT_ID });
  if (!gp) throw Error('Planta baixa não existe').HttpStatus(400);
  try {
    if (reqParams.NAME_GP) {
      await sqldb.GROUND_PLANS.w_update({ GROUNDPLAN_ID: reqParams.GROUNDPLAN_ID, NAME_GP: reqParams.NAME_GP });
    }
    const allPoints = await sqldb.DEV_POINTS.getAllPointsUnit({ GROUND_PLAN_ID: reqParams.GROUNDPLAN_ID });
    if (reqParams.POINTS) {
      const pointsIds = await editPoints(reqParams, allPoints);
      for (const id of pointsIds) {
        await sqldb.DEV_POINTS.w_delete({ POINT_ID: id }, session.user);
      }
    }
  } catch (err) {
    logger.error(`Erro editando ground plans. ${err}`, reqParams, session.user);
    throw Error(`Erro editando ground plans. ${err}`).HttpStatus(500);
  }

  return 'OK';
}
httpRouter.privateRoutes['/unit/update-ground-plan'] = updateGroundPlanRoute;

/**
 * @swagger
 * /unit/upload-ground-plan:
 *   post:
 *     summary: Upload de planta baixa
 *     description: Upload de planta baixa
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             NAME_GP:
 *               type: string
 *               description: Nome da planta baixa
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Criação feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

export const uploadGroundPlanRoute = async (_reqParams: httpRouter.ApiParams['/unit/upload-ground-plan'], session: SessionData, { req, res }: ExtraRouteParams) => {
  const file = await getUploadedPhoto(req, res);
  const reqBody: typeof _reqParams = req.body;
  if (!file) throw Error('Missing ground plant').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  if (!Number(reqBody.UNIT_ID) || !reqBody.NAME_GP || !reqBody.FILE_NAME) throw Error('Missing params').HttpStatus(400);
  const infoUnit = await verifyPermissionsGroundPlan({ UNIT_ID: Number(reqBody.UNIT_ID) }, session);
  try {
    const { id } = await uploadUnitGroundPlans(file, Number(reqBody.UNIT_ID), infoUnit.CLIENT_ID, session.user, { FILENAME: reqBody.FILE_NAME, NAME_GP: reqBody.NAME_GP });
    return id;
  } catch (err) {
    logger.error("Erro upando ground plans.", reqBody, session.user);
    throw Error('Erro upando ground plans.').HttpStatus(500);
  }
}
httpRouter.privateRoutes['/unit/upload-ground-plan'] = uploadGroundPlanRoute;

/**
 * @swagger
 * /unit/set-points-ground-plan:
 *   post:
 *     summary: Salva os pontos em uma unidade
 *     description: Salva os pontos em uma unidade
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             POINTS:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   POINT_ID:
 *                     type: number
 *                     description: id do ponto
 *                   DUT_ID:
 *                     type: number
 *                     description: Id do dispositivo de monitoramento do ambiente
 *                   x:
 *                     type: string
 *                     description: ponto x
 *                   y:
 *                     type: string
 *                     description: ponto y
 *     responses:
 *       200:
 *         description: Salvo com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

export const setPoints = async (reqParams: httpRouter.ApiParams['/unit/set-points-ground-plan'], session: SessionData) => {
  if (!reqParams.POINTS?.length || !Number(reqParams.GROUNDPLAN_ID) || !Number(reqParams.UNIT_ID)) throw Error('Missing params').HttpStatus(400);
  await verifyPermissionsGroundPlan({ UNIT_ID: reqParams.UNIT_ID }, session)
  try { 
    for (const point of reqParams.POINTS) {
      const idPoint = await sqldb.DEV_POINTS.w_insert({ POINT_X: point.x, POINT_Y: point.y, DEVICE_ID: point.DUT_ID });
      await sqldb.GROUND_PLANS_POINTS.w_insert({ GROUNDPLAN_ID: reqParams.GROUNDPLAN_ID, POINT_ID: idPoint.insertId });
    }
    return 'OK';
  } catch (err) {
    logger.error("Erro upando ground plans.", reqParams, session.user);
    throw Error('Erro upando ground plans.').HttpStatus(500);
  }
}
httpRouter.privateRoutes['/unit/set-points-ground-plan'] = setPoints;


/**
 * @swagger
 * /unit/delete-ground-plan:
 *   post:
 *     summary: Deletar planta baixa
 *     description: Deletar planta baixa
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             GROUND_PLAN_IDS:
 *               type: array
 *               items:
 *                 type: number
 *                 description: Ids da planta baixa
 *     responses:
 *       200:
 *         description: Deleção feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

export const deleteGroundPlanRoute = async (reqParams: httpRouter.ApiParams['/unit/delete-ground-plan'], session: SessionData) => {
  await verifyPermissionsGroundPlan({ UNIT_ID: reqParams.UNIT_ID }, session);
  try {
    for (const groundplan of reqParams.GROUND_PLAN_IDS){
      const infoGP = await sqldb.GROUND_PLANS.getByIdAndUnit({ GROUNDPLAN_ID: groundplan, UNIT_ID: reqParams.UNIT_ID });
      if (!infoGP) throw Error('Erro deletando ground plans.').HttpStatus(400);
      const getPoints = await sqldb.GROUND_PLANS.getPointsByGroundPlanId({ GROUNDPLAN_ID: groundplan });
      for (const point of getPoints) {
        await sqldb.DEV_POINTS.w_delete({ POINT_ID: point.POINT_ID }, session.user);
      }
      await sqldb.GROUND_PLANS.w_delete({ GROUNDPLAN_ID: groundplan }, session.user);
    }
  } catch (err) {
    logger.error("Erro deletando ground plans.", reqParams, session.user);
    throw Error('Erro deletando ground plans.').HttpStatus(500);
  }
  return 'OK';
}
httpRouter.privateRoutes['/unit/delete-ground-plan'] = deleteGroundPlanRoute;

type TPoint = {
  POINT_ID: number,
  DUT_ID: number,
  POINT_X: string,
  POINT_Y: string,
  DEV_ID: string
  ROOM_NAME: string
  HUMIMAX: number
  HUMIMIN: number
  TUSEMAX: number
  TUSEMIN: number
  CO2MAX: number
  ENVIRONMENT_ID: number
  TEMPERATURE?: number
  TEMPERATURE_1?: number
  HUMIDITY?: number
  eCO2?: number
  ISVISIBLE: number
}

/**
 * @swagger
 * /unit/get-ground-plans:
 *   post:
 *     summary: Buscar plantas baixas da unidade
 *     description: Buscar plantas baixas da unidade
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: ""
 *               required: true
 *             PARAMS:
 *               type: string
 *               items:
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Busca feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

function getEditPoints(editPointsUnit: {
  [key: number]: [{
    GROUND_PLAN_ID: number;
    POINT_ID: number;
    POINT_X: string;
    POINT_Y: string;
    DEV_ID: string;
    DUT_ID: number;
    ROOM_NAME: string;
    CO2MAX: number;
    TUSEMAX: number;
    TUSEMIN: number;
    HUMIMAX: number;
    HUMIMIN: number;
    ISVISIBLE: number;
}]
}, point: Awaited<ReturnType<typeof sqldb.GROUND_PLANS.getPointsByUnitId>>[0], devTemperature: {
  TEMPERATURE?: number;
  Temperature_1?: number;
  HUMIDITY?: number;
  eCO2?: number;
}, isVisible: number) {
  const newObj = Object.assign(point, devTemperature, { ISVISIBLE: isVisible });
  if (editPointsUnit[point.GROUND_PLAN_ID]?.length) {
    const value = editPointsUnit[point.GROUND_PLAN_ID];
    value.push(newObj);
    editPointsUnit[point.GROUND_PLAN_ID] = value;
  } else {
    editPointsUnit[point.GROUND_PLAN_ID] = [newObj];
  }
}

export const getPointsOnUnit = async (reqParams: httpRouter.ApiParams['/unit/get-ground-plans'], infoUnit: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitBasicInfo>>, session: SessionData) => {
  const editPointsUnit = {} as {
    [key: number]: [{
      GROUND_PLAN_ID: number;
      POINT_ID: number;
      POINT_X: string;
      POINT_Y: string;
      DEV_ID: string;
      DUT_ID: number;
      ROOM_NAME: string;
      ENVIRONMENT_ID: number
      CO2MAX: number;
      TUSEMAX: number;
      TUSEMIN: number;
      HUMIMAX: number;
      HUMIMIN: number;
      ISVISIBLE: number;
  }]
  };
  const pointOfUnit = await sqldb.GROUND_PLANS.getPointsByUnitId({ UNIT_ID: reqParams.UNIT_ID });
  if (pointOfUnit.length) {
    const dutsList = await sqldb.DEVICES.getDutsInnerDevsToGetVisibility({ CLIENT_ID: infoUnit.CLIENT_ID, UNIT_ID: reqParams.UNIT_ID });
    const lastTelemetries = await devsLastComm.loadLastTelemetries_dut({
      devIds: (pointOfUnit.length <= 500) ? pointOfUnit?.map((x) => x.DEV_ID) : undefined,
    });
    for (const point of pointOfUnit) {
      if (point.DEVICE_UNIT !== reqParams.UNIT_ID) {
        await sqldb.DEV_POINTS.w_delete({ POINT_ID: point.POINT_ID }, session.user);
        continue;
      }
      const devTemperature = addTemperatureInList(point.DEV_ID, lastTelemetries);
      const infoDut = dutsList.find((item) => item.DEV_ID === point.DEV_ID);
      const isVisible = infoDut?.ISVISIBLE || 0;
      if (!isVisible && !session.permissions.isAdminSistema) continue;
      getEditPoints(editPointsUnit, point, devTemperature, isVisible);
    }
  }
  return editPointsUnit;
}

export const listGroundPlanRoute = async (reqParams: httpRouter.ApiParams['/unit/get-ground-plans'], session: SessionData) => {
  if (!reqParams.UNIT_ID) throw Error('Missing params').HttpStatus(400);
  const infoUnit = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!infoUnit) throw Error('Missing params').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, infoUnit.CLIENT_ID, infoUnit.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Permission denied!').HttpStatus(403);
  try {
    const listGP = await sqldb.GROUND_PLANS.getByUnit({ UNIT_ID: reqParams.UNIT_ID, PARAMS: reqParams.PARAMS ? '%' + reqParams.PARAMS + '%' : null });
    const list: {
      GROUNDPLAN_ID: number,
      IMAGE: string,
      UNIT_ID: number,
      NAME_GP: string,
      POINTS?: TPoint[]
    }[] = [];
    const pointsUnit = await getPointsOnUnit(reqParams, infoUnit, session);
    for (const gp of listGP) {
      const listWithTemperaturePoints: TPoint[] = [];
      const key = `${servConfig.filesBucketPrivate.sketchesBucketPath}${gp.FILENAME}`
      const linkImage = await s3Helper.preSigningUrl(servConfig.filesBucketPrivate, key);
      const newObj = Object.assign(gp, {
        IMAGE: linkImage,
        POINTS: listWithTemperaturePoints,
      }, {
        POINTS: pointsUnit[gp.GROUNDPLAN_ID]
      });
      list.push(newObj);
    }
    return list;
  } catch (err) {
    logger.error(`Erro buscando ground plans. ${err}`, reqParams, session.user);
    throw Error(`Erro buscando ground plans. ${err}`).HttpStatus(500);
  }
}
httpRouter.privateRoutes['/unit/get-ground-plans'] = listGroundPlanRoute;

/**
 * @swagger
 * /unit/list-devs-unit:
 *   post:
 *     summary: Retorna lista de dispositivo de monitoramentos
 *     description: Retorna lista de dispositivo de monitoramentos
 *     tags:
 *       - Ground Plan
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
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
 *         description: Busca feita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */

export const listDutsRoute = async (reqParams: httpRouter.ApiParams['/unit/list-devs-unit'], session: SessionData) => {
  await verifyPermissionsGroundPlan({ UNIT_ID: reqParams.UNIT_ID }, session)
  try {
    const listDuts = await sqldb.DUTS.getListDutsBasicGroundPlant({ UNIT_ID: reqParams.UNIT_ID });
    const lastTelemetries = await devsLastComm.loadLastTelemetries_dut({
      devIds: (listDuts.length <= 500) ? listDuts?.map((x) => x.DEV_ID) : undefined,
    });
    const listWithTemperature: {
      DEV_ID: string
      DUT_ID: number
      ROOM_NAME: string
      HUMIMAX: number
      HUMIMIN: number
      TUSEMAX: number
      TUSEMIN: number
      CO2MAX: number
      ENVIRONMENT_ID: number
      TEMPERATURE?: number
      TEMPERATURE_1?: number
      HUMIDITY?: number
      eCO2?: number
      isDutQA?: boolean
    }[] = [];
    for (const device of listDuts) {
      const devTemperature = addTemperatureInList(device.DEV_ID, lastTelemetries);
      const newObj = Object.assign(device, devTemperature);
      listWithTemperature.push(newObj);
    }
    return listWithTemperature;
  } catch (err) {
    logger.error("Erro buscando lista de duts groudPlans.", reqParams, err, session.user);
    throw Error(`Erro buscando lista de duts groudPlans. ${err}`).HttpStatus(500);
  }
}

export function addTemperatureInList(DEV_ID: string , lastTelemetries: LastMessagesObject) {
  const dev = lastTelemetries.lastDutTelemetry(DEV_ID);
  const status = dev?.status || 'OFFLINE';
  const lastTelemetry = ((status !== 'OFFLINE') && dev?.lastTelemetry) || null;
  let isDutQA = undefined;
  if (lastTelemetry?.operation_mode !== undefined) {
    isDutQA = lastTelemetry.operation_mode === 5;
  }
  if (!lastTelemetry) {
    return {
      TEMPERATURE: null,
      Temperature_1: null,
      HUMIDITY: null,
      eCO2: null,
      isDutQA: null,
    }
  }
  if (isDutQA !== undefined && !isDutQA) {
    return {
      TEMPERATURE: (lastTelemetry?.Temperature !== undefined) ? lastTelemetry.Temperature : null,
      Temperature_1: (lastTelemetry?.Temperature_1 !== undefined) ? lastTelemetry.Temperature_1 : null,
      isDutQA,
    }
  }
  return {
    TEMPERATURE: (lastTelemetry?.Temperature !== undefined) ? lastTelemetry.Temperature : null,
    Temperature_1: (lastTelemetry?.Temperature_1 !== undefined) ? lastTelemetry.Temperature_1 : null,
    HUMIDITY: (lastTelemetry?.Humidity !== undefined) ? lastTelemetry.Humidity : null,
    eCO2: (lastTelemetry?.eCO2 !== undefined) ? lastTelemetry.eCO2 : null,
    isDutQA,
  }
}

httpRouter.privateRoutes['/unit/list-devs-unit'] = listDutsRoute;

export async function uploadUnitGroundPlans(image: Buffer, unitId: number, clientId: number, userId: string, reqParams: { FILENAME: string, NAME_GP: string }) {
  const extension = reqParams.FILENAME.split('.')
  const filename = clientId.toString() + '/' + unitId.toString() + '/' + uuid.v4() + `.${extension[extension.length - 1]}`;

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await s3Helper.uploadUnitSketchImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${userId} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  const idGP = await sqldb.GROUND_PLANS.w_insert({
    DAT_UPLOAD: new Date(Date.now()),
    FILENAME: filename,
    NAME_GP: reqParams.NAME_GP,
  }, userId);

  await sqldb.GROUND_PLANS_UNITS.w_insert({
    UNIT_ID: unitId,
    GROUNDPLAN_ID: idGP.insertId,
  })

  logger.info("Successfully uploaded data", pres);

  return { filename, id: idGP.insertId };
}

export async function verifyPermissionsGroundPlan(reqParams: { UNIT_ID: number }, session: SessionData) {
  if (!reqParams.UNIT_ID) throw Error('Missing params').HttpStatus(400);
  const infoUnit = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!infoUnit) throw Error('Missing params').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, infoUnit.CLIENT_ID, infoUnit.CLIENT_ID);
  if (!perms.canManageSketches) throw Error('Permission denied!').HttpStatus(403);
  return infoUnit;
}
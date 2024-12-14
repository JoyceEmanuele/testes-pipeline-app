import sqldb from '../../srcCommon/db'
import servConfig from '../../configfile'
import * as httpRouter from '../apiServer/httpRouter'
import { getUploadedPhoto, getUploadedPhotoAsFile } from './../apiServer/getMultiparFiles'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { SessionData } from '../../srcCommon/types';
import { logger } from '../../srcCommon/helpers/logger'
import * as uuid from 'uuid'
import * as s3Helper from '../../srcCommon/s3/connectS3';
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes'
import { apiUploadService } from '../extServices/uploadServiceApi'

const sketchBucket = servConfig.filesBucketPrivate;

httpRouter.privateRoutesDeprecated['/unit/upload-sketch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody: typeof _reqParams = req.body;
  if (!file) {
    throw Error('Missing "sketch"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }
  const unitId = Number(reqBody.unitId);
  if (!unitId) {
    throw Error('Missing "unitId"').HttpStatus(400);
  }
  const hasPermission = await checkPermissionOnUnit(unitId, session);
  if (!hasPermission) {
      throw Error('Permission denied!').HttpStatus(403);
  }
  try {
    const authHeader = req.get('Authorization');
    const params = {
      unitId: unitId,
      isVisible: reqBody.isVisible === '1',
      nameSketch: reqBody.name_sketch,
      file
    }
    await apiUploadService['POST /upload-service/upload-sketch'](
      params,
      authHeader
    );
  } catch (err) {
    logger.error("Erro upando sketches", reqBody, session.user);
    throw Error('Erro upando sketches').HttpStatus(500);
  }
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/unit/get-sketches-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const unitId = Number(reqParams.unitId);
  if (!unitId) throw Error('Invalid parameters! Missing unitId').HttpStatus(400)
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: unitId });
  if (!unitInfo) throw Error('Group not found').HttpStatus(400);

  const hasPermission =  await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!hasPermission?.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403);
  }

  const authHeader = req.get('Authorization');
  const params = {
    unitId: unitId
  }
  const { list } = await apiUploadService['POST /upload-service/get-sketches-list'](
    params,
    authHeader
  );
  return { list }
}

httpRouter.privateRoutesDeprecated['/unit/delete-sketch'] = async function (reqParams, session, {req, res}) {
  const unitId = Number(reqParams.unitId);
  if ((!unitId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const hasPermission = await checkPermissionOnUnit(unitId, session);
  if (!hasPermission) {
      throw Error('Permission denied!').HttpStatus(403);
  }
  try {
    const authHeader = req.get('Authorization');
    const params = {
      unitId: unitId,
      filename: reqParams.filename
    }
    const affectedRows = await apiUploadService['POST /upload-service/delete-sketch'](
      params,
      authHeader
    );
    return 'DELETED ' + affectedRows
  } catch (err) {
    logger.error("Erro deletando sketches", reqParams, session.user);
    throw Error('Erro deletando sketches').HttpStatus(500);
  }
}

export async function deleteSketch(filename: string, unitId: number, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucketPrivate.sketchesBucketPath);
  const fileName = filename.substr(filePathIndex + servConfig.filesBucketPrivate.sketchesBucketPath.length);
  const unitSketchInfo = await sqldb.UNITS_SKETCHES.getInfo({ UNIT_ID: unitId, FILENAME: fileName});

  if (unitSketchInfo) {
      const { affectedRows } = await sqldb.UNITS_SKETCHES.w_deleteRow({
        UNIT_SKETCH_ID: unitSketchInfo.UNIT_SKETCH_ID,
        FILENAME: fileName
      }, sessionUser);
      return 'DELETED ' + affectedRows
  }
  else {
    throw Error('Croqui/Projeto não encontrado!').HttpStatus(403);
  }
}

async function checkPermissionOnUnit(unitId: number, session: SessionData){
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: unitId });
  if (!unitInfo) throw Error('Group not found').HttpStatus(400);
  
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    return true;
  }
  return false;
}

export async function uploadUnitSketch(image: Buffer, unitId: number, userId: string, reqParams: { name_sketch: string }) {
  const extension = reqParams.name_sketch.split('.')
  const filename = unitId.toString() + '-' + uuid.v4() + `.${extension[extension.length - 1]}`;

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await s3Helper.uploadUnitSketchImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${userId} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  let nameOfSketch = reqParams.name_sketch.split('.')[0]
  if (reqParams.name_sketch.length > 100 || !reqParams.name_sketch || reqParams.name_sketch === null) {
    nameOfSketch = uuid.v4()
  }

  await sqldb.UNITS_SKETCHES.w_insert({
    UNIT_ID: unitId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename,
    NAME_SKETCH: nameOfSketch,
  }, userId);
  logger.info("Successfully uploaded data", pres);

  return filename;
}

/**
 * @swagger
 * /unit/edit-sketch:
 *   post:
 *     summary: Editar documento da unidade
 *     description: Editar documento da unidade
 *     tags:
 *       - UNIT - Sketches
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Sketch
 *         schema:
 *           type: object
 *           properties:
 *             sketchList:
 *               type: array
 *               description: Sketches
 *               required: true
 *               items:
 *                 type: object
 *                 properties:
 *                   UNIT_SKETCH_ID:
 *                     type: number
 *                     description: ID do sketch
 *                   ISVISIBLE:
 *                     type: number
 *                     description: ID da unidade
 *                   FILENAME:
 *                     type: string
 *                     description: Nome do arquivo
 *                   NAME_SKETCH:
 *                     type: string
 *                     description: Nome do arquivo
 *             unitId:
 *               type: number
 *               description: ID da unidade
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: arquivos editados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para baixar sketches
 *       500:
 *         description: Erro interno do servidor
 */


export const unitEditSketch = async (reqParams: httpRouter.ApiParams['/unit/edit-sketch'], session: SessionData, {req, res}: ExtraRouteParams) => {
  if (!reqParams.sketchList || !reqParams.unitId ) throw Error('There was an error!\nInvalid properties. Missing sketList.').HttpStatus(400);
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInfo) throw Error('Group not found').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, reqParams.unitId );
  if (!perms.canManageDevs) throw Error('You dont have the permission').HttpStatus(403);
    const authHeader = req.get('Authorization');
    const params = {
      sketchList: reqParams.sketchList.map(item => ({ unitSketchId: item.UNIT_SKETCH_ID, filename: item.FILENAME, isVisible: !!item.ISVISIBLE, nameSketch: item.NAME_SKETCH})),
      unitId: reqParams.unitId
    }
    const { sketchList } = await apiUploadService['POST /upload-service/edit-sketch'](
      params,
      authHeader
    );
  return sketchList;
}

httpRouter.privateRoutesDeprecated['/unit/edit-sketch'] = unitEditSketch;

/**
 * @swagger
 * /unit/download-sketches:
 *   post:
 *     summary: Baixar documento da unidade
 *     description: Baixar documento da unidade
 *     tags:
 *       - UNIT - Sketches
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Sketch
 *         schema:
 *           type: object
 *           properties:
 *             UNIT_SKETCH_ID:
 *               type: number
 *               description: ID do sketch
 *               default: ""
 *               required: true
 *             unit_id:
 *               type: number
 *               description: ID da unidade
 *               default: ""
 *               required: true
 *             FILENAME:
 *               type: string
 *               description: Nome do arquivo
 *               default: ""
 *               required: true
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
 *         description: Sem permissão para baixar sketches
 *       500:
 *         description: Erro interno do servidor
 */

export const unitDownloadSketches = async (reqParams: httpRouter.ApiParams['/unit/download-sketches'], session: SessionData, { req, res }: ExtraRouteParams) => {
  logger.info(reqParams)

  if (!reqParams.unit_id)
  throw Error(
    "There was an error!\nInvalid properties. Missing unit_id."
  ).HttpStatus(400);

  if (!reqParams.UNIT_SKETCH_ID || !reqParams.FILENAME)
  throw Error(
    "There was an error!\nInvalid properties."
  ).HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unit_id });

  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  try {

    const authHeader = req.get('Authorization');
    const params = {
      unitId: reqParams.unit_id,
      unitSketchId: reqParams.UNIT_SKETCH_ID,
      filename: reqParams.FILENAME,
    }
    const { key, object } = await apiUploadService['POST /upload-service/download-sketches'](
      params,
      authHeader
    );

    res.attachment(key);
    let fileStream = object.Body;
    fileStream.pipe(res);
  }
  catch(err){
    logger.info('Error getting pdf' + err.toString());
    throw Error('Error getting pdf').HttpStatus(500);
  }

  return res;
}

httpRouter.privateRoutesDeprecated['/unit/download-sketches'] = unitDownloadSketches;

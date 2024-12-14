import * as uuid from 'uuid'
import * as dutInfo from './dutInfo'
import sqldb from '../srcCommon/db'
import servConfig from '../configfile'
import * as httpRouter from './apiServer/httpRouter'
import { getUploadedPhoto, getUploadedPhotoAsFile } from './apiServer/getMultiparFiles'
import { getPermissionsOnUnit } from '../srcCommon/helpers/permissionControl'
import { logger } from '../srcCommon/helpers/logger'
import {
  deleteLaagerImage,
  uploadDevImage,
  uploadLaagerImage,
  uploadAssetImage,
  uploadMachinesImage,
  uploadNobreakImage,
  uploadDalImages3,
  uploadIlluminationImageS3,
  uploadDmtImageConnectS3
} from '../srcCommon/s3/connectS3'
import { apiUploadService } from './extServices/uploadServiceApi'
import { ReferenceType } from '../srcCommon/types/backendTypes';

httpRouter.privateRoutesDeprecated['/dac/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const body = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqParams: body, file, files: req.files });
  }

  let devId = body.devId;
  if (!devId) devId = (body as any).dacId;
  if (!devId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const dacInfo = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: devId });
  if (!dacInfo) throw Error('DAC not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dacInfo.CLIENT_ID, dacInfo.UNIT_ID);
  if (!perms.canManageDevs && !session.permissions.isInstaller ) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, {referenceId: dacInfo.DEVICE_ID, referenceType: 'DACS'}, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

/**
 * @swagger
 * /dac/get-images-list:
 *   post:
 *     summary: Retorna uma array das imagens dos DACS
 *     description: Retorna uma array das imagens dos DACS
 *     tags:
 *       - DAC
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informações do DAC
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             devId:
 *               type: string
 *               description: ID do DAC
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de imagens do DAC
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutesDeprecated['/dac/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  let devId = reqParams.devId;
  if (!devId) devId = (reqParams as any).dacId
  if (!devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dacInf = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: devId });
  if (!dacInf) throw Error('Device not found').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dacInf.DEVICE_ID,
    referenceType: 'DACS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list: list }
}

/**
 * @swagger
 * /dac/delete-image:
 *   post:
 *     summary: Deleta uma imagem do dac
 *     description: Deleta uma imagem do dac
 *     tags:
 *       - DAC
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informações do DAC
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             devId:
 *               type: string
 *               description: ID do DAC
 *               default: ""
 *               required: true
 *             filename:
 *               type: string
 *               description: nome da imagem do DAC
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Retorna a quantidade de linhas afetadas
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutesDeprecated['/dac/delete-image'] = async function (reqParams, session, {req, res}) {
  let devId = reqParams.devId;
  if (!devId) devId = (reqParams as any).dacId
  if ((!devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const dacInfo = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: devId });
  if (!dacInfo) throw Error('DAC not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dacInfo.CLIENT_ID, dacInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dacInfo.DEVICE_ID,
    referenceType: 'DACS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);


  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutesDeprecated['/dut/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const body = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqParams: body, file, files: req.files });
  }

  const devId = body.devId;
  if (!devId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const dutInfo = await sqldb.DUTS.getBasicInfo({ devId });
  if (!dutInfo) throw Error('DUT not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dutInfo.CLIENT_ID, dutInfo.UNIT_ID);
  if (!perms.canManageDevs && !session.permissions.isInstaller) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: dutInfo.DEVICE_ID, referenceType: 'DUTS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/dut/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const devId = reqParams.devId
  if (!devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dutInfo = await sqldb.DUTS.getBasicInfo({devId});
  const perms = await getPermissionsOnUnit(session, dutInfo.CLIENT_ID, dutInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dutInfo.DEVICE_ID,
    referenceType: 'DUTS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/dut/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const dutInfo = await sqldb.DUTS.getBasicInfo({ devId: reqParams.devId });
  if (!dutInfo) throw Error('DUT not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dutInfo.CLIENT_ID, dutInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dutInfo.DEVICE_ID,
    referenceType: 'DUTS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function dutDeleteImage(filename: string, devId: string, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    DEV_ID: devId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.DUTS_DEVICES_IMAGES.w_deleteRow(qPars2, sessionUser);

  return { affectedRows };
}

httpRouter.privateRoutesDeprecated['/dam/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const body = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqParams: body, file, files: req.files });
  }

  const damId = body.devId;
  if (!damId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const damInfo = await sqldb.DAMS.getDamBasicInfo({ devId: damId });
  if (!damInfo) throw Error('DAM not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, damInfo.CLIENT_ID, damInfo.UNIT_ID);
  if (!perms.canManageDevs && !session.permissions.isInstaller) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: damInfo.DEVICE_ID, referenceType: 'DAMS' }, authHeader);

  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/dam/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const damId = reqParams.devId
  if (!damId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const damInf = await sqldb.DAMS.getDamBasicInfo({devId: damId});
  const perms = await getPermissionsOnUnit(session, damInf.CLIENT_ID, damInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: damInf.DEVICE_ID,
    referenceType: 'DAMS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/dam/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const damInfo = await sqldb.DAMS.getDamBasicInfo({ devId: reqParams.devId });
  if (!damInfo) throw Error('DAM not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, damInfo.CLIENT_ID, damInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: damInfo.DEVICE_ID,
    referenceType: 'DAMS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function damDeleteImages(filename: string, devId: string, sessionUser: string) {
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    DAM_ID: devId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.DAMS_DEVICES_IMAGES.w_deleteRow({DEV_ID: qPars2.DAM_ID, FILENAME: qPars2.FILENAME}, sessionUser)
  return {affectedRows};
}

export async function dmtDeletePhotos(filename: string, DMT_ID: number, sessionUser: string) {
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    DMT_ID,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.DMT_IMAGES.w_deleteRow(qPars2, sessionUser)
  return {affectedRows};
}

export async function nobreakDeletePhotos(filename: string, NOBREAK_ID: number, sessionUser: string) {
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    NOBREAK_ID,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.NOBREAK_IMAGES.w_deleteRow(qPars2, sessionUser)
  return {affectedRows};
}

httpRouter.privateRoutesDeprecated['/dri/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const driId = reqBody.devId;
  if (!driId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const driInfo = await sqldb.DRIS.getBasicInfo({ driId });
  if (!driInfo) throw Error('DRI not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, driInfo.CLIENT_ID, driInfo.UNIT_ID);
  if (!perms.canManageDevs && !session.permissions.isInstaller) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  
  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: driInfo.DEVICE_ID, referenceType: 'DRIS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/dri/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const driId = reqParams.devId
  if (!driId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const driInf = await sqldb.DRIS.getBasicInfo({driId});
  const perms = await getPermissionsOnUnit(session, driInf.CLIENT_ID, driInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: driInf.DEVICE_ID,
    referenceType: 'DRIS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/dri/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const driInfo = await sqldb.DRIS.getBasicInfo({ driId: reqParams.devId });
  if (!driInfo) throw Error('DRI not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, driInfo.CLIENT_ID, driInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: driInfo.DEVICE_ID,
    referenceType: 'DRIS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function driDeleteImages(filename: string, devId: string, sessionUser: string) {
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    DEV_ID: devId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.DRIS_DEVICES_IMAGES.w_deleteRow(qPars2, sessionUser)
  return {affectedRows};
}

httpRouter.privateRoutesDeprecated['/asset/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const devId = reqBody.devId;
  if (!devId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }

  const qPars = !devId.startsWith('DAT') ? { ASSET_ID: Number(devId)} : { DAT_CODE: devId }

  const assetInf = await sqldb.ASSETS.getBasicInfo(qPars);
  if (!assetInf) throw Error('Asset not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, assetInf.CLIENT_ID, assetInf.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: assetInf.ASSET_ID, referenceType: 'ASSETS' }, authHeader);

  res.send('Successfully uploaded!');

  return res;
}


httpRouter.privateRoutesDeprecated['/asset/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const {devId, assetId }= reqParams;
  if (!devId && !assetId) throw Error('Invalid parameters! Missing devId or assetId').HttpStatus(400)
  const qPars = assetId ? { ASSET_ID: assetId} : { DAT_CODE: devId }
  const assetInf = await sqldb.ASSETS.getBasicInfo(qPars);

  if (assetInf) {
    const perms = await getPermissionsOnUnit(session, assetInf.CLIENT_ID, assetInf.UNIT_ID);    
    if (!perms.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403)
    }
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: assetInf.ASSET_ID,
    referenceType: 'ASSETS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/asset/delete-image'] = async function (reqParams, session, {req, res}) {
  const {devId, assetId, filename} = reqParams;
  if ((!devId && !assetId) || (!filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }

  const qPars = assetId ? { ASSET_ID: assetId} : { DAT_CODE: devId }

  const assetInf = await sqldb.ASSETS.getBasicInfo(qPars);
  if (!assetInf) throw Error('Asset not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, assetInf.CLIENT_ID, assetInf.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: assetInf.ASSET_ID,
    referenceType: 'ASSETS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function assetDeleteImage(filename: string, assetId: number, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.assetImagesBucketPath)
  const { affectedRows } = await sqldb.ASSET_IMAGES.w_deleteRow({
    ASSET_ID: assetId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.assetImagesBucketPath.length)
  }, sessionUser)
  return {affectedRows};
}

httpRouter.privateRoutesDeprecated['/laager/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;

  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const unLaager = reqBody.unLaager;
  if (!unLaager) {
    throw Error('Missing "unLaager"').HttpStatus(400);
  }
  const laagerInfo = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: unLaager });
  if (!laagerInfo) throw Error('Device not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, laagerInfo.CLIENT_ID, laagerInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: laagerInfo.LAAGER_DEVICE_ID, referenceType: 'DMAS' }, authHeader);

  logger.info("Successfully uploaded data");
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/laager/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const LAAGER_CODE = reqParams.unLaager;
  if (!LAAGER_CODE) throw Error('Invalid parameters! Missing unLaager').HttpStatus(400);
  const laagerFreshInf = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: LAAGER_CODE });
  const perms = await getPermissionsOnUnit(session, laagerFreshInf.CLIENT_ID, laagerFreshInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: laagerFreshInf.LAAGER_DEVICE_ID,
    referenceType: 'LAAGER' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/laager/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.unLaager) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400);
  }
  const laagerInfo = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.unLaager });
  if (!laagerInfo) throw Error('Device not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, laagerInfo.CLIENT_ID, laagerInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: laagerInfo.LAAGER_DEVICE_ID,
    referenceType: 'LAAGER' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows;
}

httpRouter.privateRoutesDeprecated['/devgroups/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const machineId = Number(reqBody.groupId);
  if (!machineId) {
    throw Error('Missing "groupId"').HttpStatus(400)
  }
  const machineInfo = await sqldb.MACHINES.getBasicInfo({ MACHINE_ID: machineId });
  if (!machineInfo) throw Error('Group not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: machineId, referenceType: 'MACHINES' }, authHeader);

  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/devgroups/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const machineId = Number(reqParams.groupId);
  if (!machineId) throw Error('Invalid parameters! Missing groupId').HttpStatus(400)
  const machineInfo = await sqldb.MACHINES.getBasicInfo({ MACHINE_ID: machineId });
  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: machineId,
    referenceType: 'MACHINES' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/devgroups/delete-image'] = async function (reqParams, session, {req, res}) {
  const machineId = Number(reqParams.groupId);
  if ((!machineId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const machineInfo = await sqldb.MACHINES.getBasicInfo({ MACHINE_ID: machineId });
  if (!machineInfo) throw Error('Asset not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: machineId,
    referenceType: 'MACHINES' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function machinesDeleteImage(filename: string, groupId: number, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.devGroupsImagesBucketPath)

  const { affectedRows } = await sqldb.MACHINE_IMAGES.w_deleteRow({
    MACHINE_ID: groupId,
    FILENAME: filename.substr(filePathIndex + servConfig.filesBucket.devGroupsImagesBucketPath.length)
  }, sessionUser);
  return { affectedRows };
}

httpRouter.privateRoutesDeprecated['/dma/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const dmaId = reqBody.devId;
  if (!dmaId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const dmaInfo = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: dmaId });
  if (!dmaInfo) throw Error('DRI not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dmaInfo.CLIENT_ID, dmaInfo.UNIT_ID);
  if (!perms.canManageDevs && !session.permissions.isInstaller) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: dmaInfo.DEVICE_ID, referenceType: 'DMAS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/dma/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const dmaId = reqParams.devId
  if (!dmaId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dmaInf = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: dmaId });
  const perms = await getPermissionsOnUnit(session, dmaInf.CLIENT_ID, dmaInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dmaInf.DEVICE_ID,
    referenceType: 'DMAS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

export async function dmaDeleteImages(filename: string, devId: string, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.imagesBucketPath)
  const qPars2 = {
    DEVICE_CODE: devId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.imagesBucketPath.length)
  }

  const { affectedRows } = await sqldb.DMAS_IMAGES.w_deleteRow(qPars2, sessionUser)
  return {affectedRows};
}


httpRouter.privateRoutesDeprecated['/dma/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const dmaInfo = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: reqParams.devId });
  if (!dmaInfo) throw Error('DAM not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dmaInfo.CLIENT_ID, dmaInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dmaInfo.DEVICE_ID,
    referenceType: 'DMAS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function uploadDacImage(image: Express.Multer.File, dacId: string, authToken: string) {
  const dacInfo = await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: dacId });
  
  if (!dacInfo) throw Error('Device not found').HttpStatus(400);

  const params = {
    referenceId: dacInfo.DEVICE_ID,
    referenceType: 'DACS',
    clientId: dacInfo.CLIENT_ID,
    unitId: dacInfo.UNIT_ID,
    file: image
  }
  await apiUploadService['POST /upload-service/upload-image'](
      params,
      authToken
    );

  logger.info("Successfully uploaded data");
}

export async function uploadDutImage(image: Buffer, devId: string, session: { user: any }, reqParams: any) {
  const devIdNorm = devId.normalize("NFD").toLowerCase().replace(/[ -]+/g, '-').replace(/[^-^\d^\u0061-\u007A]/g, "")
  const filename = devIdNorm + '-' + uuid.v4() + '.jpg'

  const pres = await uploadDevImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })
  const dutInfo = await sqldb.DUTS.getDevExtraInfo({DEV_ID: devId});
  const pars = {
    DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID,
    DAT_UPLOAD: new Date().toISOString().substring(0, 19),
    FILENAME: filename
  }
  await sqldb.DUTS_DEVICES_IMAGES.w_insert(pars, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function uploadMachineImage(image: Buffer, groupId: number, session: { user: any }, reqParams: any) {
  const filename = groupId.toString() + '-' + uuid.v4() + '.jpg'

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await uploadMachinesImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  await sqldb.MACHINE_IMAGES.w_insert({
    MACHINE_ID: groupId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function newUploadAssetImage(image: Buffer, ASSET_ID: number, session: { user: any }, reqParams: any) {
  const filename = `ASSET_${ASSET_ID}-${uuid.v4()}.jpg`

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await uploadAssetImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  await sqldb.ASSET_IMAGES.w_insert({
    ASSET_ID,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function uploadDamImage(image: Buffer, damId: string, session: { user: any }, reqParams: any) {
  const devIdNorm = damId.normalize("NFD").toLowerCase().replace(/[ -]+/g, '-').replace(/[^-^\d^\u0061-\u007A]/g, "")
  const filename = devIdNorm + '-' + uuid.v4() + '.jpg'

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await uploadDevImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  const devInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: damId});
  const pars = {
    DAM_DEVICE_ID: devInfo.DAM_DEVICE_ID,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }
  await sqldb.DAMS_DEVICES_IMAGES.w_insert(pars, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function uploadDriImage(image: Buffer, driId: string, session: { user: any }, reqParams: any) {
  const devIdNorm = driId.normalize("NFD").toLowerCase().replace(/[ -]+/g, '-').replace(/[^-^\d^\u0061-\u007A]/g, "")
  const filename = devIdNorm + '-' + uuid.v4() + '.jpg'

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await uploadDevImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  const deviceInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: driId});
  const pars = {
    DRI_DEVICE_ID: deviceInfo.DRI_DEVICE_ID,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }
  await sqldb.DRIS_DEVICES_IMAGES.w_insert(pars, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function uploadDmaImage(image: Buffer, dmaId: string, session: { user: any }, reqParams: any) {
  const devIdNorm = dmaId.normalize("NFD").toLowerCase().replace(/[ -]+/g, '-').replace(/[^-^\d^\u0061-\u007A]/g, "")
  const filename = devIdNorm + '-' + uuid.v4() + '.jpg'

  const pres = await uploadDevImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  });

  const pars = {
    DEVICE_CODE: dmaId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }
  await sqldb.DMAS_IMAGES.w_insert(pars, session.user);
  logger.info("Successfully uploaded data", pres);
}

httpRouter.privateRoutesDeprecated['/dal/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const dalId = reqParams.devId
  if (!dalId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dalInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: dalId })
  const perms = await getPermissionsOnUnit(session, dalInfo.CLIENT_ID, dalInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dalInfo.DEVICE_ID,
    referenceType: 'DALS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/dal/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const dalId = reqBody.devId;
  if (!dalId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const dalInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: dalId });
  if (!dalInfo) throw Error('DAL not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dalInfo.CLIENT_ID, dalInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  
  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: dalInfo.DEVICE_ID, referenceType: 'DALS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

export async function uploadDmtImageS3(image: Buffer, dmtId: number, session: { user: any }, reqParams: any) {
  const filename = dmtId.toString() + '-' + uuid.v4() + '.jpg'

  const pres = await uploadDmtImageConnectS3(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })
  await sqldb.DMT_IMAGES.w_insert({
    DMT_ID: dmtId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }, session.user);
  logger.info("Successfully uploaded data", pres);
}

httpRouter.privateRoutesDeprecated['/dal/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const dalInfo = await sqldb.DALS.getDalByCode({ DEVICE_CODE: reqParams.devId });
  if (!dalInfo) throw Error('DAL not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dalInfo.CLIENT_ID, dalInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dalInfo.DEVICE_ID,
    referenceType: 'DALS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutesDeprecated['/illumination/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const illuminationId = Number(reqBody.illuminationId);
  if (!illuminationId) {
    throw Error('Missing "illuminationId"').HttpStatus(400)
  }
  const illumInfo = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: illuminationId });
  if (!illumInfo) throw Error('Illumination not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, illumInfo.CLIENT_ID, illumInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: illuminationId, referenceType: 'ILLUMINATIONS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

export async function uploadIllumImage(image: Buffer, illuminationId: number, session: { user: any }, reqParams: any) {
  const filename = illuminationId.toString() + '-' + uuid.v4() + '.jpg'
  const pres = await uploadIlluminationImageS3(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  await sqldb.ILLUMINATION_IMAGES.w_insert({
    ILLUMINATION_ID: illuminationId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }, session.user);
  logger.info("Successfully uploaded data", pres);
}

httpRouter.privateRoutesDeprecated['/illumination/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const illuminationId = Number(reqParams.illuminationId);
  if (!illuminationId) throw Error('Invalid parameters! Missing illuminationId').HttpStatus(400)
  const illumInfo = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: illuminationId });
  const perms = await getPermissionsOnUnit(session, illumInfo.CLIENT_ID, illumInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: illuminationId,
    referenceType: 'ILLUMINATIONS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/illumination/delete-image'] = async function (reqParams, session, {req, res}) {
  const illuminationId = Number(reqParams.illuminationId);
  if ((!illuminationId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const illumInfo = await sqldb.ILLUMINATIONS.getIlluminationFullInfo({ ID: illuminationId });
  if (!illumInfo) throw Error('Asset not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, illumInfo.CLIENT_ID, illumInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: illuminationId,
    referenceType: 'ILLUMINATIONS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

export async function uploadNobreakImageS3(image: Buffer, nobreakId: number, session: { user: any }, reqParams: any) {
  const filename = nobreakId.toString() + '-' + uuid.v4() + '.jpg'

  const pres = await uploadNobreakImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  await sqldb.NOBREAK_IMAGES.w_insert({
    NOBREAK_ID: nobreakId,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }, session.user);
  logger.info("Successfully uploaded data", pres);
}

export async function uploadDmtImages(image: Buffer, dmtCode: string, session: { user: any }, reqParams: any) {
  const filename = dmtCode.toString() + '-' + uuid.v4() + '.jpg'

  const pres = await uploadDmtImageConnectS3(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  });

  const dmtId = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: dmtCode });
  if (dmtId) {
    const pars = {
      DMT_ID: dmtId.ID,
      DAT_UPLOAD: Math.round(Date.now() / 1000),
      FILENAME: filename
    }
    await sqldb.DMT_IMAGES.w_insert(pars, session.user);
    logger.info("Successfully uploaded data", pres);
  }
}

export async function uploadDalImage(image: Buffer, dalCode: string, session: { user: any }, reqParams: any) {
  const devIdNorm = dalCode.normalize("NFD").toLowerCase().replace(/[ -]+/g, '-').replace(/[^-^\d^\u0061-\u007A]/g, "")
  const filename = devIdNorm + '-' + uuid.v4() + '.jpg'

  const pres = await uploadDalImages3(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  const dalId = await sqldb.DALS.getDalByCode({ DEVICE_CODE: dalCode });
  if (dalId) {
    const pars = {
      DAL_ID: dalId.ID,
      DAT_UPLOAD: Math.round(Date.now() / 1000),
      FILENAME: filename
    }
    await sqldb.DAL_IMAGES.w_insert(pars, session.user);
    logger.info("Successfully uploaded data", pres);
  }
}


export async function dmtDeleteImages(filename: string, devId: string, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.dmtImagesBucketPath)
  const dmtId = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: devId });
  if (dmtId) {
    const qPars2 = {
      DMT_ID: dmtId.ID,
      FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.dmtImagesBucketPath.length)
    }
  
    const { affectedRows } = await sqldb.DMT_IMAGES.w_deleteRow(qPars2, sessionUser)
    return {affectedRows};
  }
  return {affectedRows: 0};
}

export async function illuminationDeleteImages(filename: string, devId: number, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.illuminationsImagesBucketPath)
  const qPars2 = {
    ILLUMINATION_ID: devId,
    FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.illuminationsImagesBucketPath.length)
  }
  const { affectedRows } = await sqldb.ILLUMINATION_IMAGES.w_deleteRow(qPars2, sessionUser)
  return {affectedRows};
}

export async function dalDeleteImages(filename: string, devId: string, sessionUser: string){
  const filePathIndex = filename.lastIndexOf(servConfig.filesBucket.dalImagesBucketPath)
  const dalId = await sqldb.DALS.getIdByCode({ DEVICE_CODE: devId });

  if (dalId) {
    const qPars2 = {
      DAL_ID: dalId.ID,
      FILENAME: filename.substring(filePathIndex + servConfig.filesBucket.dalImagesBucketPath.length)
    }
  
    const { affectedRows } = await sqldb.DAL_IMAGES.w_deleteRow(qPars2, sessionUser)
    return {affectedRows};
  }
  return {affectedRows: 0};
}

export async function uploadIlluminationImage(image: Buffer, illumination_id: number, session: { user: any }, reqParams: any) {
  const filename = illumination_id + '-' + uuid.v4() + '.jpg'

  const pres = await uploadIlluminationImageS3(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error uploading data').HttpStatus(500)
  })
  const pars = {
    ILLUMINATION_ID: illumination_id,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    FILENAME: filename
  }
  await sqldb.ILLUMINATION_IMAGES.w_insert(pars, session.user);
  logger.info("Successfully uploaded data", pres);
}

httpRouter.privateRoutesDeprecated['/dmt/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const dmtId = reqParams.devId
  if (!dmtId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  const dmtInfo = await sqldb.DMTS.getDmtByCode({ DEVICE_CODE: dmtId })
  const perms = await getPermissionsOnUnit(session, dmtInfo.CLIENT_ID, dmtInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dmtInfo.DEVICE_ID,
    referenceType: 'DMTS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/dmt/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const dmtId = reqBody.devId;
  if (!dmtId) {
    throw Error('Missing "devId"').HttpStatus(400)
  }
  const dmtInfo = await sqldb.DMTS.getDmtByCode({ DEVICE_CODE: dmtId });
  if (!dmtInfo) throw Error('DMT not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dmtInfo.CLIENT_ID, dmtInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  
  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: dmtInfo.DEVICE_ID, referenceType: 'DMTS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

httpRouter.privateRoutesDeprecated['/dmt/delete-image'] = async function (reqParams, session, {req, res}) {
  if ((!reqParams.devId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const dmtInfo = await sqldb.DMTS.getDmtByCode({ DEVICE_CODE: reqParams.devId });
  if (!dmtInfo) throw Error('DMT not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dmtInfo.CLIENT_ID, dmtInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: dmtInfo.DEVICE_ID,
    referenceType: 'DMTS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}


httpRouter.privateRoutesDeprecated['/nobreak/get-images-list'] = async function (reqParams, session, {req, res}) {
  // # Verifica permissão
  const nobreakId = Number(reqParams.nobreakId);
  if (!nobreakId) throw Error('Invalid parameters! Missing nobreakId').HttpStatus(400)
  const nobreakInfo = await sqldb.NOBREAKS.getNobreakFullInfo({ ID: nobreakId });
  const perms = await getPermissionsOnUnit(session, nobreakInfo.CLIENT_ID, nobreakInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: nobreakId,
    referenceType: 'NOBREAKS' as ReferenceType,
  }

  const list = await getImageListFromUploadService(params, authHeader);

  return { list }
}

httpRouter.privateRoutesDeprecated['/nobreak/delete-image'] = async function (reqParams, session, {req, res}) {
  const nobreakId = Number(reqParams.nobreakId);
  if ((!nobreakId) || (!reqParams.filename)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const nobreakInfo = await sqldb.NOBREAKS.getNobreakFullInfo({ ID: nobreakId });
  if (!nobreakInfo) throw Error('Asset not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, nobreakInfo.CLIENT_ID, nobreakInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  const params = {
    referenceId: nobreakId,
    referenceType: 'NOBREAKS' as ReferenceType,
    filename: reqParams.filename
  }
  const { affectedRows } = await deleteImageFromUploadService(params, authHeader);

  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutesDeprecated['/nobreak/upload-image'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody = req.body;
  
  if (!file) {
    throw Error('Missing "photo"').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }

  const nobreakId = Number(reqBody.nobreakId);
  if (!nobreakId) {
    throw Error('Missing "nobreakId"').HttpStatus(400)
  }
  const nobreakInfo = await sqldb.NOBREAKS.getNobreakFullInfo({ ID: nobreakId });
  if (!nobreakInfo) throw Error('Nobreak not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, nobreakInfo.CLIENT_ID, nobreakInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403);

  const authHeader = req.get('Authorization');
  await sendImageToUploadService(file, { referenceId: nobreakId, referenceType: 'NOBREAKS' }, authHeader);
  res.send('Successfully uploaded!');

  return res;
}

export async function sendImageToUploadService(image: Express.Multer.File ,qParams: {referenceId: number, referenceType: ReferenceType}, authHeader: string) {
  const params = {
    referenceId: qParams.referenceId,
    referenceType: qParams.referenceType,
    file: image
  }
  await apiUploadService['POST /upload-service/upload-image'](
      params,
      authHeader
    );
}

export async function getImageListFromUploadService(params: {referenceId: number, referenceType: ReferenceType}, authHeader: string) {

  const { list } = await apiUploadService['POST /upload-service/get-images'](
    params,
    authHeader
  );

  return list;
}

export async function deleteImageFromUploadService(params: {referenceId: number, referenceType: ReferenceType, filename: string}, authHeader: string) {

  const affectedRows = await apiUploadService['POST /upload-service/delete-image'](
    params,
    authHeader
  );

  return { affectedRows };
}
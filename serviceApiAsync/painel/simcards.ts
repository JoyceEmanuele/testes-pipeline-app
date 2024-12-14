import * as httpRouter from '../apiServer/httpRouter';
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger';
import * as linkSolutionsAPI from '../extServices/linkSolutionsAPI';
import * as metaTelecom from '../extServices/metaTelecom';
import { getUserGlobalPermissions, getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl';
import { SessionData } from '../../srcCommon/types';
import * as uuid from 'uuid';
import * as s3Helper from '../../srcCommon/s3/connectS3';
import servConfig from '../../configfile';
import { getUploadedPhoto, getUploadedPhotoAsFile } from '../apiServer/getMultiparFiles';
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes';
import { getListSimsKiteVivo, resetNetworkVivo } from '../extServices/KiteApi';
import { sendImageToUploadService, deleteImageFromUploadService } from '../devsPictures';
import { ReferenceType } from '../../srcCommon/types/backendTypes';

export function verifyPermisionsSimCard (session: SessionData) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllSimcards) { /* OK */ }
  else throw Error('Permission denied').HttpStatus(403);
}

httpRouter.privateRoutesDeprecated['/sims'] = async function (reqParams, session) {
  verifyPermisionsSimCard(session);

  const [
    listDbSims,
    listTnsSims,
  ] = await Promise.all([
    sqldb.SIMCARDS.getList({}),
    linkSolutionsAPI.getLsmSimsList(),
  ]);

  return listTnsSims.map((sim) => {
    const dbInfo = listDbSims.find(x => x.ID === sim.id) || undefined;
    return Object.assign(sim, {
      client: dbInfo && dbInfo.CLIENT,
      clientName: dbInfo && dbInfo.CLIENT_NAME,
      unit: dbInfo && dbInfo.UNIT,
      unitName: dbInfo && dbInfo.UNIT_NAME,
      accessPoint: dbInfo && dbInfo.ACCESSPOINT,
      modem: dbInfo && dbInfo.MODEM,
      accessPointMAC: dbInfo && dbInfo.MACACCESSPOINT,
      repeaterMAC: dbInfo && dbInfo.MACREPEATER,
    });
  });
}


export const getValueSolutions = (reqParams: httpRouter.ApiParams['/sims-v2']) => {
  return {
    kite: reqParams.solution === 'todos' || !reqParams.solution || reqParams.solution === 'kite',
    tns: reqParams.solution === 'todos' || !reqParams.solution || reqParams.solution === 'tns',
    meta: reqParams.solution === 'todos' || !reqParams.solution || reqParams.solution === 'meta',
  }
}

export const resolvePromiseAllApiSims = async (solutions: {
  kite: boolean;
  tns: boolean;
  meta: boolean;
}) => {
  const [
    listDbSims,
    listTnsSims,
    listMetaSims,
    listVivoSims,
  ] = await Promise.all([
    sqldb.SIMCARDS.getList({}),
    async function () {
      try {
        if (solutions.tns) return await linkSolutionsAPI.getLsmSimsList();
        return null;
      } catch(err) {
        logger.error(err);
        return null;
      }
    }(),
    async function () {
      try {
        if (solutions.meta) return await metaTelecom.getalluserservices();
        return null;
      } catch(err) {
        logger.error(err);
        return null;
      }
    }(),
    async function () {
      try {
        if (solutions.kite) return await getListSimsKiteVivo();
        return null;
      } catch(err) {
        logger.error(err);
        return null;
      }
    }(),
  ]);
  return { listDbSims, listTnsSims, listMetaSims, listVivoSims }
}

/**
 * @swagger
 * /sims-v2:
 *   post:
 *     summary: Retorna lista de simcards de api externas
 *     description: Retorna lista de simcards de api externas
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             solution:
 *               type: string
 *               description: tipo de solução "kite" | "tns" | "meta" | "todos"
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Lista de simcards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

export const simV2Route = async (reqParams: httpRouter.ApiParams['/sims-v2'], session: SessionData) => {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllSimcards) {
    throw Error('Not allowed').HttpStatus(403).DebugInfo({session})
  }

  const solutions = getValueSolutions(reqParams);
  const {
    listDbSims,
    listTnsSims,
    listMetaSims,
    listVivoSims,
   } = await resolvePromiseAllApiSims(solutions);

  return {
    tns: listTnsSims?.map((sim) => {
      const dbInfo = listDbSims.find(x => x.ICCID === sim.iccid) || undefined;
      return Object.assign(sim, {
        client: dbInfo?.CLIENT,
        clientName: dbInfo?.CLIENT_NAME,
        unit: dbInfo?.UNIT,
        unitName: dbInfo?.UNIT_NAME,
        accessPoint: dbInfo?.ACCESSPOINT,
        modem: dbInfo?.MODEM,
        accessPointMAC: dbInfo?.MACACCESSPOINT,
        repeaterMAC: dbInfo?.MACREPEATER,
        associationDate: dbInfo?.ASSOCIATION_DATE,
        cityId: dbInfo?.CITY_ID,
        stateId: dbInfo?.STATE_ID
      });
    }),
    meta: listMetaSims?.service?.map((sim) => {
      const dbInfo = listDbSims.find(x => x.ICCID === sim.iccid) || undefined;
      return Object.assign(sim, {
        client: dbInfo?.CLIENT,
        clientName: dbInfo?.CLIENT_NAME,
        unit: dbInfo?.UNIT,
        unitName: dbInfo?.UNIT_NAME,
        accessPoint: dbInfo?.ACCESSPOINT,
        modem: dbInfo?.MODEM,
        accessPointMAC: dbInfo?.MACACCESSPOINT,
        repeaterMAC: dbInfo?.MACREPEATER,
        associationDate: dbInfo?.ASSOCIATION_DATE,
        cityId: dbInfo?.CITY_ID,
        stateId: dbInfo?.STATE_ID
      });
    }),
    vivo: listVivoSims?.map((sim) => {
      const dbInfo = listDbSims.find(x => x.ICCID === sim.icc) || undefined;
      return Object.assign(sim, {
        iccid: sim.icc,
        client: dbInfo?.CLIENT,
        clientName: dbInfo?.CLIENT_NAME,
        unit: dbInfo?.UNIT,
        unitName: dbInfo?.UNIT_NAME,
        accessPoint: dbInfo?.ACCESSPOINT,
        modem: dbInfo?.MODEM,
        accessPointMAC: dbInfo?.MACACCESSPOINT,
        repeaterMAC: dbInfo?.MACREPEATER,
        associationDate: dbInfo?.ASSOCIATION_DATE,
        cityId: dbInfo?.CITY_ID,
        stateId: dbInfo?.STATE_ID
      });
    })
  };
}

httpRouter.privateRoutes['/sims-v2'] = simV2Route;

/**
 * @swagger
 * /sims/set-sim-info:
 *   post:
 *     summary: Adiciona ou Edita um simcard
 *     description: Adiciona ou Edita um simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             ICCID:
 *               type: string
 *               description: id do simcard
 *               default: ""
 *               required: true
 *             CLIENT:
 *               type: number
 *               description: Cliente Id
 *               default: ""
 *               required: false
 *             UNIT:
 *               type: number
 *               description: Unidade id
 *               default: ""
 *               required: false
 *             ACCESSPOINT:
 *               type: string
 *               description: Ponto de Acesso
 *               default: ""
 *               required: false
 *             OLDICCID:
 *               type: string
 *               description: antigo icc id ( caso va trocar ele )
 *               default: ""
 *               required: false
 *             MODEM:
 *               type: string
 *               description: Modem
 *               default: ""
 *               required: false
 *             MACACCESSPOINT:
 *               type: string
 *               description: MAC Ponto de Acesso
 *               default: ""
 *               required: false
 *             MACREPEATER:
 *               type: string
 *               description: Repetidor MAC
 *               default: ""
 *               required: false
 *             ASSOCIATION_DATE:
 *               type: Date
 *               description: data de associação
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Detalhes do SIMCARD atualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

export const setSimInfoRoute = async (reqParams: httpRouter.ApiParams['/sims/set-sim-info'], session: SessionData) => {
  verifyPermisionsSimCard(session);
  if (!reqParams.ICCID) throw Error('There was an error!\nInvalid properties. Missing SIM ICCID.').HttpStatus(400);
  const ICCID = reqParams.ICCID;

  try {
    if (reqParams.OLDICCID && reqParams.OLDICCID !== reqParams.ICCID) {
      await sqldb.SIMCARDS.w_update({
        ICCID: reqParams.ICCID,
        OLDICCID: reqParams.OLDICCID,
        CLIENT: reqParams.CLIENT,
        UNIT: reqParams.UNIT,
        ACCESSPOINT: reqParams.ACCESSPOINT,
        MODEM: reqParams.MODEM,
        MACACCESSPOINT: reqParams.MACACCESSPOINT,
        MACREPEATER: reqParams.MACREPEATER,
        ASSOCIATION_DATE: new Date(reqParams.ASSOCIATION_DATE) || new Date(Date.now())
      }, session.user);
    } else {
      await sqldb.SIMCARDS.w_insertOrUpdate({
        ICCID: reqParams.ICCID,
        CLIENT: reqParams.CLIENT,
        UNIT: reqParams.UNIT,
        ACCESSPOINT: reqParams.ACCESSPOINT,
        MODEM: reqParams.MODEM,
        MACACCESSPOINT: reqParams.MACACCESSPOINT,
        MACREPEATER: reqParams.MACREPEATER,
        ASSOCIATION_DATE: new Date(reqParams.ASSOCIATION_DATE) || new Date(Date.now())
      }, session.user);
    }
  } catch (error) {
    logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Could not save').HttpStatus(500);
  }

  return sqldb.SIMCARDS.getDetails({ ICCID });
}

httpRouter.privateRoutes['/sims/set-sim-info'] = setSimInfoRoute;

/**
 * @swagger
 * /sims/upload-sim-photo:
 *   post:
 *     summary: Adiciona foto no simcard
 *     description: Adiciona foto no simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             iccid:
 *               type: string
 *               description: id do simcard
 *               default: ""
 *               required: true
 *       - name: File
 *         in: formData
 *         type: file
 *         description: Arquivo upado
 *     responses:
 *       200:
 *         description: retorna oK
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

const simUploadSimPhotoRoute = async (_reqParams: httpRouter.ApiParams['/sims/upload-sim-photo'], session: SessionData, { req, res }: ExtraRouteParams) => {
  const file = await getUploadedPhotoAsFile(req, res);
  const reqBody: typeof _reqParams = req.body;
  if (!file) {
    throw Error('Missing photo').HttpStatus(400).DebugInfo({ reqBody, file, files: req.files });
  }
  if (!reqBody.iccid) {
    throw Error('Missing iccid').HttpStatus(400);
  }
  verifyPermisionsSimCard(session);
  try {
    const simCardInfo = await sqldb.SIMCARDS.getDetails({ICCID: reqBody.iccid});
    const authHeader = req.get('Authorization');
    await sendImageToUploadService(file, { referenceId: simCardInfo.ID, referenceType: 'SIMCARDS' }, authHeader);
  } catch (err) {
    logger.error("Erro upando sim photos", reqBody, session.user);
    throw Error('Erro upando sim photos').HttpStatus(500);
  }
  res.send('Successfully uploaded!');

  return 'OK';
}

httpRouter.privateRoutesDeprecated['/sims/upload-sim-photo'] = simUploadSimPhotoRoute;

/**
 * @swagger
 * /sims/delete-sim-photo:
 *   post:
 *     summary: Deleta foto do simcard
 *     description: Deleta foto do simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             deletePhotos:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    iccid:
 *                      type: string
 *                      description: id do simcard
 *                      default: ""
 *                      required: true
 *                    filename:
 *                      type: string
 *                      description: filename do arquivo
 *                      default: ""
 *                      required: true
 *     responses:
 *       200:
 *         description: retorna OK se a foto foi apagada
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

const simDeletePhotoRoute = async (reqParams: httpRouter.ApiParams['/sims/delete-sim-photo'], session: SessionData, {req, res}: ExtraRouteParams) => {
  verifyPermisionsSimCard (session);
  try {
    if (!reqParams.deletePhotos.length) throw Error('Missing delete photos').HttpStatus(400);
    for (const item of reqParams.deletePhotos) {
      const simcard = await sqldb.SIMCARDS.getDetails({ICCID: item.iccid});
      const authHeader = req.get('Authorization');
      const params = {
        referenceId: simcard.ID,
        referenceType: 'SIMCARDS' as ReferenceType,
        filename: item.filename
      }
      const { affectedRows } = await deleteImageFromUploadService(params, authHeader);
    }
  } catch (err) {
    logger.error("Erro deletando sim photos", reqParams, session.user);
    throw Error('Erro deletando sim photos').HttpStatus(500);
  }
  return 'OK';
}

httpRouter.privateRoutesDeprecated['/sims/delete-sim-photo']  = simDeletePhotoRoute;

/**
 * @swagger
 * /sims/get-unit-sims:
 *   post:
 *     summary: Adiciona foto no simcard
 *     description: Adiciona foto no simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             unitId:
 *               type: number
 *               description: id do simcard
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Detalhes do SIMCARD atualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

export const getUnitSimsRoute = async (reqParams: httpRouter.ApiParams['/sims/get-unit-sims'], session: SessionData) => {
  verifyPermisionsSimCard(session);
  if (!reqParams.unitId) throw Error('There was an error!\nInvalid properties. Missing SIM ICCID.').HttpStatus(400);

  try {
    const info = await sqldb.SIMCARDS.getList({ unitId: reqParams.unitId });
    if (!info) {
      throw Error('ICCID não encontrado');
    }
    const listReturnWithImages: {
      ID: number
      ICCID: string
      CLIENT?: number
      UNIT?: number
      ACCESSPOINT?: string
      MODEM?: string
      MACACCESSPOINT?: string
      MACREPEATER?: string
      ASSOCIATION_DATE?: string|null
      IMAGES?: { name: string, url: string }[]
    }[] = [];
    for (const simcard of info) {
      const images = await sqldb.SIMCARDS_IMAGES.getList({ SIMCARD_ID: simcard.ICCID });
      const list = [] as { name: string, url: string }[];
      for(const row of images) {
        const key = `${servConfig.filesBucketPrivate.simcardsBucketPath}` + row.FILENAME
        const url = await s3Helper.preSigningUrl(servConfig.filesBucketPrivate, key)
        list.push({ url, name: row.FILENAME });
      }
      listReturnWithImages.push({...simcard, IMAGES: list });
    }
    return listReturnWithImages;
  } catch (error) {
    logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Erro ao buscar lista de SIMCARDS').HttpStatus(500);
  }
}

httpRouter.privateRoutes['/sims/get-unit-sims'] = getUnitSimsRoute;

/**
 * @swagger
 * /sims/delete-sim:
 *   post:
 *     summary: Deleta simcard
 *     description: Deleta simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             ICCIDS:
 *               type: array
 *               items:
 *                  type: object
 *                  properties:
 *                    ICCID:
 *                      type: string
 *                      description: id do simcard
 *                      default: ""
 *                      required: true
 *                    OLDICCID:
 *                      type: string
 *                      description: antigo iccid
 *                      default: ""
 *                      required: true
 *     responses:
 *       200:
 *         description: retorna OK se foi apagado
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

export const deleteSimRoute = async (reqParams: httpRouter.ApiParams['/sims/delete-sim'], session: SessionData) => {
  verifyPermisionsSimCard(session);
  if (!reqParams.ICCIDS.length) throw Error('There was an error!\nInvalid properties. Missing SIM ICCID.').HttpStatus(400);

  try {
    for (const item of reqParams.ICCIDS) {
      if (item.OLDICCID && item.OLDICCID !== item.ICCID) {
        await sqldb.SIMCARDS.w_delete({ iccid: item.OLDICCID }, session.user);
      }
      await sqldb.SIMCARDS.w_delete({ iccid: item.ICCID }, session.user);
    }
  } catch (error) {
    logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Could not save').HttpStatus(500);
  }

  return 'OK';
}

httpRouter.privateRoutes['/sims/delete-sim'] = deleteSimRoute;

/**
 * @swagger
 * /sims/get-info-sim:
 *   post:
 *     summary: Retorna informações do simcard
 *     description: Retorna informações do simcard
 *     tags:
 *       - SIMCARDS
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações 
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             ICCID:
 *               type: string
 *               description: Id do simcard
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: info simcard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

export const getInfoSimRoute = async (reqParams: httpRouter.ApiParams['/sims/get-info-sim'], session: SessionData) => {
  verifyPermisionsSimCard(session);
  if (!reqParams.ICCID) throw Error('There was an error!\nInvalid properties. Missing SIM ICCID.').HttpStatus(400);

  try {
    const info = await sqldb.SIMCARDS.getDetails({ ICCID: reqParams.ICCID });
    if (!info) {
      throw Error('ICCID não encontrado');
    }
    return info;
  } catch (error) {
    logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Could not save').HttpStatus(500);
  }
}

httpRouter.privateRoutes['/sims/get-info-sim'] = getInfoSimRoute;

export const sendResetRequestRoute = async (reqParams: httpRouter.ApiParams['/sims/send-reset-request'], session: SessionData) => {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllSimcards) {
    throw Error('Permission denied').HttpStatus(403);
  }
  let respostas: { iccid: string }[] = [];
  if (!reqParams.iccid) throw Error('Faltou informar o iccid.').HttpStatus(400);
  if (reqParams.type === 'TNS') {
    const resp = await linkSolutionsAPI.sendResetRequest(reqParams.iccid);
    respostas = respostas.concat(...resp.map((item) => { return { iccid: item.iccid }}));
  }
  else if (reqParams.type === 'VIVO') {
    const resp = await resetNetworkVivo(reqParams.iccid, session);
    if (resp) {
      respostas.push({ iccid: reqParams.iccid });
    }
  }
 
  return { respostas };
}

httpRouter.privateRoutes['/sims/send-reset-request'] = sendResetRequestRoute;

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.SIMCARDS.w_removeClient({ clientId: qPars.CLIENT_ID }, userId);
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.SIMCARDS.w_removeUnit({ unitId: qPars.UNIT_ID }, userId);
}

export async function uploadSimcards(image: Buffer, simId: string, userId: SessionData, reqParams: any) {
  const filename = simId + '-' + uuid.v4() + `.jpg`;

  // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
  const pres = await s3Helper.uploadSimcardImage(filename, image)
  .catch((perr) => {
    logger.error(`Error uploading data (S3): ${perr} - user: ${userId} - ${reqParams}`);
    throw Error('Error uploading data').HttpStatus(500)
  })

  await sqldb.SIMCARDS_IMAGES.w_insert({
    FILENAME: filename,
    DAT_UPLOAD: Math.round(Date.now() / 1000),
    SIMCARD_ID: simId,
  }, userId.user);
  logger.info("Successfully uploaded data", pres);

  return filename;
}

httpRouter.privateRoutes['/simcards/get-client-unit'] = async function (reqParams, session) {
  const simcardInfo = await sqldb.SIMCARDS.getClientUnit({ID: reqParams.simcardId});

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS || session.permissions.isParceiroValidador) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits?.includes(simcardInfo.UNIT_ID) || allowedClients?.includes(simcardInfo.CLIENT_ID)) {
      // OK
    }
    else throw Error('Permission denied!').HttpStatus(403);
  }

  return {
    clientId: simcardInfo.CLIENT_ID,
    unitId: simcardInfo.UNIT_ID
  }
}
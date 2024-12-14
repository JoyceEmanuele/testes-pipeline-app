import * as fs from 'node:fs'
import * as path from 'node:path'
import * as pLimit from 'p-limit'
import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import configfile from '../../configfile'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import * as s3Helper from '../../srcCommon/s3/connectS3';
import { createNormNames, deleteDirectory, generateUnitReport } from '../../srcCommon/unitReport/healthReport'

const limitReportGen = pLimit(1)

httpRouter.privateRoutes['/get-private-unit-report-file'] = async function (reqParams, session , { res }) {
  if (!reqParams.key) { throw Error('Missing S3 key').HttpStatus(400) }
  // TODO: check if key is a valid path for a report

  try {
    const object = await s3Helper.getItemS3(configfile.filesBucketPrivate, reqParams.key);

    res.attachment(reqParams.key);
    const fileStream = object.Body;
    res.contentType("application/pdf");
    fileStream.pipe(res);
  }
  catch(err){
    logger.info('Error getting pdf' + err.toString());
    throw Error('Error getting pdf').HttpStatus(500);
  }

  return res;
}

httpRouter.privateRoutes['/dac/export-unit-report'] = async function (reqParams, session, { req, res }) {
  if (!reqParams.unitId) throw Error('unitId required').HttpStatus(400)
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({
    UNIT_ID: reqParams.unitId,
    CLIENT_ID: reqParams.clientId,
  });
  if (!unitInfo) { throw Error('unit not found').HttpStatus(400) }
  if (!reqParams.clientId) { throw Error('invalid clientId').HttpStatus(400) }
  if (!reqParams.unitId) { throw Error('invalid unitId').HttpStatus(400) }
  if (unitInfo.CLIENT_ID !== reqParams.clientId) { throw Error('invalid clientId').HttpStatus(400) }
  if (unitInfo.UNIT_ID !== reqParams.unitId) { throw Error('invalid unitId').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const languageUser = req.headers['accept-language']? req.headers['accept-language'] : 'pt';

  const pathClientReps = path.join(process.cwd(), 'reportgen', `Client_${unitInfo.CLIENT_ID}`)
  const [normName] = createNormNames([unitInfo]);
  const fileNameNoExt = `Unidade ${normName} - (manual)`;
  const pathUnitRepNoExt = path.join(pathClientReps, fileNameNoExt);

  if (fs.existsSync(pathClientReps)) {
    await deleteDirectory(pathClientReps)
  }
  logger.info(`DBG371 pendingCount = ${limitReportGen.pendingCount}`);
  await limitReportGen(async () => {
    const outInfo = await generateUnitReport({
      unitId: unitInfo.UNIT_ID,
      clientId: unitInfo.CLIENT_ID,
      pathUnitRepNoExt,
      pathClientReps,
      last7days: true,
      language: languageUser
    }, session.permissions.isAdminSistema ? (reqParams as any).debugTemplate : undefined);
    if (!outInfo) {
      throw Error('No DACs found!').HttpStatus(400)
    }
    if (outInfo.CLIENT_ID !== reqParams.clientId) { throw Error('invalid clientId').HttpStatus(400) }
    if (outInfo.UNIT_ID !== reqParams.unitId) { throw Error('invalid unitId').HttpStatus(400) }
    const normalized = outInfo.UNIT_NAME.normalize('NFD').replace(/[^\u0020-\u007A]/g, '').replace(/[\/\\\:\*\>\<\?]/g, '')
    res.append('Access-Control-Expose-Headers', 'content-disposition, filename')
    res.append('filename', `Unidade ${normalized} - ${outInfo.today}.pdf`)
    res.status(200).download(`${pathUnitRepNoExt}.pdf`, `Unidade ${normalized} - ${outInfo.today}.pdf`)
  })
  return res;
}

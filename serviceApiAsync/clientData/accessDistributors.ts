import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import { addEnergyCredentials } from '../extServices/fourDocsApi';
import * as CryptoJS from 'crypto-js';
import servConfig from '../../configfile'

httpRouter.privateRoutes['/clients/add-access-distributor'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  if (reqParams.DISTRIBUTOR_ID) {
    if (!reqParams.LOGIN) throw Error('Missing energy parameter: LOGIN').HttpStatus(400)
    if (!reqParams.PASSWORD) throw Error('Missing energy parameter: PASSWORD').HttpStatus(400)

    const dateNow = new Date();
    const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
    const date = `${dateNow .getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)} ${zeroPad(dateNow.getUTCHours(), 2)}:${zeroPad(dateNow.getUTCMinutes(), 2)}:${zeroPad(dateNow.getUTCSeconds(), 2)}`
    const encrypted = CryptoJS.TripleDES.encrypt(reqParams.PASSWORD, servConfig.secretPassphraseTripleDES);
    try {
      await sqldb.ACCESS_DISTRIBUTORS.w_insert({
        UNIT_ID: reqParams.UNIT_ID,
        DISTRIBUTOR_ID: reqParams.DISTRIBUTOR_ID,
        ADDITIONAL_DISTRIBUTOR_INFO: reqParams.ADDITIONAL_DISTRIBUTOR_INFO,
        CONSUMER_UNIT: reqParams.CONSUMER_UNIT,
        LOGIN: reqParams.LOGIN,
        PASSWORD: encrypted.toString(),
        LOGIN_EXTRA: reqParams.LOGIN_EXTRA,
        STATUS:  "Não enviado",
        STATUS_UPDATED_DATE: date,
        ENCRYPTED_PASSWORD: true,
        }, session.user)
    }

    catch (err) {
      logger.error(`Error adding Access Distributor - msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      throw Error('Error adding Access Distributor').HttpStatus(400)
    }
  }
  await addEnergyCredentials(session);

  // return `UPDATED ` + affectedRows
  return httpRouter.privateRoutes['/clients/get-access-distributor-info']({ UNIT_ID: reqParams.UNIT_ID }, session);
}

httpRouter.privateRoutes['/clients/edit-access-distributor'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  if (reqParams.DISTRIBUTOR_ID) {
    if (!reqParams.LOGIN) throw Error('Missing energy parameter: LOGIN').HttpStatus(400)
    if (!reqParams.PASSWORD) throw Error('Missing energy parameter: PASSWORD').HttpStatus(400)

    const dateNow = new Date();
    const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
    const date = `${dateNow .getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)} ${zeroPad(dateNow.getUTCHours(), 2)}:${zeroPad(dateNow.getUTCMinutes(), 2)}:${zeroPad(dateNow.getUTCSeconds(), 2)}`
    const encrypted = CryptoJS.TripleDES.encrypt(reqParams.PASSWORD, servConfig.secretPassphraseTripleDES);
    try {
      await sqldb.ACCESS_DISTRIBUTORS.w_updateInfo({
        UNIT_ID: reqParams.UNIT_ID,
        DISTRIBUTOR_ID: reqParams.DISTRIBUTOR_ID,
        ADDITIONAL_DISTRIBUTOR_INFO: reqParams.ADDITIONAL_DISTRIBUTOR_INFO,
        CONSUMER_UNIT: reqParams.CONSUMER_UNIT,
        LOGIN: reqParams.LOGIN,
        PASSWORD: encrypted.toString(),
        LOGIN_EXTRA: reqParams.LOGIN_EXTRA,
        STATUS:  "Não enviado",
        STATUS_UPDATED_DATE: date
        }, session.user)
    }
    catch (err) {
      logger.error(`Error updating Access Distributor - msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      throw Error('Error updating Access Distributor').HttpStatus(400)
    }
  }

  await addEnergyCredentials(session);

  // return `UPDATED ` + affectedRows
  return httpRouter.privateRoutes['/clients/get-access-distributor-info']({ UNIT_ID: reqParams.UNIT_ID }, session);
}

httpRouter.privateRoutes['/clients/get-access-distributor-info'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing unitId.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.UNIT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const accessDistributor = sqldb.ACCESS_DISTRIBUTORS.getExtraInfo({UNIT_ID: unitInfo.UNIT_ID})

  return accessDistributor;
}

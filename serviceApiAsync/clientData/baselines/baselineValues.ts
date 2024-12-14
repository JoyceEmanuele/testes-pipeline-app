import * as httpRouter from '../../apiServer/httpRouter'
import sqldb from '../../../srcCommon/db'
import { logger } from '../../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../../srcCommon/helpers/permissionControl';
import { SessionData } from '../../../srcCommon/types';

httpRouter.privateRoutesDeprecated['/clients/add-baseline-values'] = async function (reqParams, session) {
  await checkBaselinevalueToSet(reqParams, session);
  return setBaselineValue(reqParams, session);
}

httpRouter.privateRoutesDeprecated['/clients/edit-baseline-values'] = async function (reqParams, session) {
  await checkBaselinevalueToSet(reqParams, session);
  return setBaselineValue(reqParams, session);
}

export async function setBaselineValuesRoute(reqParams:  Parameters<typeof httpRouter.privateRoutes['/clients/set-baseline-values']>[0], session: SessionData) {
  await checkBaselinevalueToSet(reqParams, session);
  return setBaselineValue(reqParams, session);
}

httpRouter.privateRoutes['/clients/set-baseline-values'] = setBaselineValuesRoute;

export async function getBaselineValues(reqParams: Parameters<typeof httpRouter.privateRoutes['/clients/get-baseline-values']>[0], session: SessionData) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  if (!reqParams.BASELINE_ID) { throw Error('Invalid properties. Missing BASELINE_ID.').HttpStatus(400) }

  const baselineInfo = await sqldb.BASELINES.getExtraInfo({ BASELINE_ID: reqParams.BASELINE_ID, UNIT_ID: reqParams.UNIT_ID });
  if (!baselineInfo) { throw Error('Baseline not found').HttpStatus(400); }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, baselineInfo.CLIENT_ID, baselineInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  return sqldb.BASELINE_VALUES.getUnitBaselineValues({ BASELINE_ID: baselineInfo.BASELINE_ID });
}

httpRouter.privateRoutes['/clients/get-baseline-values'] = getBaselineValues;

export const setBaselineValue = async (reqParams: Parameters<typeof httpRouter.privateRoutes['/clients/set-baseline-values']>[0], session: SessionData) => {
  const invalidMonth = reqParams.baselineValues.find(baselineValue => baselineValue.BASELINE_MONTH > 12 || baselineValue.BASELINE_MONTH <= 0);

  if (invalidMonth) {
    throw Error('Invalid Month').HttpStatus(403);
  }

  try {
    for (const baselineValue of reqParams.baselineValues) {
        const baseLine = await sqldb.BASELINE_VALUES.getUnitBaselineValueInfo({ BASELINE_ID: reqParams.BASELINE_ID, BASELINE_MONTH: baselineValue.BASELINE_MONTH })

        if (!baseLine){
            await sqldb.BASELINE_VALUES.w_insert({
                BASELINE_ID: reqParams.BASELINE_ID,
                BASELINE_MONTH: baselineValue.BASELINE_MONTH,
                BASELINE_PRICE: baselineValue.BASELINE_PRICE,
                BASELINE_KWH: baselineValue.BASELINE_KWH,
            }, session.user);
        }
        else{
            await sqldb.BASELINE_VALUES.w_updateInfo({
                BASELINE_VALUE_ID: baseLine.BASELINE_VALUE_ID,
                BASELINE_PRICE: baselineValue.BASELINE_PRICE,
                BASELINE_KWH: baselineValue.BASELINE_KWH,
            }, session.user);
        }
    }

    const baselineInfo = await sqldb.BASELINES.getExtraInfo({ BASELINE_ID: reqParams.BASELINE_ID, UNIT_ID: reqParams.UNIT_ID });
    if (!baselineInfo) { throw Error('Baseline not found').HttpStatus(400); }

    return { BASELINE_ID: baselineInfo.BASELINE_ID };
  }
  catch (err) {
    logger.error(`Error inserting Baseline Values - msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error inserting Baseline Values').HttpStatus(400)
  }
}

export const checkBaselinevalueToSet = async (reqParams: Parameters<typeof httpRouter.privateRoutes['/clients/set-baseline-values']>[0], session: SessionData) => {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  if (!reqParams.baselineValues) { throw Error('Invalid properties. Missing baselineValues.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)
}
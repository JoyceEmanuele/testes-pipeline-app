import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

export async function w_insert (qPars: {
  FILENAME: string,
  NAME_GP: string,
  DAT_UPLOAD: Date
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('FILENAME')
  fields.push('NAME_GP')
  fields.push('DAT_UPLOAD')

  const sentence = `INSERT INTO GROUND_PLANS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('GROUND_PLANS', sentence, qPars, operationLogData);
    dbLogger('GROUND_PLANS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_delete (qPars: {
  GROUNDPLAN_ID: number,
}, operationLogData: OperationLogData) {
  const sentence = `
  DELETE GROUND_PLANS_UNITS, GROUND_PLANS
  FROM GROUND_PLANS_UNITS
  INNER JOIN GROUND_PLANS ON (GROUND_PLANS_UNITS.GROUNDPLAN_ID = GROUND_PLANS.ID)
  WHERE GROUND_PLANS_UNITS.GROUNDPLAN_ID = :GROUNDPLAN_ID`;

  if (operationLogData) {
    await saveOperationLog('GROUND_PLANS', sentence, qPars, operationLogData);
    dbLogger('GROUND_PLANS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deletByUnit (qPars: {
  UNIT_ID: number,
}, operationLogData: OperationLogData) {
  const sentence = `
  DELETE GROUND_PLANS_UNITS, GROUND_PLANS, GROUND_PLANS_POINTS
  FROM GROUND_PLANS_UNITS
  INNER JOIN GROUND_PLANS ON (GROUND_PLANS_UNITS.GROUNDPLAN_ID = GROUND_PLANS.ID)
  INNER JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.GROUNDPLAN_ID = GROUND_PLANS.ID)
  WHERE GROUND_PLANS_UNITS.UNIT_ID = :UNIT_ID;`

  if (operationLogData) {
    await saveOperationLog('GROUND_PLANS', sentence, qPars, operationLogData);
    dbLogger('GROUND_PLANS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update(qPars: {
  GROUNDPLAN_ID: number,
  NAME_GP: string,
}) {
  const sentence = `
    UPDATE 
      GROUND_PLANS
    SET 
      NAME_GP = :NAME_GP
    WHERE
      ID = :GROUNDPLAN_ID;
  `;

  return sqldb.execute(sentence, qPars)
}

export async function getByIdAndUnit (qPars: {
  GROUNDPLAN_ID: number,
  UNIT_ID: number,
}) {
  const sentence = `
  SELECT
    GROUND_PLANS.ID,
    FILENAME,
    NAME_GP,
    DAT_UPLOAD
  FROM GROUND_PLANS
  LEFT JOIN GROUND_PLANS_UNITS ON (GROUND_PLANS_UNITS.GROUNDPLAN_ID = GROUND_PLANS.ID)
  WHERE GROUND_PLANS.ID = :GROUNDPLAN_ID AND GROUND_PLANS_UNITS.UNIT_ID = :UNIT_ID;
  `;

  return sqldb.querySingle<{
    ID: number,
    FILENAME: string
    NAME_GP: string
    DAT_UPLOAD: Date
  }>(sentence, qPars)
}

export async function getByUnit (qPars: {
  UNIT_ID: number,
  PARAMS?: string,
}) {
  let sentence = `
  SELECT 
  GROUND_PLANS.ID AS GROUNDPLAN_ID,
	GROUND_PLANS.FILENAME,
  GROUND_PLANS_UNITS.UNIT_ID AS UNIT_ID,
	GROUND_PLANS.NAME_GP,
	GROUND_PLANS.DAT_UPLOAD
  FROM GROUND_PLANS
  LEFT JOIN GROUND_PLANS_UNITS ON (GROUND_PLANS.ID = GROUND_PLANS_UNITS.GROUNDPLAN_ID)
  WHERE GROUND_PLANS_UNITS.UNIT_ID = :UNIT_ID
  `;

  if (qPars.PARAMS) {
    sentence += ` AND GROUND_PLANS.NAME_GP LIKE :PARAMS`
  }

  sentence += ' ORDER BY GROUND_PLANS.DAT_UPLOAD ASC;'

  return sqldb.query<{
    GROUNDPLAN_ID: number,
    UNIT_ID: number
    FILENAME: string
    NAME_GP: string
    DAT_UPLOAD: Date
  }>(sentence, qPars)
}

export async function getPointsByGroundPlanId (qPars: {
  GROUNDPLAN_ID: number,
}) {
  const sentence = `
SELECT 
  DEV_POINTS.ID AS POINT_ID,
  DEV_POINTS.POINT_X,
  DEV_POINTS.POINT_Y,
  DEV_POINTS.DEVICE_ID AS DUT_ID,
  DEVICES.DEVICE_CODE AS DEV_ID,
  ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME,
  ROOMTYPES.CO2MAX,
  ROOMTYPES.TUSEMAX,
  ROOMTYPES.TUSEMIN,
  ROOMTYPES.HUMIMAX,
  ROOMTYPES.HUMIMIN
FROM GROUND_PLANS
  LEFT JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS.ID = GROUND_PLANS_POINTS.GROUNDPLAN_ID)
  LEFT JOIN DEV_POINTS ON (DEV_POINTS.ID = GROUND_PLANS_POINTS.POINT_ID)
  LEFT JOIN DEVICES ON (DEV_POINTS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DUTS_MONITORING ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
  LEFT JOIN ENVIRONMENTS ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
  LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
  LEFT JOIN ROOMTYPES ON (ENVIRONMENTS_ROOM_TYPES.RTYPE_ID = ROOMTYPES.RTYPE_ID)
WHERE GROUND_PLANS_POINTS.GROUNDPLAN_ID = :GROUNDPLAN_ID
ORDER BY GROUND_PLANS.DAT_UPLOAD ASC;
  `;

  return sqldb.query<{
    POINT_ID: number,
    POINT_X: string,
    POINT_Y: string,
    DEV_ID: string,
    DUT_ID: number,
    ROOM_NAME: string,
    CO2MAX: number,
    TUSEMAX: number,
    TUSEMIN: number,
    HUMIMAX: number,
    HUMIMIN: number,
  }>(sentence, qPars)
}

export async function getPointsByUnitId (qPars: {
  UNIT_ID: number,
}) {
  const sentence = `
  SELECT
    GROUND_PLANS.ID AS GROUND_PLAN_ID,
    DEV_POINTS.ID AS POINT_ID,
    DEV_POINTS.POINT_X,
    DEV_POINTS.POINT_Y,
    DEV_POINTS.DEVICE_ID AS DUT_ID,
    DEVICES.DEVICE_CODE AS DEV_ID,
    ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME,
    ENVIRONMENTS.ID AS ENVIRONMENT_ID,
    DEVICES_UNITS.UNIT_ID AS DEVICE_UNIT,
    ROOMTYPES.CO2MAX,
    ROOMTYPES.TUSEMAX,
    ROOMTYPES.TUSEMIN,
    ROOMTYPES.HUMIMAX,
    ROOMTYPES.HUMIMIN
  FROM GROUND_PLANS
    LEFT JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS.ID = GROUND_PLANS_POINTS.GROUNDPLAN_ID)
    LEFT JOIN GROUND_PLANS_UNITS ON (GROUND_PLANS.ID = GROUND_PLANS_UNITS.GROUNDPLAN_ID)
    LEFT JOIN DEV_POINTS ON (DEV_POINTS.ID = GROUND_PLANS_POINTS.POINT_ID)
    LEFT JOIN DEVICES ON (DEV_POINTS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
    LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DUTS_MONITORING ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
    LEFT JOIN ENVIRONMENTS ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
    LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
    LEFT JOIN ROOMTYPES ON (ENVIRONMENTS_ROOM_TYPES.RTYPE_ID = ROOMTYPES.RTYPE_ID)
  WHERE GROUND_PLANS_UNITS.UNIT_ID = :UNIT_ID AND GROUND_PLANS_POINTS.POINT_ID IS NOT NULL;
  `;

  return sqldb.query<{
    GROUND_PLAN_ID: number,
    DEVICE_UNIT: number,
    POINT_ID: number,
    POINT_X: string,
    POINT_Y: string,
    ENVIRONMENT_ID: number
    DEV_ID: string,
    DUT_ID: number,
    ROOM_NAME: string,
    CO2MAX: number,
    TUSEMAX: number,
    TUSEMIN: number,
    HUMIMAX: number,
    HUMIMIN: number,
  }>(sentence, qPars)
}
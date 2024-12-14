import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

export function w_insert (qPars: {
  POINT_X: string,
  POINT_Y: string,
  DEVICE_ID: number
}) {
  const fields: string[] = []
  fields.push('POINT_X')
  fields.push('POINT_Y')
  fields.push('DEVICE_ID')

  const sentence = `INSERT INTO DEV_POINTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

export async function w_delete (qPars: {
  POINT_ID: number,
}, operationLogData: OperationLogData) {
  const sentence = `DELETE 
  DEV_POINTS, GROUND_PLANS_POINTS FROM DEV_POINTS
  INNER JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.POINT_ID = DEV_POINTS.ID)
  WHERE DEV_POINTS.ID = :POINT_ID;`;

  if (operationLogData) {
    await saveOperationLog('DEV_POINTS', sentence, qPars, operationLogData);
    dbLogger('DEV_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByDevice (qPars: {
  DEVICE_ID: number,
}, operationLogData: OperationLogData) {
  const sentence = `DELETE 
  DEV_POINTS, GROUND_PLANS_POINTS FROM DEV_POINTS
  INNER JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.POINT_ID = DEV_POINTS.ID)
  WHERE DEV_POINTS.DEVICE_ID = :DEVICE_ID;`;

  if (operationLogData) {
    await saveOperationLog('DEV_POINTS', sentence, qPars, operationLogData);
    dbLogger('DEV_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByDeviceCode (qPars: {
  DEVICE_CODE: string,
}, operationLogData: OperationLogData) {
  const sentence = `
  DELETE 
    DEV_POINTS, GROUND_PLANS_POINTS 
  FROM DEV_POINTS

  INNER JOIN DEVICES ON (DEV_POINTS.DEVICE_ID = DEVICES.ID)       
  INNER JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.POINT_ID = DEV_POINTS.ID)

  WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE;`;

  if (operationLogData) {
    await saveOperationLog('DEV_POINTS', sentence, qPars, operationLogData);
    dbLogger('DEV_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: {
  CLIENT_ID: number
}, operationLogData: OperationLogData) {
  const sentence = `
  DELETE 
    DEV_POINTS, GROUND_PLANS_POINTS 
  FROM DEV_POINTS
  INNER JOIN DEVICES_CLIENTS ON (devices.ID = DEVICES_CLIENTS.DEVICE_ID)
  INNER JOIN DEVICES ON (DEV_POINTS.DEVICE_ID = DEVICES.ID)       
  INNER JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.POINT_ID = DEV_POINTS.ID)

  WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID;`;

  if (operationLogData) {
    await saveOperationLog('DEV_POINTS', sentence, qPars, operationLogData);
    dbLogger('DEV_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update(qPars: {
  POINT_X: string,
  POINT_Y: string,
  POINT_ID?: number
  DEVICE_ID: number
}) {
  let where;
  if (qPars.POINT_ID && qPars.DEVICE_ID) {
    where = ' WHERE ID = :POINT_ID AND DEVICE_ID = :DEVICE_ID';
  }
  else if (qPars.POINT_ID) {
    where = ' WHERE ID = :POINT_ID';
  }
  else if (qPars.DEVICE_ID) {
    where = ' WHERE DEVICE_ID = :DEVICE_ID';
  }
  let sentence = `
    UPDATE 
      DEV_POINTS
    SET 
      POINT_X = :POINT_X,
      POINT_Y = :POINT_Y,
      DEVICE_ID = :DEVICE_ID
  `;
  sentence += where;
  return sqldb.execute(sentence, qPars)
}

export async function getDevPoint(qPars: { DEVICE_ID: number }) {
  const sentence = `
    SELECT
      DEV_POINTS.ID
    FROM
      DEV_POINTS
    WHERE
      DEV_POINTS.DEVICE_ID = :DEVICE_ID;
  `;

  return sqldb.query<{
    ID: string
  }>(sentence, qPars);
}

export async function getAllPointsUnit(qPars: { GROUND_PLAN_ID: number }) {
  const sentence = `
    SELECT
      DEV_POINTS.ID AS POINT_ID,
      DEV_POINTS.DEVICE_ID
    FROM
      DEV_POINTS
    LEFT JOIN GROUND_PLANS_POINTS ON (GROUND_PLANS_POINTS.POINT_ID = DEV_POINTS.ID)
    WHERE
      GROUND_PLANS_POINTS.GROUNDPLAN_ID = :GROUND_PLAN_ID;
  `;

  return sqldb.query<{
    POINT_ID: number
    DEVICE_ID: number
  }>(sentence, qPars);
}
import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

export function w_insert (qPars: {
  GROUNDPLAN_ID: number,
  POINT_ID: number
}) {
  const fields: string[] = []
  fields.push('GROUNDPLAN_ID')
  fields.push('POINT_ID')

  const sentence = `INSERT INTO GROUND_PLANS_POINTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteGP (qPars: {
  GROUNDPLAN_ID: number,
}, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM GROUND_PLANS_POINTS WHERE GROUNDPLAN_ID = :GROUNDPLAN_ID;`;

  if (operationLogData) {
    await saveOperationLog('GROUND_PLANS_POINTS', sentence, qPars, operationLogData);
    dbLogger('GROUND_PLANS_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_delete (qPars: {
  GROUNDPLAN_ID: number,
  POINT_ID: number
}, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM GROUND_PLANS_POINTS WHERE GROUNDPLAN_ID = :GROUNDPLAN_ID AND POINT_ID = :POINT_ID;`;

  if (operationLogData) {
    await saveOperationLog('GROUND_PLANS_POINTS', sentence, qPars, operationLogData);
    dbLogger('GROUND_PLANS_POINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
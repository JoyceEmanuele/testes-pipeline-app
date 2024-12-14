import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


/* @IFHELPER:FUNC insert = INSERT-UPDATE
  FROM P_CAUSES
  FIELD P_CAUSES.CAUSES
*/
export async function w_insert(qPars: { CAUSES: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CAUSES')

  let sentence = `INSERT INTO P_CAUSES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('P_CAUSES', sentence, qPars, operationLogData);
    dbLogger('P_CAUSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM P_CAUSE_ID: {P_CAUSES.ID}
  FROM P_CAUSES
  WHERE {P_CAUSES.ID} = ({:P_CAUSE_ID})
*/
export function w_deleteRow(qPars: { P_CAUSE_ID: number }) {

  const sentence = `DELETE FROM P_CAUSES WHERE P_CAUSES.ID = :P_CAUSE_ID`;

  return sqldb.execute(sentence, qPars)
}
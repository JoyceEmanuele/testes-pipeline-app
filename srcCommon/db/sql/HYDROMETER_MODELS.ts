import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {HYDROMETER_MODELS.ID}
  FROM HYDROMETER_MODELS
  WHERE {HYDROMETER_MODELS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM HYDROMETER_MODELS WHERE HYDROMETER_MODELS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('HYDROMETER_MODELS', sentence, qPars, operationLogData);
    dbLogger('HYDROMETER_MODELS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM HYDROMETER_MODEL: {HYDROMETER_MODELS.HYDROMETER_MODEL}
  FROM HYDROMETER_MODELS
  WHERE {HYDROMETER_MODELS.HYDROMETER_MODEL} = {:HYDROMETER_MODEL}
*/
export async function w_deleteFromModel (qPars: { HYDROMETER_MODEL: string}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM HYDROMETER_MODELS WHERE HYDROMETER_MODELS.HYDROMETER_MODEL = :HYDROMETER_MODEL`;

  if (operationLogData) {
    await saveOperationLog('HYDROMETER_MODELS', sentence, qPars, operationLogData);
    dbLogger('HYDROMETER_MODELS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM HYDROMETER_MODELS
  FIELD HYDROMETER_MODELS.HYDROMETER_MODEL
*/
export async function w_insert (qPars: { HYDROMETER_MODEL: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('HYDROMETER_MODEL')

  const sentence = `INSERT INTO HYDROMETER_MODELS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('HYDROMETER_MODELS', sentence, qPars, operationLogData);
    dbLogger('HYDROMETER_MODELS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM HYDROMETER_MODELS
  FIELD [[IFOWNPROP {:HYDROMTER_MODEL}]] HYDROMETER_MODELS.HYDROMETER_MODEL
  WHERE {HYDROMETER_MODELS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  HYDROMETER_MODEL?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.HYDROMETER_MODEL !== undefined) { fields.push('HYDROMETER_MODEL = :HYDROMETER_MODEL') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE HYDROMETER_MODELS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('HYDROMETER_MODELS', sentence, qPars, operationLogData);
    dbLogger('HYDROMETER_MODELS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getHydrometerId = SELECT ROW
  PARAM HYDROMETER_MODEL: {HYDROMETER_MODELS.HYDROMETER_MODEL}

  FROM HYDROMETER_MODELS
  SELECT HYDROMETER_MODELS.ID AS HYDROMETER_ID

  WHERE {HYDROMETER_MODELS.HYDROMETER_MODEL} = {:HYDROMETER_MODEL}
*/
export function getHydrometerId (qPars: { HYDROMETER_MODEL: string }) {
  let sentence = `
    SELECT
      HYDROMETER_MODELS.ID AS HYDROMETER_ID
    FROM
      HYDROMETER_MODELS
    WHERE HYDROMETER_MODELS.HYDROMETER_MODEL = :HYDROMETER_MODEL `

  return sqldb.querySingle<{
    HYDROMETER_ID: number
  }>(sentence, qPars)
}
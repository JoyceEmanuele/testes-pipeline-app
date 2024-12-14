import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteDistributorsInfo = DELETE
  PARAM UNIT_ID: {DISTRIBUTORS.DISTRIBUTOR_ID}
  FROM DISTRIBUTORS
  WHERE {DISTRIBUTORS.DISTRIBUTOR_ID} = {:DISTRIBUTOR_ID}
*/
export async function w_deleteDistributorsInfo (qPars: { DISTRIBUTOR_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DISTRIBUTORS WHERE DISTRIBUTORS.DISTRIBUTOR_ID = :DISTRIBUTOR_ID`;

  if (operationLogData) {
    await saveOperationLog('DISTRIBUTORS', sentence, qPars, operationLogData);
    dbLogger('DISTRIBUTORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DISTRIBUTORS

  FIELD DISTRIBUTORS.DISTRIBUTOR_ID
  FIELD DISTRIBUTORS.DISTRIBUTOR_TAG
  FIELD DISTRIBUTORS.DISTRIBUTOR_LABEL
*/
export async function w_insert (qPars: { DISTRIBUTOR_ID: number, DISTRIBUTOR_TAG: string, DISTRIBUTOR_LABEL: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DISTRIBUTOR_ID')
  fields.push('DISTRIBUTOR_TAG')
  fields.push('DISTRIBUTOR_LABEL')

  const sentence = `INSERT INTO DISTRIBUTORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DISTRIBUTORS', sentence, qPars, operationLogData);
    dbLogger('DISTRIBUTORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getAllDistributors = SELECT LIST

  FROM DISTRIBUTORS

  SELECT DISTRIBUTORS.DISTRIBUTOR_ID
  SELECT DISTRIBUTORS.DISTRIBUTOR_TAG
  SELECT DISTRIBUTORS.DISTRIBUTOR_LABEL
*/
export function getAllDistributors () {
  let sentence = `
    SELECT
      DISTRIBUTORS.DISTRIBUTOR_ID,
      DISTRIBUTORS.DISTRIBUTOR_TAG,
      DISTRIBUTORS.DISTRIBUTOR_LABEL
  `
  sentence += `
    FROM
      DISTRIBUTORS
  `

  return sqldb.query<{
    DISTRIBUTOR_ID: number
    DISTRIBUTOR_TAG: string
    DISTRIBUTOR_LABEL: string
  }>(sentence)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM DISTRIBUTOR_TAG: {DISTRIBUTORS.DISTRIBUTOR_TAG}


  FROM ACCESS_DISTRIBUTORS

  SELECT DISTRIBUTORS.DISTRIBUTOR_ID
  SELECT DISTRIBUTORS.DISTRIBUTOR_TAG
  SELECT DISTRIBUTORS.DISTRIBUTOR_LABEL
  WHERE {DISTRIBUTORS.DISTRIBUTOR_TAG} = {:DISTRIBUTOR_TAG}
*/
export function getExtraInfo (qPars: { DISTRIBUTOR_TAG: string }) {
  let sentence = `
    SELECT
      DISTRIBUTORS.DISTRIBUTOR_ID,
      DISTRIBUTORS.DISTRIBUTOR_TAG,
      DISTRIBUTORS.DISTRIBUTOR_LABEL
  `
  sentence += `
    FROM
      DISTRIBUTORS
  `

  const conditions: string[] = []
  if (qPars.DISTRIBUTOR_TAG) { conditions.push(`DISTRIBUTORS.DISTRIBUTOR_TAG = :DISTRIBUTOR_TAG`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    DISTRIBUTOR_ID: number
    DISTRIBUTOR_TAG: string
    DISTRIBUTOR_LABEL: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DISTRIBUTORS
  PARAM UNIT_ID: {DISTRIBUTORS.DISTRIBUTOR_ID}
  FIELD [[IFOWNPROP {:DISTRIBUTOR_TAG}]] DISTRIBUTORS.DISTRIBUTOR_TAG
  FIELD [[IFOWNPROP {:DISTRIBUTOR_LABEL}]] DISTRIBUTORS.DISTRIBUTOR_LABEL
*/
export async function w_updateInfo (
    qPars: { DISTRIBUTOR_ID?: number, DISTRIBUTOR_TAG?: string, DISTRIBUTOR_LABEL?: string }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.DISTRIBUTOR_ID !== undefined) { fields.push('DISTRIBUTOR_ID = :DISTRIBUTOR_ID') }
    if (qPars.DISTRIBUTOR_TAG !== undefined) { fields.push('DISTRIBUTOR_TAG = :DISTRIBUTOR_TAG') }
    if (qPars.DISTRIBUTOR_LABEL !== undefined) { fields.push('DISTRIBUTOR_LABEL = :DISTRIBUTOR_LABEL') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE DISTRIBUTORS SET ${fields.join(', ')} WHERE UNIT_ID = :UNIT_ID`
  
    if (operationLogData) {
      await saveOperationLog('DISTRIBUTORS', sentence, qPars, operationLogData);
      dbLogger('DISTRIBUTORS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

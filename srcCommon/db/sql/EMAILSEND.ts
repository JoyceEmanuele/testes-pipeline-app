import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM EML_ID: {EMAILSEND.EML_ID}
  FROM EMAILSEND
  WHERE {EMAILSEND.EML_ID} = {:EML_ID}
*/
export async function w_deleteRow (qPars: { EML_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM EMAILSEND WHERE EMAILSEND.EML_ID = :EML_ID`;

  if (operationLogData) {
    await saveOperationLog('EMAILSEND', sentence, qPars, operationLogData);
    dbLogger('EMAILSEND', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
FROM EMAILSEND

FIELD EMAILSEND.DAT_SEND
FIELD EMAILSEND.CATEGORY
FIELD EMAILSEND.EMAIL_DATA
FIELD EMAILSEND.LAST_TRY
*/
export async function w_insert (qPars: {
  DAT_SEND: string,
  CATEGORY: string,
  EMAIL_DATA: string,
  LAST_TRY: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAT_SEND')
  fields.push('CATEGORY')
  fields.push('EMAIL_DATA')
  fields.push('LAST_TRY')

  const sentence = `INSERT INTO EMAILSEND (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('EMAILSEND', sentence, qPars, operationLogData);
    dbLogger('EMAILSEND', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM EML_ID: {EMAILSEND.EML_ID}

  FROM EMAILSEND

  FIELD EMAILSEND.LAST_TRY
*/
export async function w_update (qPars: { EML_ID: number, LAST_TRY: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('LAST_TRY = :LAST_TRY');

  const sentence = `UPDATE EMAILSEND SET ${fields.join(', ')} WHERE EML_ID = :EML_ID`

  if (operationLogData) {
    await saveOperationLog('EMAILSEND', sentence, qPars, operationLogData);
    dbLogger('EMAILSEND', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getListPending = SELECT LIST
  PARAM NOT_AFTER?: {EMAILSEND.LAST_TRY}

  FROM EMAILSEND

  SELECT EMAILSEND.EML_ID
  SELECT EMAILSEND.DAT_SEND
  SELECT EMAILSEND.LAST_TRY
  SELECT EMAILSEND.CATEGORY
  SELECT EMAILSEND.EMAIL_DATA

  WHERE [[IFOWNPROP {:NOT_AFTER}]] ({EMAILSEND.LAST_TRY} IS NULL OR {EMAILSEND.LAST_TRY} <= {:NOT_AFTER})
*/
export function getListPending (qPars: { NOT_AFTER?: string }) {
  let sentence = `
    SELECT
      EMAILSEND.EML_ID,
      EMAILSEND.DAT_SEND,
      EMAILSEND.LAST_TRY,
      EMAILSEND.CATEGORY,
      EMAILSEND.EMAIL_DATA
  `
  sentence += `
    FROM
      EMAILSEND
  `

  const conditions: string[] = []
  if (qPars.NOT_AFTER !== undefined) { conditions.push(`(EMAILSEND.LAST_TRY IS NULL OR EMAILSEND.LAST_TRY <= :NOT_AFTER)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    EML_ID: number
    DAT_SEND: string
    LAST_TRY: string
    CATEGORY: string
    EMAIL_DATA: string
  }>(sentence, qPars)
}

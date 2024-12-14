import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM MSG_ID: {MSGTOSERVICE.MSG_ID}
  FROM MSGTOSERVICE
  WHERE {MSGTOSERVICE.MSG_ID} = {:MSG_ID}
*/
export async function w_deleteRow (qPars: { MSG_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MSGTOSERVICE WHERE MSGTOSERVICE.MSG_ID = :MSG_ID`;

  if (operationLogData) {
    await saveOperationLog('MSGTOSERVICE', sentence, qPars, operationLogData);
    dbLogger('MSGTOSERVICE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
FROM MSGTOSERVICE

FIELD MSGTOSERVICE.DAT_SEND
FIELD MSGTOSERVICE.DEST
FIELD MSGTOSERVICE.MSG
*/
export async function w_insert (qPars: {
  DAT_SEND: string,
  ORIG: string,
  DEST: string,
  MSG: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAT_SEND')
  fields.push('ORIG')
  fields.push('DEST')
  fields.push('MSG')

  const sentence = `INSERT INTO MSGTOSERVICE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('MSGTOSERVICE', sentence, qPars, operationLogData);
    dbLogger('MSGTOSERVICE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getListWithDest = SELECT LIST
  PARAM DEST: {MSGTOSERVICE.DEST}

  FROM MSGTOSERVICE

  SELECT MSGTOSERVICE.MSG_ID
  SELECT MSGTOSERVICE.DAT_SEND
  SELECT MSGTOSERVICE.DEST
  SELECT MSGTOSERVICE.MSG

  WHERE [[IFJS {:DESTS}]] {MSGTOSERVICE.DEST} IN ({:DESTS})
*/
export function getListWithDest (qPars: { DEST: string }) {
  let sentence = `
    SELECT
      MSGTOSERVICE.MSG_ID,
      MSGTOSERVICE.DAT_SEND,
      MSGTOSERVICE.ORIG,
      MSGTOSERVICE.DEST,
      MSGTOSERVICE.MSG
  `
  sentence += `
    FROM
      MSGTOSERVICE
  `

  const conditions: string[] = []
  if (qPars.DEST) { conditions.push(`MSGTOSERVICE.DEST = :DEST`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    MSG_ID: number
    DAT_SEND: string
    ORIG: string
    DEST: string
    MSG: string
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM NOBREAK_IMAGES
  FIELD NOBREAK_IMAGES.NOBREAK_ID
  FIELD NOBREAK_IMAGES.DAT_UPLOAD
  FIELD NOBREAK_IMAGES.FILENAME
*/
export async function w_insert (qPars: { NOBREAK_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('NOBREAK_ID')
    fields.push('DAT_UPLOAD')
    fields.push('FILENAME')
  
    const sentence = `INSERT INTO NOBREAK_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
    if (operationLogData) {
      await saveOperationLog('NOBREAK_IMAGES', sentence, qPars, operationLogData);
      dbLogger('NOBREAK_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC getList = SELECT LIST
  PARAM NOBREAK_ID: {NOBREAK_IMAGES.NOBREAK_ID}
  FROM NOBREAK_IMAGES
  SELECT NOBREAK_IMAGES.FILENAME
  WHERE {NOBREAK_IMAGES.NOBREAK_ID} = {:NOBREAK_ID}
  ORDER BY NOBREAK_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { NOBREAK_ID: number }) {
  let sentence = `
    SELECT
      NOBREAK_IMAGES.FILENAME
  `
  sentence += `
    FROM
      NOBREAK_IMAGES
  `

  sentence += ` WHERE NOBREAK_IMAGES.NOBREAK_ID = :NOBREAK_ID `

  sentence += ` ORDER BY NOBREAK_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

export async function w_deleteRow (qPars: { NOBREAK_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM NOBREAK_IMAGES WHERE NOBREAK_IMAGES.NOBREAK_ID = :NOBREAK_ID AND NOBREAK_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('NOBREAK_IMAGES', sentence, qPars, operationLogData);
    dbLogger('NOBREAK_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRowByNobreakId (qPars: { NOBREAK_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM NOBREAK_IMAGES WHERE NOBREAK_IMAGES.NOBREAK_ID = :NOBREAK_ID`;

  if (operationLogData) {
    await saveOperationLog('NOBREAK_IMAGES', sentence, qPars, operationLogData);
    dbLogger('NOBREAK_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
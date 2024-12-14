import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DAL_ID: {DAL_IMAGES.DAL_ID}
  PARAM FILENAME: {DAL_IMAGES.FILENAME}
  FROM DAL_IMAGES
  WHERE {DAL_IMAGES.DAL_ID} = {:DAL_ID} AND {DAL_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { DAL_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DAL_IMAGES WHERE DAL_IMAGES.DAL_ID = :DAL_ID AND DAL_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('DAL_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAL_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDal = DELETE
  PARAM DAL_ID: {DAL_IMAGES.DAL_ID}
  FROM DAL_IMAGES
  WHERE {DAL_IMAGES.DAL_ID} = {:DAL_ID}
*/
export async function w_deleteFromDal (qPars: { DAL_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DAL_IMAGES WHERE DAL_IMAGES.DAL_ID = :DAL_ID`;

  if (operationLogData) {
    await saveOperationLog('DAL_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAL_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDals (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DALS ON (DAL_IMAGES.DAL_ID = DALS.ID)
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `;

  const sentence = `DELETE DAL_IMAGES FROM DAL_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAL_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAL_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  INTO DAL_IMAGES
  FIELD DAL_IMAGES.DAL_ID
  FIELD DAL_IMAGES.DAT_UPLOAD
  FIELD DAL_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DAL_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAL_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO DAL_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAL_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAL_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM DAL_ID: {DAL_IMAGES.DAL_ID}
  FROM DAL_IMAGES
  SELECT DAL_IMAGES.FILENAME
  WHERE {DAL_IMAGES.DAL_ID} = {:DAL_ID}
  ORDER BY DAL_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { DAL_ID: number }) {
  let sentence = `
    SELECT
      DAL_IMAGES.FILENAME
  `
  sentence += `
    FROM
      DAL_IMAGES
  `

  sentence += ` WHERE DAL_IMAGES.DAL_ID = :DAL_ID `

  sentence += ` ORDER BY DAL_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}
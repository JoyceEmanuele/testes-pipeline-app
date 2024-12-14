import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEV_ID: {DUTS_DEVICES_IMAGES.DEV_ID}
  PARAM FILENAME: {DUTS_DEVICES_IMAGES.FILENAME}
  FROM DUTS_DEVICES_IMAGES
  WHERE {DUTS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID} AND {DUTS_DEVICES_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { DEV_ID: string, FILENAME: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES_IMAGES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DEVICES_IMAGES FROM DUTS_DEVICES_IMAGES  ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID AND DUTS_DEVICES_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDut = DELETE
  PARAM DEV_ID: {DUTS_DEVICES_IMAGES.DEV_ID}
  FROM DUTS_DEVICES_IMAGES
  WHERE {DUTS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID}
*/
export async function w_deleteFromDut (qPars: { DEV_ID: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES_IMAGES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DEVICES_IMAGES FROM DUTS_DEVICES_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDuts (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES_IMAGES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_DEVICES_IMAGES FROM DUTS_DEVICES_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_DEVICES_IMAGES
  FIELD DUTS_DEVICES_IMAGES.DUT_DEVICE_ID
  FIELD DUTS_DEVICES_IMAGES.DAT_UPLOAD
  FIELD DUTS_DEVICES_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DUT_DEVICE_ID: number, DAT_UPLOAD: string, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO DUTS_DEVICES_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM devId: {DUTS_DEVICES_IMAGES.DEV_ID}
  FROM DUTS_DEVICES_IMAGES
  SELECT DUTS_DEVICES_IMAGES.FILENAME
  WHERE {DUTS_DEVICES_IMAGES.DEV_ID} = {:devId}
  ORDER BY DUTS_DEVICES_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DUTS_DEVICES_IMAGES.FILENAME
  `
  sentence += `
    FROM
      DUTS_DEVICES_IMAGES
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES_IMAGES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)

  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :devId `

  sentence += ` ORDER BY DUTS_DEVICES_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

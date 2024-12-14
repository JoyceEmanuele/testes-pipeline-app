import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEV_ID: {DRIS_DEVICES_IMAGES.DEV_ID}
  PARAM FILENAME: {DRIS_DEVICES_IMAGES.FILENAME}
  FROM DRIS_DEVICES_IMAGES
  WHERE {DRIS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID} AND {DRIS_DEVICES_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { DEV_ID: string, FILENAME: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES_IMAGES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DRIS_DEVICES_IMAGES FROM DRIS_DEVICES_IMAGES  ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID AND DRIS_DEVICES_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDRI = DELETE
  PARAM DEV_ID: {DRIS_DEVICES_IMAGES.DEV_ID}
  FROM DRIS_DEVICES_IMAGES
  WHERE {DRIS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID}
*/
export async function w_deleteFromDri (qPars: { DEV_ID: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES_IMAGES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DRIS_DEVICES_IMAGES FROM DRIS_DEVICES_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDris (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES_IMAGES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DRIS_DEVICES_IMAGES FROM DRIS_DEVICES_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DRIS_DEVICES_IMAGES
  FIELD DRIS_DEVICES_IMAGES.DRI_DEVICE_ID
  FIELD DRIS_DEVICES_IMAGES.DAT_UPLOAD
  FIELD DRIS_DEVICES_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DRI_DEVICE_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DRI_DEVICE_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO DRIS_DEVICES_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM devId: {DRIS_DEVICES_IMAGES.DEV_ID}
  FROM DRIS_DEVICES_IMAGES
  SELECT DRIS_DEVICES_IMAGES.FILENAME
  WHERE {DRIS_DEVICES_IMAGES.DEV_ID} = {:devId}
  ORDER BY DRIS_DEVICES_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DRIS_DEVICES_IMAGES.FILENAME
  `
  sentence += `
    FROM
      DRIS_DEVICES_IMAGES
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES_IMAGES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)

  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :devId `

  sentence += ` ORDER BY DRIS_DEVICES_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

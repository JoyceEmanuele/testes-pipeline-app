import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEV_ID: {DAMS_DEVICES_IMAGES.DEV_ID}
  PARAM FILENAME: {DAMS_DEVICES_IMAGES.FILENAME}
  FROM DAMS_DEVICES_IMAGES
  WHERE {DAMS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID} AND {DAMS_DEVICES_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { DEV_ID: string, FILENAME: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES_IMAGES.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DAMS_DEVICES_IMAGES FROM DAMS_DEVICES_IMAGES  ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID AND DAMS_DEVICES_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDAM = DELETE
  PARAM DEV_ID: {DAMS_DEVICES_IMAGES.DEV_ID}
  FROM DAMS_DEVICES_IMAGES
  WHERE {DAMS_DEVICES_IMAGES.DEV_ID} = {:DEV_ID}
*/
export async function w_deleteFromDam (qPars: { DEV_ID: string }, operationLogData: OperationLogData) {

  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES_IMAGES.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DAMS_DEVICES_IMAGES FROM DAMS_DEVICES_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEV_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDams (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES_IMAGES.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DAMS_DEVICES_IMAGES FROM DAMS_DEVICES_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DAMS_DEVICES_IMAGES
  FIELD DAMS_DEVICES_IMAGES.DAM_DEVICE_ID
  FIELD DAMS_DEVICES_IMAGES.DAT_UPLOAD
  FIELD DAMS_DEVICES_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DAM_DEVICE_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAM_DEVICE_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO DAMS_DEVICES_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM devId: {DAMS_DEVICES_IMAGES.DEV_ID}
  FROM DAMS_DEVICES_IMAGES
  SELECT DAMS_DEVICES_IMAGES.FILENAME
  WHERE {DAMS_DEVICES_IMAGES.DEV_ID} = {:devId}
  ORDER BY DAMS_DEVICES_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DAMS_DEVICES_IMAGES.FILENAME
  `
  sentence += `
    FROM
      DAMS_DEVICES_IMAGES
      INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES_IMAGES.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)

  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :devId `

  sentence += ` ORDER BY DAMS_DEVICES_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

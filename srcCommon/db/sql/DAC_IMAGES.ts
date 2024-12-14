import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DAC_IMAGES

  FIELD DAC_IMAGES.DAC_ID
  FIELD DAC_IMAGES.DAT_UPLOAD
  FIELD DAC_IMAGES.FILENAME
*/
export async function w_insert(qPars: { DAC_DEVICE_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('DAC_DEVICE_ID')
    fields.push('DAT_UPLOAD')
    fields.push('FILENAME')

    const sentence = `INSERT INTO DAC_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('DAC_IMAGES', sentence, qPars, operationLogData);
        dbLogger('DAC_IMAGES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DAC_DEVICE_ID: {DAC_IMAGES.DAC_DEVICE_ID}
  PARAM FILENAME: {DAC_IMAGES.FILENAME}
  FROM DAC_IMAGES
  WHERE {DAC_IMAGES.DAC_DEVICE_ID} = {:DAC_DEVICE_ID} AND {DAC_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow(qPars: { DAC_DEVICE_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM DAC_IMAGES WHERE DAC_IMAGES.DAC_DEVICE_ID = :DAC_DEVICE_ID AND DAC_IMAGES.FILENAME = :FILENAME`;

    if (operationLogData) {
        await saveOperationLog('DAC_IMAGES', sentence, qPars, operationLogData);
        dbLogger('DAC_IMAGES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteDacInfo = DELETE
  PARAM dacId: {DAC_IMAGES.DAC_DEVICE_ID}
  FROM DAC_IMAGES
  WHERE {DAC_IMAGES.DAC_DEVICE_ID} = {:dacId}
*/
export async function w_deleteDacInfo(qPars: { DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM DAC_IMAGES WHERE DAC_IMAGES.DAC_DEVICE_ID = :dacId`;

    if (operationLogData) {
        await saveOperationLog('DAC_IMAGES', sentence, qPars, operationLogData);
        dbLogger('DAC_IMAGES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDacs = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DAC_IMAGES
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DAC_IMAGES.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDacs (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DAC_IMAGES.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DAC_IMAGES FROM DAC_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAC_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DAC_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM DAC_DEVICE_ID?: {DAC_IMAGES.DAC_DEVICE_ID}

  FROM DAC_IMAGES

  SELECT DAC_IMAGES.FILENAME

  WHERE {DAC_IMAGES.DAC_DEVICE_ID} = {:DAC_DEVICE_ID}

  ORDER BY DAC_IMAGES.DAT_UPLOAD DESC
*/
export function getList(qPars: { DAC_DEVICE_ID?: number }) {
    let sentence = `
    SELECT
      DAC_IMAGES.FILENAME
    `
    sentence += `
    FROM
      DAC_IMAGES
      INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DAC_IMAGES.DAC_DEVICE_ID)
    `
    const conditions: string[] = []
    if (qPars.DAC_DEVICE_ID) { conditions.push(`DAC_IMAGES.DAC_DEVICE_ID = :DAC_DEVICE_ID`) }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

    sentence += ` ORDER BY DAC_IMAGES.DAT_UPLOAD DESC `

    return sqldb.query<{
        FILENAME: string
    }>(sentence, qPars)
}

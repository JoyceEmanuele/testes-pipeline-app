import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  PARAM FILENAME: {DMAS_IMAGES.FILENAME}
  FROM DMAS_IMAGES
  INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE} AND {DMAS_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { DEVICE_CODE: string, FILENAME: string }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  `;

  const sentence = `DELETE DMAS_IMAGES FROM DMAS_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE AND DMAS_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('DMAS_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DMAS_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDma = DELETE
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DMAS_IMAGES
  INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export async function w_deleteFromDma (qPars: { DEVICE_CODE: string }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  `;

  const sentence = `DELETE DMAS_IMAGES FROM DMAS_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DMAS_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DMAS_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDmas = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DMAS_IMAGES
  INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DMAS_DEVICES.DEVICE_ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDmas (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DMAS_DEVICES.DEVICE_ID)
  `;

  const sentence = `DELETE DMAS_IMAGES FROM DMAS_IMAGES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DMAS_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DMAS_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DMAS_IMAGES
  FIELD DMAS_DEVICES.ID
  FIELD DMAS_IMAGES.DAT_UPLOAD
  FIELD DMAS_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DEVICE_CODE: string, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {

  const join = 'INNER JOIN DEVICES ON (DMAS_DEVICES.DEVICE_ID = DEVICES.ID)  '
  const fields: string[] = []
  fields.push('DMA_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  let sentence = `INSERT INTO DMAS_IMAGES (${fields.join(', ')})`

  sentence += `
  SELECT 
    DMAS_DEVICES.ID,
    :DAT_UPLOAD,
    :FILENAME
  FROM DMAS_DEVICES
  ${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE` 

  if (operationLogData) {
    await saveOperationLog('DMAS_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DMAS_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DMAS_IMAGES
  SELECT DMAS_IMAGES.FILENAME
  INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
  ORDER BY DMAS_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { DEVICE_CODE: string }) {

  const join = ` 
  INNER JOIN DMAS_DEVICES ON (DMAS_IMAGES.DMA_ID = DMAS_DEVICES.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
`;

  let sentence = `
    SELECT
      DMAS_IMAGES.FILENAME
  `

  sentence += `FROM DMAS_IMAGES ${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  sentence += ` ORDER BY DMAS_IMAGES.DAT_UPLOAD DESC `


  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN DMAS_DEVICES ON (DMAS_DEVICES.ID = DMAS_IMAGES.DMA_ID)
    INNER JOIN WATERS ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
`;

  const sentence = `DELETE DMAS_IMAGES FROM DMAS_IMAGES ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DMAS_IMAGES', sentence, qPars, operationLogData);
    dbLogger('DMAS_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

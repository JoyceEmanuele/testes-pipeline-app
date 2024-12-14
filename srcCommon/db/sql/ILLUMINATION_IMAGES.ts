import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ILLUMINATION_ID: {ILLUMINATION_IMAGES.ILLUMINATION_ID}
  PARAM FILENAME: {ILLUMINATION_IMAGES.FILENAME}
  FROM ILLUMINATION_IMAGES
  WHERE {ILLUMINATION_IMAGES.ILLUMINATION_ID} = {:ILLUMINATION_ID} AND {ILLUMINATION_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { ILLUMINATION_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ILLUMINATION_IMAGES WHERE ILLUMINATION_IMAGES.ILLUMINATION_ID = :ILLUMINATION_ID AND ILLUMINATION_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromIllumination = DELETE
  PARAM ILLUMINATION_ID: {ILLUMINATION_IMAGES.ILLUMINATION_ID}
  FROM ILLUMINATION_IMAGES
  WHERE {ILLUMINATION_IMAGES.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_deleteFromIllumination (qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ILLUMINATION_IMAGES WHERE ILLUMINATION_IMAGES.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIlluminations (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    LEFT JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = ILLUMINATION_IMAGES.ILLUMINATION_ID)
    LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)
  `;

  const sentence = `DELETE ILLUMINATION_IMAGES FROM ILLUMINATION_IMAGES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = ILLUMINATION_IMAGES.ILLUMINATION_ID)`;

  const sentence = `DELETE ILLUMINATION_IMAGES FROM ILLUMINATION_IMAGES ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  INTO ILLUMINATION_IMAGES
  FIELD ILLUMINATION_IMAGES.ILLUMINATION_ID
  FIELD ILLUMINATION_IMAGES.DAT_UPLOAD
  FIELD ILLUMINATION_IMAGES.FILENAME
*/
export async function w_insert (qPars: { ILLUMINATION_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ILLUMINATION_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO ILLUMINATION_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATION_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM ILLUMINATION_ID: {ILLUMINATION_IMAGES.ILLUMINATION_ID}
  FROM ILLUMINATION_IMAGES
  SELECT ILLUMINATION_IMAGES.FILENAME
  WHERE {ILLUMINATION_IMAGES.ILLUMINATION_ID} = {:ILLUMINATION_ID}
  ORDER BY ILLUMINATION_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { ILLUMINATION_ID: number }) {
  let sentence = `
    SELECT
      ILLUMINATION_IMAGES.FILENAME
  `
  sentence += `
    FROM
      ILLUMINATION_IMAGES
  `

  sentence += ` WHERE ILLUMINATION_IMAGES.ILLUMINATION_ID = :ILLUMINATION_ID `

  sentence += ` ORDER BY ILLUMINATION_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

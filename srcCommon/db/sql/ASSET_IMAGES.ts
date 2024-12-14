import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'


/* @IFHELPER:FUNC insert = INSERT
  FROM ASSET_IMAGES

  FIELD ASSET_IMAGES.ASSET_ID
  FIELD ASSET_IMAGES.DAT_UPLOAD
  FIELD ASSET_IMAGES.FILENAME
*/
export async function w_insert(qPars: { ASSET_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  const sentence = `INSERT INTO ASSET_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    dbLogger('ASSET_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSET_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow(qPars: { ASSET_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  let sentence = `
    DELETE 
      ASSET_IMAGES
    FROM 
      ASSET_IMAGES
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
    WHERE 
      ASSETS.ID = :ASSET_ID AND ASSET_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    dbLogger('ASSET_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSET_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteAssetInfo = DELETE
  PARAM ASSET_ID: {ASSET_IMAGES.ASSET_ID}
  FROM ASSET_IMAGES
  WHERE {ASSET_IMAGES.ASSET_ID} = {:ASSET_ID}
*/
export async function w_deleteAssetInfo(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {

  const sentence = `
  DELETE
    ASSET_IMAGES
  FROM 
    ASSET_IMAGES
    INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
  WHERE 
    ASSETS.ID = :ASSET_ID`;

  if (operationLogData) {
    dbLogger('ASSET_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSET_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteAssetsFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM ASSET_IMAGES
  INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
  LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `
    DELETE
      ASSET_IMAGES
    FROM
      ASSET_IMAGES
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE
      CLUNITS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
    dbLogger('ASSET_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSET_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteAssetsFromUnit = DELETE
  PARAM UNIT_ID: {CLUNITS.UNIT_ID}
  FROM ASSET_IMAGES
  INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
  LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `
    DELETE
      ASSET_IMAGES
    FROM
      ASSET_IMAGES
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE
      CLUNITS.UNIT_ID = :UNIT_ID
  `

  if (operationLogData) {
    dbLogger('ASSET_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSET_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getList(qPars: { DAT_CODE?: string, ASSET_ID?: number }) {
  let sentence = `
    SELECT
      ASSET_IMAGES.FILENAME,
      ASSETS.ID AS ASSET_ID
  `
  sentence += `
    FROM
      ASSET_IMAGES
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_IMAGES.ASSET_ID)
  `

  const conditions: string[] = []

  if (qPars.DAT_CODE) { conditions.push(`ASSETS.DAT_CODE = :DAT_CODE`) }
  if (qPars.ASSET_ID) { conditions.push(`ASSETS.ID = :ASSET_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY ASSET_IMAGES.DAT_UPLOAD DESC `

  return sqldb.query<{
    FILENAME: string
    ASSET_ID: number
  }>(sentence, qPars)
}

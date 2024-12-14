import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}
  PARAM FILENAME: {LAAGER_IMAGES.FILENAME}
  FROM LAAGER_IMAGES
  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE} AND {LAAGER_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { LAAGER_CODE: string, FILENAME: string }, operationLogData: OperationLogData) {

  const join = ` 
  INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
`;

  const sentence = `DELETE LAAGER_IMAGES FROM LAAGER_IMAGES ${join} WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE AND LAAGER_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('LAAGER_IMAGES', sentence, qPars, operationLogData);
    dbLogger('LAAGER_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM LAAGER_IMAGES
  FIELD LAAGER_IMAGES.LAAGER_ID
  FIELD LAAGER_IMAGES.DAT_UPLOAD
  FIELD LAAGER_IMAGES.FILENAME
*/
export async function w_insert (qPars: { LAAGER_CODE: string, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('LAAGER_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')

  let sentence = `INSERT INTO LAAGER_IMAGES (${fields.join(', ')})`

  sentence += `
  SELECT 
    LAAGER.ID,
    :DAT_UPLOAD,
    :FILENAME
  FROM LAAGER
  WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE  
`

  if (operationLogData) {
    await saveOperationLog('LAAGER_IMAGES', sentence, qPars, operationLogData);
    dbLogger('LAAGER_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}
  FROM LAAGER_IMAGES
  SELECT LAAGER_IMAGES.FILENAME
  INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
  ORDER BY LAAGER_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { LAAGER_CODE: string }) {

  const join = ` 
  INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
`;

  let sentence = `
    SELECT
      LAAGER_IMAGES.FILENAME
  `

  sentence += `FROM LAAGER_IMAGES ${join} WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE`;

  sentence += ` ORDER BY LAAGER_IMAGES.DAT_UPLOAD DESC`

  return sqldb.query<{
    FILENAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {WATERS.UNIT_ID}
  FROM LAAGER_IMAGES
  INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
  INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
  WHERE {WATERS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const join = ` 
    INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
    INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
`;

  const sentence = `DELETE LAAGER_IMAGES FROM LAAGER_IMAGES ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;
  
  if (operationLogData) {
    await saveOperationLog('LAAGER_IMAGES', sentence, qPars, operationLogData);
    dbLogger('LAAGER_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {WATERS.CLIENT_ID}
  FROM LAAGER_IMAGES
  INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
  INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
  INNER JOIN CLUNITS ON (WATERS.UNIT_ID = CLUNITS.UNIT_ID)
  WHERE {WATERS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const join = ` 
    INNER JOIN LAAGER ON (LAAGER_IMAGES.LAAGER_ID = LAAGER.ID)
    INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
    INNER JOIN CLUNITS ON (WATERS.UNIT_ID = CLUNITS.UNIT_ID)
`;

  const sentence = `DELETE LAAGER_IMAGES FROM LAAGER_IMAGES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;
  
  if (operationLogData) {
    await saveOperationLog('LAAGER_IMAGES', sentence, qPars, operationLogData);
    dbLogger('LAAGER_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

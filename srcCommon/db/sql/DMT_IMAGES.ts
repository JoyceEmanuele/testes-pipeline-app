import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DMT_IMAGES
  FIELD DMT_IMAGES.DMT_ID
  FIELD DMT_IMAGES.DAT_UPLOAD
  FIELD DMT_IMAGES.FILENAME
*/
export async function w_insert (qPars: { DMT_ID: number, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('DMT_ID')
    fields.push('DAT_UPLOAD')
    fields.push('FILENAME')
  
    const sentence = `INSERT INTO DMT_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
    if (operationLogData) {
      await saveOperationLog('DMT_IMAGES', sentence, qPars, operationLogData);
      dbLogger('DMT_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC getList = SELECT LIST
  PARAM DMT_ID: {DMT_IMAGES.DMT_ID}
  FROM DMT_IMAGES
  SELECT DMT_IMAGES.FILENAME
  WHERE {DMT_IMAGES.DMT_ID} = {:DMT_ID}
  ORDER BY DMT_IMAGES.DAT_UPLOAD DESC
*/
export function getList (qPars: { DMT_ID: number }) {
    let sentence = `
      SELECT
        DMT_IMAGES.FILENAME
    `
    sentence += `
      FROM
        DMT_IMAGES
    `
  
    sentence += ` WHERE DMT_IMAGES.DMT_ID = :DMT_ID `
  
    sentence += ` ORDER BY DMT_IMAGES.DAT_UPLOAD DESC `
  
    return sqldb.query<{
      FILENAME: string
    }>(sentence, qPars)
  }

  export async function w_deleteRow (qPars: { DMT_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM DMT_IMAGES WHERE DMT_IMAGES.DMT_ID = :DMT_ID AND DMT_IMAGES.FILENAME = :FILENAME`;
  
    if (operationLogData) {
      await saveOperationLog('DMT_IMAGES', sentence, qPars, operationLogData);
      dbLogger('DMT_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'


export async function w_insert (qPars: { SIMCARD_ID: string, DAT_UPLOAD: number, FILENAME: string }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('SIMCARD_ID')
    fields.push('DAT_UPLOAD')
    fields.push('FILENAME')
  
    const sentence = `INSERT INTO SIMCARDS_IMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
    if (operationLogData) {
      await saveOperationLog('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
      dbLogger('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }


export function getList (qPars: { SIMCARD_ID: string }) {
    let sentence = `
      SELECT
        SIMCARDS_IMAGES.FILENAME
    `
    sentence += `
      FROM
        SIMCARDS_IMAGES
    `
  
    sentence += ` WHERE SIMCARDS_IMAGES.SIMCARD_ID = :SIMCARD_ID `
  
    sentence += ` ORDER BY SIMCARDS_IMAGES.DAT_UPLOAD DESC `
  
    return sqldb.query<{
      FILENAME: string
    }>(sentence, qPars)
  }

  export async function w_deleteRow (qPars: { SIMCARD_ID: string, FILENAME: string }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM SIMCARDS_IMAGES WHERE SIMCARDS_IMAGES.SIMCARD_ID = :SIMCARD_ID AND SIMCARDS_IMAGES.FILENAME = :FILENAME`;
  
    if (operationLogData) {
      await saveOperationLog('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
      dbLogger('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  export async function w_deleteAll (qPars: { SIMCARD_ID: string }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM SIMCARDS_IMAGES WHERE SIMCARDS_IMAGES.SIMCARD_ID = :SIMCARD_ID;`;
  
    if (operationLogData) {
      await saveOperationLog('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
      dbLogger('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  

  export async function w_updateAll(qPars: { SIMCARD_ID: string, NEW_SIMCARD_ID: string }, operationLogData: OperationLogData) {
    const sentence = `UPDATE SIMCARDS_IMAGES SET SIMCARD_ID = :NEW_SIMCARD_ID WHERE SIMCARD_ID = :SIMCARD_ID;`;
  
    if (operationLogData) {
      await saveOperationLog('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
      dbLogger('SIMCARDS_IMAGES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
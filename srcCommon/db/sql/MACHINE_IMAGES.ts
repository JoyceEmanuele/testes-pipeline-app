import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM MACHINE_IMAGES
*/

export async function w_insert(qPars: {
    MACHINE_ID: number,
    DAT_UPLOAD: number,
    FILENAME: string,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('MACHINE_ID');
    fields.push('DAT_UPLOAD');
    fields.push('FILENAME');

    const sentence = `INSERT INTO MACHINE_IMAGES (${fields.join(', ')}) VALUES(:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('MACHINE_IMAGES', sentence, qPars, operationLogData);
        dbLogger('MACHINE_IMAGES', sentence, qPars, operationLogData);
    }
}

export function getList (qPars: { MACHINE_ID?: number }) {
    let sentence = `
      SELECT
      MACHINE_IMAGES.FILENAME
    `
    sentence += `
      FROM
        MACHINE_IMAGES
        INNER JOIN MACHINES ON (MACHINES.ID = MACHINE_IMAGES.MACHINE_ID)
    `
  
    const conditions: string[] = []
  
    if (qPars.MACHINE_ID) { conditions.push(`MACHINE_IMAGES.MACHINE_ID = :MACHINE_ID`) }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
    sentence += ` ORDER BY MACHINE_IMAGES.DAT_UPLOAD DESC `
  
    return sqldb.query<{
      FILENAME: string
    }>(sentence, qPars)
  }

  /* @IFHELPER:FUNC deleteRow = DELETE
  PARAM MACHINE_ID: {MACHINE_IMAGES.MACHINE_ID}
  PARAM FILENAME: {MACHINE_IMAGES.FILENAME}
  FROM MACHINE_IMAGES
  WHERE {MACHINE_IMAGES.MACHINE_ID} = {:MACHINE_ID} AND {MACHINE_IMAGES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow (qPars: { MACHINE_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MACHINE_IMAGES WHERE MACHINE_IMAGES.MACHINE_ID = :MACHINE_ID AND MACHINE_IMAGES.FILENAME = :FILENAME`;

  if (operationLogData) {
    dbLogger('MACHINE_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('MACHINE_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteMachineImgInfo = DELETE
  PARAM MACHINE_ID: {MACHINE_IMAGES.MACHINE_ID}
  FROM MACHINE_IMAGES
  WHERE {MACHINE_IMAGES.MACHINE_ID} = {:MACHINE_ID}
*/
export async function w_deleteMachineImgInfo (qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MACHINE_IMAGES WHERE MACHINE_IMAGES.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    dbLogger('MACHINE_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('MACHINE_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachines (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `
    DELETE
      MACHINE_IMAGES
    FROM 
      MACHINE_IMAGES
      INNER JOIN MACHINES ON (MACHINES.ID = MACHINE_IMAGES.MACHINE_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
    WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
  `
 
  if (operationLogData) {
    dbLogger('MACHINE_IMAGES', sentence, qPars, operationLogData)
    await saveOperationLog('MACHINE_IMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

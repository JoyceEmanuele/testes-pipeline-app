import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {LAAGER_HIST.ID}
  FROM LAAGER_HIST
  WHERE {LAAGER_HIST.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM LAAGER_HIST WHERE LAAGER_HIST.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
    dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM LAAGER_HIST
  FIELD LAAGER_HIST.WATER_ID
  FIELD LAAGER_HIST.LAAGER_CODE
  FIELD LAAGER_HIST.START_DATE
  FIELD LAAGER_HIST.END_DATE
*/
export async function w_insert (qPars: {
  WATER_ID?: string,
  LAAGER_CODE?: string,
  START_DATE?: string,
  END_DATE?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.WATER_ID != null) fields.push('WATER_ID')
  if (qPars.LAAGER_CODE != null) fields.push('LAAGER_CODE')
  if (qPars.START_DATE != null) fields.push('START_DATE')
  if (qPars.END_DATE != null) fields.push('END_DATE')

  const sentence = `INSERT INTO LAAGER_HIST (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
    dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM LAAGER_HIST
  PARAM ID: {LAAGER_HIST.ID}
  FIELD [[IFOWNPROP {:WATER_ID}]] LAAGER_HIST.WATER_ID
  FIELD [[IFOWNPROP {:LAAGER_CODE}]] LAAGER_HIST.LAAGER_CODE
  FIELD [[IFOWNPROP {:START_DATE}]] LAAGER_HIST.START_DATE
  FIELD [[IFOWNPROP {:END_DATE}]] LAAGER_HIST.END_DATE
*/
export async function w_updateInfo (
  qPars: { 
    ID: number, 
    WATER_ID?: number,
    LAAGER_CODE?: string, 
    START_DATE?: string,
    END_DATE?: string, }, operationLogData: OperationLogData
) {
  const fields: string[] = []
  if (qPars.WATER_ID !== undefined) { fields.push('WATER_ID = :WATER_ID') }
  if (qPars.LAAGER_CODE !== undefined) { fields.push('LAAGER_CODE = :LAAGER_CODE') }
  if (qPars.START_DATE !== undefined) { fields.push('START_DATE = :START_DATE')}
  if (qPars.END_DATE !== undefined) { fields.push('END_DATE = :END_DATE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE LAAGER_HIST SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
    dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

  /* @IFHELPER:FUNC getLaagerHist = SELECT LIST

  FROM LAAGER_HIST
  SELECT LAAGER_HIST.ID,
  SELECT LAAGER_HIST.LAAGER_CODE AS LAAGER_ID,
  SELECT WATERS.UNIT_ID,
  SELECT DATE_FORMAT(LAAGER_HIST.START_DATE, '%Y-%m-%d') AS START_DATE,
  SELECT DATE_FORMAT(LAAGER_HIST.END_DATE, '%Y-%m-%d') AS END_DATE,
  */
  export function getLaagerHist (qPars: { UNIT_ID: number, LAAGER_CODE?: string, dateStart?: string, dateEnd?: string,  }) {
    let sentence = `
      SELECT
        LAAGER_HIST.ID,
        LAAGER_HIST.LAAGER_CODE AS LAAGER_ID,
        WATERS.UNIT_ID,
        DATE_FORMAT(LAAGER_HIST.START_DATE, '%Y-%m-%d') AS START_DATE,
        DATE_FORMAT(LAAGER_HIST.END_DATE, '%Y-%m-%d') AS END_DATE,
        LAAGER_HIST.START_DATE AS FULL_START_DATE
    `
    sentence += `
      FROM
          LAAGER_HIST
          INNER JOIN WATERS ON (WATERS.ID = LAAGER_HIST.WATER_ID)
    `  
    const conditions: string[] = []
    if (qPars.dateEnd != null) { conditions.push(`DATE_FORMAT(LAAGER_HIST.START_DATE, '%Y-%m-%d') <= :dateEnd`) }
    if (qPars.dateStart != null) { conditions.push(`(DATE_FORMAT(LAAGER_HIST.END_DATE, '%Y-%m-%d') >= :dateStart OR LAAGER_HIST.END_DATE IS NULL)`) }
    if (qPars.LAAGER_CODE != null) { conditions.push(`LAAGER_HIST.LAAGER_CODE = :LAAGER_CODE AND LAAGER_HIST.END_DATE IS NULL`) }
    if (conditions.length) { sentence += ' WHERE WATERS.UNIT_ID = :UNIT_ID AND ' + conditions.join(' AND ') }

    sentence += ' ORDER BY START_DATE ASC';
    
    return sqldb.query<{
      ID: number
      LAAGER_ID: string
      START_DATE: string
      FULL_START_DATE: string
      END_DATE: string
      UNIT_ID: number
    }>(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteHistoryByLAAGERCode = DELETE
    PARAM LAAGER_CODE: {LAAGER_HIST.LAAGER_CODE}   
    DELETE FROM LAAGER_HIST  
    WHERE {LAAGER_HIST.LAAGER_CODE} = {:LAAGER_CODE} 
  */
  export async function w_deleteHistoryByLaagerCode(qPars: { LAAGER_CODE: string }, operationLogData: OperationLogData) {
    const sentence = `DELETE FROM LAAGER_HIST WHERE LAAGER_HIST.LAAGER_CODE = :LAAGER_CODE`;
  
    if (operationLogData) {
      await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
      dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteFromUnit = DELETE
    PARAM UNIT_ID: {WATERS.UNIT_ID}   
    DELETE FROM LAAGER_HIST  
    WHERE {WATERS.UNIT_ID} = {:UNIT_ID} 
  */
  export async function w_deleteFromUnit(qPars: { UNIT_ID: number}, operationLogData: OperationLogData){
    const join = "INNER JOIN WATERS ON (WATERS.ID = LAAGER_HIST.WATER_ID)";

    const sentence = `DELETE LAAGER_HIST FROM LAAGER_HIST ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;
  
    if (operationLogData) {
      await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
      dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteFromClient = DELETE
    PARAM CLIENT_ID: {LAAGER_HIST.CLIENT_ID}   
    DELETE FROM LAAGER_HIST  
    WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID} 
  */
  export async function w_deleteFromClient(qPars: { CLIENT_ID: number}, operationLogData: OperationLogData){
    const join = `
      INNER JOIN WATERS ON (WATERS.ID = LAAGER_HIST.WATER_ID)    
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
    `;

    const sentence = `DELETE LAAGER_HIST FROM LAAGER_HIST ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;
  
    if (operationLogData) {
      await saveOperationLog('LAAGER_HIST', sentence, qPars, operationLogData);
      dbLogger('LAAGER_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

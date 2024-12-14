import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DMAS_HIST.ID}
  FROM DMAS_HIST
  WHERE {DMAS_HIST.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMAS_HIST WHERE DMAS_HIST.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
    dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DMAS_HIST
  FIELD DMAS_HIST.WATER_ID
  FIELD DMAS_HIST.DMA_CODE
  FIELD DMAS_HIST.START_DATE
  FIELD DMAS_HIST.END_DATE
*/
export async function w_insert (qPars: {
  WATER_ID?: string,
  DMA_CODE?: string,
  START_DATE?: string,
  END_DATE?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.WATER_ID != null) fields.push('WATER_ID')
  if (qPars.DMA_CODE != null) fields.push('DMA_CODE')
  if (qPars.START_DATE != null) fields.push('START_DATE')
  if (qPars.END_DATE != null) fields.push('END_DATE')

  const sentence = `INSERT INTO DMAS_HIST (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
    dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DMAS_HIST
  PARAM ID: {DMAS_HIST.ID}
  FIELD [[IFOWNPROP {:WATER_ID}]] DMAS_HIST.WATER_ID
  FIELD [[IFOWNPROP {:DMA_CODE}]] DMAS_HIST.DMA_CODE
  FIELD [[IFOWNPROP {:START_DATE}]] DMAS_HIST.START_DATE
  FIELD [[IFOWNPROP {:END_DATE}]] DMAS_HIST.END_DATE
*/
export async function w_updateInfo (
  qPars: { 
    ID: number, 
    WATER_ID?: number,
    DMA_CODE?: string, 
    START_DATE?: string,
    END_DATE?: string, }, operationLogData: OperationLogData
) {
  const fields: string[] = []
  if (qPars.WATER_ID !== undefined) { fields.push('WATER_ID = :WATER_ID') }
  if (qPars.DMA_CODE !== undefined) { fields.push('DMA_CODE = :DMA_CODE') }
  if (qPars.START_DATE !== undefined) { fields.push('START_DATE = :START_DATE')}
  if (qPars.END_DATE !== undefined) { fields.push('END_DATE = :END_DATE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DMAS_HIST SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
    dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

  /* @IFHELPER:FUNC getDmaHist = SELECT LIST

  FROM DMAS_HIST
  SELECT DMAS_HIST.ID,
  SELECT DMAS_HIST.DMA_CODE AS DMA_ID,
  SELECT WATERS.UNIT_ID,
  SELECT DATE_FORMAT(DMAS_HIST.START_DATE, '%Y-%m-%d') AS START_DATE,
  SELECT DATE_FORMAT(DMAS_HIST.END_DATE, '%Y-%m-%d') AS END_DATE,
  */
  export function getDmaHist (qPars: { UNIT_ID: number, DMA_CODE?: string, dateStart?: string, dateEnd?: string,  }) {
    let sentence = `
      SELECT
        DMAS_HIST.ID,
        DMAS_HIST.DMA_CODE AS DMA_ID,
        WATERS.UNIT_ID,
        DATE_FORMAT(DMAS_HIST.START_DATE, '%Y-%m-%d') AS START_DATE,
        DATE_FORMAT(DMAS_HIST.END_DATE, '%Y-%m-%d') AS END_DATE,
        DMAS_HIST.START_DATE AS FULL_START_DATE
    `
    sentence += `
      FROM
          DMAS_HIST
          INNER JOIN WATERS ON (WATERS.ID = DMAS_HIST.WATER_ID)
    `  
    const conditions: string[] = []
    if (qPars.dateEnd != null) { conditions.push(`DATE_FORMAT(DMAS_HIST.START_DATE, '%Y-%m-%d') <= :dateEnd`) }
    if (qPars.dateStart != null) { conditions.push(`(DATE_FORMAT(DMAS_HIST.END_DATE, '%Y-%m-%d') >= :dateStart OR DMAS_HIST.END_DATE IS NULL)`) }
    if (qPars.DMA_CODE != null) { conditions.push(`DMAS_HIST.DMA_CODE = :DMA_CODE AND DMAS_HIST.END_DATE IS NULL`) }
    if (conditions.length) { sentence += ' WHERE WATERS.UNIT_ID = :UNIT_ID AND ' + conditions.join(' AND ') }

    sentence += ' ORDER BY START_DATE ASC';
    
    return sqldb.query<{
      ID: number
      DMA_ID: string
      START_DATE: string
      FULL_START_DATE: string
      END_DATE: string
      UNIT_ID: number
    }>(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteHistoryByDmaCode = DELETE
    PARAM DMA_CODE: {DMAS_HIST.DMA_CODE}   
    DELETE FROM DMAS_HIST  
    WHERE {DMAS_HIST.DMA_CODE} = {:DMA_CODE} 
  */
  export async function w_deleteHistoryByDmaCode(qPars: { DMA_CODE: string }, operationLogData: OperationLogData) {
    const sentence = `DELETE FROM DMAS_HIST WHERE DMAS_HIST.DMA_CODE = :DMA_CODE`;
  
    if (operationLogData) {
      await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
      dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteFromUnit = DELETE
    PARAM UNIT_ID: {WATERS.UNIT_ID}   
    DELETE FROM DMAS_HIST  
    WHERE {WATERS.UNIT_ID} = {:UNIT_ID} 
  */
  export async function w_deleteFromUnit(qPars: { UNIT_ID: number}, operationLogData: OperationLogData){
    const join = "INNER JOIN WATERS ON (WATERS.ID = DMAS_HIST.WATER_ID)";

    const sentence = `DELETE DMAS_HIST FROM DMAS_HIST ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;
  
    if (operationLogData) {
      await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
      dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC w_deleteFromClienT = DELETE
    PARAM CLIENT_ID: {DMAS_HIST.CLIENT_ID}   
    DELETE FROM DMAS_HIST  
    WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID} 
  */
  export async function w_deleteFromClient(qPars: { CLIENT_ID: number}, operationLogData: OperationLogData){
    const join = `
      INNER JOIN WATERS ON (WATERS.ID = DMAS_HIST.WATER_ID)    
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
    `;

    const sentence = `DELETE DMAS_HIST FROM DMAS_HIST ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;
  
    if (operationLogData) {
      await saveOperationLog('DMAS_HIST', sentence, qPars, operationLogData);
      dbLogger('DMAS_HIST', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
  }

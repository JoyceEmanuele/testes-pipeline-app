import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC insert = INSERT
  FROM LAAGER_DAILY_HISTORY_USAGE
  FIELD LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID
  FIELD LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE
  FIELD LAAGER_DAILY_HISTORY_USAGE.READING_TIME
  FIELD LAAGER_DAILY_HISTORY_USAGE.READING
  FIELD LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME
  FIELD LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE
*/
export function w_insert (qPars: { LAAGER_CODE: string, HISTORY_DATE: string, READING_TIME: string, READING: number, USAGE_AT_READING_TIME: number, ESTIMATED_USAGE: boolean}) {
  const fields: string[] = []
  fields.push('LAAGER_ID')
  fields.push('HISTORY_DATE')
  fields.push('READING_TIME')
  fields.push('READING')
  fields.push('USAGE_AT_READING_TIME')
  fields.push('ESTIMATED_USAGE')

  let sentence = `INSERT INTO LAAGER_DAILY_HISTORY_USAGE (${fields.join(', ')})`

  sentence += `
  SELECT 
    LAAGER.ID,
    :HISTORY_DATE,
    :READING_TIME,
    :READING,
    :USAGE_AT_READING_TIME,
    :ESTIMATED_USAGE
  FROM LAAGER
  WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE  
`

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT LIST
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}
  PARAM initial_date: {LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE}

  FROM LAAGER_DAILY_HISTORY_USAGE

  SELECT LAAGER_DAILY_HISTORY_USAGE.LAAGER_CODE,
  SELECT LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE,
  SELECT LAAGER_DAILY_HISTORY_USAGE.READING_TIME,
  SELECT LAAGER_DAILY_HISTORY_USAGE.READING,
  SELECT LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME,
  SELECT LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE


  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
  WHERE {LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE} >= {:initial_date}
*/

export function getExtraInfo (qPars: { LAAGER_CODE: string, initial_date: string }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE,
      LAAGER_DAILY_HISTORY_USAGE.READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.READING,
      LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE
  `
  sentence += `
    FROM
      LAAGER_DAILY_HISTORY_USAGE
    INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
  `

  const conditions: string[] = []
  conditions.push(`LAAGER.LAAGER_CODE = :LAAGER_CODE`)
  conditions.push(`LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE = :initial_date`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    LAAGER_CODE: string
    HISTORY_DATE: string
    READING_TIME: string
    READING: number,
    USAGE_AT_READING_TIME: number,
    ESTIMATED_USAGE: boolean
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getRecordInfo = SELECT LIST
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}
  PARAM initial_date: {LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE}
  PARAM initial_date: {LAAGER_DAILY_HISTORY_USAGE.READING_TIME}

  FROM LAAGER_DAILY_HISTORY_USAGE

  SELECT LAAGER_DAILY_HISTORY_USAGE.LAAGER_CODE,
  SELECT LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE,
  SELECT LAAGER_DAILY_HISTORY_USAGE.READING_TIME,
  SELECT LAAGER_DAILY_HISTORY_USAGE.READING,
  SELECT LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME,
  SELECT LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE

  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
  WHERE {LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE} = {:HISTORY_DATE}
  WHERE {LAAGER_DAILY_HISTORY_USAGE.READING_TIME} = {:READING_TIME}
*/
export function getRecordInfo (qPars: { LAAGER_CODE: string, HISTORY_DATE: string, READING_TIME: string  }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE,
      LAAGER_DAILY_HISTORY_USAGE.READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.READING,
      LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE
  `
  sentence += `
    FROM
      LAAGER_DAILY_HISTORY_USAGE
    INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
  `

  const conditions: string[] = []
  conditions.push(`LAAGER.LAAGER_CODE = :LAAGER_CODE`)
  conditions.push(`LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE = :HISTORY_DATE`)
  conditions.push(`LAAGER_DAILY_HISTORY_USAGE.READING_TIME = :READING_TIME`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    LAAGER_CODE: string
    HISTORY_DATE: string
    READING_TIME: string
    READING: number,
    USAGE_AT_READING_TIME: number,
    ESTIMATED_USAGE: boolean
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {WATERS.UNIT_ID}
  FROM LAAGER_DAILY_HISTORY_USAGE
  INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
  INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
  WHERE {WATERS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
    INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
`;

  const sentence = `DELETE LAAGER_DAILY_HISTORY_USAGE FROM LAAGER_DAILY_HISTORY_USAGE ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('LAAGER_DAILY_HISTORY_USAGE', sentence, qPars, operationLogData);
    dbLogger('LAAGER_DAILY_HISTORY_USAGE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {WATERS.CLIENT_ID}
  FROM LAAGER_DAILY_HISTORY_USAGE
  INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
  INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
  INNER JOIN CLUNITS ON (WATERS.UNIT_ID = CLUNITS.UNIT_ID)
  WHERE {WATERS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const join = ` 
    INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
    INNER JOIN WATERS ON (LAAGER.WATER_ID = WATERS.ID)
    INNER JOIN CLUNITS ON (WATERS.UNIT_ID = CLUNITS.UNIT_ID)
`;

  const sentence = `DELETE LAAGER_DAILY_HISTORY_USAGE FROM LAAGER_DAILY_HISTORY_USAGE ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;
  
  if (operationLogData) {
    await saveOperationLog('LAAGER_DAILY_HISTORY_USAGE', sentence, qPars, operationLogData);
    dbLogger('LAAGER_DAILY_HISTORY_USAGE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getLaagerHistoryList (qPars: { LAAGER_CODE: string, FILTER_BY_HISTORY_DATE: string }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE,
      LAAGER_DAILY_HISTORY_USAGE.READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.READING,
      LAAGER_DAILY_HISTORY_USAGE.USAGE_AT_READING_TIME,
      LAAGER_DAILY_HISTORY_USAGE.ESTIMATED_USAGE
  `
  sentence += `
    FROM
      LAAGER_DAILY_HISTORY_USAGE
    INNER JOIN LAAGER ON (LAAGER_DAILY_HISTORY_USAGE.LAAGER_ID = LAAGER.ID)
    WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE AND LAAGER_DAILY_HISTORY_USAGE.HISTORY_DATE = :FILTER_BY_HISTORY_DATE
  `
  return sqldb.query<{
    LAAGER_CODE: string
    HISTORY_DATE: string
    READING_TIME: string
    READING: number,
    USAGE_AT_READING_TIME: number,
    ESTIMATED_USAGE: boolean
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteBaselineValuesInfo = DELETE
  PARAM UNIT_ID: {BASELINE_VALUES.BASELINE_VALUE_ID}
  FROM BASELINE_VALUES
  WHERE {BASELINE_VALUES.BASELINE_VALUE_ID} = {:BASELINE_VALUE_ID}
*/
export async function w_deleteBaselineValuesInfo (qPars: { BASELINE_VALUE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM BASELINE_VALUES WHERE BASELINE_VALUES.BASELINE_VALUE_ID = :BASELINE_VALUE_ID`;

  if (operationLogData) {
    await saveOperationLog('BASELINE_VALUES', sentence, qPars, operationLogData);
    dbLogger('BASELINE_VALUES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM BASELINE_VALUES

  FIELD BASELINE_VALUES.BASELINE_TEMPLATE_DESCRIPTION
  FIELD BASELINE_VALUES.BASELINE_TEMPLATE_TAG
*/
export async function w_insert (qPars: { BASELINE_ID: number, BASELINE_MONTH: number, BASELINE_PRICE: number, BASELINE_KWH: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('BASELINE_ID')
  fields.push('BASELINE_MONTH')
  fields.push('BASELINE_PRICE')
  fields.push('BASELINE_KWH')

  const sentence = `INSERT INTO BASELINE_VALUES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('BASELINE_VALUES', sentence, qPars, operationLogData);
    dbLogger('BASELINE_VALUES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitBaselineValues = SELECT LIST
  PARAM BASELINE_ID: {BASELINES.BASELINE_ID}

  FROM BASELINE_VALUES

  SELECT BASELINE_VALUES.BASELINE_VALUE_ID
  SELECT BASELINE_VALUES.BASELINE_ID
  SELECT BASELINE_VALUES.BASELINE_MONTH
  SELECT BASELINE_VALUES.BASELINE_PRICE
  SELECT BASELINE_VALUES.BASELINE_KWH
*/
export function getUnitBaselineValues (qPars: { BASELINE_ID: number}) {
  let sentence = `
    SELECT
      BASELINE_VALUES.BASELINE_VALUE_ID,
      BASELINE_VALUES.BASELINE_ID,
      BASELINE_VALUES.BASELINE_MONTH,
      BASELINE_VALUES.BASELINE_PRICE,
      BASELINE_VALUES.BASELINE_KWH
  `
  sentence += `
    FROM
        BASELINE_VALUES
  `

  const conditions: string[] = []
  if (qPars.BASELINE_ID) { conditions.push(`BASELINE_VALUES.BASELINE_ID = :BASELINE_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    BASELINE_VALUE_ID: number
    BASELINE_ID: number
    BASELINE_MONTH: number
    BASELINE_PRICE: number
    BASELINE_KWH: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitBaselineValues = SELECT LIST
  PARAM BASELINE_ID: {BASELINES.BASELINE_ID}

  FROM BASELINE_VALUES

  SELECT BASELINE_VALUES.BASELINE_VALUE_ID
  SELECT BASELINE_VALUES.BASELINE_ID
  SELECT BASELINE_VALUES.BASELINE_MONTH
  SELECT BASELINE_VALUES.BASELINE_PRICE
  SELECT BASELINE_VALUES.BASELINE_KWH
*/
export function getUnitBaselineValueInfo (qPars: { BASELINE_ID: number, BASELINE_MONTH: number}) {
    let sentence = `
      SELECT
        BASELINE_VALUES.BASELINE_VALUE_ID,
        BASELINE_VALUES.BASELINE_ID,
        BASELINE_VALUES.BASELINE_MONTH,
        BASELINE_VALUES.BASELINE_PRICE,
        BASELINE_VALUES.BASELINE_KWH
    `
    sentence += `
      FROM
          BASELINE_VALUES
    `
  
    const conditions: string[] = []
    if (qPars.BASELINE_ID) { conditions.push(`BASELINE_VALUES.BASELINE_ID = :BASELINE_ID`) }
    if (qPars.BASELINE_MONTH) { conditions.push(`BASELINE_VALUES.BASELINE_MONTH = :BASELINE_MONTH`) }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
    return sqldb.querySingle<{
      BASELINE_VALUE_ID: number
      BASELINE_ID: number
      BASELINE_MONTH: number
      BASELINE_PRICE: number
      BASELINE_KWH: number
    }>(sentence, qPars)
  }

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM BASELINE_VALUES
  PARAM BASELINE_VALUE_ID: {BASELINE_VALUES.BASELINE_VALUE_ID}
  FIELD [[IFOWNPROP {:BASELINE_ID}]] BASELINE_VALUES.BASELINE_ID
  FIELD [[IFOWNPROP {:BASELINE_MONTH}]] BASELINE_VALUES.BASELINE_MONTH
  FIELD [[IFOWNPROP {:BASELINE_PRICE}]] BASELINE_VALUES.BASELINE_PRICE
  FIELD [[IFOWNPROP {:BASELINE_KWH}]] BASELINE_VALUES.BASELINE_KWH
*/
export async function w_updateInfo (
  qPars: { BASELINE_VALUE_ID?: number, BASELINE_ID?: number, BASELINE_MONTH?: number, BASELINE_PRICE?: number, BASELINE_KWH?: number }, operationLogData: OperationLogData
) {
  const fields: string[] = []
  if (qPars.BASELINE_PRICE !== undefined) { fields.push('BASELINE_PRICE = :BASELINE_PRICE') }
  if (qPars.BASELINE_KWH !== undefined) { fields.push('BASELINE_KWH = :BASELINE_KWH') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const conditions: string[] = []
  if (qPars.BASELINE_ID) { conditions.push(`BASELINE_VALUES.BASELINE_ID = :BASELINE_ID`) }
  if (qPars.BASELINE_MONTH) { conditions.push(`BASELINE_VALUES.BASELINE_MONTH = :BASELINE_MONTH`) }
  if (qPars.BASELINE_VALUE_ID) { conditions.push(`BASELINE_VALUES.BASELINE_VALUE_ID = :BASELINE_VALUE_ID`) }
  if (!conditions.length) throw Error('No params to where on update').HttpStatus(500).DebugInfo({ qPars })

  let sentence = `UPDATE BASELINE_VALUES SET ${fields.join(', ')}`

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  if (operationLogData) {
    await saveOperationLog('BASELINE_VALUES', sentence, qPars, operationLogData);
    dbLogger('BASELINE_VALUES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  

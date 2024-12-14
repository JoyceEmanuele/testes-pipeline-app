import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC setClassUnits = INSERT
  FROM UNITCLASSES

  FIELD UNITCLASSES.UNIT_ID
  FIELD UNITCLASSES.CLASS_ID
*/
export async function w_setClassUnits (qPars: { UNIT_ID: number, CLASS_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('CLASS_ID')

  const sentence = `INSERT INTO UNITCLASSES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('UNITCLASSES', sentence, qPars, operationLogData);
    dbLogger('UNITCLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getClassUnits = SELECT LIST
  PARAM CLASS_ID: {UNITCLASSES.CLASS_ID}
  FROM UNITCLASSES
  INNER JOIN (UNITCLASSES.UNIT_ID = CLUNITS.UNIT_ID)
  SELECT CLUNITS.CLIENT_ID
  SELECT UNITCLASSES.CLASS_ID
  SELECT UNITCLASSES.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  WHERE {UNITCLASSES.CLASS_ID} = {:CLASS_ID}
*/
export function getClassUnits (qPars: { CLASS_ID: number, CLIENT_ID: number, UNIT_IDS?: number[] }) {
  let sentence = `
    SELECT
      CLUNITS.CLIENT_ID,
      UNITCLASSES.CLASS_ID,
      UNITCLASSES.UNIT_ID,
      CLUNITS.UNIT_NAME
  `
  sentence += `
    FROM
      UNITCLASSES
      INNER JOIN CLUNITS ON (UNITCLASSES.UNIT_ID = CLUNITS.UNIT_ID)
  `

  const conditions: string[] = []
  conditions.push(`UNITCLASSES.CLASS_ID = :CLASS_ID`)
  conditions.push(`CLUNITS.CLIENT_ID = :CLIENT_ID`)
  if (qPars.UNIT_IDS !== undefined) { conditions.push(`UNITCLASSES.UNIT_ID IN (:UNIT_IDS)`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    CLIENT_ID: number
    CLASS_ID: number
    UNIT_ID: number
    UNIT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC clearClassUnits = DELETE
  PARAM CLASS_ID: {UNITCLASSES.CLASS_ID}
  FROM UNITCLASSES
  WHERE {UNITCLASSES.CLASS_ID} = {:CLASS_ID}
*/
export async function w_clearClassUnits (qPars: { CLASS_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITCLASSES WHERE UNITCLASSES.CLASS_ID = :CLASS_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITCLASSES', sentence, qPars, operationLogData);
    dbLogger('UNITCLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeFromClient = DELETE
  PARAM CLIENT_ID: {CLASSES.CLIENT_ID}
  FROM UNITCLASSES
  INNER JOIN (CLUNITS.UNIT_ID = UNITCLASSES.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_removeFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = UNITCLASSES.UNIT_ID)";

  const sentence = `DELETE UNITCLASSES FROM UNITCLASSES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITCLASSES', sentence, qPars, operationLogData);
    dbLogger('UNITCLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeFromUnit = DELETE
  PARAM UNIT_ID: {UNITCLASSES.UNIT_ID}
  FROM UNITCLASSES
  WHERE {UNITCLASSES.UNIT_ID} = {:UNIT_ID}
*/
export async function w_removeFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITCLASSES WHERE UNITCLASSES.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITCLASSES', sentence, qPars, operationLogData);
    dbLogger('UNITCLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

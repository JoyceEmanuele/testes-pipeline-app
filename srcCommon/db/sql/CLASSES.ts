import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addClientClass = INSERT
  FROM CLASSES

  FIELD CLASSES.CLASS_TYPE
  FIELD CLASSES.CLASS_NAME
  FIELD CLASSES.CLIENT_ID
*/
export async function w_addClientClass (qPars: { CLASS_TYPE: string, CLASS_NAME: string, CLIENT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLASS_TYPE')
  fields.push('CLASS_NAME')
  fields.push('CLIENT_ID')

  const sentence = `INSERT INTO CLASSES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CLASSES', sentence, qPars, operationLogData);
    dbLogger('CLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getClientClasses = SELECT LIST
  PARAM CLIENT_ID: {CLASSES.CLIENT_ID}
  FROM CLASSES
  SELECT CLASSES.CLASS_ID
  SELECT CLASSES.CLASS_TYPE
  SELECT CLASSES.CLASS_NAME
  WHERE {CLASSES.CLIENT_ID} = {:CLIENT_ID}
*/
export function getClientClasses (qPars: { CLIENT_ID: number }) {
  let sentence = `
    SELECT
      CLASSES.CLASS_ID,
      CLASSES.CLASS_TYPE,
      CLASSES.CLASS_NAME
  `
  sentence += `
    FROM
      CLASSES
  `

  sentence += ` WHERE CLASSES.CLIENT_ID = :CLIENT_ID `

  return sqldb.query<{
    CLASS_ID: number
    CLASS_TYPE: string
    CLASS_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getClientClass = SELECT ROW
  PARAM CLASS_ID: {CLASSES.CLASS_ID}
  PARAM CLIENT_ID: {CLASSES.CLIENT_ID}
  FROM CLASSES
  SELECT CLASSES.CLASS_ID
  SELECT CLASSES.CLASS_TYPE
  SELECT CLASSES.CLASS_NAME
  WHERE {CLASSES.CLASS_ID} = {:CLASS_ID}
  WHERE {CLASSES.CLIENT_ID} = {:CLIENT_ID}
*/
export function getClientClass (qPars: { CLASS_ID: number, CLIENT_ID: number }) {
  let sentence = `
    SELECT
    CLASSES.CLASS_ID,
    CLASSES.CLASS_TYPE,
    CLASSES.CLASS_NAME,
    CLASSES.CLIENT_ID
  `
  sentence += `
    FROM
      CLASSES
  `

  sentence += ` WHERE CLASSES.CLASS_ID = :CLASS_ID AND CLASSES.CLIENT_ID = :CLIENT_ID `

  return sqldb.querySingle<{
    CLASS_ID: number
    CLASS_TYPE: string
    CLASS_NAME: string
    CLIENT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getAllClasses = SELECT LIST
  PARAM CLIENT_IDS?: {CLASSES.CLIENT_ID}[]
  FROM CLASSES
  INNER JOIN (CLASSES.CLIENT_ID = CLIENTS.CLIENT_ID)
  SELECT CLASSES.CLIENT_ID
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLASSES.CLASS_ID
  SELECT CLASSES.CLASS_TYPE
  SELECT CLASSES.CLASS_NAME
  WHERE [[IFJS {:CLIENT_IDS} && {:CLIENT_IDS}.length > 0]] {CLASSES.CLIENT_ID} IN ({:CLIENT_IDS})
*/
export function getAllClasses (qPars: { CLIENT_IDS?: number[] }) {
  let sentence = `
    SELECT
      CLASSES.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME,
      CLASSES.CLASS_ID,
      CLASSES.CLASS_TYPE,
      CLASSES.CLASS_NAME
  `
  sentence += `
    FROM
      CLASSES
      INNER JOIN CLIENTS ON (CLASSES.CLIENT_ID = CLIENTS.CLIENT_ID)
  `

  if (qPars.CLIENT_IDS && qPars.CLIENT_IDS.length > 0) { sentence += ` WHERE CLASSES.CLIENT_ID IN (:CLIENT_IDS) ` }

  return sqldb.query<{
    CLIENT_ID: number
    CLIENT_NAME: string
    CLASS_ID: number
    CLASS_TYPE: string
    CLASS_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC updateClientClass = UPDATE
  PARAM CLASS_ID: {CLASSES.CLASS_ID}

  FROM CLASSES

  FIELD [[IFOWNPROP {:CLASS_TYPE}]] CLASSES.CLASS_TYPE
  FIELD [[IFOWNPROP {:CLASS_NAME}]] CLASSES.CLASS_NAME
*/
export async function w_updateClientClass (qPars: { CLASS_ID: number, CLASS_TYPE?: string, CLASS_NAME?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.CLASS_TYPE !== undefined) { fields.push('CLASS_TYPE = :CLASS_TYPE') }
  if (qPars.CLASS_NAME !== undefined) { fields.push('CLASS_NAME = :CLASS_NAME') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE CLASSES SET ${fields.join(', ')} WHERE CLASS_ID = :CLASS_ID`

  if (operationLogData) {
    await saveOperationLog('CLASSES', sentence, qPars, operationLogData);
    dbLogger('CLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeClientClass = DELETE
  PARAM CLIENT_ID: {CLASSES.CLIENT_ID}
  PARAM CLASS_ID: {CLASSES.CLASS_ID}
  FROM CLASSES
  WHERE {CLASSES.CLASS_ID} = {:CLASS_ID}
  WHERE {CLASSES.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_removeClientClass (qPars: { CLIENT_ID: number, CLASS_ID: number }, delChecks: {
  UNITCLASSES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CLASSES WHERE CLASSES.CLASS_ID = :CLASS_ID AND CLASSES.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('CLASSES', sentence, qPars, operationLogData);
    dbLogger('CLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeFromClient = DELETE
  PARAM CLIENT_ID: {CLASSES.CLIENT_ID}
  FROM CLASSES
  WHERE {CLASSES.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_removeFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  UNITCLASSES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CLASSES WHERE CLASSES.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('CLASSES', sentence, qPars, operationLogData);
    dbLogger('CLASSES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

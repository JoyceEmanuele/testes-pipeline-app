import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM IDSTART: {MANUFACT_DEVS.IDSTART}
  PARAM IDEND: {MANUFACT_DEVS.IDEND}
  FROM MANUFACT_DEVS
  WHERE ({MANUFACT_DEVS.IDSTART} = {:IDSTART}) AND ({MANUFACT_DEVS.IDEND} = {:IDEND})
*/
export async function w_deleteRow (qPars: { IDSTART: string, IDEND: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MANUFACT_DEVS WHERE (MANUFACT_DEVS.IDSTART = :IDSTART) AND (MANUFACT_DEVS.IDEND = :IDEND)`;

  if (operationLogData) {
    await saveOperationLog('MANUFACT_DEVS', sentence, qPars, operationLogData);
    dbLogger('MANUFACT_DEVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {MANUFACT_DEVS.CLIENT_ID}
  FROM MANUFACT_DEVS
  WHERE {MANUFACT_DEVS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MANUFACT_DEVS WHERE MANUFACT_DEVS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('MANUFACT_DEVS', sentence, qPars, operationLogData);
    dbLogger('MANUFACT_DEVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM MANUFACT_DEVS
  FIELD MANUFACT_DEVS.IDSTART
  FIELD MANUFACT_DEVS.IDEND
  FIELD MANUFACT_DEVS.CLIENT_ID
*/
export async function w_insert (qPars: { IDSTART: string, IDEND: string, CLIENT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('IDSTART')
  fields.push('IDEND')
  fields.push('CLIENT_ID')

  const sentence = `INSERT INTO MANUFACT_DEVS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('MANUFACT_DEVS', sentence, qPars, operationLogData);
    dbLogger('MANUFACT_DEVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM MANUFACT_DEVS
  LEFT JOIN(CLIENTS.CLIENT_ID = MANUFACT_DEVS.CLIENT_ID)
  SELECT MANUFACT_DEVS.IDSTART
  SELECT MANUFACT_DEVS.IDEND
  SELECT MANUFACT_DEVS.CLIENT_ID
  SELECT CLIENTS.NAME AS CLIENT_NAME
*/
export function getList () {
  let sentence = `
    SELECT
      MANUFACT_DEVS.IDSTART,
      MANUFACT_DEVS.IDEND,
      MANUFACT_DEVS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      MANUFACT_DEVS
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = MANUFACT_DEVS.CLIENT_ID)
  `

  return sqldb.query<{
    IDSTART: string
    IDEND: string
    CLIENT_ID: number
    CLIENT_NAME: string
  }>(sentence)
}

/* @IFHELPER:FUNC getRelated = SELECT LIST
  PARAM IDSTART: {MANUFACT_DEVS.IDSTART}
  PARAM IDEND: {MANUFACT_DEVS.IDEND}
  FROM MANUFACT_DEVS
  SELECT MANUFACT_DEVS.IDSTART
  SELECT MANUFACT_DEVS.IDEND
  SELECT MANUFACT_DEVS.CLIENT_ID
*/
export function getRelated (qPars: { IDSTART: string, IDEND: string }) {
  let sentence = `
    SELECT
      MANUFACT_DEVS.IDSTART,
      MANUFACT_DEVS.IDEND,
      MANUFACT_DEVS.CLIENT_ID
  `
  sentence += `
    FROM
      MANUFACT_DEVS
  `

  const conditions: string[] = []
  conditions.push(`(:IDSTART >= MANUFACT_DEVS.IDSTART AND :IDSTART <= MANUFACT_DEVS.IDEND)`)
  conditions.push(`(:IDEND >= MANUFACT_DEVS.IDSTART AND :IDEND <= MANUFACT_DEVS.IDEND)`)
  conditions.push(`(MANUFACT_DEVS.IDSTART >= :IDSTART AND MANUFACT_DEVS.IDSTART <= :IDEND)`)
  conditions.push(`(MANUFACT_DEVS.IDEND >= :IDSTART AND MANUFACT_DEVS.IDEND <= :IDEND)`)
  sentence += ' WHERE ' + conditions.join(' OR ')

  return sqldb.query<{
    IDSTART: string
    IDEND: string
    CLIENT_ID: number
    CLIENT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInfo = SELECT ROW
  PARAM DEV_ID: {MANUFACT_DEVS.IDSTART}
  FROM MANUFACT_DEVS
  SELECT MANUFACT_DEVS.IDSTART
  SELECT MANUFACT_DEVS.IDEND
  SELECT MANUFACT_DEVS.CLIENT_ID
  WHERE ({:DEV_ID} >= {MANUFACT_DEVS.IDSTART}) AND ({:DEV_ID} <= {MANUFACT_DEVS.IDEND})
*/
export function getInfo (qPars: { DEV_ID: string }) {
  let sentence = `
    SELECT
      MANUFACT_DEVS.IDSTART,
      MANUFACT_DEVS.IDEND,
      MANUFACT_DEVS.CLIENT_ID
  `
  sentence += `
    FROM
      MANUFACT_DEVS
  `

  sentence += ` WHERE (:DEV_ID >= MANUFACT_DEVS.IDSTART) AND (:DEV_ID <= MANUFACT_DEVS.IDEND) `

  return sqldb.querySingle<{
    IDSTART: string
    IDEND: string
    CLIENT_ID: number
  }>(sentence, qPars)
}

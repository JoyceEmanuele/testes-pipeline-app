import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM USERSCLIENTS

  FIELD USERSCLIENTS.CLIENT_ID
  FIELD USERSCLIENTS.USER_ID
  FIELD USERSCLIENTS.PERMS
  FIELD USERSCLIENTS.UNITS
*/
export async function w_insert (qPars: { CLIENT_ID: number, USER_ID: string, PERMS: string, UNITS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLIENT_ID')
  fields.push('USER_ID')
  fields.push('PERMS')
  fields.push('UNITS')

  const sentence = `INSERT INTO USERSCLIENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('USERSCLIENTS', sentence, qPars, operationLogData);
    dbLogger('USERSCLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM userId?: {USERSCLIENTS.USER_ID}
  PARAM clientIds?: {USERSCLIENTS.CLIENT_ID}[]
  PARAM+ includeClientName?: boolean
  FROM USERSCLIENTS
  INNER JOIN (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  SELECT USERSCLIENTS.USER_ID
  SELECT USERSCLIENTS.CLIENT_ID
  SELECT USERSCLIENTS.PERMS
  SELECT [[IFJS {::includeClientName}]] CLIENTS.NAME AS CLIENT_NAME
  WHERE [[IFOWNPROP {:userId}]] {USERSCLIENTS.USER_ID} = {:userId}
  WHERE [[IFJS qPars.clientIds]] {USERSCLIENTS.CLIENT_ID} IN ({:clientIds})
  WHERE {CLIENTS.ENABLED} = '1'
*/
export function getList (qPars: { userId?: string, clientIds?: number[] }, admPars: { includeClientName?: boolean }) {
  let sentence = `
    SELECT
      USERSCLIENTS.USER_ID,
      USERSCLIENTS.CLIENT_ID,
      USERSCLIENTS.PERMS,
      USERSCLIENTS.UNITS
  `
  if (admPars.includeClientName) { sentence += ' ,CLIENTS.NAME AS CLIENT_NAME ' }
  sentence += `
    FROM
      USERSCLIENTS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  if (qPars.userId !== undefined) { conditions.push(`USERSCLIENTS.USER_ID = :userId`) }
  if (qPars.clientIds) { conditions.push(`USERSCLIENTS.CLIENT_ID IN (:clientIds)`) }
  conditions.push(`CLIENTS.ENABLED = '1'`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    USER_ID: string
    CLIENT_ID: number
    PERMS: string
    UNITS: string
    CLIENT_NAME?: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUserClients = SELECT LIST
  PARAM userId: {USERSCLIENTS.USER_ID}
  FROM USERSCLIENTS
  INNER JOIN (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  SELECT USERSCLIENTS.USER_ID
  SELECT USERSCLIENTS.CLIENT_ID
  SELECT USERSCLIENTS.PERMS
  SELECT USERSCLIENTS.UNITS
  SELECT CLIENTS.ENABLED
  SELECT CLIENTS.PERMS_C
  WHERE {USERSCLIENTS.USER_ID} = {:userId}
  WHERE {CLIENTS.ENABLED} = '1'
*/
export function getUserClients (qPars: { userId: string }) {
  let sentence = `
    SELECT
      USERSCLIENTS.USER_ID,
      USERSCLIENTS.CLIENT_ID,
      USERSCLIENTS.PERMS,
      USERSCLIENTS.UNITS,
      CLIENTS.ENABLED,
      CLIENTS.PERMS_C
  `
  sentence += `
    FROM
      USERSCLIENTS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  conditions.push(`USERSCLIENTS.USER_ID = :userId`)
  conditions.push(`CLIENTS.ENABLED = '1'`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    USER_ID: string
    CLIENT_ID: number
    PERMS: string
    UNITS: string
    ENABLED: string
    PERMS_C: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getClientUsers = SELECT LIST
  PARAM clientIds: {USERSCLIENTS.CLIENT_ID}[]
  FROM USERSCLIENTS
  SELECT USERSCLIENTS.USER_ID
  SELECT USERSCLIENTS.CLIENT_ID
  SELECT USERSCLIENTS.PERMS
  WHERE {USERSCLIENTS.CLIENT_ID} IN ({:clientIds})
*/
export function getClientUsers (qPars: { clientIds: number[] }) {
  let sentence = `
    SELECT
      USERSCLIENTS.USER_ID,
      USERSCLIENTS.CLIENT_ID,
      USERSCLIENTS.PERMS
  `
  sentence += `
    FROM
      USERSCLIENTS
  `

  sentence += ` WHERE USERSCLIENTS.CLIENT_ID IN (:clientIds) `

  return sqldb.query<{
    USER_ID: string
    CLIENT_ID: number
    PERMS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC removeFromClient = DELETE
  PARAM CLIENT_ID: {USERSCLIENTS.CLIENT_ID}
  FROM USERSCLIENTS
  WHERE {USERSCLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_removeFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSCLIENTS WHERE USERSCLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('USERSCLIENTS', sentence, qPars, operationLogData);
    dbLogger('USERSCLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeFromUser = DELETE
  PARAM USER_ID: {USERSCLIENTS.USER_ID}
  FROM USERSCLIENTS
  WHERE {USERSCLIENTS.USER_ID} = {:USER_ID}
*/
export async function w_removeFromUser (qPars: { USER_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSCLIENTS WHERE USERSCLIENTS.USER_ID = :USER_ID`;

  if (operationLogData) {
    await saveOperationLog('USERSCLIENTS', sentence, qPars, operationLogData);
    dbLogger('USERSCLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeRow = DELETE
  PARAM USER_ID: {USERSCLIENTS.USER_ID}
  PARAM CLIENT_ID: {USERSCLIENTS.CLIENT_ID}
  FROM USERSCLIENTS
  WHERE {USERSCLIENTS.USER_ID} = {:USER_ID} AND {USERSCLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_removeRow (qPars: { USER_ID: string, CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSCLIENTS WHERE USERSCLIENTS.USER_ID = :USER_ID AND USERSCLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('USERSCLIENTS', sentence, qPars, operationLogData);
    dbLogger('USERSCLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

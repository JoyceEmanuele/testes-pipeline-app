import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ROOM_ID: {ROOMS.ROOM_ID}
  FROM ROOMS
  WHERE {ROOMS.ROOM_ID} = {:ROOM_ID}
*/
export async function w_deleteRow (qPars: { ROOM_ID: number }, delChecks: {
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ROOMS WHERE ROOMS.ROOM_ID = :ROOM_ID`;

  if (operationLogData) {
    await saveOperationLog('ROOMS', sentence, qPars, operationLogData);
    dbLogger('ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {ROOMS.UNIT_ID}
  FROM ROOMS
  WHERE {ROOMS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, delChecks: {
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ROOMS WHERE ROOMS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ROOMS', sentence, qPars, operationLogData);
    dbLogger('ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {ROOMS.CLIENT_ID}
  FROM ROOMS
  WHERE {ROOMS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ROOMS WHERE ROOMS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ROOMS', sentence, qPars, operationLogData);
    dbLogger('ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ROOMS

  FIELD ROOMS.CLIENT_ID
  FIELD ROOMS.UNIT_ID
  FIELD [[IFOWNPROP {:ROOM_NAME}]] ROOMS.ROOM_NAME
  FIELD [[IFOWNPROP {:ROOM_PROGS}]] ROOMS.ROOM_PROGS
*/
export async function w_insert (qPars: { CLIENT_ID: number, UNIT_ID: number, ROOM_NAME?: string, ROOM_PROGS?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLIENT_ID')
  fields.push('UNIT_ID')
  if (qPars.ROOM_NAME !== undefined) { fields.push('ROOM_NAME') }
  if (qPars.ROOM_PROGS !== undefined) { fields.push('ROOM_PROGS') }

  const sentence = `INSERT INTO ROOMS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ROOMS', sentence, qPars, operationLogData);
    dbLogger('ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM ROOM_ID: {ROOMS.ROOM_ID}

  FROM ROOMS

  FIELD [[IFOWNPROP {:ROOM_NAME}]] ROOMS.ROOM_NAME
  FIELD [[IFOWNPROP {:ROOM_PROGS}]] ROOMS.ROOM_PROGS
*/
export async function w_update (qPars: { ROOM_ID: number, ROOM_NAME?: string, ROOM_PROGS?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.ROOM_NAME !== undefined) { fields.push('ROOM_NAME = :ROOM_NAME') }
  if (qPars.ROOM_PROGS !== undefined) { fields.push('ROOM_PROGS = :ROOM_PROGS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ROOMS SET ${fields.join(', ')} WHERE ROOM_ID = :ROOM_ID`

  if (operationLogData) {
    await saveOperationLog('ROOMS', sentence, qPars, operationLogData);
    dbLogger('ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getRoomsList = SELECT LIST
  PARAM clientIds?: {ROOMS.CLIENT_ID}[]
  PARAM unitIds?: {ROOMS.UNIT_ID}[]

  FROM ROOMS

  SELECT ROOMS.ROOM_ID
  SELECT ROOMS.ROOM_NAME
  SELECT ROOMS.CLIENT_ID
  SELECT ROOMS.UNIT_ID

  WHERE [[IFJS {:clientIds}]] {ROOMS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {ROOMS.UNIT_ID} IN ({:unitIds})
*/
export function getRoomsList (qPars: { clientIds?: number[], unitIds?: number[] }) {
  let sentence = `
    SELECT
      ROOMS.ROOM_ID,
      ROOMS.ROOM_NAME,
      ROOMS.CLIENT_ID,
      ROOMS.UNIT_ID
  `
  sentence += `
    FROM
      ROOMS
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`ROOMS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`ROOMS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    ROOM_ID: number
    ROOM_NAME: string
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getRoomInfo = SELECT ROW
  PARAM ROOM_ID: {ROOMS.ROOM_ID}
  PARAM CLIENT_ID?: {ROOMS.CLIENT_ID}

  FROM ROOMS

  SELECT ROOMS.ROOM_NAME
  SELECT ROOMS.ROOM_ID
  SELECT ROOMS.CLIENT_ID
  SELECT ROOMS.UNIT_ID
  SELECT ROOMS.ROOM_PROGS

  WHERE {ROOMS.ROOM_ID} = {:ROOM_ID}
  WHERE [[IFJS qPars.CLIENT_ID != null]] {ROOMS.CLIENT_ID} = {:CLIENT_ID}
*/
export function getRoomInfo (qPars: { ROOM_ID: number, CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      ROOMS.ROOM_NAME,
      ROOMS.ROOM_ID,
      ROOMS.CLIENT_ID,
      ROOMS.UNIT_ID,
      ROOMS.ROOM_PROGS
  `
  sentence += `
    FROM
      ROOMS
  `

  const conditions: string[] = []
  conditions.push(`ROOMS.ROOM_ID = :ROOM_ID`)
  if (qPars.CLIENT_ID != null) { conditions.push(`ROOMS.CLIENT_ID = :CLIENT_ID`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    ROOM_NAME: string
    ROOM_ID: number
    CLIENT_ID: number
    UNIT_ID: number
    ROOM_PROGS: string
  }>(sentence, qPars)
}

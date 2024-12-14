import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM RTYPE_ID: {ROOMTYPES.RTYPE_ID}
  FROM ROOMTYPES
  WHERE {ROOMTYPES.RTYPE_ID} = {:RTYPE_ID}
*/
export async function w_deleteRow (qPars: { RTYPE_ID: number }, delChecks: {
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ROOMTYPES WHERE ROOMTYPES.RTYPE_ID = :RTYPE_ID`;

  if (operationLogData) {
    await saveOperationLog('ROOMTYPES', sentence, qPars, operationLogData);
    dbLogger('ROOMTYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {ROOMTYPES.CLIENT_ID}
  FROM ROOMTYPES
  WHERE {ROOMTYPES.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ROOMTYPES WHERE ROOMTYPES.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ROOMTYPES', sentence, qPars, operationLogData);
    dbLogger('ROOMTYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ROOMTYPES

  FIELD ROOMTYPES.CLIENT_ID
  FIELD [[IFOWNPROP {:RTYPE_NAME}]] ROOMTYPES.RTYPE_NAME
  FIELD [[IFOWNPROP {:TUSEMIN}]] ROOMTYPES.TUSEMIN
  FIELD [[IFOWNPROP {:TUSEMAX}]] ROOMTYPES.TUSEMAX
  FIELD [[IFOWNPROP {:USEPERIOD}]] ROOMTYPES.USEPERIOD
  FIELD [[IFOWNPROP {:CO2MAX}]] ROOMTYPES.CO2MAX
*/
export async function w_insert (qPars: {
  CLIENT_ID: number,
  RTYPE_NAME?: string,
  TUSEMIN?: number,
  TUSEMAX?: number,
  USEPERIOD?: string,
  CO2MAX?: number,
  HUMIMAX?: number,
  HUMIMIN?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLIENT_ID')
  if (qPars.RTYPE_NAME !== undefined) { fields.push('RTYPE_NAME') }
  if (qPars.TUSEMIN !== undefined) { fields.push('TUSEMIN') }
  if (qPars.TUSEMAX !== undefined) { fields.push('TUSEMAX') }
  if (qPars.HUMIMIN !== undefined) { fields.push('HUMIMIN') }
  if (qPars.HUMIMAX !== undefined) { fields.push('HUMIMAX') }
  if (qPars.USEPERIOD !== undefined) { fields.push('USEPERIOD') }
  if (qPars.CO2MAX !== undefined) { fields.push('CO2MAX') }

  const sentence = `INSERT INTO ROOMTYPES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ROOMTYPES', sentence, qPars, operationLogData);
    dbLogger('ROOMTYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM RTYPE_ID: {ROOMTYPES.RTYPE_ID}

  FROM ROOMTYPES

  FIELD [[IFOWNPROP {:RTYPE_NAME}]] ROOMTYPES.RTYPE_NAME
  FIELD [[IFOWNPROP {:TUSEMIN}]] ROOMTYPES.TUSEMIN
  FIELD [[IFOWNPROP {:TUSEMAX}]] ROOMTYPES.TUSEMAX
  FIELD [[IFOWNPROP {:USEPERIOD}]] ROOMTYPES.USEPERIOD
  FIELD [[IFOWNPROP {:CO2MAX}]] ROOMTYPES.CO2MAX
*/
export async function w_update (qPars: {
  RTYPE_ID: number,
  RTYPE_NAME?: string,
  TUSEMIN?: number,
  TUSEMAX?: number,
  HUMIMAX?: number,
  HUMIMIN?: number,
  USEPERIOD?: string,
  CO2MAX?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.RTYPE_NAME !== undefined) { fields.push('RTYPE_NAME = :RTYPE_NAME') }
  if (qPars.TUSEMIN !== undefined) { fields.push('TUSEMIN = :TUSEMIN') }
  if (qPars.TUSEMAX !== undefined) { fields.push('TUSEMAX = :TUSEMAX') }
  if (qPars.HUMIMIN !== undefined) { fields.push('HUMIMIN = :HUMIMIN') }
  if (qPars.HUMIMAX !== undefined) { fields.push('HUMIMAX = :HUMIMAX') }
  if (qPars.USEPERIOD !== undefined) { fields.push('USEPERIOD = :USEPERIOD') }
  if (qPars.CO2MAX !== undefined) { fields.push('CO2MAX = :CO2MAX') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ROOMTYPES SET ${fields.join(', ')} WHERE RTYPE_ID = :RTYPE_ID`

  if (operationLogData) {
    await saveOperationLog('ROOMTYPES', sentence, qPars, operationLogData);
    dbLogger('ROOMTYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getRoomTypesList = SELECT LIST
  PARAM CLIENT_ID?: {ROOMTYPES.CLIENT_ID}

  FROM ROOMTYPES

  SELECT ROOMTYPES.RTYPE_ID
  SELECT ROOMTYPES.RTYPE_NAME
  SELECT ROOMTYPES.CLIENT_ID
  SELECT ROOMTYPES.TUSEMIN
  SELECT ROOMTYPES.TUSEMAX
  SELECT ROOMTYPES.USEPERIOD
  SELECT ROOMTYPES.CO2MAX

  WHERE [[IFJS qPars.CLIENT_ID != null]] {ROOMTYPES.CLIENT_ID} = {:CLIENT_ID}
*/
export function  getRoomTypesList (qPars: { CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      ROOMTYPES.RTYPE_ID,
      ROOMTYPES.RTYPE_NAME,
      ROOMTYPES.CLIENT_ID,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX,
      ROOMTYPES.USEPERIOD,
      ROOMTYPES.CO2MAX,
      ROOMTYPES.HUMIMAX,
      ROOMTYPES.HUMIMIN
  `
  sentence += `
    FROM
      ROOMTYPES
  `

  if (qPars.CLIENT_ID != null) { sentence += ` WHERE ROOMTYPES.CLIENT_ID = :CLIENT_ID ` }

  return sqldb.query<{
    RTYPE_ID: number
    RTYPE_NAME: string
    CLIENT_ID: number
    TUSEMIN: number
    TUSEMAX: number
    USEPERIOD: string
    CO2MAX: number
    HUMIMAX: number
    HUMIMIN: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getRoomTypeInfo = SELECT ROW
  PARAM RTYPE_ID: {ROOMTYPES.RTYPE_ID}
  PARAM CLIENT_ID?: {ROOMTYPES.CLIENT_ID}

  FROM ROOMTYPES

  SELECT ROOMTYPES.RTYPE_NAME
  SELECT ROOMTYPES.RTYPE_ID
  SELECT ROOMTYPES.CLIENT_ID
  SELECT ROOMTYPES.TUSEMIN
  SELECT ROOMTYPES.TUSEMAX
  SELECT ROOMTYPES.USEPERIOD
  SELECT ROOMTYPES.CO2MAX

  WHERE {ROOMTYPES.RTYPE_ID} = {:RTYPE_ID}
  WHERE [[IFJS qPars.CLIENT_ID != null]] {ROOMTYPES.CLIENT_ID} = {:CLIENT_ID}
*/
export function getRoomTypeInfo (qPars: { RTYPE_ID: number, CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      ROOMTYPES.RTYPE_NAME,
      ROOMTYPES.RTYPE_ID,
      ROOMTYPES.CLIENT_ID,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX,
      ROOMTYPES.USEPERIOD,
      ROOMTYPES.CO2MAX,
      ROOMTYPES.HUMIMAX,
      ROOMTYPES.HUMIMIN
  `
  sentence += `
    FROM
      ROOMTYPES
  `

  const conditions: string[] = []
  conditions.push(`ROOMTYPES.RTYPE_ID = :RTYPE_ID`)
  if (qPars.CLIENT_ID != null) { conditions.push(`ROOMTYPES.CLIENT_ID = :CLIENT_ID`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    RTYPE_NAME: string
    RTYPE_ID: number
    CLIENT_ID: number
    TUSEMIN: number
    TUSEMAX: number
    USEPERIOD: string
    CO2MAX: number
    HUMIMAX: number
    HUMIMIN: number
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteAccessDistributorsInfo = DELETE
  PARAM UNIT_ID: {ACCESS_DISTRIBUTORS.UNIT_ID}
  FROM ACCESS_DISTRIBUTORS
  WHERE {ACCESS_DISTRIBUTORS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteAccessDistributorsInfo (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ACCESS_DISTRIBUTORS WHERE ACCESS_DISTRIBUTORS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    dbLogger('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData)
    await saveOperationLog('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ACCESS_DISTRIBUTORS

  FIELD ACCESS_DISTRIBUTORS.UNIT_ID
  FIELD ACCESS_DISTRIBUTORS.CONSUMER_UNIT
  FIELD ACCESS_DISTRIBUTORS.LOGIN
  FIELD ACCESS_DISTRIBUTORS.PASSWORD
  FIELD ACCESS_DISTRIBUTORS.LOGIN_EXTRA
  FIELD ACCESS_DISTRIBUTORS.STATUS
  FIELD ACCESS_DISTRIBUTORS.STATUS_UPDATED_DATE  
  FIELD ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD 
*/

export async function w_insert (qPars: { UNIT_ID: number, DISTRIBUTOR_ID: number, ADDITIONAL_DISTRIBUTOR_INFO?: string, CONSUMER_UNIT?: string, LOGIN: string, PASSWORD: string, LOGIN_EXTRA?: string, STATUS: string, STATUS_UPDATED_DATE: string, ENCRYPTED_PASSWORD: boolean}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('DISTRIBUTOR_ID')
  fields.push('CONSUMER_UNIT')
  fields.push('LOGIN')
  fields.push('PASSWORD')
  fields.push('LOGIN_EXTRA')
  fields.push('STATUS')
  fields.push('STATUS_UPDATED_DATE')
  fields.push('ADDITIONAL_DISTRIBUTOR_INFO')  
  fields.push('ENCRYPTED_PASSWORD')  

  const sentence = `INSERT INTO ACCESS_DISTRIBUTORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    dbLogger('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData)
    await saveOperationLog('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM UNIT_ID: {ACCESS_DISTRIBUTORS.UNIT_ID}

  FROM ACCESS_DISTRIBUTORS
  INNER JOIN (DISTRIBUTORS.DISTRIBUTOR_ID = ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID)

  SELECT ACCESS_DISTRIBUTORS.UNIT_ID
  SELECT ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID  
  SELECT ACCESS_DISTRIBUTORS.CONSUMER_UNIT
  SELECT ACCESS_DISTRIBUTORS.LOGIN
  SELECT ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
  SELECT ACCESS_DISTRIBUTORS.PASSWORD,
  SELECT ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD
  SELECT DISTRIBUTORS.DISTRIBUTOR_TAG
  SELECT DISTRIBUTORS.DISTRIBUTOR_LABEL
  WHERE {ACCESS_DISTRIBUTORS.UNIT_ID} = {:UNIT_ID}
*/
export function getExtraInfo (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      ACCESS_DISTRIBUTORS.UNIT_ID,
      ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID,
      ACCESS_DISTRIBUTORS.ADDITIONAL_DISTRIBUTOR_INFO,
      ACCESS_DISTRIBUTORS.CONSUMER_UNIT,
      ACCESS_DISTRIBUTORS.LOGIN,
      ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
      ACCESS_DISTRIBUTORS.PASSWORD,
      ACCESS_DISTRIBUTORS.STATUS,
      ACCESS_DISTRIBUTORS.STATUS_UPDATED_DATE,
      ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD,
      DISTRIBUTORS.DISTRIBUTOR_TAG,
      DISTRIBUTORS.DISTRIBUTOR_LABEL
  `
  sentence += `
    FROM
      ACCESS_DISTRIBUTORS
      INNER JOIN DISTRIBUTORS ON (DISTRIBUTORS.DISTRIBUTOR_ID = ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID)
  `

  const conditions: string[] = []
  if (qPars.UNIT_ID) { conditions.push(`ACCESS_DISTRIBUTORS.UNIT_ID = :UNIT_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    PASSWORD: string
    STATUS: string
    STATUS_UPDATED_DATE: string
    ENCRYPTED_PASSWORD: boolean
    DISTRIBUTOR_TAG: string
    DISTRIBUTOR_LABEL: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ACCESS_DISTRIBUTORS
  PARAM UNIT_ID: {ACCESS_DISTRIBUTORS.UNIT_ID}
  FIELD [[IFOWNPROP {:DISTRIBUTOR_ID}]] ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID
  FIELD [[IFOWNPROP {:CONSUMER_UNIT}]] ACCESS_DISTRIBUTORS.CONSUMER_UNIT
  FIELD [[IFOWNPROP {:LOGIN}]] ACCESS_DISTRIBUTORS.LOGIN
  FIELD [[IFOWNPROP {:LOGIN_EXTRA}]] ACCESS_DISTRIBUTORS.LOGIN_EXTRA
  FIELD [[IFOWNPROP {:PASSWORD}]] ACCESS_DISTRIBUTORS.PASSWORD
  FIELD [[IFOWNPROP {:ENCRYPTED_PASSWORD}]] ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD
*/
export async function w_updateInfo (qPars: {
  UNIT_ID: number,
  DISTRIBUTOR_ID?: number,
  ADDITIONAL_DISTRIBUTOR_INFO?: string
  LOGIN?: string,
  CONSUMER_UNIT?:string,
  LOGIN_EXTRA?: string, 
  PASSWORD?: string,
  STATUS?:string,
  STATUS_UPDATED_DATE?:string
  ENCRYPTED_PASSWORD?:boolean
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DISTRIBUTOR_ID !== undefined) { fields.push('DISTRIBUTOR_ID = :DISTRIBUTOR_ID') }
  if (qPars.CONSUMER_UNIT !== undefined) { fields.push('CONSUMER_UNIT = :CONSUMER_UNIT') }
  if (qPars.ADDITIONAL_DISTRIBUTOR_INFO !== undefined) { fields.push('ADDITIONAL_DISTRIBUTOR_INFO = :ADDITIONAL_DISTRIBUTOR_INFO') }
  if (qPars.LOGIN !== undefined) { fields.push('LOGIN = :LOGIN') }
  if (qPars.LOGIN_EXTRA !== undefined) { fields.push('LOGIN_EXTRA = :LOGIN_EXTRA') }
  if (qPars.PASSWORD !== undefined) { fields.push('PASSWORD = :PASSWORD') }
  if (qPars.STATUS !== undefined) { fields.push('STATUS = :STATUS') }
  if (qPars.STATUS_UPDATED_DATE !== undefined) { fields.push('STATUS_UPDATED_DATE = :STATUS_UPDATED_DATE') }
  if (qPars.ENCRYPTED_PASSWORD !== undefined) { fields.push('ENCRYPTED_PASSWORD = :ENCRYPTED_PASSWORD') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ACCESS_DISTRIBUTORS SET ${fields.join(', ')} WHERE UNIT_ID = :UNIT_ID`

  if (operationLogData) {
    dbLogger('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData)
    await saveOperationLog('ACCESS_DISTRIBUTORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getInfoNotSend (qPars: { STATUS: string }) {
  let sentence = `
    select * from ACCESS_DISTRIBUTORS ad
  `
  sentence += `  WHERE ad.STATUS <> :STATUS and ad.STATUS <> "Recebido faturas"`

  return sqldb.query<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    PASSWORD: string
    STATUS: string
    STATUS_UPDATED_DATE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM UNIT_ID: {ACCESS_DISTRIBUTORS.UNIT_ID}

  FROM ACCESS_DISTRIBUTORS
  INNER JOIN (DISTRIBUTORS.DISTRIBUTOR_ID = ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID)

  SELECT ACCESS_DISTRIBUTORS.UNIT_ID
  SELECT ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID  
  SELECT ACCESS_DISTRIBUTORS.CONSUMER_UNIT
  SELECT ACCESS_DISTRIBUTORS.LOGIN
  SELECT ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
  SELECT ACCESS_DISTRIBUTORS.PASSWORD,
  SELECT ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD
  SELECT DISTRIBUTORS.DISTRIBUTOR_TAG
  SELECT DISTRIBUTORS.DISTRIBUTOR_LABEL
  WHERE {ACCESS_DISTRIBUTORS.UNIT_ID} = {:UNIT_ID}
*/
export function getInfoList (qPars: { ENCRYPTED_PASSWORD: boolean }) {
  let sentence = `
    SELECT
      ACCESS_DISTRIBUTORS.UNIT_ID,
      ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID,
      ACCESS_DISTRIBUTORS.ADDITIONAL_DISTRIBUTOR_INFO,
      ACCESS_DISTRIBUTORS.CONSUMER_UNIT,
      ACCESS_DISTRIBUTORS.LOGIN,
      ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
      ACCESS_DISTRIBUTORS.PASSWORD,
      ACCESS_DISTRIBUTORS.STATUS,
      ACCESS_DISTRIBUTORS.STATUS_UPDATED_DATE,
      ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD
  `
  sentence += `
    FROM
      ACCESS_DISTRIBUTORS
  `

  const conditions: string[] = []
  if (qPars.ENCRYPTED_PASSWORD != null) { conditions.push(`ACCESS_DISTRIBUTORS.ENCRYPTED_PASSWORD = :ENCRYPTED_PASSWORD`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    PASSWORD: string
    STATUS: string
    STATUS_UPDATED_DATE: string
    ENCRYPTED_PASSWORD: boolean
    DISTRIBUTOR_TAG: string
    DISTRIBUTOR_LABEL: string
  }>(sentence, qPars)
}
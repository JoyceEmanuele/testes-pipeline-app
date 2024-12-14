import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM USERSTOKENS

  FIELD USERSTOKENS.TOKEN
  FIELD USERSTOKENS.DAT_ISSUE
  FIELD USERSTOKENS.EMAIL
  FIELD USERSTOKENS.TKTYPE
  FIELD USERSTOKENS.EXTRADATA
*/
export async function w_insert (qPars: { TOKEN: string, DAT_ISSUE: string, EMAIL: string, TKTYPE: string, EXTRADATA: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('TOKEN')
  fields.push('DAT_ISSUE')
  fields.push('EMAIL')
  fields.push('TKTYPE')
  fields.push('EXTRADATA')

  const sentence = `INSERT INTO USERSTOKENS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('USERSTOKENS', sentence, qPars, operationLogData);
    dbLogger('USERSTOKENS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getTokenData = SELECT ROW
  PARAM TOKEN: {USERSTOKENS.TOKEN}
  PARAM TKTYPE: {USERSTOKENS.TKTYPE}
  PARAM minDate?: {USERSTOKENS.DAT_ISSUE}
  PARAM maxDate?: {USERSTOKENS.DAT_ISSUE}
  PARAM EMAIL?: {USERSTOKENS.EMAIL}

  FROM USERSTOKENS

  SELECT USERSTOKENS.TOKEN
  SELECT USERSTOKENS.DAT_ISSUE
  SELECT USERSTOKENS.EMAIL
  SELECT USERSTOKENS.EXTRADATA

  WHERE {USERSTOKENS.TOKEN} = {:TOKEN}
  WHERE TKTYPE = {:TKTYPE}
  WHERE [[IFOWNPROP {:minDate}]] {USERSTOKENS.DAT_ISSUE} >= {:minDate}
  WHERE [[IFOWNPROP {:maxDate}]] {USERSTOKENS.DAT_ISSUE} <= {:maxDate}
  WHERE [[IFOWNPROP {:EMAIL}]] {USERSTOKENS.EMAIL} = {:EMAIL}
*/
export function getTokenData (qPars: { TOKEN: string, TKTYPE: string, minDate?: string, maxDate?: string, EMAIL?: string }) {
  let sentence = `
    SELECT
      USERSTOKENS.TOKEN,
      USERSTOKENS.DAT_ISSUE,
      USERSTOKENS.EMAIL,
      USERSTOKENS.EXTRADATA
  `
  sentence += `
    FROM
      USERSTOKENS
  `

  const conditions: string[] = []
  conditions.push(`USERSTOKENS.TOKEN = :TOKEN`)
  conditions.push(`TKTYPE = :TKTYPE`)
  if (qPars.minDate !== undefined) { conditions.push(`USERSTOKENS.DAT_ISSUE >= :minDate`) }
  if (qPars.maxDate !== undefined) { conditions.push(`USERSTOKENS.DAT_ISSUE <= :maxDate`) }
  if (qPars.EMAIL !== undefined) { conditions.push(`USERSTOKENS.EMAIL = :EMAIL`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    TOKEN: string
    DAT_ISSUE: string
    EMAIL: string
    EXTRADATA: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteOldTokens = DELETE
  PARAM minDate: {USERSTOKENS.DAT_ISSUE}
  PARAM maxDate: {USERSTOKENS.DAT_ISSUE}
  PARAM TKTYPE: {USERSTOKENS.TKTYPE}
  FROM USERSTOKENS
  WHERE [[IFOWNPROP {:TKTYPE}]] {USERSTOKENS.TKTYPE} = {:TKTYPE}
  WHERE NOT ({USERSTOKENS.DAT_ISSUE} >= {:minDate} AND {USERSTOKENS.DAT_ISSUE} <= {:maxDate})
*/
export async function w_deleteOldTokens (qPars: { minDate: string, maxDate: string, TKTYPE: string }, operationLogData: OperationLogData) {

  const conditions: string[] = []
  if (qPars.TKTYPE !== undefined) { conditions.push(`USERSTOKENS.TKTYPE = :TKTYPE`) }
  conditions.push(`NOT (USERSTOKENS.DAT_ISSUE >= :minDate AND USERSTOKENS.DAT_ISSUE <= :maxDate)`)
  const where = conditions.join(' AND ');

  const sentence = `DELETE FROM USERSTOKENS WHERE ${where}`;

  if (operationLogData) {
    await saveOperationLog('USERSTOKENS', sentence, qPars, operationLogData);
    dbLogger('USERSTOKENS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteAllFromUser = DELETE
  PARAM EMAIL: {USERSTOKENS.EMAIL}
  FROM USERSTOKENS
  WHERE {USERSTOKENS.EMAIL} = {:EMAIL}
*/
export async function w_deleteAllFromUser (qPars: { EMAIL: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSTOKENS WHERE USERSTOKENS.EMAIL = :EMAIL`;

  if (operationLogData) {
    await saveOperationLog('USERSTOKENS', sentence, qPars, operationLogData);
    dbLogger('USERSTOKENS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteUsedToken = DELETE
  PARAM TOKEN: {USERSTOKENS.TOKEN}
  FROM USERSTOKENS
  WHERE {USERSTOKENS.TOKEN} = {:TOKEN}
*/
export async function w_deleteUsedToken (qPars: { TOKEN: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSTOKENS WHERE USERSTOKENS.TOKEN = :TOKEN`;

  if (operationLogData) {
    await saveOperationLog('USERSTOKENS', sentence, qPars, operationLogData);
    dbLogger('USERSTOKENS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteTokenType = DELETE
  PARAM EMAIL: {USERSTOKENS.EMAIL}
  PARAM TKTYPE: {USERSTOKENS.TKTYPE}
  FROM USERSTOKENS
  WHERE {USERSTOKENS.EMAIL} = {:EMAIL} AND {USERSTOKENS.TKTYPE} = {:TKTYPE}
*/
export async function w_deleteTokenType (qPars: { EMAIL: string, TKTYPE: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM USERSTOKENS WHERE USERSTOKENS.EMAIL = :EMAIL AND USERSTOKENS.TKTYPE = :TKTYPE`;

  if (operationLogData) {
    await saveOperationLog('USERSTOKENS', sentence, qPars, operationLogData);
    dbLogger('USERSTOKENS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

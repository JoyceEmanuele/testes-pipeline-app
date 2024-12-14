import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

/* @IFHELPER:FUNC addNewUser = INSERT
  FROM PREFS_OVERVIEW
  FIELD PREFS_OVERVIEW.EMAIL
  FIELD PREFS_OVERVIEW.PREFS_OVERVIEW_INFO_ID
  FIELD [[IFOWNPROP {:EMAIL}]] PREFS_OVERVIEW.EMAIL
  FIELD [[IFOWNPROP {:PREFS_OVERVIEW_INFO_ID}]] PREFS_OVERVIEW.PREFS_OVERVIEW_INFO_ID
*/
export async function w_insert (qPars: {
  EMAIL: string,
  PREFS_OVERVIEW_INFO_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('EMAIL')
  fields.push('PREFS_OVERVIEW_INFO_ID')

  const sentence = `INSERT INTO PREFS_OVERVIEW (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('PREFS_OVERVIEW', sentence, qPars, operationLogData);
    dbLogger('PREFS_OVERVIEW', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getPrefsOverviewInfoId (qPars: { EMAIL: string, TYPE: number }) {
  let sentence = `
    SELECT
      PREFS_OVERVIEW.EMAIL,
      PREFS_OVERVIEW_INFO.ID,
      PREFS_OVERVIEW_INFO.TYPE,
      PREFS_OVERVIEW_INFO.POSITION,
      PREFS_OVERVIEW_INFO.IS_ACTIVE,
      PREFS_OVERVIEW_INFO.IS_EXPANDED
  `
  sentence += `
    FROM
      PREFS_OVERVIEW
      INNER JOIN PREFS_OVERVIEW_INFO ON (PREFS_OVERVIEW_INFO.ID = PREFS_OVERVIEW.PREFS_OVERVIEW_INFO_ID)
  `

  sentence += ` WHERE PREFS_OVERVIEW.EMAIL = :EMAIL AND PREFS_OVERVIEW_INFO.TYPE = :TYPE `

  return sqldb.querySingle<{
    EMAIL: string
    ID: number
    TYPE: number
    POSITION: number
    IS_ACTIVE: string
    IS_EXPANDED: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteFromUser = DELETE
  PARAM PREFS_OVERVIEW: {PREFS_OVERVIEW.EMAIL}   
  DELETE FROM PREFS_OVERVIEW  
  WHERE PREFS_OVERVIEW.EMAIL = :EMAIL
*/
export async function w_deleteFromUser(qPars: { EMAIL: string }, operationLogData: OperationLogData) {
  
  const sentence = `DELETE FROM PREFS_OVERVIEW WHERE PREFS_OVERVIEW.EMAIL = :EMAIL`;

  if (operationLogData) {
    await saveOperationLog('PREFS_OVERVIEW', sentence, qPars, operationLogData);
    dbLogger('PREFS_OVERVIEW', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export function getPrefsOverview (qPars: { EMAIL: string }) {
  let sentence = `
    SELECT
      PREFS_OVERVIEW_INFO.ID,
      PREFS_OVERVIEW_INFO.TYPE,
      PREFS_OVERVIEW_INFO.TITLE,
      PREFS_OVERVIEW_INFO.POSITION,
      PREFS_OVERVIEW_INFO.IS_ACTIVE,
      PREFS_OVERVIEW_INFO.IS_EXPANDED
  `
  sentence += `
    FROM
      PREFS_OVERVIEW
    INNER JOIN PREFS_OVERVIEW_INFO ON (PREFS_OVERVIEW_INFO.ID = PREFS_OVERVIEW.PREFS_OVERVIEW_INFO_ID)
  `

  sentence += ` WHERE PREFS_OVERVIEW.EMAIL = :EMAIL`

  return sqldb.query<{
    ID: number
    TYPE: number
    TITLE: string
    POSITION: number
    IS_ACTIVE: string
    IS_EXPANDED: string
  }>(sentence, qPars)
}


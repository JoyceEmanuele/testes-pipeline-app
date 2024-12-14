import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


/* @IFHELPER:FUNC addNewUser = INSERT
  FROM PREFS_OVERVIEW_INFO
  FIELD PREFS_OVERVIEW_INFO.TYPE
  FIELD PREFS_OVERVIEW_INFO.TITLE
  FIELD PREFS_OVERVIEW_INFO.IS_ACTIVE
  FIELD PREFS_OVERVIEW_INFO.IS_EXPANDED
  FIELD PREFS_OVERVIEW_INFO.POSITION
  FIELD [[IFOWNPROP {:TYPE}]] PREFS_OVERVIEW_INFO.TYPE
  FIELD [[IFOWNPROP {:TITLE}]] PREFS_OVERVIEW_INFO.TITLE
  FIELD [[IFOWNPROP {:IS_ACTIVE}]] PREFS_OVERVIEW_INFO.IS_ACTIVE
  FIELD [[IFOWNPROP {:IS_EXPANDED}]] PREFS_OVERVIEW_INFO.IS_EXPANDED
  FIELD [[IFOWNPROP {:POSITION}]] PREFS_OVERVIEW_INFO.POSITION
*/
export async function w_insert (qPars: {
  TYPE: number,
  TITLE?: string,
  IS_ACTIVE?: string,
  IS_EXPANDED?: string,
  POSITION?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('TYPE')
  if (qPars.TITLE !== undefined) { fields.push('TITLE') }
  if (qPars.IS_ACTIVE !== undefined) { fields.push('IS_ACTIVE') }
  if (qPars.IS_EXPANDED !== undefined) { fields.push('IS_EXPANDED') }
  if (qPars.POSITION !== undefined) { fields.push('POSITION') }

  const sentence = `INSERT INTO PREFS_OVERVIEW_INFO (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
    dbLogger('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateUser = UPDATE
  PARAM ID: {PREFS_OVERVIEW_INFO.ID}

  FROM PREFS_OVERVIEW_INFO

  FIELD [[IFOWNPROP {:IS_ACTIVE}]]    PREFS_OVERVIEW_INFO.PASSWORD
  FIELD [[IFOWNPROP {:IS_EXPANDED}]]        PREFS_OVERVIEW_INFO.NOME
  FIELD [[IFOWNPROP {:POSITION}]]   PREFS_OVERVIEW_INFO.SOBRENOME
*/
export async function w_update (qPars: {
  ID: number,
  IS_ACTIVE?: string,
  IS_EXPANDED?: string,
  POSITION?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.IS_ACTIVE !== undefined) { fields.push('IS_ACTIVE = :IS_ACTIVE') }
  if (qPars.IS_EXPANDED !== undefined) { fields.push('IS_EXPANDED = :IS_EXPANDED') }
  if (qPars.POSITION !== undefined) { fields.push('POSITION = :POSITION') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE PREFS_OVERVIEW_INFO SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
    dbLogger('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteFromUser = DELETE
  PARAM PREFS_OVERVIEW: {PREFS_OVERVIEW.EMAIL}   
  DELETE FROM PREFS_OVERVIEW_INFO  
  WHERE PREFS_OVERVIEW.EMAIL = :EMAIL
*/
export async function w_deleteFromUser(qPars: { EMAIL: string }, operationLogData: OperationLogData) {

  const join = `
  INNER JOIN PREFS_OVERVIEW ON (PREFS_OVERVIEW.PREFS_OVERVIEW_INFO_ID = PREFS_OVERVIEW_INFO.ID)
  `;  

  const sentence = `DELETE PREFS_OVERVIEW_INFO FROM PREFS_OVERVIEW_INFO ${join} WHERE PREFS_OVERVIEW.EMAIL = :EMAIL`;

  if (operationLogData) {
    await saveOperationLog('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
    dbLogger('PREFS_OVERVIEW_INFO', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

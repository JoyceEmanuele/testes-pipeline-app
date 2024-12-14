import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM EXCEPTIONS
  FIELD EXCEPTIONS.AUTOMATION_PERIOD_ID
  FIELD EXCEPTIONS.EXCEPTION_DATE
  FIELD EXCEPTIONS.REPEAT_YEARLY
*/
export async function w_insert (qPars: {
  AUTOMATION_PERIOD_ID: number,
  EXCEPTION_DATE: string,
  REPEAT_YEARLY: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('AUTOMATION_PERIOD_ID');
  fields.push('EXCEPTION_DATE');
  fields.push('REPEAT_YEARLY');

  const sentence = `INSERT INTO EXCEPTIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM EXCEPTIONS
  FIELD [[IFOWNPROP {:AUTOMATION_PERIOD_ID}]] EXCEPTIONS.AUTOMATION_PERIOD_ID
  FIELD [[IFOWNPROP {:EXCEPTION_DATE}]] EXCEPTIONS.EXCEPTION_DATE
  FIELD [[IFOWNPROP {:REPEAT_YEARLY}]] EXCEPTIONS.REPEAT_YEARLY
  WHERE {EXCEPTIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  AUTOMATION_PERIOD_ID?: number,
  EXCEPTION_DATE?: string,
  REPEAT_YEARLY?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { fields.push('AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }
  if (qPars.EXCEPTION_DATE !== undefined) { fields.push('EXCEPTION_DATE = :EXCEPTION_DATE') }
  if (qPars.REPEAT_YEARLY !== undefined) { fields.push('REPEAT_YEARLY = :REPEAT_YEARLY') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE EXCEPTIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_updateIncreaseYear(qPars: { ID: number }, operationLogData: OperationLogData) {
  const sentence = `UPDATE EXCEPTIONS SET EXCEPTION_DATE = ADDDATE(EXCEPTION_DATE, INTERVAL 1 YEAR) WHERE EXCEPTIONS.ID = :ID`;
  
  if (operationLogData) {
    await saveOperationLog('EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAutomationPeriod(qPars: { AUTOMATION_PERIOD_ID: number, }, operationLogData: OperationLogData) {

  let sentence = `DELETE FROM EXCEPTIONS WHERE EXCEPTIONS.AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID`;

  if (operationLogData) {
    await saveOperationLog('EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
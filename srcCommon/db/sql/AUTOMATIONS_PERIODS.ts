import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM AUTOMATIONS_PERIODS
  FIELD AUTOMATIONS_PERIODS.TITLE
  FIELD AUTOMATIONS_PERIODS.BEGIN_TIME
  FIELD AUTOMATIONS_PERIODS.END_TIME
  FIELD AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS
*/
export async function w_insert (qPars: {
  TITLE: string,
  BEGIN_TIME: string,
  END_TIME: string,
  AUTOMATION_PERIOD_STATUS: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('TITLE');
  fields.push('BEGIN_TIME');
  fields.push('END_TIME');
  fields.push('AUTOMATION_PERIOD_STATUS');

  const sentence = `INSERT INTO AUTOMATIONS_PERIODS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM AUTOMATIONS_PERIODS
  FIELD [[IFOWNPROP {:TITLE}]] AUTOMATIONS_PERIODS.TITLE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] AUTOMATIONS_PERIODS.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] AUTOMATIONS_PERIODS.END_TIME
  FIELD [[IFOWNPROP {:AUTOMATION_PERIOD_STATUS}]] AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS
  WHERE {AUTOMATIONS_PERIODS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  TITLE?: string,
  BEGIN_TIME?: string,
  END_TIME?: string,
  AUTOMATION_PERIOD_STATUS?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.TITLE !== undefined) { fields.push('TITLE = :TITLE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.AUTOMATION_PERIOD_STATUS !== undefined) { fields.push('AUTOMATION_PERIOD_STATUS = :AUTOMATION_PERIOD_STATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE AUTOMATIONS_PERIODS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function w_deleteRow(qPars: { ID: number, }, operationLogData: OperationLogData) {

  let sentence = `DELETE FROM AUTOMATIONS_PERIODS WHERE AUTOMATIONS_PERIODS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM AUTOMATIONS_PERIODS_PARAMETERS
  FIELD AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PERIOD_ID
  FIELD AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PARAMETERS_ID
*/
export async function w_insert (qPars: {
  AUTOMATION_PERIOD_ID: number,
  AUTOMATION_PARAMETERS_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('AUTOMATION_PERIOD_ID');
  fields.push('AUTOMATION_PARAMETERS_ID');

  const sentence = `INSERT INTO AUTOMATIONS_PERIODS_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM AUTOMATIONS_PERIODS_PARAMETERS
  FIELD [[IFOWNPROP {:AUTOMATION_PERIOD_ID}]] AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID
  FIELD [[IFOWNPROP {:AUTOMATION_PARAMETERS_ID}]] AUTOMATIONS_PERIODS.AUTOMATION_PARAMETERS_ID
  WHERE {AUTOMATIONS_PERIODS_PARAMETERS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  AUTOMATION_PERIOD_ID?: number,
  AUTOMATION_PARAMETERS_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { fields.push('AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }
  if (qPars.AUTOMATION_PARAMETERS_ID !== undefined) { fields.push('AUTOMATION_PARAMETERS_ID = :AUTOMATION_PARAMETERS_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE AUTOMATIONS_PERIODS_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAutomationPeriodId(qPars: { AUTOMATION_PERIOD_ID?: number, }, operationLogData: OperationLogData) {

  const conditions: string[] = []
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { conditions.push('AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }

  let sentence = `DELETE FROM AUTOMATIONS_PERIODS_PARAMETERS`;

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PERIODS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
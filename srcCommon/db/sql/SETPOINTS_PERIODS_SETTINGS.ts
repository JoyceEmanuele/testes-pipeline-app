import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM SETPOINTS_PERIODS_SETTINGS
  
  FIELD SETPOINTS_PERIODS_SETTINGS.SETPOINT_PERIOD_ID
  FIELD SETPOINTS_PERIODS_SETTINGS.AUTOMATION_PARAMETERS_ID
  FIELD SETPOINTS_PERIODS_SETTINGS.RULE_TYPE
  FIELD SETPOINTS_PERIODS_SETTINGS.FIRST_TEMPERATURE_REFERENCE
  FIELD [[IFOWNPROP {:SETPOINT}]] SETPOINTS_PERIODS_SETTINGS.SECOND_TEMPERATURE_REFERENCE
*/
export async function w_insertIgnore(qPars: {
  SETPOINT_PERIOD_ID: number,
  AUTOMATION_PARAMETERS_ID: number,
  RULE_TYPE: string,
  FIRST_TEMPERATURE_REFERENCE: number,
  SECOND_TEMPERATURE_REFERENCE?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('SETPOINT_PERIOD_ID')
  fields.push('AUTOMATION_PARAMETERS_ID')
  fields.push('RULE_TYPE')
  fields.push('FIRST_TEMPERATURE_REFERENCE')
  if (qPars.SECOND_TEMPERATURE_REFERENCE !== undefined) { fields.push('SECOND_TEMPERATURE_REFERENCE') }

  const sentence = `INSERT IGNORE INTO SETPOINTS_PERIODS_SETTINGS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM SETPOINTS_PERIODS_SETTINGS

  PARAM SETPOINTS_PERIODS_SETTINGS.ID
  FIELD [[IFOWNPROP {:SETPOINT_PERIOD_ID}]] SETPOINTS_PERIODS_SETTINGS.SETPOINT_PERIOD_ID
  FIELD [[IFOWNPROP {:AUTOMATION_PARAMETERS_ID}]] SETPOINTS_PERIODS_SETTINGS.AUTOMATION_PARAMETERS_ID
  FIELD [[IFOWNPROP {:RULE_TYPE}]] SETPOINTS_PERIODS_SETTINGS.RULE_TYPE
  FIELD [[IFOWNPROP {:FIRST_TEMPERATURE_REFERENCE}]] SETPOINTS_PERIODS_SETTINGS.FIRST_TEMPERATURE_REFERENCE
  FIELD [[IFOWNPROP {:SECOND_TEMPERATURE_REFERENCE}]] SETPOINTS_PERIODS_SETTINGS.SECOND_TEMPERATURE_REFERENCE
*/
export async function w_update(qPars: {
  ID: number,
  SETPOINT_PERIOD_ID?: string,
  AUTOMATION_PARAMETERS_ID?: number,
  RULE_TYPE?: number,
  FIRST_TEMPERATURE_REFERENCE?: number,
  SECOND_TEMPERATURE_REFERENCE?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.SETPOINT_PERIOD_ID !== undefined) { fields.push('SETPOINT_PERIOD_ID = :SETPOINT_PERIOD_ID') }
  if (qPars.AUTOMATION_PARAMETERS_ID !== undefined) { fields.push('AUTOMATION_PARAMETERS_ID = :AUTOMATION_PARAMETERS_ID') }
  if (qPars.RULE_TYPE !== undefined) { fields.push('RULE_TYPE = :RULE_TYPE') }
  if (qPars.FIRST_TEMPERATURE_REFERENCE !== undefined) { fields.push('FIRST_TEMPERATURE_REFERENCE = :FIRST_TEMPERATURE_REFERENCE') }
  if (qPars.SECOND_TEMPERATURE_REFERENCE !== undefined) { fields.push('SECOND_TEMPERATURE_REFERENCE = :SECOND_TEMPERATURE_REFERENCE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE SETPOINTS_PERIODS_SETTINGS SET ${fields.join(', ')} WHERE SETPOINTS_PERIODS_SETTINGS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM ID: {SETPOINTS_PERIODS_SETTINGS.ID}
  PARAM AUTOMATION_PARAMETERS_ID: {SETPOINTS_PERIODS_SETTINGS.AUTOMATION_PARAMETERS_ID}
  FROM SETPOINTS_PERIODS_SETTINGS
  WHERE {SETPOINTS_PERIODS_SETTINGS.ID} = {:ID}
  WHERE {SETPOINTS_PERIODS_SETTINGS.AUTOMATION_PARAMETERS_ID} = {:AUTOMATION_PARAMETERS_ID}
*/
export async function w_delete(qPars: { ID?: number, AUTOMATION_PARAMETERS_ID: number, }, operationLogData: OperationLogData) {

  const conditions: string[] = []
  if (qPars.ID !== undefined) { conditions.push('SETPOINTS_PERIODS_SETTINGS.ID = :ID') }
  if (qPars.AUTOMATION_PARAMETERS_ID !== undefined) { conditions.push('SETPOINTS_PERIODS_SETTINGS.AUTOMATION_PARAMETERS_ID = :AUTOMATION_PARAMETERS_ID') }

  let sentence = `DELETE FROM SETPOINTS_PERIODS_SETTINGS`;

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS_SETTINGS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

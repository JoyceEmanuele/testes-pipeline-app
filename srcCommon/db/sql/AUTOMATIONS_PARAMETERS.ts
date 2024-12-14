import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM AUTOMATIONS_PARAMETERS
  FIELD AUTOMATIONS_PARAMETERS.ACTION_MODE
  FIELD AUTOMATIONS_PARAMETERS.ACTION_TIME
  FIELD AUTOMATIONS_PARAMETERS.ACTION_POST_BEHAVIOR
  FIELD AUTOMATIONS_PARAMETERS.MODE
  FIELD AUTOMATIONS_PARAMETERS.CURRENT_IN_DEVICE
  FIELD AUTOMATIONS_PARAMETERS.FORCED_BEHAVIOR
  FIELD AUTOMATIONS_PARAMETERS.IR_ID_COOL
  FIELD AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS
  FIELD AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS
  FIELD AUTOMATIONS_PARAMETERS.LTC
  FIELD AUTOMATIONS_PARAMETERS.LTI
  FIELD AUTOMATIONS_PARAMETERS.PERMISSION
  FIELD AUTOMATIONS_PARAMETERS.SCHEDULE_END_BEHAVIOR
  FIELD AUTOMATIONS_PARAMETERS.SCHEDULE_START_BEHAVIOR
  FIELD AUTOMATIONS_PARAMETERS.SETPOINT
  FIELD AUTOMATIONS_PARAMETERS.OPERATION
*/
export async function w_insert (qPars: {
  ACTION_MODE: string,
  ACTION_TIME: number,
  ACTION_POST_BEHAVIOR: string,
  MODE: string,
  FORCED_BEHAVIOR: string,
  IR_ID_COOL: string,
  LOWER_HYSTERESIS: number,
  UPPER_HYSTERESIS: number,
  LTC: number,
  LTI: number,
  PERMISSION: string,
  SCHEDULE_END_BEHAVIOR: string,
  SCHEDULE_START_BEHAVIOR: string,
  SETPOINT: number,
  OPERATION: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ACTION_MODE');
  fields.push('ACTION_TIME');
  fields.push('ACTION_POST_BEHAVIOR');
  fields.push('MODE');
  fields.push('FORCED_BEHAVIOR');
  fields.push('IR_ID_COOL');
  fields.push('LOWER_HYSTERESIS');
  fields.push('UPPER_HYSTERESIS');
  fields.push('LTC');
  fields.push('LTI');
  fields.push('PERMISSION');
  fields.push('SCHEDULE_END_BEHAVIOR');
  fields.push('SCHEDULE_START_BEHAVIOR');
  fields.push('SETPOINT');
  fields.push('OPERATION');

  const sentence = `INSERT INTO AUTOMATIONS_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM AUTOMATIONS_PARAMETERS
  FIELD [[IFOWNPROP {:ACTION_MODE}]] AUTOMATIONS_PERIODS.ACTION_MODE
  FIELD [[IFOWNPROP {:ACTION_TIME}]] AUTOMATIONS_PERIODS.ACTION_TIME
  FIELD [[IFOWNPROP {:MODE}]] AUTOMATIONS_PERIODS.MODE
  FIELD [[IFOWNPROP {:CURRENT_IN_DEVICE}]] AUTOMATIONS_PERIODS.CURRENT_IN_DEVICE
  FIELD [[IFOWNPROP {:FORCED_BEHAVIOR}]] AUTOMATIONS_PERIODS.FORCED_BEHAVIOR
  FIELD [[IFOWNPROP {:IR_ID_COOL}]] AUTOMATIONS_PERIODS.IR_ID_COOL
  FIELD [[IFOWNPROP {:LOWER_HYSTERESIS}]] AUTOMATIONS_PERIODS.LOWER_HYSTERESIS
  FIELD [[IFOWNPROP {:UPPER_HYSTERESIS}]] AUTOMATIONS_PERIODS.UPPER_HYSTERESIS
  FIELD [[IFOWNPROP {:LTC}]] AUTOMATIONS_PERIODS.LTC
  FIELD [[IFOWNPROP {:LTI}]] AUTOMATIONS_PERIODS.LTI
  FIELD [[IFOWNPROP {:PERMISSION}]] AUTOMATIONS_PERIODS.PERMISSION
  FIELD [[IFOWNPROP {:SCHEDULE_END_BEHAVIOR}]] AUTOMATIONS_PERIODS.SCHEDULE_END_BEHAVIOR
  FIELD [[IFOWNPROP {:SCHEDULE_START_BEHAVIOR}]] AUTOMATIONS_PERIODS.SCHEDULE_START_BEHAVIOR
  FIELD [[IFOWNPROP {:SETPOINT}]] AUTOMATIONS_PERIODS.SETPOINT
  FIELD [[IFOWNPROP {:OPERATION}]] AUTOMATIONS_PERIODS.OPERATION
  WHERE {AUTOMATIONS_PARAMETERS.ID} = {:ID}
*/
type TQparsUpdateInfo = {
  ID: number,
  ACTION_MODE?: string,
  ACTION_POST_BEHAVIOR?: string,
  ACTION_TIME?: number,
  MODE?: string,
  CURRENT_IN_DEVICE?: string,
  FORCED_BEHAVIOR?: string,
  IR_ID_COOL?: string,
  LOWER_HYSTERESIS?: number,
  UPPER_HYSTERESIS?: number,
  LTC?: number,
  LTI?: number,
  PERMISSION?: string,
  SCHEDULE_END_BEHAVIOR?: string,
  SCHEDULE_START_BEHAVIOR?: string,
  SETPOINT?: number,
  OPERATION?: string,
}

function generateFieldsUpdateInfoSobDemanda(qPars: TQparsUpdateInfo, fields: string[]) {
  if (qPars.ACTION_MODE !== undefined) { fields.push('ACTION_MODE = :ACTION_MODE') }
  if (qPars.ACTION_TIME !== undefined) { fields.push('ACTION_TIME = :ACTION_TIME') }
  if (qPars.ACTION_POST_BEHAVIOR !== undefined) { fields.push('ACTION_POST_BEHAVIOR = :ACTION_POST_BEHAVIOR') }
}

function generateFieldsUpdateInfo(qPars: TQparsUpdateInfo) {
  const fields: string[] = []
  generateFieldsUpdateInfoSobDemanda(qPars, fields);
  if (qPars.MODE !== undefined) { fields.push('MODE = :MODE') }
  if (qPars.CURRENT_IN_DEVICE !== undefined) { fields.push('CURRENT_IN_DEVICE = :CURRENT_IN_DEVICE') }
  if (qPars.FORCED_BEHAVIOR !== undefined) { fields.push('FORCED_BEHAVIOR = :FORCED_BEHAVIOR') }
  if (qPars.IR_ID_COOL !== undefined) { fields.push('IR_ID_COOL = :IR_ID_COOL') }
  if (qPars.LOWER_HYSTERESIS !== undefined) { fields.push('LOWER_HYSTERESIS = :LOWER_HYSTERESIS') }
  if (qPars.UPPER_HYSTERESIS !== undefined) { fields.push('UPPER_HYSTERESIS = :UPPER_HYSTERESIS') }
  if (qPars.LTC !== undefined) { fields.push('LTC = :LTC') }
  if (qPars.LTI !== undefined) { fields.push('LTI = :LTI') }
  if (qPars.PERMISSION !== undefined) { fields.push('PERMISSION = :PERMISSION') }
  if (qPars.SCHEDULE_END_BEHAVIOR !== undefined) { fields.push('SCHEDULE_END_BEHAVIOR = :SCHEDULE_END_BEHAVIOR') }
  if (qPars.SCHEDULE_START_BEHAVIOR !== undefined) { fields.push('SCHEDULE_START_BEHAVIOR = :SCHEDULE_START_BEHAVIOR') }
  if (qPars.SETPOINT !== undefined) { fields.push('SETPOINT = :SETPOINT') }
  if (qPars.OPERATION !== undefined) { fields.push('OPERATION = :OPERATION') }
  return fields;
}

export async function w_updateInfo (qPars: TQparsUpdateInfo, operationLogData: OperationLogData) {
  const fields: string[] = generateFieldsUpdateInfo(qPars);
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE AUTOMATIONS_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_delete(qPars: { ID: number, }, operationLogData: OperationLogData) {

  let sentence = `DELETE FROM AUTOMATIONS_PARAMETERS WHERE AUTOMATIONS_PARAMETERS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
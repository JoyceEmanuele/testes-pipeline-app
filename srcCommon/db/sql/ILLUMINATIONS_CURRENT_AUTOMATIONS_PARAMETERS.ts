import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS
  FIELD ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID
  FIELD ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
*/
export async function w_insert (qPars: {
  ILLUMINATION_ID: number,
  CURRENT_AUTOMATION_PARAMETERS_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ILLUMINATION_ID');
  fields.push('CURRENT_AUTOMATION_PARAMETERS_ID');

  const sentence = `INSERT INTO ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS
  FIELD [[IFOWNPROP {:ILLUMINATION_ID}]] ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID
  FIELD [[IFOWNPROP {:CURRENT_AUTOMATION_PARAMETERS_ID}]] ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
  WHERE {ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  ILLUMINATION_ID?: number,
  CURRENT_AUTOMATION_PARAMETERS_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.ILLUMINATION_ID !== undefined) { fields.push('ILLUMINATION_ID = :ILLUMINATION_ID') }
  if (qPars.CURRENT_AUTOMATION_PARAMETERS_ID !== undefined) { fields.push('CURRENT_AUTOMATION_PARAMETERS_ID = :CURRENT_AUTOMATION_PARAMETERS_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function w_deleteByIlluminationId(qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS WHERE ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS FROM ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
  
}
export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID)`;

  const sentence = `DELETE ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS FROM ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
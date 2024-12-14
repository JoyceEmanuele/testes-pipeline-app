import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM MACHINES_CURRENT_AUTOMATIONS_PARAMETERS
  FIELD MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID
  FIELD MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
*/
export async function w_insert (qPars: {
  MACHINE_ID: number,
  CURRENT_AUTOMATION_PARAMETERS_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('MACHINE_ID');
  fields.push('CURRENT_AUTOMATION_PARAMETERS_ID');

  const sentence = `INSERT INTO MACHINES_CURRENT_AUTOMATIONS_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM MACHINES_CURRENT_AUTOMATIONS_PARAMETERS
  FIELD [[IFOWNPROP {:MACHINE_ID}]] MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID
  FIELD [[IFOWNPROP {:CURRENT_AUTOMATION_PARAMETERS_ID}]] MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
  WHERE {MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  MACHINE_ID?: number,
  CURRENT_AUTOMATION_PARAMETERS_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.CURRENT_AUTOMATION_PARAMETERS_ID !== undefined) { fields.push('CURRENT_AUTOMATION_PARAMETERS_ID = :CURRENT_AUTOMATION_PARAMETERS_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE MACHINES_CURRENT_AUTOMATIONS_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MACHINES_CURRENT_AUTOMATIONS_PARAMETERS WHERE MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByClientId(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE MACHINES_CURRENT_AUTOMATIONS_PARAMETERS 
                    FROM
                      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS 
                      INNER JOIN MACHINES ON (MACHINES.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID) 
                      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
                    WHERE
                      CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export function getMachineCurrentAutomationsParameters (qPars: {
  MACHINE_ID: number,
}) {
  let sentence = `
    SELECT DISTINCT
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.ID AS ID,
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID AS CURRENT_AUTOMATION_PARAMETERS_ID
  `
  sentence += `
    FROM
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS
 `

  const conditions: string[] = []
  if (qPars.MACHINE_ID != null) { conditions.push(`MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = :MACHINE_ID`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID: number,
    CURRENT_AUTOMATION_PARAMETERS_ID: number
  }>(sentence, qPars)
}

export function getMachineCurrentAutomationsParametersList (qPars: {
  CURRENT_AUTOMATION_PARAMETERS_ID: number,
}) {
  let sentence = `
    SELECT
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.ID AS ID,
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID AS MACHINE_ID
  `
  sentence += `
    FROM
      MACHINES_CURRENT_AUTOMATIONS_PARAMETERS
 `

  const conditions: string[] = []
  if (qPars.CURRENT_AUTOMATION_PARAMETERS_ID != null) { conditions.push(`MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID = :CURRENT_AUTOMATION_PARAMETERS_ID`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    ID: number,
    CURRENT_AUTOMATION_PARAMETERS_ID: number
  }>(sentence, qPars)
}
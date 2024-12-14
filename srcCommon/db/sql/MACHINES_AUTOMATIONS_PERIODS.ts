import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM MACHINES_AUTOMATIONS_PERIODS
  FIELD MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID
  FIELD MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID
*/
export async function w_insert (qPars: {
  MACHINE_ID: number,
  AUTOMATION_PERIOD_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('MACHINE_ID');
  fields.push('AUTOMATION_PERIOD_ID');

  const sentence = `INSERT INTO MACHINES_AUTOMATIONS_PERIODS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM MACHINES_AUTOMATIONS_PERIODS
  FIELD [[IFOWNPROP {:MACHINE_ID}]] AUTOMATIONS_PERIODS.MACHINE_ID
  FIELD [[IFOWNPROP {:AUTOMATION_PERIOD_ID}]] AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID
  WHERE {MACHINES_AUTOMATIONS_PERIODS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  MACHINE_ID?: number,
  AUTOMATION_PERIOD_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { fields.push('AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE MACHINES_AUTOMATIONS_PERIODS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function w_deleteByAutomationPeriodId(qPars: { AUTOMATION_PERIOD_ID?: number, }, operationLogData: OperationLogData) {

  const conditions: string[] = []
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { conditions.push('MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }

  let sentence = `DELETE FROM MACHINES_AUTOMATIONS_PERIODS`;

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  if (operationLogData) {
    await saveOperationLog('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM MACHINES_AUTOMATIONS_PERIODS WHERE MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByClientId(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE MACHINES_AUTOMATIONS_PERIODS 
                    FROM
                      MACHINES_AUTOMATIONS_PERIODS 
                      INNER JOIN MACHINES ON (MACHINES.ID = MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID) 
                      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
                    WHERE
                      CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('MACHINES_AUTOMATIONS_PERIODS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}
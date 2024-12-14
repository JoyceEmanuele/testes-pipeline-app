import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM SCHEDULES
  FIELD SCHEDULES.AUTOMATION_PERIOD_ID
  FIELD SCHEDULES.DAYS
  FIELD SCHEDULES.NEED_MULT_SCHEDULES
*/
export async function w_insert (qPars: {
  AUTOMATION_PERIOD_ID: number,
  DAYS: string,
  NEED_MULT_SCHEDULES: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('AUTOMATION_PERIOD_ID');
  fields.push('DAYS');
  fields.push('NEED_MULT_SCHEDULES');

  const sentence = `INSERT INTO SCHEDULES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM SCHEDULES
  FIELD [[IFOWNPROP {:AUTOMATION_PERIOD_ID}]] SCHEDULES.AUTOMATION_PERIOD_ID
  FIELD [[IFOWNPROP {:DAYS}]] SCHEDULES.DAYS
  FIELD [[IFOWNPROP {:NEED_MULT_SCHEDULES}]] SCHEDULES.NEED_MULT_SCHEDULES
  WHERE {SCHEDULES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  AUTOMATION_PERIOD_ID?: number,
  DAYS?: string,
  NEED_MULT_SCHEDULES?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.AUTOMATION_PERIOD_ID !== undefined) { fields.push('AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID') }
  if (qPars.DAYS !== undefined) { fields.push('DAYS = :DAYS') }
  if (qPars.NEED_MULT_SCHEDULES !== undefined) { fields.push('NEED_MULT_SCHEDULES = :NEED_MULT_SCHEDULES') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE SCHEDULES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_deleteByAutomationPeriod(qPars: { AUTOMATION_PERIOD_ID: number, }, operationLogData: OperationLogData) {

  let sentence = `DELETE FROM SCHEDULES WHERE SCHEDULES.AUTOMATION_PERIOD_ID = :AUTOMATION_PERIOD_ID`;

  if (operationLogData) {
    await saveOperationLog('SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function getSchedulesHoursFromDay(qPars: {
  MACHINE_ID: number,
  weekDay: string
}) {
  let sentence = `
    SELECT DISTINCT
      AUTOMATIONS_PERIODS.ID AS AUTOMATION_PERIOD_ID,
      AUTOMATIONS_PERIODS.BEGIN_TIME AS BEGIN_TIME,
      AUTOMATIONS_PERIODS.END_TIME AS END_TIME,
      COALESCE(AUTOMATIONS_PARAMETERS.PERMISSION, AUTOMATIONS_PARAMETERS.MODE, 'forbid') AS PERMISSION
  `
  sentence += `
    FROM
      SCHEDULES
      INNER JOIN AUTOMATIONS_PERIODS ON (AUTOMATIONS_PERIODS.ID = SCHEDULES.AUTOMATION_PERIOD_ID )
      INNER JOIN MACHINES_AUTOMATIONS_PERIODS on (MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PERIODS_PARAMETERS ON (AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PARAMETERS ON (AUTOMATIONS_PARAMETERS.ID = AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PARAMETERS_ID)
  `

  const conditions: string[] = []
  if (qPars.MACHINE_ID !== undefined) { conditions.push(`MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID = :MACHINE_ID`) }
  if (qPars.weekDay !== undefined) { conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(SCHEDULES.DAYS, '$.${qPars.weekDay}')) = 'true'`) }
  conditions.push('AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS = 1');

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }
  
  sentence += ` ORDER BY AUTOMATIONS_PERIODS.BEGIN_TIME`

  return sqldb.query<{
    AUTOMATION_PERIOD_ID: number
    BEGIN_TIME: string
    END_TIME: string
    PERMISSION: string
  }>(sentence, qPars)
}
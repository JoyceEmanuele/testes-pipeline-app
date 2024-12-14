import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM SETPOINTS_PERIODS
  
  FIELD SETPOINTS_PERIODS.SCHEDULE_ID
  FIELD SETPOINTS_PERIODS.PERIOD_TITLE
  FIELD SETPOINTS_PERIODS.BEGIN_TIME
  FIELD SETPOINTS_PERIODS.END_TIME
*/
export async function w_insertIgnore(qPars: {
  SCHEDULE_ID: number,
  PERIOD_TITLE: string,
  BEGIN_TIME: string,
  END_TIME: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('SCHEDULE_ID');
  fields.push('PERIOD_TITLE');
  fields.push('BEGIN_TIME');
  fields.push('END_TIME');

  const sentence = `INSERT IGNORE INTO SETPOINTS_PERIODS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM SETPOINTS_PERIODS

  PARAM SETPOINTS_PERIODS.DUT_PERIOD_ID
  FIELD [[IFOWNPROP {:PERIOD_TITLE}]] SETPOINTS_PERIODS.PERIOD_TITLE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] SETPOINTS_PERIODS.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] SETPOINTS_PERIODS.END_TIME
*/
export async function w_update(qPars: {
  ID?: number,
  DUT_PERIOD_ID?: number,
  PERIOD_TITLE?: string,
  BEGIN_TIME?: number,
  END_TIME?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DUT_PERIOD_ID !== undefined) { fields.push('DUT_PERIOD_ID = :DUT_PERIOD_ID') }
  if (qPars.PERIOD_TITLE !== undefined) { fields.push('PERIOD_TITLE = :PERIOD_TITLE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }

  const sentence = `UPDATE SETPOINTS_PERIODS SET ${fields.join(', ')} WHERE SETPOINTS_PERIODS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM DUT_PERIOD_ID: {SETPOINTS_PERIODS.DUT_PERIOD_ID}
  PARAM SCHEDULE_ID: {SETPOINTS_PERIODS.SCHEDULE_ID}
  FROM SETPOINTS_PERIODS
  WHERE {SETPOINTS_PERIODS.DUT_PERIOD_ID} = {:DUT_PERIOD_ID}
  WHERE {SETPOINTS_PERIODS.SCHEDULE_ID} = {:SCHEDULE_ID}
*/
export async function w_delete(qPars: { DUT_PERIOD_ID?: number, SCHEDULE_ID?: number }, operationLogData: OperationLogData) {

  const conditions: string[] = []
  if (qPars.SCHEDULE_ID !== undefined) { conditions.push('SETPOINTS_PERIODS.DUT_PERIOD_ID = :DUT_PERIOD_ID') }
  if (qPars.SCHEDULE_ID !== undefined) { conditions.push('SETPOINTS_PERIODS.SCHEDULE_ID = :SCHEDULE_ID') }

  let sentence = `DELETE FROM SETPOINTS_PERIODS`;

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  if (operationLogData) {
    await saveOperationLog('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
    dbLogger('SETPOINTS_PERIODS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

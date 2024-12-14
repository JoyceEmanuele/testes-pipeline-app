import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
FROM DAM_SCHEDULES

FIELD DAM_SCHEDULES.DAM_ID
FIELD DAM_SCHEDULES.NAME
FIELD DAM_SCHEDULES.ACTIVE
FIELD DAM_SCHEDULES.BEGIN_TIME
FIELD DAM_SCHEDULES.END_TIME
FIELD DAM_SCHEDULES.DAYS
FIELD [[IFOWNPROP {:MACHINE}]] DAM_SCHEDULES.MACHINE
FIELD [[IFOWNPROP {:MODE}]] DAM_SCHEDULES.MODE
FIELD [[IFOWNPROP {:EXCEPTION_DATE}]] DAM_SCHEDULES.EXCEPTION_DATE
FIELD [[IFOWNPROP {:EXCEPTION_REPEAT_YEARLY}]] DAM_SCHEDULES.EXCEPTION_REPEAT_YEARLY
*/
export async function w_insert (qPars: {
  DAM_ID: string
  NAME: string
  ACTIVE: string
  BEGIN_TIME: string
  END_TIME: string
  DAYS: string
  MACHINE?: number
  MODE?: string
  EXCEPTION_DATE?: string
  EXCEPTION_REPEAT_YEARLY?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAM_ID')
  fields.push('NAME')
  fields.push('ACTIVE')
  fields.push('BEGIN_TIME')
  fields.push('END_TIME')
  fields.push('DAYS')
  if (qPars.MACHINE !== undefined) { fields.push('MACHINE') }
  if (qPars.MODE !== undefined) { fields.push('MODE') }
  if (qPars.EXCEPTION_DATE !== undefined) { fields.push('EXCEPTION_DATE') }
  if (qPars.EXCEPTION_REPEAT_YEARLY !== undefined) { fields.push('EXCEPTION_REPEAT_YEARLY') }

  const sentence = `INSERT INTO DAM_SCHEDULES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAM_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DAM_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM DAM_SCHEDULES
  PARAM SCHED_ID: {DAM_SCHEDULES.SCHED_ID}
  PARAM DAM_ID: {DAM_SCHEDULES.DAM_ID}
  FIELD [[IFOWNPROP {:MACHINE}]] DAM_SCHEDULES.MACHINE
  FIELD [[IFOWNPROP {:ACTIVE}]] DAM_SCHEDULES.ACTIVE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] DAM_SCHEDULES.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] DAM_SCHEDULES.END_TIME
  FIELD [[IFOWNPROP {:DAYS}]] DAM_SCHEDULES.DAYS
  FIELD [[IFOWNPROP {:MODE}]] DAM_SCHEDULES.MODE
  FIELD [[IFOWNPROP {:EXCEPTION_DATE}]] DAM_SCHEDULES.EXCEPTION_DATE
  FIELD [[IFOWNPROP {:EXCEPTION_REPEAT_YEARLY}]] DAM_SCHEDULES.EXCEPTION_REPEAT_YEARLY
*/
export async function w_update (qPars: {
  SCHED_ID: number
  DAM_ID: string
  MACHINE?: number
  NAME?: string
  ACTIVE?: string
  BEGIN_TIME?: string
  END_TIME?: string
  DAYS?: string
  MODE?: string
  EXCEPTION_DATE?: string
  EXCEPTION_REPEAT_YEARLY?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.MACHINE !== undefined) { fields.push('MACHINE = :MACHINE') }
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (qPars.ACTIVE !== undefined) { fields.push('ACTIVE = :ACTIVE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.DAYS !== undefined) { fields.push('DAYS = :DAYS') }
  if (qPars.MODE !== undefined) { fields.push('MODE = :MODE') }
  if (qPars.EXCEPTION_DATE !== undefined) { fields.push('EXCEPTION_DATE = :EXCEPTION_DATE') }
  if (qPars.EXCEPTION_REPEAT_YEARLY !== undefined) { fields.push('EXCEPTION_REPEAT_YEARLY = :EXCEPTION_REPEAT_YEARLY') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DAM_SCHEDULES SET ${fields.join(', ')} WHERE DAM_SCHEDULES.SCHED_ID = :SCHED_ID AND DAM_SCHEDULES.DAM_ID = :DAM_ID`;

  if (operationLogData) {
    await saveOperationLog('DAM_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DAM_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN DEVS ON (DEVS.DEV_ID = DAM_SCHEDULES.DAM_ID)";

  const sentence = `DELETE DAM_SCHEDULES FROM DAM_SCHEDULES ${join} WHERE DEVS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAM_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DAM_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getDamSchedules (qPars: {
  DAM_ID?: string
}) {
  let sentence = `
    SELECT
      DAM_SCHEDULES.SCHED_ID,
      DAM_SCHEDULES.DAM_ID,
      DAM_SCHEDULES.NAME,
      DAM_SCHEDULES.ACTIVE,
      DAM_SCHEDULES.OPERATION,
      DAM_SCHEDULES.BEGIN_TIME,
      DAM_SCHEDULES.END_TIME,
      DAM_SCHEDULES.MODE,
      DAM_SCHEDULES.DAYS,
      DAM_SCHEDULES.SETPOINT,
      DATE_FORMAT(DAM_SCHEDULES.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DAM_SCHEDULES.EXCEPTION_REPEAT_YEARLY,
      DAM_SCHEDULES.MACHINE
  `
  sentence += `
    FROM
      DAM_SCHEDULES
  `
  if (qPars.DAM_ID !== undefined) { sentence += ` WHERE DAM_SCHEDULES.DAM_ID = :DAM_ID ` }

  sentence += ` ORDER BY DAM_SCHEDULES.BEGIN_TIME ASC, DAM_SCHEDULES.END_TIME ASC `

  return sqldb.query<{
    SCHED_ID: number
    DAM_ID: string
    MACHINE: number
    NAME: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    MODE: string
    DAYS: string
    EXCEPTION_DATE: string
    EXCEPTION_REPEAT_YEARLY: string
  }>(sentence, qPars)
}

export async function getActiveSchedsWithFwVersion (qPars: {
  DAM_ID?: string
}) {
  let sentence = `
    SELECT
      DAM_SCHEDULES.SCHED_ID,
      DAM_SCHEDULES.DAM_ID,
      DAM_SCHEDULES.MACHINE,
      DAM_SCHEDULES.NAME,
      DAM_SCHEDULES.BEGIN_TIME,
      DAM_SCHEDULES.END_TIME,
      DAM_SCHEDULES.MODE,
      DAM_SCHEDULES.DAYS,
      DATE_FORMAT(DAM_SCHEDULES.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DAM_SCHEDULES.EXCEPTION_REPEAT_YEARLY,
      DEVFWVERS.CURRFW_VERS
  `
  sentence += `
    FROM
      DAM_SCHEDULES
    LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DAM_SCHEDULES.DAM_ID)
  `
  if (qPars.DAM_ID !== undefined) { sentence += ` WHERE DAM_SCHEDULES.DAM_ID = :DAM_ID ` }

  sentence += ` ORDER BY DAM_SCHEDULES.BEGIN_TIME ASC, DAM_SCHEDULES.END_TIME ASC `

  return sqldb.query<{
    SCHED_ID: number
    DAM_ID: string
    MACHINE: number
    NAME: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    MODE: string
    DAYS: string
    EXCEPTION_DATE: string
    EXCEPTION_REPEAT_YEARLY: string
    CURRFW_VERS: string
  }>(sentence, qPars)
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
FROM DALS_SCHEDULES

FIELD DALS_SCHEDULES.DAL_ID
FIELD DALS_SCHEDULES.ILLUMINATION_ID
FIELD DALS_SCHEDULES.TITLE
FIELD DALS_SCHEDULES.ACTIVE
FIELD DALS_SCHEDULES.BEGIN_TIME
FIELD DALS_SCHEDULES.END_TIME
FIELD DALS_SCHEDULES.DAYS
FIELD DALS_SCHEDULES.STATUS
*/
export async function w_insert (qPars: {
  DAL_ID: number
  ILLUMINATION_ID: number
  TITLE: string
  ACTIVE: string
  BEGIN_TIME: string
  END_TIME: string
  DAYS: string
  STATUS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAL_ID')
  fields.push('ILLUMINATION_ID')
  fields.push('TITLE')
  fields.push('ACTIVE')
  fields.push('BEGIN_TIME')
  fields.push('END_TIME')
  fields.push('DAYS')
  fields.push('STATUS')

  const sentence = `INSERT INTO DALS_SCHEDULES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM DALS_SCHEDULES
  PARAM SCHED_ID: {DALS_SCHEDULES.ID}
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}
  PARAM ILLUMINATION_ID: {DALS_SCHEDULES.ILLUMINATION_ID}
  FIELD [[IFOWNPROP {:TITLE}]] DALS_SCHEDULES.TITLE
  FIELD [[IFOWNPROP {:ACTIVE}]] DALS_SCHEDULES.ACTIVE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] DALS_SCHEDULES.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] DALS_SCHEDULES.END_TIME
  FIELD [[IFOWNPROP {:DAYS}]] DALS_SCHEDULES.DAYS
  FIELD [[IFOWNPROP {:STATUS}]] DALS_SCHEDULES.STATUS
*/
export async function w_update (qPars: {
  SCHED_ID: number
  DAL_ID: number
  ILLUMINATION_ID: number
  TITLE?: string
  ACTIVE?: string
  BEGIN_TIME?: string
  END_TIME?: string
  DAYS?: string
  STATUS?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.TITLE !== undefined) { fields.push('TITLE = :TITLE') }
  if (qPars.ACTIVE !== undefined) { fields.push('ACTIVE = :ACTIVE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.DAYS !== undefined) { fields.push('DAYS = :DAYS') }
  if (qPars.STATUS !== undefined) { fields.push('STATUS = :STATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_SCHEDULES SET ${fields.join(', ')} WHERE DALS_SCHEDULES.ID = :SCHED_ID AND DALS_SCHEDULES.DAL_ID = :DAL_ID AND DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM SCHED_ID: {DALS_SCHEDULES.ID}
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}
  FROM DALS_SCHEDULES
  WHERE {DALS_SCHEDULES.ID} = {:SCHED_ID}
  AND {DALS_SCHEDULES.DAL_ID} = {:DAL_ID}
  AND {DALS_SCHEDULES.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_delete (qPars: { SCHED_ID: number, DAL_ID: number, ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_SCHEDULES WHERE DALS_SCHEDULES.ID = :SCHED_ID AND DALS_SCHEDULES.DAL_ID = :DAL_ID AND DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDalScheds = SELECT
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}

  FROM DALS_SCHEDULES

  SELECT DALS_SCHEDULES.ID
  SELECT DALS_SCHEDULES.DAL_ID
  SELECT DALS_SCHEDULES.ILLUMINATION_ID
  SELECT DALS_SCHEDULES.TITLE
  SELECT DALS_SCHEDULES.ACTIVE
  SELECT DALS_SCHEDULES.BEGIN_TIME
  SELECT DALS_SCHEDULES.END_TIME
  SELECT DALS_SCHEDULES.DAYS
  SELECT DALS_SCHEDULES.STATUS
*/
export async function getDalScheds (qPars: {
  DAL_ID: number
}) {
  let sentence = `
    SELECT
      DALS_SCHEDULES.ID,
      DALS_SCHEDULES.DAL_ID,
      DALS_SCHEDULES.ILLUMINATION_ID,
      DALS_SCHEDULES.TITLE,
      DALS_SCHEDULES.ACTIVE,
      DALS_SCHEDULES.BEGIN_TIME,
      DALS_SCHEDULES.END_TIME,
      DALS_SCHEDULES.DAYS,
      DALS_SCHEDULES.STATUS,
      DALS_ILLUMINATIONS.DEFAULT_MODE
  `
  sentence += `
    FROM
      DALS_SCHEDULES
    LEFT JOIN DALS_ILLUMINATIONS ON (DALS_ILLUMINATIONS.DAL_ID = DALS_SCHEDULES.DAL_ID AND DALS_ILLUMINATIONS.ILLUMINATION_ID = DALS_SCHEDULES.ILLUMINATION_ID)
  `
  sentence += ` WHERE DALS_SCHEDULES.DAL_ID = :DAL_ID `
  sentence += ` ORDER BY DALS_SCHEDULES.BEGIN_TIME ASC, DALS_SCHEDULES.END_TIME ASC `

  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    DAYS: string
    STATUS: string
    DEFAULT_MODE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getIllumScheds = SELECT
  PARAM ILLUMINATION_ID: {DALS_SCHEDULES.ILLUMINATION_ID}

  FROM DALS_SCHEDULES

  SELECT DALS_SCHEDULES.ID
  SELECT DALS_SCHEDULES.DAL_ID
  SELECT DALS_SCHEDULES.ILLUMINATION_ID
  SELECT DALS_SCHEDULES.TITLE
  SELECT DALS_SCHEDULES.ACTIVE
  SELECT DALS_SCHEDULES.BEGIN_TIME
  SELECT DALS_SCHEDULES.END_TIME
  SELECT DALS_SCHEDULES.DAYS
  SELECT DALS_SCHEDULES.STATUS
*/
export async function getIllumScheds (qPars: {
  ILLUMINATION_ID: number
}) {
  let sentence = `
    SELECT
      DALS_SCHEDULES.ID,
      DALS_SCHEDULES.DAL_ID,
      DALS_SCHEDULES.ILLUMINATION_ID,
      DALS_SCHEDULES.TITLE,
      DALS_SCHEDULES.ACTIVE,
      DALS_SCHEDULES.BEGIN_TIME,
      DALS_SCHEDULES.END_TIME,
      DALS_SCHEDULES.DAYS,
      DALS_SCHEDULES.STATUS,
      DALS_ILLUMINATIONS.DEFAULT_MODE
  `
  sentence += `
    FROM
      DALS_SCHEDULES
    LEFT JOIN DALS_ILLUMINATIONS ON (DALS_ILLUMINATIONS.ILLUMINATION_ID = DALS_SCHEDULES.ILLUMINATION_ID) 
  `
  sentence += ` WHERE DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID `
  sentence += ` ORDER BY DALS_SCHEDULES.BEGIN_TIME ASC, DALS_SCHEDULES.END_TIME ASC `

  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    DAYS: string
    STATUS: string
    DEFAULT_MODE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDalSchedById = SELECT
  PARAM ID: {DALS_SCHEDULES.ID}

  FROM DALS_SCHEDULES

  SELECT DALS_SCHEDULES.ID
  SELECT DALS_SCHEDULES.DAL_ID
  SELECT DALS_SCHEDULES.ILLUMINATION_ID
  SELECT DALS_SCHEDULES.TITLE
  SELECT DALS_SCHEDULES.ACTIVE
  SELECT DALS_SCHEDULES.BEGIN_TIME
  SELECT DALS_SCHEDULES.END_TIME
  SELECT DALS_SCHEDULES.DAYS
  SELECT DALS_SCHEDULES.STATUS

  WHERE {DALS_SCHEDULES.ID} = {:ID}
*/
export async function getDalSchedById (qPars: {
  ID: number
}) {
  let sentence = `
    SELECT
      DALS_SCHEDULES.ID,
      DALS_SCHEDULES.DAL_ID,
      DALS_SCHEDULES.ILLUMINATION_ID,
      DALS_SCHEDULES.TITLE,
      DALS_SCHEDULES.ACTIVE,
      DALS_SCHEDULES.BEGIN_TIME,
      DALS_SCHEDULES.END_TIME,
      DALS_SCHEDULES.DAYS,
      DALS_SCHEDULES.STATUS
  `
  sentence += `
    FROM
      DALS_SCHEDULES
  `

  sentence += ` WHERE DALS_SCHEDULES.ID = :ID `

  return sqldb.querySingle<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    DAYS: string
    STATUS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getActiveSchedsWithFwVersion = SELECT
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}

  FROM DALS_SCHEDULES
  INNER JOIN DALS ON (DALS_SCHEDULES.DAL_ID = DALS.ID)
  INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DEVFWVERS ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID)

  SELECT DALS_SCHEDULES.ID
  SELECT DALS_SCHEDULES.DAL_ID
  SELECT DALS_SCHEDULES.ILLUMINATION_ID
  SELECT DALS_SCHEDULES.TITLE
  SELECT DALS_SCHEDULES.ACTIVE
  SELECT DALS_SCHEDULES.BEGIN_TIME
  SELECT DALS_SCHEDULES.END_TIME
  SELECT DALS_SCHEDULES.DAYS
  SELECT DALS_SCHEDULES.STATUS
  SELECT DEVFWVERS.CURRFW_VERS

  WHERE {DALS_SCHEDULES.ACTIVE} = '1'
*/
export async function getActiveSchedsWithFwVersion (qPars: {
  DAL_CODE?: string
  ILLUMINATION_ID?: number
}) {
  let sentence = `
    SELECT
      DALS_SCHEDULES.ID,
      DALS_SCHEDULES.DAL_ID,
      DEVICES.DEVICE_CODE AS DAL_CODE,
      DALS_SCHEDULES.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.DEFAULT_MODE,
      DALS_SCHEDULES.TITLE,
      DALS_SCHEDULES.ACTIVE,
      DALS_SCHEDULES.BEGIN_TIME,
      DALS_SCHEDULES.END_TIME,
      DALS_SCHEDULES.DAYS,
      DALS_SCHEDULES.STATUS,
      DEVFWVERS.CURRFW_VERS
  `
  sentence += `
    FROM
      DALS_SCHEDULES
    INNER JOIN DALS ON (DALS_SCHEDULES.DAL_ID = DALS.ID)
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DALS_ILLUMINATIONS ON (DALS_ILLUMINATIONS.DAL_ID = DALS_SCHEDULES.DAL_ID AND DALS_ILLUMINATIONS.ILLUMINATION_ID = DALS_SCHEDULES.ILLUMINATION_ID)
    LEFT JOIN DEVFWVERS ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID)
    WHERE DALS_SCHEDULES.ACTIVE = '1'
  `
  if (qPars.DAL_CODE !== undefined) { sentence += ` AND DEVICES.DEVICE_CODE = :DAL_CODE ` }
  if (qPars.ILLUMINATION_ID !== undefined) { sentence += ` AND DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID ` }

  sentence += ` ORDER BY DALS_SCHEDULES.BEGIN_TIME DESC, DALS_SCHEDULES.END_TIME ASC `

  return sqldb.query<{
    ID: number
    DAL_ID: number
    DAL_CODE: string
    ILLUMINATION_ID: number
    PORT: number
    DEFAULT_MODE: string
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    DAYS: string
    STATUS: string
    CURRFW_VERS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM DALS_SCHEDULES
  PARAM ILLUMINATION_ID: {DALS_SCHEDULES.ILLUMINATION_ID}
  FIELD [[IFOWNPROP {:DAL_ID}]] DALS_SCHEDULES.DAL_ID
  FIELD [[IFOWNPROP {:TITLE}]] DALS_SCHEDULES.TITLE
  FIELD [[IFOWNPROP {:ACTIVE}]] DALS_SCHEDULES.ACTIVE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] DALS_SCHEDULES.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] DALS_SCHEDULES.END_TIME
  FIELD [[IFOWNPROP {:DAYS}]] DALS_SCHEDULES.DAYS
  FIELD [[IFOWNPROP {:STATUS}]] DALS_SCHEDULES.STATUS
*/
export async function w_updateByIllumId (qPars: {
  ILLUMINATION_ID: number
  DAL_ID?: number
  TITLE?: string
  ACTIVE?: string
  BEGIN_TIME?: string
  END_TIME?: string
  DAYS?: string
  STATUS?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DAL_ID !== undefined) { fields.push('DAL_ID = :DAL_ID') }
  if (qPars.TITLE !== undefined) { fields.push('TITLE = :TITLE') }
  if (qPars.ACTIVE !== undefined) { fields.push('ACTIVE = :ACTIVE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.DAYS !== undefined) { fields.push('DAYS = :DAYS') }
  if (qPars.STATUS !== undefined) { fields.push('STATUS = :STATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_SCHEDULES SET ${fields.join(', ')} WHERE DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByDal = DELETE
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}
  FROM DALS_SCHEDULES
  WHERE {DALS_SCHEDULES.DAL_ID} = {:DAL_ID}
*/
export async function w_deleteByDal (qPars: { DAL_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_SCHEDULES WHERE DALS_SCHEDULES.DAL_ID = :DAL_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByIllumId = DELETE
  PARAM ILLUMINATION_ID: {DALS_SCHEDULES.ILLUMINATION_ID}
  FROM DALS_SCHEDULES
  WHERE {DALS_SCHEDULES.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_deleteByIllumId (qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_SCHEDULES WHERE DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteByIllumIdAndDalId = DELETE
  PARAM ILLUMINATION_ID: {DALS_SCHEDULES.ILLUMINATION_ID}
  PARAM DAL_ID: {DALS_SCHEDULES.DAL_ID}
  FROM DALS_SCHEDULES
  WHERE {DALS_SCHEDULES.ILLUMINATION_ID} = {:ILLUMINATION_ID}
  WHERE {DALS_SCHEDULES.DAL_ID} = {:DAL_ID}
*/
export async function w_deleteByIllumIdAndDalId (qPars: { ILLUMINATION_ID: number, DAL_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_SCHEDULES WHERE DALS_SCHEDULES.ILLUMINATION_ID = :ILLUMINATION_ID AND DALS_SCHEDULES.DAL_ID = :DAL_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_SCHEDULES.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE DALS_SCHEDULES FROM DALS_SCHEDULES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_SCHEDULES.ILLUMINATION_ID)`;

  const sentence = `DELETE DALS_SCHEDULES FROM DALS_SCHEDULES ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_SCHEDULES', sentence, qPars, operationLogData);
    dbLogger('DALS_SCHEDULES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
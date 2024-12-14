import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
FROM DALS_EXCEPTIONS

FIELD DALS_EXCEPTIONS.DAL_ID
FIELD DALS_EXCEPTIONS.ILLUMINATION_ID
FIELD DALS_EXCEPTIONS.TITLE
FIELD DALS_EXCEPTIONS.ACTIVE
FIELD DALS_EXCEPTIONS.BEGIN_TIME
FIELD DALS_EXCEPTIONS.END_TIME
FIELD DALS_EXCEPTIONS.DAYS
FIELD DALS_EXCEPTIONS.STATUS
*/
export async function w_insert (qPars: {
  DAL_ID: number
  ILLUMINATION_ID: number
  TITLE: string
  ACTIVE: string
  BEGIN_TIME: string
  END_TIME: string
  EXCEPTION_DATE: string
  REPEAT_YEARLY: string
  STATUS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAL_ID')
  fields.push('ILLUMINATION_ID')
  fields.push('TITLE')
  fields.push('ACTIVE')
  fields.push('BEGIN_TIME')
  fields.push('END_TIME')
  fields.push('EXCEPTION_DATE')
  fields.push('REPEAT_YEARLY')
  fields.push('STATUS')

  const sentence = `INSERT INTO DALS_EXCEPTIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM DALS_EXCEPTIONS
  PARAM EXCEPTION_ID: {DALS_EXCEPTIONS.ID}
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}
  PARAM ILLUMINATION_ID: {DALS_EXCEPTIONS.ILLUMINATION_ID}
  FIELD [[IFOWNPROP {:TITLE}]] DALS_EXCEPTIONS.TITLE
  FIELD [[IFOWNPROP {:ACTIVE}]] DALS_EXCEPTIONS.ACTIVE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] DALS_EXCEPTIONS.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] DALS_EXCEPTIONS.END_TIME
  FIELD [[IFOWNPROP {:EXCEPTION_DATE}]] DALS_EXCEPTIONS.EXCEPTION_DATE
  FIELD [[IFOWNPROP {:REPEAT_YEARLY}]] DALS_EXCEPTIONS.REPEAT_YEARLY
  FIELD [[IFOWNPROP {:STATUS}]] DALS_EXCEPTIONS.STATUS
*/
export async function w_update (qPars: {
  EXCEPTION_ID: number
  DAL_ID: number
  ILLUMINATION_ID: number
  TITLE?: string
  ACTIVE?: string
  BEGIN_TIME?: string
  END_TIME?: string
  EXCEPTION_DATE?: string
  REPEAT_YEARLY?: string
  STATUS?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.TITLE !== undefined) { fields.push('TITLE = :TITLE') }
  if (qPars.ACTIVE !== undefined) { fields.push('ACTIVE = :ACTIVE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.EXCEPTION_DATE !== undefined) { fields.push('EXCEPTION_DATE = :EXCEPTION_DATE') }
  if (qPars.REPEAT_YEARLY !== undefined) { fields.push('REPEAT_YEARLY = :REPEAT_YEARLY') }
  if (qPars.STATUS !== undefined) { fields.push('STATUS = :STATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_EXCEPTIONS SET ${fields.join(', ')} WHERE DALS_EXCEPTIONS.ID = :EXCEPTION_ID AND DALS_EXCEPTIONS.DAL_ID = :DAL_ID AND DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM EXCEPTION_ID: {DALS_EXCEPTIONS.ID}
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}
  FROM DALS_EXCEPTIONS
  WHERE {DALS_EXCEPTIONS.ID} = {:EXCEPTION_ID}
  AND {DALS_EXCEPTIONS.DAL_ID} = {:DAL_ID}
  AND {DALS_EXCEPTIONS.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_delete (qPars: { EXCEPTION_ID: number, DAL_ID: number, ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_EXCEPTIONS WHERE DALS_EXCEPTIONS.ID = :EXCEPTION_ID AND DALS_EXCEPTIONS.DAL_ID = :DAL_ID AND DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDalExceptions = SELECT
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}

  FROM DALS_EXCEPTIONS

  SELECT DALS_EXCEPTIONS.ID
  SELECT DALS_EXCEPTIONS.DAL_ID
  SELECT DALS_EXCEPTIONS.ILLUMINATION_ID
  SELECT DALS_EXCEPTIONS.TITLE
  SELECT DALS_EXCEPTIONS.ACTIVE
  SELECT DALS_EXCEPTIONS.BEGIN_TIME
  SELECT DALS_EXCEPTIONS.END_TIME
  SELECT DALS_EXCEPTIONS.EXCEPTION_DATE
  SELECT DALS_EXCEPTIONS.REPEAT_YEARLY
  SELECT DALS_EXCEPTIONS.STATUS
*/
export async function getDalExceptions (qPars: {
  DAL_ID: number
}) {
  let sentence = `
    SELECT
      DALS_EXCEPTIONS.ID,
      DALS_EXCEPTIONS.DAL_ID,
      DALS_EXCEPTIONS.ILLUMINATION_ID,
      DALS_EXCEPTIONS.TITLE,
      DALS_EXCEPTIONS.ACTIVE,
      DALS_EXCEPTIONS.BEGIN_TIME,
      DALS_EXCEPTIONS.END_TIME,
      DATE_FORMAT(DALS_EXCEPTIONS.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DALS_EXCEPTIONS.REPEAT_YEARLY,
      DALS_EXCEPTIONS.STATUS,
      DALS_ILLUMINATIONS.DEFAULT_MODE
  `
  sentence += `
    FROM
      DALS_EXCEPTIONS
    LEFT JOIN DALS_ILLUMINATIONS ON (DALS_ILLUMINATIONS.DAL_ID = DALS_EXCEPTIONS.DAL_ID AND DALS_ILLUMINATIONS.ILLUMINATION_ID = DALS_EXCEPTIONS.ILLUMINATION_ID)
  `
  sentence += ` WHERE DALS_EXCEPTIONS.DAL_ID = :DAL_ID `
  sentence += ` ORDER BY DALS_EXCEPTIONS.BEGIN_TIME ASC, DALS_EXCEPTIONS.END_TIME ASC `

  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    EXCEPTION_DATE: string
    REPEAT_YEARLY: string
    STATUS: string
    DEFAULT_MODE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getIllumExceptions = SELECT
  PARAM ILLUMINATION_ID: {DALS_EXCEPTIONS.ILLUMINATION_ID}

  FROM DALS_EXCEPTIONS

  SELECT DALS_EXCEPTIONS.ID
  SELECT DALS_EXCEPTIONS.DAL_ID
  SELECT DALS_EXCEPTIONS.ILLUMINATION_ID
  SELECT DALS_EXCEPTIONS.TITLE
  SELECT DALS_EXCEPTIONS.ACTIVE
  SELECT DALS_EXCEPTIONS.BEGIN_TIME
  SELECT DALS_EXCEPTIONS.END_TIME
  SELECT DALS_EXCEPTIONS.EXCEPTION_DATE
  SELECT DALS_EXCEPTIONS.REPEAT_YEARLY
  SELECT DALS_EXCEPTIONS.STATUS
*/
export async function getIllumExceptions (qPars: {
  ILLUMINATION_ID: number
}) {
  let sentence = `
    SELECT
      DALS_EXCEPTIONS.ID,
      DALS_EXCEPTIONS.DAL_ID,
      DALS_EXCEPTIONS.ILLUMINATION_ID,
      DALS_EXCEPTIONS.TITLE,
      DALS_EXCEPTIONS.ACTIVE,
      DALS_EXCEPTIONS.BEGIN_TIME,
      DALS_EXCEPTIONS.END_TIME,
      DATE_FORMAT(DALS_EXCEPTIONS.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DALS_EXCEPTIONS.REPEAT_YEARLY,
      DALS_EXCEPTIONS.STATUS
  `
  sentence += `
    FROM
      DALS_EXCEPTIONS
  `
  sentence += ` WHERE DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID `
  sentence += ` ORDER BY DALS_EXCEPTIONS.BEGIN_TIME ASC, DALS_EXCEPTIONS.END_TIME ASC `

  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    TITLE: string
    ACTIVE: string
    BEGIN_TIME: string
    END_TIME: string
    EXCEPTION_DATE: string
    REPEAT_YEARLY: string
    STATUS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDalExceptionById = SELECT
  PARAM ID: {DALS_EXCEPTIONS.ID}

  FROM DALS_EXCEPTIONS

  SELECT DALS_EXCEPTIONS.ID
  SELECT DALS_EXCEPTIONS.DAL_ID
  SELECT DALS_EXCEPTIONS.ILLUMINATION_ID
  SELECT DALS_EXCEPTIONS.TITLE
  SELECT DALS_EXCEPTIONS.ACTIVE
  SELECT DALS_EXCEPTIONS.BEGIN_TIME
  SELECT DALS_EXCEPTIONS.END_TIME
  SELECT DALS_EXCEPTIONS.EXCEPTION_DATE
  SELECT DALS_EXCEPTIONS.REPEAT_YEARLY
  SELECT DALS_EXCEPTIONS.STATUS

  WHERE {DALS_EXCEPTIONS.ID} = {:ID}
*/
export async function getDalExceptionById (qPars: {
  ID: number
}) {
  let sentence = `
    SELECT
      DALS_EXCEPTIONS.ID,
      DALS_EXCEPTIONS.DAL_ID,
      DALS_EXCEPTIONS.ILLUMINATION_ID,
      DALS_EXCEPTIONS.TITLE,
      DALS_EXCEPTIONS.ACTIVE,
      DALS_EXCEPTIONS.BEGIN_TIME,
      DALS_EXCEPTIONS.END_TIME,
      DATE_FORMAT(DALS_EXCEPTIONS.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DALS_EXCEPTIONS.REPEAT_YEARLY,
      DALS_EXCEPTIONS.STATUS
  `
  sentence += `
    FROM
      DALS_EXCEPTIONS
  `

  sentence += ` WHERE DALS_EXCEPTIONS.ID = :ID `

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
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}

  FROM DALS_EXCEPTIONS
  INNER JOIN DALS ON (DALS_EXCEPTIONS.DAL_ID = DALS.ID)
  INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DEVFWVERS ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID)

  SELECT DALS_EXCEPTIONS.ID
  SELECT DALS_EXCEPTIONS.DAL_ID
  SELECT DALS_EXCEPTIONS.ILLUMINATION_ID
  SELECT DALS_EXCEPTIONS.TITLE
  SELECT DALS_EXCEPTIONS.ACTIVE
  SELECT DALS_EXCEPTIONS.BEGIN_TIME
  SELECT DALS_EXCEPTIONS.END_TIME
  SELECT DALS_EXCEPTIONS.EXCEPTION_DATE
  SELECT DALS_EXCEPTIONS.REPEAT_YEARLY
  SELECT DALS_EXCEPTIONS.STATUS
  SELECT DEVFWVERS.CURRFW_VERS

  WHERE {DALS_EXCEPTIONS.ACTIVE} = '1'
*/
export async function getActiveSchedsWithFwVersion (qPars: {
  DAL_CODE?: string
  ILLUMINATION_ID?: number
}) {
  let sentence = `
    SELECT
      DALS_EXCEPTIONS.ID,
      DALS_EXCEPTIONS.DAL_ID,
      DEVICES.DEVICE_CODE AS DAL_CODE,
      DALS_EXCEPTIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.DEFAULT_MODE,
      DALS_EXCEPTIONS.TITLE,
      DALS_EXCEPTIONS.ACTIVE,
      DALS_EXCEPTIONS.BEGIN_TIME,
      DALS_EXCEPTIONS.END_TIME,
      DATE_FORMAT(DALS_EXCEPTIONS.EXCEPTION_DATE, '%d/%m/%Y') AS EXCEPTION_DATE,
      DALS_EXCEPTIONS.REPEAT_YEARLY,
      DALS_EXCEPTIONS.STATUS,
      DEVFWVERS.CURRFW_VERS
  `
  sentence += `
    FROM
      DALS_EXCEPTIONS
    INNER JOIN DALS ON (DALS_EXCEPTIONS.DAL_ID = DALS.ID)
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DALS_ILLUMINATIONS ON (DALS_ILLUMINATIONS.DAL_ID = DALS_EXCEPTIONS.DAL_ID AND DALS_ILLUMINATIONS.ILLUMINATION_ID = DALS_EXCEPTIONS.ILLUMINATION_ID)
    LEFT JOIN DEVFWVERS ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID)
    WHERE DALS_EXCEPTIONS.ACTIVE = '1'
  `
  if (qPars.DAL_CODE !== undefined) { sentence += ` AND DEVICES.DEVICE_CODE = :DAL_CODE ` }
  if (qPars.ILLUMINATION_ID !== undefined) { sentence += ` AND DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID ` }

  sentence += ` ORDER BY DALS_EXCEPTIONS.BEGIN_TIME DESC, DALS_EXCEPTIONS.END_TIME ASC `

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
    EXCEPTION_DATE: string
    REPEAT_YEARLY: string
    STATUS: string
    CURRFW_VERS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  FROM DALS_EXCEPTIONS
  PARAM ILLUMINATION_ID: {DALS_EXCEPTIONS.ILLUMINATION_ID}
  FIELD [[IFOWNPROP {:DAL_ID}]] DALS_EXCEPTIONS.DAL_ID
  FIELD [[IFOWNPROP {:TITLE}]] DALS_EXCEPTIONS.TITLE
  FIELD [[IFOWNPROP {:ACTIVE}]] DALS_EXCEPTIONS.ACTIVE
  FIELD [[IFOWNPROP {:BEGIN_TIME}]] DALS_EXCEPTIONS.BEGIN_TIME
  FIELD [[IFOWNPROP {:END_TIME}]] DALS_EXCEPTIONS.END_TIME
  FIELD [[IFOWNPROP {:EXCEPTION_DATE}]] DALS_EXCEPTIONS.EXCEPTION_DATE
  FIELD [[IFOWNPROP {:REPEAT_YEARLY}]] DALS_EXCEPTIONS.REPEAT_YEARLY
  FIELD [[IFOWNPROP {:STATUS}]] DALS_EXCEPTIONS.STATUS
*/
export async function w_updateByIllumId (qPars: {
  ILLUMINATION_ID: number
  DAL_ID?: number
  TITLE?: string
  ACTIVE?: string
  BEGIN_TIME?: string
  END_TIME?: string
  EXCEPTION_DATE?: string
  REPEAT_YEARLY?: string
  STATUS?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DAL_ID !== undefined) { fields.push('DAL_ID = :DAL_ID') }
  if (qPars.TITLE !== undefined) { fields.push('TITLE = :TITLE') }
  if (qPars.ACTIVE !== undefined) { fields.push('ACTIVE = :ACTIVE') }
  if (qPars.BEGIN_TIME !== undefined) { fields.push('BEGIN_TIME = :BEGIN_TIME') }
  if (qPars.END_TIME !== undefined) { fields.push('END_TIME = :END_TIME') }
  if (qPars.EXCEPTION_DATE !== undefined) { fields.push('EXCEPTION_DATE = :EXCEPTION_DATE') }
  if (qPars.REPEAT_YEARLY !== undefined) { fields.push('REPEAT_YEARLY = :REPEAT_YEARLY') }
  if (qPars.STATUS !== undefined) { fields.push('STATUS = :STATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_EXCEPTIONS SET ${fields.join(', ')} WHERE DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByDal = DELETE
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}
  FROM DALS_EXCEPTIONS
  WHERE {DALS_EXCEPTIONS.DAL_ID} = {:DAL_ID}
*/
export async function w_deleteByDal (qPars: { DAL_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_EXCEPTIONS WHERE DALS_EXCEPTIONS.DAL_ID = :DAL_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByIllumId = DELETE
  PARAM ILLUMINATION_ID: {DALS_EXCEPTIONS.ILLUMINATION_ID}
  FROM DALS_EXCEPTIONS
  WHERE {DALS_EXCEPTIONS.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_deleteByIllumId (qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_EXCEPTIONS WHERE DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
/* @IFHELPER:FUNC delete = DELETE
  PARAM DAL_ID: {DALS_EXCEPTIONS.DAL_ID}
  FROM DALS_EXCEPTIONS
  AND {DALS_EXCEPTIONS.DAL_ID} = {:DAL_ID}
  AND {DALS_EXCEPTIONS.ILLUMINATION_ID} = {:ILLUMINATION_ID}
*/
export async function w_deleteByIllumIdAndDalId (qPars: { DAL_ID: number, ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_EXCEPTIONS WHERE DALS_EXCEPTIONS.DAL_ID = :DAL_ID AND DALS_EXCEPTIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_EXCEPTIONS.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE DALS_EXCEPTIONS FROM DALS_EXCEPTIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_EXCEPTIONS.ILLUMINATION_ID)`;

  const sentence = `DELETE DALS_EXCEPTIONS FROM DALS_EXCEPTIONS ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_EXCEPTIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
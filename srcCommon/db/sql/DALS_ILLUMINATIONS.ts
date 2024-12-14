import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insertIgnore = INSERT
  FROM DALS_ILLUMINATIONS
  FIELD DALS_ILLUMINATIONS.DAL_ID
  FIELD DALS_ILLUMINATIONS.ILLUMINATION_ID
  FIELD DALS_ILLUMINATIONS.PORT
*/
export async function w_insert (qPars: { DAL_ID: number, ILLUMINATION_ID: number, PORT: number, FEEDBACK: number, DEFAULT_MODE?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAL_ID')
  fields.push('ILLUMINATION_ID')
  fields.push('PORT')
  fields.push('FEEDBACK')
  if (qPars.DEFAULT_MODE) { fields.push('DEFAULT_MODE'); }


  const sentence = `INSERT INTO DALS_ILLUMINATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update (qPars: { DAL_ID: number, ILLUMINATION_ID: number, PORT?: number, FEEDBACK?: number, DEFAULT_MODE?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.PORT !== undefined) { fields.push('PORT = :PORT') }
  if (qPars.FEEDBACK !== undefined) { fields.push('FEEDBACK = :FEEDBACK') }
  if (qPars.DEFAULT_MODE !== undefined) { fields.push('DEFAULT_MODE = :DEFAULT_MODE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_ILLUMINATIONS SET ${fields.join(', ')} WHERE DALS_ILLUMINATIONS.DAL_ID = :DAL_ID AND DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDalIllumByIllumId = DELETE
  FROM DALS_ILLUMINATIONS
*/
export async function w_deleteDalIllumByIllumId (qPars: { ILLUMINATION_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_ILLUMINATIONS WHERE DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID `;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDalIllumByDalId = DELETE
  FROM DALS_ILLUMINATIONS
*/
export async function w_deleteDalIllumByDalId (qPars: { DAL_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS_ILLUMINATIONS WHERE DALS_ILLUMINATIONS.DAL_ID = :DAL_ID `;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_ILLUMINATIONS.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE DALS_ILLUMINATIONS FROM DALS_ILLUMINATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_ILLUMINATIONS.ILLUMINATION_ID)`;

  const sentence = `DELETE DALS_ILLUMINATIONS FROM DALS_ILLUMINATIONS ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDalUsedPorts = SELECT LIST
  PARAM DAL_ID: {DALS_ILLUMINATIONS.DAL_ID}
  FROM DALS_ILLUMINATIONS
  SELECT DALS_ILLUMINATIONS.ID
  SELECT DALS_ILLUMINATIONS.DAL_ID
  SELECT DALS_ILLUMINATIONS.ILLUMINATION_ID
  SELECT DALS_ILLUMINATIONS.PORT
  SELECT DALS_ILLUMINATIONS.FEEDBACK

  WHERE {DALS_ILLUMINATIONS.DAL_ID} = ({:DAL_ID})
*/
export function getDalUsedPorts (qPars: { DAL_ID: number }) {
  let sentence = `
    SELECT
      DALS_ILLUMINATIONS.ID,
      DALS_ILLUMINATIONS.DAL_ID,
      DALS_ILLUMINATIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.FEEDBACK
  `
  sentence += `
    FROM
      DALS_ILLUMINATIONS
    WHERE
      DALS_ILLUMINATIONS.DAL_ID = :DAL_ID
  `;

  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    PORT: number
    FEEDBACK: number
  }>(sentence, qPars)
}

export function getDalIllumination (qPars: { DAL_ID: number, ILLUMINATION_ID: number}) {
  let sentence = `
    SELECT
      DALS_ILLUMINATIONS.ID,
      DALS_ILLUMINATIONS.DAL_ID,
      DALS_ILLUMINATIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.FEEDBACK
  `
  sentence += `
    FROM
      DALS_ILLUMINATIONS
    WHERE
      DALS_ILLUMINATIONS.DAL_ID = :DAL_ID
      AND DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID
  `;

  return sqldb.querySingle<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    PORT: number
    FEEDBACK: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC updatePortByIllumId = UPDATE
  FROM DALS_ILLUMINATIONS
  FIELD [[IFOWNPROP {:PORT}]] DAL.PORT
*/
export async function updatePortByIllumId (qPars: { ILLUMINATION_ID: number, PORT: number }, operationLogData: OperationLogData) {
  if (!qPars.ILLUMINATION_ID) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_ILLUMINATIONS SET PORT = :PORT WHERE ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function updateDefaultMode (qPars: { ILLUMINATION_ID: number, DEFAULT_MODE: "0" | "1" | null}, operationLogData: OperationLogData) {
  if (!qPars.ILLUMINATION_ID) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_ILLUMINATIONS SET DEFAULT_MODE = :DEFAULT_MODE WHERE ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDalIllumList = SELECT LIST
  PARAM DAL_CODE: {DEVICES.DEVICE_CODE}
  FROM DALS_ILLUMINATIONS
  INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_ILLUMINATIONS.ILLUMINATION_ID)
  INNER JOIN DALS ON (DALS.ID = DALS_ILLUMINATIONS.DAL_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DALS.DEVICE_ID)
  SELECT DALS_ILLUMINATIONS.ID
  SELECT DALS_ILLUMINATIONS.DAL_ID
  SELECT DALS_ILLUMINATIONS.ILLUMINATION_ID
  SELECT DALS_ILLUMINATIONS.PORT
  SELECT ILLUMINATIONS.NAME
  SELECT ILLUMINATIONS.GRID_VOLTAGE
  SELECT ILLUMINATIONS.GRID_CURRENT
  SELECT ILLUMINATIONS.UNIT_ID

  WHERE {DEVICES.DEVICE_CODE} = ({:DAL_CODE})
*/
export function getDalIllumList (qPars: { DAL_CODE: string }) {
  let sentence = `
    SELECT
      DALS_ILLUMINATIONS.ID,
      DALS_ILLUMINATIONS.DAL_ID,
      DEVICES.DEVICE_CODE AS DAL_CODE,
      DALS_ILLUMINATIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.FEEDBACK,
      DALS_ILLUMINATIONS.DEFAULT_MODE,
      ILLUMINATIONS.NAME,
      ILLUMINATIONS.GRID_VOLTAGE,
      ILLUMINATIONS.GRID_CURRENT,
      ILLUMINATIONS.UNIT_ID
  `
  sentence += `
    FROM
      DALS_ILLUMINATIONS
    INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DALS_ILLUMINATIONS.ILLUMINATION_ID)
    INNER JOIN DALS ON (DALS.ID = DALS_ILLUMINATIONS.DAL_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DALS.DEVICE_ID)
    WHERE
      DEVICES.DEVICE_CODE = :DAL_CODE
  `;

  return sqldb.query<{
    ID: number
    DAL_ID: number
    DAL_CODE: string
    ILLUMINATION_ID: number
    PORT: number
    FEEDBACK: number
    DEFAULT_MODE: string
    NAME: string
    GRID_VOLTAGE: number
    GRID_CURRENT: number
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDalIllumByIllumId = SELECT
  PARAM ILLUMINATION_ID: {DALS_ILLUMINATION.ILLUMINATION_ID}
  FROM DALS_ILLUMINATIONS
  SELECT DALS_ILLUMINATIONS.ID
  SELECT DALS_ILLUMINATIONS.DAL_ID
  SELECT DALS_ILLUMINATIONS.ILLUMINATION_ID
  SELECT DALS_ILLUMINATIONS.PORT
  SELECT DALS_ILLUMINATIONS.FEEDBACK
  SELECT DALS_ILLUMINATIONS.DEFAULT_MODE

  WHERE {DALS_ILLUMINATIONS.ILLUMINATION_ID} = ({:DAL_CODE})
*/
export function getDalIllumByIllumId (qPars: { ILLUMINATION_ID: number }) {
  let sentence = `
    SELECT
      DALS_ILLUMINATIONS.ID,
      DALS_ILLUMINATIONS.DAL_ID,
      DEVICES.DEVICE_CODE AS DAL_CODE,
      DALS_ILLUMINATIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.FEEDBACK,
      DALS_ILLUMINATIONS.DEFAULT_MODE
  `
  sentence += `
    FROM
      DALS_ILLUMINATIONS
    INNER JOIN DALS ON (DALS.ID = DALS_ILLUMINATIONS.DAL_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DALS.DEVICE_ID)
    WHERE
    DALS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID
  `;

  return sqldb.querySingle<{
    ID: number
    DAL_ID: number
    DAL_CODE: string
    ILLUMINATION_ID: number
    PORT: number
    FEEDBACK: number
    DEFAULT_MODE: string
  }>(sentence, qPars)
}

export async function updatePortByIllumIdAndDalId (qPars: { DAL_ID: number, ILLUMINATION_ID: number, PORT: number, FEEDBACK: number }, operationLogData: OperationLogData) {
  if (!qPars.ILLUMINATION_ID) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DALS_ILLUMINATIONS SET PORT = :PORT WHERE ILLUMINATION_ID = :ILLUMINATION_ID AND DAL_ID = :DAL_ID AND FEEDBACK = :FEEDBACK`;

  if (operationLogData) {
    await saveOperationLog('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DALS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getDalsByDalId(qPars: { DAL_ID: number }) {
  let sentence = `
  SELECT 
    di.ID,
    di.PORT,
    di.ILLUMINATION_ID
  FROM 
    DALS_ILLUMINATIONS di
  WHERE di.DAL_ID = :DAL_ID;
  `
  return sqldb.query<{
    ID: number
    PORT: number
    ILLUMINATION_ID: number
  }>(sentence, qPars)
}

export async function getDalWithUnitByIdAndPort(qPars: { DAL_ID: number, PORT: number }) {
  let sentence = `
    SELECT
      DALS_ILLUMINATIONS.ID,
      DALS_ILLUMINATIONS.DAL_ID,
      DALS_ILLUMINATIONS.ILLUMINATION_ID,
      DALS_ILLUMINATIONS.PORT,
      DALS_ILLUMINATIONS.FEEDBACK,
      ILLUMINATIONS.UNIT_ID
  `
  sentence += `
    FROM
      DALS_ILLUMINATIONS
    INNER JOIN ILLUMINATIONS ON (DALS_ILLUMINATIONS.ILLUMINATION_ID = ILLUMINATIONS.ID)
    WHERE
      DALS_ILLUMINATIONS.DAL_ID = :DAL_ID AND DALS_ILLUMINATIONS.PORT = :PORT;
  `;
  return sqldb.query<{
    ID: number
    DAL_ID: number
    ILLUMINATION_ID: number
    PORT: number
    FEEDBACK: number
    UNIT_ID: number
  }>(sentence, qPars)
} 

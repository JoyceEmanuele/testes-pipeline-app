import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

export async function w_insert (qPars: { DMT_ID: number, ILLUMINATION_ID: number, PORT: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DMT_ID')
  fields.push('ILLUMINATION_ID')
  fields.push('PORT')

  const sentence = `INSERT INTO DMTS_ILLUMINATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function getDmtWithUnitByIdAndPort(qPars: { DMT_ID: number, PORT: number }) {
  let sentence = `
    SELECT
      DMTS_ILLUMINATIONS.ID,
      DMTS_ILLUMINATIONS.DMT_ID,
      DMTS_ILLUMINATIONS.ILLUMINATION_ID,
      DMTS_ILLUMINATIONS.PORT,
      ILLUMINATIONS.UNIT_ID
  `
  sentence += `
    FROM
      DMTS_ILLUMINATIONS
    INNER JOIN ILLUMINATIONS ON (DMTS_ILLUMINATIONS.ILLUMINATION_ID = ILLUMINATIONS.ID)
    WHERE
      DMTS_ILLUMINATIONS.DMT_ID = :DMT_ID AND DMTS_ILLUMINATIONS.PORT = :PORT;
  `;
  return sqldb.query<{
    ID: number
    DMT_ID: number
    ILLUMINATION_ID: number
    PORT: number
    UNIT_ID: number
  }>(sentence, qPars)
}

export async function updatePortByIllumIdAndDmtId (qPars: { DMT_ID: number, ILLUMINATION_ID: number, PORT: number }, operationLogData: OperationLogData) {
  if (!qPars.ILLUMINATION_ID) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DMTS_ILLUMINATIONS SET PORT = :PORT WHERE ILLUMINATION_ID = :ILLUMINATION_ID AND DMT_ID = :DMT_ID`;

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getDalsByDalId(qPars: { DMT_ID: number }) {
  let sentence = `
  SELECT 
    di.ID,
    di.PORT,
    di.ILLUMINATION_ID
  FROM 
    DMTS_ILLUMINATIONS di
  WHERE di.DMT_ID = :DMT_ID;
  `
  return sqldb.query<{
    ID: number
    PORT: number
    ILLUMINATION_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDmtIllumList = SELECT LIST
  PARAM DAL_CODE: {DEVICES.DEVICE_CODE}
  FROM DMTS_ILLUMINATIONS
  INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DMTS_ILLUMINATIONS.ILLUMINATION_ID)
  INNER JOIN DALS ON (DALS.ID = DMTS_ILLUMINATIONS.DAL_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DALS.DEVICE_ID)
  SELECT DMTS_ILLUMINATIONS.ID
  SELECT DMTS_ILLUMINATIONS.DMT_ID
  SELECT DMTS_ILLUMINATIONS.ILLUMINATION_ID
  SELECT DMTS_ILLUMINATIONS.PORT
  SELECT ILLUMINATIONS.NAME
  SELECT ILLUMINATIONS.GRID_VOLTAGE
  SELECT ILLUMINATIONS.GRID_CURRENT
  SELECT ILLUMINATIONS.UNIT_ID

  WHERE {DEVICES.DEVICE_CODE} = ({:DMT_CODE})
*/
export function getDmtIllumList (qPars: { DMT_CODE: string }) {
  let sentence = `
    SELECT
      DMTS_ILLUMINATIONS.ID,
      DMTS_ILLUMINATIONS.DMT_ID,
      DEVICES.DEVICE_CODE AS DMT_CODE,
      DMTS_ILLUMINATIONS.ILLUMINATION_ID,
      DMTS_ILLUMINATIONS.PORT,
      ILLUMINATIONS.NAME,
      ILLUMINATIONS.GRID_VOLTAGE,
      ILLUMINATIONS.GRID_CURRENT,
      ILLUMINATIONS.UNIT_ID
  `
  sentence += `
    FROM
      DMTS_ILLUMINATIONS
    INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DMTS_ILLUMINATIONS.ILLUMINATION_ID)
    INNER JOIN DMTS ON (DMTS.ID = DMTS_ILLUMINATIONS.DMT_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMTS.DEVICE_ID)
    WHERE
      DEVICES.DEVICE_CODE = :DMT_CODE
  `;

  return sqldb.query<{
    ID: number
    DMT_ID: number
    DMT_CODE: string
    ILLUMINATION_ID: number
    PORT: number
    NAME: string
    GRID_VOLTAGE: number
    GRID_CURRENT: number
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDmtUsedPorts = SELECT LIST
  PARAM DMT_ID: {DMTS_ILLUMINATIONS.DMT_ID}
  FROM DMTS_ILLUMINATIONS
  SELECT DMTS_ILLUMINATIONS.ID
  SELECT DMTS_ILLUMINATIONS.DMT_ID
  SELECT DMTS_ILLUMINATIONS.NOBREAK_ID
  SELECT DMTS_ILLUMINATIONS.PORT


  WHERE {DMTS_ILLUMINATIONS.DMT_ID} = ({:DMT_ID})
*/
export function getDmtUsedPorts (qPars: { DMT_ID: number }) {
  let sentence = `
    SELECT
      DMTS_ILLUMINATIONS.ID,
      DMTS_ILLUMINATIONS.DMT_ID,
      DMTS_ILLUMINATIONS.ILLUMINATION_ID,
      DMTS_ILLUMINATIONS.PORT,
      ILLUMINATIONS.NAME
      `
  sentence += `
    FROM
      DMTS_ILLUMINATIONS
      LEFT JOIN ILLUMINATIONS ON (DMTS_ILLUMINATIONS.ILLUMINATION_ID = ILLUMINATIONS.ID)
    WHERE
      DMTS_ILLUMINATIONS.DMT_ID = :DMT_ID
  `;

  return sqldb.query<{
    ID: number
    DMT_ID: number
    ILLUMINATION_ID: number
    PORT: number
    NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDmtIlluminationstByIlluminationId = DELETE
  FROM DMTS_NOBREAKS
*/
export async function w_deleteDmtIlluminationstByIlluminationId (qPars: { ILLUMINATION_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMTS_ILLUMINATIONS WHERE DMTS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID `;

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDmtNobreakByDmtId = DELETE
  FROM DMTS_NOBREAKS
*/
export async function w_deleteDmtIllumByDmtId (qPars: { DMT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMTS_ILLUMINATIONS WHERE DMTS_ILLUMINATIONS.DMT_ID = :DMT_ID `;

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DMTS_ILLUMINATIONS.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE DMTS_ILLUMINATIONS FROM DMTS_ILLUMINATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DMTS_ILLUMINATIONS.ILLUMINATION_ID)`;

  const sentence = `DELETE DMTS_ILLUMINATIONS FROM DMTS_ILLUMINATIONS ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DMTS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
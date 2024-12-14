import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DAMS_ILLUMINATIONS
  FIELD DAMS_ILLUMINATIONS.DAM_DEVICE_ID
  FIELD DAMS_ILLUMINATIONS.ILLUMINATION_ID
*/
export async function w_insert (qPars: {
  DAM_DEVICE_ID: number,
  ILLUMINATION_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAM_DEVICE_ID');
  fields.push('ILLUMINATION_ID');

  const sentence = `INSERT INTO DAMS_ILLUMINATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DAMS_ILLUMINATIONS
  FIELD [[IFOWNPROP {:DAM_DEVICE_ID}]] DACS_AUTOMATIONS.DAM_DEVICE_ID
  FIELD [[IFOWNPROP {:ILLUMINATION_ID}]] DACS_AUTOMATIONS.ILLUMINATION_ID
  WHERE {DAMS_ILLUMINATIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DAM_DEVICE_ID?: number,
  ILLUMINATION_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DAM_DEVICE_ID !== undefined) { fields.push('DAM_DEVICE_ID = :DAM_DEVICE_ID') }
  if (qPars.ILLUMINATION_ID !== undefined) { fields.push('ILLUMINATION_ID = :ILLUMINATION_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DAMS_ILLUMINATIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  
  let sentence = `DELETE FROM DAMS_ILLUMINATIONS`;
  
  if (qPars.ID) { conditions.push(`ID = :ID`)}

  if (conditions.length === 0) {
    throw new Error('Error: Forbidden to delete without conditions!');
  }

  sentence += ' WHERE ' + conditions.join(' AND ')

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DAMS_ILLUMINATIONS FROM DAMS_ILLUMINATIONS${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DAMS_ILLUMINATIONS FROM DAMS_ILLUMINATIONS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByIlluminationId(qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DAMS_ILLUMINATIONS WHERE DAMS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientIllumination (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)`;

  const sentence = `DELETE DAMS_ILLUMINATIONS FROM DAMS_ILLUMINATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnitIllumination (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)`;

  const sentence = `DELETE DAMS_ILLUMINATIONS FROM DAMS_ILLUMINATIONS ${join} WHERE ILLUMINATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_fixConsistency_AUT(operationLogData: OperationLogData) {
    const sentence = `DELETE DAMS_ILLUMINATIONS
                      FROM DAMS_ILLUMINATIONS 
                        INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = DAMS_ILLUMINATIONS.DAM_DEVICE_ID)
                        INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DAMS_DEVICES.DEVICE_ID)
                        INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)
                        INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)
                        INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
                      WHERE
                        DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLIENTS.CLIENT_ID`
    
    if (operationLogData) {
      await saveOperationLog('DAMS_ILLUMINATIONS', sentence, {}, operationLogData);
    }
  
    return sqldb.execute(sentence)
  }

export async function getDamsIlluminationsToFix(qPars: {}) {
  const sentence = 
    `SELECT
      DAMS_ILLUMINATIONS.ID AS DAM_ILLUMINATION_ID
    FROM 
      DAMS_ILLUMINATIONS 
      INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = DAMS_ILLUMINATIONS.DAM_DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DAMS_DEVICES.DEVICE_ID)
      INNER JOIN ILLUMINATIONS ON (ILLUMINATIONS.ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ILLUMINATIONS.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLIENTS.CLIENT_ID`;

    return sqldb.query<{
      DAM_ILLUMINATION_ID: number
    }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDamIlluminationUsed = SELECT LIST
  PARAM DAM_DEVICE_ID: {DAMS_ILLUMINATIONS.DAM_DEVICE_ID}
  FROM DAMS_ILLUMINATIONS
  SELECT DAMS_ILLUMINATIONS.ID
  SELECT DAMS_ILLUMINATIONS.DAM_DEVICE_ID
  SELECT DAMS_ILLUMINATIONS.ILLUMINATION_ID

  WHERE {DAMS_ILLUMINATIONS.DAM_DEVICE_ID} = ({:DAM_DEVICE_ID})
*/
export function getDamIlluminationUsed (qPars: { DAM_DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DAMS_ILLUMINATIONS.ID,
      DAMS_ILLUMINATIONS.DAM_DEVICE_ID,
      DAMS_ILLUMINATIONS.ILLUMINATION_ID,
      ILLUMINATIONS.NAME
      `
  sentence += `
    FROM
      DAMS_ILLUMINATIONS
      LEFT JOIN ILLUMINATIONS ON (DAMS_ILLUMINATIONS.ILLUMINATION_ID = ILLUMINATIONS.ID)
    WHERE
      DAMS_ILLUMINATIONS.DAM_DEVICE_ID = :DAM_DEVICE_ID
  `;

  return sqldb.query<{
    ID: number
    DAM_DEVICE_ID: number
    ILLUMINATION_ID: number
    NAME: string
  }>(sentence, qPars)
}
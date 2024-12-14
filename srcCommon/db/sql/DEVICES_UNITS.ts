import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM DEVICES_UNITS
  FIELD DEVICES_UNITS.DEVICE_ID
  FIELD DEVICES_UNITS.UNIT_ID
*/
export async function w_insertIgnore (qPars: { DEVICE_ID: number, UNIT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID')
  fields.push('UNIT_ID')

  const sentence = `INSERT IGNORE INTO DEVICES_UNITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DEVICES_UNITS.ID}
  FROM DEVICES_UNITS
  WHERE {DEVICES_UNITS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID?: number, DEVICE_ID?: number}, operationLogData: OperationLogData) {
  const conditions: string[] = [];

  if (qPars.DEVICE_ID != null) {conditions.push(`DEVICES_UNITS.DEVICE_ID = :DEVICE_ID`)}
  if (qPars.ID != null) {conditions.push(`DEVICES_UNITS.ID = :ID`)}
  if (conditions.length === 0) throw Error('Delete without conditions forbided!');

  const sentence = `DELETE FROM DEVICES_UNITS WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitByDevId = SELECT ROW
  PARAM DEVICE_ID: {DEVICES_UNITS.DEVICE_ID}

  FROM DEVICES_UNITS

  SELECT DEVICES_UNITS.UNIT_ID

  WHERE {DEVICES_UNITS.DEVICE_ID} = {:DEVICE_ID}
*/
export function getUnitByDevId (qPars: { DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DEVICES_UNITS.UNIT_ID
  `
  sentence += `
    FROM
      DEVICES_UNITS
  `
  sentence += ` WHERE DEVICES_UNITS.DEVICE_ID = :DEVICE_ID `

  return sqldb.querySingle<{
    UNIT_ID: number
  }>(sentence, qPars)
}


/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEVICE_ID: {DEVICES_UNITS.DEVICE_ID}
  FROM DEVICES_UNITS
  WHERE {DEVICES_UNITS.DEVICE_ID} = {:DEVICE_ID}
*/
export async function w_deleteRowByDeviceId (qPars: { DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DEVICES_UNITS WHERE DEVICES_UNITS.DEVICE_ID = :DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
                 INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)`;

  const sentence = `DELETE DEVICES_UNITS FROM DEVICES_UNITS${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteRowByUnit = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DEVICES_UNITS
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteRowByUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_UNITS WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;
  
  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DEVICES_UNITS FROM DEVICES_UNITS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeClientUnits (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE DEVICES_UNITS FROM DEVICES_UNITS 
                      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID) 
                    WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
/* @IFHELPER:FUNC insert = INSERT
  FROM DEVICES_UNITS
  FIELD DEVICES_UNITS.DEVICE_ID
  FIELD DEVICES_UNITS.UNIT_ID
*/
export async function w_insert (qPars: { DEVICE_ID: number, UNIT_ID: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  fields.push('UNIT_ID');

  const sentence = `INSERT INTO DEVICES_UNITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DEVICES_UNITS
  FIELD [[IFOWNPROP {:UNIT_ID}]] DEVICES_UNITS.UNIT_ID
  WHERE {DEVICES_UNITS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  UNIT_ID?: number,
  DEVICE_ID?: number
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
  if (qPars.DEVICE_ID !== undefined) { fields.push('DEVICE_ID = :DEVICE_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DEVICES_UNITS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteDeviceUnit(qPars: { DEVICE_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_UNITS WHERE DEVICES_UNITS.DEVICE_ID = :DEVICE_ID`;

  if (operationLogData) {
      await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
      dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteOfUnitFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DEVICES_UNITS
      FROM
        DEVICES_UNITS 
        INNER JOIN DEVICES ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
        INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
        INNER JOIN DRIS_CHILLERS ON (DRIS_CHILLERS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
        INNER JOIN CHILLERS ON (DRIS_CHILLERS.CHILLER_ID = CHILLERS.ID)
      WHERE
        CHILLERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DEVICES_UNITS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_UNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
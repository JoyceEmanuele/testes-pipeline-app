import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM DEVICES_CLIENTS
  FIELD DEVICES_CLIENTS.DEVICE_ID
  FIELD DEVICES_CLIENTS.CLIENT_ID
*/
export async function w_insertIgnore (qPars: { DEVICE_ID: number, CLIENT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID')
  fields.push('CLIENT_ID')

  const sentence = `INSERT IGNORE INTO DEVICES_CLIENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DEVICES_CLIENTS.ID}
  FROM DEVICES_CLIENTS
  WHERE {DEVICES_CLIENTS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID?: number, DEVICE_ID?: number}, operationLogData: OperationLogData) {
  const conditions: string[] = [];

  if (qPars.DEVICE_ID != null) {conditions.push(`DEVICES_CLIENTS.DEVICE_ID = :DEVICE_ID`)}
  if (qPars.ID != null) {conditions.push(`DEVICES_CLIENTS.ID = :ID`)}
  if (conditions.length === 0) throw Error('Delete without conditions forbided!');

  const sentence = `DELETE FROM DEVICES_CLIENTS WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DEVICE_ID: {DEVICES_CLIENTS.DEVICE_ID}
  FROM DEVICES_CLIENTS
  WHERE {DEVICES_CLIENTS.DEVICE_ID} = {:DEVICE_ID}
*/
export async function w_deleteRowFromDeviceId (qPars: { DEVICE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_CLIENTS WHERE DEVICES_CLIENTS.DEVICE_ID = :DEVICE_ID`;
  
  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_CLIENTS WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DEVICES_CLIENTS FROM DEVICES_CLIENTS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DEVICES_CLIENTS
  FIELD DEVICES_CLIENTS.DEVICE_ID
  FIELD DEVICES_CLIENTS.CLIENT_ID
*/
export async function w_insert (qPars: { DEVICE_ID: number, CLIENT_ID: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  fields.push('CLIENT_ID');

  const sentence = `INSERT INTO DEVICES_CLIENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DEVICES_CLIENTS
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteRowByClientId (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_CLIENTS WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;
  
  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DEVICES_CLIENTS
  FIELD [[IFOWNPROP {:CLIENT_ID}]] DEVICES_CLIENTS.CLIENT_ID
  WHERE {DEVICES_CLIENTS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  CLIENT_ID?: number,
  DEVICE_ID?: number
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.CLIENT_ID !== undefined) { fields.push('CLIENT_ID = :CLIENT_ID') }
  if (qPars.DEVICE_ID !== undefined) { fields.push('DEVICE_ID = :DEVICE_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DEVICES_CLIENTS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteDeviceClient(qPars: { DEVICE_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES_CLIENTS WHERE DEVICES_CLIENTS.DEVICE_ID = :DEVICE_ID`;

  if (operationLogData) {
      await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
      dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getClientByDevId (qPars: { DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DEVICES_CLIENTS.CLIENT_ID
  `
  sentence += `
    FROM
    DEVICES_CLIENTS
  `
  sentence += ` WHERE DEVICES_CLIENTS.DEVICE_ID = :DEVICE_ID `

  return sqldb.querySingle<{
    CLIENT_ID: number
  }>(sentence, qPars)
}

export async function w_deleteOfClientFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DEVICES_CLIENTS
      FROM
        DEVICES_CLIENTS 
        INNER JOIN DEVICES ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
        INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
        INNER JOIN DRIS_CHILLERS ON (DRIS_CHILLERS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
        INNER JOIN CHILLERS ON (DRIS_CHILLERS.CHILLER_ID = CHILLERS.ID)
      WHERE
        CHILLERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DEVICES_CLIENTS', sentence, qPars, operationLogData);
    dbLogger('DEVICES_CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
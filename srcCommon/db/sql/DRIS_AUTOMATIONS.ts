import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DRIS_AUTOMATIONS
  FIELD DRIS_AUTOMATIONS.DRI_DEVICE_ID
  FIELD DRIS_AUTOMATIONS.MACHINE_ID
*/
export async function w_insert (qPars: {
  DRI_DEVICE_ID: number,
  MACHINE_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DRI_DEVICE_ID');
  fields.push('MACHINE_ID');

  const sentence = `INSERT INTO DRIS_AUTOMATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DRIS_AUTOMATIONS
  FIELD [[IFOWNPROP {:DRI_DEVICE_ID}]] DRIS_AUTOMATIONS.DRI_DEVICE_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] DRIS_AUTOMATIONS.MACHINE_ID
  WHERE {DRIS_AUTOMATIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DRI_DEVICE_ID?: number,
  MACHINE_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DRI_DEVICE_ID !== undefined) { fields.push('DRI_DEVICE_ID = :DRI_DEVICE_ID') }
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DRIS_AUTOMATIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getDrisAutomationInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DRIS_AUTOMATIONS.ID AS DUT_AUTOMATION_ID,
      DRIS_AUTOMATIONS.MACHINE_ID AS MACHINE_ID,
      MACHINES.NAME AS MACHINE_NAME
    `
  sentence += `
    FROM
      DRIS_AUTOMATIONS 
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_AUTOMATIONS.DRI_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (DRIS_AUTOMATIONS.MACHINE_ID = MACHINES.ID)
  `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DUT_AUTOMATION_ID: number
    MACHINE_ID: number
    MACHINE_NAME: string
  }>(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DRIS_DEVICES ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DRIS_AUTOMATIONS FROM DRIS_AUTOMATIONS${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientMachine (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN MACHINES ON (MACHINES.ID = DRIS_AUTOMATIONS.MACHINE_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE DRIS_AUTOMATIONS FROM DRIS_AUTOMATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DRIS_DEVICES ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DRIS_AUTOMATIONS FROM DRIS_AUTOMATIONS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DRIS_AUTOMATIONS WHERE DRIS_AUTOMATIONS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  
  let sentence = `DELETE FROM DRIS_AUTOMATIONS`;
  
  if (qPars.ID) { conditions.push(`ID = :ID`)}

  if (conditions.length === 0) {
    throw new Error('Error: Forbidden to delete without conditions!');
  }

  sentence += ' WHERE ' + conditions.join(' AND ')

  if (operationLogData) {
    await saveOperationLog('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DRIS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getDrisAutomationsToFix(qPars: {}) {
  const sentence = 
    `SELECT
      DRIS_AUTOMATIONS.ID AS DRI_AUTOMATION_ID
    FROM 
      DRIS_AUTOMATIONS 
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_AUTOMATIONS.DRI_DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DRIS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (MACHINES.ID = DRIS_AUTOMATIONS.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLIENTS.CLIENT_ID`;

    return sqldb.query<{
      DRI_AUTOMATION_ID: number
    }>(sentence, qPars)
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DUTS_AUTOMATION.ID}
  FROM DUTS_AUTOMATION
  WHERE {DUTS_AUTOMATION.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_AUTOMATION WHERE DUTS_AUTOMATION.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = 
    `DELETE DUTS_AUTOMATION FROM DUTS_AUTOMATION
      INNER JOIN MACHINES ON (DUTS_AUTOMATION.MACHINE_ID = MACHINES.ID)
      INNER JOIN EVAPORATORS ON (EVAPORATORS.MACHINE_ID = MACHINES.ID)

      WHERE EVAPORATORS.ASSET_ID =:ASSET_ID`;

  if (operationLogData) {
      await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
      dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_AUTOMATION FROM DUTS_AUTOMATION${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientMachine (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN MACHINES ON (MACHINES.ID = DUTS_AUTOMATION.MACHINE_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE DUTS_AUTOMATION FROM DUTS_AUTOMATION ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_AUTOMATION FROM DUTS_AUTOMATION${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_AUTOMATION WHERE DUTS_AUTOMATION.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_fixConsistency (operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_AUTOMATION FROM DUTS_AUTOMATION${join} WHERE DEVICES_CLIENTS.ID IS NULL OR DEVICES_UNITS.ID IS NULL`;

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, {}, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, {}, operationLogData);
  }

  return sqldb.execute(sentence, {})
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_AUTOMATION
  FIELD DUTS_AUTOMATION.DUT_DEVICE_ID
  FIELD DUTS_AUTOMATION.MACHINE_ID
*/
export async function w_insert (qPars: { DUT_DEVICE_ID: number, MACHINE_ID: number, DISAB: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID');
  fields.push('MACHINE_ID');
  fields.push('DISAB');

  const sentence = `INSERT INTO DUTS_AUTOMATION (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DUTS_AUTOMATION
  FIELD [[IFOWNPROP {:DUT_DEVICE_ID}]] DUTS_AUTOMATION.DUT_DEVICE_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] DUTS_AUTOMATION.MACHINE_ID
  WHERE {DUTS_AUTOMATION.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    DUT_DEVICE_ID?: number,
    MACHINE_ID?: number,
    DISAB?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.DUT_DEVICE_ID !== undefined) { fields.push('DUT_DEVICE_ID = :DUT_DEVICE_ID') }
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (qPars.DISAB !== undefined) { fields.push('DISAB = :DISAB') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DUTS_AUTOMATION SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DUTS_AUTOMATION', sentence, qPars, operationLogData);
      dbLogger('DUTS_AUTOMATION', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }


export function getDutsAutomationInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DUTS_AUTOMATION.ID AS DUT_AUTOMATION_ID,
      DUTS_AUTOMATION.MACHINE_ID AS MACHINE_ID,
      DUTS_AUTOMATION.DISAB AS DISAB
    `
  sentence += `
    FROM
      DUTS_AUTOMATION 
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
  `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DUT_AUTOMATION_ID: number
    MACHINE_ID: number
    DISAB: number
  }>(sentence, qPars)
}

export async function getDutsAutomationToFix(qPars: {}) {
  const sentence = 
    `SELECT
      DUTS_AUTOMATION.ID AS DUT_AUTOMATION_ID
    FROM 
      DUTS_AUTOMATION 
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DUTS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (MACHINES.ID = DUTS_AUTOMATION.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLUNITS.CLIENT_ID`;

    return sqldb.query<{
      DUT_AUTOMATION_ID: number
    }>(sentence, qPars)
}
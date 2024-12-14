import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_removeDut(qPars: { DUT_ID: string }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DUTS_REFERENCE
      FROM 
          DUTS_REFERENCE
          INNER JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
          INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
          INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      WHERE
          DEVICES.DEVICE_CODE = :DUT_ID
  `
  if (operationLogData) {
      await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
      dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeClientDuts(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `
  DELETE 
      DUTS_REFERENCE
  FROM
      DUTS_REFERENCE
      INNER JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE
      DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
      await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
      dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_REFERENCE WHERE DUTS_REFERENCE.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRowFromEnvironment (qPars: { ENVIRONMENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_MONITORING ON (DUTS_REFERENCE.DUT_MONITORING_ID = DUTS_MONITORING.ID)
                 INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)`

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE${join} WHERE ENVIRONMENTS.ID = :ENVIRONMENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_REFERENCE WHERE DUTS_REFERENCE.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_MONITORING ON (DUTS_REFERENCE.DUT_MONITORING_ID = DUTS_MONITORING.ID)
                 INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientMachine (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN MACHINES ON (MACHINES.ID = DUTS_REFERENCE.MACHINE_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_MONITORING ON (DUTS_REFERENCE.DUT_MONITORING_ID = DUTS_MONITORING.ID)
                 INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_fixConsistency (operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
                 INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE${join} WHERE DEVICES_CLIENTS.ID IS NULL OR DEVICES_UNITS.ID IS NULL`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, {}, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, {}, operationLogData);
  }

  return sqldb.execute(sentence, {})
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_REFERENCE
  FIELD DUTS_REFERENCE.DUT_MONITORING_ID
  FIELD DUTS_REFERENCE.MACHINE_ID
*/
export async function w_insert (qPars: { DUT_MONITORING_ID: number, MACHINE_ID: number, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_MONITORING_ID');
  fields.push('MACHINE_ID');

  const sentence = `INSERT INTO DUTS_REFERENCE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DUTS_REFERENCE
  FIELD [[IFOWNPROP {:DUT_MONITORING_ID}]] DUTS_REFERENCE.DUT_MONITORING_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] DUTS_REFERENCE.MACHINE_ID
  WHERE {DUTS_REFERENCE.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    DUT_MONITORING_ID?: number,
    MACHINE_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.DUT_MONITORING_ID !== undefined) { fields.push('DUT_MONITORING_ID = :DUT_MONITORING_ID') }
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DUTS_REFERENCE SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
      dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

export async function getDutsReferenceToFix(qPars: {}) {
  const sentence = 
    `SELECT
        DUTS_REFERENCE.ID AS DUT_REFERENCE_ID
    FROM 
      DUTS_REFERENCE 
      INNER JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DUTS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (MACHINES.ID = DUTS_REFERENCE.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLUNITS.CLIENT_ID`;

    return sqldb.query<{
      DUT_REFERENCE_ID: number
    }>(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
                 INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
              `;

  const sentence = `DELETE DUTS_REFERENCE FROM DUTS_REFERENCE${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_REFERENCE', sentence, qPars, operationLogData);
    dbLogger('DUTS_REFERENCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DUTS_MONITORING.ID}
  FROM DUTS_MONITORING
  WHERE {DUTS_MONITORING.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID?: number, ENVIRONMENT_ID?: number}, operationLogData: OperationLogData) {
  const conditions = [] as string[];
  if (qPars.ENVIRONMENT_ID != null) {conditions.push(`DUTS_MONITORING.ENVIRONMENT_ID = :ENVIRONMENT_ID`)}
  if (qPars.ID != null) {conditions.push(`DUTS_MONITORING.ID = :ID`)}
  if (conditions.length === 0) throw Error('Delete without conditions forbided!');

  const sentence = `DELETE FROM DUTS_MONITORING WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_MONITORING FROM DUTS_MONITORING ${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromEnvironmentClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)`;

  const sentence = `DELETE DUTS_MONITORING FROM DUTS_MONITORING ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
              `;

  const sentence = `DELETE DUTS_MONITORING FROM DUTS_MONITORING${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_MONITORING FROM DUTS_MONITORING${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_fixConsistency (operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_MONITORING FROM DUTS_MONITORING${join} WHERE DEVICES_CLIENTS.ID IS NULL OR DEVICES_UNITS.ID IS NULL`;

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, {}, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, {}, operationLogData);
  }

  return sqldb.execute(sentence, {})
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_MONITORING
  FIELD DUTS_MONITORING.DUT_DEVICE_ID
  FIELD DUTS_MONITORING.ENVIRONMENT_ID
*/
export async function w_insert (qPars: { DUT_DEVICE_ID: number, ENVIRONMENT_ID: number, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID');
  fields.push('ENVIRONMENT_ID');

  const sentence = `INSERT INTO DUTS_MONITORING (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
    dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DUTS_MONITORING
  FIELD [[IFOWNPROP {:DUT_DEVICE_ID}]] DUTS_MONITORING.DUT_DEVICE_ID
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]] DUTS_MONITORING.ENVIRONMENT_ID
  WHERE {DUTS_MONITORING.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    DUT_DEVICE_ID?: number,
    ENVIRONMENT_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.DUT_DEVICE_ID !== undefined) { fields.push('DUT_DEVICE_ID = :DUT_DEVICE_ID') }
    if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DUTS_MONITORING SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DUTS_MONITORING', sentence, qPars, operationLogData);
      dbLogger('DUTS_MONITORING', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
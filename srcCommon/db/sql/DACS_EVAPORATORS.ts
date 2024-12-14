import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteDacInfo = DELETE
  PARAM DAC_DEVICE_ID: {DACS_EVAPORATORS.DAC_DEVICE_ID}
  FROM DACS_EVAPORATORS
  WHERE {DACS_EVAPORATORS.DAC_DEVICE_ID} = {:DAC_DEVICE_ID}
*/
export async function w_deleteDacInfo(qPars: { DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_EVAPORATORS WHERE DACS_EVAPORATORS.DAC_DEVICE_ID = :DAC_DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDacs = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DACS_EVAPORATORS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_EVAPORATORS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDacs(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_EVAPORATORS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_EVAPORATORS FROM DACS_EVAPORATORS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientAsset(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE DACS_EVAPORATORS FROM DACS_EVAPORATORS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DACS_EVAPORATORS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_EVAPORATORS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_EVAPORATORS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_EVAPORATORS FROM DACS_EVAPORATORS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromMachine = DELETE
  PARAM MACHINE_ID: {EVAPORATORS.MACHINE_ID}
  FROM DACS_EVAPORATORS
  INNER JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
  WHERE {EVAPORATORS.MACHINE_ID} = {:MACHINE_ID}
  */
export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
        DELETE
          DACS_EVAPORATORS
        FROM
          DACS_EVAPORATORS
          INNER JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
        WHERE
          EVAPORATORS.MACHINE_ID = :MACHINE_ID
        `

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DAC_EVAPORATOR_ID: {DACS_EVAPORATORS.ID}
  FROM DACS_EVAPORATORS
  WHERE {DACS_EVAPORATORS.ID} = {:DAC_EVAPORATOR_ID}
*/
export async function w_deleteRow(qPars: { DAC_EVAPORATOR_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_EVAPORATORS WHERE DACS_EVAPORATORS.ID = :DAC_EVAPORATOR_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DACS_EVAPORATORS
  FIELD DACS_EVAPORATORS.EVAPORATOR_ID
  FIELD DACS_EVAPORATORS.DAC_DEVICE_ID
*/
export async function w_insert(qPars: { EVAPORATOR_ID: number, DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('EVAPORATOR_ID')
  fields.push('DAC_DEVICE_ID')

  let sentence = `INSERT INTO DACS_EVAPORATORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
    dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DACS_EVAPORATORS
      FROM
          DACS_EVAPORATORS
          INNER JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DACS_EVAPORATORS', sentence, qPars, operationLogData);
      dbLogger('DACS_EVAPORATORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}



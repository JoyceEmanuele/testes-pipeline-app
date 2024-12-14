import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DAC_ASSET_HEAT_EXCHANGER_ID: {DACS_ASSET_HEAT_EXCHANGERS.ID}
  FROM DACS_ASSET_HEAT_EXCHANGERS
  WHERE {DACS_ASSET_HEAT_EXCHANGERS.ID} = {:DAC_ASSET_HEAT_EXCHANGER_ID}
*/
export async function w_deleteRow(qPars: { DAC_ASSET_HEAT_EXCHANGER_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_ASSET_HEAT_EXCHANGERS WHERE DACS_ASSET_HEAT_EXCHANGERS.ID = :DAC_ASSET_HEAT_EXCHANGER_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteDacInfo = DELETE
  PARAM DAC_DEVICE_ID: {DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID}
  FROM DACS_ASSET_HEAT_EXCHANGERS
  WHERE {DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID} = {:DAC_DEVICE_ID}
*/
export async function w_deleteDacInfo(qPars: { DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_ASSET_HEAT_EXCHANGERS WHERE DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = :DAC_DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDacs = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DACS_ASSET_HEAT_EXCHANGERS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDacs(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_ASSET_HEAT_EXCHANGERS FROM DACS_ASSET_HEAT_EXCHANGERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DACS_ASSET_HEAT_EXCHANGERS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_ASSET_HEAT_EXCHANGERS FROM DACS_ASSET_HEAT_EXCHANGERS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DACS_ASSET_HEAT_EXCHANGERS
      FROM
        DACS_ASSET_HEAT_EXCHANGERS
        INNER JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      WHERE
        ASSET_HEAT_EXCHANGERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function  w_insert_update(qPars: { ASSET_HEAT_EXCHANGER_ID: number, DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_HEAT_EXCHANGER_ID')
  fields.push('DAC_DEVICE_ID')

  let sentence = `INSERT INTO DACS_ASSET_HEAT_EXCHANGERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})` 
  const updateFields: string[] = []
  updateFields.push('ASSET_HEAT_EXCHANGER_ID = :ASSET_HEAT_EXCHANGER_ID')
  updateFields.push('DAC_DEVICE_ID = :DAC_DEVICE_ID')

  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')}`

  if (operationLogData) {
    await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DACS_ASSET_HEAT_EXCHANGERS
      FROM
          DACS_ASSET_HEAT_EXCHANGERS
          INNER JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGERS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('DACS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
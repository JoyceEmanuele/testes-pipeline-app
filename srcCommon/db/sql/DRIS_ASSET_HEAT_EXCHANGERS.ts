import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DRI_ASSET_HEAT_EXCHANGER_ID: {DRIS_ASSET_HEAT_EXCHANGERS.ID}
  FROM DRIS_ASSET_HEAT_EXCHANGERS
  WHERE {DRIS_ASSET_HEAT_EXCHANGERS.ID} = {:DRI_ASSET_HEAT_EXCHANGER_ID}
*/
export async function w_deleteRow(qPars: { DRI_ASSET_HEAT_EXCHANGER_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DRIS_ASSET_HEAT_EXCHANGERS WHERE DRIS_ASSET_HEAT_EXCHANGERS.ID = :DRI_ASSET_HEAT_EXCHANGER_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDriInfo = DELETE
  PARAM DRI_DEVICE_ID: {DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID}
  FROM DRIS_ASSET_HEAT_EXCHANGERS
  WHERE {DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID} = {:DRI_DEVICE_ID}
*/
export async function w_deleteDriInfo(qPars: { DRI_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DRIS_ASSET_HEAT_EXCHANGERS WHERE DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID = :DRI_DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDris = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DRIS_ASSET_HEAT_EXCHANGERS
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDris(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DRIS_ASSET_HEAT_EXCHANGERS FROM DRIS_ASSET_HEAT_EXCHANGERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DRIS_ASSET_HEAT_EXCHANGERS
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DRIS_ASSET_HEAT_EXCHANGERS FROM DRIS_ASSET_HEAT_EXCHANGERS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DRIS_ASSET_HEAT_EXCHANGERS
      FROM
        DRIS_ASSET_HEAT_EXCHANGERS
        INNER JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DRIS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      WHERE
        ASSET_HEAT_EXCHANGERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insert(qPars: { ASSET_HEAT_EXCHANGER_ID: number, DRI_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_HEAT_EXCHANGER_ID')
  fields.push('DRI_DEVICE_ID')

  let sentence = `INSERT INTO DRIS_ASSET_HEAT_EXCHANGERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DRIS_ASSET_HEAT_EXCHANGERS
      FROM
      DRIS_ASSET_HEAT_EXCHANGERS
          INNER JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DRIS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGERS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('DRIS_ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
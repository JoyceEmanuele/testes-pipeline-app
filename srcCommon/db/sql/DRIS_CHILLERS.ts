import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DRI_CHILLER_ID: {DRIS_CHILLERS.ID}
  FROM DRIS_CHILLERS
  WHERE {DRIS_CHILLERS.ID} = {:DRI_CHILLER_ID}
*/
export async function w_deleteRow(qPars: { DRI_CHILLER_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DRIS_CHILLERS WHERE DRIS_CHILLERS.ID = :DRI_CHILLER_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDriInfo = DELETE
  PARAM DRI_DEVICE_ID: {DRIS_CHILLERS.DRI_DEVICE_ID}
  FROM DRIS_CHILLERS
  WHERE {DRIS_CHILLERS.DRI_DEVICE_ID} = {:DRI_DEVICE_ID}
*/
export async function w_deleteDriInfo(qPars: { DRI_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DRIS_CHILLERS WHERE DRIS_CHILLERS.DRI_DEVICE_ID = :DRI_DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDris = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DRIS_CHILLERS
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLERS.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDris(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLERS.DRI_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DRIS_CHILLERS FROM DRIS_CHILLERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DRIS_CHILLERS
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLERS.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLERS.DRI_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DRIS_CHILLERS FROM DRIS_CHILLERS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DRIS_CHILLERS
      FROM
        DRIS_CHILLERS
        INNER JOIN CHILLERS ON (CHILLERS.ID = DRIS_CHILLERS.CHILLER_ID)
      WHERE
        CHILLERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertUpdate(qPars: { CHILLER_ID: number, DRI_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CHILLER_ID')
  fields.push('DRI_DEVICE_ID')

  let sentence = `INSERT INTO DRIS_CHILLERS (${fields.join(', ')}) VALUES (:${fields.join(', :')}) ON DUPLICATE KEY UPDATE CHILLER_ID = VALUES(CHILLER_ID);`

  if (operationLogData) {
    await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
    dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DRIS_CHILLERS
      FROM
      DRIS_CHILLERS
          INNER JOIN CHILLERS ON (CHILLERS.ID = DRIS_CHILLERS.CHILLER_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = CHILLERS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DRIS_CHILLERS', sentence, qPars, operationLogData);
      dbLogger('DRIS_CHILLERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

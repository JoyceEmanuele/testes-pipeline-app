import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteDutDuoInfo = DELETE
  PARAM DUT_DUO_ID: {DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID}
  FROM DUTS_DUO_AIR_CURTAINS
  WHERE {DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID} = {:DUT_DUO_ID}
*/
export async function w_deleteDutDuoInfo(qPars: { DUT_DUO_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_AIR_CURTAINS WHERE DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID = :DUT_DUO_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDutsDuo = DELETE
    PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
    FROM DUTS_DUO_AIR_CURTAINS
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDUTS_DUO(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DUTS_DUO_AIR_CURTAINS FROM DUTS_DUO_AIR_CURTAINS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientAsset = DELETE
    PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
    FROM DUTS_DUO_AIR_CURTAINS
    INNER JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientAsset(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE DUTS_DUO_AIR_CURTAINS FROM DUTS_DUO_AIR_CURTAINS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
    PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
    FROM DUTS_DUO_AIR_CURTAINS
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DUTS_DUO_AIR_CURTAINS FROM DUTS_DUO_AIR_CURTAINS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DUT_DUO_AIR_CURTAINS_ID: {DUTS_DUO_AIR_CURTAINS.ID}
  FROM DUTS_DUO_AIR_CURTAINS
  WHERE {DUTS_DUO_AIR_CURTAINS.ID} = {:DUT_DUO_AIR_CURTAIN_ID}
*/
export async function w_deleteRow(qPars: { DUT_DUO_AIR_CURTAIN_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_AIR_CURTAINS WHERE DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID = :DUT_DUO_AIR_CURTAIN_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_DUO_AIR_CURTAINS
  FIELD DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID
  FIELD DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID
*/
export async function w_insert(qPars: { AIR_CURTAIN_ID: number, DUT_DUO_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('AIR_CURTAIN_ID')
  fields.push('DUT_DUO_ID')

  let sentence = `INSERT INTO DUTS_DUO_AIR_CURTAINS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteByAssetId = DELETE
    PARAM ASSET_ID: {ASSETS.ID}
    FROM DUTS_DUO_AIR_CURTAINS
    INNER JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
    WHERE ASSETS.ID =:ASSET_ID
*/
export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DUTS_DUO_AIR_CURTAINS
      FROM
          DUTS_DUO_AIR_CURTAINS
          INNER JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
      dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteRowsAirCurtains = DELETE
    PARAM ids: {DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID}
    FROM DUTS_DUO_AIR_CURTAINS
    WHERE DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID IN (:ids)
*/
export async function w_deleteRowsAirCurtains(ids: number[], operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_AIR_CURTAINS WHERE DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID IN (:ids)`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_AIR_CURTAINS', sentence, { ids }, operationLogData);
    dbLogger('DUTS_DUO_AIR_CURTAINS', sentence, { ids }, operationLogData);
  }

  return sqldb.execute(sentence, { ids });
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteDutDuoInfo = DELETE
  PARAM DUT_DUO_ID: {DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID}
  FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
  WHERE {DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID} = {:DUT_DUO_ID}
*/
export async function w_deleteDutDuoInfo(qPars: { DUT_DUO_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS WHERE DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = :DUT_DUO_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDutsDuo = DELETE
    PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
    FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDUTS_DUO(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DUTS_DUO_ASSET_HEAT_EXCHANGER_ID FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientAsset = DELETE
    PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
    FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS
    INNER JOIN ASSET_HEAT_EXCHANGER_ID ON (ASSET_HEAT_EXCHANGER_ID.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.EVAPORATOR_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGER_ID.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientAsset(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN ASSET_HEAT_EXCHANGER_ID ON (ASSET_HEAT_EXCHANGER_ID.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.EVAPORATOR_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGER_ID.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE DUTS_DUO_ASSET_HEAT_EXCHANGER_ID FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
    PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
    FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DUTS_DUO ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DUTS_DUO_ASSET_HEAT_EXCHANGER_ID FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DUT_DUO_ASSET_HEAT_EXCHANGER_ID_ID: {DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.ID}
  FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
  WHERE {DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.ID} = {:DUT_DUO_ASSET_HEAT_EXCHANGER_ID_ID}
*/
export async function w_deleteRow(qPars: { DUT_DUO_ASSET_HEAT_EXCHANGER_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS WHERE DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID = :DUT_DUO_ASSET_HEAT_EXCHANGER_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
  FIELD DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.EVAPORATOR_ID
  FIELD DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.DUT_DUO_ID
*/
export async function w_insert(qPars: { ASSET_HEAT_EXCHANGER_ID: number, DUT_DUO_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_HEAT_EXCHANGER_ID')
  fields.push('DUT_DUO_ID')

  let sentence = `INSERT INTO DUTS_DUO_ASSET_HEAT_EXCHANGERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteByAssetId = DELETE
    PARAM ASSET_ID: {ASSETS.ID}
    FROM DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
    INNER JOIN ASSET_HEAT_EXCHANGER_ID ON (ASSET_HEAT_EXCHANGER_ID.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.EVAPORATOR_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGER_ID.ASSET_ID)
    WHERE ASSETS.ID =:ASSET_ID
*/
export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
      FROM
          DUTS_DUO_ASSET_HEAT_EXCHANGER_ID
          INNER JOIN ASSET_HEAT_EXCHANGER_ID ON (ASSET_HEAT_EXCHANGER_ID.ID = DUTS_DUO_ASSET_HEAT_EXCHANGER_ID.EVAPORATOR_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGER_ID.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
      dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGER_ID', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteRowsAssetHeatExchangers = DELETE
    PARAM ids: {DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID}
    FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS
    WHERE DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID IN (:ids)
*/
export async function w_deleteRowsAssetHeatExchangers(ids: number[], operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DUTS_DUO_ASSET_HEAT_EXCHANGERS WHERE DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID IN (:ids)`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO_ASSET_HEAT_EXCHANGERS', sentence, { ids }, operationLogData);
    dbLogger('DUTS_DUO_ASSET_HEAT_EXCHANGERS', sentence, { ids }, operationLogData);
  }

  return sqldb.execute(sentence, { ids });
}
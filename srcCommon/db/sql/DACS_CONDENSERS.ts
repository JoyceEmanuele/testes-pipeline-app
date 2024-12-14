import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM DAC_CONDENSER_ID: {DACS_CONDENSERS.ID}
  FROM DACS_CONDENSERS
  WHERE {DACS_CONDENSERS.ID} = {:DAC_CONDENSER_ID}
*/
export async function w_deleteRow(qPars: { DAC_CONDENSER_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_CONDENSERS WHERE DACS_CONDENSERS.ID = :DAC_CONDENSER_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteDacInfo = DELETE
  PARAM DAC_DEVICE_ID: {DACS_CONDENSERS.DAC_DEVICE_ID}
  FROM DACS_CONDENSERS
  WHERE {DACS_CONDENSERS.DAC_DEVICE_ID} = {:DAC_DEVICE_ID}
*/
export async function w_deleteDacInfo(qPars: { DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM DACS_CONDENSERS WHERE DACS_CONDENSERS.DAC_DEVICE_ID = :DAC_DEVICE_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDacs = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM DACS_CONDENSERS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_CONDENSERS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDacs(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_CONDENSERS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_CONDENSERS FROM DACS_CONDENSERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientAsset(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = CONDENSERS.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE DACS_CONDENSERS FROM DACS_CONDENSERS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnitAssets = DELETE
  PARAM UNIT_ID: {DEVICES_UNITS.UNIT_ID}
  FROM DACS_CONDENSERS
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_CONDENSERS.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_UNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnitAssets(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_CONDENSERS.DAC_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `

  const sentence = `DELETE DACS_CONDENSERS FROM DACS_CONDENSERS ${join} WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        DACS_CONDENSERS
      FROM
        DACS_CONDENSERS
        INNER JOIN CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
      WHERE
        CONDENSERS.MACHINE_ID = :MACHINE_ID
      `

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insert(qPars: { CONDENSER_ID: number, DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CONDENSER_ID')
  fields.push('DAC_DEVICE_ID')

  let sentence = `INSERT INTO DACS_CONDENSERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
    dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DACS_CONDENSERS
      FROM
          DACS_CONDENSERS
          INNER JOIN CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = CONDENSERS.ASSET_ID)
      WHERE
          ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('DACS_CONDENSERS', sentence, qPars, operationLogData);
      dbLogger('DACS_CONDENSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getInfo (qPars: { DAC_DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DACS_CONDENSERS.ID,
      DACS_CONDENSERS.CONDENSER_ID
  `
  sentence += `
    FROM
    DACS_CONDENSERS
  `

  sentence += ` WHERE DACS_CONDENSERS.DAC_DEVICE_ID = :DAC_DEVICE_ID`;

  return sqldb.querySingle<{
    ID: number
    CONDENSER_ID: number
  }>(sentence, qPars)
}
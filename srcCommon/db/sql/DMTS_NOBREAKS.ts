import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DMTS_NOBREAKS
  FIELD DMTS_NOBREAKS.DMT_ID
  FIELD DMTS_NOBREAKS.NOBREAK_ID
  FIELD DMTS_NOBREAKS.PORT
*/
export async function w_insert_update (qPars: { DMT_ID: number, NOBREAK_ID: number, PORT: number | null | undefined }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DMT_ID')
  fields.push('NOBREAK_ID')
  fields.push('PORT')

  const updateFields: string[] = []
  updateFields.push('DMT_ID = :DMT_ID')
  updateFields.push('PORT = :PORT')

  let sentence = `INSERT INTO DMTS_NOBREAKS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')}`

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDmtNobreakByNobreakId = DELETE
  FROM DMTS_NOBREAKS
*/
export async function w_deleteDmtNobreakByNobreakId (qPars: { NOBREAK_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMTS_NOBREAKS WHERE DMTS_NOBREAKS.NOBREAK_ID = :NOBREAK_ID `;

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDmtNobreakByDmtId = DELETE
  FROM DMTS_NOBREAKS
*/
export async function w_deleteDmtNobreakByDmtId (qPars: { DMT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMTS_NOBREAKS WHERE DMTS_NOBREAKS.DMT_ID = :DMT_ID `;

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `INNER JOIN NOBREAKS ON (NOBREAKS.ID = DMTS_NOBREAKS.NOBREAK_ID)
                INNER JOIN ASSETS ON (ASSETS.ID = NOBREAKS.ASSET_ID)
                INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)`;

  const sentence = `DELETE DMTS_NOBREAKS FROM DMTS_NOBREAKS ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    dbLogger('DMTS_NOBREAKS', sentence, qPars, operationLogData)
    await saveOperationLog('DMTS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDmtUsedPorts = SELECT LIST
  PARAM DMT_ID: {DMTS_NOBREAKS.DMT_ID}
  FROM DMTS_NOBREAKS
  SELECT DMTS_NOBREAKS.ID
  SELECT DMTS_NOBREAKS.DMT_ID
  SELECT DMTS_NOBREAKS.NOBREAK_ID
  SELECT DMTS_NOBREAKS.PORT


  WHERE {DMTS_NOBREAKS.DMT_ID} = ({:DMT_ID})
*/
export function getDmtUsedPorts (qPars: { DMT_ID: number }) {
  let sentence = `
    SELECT
      DMTS_NOBREAKS.ID,
      DMTS_NOBREAKS.DMT_ID,
      DMTS_NOBREAKS.NOBREAK_ID,
      DMTS_NOBREAKS.PORT,
      ASSETS.NAME,
      ASSETS.DAT_CODE
  `
  sentence += `
    FROM
      DMTS_NOBREAKS
    LEFT JOIN NOBREAKS ON (DMTS_NOBREAKS.NOBREAK_ID = NOBREAKS.ID)
    LEFT JOIN ASSETS ON (NOBREAKS.ASSET_ID = ASSETS.ID)
    WHERE
      DMTS_NOBREAKS.DMT_ID = :DMT_ID
  `;

  return sqldb.query<{
    ID: number
    DMT_ID: number
    NOBREAK_ID: number
    PORT: number
    NAME: string
    DAT_CODE: string
  }>(sentence, qPars)
}

export function getList (qPars: { deviceCodes?: string[], clientIds?: number[], unitIds?: number[] }) {
  let sentence = `
    SELECT
      DMTS_NOBREAKS.DMT_ID,
      DMTS_NOBREAKS.NOBREAK_ID,
      DMTS_NOBREAKS.PORT
  `
  sentence += `
    FROM
      DMTS_NOBREAKS
      LEFT JOIN DMTS ON (DMTS_NOBREAKS.DMT_ID = DMTS.ID)
      LEFT JOIN DEVICES ON (DEVICES.ID = DMTS.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DMTS.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DMTS.DEVICE_ID)
  `;

  const conditions: string[] = []
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES.DEVICE_CODE IN (:deviceCodes)`) }
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DMT_ID: number
    NOBREAK_ID: number
    PORT: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC updatePortByNobreakId = UPDATE
  FROM DMTS_NOBREAKS
  FIELD [[IFOWNPROP {:PORT}]] DMT.PORT
*/
export async function updatePortByNobreakId (qPars: { NOBREAK_ID: number, PORT: number }, operationLogData: OperationLogData) {
  if (!qPars.NOBREAK_ID) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DMTS_NOBREAKS SET PORT = :PORT WHERE NOBREAK_ID = :NOBREAK_ID`;

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDmtNobreaksList = SELECT LIST
  PARAM DMT_CODE: {DEVICES.DEVICE_CODE}

  FROM
    DMTS_NOBREAKS
    INNER JOIN NOBREAKS ON (NOBREAKS.ID = DMTS_NOBREAKS.NOBREAK_ID)
    INNER JOIN DMTS ON (DMTS.ID = DMTS_NOBREAKS.DMT_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMTS.DEVICE_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = NOBREAKS.ASSET_ID)
  
    SELECT DMTS_NOBREAKS.ID,
    SELECT DMTS_NOBREAKS.DMT_ID,
    SELECT DMTS_NOBREAKS.NOBREAK_ID,
    SELECT DEVICES.DEVICE_CODE as DMT_CODE,
    SELECT DMTS_NOBREAKS.PORT,
    SELECT ASSETS.NAME,
    SELECT ASSETS.UNIT_ID,
    SELECT ASSETS.DAT_CODE,
    SELECT NOBREAKS.INPUT_VOLTAGE,
    SELECT NOBREAKS.OUTPUT_VOLTAGE,
    SELECT NOBREAKS.NOMINAL_POTENTIAL,
    SELECT NOBREAKS.NOMINAL_BATTERY_LIFE,
    SELECT NOBREAKS.INPUT_ELECTRIC_CURRENT,
    SELECT NOBREAKS.OUTPUT_ELECTRIC_CURRENT,
    SELECT NOBREAKS.NOMINAL_BATTERY_CAPACITY,
    SELECT ASSETS.MODEL,
    SELECT ASSETS.MANUFACTURER 

  WHERE {DEVICES.DEVICE_CODE} = ({:DMT_CODE})
*/
export function getDmtNobreaksList (qPars: { DMT_CODE: string }) {
  let sentence = `
    SELECT
      DMTS_NOBREAKS.ID,
      DMTS_NOBREAKS.DMT_ID,
      DMTS_NOBREAKS.NOBREAK_ID,
      DEVICES.DEVICE_CODE as DMT_CODE,
      DMTS_NOBREAKS.PORT,
      ASSETS.NAME,
      ASSETS.UNIT_ID,
      ASSETS.DAT_CODE,
      NOBREAKS.INPUT_VOLTAGE,
      NOBREAKS.OUTPUT_VOLTAGE,
      NOBREAKS.NOMINAL_POTENTIAL,
      NOBREAKS.NOMINAL_BATTERY_LIFE,
      NOBREAKS.INPUT_ELECTRIC_CURRENT,
      NOBREAKS.OUTPUT_ELECTRIC_CURRENT,
      NOBREAKS.NOMINAL_BATTERY_CAPACITY,
      ASSETS.MODEL,
      ASSETS.MANUFACTURER 
  `
  sentence += `
    FROM
      DMTS_NOBREAKS
    INNER JOIN NOBREAKS ON (NOBREAKS.ID = DMTS_NOBREAKS.NOBREAK_ID)
    INNER JOIN DMTS ON (DMTS.ID = DMTS_NOBREAKS.DMT_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DMTS.DEVICE_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = NOBREAKS.ASSET_ID)
    WHERE
      DEVICES.DEVICE_CODE = :DMT_CODE;
  `;

  return sqldb.query<{
    ID: number
    DMT_CODE: string
    DMT_ID: number
    NOBREAK_ID: number
    PORT: number
    NAME: string
    DAT_CODE: number
    UNIT_ID: number
    INPUT_VOLTAGE: number
    OUTPUT_VOLTAGE: number
    NOMINAL_POTENTIAL: number
    NOMINAL_BATTERY_LIFE: number
    INPUT_ELECTRIC_CURRENT: number
    OUTPUT_ELECTRIC_CURRENT: number
    NOMINAL_BATTERY_CAPACITY: number
    MODEL: string
    MANUFACTURER: string
  }>(sentence, qPars)
}

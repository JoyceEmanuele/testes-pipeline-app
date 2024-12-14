import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM SENSOR_ID: {SENSORS.SENSOR_ID}
  FROM SENSORS
  WHERE {SENSORS.SENSOR_ID} = {:SENSOR_ID}
*/
export async function w_deleteRow (qPars: { SENSOR_ID: string }, delChecks: {
  DEVACS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM SENSORS WHERE SENSORS.SENSOR_ID = :SENSOR_ID`;

  if (operationLogData) {
    await saveOperationLog('SENSORS', sentence, qPars, operationLogData);
    dbLogger('SENSORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM SENSORS
  FIELD SENSORS.SENSOR_ID
  FIELD SENSORS.MULT
  FIELD SENSORS.OFST
  FIELD SENSORS.SENSOR_NAME
*/
export async function w_insertIgnore (qPars: {
  SENSOR_ID: string,
  SENSOR_NAME: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('SENSOR_ID')
  fields.push('SENSOR_NAME')

  const sentence = `INSERT IGNORE INTO SENSORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('SENSORS', sentence, qPars, operationLogData);
    dbLogger('SENSORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insert (qPars: {
  SENSOR_ID: string,
  SENSOR_NAME: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('SENSOR_ID')
  fields.push('SENSOR_NAME')

  const sentence = `INSERT INTO SENSORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('SENSORS', sentence, qPars, operationLogData);
    dbLogger('SENSORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM SENSOR_ID: {SENSORS.SENSOR_ID}
  FROM SENSORS
  FIELD [[IFOWNPROP {:MULT}]] SENSORS.MULT
  FIELD [[IFOWNPROP {:OFST}]] SENSORS.OFST
  FIELD [[IFOWNPROP {:SENSOR_NAME}]] SENSORS.SENSOR_NAME
*/
export async function w_update (qPars: {
  SENSOR_ID: string,
  SENSOR_NAME?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.SENSOR_NAME !== undefined) { fields.push('SENSOR_NAME = :SENSOR_NAME') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE SENSORS SET ${fields.join(', ')} WHERE SENSOR_ID = :SENSOR_ID`

  if (operationLogData) {
    await saveOperationLog('SENSORS', sentence, qPars, operationLogData);
    dbLogger('SENSORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC dacInfoComboOpts = SELECT LIST
  FROM SENSORS

  SELECT SENSORS.SENSOR_ID AS value
  SELECT SENSORS.SENSOR_ID AS label
*/
export function dacInfoComboOpts () {
  let sentence = `
    SELECT
      SENSORS.SENSOR_ID AS value,
      SENSORS.SENSOR_ID AS label
  `
  sentence += `
    FROM
      SENSORS
  `

  return sqldb.query<{
    value: string
    label: string
  }>(sentence)
}

export function filteredDacInfoComboOpts(qPars: { DEVICE_CODE: string }) {
  const columns = ['SENSORS.SENSOR_ID AS value', 'SENSORS.SENSOR_ID AS label' ];
  const source = `
    DEVICES
    LEFT JOIN DEVFWVERS ON DEVICES.DEVICE_CODE=DEVFWVERS.DEV_ID
    LEFT JOIN SENSOR_FIRMWARE_CURVES SFC
      ON (SFC.V_MAJOR, SFC.V_MINOR, SFC.V_PATCH) < (DEVFWVERS.V_MAJOR, DEVFWVERS.V_MINOR, DEVFWVERS.V_PATCH)
    LEFT JOIN SENSORS ON SENSORS.SENSOR_ID=SFC.SENSOR_ID
  `
  const conditions = [
    `DEVICES.DEVICE_CODE=:DEVICE_CODE`
  ]
  const sentence = `SELECT
    ${columns.join(' , ')}
    FROM ${source}
    WHERE ${conditions.join(" AND ")}
    GROUP BY SENSORS.SENSOR_ID
  `
  return sqldb.query<{
    value: string
    label: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM SENSORS
  SELECT SENSORS.SENSOR_ID
  SELECT SENSORS.MULT
  SELECT SENSORS.OFST
  SELECT SENSORS.SENSOR_NAME
*/
export function getList (qPars?: { SENSOR_IDS?: string[] }) {
  let sentence = `
    SELECT
      s.SENSOR_ID,
      s.SENSOR_NAME
      FROM SENSORS s
  `
  if (qPars?.SENSOR_IDS?.length > 0) { sentence += "WHERE s.SENSOR_ID IN (:SENSOR_IDS)" }

  return sqldb.query<{
    SENSOR_ID: string
    SENSOR_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInfo = SELECT ROW
  PARAM SENSOR_ID: {SENSORS.SENSOR_ID}
  FROM SENSORS
  SELECT SENSORS.SENSOR_ID
  SELECT SENSORS.MULT
  SELECT SENSORS.OFST
  SELECT SENSORS.SENSOR_NAME
  WHERE {SENSORS.SENSOR_ID} = {:SENSOR_ID}
*/
export function getInfo (qPars: { SENSOR_ID: string }) {
  let sentence = `
    SELECT
      s.SENSOR_ID,
      s.SENSOR_NAME
      FROM SENSORS s
  `

  sentence += ` WHERE s.SENSOR_ID = :SENSOR_ID `

  return sqldb.querySingle<{
    SENSOR_ID: string
    SENSOR_NAME: string
  }>(sentence, qPars)
}

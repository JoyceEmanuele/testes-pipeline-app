import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DUTS_DEVICES.ID}
  FROM DUTS_DEVICES
  WHERE {DUTS_DEVICES.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_DEVICES WHERE DUTS_DEVICES.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_DEVICES FROM DUTS_DEVICES${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DEVICES FROM DUTS_DEVICES${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_DEVICES
  FIELD DUTS_DEVICES.DEVICE_ID
  FIELD DUTS_DEVICES.PLACEMENT
  FIELD DUTS_DEVICES.TEMPERATURE_OFFSET
*/
export async function w_insert (qPars: { DEVICE_ID: number, PLACEMENT: string, TEMPERATURE_OFFSET: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  fields.push('PLACEMENT');
  fields.push('TEMPERATURE_OFFSET');

  const sentence = `INSERT INTO DUTS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertIgnore (qPars: { DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');

  const sentence = `INSERT IGNORE INTO DUTS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DUTS_DEVICES
  FIELD [[IFOWNPROP {:DEVICE_ID}]] DUTS_DEVICES.DEVICE_ID
  FIELD [[IFOWNPROP {:DEVICE_ID}]] DUTS_DEVICES.PLACEMENT
  WHERE {DUTS_DEVICES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    DEVICE_ID?: number,
    PLACEMENT?: string,
    VARS?: string,
    TEMPERATURE_OFFSET?: number
    LAST_TEMPERATURE_CONTROL_CFG?: string
    SENDED_MULT_PROG_BEHAVIOR?: number
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.DEVICE_ID !== undefined) { fields.push('DEVICE_ID = :DEVICE_ID') }
    if (qPars.PLACEMENT !== undefined) { fields.push('PLACEMENT = :PLACEMENT') }
    if (qPars.VARS !== undefined) { fields.push('VARS = :VARS') }
    if (qPars.TEMPERATURE_OFFSET !== undefined) { fields.push('TEMPERATURE_OFFSET = :TEMPERATURE_OFFSET') }
    if (qPars.LAST_TEMPERATURE_CONTROL_CFG !== undefined) { fields.push('LAST_TEMPERATURE_CONTROL_CFG = :LAST_TEMPERATURE_CONTROL_CFG') }
    if (qPars.SENDED_MULT_PROG_BEHAVIOR !== undefined) { fields.push('SENDED_MULT_PROG_BEHAVIOR = :SENDED_MULT_PROG_BEHAVIOR') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DUTS_DEVICES SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DUTS_DEVICES', sentence, qPars, operationLogData);
      dbLogger('DUTS_DEVICES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  export function getDutsDevicesInfo (qPars: {
    DEVICE_CODE: string,
  }) {
    let sentence = `
      SELECT
        DUTS_DEVICES.ID AS DUT_DEVICE_ID,
        DUTS_MONITORING.ID AS DUT_MONITORING_ID,
        DUTS_REFERENCE.ID AS DUT_REFERENCE_ID,
        DUTS_REFERENCE.MACHINE_ID AS MACHINE_ID
    `
    sentence += `
      FROM
        DUTS_DEVICES 
        INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
        LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
        LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.DUT_MONITORING_ID = DUTS_MONITORING.ID)
    `
  
    const conditions: string[] = []
    if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }
  
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
    return sqldb.query<{
      DUT_DEVICE_ID: number,
      DUT_MONITORING_ID: number,
      DUT_REFERENCE_ID: number,
      MACHINE_ID: number
    }>(sentence, qPars)
  }


export function getDutDevice (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DUTS_DEVICES.ID AS DUT_DEVICE_ID,
      DUTS_DEVICES.PLACEMENT,
      DEVICES.ID AS DEVICE_ID,
      DUTS_DEVICES.SENDED_MULT_PROG_BEHAVIOR AS SENDED_MULT_PROG_BEHAVIOR
  `
  sentence += `
    FROM
      DUTS_DEVICES
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = [`DEVICES.DEVICE_CODE = :DEVICE_CODE`];
  sentence += ' WHERE ' + conditions.join(' AND ');

  return sqldb.querySingle<{
    DUT_DEVICE_ID: number,
    DEVICE_ID: number,
    PLACEMENT: string,
    SENDED_MULT_PROG_BEHAVIOR: number,
  }>(sentence, qPars)
}

export function getDutClientAndUnit (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE,
      DEVICES_CLIENTS.ID AS DEVICE_CLIENT_ID,
      DEVICES_UNITS.ID AS DEVICE_UNIT_ID,
      DUTS_DUO.ID AS DUT_DUO_ID
  `

  sentence += `
    FROM
      DUTS_DEVICES  
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      INNER JOIN DUTS_DUO ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
  `
  sentence += `
    WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE
  `

  return sqldb.querySingle<{
    DEVICE_CODE: string
    DEVICE_CLIENT_ID: number
    DEVICE_UNIT_ID: number
    DUT_DUO_ID: number
 }>(sentence, qPars)
}

export function getDutsToSendMultProgError () {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEVICE_CODE,
      DUTS_DEVICES.ID AS DUT_DEVICE_ID,
      SCHEDULES.NEED_MULT_SCHEDULES AS NEED_MULT_SCHEDULES,
      DEVFWVERS.CURRFW_VERS AS CURRFW_VERS
  `

  sentence += `
    FROM
      DUTS_DEVICES  
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN MACHINES_AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
      LEFT JOIN SCHEDULES ON (SCHEDULES.AUTOMATION_PERIOD_ID = MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID)
      LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)

  `
  sentence += `
    WHERE DUTS_DEVICES.SENDED_MULT_PROG_BEHAVIOR IN (0,2)
    GROUP BY DEVICE_CODE, DUT_DEVICE_ID, CURRFW_VERS, NEED_MULT_SCHEDULES
  `

  return sqldb.query<{
    DEVICE_CODE: string
    DUT_DEVICE_ID: number
    NEED_MULT_SCHEDULES: string
    CURRFW_VERS: string
 }>(sentence, {})
}

export function getList (qPars: { clientIds: number[], unitIds: number[] }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE
  `

  sentence += `
    FROM
      DUTS_DEVICES  
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `
  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEVICE_CODE: string
 }>(sentence, qPars)
}
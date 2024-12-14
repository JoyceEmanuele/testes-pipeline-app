import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DAMS_DEVICES
  FIELD DAMS_DEVICES.DEVICE_ID
  FIELD DAMS_DEVICES.CAN_SELF_REFERENCE
  FIELD DAMS_DEVICES.FIRST_COMMANDS_ECO_SENT
  FIELD DAMS_DEVICES.FW_MODE
  FIELD DAMS_DEVICES.DISAB
  FIELD DAMS_DEVICES.INSTALLATION_LOCATION
*/
export async function w_insert (qPars: {
  DEVICE_ID: number,
  CAN_SELF_REFERENCE: number,
  FIRST_COMMANDS_ECO_SENT: number,
  FW_MODE: string,
  DISAB: number,
  INSTALLATION_LOCATION?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  fields.push('CAN_SELF_REFERENCE');
  fields.push('FIRST_COMMANDS_ECO_SENT');
  fields.push('FW_MODE');
  fields.push('DISAB');
  if (qPars.INSTALLATION_LOCATION) fields.push('INSTALLATION_LOCATION');

  const sentence = `INSERT INTO DAMS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertIgnore (qPars: {
  DEVICE_ID: number,
  CAN_SELF_REFERENCE?: number,
  FIRST_COMMANDS_ECO_SENT?: number,
  FW_MODE?: string,
  DISAB?: number,
  INSTALLATION_LOCATION?: string,
  PLACEMENT?: string,
  T0_POSITION?: string,
  T1_POSITION?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  if (qPars.CAN_SELF_REFERENCE !== undefined) { fields.push('CAN_SELF_REFERENCE') }
  if (qPars.FIRST_COMMANDS_ECO_SENT !== undefined) { fields.push('FIRST_COMMANDS_ECO_SENT') }
  if (qPars.FW_MODE !== undefined) { fields.push('FW_MODE') }
  if (qPars.DISAB !== undefined) { fields.push('DISAB') } 
  if (qPars.INSTALLATION_LOCATION !== undefined) { fields.push('INSTALLATION_LOCATION') } 
  if (qPars.PLACEMENT !== undefined) { fields.push('PLACEMENT') } 
  if (qPars.T0_POSITION !== undefined) { fields.push('T0_POSITION') } 
  if (qPars.T1_POSITION !== undefined) { fields.push('T1_POSITION') } 

  const sentence = `INSERT IGNORE INTO DAMS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DAMS_DEVICES
  FIELD [[IFOWNPROP {:DEVICE_ID}]] DAMS_DEVICES.DEVICE_ID
  FIELD [[IFOWNPROP {:CAN_SELF_REFERENCE}]] DAMS_DEVICES.CAN_SELF_REFERENCE
  FIELD [[IFOWNPROP {:FIRST_COMMANDS_ECO_SENT}]] DAMS_DEVICES.FIRST_COMMANDS_ECO_SENT
  FIELD [[IFOWNPROP {:FW_MODE}]] DAMS_DEVICES.FW_MODE
  FIELD [[IFOWNPROP {:DISAB}]] DAMS_DEVICES.DISAB
  FIELD [[IFOWNPROP {:INSTALLATION_LOCATION}]] DAMS_DEVICES.INSTALLATION_LOCATION
  FIELD [[IFOWNPROP {:PLACEMENT}]] DAMS_DEVICES.PLACEMENT
  FIELD [[IFOWNPROP {:T0_POSITION}]] DAMS_DEVICES.T0_POSITION
  FIELD [[IFOWNPROP {:T1_POSITION}]] DAMS_DEVICES.T1_POSITION
  WHERE {DAMS_DEVICES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DEVICE_ID?: number,
  CAN_SELF_REFERENCE?: number,
  FIRST_COMMANDS_ECO_SENT?: number,
  FW_MODE?: string,
  DISAB?: number,
  INSTALLATION_LOCATION?: string,
  PLACEMENT?: string,
  T0_POSITION?: string,
  T1_POSITION?: string,
  THERSMOSTAT_CFG?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DEVICE_ID !== undefined) { fields.push('DEVICE_ID = :DEVICE_ID') }
  if (qPars.CAN_SELF_REFERENCE !== undefined) { fields.push('CAN_SELF_REFERENCE = :CAN_SELF_REFERENCE') }
  if (qPars.FIRST_COMMANDS_ECO_SENT !== undefined) { fields.push('FIRST_COMMANDS_ECO_SENT = :FIRST_COMMANDS_ECO_SENT') }
  if (qPars.FW_MODE !== undefined) { fields.push('FW_MODE = :FW_MODE') }
  if (qPars.DISAB !== undefined) { fields.push('DISAB = :DISAB') }
  if (qPars.INSTALLATION_LOCATION !== undefined) { fields.push('INSTALLATION_LOCATION = :INSTALLATION_LOCATION') }
  if (qPars.PLACEMENT !== undefined) { fields.push('PLACEMENT = :PLACEMENT') }
  if (qPars.T0_POSITION !== undefined) { fields.push('T0_POSITION = :T0_POSITION') }
  if (qPars.T1_POSITION !== undefined) { fields.push('T1_POSITION = :T1_POSITION') }
  if (qPars.THERSMOSTAT_CFG !== undefined) { fields.push('THERSMOSTAT_CFG = :THERSMOSTAT_CFG') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DAMS_DEVICES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DAMS_DEVICES FROM DAMS_DEVICES${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DAMS_DEVICES FROM DAMS_DEVICES${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DAMS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DAMS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDamByCode = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DAMS_DEVICES
    INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    
    SELECT DAMS_DEVICES.ID,
    SELECT DAMS_DEVICES.INSTALLATION_LOCATION,
    SELECT DEVICES.DEVICE_CODE,
    SELECT DEVICES_CLIENT.CLIENT_ID
    SELECT DEVICES_UNITS.UNIT_ID
  WHERE {DEVICES.DEVICE_CODE} = ({:DEVICE_CODE})
*/
export function getDamByCode(qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DAMS_DEVICES.ID,
      DAMS_DEVICES.INSTALLATION_LOCATION,
      DAMS_DEVICES.PLACEMENT,
      DAMS_DEVICES.T0_POSITION,
      DAMS_DEVICES.T1_POSITION,
      DAMS_DEVICES.THERSMOSTAT_CFG,
      DEVICES.DEVICE_CODE,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      DAMS_DEVICES.DISAB
  `
  sentence += `
    FROM
      DAMS_DEVICES
    INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE `

  return sqldb.querySingle<{
    ID: number
    DEVICE_CODE: string
    INSTALLATION_LOCATION: string
    PLACEMENT: string
    T0_POSITION: string
    T1_POSITION: string
    THERSMOSTAT_CFG: number
    CLIENT_ID: number
    UNIT_ID: number
    DISAB: boolean
  }>(sentence, qPars)
}

export function getDamsByThermostat(qPars: { THERSMOSTAT_CFG: number }) {
  let sentence = `
    SELECT
      DAMS_DEVICES.ID,
      DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM
      DAMS_DEVICES
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
  `
  sentence += ` WHERE DAMS_DEVICES.THERSMOSTAT_CFG = :THERSMOSTAT_CFG `

  return sqldb.query<{
    ID: number
    DEVICE_CODE: string
  }>(sentence, qPars)
}

export function getAllDamsByUnit(qPars: { UNIT_ID: number }) {
  let sentence = `
  SELECT
    DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM DAMS_DEVICES
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    `
  sentence += ` WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  return sqldb.query<{
    DEVICE_CODE: string
  }>(sentence, qPars);
}


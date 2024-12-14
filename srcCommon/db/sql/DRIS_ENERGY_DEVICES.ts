import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


/* @IFHELPER:FUNC insert = INSERT
  FROM DRIS_ENERGY_DEVICES
  FIELD ID
*/
export async function w_insert (qPars: {DRI_DEVICE_ID: number, ENERGY_DEVICES_INFO_ID?: number}, operationLogData: OperationLogData) {
  
  const fields: string[] = []
  fields.push('DRI_DEVICE_ID') 
  if (qPars.ENERGY_DEVICES_INFO_ID !== undefined) { fields.push('ENERGY_DEVICES_INFO_ID')}

  let sentence = `INSERT INTO DRIS_ENERGY_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC w_delete = DELETE
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}   
  DELETE FROM DRIS_ENERGY_DEVICES  
  WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE
*/
export async function w_delete(qPars: { DEVICE_CODE: string }, operationLogData: OperationLogData) {

  const join = `
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)    
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)    
  `;  

  const sentence = `DELETE DRIS_ENERGY_DEVICES FROM DRIS_ENERGY_DEVICES ${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_delete = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}   
  DELETE FROM DRIS_ENERGY_DEVICES  
  WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
*/
export async function w_deleteFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const join = `
    INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)    
    INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)    
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)    
  `;  

  const sentence = `DELETE DRIS_ENERGY_DEVICES FROM DRIS_ENERGY_DEVICES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const join = `
    INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)    
    INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)    
  `;  

  const sentence = `DELETE DRIS_ENERGY_DEVICES FROM DRIS_ENERGY_DEVICES ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DRIS_ENERGY_DEVICES
  FIELD [[IFOWNPROP {:DRI_DEVICE_ID}]] DRIS_ENERGY_DEVICES.DRI_DEVICE_ID
  FIELD [[IFOWNPROP {:ENERGY_DEVICES_INFO_ID DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID
  WHERE {DRIS_ENERGY_DEVICES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DRI_DEVICE_ID?: number,
  ENERGY_DEVICES_INFO_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DRI_DEVICE_ID !== undefined) { fields.push('DRI_DEVICE_ID = :DRI_DEVICE_ID') }
  if (qPars.ENERGY_DEVICES_INFO_ID !== undefined) { fields.push('ENERGY_DEVICES_INFO_ID = :ENERGY_DEVICES_INFO_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DRIS_ENERGY_DEVICES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getDevExtraInfo (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DRIS_ENERGY_DEVICES.ID,
      DRIS_ENERGY_DEVICES.DRI_DEVICE_ID,
      DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID,
      DEVICES.DEVICE_CODE,
      ENERGY_MANUFACTURERS.NAME AS MANUFACTURER,
      ELECTRIC_CIRCUITS.ID AS ELECTRIC_CIRCUIT_ID,
      ELECTRIC_CIRCUITS.UNIT_ID AS UNIT_ID
    FROM
      DRIS_ENERGY_DEVICES
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_MANUFACTURERS.MANUFACTURER_ID = ENERGY_DEVICES_INFO.MANUFACTURER_ID)
      INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)
    WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE
  `
  return sqldb.querySingle<{
    ID: number
    DRI_DEVICE_ID: number
    ENERGY_DEVICES_INFO_ID: number
    DEVICE_CODE: string
    MANUFACTURER: string
    ELECTRIC_CIRCUIT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

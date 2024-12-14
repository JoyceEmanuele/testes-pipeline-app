import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


/* @IFHELPER:FUNC insert = INSERT
  FROM GREENANT_ENERGY_DEVICES
  FIELD ID
*/
export async function w_insert (qPars: { GREENANT_CODE: string, ENERGY_DEVICES_INFO_ID?: number}, operationLogData: OperationLogData) {
  
  const fields: string[] = []
  fields.push('GREENANT_CODE') 
  if (qPars.ENERGY_DEVICES_INFO_ID !== null) { fields.push('ENERGY_DEVICES_INFO_ID') }

  let sentence = `INSERT INTO GREENANT_ENERGY_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC w_delete = DELETE
  PARAM GREENANT_CODE: {GREENANT_ENERGY_DEVICES.GREENANT_CODE}   
  DELETE FROM GREENANT_ENERGY_DEVICES  
  WHERE GREENANT_ENERGY_DEVICES.GREENANT_CODE = :GREENANT_CODE
*/
export async function w_delete(qPars: { GREENANT_CODE: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM GREENANT_ENERGY_DEVICES WHERE GREENANT_ENERGY_DEVICES.GREENANT_CODE = :GREENANT_CODE`;

  if (operationLogData) {
    await saveOperationLog('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_delete = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}   
  DELETE FROM GREENANT_ENERGY_DEVICES  
  WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
*/
export async function w_deleteFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const join = `
    INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)    
    INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)    
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)    
  `;  

  const sentence = `DELETE GREENANT_ENERGY_DEVICES FROM GREENANT_ENERGY_DEVICES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const join = `
    INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)    
    INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)    
  `;  

  const sentence = `DELETE GREENANT_ENERGY_DEVICES FROM GREENANT_ENERGY_DEVICES ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM GREENANT_ENERGY_DEVICES
  FIELD [[IFOWNPROP {:DRI_DEVICE_ID}]] GREENANT_ENERGY_DEVICES.DRI_DEVICE_ID
  FIELD [[IFOWNPROP {:ENERGY_DEVICES_INFO_ID GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID
  WHERE {GREENANT_ENERGY_DEVICES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  ENERGY_DEVICES_INFO_ID?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.ENERGY_DEVICES_INFO_ID !== undefined) { fields.push('ENERGY_DEVICES_INFO_ID = :ENERGY_DEVICES_INFO_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE GREENANT_ENERGY_DEVICES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
    dbLogger('GREENANT_ENERGY_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getDevExtraInfo (qPars: { GREENANT_CODE: string }) {
  let sentence = `
    SELECT
      GREENANT_ENERGY_DEVICES.ID,
      GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID,
      GREENANT_ENERGY_DEVICES.GREENANT_CODE,
      ENERGY_MANUFACTURERS.NAME AS MANUFACTURER,
      ELECTRIC_CIRCUITS.ID AS ELECTRIC_CIRCUIT_ID,
      ELECTRIC_CIRCUITS.UNIT_ID AS UNIT_ID
    FROM
      GREENANT_ENERGY_DEVICES
      INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_MANUFACTURERS.MANUFACTURER_ID = ENERGY_DEVICES_INFO.MANUFACTURER_ID)
      INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)
    WHERE GREENANT_ENERGY_DEVICES.GREENANT_CODE = :GREENANT_CODE
  `
  return sqldb.querySingle<{
    ID: number
    ENERGY_DEVICES_INFO_ID: number
    GREENANT_CODE: string
    MANUFACTURER: string
    ELECTRIC_CIRCUIT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {ELECTRIC_CIRCUITS.UNIT_ID}
  FROM ELECTRIC_CIRCUITS
  WHERE {ELECTRIC_CIRCUITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM ELECTRIC_CIRCUITS
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID) 
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join =  "INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)";

  const sentence = `DELETE ELECTRIC_CIRCUITS FROM ELECTRIC_CIRCUITS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS.ID}
  FROM ELECTRIC_CIRCUITS
  WHERE {ELECTRIC_CIRCUITS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS WHERE ELECTRIC_CIRCUITS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByNobreakId (qPars: { NOBREAK_ID: number }, operationLogData: OperationLogData) {
  const join =  "INNER JOIN ELECTRIC_CIRCUITS_NOBREAKS ON (ELECTRIC_CIRCUITS_NOBREAKS.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)";

  const sentence = `DELETE ELECTRIC_CIRCUITS FROM ELECTRIC_CIRCUITS ${join} WHERE ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID = :NOBREAK_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }
  
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByIlluminationId (qPars: { ILLUMINATION_ID: number }, operationLogData: OperationLogData) {
  const join =  "INNER JOIN ELECTRIC_CIRCUITS_ILLUMINATIONS ON (ELECTRIC_CIRCUITS_ILLUMINATIONS.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)";

  const sentence = `DELETE ELECTRIC_CIRCUITS FROM ELECTRIC_CIRCUITS ${join} WHERE ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId (qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const join =  "INNER JOIN ELECTRIC_CIRCUITS_MACHINES ON (ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)";

  const sentence = `DELETE ELECTRIC_CIRCUITS FROM ELECTRIC_CIRCUITS ${join} WHERE ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ELECTRIC_CIRCUITS
  FIELD ELECTRIC_CIRCUITS.UNIT_ID
  FIELD ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
*/
export async function w_insert (qPars: { UNIT_ID: number, ESTABLISHMENT_NAME?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID');
  if(qPars.ESTABLISHMENT_NAME !== undefined) {fields.push('ESTABLISHMENT_NAME');}

  const sentence = `INSERT INTO ELECTRIC_CIRCUITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ELECTRIC_CIRCUITS
  FIELD [[IFOWNPROP {:UNIT_ID}]] ELECTRIC_CIRCUITS.UNIT_ID
  FIELD [[IFOWNPROP {:ESTABLISHMENT_NAME}]] ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
  INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
  LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID))
  LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    UNIT_ID?: number,
    ESTABLISHMENT_NAME?: string,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
    if (qPars.ESTABLISHMENT_NAME !== undefined) { fields.push('ESTABLISHMENT_NAME = :ESTABLISHMENT_NAME') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE ELECTRIC_CIRCUITS SET ${fields.join(', ')} WHERE ID = :ID`

    if (operationLogData) {
      await saveOperationLog('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
      dbLogger('ELECTRIC_CIRCUITS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
  }

  /* @IFHELPER:FUNC getInfoByUnit = SELECT ROW
  PARAM UNIT_ID: {ELECTRIC_CIRCUITS.UNIT_ID}
  FROM ELECTRIC_CIRCUITS
  SELECT ELECTRIC_CIRCUITS.ID
  WHERE {ELECTRIC_CIRCUITS.UNIT_ID} = {:UNIT_ID}
*/
export function getInfoByUnit (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS.ID, 
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
    FROM ELECTRIC_CIRCUITS
      WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID `

  return sqldb.query<{
    ID: number
    ESTABLISHMENT_NAME: string
  }>(sentence, qPars)
}

export function getInfoByUnitAndEstablishmentName (qPars: { UNIT_ID: number, ESTABLISHMENT_NAME: string }) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS.ID, 
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
    FROM ELECTRIC_CIRCUITS`
  
  const conditions: string[] = []
  if (qPars.ESTABLISHMENT_NAME) { conditions.push(`ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME = :ESTABLISHMENT_NAME`) }
  conditions.push(`ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ')}      

  return sqldb.querySingle<{
    ID: number
    ESTABLISHMENT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getELECTRIC_CIRCUITSIdByDevice = SELECT ROW
  PARAM CODE: {DEVICES.DEVICE_CODE OR LAAGER.LAAGER_CODE}
  FROM ELECTRIC_CIRCUITS
  SELECT ELECTRIC_CIRCUITS.ID
  INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
  LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID))
  LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export function getInfoDeviceCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS.ID, 
      ELECTRIC_CIRCUITS.UNIT_ID,
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.CITY_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME

    FROM ELECTRIC_CIRCUITS
      INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
      LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      INNER JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)

    WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE OR GREENANT_ENERGY_DEVICES.GREENANT_CODE = :DEVICE_CODE`

  return sqldb.querySingle<{
    ID: number
    UNIT_ID: number
    ESTABLISHMENT_NAME: string
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getELECTRIC_CIRCUITSIdByDevice = SELECT ROW
  PARAM CODE: {ELECTRIC_CIRCUIT_ID}
  FROM ELECTRIC_CIRCUITS
  SELECT ELECTRIC_CIRCUITS.ID
  SELECT ELECTRIC_CIRCUITS.UNIT_ID
  SELECT ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
  WHERE {ELECTRIC_CIRCUITS.ID} = {:ELECTRIC_CIRCUIT_ID}
*/
export function getInfoByID (qPars: {ELECTRIC_CIRCUIT_ID: number}) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS.ID,
      ELECTRIC_CIRCUITS.UNIT_ID,
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
    FROM ELECTRIC_CIRCUITS
      WHERE ELECTRIC_CIRCUITS.ID = :ELECTRIC_CIRCUIT_ID `

  return sqldb.querySingle<{
    ID: number,
    UNIT_ID: number
    ESTABLISHMENT_NAME: string
  }>(sentence, qPars)
}

export function getListDisassociate (qPars: { clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[] }) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      ELECTRIC_CIRCUITS     
        LEFT JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`ELECTRIC_CIRCUITS.UNIT_ID IN (:unitIds)`) }
  conditions.push(`ENERGY_DEVICES_INFO.ID IS NULL`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

export async function getItem(qPars: {
  ELECTRIC_CIRCUIT_ID: number
}) {

  let sentence = `SELECT
      ELECTRIC_CIRCUITS.ID,
      ENERGY_DEVICES_INFO.ID AS ENERGY_DEVICE_INFO_ID,
      COALESCE(DEVICES.DEVICE_CODE, GREENANT_ENERGY_DEVICES.GREENANT_CODE) AS ENERGY_DEVICE_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_ID

  FROM ELECTRIC_CIRCUITS
      INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID )
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID) 
      LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID) 
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID) 
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_DEVICES_INFO.MANUFACTURER_ID=ENERGY_MANUFACTURERS.MANUFACTURER_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  WHERE ELECTRIC_CIRCUITS.ID = :ELECTRIC_CIRCUIT_ID
  `;

  return sqldb.querySingle<{
    ID: number,
    ENERGY_DEVICE_INFO_ID: number,
    ENERGY_DEVICE_ID: string,
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}
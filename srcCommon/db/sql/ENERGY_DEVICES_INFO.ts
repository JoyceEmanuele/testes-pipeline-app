import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ENERGY_DEVICES_INFO.ID}
  FROM ENERGY_DEVICES_INFO
  WHERE {ENERGY_DEVICES_INFO.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ENERGY_DEVICES_INFO WHERE ENERGY_DEVICES_INFO.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByElectricCircuitId (qPars: { ELECTRIC_CIRCUIT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ENERGY_DEVICES_INFO WHERE ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {

  const join = `
  INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)    
`; 

  const sentence = `DELETE ENERGY_DEVICES_INFO FROM ENERGY_DEVICES_INFO ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

  /* @IFHELPER:FUNC insert = SELECT ROW
  PARAM MANUFACTURER: {ENERGY_MANUFACTURERS.NAME}

  FROM ENERGY_MANUFACTURERS

  SELECT MANUFACTURER_ID

  WHERE {ENERGY_MANUFACTURERS.NAME} = {:MANUFACTURER}
*/
export async function insert(qPars: {
  ELECTRIC_CIRCUIT_ID?: number,  
  SERIAL: string,
  MANUFACTURER: string
  MODEL: string
}, operationLogData: OperationLogData) {

  const manufacturerId = await sqldb.querySingle<{ MANUFACTURER_ID: number }>(
      'SELECT MANUFACTURER_ID from ENERGY_MANUFACTURERS where NAME=:MANUFACTURER',
      qPars
  ).then((v) => v.MANUFACTURER_ID);

  const params: {
    ELECTRIC_CIRCUIT_ID?: number,
    SERIAL: string,
    MANUFACTURER_ID: number,
    MODEL: string,
  } = {
      MANUFACTURER_ID: manufacturerId,
      ...qPars
  };

  const fields: string[] = []
  if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID') }
  fields.push('SERIAL')
  fields.push('MANUFACTURER_ID')
  fields.push('MODEL')

  const sentence = `INSERT INTO ENERGY_DEVICES_INFO (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
      await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
      dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, params)
}

export async function getList(qPars: {
  ids?: string[]
  serials?: string[]
  filterBynull?: boolean
  manufacturers?: string[]
  clientIds?: number[]
  stateIds?: string[]
  cityIds?: string[]
  unitIds?: number[]
  INCLUDE_INSTALLATION_UNIT?: boolean
}, admPars: {
  addUnownedDevs?: boolean
}) {

  let sentence = `
  SELECT
      ENERGY_DEVICES_INFO.ID,
      COALESCE(DEVICES.DEVICE_CODE, GREENANT_ENERGY_DEVICES.GREENANT_CODE) AS ENERGY_DEVICE_ID,
      ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID,
      ENERGY_DEVICES_INFO.SERIAL,
      ENERGY_DEVICES_INFO.MODEL,
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME,
      ENERGY_MANUFACTURERS.NAME as MANUFACTURER,
      CLUNITS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID,
      CITY.CITY_ID,
      CITY.NAME AS CITY_NAME

  FROM 
      ENERGY_DEVICES_INFO
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
      LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)   
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
      INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_DEVICES_INFO.MANUFACTURER_ID=ENERGY_MANUFACTURERS.MANUFACTURER_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CLUNITS.CITY_ID=CITY.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `;

  const conditions: string[] = [];

  if (qPars.ids) { conditions.push(`(DEVICES.DEVICE_CODE IN (:ids) OR GREENANT_ENERGY_DEVICES.GREENANT_CODE IN ( :ids))`) }
  if (qPars.serials) { conditions.push(`ENERGY_DEVICES_INFO.SERIAL IN (:serials)`) }
  if (qPars.manufacturers) { conditions.push(`ENERGY_MANUFACTURERS.NAME IN (:manufacturers)`) }
  if (qPars.clientIds != null && admPars.addUnownedDevs) { conditions.push(`(CLIENTS.CLIENT_ID IN (:clientIds) OR CLIENTS.CLIENT_ID IS NULL)`) }
  if (qPars.clientIds != null && !admPars.addUnownedDevs) { conditions.push(`(CLIENTS.CLIENT_ID IN (:clientIds))`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }

  if (qPars.filterBynull) {
    conditions.push(`ENERGY_DEVICES_INFO.MODEL IS NOT NULL`)
    conditions.push(`COALESCE(DEVICES.DEVICE_CODE, GREENANT_ENERGY_DEVICES.GREENANT_CODE) IS NOT NULL`)
  }

  if (conditions.length > 0) {
      sentence += ` WHERE ${conditions.join(' AND ')}`;
  }

  return sqldb.query<{
      ID: number, 
      ELECTRIC_CIRCUIT_ID: number,
      ENERGY_DEVICE_ID: string,
      SERIAL: string,
      MODEL: string,
      MANUFACTURER: string
      ESTABLISHMENT_NAME: string
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_NAME: string
      STATE_NAME: string
      STATE_ID: number
      CITY_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT ROW
PARAM id: {DEVICES.DEVICE_CODE}
PARAM serial: {ENERGY_DEVICES_INFO.SERIAL}
PARAM manufacturer: {ENERGY_MANUFACTURERS.NAME}

FROM ENERGY_DEVICES_INFO
  INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_DEVICES_INFO.MANUFACTURER_ID=ENERGY_MANUFACTURERS.MANUFACTURER_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)    
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)    
  INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)    
  LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)

SELECT ENERGY_DEVICES_INFO.ENERGY_DEVICES_INFO
SELECT DEVICES_CLIENTS.CLIENT_ID
SELECT DEVICES_UNITS.UNIT_ID

WHERE [[IFJS {:id}]] {DEVICES.DEVICE_CODE} = {:id}
WHERE [[IFJS {:serial}]] {ENERGY_DEVICES_INFO.SERIAL} = {:serial}
WHERE [[IFJS {:manufacturer}]] {ENERGY_MANUFACTURERS.NAME} = {:manufacturer}
*/
export async function getItem(qPars: {
  id?: string
  serial?: string
  manufacturer?: string
}) {

  let sentence = `SELECT
      ENERGY_DEVICES_INFO.ID,
      COALESCE(DEVICES.DEVICE_CODE, GREENANT_ENERGY_DEVICES.GREENANT_CODE) AS ENERGY_DEVICE_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_ID

  FROM ENERGY_DEVICES_INFO
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID) 
      LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID) 
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID) 
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_DEVICES_INFO.MANUFACTURER_ID=ENERGY_MANUFACTURERS.MANUFACTURER_ID)
      INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  `;

  const conditions: string[] = [];

  if (qPars.id) { conditions.push(`DEVICES.DEVICE_CODE = :id OR GREENANT_ENERGY_DEVICES.GREENANT_CODE = :id`) }
  if (qPars.serial) { conditions.push(`ENERGY_DEVICES_INFO.SERIAL = :serial`) }
  if (qPars.manufacturer) { conditions.push(`ENERGY_MANUFACTURERS.NAME = :manufacturer`) }

  if (conditions.length > 0) {
      sentence += ` WHERE ${conditions.join(' AND ')}`;
  }

  return sqldb.querySingle<{
    ID: number,
    ENERGY_DEVICE_ID: string,
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC clearUnitMeter = DELETE
PARAM UNIT_ID: {CLUNITS.UNIT_ID}
FROM ENERGY_DEVICES_INFO
INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)    
INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)    
INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)    
LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function clearUnitMeter(qPars: {
  UNIT_ID: number
}, operationLogData: OperationLogData) {
  let sentence = `
  DELETE
      ENERGY_DEVICES_INFO
  FROM ENERGY_DEVICES_INFO       
      INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
  WHERE
      ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID
  `;

  if (operationLogData) {
      await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
      dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }
  
  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}

FROM ENERGY_DEVICES_INFO

FIELD [[IFOWNPROP {:MODEL}]] ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID
FIELD [[IFOWNPROP {:MODEL}]] ENERGY_DEVICES_INFO.MODEL
FIELD [[IFOWNPROP {:SERIAL}]] ENERGY_DEVICES_INFO.SERIAL
*/
export async function w_update (qPars: {
  ENERGY_DEVICE_CODE: string,
  ELECTRIC_CIRCUIT_ID?: number,
  MODEL?: string,
  SERIAL?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID') }
  if (qPars.MODEL !== undefined) { fields.push('MODEL = :MODEL') }
  if (qPars.SERIAL !== undefined) { fields.push('SERIAL = :SERIAL') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const join = `
    LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
    LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)    
  `
  
  const sentence = `UPDATE ENERGY_DEVICES_INFO ${join} SET ${fields.join(', ')} WHERE DEVICES.DEVICE_CODE = :ENERGY_DEVICE_CODE OR GREENANT_ENERGY_DEVICES.GREENANT_CODE = :ENERGY_DEVICE_CODE`

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_updateById (qPars: {
  ID: number
  ELECTRIC_CIRCUIT_ID?: number,
  MODEL?: string,
  SERIAL?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  const conditions: string[] = []
  if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID') }
  if (qPars.MODEL !== undefined) { fields.push('MODEL = :MODEL') }
  if (qPars.SERIAL !== undefined) { fields.push('SERIAL = :SERIAL') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  
  if (qPars.ID !== undefined) { conditions.push('ENERGY_DEVICES_INFO.ID = :ID'); }
  if (!conditions.length) throw Error('No conditions to update').HttpStatus(500).DebugInfo({ qPars });
  
  const sentence = `UPDATE ENERGY_DEVICES_INFO SET ${fields.join(', ')} WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteFromDme = DELETE
PARAM ENERGY_DEVICE_CODE: {DEVICES.ENERGY_DEVICE_CODE }
LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)   
LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)  

DELETE FROM ENERGY_DEVICES_INFO  
WHERE DEVICES.DEVICE_CODE = :ENERGY_DEVICE_CODE 
*/
export async function w_deleteFromCode(qPars: { ENERGY_DEVICE_CODE: string }, operationLogData: OperationLogData) {

  const join = `
    LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
    LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
    LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)   
    LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
  `;

  const sentence = `DELETE ENERGY_DEVICES_INFO FROM ENERGY_DEVICES_INFO ${join} WHERE DEVICES.DEVICE_CODE = :ENERGY_DEVICE_CODE OR GREENANT_ENERGY_DEVICES = :ENERGY_DEVICE_CODE`

  if (operationLogData) {
      await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
      dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` 
    INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
    LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  `;

  const sentence = `DELETE ENERGY_DEVICES_INFO FROM ENERGY_DEVICES_INFO ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
    dbLogger('ENERGY_DEVICES_INFO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getEnergyDeviceByElectricCircuit (qPars: { ELECTRIC_CIRCUIT_ID: number }) {
  let sentence = `
    SELECT
      ENERGY_DEVICES_INFO.ID, 
      ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID
    FROM ENERGY_DEVICES_INFO
      WHERE ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID` 

  return sqldb.querySingle<{
    ID: number
    ELECTRIC_CIRCUIT_ID: number
  }>(sentence, qPars)
}


export async function getEnergyDevices(qPars: {
  clientIds?: number[];
  stateIds?: number[];
  cityIds?: string[];
  unitIds?: number[];
  INCLUDE_INSTALLATION_UNIT?: boolean;
}) {
  let sentence = `
  SELECT 
    DED.DRI_DEVICE_ID AS DEVICE, 
    DED.ENERGY_DEVICES_INFO_ID
  FROM 
    DRIS_ENERGY_DEVICES DED
  `;

  if(qPars.cityIds || qPars.stateIds || qPars.unitIds || qPars.clientIds || qPars.INCLUDE_INSTALLATION_UNIT === false) {
    sentence+=`
    INNER JOIN 
    DRIS_DEVICES DD ON DED.DRI_DEVICE_ID = DD.ID
    INNER JOIN 
    DEVICES_UNITS DU ON DD.DEVICE_ID = DU.DEVICE_ID
    INNER JOIN CLUNITS c ON (c.UNIT_ID = DU.UNIT_ID)`;
  }

  const conditions: string[] = []
  if (qPars.unitIds) { conditions.push(`DU.UNIT_ID IN (:unitIds)`) }
  if (qPars.clientIds) { conditions.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.cityIds) { conditions.push(`c.CITY_ID IN (:cityIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`c.PRODUCTION = 1`)}

  if (qPars.stateIds) { conditions.push(`CITY.STATE_ID IN (:stateIds)`) }

  if (conditions.length) { 
    sentence += ' WHERE ' + conditions.join(' AND ') 
  }

  sentence += `
    UNION ALL
    SELECT 
      GREENANT_CODE AS DEVICE, 
      ENERGY_DEVICES_INFO_ID
    FROM 
      GREENANT_ENERGY_DEVICES 
    `;

  if(qPars.cityIds || qPars.stateIds || qPars.unitIds || qPars.clientIds || qPars.INCLUDE_INSTALLATION_UNIT === false) {
    sentence+=`LEFT JOIN 
    ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID) 
  LEFT JOIN 
    ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)
  INNER JOIN CLUNITS c ON (c.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  `;
  }

  const conditions2: string[] = []

  if (qPars.unitIds) { conditions2.push(`ELECTRIC_CIRCUITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.clientIds) { conditions2.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.cityIds) { conditions2.push(`c.CITY_ID IN (:cityIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions2.push(`c.PRODUCTION = 1`)}

  if (conditions2.length) { 
    sentence += ' WHERE ' + conditions2.join(' AND ') 
  }

  return sqldb.query<{
    DEVICE: string
    ENERGY_DEVICES_INFO_ID: number
  }>(sentence, qPars)
}

export async function getEnergyDevicesDriByUnit(qPars: { UNIT_ID: number, MODELS?: string[], ELECTRIC_CIRCUITS_IDS?: number[] }) {
  let sentence = `
  SELECT
      DEVICES.DEVICE_CODE,
      ENERGY_DEVICES_INFO.SERIAL,
      ENERGY_DEVICES_INFO.MODEL,
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME AS ELECTRIC_CIRCUIT_NAME,
      ELECTRIC_CIRCUITS.ID AS ELECTRIC_CIRCUIT_ID,
      ENERGY_MANUFACTURERS.NAME as MANUFACTURER,
      CLUNITS.UNIT_ID,
      CLUNITS.CLIENT_ID

  FROM 
      ENERGY_DEVICES_INFO
      INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)   
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
      INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
      INNER JOIN ENERGY_MANUFACTURERS ON (ENERGY_DEVICES_INFO.MANUFACTURER_ID=ENERGY_MANUFACTURERS.MANUFACTURER_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  `
  const conditions: string[] = []
  if (qPars.MODELS?.length) { conditions.push(`ENERGY_DEVICES_INFO.MODEL IN (:MODELS)`) }
  if (qPars.ELECTRIC_CIRCUITS_IDS?.length) { conditions.push(`ELECTRIC_CIRCUITS.ID IN (:ELECTRIC_CIRCUITS_IDS)`) }
  conditions.push(`ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`)

  sentence += ' WHERE ' + conditions.join(' AND ') 

  return sqldb.query<{
    DEVICE_CODE: string
    SERIAL: string
    MODEL: string
    ELECTRIC_CIRCUIT_NAME: string
    ELECTRIC_CIRCUIT_ID: number
    MANUFACTURER: string
    UNIT_ID: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

export async function getListToOverview(qPars: {
  clientIds?: number[]
  unitIds?: number[]
  INCLUDE_INSTALLATION_UNIT?: boolean
}) {

  let sentence = `
  SELECT
      ENERGY_DEVICES_INFO.ID,
      COALESCE(DEVICES.DEVICE_CODE, GREENANT_ENERGY_DEVICES.GREENANT_CODE) AS ENERGY_DEVICE_ID
  FROM 
      ENERGY_DEVICES_INFO
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
      LEFT JOIN GREENANT_ENERGY_DEVICES ON (GREENANT_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)  
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)   
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)   
      INNER JOIN ELECTRIC_CIRCUITS ON (ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID = ELECTRIC_CIRCUITS.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  `;

  const conditions: string[] = [];
  if (qPars.clientIds.length > 0) { conditions.push(`(CLIENTS.CLIENT_ID IN (:clientIds))`) }
  if (qPars.unitIds.length > 0) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }

  if (conditions.length > 0) {
      sentence += ` WHERE ${conditions.join(' AND ')}`;
  }

  return sqldb.query<{
      ID: number, 
      ELECTRIC_CIRCUIT_ID: number,
  }>(sentence, qPars)
}
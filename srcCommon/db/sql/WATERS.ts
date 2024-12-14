import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {WATERS.UNIT_ID}
  FROM WATERS
  WHERE {WATERS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM WATERS WHERE WATERS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('WATERS', sentence, qPars, operationLogData);
    dbLogger('WATERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM WATERS
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID) 
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join =  `
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)  
  `;

  const sentence = `DELETE WATERS FROM WATERS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('WATERS', sentence, qPars, operationLogData);
    dbLogger('WATERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {WATERS.ID}
  FROM WATERS
  WHERE {WATERS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM WATERS WHERE WATERS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('WATERS', sentence, qPars, operationLogData);
    dbLogger('WATERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM WATERS
  FIELD WATERS.UNIT_ID
  FIELD WATERS.HYDROMETER_ID
*/
export async function w_insert (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID');

  const sentence = `INSERT INTO WATERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('WATERS', sentence, qPars, operationLogData);
    dbLogger('WATERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_update = UPDATE
  FROM WATERS
  FIELD [[IFOWNPROP {:UNIT_ID}]] WATERS.UNIT_ID
  FIELD [[IFOWNPROP {:HYDROMETER_MODELS_ID}]] WATERS.HYDROMETER_MODELS_ID
  FIELD [[IFOWNPROP {:TOTAL_CAPACITY}]] WATERS.TOTAL_CAPACITY
  FIELD [[IFOWNPROP {:QUANTITY_OF_RESERVOIRS}]] QUANTITY_OF_RESERVOIRS.HYDROMETER_ID
  WHERE { WATERS.ID } = {:ID} 
*/
export async function w_update (qPars: {
    ID: number,
    UNIT_ID?: number,
    HYDROMETER_MODELS_ID?: number,
    TOTAL_CAPACITY?: number,
    QUANTITY_OF_RESERVOIRS?: number
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
    if (qPars.HYDROMETER_MODELS_ID !== undefined) { fields.push('HYDROMETER_MODELS_ID = :HYDROMETER_MODELS_ID') }
    if (qPars.TOTAL_CAPACITY !== undefined) { fields.push('TOTAL_CAPACITY = :TOTAL_CAPACITY') }
    if (qPars.QUANTITY_OF_RESERVOIRS !== undefined) { fields.push('QUANTITY_OF_RESERVOIRS = :QUANTITY_OF_RESERVOIRS') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE WATERS SET ${fields.join(', ')} WHERE ID = :ID`

    if (operationLogData) {
      await saveOperationLog('WATERS', sentence, qPars, operationLogData);
      dbLogger('WATERS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
  }

/* @IFHELPER:FUNC getWaterIdByUnit = SELECT ROW
  PARAM UNIT_ID: {WATERS.UNIT_ID}

  FROM WATERS
  SELECT WATERS.ID

  WHERE {WATERS.UNIT_ID} = {:UNIT_ID}
*/
export function getWaterInfoByUnit (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      WATERS.ID,
      WATERS.UNIT_ID,
      HYDROMETER_MODELS.HYDROMETER_MODEL,
      WATERS.TOTAL_CAPACITY,
      WATERS.QUANTITY_OF_RESERVOIRS,
      COALESCE(DEVICES.DEVICE_CODE, LAAGER.LAAGER_CODE) AS DEVICE_CODE,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
      FROM WATERS     
        LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
        LEFT JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
        LEFT JOIN HYDROMETER_MODELS ON (HYDROMETER_MODELS.ID = WATERS.HYDROMETER_MODELS_ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
        LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    WHERE WATERS.UNIT_ID = :UNIT_ID `

  return sqldb.querySingle<{
    ID: number
    UNIT_ID: number
    HYDROMETER_MODEL: string
    TOTAL_CAPACITY: number
    QUANTITY_OF_RESERVOIRS: number
    DEVICE_CODE: string
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getWatersIdByDevice = SELECT ROW
  PARAM CODE: {DEVICES.DEVICE_CODE OR LAAGER.LAAGER_CODE}

  FROM WATERS
  SELECT WATERS.ID

  INNER JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
  INNER JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)

  WHERE {DEVICES.DEVICE_CODE} = {:CODE}
*/
export function getWatersIdByDevice (qPars: { CODE: string }) {
  let sentence = `
    SELECT
      WATERS.ID 
    FROM WATERS
      LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
      LEFT JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
      LEFT JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
      WHERE DEVICES.DEVICE_CODE = :CODE OR LAAGER.LAAGER_CODE = :CODE`

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

export function getListDisassociate (qPars: { clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[], INCLUDE_INSTALLATION_UNIT?: boolean }) {
  let sentence = `
    SELECT
      WATERS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID,
      CITY.CITY_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      WATERS     
        LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
        LEFT JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`WATERS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  conditions.push(`DMAS_DEVICES.ID IS NULL AND LAAGER.ID IS NULL`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    CLIENT_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

export async function getWaterDevicesOverview(qPars: {
  clientIds?: number[];
  stateIds?: number[];
  cityIds?: string[];
  unitIds?: number[];
  INCLUDE_INSTALLATION_UNIT?: boolean;
}) {
  let sentence = `
    SELECT d.DEVICE_CODE as DEVICE
    FROM DMAS_DEVICES dd
    INNER JOIN DEVICES d ON (dd.DEVICE_ID = d.ID)
  `;

  if(qPars.cityIds || qPars.stateIds || qPars.unitIds || qPars.clientIds || qPars.INCLUDE_INSTALLATION_UNIT === false) {
    sentence+=`INNER JOIN DEVICES_UNITS du ON (du.DEVICE_ID = dd.DEVICE_ID)
    INNER JOIN CLUNITS c ON (c.UNIT_ID = du.UNIT_ID) 
    `;
  }

  const conditions: string[] = []
  if (qPars.unitIds) { conditions.push(`du.UNIT_ID IN (:unitIds)`) }
  if (qPars.clientIds) { conditions.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.cityIds) { conditions.push(`c.CITY_ID IN (:cityIds)`) }
  conditions.push(`dd.WATER_ID IS NOT NULL`);
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`c.PRODUCTION = 1`)}

  if (conditions.length) { 
    sentence += ' WHERE ' + conditions.join(' AND ') 
  }

  return sqldb.query<{
    DEVICE: string
  }>(sentence, qPars)
}

export function getList (qPars: { clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[], INCLUDE_INSTALLATION_UNIT?: boolean, INSTALLATION_DATE?: string }) {
  let sentence = `
    SELECT
      WATERS.ID,
      WATERS.UNIT_ID,
      COALESCE(DEVICES.DEVICE_CODE, LAAGER.LAAGER_CODE) AS DEVICE_CODE,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID,
      CITY.CITY_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      WATERS     
        LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
        LEFT JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`WATERS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (qPars.INSTALLATION_DATE) { conditions.push(`(DMAS_DEVICES.INSTALLATION_DATE <= :INSTALLATION_DATE OR LAAGER.INSTALLATION_DATE <= :INSTALLATION_DATE)`) }
  conditions.push(`(DEVICES.DEVICE_CODE IS NOT NULL OR LAAGER.LAAGER_CODE IS NOT NULL)`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    WATER_ID: number
    UNIT_ID: number
    DEVICE_CODE: string
    CLIENT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    CLIENT_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getWaterIdByUnit = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE OR LAAGER.LAAGER_CODE}

  FROM WATERS
  SELECT 
  COALESCE(DEVICES.DEVICE_CODE, LAAGER.LAAGER_CODE) AS DEVICE_CODE

  WHERE {DEVICES.DEVICE_CODE OR LAAGER.LAAGER_CODE
  } = {:DEVICE_CODE}
*/
export function getWaterInfoByCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      WATERS.ID,
      WATERS.UNIT_ID,
      HYDROMETER_MODELS.HYDROMETER_MODEL,
      WATERS.TOTAL_CAPACITY,
      WATERS.QUANTITY_OF_RESERVOIRS,
      COALESCE(DEVICES.DEVICE_CODE, LAAGER.LAAGER_CODE) AS DEVICE_CODE,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME
      FROM WATERS     
        LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.WATER_ID = WATERS.ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DMAS_DEVICES.DEVICE_ID)
        LEFT JOIN LAAGER ON (LAAGER.WATER_ID = WATERS.ID)
        LEFT JOIN HYDROMETER_MODELS ON (HYDROMETER_MODELS.ID = WATERS.HYDROMETER_MODELS_ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE OR LAAGER.LAAGER_CODE = :DEVICE_CODE`

  return sqldb.querySingle<{
    ID: number
    UNIT_ID: number
    HYDROMETER_MODEL: string
    TOTAL_CAPACITY: number
    QUANTITY_OF_RESERVOIRS: number
    DEVICE_CODE: string
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

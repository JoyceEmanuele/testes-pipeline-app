import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM LAAGER
  FIELD LAAGER.LAAGER_CODE
*/
export async function w_insert (qPars: {LAAGER_CODE: string, WATER_ID?: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('LAAGER_CODE')
  if(qPars.WATER_ID !== undefined) fields.push('LAAGER.WATER_ID = WATER_ID'); 

  const sentence = `INSERT INTO LAAGER (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('LAAGER', sentence, qPars, operationLogData);
    dbLogger('LAAGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM LAAGER
  FIELD [[IFOWNPROP {:CARDSCFG}]] LAAGER.CARDSCFG
  FIELD [[IFOWNPROP {:INSTALLATION_LOCATION}]] LAAGER.INSTALLATION_LOCATION
  FIELD [[IFOWNPROP {:INSTALLATION_DATE}]] LAAGER.INSTALLATION_DATE
  FIELD [[IFOWNPROP {:TOTAL_CAPACITY}]] WATERS.TOTAL_CAPACITY
  FIELD [[IFOWNPROP {:QUANTITY_OF_RESERVOIRS}]] WATERS.QUANTITY_OF_RESERVOIRS
  FIELD [[IFOWNPROP {:HYDROMETER_ID}]] WATERS.HYDROMETER_MODELS_ID

  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
*/
export async function w_updateInfo (
  qPars: { LAAGER_CODE: string, WATER_ID?: number, CARDSCFG?: string, INSTALLATION_LOCATION?: string, INSTALLATION_DATE?: string }, operationLogData: OperationLogData
) {

  const fields: string[] = []
  
  if (qPars.WATER_ID !== undefined) { fields.push('WATER_ID = :WATER_ID') }
  if (qPars.CARDSCFG !== undefined) { fields.push('CARDSCFG = :CARDSCFG') }
  if (qPars.INSTALLATION_LOCATION !== undefined) { fields.push('INSTALLATION_LOCATION = :INSTALLATION_LOCATION') }
  if (qPars.INSTALLATION_DATE !== undefined) { fields.push('INSTALLATION_DATE = :INSTALLATION_DATE') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE LAAGER SET ${fields.join(', ')} WHERE LAAGER_CODE = :LAAGER_CODE`

  if (operationLogData) {
    await saveOperationLog('LAAGER', sentence, qPars, operationLogData);
    dbLogger('LAAGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {WATERS.UNIT_ID}
  FROM LAAGER
  INNER JOIN (WATERS.ID = LAAGER.WATER_ID)
  WHERE {WATERS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = "INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)";

  const sentence = `DELETE LAAGER FROM LAAGER ${join} WHERE WATERS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('LAAGER', sentence, qPars, operationLogData);
    dbLogger('LAAGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM LAAGER
  INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID) 
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join =  `
    INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)  
  `;

  const sentence = `DELETE LAAGER FROM LAAGER ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('LAAGER', sentence, qPars, operationLogData);
    dbLogger('LAAGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}

  FROM LAAGER
  LEFT JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
  LEFT JOIN HYDROMETER_MODELS ON (HYDROMETER_MODELS.ID = WATERS.HYDROMETER_MODELS_ID)
  LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)  
  LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
  LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)

  SELECT LAAGER.LAAGER_CODE
  SELECT WATERS.UNIT_ID
  SELECT LAAGER.CARDSCFG
  SELECT LAAGER.INSTALLATION_LOCATION
  SELECT LAAGER.INSTALLATION_DATE
  SELECT WATERS.TOTAL_CAPACITY
  SELECT WATERS.QUANTITY_OF_RESERVOIRS
  SELECT HYDROMETER_MODELS.HYDROMETER_MODEL
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
*/
export function getExtraInfo (qPars: { LAAGER_CODE: string }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      LAAGER.ID AS LAAGER_DEVICE_ID,
      WATERS.UNIT_ID,
      LAAGER.CARDSCFG,
      LAAGER.INSTALLATION_LOCATION,
      LAAGER.INSTALLATION_DATE,
      WATERS.TOTAL_CAPACITY,
      WATERS.QUANTITY_OF_RESERVOIRS,
      HYDROMETER_MODELS.HYDROMETER_MODEL,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      LAAGER
      LEFT JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
      LEFT JOIN HYDROMETER_MODELS ON (HYDROMETER_MODELS.ID = WATERS.HYDROMETER_MODELS_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  sentence += ` WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE `

  return sqldb.querySingle<{
    LAAGER_CODE: string
    LAAGER_DEVICE_ID: number
    UNIT_ID: number
    CARDSCFG: string
    INSTALLATION_LOCATION: string
    INSTALLATION_DATE: string
    HYDROMETER_MODEL: string
    TOTAL_CAPACITY: number
    QUANTITY_OF_RESERVOIRS: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_ID: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

export function getSimpleInfo (qPars: { LAAGER_CODE?: string, UNIT_ID?: number }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      WATERS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      DATE_FORMAT(LAAGER.INSTALLATION_DATE, '%Y/%m/%d') AS INSTALLATION_DATE
    FROM
      LAAGER
      INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
      INNER JOIN CLUNITS ON (WATERS.UNIT_ID = CLUNITS.UNIT_ID)
  `

  const conditions: string[] = []
  if (qPars.LAAGER_CODE != null) { conditions.push(`LAAGER.LAAGER_CODE = :LAAGER_CODE`) }
  if (qPars.UNIT_ID != null) { conditions.push(`WATERS.UNIT_ID = :UNIT_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.querySingle<{
    LAAGER_CODE: string
    UNIT_ID: number
    CLIENT_ID: number
    INSTALLATION_DATE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListWithUnitInfo = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM unitIds?: {CLUNITS.UNIT_ID}[]
  PARAM cityIds?: {CLUNITS.CITY_ID}[]
  PARAM stateIds?: {CITY.STATE_ID}[]
  PARAM excludeClient?: {CLUNITS.CLIENT_ID}

  FROM LAAGER
  INNER JOIN (WATERS.ID = LAAGER.WATER_ID)
  INNER JOIN (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT LAAGER.LAAGER_CODE
  SELECT WATERS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID
  SELECT STATEREGION.NAME AS STATE_ID

  WHERE [[IFJS {:excludeClient}]] {CLUNITS.CLIENT_ID} <> {:excludeClient}
  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {WATERS.UNIT_ID} IN ({:unitIds})
  WHERE [[IFJS {:cityIds}]] {CLUNITS.CITY_ID} IN ({:cityIds})
  WHERE [[IFJS {:stateIds}]] {CITY.STATE_ID} IN ({:stateIds})
*/

export function getListWithUnitInfo (qPars: {
  clientIds?: number[],
  unitIds?: number[],
  cityIds?: string[],
  stateIds?: string[],
  excludeClient?: number,
  INCLUDE_INSTALLATION_UNIT?: boolean
}) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      WATERS.UNIT_ID,
      LAAGER.INSTALLATION_DATE,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID,
      STATEREGION.ID AS STATE_ID,
      STATEREGION.NAME AS STATE_NAME
  `
  sentence += `
    FROM
      LAAGER
      INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`CLUNITS.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`WATERS.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    LAAGER_CODE: string
    UNIT_ID: number
    INSTALLATION_DATE: string
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

export async function getIntegrLaagerInstallationDateNull(){
  let sentence =  `
  SELECT 
    LAAGER.LAAGER_CODE,
    DATE_FORMAT(MIN(DEVICES.DAT_BEGMON), '%Y-%m-%d') AS DATA_DISP_MAIS_ANTIGO

  FROM 
    LAAGER 
    INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
    INNER JOIN DEVICES_UNITS ON (WATERS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
    INNER JOIN DEVICES ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = WATERS.UNIT_ID)

  WHERE 
    LAAGER.INSTALLATION_DATE IS NULL

  GROUP BY 
    LAAGER.LAAGER_CODE, CLUNITS.UNIT_ID, CLUNITS.UNIT_NAME

  ORDER BY 
    DATA_DISP_MAIS_ANTIGO ASC
  `
  return sqldb.query<{
    DATA_DISP_MAIS_ANTIGO: string
    LAAGER_CODE: string
  }>(sentence)

}
export async function updateDispsInstallationDate(dispsList: { LAAGER_CODE: string, DATA_DISP_MAIS_ANTIGO: string }[]) {
  if (!dispsList.length) {
    return;
  }
  const promises = [];
  for (const disps of dispsList) {
    const sentence = `UPDATE LAAGER SET INSTALLATION_DATE = :DATA_DISP_MAIS_ANTIGO WHERE LAAGER_CODE = :LAAGER_CODE`
    const promise = sqldb.execute(sentence, disps);
    promises.push(promise);
  }
  await Promise.all(promises);
}


/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {LAAGER.ID}
  FROM LAAGER
  WHERE {LAAGER.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM LAAGER WHERE LAAGER.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('LAAGER', sentence, qPars, operationLogData);
    dbLogger('LAAGER', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getLaagerId = SELECT ROW
  PARAM LAAGER_CODE: {LAAGER.LAAGER_CODE}

  FROM LAAGER
  LAAGER.ID AS LAAGER_ID

  WHERE {LAAGER.LAAGER_CODE} = {:LAAGER_CODE}
*/
export function getLaagerId (qPars: { LAAGER_CODE: string }) {
  let sentence = `
    SELECT
      LAAGER.ID AS LAAGER_ID
    FROM
      LAAGER
    WHERE LAAGER.LAAGER_CODE = :LAAGER_CODE `

  return sqldb.querySingle<{
    LAAGER_ID: number
  }>(sentence, qPars)
}

export function getLaagerByUnit (qPars: { UNIT_ID: number }){
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      DATE_FORMAT(LAAGER.INSTALLATION_DATE, '%Y/%m/%d') AS INSTALLATION_DATE

    FROM
      LAAGER
      INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
    
    WHERE WATERS.UNIT_ID = :UNIT_ID
  `

  return sqldb.querySingle<{
    LAAGER_CODE: string
    INSTALLATION_DATE: string
  }>(sentence, qPars);
}


export function getClientUnit (qPars: { ID:  number }) {
  let sentence = `
    SELECT
      LAAGER.LAAGER_CODE,
      WATERS.UNIT_ID,
      UNITS.CLIENT_ID

    FROM
      LAAGER
      INNER JOIN WATERS ON (WATERS.ID = LAAGER.WATER_ID)
      INNER JOIN UNITS ON (WATER.UNIT_ID = UNITS.UNIT_ID)
  `

  const conditions: string[] = []
  if (qPars.ID != null) { conditions.push(`LAAGER.ID = :ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.querySingle<{
    LAAGER_CODE: string
    UNIT_ID: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM DALS
  FIELD DALS.DEVICE_ID
*/
export async function w_insertIgnore (qPars: { DEVICE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID')

  const sentence = `INSERT IGNORE INTO DALS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DALS', sentence, qPars, operationLogData);
    dbLogger('DALS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getIdByCode = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}

  FROM DALS
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)

  SELECT DALS.ID

  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export function getIdByCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DALS.ID,
      DEVICES.ID AS DEVICE_ID
  `
  sentence += `
    FROM
      DALS
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)

  `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE; `

  return sqldb.querySingle<{
    ID: number
    DEVICE_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC w_delete = DELETE
  FROM DALS
*/
export async function w_delete(qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DALS WHERE DALS.ID = :ID `;

  if (operationLogData) {
    await saveOperationLog('DALS', sentence, qPars, operationLogData);
    dbLogger('DALS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getIdByCode = SELECT ROW
  PARAM CLIENT_ID: {DEVICES.CLIENT_ID}

  FROM DALS
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)

  SELECT DALS.ID
  SELECT DEVICES.DEVICE_CODE

  WHERE {DEVICES.CLIENT_ID} = {:CLIENT_ID}
*/
export function getDalsByClient(qPars: { CLIENT_ID: number }) {
  let sentence = `
    SELECT
      DALS.ID,
      DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM
      DALS
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
  `
  sentence += ` WHERE DEVICES.CLIENT_ID = :CLIENT_ID `

  return sqldb.query<{
    ID: number
    DEVICE_CODE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDalByCode = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DALS
  INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    SELECT DALS.ID,
    SELECT DEVICES.DEVICE_CODE,
    SELECT DEVICES_CLIENT.CLIENT_ID
  WHERE {DEVICES.DEVICE_CODE} = ({:DEVICE_CODE})
*/
export function getDalByCode(qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DALS.ID,
      DEVICES.DEVICE_CODE,
      DEVICES.ID AS DEVICE_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVFWVERS.CURRFW_VERS AS FWVERS
  `
  sentence += `
    FROM
      DALS
    INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVFWVERS ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID)
  `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE `

  return sqldb.querySingle<{
    ID: number
    DEVICE_CODE: string
    DEVICE_ID: number
    CLIENT_ID: number
    UNIT_ID: number
    FWVERS: string
  }>(sentence, qPars)
}

export function getBasicInfo(qPars: { DAL_CODE: string}) {
  let sentence = `
    SELECT 
      DEVICES.DEVICE_CODE, 
      DEVICES_CLIENTS.CLIENT_ID, 
      DEVICES_UNITS.UNIT_ID, 
      DEVICES.DAT_BEGMON
  `

  sentence += `
    FROM 
      DALS
    INNER JOIN DEVICES ON DALS.DEVICE_ID = DEVICES.ID
    LEFT JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
    LEFT JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :DAL_CODE`;

  return sqldb.querySingle<{
    DEVICE_CODE: string
    CLIENT_ID: number
    UNIT_ID: number
    DAT_BEGMON: string
  }>(sentence, qPars);
}

export async function getTimezoneInfoByDal(qPars: { dalCode: string }) {
  let sentence = `
  SELECT
    CLUNITS.TIMEZONE_ID,
    TIME_ZONES.AREA AS TIMEZONE_AREA,
    TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  FROM
    DEVICES
    INNER JOIN DEVICES_UNITS ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
    LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
  WHERE 
    DEVICES.DEVICE_CODE = :dalCode
  `
  return sqldb.querySingle<{
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDalsList = SELECT ROWS

  FROM 
    DALS
  INNER JOIN DEVICES ON DALS.DEVICE_ID = DEVICES.ID
  LEFT JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
  LEFT JOIN CLIENTS ON DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID
  LEFT JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
  LEFT JOIN CLUNITS ON DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID
  LEFT JOIN CITY ON CLUNITS.CITY_ID = CITY.CITY_ID
  LEFT JOIN STATEREGION ON STATEREGION.ID = CITY.STATE_ID 

  SELECT DEVICES_CLIENTS.CLIENT_ID
  SELECT DEVICES_UNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CITY.NAME AS CITY_NAME
  SELECT STATEREGION.NAME AS STATE  
  SELECT DEVICES.DEVICE_CODE
*/
export function getDalsList(qPars?: { clientIds?: number[], unitIds?: number[] }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE
  `

  sentence += `
    FROM
      DALS
    INNER JOIN DEVICES ON DALS.DEVICE_ID = DEVICES.ID
    LEFT JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
    LEFT JOIN CLIENTS ON DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID
    LEFT JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
    LEFT JOIN CLUNITS ON DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID
    LEFT JOIN CITY ON CLUNITS.CITY_ID = CITY.CITY_ID
    LEFT JOIN STATEREGION ON STATEREGION.ID = CITY.STATE_ID
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEVICE_CODE: string
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CITY_NAME: string
    STATE: string
  }>(sentence, qPars);
}

export function getAllDalsByUnit(qPars: { UNIT_ID: number }) {
  let sentence = `
  SELECT
    DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM DALS
      INNER JOIN DEVICES ON (DALS.DEVICE_ID = DEVICES.ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    `
  sentence += ` WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  return sqldb.query<{
    DEVICE_CODE: string
  }>(sentence, qPars);
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insertOrUpdate = INSERT-UPDATE
  FROM INTEGRCOOLAUT
  FIELD INTEGRCOOLAUT.COOLAUT_ID
  FIELD INTEGRCOOLAUT.UNIT_ID
*/
export async function w_insertOrUpdate (qPars: { COOLAUT_ID: string, UNIT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('COOLAUT_ID')
  fields.push('UNIT_ID')

  let sentence = `INSERT INTO INTEGRCOOLAUT (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("UNIT_ID = :UNIT_ID")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('INTEGRCOOLAUT', sentence, qPars, operationLogData);
    dbLogger('INTEGRCOOLAUT', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteItem = DELETE
  PARAM COOLAUT_ID: {INTEGRCOOLAUT.COOLAUT_ID}
  FROM INTEGRCOOLAUT
  WHERE {INTEGRCOOLAUT.COOLAUT_ID} = {:COOLAUT_ID}
*/
export async function w_deleteItem (qPars: { COOLAUT_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INTEGRCOOLAUT WHERE INTEGRCOOLAUT.COOLAUT_ID = :COOLAUT_ID`;

  if (operationLogData) {
    await saveOperationLog('INTEGRCOOLAUT', sentence, qPars, operationLogData);
    dbLogger('INTEGRCOOLAUT', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {INTEGRCOOLAUT.UNIT_ID}
  FROM INTEGRCOOLAUT
  WHERE {INTEGRCOOLAUT.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INTEGRCOOLAUT WHERE INTEGRCOOLAUT.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('INTEGRCOOLAUT', sentence, qPars, operationLogData);
    dbLogger('INTEGRCOOLAUT', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM INTEGRCOOLAUT
  INNER JOIN (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)";

  const sentence = `DELETE INTEGRCOOLAUT FROM INTEGRCOOLAUT ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('INTEGRCOOLAUT', sentence, qPars, operationLogData);
    dbLogger('INTEGRCOOLAUT', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitId = SELECT ROW
  PARAM COOLAUT_ID: {INTEGRCOOLAUT.COOLAUT_ID}
  FROM INTEGRCOOLAUT
  SELECT INTEGRCOOLAUT.COOLAUT_ID
  SELECT INTEGRCOOLAUT.UNIT_ID
  WHERE {INTEGRCOOLAUT.COOLAUT_ID} = {:COOLAUT_ID}
*/
export function getUnitId (qPars: { COOLAUT_ID: string }) {
  let sentence = `
    SELECT
      INTEGRCOOLAUT.COOLAUT_ID,
      INTEGRCOOLAUT.UNIT_ID
  `
  sentence += `
    FROM
      INTEGRCOOLAUT
  `

  sentence += ` WHERE INTEGRCOOLAUT.COOLAUT_ID = :COOLAUT_ID `

  return sqldb.querySingle<{
    COOLAUT_ID: string
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getIntegrId = SELECT ROW
  PARAM UNIT_ID: {INTEGRCOOLAUT.UNIT_ID}
  FROM INTEGRCOOLAUT
  SELECT INTEGRCOOLAUT.COOLAUT_ID
  SELECT INTEGRCOOLAUT.UNIT_ID
  WHERE {INTEGRCOOLAUT.UNIT_ID} = {:UNIT_ID}
*/
export function getIntegrId (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      INTEGRCOOLAUT.COOLAUT_ID,
      INTEGRCOOLAUT.UNIT_ID
  `
  sentence += `
    FROM
      INTEGRCOOLAUT
  `

  sentence += ` WHERE INTEGRCOOLAUT.UNIT_ID = :UNIT_ID `

  return sqldb.querySingle<{
    COOLAUT_ID: string
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM UNIT_ID?: {INTEGRCOOLAUT.UNIT_ID}
  FROM INTEGRCOOLAUT

  SELECT INTEGRCOOLAUT.COOLAUT_ID
  SELECT INTEGRCOOLAUT.UNIT_ID

  WHERE [[IFOWNPROP {:UNIT_ID}]] {INTEGRCOOLAUT.UNIT_ID} = {:UNIT_ID}
*/
export function getList (qPars: { UNIT_ID?: number }) {
  let sentence = `
    SELECT
      INTEGRCOOLAUT.COOLAUT_ID,
      INTEGRCOOLAUT.UNIT_ID
  `
  sentence += `
    FROM
      INTEGRCOOLAUT
  `

  if (qPars.UNIT_ID !== undefined) { sentence += ` WHERE INTEGRCOOLAUT.UNIT_ID = :UNIT_ID ` }

  return sqldb.query<{
    COOLAUT_ID: string
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListWithUnitInfo = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM unitIds?: {CLUNITS.UNIT_ID}[]
  PARAM cityIds?: {CLUNITS.CITY_ID}[]
  PARAM stateIds?: {CITY.STATE_ID}[]
  PARAM excludeClient?: {CLUNITS.CLIENT_ID}

  FROM INTEGRCOOLAUT
  INNER JOIN (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT INTEGRCOOLAUT.COOLAUT_ID
  SELECT INTEGRCOOLAUT.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.GA_METER
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE [[IFJS {:excludeClient}]] {CLUNITS.CLIENT_ID} <> {:excludeClient}
  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {INTEGRCOOLAUT.UNIT_ID} IN ({:unitIds})
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
      INTEGRCOOLAUT.COOLAUT_ID,
      INTEGRCOOLAUT.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.GA_METER,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID,
      STATEREGION.ID AS STATE_ID,
      STATEREGION.NAME AS STATE_NAME
  `
  sentence += `
    FROM
      INTEGRCOOLAUT
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`CLUNITS.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`INTEGRCOOLAUT.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.query<{
    COOLAUT_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    GA_METER: number
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM COOLAUT_ID: {INTEGRCOOLAUT.COOLAUT_ID}

  FROM INTEGRCOOLAUT
  INNER JOIN (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT INTEGRCOOLAUT.COOLAUT_ID
  SELECT INTEGRCOOLAUT.UNIT_ID
  SELECT INTEGRCOOLAUT.CARDSCFG
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.GA_METER
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE {INTEGRCOOLAUT.COOLAUT_ID} = {:COOLAUT_ID}
*/
export function getExtraInfo (qPars: { COOLAUT_ID: string }) {
  let sentence = `
    SELECT
      INTEGRCOOLAUT.COOLAUT_ID,
      INTEGRCOOLAUT.UNIT_ID,
      INTEGRCOOLAUT.CARDSCFG,
      CLUNITS.UNIT_NAME,
      CLUNITS.GA_METER,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      INTEGRCOOLAUT
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGRCOOLAUT.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  sentence += ` WHERE INTEGRCOOLAUT.COOLAUT_ID = :COOLAUT_ID `

  return sqldb.querySingle<{
    COOLAUT_ID: string
    UNIT_ID: number
    CARDSCFG: string
    UNIT_NAME: string
    GA_METER: number
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_ID: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}
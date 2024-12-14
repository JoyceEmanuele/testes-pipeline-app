import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM cityId: {CITY.CITY_ID}
  FROM CITY
  WHERE {CITY.CITY_ID} = {:cityId}
*/
export async function w_deleteRow (qPars: { cityId: string }, delChecks: {
  CLUNITS: true,
  DASHUSERS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CITY WHERE CITY.CITY_ID = :cityId`;

  if (operationLogData) {
    await saveOperationLog('CITY', sentence, qPars, operationLogData);
    dbLogger('CITY', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM CITY
  FIELD CITY.CITY_ID
  FIELD CITY.NAME
  FIELD CITY.STATE_ID
  FIELD CITY.LAT
  FIELD CITY.LON
*/
export async function w_insert (qPars: { CITY_ID: string, NAME: string, STATE_ID: number, LAT: string, LON: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CITY_ID')
  fields.push('NAME')
  fields.push('STATE_ID')
  fields.push('LAT')
  fields.push('LON')

  const sentence = `INSERT INTO CITY (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CITY', sentence, qPars, operationLogData);
    dbLogger('CITY', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM CITY_ID: {CITY.CITY_ID}
  FROM CITY
  FIELD [[IFOWNPROP {:LAT}]] CITY.LAT
  FIELD [[IFOWNPROP {:LON}]] CITY.LON
  FIELD [[IFOWNPROP {:NAME}]] CITY.NAME
*/
export async function w_update (qPars: { CITY_ID: string, LAT?: string, LON?: string, NAME?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.LAT !== undefined) { fields.push('LAT = :LAT') }
  if (qPars.LON !== undefined) { fields.push('LON = :LON') }
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE CITY SET ${fields.join(', ')} WHERE CITY_ID = :CITY_ID`

  if (operationLogData) {
    await saveOperationLog('CITY', sentence, qPars, operationLogData);
    dbLogger('CITY', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getCity = SELECT ROW
  PARAM CITY_ID: {CITY.CITY_ID}
  FROM CITY
  SELECT CITY.CITY_ID AS id
  SELECT CITY.NAME AS name
  SELECT CITY.STATE_ID AS state
  SELECT CITY.LAT AS lat
  SELECT CITY.LON AS lon
  WHERE {CITY.CITY_ID} = {:CITY_ID}
*/
export function getCity (qPars: { CITY_ID: string }) {
  let sentence = `
    SELECT
      CITY.CITY_ID AS id,
      CITY.NAME AS name,
      STATEREGION.NAME AS state,
      COUNTRY.NAME as country,
      CITY.LAT AS lat,
      CITY.LON AS lon
  `
  sentence += `
    FROM
      CITY
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
  `

  sentence += ` WHERE CITY.CITY_ID = :CITY_ID `

  return sqldb.querySingle<{
    id: string
    name: string
    state: string
    country: string
    lat: string
    lon: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC select1 = SELECT LIST
  PARAM stateId?: {CITY.STATE_ID}
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  FROM CITY
  SELECT CITY.CITY_ID AS id
  SELECT CITY.NAME AS name
  SELECT CITY.STATE_ID AS state
  SELECT CITY.LAT AS lat
  SELECT CITY.LON AS lon
  WHERE [[IFJS {:stateId}]] {CITY.STATE_ID} = {:stateId}
  WHERE [[IFJS {:clientIds}]] ({CITY.CITY_ID} IN (SELECT DISTINCT {{CLUNITS.CITY_ID}} FROM {{CLUNITS}} WHERE {{CLUNITS.CLIENT_ID}} IN ({:clientIds})))
  ORDER BY CITY.NAME ASC
*/
export function select1 (qPars: { stateId?: string, clientIds?: number[] }) {
  let sentence = `
    SELECT
      CITY.CITY_ID AS id,
      CITY.NAME AS name,
      COUNTRY.NAME AS country,
      STATEREGION.NAME AS state,
      STATEREGION.ID AS stateId,
      STATEREGION.FULL_NAME AS stateFullName,
      CITY.LAT AS lat,
      CITY.LON AS lon
  `
  sentence += `
    FROM
      CITY
      INNER JOIN STATEREGION ON CITY.STATE_ID = STATEREGION.ID
      INNER JOIN COUNTRY ON STATEREGION.COUNTRY_ID = COUNTRY.ID
  `

  const conditions: string[] = []
  if (qPars.stateId) { conditions.push(`CITY.STATE_ID = :stateId`) }
  if (qPars.clientIds) { conditions.push(`(CITY.CITY_ID IN (SELECT DISTINCT CLUNITS.CITY_ID FROM CLUNITS WHERE CLUNITS.CLIENT_ID IN (:clientIds)))`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY CITY.NAME ASC `

  return sqldb.query<{
    id: string
    name: string
    country: string
    state: string
    stateId: number
    stateFullName: string
    lat: string
    lon: string
  }>(sentence, qPars)
}

export function getAllCitiesFiltered(qPars: { statesIds: number[], unitsIds?: number[], clientIds?: number[] }) {
  let sentence = `
    SELECT
      CITY.CITY_ID AS CITY_ID,
      CITY.NAME AS CITY_NAME
  `
  sentence += `
    FROM
      CITY
      INNER JOIN STATEREGION ON CITY.STATE_ID = STATEREGION.ID
      INNER JOIN COUNTRY ON STATEREGION.COUNTRY_ID = COUNTRY.ID
  `

  const conditions: string[] = []
  if (qPars.statesIds?.length) { conditions.push(`CITY.STATE_ID IN (:statesIds)`) }
  if (qPars.clientIds?.length) { conditions.push(`(CITY.CITY_ID IN (SELECT DISTINCT CLUNITS.CITY_ID FROM CLUNITS WHERE CLUNITS.CLIENT_ID IN (:clientIds)))`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY CITY.NAME ASC `

  return sqldb.query<{
    CITY_ID: string
    CITY_NAME: string
  }>(sentence, qPars)
}

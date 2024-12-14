import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC selectStates = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM+ full: boolean

  FROM STATEREGION

  SELECT STATEREGION.ID AS id
  SELECT STATEREGION.FULL_NAME AS name
  SELECT STATEREGION.LAT AS lat
  SELECT STATEREGION.LON AS lon

  WHERE [[IFJS {:clientIds}]] {STATEREGION.ID} IN (SELECT {{CITY.STATE_ID}} FROM {{CLUNITS}} INNER JOIN {{CITY}} ON ({{CITY.CITY_ID}} = {{CLUNITS.CITY_ID}}) WHERE {{CLUNITS.CLIENT_ID}} IN ({:clientIds}))
  WHERE [[IFJS (!{:clientIds}) && admPars.full !== true]] {STATEREGION.ID} IN (SELECT {{CITY.STATE_ID}} FROM {{CLUNITS}} INNER JOIN {{CITY}} ON ({{CITY.CITY_ID}} = {{CLUNITS.CITY_ID}}))

  ORDER BY STATEREGION.FULL_NAME ASC
*/
export function selectStates (qPars: { clientIds?: number[] }, admPars: { full: boolean }) {
  let sentence = `
    SELECT
      STATEREGION.ID AS id,
      STATEREGION.NAME AS name,
      STATEREGION.FULL_NAME AS fullName,
      STATEREGION.LAT AS lat,
      STATEREGION.LON AS lon,
      STATEREGION.COUNTRY_ID as countryId
  `
  sentence += `
    FROM
      STATEREGION
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length) { conditions.push(`STATEREGION.ID IN (SELECT CITY.STATE_ID FROM CLUNITS INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID) WHERE CLUNITS.CLIENT_ID IN (:clientIds))`) }
  if ((!qPars.clientIds) && admPars.full !== true) { conditions.push(`STATEREGION.ID IN (SELECT CITY.STATE_ID FROM CLUNITS INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID))`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY STATEREGION.FULL_NAME ASC `

  return sqldb.query<{
    id: string
    name: string
    fullName: string
    lat: string
    lon: string
    countryId: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getState = SELECT ROW
  PARAM STATE_NAME: {STATEREGION.STATE_NAME}
  FROM STATEREGION
  SELECT STATEREGION.ID AS id
  SELECT STATEREGION.COUNTRY_ID AS countryId
  WHERE {STATEREGION.FULL_NAME} = {:STATE_NAME}
  */

export function getState (qPars: { STATE_NAME: string, COUNTRY_ID: number }) {
  let sentence = `
    SELECT
      STATEREGION.ID AS id,
      STATEREGION.FULL_NAME AS name,
      STATEREGION.COUNTRY_ID AS countryId
  `
  sentence += `
    FROM
      STATEREGION
  `
  sentence += ` WHERE LOWER(STATEREGION.FULL_NAME) = LOWER(:STATE_NAME) AND STATEREGION.COUNTRY_ID = :COUNTRY_ID`

  return sqldb.querySingle<{
    id: number
    name: string
    countryId: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM STATEREGION
  FIELD STATEREGION.STATE_NAME
  FIELD STATEREGION.COUNTRY_ID
  FIELD STATEREGION.STATE_LAT
  FIELD STATEREGION.STATE_LON
*/

export async function w_insert (qPars: { STATE_CODE: string, STATE_NAME: string, COUNTRY_ID: number, STATE_LAT: string, STATE_LON: string }, operationLogData: OperationLogData) {
  const sentence = `
    INSERT INTO STATEREGION 
      (NAME, FULL_NAME, LAT, LON, COUNTRY_ID) 
    VALUES 
    (:STATE_CODE, :STATE_NAME, :STATE_LAT, :STATE_LON, :COUNTRY_ID)`

  if (operationLogData) {
    await saveOperationLog('STATEREGION', sentence, qPars, operationLogData);
    dbLogger('STATEREGION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

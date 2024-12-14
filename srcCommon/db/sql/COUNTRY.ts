import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'


/* @IFHELPER:FUNC insert = INSERT
  FROM COUNTRY
  FIELD COUNTRY.COUNTRY_NAME
  FIELD COUNTRY.COUNTRY_LAT
  FIELD COUNTRY.COUNTRY_LON
*/
export async function w_insert (qPars: { COUNTRY_NAME: string, COUNTRY_LAT: string, COUNTRY_LON: string }, operationLogData: OperationLogData) {
  const sentence = `INSERT INTO COUNTRY (NAME, LAT, LON) VALUES (:COUNTRY_NAME, :COUNTRY_LAT, :COUNTRY_LON)`

  if (operationLogData) {
    await saveOperationLog('COUNTRY', sentence, qPars, operationLogData);
    dbLogger('COUNTRY', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getCountry = SELECT ROW
  PARAM COUNTRY_NAME: {COUNTRY.COUNTRY_NAME}
  FROM COUNTRY
  SELECT COUNTRY.ID AS id
  SELECT COUNTRY.COUNTRY_NAME AS name
  WHERE {COUNTRY.COUNTRY_NAME} = {:COUNTRY_NAME}
*/
export function getCountry (qPars: { COUNTRY_NAME: string }) {
  let sentence = `
    SELECT
      COUNTRY.ID AS id,
      COUNTRY.NAME AS name
  `
  sentence += `
    FROM
      COUNTRY
  `

  sentence += ` WHERE LOWER(COUNTRY.NAME) = LOWER(:COUNTRY_NAME) `

  return sqldb.querySingle<{
    id: number
    name: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC selectCountries = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM+ full: boolean

  FROM COUNTRY

  SELECT COUNTRY.ID AS id
  SELECT COUNTRY.NAME AS name

  WHERE [[IFJS {:clientIds}]] {COUNTRY.ID} IN (SELECT {{STATEREGION.COUNTRY_ID}} FROM {{STATEREGION}} WHERE {{STATEREGION.ID}} IN (SELECT {{CITY.STATE_ID}} FROM {{CLUNITS}} INNER JOIN {{CITY}} ON ({{CITY.CITY_ID}} = {{CLUNITS.CITY_ID}}) WHERE {{CLUNITS.CLIENT_ID}} IN ({:clientIds})))
  WHERE [[IFJS (!{:clientIds}) && admPars.full !== true]] {COUNTRY.ID} IN (SELECT {{STATEREGION.COUNTRY_ID}} FROM {{STATEREGION}} WHERE {{STATEREGION.ID}} IN (SELECT {{CITY.STATE_ID}} FROM {{CLUNITS}} INNER JOIN {{CITY}} ON ({{CITY.CITY_ID}} = {{CLUNITS.CITY_ID}})))

  ORDER BY COUNTRY.NAME ASC
*/
export function selectCountries (qPars: { clientIds?: number[] }, admPars: { full: boolean }) {
  let sentence = `
    SELECT
	    COUNTRY.ID AS id,
      COUNTRY.NAME as name,
      COUNTRY.LAT as lat,
      COUNTRY.LON as lon
  `
  sentence += `
    FROM
      COUNTRY
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`COUNTRY.ID IN (SELECT STATEREGION.COUNTRY_ID FROM STATEREGION WHERE STATEREGION.ID IN (SELECT CITY.STATE_ID FROM CLUNITS INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID) WHERE CLUNITS.CLIENT_ID IN (:clientIds)))`) }
  if ((!qPars.clientIds) && admPars.full !== true) { conditions.push(`COUNTRY.ID IN (SELECT STATEREGION.COUNTRY_ID FROM STATEREGION WHERE STATEREGION.ID IN (SELECT CITY.STATE_ID FROM CLUNITS INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)))`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY COUNTRY.NAME ASC `

  return sqldb.query<{
    id: number
    name: string
    lat: string
    lon: string
  }>(sentence, qPars)
}

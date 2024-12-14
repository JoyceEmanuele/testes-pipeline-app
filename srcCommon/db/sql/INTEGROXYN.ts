import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM INTEGROXYN
  FIELD INTEGROXYN.SITE_PATH
  FIELD INTEGROXYN.EQUIP_PATH
  FIELD INTEGROXYN.UNIT_ID
*/
export async function w_insert (qPars: { SITE_PATH: string, EQUIP_PATH: string, UNIT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('SITE_PATH')
  fields.push('EQUIP_PATH')
  fields.push('UNIT_ID')

  const sentence = `INSERT INTO INTEGROXYN (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('INTEGROXYN', sentence, qPars, operationLogData);
    dbLogger('INTEGROXYN', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM INTEGROXYN
  PARAM EQUIP_PATH: {INTEGROXYN.EQUIP_PATH}
  FIELD [[IFOWNPROP {:CARDSCFG}]] INTEGROXYN.CARDSCFG
*/
export async function w_updateInfo (qPars: { EQUIP_PATH: string, CARDSCFG?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.CARDSCFG !== undefined) { fields.push('CARDSCFG = :CARDSCFG') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE INTEGROXYN SET ${fields.join(', ')} WHERE EQUIP_PATH = :EQUIP_PATH`

  if (operationLogData) {
    await saveOperationLog('INTEGROXYN', sentence, qPars, operationLogData);
    dbLogger('INTEGROXYN', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteItem = DELETE
  PARAM EQUIP_PATH: {INTEGROXYN.EQUIP_PATH}
  FROM INTEGROXYN
  WHERE {INTEGROXYN.EQUIP_PATH} = {:EQUIP_PATH}
*/
export async function w_deleteItem (qPars: { EQUIP_PATH: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INTEGROXYN WHERE INTEGROXYN.EQUIP_PATH = :EQUIP_PATH`;

  if (operationLogData) {
    await saveOperationLog('INTEGROXYN', sentence, qPars, operationLogData);
    dbLogger('INTEGROXYN', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {INTEGROXYN.UNIT_ID}
  FROM INTEGROXYN
  WHERE {INTEGROXYN.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INTEGROXYN WHERE INTEGROXYN.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('INTEGROXYN', sentence, qPars, operationLogData);
    dbLogger('INTEGROXYN', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM INTEGROXYN
  INNER JOIN (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)";

  const sentence = `DELETE INTEGROXYN FROM INTEGROXYN ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('INTEGROXYN', sentence, qPars, operationLogData);
    dbLogger('INTEGROXYN', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitId = SELECT ROW
  PARAM EQUIP_PATH: {INTEGROXYN.EQUIP_PATH}
  FROM INTEGROXYN
  SELECT INTEGROXYN.SITE_PATH
  SELECT INTEGROXYN.EQUIP_PATH
  SELECT INTEGROXYN.UNIT_ID
  WHERE {INTEGROXYN.EQUIP_PATH} = {:EQUIP_PATH}
*/
export function getUnitId (qPars: { EQUIP_PATH: string }) {
  let sentence = `
    SELECT
      INTEGROXYN.SITE_PATH,
      INTEGROXYN.EQUIP_PATH,
      INTEGROXYN.UNIT_ID
  `
  sentence += `
    FROM
      INTEGROXYN
  `

  sentence += ` WHERE INTEGROXYN.EQUIP_PATH = :EQUIP_PATH `

  return sqldb.querySingle<{
    SITE_PATH: string
    EQUIP_PATH: string
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getIntegrIds = SELECT LIST
  PARAM UNIT_ID: {INTEGROXYN.UNIT_ID}
  FROM INTEGROXYN
  SELECT INTEGROXYN.EQUIP_PATH
  SELECT INTEGROXYN.UNIT_ID
  WHERE {INTEGROXYN.UNIT_ID} = {:UNIT_ID}
*/
export function getIntegrIds (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      INTEGROXYN.EQUIP_PATH,
      INTEGROXYN.UNIT_ID
  `
  sentence += `
    FROM
      INTEGROXYN
  `

  sentence += ` WHERE INTEGROXYN.UNIT_ID = :UNIT_ID `

  return sqldb.query<{
    EQUIP_PATH: string
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST

  FROM INTEGROXYN

  SELECT INTEGROXYN.EQUIP_PATH
  SELECT INTEGROXYN.UNIT_ID
*/
export function getList () {
  let sentence = `
    SELECT
      INTEGROXYN.EQUIP_PATH,
      INTEGROXYN.UNIT_ID
  `
  sentence += `
    FROM
      INTEGROXYN
  `

  return sqldb.query<{
    EQUIP_PATH: string
    UNIT_ID: number
  }>(sentence)
}

/* @IFHELPER:FUNC getListWithUnitInfo = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM unitIds?: {CLUNITS.UNIT_ID}[]
  PARAM cityIds?: {CLUNITS.CITY_ID}[]
  PARAM stateIds?: {CITY.STATE_ID}[]
  PARAM excludeClient?: {CLUNITS.CLIENT_ID}

  FROM INTEGROXYN
  INNER JOIN (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT INTEGROXYN.EQUIP_PATH
  SELECT INTEGROXYN.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE [[IFJS {:excludeClient}]] {CLUNITS.CLIENT_ID} <> {:excludeClient}
  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {INTEGROXYN.UNIT_ID} IN ({:unitIds})
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
      INTEGROXYN.EQUIP_PATH,
      INTEGROXYN.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID AS CITY_ID,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID
  `
  sentence += `
    FROM
      INTEGROXYN
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`CLUNITS.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`INTEGROXYN.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    EQUIP_PATH: string
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM EQUIP_PATH: {INTEGROXYN.EQUIP_PATH}

  FROM INTEGROXYN
  INNER JOIN (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT INTEGROXYN.EQUIP_PATH
  SELECT INTEGROXYN.SITE_PATH
  SELECT INTEGROXYN.UNIT_ID
  SELECT INTEGROXYN.CARDSCFG
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE {INTEGROXYN.EQUIP_PATH} = {:EQUIP_PATH}
*/
export function getExtraInfo (qPars: { EQUIP_PATH: string }) {
  let sentence = `
    SELECT
      INTEGROXYN.EQUIP_PATH,
      INTEGROXYN.SITE_PATH,
      INTEGROXYN.UNIT_ID,
      INTEGROXYN.CARDSCFG,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.FULL_NAME AS STATE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      INTEGROXYN
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INTEGROXYN.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  sentence += ` WHERE INTEGROXYN.EQUIP_PATH = :EQUIP_PATH `

  return sqldb.querySingle<{
    EQUIP_PATH: string
    SITE_PATH: string
    UNIT_ID: number
    CARDSCFG: string
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_ID: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

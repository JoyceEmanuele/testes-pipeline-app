import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM clientId: {CLIENTS.CLIENT_ID}
  FROM CLIENTS
  WHERE {CLIENTS.CLIENT_ID} = {:clientId}
*/
export async function w_deleteRow (qPars: { clientId: number }, delChecks: {
  ASSOCIATIONS: true,
  CLASSES: true,
  CLIENT_ASSETS: true,
  CLUNITS: true,
  DASHUSERS: true,
  DEVGROUPS: true,
  DEVS: true,
  MANUFACT_DEVS: true,
  NOTIFSCFG: true,
  ROOMS: true,
  ROOMTYPES: true,
  SIMCARDS: true,
  USERSCLIENTS: true,
  VISITATECNICA: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CLIENTS WHERE CLIENTS.CLIENT_ID = :clientId`;

  if (operationLogData) {
    await saveOperationLog('CLIENTS', sentence, qPars, operationLogData);
    dbLogger('CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM CLIENTS

  FIELD CLIENTS.EMAIL
  FIELD CLIENTS.NAME
  FIELD [[IFOWNPROP {:PICTURE}]] CLIENTS.PICTURE
  FIELD [[IFOWNPROP {:ENABLED}]] CLIENTS.ENABLED
  FIELD [[IFOWNPROP {:PERMS_C}]] CLIENTS.PERMS_C
  FIELD [[IFOWNPROP {:CNPJ}]] CLIENTS.CNPJ
  FIELD [[IFOWNPROP {:PHONE}]] CLIENTS.PHONE
*/
export async function w_insert (qPars: {
  EMAIL: string,
  NAME: string,
  PICTURE?: string,
  ENABLED?: string,
  PERMS_C?: string,
  CNPJ?: string,
  PHONE?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('EMAIL')
  fields.push('NAME')
  if (qPars.PICTURE !== undefined) { fields.push('PICTURE') }
  if (qPars.ENABLED !== undefined) { fields.push('ENABLED') }
  if (qPars.PERMS_C !== undefined) { fields.push('PERMS_C') }
  if (qPars.CNPJ !== undefined) { fields.push('CNPJ') }
  if (qPars.PHONE !== undefined) { fields.push('PHONE') }

  const sentence = `INSERT INTO CLIENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CLIENTS', sentence, qPars, operationLogData);
    dbLogger('CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM CLIENT_ID: {CLIENTS.CLIENT_ID}

  FROM CLIENTS

  FIELD [[IFOWNPROP {:EMAIL}]] CLIENTS.EMAIL
  FIELD [[IFOWNPROP {:NAME}]] CLIENTS.NAME
  FIELD [[IFOWNPROP {:PICTURE}]] CLIENTS.PICTURE
  FIELD [[IFOWNPROP {:ENABLED}]] CLIENTS.ENABLED
  FIELD [[IFOWNPROP {:PERMS_C}]] CLIENTS.PERMS_C
  FIELD [[IFOWNPROP {:CNPJ}]] CLIENTS.CNPJ
  FIELD [[IFOWNPROP {:PHONE}]] CLIENTS.PHONE
*/
export async function w_update (qPars: {
  CLIENT_ID: number,
  EMAIL?: string,
  NAME?: string,
  PICTURE?: string,
  ENABLED?: string,
  PERMS_C?: string,
  CNPJ?: string,
  PHONE?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.EMAIL !== undefined) { fields.push('EMAIL = :EMAIL') }
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (qPars.PICTURE !== undefined) { fields.push('PICTURE = :PICTURE') }
  if (qPars.ENABLED !== undefined) { fields.push('ENABLED = :ENABLED') }
  if (qPars.PERMS_C !== undefined) { fields.push('PERMS_C = :PERMS_C') }
  if (qPars.CNPJ !== undefined) { fields.push('CNPJ = :CNPJ') }
  if (qPars.PHONE !== undefined) { fields.push('PHONE = :PHONE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE CLIENTS SET ${fields.join(', ')} WHERE CLIENT_ID = :CLIENT_ID`

  if (operationLogData) {
    await saveOperationLog('CLIENTS', sentence, qPars, operationLogData);
    dbLogger('CLIENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getClientInfo = SELECT ROW
  PARAM CLIENT_ID: {CLIENTS.CLIENT_ID}

  FROM CLIENTS

  SELECT CLIENTS.CLIENT_ID
  SELECT CLIENTS.NAME
  SELECT CLIENTS.EMAIL
  SELECT CLIENTS.PICTURE
  SELECT CLIENTS.ENABLED
  SELECT CLIENTS.PERMS_C
  SELECT CLIENTS.CNPJ
  SELECT CLIENTS.PHONE

  WHERE {CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export function getClientInfo (qPars: { CLIENT_ID: number }) {
  let sentence = `
    SELECT
      CLIENTS.CLIENT_ID,
      CLIENTS.NAME,
      CLIENTS.EMAIL,
      CLIENTS.PICTURE,
      CLIENTS.ENABLED,
      CLIENTS.PERMS_C,
      CLIENTS.CNPJ,
      CLIENTS.PHONE
  `
  sentence += `
    FROM
      CLIENTS
  `

  sentence += ` WHERE CLIENTS.CLIENT_ID = :CLIENT_ID `

  return sqldb.querySingle<{
    CLIENT_ID: number
    NAME: string
    EMAIL: string
    PICTURE: string
    ENABLED: string
    PERMS_C: string
    CNPJ: string
    PHONE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getManufacturers = SELECT LIST

  FROM CLIENTS

  SELECT CLIENTS.CLIENT_ID
  SELECT CLIENTS.PERMS_C
  SELECT CLIENTS.CNPJ
  SELECT CLIENTS.PHONE

  WHERE {CLIENTS.PERMS_C} LIKE '%[F]%'
*/
export function getManufacturers () {
  let sentence = `
    SELECT
      CLIENTS.CLIENT_ID,
      CLIENTS.PERMS_C,
      CLIENTS.CNPJ,
      CLIENTS.PHONE
  `
  sentence += `
    FROM
      CLIENTS
  `

  sentence += ` WHERE CLIENTS.PERMS_C LIKE '%[F]%' `

  return sqldb.query<{
    CLIENT_ID: number
    PERMS_C: string
    CNPJ: string
    PHONE: string
  }>(sentence)
}

/* @IFHELPER:FUNC getClientsList = SELECT LIST
  PARAM clientIds?: {CLIENTS.CLIENT_ID}[]
  PARAM+ full?: boolean

  FROM CLIENTS

  SELECT CLIENTS.CLIENT_ID
  SELECT CLIENTS.NAME
  SELECT CLIENTS.PERMS_C
  SELECT [[IFJS admPars.full === true]] CLIENTS.EMAIL
  SELECT [[IFJS admPars.full === true]] CLIENTS.PICTURE
  SELECT [[IFJS admPars.full === true]] CLIENTS.ENABLED
  SELECT [[IFJS admPars.full === true]] CLIENTS.CNPJ
  SELECT [[IFJS admPars.full === true]] CLIENTS.PHONE

  WHERE [[IFJS qPars.clientIds]] {CLIENTS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS admPars.full !== true]] {CLIENTS.ENABLED} = '1'

  [[IFJS {::full} === true]] ORDER BY CLIENTS.ENABLED DESC
  ORDER BY CLIENTS.NAME ASC
*/
export function getClientsList (qPars: { clientIds?: number[] }, admPars: { full?: boolean }) {
  let sentence = `
    SELECT
      CLIENTS.CLIENT_ID,
      CLIENTS.NAME,
      CLIENTS.PERMS_C
  `
  if (admPars.full === true) { sentence += ' ,CLIENTS.EMAIL ' }
  if (admPars.full === true) { sentence += ' ,CLIENTS.PICTURE ' }
  if (admPars.full === true) { sentence += ' ,CLIENTS.ENABLED ' }
  if (admPars.full === true) { sentence += ' ,CLIENTS.CNPJ ' }
  if (admPars.full === true) { sentence += ' ,CLIENTS.PHONE ' }
  sentence += `
    FROM
      CLIENTS
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (admPars.full !== true) { conditions.push(`CLIENTS.ENABLED = '1'`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  const orderBy: string[] = []
  if (admPars.full === true) { orderBy.push(`CLIENTS.ENABLED DESC`) }
  orderBy.push(`CLIENTS.NAME ASC`)
  sentence += ' ORDER BY ' + orderBy.join(', ')

  return sqldb.query<{
    CLIENT_ID: number
    NAME: string
    PERMS_C: string
    EMAIL?: string
    PICTURE?: string
    ENABLED?: string
    CNPJ?: string
    PHONE?: string
  }>(sentence, qPars)
}

export function getCitiesClients (qPars: { clientId: number }) {
  let sentence = `
    SELECT DISTINCT
      CLUNITS.CITY_ID AS CITY_ID
  `
  sentence += `
    FROM
      CLIENTS
    LEFT JOIN CLUNITS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    WHERE CLIENTS.CLIENT_ID = :clientId
  `
  return sqldb.query<{
    CITY_ID: string
  }>(sentence, qPars)
}

export function getStatesClients (qPars: { clientId: number }) {
  let sentence = `
    SELECT DISTINCT
      STATEREGION.ID AS STATE_ID
  `;

  sentence += `
    FROM
      CLIENTS
    LEFT JOIN CLUNITS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
    LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    WHERE CLIENTS.CLIENT_ID = :clientId
  `;
  return sqldb.query<{
    STATE_ID: number
  }>(sentence, qPars)
}

export function getAllClientsEnabled (qPars: { FILTER_BY_CLIENT_IDS?: number[], STATES?: string[], CITIES?: string[] }) {
  let sentence = `
    SELECT DISTINCT
      CLIENTS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME
    FROM 
      CLIENTS
    LEFT JOIN CLUNITS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
    LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `;

  const conditions: string[] = []
  conditions.push('CLIENTS.ENABLED = 1')
  if (qPars.FILTER_BY_CLIENT_IDS?.length) { conditions.push(`CLIENTS.CLIENT_ID IN (:FILTER_BY_CLIENT_IDS)`) }
  if (qPars.STATES?.length) { conditions.push('STATEREGION.NAME IN (:STATES)')}
  if (qPars.CITIES?.length) { conditions.push('CITY.CITY_ID IN (:CITIES)')}

  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' ORDER BY CLIENT_NAME'
  return sqldb.query<{
    CLIENT_ID: number
    CLIENT_NAME: string
  }>(sentence, qPars);
}

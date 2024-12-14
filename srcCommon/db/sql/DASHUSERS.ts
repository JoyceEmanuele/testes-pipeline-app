import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

// /* @IFHELPER:FUNC deleteUser = DELETE
//   PARAM USER: {DASHUSERS.EMAIL}
//   FROM DASHUSERS
//   WHERE {DASHUSERS.EMAIL} = {:USER}
// */
// export async function w_deleteUser (qPars: { USER: string }, delChecks: {
//   NOTIFDESTS: true,
//   NOTIFSCFG: true,
//   PWRECOVERTK: true,
//   UNITSUPERVISORS: true,
//   USERSCLIENTS: true,
//   USERSTOKENS: true,
//   VISITATECNICA: true
// }, operationLogData: OperationLogData) {

//   const sentence = `DELETE FROM DASHUSERS WHERE DASHUSERS.EMAIL = :USER`;

//   if (operationLogData) {
//     await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
//     dbLogger('DASHUSERS', sentence, qPars, operationLogData);
//   }

//   return sqldb.execute(sentence, qPars)
// }

/* @IFHELPER:FUNC inativeUser = UPDATE
  PARAM USER: {DASHUSERS.EMAIL}
  FROM DASHUSERS
  WHERE {DASHUSERS.EMAIL} = {:USER}
*/
export async function w_inativeUser (qPars: { USER_ID: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE DASHUSERS SET IS_ACTIVE = '0' WHERE DASHUSERS.EMAIL = :USER_ID`;

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_ativeUser (qPars: { USER_ID: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE DASHUSERS SET IS_ACTIVE = '1' WHERE DASHUSERS.EMAIL = :USER_ID`;

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_inativeFromClient (qPars: { CLIENT_BIND: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE DASHUSERS SET IS_ACTIVE = '0' WHERE DASHUSERS.CLIENT_BIND = :CLIENT_BIND`;

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_BIND: {DASHUSERS.CLIENT_BIND}
  FROM DASHUSERS
  WHERE {DASHUSERS.CLIENT_BIND} = {:CLIENT_BIND}
*/
export async function w_deleteFromClient (qPars: { CLIENT_BIND: number }, delChecks: {
  NOTIFDESTS: true,
  NOTIFSCFG: true,
  PWRECOVERTK: true,
  UNITSUPERVISORS: true,
  USERSCLIENTS: true,
  USERSTOKENS: true,
  VISITATECNICA: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DASHUSERS WHERE DASHUSERS.CLIENT_BIND = :CLIENT_BIND`;

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC addNewUser = INSERT
  FROM DASHUSERS
  FIELD DASHUSERS.INVITED_BY
  FIELD DASHUSERS.EMAIL
  FIELD DASHUSERS.PASSWORD
  FIELD DASHUSERS.NOME
  FIELD DASHUSERS.SOBRENOME
  FIELD DASHUSERS.PERMS_U
  FIELD [[IFOWNPROP {:RG}]] DASHUSERS.RG
  FIELD [[IFOWNPROP {:COMMENTS}]] DASHUSERS.COMMENTS
  FIELD [[IFOWNPROP {:PICTURE}]] DASHUSERS.PICTURE
  FIELD [[IFOWNPROP {:CITY_ID}]] DASHUSERS.CITY_ID
  FIELD [[IFOWNPROP {:PHONENB}]] DASHUSERS.PHONENB
  FIELD [[IFOWNPROP {:CLIENT_BIND}]] DASHUSERS.CLIENT_BIND
*/
export async function w_addNewUser (qPars: {
  INVITED_BY: string,
  EMAIL: string,
  PASSWORD: string,
  NOME: string,
  SOBRENOME: string,
  PERMS_U: string,
  RG?: string,
  COMMENTS?: string,
  PICTURE?: string,
  CITY_ID?: string,
  PHONENB?: string,
  CLIENT_BIND?: number
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('INVITED_BY')
  fields.push('EMAIL')
  fields.push('PASSWORD')
  fields.push('NOME')
  fields.push('SOBRENOME')
  fields.push('PERMS_U')
  if (qPars.RG !== undefined) { fields.push('RG') }
  if (qPars.COMMENTS !== undefined) { fields.push('COMMENTS') }
  if (qPars.PICTURE !== undefined) { fields.push('PICTURE') }
  if (qPars.CITY_ID !== undefined) { fields.push('CITY_ID') }
  if (qPars.PHONENB !== undefined) { fields.push('PHONENB') }
  if (qPars.CLIENT_BIND !== undefined) { fields.push('CLIENT_BIND') }

  const sentence = `INSERT INTO DASHUSERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateUser = UPDATE
  PARAM EMAIL: {DASHUSERS.EMAIL}

  FROM DASHUSERS

  FIELD [[IFOWNPROP {:LAST_ACCESS}]] DASHUSERS.LAST_ACCESS
  FIELD [[IFOWNPROP {:PASSWORD}]]    DASHUSERS.PASSWORD
  FIELD [[IFOWNPROP {:NOME}]]        DASHUSERS.NOME
  FIELD [[IFOWNPROP {:SOBRENOME}]]   DASHUSERS.SOBRENOME
  FIELD [[IFOWNPROP {:PREFS}]]       DASHUSERS.PREFS
  FIELD [[IFOWNPROP {:UNITREP}]]     DASHUSERS.UNITREP
  FIELD [[IFOWNPROP {:UNITREPFILT}]] DASHUSERS.UNITREPFILT
  FIELD [[IFOWNPROP {:FAULTSNOTIF}]] DASHUSERS.FAULTSNOTIF
  FIELD [[IFOWNPROP {:FAULTSFILT}]]  DASHUSERS.FAULTSFILT
  FIELD [[IFOWNPROP {:PERMS_U}]]     DASHUSERS.PERMS_U
  FIELD [[IFOWNPROP {:PHONENB}]]     DASHUSERS.PHONENB
  FIELD [[IFOWNPROP {:NOTIFSBY}]]    DASHUSERS.NOTIFSBY
  FIELD [[IFOWNPROP {:CLIENT_BIND}]] DASHUSERS.CLIENT_BIND
  FIELD [[IFOWNPROP {:RG}]]          DASHUSERS.RG
  FIELD [[IFOWNPROP {:COMMENTS}]]    DASHUSERS.COMMENTS
  FIELD [[IFOWNPROP {:PICTURE}]]     DASHUSERS.PICTURE
  FIELD [[IFOWNPROP {:CITY_ID}]]     DASHUSERS.CITY_ID
*/
export async function w_updateUser (qPars: {
  EMAIL: string,
  LAST_ACCESS?: string,
  PASSWORD?: string,
  NOME?: string,
  SOBRENOME?: string,
  PREFS?: string,
  UNITREP?: string,
  UNITREPFILT?: string,
  FAULTSNOTIF?: string,
  FAULTSFILT?: string,
  PERMS_U?: string,
  PHONENB?: string,
  NOTIFSBY?: string,
  CLIENT_BIND?: number,
  RG?: string,
  COMMENTS?: string,
  PICTURE?: string,
  CITY_ID?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.LAST_ACCESS !== undefined) { fields.push('LAST_ACCESS = :LAST_ACCESS') }
  if (qPars.PASSWORD !== undefined) { fields.push('PASSWORD = :PASSWORD') }
  if (qPars.NOME !== undefined) { fields.push('NOME = :NOME') }
  if (qPars.SOBRENOME !== undefined) { fields.push('SOBRENOME = :SOBRENOME') }
  if (qPars.PREFS !== undefined) { fields.push('PREFS = :PREFS') }
  if (qPars.UNITREP !== undefined) { fields.push('UNITREP = :UNITREP') }
  if (qPars.UNITREPFILT !== undefined) { fields.push('UNITREPFILT = :UNITREPFILT') }
  if (qPars.FAULTSNOTIF !== undefined) { fields.push('FAULTSNOTIF = :FAULTSNOTIF') }
  if (qPars.FAULTSFILT !== undefined) { fields.push('FAULTSFILT = :FAULTSFILT') }
  if (qPars.PERMS_U !== undefined) { fields.push('PERMS_U = :PERMS_U') }
  if (qPars.PHONENB !== undefined) { fields.push('PHONENB = :PHONENB') }
  if (qPars.NOTIFSBY !== undefined) { fields.push('NOTIFSBY = :NOTIFSBY') }
  if (qPars.CLIENT_BIND !== undefined) { fields.push('CLIENT_BIND = :CLIENT_BIND') }
  if (qPars.RG !== undefined) { fields.push('RG = :RG') }
  if (qPars.COMMENTS !== undefined) { fields.push('COMMENTS = :COMMENTS') }
  if (qPars.PICTURE !== undefined) { fields.push('PICTURE = :PICTURE') }
  if (qPars.CITY_ID !== undefined) { fields.push('CITY_ID = :CITY_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DASHUSERS SET ${fields.join(', ')} WHERE EMAIL = :EMAIL`

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeCity = UPDATE
  PARAM CITY_ID: {DASHUSERS.CITY_ID}
  FROM DASHUSERS
  CONSTFIELD CITY_ID = NULL
  WHERE {DASHUSERS.CITY_ID} = {:CITY_ID}
*/
export async function w_removeCity (qPars: { CITY_ID: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE DASHUSERS SET CITY_ID = NULL WHERE DASHUSERS.CITY_ID = :CITY_ID`

  if (operationLogData) {
    await saveOperationLog('DASHUSERS', sentence, qPars, operationLogData);
    dbLogger('DASHUSERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUsersRequiringUnitsReport = SELECT LIST
  FROM DASHUSERS
  INNER JOIN (USERSCLIENTS.USER_ID = DASHUSERS.EMAIL)
  INNER JOIN (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)

  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.UNITREP
  SELECT DASHUSERS.UNITREPFILT
  SELECT USERSCLIENTS.CLIENT_ID
  SELECT CLIENTS.NAME AS CLIENT_NAME

  WHERE {CLIENTS.ENABLED} = '1'
  WHERE ({DASHUSERS.UNITREP} IS NULL OR {DASHUSERS.UNITREP} <> 'NONE')
*/
export function getUsersRequiringUnitsReport () {
  let sentence = `
    SELECT
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME,
      DASHUSERS.EMAIL,
      DASHUSERS.UNITREP,
      DASHUSERS.UNITREPFILT,
      USERSCLIENTS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      DASHUSERS
      INNER JOIN USERSCLIENTS ON (USERSCLIENTS.USER_ID = DASHUSERS.EMAIL)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLIENTS.ENABLED = '1'`)
  conditions.push(`DASHUSERS.IS_ACTIVE = '1'`)
  conditions.push(`(DASHUSERS.UNITREP IS NULL OR DASHUSERS.UNITREP <> 'NONE')`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    NOME: string
    SOBRENOME: string
    EMAIL: string
    UNITREP: string
    UNITREPFILT: string
    CLIENT_ID: number
    CLIENT_NAME: string
  }>(sentence)
}

/* @IFHELPER:FUNC getListOfUsers = SELECT LIST
  PARAM CLIENT_IDS?: {USERSCLIENTS.CLIENT_ID}[]
  PARAM USER?: {DASHUSERS.EMAIL}

  FROM DASHUSERS
  LEFT JOIN (DASHUSERS.CITY_ID = CITY.CITY_ID)
  LEFT JOIN (CITY.STATE_ID = STATEREGION.ID)

  SELECT DASHUSERS.EMAIL AS USER
  SELECT DASHUSERS.LAST_ACCESS
  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  SELECT DASHUSERS.PERMS_U
  SELECT DASHUSERS.CLIENT_BIND
  SELECT DASHUSERS.RG
  SELECT DASHUSERS.COMMENTS
  SELECT DASHUSERS.PICTURE
  SELECT DASHUSERS.CITY_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID
  SELECT STATEREGION.NAME AS STATE_NAME

  WHERE [[IFJS qPars.USER != null]] {DASHUSERS.EMAIL} = {:USER}
  WHERE [[IFJS qPars.CLIENT_IDS]] {DASHUSERS.EMAIL} IN (SELECT {{USERSCLIENTS.USER_ID}} FROM {{USERSCLIENTS}} WHERE {{USERSCLIENTS.CLIENT_ID}} IN ({:CLIENT_IDS}))

  ORDER BY DASHUSERS.NOME ASC
  ORDER BY DASHUSERS.EMAIL ASC
*/
export function getListOfUsers (qPars: { CLIENT_IDS?: number[], USER?: string, isAllUsers?: boolean }) {
  let sentence = `
    SELECT
      DASHUSERS.EMAIL AS USER,
      DASHUSERS.LAST_ACCESS,
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME,
      DASHUSERS.PERMS_U,
      DASHUSERS.CLIENT_BIND,
      DASHUSERS.RG,
      DASHUSERS.COMMENTS,
      DASHUSERS.PICTURE,
      DASHUSERS.CITY_ID,
      DASHUSERS.IS_ACTIVE,
      CITY.NAME AS CITY_NAME,
      CITY.STATE_ID,
      STATEREGION.NAME AS STATE_NAME
  `
  sentence += `
    FROM
      DASHUSERS
      LEFT JOIN CITY ON (DASHUSERS.CITY_ID = CITY.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.USER != null) { conditions.push(`DASHUSERS.EMAIL = :USER`) }
  if (qPars.CLIENT_IDS) { conditions.push(`DASHUSERS.EMAIL IN (SELECT USERSCLIENTS.USER_ID FROM USERSCLIENTS WHERE USERSCLIENTS.CLIENT_ID IN (:CLIENT_IDS))`) }
  if (!qPars.isAllUsers) { conditions.push(`DASHUSERS.IS_ACTIVE = '1'`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY DASHUSERS.NOME ASC, DASHUSERS.EMAIL ASC `

  return sqldb.query<{
    USER: string
    LAST_ACCESS: string
    NOME: string
    SOBRENOME: string
    PERMS_U: string
    CLIENT_BIND: number
    RG: string
    COMMENTS: string
    PICTURE: string
    CITY_ID: string
    IS_ACTIVE: '0'|'1'|null
    CITY_NAME: string
    STATE_ID: string
    STATE_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC boundUsers = SELECT LIST
  PARAM CLIENT_BIND: {DASHUSERS.CLIENT_BIND}
  FROM DASHUSERS
  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.CLIENT_BIND
  WHERE {DASHUSERS.CLIENT_BIND} = {:CLIENT_BIND}
*/
export function boundUsers (qPars: { CLIENT_BIND: number }) {
  let sentence = `
    SELECT
      DASHUSERS.EMAIL,
      DASHUSERS.CLIENT_BIND
  `
  sentence += `
    FROM
      DASHUSERS
  `

  sentence += ` WHERE DASHUSERS.CLIENT_BIND = :CLIENT_BIND `

  return sqldb.query<{
    EMAIL: string
    CLIENT_BIND: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUsersWithPermA = SELECT LIST
  FROM DASHUSERS

  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  SELECT DASHUSERS.PERMS_U

  WHERE {DASHUSERS.PERMS_U} LIKE '%[A]%'
*/
export function getUsersWithPermA () {
  let sentence = `
    SELECT
      DASHUSERS.EMAIL,
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME,
      DASHUSERS.PERMS_U
  `
  sentence += `
    FROM
      DASHUSERS
  `

  sentence += ` WHERE DASHUSERS.IS_ACTIVE = '1' AND DASHUSERS.PERMS_U LIKE '%[A]%' `

  return sqldb.query<{
    EMAIL: string
    NOME: string
    SOBRENOME: string
    PERMS_U: string
  }>(sentence)
}

/* @IFHELPER:FUNC getUserDataGeneric = SELECT ROW
  PARAM USER: {DASHUSERS.EMAIL}
  PARAM+ includePassword?: boolean
  PARAM+ includeFrontData?: boolean
  PARAM+ includeReportData?: boolean
  PARAM+ includeClientsCount?: boolean

  FROM DASHUSERS
  LEFT JOIN (CLIENTS.CLIENT_ID = DASHUSERS.CLIENT_BIND)
  LEFT JOIN (DASHUSERS.CITY_ID = CITY.CITY_ID)
  LEFT JOIN (CITY.STATE_ID = STATEREGION.ID)

  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  SELECT DASHUSERS.LAST_ACCESS
  SELECT DASHUSERS.PERMS_U
  SELECT DASHUSERS.CLIENT_BIND AS CLBIND_ID
  SELECT CLIENTS.ENABLED AS CLBIND_ENABLED
  SELECT CLIENTS.PERMS_C AS CLBIND_PERMS_C
  SELECT DASHUSERS.RG
  SELECT DASHUSERS.COMMENTS
  SELECT DASHUSERS.PICTURE
  SELECT DASHUSERS.CITY_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID
  SELECT STATEREGION.NAME AS STATE_NAME
  SELECT DASHUSERS.PHONENB

  SELECT [[IFJS admPars.includePassword]] DASHUSERS.PASSWORD
  SELECT [[IFJS admPars.includeFrontData]] DASHUSERS.PREFS
  SELECT [[IFJS admPars.includeFrontData]] DASHUSERS.NOTIFSBY: 'email'|'telegram'|'email and telegram'
  SELECT [[IFJS admPars.includeReportData]] DASHUSERS.FAULTSFILT
  SELECT [[IFJS admPars.includeReportData]] DASHUSERS.FAULTSNOTIF
  SELECT [[IFJS admPars.includeReportData]] DASHUSERS.UNITREP
  SELECT [[IFJS admPars.includeReportData]] DASHUSERS.UNITREPFILT
  SELECT [[IFJS admPars.includeClientsCount]] (SELECT COUNT(1) FROM {{USERSCLIENTS}} WHERE {{USERSCLIENTS.USER_ID}} = {DASHUSERS.EMAIL}) AS CLIENTS_COUNT: number

  WHERE {DASHUSERS.EMAIL} = {:USER}
*/
export function getUserDataGeneric (qPars: {
  USER: string,
  includeAllUsers?: boolean
}, admPars: {
  includePassword?: boolean,
  includeFrontData?: boolean,
  includeReportData?: boolean,
  includeClientsCount?: boolean
}) {
  let sentence = `
    SELECT
      DASHUSERS.EMAIL,
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME,
      DASHUSERS.LAST_ACCESS,
      DASHUSERS.PERMS_U,
      DASHUSERS.CLIENT_BIND AS CLBIND_ID,
      CLIENTS.ENABLED AS CLBIND_ENABLED,
      CLIENTS.PERMS_C AS CLBIND_PERMS_C,
      DASHUSERS.RG,
      DASHUSERS.COMMENTS,
      DASHUSERS.PICTURE,
      DASHUSERS.CITY_ID,
      DASHUSERS.IS_ACTIVE,
      CITY.NAME AS CITY_NAME,
      CITY.STATE_ID,
      STATEREGION.NAME AS STATE_NAME,
      DASHUSERS.PHONENB,
      DASHUSERS.TRACKER
  `
  if (admPars.includePassword) { sentence += ' ,DASHUSERS.PASSWORD ' }
  if (admPars.includeFrontData) { sentence += ' ,DASHUSERS.PREFS ' }
  if (admPars.includeFrontData) { sentence += ' ,DASHUSERS.NOTIFSBY ' }
  if (admPars.includeReportData) { sentence += ' ,DASHUSERS.FAULTSFILT ' }
  if (admPars.includeReportData) { sentence += ' ,DASHUSERS.FAULTSNOTIF ' }
  if (admPars.includeReportData) { sentence += ' ,DASHUSERS.UNITREP ' }
  if (admPars.includeReportData) { sentence += ' ,DASHUSERS.UNITREPFILT ' }
  if (admPars.includeClientsCount) { sentence += ' ,(SELECT COUNT(1) FROM USERSCLIENTS WHERE USERSCLIENTS.USER_ID = DASHUSERS.EMAIL) AS CLIENTS_COUNT ' }
  sentence += `
    FROM
      DASHUSERS
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DASHUSERS.CLIENT_BIND)
      LEFT JOIN CITY ON (DASHUSERS.CITY_ID = CITY.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `
  const conditions: string[] = []
  conditions.push(`DASHUSERS.EMAIL = :USER`) 
  if (!qPars.includeAllUsers) { conditions.push(`DASHUSERS.IS_ACTIVE = '1'`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    EMAIL: string
    NOME: string
    SOBRENOME: string
    LAST_ACCESS: string
    PERMS_U: string
    CLBIND_ID: number
    CLBIND_ENABLED: string
    CLBIND_PERMS_C: string
    RG: string
    COMMENTS: string
    PICTURE: string
    CITY_ID: string
    CITY_NAME: string
    STATE_ID: string
    STATE_NAME: string
    PHONENB: string
    PASSWORD?: string
    PREFS?: string
    NOTIFSBY?: 'email'|'telegram'|'email and telegram'
    FAULTSFILT?: string
    FAULTSNOTIF?: string
    UNITREP?: string
    UNITREPFILT?: string
    CLIENTS_COUNT?: number
    TRACKER: string
  }>(sentence, qPars)
}

export function getUserData_password(qPars: { USER: string }): Promise<{
  EMAIL: string
  NOME: string
  SOBRENOME: string
  LAST_ACCESS: string
  PERMS_U: string
  CLBIND_ID: number
  CLBIND_ENABLED: string
  CLBIND_PERMS_C: string
  PASSWORD?: string
}> {
  return getUserDataGeneric(qPars, { includePassword: true });
}

export function getUserData_front(qPars: { USER: string }): Promise<{
  EMAIL: string
  NOME: string
  SOBRENOME: string
  LAST_ACCESS: string
  PERMS_U: string
  PHONENB?: string
  NOTIFSBY?: 'email' | 'telegram' | 'email and telegram'
  PREFS?: string
  RG?: string
  COMMENTS?: string
  PICTURE?: string
  CITY_ID?: string
  CITY_NAME?: string
  STATE_ID?: string
  STATE_NAME?: string
  TRACKER?: string
}> {
  return getUserDataGeneric(qPars, { includeFrontData: true });
}

export function getUserData_basic(qPars: { USER: string, includeAllUsers?: boolean }): Promise<{
  EMAIL: string
  NOME: string
  SOBRENOME: string
  LAST_ACCESS: string
  PERMS_U: string
  CLBIND_ID: number
  CLBIND_ENABLED: string
  CLBIND_PERMS_C: string
  RG?: string
  COMMENTS?: string
  PICTURE?: string
  CITY_ID?: string
  CITY_NAME?: string
  STATE_ID?: string
  STATE_NAME?: string
  PHONENB?: string
}> {
  return getUserDataGeneric(qPars, {});
}

export function getUserData_reports(qPars: { USER: string }): Promise<{
  EMAIL: string
  NOME: string
  SOBRENOME: string
  LAST_ACCESS: string
  PERMS_U: string
  CLBIND_ID: number
  CLBIND_ENABLED: string
  CLBIND_PERMS_C: string
  FAULTSFILT?: string
  FAULTSNOTIF?: string
  UNITREP?: string
  UNITREPFILT?: string
}> {
  return getUserDataGeneric(qPars, { includeReportData: true });
}

/* @IFHELPER:FUNC getClientLessUsers = SELECT LIST
  FROM DASHUSERS
  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.PERMS_U
  LEFT JOIN (USERSCLIENTS.USER_ID = DASHUSERS.EMAIL)
  WHERE {USERSCLIENTS.USER_ID} IS NULL
*/
export function getClientLessUsers () {
  let sentence = `
    SELECT
      DASHUSERS.EMAIL,
      DASHUSERS.PERMS_U
  `
  sentence += `
    FROM
      DASHUSERS
      LEFT JOIN USERSCLIENTS ON (USERSCLIENTS.USER_ID = DASHUSERS.EMAIL)
  `

  sentence += ` WHERE USERSCLIENTS.USER_ID IS NULL `

  return sqldb.query<{
    EMAIL: string
    PERMS_U: string
  }>(sentence)
}

export function getPrefsUser (qPars: { EMAIL: string }){
  let sentence = `
  SELECT
    DASHUSERS.PREFS
  FROM
    DASHUSERS
  WHERE DASHUSERS.EMAIL = :EMAIL;
  `
  return sqldb.query<{
    PREFS: string
  }>(sentence, qPars)
}
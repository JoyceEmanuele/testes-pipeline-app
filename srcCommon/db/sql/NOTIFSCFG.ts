import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {NOTIFSCFG.CLIENT_ID}
  FROM NOTIFSCFG
  WHERE {NOTIFSCFG.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  NOTIFDESTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM NOTIFSCFG WHERE NOTIFSCFG.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM id: {NOTIFSCFG.NOTIF_ID}
  PARAM clientId?: {NOTIFSCFG.CLIENT_ID}
  FROM NOTIFSCFG
  WHERE {NOTIFSCFG.NOTIF_ID} = {:id}
  WHERE [[IFOWNPROP {:clientId}]] {NOTIFSCFG.CLIENT_ID} = {:clientId}
*/
export async function w_deleteRow (qPars: { id: number, clientId?: number }, delChecks: {
  NOTIFDESTS: true
}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  conditions.push(`NOTIFSCFG.NOTIF_ID = :id`)
  if (qPars.clientId !== undefined) { conditions.push(`NOTIFSCFG.CLIENT_ID = :clientId`) }
  const where = conditions.join(' AND ');

  const sentence = `DELETE FROM NOTIFSCFG WHERE ${where}`;

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUser = DELETE
  PARAM CREATED_BY: {NOTIFSCFG.CREATED_BY}
  FROM NOTIFSCFG
  WHERE {NOTIFSCFG.CREATED_BY} = {:CREATED_BY}
*/
export async function w_deleteFromUserNoDests (qPars: {}, delChecks: {
  NOTIFDESTS: true
}, operationLogData: OperationLogData) {

  let sentence = `
    DELETE NOTIFSCFG
    FROM NOTIFSCFG
    LEFT JOIN NOTIFDESTS
      ON NOTIFSCFG.NOTIF_ID = NOTIFDESTS.NOTIF_ID
    WHERE NOTIFDESTS.NOTIF_ID IS NULL  
  `;

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM NOTIFSCFG

  FIELD NOTIFSCFG.NAME
  FIELD NOTIFSCFG.DAT_CREATE
  FIELD NOTIFSCFG.CLIENT_ID
  FIELD NOTIFSCFG.FILT_DEVS
  FIELD NOTIFSCFG.COND_VAR
  FIELD NOTIFSCFG.COND_OP
  FIELD NOTIFSCFG.COND_VAL
  FIELD NOTIFSCFG.COND_SECONDARY_VAL
  FIELD NOTIFSCFG.CREATED_BY
  FIELD NOTIFSCFG.COND_PARS
*/
export async function w_insert (qPars: {
  NAME: string,
  DAT_CREATE: string,
  CLIENT_ID: number,
  FILT_DEVS: string,
  COND_VAR: string,
  COND_OP: string,
  COND_VAL: string,
  COND_SECONDARY_VAL: string,
  CREATED_BY: string,
  COND_PARS?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('NAME')
  fields.push('DAT_CREATE')
  fields.push('CLIENT_ID')
  fields.push('FILT_DEVS')
  fields.push('COND_VAR')
  fields.push('COND_OP')
  fields.push('COND_VAL')
  fields.push('COND_SECONDARY_VAL')
  fields.push('CREATED_BY')
  if (qPars.COND_PARS !== undefined) { fields.push('COND_PARS') }

  const sentence = `INSERT INTO NOTIFSCFG (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM NOTIF_ID: {NOTIFSCFG.NOTIF_ID}
  PARAM CLIENT_ID?: {NOTIFSCFG.CLIENT_ID}

  FROM NOTIFSCFG

  FIELD NOTIFSCFG.NAME
  FIELD NOTIFSCFG.FILT_DEVS
  FIELD NOTIFSCFG.COND_VAR
  FIELD NOTIFSCFG.COND_OP
  FIELD NOTIFSCFG.COND_VAL
  FIELD NOTIFSCFG.COND_SECONDARY_VAL
  FIELD [[IFOWNPROP {:NOTIF_DATA}]] NOTIFSCFG.NOTIF_DATA
  FIELD [[IFOWNPROP {:COND_PARS}]] NOTIFSCFG.COND_PARS

  WHERE {NOTIFSCFG.NOTIF_ID} = {:NOTIF_ID}
  WHERE [[IFJS {:CLIENT_ID}]] {NOTIFSCFG.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_update (qPars: {
  NOTIF_ID: number,
  CLIENT_ID?: number,
  NAME: string,
  FILT_DEVS: string,
  COND_VAR: string,
  COND_OP: string,
  COND_VAL?: string,
  COND_SECONDARY_VAL?: string,
  NOTIF_DATA?: string,
  COND_PARS?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push("NAME = :NAME")
  fields.push("FILT_DEVS = :FILT_DEVS")
  fields.push("COND_VAR = :COND_VAR")
  fields.push("COND_OP = :COND_OP")
  if (qPars.COND_VAL !== undefined) { fields.push("COND_VAL = :COND_VAL") }
  if (qPars.COND_SECONDARY_VAL !== undefined) { fields.push("COND_SECONDARY_VAL = :COND_SECONDARY_VAL") }
  if (qPars.NOTIF_DATA !== undefined) { fields.push('NOTIF_DATA = :NOTIF_DATA') }
  if (qPars.COND_PARS !== undefined) { fields.push('COND_PARS = :COND_PARS') }

  let where = "NOTIFSCFG.NOTIF_ID = :NOTIF_ID";
  if (qPars.CLIENT_ID) { where += ` AND NOTIFSCFG.CLIENT_ID = :CLIENT_ID ` };

  const sentence = `UPDATE NOTIFSCFG SET ${fields.join(', ')} WHERE ${where}`

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateNotifData = UPDATE
  FROM NOTIFSCFG
  FIELD NOTIFSCFG.NOTIF_DATA
*/
export async function w_updateNotifData (qPars: { NOTIF_DATA: string, NOTIF_ID: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE NOTIFSCFG SET NOTIF_DATA = :NOTIF_DATA WHERE NOTIF_ID = :NOTIF_ID`

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateNotifCondPars = UPDATE
  FROM NOTIFSCFG
  FIELD NOTIFSCFG.COND_PARS
*/
export async function w_updateNotifCondPars (qPars: { NOTIF_ID: number, COND_PARS: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE NOTIFSCFG SET COND_PARS = :COND_PARS WHERE NOTIF_ID = :NOTIF_ID`

  if (operationLogData) {
    await saveOperationLog('NOTIFSCFG', sentence, qPars, operationLogData);
    dbLogger('NOTIFSCFG', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList1 = SELECT LIST
  PARAM COND_VAR?: {NOTIFSCFG.COND_VAR}[]
  PARAM COND_OP?: {NOTIFSCFG.COND_OP}[]
  PARAM clientIds?: {NOTIFSCFG.CLIENT_ID}[]
  PARAM createdBy?: {NOTIFSCFG.CREATED_BY}

  FROM NOTIFSCFG

  SELECT NOTIFSCFG.NOTIF_ID
  SELECT NOTIFSCFG.NAME
  SELECT NOTIFSCFG.DAT_CREATE
  SELECT NOTIFSCFG.CLIENT_ID
  SELECT NOTIFSCFG.FILT_DEVS
  SELECT NOTIFSCFG.COND_VAR
  SELECT NOTIFSCFG.COND_OP
  SELECT NOTIFSCFG.COND_VAL
  SELECT NOTIFSCFG.COND_SECONDARY_VAL
  SELECT NOTIFSCFG.CREATED_BY
  SELECT NOTIFSCFG.NOTIF_MSG
  SELECT NOTIFSCFG.NOTIF_DATA

  WHERE [[IFJS qPars.COND_VAR]] {NOTIFSCFG.COND_VAR} = {:COND_VAR}
  WHERE [[IFJS qPars.clientIds]] {NOTIFSCFG.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFOWNPROP {:createdBy}]] {NOTIFSCFG.CREATED_BY} = {:createdBy}
*/
export function getList1 (qPars: { 
  condVars?: string[], 
  condOps?: string[], 
  clientIds?: number[],
  typeIds?: string[],
  subtypeIds?: string[],
  createdBy?: string
 }) {
  let sentence = `
    SELECT
      NOTIFSCFG.NOTIF_ID,
      NOTIFSCFG.NAME,
      NOTIFSCFG.DAT_CREATE,
      NOTIFSCFG.CLIENT_ID,
      NOTIFSCFG.FILT_DEVS,
      NOTIFSCFG.COND_VAR,
      NOTIFSCFG.COND_OP,
      NOTIFSCFG.COND_VAL,
      NOTIFSCFG.COND_SECONDARY_VAL,
      NOTIFSCFG.COND_PARS,
      NOTIFSCFG.CREATED_BY,
      NOTIFSCFG.NOTIF_MSG,
      NOTIFSCFG.NOTIF_DATA,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      NOTIFSCFG 
      LEFT JOIN CLIENTS ON (NOTIFSCFG.CLIENT_ID = CLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  if (qPars.condVars) { conditions.push(`NOTIFSCFG.COND_VAR IN (:condVars)`) }
  if (qPars.condOps) { conditions.push(`NOTIFSCFG.COND_OP IN (:condOps)`) }
  if (qPars.clientIds) { conditions.push(`NOTIFSCFG.CLIENT_ID IN (:clientIds)`) }
  if (qPars.typeIds) { conditions.push(`NOTIFSCFG.COND_VAR IN (:typeIds)`) }
  if (qPars.subtypeIds) { conditions.push(`NOTIFSCFG.COND_VAR IN (:subtypeIds)`) }
  if (qPars.createdBy !== undefined) { conditions.push(`NOTIFSCFG.CREATED_BY = :createdBy`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    NOTIF_ID: number
    NAME: string
    DAT_CREATE: string
    CLIENT_ID: number
    FILT_DEVS: string
    COND_VAR: string
    COND_OP: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    COND_PARS: string
    CREATED_BY: string
    NOTIF_MSG: string
    NOTIF_DATA: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getNotifData = SELECT ROW
  PARAM notifId: {NOTIFSCFG.NOTIF_ID}
  PARAM clientId?: {NOTIFSCFG.CLIENT_ID}

  FROM NOTIFSCFG

  SELECT NOTIFSCFG.NOTIF_ID
  SELECT NOTIFSCFG.NAME
  SELECT NOTIFSCFG.FILT_DEVS
  SELECT NOTIFSCFG.COND_VAR
  SELECT NOTIFSCFG.COND_OP
  SELECT NOTIFSCFG.COND_VAL
  SELECT NOTIFSCFG.COND_SECONDARY_VAL
  SELECT NOTIFSCFG.CREATED_BY
  SELECT NOTIFSCFG.NOTIF_MSG
  SELECT NOTIFSCFG.CLIENT_ID
  SELECT NOTIFSCFG.COND_PARS

  WHERE {NOTIFSCFG.NOTIF_ID} = {:notifId}
  WHERE [[IFOWNPROP {:clientId}]] {NOTIFSCFG.CLIENT_ID} = {:clientId}
*/
export function getNotifData (qPars: { notifId: number, clientId?: number }) {
  let sentence = `
    SELECT
      NOTIFSCFG.NOTIF_ID,
      NOTIFSCFG.NAME,
      NOTIFSCFG.FILT_DEVS,
      NOTIFSCFG.COND_VAR,
      NOTIFSCFG.COND_OP,
      NOTIFSCFG.COND_VAL,
      NOTIFSCFG.COND_SECONDARY_VAL,
      NOTIFSCFG.CREATED_BY,
      NOTIFSCFG.NOTIF_MSG,
      NOTIFSCFG.CLIENT_ID,
      NOTIFSCFG.COND_PARS
  `
  sentence += `
    FROM
      NOTIFSCFG
  `

  const conditions: string[] = []
  conditions.push(`NOTIFSCFG.NOTIF_ID = :notifId`)
  if (qPars.clientId !== undefined) { conditions.push(`NOTIFSCFG.CLIENT_ID = :clientId`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    NOTIF_ID: number
    NAME: string
    FILT_DEVS: string
    COND_VAR: string
    COND_OP: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    CREATED_BY: string
    NOTIF_MSG: string
    CLIENT_ID: number
    COND_PARS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC select1 = SELECT ROW
  PARAM notifId: {NOTIFSCFG.NOTIF_ID}

  FROM NOTIFSCFG
  LEFT JOIN (NOTIFSCFG.CLIENT_ID = CLIENTS.CLIENT_ID)

  SELECT NOTIFSCFG.COND_VAR
  SELECT NOTIFSCFG.COND_OP
  SELECT NOTIFSCFG.COND_VAL
  SELECT NOTIFSCFG.COND_SECONDARY_VAL
  SELECT NOTIFSCFG.NOTIF_MSG
  SELECT NOTIFSCFG.CREATED_BY
  SELECT NOTIFSCFG.NOTIF_DATA
  SELECT NOTIFSCFG.CLIENT_ID
  SELECT NOTIFSCFG.NAME AS NOTIF_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME

  WHERE {NOTIFSCFG.NOTIF_ID} = {:notifId}
*/
export function select1 (qPars: { notifId: number }) {
  let sentence = `
    SELECT
      NOTIFSCFG.COND_VAR,
      NOTIFSCFG.COND_OP,
      NOTIFSCFG.COND_VAL,
      NOTIFSCFG.COND_SECONDARY_VAL,
      NOTIFSCFG.NOTIF_MSG,
      NOTIFSCFG.CREATED_BY,
      NOTIFSCFG.NOTIF_DATA,
      NOTIFSCFG.CLIENT_ID,
      NOTIFSCFG.NAME AS NOTIF_NAME,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      NOTIFSCFG
      LEFT JOIN CLIENTS ON (NOTIFSCFG.CLIENT_ID = CLIENTS.CLIENT_ID)
  `

  sentence += ` WHERE NOTIFSCFG.NOTIF_ID = :notifId `

  return sqldb.querySingle<{
    COND_VAR: string
    COND_OP: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    NOTIF_MSG: string
    CREATED_BY: string
    NOTIF_DATA: string
    CLIENT_ID: number
    NOTIF_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteDests = DELETE
  PARAM NOTIF_ID: {NOTIFDESTS.NOTIF_ID}
  FROM NOTIFDESTS
  WHERE {NOTIFDESTS.NOTIF_ID} = {:NOTIF_ID}
*/
export async function w_deleteDests (qPars: { NOTIF_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM NOTIFDESTS WHERE NOTIFDESTS.NOTIF_ID = :NOTIF_ID`;

  if (operationLogData) {
    await saveOperationLog('NOTIFDESTS', sentence, qPars, operationLogData);
    dbLogger('NOTIFDESTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUser = DELETE
  PARAM USER_ID: {NOTIFDESTS.USER_ID}
  FROM NOTIFDESTS
  WHERE {NOTIFDESTS.USER_ID} = {:USER_ID}
*/
export async function w_deleteFromUser (qPars: { USER_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM NOTIFDESTS WHERE NOTIFDESTS.USER_ID = :USER_ID`;

  if (operationLogData) {
    await saveOperationLog('NOTIFDESTS', sentence, qPars, operationLogData);
    dbLogger('NOTIFDESTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {NOTIFSCFG.CLIENT_ID}
  FROM NOTIFDESTS
  INNER JOIN (NOTIFSCFG.NOTIF_ID = NOTIFDESTS.NOTIF_ID)
  WHERE {NOTIFSCFG.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN NOTIFSCFG ON (NOTIFSCFG.NOTIF_ID = NOTIFDESTS.NOTIF_ID)";

  const sentence = `DELETE NOTIFDESTS FROM NOTIFDESTS ${join} WHERE NOTIFSCFG.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('NOTIFDESTS', sentence, qPars, operationLogData);
    dbLogger('NOTIFDESTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM NOTIFDESTS
  FIELD NOTIFDESTS.NOTIF_ID
  FIELD NOTIFDESTS.USER_ID
*/
export async function w_insert (qPars: { NOTIF_ID: number, USER_ID: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('NOTIF_ID')
  fields.push('USER_ID')

  const sentence = `INSERT INTO NOTIFDESTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('NOTIFDESTS', sentence, qPars, operationLogData);
    dbLogger('NOTIFDESTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDests = SELECT LIST
  PARAM NOTIF_ID: {NOTIFDESTS.NOTIF_ID}
  FROM NOTIFDESTS
  INNER JOIN (DASHUSERS.EMAIL = NOTIFDESTS.USER_ID)
  SELECT NOTIFDESTS.NOTIF_ID
  SELECT NOTIFDESTS.USER_ID
  SELECT DASHUSERS.PHONENB
  SELECT DASHUSERS.NOTIFSBY
  WHERE {NOTIFDESTS.NOTIF_ID} = {:NOTIF_ID}
*/
export function getDests (qPars: { NOTIF_ID: number, destinataryIds?: string[] }) {
  let sentence = `
    SELECT
      NOTIFDESTS.NOTIF_ID,
      NOTIFDESTS.USER_ID,
      DASHUSERS.PHONENB,
      DASHUSERS.NOTIFSBY
  `
  sentence += `
    FROM
      NOTIFDESTS
      INNER JOIN DASHUSERS ON (DASHUSERS.EMAIL = NOTIFDESTS.USER_ID AND DASHUSERS.IS_ACTIVE = '1')
  `

  const conditions: string[] = []
  if (qPars.destinataryIds?.length > 0) { conditions.push(`NOTIFDESTS.USER_ID IN (:destinataryIds)`) }
  conditions.push(`NOTIFDESTS.NOTIF_ID = :NOTIF_ID`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    NOTIF_ID: number
    USER_ID: string
    PHONENB: string
    NOTIFSBY: string
  }>(sentence, qPars)
}

export function getPrefsUser (qPars: { NOTIF_ID: number }){
  let sentence = `
  SELECT
    NOTIFDESTS.NOTIF_ID,
    NOTIFDESTS.USER_ID,
    DASHUSERS.PREFS
  FROM
    NOTIFDESTS
    INNER JOIN DASHUSERS ON (DASHUSERS.EMAIL = NOTIFDESTS.USER_ID AND DASHUSERS.IS_ACTIVE = '1')
  WHERE NOTIFDESTS.NOTIF_ID = :NOTIF_ID;
  `
  return sqldb.query<{
    NOTIF_ID: number
    USER_ID: string
    PREFS: string
  }>(sentence, qPars)
}
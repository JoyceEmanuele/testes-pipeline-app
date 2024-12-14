// THIS TABLE IS RELATED TO UNIT'S RESPONSIBLE ON FRONT END ('Resonsáveis da Unidade')

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC setUnitSupervisors = INSERT
  FROM UNITSUPERVISORS

  FIELD UNITSUPERVISORS.USER_ID
  FIELD UNITSUPERVISORS.UNIT_ID
*/
export async function w_setUnitSupervisors (qPars: { USER_ID: string, UNIT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('USER_ID')
  fields.push('UNIT_ID')

  const sentence = `INSERT INTO UNITSUPERVISORS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('UNITSUPERVISORS', sentence, qPars, operationLogData);
    dbLogger('UNITSUPERVISORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitSupervisors = SELECT LIST
  PARAM UNIT_IDS: {UNITSUPERVISORS.UNIT_ID}[]
  PARAM CLIENT_IDS?: {CLUNITS.CLIENT_ID}[]
  FROM UNITSUPERVISORS
  INNER JOIN (DASHUSERS.EMAIL = UNITSUPERVISORS.USER_ID)
  INNER JOIN (CLUNITS.UNIT_ID = UNITSUPERVISORS.UNIT_ID)
  SELECT UNITSUPERVISORS.UNIT_ID
  SELECT UNITSUPERVISORS.USER_ID
  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  WHERE {UNITSUPERVISORS.UNIT_ID} IN ({:UNIT_IDS})
  WHERE [[IFOWNPROP {:CLIENT_IDS}]] {CLUNITS.CLIENT_ID} IN ({:CLIENT_IDS})
*/
export function getUnitSupervisors (qPars: { UNIT_IDS: number[], CLIENT_IDS?: number[] }) {
  let sentence = `
    SELECT
      UNITSUPERVISORS.UNIT_ID,
      UNITSUPERVISORS.USER_ID,
      DASHUSERS.EMAIL,
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME
  `
  sentence += `
    FROM
      UNITSUPERVISORS
      INNER JOIN DASHUSERS ON (DASHUSERS.EMAIL = UNITSUPERVISORS.USER_ID AND DASHUSERS.IS_ACTIVE = '1')
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = UNITSUPERVISORS.UNIT_ID)
  `

  const conditions: string[] = []
  conditions.push(`UNITSUPERVISORS.UNIT_ID IN (:UNIT_IDS)`)
  if (qPars.CLIENT_IDS !== undefined) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    UNIT_ID: number
    USER_ID: string
    EMAIL: string
    NOME: string
    SOBRENOME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getSupervisorUnits = SELECT LIST
  PARAM USER_ID: {UNITSUPERVISORS.USER_ID}
  PARAM UNIT_IDS: {UNITSUPERVISORS.UNIT_ID}[]
  PARAM CLIENT_IDS: {CLUNITS.CLIENT_ID}[]
  FROM UNITSUPERVISORS
  SELECT UNITSUPERVISORS.UNIT_ID
  WHERE {UNITSUPERVISORS.USER_ID} = {:USER_ID}
*/
export function getSupervisorUnits (qPars: { USER_ID: string, CLIENT_IDS?: number[], UNIT_IDS?: number[] }) {
  let sentence = `
    SELECT
      UNITSUPERVISORS.UNIT_ID,
      CLUNITS.CLIENT_ID
  `
  sentence += `
    FROM
      UNITSUPERVISORS
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = UNITSUPERVISORS.UNIT_ID)
  `

  const conditions: string[] = []
  conditions.push(`UNITSUPERVISORS.USER_ID = :USER_ID`)
  if (qPars.UNIT_IDS !== undefined) { conditions.push(`UNITSUPERVISORS.UNIT_ID IN (:UNIT_IDS)`) }
  if (qPars.CLIENT_IDS !== undefined) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    UNIT_ID: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC clearUnitSupervisors = DELETE
  PARAM UNIT_ID: {UNITSUPERVISORS.UNIT_ID}
  FROM UNITSUPERVISORS
  WHERE {UNITSUPERVISORS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_clearUnitSupervisors (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITSUPERVISORS WHERE UNITSUPERVISORS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITSUPERVISORS', sentence, qPars, operationLogData);
    dbLogger('UNITSUPERVISORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM UNITSUPERVISORS
  INNER JOIN (CLUNITS.UNIT_ID = UNITSUPERVISORS.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = UNITSUPERVISORS.UNIT_ID)";

  const sentence = `DELETE UNITSUPERVISORS FROM UNITSUPERVISORS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITSUPERVISORS', sentence, qPars, operationLogData);
    dbLogger('UNITSUPERVISORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUser = DELETE
  PARAM USER_ID: {UNITSUPERVISORS.USER_ID}
  FROM UNITSUPERVISORS
  WHERE {UNITSUPERVISORS.USER_ID} = {:USER_ID}
*/
export async function w_deleteFromUser (qPars: { USER_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITSUPERVISORS WHERE UNITSUPERVISORS.USER_ID = :USER_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITSUPERVISORS', sentence, qPars, operationLogData);
    dbLogger('UNITSUPERVISORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update (qPars: { USER_ID: string, UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE UNITSUPERVISORS u SET u.USER_ID = :USER_ID WHERE u.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITSUPERVISORS', sentence, qPars, operationLogData);
    dbLogger('UNITSUPERVISORS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
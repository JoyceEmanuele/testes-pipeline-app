import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_insert (qPars: { NAME: string, UNIT_ID: number, CLIENT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('NAME')
  fields.push('UNIT_ID')
  fields.push('CLIENT_ID')

  const sentence = `INSERT INTO ASSOCIATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    dbLogger('ASSOCIATIONS', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOCIATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update (qPars: { ID: number, NAME?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ASSOCIATIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    dbLogger('ASSOCIATIONS', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOCIATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ASSOCIATIONS WHERE ASSOCIATIONS.ID = :ID`;

  if (operationLogData) {
    dbLogger('ASSOCIATIONS', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOCIATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ASSOCIATIONS WHERE ASSOCIATIONS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    dbLogger('ASSOCIATIONS', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOCIATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ASSOCIATIONS WHERE ASSOCIATIONS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    dbLogger('ASSOCIATIONS', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOCIATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getAssocsList (qPars: {
  UNIT_ID?: number,
  CLIENT_ID?: number,
}) {
  let sentence = `
    SELECT
      ASSOCIATIONS.UNIT_ID,
      ASSOCIATIONS.CLIENT_ID,
      ASSOCIATIONS.ID AS ASSOC_ID,
      ASSOCIATIONS.NAME AS ASSOC_NAME
  `
  sentence += `
    FROM
      ASSOCIATIONS
  `

  const conditions: string[] = []
  if (qPars.UNIT_ID != null) { conditions.push(`ASSOCIATIONS.UNIT_ID = :UNIT_ID`) }
  if (qPars.CLIENT_ID != null) { conditions.push(`ASSOCIATIONS.CLIENT_ID = :CLIENT_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    CLIENT_ID: number
    ASSOC_ID: number
    ASSOC_NAME: string
  }>(sentence, qPars)
}

export function getBasicInfo(qPars: {
  ASSOC_ID: number
}) {
  const  sentence = `
    SELECT
      ASSOCIATIONS.UNIT_ID,
      ASSOCIATIONS.CLIENT_ID,
      ASSOCIATIONS.ID AS ASSOC_ID,
      ASSOCIATIONS.NAME AS ASSOC_NAME
    FROM
      ASSOCIATIONS
    WHERE ASSOCIATIONS.ID = :ASSOC_ID

  `

  return sqldb.querySingle<{
    UNIT_ID: number
    CLIENT_ID: number
    ASSOC_ID: number
    ASSOC_NAME: string
  }>(sentence, qPars)
}

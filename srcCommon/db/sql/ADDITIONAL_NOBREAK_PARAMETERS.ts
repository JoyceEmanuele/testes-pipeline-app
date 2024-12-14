import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_insert(qPars: { NOBREAK_ID: number, NAME: string, VALUE: string }, operationLogData: OperationLogData) {

  const fields: string[] = []
  fields.push('NOBREAK_ID')
  fields.push('NAME')
  fields.push('VALUE')

  const sentence = `INSERT INTO ADDITIONAL_NOBREAK_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getBasicInfo(qPars: { NOBREAK_ID: number, COLUMN_NAME: string }) {
  let sentence = `
    SELECT
      ADDITIONAL_NOBREAK_PARAMETERS.ID,
      ADDITIONAL_NOBREAK_PARAMETERS.NAME AS COLUMN_NAME,
      ADDITIONAL_NOBREAK_PARAMETERS.VALUE AS COLUMN_VALUE
  `
  sentence += `
    FROM
      ADDITIONAL_NOBREAK_PARAMETERS
  `

  sentence += ` WHERE ADDITIONAL_NOBREAK_PARAMETERS.NOBREAK_ID = :NOBREAK_ID AND LOWER(ADDITIONAL_NOBREAK_PARAMETERS.NAME) = LOWER(:COLUMN_NAME)`
  return sqldb.querySingle<{
    ID: number
    COLUMN_NAME: string
    COLUMN_VALUE: string
  }>(sentence, qPars)
}

export async function w_deleteNobreakParameters(qPars: { ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE FROM ADDITIONAL_NOBREAK_PARAMETERS WHERE ADDITIONAL_NOBREAK_PARAMETERS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update(qPars: {
  ID: number,
  COLUMN_VALUE?: string,
  
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.COLUMN_VALUE !== undefined) { fields.push('VALUE = :COLUMN_VALUE') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ADDITIONAL_NOBREAK_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getAllParametersByUnit(qPars: { UNIT_IDS: number[] }) {
  let sentence = `
    SELECT
      ADDITIONAL_NOBREAK_PARAMETERS.ID,
      ADDITIONAL_NOBREAK_PARAMETERS.NAME AS COLUMN_NAME
  `
  sentence += `
    FROM
      ADDITIONAL_NOBREAK_PARAMETERS
      INNER JOIN NOBREAKS ON (NOBREAKS.ID = ADDITIONAL_NOBREAK_PARAMETERS.NOBREAK_ID)
      INNER JOIN ASSETS ON (ASSETS.ID = NOBREAKS.ASSET_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  sentence += ` WHERE CLUNITS.UNIT_ID IN (:UNIT_IDS)`
  sentence += ` GROUP BY ADDITIONAL_NOBREAK_PARAMETERS.NAME`
  return sqldb.query<{
    ID: number
    COLUMN_NAME: string
  }>(sentence, qPars)
}

export function getAllParametersByNobreak(qPars: { NOBREAK_ID: number }) {
  let sentence = `
    SELECT
      ADDITIONAL_NOBREAK_PARAMETERS.ID,
      ADDITIONAL_NOBREAK_PARAMETERS.NAME AS COLUMN_NAME,
      ADDITIONAL_NOBREAK_PARAMETERS.VALUE AS COLUMN_VALUE
  `
  sentence += `
    FROM
      ADDITIONAL_NOBREAK_PARAMETERS
      INNER JOIN NOBREAKS ON (NOBREAKS.ID = ADDITIONAL_NOBREAK_PARAMETERS.NOBREAK_ID)
  `

  sentence += ` WHERE NOBREAKS.ID = :NOBREAK_ID`
  return sqldb.query<{
    ID: number
    COLUMN_NAME: string
    COLUMN_VALUE: string
  }>(sentence, qPars)
}

export async function w_deleteByNobreakId(qPars: { NOBREAK_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE FROM ADDITIONAL_NOBREAK_PARAMETERS WHERE ADDITIONAL_NOBREAK_PARAMETERS.NOBREAK_ID = :NOBREAK_ID`;

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `INNER JOIN NOBREAKS ON (NOBREAKS.ID = ADDITIONAL_NOBREAK_PARAMETERS.NOBREAK_ID)
                INNER JOIN ASSETS ON (ASSETS.ID = NOBREAKS.ASSET_ID)
                INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)`;

  const sentence = `DELETE ADDITIONAL_NOBREAK_PARAMETERS FROM ADDITIONAL_NOBREAK_PARAMETERS ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    dbLogger('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData)
    await saveOperationLog('ADDITIONAL_NOBREAK_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

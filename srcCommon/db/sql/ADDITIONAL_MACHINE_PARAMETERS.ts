import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_insert(qPars: { MACHINE_ID: number, NAME: string, VALUE: string }, operationLogData: OperationLogData) {

  const fields: string[] = []
  fields.push('MACHINE_ID')
  fields.push('NAME')
  fields.push('VALUE')

  const sentence = `INSERT INTO ADDITIONAL_MACHINE_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getBasicInfo(qPars: { MACHINE_ID: number, COLUMN_NAME: string }) {
  let sentence = `
    SELECT
      ADDITIONAL_MACHINE_PARAMETERS.ID,
      ADDITIONAL_MACHINE_PARAMETERS.NAME AS COLUMN_NAME,
      ADDITIONAL_MACHINE_PARAMETERS.VALUE AS COLUMN_VALUE
  `
  sentence += `
    FROM
      ADDITIONAL_MACHINE_PARAMETERS
  `

  sentence += ` WHERE ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID = :MACHINE_ID AND LOWER(ADDITIONAL_MACHINE_PARAMETERS.NAME) = LOWER(:COLUMN_NAME)`
  return sqldb.querySingle<{
    ID: number
    COLUMN_NAME: string
    COLUMN_VALUE: string
  }>(sentence, qPars)
}

export async function w_deleteMachineParameters(qPars: { ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE FROM ADDITIONAL_MACHINE_PARAMETERS WHERE ADDITIONAL_MACHINE_PARAMETERS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
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

  const sentence = `UPDATE ADDITIONAL_MACHINE_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `INNER JOIN MACHINES ON (MACHINES.ID = ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID)
                INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE ADDITIONAL_MACHINE_PARAMETERS FROM ADDITIONAL_MACHINE_PARAMETERS ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData)
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromCLient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = `INNER JOIN MACHINES ON (MACHINES.ID = ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID)
                INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE ADDITIONAL_MACHINE_PARAMETERS FROM ADDITIONAL_MACHINE_PARAMETERS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData)
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachine(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE FROM ADDITIONAL_MACHINE_PARAMETERS WHERE ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('ADDITIONAL_MACHINE_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getAllParametersByUnit(qPars: { UNIT_IDS: number[] }) {
  let sentence = `
    SELECT
      ADDITIONAL_MACHINE_PARAMETERS.ID,
      ADDITIONAL_MACHINE_PARAMETERS.NAME AS COLUMN_NAME
  `
  sentence += `
    FROM
      ADDITIONAL_MACHINE_PARAMETERS
      INNER JOIN MACHINES ON (MACHINES.ID = ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
  `

  sentence += ` WHERE CLUNITS.UNIT_ID IN (:UNIT_IDS)`
  sentence += ` GROUP BY ADDITIONAL_MACHINE_PARAMETERS.NAME`
  return sqldb.query<{
    ID: number
    COLUMN_NAME: string
  }>(sentence, qPars)
}

export function getAllParametersByMachine(qPars: { MACHINE_ID: number }) {
  let sentence = `
    SELECT
      ADDITIONAL_MACHINE_PARAMETERS.ID,
      ADDITIONAL_MACHINE_PARAMETERS.NAME AS COLUMN_NAME,
      ADDITIONAL_MACHINE_PARAMETERS.VALUE AS COLUMN_VALUE
  `
  sentence += `
    FROM
      ADDITIONAL_MACHINE_PARAMETERS
      INNER JOIN MACHINES ON (MACHINES.ID = ADDITIONAL_MACHINE_PARAMETERS.MACHINE_ID)
  `

  sentence += ` WHERE MACHINES.ID = :MACHINE_ID`
  return sqldb.query<{
    ID: number
    COLUMN_NAME: string
    COLUMN_VALUE: string
  }>(sentence, qPars)
}

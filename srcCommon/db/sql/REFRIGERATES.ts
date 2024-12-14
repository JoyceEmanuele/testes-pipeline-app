import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_deleteRow (qPars: { ID?: number, ENVIRONMENT_ID?: number}, operationLogData: OperationLogData) {
  const conditions = [] as string[];
  if (qPars.ENVIRONMENT_ID != null) {conditions.push(`REFRIGERATES.ENVIRONMENT_ID = :ENVIRONMENT_ID`)}
  if (qPars.ID != null) {conditions.push(`REFRIGERATES.ID = :ID`)}
  if (conditions.length === 0) throw Error('Delete without conditions forbided!');
  const sentence = `DELETE FROM REFRIGERATES WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
    dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromMachineRow (qPars: { MACHINE_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM REFRIGERATES WHERE REFRIGERATES.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
    dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = REFRIGERATES.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
                 INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)`;

  const sentence = `DELETE REFRIGERATES FROM REFRIGERATES ${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
    dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = REFRIGERATES.ENVIRONMENT_ID)`;

  const sentence = `DELETE REFRIGERATES FROM REFRIGERATES${join} WHERE ENVIRONMENTS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
    dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM REFRIGERATES
  FIELD REFRIGERATES.ENVIRONMENT_ID
  FIELD REFRIGERATES.MACHINE_ID
*/
export async function w_insert (qPars: { ENVIRONMENT_ID: number, MACHINE_ID: number, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ENVIRONMENT_ID');
  fields.push('MACHINE_ID');

  const sentence = `INSERT INTO REFRIGERATES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
    dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM REFRIGERATES
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]] REFRIGERATES.ENVIRONMENT_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] REFRIGERATES.MACHINE_ID
  WHERE {REFRIGERATES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    ENVIRONMENT_ID?: number,
    MACHINE_ID?: string,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE REFRIGERATES SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('REFRIGERATES', sentence, qPars, operationLogData);
      dbLogger('REFRIGERATES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

export function getRefrigerateInfo (qPars: {
  MACHINE_ID: number,
}) {
  let sentence = `
    SELECT
      REFRIGERATES.ID AS REFRIGERATE_ID,
      REFRIGERATES.MACHINE_ID AS MACHINE_ID,
      REFRIGERATES.ENVIRONMENT_ID AS ENVIRONMENT_ID
  `
  sentence += `
    FROM
      REFRIGERATES 
  `

  const conditions: string[] = []
  if (qPars.MACHINE_ID != null) { conditions.push(`REFRIGERATES.MACHINE_ID = :MACHINE_ID`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    REFRIGERATE_ID: number,
    MACHINE_ID: number,
    ENVIRONMENT_ID: number
  }>(sentence, qPars)
}
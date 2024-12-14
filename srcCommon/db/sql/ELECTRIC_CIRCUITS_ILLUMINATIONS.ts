import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_ILLUMINATIONS.ID}
  FROM ELECTRIC_CIRCUITS_ILLUMINATIONS
  WHERE {ELECTRIC_CIRCUITS_ILLUMINATIONS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_ILLUMINATIONS WHERE ELECTRIC_CIRCUITS_ILLUMINATIONS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteElectricCircuitsIlluminationsByID (qPars: { ILLUMINATION_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_ILLUMINATIONS WHERE ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_ILLUMINATIONS.ELECTRIC_CIRCUIT_ID)`;

  const sentence = `DELETE ELECTRIC_CIRCUITS_ILLUMINATIONS FROM ELECTRIC_CIRCUITS_ILLUMINATIONS ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ELECTRIC_CIRCUITS_ILLUMINATIONS
  FIELD ELECTRIC_CIRCUITS_ILLUMINATIONS.ELECTRIC_CIRCUIT_ID
  FIELD ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID
*/
export async function w_insert (qPars: { ELECTRIC_CIRCUIT_ID: number, ILLUMINATION_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ELECTRIC_CIRCUIT_ID');
  fields.push('ILLUMINATION_ID');

  const sentence = `INSERT INTO ELECTRIC_CIRCUITS_ILLUMINATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ELECTRIC_CIRCUITS_ILLUMINATIONS
  FIELD [[IFOWNPROP {:ELECTRIC_CIRCUIT_ID}]] ELECTRIC_CIRCUITS_ILLUMINATIONS.ELECTRIC_CIRCUIT_ID
  FIELD [[IFOWNPROP {:ILLUMINATION_ID}]] ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID
  WHERE {ELECTRIC_CIRCUITS_ILLUMINATIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    ELECTRIC_CIRCUIT_ID?: number,
    ILLUMINATION_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID') }
    if (qPars.ILLUMINATION_ID !== undefined) { fields.push('ILLUMINATION_ID = :ILLUMINATION_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE ELECTRIC_CIRCUITS_ILLUMINATIONS SET ${fields.join(', ')} WHERE ID = :ID`

    if (operationLogData) {
      await saveOperationLog('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
      dbLogger('ELECTRIC_CIRCUITS_ILLUMINATIONS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
  }

  export function getInfoByIlluminationId (qPars: { ILLUMINATION_ID: number }) {
    let sentence = `
      SELECT
        ELECTRIC_CIRCUITS_ILLUMINATIONS.ELECTRIC_CIRCUIT_ID,
        ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID
      FROM ELECTRIC_CIRCUITS_ILLUMINATIONS
        WHERE ELECTRIC_CIRCUITS_ILLUMINATIONS.ILLUMINATION_ID = :ILLUMINATION_ID`
  
    return sqldb.querySingle<{
      ELECTRIC_CIRCUIT_ID: number
      ILLUMINATION_ID: number
    }>(sentence, qPars)
  }
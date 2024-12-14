import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_NOBREAKS.ID}
  FROM ELECTRIC_CIRCUITS_NOBREAKS
  WHERE {ELECTRIC_CIRCUITS_NOBREAKS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_NOBREAKS WHERE ELECTRIC_CIRCUITS_NOBREAKS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteElectricCircuitsNobreakByID (qPars: { NOBREAK_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_NOBREAKS WHERE ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID = :NOBREAK_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_NOBREAKS.ELECTRIC_CIRCUIT_ID)`;

  const sentence = `DELETE ELECTRIC_CIRCUITS_NOBREAKS FROM ELECTRIC_CIRCUITS_NOBREAKS ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ELECTRIC_CIRCUITS_NOBREAKS
  FIELD ELECTRIC_CIRCUITS_NOBREAKS.ELECTRIC_CIRCUIT_ID
  FIELD ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID
*/
export async function w_insert (qPars: { ELECTRIC_CIRCUIT_ID: number, NOBREAK_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ELECTRIC_CIRCUIT_ID');
  fields.push('NOBREAK_ID');

  const sentence = `INSERT INTO ELECTRIC_CIRCUITS_NOBREAKS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ELECTRIC_CIRCUITS_NOBREAKS
  FIELD [[IFOWNPROP {:ELECTRIC_CIRCUIT_ID}]] ELECTRIC_CIRCUITS_NOBREAKS.ELECTRIC_CIRCUIT_ID
  FIELD [[IFOWNPROP {:NOBREAK_ID}]] ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID
  WHERE {ELECTRIC_CIRCUITS_NOBREAKS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    ELECTRIC_CIRCUIT_ID?: number,
    NOBREAK_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID') }
    if (qPars.NOBREAK_ID !== undefined) { fields.push('NOBREAK_ID = :NOBREAK_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE ELECTRIC_CIRCUITS_NOBREAKS SET ${fields.join(', ')} WHERE ID = :ID`

    if (operationLogData) {
      await saveOperationLog('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
      dbLogger('ELECTRIC_CIRCUITS_NOBREAKS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
  }

export function getInfoByNobreakId (qPars: { NOBREAK_ID: number }) {
  let sentence = `
    SELECT
      ELECTRIC_CIRCUITS_NOBREAKS.ELECTRIC_CIRCUIT_ID, 
      ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID
    FROM ELECTRIC_CIRCUITS_NOBREAKS
      WHERE ELECTRIC_CIRCUITS_NOBREAKS.NOBREAK_ID = :NOBREAK_ID`

  return sqldb.querySingle<{
    ELECTRIC_CIRCUIT_ID: number
    NOBREAK_ID: number
  }>(sentence, qPars)
}
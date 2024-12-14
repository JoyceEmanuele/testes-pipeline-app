import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_MACHINES.ID}
  FROM ELECTRIC_CIRCUITS_MACHINES
  WHERE {ELECTRIC_CIRCUITS_MACHINES.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_MACHINES WHERE ELECTRIC_CIRCUITS_MACHINES.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteElectricCircuitsMachinesByID (qPars: { MACHINE_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_MACHINES WHERE ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID)`;

  const sentence = `DELETE ELECTRIC_CIRCUITS_MACHINES FROM ELECTRIC_CIRCUITS_MACHINES ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)`;

  const sentence = `DELETE ELECTRIC_CIRCUITS_MACHINES FROM ELECTRIC_CIRCUITS_MACHINES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ELECTRIC_CIRCUITS_MACHINES
  FIELD ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID
  FIELD ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID
*/
export async function w_insert (qPars: { ELECTRIC_CIRCUIT_ID: number, MACHINE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ELECTRIC_CIRCUIT_ID');
  fields.push('MACHINE_ID');

  const sentence = `INSERT INTO ELECTRIC_CIRCUITS_MACHINES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ELECTRIC_CIRCUITS_MACHINES
  FIELD [[IFOWNPROP {:ELECTRIC_CIRCUIT_ID}]] ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID
  WHERE {ELECTRIC_CIRCUITS_MACHINES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    ELECTRIC_CIRCUIT_ID?: number,
    MACHINE_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.ELECTRIC_CIRCUIT_ID !== undefined) { fields.push('ELECTRIC_CIRCUIT_ID = :ELECTRIC_CIRCUIT_ID') }
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE ELECTRIC_CIRCUITS_MACHINES SET ${fields.join(', ')} WHERE ID = :ID`

    if (operationLogData) {
      await saveOperationLog('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
      dbLogger('ELECTRIC_CIRCUITS_MACHINES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
  }

  export function getInfoByMachineId (qPars: { MACHINE_ID: number }) {
    let sentence = `
      SELECT
        ELECTRIC_CIRCUITS_MACHINES.ELECTRIC_CIRCUIT_ID, 
        ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID
      FROM ELECTRIC_CIRCUITS_MACHINES
        WHERE ELECTRIC_CIRCUITS_MACHINES.MACHINE_ID = :MACHINE_ID`
  
    return sqldb.querySingle<{
      ELECTRIC_CIRCUIT_ID: number
      MACHINE_ID: number
    }>(sentence, qPars)
  }
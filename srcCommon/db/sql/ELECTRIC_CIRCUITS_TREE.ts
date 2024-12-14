import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM ELECTRIC_CIRCUITS_TREE
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS_TREE.UNIT_ID) 
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join =  `
  INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID OR ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID)
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ELECTRIC_CIRCUITS.UNIT_ID)
  `;

  const sentence = `DELETE ELECTRIC_CIRCUITS_TREE FROM ELECTRIC_CIRCUITS_TREE ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join =  `
  INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID OR ELECTRIC_CIRCUITS.ID = ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID)
  `;

  const sentence = `DELETE ELECTRIC_CIRCUITS_TREE FROM ELECTRIC_CIRCUITS_TREE ${join} WHERE ELECTRIC_CIRCUITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_TREE.ID}
  FROM ELECTRIC_CIRCUITS_TREE
  WHERE {ELECTRIC_CIRCUITS_TREE.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_TREE WHERE ELECTRIC_CIRCUITS_TREE.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteSource = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID}
  FROM ELECTRIC_CIRCUITS_TREE
  WHERE {ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID} = {:ELECTRIC_CIRCUIT_SOURCE_ID}
*/
export async function w_deleteSource (qPars: { ELECTRIC_CIRCUIT_SOURCE_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_TREE WHERE ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID = :ELECTRIC_CIRCUIT_SOURCE_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteChild = DELETE
  PARAM ID: {ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID}
  FROM ELECTRIC_CIRCUITS_TREE
  WHERE {ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID} = {:ELECTRIC_CIRCUIT_CHILD_ID}
*/
export async function w_deleteChild (qPars: { ELECTRIC_CIRCUIT_CHILD_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ELECTRIC_CIRCUITS_TREE WHERE ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID = :ELECTRIC_CIRCUIT_CHILD_ID`;

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_insert = INSERT
  FROM ELECTRIC_CIRCUITS_TREE
  FIELD ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID
*/
export async function w_insertChild (qPars: { ELECTRIC_CIRCUIT_SOURCE_ID: number, ELECTRIC_CIRCUIT_CHILD_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ELECTRIC_CIRCUIT_CHILD_ID = :ELECTRIC_CIRCUIT_CHILD_ID');

  const sentence = `UPDATE ELECTRIC_CIRCUITS_TREE SET ${fields.join(', ')} WHERE ELECTRIC_CIRCUIT_SOURCE_ID = :ELECTRIC_CIRCUIT_SOURCE_ID`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
/* @IFHELPER:FUNC w_insert_Source = INSERT
  FROM ELECTRIC_CIRCUITS_TREE
  FIELD ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_SOURCE_ID
  FIELD ELECTRIC_CIRCUITS_TREE.ELECTRIC_CIRCUIT_CHILD_ID
*/
export async function w_insert_Source (qPars: { ELECTRIC_CIRCUIT_SOURCE_ID: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ELECTRIC_CIRCUIT_SOURCE_ID');

  const sentence = `INSERT INTO ELECTRIC_CIRCUITS_TREE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
    dbLogger('ELECTRIC_CIRCUITS_TREE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}



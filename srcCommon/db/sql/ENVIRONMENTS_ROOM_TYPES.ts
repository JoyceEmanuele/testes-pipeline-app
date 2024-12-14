import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ENVIRONMENTS_ROOM_TYPES.ID}
  FROM ENVIRONMENTS_ROOM_TYPES
  WHERE {ENVIRONMENTS_ROOM_TYPES.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID?: number, ENVIRONMENT_ID?: number}, operationLogData: OperationLogData) {
  const conditions = [] as string[];
  if (qPars.ENVIRONMENT_ID != null) {conditions.push(`ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = :ENVIRONMENT_ID`)}
  if (qPars.ID != null) {conditions.push(`ENVIRONMENTS_ROOM_TYPES.ID = :ID`)}
  if (conditions.length === 0) throw Error('Delete without conditions forbided!');
  const sentence = `DELETE FROM ENVIRONMENTS_ROOM_TYPES WHERE ${conditions.join(' AND ')}`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
                 INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)`;

  const sentence = `DELETE ENVIRONMENTS_ROOM_TYPES FROM ENVIRONMENTS_ROOM_TYPES ${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)`;

  const sentence = `DELETE ENVIRONMENTS_ROOM_TYPES FROM ENVIRONMENTS_ROOM_TYPES ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ENVIRONMENTS_ROOM_TYPES
  FIELD ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID
  FIELD ENVIRONMENTS_ROOM_TYPES.RTYPE_ID
*/
export async function w_insert (qPars: { ENVIRONMENT_ID: number, RTYPE_ID: number, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ENVIRONMENT_ID');
  fields.push('RTYPE_ID');

  const sentence = `INSERT INTO ENVIRONMENTS_ROOM_TYPES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ENVIRONMENTS_ROOM_TYPES
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]] ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID
  FIELD [[IFOWNPROP {:RTYPE_ID}]] ENVIRONMENTS_ROOM_TYPES.RTYPE_ID
  WHERE {ENVIRONMENTS_ROOM_TYPES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    ENVIRONMENT_ID?: number,
    RTYPE_ID?: number,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
    if (qPars.RTYPE_ID !== undefined) { fields.push('RTYPE_ID = :RTYPE_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE ENVIRONMENTS_ROOM_TYPES SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
      dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

export async function getIDByEnvironmentId(qPars: { ENVIRONMENT_ID: number }) {
  let sentence = `
  SELECT
    env.ID
  FROM ENVIRONMENTS_ROOM_TYPES env
  WHERE env.ENVIRONMENT_ID = :ENVIRONMENT_ID;
`
return sqldb.query<{
  ID: number
}>(sentence, qPars)
}

export async function w_insertUpdate(qPars: { ENVIRONMENT_ID: number, RTYPE_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
  INSERT INTO ENVIRONMENTS_ROOM_TYPES (ENVIRONMENT_ID, RTYPE_ID) VALUES (:ENVIRONMENT_ID, :RTYPE_ID)
  ON DUPLICATE KEY UPDATE RTYPE_ID = :RTYPE_ID;
  `
  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS_ROOM_TYPES', sentence, qPars, operationLogData);
  }
  
  return sqldb.execute(sentence, qPars)
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DUTS_DEVICES_ROOMS.ID}
  FROM DUTS_DEVICES_ROOMS
  WHERE {DUTS_DEVICES_ROOMS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_DEVICES_ROOMS WHERE DUTS_DEVICES_ROOMS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN ROOMS ON (ROOMS.ROOM_ID = DUTS_DEVICES_ROOMS.ROOM_ID)`;

  const sentence = `DELETE DUTS_DEVICES_ROOMS FROM DUTS_DEVICES_ROOMS ${join} WHERE ROOMS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES_ROOMS.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DEVICES_ROOMS FROM DUTS_DEVICES_ROOMS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_DEVICES_ROOMS
  FIELD DUTS_DEVICES_ROOMS.DUT_DEVICE_ID
  FIELD DUTS_DEVICES_ROOMS.ROOM_ID
*/
export async function w_insert (qPars: { DUT_DEVICE_ID: number, ROOM_ID: number, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID');
  fields.push('ROOM_ID');

  const sentence = `INSERT INTO DUTS_DEVICES_ROOMS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
    dbLogger('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DUTS_DEVICES_ROOMS
  FIELD [[IFOWNPROP {:DUT_DEVICE_ID}]] DUTS_DEVICES_ROOMS.DUT_DEVICE_ID
  FIELD [[IFOWNPROP {:ROOM_ID}]] DUTS_DEVICES_ROOMS.ROOM_ID
  WHERE {DUTS_DEVICES_ROOMS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    DUT_DEVICE_ID?: number,
    ROOM_ID?: string,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.DUT_DEVICE_ID !== undefined) { fields.push('DUT_DEVICE_ID = :DUT_DEVICE_ID') }
    if (qPars.ROOM_ID !== undefined) { fields.push('ROOM_ID = :ROOM_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DUTS_DEVICES_ROOMS SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
      dbLogger('DUTS_DEVICES_ROOMS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

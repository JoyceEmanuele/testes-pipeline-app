import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

interface ParamsFancoil {
  FANCOIL_ID: string,
  THERM_MANUF?: string,
  THERM_MODEL?: string,
  THERM_T_MIN?: number,
  THERM_T_MAX?: number,
  VALVE_MANUF?: string,
  VALVE_MODEL?: string,
  VALVE_TYPE?: string,
  FANCOIL_MANUF?: string,
  FANCOIL_MODEL?: string,
  ROOM_NAME?: string,
  RTYPE_ID?: number,
  HAS_ROOMTYPE?: boolean,
  DUT_ID_FROM_ROOM?: string
}

function insertFields(qPars: ParamsFancoil): string[] {
  const fields: string[] = []
  fields.push('FANCOIL_ID');

  if (qPars.THERM_MANUF !== undefined) { fields.push('THERM_MANUF') }
  if (qPars.THERM_MODEL !== undefined) { fields.push('THERM_MODEL') }
  if (qPars.THERM_T_MIN !== undefined) { fields.push('THERM_T_MIN') }
  if (qPars.THERM_T_MAX !== undefined) { fields.push('THERM_T_MAX') }
  if (qPars.VALVE_MANUF !== undefined) { fields.push('VALVE_MANUF') }
  if (qPars.VALVE_MODEL !== undefined) { fields.push('VALVE_MODEL') }
  if (qPars.VALVE_TYPE !== undefined) { fields.push('VALVE_TYPE') }
  if (qPars.FANCOIL_MANUF !== undefined) { fields.push('FANCOIL_MANUF') }
  if (qPars.FANCOIL_MODEL !== undefined) { fields.push('FANCOIL_MODEL') }
  if (qPars.ROOM_NAME !== undefined) { fields.push('ROOM_NAME') }
  if (qPars.RTYPE_ID !== undefined) { fields.push('RTYPE_ID') }
  if (qPars.HAS_ROOMTYPE !== undefined) { fields.push('HAS_ROOMTYPE') }
  if (qPars.DUT_ID_FROM_ROOM !== undefined) { fields.push('DUT_ID_FROM_ROOM') }

  return fields;
}

function updateFields(qPars: ParamsFancoil): string[] {
  const updateFields: string[] = []

  if (qPars.THERM_MANUF !== undefined) updateFields.push("THERM_MANUF = :THERM_MANUF")
  if (qPars.THERM_MODEL !== undefined) updateFields.push("THERM_MODEL = :THERM_MODEL")
  if (qPars.THERM_T_MIN !== undefined) updateFields.push("THERM_T_MIN = :THERM_T_MIN")
  if (qPars.THERM_T_MAX !== undefined) updateFields.push("THERM_T_MAX = :THERM_T_MAX")
  if (qPars.VALVE_MANUF !== undefined) updateFields.push("VALVE_MANUF = :VALVE_MANUF")
  if (qPars.VALVE_MODEL !== undefined) updateFields.push("VALVE_MODEL = :VALVE_MODEL")
  if (qPars.VALVE_TYPE !== undefined) updateFields.push("VALVE_TYPE = :VALVE_TYPE")
  if (qPars.FANCOIL_MANUF !== undefined) updateFields.push("FANCOIL_MANUF = :FANCOIL_MANUF")
  if (qPars.FANCOIL_MODEL !== undefined) updateFields.push("FANCOIL_MODEL = :FANCOIL_MODEL")
  if (qPars.ROOM_NAME !== undefined) updateFields.push("ROOM_NAME = :ROOM_NAME")
  if (qPars.RTYPE_ID !== undefined) updateFields.push("RTYPE_ID = :RTYPE_ID")
  if (qPars.HAS_ROOMTYPE !== undefined) updateFields.push("HAS_ROOMTYPE = :HAS_ROOMTYPE")
  if (qPars.DUT_ID_FROM_ROOM !== undefined) updateFields.push("DUT_ID_FROM_ROOM = :DUT_ID_FROM_ROOM")

  return updateFields;
}

/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM FANCOILS
  FIELD FANCOILS.VAV_ID
  FIELD FANCOILS.THERM_MANUF
  FIELD FANCOILS.THERM_MODEL
  FIELD FANCOILS.THERM_T_MIN
  FIELD FANCOILS.THERM_T_MAX  
  FIELD FANCOILS.VALVE_MANUF
  FIELD FANCOILS.VALVE_MODEL
  FIELD FANCOILS.VALVE_TYPE
  FIELD FANCOILS.FANCOIL_MANUF
  FIELD FANCOILS.FANCOIL_MODEL
  FIELD FANCOILS.ROOM_NAME
  FIELD FANCOILS.RTYPE_ID
  FIELD FANCOILS.HAS_ROOMTYPE
  FIELD FANCOILS.DUT_ID_FROM_ROOM
*/
export async function w_insertUpdate(qPars: ParamsFancoil, operationLogData: OperationLogData) {
  const fields = insertFields(qPars);
  const updatedFields = updateFields(qPars);

  let sentence = `INSERT INTO FANCOILS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  sentence += ` ON DUPLICATE KEY UPDATE ${updatedFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('FANCOILS', sentence, qPars, operationLogData);
    dbLogger('FANCOILS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM VAV_ID: {FANCOILS.FANCOIL_ID}
  FROM FANCOILS
  WHERE {FANCOILS.FANCOIL_ID} = {:FANCOIL_ID}
*/
export async function w_delete (qPars: { FANCOIL_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM FANCOILS WHERE FANCOILS.FANCOIL_ID = :FANCOIL_ID`;

  if (operationLogData) {
    await saveOperationLog('FANCOILS', sentence, qPars, operationLogData);
    dbLogger('FANCOILS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDris (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = FANCOILS.FANCOIL_ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE FANCOILS FROM FANCOILS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('FANCOILS', sentence, qPars, operationLogData);
    dbLogger('FANCOILS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDriVav = SELECT LIST
  PARAM FANCOIL_ID: {FANCOILS.FANCOIL_ID}
  FROM FANCOILS
  SELECT FANCOILS.FANCOIL_ID
  SELECT FANCOILS.THERM_MANUF
  SELECT FANCOILS.THERM_MODEL
  SELECT FANCOILS.THERM_T_MIN
  SELECT FANCOILS.THERM_T_MAX  
  SELECT FANCOILS.VALVE_MANUF
  SELECT FANCOILS.VALVE_MODEL
  SELECT FANCOILS.VALVE_TYPE
  SELECT FANCOILS.FANCOIL_MANUF
  SELECT FANCOILS.FANCOIL_MODEL
  SELECT FANCOILS.ROOM_NAME
  SELECT FANCOILS.RTYPE_ID
  SELECT FANCOILS.HAS_ROOMTYPE
  SELECT FANCOILS.DUT_ID_FROM_ROOM
  SELECT ROOMTYPES.RTYPE_NAME
  SELECT ROOMTYPES.TUSEMIN
  SELECT ROOMTYPES.TUSEMAX
  WHERE {FANCOILS.FANCOIL_ID} = ({:FANCOIL_ID})
*/
export function getDriFancoil (qPars: { FANCOIL_ID: string }) {
  let sentence = `
    SELECT
      FANCOILS.FANCOIL_ID,
      FANCOILS.THERM_MANUF,
      FANCOILS.THERM_MODEL,
      FANCOILS.THERM_T_MIN,
      FANCOILS.THERM_T_MAX,
      FANCOILS.VALVE_MANUF,
      FANCOILS.VALVE_MODEL,
      FANCOILS.VALVE_TYPE,
      FANCOILS.FANCOIL_MANUF,
      FANCOILS.FANCOIL_MODEL,
      FANCOILS.ROOM_NAME,
      FANCOILS.RTYPE_ID,
      FANCOILS.HAS_ROOMTYPE,
      FANCOILS.DUT_ID_FROM_ROOM,
      ROOMTYPES.RTYPE_NAME AS ROOM_TYPE_NAME,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX
  `
  sentence += `
    FROM
      FANCOILS
      LEFT JOIN ROOMTYPES ON (FANCOILS.RTYPE_ID = ROOMTYPES.RTYPE_ID)
    WHERE
      FANCOILS.FANCOIL_ID = :FANCOIL_ID
  `;

  return sqldb.querySingle<{
    FANCOIL_ID: string
    THERM_MANUF: string
    THERM_MODEL: string
    THERM_T_MIN: number
    THERM_T_MAX: number
    VALVE_MANUF: string
    VALVE_MODEL: string
    VALVE_TYPE: string
    FANCOIL_MANUF: string
    FANCOIL_MODEL: string
    ROOM_NAME: string
    RTYPE_ID: number
    HAS_ROOMTYPE: number
    DUT_ID_FROM_ROOM: string
    ROOM_TYPE_NAME: string
    TUSEMIN: number
    TUSEMAX: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC removeDut = UPDATE
  PARAM DUT_ID: {FANCOILS.DUT_ID_FROM_ROOM}
  FROM FANCOILS
  CONSTFIELD DUT_ID_FROM_ROOM = NULL
  WHERE {FANCOILS.DUT_ID_FROM_ROOM} = {:DUT_ID_FROM_ROOM}
*/
export async function w_removeDut (qPars: { DUT_ID_FROM_ROOM: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE FANCOILS SET DUT_ID_FROM_ROOM = NULL, ROOM_NAME = NULL, RTYPE_ID = NULL, HAS_ROOMTYPE = NULL WHERE FANCOILS.DUT_ID_FROM_ROOM = :DUT_ID_FROM_ROOM`

  if (operationLogData) {
    await saveOperationLog('FANCOILS', sentence, qPars, operationLogData);
    dbLogger('FANCOILS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC removeRoomType = UPDATE
  PARAM RTYPE_ID: {FANCOILS.RTYPE_ID}
  FROM FANCOILS
  CONSTFIELD RTYPE_ID = NULL
  WHERE {FANCOILS.RTYPE_ID} = {:RTYPE_ID}
*/
export async function w_removeRoomType (qPars: { RTYPE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE FANCOILS SET DUT_ID_FROM_ROOM = NULL, ROOM_NAME = NULL, RTYPE_ID = NULL, HAS_ROOMTYPE = NULL WHERE FANCOILS.RTYPE_ID = :RTYPE_ID`

  if (operationLogData) {
    await saveOperationLog('FANCOILS', sentence, qPars, operationLogData);
    dbLogger('FANCOILS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getFancoilsInfoList(qPars: { unitIds?: number[] }) {
  let sentence = `
    SELECT
      FANCOILS.FANCOIL_ID,
      FANCOILS.FANCOIL_MANUF,
      FANCOILS.FANCOIL_MODEL,
      FANCOILS.THERM_MANUF,
      FANCOILS.THERM_MODEL,
      FANCOILS.VALVE_MANUF,
      FANCOILS.VALVE_MODEL,
      FANCOILS.VALVE_TYPE
    FROM FANCOILS
    INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = FANCOILS.FANCOIL_ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
    WHERE DEVICES_UNITS.UNIT_ID IN (:unitIds)`
  return sqldb.query<{
    FANCOIL_ID: string,
    FANCOIL_MANUF: string,
    FANCOIL_MODEL: string,
    THERM_MANUF: string,
    THERM_MODEL: string,
    VALVE_MANUF: string,
    VALVE_MODEL: string,
    VALVE_TYPE: string,
  }>(sentence, qPars)
}

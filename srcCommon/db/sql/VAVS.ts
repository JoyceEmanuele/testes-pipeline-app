import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

interface ParamsVAV {
  VAV_ID: string,
  THERM_MANUF?: string,
  THERM_MODEL?: string,
  VALVE_MANUF?: string,
  VALVE_MODEL?: string,
  VALVE_TYPE?: string,
  BOX_MANUF?: string,
  BOX_MODEL?: string,
  ROOM_NAME?: string,
  RTYPE_ID?: number,
}

function insertFields(qPars: ParamsVAV): string[] {
  const fields: string[] = []
  fields.push('VAV_ID');

  if (qPars.THERM_MANUF !== undefined) { fields.push('THERM_MANUF') }
  if (qPars.THERM_MODEL !== undefined) { fields.push('THERM_MODEL') }
  if (qPars.VALVE_MANUF !== undefined) { fields.push('VALVE_MANUF') }
  if (qPars.VALVE_MODEL !== undefined) { fields.push('VALVE_MODEL') }
  if (qPars.VALVE_TYPE !== undefined) { fields.push('VALVE_TYPE') }
  if (qPars.BOX_MANUF !== undefined) { fields.push('BOX_MANUF') }
  if (qPars.BOX_MODEL !== undefined) { fields.push('BOX_MODEL') }
  if (qPars.ROOM_NAME !== undefined) { fields.push('ROOM_NAME') }
  if (qPars.RTYPE_ID !== undefined) { fields.push('RTYPE_ID') }

  return fields;
}

function updateFields(qPars: ParamsVAV): string[] {
  const updateFields: string[] = []

  if (qPars.THERM_MANUF !== undefined) updateFields.push("THERM_MANUF = :THERM_MANUF")
  if (qPars.THERM_MODEL !== undefined) updateFields.push("THERM_MODEL = :THERM_MODEL")
  if (qPars.VALVE_MANUF !== undefined) updateFields.push("VALVE_MANUF = :VALVE_MANUF")
  if (qPars.VALVE_MODEL !== undefined) updateFields.push("VALVE_MODEL = :VALVE_MODEL")
  if (qPars.VALVE_TYPE !== undefined) updateFields.push("VALVE_TYPE = :VALVE_TYPE")
  if (qPars.BOX_MANUF !== undefined) updateFields.push("BOX_MANUF = :BOX_MANUF")
  if (qPars.BOX_MODEL !== undefined) updateFields.push("BOX_MODEL = :BOX_MODEL")
  if (qPars.ROOM_NAME !== undefined) updateFields.push("ROOM_NAME = :ROOM_NAME")
  if (qPars.RTYPE_ID !== undefined) updateFields.push("RTYPE_ID = :RTYPE_ID")

  return updateFields;
}


/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM VAVS
  FIELD VAVS.VAV_ID
  FIELD VAVS.THERM_MANUF
  FIELD VAVS.THERM_MODEL
  FIELD VAVS.VALVE_MANUF
  FIELD VAVS.VALVE_MODEL
  FIELD VAVS.VALVE_TYPE
  FIELD VAVS.BOX_MANUF
  FIELD VAVS.BOX_MODEL
  FIELD VAVS.ROOM_NAME
  FIELD VAVS.RTYPE_ID
*/
export async function w_insertUpdate (qPars: {
  VAV_ID: string,
  THERM_MANUF?: string,
  THERM_MODEL?: string,
  VALVE_MANUF?: string,
  VALVE_MODEL?: string,
  VALVE_TYPE?: string,
  BOX_MANUF?: string,
  BOX_MODEL?: string,
  ROOM_NAME?: string,
  RTYPE_ID?: number,
}, operationLogData: OperationLogData) {
  const fields = insertFields(qPars);
  let sentence = `INSERT INTO VAVS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updatedFields = updateFields(qPars);
  sentence += ` ON DUPLICATE KEY UPDATE ${updatedFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('VAVS', sentence, qPars, operationLogData);
    dbLogger('VAVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertUpdateNullRType (qPars: {
  VAV_ID: string,
  RTYPE_ID: number,
}, operationLogData: OperationLogData) {

  const sentence = `INSERT INTO VAVS (VAV_ID, RTYPE_ID) VALUES (:VAV_ID, NULL) ON DUPLICATE KEY UPDATE RTYPE_ID = NULL;`

  if (operationLogData) {
    await saveOperationLog('VAVS', sentence, qPars, operationLogData);
    dbLogger('VAVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM VAV_ID: {VAVS.VAV_ID}
  FROM VAVS
  WHERE {VAVS.VAV_ID} = {:VAV_ID}
*/
export async function w_delete (qPars: { VAV_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VAVS WHERE VAVS.VAV_ID = :VAV_ID`;

  if (operationLogData) {
    await saveOperationLog('VAVS', sentence, qPars, operationLogData);
    dbLogger('VAVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDris (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DEVICES.DEVICE_ID = VAVS.VAV_ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE VAVS FROM VAVS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('VAVS', sentence, qPars, operationLogData);
    dbLogger('VAVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDriVav = SELECT LIST
  PARAM VAV_ID: {VAVS.VAV_ID}
  FROM VAVS
  SELECT VAVS.VAV_ID
  SELECT VAVS.THERM_MANUF
  SELECT VAVS.THERM_MODEL
  SELECT VAVS.VALVE_MANUF
  SELECT VAVS.VALVE_MODEL
  SELECT VAVS.VALVE_TYPE
  SELECT VAVS.BOX_MANUF
  SELECT VAVS.BOX_MODEL
  SELECT VAVS.ROOM_NAME
  SELECT VAVS.RTYPE_ID
  SELECT ROOMTYPES.RTYPE_NAME
  SELECT ROOMTYPES.TUSEMIN
  SELECT ROOMTYPES.TUSEMA
  WHERE {VAVS.VAV_ID} = ({:VAV_ID})
*/
export function getDriVav (qPars: { VAV_ID: string }) {
  let sentence = `
    SELECT
      VAVS.VAV_ID,
      VAVS.THERM_MANUF,
      VAVS.THERM_MODEL,
      VAVS.VALVE_MANUF,
      VAVS.VALVE_MODEL,
      VAVS.VALVE_TYPE,
      VAVS.BOX_MANUF,
      VAVS.BOX_MODEL,
      VAVS.ROOM_NAME,
      VAVS.RTYPE_ID,
      ROOMTYPES.RTYPE_NAME AS ROOM_TYPE_NAME,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX
  `
  sentence += `
    FROM
      VAVS
      LEFT JOIN ROOMTYPES ON (VAVS.RTYPE_ID = ROOMTYPES.RTYPE_ID)
    WHERE
      VAVS.VAV_ID = :VAV_ID
  `;

  return sqldb.querySingle<{
    VAV_ID: string
    THERM_MANUF: string
    THERM_MODEL: string
    VALVE_MANUF: string
    VALVE_MODEL: string
    VALVE_TYPE: string
    BOX_MANUF: string
    BOX_MODEL: string
    ROOM_NAME: string
    RTYPE_ID: number
    ROOM_TYPE_NAME: string
    TUSEMIN: number,
    TUSEMAX: number,
  }>(sentence, qPars)
}

export function getVAVsList (qPars: {
  INCLUDE_INSTALLATION_UNIT?: boolean,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  rtypeId?: number,
  SKIP?: number,
  LIMIT?: number
}) {
  let sentence = `
    SELECT
      VAVS.VAV_ID AS DEV_ID,
      VAVS.ISVISIBLE,
      DEVICES.BT_ID AS bt_id,
      CLUNITS.CITY_ID,
      CITY.NAME AS CITY_NAME,
      COUNTRY.NAME AS COUNTRY_NAME,
      STATEREGION.NAME AS STATE_ID,
      VAVS.ROOM_NAME,
      DEVICES_UNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.LAT,
      CLUNITS.LON,
      CLIENTS.NAME AS CLIENT_NAME,
      DEVICES_CLIENTS.CLIENT_ID,
      VAVS.RTYPE_ID,
      ROOMTYPES.RTYPE_NAME,
      ROOMTYPES.USEPERIOD AS RTYPE_SCHED,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX,
      DRIS_DEVICES.VARSCFG,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `

  sentence += `
    FROM
      VAVS
      INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = VAVS.VAV_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = VAVS.RTYPE_ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.rtypeId != null) { conditions.push(`VAVS.RTYPE_ID = :rtypeId`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` ORDER BY VAVS.VAV_ID ASC `
  if (qPars.SKIP != null && qPars.LIMIT != null) { sentence += ` LIMIT :SKIP,:LIMIT ` }

  return sqldb.query<{
    DEV_ID: string
    ISVISIBLE: number
    bt_id: string
    CITY_ID: string
    CITY_NAME: string
    COUNTRY_NAME: string
    STATE_ID: string
    ROOM_NAME: string
    UNIT_ID: number
    UNIT_NAME: string
    LAT: string
    LON: string
    CLIENT_NAME: string
    CLIENT_ID: number
    RTYPE_ID: number
    RTYPE_NAME: string
    RTYPE_SCHED: string
    TUSEMAX: number
    TUSEMIN: number
    VARSCFG: string
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC removeRoomType = UPDATE
  PARAM RTYPE_ID: {VAVS.RTYPE_ID}
  FROM VAVS
  CONSTFIELD RTYPE_ID = NULL
  WHERE {VAVS.RTYPE_ID} = {:RTYPE_ID}
*/
export async function w_removeRoomType (qPars: { RTYPE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE VAVS SET RTYPE_ID = NULL WHERE VAVS.RTYPE_ID = :RTYPE_ID`

  if (operationLogData) {
    await saveOperationLog('VAVS', sentence, qPars, operationLogData);
    dbLogger('VAVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getVavsList_vavsAndAssets (qPars: {
  INCLUDE_INSTALLATION_UNIT?: boolean,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  machineIds?: number[],
}, admPars: {
  addUnownedDevs?: boolean
}) {
  let sentence = `
    SELECT
      VAVS.VAV_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      MACHINES.ID AS GROUP_ID,
      MACHINES.NAME AS GROUP_NAME,
      DEVICES_UNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      DEVICES_CLIENTS.CLIENT_ID,
      NULL AS DAT_ID,
      DRIS_DEVICES.VARSCFG,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      VAVS
      INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = VAVS.VAV_ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN MACHINES ON (MACHINES.ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length && admPars.addUnownedDevs) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID IN (:clientIds) OR DEVICES_CLIENTS.CLIENT_ID IS NULL)`) }
  if (qPars.clientIds?.length && !admPars.addUnownedDevs) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID IN (:clientIds))`) }
  if (qPars.stateIds?.length) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds?.length) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds?.length) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
  if (qPars.machineIds?.length) { conditions.push(`MACHINES.ID IN (:machineIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    VAV_ID: string
    CITY_NAME: string
    STATE_ID: string
    GROUP_ID: number
    GROUP_NAME: string
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    DAT_ID: string
    VARSCFG: string
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

export function getVAVsInfoList(qPars: { unitIds?: number[] }){
    let sentence = `
    SELECT
      VAVS.VAV_ID,
      VAVS.THERM_MANUF,
      VAVS.THERM_MODEL,
      VAVS.VALVE_MANUF,
      VAVS.VALVE_MODEL,
      VAVS.VALVE_TYPE,
      VAVS.BOX_MANUF,
      VAVS.BOX_MODEL,
      VAVS.ROOM_NAME
    FROM VAVS
    INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = VAVS.VAV_ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
    WHERE DEVICES_UNITS.UNIT_ID IN (:unitIds)`
    return sqldb.query<{
      VAV_ID: string,
      THERM_MANUF: string,
      THERM_MODEL: string,
      VALVE_MANUF: string,
      VALVE_MODEL: string,
      VALVE_TYPE: string,
      BOX_MANUF: string,
      BOX_MODEL: string,
      ROOM_NAME: string,
    }>(sentence, qPars)
}

export function setVisibilityofVAVs ( qPars: { isVisible: number, vavId: string  }){
  const sentence = `UPDATE VAVS SET ISVISIBLE = :isVisible WHERE VAV_ID = :vavId ;`
  return sqldb.execute(sentence, qPars)
}

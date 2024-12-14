import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {ENVIRONMENTS.ID}
  FROM ENVIRONMENTS
  WHERE {ENVIRONMENTS.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ENVIRONMENTS WHERE ENVIRONMENTS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
                 INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)`;

  const sentence = `DELETE ENVIRONMENTS FROM ENVIRONMENTS ${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)`;

  const sentence = `DELETE ENVIRONMENTS FROM ENVIRONMENTS ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM ENVIRONMENTS
  FIELD ENVIRONMENTS.UNIT_ID
  FIELD ENVIRONMENTS.ENVIRONMENT_NAME
  FIELD ENVIRONMENTS.IS_VISIBLE
  FIELD ENVIRONMENTS.ENVIRONMENT_TYPE
*/
export async function w_insert (qPars: { UNIT_ID: number, ENVIRONMENT_NAME: string, IS_VISIBLE: boolean, ENVIRONMENT_TYPE: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID');
  fields.push('ENVIRONMENT_NAME');
  fields.push('IS_VISIBLE');
  fields.push('ENVIRONMENT_TYPE');

  const sentence = `INSERT INTO ENVIRONMENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('ENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM ENVIRONMENTS
  FIELD [[IFOWNPROP {:UNIT_ID}]] ENVIRONMENTS.UNIT_ID
  FIELD [[IFOWNPROP {:ENVIRONMENT_NAME}]] ENVIRONMENTS.ENVIRONMENT_NAME
  FIELD [[IFOWNPROP {:IS_VISIBLE}]] ENVIRONMENTS.IS_VISIBLE
  FIELD [[IFOWNPROP {:ENVIRONMENT_TYPE}]] ENVIRONMENTS.ENVIRONMENT_TYPE
  WHERE {ENVIRONMENTS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
    ID: number,
    UNIT_ID?: number,
    ENVIRONMENT_NAME?: string,
    IS_VISIBLE?: boolean,
    ENVIRONMENT_TYPE?: string,
  }, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
    if (qPars.ENVIRONMENT_NAME !== undefined) { fields.push('ENVIRONMENT_NAME = :ENVIRONMENT_NAME') }
    if (qPars.IS_VISIBLE !== undefined) { fields.push('IS_VISIBLE = :IS_VISIBLE') }
    if (qPars.ENVIRONMENT_TYPE !== undefined) { fields.push('ENVIRONMENT_TYPE = :ENVIRONMENT_TYPE') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE ENVIRONMENTS SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('ENVIRONMENTS', sentence, qPars, operationLogData);
      dbLogger('ENVIRONMENTS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  export function getEnvironmentsList (qPars: {
    UNIT_ID?: number,
    CLIENT_IDs?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean,
  }) {
    let sentence = `
      SELECT
        ENVIRONMENTS.ID,
        ENVIRONMENTS.UNIT_ID,
        ENVIRONMENTS.ENVIRONMENT_NAME,
        ENVIRONMENTS.IS_VISIBLE,
        ENVIRONMENTS.ENVIRONMENT_TYPE,
        CLUNITS.CLIENT_ID,
        CLUNITS.UNIT_NAME,
        CLUNITS.LAT,
        CLUNITS.LON,
        CLIENTS.NAME,
        CITY.CITY_ID AS CITY_ID,
        CITY.NAME AS CITY_NAME,
        STATEREGION.NAME AS STATE_ID,
        STATEREGION.FULL_NAME AS STATE_NAME,
        COUNTRY.NAME AS COUNTRY_NAME,
        ROOMTYPES.RTYPE_ID,
        ROOMTYPES.RTYPE_NAME,
        DEVICES.DEVICE_CODE AS DUT_CODE,
        ENVIRONMENTS_ROOM_TYPES.ID AS ENVIRONMENTS_ROOM_TYPES_ID,
        MACHINES.ID AS MACHINE_ID
    `
    sentence += `
      FROM
        ENVIRONMENTS
        INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
        INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN REFRIGERATES ON (REFRIGERATES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN MACHINES ON (MACHINES.ID = REFRIGERATES.MACHINE_ID)
        LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = ENVIRONMENTS_ROOM_TYPES.RTYPE_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
        LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
        LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
    `
  
    const conditions: string[] = []
    if (qPars.UNIT_ID != null) { conditions.push(`ENVIRONMENTS.UNIT_ID = :UNIT_ID`) }
    if (qPars.CLIENT_IDs) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDs)`) }
    if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
      conditions.push(`CLUNITS.PRODUCTION = 1`)
    }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

    return sqldb.query<{
      ID: number
      UNIT_ID: number
      ENVIRONMENT_NAME: string
      IS_VISIBLE: number
      ENVIRONMENT_TYPE: string
      CLIENT_ID: number
      UNIT_NAME: string
      LAT: string
      LON: string
      NAME: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      COUNTRY_NAME: string
      RTYPE_ID: number
      RTYPE_NAME: string
      DUT_CODE: string
      ENVIRONMENTS_ROOM_TYPES_ID: number
      MACHINE_ID: number
    }>(sentence, qPars)
  }

  export function getEnvironmentsInfo (qPars: {
    ENVIRONMENT_ID: number,
  }) {
    let sentence = `
      SELECT
        ENVIRONMENTS.ID,
        ENVIRONMENTS.UNIT_ID,
        ENVIRONMENTS.ENVIRONMENT_NAME,
        ENVIRONMENTS.IS_VISIBLE,
        ENVIRONMENTS.ENVIRONMENT_TYPE,
        ENVIRONMENTS_ROOM_TYPES.ID AS ENVIRONMENT_ROOM_TYPE_ID,
        ENVIRONMENTS_ROOM_TYPES.RTYPE_ID AS RTYPE_ID,
        ROOMTYPES.RTYPE_NAME AS RTYPE_NAME,
        CLUNITS.CLIENT_ID
    `
    sentence += `
      FROM
        ENVIRONMENTS
        LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = ENVIRONMENTS_ROOM_TYPES.RTYPE_ID)
        LEFT JOIN CLUNITS ON (ENVIRONMENTS.UNIT_ID = CLUNITS.UNIT_ID)
    `
  
    const conditions: string[] = []
    if (qPars.ENVIRONMENT_ID != null) { conditions.push(`ENVIRONMENTS.ID = :ENVIRONMENT_ID`) }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
    return sqldb.querySingle<{
      ID: number
      UNIT_ID: number
      ENVIRONMENT_NAME: string
      IS_VISIBLE: number
      ENVIRONMENT_TYPE: string
      ENVIRONMENT_ROOM_TYPE_ID: number
      RTYPE_ID: number
      RTYPE_NAME: string
      CLIENT_ID: number
    }>(sentence, qPars)
  }

  export function getEnvironmentsInfoList (qPars: {
    UNIT_ID?: number,
    CLIENT_IDs?: number[],
    withoutDev?: boolean
    clientIds?: number[],
    stateIds?: string[],
    cityIds?: string[],
    unitIds?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean,
  }) {
    let sentence = `
      SELECT
        ENVIRONMENTS.ID,
        ENVIRONMENTS.UNIT_ID,
        ENVIRONMENTS.ENVIRONMENT_NAME,
        ENVIRONMENTS.IS_VISIBLE,
        ENVIRONMENTS.ENVIRONMENT_TYPE,
        CLUNITS.CLIENT_ID,
        CLIENTS.NAME AS CLIENT_NAME,
        CLUNITS.UNIT_NAME,
        DEVICES.DEVICE_CODE AS DUT_CODE,
        ENVIRONMENTS_ROOM_TYPES.RTYPE_ID,
        ROOMTYPES.TUSEMIN,
        ROOMTYPES.TUSEMAX,
        ROOMTYPES.USEPERIOD AS RTYPE_SCHED,
        CLUNITS.CITY_ID,
        CITY.NAME AS CITY_NAME,
        STATEREGION.NAME AS STATE_ID,
        STATEREGION.FULL_NAME AS STATE_NAME,
        TIME_ZONES.ID AS TIMEZONE_ID,
        TIME_ZONES.AREA AS TIMEZONE_AREA,
        TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
    `
    sentence += `
      FROM
        ENVIRONMENTS
        INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
        LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
        LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
        LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
        LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
        LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
        LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = ENVIRONMENTS_ROOM_TYPES.RTYPE_ID)
    `
  
    const conditions: string[] = []
    if (qPars.UNIT_ID != null) { conditions.push(`ENVIRONMENTS.UNIT_ID = :UNIT_ID`) }
    if (qPars.CLIENT_IDs) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDs)`) }
    if (qPars.withoutDev) { conditions.push(`DEVICES.ID IS NULL`) }    
    if (qPars.clientIds) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
    if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
    if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
    if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
    if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
      conditions.push(`CLUNITS.PRODUCTION = 1`)
    }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
    return sqldb.query<{
      ID: number
      UNIT_ID: number
      ENVIRONMENT_NAME: string
      IS_VISIBLE: number
      ENVIRONMENT_TYPE: string
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_NAME: string
      DUT_CODE: string
      RTYPE_ID: number
      TUSEMIN: number
      TUSEMAX: number
      RTYPE_SCHED: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      TIMEZONE_ID: number
      TIMEZONE_AREA: string
      TIMEZONE_OFFSET: number
    }>(sentence, qPars)
  }

  export function getUnmonitoredEnvironments (qPars: {
    clientIds?: number[];
    stateIds?: number[];
    cityIds?: string[];
    unitIds?: number[];
    INCLUDE_INSTALLATION_UNIT?: boolean;
  }) {
    let sentence = `SELECT
      ENVIRONMENTS.ENVIRONMENT_NAME AS ENVIRONMENT
      FROM
          ENVIRONMENTS
          INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ENVIRONMENTS.UNIT_ID)
          LEFT JOIN REFRIGERATES ON (REFRIGERATES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
          LEFT JOIN MACHINES ON (MACHINES.ID = REFRIGERATES.MACHINE_ID)
          LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
          LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
          LEFT JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
          LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
    `
    
    const conditions: string[] = []
    if (qPars.clientIds?.length) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
    if (qPars.unitIds?.length) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
    if (qPars.cityIds?.length) { conditions.push(`CITY.CITY_ID IN (:cityIds)`) }
    if (qPars.stateIds?.length) { conditions.push(`CITY.STATE_ID IN (:stateIds)`) }
    if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
    conditions.push(`ENVIRONMENTS.ENVIRONMENT_NAME IS NOT NULL`)
    conditions.push(`ENVIRONMENTS.IS_VISIBLE = 1`)
    conditions.push(`DUTS_DEVICES.ID IS NULL`)
    if(conditions.length > 0 ) {sentence += ' WHERE ' + conditions.join(' AND ')}

    return sqldb.query<{
      ENVIRONMENT: string
    }>(sentence, qPars)
  }

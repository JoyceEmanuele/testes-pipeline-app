import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DUTS_DUO.ID}
  FROM DUTS_DUO
  WHERE {DUTS_DUO.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DUTS_DUO WHERE DUTS_DUO.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = 
    `DELETE DUTS_DUO FROM DUTS_DUO
      INNER JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
      INNER JOIN EVAPORATORS ON (DUTS_DUO_EVAPORATORS.EVAPORATOR_ID = EVAPORATORS.ID)
      WHERE EVAPORATORS.ASSET_ID =:ASSET_ID`;

  if (operationLogData) {
      await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
      dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DUTS_DUO FROM DUTS_DUO${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DUO FROM DUTS_DUO${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_fixConsistency (operationLogData: OperationLogData) {
  const join = ` INNER JOIN DUTS_DEVICES ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
                 LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DUTS_DUO FROM DUTS_DUO${join} WHERE DEVICES_CLIENTS.ID IS NULL OR DEVICES_UNITS.ID IS NULL`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, {}, operationLogData);
    dbLogger('DUTS_DUO', sentence, {}, operationLogData);
  }

  return sqldb.execute(sentence, {})
}

export async function w_insert (qPars: { DUT_DEVICE_ID: number, SENSOR_AUTOM: number, REDEFINED_SENSORS: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID');
  fields.push('SENSOR_AUTOM');
  fields.push('REDEFINED_SENSORS');

  const sentence = `INSERT INTO DUTS_DUO (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_updateInfo (qPars: {
  ID: number,
  DUT_DEVICE_ID?: number,
  SENSOR_AUTOM?: number,
  REDEFINED_SENSORS?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DUT_DEVICE_ID !== undefined) { fields.push('DUT_DEVICE_ID = :DUT_DEVICE_ID') }
  if (qPars.SENSOR_AUTOM !== undefined) { fields.push('SENSOR_AUTOM = :SENSOR_AUTOM') }
  if (qPars.REDEFINED_SENSORS !== undefined) { fields.push('REDEFINED_SENSORS = :REDEFINED_SENSORS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DUTS_DUO SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getDutDuoInfo (qPars: {
  ID?: number,
  DUT_CODE?: string,
}) {
  let sentence = `
    SELECT
        DUTS_DUO.ID AS ID,
        DUTS_DUO.DUT_DEVICE_ID AS DUT_DUO_ID,
        DUTS_DUO_EVAPORATORS.EVAPORATOR_ID AS EVAPORATOR_ID,
        DUTS_DUO.SENSOR_AUTOM AS SENSOR_AUTOM,
        DUTS_DUO.REDEFINED_SENSORS AS REDEFINED_SENSORS,
        DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID,
        DUTS_DUO_CONDENSERS.CONDENSER_ID AS CONDENSER_ID,
        DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID AS AIR_CURTAIN_ID,
        DUTS_DEVICES.PLACEMENT AS PLACEMENT
  `
  sentence += `
    FROM
    DUTS_DUO
    LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID)
    LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
    LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO.ID = DUTS_DUO_CONDENSERS.DUT_DUO_ID)
    LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
    INNER JOIN DUTS_DEVICES ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
    INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  if (qPars.ID != null) { conditions.push(`DUTS_DUO.ID = :ID`) }
  if (qPars.DUT_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DUT_CODE`) }
  
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID: number,
    DUT_DUO_ID: number
    EVAPORATOR_ID: number
    SENSOR_AUTOM: number
    REDEFINED_SENSORS: number
    ASSET_HEAT_EXCHANGER_ID: number
    CONDENSER_ID: number
    AIR_CURTAIN_ID: number
    PLACEMENT: string
  }>(sentence, qPars)
}

export async function w_deleteFromUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = `LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
	LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID)
	LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID)
	LEFT JOIN HEAT_EXCHANGERS ON (HEAT_EXCHANGERS.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `;

  const sentence = `DELETE DUTS_DUO FROM DUTS_DUO ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}



export function getDutDuoByMachineId (qPars: {
  MACHINE_ID: number,
}) {
  let sentence = `
    SELECT 
      DEVICES.DEVICE_CODE AS DUT_DUO_CODE,
      DUTS_DUO.SENSOR_AUTOM,
      DUTS_DUO.INVERT_TEMPERATURES
  `
  sentence += `
    FROM 
      MACHINES
      INNER JOIN EVAPORATORS ON MACHINES.ID = EVAPORATORS.MACHINE_ID
      INNER JOIN DUTS_DUO_EVAPORATORS ON EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID
      INNER JOIN DUTS_DUO ON DUTS_DUO_EVAPORATORS.DUT_DUO_ID = DUTS_DUO.ID
      INNER JOIN DUTS_DEVICES ON DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID
      INNER JOIN DEVICES ON DUTS_DEVICES.DEVICE_ID = DEVICES.ID
  `

  const conditions: string[] = []
  if (qPars.MACHINE_ID != null) { conditions.push(`MACHINES.ID = :MACHINE_ID`) }
  
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    DUT_DUO_CODE: string
    SENSOR_AUTOM: number
    INVERT_TEMPERATURES: boolean
  }>(sentence, qPars)
}

export function getIdDutDuoByDeviceCode(qPars: {
  DUT_CODE: string,
}) {
  let sentence = `
  SELECT DUTS_DUO.ID FROM DUTS_DUO
  LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
  LEFT JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
  WHERE DEVICES.DEVICE_CODE = :DUT_CODE AND DUTS_DEVICES.PLACEMENT = "DUO";
`

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

export async function getDutDuoInfoByClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = `LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
                LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = DUTS_DUO.DUT_DEVICE_ID)
                LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO_CONDENSERS.DUT_DUO_ID = DUTS_DUO.DUT_DEVICE_ID)
                LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID = DUTS_DUO.DUT_DEVICE_ID)
                INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
                INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)
                 `;

  const sentence = `SELECT DUTS_DUO.DUT_DEVICE_ID,
                    DUTS_DUO_EVAPORATORS.EVAPORATOR_ID,
                    DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID,
                    DUTS_DUO_CONDENSERS.CONDENSER_ID,
                    DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID,
                    DEVICES_CLIENTS.CLIENT_ID FROM DUTS_DUO ${join} 
                    WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.query<{
    DUT_DEVICE_ID: number,
    EVAPORATOR_ID: number,
    ASSET_HEAT_EXCHANGER_ID: number,
    CONDENSER_ID: number,
    AIR_CURTAIN_ID: number,
    CLIENT_ID: number
  }>(sentence, qPars)
}

export async function getDutDuoInfoByUnit (qPars: { UNIT_ID: number}, operationLogData: OperationLogData) {
  const join = `LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
	LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID)
	LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_CONDENSERS.DUT_DUO_ID)
	LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
	LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID)
	LEFT JOIN HEAT_EXCHANGERS ON (HEAT_EXCHANGERS.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
	LEFT JOIN CONDENSERS ON (CONDENSERS.ID = DUTS_DUO_CONDENSERS.CONDENSER_ID)
	LEFT JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
  INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
  INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `;

  const sentence = `SELECT 
  DUTS_DUO.DUT_DEVICE_ID,
  DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID,
  DUTS_DUO_EVAPORATORS.EVAPORATOR_ID,
  DUTS_DUO_CONDENSERS.CONDENSER_ID,
  DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID,
  ASSETS.UNIT_ID FROM DUTS_DUO ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
    dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.query<{
    DUT_DEVICE_ID: number,
    ASSET_HEAT_EXCHANGER_ID: number,
    EVAPORATOR_ID: number,
    CONDENSER_ID: number,
    AIR_CURTAIN_ID: number,
    UNIT_ID: number
  }>(sentence, qPars)
}

export async function getByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = 
    `SELECT
        DUTS_DUO.DUT_DEVICE_ID,
        DUTS_DUO_EVAPORATORS.EVAPORATOR_ID,
        DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID,
        DUTS_DUO_CONDENSERS.CONDENSER_ID,
  		DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID 
    FROM DUTS_DUO
      LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO.ID = DUTS_DUO_EVAPORATORS.DUT_DUO_ID)
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID)
      LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO.ID = DUTS_DUO_CONDENSERS.DUT_DUO_ID)
      LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO.ID = DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID)
      LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      LEFT JOIN CONDENSERS ON (CONDENSERS.ID = DUTS_DUO_CONDENSERS.CONDENSER_ID)
      LEFT JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
      WHERE EVAPORATORS.ASSET_ID = :ASSET_ID OR ASSET_HEAT_EXCHANGERS.ASSET_ID = :ASSET_ID OR CONDENSERS.ASSET_ID = :ASSET_ID OR AIR_CURTAINS.ASSET_ID = :ASSET_ID 
  `;

  if (operationLogData) {
      await saveOperationLog('DUTS_DUO', sentence, qPars, operationLogData);
      dbLogger('DUTS_DUO', sentence, qPars, operationLogData);
  }

  return sqldb.query<{
    DUT_DEVICE_ID: number,
    EVAPORATOR_ID: number,
    ASSET_HEAT_EXCHANGER_ID: number,
    CONDENSER_ID: number,
    AIR_CURTAIN_ID: number
  }>(sentence, qPars)
}

export function getDutsDuoList_dutsAndAssetsFancoil(qPars?: {
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  machineIds?: number[],
  healthIndexes?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}, admPars?: {
  addUnownedDevs?: boolean
}) {
  let sentence = `
  WITH MACHINES_ASSETS AS (
      SELECT
          MACHINE_ID,
          ASSET_ID
      FROM ASSET_HEAT_EXCHANGERS
      UNION ALL
      SELECT
          MACHINE_ID,
          ASSET_ID
      FROM CONDENSERS
      UNION ALL
      SELECT
          MACHINE_ID,
          ASSET_ID
      FROM EVAPORATORS
      UNION ALL
      SELECT
          MACHINE_ID,
          ASSET_ID
      FROM AIR_CURTAINS
  )
  SELECT
      DEVICES.DEVICE_CODE AS DUT_DUO_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      MACHINES.ID AS GROUP_ID,
      MACHINES.NAME AS GROUP_NAME,
      DEVICES_UNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      ASSETS_HEALTH_HIST.H_INDEX,
      CLIENTS.NAME AS CLIENT_NAME,
      DEVICES_CLIENTS.CLIENT_ID,
      ASSETS_HEALTH_HIST.H_DESC,
      ASSETS.DAT_CODE AS DAT_ID,
      ASSETS.NAME AS AST_DESC,
      ASSETS.ID AS ASSET_ID,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM DUTS_DUO
      INNER JOIN DUTS_DEVICES ON DUTS_DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID
      INNER JOIN DEVICES ON DEVICES.ID = DUTS_DEVICES.DEVICE_ID
      INNER JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
      INNER JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
      INNER JOIN CLUNITS ON CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID
      LEFT JOIN TIME_ZONES ON TIME_ZONES.ID = CLUNITS.TIMEZONE_ID
      INNER JOIN CLIENTS ON CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID
      LEFT JOIN CITY ON CITY.CITY_ID = CLUNITS.CITY_ID
      LEFT JOIN STATEREGION ON STATEREGION.ID = CITY.STATE_ID
      LEFT JOIN DUTS_DUO_EVAPORATORS ON DUTS_DUO_EVAPORATORS.DUT_DUO_ID = DUTS_DUO.ID
      LEFT JOIN EVAPORATORS ON EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = DUTS_DUO.ID
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON ASSET_HEAT_EXCHANGERS.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID
      LEFT JOIN DUTS_DUO_CONDENSERS ON DUTS_DUO_CONDENSERS.DUT_DUO_ID = DUTS_DUO.ID
      LEFT JOIN CONDENSERS ON CONDENSERS.ID = DUTS_DUO_CONDENSERS.CONDENSER_ID
      LEFT JOIN DUTS_DUO_AIR_CURTAINS ON DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID = DUTS_DUO.ID
      LEFT JOIN AIR_CURTAINS ON AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID
      LEFT JOIN MACHINES_ASSETS ON MACHINES_ASSETS.ASSET_ID = COALESCE(
          ASSET_HEAT_EXCHANGERS.ASSET_ID,
          CONDENSERS.ASSET_ID,
          EVAPORATORS.ASSET_ID,
          AIR_CURTAINS.ASSET_ID
      )
      LEFT JOIN MACHINES ON MACHINES.ID = MACHINES_ASSETS.MACHINE_ID
      LEFT JOIN ASSETS ON ASSETS.ID = MACHINES_ASSETS.ASSET_ID
      LEFT JOIN ASSETS_HEALTH ON ASSETS_HEALTH.ASSET_ID = ASSETS.ID
      LEFT JOIN ASSETS_HEALTH_HIST ON ASSETS_HEALTH_HIST.ID = ASSETS_HEALTH.HEALTH_HIST_ID
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length && admPars.addUnownedDevs) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID IN (:clientIds) OR DEVICES_CLIENTS.CLIENT_ID IS NULL)`) }
  if (qPars.clientIds?.length && !admPars.addUnownedDevs) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID IN (:clientIds))`) }
  if (qPars.stateIds?.length) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds?.length) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds?.length) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.machineIds?.length) { conditions.push(`MACHINES.ID IN (:machineIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }
  if (qPars.healthIndexes?.length) { conditions.push(`ASSETS_HEALTH_HIST.H_INDEX IN (:healthIndexes)`) }
  conditions.push(`MACHINES.APPLICATION = 'fancoil'`)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DUT_DUO_ID: string
    CITY_NAME: string
    STATE_ID: string
    GROUP_ID: number
    GROUP_NAME: string
    UNIT_ID: number
    UNIT_NAME: string
    H_INDEX: number
    CLIENT_NAME: string
    CLIENT_ID: number
    H_DESC: string
    DAT_ID: string
    AST_DESC: string
    ASSET_ID: number
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

export function getDutsDuoListFancoilFR(qPars?: {
  CLIENT_IDS?: number[], LAST_CFG_MODIF?: string
}, admPars?: {
  addUnownedDevs?: boolean
}) {
  let sentence = `
    SELECT
	    MACHINES.ID AS GROUP_ID,
	    MACHINES.NAME AS GROUP_NAME,
	    CLUNITS.UNIT_ID,
	    CLIENTS.CLIENT_ID,
	    DEVICES.DEVICE_CODE AS DUT_ID,
	    CLIENTS.NAME,
	    CLUNITS.UNIT_NAME,
	    DEVICES.LAST_CFG_MODIF,
	    CURRENT_AUTOMATIONS_PARAMETERS.SETPOINT,
      MACHINES.APPLICATION
  `
  sentence += `
        FROM
      DUTS_DUO
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_DUO.DUT_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO_EVAPORATORS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DUTS_DUO_EVAPORATORS.EVAPORATOR_ID)
      LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO_CONDENSERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN CONDENSERS ON (CONDENSERS.ID = DUTS_DUO_CONDENSERS.CONDENSER_ID)
      LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      INNER JOIN MACHINES ON MACHINES.ID = COALESCE (ASSET_HEAT_EXCHANGERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, CONDENSERS.MACHINE_ID, AIR_CURTAINS.MACHINE_ID)
      LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(ASSET_HEAT_EXCHANGERS.ASSET_ID, CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, AIR_CURTAINS.ASSET_ID))
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = MACHINES.ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.PRODUCTION = 1`)
  if (qPars.LAST_CFG_MODIF) { conditions.push(`DEVICES.LAST_CFG_MODIF >= :LAST_CFG_MODIF`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    GROUP_ID: number
    GROUP_NAME: string
    UNIT_ID: number
    CLIENT_ID: number
    DUT_ID: string
    CLIENT_NAME: string
    UNIT_NAME: string
    SETPOINT: number
    LAST_CFG_MODIF: string
    APPLICATION: string
  }>(sentence, qPars)
}

export function getDutDuoInfosByDutDuoId(qPars: {
  DUT_DEVICE_ID: number
}) {
  let sentence = `
    SELECT
      DUTS_DUO.ID,
      DUTS_DUO.DUT_DEVICE_ID,
      DUTS_DUO.SENSOR_AUTOM,
      DUTS_DUO.REDEFINED_SENSORS
  `
  sentence += `
    FROM
      DUTS_DUO
  `

  const conditions: string[] = []
  if (qPars.DUT_DEVICE_ID != null) { conditions.push(`DUTS_DUO.DUT_DEVICE_ID = :DUT_DEVICE_ID`) }
  
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID: number
    DUT_DUO_ID: number
    SENSOR_AUTOM: number
    REDEFINED_SENSORS: number
  }>(sentence, qPars)
}
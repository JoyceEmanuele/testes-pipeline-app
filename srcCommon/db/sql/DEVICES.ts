import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'
import { ControlMode } from '../../../srcCommon/helpers/dutAutomation';

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM DEVICES
  FIELD DEVICES.DEVICE_CODE
  FIELD DEVICES.DAT_BEGMON
*/
export async function w_insertIgnore (qPars: { DEVICE_CODE: string, DAT_BEGMON?: string, MAC?: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_CODE')
  if (qPars.DAT_BEGMON !== undefined) { fields.push('DAT_BEGMON'); }
  if (qPars.MAC !== undefined) { fields.push('MAC'); }

  const sentence = `INSERT IGNORE INTO DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteDevice(qPars: { DEVICE_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES WHERE DEVICES.ID = :DEVICE_ID`;

  if (operationLogData) {
      await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
      dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DEVICES.ID}
  FROM DEVICES
  WHERE {DEVICES.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID?: number, DEVICE_CODE?: string}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  
  let sentence = `DELETE FROM DEVICES`;
  
  if (qPars.ID) { conditions.push(`ID = :ID`)}  
  if (qPars.DEVICE_CODE) { conditions.push(`DEVICE_CODE = :DEVICE_CODE`)}

  if (conditions.length === 0) {
    throw new Error('Error: Forbidden to delete without conditions!');
  }

  sentence += ' WHERE ' + conditions.join(' AND ')

  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getDeviceIdByDeviceCode(qPars: { DEVICE_CODE: string }) {
  const sentence =`
    SELECT
      DEVICES.ID AS DEVICE_ID
    FROM
      DEVICES
    WHERE 
      DEVICES.DEVICE_CODE = :DEVICE_CODE
  `
  return sqldb.querySingle<{
    DEVICE_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getIdByCode = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DEVICES
  SELECT DEVICES.ID
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export function getIdByCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DEVICES.ID
  `
  sentence += `
    FROM
      DEVICES
  `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE `

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

export function getDevDatBegMon (qPars: { DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DEVICES.ID AS DEVICE_ID,
      DEVICES.DAT_BEGMON
  `
  sentence += `
    FROM
      DEVICES
  `

  sentence += ` WHERE DEVICES.ID = :DEVICE_ID `

  return sqldb.querySingle<{
    DEVICE_ID: string
    DAT_BEGMON: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC w_delete = DELETE
  FROM DEVICES
*/
export async function w_delete(qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES WHERE DEVICES.ID = :ID `;

  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRows (qPars: { ID: number[]}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES WHERE DEVICES.ID IN (:ID)`;
  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEV_ID: string }, delChecks: {
  DAMS: true,
  DEVACS: true,
  DEVFWVERS: true,
  DRIS: true,
  DUTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES WHERE DEVICES.DEVICE_CODE = :DEV_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DEVICES
  FIELD DEVICES.DEVICE_CODE
*/
export async function w_insert (qPars: { DEVICE_CODE: string, DAT_BEGMON: string, }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_CODE')
  fields.push('DAT_BEGMON')

  const sentence = `INSERT INTO DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteFromCode = DELETE
  FROM DEVICES
*/
export async function w_deleteFromCode(qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVICES WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE `;

  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DEVICES
  FIELD [[IFOWNPROP {:DAT_BEGMON}]] DEVICES.DAT_BEGMON
  FIELD [[IFOWNPROP {:BT_ID}]] DEVICES.BT_ID
  FIELD [[IFOWNPROP {:DEVICE_CODE}]] DEVICES.DEVICE_CODE
  FROM DEVICES_CLIENTS
  WHERE {DEVICES.ID} = {:ID}
  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export async function w_updateInfo (qPars: {
  ID?: number,
  DEVICE_CODE?: string,
  BT_ID?: string,
  LAST_CFG_MODIF?: string,
  DAT_BEGMON?: string,
  LTE_ICCID?: string,
  LTE_NETWORK?: string,
  LTE_RSRP?: number,
  LTE_OPERATOR?: string,
  MAC?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  const conditions: string[] = []
  if (qPars.BT_ID !== undefined) { fields.push('BT_ID = :BT_ID') }
  if (qPars.LAST_CFG_MODIF !== undefined) { fields.push('LAST_CFG_MODIF = :LAST_CFG_MODIF') }
  if (qPars.DAT_BEGMON !== undefined) { fields.push('DAT_BEGMON = :DAT_BEGMON') }
  if (qPars.LTE_ICCID !== undefined) { fields.push('LTE_ICCID = :LTE_ICCID') }
  if (qPars.LTE_NETWORK !== undefined) { fields.push('LTE_NETWORK = :LTE_NETWORK') }
  if (qPars.LTE_RSRP !== undefined) { fields.push('LTE_RSRP = :LTE_RSRP') }
  if (qPars.LTE_OPERATOR !== undefined) { fields.push('LTE_OPERATOR = :LTE_OPERATOR') }
  if (qPars.MAC !== undefined) { fields.push('MAC = :MAC') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  if (qPars.ID) { conditions.push(`ID = :ID`)}
  if (qPars.DEVICE_CODE) { conditions.push(`DEVICE_CODE = :DEVICE_CODE`)}

  const sentence = `UPDATE DEVICES SET ${fields.join(', ')} WHERE ${conditions.join(' AND ')}`

  if (operationLogData) {
    await saveOperationLog('DEVICES', sentence, qPars, operationLogData);
    dbLogger('DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDeviceInfo = SELECT ROW
  PARAM DEVICE_CODE: {DEVICES.DEVICE_CODE}
  FROM DEVICES
  LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  LEFT JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
  LEFT JOIN CLIENTS ON (DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID)
  LEFT JOIN CITY ON (CLUNITS.CITY_ID = CITY.CITY_ID)
  LEFT JOIN STATEREGION ON (CITY.STATE_ID = STATEREGION.ID)
  LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)

  SELECT DEVICES.DEVICE_CODE AS DEV_ID,
  SELECT DEVICES.BT_ID,
  SELECT DEVICES.DAT_BEGMON,
  SELECT CLUNITS.UNIT_ID,
  SELECT CLUNITS.UNIT_NAME,
  SELECT CLIENTS.CLIENT_ID,
  SELECT CLIENTS.NAME AS CLIENT_NAME,
  SELECT CITY.NAME AS CITY_NAME,
  SELECT STATEREGION.NAME AS STATE_ID,
  SELECT CLUNITS.TIMEZONE_ID,
  SELECT TIME_ZONES.AREA AS TIMEZONE_AREA,
  SELECT TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET

  WHERE {DEVICES.DEVICE_CODE} = {:DEVICE_CODE}
*/
export function getDeviceExtraInfo (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES.ID AS DEVICE_ID,
      DEVICES.BT_ID,
      DEVICES.DAT_BEGMON,
      DEVICES.LTE_NETWORK,
      DEVICES.LTE_RSRP,
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      CLUNITS.TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
      LEFT JOIN CLIENTS ON (DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID)
      LEFT JOIN CITY ON (CLUNITS.CITY_ID = CITY.CITY_ID)
      LEFT JOIN STATEREGION ON (CITY.STATE_ID = STATEREGION.ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
  `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE `

  return sqldb.querySingle<{
    DEV_ID: string
    DEVICE_ID: number
    BT_ID: string
    LTE_NETWORK: string
    LTE_RSRP: number
    DAT_BEGMON: string
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_ID: number
    CLIENT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}
/* @IFHELPER:FUNC getDevicesList = SELECT ROWS
  PARAM CLIENT_IDS?: {DEVICES_CLIENTS.CLIENT_ID}
  PARAM UNIT_IDS?: {DEVICES_UNITS.UNIT_ID}
  PARAM device?: string

  FROM
    DEVICES
  LEFT JOIN DALS ON DALS.DEVICE_ID = DEVICES.ID
  LEFT JOIN DMTS ON DMTS.DEVICE_ID = DEVICES.ID
  LEFT JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
  LEFT JOIN CLIENTS ON DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID
  LEFT JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
  LEFT JOIN CLUNITS ON DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID
  LEFT JOIN CITY ON CLUNITS.CITY_ID = CITY.CITY_ID
  LEFT JOIN STATEREGION ON STATEREGION.ID = CITY.STATE_ID

  SELECT
    DEVICES.ID AS DEVICE_ID,
    DEVICES.DEVICE_CODE,
    DEVICES_CLIENTS.CLIENT_ID,
    DEVICES_UNITS.UNIT_ID,
    CLUNITS.UNIT_NAME,
    CLIENTS.NAME AS CLIENT_NAME,
    CITY.NAME AS CITY_NAME,
    STATEREGION.NAME AS STATE,
  CASE
    WHEN (DALS.DEVICE_ID IS NOT NULL) THEN 'DAL'
    WHEN (DMTS.DEVICE_ID IS NOT NULL) THEN 'DMT'
  END AS 'TYPE'
*/
export async function getDevicesList(qPars: {
  CLIENT_IDS?: number[],
  UNIT_IDS?: number[],
  device?: 'all'| 'dac' | 'dal' | 'dam' | 'dma' | 'dmt' | 'dri' | 'dut',
  CLIENT_ID?: number,
  INCLUDE_INSTALLATION_UNIT?: boolean,
  INCLUDE_UNOWED_DEVS?: boolean,
  stateIds?: string[],
  cityIds?: string[],
}) {
  let sentence = `
    SELECT 
      DEVICES.ID AS DEVICE_ID,
      DEVICES.DEVICE_CODE,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID AS CITY_ID,
      STATEREGION.NAME AS STATE,
      STATEREGION.ID AS STATE_ID,
      CASE
        WHEN (DACS_DEVICES.DEVICE_ID IS NOT NULL) THEN 'DAC'
        WHEN (DALS.DEVICE_ID IS NOT NULL) THEN 'DAL'
        WHEN (DAMS_DEVICES.DEVICE_ID IS NOT NULL) THEN 'DAM'
        WHEN (DMAS_DEVICES.DEVICE_ID IS NOT NULL) THEN 'DMA'
        WHEN (DMTS.DEVICE_ID IS NOT NULL) THEN 'DMT'
        WHEN (DRIS_DEVICES.DEVICE_ID IS NOT NULL) THEN 'DRI'
        WHEN (DUTS_DEVICES.DEVICE_ID IS NOT NULL) THEN 'DUT'
      END AS 'TYPE',
      DEVICES.MAC
  `

  sentence += `
    FROM
      DEVICES
    LEFT JOIN DACS_DEVICES ON DACS_DEVICES.DEVICE_ID = DEVICES.ID
    LEFT JOIN DALS ON DALS.DEVICE_ID = DEVICES.ID
    LEFT JOIN DAMS_DEVICES ON DAMS_DEVICES.DEVICE_ID = DEVICES.ID
    LEFT JOIN DMAS_DEVICES ON DMAS_DEVICES.DEVICE_ID = DEVICES.ID
    LEFT JOIN DMTS ON DMTS.DEVICE_ID = DEVICES.ID
    LEFT JOIN DRIS_DEVICES ON DRIS_DEVICES.DEVICE_ID = DEVICES.ID
    LEFT JOIN DUTS_DEVICES ON DUTS_DEVICES.DEVICE_ID = DEVICES.ID
    LEFT JOIN DEVICES_CLIENTS ON DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID
    LEFT JOIN CLIENTS ON DEVICES_CLIENTS.CLIENT_ID = CLIENTS.CLIENT_ID
    LEFT JOIN DEVICES_UNITS ON DEVICES_UNITS.DEVICE_ID = DEVICES.ID
    LEFT JOIN CLUNITS ON DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID
    LEFT JOIN CITY ON CLUNITS.CITY_ID = CITY.CITY_ID
    LEFT JOIN STATEREGION ON STATEREGION.ID = CITY.STATE_ID
  `

  const conditions: string[] = []
  if (qPars.CLIENT_IDS?.length && qPars.INCLUDE_UNOWED_DEVS) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID IN (:CLIENT_IDS) OR DEVICES_CLIENTS.CLIENT_ID IS NULL)`) }
  if (qPars.CLIENT_IDS?.length && !qPars.INCLUDE_UNOWED_DEVS) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:CLIENT_IDS)`) }
  if (qPars.UNIT_IDS?.length) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:UNIT_IDS)`) }
  if (qPars.device === 'dac') { conditions.push('DACS_DEVICES.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dal') { conditions.push('DALS.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dam') { conditions.push('DAMS_DEVICES.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dma') { conditions.push('DMAS_DEVICES.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dmt') { conditions.push('DMTS.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dri') { conditions.push('DRIS_DEVICES.DEVICE_ID IS NOT NULL') }
  if (qPars.device === 'dut') { conditions.push('DUTS_DEVICES.DEVICE_ID IS NOT NULL') }
  if (qPars.CLIENT_ID != null) { conditions.push(`(DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEVICE_ID: number
    DEVICE_CODE: string
    TYPE: 'DAC' | 'DAL' | 'DAM' | 'DMA' | 'DMT' | 'DRI' | 'DUT',
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CITY_NAME: string
    CITY_ID: string
    STATE: string
    STATE_ID: number
    MAC: string
  }>(sentence, qPars);
}

export function getDmtId(qPars: { DMT_CODE: string }) {
  let sentence = `
    SELECT
      DMTS.ID
  `
  sentence += `
    FROM
      DEVICES
      INNER JOIN DMTS ON (DMTS.DEVICE_ID = DEVICES.ID)
      `
  sentence += ` WHERE DEVICES.DEVICE_CODE = :DMT_CODE `

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

export function getDalCode(qPars: { ILLUM_ID: number }) {
  let sentence = `
    SELECT DISTINCT
      DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM
      DEVICES
      INNER JOIN DALS ON (DALS.DEVICE_ID = DEVICES.ID)
      INNER JOIN DALS_ILLUMINATIONS di ON (di.DAL_ID = DALS.ID)
      `
  sentence += ` WHERE di.ILLUMINATION_ID = :ILLUM_ID`

  return sqldb.querySingle<{
    DEVICE_CODE: string
  }>(sentence, qPars)
}

export function getDevicesInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DEVICES.ID AS DEVICE_ID,
      DAMS_DEVICES.ID AS DAM_DEVICE_ID,
      DACS_DEVICES.ID AS DAC_DEVICE_ID,
      DUTS_DEVICES.ID AS DUT_DEVICE_ID,
      DRIS_DEVICES.ID AS DRI_DEVICE_ID
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    DEVICE_ID: number
    DAM_DEVICE_ID: number
    DAC_DEVICE_ID: number
    DUT_DEVICE_ID: number
    DRI_DEVICE_ID: number
  }>(sentence, qPars)
}

export function getRoomFromDevicesInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DUT_CODE,
      DUTS_DEVICES_ROOMS.ID AS DUT_DEVICE_ROOM_ID,
      DUTS_DEVICES_ROOMS.DUT_DEVICE_ID AS DUT_DEVICE_ID,
      DUTS_DEVICES_ROOMS.ROOM_ID AS ROOM_ID
      `
  sentence += `
      FROM
        DEVICES 
        INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
        INNER JOIN DUTS_DEVICES_ROOMS ON (DUTS_DEVICES_ROOMS.DUT_DEVICE_ID = DUTS_DEVICES.ID)
    `
  
  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }
  
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.querySingle<{
    DUT_CODE: string
    DUT_DEVICE_ROOM_ID: number
    DUT_DEVICE_ID: number
    ROOM_ID: number
  }>(sentence, qPars)
}
  
export function getMachineAutomationInfo (qPars: {
  DEVICE_CODE: string,
  MACHINE_ID: number
}) {
  let sentence = `
    SELECT
      DEVICES.ID AS DEVICE_ID,
      DAMS_DEVICES.ID AS DAM_DEVICE_ID,
      DACS_DEVICES.ID AS DAC_DEVICE_ID
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_AUTOMATIONS ON (DACS_AUTOMATIONS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
  `
  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`(DEVICES.DEVICE_CODE = :DEVICE_CODE)`) }
  // Temporário: Filtrar também iluminação que seja automatizada por DAM
  if (qPars.MACHINE_ID != null) { conditions.push(`COALESCE(DAMS_AUTOMATIONS.MACHINE_ID, DACS_AUTOMATIONS.MACHINE_ID, DAMS_ILLUMINATIONS.ILLUMINATION_ID) = :MACHINE_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  return sqldb.querySingle<{
    DEVICE_ID: number,
    DAM_DEVICE_ID: number,
    DAC_DEVICE_ID: number,
  }>(sentence, qPars)
}

export function getWaterFromDevicesInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DMA_CODE,
      WATERS.ID AS WATER_ID,
      `
  sentence += `
    FROM
      DEVICES 
      INNER JOIN DMAS_DEVICES ON (DMAS_DEVICES.DEVICES_ID = DEVICES.ID)
      INNER JOIN WATERS ON (WATERS.ID = DMAS_DEVICES.WATER_ID)
    `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  return sqldb.querySingle<{
    DMA_CODE: string
    WATER_ID: number
  }>(sentence, qPars)
}

export function getBasicInfo (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES.ID AS DEVICE_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_CLIENTS.ID AS DEVICE_CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_UNITS.ID AS DEVICE_UNIT_ID,
      CASE WHEN DACS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS DAC_ID,
      CASE WHEN DAMS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS DAM_ID,
      CASE WHEN DUTS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS DUT_ID,
      CASE WHEN DRIS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS DRI_ID,
      DEVFWVERS.CURRFW_VERS AS CURRFW_VERS
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :devId `

  return sqldb.querySingle<{
    DEV_ID: string
    DEVICE_ID: number
    CLIENT_ID: number
    DEVICE_CLIENT_ID: number
    UNIT_ID: number
    DEVICE_UNIT_ID: number
    DAC_ID: string
    DAM_ID: string
    DUT_ID: string
    DRI_ID: string
    CURRFW_VERS: string
  }>(sentence, qPars)
}

export function getDevsDetails (qPars: {
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[]
  devIds?: string[],
}) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      MACHINES.ID AS MACHINE_ID,
      MACHINES.NAME AS MACHINE_NAME,
      ASSETS_HEALTH_HIST.H_INDEX,
      ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME,
      ASSETS.ID AS ASSET_ID
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DUTS_DUO ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN DUTS_DUO_AIR_CURTAINS ON (DUTS_DUO_AIR_CURTAINS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO_CONDENSERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO_EVAPORATORS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.DUT_MONITORING_ID = DUTS_MONITORING.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DACS_AUTOMATIONS ON (DACS_AUTOMATIONS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN DRIS_ASSET_HEAT_EXCHANGERS ON (DRIS_ASSET_HEAT_EXCHANGERS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = COALESCE(DRIS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID, DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID))
      LEFT JOIN CONDENSERS ON (CONDENSERS.ID = COALESCE(DACS_CONDENSERS.CONDENSER_ID, DUTS_DUO_CONDENSERS.CONDENSER_ID))
      LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = COALESCE(DACS_EVAPORATORS.EVAPORATOR_ID, DUTS_DUO_EVAPORATORS.EVAPORATOR_ID))
      LEFT JOIN AIR_CURTAINS ON (AIR_CURTAINS.ID = DUTS_DUO_AIR_CURTAINS.AIR_CURTAIN_ID)
      LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(ASSET_HEAT_EXCHANGERS.ASSET_ID, CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, AIR_CURTAINS.ASSET_ID))
      LEFT JOIN MACHINES ON MACHINES.ID = COALESCE(DAMS_AUTOMATIONS.MACHINE_ID, DUTS_AUTOMATION.MACHINE_ID, DACS_AUTOMATIONS.MACHINE_ID, DRIS_AUTOMATIONS.MACHINE_ID, DUTS_REFERENCE.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID, CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, AIR_CURTAINS.MACHINE_ID)
      LEFT JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ASSET_ID = ASSETS.ID)
      LEFT JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH_HIST.ID = ASSETS_HEALTH.HEALTH_HIST_ID)
      LEFT JOIN REFRIGERATES ON (REFRIGERATES.MACHINE_ID = MACHINES.ID)
      LEFT JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = REFRIGERATES.ENVIRONMENT_ID)
  `

  const conditions: string[] = []
  if (qPars.devIds?.length > 0) { conditions.push(`DEVICES.DEVICE_CODE IN (:devIds)`) }
  if (qPars.clientIds?.length > 0) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds?.length > 0) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds?.length > 0) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds?.length > 0) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEV_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    MACHINE_ID: number
    MACHINE_NAME: string
    H_INDEX: number
    ROOM_NAME: string
    ASSET_ID: number
  }>(sentence, qPars)
}

export function getDevPreLoadInfo (qPars: { DEV_ID: string }) {
  let sentence = `
    SELECT
      DEVICES.ID,
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES.ID AS DEVICE_ID,
      DEVICES.MAC,
      CASE WHEN DUTS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DUT,
      CASE WHEN DMAS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DMA,
      CASE WHEN DAMS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DAM,
      CASE WHEN DACS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DAC,
      CASE WHEN DRIS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DRI,
      CASE WHEN DMTS.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DMT,
      CASE WHEN DALS.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_DAL,
      CASE WHEN ENERGY_DEVICES_INFO.ID IS NOT NULL THEN DEVICES.DEVICE_CODE END AS AS_ENERGY
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DMAS_DEVICES ON (DMAS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DALS ON (DALS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DMTS ON (DMTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEV_ID `

  return sqldb.querySingle<{
    ID: number
    DEV_ID: string
    AS_DUT: string
    AS_DAM: string
    AS_DAC: string
    AS_DRI: string
    AS_DMA: string
    AS_ENERGY: string
    MAC: string
  }>(sentence, qPars)
}

export function getDevSchedInfo (qPars: { DEV_ID: string }) {
  let sentence = "";

  if (qPars.DEV_ID.startsWith('DAM')) {
    sentence = `
      SELECT
        DEVICES.DEVICE_CODE AS DEV_ID,
        CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG AS DAM_DESIREDPROG,
        CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG AS DAM_LASTPROG,
        DAMS_DEVICES.DISAB AS DAM_DISAB,
        NULL AS_DAC,
        NULL AS DUT_DESIREDPROG,
        NULL AS DUT_LASTPROG,
        NULL AS DUTAUT_DISAB,
        DAMS_AUTOMATIONS.MACHINE_ID AS MACHINE_ID
    `
    sentence += `
      FROM
        DEVICES
        INNER JOIN DAMS_DEVICES ON (DEVICES.ID = DAMS_DEVICES.DEVICE_ID)
        LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
        LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
        LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DAMS_AUTOMATIONS.MACHINE_ID)
        LEFT JOIN ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ON (ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)
        LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (
          CURRENT_AUTOMATIONS_PARAMETERS.ID = 
          COALESCE(MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID,
            ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
          )
        )
    `
  }
  else if (qPars.DEV_ID.startsWith('DUT')) {
    sentence = `
      SELECT
        DEVICES.DEVICE_CODE AS DEV_ID,
        NULL AS DAM_DESIREDPROG,
        NULL AS DAM_LASTPROG,
        NULL AS DAM_DISAB,
        NULL AS_DAC,
        CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG AS DUT_DESIREDPROG,
        CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG AS DUT_LASTPROG,
        DUTS_AUTOMATION.DISAB AS DUTAUT_DISAB,
        DUTS_AUTOMATION.MACHINE_ID AS MACHINE_ID
    `
    sentence += `
      FROM
        DEVICES
        INNER JOIN DUTS_DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
        LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
        LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
        LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID)
    `
  }
  else {
    sentence = `
      SELECT
        DEVICES.DEVICE_CODE AS DEV_ID,
        NULL AS DAM_DESIREDPROG,
        NULL AS DAM_LASTPROG,
        NULL AS DAM_DISAB,
        DEVICES.DEVICE_CODE AS_DAC,
        NULL AS DUT_DESIREDPROG,
        NULL AS DUT_LASTPROG,
        NULL AS DUTAUT_DISAB,
        DACS_AUTOMATIONS.MACHINE_ID AS MACHINE_ID
    `
    sentence += `
      FROM
        DEVICES
        INNER JOIN DACS_DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
        LEFT JOIN DACS_AUTOMATIONS ON (DACS_AUTOMATIONS.DAC_DEVICE_ID = DACS_DEVICES.ID)
        LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DACS_AUTOMATIONS.MACHINE_ID)
        LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID)
    `
  }

  sentence += ` WHERE DEVICES.DEVICE_CODE = :DEV_ID LIMIT 1 ` // TODO: este "LIMIT 1" é gambiarra, a query não deveria retornar mais do que 1 linha

  return sqldb.querySingle<{
    DEV_ID: string
    DAM_DESIREDPROG: string
    DAM_LASTPROG: string
    DAM_DISAB: number
    AS_DAC: string
    DUT_DESIREDPROG: string
    DUT_LASTPROG: string
    DUTAUT_DISAB: number
    MACHINE_ID: number
  }>(sentence, qPars)
}

export function getListNotifs (qPars: { devIds?: string[], machineIds?: number[], unitIds?: number[], clientIds?: number[] }, admPars: { devType?: 'dac'|'dut'|'dme'|'dma' }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_UNITS.UNIT_ID
  `
  if (qPars.machineIds) { sentence += ' ,MACHINES.ID AS MACHINE_ID ' }
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  `
  if (qPars.machineIds || (admPars.devType === 'dac')) { 
    sentence += ` 
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
    LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
    LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
    LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
    LEFT JOIN CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
    LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
    LEFT JOIN MACHINES ON (MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID))
    `
  }
  if ((admPars.devType === 'dut')) { sentence += `
    INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID) 
   ` }
  if ((admPars.devType === 'dme')) { sentence += ` 
    INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
    INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.DRI_DEVICE_ID = DRIS_DEVICES.ID)  
    INNER JOIN ENERGY_DEVICES_INFO ON (ENERGY_DEVICES_INFO.ID = DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID)  
    ` 
  }

  if ((admPars.devType === 'dma')) { sentence += ` 
    INNER JOIN DMAS_DEVICES ON (DMAS_DEVICES.DEVICE_ID = DEVICES.ID)
    ` }

  const conditions: string[] = []
  if (qPars.devIds) { conditions.push(`DEVICES.DEVICE_CODE IN (:devIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.machineIds) { conditions.push(`MACHINES.ID IN (:machineIds)`) }
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEV_ID: string
    UNIT_ID: number
    MACHINE_ID?: number
  }>(sentence, qPars)
}

export function getClientDevsCount (qPars: { dielClientId: number }) {
  let sentence = `
    SELECT
      (COUNT(1)) AS DEVS_COUNT
  `
  sentence += `
    FROM
      DEVICES
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
  `

  const conditions: string[] = []
  conditions.push(`DEVICES_CLIENTS.CLIENT_ID <> :dielClientId`)
  conditions.push(`CLIENTS.PERMS_C LIKE '%[C]%'`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    DEVS_COUNT: number
  }>(sentence, qPars)
}

export function getClientDevsList (qPars: {
  dielClientId: number,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID
  `
  sentence += `
    FROM
      DEVICES
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID) 
  `
  if (qPars.stateIds || qPars.cityIds || qPars.INCLUDE_INSTALLATION_UNIT === false) { sentence += ' INNER JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID) ' }
  if (qPars.stateIds) { sentence += ` 
    INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)  
    LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    ` 
  }

  const conditions: string[] = []
  conditions.push(`DEVICES_CLIENTS.CLIENT_ID <> :dielClientId`)
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }
  conditions.push(`CLIENTS.PERMS_C LIKE '%[C]%'`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    DEV_ID: string
  }>(sentence, qPars)
}

export function getClientInfo (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLIENTS.PERMS_C
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :devId `

  return sqldb.querySingle<{
    DEV_ID: string
    CLIENT_ID: number
    PERMS_C: string
  }>(sentence, qPars)
}

export function getDevsList (qPars: { clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[], devIds?: string[] }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.devIds) { conditions.push(`DEVICES.DEVICE_CODE IN (:devIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEV_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

export function getAutomDevsList (qPars: { clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[], INCLUDE_INSTALLATION_UNIT?: boolean }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      (CASE WHEN CUR_DUT_AUT_PAR.ID IS NOT NULL THEN DEVICES.DEVICE_CODE ELSE NULL END) AS HAS_DUT_AUT,
      CUR_DUT_AUT_PAR.MODE AS DUTAUT_CTRLOPER,
      DUTS_AUTOMATION.DISAB AS DUTAUT_DISABLED,
      CUR_DUT_AUT_PAR.LAST_PROG AS DUT_LASTPROG,
      (CASE WHEN CUR_DAM_AUT_PAR.ID IS NOT NULL THEN DEVICES.DEVICE_CODE ELSE NULL END) AS HAS_DAM,
      CUR_DAM_AUT_PAR.FAULTS_DATA AS FAULTSDATA_DAM,
      CUR_DAM_AUT_PAR.ENABLE_ECO AS ENABLE_ECO_DAM,
      DAMS_DEVICES.DISAB AS DAM_DISABLED,
      COALESCE(CUR_DAM_AUT_PAR.LAST_PROG, CUR_DAM_ILL_PAR.LAST_PROG) AS DAM_LASTPROG,
      CUR_DAM_AUT_PAR.SELF_REFERENCE AS SELF_REFERENCE,
      (CASE WHEN DRIS_AUTOMATIONS.ID IS NOT NULL THEN DEVICES.DEVICE_CODE ELSE NULL END) AS HAS_DRI,
      DEVICES_REF.DEVICE_CODE AS DUT_REF_ID,
      CUR_DUT_AUT_PAR.ENABLE_ECO AS DRI_ENABLE_ECO,
      DUTS_DEVICES.LAST_TEMPERATURE_CONTROL_CFG,
      DRIS_DEVICES.LASTCFGSEND AS DRI_LASTCFGSEND,
      VAVS.VAV_ID AS IS_VAV,
      SCHEDULES.NEED_MULT_SCHEDULES AS DUT_NEED_MULT_SCHEDULES,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.TUSEMAX,
      CUR_DAM_AUT_PAR.MINIMUM_TEMPERATURE,
      CUR_DAM_AUT_PAR.MAXIMUM_TEMPERATURE,
      CUR_DRI_AUT_PAR.LAST_PROG AS DRI_LASTPROG
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_DEVICES.ID = DRIS_AUTOMATIONS.DRI_DEVICE_ID)
      LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_DEVICES.ID = DAMS_ILLUMINATIONS.DAM_DEVICE_ID)
      LEFT JOIN VAVS ON (DRIS_DEVICES.ID IS NOT NULL AND VAVS.VAV_ID = DEVICES.DEVICE_CODE)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS CUR_MACHINE_DAM_AUT_PAR ON (CUR_MACHINE_DAM_AUT_PAR.MACHINE_ID = DAMS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS CUR_DAM_AUT_PAR ON (CUR_DAM_AUT_PAR.ID = CUR_MACHINE_DAM_AUT_PAR.CURRENT_AUTOMATION_PARAMETERS_ID)  
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS CUR_MACHINE_DUT_AUT_PAR ON (CUR_MACHINE_DUT_AUT_PAR.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS CUR_DUT_AUT_PAR ON (CUR_DUT_AUT_PAR.ID = CUR_MACHINE_DUT_AUT_PAR.CURRENT_AUTOMATION_PARAMETERS_ID)  
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS CUR_MACHINE_DRI_AUT_PAR ON (CUR_MACHINE_DRI_AUT_PAR.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS CUR_DRI_AUT_PAR ON (CUR_DRI_AUT_PAR.ID = CUR_MACHINE_DRI_AUT_PAR.CURRENT_AUTOMATION_PARAMETERS_ID)  
      LEFT JOIN ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS CUR_ILLUMINATION_DAM_ILL_PAR ON (CUR_ILLUMINATION_DAM_ILL_PAR.ILLUMINATION_ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS CUR_DAM_ILL_PAR ON (CUR_DAM_ILL_PAR.ID = CUR_ILLUMINATION_DAM_ILL_PAR.CURRENT_AUTOMATION_PARAMETERS_ID)  
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = COALESCE(CUR_MACHINE_DRI_AUT_PAR.MACHINE_ID, CUR_MACHINE_DUT_AUT_PAR.MACHINE_ID, CUR_MACHINE_DAM_AUT_PAR.MACHINE_ID))
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_DEVICES DUTS_DEVICES_REF ON (DUTS_DEVICES_REF.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN DEVICES DEVICES_REF ON (DEVICES_REF.ID = DUTS_DEVICES_REF.DEVICE_ID)
      LEFT JOIN MACHINES_AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
      LEFT JOIN SCHEDULES ON (SCHEDULES.AUTOMATION_PERIOD_ID = MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID)
      LEFT JOIN EXCEPTIONS ON (EXCEPTIONS.AUTOMATION_PERIOD_ID = MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID)
      LEFT JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
      LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
      LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = ENVIRONMENTS_ROOM_TYPES.RTYPE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds?.length) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds?.length) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds?.length) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
  conditions.push(`((DUTS_DEVICES.ID IS NOT NULL) OR (DAMS_DEVICES.ID IS NOT NULL) OR (DRIS_DEVICES.ID IS NOT NULL))`);
  conditions.push(`COALESCE(DUTS_AUTOMATION.ID, DAMS_ILLUMINATIONS.ID, DRIS_AUTOMATIONS.ID, DAMS_AUTOMATIONS.ID) IS NOT NULL `)
  conditions.push(`(DAMS_DEVICES.DISAB = 0 OR DAMS_DEVICES.DISAB IS NULL)`);
  conditions.push(`(DUTS_AUTOMATION.DISAB = 0 OR DUTS_AUTOMATION.DISAB IS NULL)`);
  conditions.push(`(EXCEPTIONS.ID IS NULL)`);
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += `GROUP BY  
                  DEVICES.DEVICE_CODE,
                  DEVICES_UNITS.UNIT_ID,
                  DEVICES_CLIENTS.CLIENT_ID,
                  CLUNITS.UNIT_NAME,
                  CITY.STATE_ID,
                  CITY.NAME,
                  CLIENTS.NAME,
                  HAS_DUT_AUT,
                  CUR_DUT_AUT_PAR.MODE,
                  DUTS_AUTOMATION.DISAB,
                  CUR_DUT_AUT_PAR.LAST_PROG,
                  HAS_DAM,
                  CUR_DAM_AUT_PAR.FAULTS_DATA,
                  CUR_DAM_AUT_PAR.ENABLE_ECO,
                  DAMS_DEVICES.DISAB,
                  CUR_DAM_AUT_PAR.LAST_PROG,
                  CUR_DAM_AUT_PAR.SELF_REFERENCE,
                  HAS_DRI,
                  DEVICES_REF.DEVICE_CODE,
                  CUR_DUT_AUT_PAR.ENABLE_ECO,
                  DRIS_DEVICES.LASTCFGSEND,
                  VAVS.VAV_ID,
                  SCHEDULES.NEED_MULT_SCHEDULES`;

  return sqldb.query<{
    DEV_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    HAS_DUT_AUT: string
    DUTAUT_CTRLOPER: ControlMode
    DUTAUT_DISABLED: number
    HAS_DAM: string
    FAULTSDATA_DAM: string
    ENABLE_ECO_DAM: 0|1
    DAM_DISABLED: 0|1
    HAS_DRI: string
    DUT_REF_ID: string
    DRI_ENABLE_ECO: 0|1
    DAM_LASTPROG: string // Estes campos vêm como uma string do banco e precisam ser convertidas para um objeto usando JSON.parse
    SELF_REFERENCE: number
    DUT_LASTPROG: string // Estes campos vêm como uma string do banco e precisam ser convertidas para um objeto usando JSON.parse
    DRI_LASTCFGSEND: string // Estes campos vêm como uma string do banco e precisam ser convertidas para um objeto usando JSON.parse
    LAST_TEMPERATURE_CONTROL_CFG: string // Estes campos vêm como uma string do banco e precisam ser convertidas para um objeto usando JSON.parse
    IS_VAV: string
    DUT_NEED_MULT_SCHEDULES: string
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
    TUSEMIN: number
    TUSEMAX: number
    MINIMUM_TEMPERATURE: number
    MAXIMUM_TEMPERATURE: number
    DRI_LASTPROG: string;
  }>(sentence, qPars)
}

export async function getTimezoneInfoByDev(qPars: { devId: string }) {
  let sentence = `
  SELECT
    CLUNITS.TIMEZONE_ID,
    TIME_ZONES.AREA AS TIMEZONE_AREA,
    TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  FROM
    DEVICES
    INNER JOIN DEVICES_UNITS ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
    LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
  WHERE DEVICES.DEVICE_CODE = :devId
  `
  return sqldb.querySingle<{
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}


export function getDutsInnerDevsToGetVisibility (qPars: { CLIENT_ID: number, UNIT_ID: number }) {
  let sentence = `
    SELECT 
      r.DEV_ID,
      r.ISVISIBLE,
      r.ROOM_NAME
    FROM
      (
        SELECT
          DEVICES.DEVICE_CODE AS DEV_ID,
          ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME, 
          ENVIRONMENTS.IS_VISIBLE AS ISVISIBLE,
          'DUT' AS TYPE
        FROM
          DUTS_MONITORING
          INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
          INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
          INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
        UNION
        SELECT VAV_ID, ROOM_NAME, ISVISIBLE, 'DRI' AS TYPE FROM VAVS v
      ) as r
      INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = r.DEV_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID
      AND DEVICES_UNITS.UNIT_ID = :UNIT_ID;
    `

  return sqldb.query<{
    DEV_ID: string
    ROOM_NAME: string
    ISVISIBLE: number
  }>(sentence, qPars)
}

export function getEnvironmentIdByDeviceCode (qPars: {
  DEVICE_CODE: string
}) {
  let sentence = `
    SELECT 
      ert.ID,
      ert.ENVIRONMENT_ID 
    FROM 
      DEVICES
    INNER JOIN DUTS_DEVICES dd ON (DEVICES.ID = dd.DEVICE_ID)
    INNER JOIN DUTS_MONITORING dm ON (dm.DUT_DEVICE_ID = dd.ID)
    INNER JOIN ENVIRONMENTS_ROOM_TYPES ert ON (ert.ENVIRONMENT_ID = dm.ENVIRONMENT_ID)
    WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE;`
  return sqldb.querySingle<{
    ID: number
    ENVIRONMENT_ID: number
  }>(sentence, qPars)
}

export async function getDeviceInfo(qPars: { DEVICE_CODE: string }) {
  const sentence =`
    SELECT
      DEVICES.DEVICE_CODE, 
      CLUNITS.UNIT_ID, 
      CLUNITS.UNIT_NAME,
      CLIENTS.CLIENT_ID, 
      CLIENTS.NAME AS CLIENT_NAME
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID) 
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
    WHERE 
      DEVICES.DEVICE_CODE = :DEVICE_CODE
  `
  return sqldb.querySingle<{
    DEVICE_CODE: string
    UNIT_NAME: string
    UNIT_ID: number
    CLIENT_ID: number
    CLIENT_NAME: string
  }>(sentence, qPars)
}


export function getSetPointDutAut(qPars: {
  DEVICE_CODE: string
}) {
  let sentence = `
  SELECT DISTINCT
  cap.SETPOINT
  FROM 
  DEVICES d 
  LEFT JOIN DUTS_DEVICES dd ON (d.ID = dd.DEVICE_ID)
  LEFT JOIN DUTS_AUTOMATION da ON (da.DUT_DEVICE_ID = dd.ID)
  LEFT JOIN MACHINES m ON (m.ID = da.MACHINE_ID)
  LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS mcap ON (mcap.MACHINE_ID = m.ID)
  LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS cap ON (mcap.CURRENT_AUTOMATION_PARAMETERS_ID = cap.ID)
  WHERE d.DEVICE_CODE = :DEVICE_CODE;`
  return sqldb.querySingle<{
    SETPOINT: number
  }>(sentence, qPars)
}

export function getInfoTimezone (qPars: { devId?: number, devCode?: string }) {
  let where;
  if (qPars.devId) {
    where = ` WHERE DEVICES.ID = :devId `
  }
  if (qPars.devCode) {
    where = ` WHERE DEVICES.DEVICE_CODE = :devCode `
  }
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES.ID AS DEVICE_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.TIME_ZONE_OFFSET,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.POSIX AS TIMEZONE_POSIX
    FROM
      DEVICES
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
  `

  sentence += where;

  return sqldb.querySingle<{
    DEV_ID: string
    DEVICE_ID: number
    CLIENT_ID: number
    UNIT_ID: number
    TIMEZONE_ID: number
    TIME_ZONE_OFFSET: number
    TIMEZONE_AREA: string
    TIMEZONE_POSIX: string
  }>(sentence, qPars)
}

export async function getUnitClientFromDevice(qPars: { DEVICE_ID: number }) {
  const sentence =`
    SELECT
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID
    FROM
      DEVICES
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID) 
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    WHERE 
      DEVICES.ID = :DEVICE_ID
  `
  return sqldb.querySingle<{
    UNIT_ID: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

export async function getMacDevice(qPars: { DEVICE_CODE: string }) {
  const sentence =`
    SELECT
      DEVICES.ID,
      DEVICES.MAC
    FROM
      DEVICES
    WHERE 
      DEVICES.DEVICE_CODE = :DEVICE_CODE
  `
  return sqldb.querySingle<{
    ID: number
    MAC: string
  }>(sentence, qPars)
}

export function getClientMachinesHealthPowerAtDate(qPars: {
  DATELIMIT: number,
  excludeClient?: number,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}): ReturnType<typeof getClientMachinesHealthPower> {
  let sentence = `
WITH ULTS AS (
	SELECT MAX(AHH2.DAT_REPORT) AS MAX_DAT, DEVICES.DEVICE_CODE AS DEV_ID
    	FROM 
	        ASSETS_HEALTH_HIST AHH2
	        LEFT JOIN ASSETS ON (ASSETS.ID = AHH2.ASSET_ID)
	        LEFT JOIN CONDENSERS ON (CONDENSERS.ASSET_ID = ASSETS.ID)
	        LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.CONDENSER_ID = CONDENSERS.ID)
	        LEFT JOIN EVAPORATORS ON (EVAPORATORS.ASSET_ID = ASSETS.ID)
	        LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.EVAPORATOR_ID = EVAPORATORS.ID)
	        LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ASSET_ID = ASSETS.ID)
	        LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID = ASSET_HEAT_EXCHANGERS.ID)
	        LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.ID = COALESCE(DACS_CONDENSERS.DAC_DEVICE_ID, DACS_EVAPORATORS.DAC_DEVICE_ID, DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID))
	        LEFT JOIN DUTS_DUO_CONDENSERS ddc ON ddc.CONDENSER_ID=CONDENSERS.ID
	        LEFT JOIN DUTS_DUO_EVAPORATORS dde ON dde.EVAPORATOR_ID=EVAPORATORS.ID
	        LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ddahe ON ddahe.ASSET_HEAT_EXCHANGER_ID=ASSET_HEAT_EXCHANGERS.ID
	        LEFT JOIN DUTS_DUO dd ON dd.ID=COALESCE(ddc.DUT_DUO_ID, dde.DUT_DUO_ID, ddahe.DUT_DUO_ID)
          LEFT JOIN DUTS_DEVICES ON DUTS_DEVICES.ID=dd.DUT_DEVICE_ID
	        INNER JOIN DEVICES ON (DEVICES.ID = COALESCE(DACS_DEVICES.DEVICE_ID, DUTS_DEVICES.DEVICE_ID))
    WHERE AHH2.DAT_REPORT <= :DATELIMIT
    GROUP BY DEVICES.DEVICE_CODE
  ) 
    SELECT
      COALESCE(CONDENSERS.CAPACITY_UNIT, EVAPORATORS.CAPACITY_UNIT, ASSET_HEAT_EXCHANGERS.CAPACITY_UNIT) AS ASSET_CAPACITY_UNIT,
	    SUM(COALESCE(CONDENSERS.CAPACITY_POWER, EVAPORATORS.CAPACITY_POWER, ASSET_HEAT_EXCHANGERS.CAPACITY_POWER)) AS ASSET_CAPACITY_POWER,
      ASSETS_HEALTH_HIST.H_INDEX,
      COUNT(*) as N_DEVICES
  `
  sentence += `
  FROM DEVICES d
	LEFT JOIN DACS_DEVICES dd ON dd.DEVICE_ID=d.ID
	LEFT JOIN DUTS_DEVICES dd2 ON dd2.DEVICE_ID=d.ID
	LEFT JOIN DUTS_DUO dd3 ON dd3.DUT_DEVICE_ID=dd2.ID
	LEFT JOIN DACS_CONDENSERS dc2 ON dc2.DAC_DEVICE_ID=dd.ID
	LEFT JOIN DUTS_DUO_CONDENSERS ddc ON ddc.DUT_DUO_ID=dd3.ID
	LEFT JOIN CONDENSERS ON CONDENSERS.ID=COALESCE(dc2.CONDENSER_ID, ddc.CONDENSER_ID)
	LEFT JOIN DACS_EVAPORATORS de ON de.DAC_DEVICE_ID=dd.ID
	LEFT JOIN DUTS_DUO_EVAPORATORS dde ON dde.DUT_DUO_ID=dd3.ID
	LEFT JOIN EVAPORATORS ON EVAPORATORS.ID=COALESCE(de.EVAPORATOR_ID, dde.EVAPORATOR_ID)
	LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS dahe ON dahe.DAC_DEVICE_ID=dd.ID
	LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ddahe ON ddahe.DUT_DUO_ID=dd3.ID
	LEFT JOIN ASSET_HEAT_EXCHANGERS ON ASSET_HEAT_EXCHANGERS.ID=COALESCE(dahe.ASSET_HEAT_EXCHANGER_ID, ddahe.ASSET_HEAT_EXCHANGER_ID)
	LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID))
	INNER JOIN CLUNITS ON  CLUNITS.UNIT_ID = ASSETS.UNIT_ID 
  INNER JOIN CLIENTS c ON c.CLIENT_ID = CLUNITS.CLIENT_ID
  LEFT JOIN MACHINES ON (MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID))
	INNER JOIN ULTS ON (ULTS.DEV_ID = d.DEVICE_CODE)
	INNER JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH_HIST.ASSET_ID = ASSETS.ID AND ASSETS_HEALTH_HIST.DAT_REPORT = ULTS.MAX_DAT)
  `
  if (qPars.stateIds) {
    sentence += `
    INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
    LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    `
  }

  const conditions: string[] = []
  conditions.push(`MACHINES.ID IS NOT NULL`)
  if (qPars.excludeClient) { conditions.push(`c.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }
  conditions.push(`c.PERMS_C LIKE '%[C]%'`)
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' GROUP BY COALESCE(CONDENSERS.CAPACITY_UNIT, EVAPORATORS.CAPACITY_UNIT, ASSET_HEAT_EXCHANGERS.CAPACITY_UNIT), ASSETS_HEALTH_HIST.H_INDEX'

  return sqldb.query<{
    ASSET_CAPACITY_UNIT: string
    ASSET_CAPACITY_POWER: number
    H_INDEX: number
    N_DEVICES: number
  }>(sentence, qPars)
}

export function getClientMachinesHealthPower(qPars: {
  excludeClient?: number,
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}) {
  let sentence = `
    SELECT
      COALESCE(CONDENSERS.CAPACITY_UNIT, EVAPORATORS.CAPACITY_UNIT, ASSET_HEAT_EXCHANGERS.CAPACITY_UNIT) AS ASSET_CAPACITY_UNIT,
	    SUM(COALESCE(CONDENSERS.CAPACITY_POWER, EVAPORATORS.CAPACITY_POWER, ASSET_HEAT_EXCHANGERS.CAPACITY_POWER)) AS ASSET_CAPACITY_POWER,
      ASSETS_HEALTH_HIST.H_INDEX,
      COUNT(*) as N_DEVICES
  `
  sentence += `
    FROM DEVICES d
      LEFT JOIN DACS_DEVICES dd ON dd.DEVICE_ID=d.ID
      LEFT JOIN DUTS_DEVICES dd2 ON dd2.DEVICE_ID=d.ID
      LEFT JOIN DUTS_DUO dd3 ON dd3.DUT_DEVICE_ID=dd2.ID
      LEFT JOIN DACS_CONDENSERS dc2 ON dc2.DAC_DEVICE_ID=dd.ID
      LEFT JOIN DUTS_DUO_CONDENSERS ddc ON ddc.DUT_DUO_ID=dd3.ID
      LEFT JOIN CONDENSERS ON CONDENSERS.ID=COALESCE(dc2.CONDENSER_ID, ddc.CONDENSER_ID)
      LEFT JOIN DACS_EVAPORATORS de ON de.DAC_DEVICE_ID=dd.ID
      LEFT JOIN DUTS_DUO_EVAPORATORS dde ON dde.DUT_DUO_ID=dd3.ID
      LEFT JOIN EVAPORATORS ON EVAPORATORS.ID=COALESCE(de.EVAPORATOR_ID, dde.EVAPORATOR_ID)
      LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS dahe ON dahe.DAC_DEVICE_ID=dd.ID
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ddahe ON ddahe.DUT_DUO_ID=dd3.ID
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON ASSET_HEAT_EXCHANGERS.ID=COALESCE(dahe.ASSET_HEAT_EXCHANGER_ID, ddahe.ASSET_HEAT_EXCHANGER_ID)
      LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID))
      INNER JOIN CLUNITS ON  CLUNITS.UNIT_ID = ASSETS.UNIT_ID 
      INNER JOIN CLIENTS c ON c.CLIENT_ID=CLUNITS.CLIENT_ID
      LEFT JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ASSET_ID=ASSETS.ID)
      LEFT JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH.HEALTH_HIST_ID=ASSETS_HEALTH_HIST.ID)
      LEFT JOIN MACHINES ON (MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID))
  `
  if (qPars.stateIds) {
    sentence += `
    INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
    LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
    `
  }

  const conditions: string[] = []
  conditions.push(`MACHINES.ID IS NOT NULL`)
  if (qPars.excludeClient) { conditions.push(`c.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`)
  }
  conditions.push(`c.PERMS_C LIKE '%[C]%'`)
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' GROUP BY COALESCE(CONDENSERS.CAPACITY_UNIT, EVAPORATORS.CAPACITY_UNIT, ASSET_HEAT_EXCHANGERS.CAPACITY_UNIT), ASSETS_HEALTH_HIST.H_INDEX'

  return sqldb.query<{
    ASSET_CAPACITY_UNIT: string
    ASSET_CAPACITY_POWER: number
    H_INDEX: number
    N_DEVICES: number
  }>(sentence, qPars)
}

export async function getDevicesMachineHealthPower(qPars: {
  clientIds?: number[],
  stateIds?: string[],
  cityIds?: string[],
  unitIds?: number[],
  machineIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean,
  SKIP?: number,
  LIMIT?: number,
  excludeClients?: number[],
}) {
  if (!qPars.SKIP) {
    qPars.SKIP = 0;
  }
  if (!qPars.LIMIT) {
    // A estratégia recomendada na documentação do MySQL para especificar um LIMIT a partir de um offset até o fim dos dados
    // é simplesmente usar um número muito grande. Não teremos mais de 2^53 - 1 linhas.
    // Fonte: https://dev.mysql.com/doc/refman/8.4/en/select.html
    // "To retrieve all rows from a certain offset up to the end of the result set, you can use some large number for the second parameter. "
    qPars.LIMIT = Number.MAX_SAFE_INTEGER;
  }

  let select_fields = `
    SELECT
      CLIENTS.NAME as 'CLIENT',
      CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME as 'UNIT',
      CLUNITS.UNIT_ID,
      MACHINES.ID as 'MACHINE_ID',
      DEVICES.DEVICE_CODE AS DEV_ID,
      COALESCE(CONDENSERS.MACHINE_KW, EVAPORATORS.MACHINE_KW, ASSET_HEAT_EXCHANGERS.MACHINE_KW) as MACHINE_KW,
      COALESCE(CONDENSERS.CAPACITY_POWER, EVAPORATORS.CAPACITY_POWER, ASSET_HEAT_EXCHANGERS.CAPACITY_POWER) AS ASSET_CAPACITY_POWER,
      COALESCE(CONDENSERS.CAPACITY_UNIT, EVAPORATORS.CAPACITY_UNIT, ASSET_HEAT_EXCHANGERS.CAPACITY_UNIT) AS ASSET_CAPACITY_UNIT,
      ASSETS_HEALTH_HIST.H_INDEX,
      ASSETS_HEALTH_HIST.H_DATE,
      STATEREGION.NAME as 'STATE_NAME',
      CITY.NAME as 'CITY_NAME'
  `
  let joins = `
    FROM
    DEVICES 
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      INNER JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID) 
      INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN DACS_DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID) 
      LEFT JOIN DUTS_DEVICES dd2 ON dd2.DEVICE_ID=DEVICES.ID
      LEFT JOIN DUTS_DUO dd3 ON dd3.DUT_DEVICE_ID=dd2.ID
      LEFT JOIN DACS_CONDENSERS dc2 ON dc2.DAC_DEVICE_ID=DACS_DEVICES.ID
      LEFT JOIN DUTS_DUO_CONDENSERS ddc ON ddc.DUT_DUO_ID=dd3.ID
      LEFT JOIN CONDENSERS ON CONDENSERS.ID=COALESCE(dc2.CONDENSER_ID, ddc.CONDENSER_ID)
      LEFT JOIN DACS_EVAPORATORS de ON de.DAC_DEVICE_ID=DACS_DEVICES.ID
      LEFT JOIN DUTS_DUO_EVAPORATORS dde ON dde.DUT_DUO_ID=dd3.ID
      LEFT JOIN EVAPORATORS ON EVAPORATORS.ID=COALESCE(de.EVAPORATOR_ID, dde.EVAPORATOR_ID)
      LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS dahe ON dahe.DAC_DEVICE_ID=DACS_DEVICES.ID
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ddahe ON ddahe.DUT_DUO_ID=dd3.DUT_DEVICE_ID
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON ASSET_HEAT_EXCHANGERS.ID=COALESCE(dahe.ASSET_HEAT_EXCHANGER_ID, ddahe.ASSET_HEAT_EXCHANGER_ID)
      LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID))
      LEFT JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ASSET_ID=ASSETS.ID)
      LEFT JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH.HEALTH_HIST_ID=ASSETS_HEALTH_HIST.ID)
      LEFT JOIN MACHINES ON (MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID))
  `
  const conditions: string[] = []
  conditions.push(`MACHINES.ID IS NOT NULL`);
  conditions.push("DEVICES_CLIENTS.CLIENT_ID IS NOT NULL");
  if (qPars.excludeClients?.length) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID NOT IN (:excludeClients)`) }
  if (qPars.clientIds?.length) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds?.length) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds?.length) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds?.length) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.machineIds?.length) { conditions.push(`MACHINES.ID IN (:machineIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) {
    conditions.push(`CLUNITS.PRODUCTION = 1`);
  }

  conditions.push(`CLIENTS.PERMS_C LIKE '%[C]%'`);
  const sentence = (
    select_fields
    + joins
    + ' WHERE ' + conditions.join(' AND ')
    + ' ORDER BY CLUNITS.UNIT_ID DESC, DEVICES.DEVICE_CODE DESC'
    + ' LIMIT :SKIP, :LIMIT'
  );

  const countSentence = (
    'SELECT COUNT(*) as totalItems'
    + joins
    + ' WHERE ' + conditions.join(' AND ')
  );

  const mainQuery = sqldb.query<{
    STATE_NAME: string,
    CITY_NAME: string,
    CLIENT: string
    CLIENT_ID: number
    UNIT: string
    UNIT_ID: number
    DEV_ID: string
    MACHINE_KW: number
    ASSET_CAPACITY_UNIT: string
    ASSET_CAPACITY_POWER: number
    H_INDEX: number
    H_DATE: string
    MACHINE_ID: number
  }>(sentence, qPars);

  const countQuery = sqldb.querySingle<{
    totalItems: number,
  }>(countSentence, qPars);

  return {
    rows: await mainQuery,
    ...(await countQuery)
  };

}

export function getDevDetails(qPars: { DEV_ID: string }) {
  let sentence = `
    SELECT
      ASSETS.NAME AS ASSET_NAME,
      ASSETS.ID AS ASSET_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_ID,
      MACHINES.ID AS MACHINE_ID,
      MACHINES.NAME AS MACHINE_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      DEVICES.DEVICE_CODE as DEV_ID
    FROM
	    DEVICES
      LEFT JOIN DACS_DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
      LEFT JOIN DUTS_DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN DUTS_DUO ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DUTS_DUO_CONDENSERS ddc ON (ddc.DUT_DUO_ID=DUTS_DUO.ID)
      LEFT JOIN CONDENSERS ON (CONDENSERS.ID = COALESCE (DACS_CONDENSERS.CONDENSER_ID, ddc.CONDENSER_ID))
      LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DUTS_DUO_EVAPORATORS dde ON (dde.DUT_DUO_ID=DUTS_DUO.ID)
      LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = COALESCE(DACS_EVAPORATORS.EVAPORATOR_ID, dde.EVAPORATOR_ID))
      LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ddahe ON (ddahe.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = COALESCE (DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID, ddahe.ASSET_HEAT_EXCHANGER_ID))
      LEFT JOIN MACHINES ON MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID)
      INNER JOIN ASSETS ON ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      WHERE DEVICES.DEVICE_CODE=:DEV_ID
    `

      return sqldb.querySingle<{
        ASSET_NAME: string
        ASSET_ID: number
        UNIT_ID: number
        CLIENT_ID: number
        UNIT_NAME: string
        MACHINE_ID: number
        MACHINE_NAME: string
        CLIENT_NAME: string
        DEVICE_CODE: string
      }>(sentence, qPars)
    }
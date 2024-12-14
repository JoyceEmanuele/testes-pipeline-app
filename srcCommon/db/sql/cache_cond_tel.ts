import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'
import { selectDevAutMachine, selectDutIdMachine } from './MACHINES';

// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC w_deleteFromPeriod = DELETE
  PARAM devId: {cache_cond_tel.devId}
  PARAM startDate: {cache_cond_tel.YMD}
  PARAM endDate: {cache_cond_tel.YMD}

  FROM cache_cond_tel
  WHERE {cache_cond_tel.devId} = {:devId}
  AND {cache_cond_tel.YMD} >= {:startDate}
  AND {cache_cond_tel.YMD} < {:endDate}
*/
export async function w_deleteFromPeriod (qPars: {
  devId: string,
  startDate: string,
  endDate: string,
}, operationLogData: OperationLogData) {
  const sentence = `
  DELETE
  FROM cache_cond_tel
  WHERE cache_cond_tel.devId = :devId
  AND cache_cond_tel.YMD >= :startDate AND cache_cond_tel.YMD < :endDate
  `;

  if (operationLogData) {
    await saveOperationLog('cache_cond_tel', sentence, qPars, operationLogData);
    dbLogger('cache_cond_tel', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM cache_cond_tel
  FIELD cache_cond_tel.devId
  FIELD cache_cond_tel.YMD
  FIELD cache_cond_tel.vers
  FIELD cache_cond_tel.cstats
  FIELD cache_cond_tel.meantp
  FIELD cache_cond_tel.chartsBas
  FIELD cache_cond_tel.chartsDet
  FIELD cache_cond_tel.chartsExt
  FIELD cache_cond_tel.devOnline
  FIELD cache_cond_tel.TEMPERATURE_OFFSET
*/
export function w_insertUpdate (qPars: {
  devId: string,
  YMD: string,
  vers: string,
  cstats?: string,
  meantp?: string,
  chartsBas?: string,
  chartsDet?: string,
  chartsExt?: string,
  devOnline?: number,
  TEMPERATURE_OFFSET?: number|null,
  timezoneOffset?: number|null,
  last_calculated_date?: string,
}) {
  const fields: string[] = []
  fields.push('devId')
  fields.push('YMD')
  fields.push('vers')
  fields.push('last_calculated_date')
  if (qPars.cstats !== undefined) fields.push('cstats')
  if (qPars.meantp !== undefined) fields.push('meantp')
  if (qPars.chartsBas !== undefined) fields.push('chartsBas')
  if (qPars.chartsDet !== undefined) fields.push('chartsDet')
  if (qPars.chartsExt !== undefined) fields.push('chartsExt')
  if (qPars.devOnline !== undefined) fields.push('devOnline')
  if (qPars.TEMPERATURE_OFFSET !== undefined) fields.push('TEMPERATURE_OFFSET')
  if (qPars.timezoneOffset !== undefined) fields.push('timezoneOffset')

  let sentence = `INSERT INTO cache_cond_tel (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("vers = :vers")
  if (qPars.cstats !== undefined) updateFields.push("cstats = :cstats")
  if (qPars.meantp !== undefined) updateFields.push("meantp = :meantp")
  if (qPars.chartsBas !== undefined) updateFields.push("chartsBas = :chartsBas")
  if (qPars.chartsDet !== undefined) updateFields.push("chartsDet = :chartsDet")
  if (qPars.chartsExt !== undefined) updateFields.push("chartsExt = :chartsExt")
  if (qPars.devOnline !== undefined) updateFields.push("devOnline = :devOnline")
  if (qPars.TEMPERATURE_OFFSET !== undefined) updateFields.push("TEMPERATURE_OFFSET = :TEMPERATURE_OFFSET")

  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateMeanTp = UPDATE
  FROM cache_cond_tel
  FIELD cache_cond_tel.meantp
*/
export function w_updateMeanTp (qPars: { meantp: string, YMD: string, devId: string, timezoneOffset: number }) {

  const sentence = `UPDATE cache_cond_tel SET meantp = :meantp WHERE YMD = :YMD AND devId = :devId AND timezoneOffset = :timezoneOffset`

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getItem = SELECT ROW
  PARAM devId: {cache_cond_tel.devId}
  PARAM YMD: {cache_cond_tel.YMD}
  PARAM offset: {cache_cond_tel.timezoneOffset}
  FROM cache_cond_tel
  SELECT cache_cond_tel.devId
  SELECT cache_cond_tel.YMD
  SELECT cache_cond_tel.vers
  SELECT cache_cond_tel.cstats
  SELECT cache_cond_tel.meantp
  SELECT cache_cond_tel.chartsBas
  SELECT cache_cond_tel.chartsDet
  SELECT cache_cond_tel.chartsExt
  SELECT cache_cond_tel.devOnline as hoursOnline
  WHERE {cache_cond_tel.devId} = {:devId} AND {cache_cond_tel.YMD} = {:YMD}
*/
export function getItem (qPars: { devId: string, YMD: string, timezoneOffset: number }) {
  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.YMD,
      cache_cond_tel.vers,
      cache_cond_tel.cstats,
      cache_cond_tel.meantp,
      cache_cond_tel.chartsBas,
      cache_cond_tel.chartsDet,
      cache_cond_tel.chartsExt,
      cache_cond_tel.devOnline as hoursOnline,
      cache_cond_tel.TEMPERATURE_OFFSET as temperatureOffset
  `
  sentence += `
    FROM
      cache_cond_tel
  `
  sentence += ` WHERE cache_cond_tel.devId = :devId AND cache_cond_tel.YMD = :YMD AND cache_cond_tel.timezoneOffset = :timezoneOffset `

  return sqldb.querySingle<{
    devId: string
    YMD: string
    vers: string
    cstats: string
    meantp: string
    chartsBas: string
    chartsDet: string
    chartsExt: string
    hoursOnline: number
    temperatureOffset: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getItemsList = SELECT LIST
  PARAM devId: {cache_cond_tel.devId}
  PARAM dayStart: {cache_cond_tel.YMD}
  PARAM dayEndInc: {cache_cond_tel.YMD}
  FROM cache_cond_tel
  SELECT cache_cond_tel.YMD
  WHERE {cache_cond_tel.devId} = {:devId}
  WHERE {cache_cond_tel.YMD} >= {:dayStart} AND {cache_cond_tel.YMD} <= {:dayEndInc}
*/
export function getItemsList (qPars: { devId: string, dayStart: string, dayEndInc: string }) {
  let sentence = `
    SELECT
      cache_cond_tel.YMD
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId = :devId`)
  conditions.push(`cache_cond_tel.YMD >= :dayStart AND cache_cond_tel.YMD <= :dayEndInc`)
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' GROUP BY cache_cond_tel.devId'

  return sqldb.query<{
    YMD: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListPeriods = SELECT LIST
  PARAM devIds: {cache_cond_tel.devId}[]
  PARAM dayStart: {cache_cond_tel.YMD}
  PARAM dayEndInc: {cache_cond_tel.YMD}
  PARAM+ chartsBas?: boolean
  PARAM+ meantp?: boolean
  FROM cache_cond_tel
  SELECT cache_cond_tel.devId
  SELECT cache_cond_tel.YMD
  WHERE {cache_cond_tel.devId} IN ({:devIds})
  WHERE {cache_cond_tel.YMD} >= {:dayStart} AND {cache_cond_tel.YMD} <= {:dayEndInc}
  WHERE [[IFJS {::chartsBas}]] {cache_cond_tel.chartsBas} IS NOT NULL
  WHERE [[IFJS {::meantp}]] {cache_cond_tel.meantp} IS NOT NULL
*/
export function getListPeriods (qPars: {
  devIds: string[],
  dayStart: string,
  dayEndInc: string
}, admPars: {
  chartsBas?: boolean,
  meantp?: boolean
}) {
  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.YMD
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId IN (:devIds)`)
  conditions.push(`cache_cond_tel.YMD >= :dayStart AND cache_cond_tel.YMD <= :dayEndInc`)
  if (admPars.chartsBas) { conditions.push(`cache_cond_tel.chartsBas IS NOT NULL`) }
  if (admPars.meantp) { conditions.push(`cache_cond_tel.meantp IS NOT NULL`) }
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' GROUP BY cache_cond_tel.devId'

  return sqldb.query<{
    devId: string
    YMD: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getCompiledStats = SELECT LIST
  PARAM devIds: {cache_cond_tel.devId}[]
  PARAM dayStart: {cache_cond_tel.YMD}
  PARAM dayNext: {cache_cond_tel.YMD}
  FROM cache_cond_tel
  SELECT cache_cond_tel.devId
  SELECT cache_cond_tel.YMD
  SELECT cache_cond_tel.cstats
  SELECT cache_cond_tel.meantp
  WHERE {cache_cond_tel.devId} IN ({:devIds})
  WHERE {cache_cond_tel.YMD} >= {:dayStart} AND {cache_cond_tel.YMD} < {:dayNext}
  ORDER BY cache_cond_tel.devId ASC
  ORDER BY cache_cond_tel.YMD ASC
*/
export function getCompiledStats (qPars: { devIds: string[], dayStart: string, dayNext: string, timezoneOffset: number }) {
  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.YMD,
      cache_cond_tel.cstats,
      cache_cond_tel.meantp
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId IN (:devIds)`)
  conditions.push(`cache_cond_tel.YMD >= :dayStart AND cache_cond_tel.YMD < :dayNext`)
  conditions.push(`cache_cond_tel.timezoneOffset = :timezoneOffset`)

  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY cache_cond_tel.devId ASC, cache_cond_tel.YMD ASC `

  return sqldb.query<{
    devId: string
    YMD: string
    cstats: string
    meantp: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getBasicCharts = SELECT LIST
  PARAM devIds: {cache_cond_tel.devId}[]
  PARAM dayStart: {cache_cond_tel.YMD}
  PARAM dayNext: {cache_cond_tel.YMD}
  FROM cache_cond_tel
  SELECT cache_cond_tel.devId
  SELECT cache_cond_tel.YMD
  SELECT cache_cond_tel.cstats
  SELECT cache_cond_tel.chartsBas
  WHERE {cache_cond_tel.devId} IN ({:devIds})
  WHERE {cache_cond_tel.YMD} >= {:dayStart} AND {cache_cond_tel.YMD} < {:dayNext}
  ORDER BY cache_cond_tel.devId ASC
  ORDER BY cache_cond_tel.YMD ASC
*/
export function getBasicCharts (qPars: { devIds: string[], dayStart: string, dayNext: string, timezoneOffset: number }) {
  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.YMD,
      cache_cond_tel.cstats,
      cache_cond_tel.chartsBas
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId IN (:devIds)`)
  conditions.push(`cache_cond_tel.YMD >= :dayStart AND cache_cond_tel.YMD < :dayNext`)
  conditions.push('cache_cond_tel.timezoneOffset = :timezoneOffset')
  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY cache_cond_tel.devId ASC, cache_cond_tel.YMD ASC `

  return sqldb.query<{
    devId: string
    YMD: string
    cstats: string
    chartsBas: string
  }>(sentence, qPars)
}

export function getLatestMeanTp (qPars: {
  devIds?: string[],
  vers?: string,
  devId?: string,
  excludeClient?: number,
  clientIds?: number[],
  unitIds?: number[],
  timezoneOffset: number
}) {
  const conditions: string[] = []
  conditions.push(`meantp IS NOT NULL`)
  conditions.push(`LENGTH(meantp) > 2`)
  conditions.push(`timezoneOffset = :timezoneOffset`)
  if (qPars.devIds !== undefined) conditions.push(`devId IN (:devIds)`)
  if (qPars.vers !== undefined) conditions.push(`vers = :vers`)
  if (qPars.devId !== undefined) conditions.push(`devId = :devId`)

  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.meantp
    FROM
      cache_cond_tel
      INNER JOIN (
        SELECT MAX(YMD) MTS, devId
        FROM cache_cond_tel
        WHERE ${conditions.join(' AND ')}
        GROUP BY devId
      ) TT1 ON (TT1.MTS = cache_cond_tel.YMD AND TT1.devId = cache_cond_tel.devId)
  `

  return sqldb.query<{
    devId: string
    meantp: string
  }>(sentence, qPars)
}

export function missingAutDacs (qPars: { day: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DAC_ID
  `
  sentence += `
    FROM
      DACS_DEVICES
      INNER JOIN DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN EVAPORATORS ON (DACS_EVAPORATORS.EVAPORATOR_ID = EVAPORATORS.ID)
      LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN CONDENSERS ON (DACS_CONDENSERS.CONDENSER_ID = CONDENSERS.ID)
      LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      INNER JOIN MACHINES ON MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID)
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = MACHINES.ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN cache_cond_tel ON (cache_cond_tel.devId = DEVICES.DEVICE_CODE AND cache_cond_tel.YMD = :day)
  `

  const conditions: string[] = []
  conditions.push(`(${selectDevAutMachine} IS NOT NULL OR DUTS_AUTOMATION.DISAB = 0)`)
  conditions.push(`(cache_cond_tel.meantp IS NULL OR cache_cond_tel.chartsBas IS NULL OR cache_cond_tel.cstats IS NULL OR cache_cond_tel.chartsDet IS NULL OR cache_cond_tel.devOnline = 0)`)
  sentence += ' WHERE ' + conditions.join(' AND ')
  sentence += ' GROUP BY DEVICES.DEVICE_CODE'

  return sqldb.query<{
    DAC_ID: string
  }>(sentence, qPars)
}

export function missingAutDams (qPars: { day: string }) {
  let sentence = `
    WITH CTE_DAMS_AUT_ILU AS (
      SELECT 
        DISTINCT DAM_DEVICE_ID AS DAM_DEVICE_ID
      FROM DAMS_AUTOMATIONS
      UNION
      SELECT
        DISTINCT DAM_DEVICE_ID AS DAM_DEVICE_ID
      FROM DAMS_ILLUMINATIONS
    )
    SELECT
      DEVICES.DEVICE_CODE AS DAM_ID
  `
  sentence += `
    FROM
      CTE_DAMS_AUT_ILU
      INNER JOIN DAMS_DEVICES ON (CTE_DAMS_AUT_ILU.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN cache_cond_tel ON (cache_cond_tel.devId = DEVICES.DEVICE_CODE AND cache_cond_tel.YMD = :day)
  `

  sentence += ` WHERE (cache_cond_tel.chartsBas IS NULL) `
  sentence += ' GROUP BY DEVICES.DEVICE_CODE'

  return sqldb.query<{
    DAM_ID: string
  }>(sentence, qPars)
}

export function missingAutDuts (qPars: { day: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID
  `
  sentence += `
    FROM
    DUTS_AUTOMATION
      INNER JOIN MACHINES ON (MACHINES.ID = DUTS_AUTOMATION.MACHINE_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN cache_cond_tel ON (cache_cond_tel.devId = DEVICES.DEVICE_CODE AND cache_cond_tel.YMD = :day)
  `

  sentence += ` WHERE (cache_cond_tel.chartsBas IS NULL OR cache_cond_tel.chartsDet IS NULL) `
  sentence += ' GROUP BY DEVICES.DEVICE_CODE'

  return sqldb.query<{
    DEV_ID: string
  }>(sentence, qPars)
}

export function missingDacUse (qPars: { day: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DAC_ID
  `
  sentence += `
    FROM
      DACS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
      LEFT JOIN cache_cond_tel ON (cache_cond_tel.devId =DEVICES.DEVICE_CODE AND cache_cond_tel.YMD = :day)
  `

  sentence += ` WHERE (cache_cond_tel.meantp IS NULL OR cache_cond_tel.cstats IS NULL OR cache_cond_tel.devOnline = 0)`
  sentence += ' GROUP BY DEVICES.DEVICE_CODE'

  return sqldb.query<{
    DAC_ID: string
  }>(sentence, qPars)
}

export function missingDutTp (qPars: { day: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID   
  `
  sentence += `
    FROM
      DUTS_DEVICES INNER JOIN
      DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID) LEFT JOIN
      cache_cond_tel ON (cache_cond_tel.devId = DEVICES.DEVICE_CODE AND cache_cond_tel.YMD = :day)
  `

  sentence += ` WHERE (cache_cond_tel.meantp IS NULL) `
  sentence += ` GROUP BY DEVICES.DEVICE_CODE`

  return sqldb.query<{
    DEV_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getDevAvgHoursOn = SELECT LIST
  PARAM devIds: {cache_cond_tel.devId}[]
  PARAM dayStart: {cache_cond_tel.YMD}
  PARAM dayEnd: {cache_cond_tel.YMD}

  FROM cache_cond_tel

  SELECT cache_cond_tel.devId
  SELECT cache_cond_tel.cstats
  SELECT cache_cond_tel.chartsBas
  SELECT cache_cond_tel.chartsDet
  SELECT cache_cond_tel.YMD
  SELECT cache_cond_tel.devOnline

  WHERE {cache_cond_tel.devId} IN ({:devIds})
  WHERE {cache_cond_tel.YMD} >= {:dayStart} AND {cache_cond_tel.YMD} <= {:dayEnd}
*/
export function getDevAvgHoursOn (qPars: { devIds: string[], dayStart: string, dayEnd: string, timezoneOffset: number }) {
  let sentence = `
    SELECT
      cache_cond_tel.devId,
      cache_cond_tel.cstats,
      cache_cond_tel.chartsBas,
      cache_cond_tel.chartsDet,
      cache_cond_tel.YMD,
      cache_cond_tel.devOnline
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId IN (:devIds)`)
  conditions.push(`cache_cond_tel.YMD >= :dayStart AND cache_cond_tel.YMD <= :dayEnd`)
  conditions.push(`cache_cond_tel.timezoneOffset = :timezoneOffset`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    devId: string
    cstats: string
    chartsBas: string
    chartsDet: string
    YMD: string
    devOnline: number
  }>(sentence, qPars)
}

export function getCompiledVavMeanTp (qPars: {
  dayYMD: string,
  dayBegMon: string,
  excludeClient?: number,
  clientIds?: number[],
  unitIds?: number[]
}) {
  let sentence = `
    SELECT
      VAVS.VAV_ID AS DEV_ID,
      VAVS.RTYPE_ID,
      VAVS.ROOM_NAME,
      ROOMTYPES.USEPERIOD,
      ROOMTYPES.TUSEMAX,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.CO2MAX,
      cache_cond_tel.meantp
  `
  sentence += `
    FROM
      VAVS
      INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = VAVS.VAV_ID AND DEVICES.DAT_BEGMON <= :dayBegMon)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.CLIENT_ID = DEVICES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = VAVS.RTYPE_ID)
      LEFT JOIN cache_cond_tel ON (cache_cond_tel.devId = VAVS.VAV_ID AND cache_cond_tel.YMD = :dayYMD)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  conditions.push(`CLIENTS.PERMS_C LIKE '%[C]%'`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY VAVS.VAV_ID ASC `

  return sqldb.query<{
    DEV_ID: string
    RTYPE_ID: number
    ROOM_NAME: string
    USEPERIOD: string
    TUSEMAX: number
    TUSEMIN: number
    CO2MAX: number
    meantp: string
  }>(sentence, qPars)
}

export function getCompiledRoomMeanTp (qPars: {
  dayYMD: string,
  dayBegMon: string,
  excludeClient?: number,
  clientIds?: number[],
  unitIds?: number[],
  stateIds?: number[],
  cityIds?: string[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}) {
  let sentence = `
    SELECT
      r.DEV_ID,
      r.RTYPE_ID,
      r.ROOM_NAME,
      rt.USEPERIOD,
      rt.TUSEMAX,
      rt.TUSEMIN,
      rt.HUMIMAX,
      rt.HUMIMIN,
      rt.CO2MAX,
      cct.meantp,
      r.ISVISIBLE,
      cct.timezoneOffset,
      tz.ID as TIMEZONE_ID,
      tz.AREA as TIMEZONE_AREA,
      tz.TIME_ZONE_OFFSET as TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      (
          SELECT
            DEVICES.DEVICE_CODE AS DEV_ID,
            ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME, 
            ENVIRONMENTS.IS_VISIBLE AS ISVISIBLE,
            ENVIRONMENTS_ROOM_TYPES.RTYPE_ID,
            DEVICES.ID AS DEVICE_ID
          FROM
            DUTS_MONITORING
            INNER JOIN DUTS_DEVICES ON (DUTS_MONITORING.DUT_DEVICE_ID = DUTS_DEVICES.ID)
            INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
            INNER JOIN ENVIRONMENTS ON (ENVIRONMENTS.ID = DUTS_MONITORING.ENVIRONMENT_ID)
            LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS.ID = ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID)
          WHERE
            DEVICES.DAT_BEGMON <= :dayBegMon 
        UNION
          SELECT
            VAV_ID,
            ROOM_NAME,
            RTYPE_ID,
            ISVISIBLE,
            DEVICES.ID AS DEVICE_ID
          FROM 
            VAVS
            INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = VAVS.VAV_ID)
          WHERE
            DEVICES.DAT_BEGMON <= :dayBegMon 
    ) as r
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = r.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = r.DEVICE_ID)
      INNER JOIN CLIENTS c ON (c.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS c2 ON (c2.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES tz ON (tz.ID = c2.TIMEZONE_ID)
      LEFT JOIN CITY c3 ON (c3.CITY_ID = c2.CITY_ID)
      LEFT JOIN ROOMTYPES rt ON (rt.RTYPE_ID = r.RTYPE_ID)
      LEFT JOIN cache_cond_tel cct ON (cct.YMD = :dayYMD AND cct.devId = r.DEV_ID)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`c.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`c.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`c2.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`c3.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`c3.STATE_ID IN (:stateIds)`) }
  conditions.push(`c.PERMS_C LIKE '%[C]%'`)
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`c2.PRODUCTION = 1`)}
  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY r.DEV_ID ASC `

  return sqldb.query<{
    DEV_ID: string
    RTYPE_ID: number
    ROOM_NAME: string
    USEPERIOD: string
    TUSEMAX: number
    TUSEMIN: number
    HUMIMAX: number
    HUMIMIN: number
    CO2MAX: number
    meantp: string
    ISVISIBLE: number
    timezoneOffset: number
    TIMEZONE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

export function getDevOnline (qPars: { devId: string, day: string }) {
  let sentence = `
    SELECT
      cache_cond_tel.devOnline
  `
  sentence += `
    FROM
      cache_cond_tel
  `

  const conditions: string[] = []
  conditions.push(`cache_cond_tel.devId = :devId`)
  conditions.push(`cache_cond_tel.YMD = :day`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.queryFirst<{
    devOnline: number
  }>(sentence, qPars)
}
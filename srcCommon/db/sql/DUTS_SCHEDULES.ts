import * as sqldb from '../connectSql'

export async function getDutScheds(qPars: {
  DUT_ID?: string,
  NEED_MULT_SCHEDULES?: string,
  SCHEDULE_STATUS?: string,
  DUT_SCHEDULE_ID?: number,
  DUT_IDS?: string[]
}) {
  let sentence = `
    SELECT DISTINCT
      AUTOMATIONS_PERIODS.ID AS DUT_SCHEDULE_ID,
      DEVICES.DEVICE_CODE AS DUT_ID,
      AUTOMATIONS_PERIODS.TITLE AS SCHEDULE_TITLE,
      AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS AS SCHEDULE_STATUS,
      AUTOMATIONS_PERIODS.BEGIN_TIME,
      AUTOMATIONS_PERIODS.END_TIME,
      SCHEDULES.ID AS SCHEDULE_ID,
      SCHEDULES.DAYS,
      SCHEDULES.NEED_MULT_SCHEDULES,
      AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PARAMETERS_ID AS DUT_AUTOMATION_PARAMETERS_ID,
      AUTOMATIONS_PARAMETERS.MODE AS CTRLOPER,
      AUTOMATIONS_PARAMETERS.PERMISSION,
      AUTOMATIONS_PARAMETERS.SETPOINT,
      AUTOMATIONS_PARAMETERS.LTC,
      AUTOMATIONS_PARAMETERS.LTI,
      AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS,
      AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS,
      AUTOMATIONS_PARAMETERS.SCHEDULE_START_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.SCHEDULE_END_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.FORCED_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.IR_ID_COOL,
      AUTOMATIONS_PARAMETERS.ACTION_MODE,
      AUTOMATIONS_PARAMETERS.ACTION_TIME,
      AUTOMATIONS_PARAMETERS.ACTION_POST_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.CURRENT_IN_DEVICE AS CURRENT_IN_DUT
  `
  sentence += `
    FROM
      DUTS_AUTOMATION
      INNER JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      INNER JOIN MACHINES_AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID = DUTS_AUTOMATION.MACHINE_ID)
      INNER JOIN AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PERIODS_PARAMETERS ON (AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PARAMETERS ON (AUTOMATIONS_PARAMETERS.ID = AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PARAMETERS_ID)
      INNER JOIN SCHEDULES ON (SCHEDULES.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
  `

  const conditions: string[] = []
  if (qPars.DUT_ID !== undefined) { conditions.push(`DEVICES.DEVICE_CODE = :DUT_ID`) }
  if (qPars.DUT_IDS !== undefined) { conditions.push(`DEVICES.DEVICE_CODE IN (:DUT_IDS)`) }
  if (qPars.NEED_MULT_SCHEDULES !== undefined) { conditions.push(`SCHEDULES.NEED_MULT_SCHEDULES = :NEED_MULT_SCHEDULES`) }
  if (qPars.SCHEDULE_STATUS !== undefined) { conditions.push(`AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS = :SCHEDULE_STATUS`) }
  if (qPars.DUT_SCHEDULE_ID !== undefined) { conditions.push(`AUTOMATIONS_PERIODS.ID = :DUT_SCHEDULE_ID`) }

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }
  
  sentence += ` ORDER BY DEVICES.DEVICE_CODE ASC, AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS DESC, AUTOMATIONS_PERIODS.BEGIN_TIME ASC, AUTOMATIONS_PERIODS.END_TIME ASC `

  return sqldb.query<{
    DUT_SCHEDULE_ID: number
    DUT_ID: string
    SCHEDULE_TITLE: string
    SCHEDULE_STATUS: string
    BEGIN_TIME: string
    END_TIME: string
    SCHEDULE_ID: number
    DAYS: string
    NEED_MULT_SCHEDULES: string
    DUT_AUTOMATION_PARAMETERS_ID: number
    CTRLOPER: string
    PERMISSION: 'allow'|'forbid'
    SETPOINT: number
    LTC: number
    LTI: number
    UPPER_HYSTERESIS: number
    LOWER_HYSTERESIS: number
    SCHEDULE_START_BEHAVIOR: string
    SCHEDULE_END_BEHAVIOR: string
    FORCED_BEHAVIOR: string
    IR_ID_COOL: string
    ACTION_MODE: string
    ACTION_TIME: number
    ACTION_POST_BEHAVIOR: string
    CURRENT_IN_DUT: string
  }>(sentence, qPars)
}

export async function getDutsWithMultSchedule(qPars: { DUT_ID: string }){
  let sentence = `
    SELECT
      DISTINCT DEVICES.DEVICE_CODE AS DUT_ID
      
  `
  sentence += `
    FROM
      MACHINES_AUTOMATIONS_PERIODS
      INNER JOIN AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN SCHEDULES ON (SCHEDULES.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.MACHINE_ID = MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  if (qPars.DUT_ID != null) { conditions.push(`DEVICES.DEVICE_CODE = :DUT_ID`) }

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  return sqldb.query<{
    DUT_ID: string
  }>(sentence, qPars)
}

export async function getDutsToMultSchedule(qPars: { NEED_MULT_SCHEDULES?: string}){
  let sentence = `
    SELECT
      DISTINCT DEVICES.DEVICE_CODE AS DUT_ID,
      DATE_FORMAT(CURRENT_AUTOMATIONS_PARAMETERS.LAST_CHANGE_IN_MULTIPLE_SCHEDULE, '%Y-%m-%dT%H:%i:%S') AS FULL_END_DATE,
      COALESCE(TIME_ZONES.AREA, 'America/Sao_Paulo') AS TIME_ZONE_AREA
  `
  sentence += `
    FROM
      MACHINES_AUTOMATIONS_PERIODS
      INNER JOIN AUTOMATIONS_PERIODS ON (AUTOMATIONS_PERIODS.ID = MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID)
      INNER JOIN SCHEDULES ON (AUTOMATIONS_PERIODS.ID = SCHEDULES.AUTOMATION_PERIOD_ID)
      INNER JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.MACHINE_ID = MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID = CURRENT_AUTOMATIONS_PARAMETERS.ID)
      LEFT JOIN DEVICES_UNITS on (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLUNITS on (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES on (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
  `

  const conditions: string[] = []
  if (qPars.NEED_MULT_SCHEDULES != null) { conditions.push(`NEED_MULT_SCHEDULES = :NEED_MULT_SCHEDULES`) }

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  return sqldb.query<{
    DUT_ID: string
    FULL_END_DATE: string
    TIME_ZONE_AREA: string
  }>(sentence, qPars)
}

export async function getActiveSchedsWithFwVersion (qPars: {
  DUT_ID?: string
}) {
  let sentence = `
    SELECT DISTINCT
      AUTOMATIONS_PERIODS.DUT_SCHEDULE_ID,
      DEVICE_CODE.DEVICE_CODE AS DUT_ID,
      AUTOMATIONS_PERIODS.TITLE AS SCHEDULE_TITLE,
      AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_STATUS AS SCHEDULE_STATUS,
      AUTOMATIONS_PERIODS.BEGIN_TIME,
      AUTOMATIONS_PERIODS.END_TIME,
      SCHEDULES.DAYS,
      SCHEDULES.NEED_MULT_SCHEDULES,
      MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID AS MACHINE,
      AUTOMATIONS_PARAMETERS.ID AS DUT_AUTOMATION_PARAMETERS_ID,
      AUTOMATIONS_PARAMETERS.MODE AS CTRLOPER,
      AUTOMATIONS_PARAMETERS.PERMISSION,
      AUTOMATIONS_PARAMETERS.SETPOINT,
      AUTOMATIONS_PARAMETERS.LTC,
      AUTOMATIONS_PARAMETERS.LTI,
      AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS,
      AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS,
      AUTOMATIONS_PARAMETERS.SCHEDULE_START_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.SCHEDULE_END_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.FORCED_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.IR_ID_COOL,
      AUTOMATIONS_PARAMETERS.ACTION_MODE,
      AUTOMATIONS_PARAMETERS.ACTION_TIME,
      AUTOMATIONS_PARAMETERS.ACTION_POST_BEHAVIOR,
      AUTOMATIONS_PARAMETERS.CURRENT_IND_DEVICE AS CURRENT_IN_DUT,
      DEVFWVERS.CURRFW_VERS
  `
  sentence += `
    FROM
      SCHEDULES
      INNER JOIN AUTOMATIONS_PERIODS ON (AUTOMATIONS_PERIODS.ID = SCHEDULES.AUTOMATION_PERIOD_ID)
      INNER JOIN MACHINES_AUTOMATIONS_PERIODS ON (MACHINES_AUTOMATIONS_PERIODS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PERIODS_PARAMETERS ON (AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PERIOD_ID = AUTOMATIONS_PERIODS.ID)
      INNER JOIN AUTOMATIONS_PARAMETERS ON (AUTOMATIONS_PARAMETERS.ID = AUTOMATIONS_PERIODS_PARAMETERS.AUTOMATION_PARAMETERS_ID)
      INNER JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.MACHINE_ID = MACHINES_AUTOMATIONS_PERIODS.MACHINE_ID)
      INNER JOIN DUTS_DEVICES ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      INNER JOIN DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)
  `
  if (qPars.DUT_ID !== undefined) { sentence += ` WHERE DEVICES.DEVICE_CODE = :DUT_ID ` }

  sentence += ` ORDER BY AUTOMATIONS_PERIODS.BEGIN_TIME ASC, AUTOMATIONS_PERIODS.END_TIME ASC `

  return sqldb.query<{
    DUT_SCHEDULE_ID: number
    DUT_ID: string
    SCHEDULE_TITLE: string
    SCHEDULE_STATUS: string
    BEGIN_TIME: string
    END_TIME: string
    DAYS: string
    NEED_MULT_SCHEDULES: string
    MACHINE: number
    DUT_AUTOMATION_PARAMETERS_ID: number
    CTRLOPER: string
    PERMISSION: 'allow'|'forbid'
    SETPOINT: number
    LTC: number
    LTI: number
    UPPER_HYSTERESIS: number
    LOWER_HYSTERESIS: number
    SCHEDULE_START_BEHAVIOR: string
    SCHEDULE_END_BEHAVIOR: string
    FORCED_BEHAVIOR: string
    IR_ID_COOL: string
    ACTION_MODE: string
    ACTION_TIME: number
    ACTION_POST_BEHAVIOR: string
    CURRENT_IN_DUT: string
    CURRFW_VERS: string
  }>(sentence, qPars)
}
import * as sqldb from '../connectSql'

export function getSetpointsToTelemetry (qPars: { MACHINE_ID: number, dateStart: string, dateEnd: string, timezoneOffset: number }) {
    let sentence = `
      SELECT
        MACHINES_SETPOINTS_AUTOMATION_HIST.MACHINE_ID,
        MACHINES_SETPOINTS_AUTOMATION_HIST.SETPOINT,
        DATE_FORMAT(DATE_ADD(MACHINES_SETPOINTS_AUTOMATION_HIST.START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d %H:%i:%S') AS FULL_START_DATE, 
        DATE_FORMAT(DATE_ADD(MACHINES_SETPOINTS_AUTOMATION_HIST.END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d %H:%i:%S') AS FULL_END_DATE,
        TIME_TO_SEC(DATE_ADD(START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR)) AS SECONDS_START,
        COALESCE(TIME_TO_SEC(DATE_ADD(END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR)),86400) AS SECONDS_END
    `
    sentence += `
      FROM
          MACHINES_SETPOINTS_AUTOMATION_HIST
    `
  
    const conditions: string[] = []
    if (qPars.dateEnd != null) { conditions.push(`DATE_FORMAT(DATE_ADD(MACHINES_SETPOINTS_AUTOMATION_HIST.START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') <= :dateEnd`) }
    if (qPars.dateStart != null) { conditions.push(`(DATE_FORMAT(DATE_ADD(MACHINES_SETPOINTS_AUTOMATION_HIST.END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') >= :dateStart OR MACHINES_SETPOINTS_AUTOMATION_HIST.END_DATE IS NULL)`) }
    if (qPars.MACHINE_ID != null) { conditions.push(`MACHINES_SETPOINTS_AUTOMATION_HIST.MACHINE_ID = :MACHINE_ID`) }
  
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
    sentence += ' ORDER BY FULL_START_DATE ASC';
    return sqldb.query<{
      MACHINE_ID: number,
      SETPOINT: number
      END_DATE: string
      FULL_START_DATE: string
      FULL_END_DATE: string
      SECONDS_START: number
      SECONDS_END: number
    }>(sentence, qPars)
  }
  
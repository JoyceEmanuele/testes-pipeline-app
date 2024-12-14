import * as sqldb from '../connectSql'

export function getDevsToTelemetry (qPars: { ENVIRONMENT_ID: number, dateStart: string, dateEnd: string, timezoneOffset: number }) {
  let sentence = `
    SELECT
      DUTS_MONITORING_HIST.DUT_CODE AS DEV_ID,
      DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') AS START_DATE,
      DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') AS END_DATE,
      DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d %H:%i:%S') AS FULL_START_DATE, 
      DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d %H:%i:%S') AS FULL_END_DATE
  `
  sentence += `
    FROM
      DUTS_MONITORING_HIST
  `

  const conditions: string[] = []
  if (qPars.ENVIRONMENT_ID != null) { conditions.push(`DUTS_MONITORING_HIST.ENVIRONMENT_ID = :ENVIRONMENT_ID`) }
  if (qPars.dateEnd != null) { conditions.push(`DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.START_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') <= :dateEnd`) }
  if (qPars.dateStart != null) { conditions.push(`(DATE_FORMAT(DATE_ADD(DUTS_MONITORING_HIST.END_DATE, INTERVAL ${qPars.timezoneOffset != null ? qPars.timezoneOffset : -3} HOUR), '%Y-%m-%d') >= :dateStart OR DUTS_MONITORING_HIST.END_DATE IS NULL)`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ' ORDER BY FULL_START_DATE ASC';
  return sqldb.query<{
    DEV_ID: string,
    START_DATE: string
    END_DATE: string
    FULL_START_DATE: string
    FULL_END_DATE: string
  }>(sentence, qPars)
}

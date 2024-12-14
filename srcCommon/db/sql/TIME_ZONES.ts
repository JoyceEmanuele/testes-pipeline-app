import * as sqldb from '../connectSql'

export function selectTimeZones () {
  let sentence = `
    SELECT
        TIME_ZONES.ID AS id,
        TIME_ZONES.AREA AS area

    FROM
        TIME_ZONES

    ORDER BY TIME_ZONES.AREA ASC 
  `

  return sqldb.query<{
    id: number
    area: string
  }>(sentence)
}

export function selectTimeZonesWithOffset () {
  let sentence = `
    SELECT
        TIME_ZONES.ID AS id,
        TIME_ZONES.AREA AS area,
        TIME_ZONES.TIME_ZONE_OFFSET AS 'offset'
    FROM
        TIME_ZONES

    ORDER BY 'offset' ASC  
  `

  return sqldb.query<{
    id: number
    area: string
    offset: number
  }>(sentence)
}


export function getTimezone (qPars: { TIMEZONE_AREA?: string, TIMEZONE_ID?: number }) {
  let sentence = `
    SELECT
      TIME_ZONES.ID AS id,
      TIME_ZONES.TIME_ZONE_OFFSET as 'offset',
      TIME_ZONES.AREA as area
  `
  sentence += `
    FROM
      TIME_ZONES
  `

  const conditions: string[] = []
  if (qPars.TIMEZONE_AREA) { conditions.push(`LOWER(TIME_ZONES.AREA) = LOWER(:TIMEZONE_AREA)`) }
  if (qPars.TIMEZONE_ID) { conditions.push(`LOWER(TIME_ZONES.ID) = LOWER(:TIMEZONE_ID)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    id: number
    offset: number
    area: string
  }>(sentence, qPars)
}

export function setPosixTimezone(qPars: { POSIX: string, ID: number }) {
  let sentence = `
    UPDATE
      TIME_ZONES
    SET
      POSIX = :POSIX
    WHERE ID = :ID;
  `
  return sqldb.execute(sentence, qPars);
}

export function getTimezoneAllInfo (qPars: { TIMEZONE_AREA?: string, TIMEZONE_ID?: number }) {
  let sentence = `
    SELECT
      TIME_ZONES.ID AS id,
      TIME_ZONES.TIME_ZONE_OFFSET as 'offset',
      TIME_ZONES.AREA as area,
      TIME_ZONES.POSIX as posix,
      TIME_ZONES.DST_ABREVIATION as dst_abreviation,
      TIME_ZONES.ABREVIATION_ZONE as abreviation_zone
  `
  sentence += `
    FROM
      TIME_ZONES
  `

  const conditions: string[] = []
  if (qPars.TIMEZONE_AREA) { conditions.push(`LOWER(TIME_ZONES.AREA) = LOWER(:TIMEZONE_AREA)`) }
  if (qPars.TIMEZONE_ID) { conditions.push(`LOWER(TIME_ZONES.ID) = LOWER(:TIMEZONE_ID)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    id: number
    offset: number
    area: string
    posix: string
    dst_abreviation: string
    abreviation_zone: string
  }>(sentence, qPars)
}

export function getTimezonesOfDevices () {
  let sentence = `
    SELECT
    DEVICES.DEVICE_CODE,
    COALESCE(CLUNITS.TIMEZONE_ID, 31) AS TIMEZONE_ID
    FROM DEVICES
    LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
  `

  return sqldb.query<{
    DEVICE_CODE: string,
    TIMEZONE_ID: number
  }>(sentence)
}

export function getTableTimezone() {
  let sentence = `
    SELECT
      TIME_ZONES.ID AS id,
      TIME_ZONES.TIME_ZONE_OFFSET as 'offset',
      TIME_ZONES.AREA as area,
      TIME_ZONES.POSIX as posix,
      TIME_ZONES.DST_ABREVIATION as dst_abreviation,
      TIME_ZONES.ABREVIATION_ZONE as abreviation_zone
    FROM
      TIME_ZONES
  `

  return sqldb.query<{
    id: number
    offset: number
    area: string
    posix: string
    dst_abreviation: string
    abreviation_zone: string
  }>(sentence)
}

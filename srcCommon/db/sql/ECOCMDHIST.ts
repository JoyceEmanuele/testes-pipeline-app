import * as sqldb from '../connectSql'
// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM ECOCMDHIST
  FIELD ECOCMDHIST.devId
  FIELD ECOCMDHIST.ts
  FIELD ECOCMDHIST.duration
  FIELD ECOCMDHIST.mode
*/
export function w_insertUpdate (qPars: { devId: string, ts: string, duration: number, mode: string }) {
  const fields: string[] = []
  fields.push('devId')
  fields.push('ts')
  fields.push('duration')
  fields.push('mode')

  let sentence = `INSERT INTO ECOCMDHIST (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("duration = :duration")
  updateFields.push("mode = :mode")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM devId: {ECOCMDHIST.devId}
  PARAM dayStart: {ECOCMDHIST.ts}
  PARAM dayNext: {ECOCMDHIST.ts}
  FROM ECOCMDHIST
  SELECT ECOCMDHIST.ts
  SELECT ECOCMDHIST.duration
  SELECT ECOCMDHIST.mode
  WHERE {ECOCMDHIST.devId} = {:devId}
  WHERE {ECOCMDHIST.ts} >= {:dayStart} AND {ECOCMDHIST.ts} < {:dayNext}
  ORDER BY ECOCMDHIST.ts ASC
*/
export function getList (qPars: { devId: string, dayStart: string, dayNext: string }) {
  let sentence = `
    SELECT
      ECOCMDHIST.ts,
      ECOCMDHIST.duration,
      ECOCMDHIST.mode
  `
  sentence += `
    FROM
      ECOCMDHIST
  `

  const conditions: string[] = []
  conditions.push(`ECOCMDHIST.devId = :devId`)
  conditions.push(`ECOCMDHIST.ts >= :dayStart AND ECOCMDHIST.ts < :dayNext`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY ECOCMDHIST.ts ASC `

  return sqldb.query<{
    ts: string
    duration: number
    mode: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListDamDay = SELECT DISTINCT
  PARAM dayStart?: {ECOCMDHIST.ts}
  PARAM dayNext?: {ECOCMDHIST.ts}
  FROM ECOCMDHIST
  SELECT ECOCMDHIST.devId
  SELECT (SUBSTRING({ECOCMDHIST.ts}, 1, 10)) AS YMD: string
  WHERE [[IFOWNPROP {:dayStart}]] {ECOCMDHIST.ts} >= {:dayStart}
  WHERE [[IFOWNPROP {:dayNext}]] {ECOCMDHIST.ts} < {:dayNext}
*/
export function getListDamDay (qPars: { dayStart?: string, dayNext?: string }) {
  let sentence = `
    SELECT DISTINCT
      ECOCMDHIST.devId,
      (SUBSTRING(ECOCMDHIST.ts, 1, 10)) AS YMD
  `
  sentence += `
    FROM
      ECOCMDHIST
  `

  const conditions: string[] = []
  if (qPars.dayStart !== undefined) { conditions.push(`ECOCMDHIST.ts >= :dayStart`) }
  if (qPars.dayNext !== undefined) { conditions.push(`ECOCMDHIST.ts < :dayNext`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    devId: string
    YMD: string
  }>(sentence, qPars)
}

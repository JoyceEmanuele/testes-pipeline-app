import * as sqldb from '../connectSql'
// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM cache_gameter_cons
  FIELD cache_gameter_cons.YMD
  FIELD cache_gameter_cons.meterId
  FIELD cache_gameter_cons.conswh
  FIELD cache_gameter_cons.invoice
  FIELD cache_gameter_cons.datCache
*/
export function w_insertUpdate (qPars: { YMD: string, meterId: number, conswh: number, invoice: number, datCache: string }) {
  const fields: string[] = []
  fields.push('YMD')
  fields.push('meterId')
  fields.push('conswh')
  fields.push('invoice')
  fields.push('datCache')

  let sentence = `INSERT INTO cache_gameter_cons (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("conswh = :conswh")
  updateFields.push("invoice = :invoice")
  updateFields.push("datCache = :datCache")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM cache_gameter_cons
  FIELD cache_gameter_cons.YMD
  FIELD cache_gameter_cons.meterId
  FIELD cache_gameter_cons.conswh
  FIELD cache_gameter_cons.invoice
  FIELD cache_gameter_cons.datCache
*/
export function w_insertIgnore (qPars: { YMD: string, meterId: number, conswh: number, invoice: number, datCache: string }) {
  const fields: string[] = []
  fields.push('YMD')
  fields.push('meterId')
  fields.push('conswh')
  fields.push('invoice')
  fields.push('datCache')

  const sentence = `INSERT IGNORE INTO cache_gameter_cons (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getItem = SELECT ROW
  PARAM meterId: {cache_gameter_cons.meterId}
  PARAM YMD: {cache_gameter_cons.YMD}
  FROM cache_gameter_cons
  SELECT cache_gameter_cons.meterId
  SELECT cache_gameter_cons.YMD
  SELECT cache_gameter_cons.conswh
  SELECT cache_gameter_cons.invoice
  WHERE {cache_gameter_cons.meterId} = {:meterId} AND {cache_gameter_cons.YMD} = {:YMD}
*/
export function getItem (qPars: { meterId: number, YMD: string }) {
  let sentence = `
    SELECT
      cache_gameter_cons.meterId,
      cache_gameter_cons.YMD,
      cache_gameter_cons.conswh,
      cache_gameter_cons.invoice
  `
  sentence += `
    FROM
      cache_gameter_cons
  `

  sentence += ` WHERE cache_gameter_cons.meterId = :meterId AND cache_gameter_cons.YMD = :YMD `

  return sqldb.querySingle<{
    meterId: number
    YMD: string
    conswh: number
    invoice: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM meterIds: {cache_gameter_cons.meterId}[]
  PARAM dayStart: {cache_gameter_cons.YMD}
  PARAM dayEndInc: {cache_gameter_cons.YMD}
  FROM cache_gameter_cons
  SELECT cache_gameter_cons.meterId
  SELECT cache_gameter_cons.YMD
  SELECT cache_gameter_cons.conswh
  SELECT cache_gameter_cons.invoice
  WHERE {cache_gameter_cons.meterId} IN ({:meterIds})
  WHERE {cache_gameter_cons.YMD} >= {:dayStart} AND {cache_gameter_cons.YMD} <= {:dayEndInc}
*/
export function getList (qPars: { meterIds: number[], dayStart: string, dayEndInc: string }) {
  let sentence = `
    SELECT
      cache_gameter_cons.meterId,
      cache_gameter_cons.YMD,
      cache_gameter_cons.conswh,
      cache_gameter_cons.invoice
  `
  sentence += `
    FROM
      cache_gameter_cons
  `

  const conditions: string[] = []
  conditions.push(`cache_gameter_cons.meterId IN (:meterIds)`)
  conditions.push(`cache_gameter_cons.YMD >= :dayStart AND cache_gameter_cons.YMD <= :dayEndInc`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    meterId: number
    YMD: string
    conswh: number
    invoice: number
  }>(sentence, qPars)
}

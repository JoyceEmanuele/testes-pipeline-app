import * as sqldb from '../connectSql'
// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC insertUpdate = INSERT-UPDATE
  FROM cache_unit_autom_savings
  FIELD cache_unit_autom_savings.YMD
  FIELD cache_unit_autom_savings.unitId
  FIELD cache_unit_autom_savings.totalEst
*/
export function w_insertUpdate (qPars: { YMD: string, unitId: number, totalEst: number, datCache: string }) {
  const fields: string[] = []
  fields.push('YMD')
  fields.push('unitId')
  fields.push('totalEst')
  fields.push('datCache')

  let sentence = `INSERT INTO cache_unit_autom_savings (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("totalEst = :totalEst")
  updateFields.push("datCache = :datCache")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM unitId: {cache_unit_autom_savings.unitId}
  PARAM dayStart: {cache_unit_autom_savings.YMD}
  PARAM dayEnd: {cache_unit_autom_savings.YMD}
  FROM cache_unit_autom_savings
  SELECT cache_unit_autom_savings.unitId
  SELECT cache_unit_autom_savings.YMD
  SELECT cache_unit_autom_savings.totalEst
  WHERE {cache_unit_autom_savings.unitId} = {:unitId}
  WHERE {cache_unit_autom_savings.YMD} >= {:dayStart} AND {cache_unit_autom_savings.YMD} <= {:dayEnd}
*/
export function getUnitDaysList (qPars: { unitId: number, dayStart: string, dayEnd: string }) {
  let sentence = `
    SELECT
      cache_unit_autom_savings.unitId,
      cache_unit_autom_savings.YMD,
      cache_unit_autom_savings.totalEst
  `
  sentence += `
    FROM
      cache_unit_autom_savings
  `

  const conditions: string[] = []
  conditions.push(`cache_unit_autom_savings.unitId = :unitId`)
  conditions.push(`cache_unit_autom_savings.YMD >= :dayStart AND cache_unit_autom_savings.YMD <= :dayEnd`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    unitId: number
    YMD: string
    totalEst: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM dayStart: {cache_unit_autom_savings.YMD}
  PARAM dayEnd: {cache_unit_autom_savings.YMD}
  FROM cache_unit_autom_savings
  SELECT cache_unit_autom_savings.unitId
  SELECT cache_unit_autom_savings.YMD
  SELECT cache_unit_autom_savings.totalEst
  WHERE {cache_unit_autom_savings.YMD} >= {:dayStart} AND {cache_unit_autom_savings.YMD} <= {:dayEnd}
*/
export function getList (qPars: { unitIds: number[], dayStart: string, dayEnd: string }) {
  let sentence = `
    SELECT
      cache_unit_autom_savings.unitId,
      cache_unit_autom_savings.YMD,
      cache_unit_autom_savings.totalEst
  `
  sentence += `
    FROM
      cache_unit_autom_savings
  `

  const conditions: string[] = []
  conditions.push(`cache_unit_autom_savings.unitId IN (:unitIds)`)
  conditions.push(`cache_unit_autom_savings.YMD >= :dayStart AND cache_unit_autom_savings.YMD <= :dayEnd`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    unitId: number
    YMD: string
    totalEst: number
  }>(sentence, qPars)
}

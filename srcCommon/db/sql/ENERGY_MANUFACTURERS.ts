import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM ENERGY_MANUFACTURERS

  SELECT ENERGY_MANUFACTURERS.MANUFACTURER_ID
  SELECT ENERGY_MANUFACTURERS.NAME
*/
export function getList (qPars: {}) {
  let sentence = `
    SELECT
      ENERGY_MANUFACTURERS.MANUFACTURER_ID,
      ENERGY_MANUFACTURERS.NAME
  `
  sentence += `
    FROM
      ENERGY_MANUFACTURERS
  `

  sentence += `
    ORDER BY
      ENERGY_MANUFACTURERS.NAME ASC
  `

  return sqldb.query<{
    MANUFACTURER_ID: number,
    NAME: string,
  }>(sentence, qPars)
}

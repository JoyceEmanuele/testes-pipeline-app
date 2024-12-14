import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM ENERGY_METER_MODELS

  SELECT ENERGY_METER_MODELS.MODEL_ID
  SELECT ENERGY_METER_MODELS.MANUFACTURER_ID
  SELECT ENERGY_METER_MODELS.NAME
*/
export function getList (qPars: {}) {
  let sentence = `
    SELECT
      ENERGY_METER_MODELS.MODEL_ID,
      ENERGY_METER_MODELS.MANUFACTURER_ID,
      ENERGY_METER_MODELS.NAME
  `
  sentence += `
    FROM
      ENERGY_METER_MODELS
  `

  return sqldb.query<{
    MODEL_ID: number,
    MANUFACTURER_ID: number,
    NAME: string,
  }>(sentence, qPars)
}
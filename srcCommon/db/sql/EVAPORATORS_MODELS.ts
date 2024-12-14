import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getEvaporatorModelsComboOpts = SELECT LIST
  FROM EVAPORATORS_MODELS

  SELECT EVAPORATORS_MODELS.ID AS value
  SELECT EVAPORATORS_MODELS.EVAPORATOR_MODEL AS label
*/
export function getEvaporatorModelsComboOpts () {
  let sentence = `
    SELECT
      EVAPORATORS_MODELS.ID AS value,
      EVAPORATORS_MODELS.EVAPORATOR_MODEL AS label
  `
  sentence += `
    FROM
      EVAPORATORS_MODELS
    WHERE EVAPORATORS_MODELS.EVAPORATOR_MODEL IS NOT NULL AND EVAPORATORS_MODELS.INSUFFLATION_SPEED IS NOT NULL
  `

  return sqldb.query<{
    value: string
    label: string
  }>(sentence)
}
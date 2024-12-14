import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getLinesList = SELECT

  FROM CHILLER_CARRIER_LINES

  SELECT CHILLER_CARRIER_LINES.ID,
  SELECT CHILLER_CARRIER_LINES.LINE_NAME
*/
export function getLinesList (qPars: {
}) {
  let sentence = `
    SELECT
      CHILLER_CARRIER_LINES.ID,
      CHILLER_CARRIER_LINES.LINE_NAME
  `

  sentence += `
    FROM
      CHILLER_CARRIER_LINES
  `

  return sqldb.query<{
    ID: number
    LINE_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getChillerModelsComboOpts = SELECT LIST
  FROM CHILLER_CARRIER_LINES

  SELECT CHILLER_CARRIER_LINES.ID AS value
  SELECT CHILLER_CARRIER_LINES.LINE_NAME AS label
*/
export function getChillerLinesComboOpts () {
  let sentence = `
    SELECT DISTINCT
      CHILLER_CARRIER_LINES.ID AS value,
      CHILLER_CARRIER_LINES.LINE_NAME AS label
  `
  sentence += `
    FROM
      CHILLER_CARRIER_LINES
    INNER JOIN CHILLER_CARRIER_MODELS ON (CHILLER_CARRIER_MODELS.CHILLER_CARRIER_LINE_ID = CHILLER_CARRIER_LINES.ID)
  `

  return sqldb.query<{
    value: string
    label: string
  }>(sentence)
}

export async function getModelById (qPars: { ID: number }) {
  let sentence = `
    SELECT
      CHILLER_CARRIER_LINES.LINE_NAME
    FROM
      CHILLER_CARRIER_LINES
    WHERE CHILLER_CARRIER_LINES.ID = :ID
  `
  return sqldb.querySingle<{
    LINE_NAME: string
  }>(sentence, qPars)
}

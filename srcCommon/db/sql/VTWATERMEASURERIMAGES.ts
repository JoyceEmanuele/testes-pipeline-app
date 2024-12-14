import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtWaterMeasurerImages = INSERT
  FROM VTWATERMEASURERIMAGES
  FIELD VTWATERMEASURERIMAGES.WATERMEASURERS_ID
  FIELD VTWATERMEASURERIMAGES.CONTEXT
  FIELD VTWATERMEASURERIMAGES.URIS
*/
export async function w_addVtWaterMeasurerImages (qPars: { WATERMEASURERS_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('WATERMEASURERS_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTWATERMEASURERIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTWATERMEASURERIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTWATERMEASURERIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC waterMeasurerImageExist = SELECT ROW
  PARAM WATERMEASURERS_ID: {VTWATERMEASURERIMAGES.WATERMEASURERS_ID}
  PARAM URIS: {VTWATERMEASURERIMAGES.URIS}

  FROM VTWATERMEASURERIMAGES

  SELECT VTWATERMEASURERIMAGES.WATERMEASURERS_ID

  WHERE [[IFJS {:WATERMEASURERS_ID}]] {VTWATERMEASURERIMAGES.WATERMEASURERS_ID} = {:WATERMEASURERS_ID}
  WHERE [[IFJS {:URIS}]] {VTWATERMEASURERIMAGES.URIS} = {:URIS}
*/
export function waterMeasurerImageExist (qPars: { WATERMEASURERS_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTWATERMEASURERIMAGES.WATERMEASURERS_ID
  `
  sentence += `
    FROM
      VTWATERMEASURERIMAGES
  `

  const conditions: string[] = []
  if (qPars.WATERMEASURERS_ID) { conditions.push(`VTWATERMEASURERIMAGES.WATERMEASURERS_ID = :WATERMEASURERS_ID`) }
  if (qPars.URIS) { conditions.push(`VTWATERMEASURERIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    WATERMEASURERS_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtWaterMeasurerImages = DELETE
  PARAM WATERMEASURERS_ID: {VTWATERMEASURERIMAGES.WATERMEASURERS_ID}
  FROM VTWATERMEASURERIMAGES
  WHERE {VTWATERMEASURERIMAGES.WATERMEASURERS_ID} = {:WATERMEASURERS_ID}
*/
export async function w_deleteVtWaterMeasurerImages (qPars: { WATERMEASURERS_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTWATERMEASURERIMAGES WHERE VTWATERMEASURERIMAGES.WATERMEASURERS_ID = :WATERMEASURERS_ID`;

  if (operationLogData) {
    await saveOperationLog('VTWATERMEASURERIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTWATERMEASURERIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

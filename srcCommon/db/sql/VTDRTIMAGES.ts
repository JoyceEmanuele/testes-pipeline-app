import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtDrtImages = INSERT
  FROM VTDRTIMAGES
  FIELD VTDRTIMAGES.DRT_ID
  FIELD VTDRTIMAGES.CONTEXT
  FIELD VTDRTIMAGES.URIS
*/
export async function w_addVtDrtImages (qPars: { DRT_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DRT_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTDRTIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTDRTIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTDRTIMAGES]', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC drtImageExist = SELECT ROW
  PARAM DRT_ID: {VTDRTIMAGES.DRT_ID}
  PARAM URIS: {VTDRTIMAGES.URIS}

  FROM VTDRTIMAGES

  SELECT VTDRTIMAGES.DRT_ID

  WHERE [[IFJS {:DRT_ID}]] {VTDRTIMAGES.DRT_ID} = {:DRT_ID}
  WHERE [[IFJS {:URIS}]] {VTDRTIMAGES.URIS} = {:URIS}
*/
export function drtImageExist (qPars: { DRT_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTDRTIMAGES.DRT_ID
  `
  sentence += `
    FROM
      VTDRTIMAGES
  `

  const conditions: string[] = []
  if (qPars.DRT_ID) { conditions.push(`VTDRTIMAGES.DRT_ID = :DRT_ID`) }
  if (qPars.URIS) { conditions.push(`VTDRTIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    DRT_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtDrtImages = DELETE
  PARAM DRT_ID: {VTDRTIMAGES.DRT_ID}
  FROM VTDRTIMAGES
  WHERE {VTDRTIMAGES.DRT_ID} = {:DRT_ID}
*/
export async function w_deleteVtDrtImages (qPars: { DRT_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTDRTIMAGES WHERE VTDRTIMAGES.DRT_ID = :DRT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTDRTIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTDRTIMAGES]', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

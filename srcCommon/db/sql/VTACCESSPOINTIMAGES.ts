import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtAccessPointImages = INSERT
  FROM VTACCESSPOINTIMAGES
  FIELD VTACCESSPOINTIMAGES.ACCESSPOINT_ID
  FIELD VTACCESSPOINTIMAGES.CONTEXT
  FIELD VTACCESSPOINTIMAGES.URIS
*/
export async function w_addVtAccessPointImages (qPars: { ACCESSPOINT_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ACCESSPOINT_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTACCESSPOINTIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTACCESSPOINTIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTACCESSPOINTIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC accessPointImageExist = SELECT ROW
  PARAM ACCESSPOINT_ID: {VTACCESSPOINTIMAGES.ACCESSPOINT_ID}
  PARAM URIS: {VTACCESSPOINTIMAGES.URIS}

  FROM VTACCESSPOINTIMAGES

  SELECT VTACCESSPOINTIMAGES.ACCESSPOINT_ID

  WHERE [[IFJS {:ACCESSPOINT_ID}]] {VTACCESSPOINTIMAGES.ACCESSPOINT_ID} = {:ACCESSPOINT_ID}
  WHERE [[IFJS {:URIS}]] {VTACCESSPOINTIMAGES.URIS} = {:URIS}
*/
export function accessPointImageExist (qPars: { ACCESSPOINT_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTACCESSPOINTIMAGES.ACCESSPOINT_ID
  `
  sentence += `
    FROM
      VTACCESSPOINTIMAGES
  `

  const conditions: string[] = []
  if (qPars.ACCESSPOINT_ID) { conditions.push(`VTACCESSPOINTIMAGES.ACCESSPOINT_ID = :ACCESSPOINT_ID`) }
  if (qPars.URIS) { conditions.push(`VTACCESSPOINTIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ACCESSPOINT_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtAccessPointImages = DELETE
  PARAM ACCESSPOINT_ID: {VTACCESSPOINTIMAGES.ACCESSPOINT_ID}
  FROM VTACCESSPOINTIMAGES
  WHERE {VTACCESSPOINTIMAGES.ACCESSPOINT_ID} = {:ACCESSPOINT_ID}
*/
export async function w_deleteVtAccessPointImages (qPars: { ACCESSPOINT_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTACCESSPOINTIMAGES WHERE VTACCESSPOINTIMAGES.ACCESSPOINT_ID = :ACCESSPOINT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTACCESSPOINTIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTACCESSPOINTIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtRackImages = INSERT
  FROM VTRACKIMAGES
  FIELD VTRACKIMAGES.RACK_ID
  FIELD VTRACKIMAGES.CONTEXT
  FIELD VTRACKIMAGES.URIS
*/
export async function w_addVtRackImages (qPars: { RACK_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('RACK_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTRACKIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTRACKIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTRACKIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC rackImageExist = SELECT ROW
  PARAM RACK_ID: {VTRACKIMAGES.RACK_ID}
  PARAM URIS: {VTRACKIMAGES.URIS}

  FROM VTRACKIMAGES

  SELECT VTRACKIMAGES.RACK_ID

  WHERE [[IFJS {:RACK_ID}]] {VTRACKIMAGES.RACK_ID} = {:RACK_ID}
  WHERE [[IFJS {:URIS}]] {VTRACKIMAGES.URIS} = {:URIS}
*/
export function rackImageExist (qPars: { RACK_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTRACKIMAGES.RACK_ID
  `
  sentence += `
    FROM
      VTRACKIMAGES
  `

  const conditions: string[] = []
  if (qPars.RACK_ID) { conditions.push(`VTRACKIMAGES.RACK_ID = :RACK_ID`) }
  if (qPars.URIS) { conditions.push(`VTRACKIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    RACK_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtRackImages = DELETE
  PARAM RACK_ID: {VTRACKIMAGES.RACK_ID}
  FROM VTRACKIMAGES
  WHERE {VTRACKIMAGES.RACK_ID} = {:RACK_ID}
*/
export async function w_deleteVtRackImages (qPars: { RACK_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTRACKIMAGES WHERE VTRACKIMAGES.RACK_ID = :RACK_ID`;

  if (operationLogData) {
    await saveOperationLog('VTRACKIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTRACKIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

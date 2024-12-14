import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtEnvImages = INSERT
  FROM VTENVIMAGES
  FIELD VTENVIMAGES.ENV_ID
  FIELD VTENVIMAGES.CONTEXT
  FIELD VTENVIMAGES.URIS
*/
export async function w_addVtEnvImages (qPars: { ENV_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ENV_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTENVIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTENVIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTENVIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC envImageExist = SELECT ROW
  PARAM ENV_ID: {VTENVIMAGES.ENV_ID}
  PARAM URIS: {VTENVIMAGES.URIS}

  FROM VTENVIMAGES

  SELECT VTENVIMAGES.ENV_ID

  WHERE [[IFJS {:ENV_ID}]] {VTENVIMAGES.ENV_ID} = {:ENV_ID}
  WHERE [[IFJS {:URIS}]] {VTENVIMAGES.URIS} = {:URIS}
*/
export function envImageExist (qPars: { ENV_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTENVIMAGES.ENV_ID
  `
  sentence += `
    FROM
      VTENVIMAGES
  `

  const conditions: string[] = []
  if (qPars.ENV_ID) { conditions.push(`VTENVIMAGES.ENV_ID = :ENV_ID`) }
  if (qPars.URIS) { conditions.push(`VTENVIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ENV_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtEnvImages = DELETE
  PARAM ENV_ID: {VTENVIMAGES.ENV_ID}
  FROM VTENVIMAGES
  WHERE {VTENVIMAGES.ENV_ID} = {:ENV_ID}
*/
export async function w_deleteVtEnvImages (qPars: { ENV_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTENVIMAGES WHERE VTENVIMAGES.ENV_ID = :ENV_ID`;

  if (operationLogData) {
    await saveOperationLog('VTENVIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTENVIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

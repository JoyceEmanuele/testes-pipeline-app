import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtEnergyImages = INSERT
  FROM VTENERGYIMAGES
  FIELD VTENERGYIMAGES.ENERGY_ID
  FIELD VTENERGYIMAGES.CONTEXT
  FIELD VTENERGYIMAGES.URIS
*/
export async function w_addVtEnergyImages (qPars: { ENERGY_ID: number, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ENERGY_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTENERGYIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTENERGYIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTENERGYIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC energyImageExist = SELECT ROW
  PARAM ENERGY_ID: {VTENERGYIMAGES.ENERGY_ID}
  PARAM URIS: {VTENERGYIMAGES.URIS}

  FROM VTENERGYIMAGES

  SELECT VTENERGYIMAGES.ENERGY_ID

  WHERE [[IFJS {:ENERGY_ID}]] {VTENERGYIMAGES.ENERGY_ID} = {:ENERGY_ID}
  WHERE [[IFJS {:URIS}]] {VTENERGYIMAGES.URIS} = {:URIS}
*/
export function energyImageExist (qPars: { ENERGY_ID: number, URIS: string }) {
  let sentence = `
    SELECT
      VTENERGYIMAGES.ENERGY_ID
  `
  sentence += `
    FROM
      VTENERGYIMAGES
  `

  const conditions: string[] = []
  if (qPars.ENERGY_ID) { conditions.push(`VTENERGYIMAGES.ENERGY_ID = :ENERGY_ID`) }
  if (qPars.URIS) { conditions.push(`VTENERGYIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ENERGY_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtEnergyImages = DELETE
  PARAM ENERGY_ID: {VTENERGYIMAGES.ENERGY_ID}
  FROM VTENERGYIMAGES
  WHERE {VTENERGYIMAGES.ENERGY_ID} = {:ENERGY_ID}
*/
export async function w_deleteVtEnergyImages (qPars: { ENERGY_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTENERGYIMAGES WHERE VTENERGYIMAGES.ENERGY_ID = :ENERGY_ID`;

  if (operationLogData) {
    await saveOperationLog('VTENERGYIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTENERGYIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

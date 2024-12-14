import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtMachineImages = INSERT
  FROM VTMACHINEIMAGES
  FIELD VTMACHINEIMAGES.MACHINE_ID
  FIELD VTMACHINEIMAGES.CONTEXT
  FIELD VTMACHINEIMAGES.URIS
*/
export async function w_addVtMachineImages (qPars: { MACHINE_ID: string, CONTEXT: string, URIS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('MACHINE_ID')
  fields.push('CONTEXT')
  fields.push('URIS')

  const sentence = `INSERT INTO VTMACHINEIMAGES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTMACHINEIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC machineImageExist = SELECT ROW
  PARAM MACHINE_ID: {VTMACHINEIMAGES.MACHINE_ID}
  PARAM URIS: {VTMACHINEIMAGES.URIS}

  FROM VTMACHINEIMAGES

  SELECT VTMACHINEIMAGES.MACHINE_ID

  WHERE [[IFJS {:MACHINE_ID}]] {VTMACHINEIMAGES.MACHINE_ID} = {:MACHINE_ID}
  WHERE [[IFJS {:URIS}]] {VTMACHINEIMAGES.URIS} = {:URIS}
*/
export function machineImageExist (qPars: { MACHINE_ID: string, URIS: string }) {
  let sentence = `
    SELECT
      VTMACHINEIMAGES.MACHINE_ID
  `
  sentence += `
    FROM
      VTMACHINEIMAGES
  `

  const conditions: string[] = []
  if (qPars.MACHINE_ID) { conditions.push(`VTMACHINEIMAGES.MACHINE_ID = :MACHINE_ID`) }
  if (qPars.URIS) { conditions.push(`VTMACHINEIMAGES.URIS = :URIS`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    MACHINE_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineImages = DELETE
  PARAM MACHINE_ID: {VTMACHINEIMAGES.MACHINE_ID}
  FROM VTMACHINEIMAGES
  WHERE {VTMACHINEIMAGES.MACHINE_ID} = {:MACHINE_ID}
*/
export async function w_deleteVtMachineImages (qPars: { MACHINE_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEIMAGES WHERE VTMACHINEIMAGES.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEIMAGES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEIMAGES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

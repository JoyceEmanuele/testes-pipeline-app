import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addDrts = INSERT
  FROM VTDRTS
  FIELD VTDRTS.ID
  FIELD VTDRTS.VT_ID
  FIELD VTDRTS.ENVIRONMENT_ID
*/
export async function w_addDrts (qPars: { ID: string, VT_ID: number, ENVIRONMENT_ID: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('VT_ID')
  fields.push('ENVIRONMENT_ID')

  const sentence = `INSERT INTO VTDRTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTDRTS', sentence, qPars, operationLogData);
    dbLogger('VTDRTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtDrts = UPDATE
  PARAM ID: {VTDRTS.ID}
  FROM VTDRTS
  FIELD [[IFOWNPROP {:VT_ID}]]       VTDRTS.VT_ID
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]]         VTDRTS.ENVIRONMENT_ID
*/
export async function w_updateVtDrts (qPars: { ID: string, VT_ID: number, ENVIRONMENT_ID: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.VT_ID !== undefined) { fields.push('VT_ID = :VT_ID') }
  if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTDRTS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTDRTS', sentence, qPars, operationLogData);
    dbLogger('VTDRTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC drtExist = SELECT ROW
  PARAM ID: {VTDRTS.ID}

  FROM VTDRTS

  SELECT VTDRTS.ID

  WHERE [[IFJS {:ID}]] {VTDRTS.ID} = {:ID}
*/
export function drtExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTDRTS.ID
  `
  sentence += `
    FROM
      VTDRTS
  `

  if (qPars.ID) { sentence += ` WHERE VTDRTS.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtDrts = SELECT LIST
  PARAM VT_ID: {VTDRTS.VT_ID}

  FROM VTDRTS

  SELECT VTDRTS.ID

  WHERE [[IFJS {:VT_ID}]] {VTDRTS.VT_ID} = {:VT_ID}
*/
export function getVtDrts (qPars: { VT_ID: number }) {
  let sentence = `
    SELECT
      VTDRTS.ID
  `
  sentence += `
    FROM
      VTDRTS
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTDRTS.VT_ID = :VT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtDrts = DELETE
  PARAM VT_ID: {VTDRTS.VT_ID}
  FROM VTDRTS
  WHERE {VTDRTS.VT_ID} = {:VT_ID}
*/
export async function w_deleteVtDrts (qPars: { VT_ID: number }, delChecks: {
  VTDRTIMAGES: true,
  VTRACKS: true,
  VTACCESSPOINTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTDRTS WHERE VTDRTS.VT_ID = :VT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTDRTS', sentence, qPars, operationLogData);
    dbLogger('VTDRTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

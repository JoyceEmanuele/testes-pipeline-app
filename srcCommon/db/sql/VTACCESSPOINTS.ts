import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtAccesspoints = INSERT
  FROM VTACCESSPOINTS
  FIELD VTACCESSPOINTS.ID
  FIELD VTACCESSPOINTS.DRT_ID
  FIELD VTACCESSPOINTS.ENVIRONMENT_ID
  FIELD VTACCESSPOINTS.TYPE
  FIELD VTACCESSPOINTS.DISTANCETOAP
  FIELD VTACCESSPOINTS.COMMENTS
*/
export async function w_addVtAccesspoints (qPars: {
  ID: string,
  DRT_ID: string,
  ENVIRONMENT_ID: string,
  TYPE: string,
  DISTANCETOAP: string,
  COMMENTS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('DRT_ID')
  fields.push('ENVIRONMENT_ID')
  fields.push('TYPE')
  fields.push('DISTANCETOAP')
  fields.push('COMMENTS')

  const sentence = `INSERT INTO VTACCESSPOINTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTACCESSPOINTS', sentence, qPars, operationLogData);
    dbLogger('VTACCESSPOINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtAccesspoints = UPDATE
  PARAM ID: {VTACCESSPOINTS.ID}
  FROM VTACCESSPOINTS
  FIELD [[IFOWNPROP {:DRT_ID}]]       VTACCESSPOINTS.DRT_ID
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]]         VTACCESSPOINTS.ENVIRONMENT_ID
  FIELD [[IFOWNPROP {:TYPE}]]       VTACCESSPOINTS.TYPE
  FIELD [[IFOWNPROP {:DISTANCETOAP}]]      VTACCESSPOINTS.DISTANCETOAP
  FIELD [[IFOWNPROP {:COMMENTS}]]          VTACCESSPOINTS.COMMENTS
*/
export async function w_updateVtAccesspoints (qPars: {
  ID: string,
  DRT_ID?: string,
  ENVIRONMENT_ID?: string,
  TYPE?: string,
  DISTANCETOAP?: string,
  COMMENTS?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DRT_ID !== undefined) { fields.push('DRT_ID = :DRT_ID') }
  if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
  if (qPars.TYPE !== undefined) { fields.push('TYPE = :TYPE') }
  if (qPars.DISTANCETOAP !== undefined) { fields.push('DISTANCETOAP = :DISTANCETOAP') }
  if (qPars.COMMENTS !== undefined) { fields.push('COMMENTS = :COMMENTS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTACCESSPOINTS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTACCESSPOINTS', sentence, qPars, operationLogData);
    dbLogger('VTACCESSPOINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC accesspointsExist = SELECT ROW
  PARAM ID: {VTACCESSPOINTS.ID}

  FROM VTACCESSPOINTS

  SELECT VTACCESSPOINTS.ID

  WHERE [[IFJS {:ID}]] {VTACCESSPOINTS.ID} = {:ID}
*/
export function accesspointsExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTACCESSPOINTS.ID
  `
  sentence += `
    FROM
      VTACCESSPOINTS
  `

  if (qPars.ID) { sentence += ` WHERE VTACCESSPOINTS.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtAccesspoints = SELECT LIST
  PARAM DRT_ID: {VTACCESSPOINTS.DRT_ID}

  FROM VTACCESSPOINTS

  SELECT VTACCESSPOINTS.ID

  WHERE [[IFJS {:DRT_ID}]] {VTACCESSPOINTS.DRT_ID} = {:DRT_ID}
*/
export function getVtAccesspoints (qPars: { DRT_ID: string }) {
  let sentence = `
    SELECT
      VTACCESSPOINTS.ID
  `
  sentence += `
    FROM
      VTACCESSPOINTS
  `

  if (qPars.DRT_ID) { sentence += ` WHERE VTACCESSPOINTS.DRT_ID = :DRT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtAccesspoints = DELETE
  PARAM DRT_ID: {VTACCESSPOINTS.DRT_ID}
  FROM VTACCESSPOINTS
  WHERE {VTACCESSPOINTS.DRT_ID} = {:DRT_ID}
*/
export async function w_deleteVtAccesspoints (qPars: { DRT_ID: string }, delChecks: {
  VTACCESSPOINTIMAGES: true,
  VTSERVEDENVIRONMENTMACHINE: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTACCESSPOINTS WHERE VTACCESSPOINTS.DRT_ID = :DRT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTACCESSPOINTS', sentence, qPars, operationLogData);
    dbLogger('VTACCESSPOINTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

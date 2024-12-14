import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addRacks = INSERT
  FROM VTRACKS
  FIELD VTRACKS.ID
  FIELD VTRACKS.DRT_ID
  FIELD VTRACKS.ENVIRONMENT_ID
  FIELD VTRACKS.DISTANCETOAP
  FIELD VTRACKS.COMMENTS
*/
export async function w_addRacks (qPars: { ID: string, DRT_ID: string, ENVIRONMENT_ID: string, DISTANCETOAP: string, COMMENTS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('DRT_ID')
  fields.push('ENVIRONMENT_ID')
  fields.push('DISTANCETOAP')
  fields.push('COMMENTS')

  const sentence = `INSERT INTO VTRACKS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTRACKS', sentence, qPars, operationLogData);
    dbLogger('VTRACKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtRacks = UPDATE
  PARAM ID: {VTRACKS.ID}
  FROM VTRACKS
  FIELD [[IFOWNPROP {:DRT_ID}]]       VTRACKS.DRT_ID
  FIELD [[IFOWNPROP {:ENVIRONMENT_ID}]]         VTRACKS.ENVIRONMENT_ID
  FIELD [[IFOWNPROP {:DISTANCETOAP}]]       VTRACKS.DISTANCETOAP
  FIELD [[IFOWNPROP {:COMMENTS}]]      VTRACKS.COMMENTS
*/
export async function w_updateVtRacks (qPars: {
  ID: string,
  DRT_ID: string,
  ENVIRONMENT_ID: string,
  DISTANCETOAP: string,
  COMMENTS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DRT_ID !== undefined) { fields.push('DRT_ID = :DRT_ID') }
  if (qPars.ENVIRONMENT_ID !== undefined) { fields.push('ENVIRONMENT_ID = :ENVIRONMENT_ID') }
  if (qPars.DISTANCETOAP !== undefined) { fields.push('DISTANCETOAP = :DISTANCETOAP') }
  if (qPars.COMMENTS !== undefined) { fields.push('COMMENTS = :COMMENTS') }
 if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTRACKS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTRACKS', sentence, qPars, operationLogData);
    dbLogger('VTRACKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC racksExist = SELECT ROW
  PARAM ID: {VTRACKS.ID}

  FROM VTRACKS

  SELECT VTRACKS.ID

  WHERE [[IFJS {:ID}]] {VTRACKS.ID} = {:ID}
*/
export function racksExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTRACKS.ID
  `
  sentence += `
    FROM
      VTRACKS
  `

  if (qPars.ID) { sentence += ` WHERE VTRACKS.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtRacks = SELECT LIST
  PARAM DRT_ID: {VTRACKS.DRT_ID}

  FROM VTRACKS

  SELECT VTRACKS.ID

  WHERE [[IFJS {:DRT_ID}]] {VTRACKS.DRT_ID} = {:DRT_ID}
*/
export function getVtRacks (qPars: { DRT_ID: string }) {
  let sentence = `
    SELECT
      VTRACKS.ID
  `
  sentence += `
    FROM
      VTRACKS
  `

  if (qPars.DRT_ID) { sentence += ` WHERE VTRACKS.DRT_ID = :DRT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtRacks = DELETE
  PARAM DRT_ID: {VTRACKS.DRT_ID}
  FROM VTRACKS
  WHERE {VTRACKS.DRT_ID} = {:DRT_ID}
*/
export async function w_deleteVtRacks (qPars: { DRT_ID: string }, delChecks: {
  VTRACKIMAGES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTRACKS WHERE VTRACKS.DRT_ID = :DRT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTRACKS', sentence, qPars, operationLogData);
    dbLogger('VTRACKS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

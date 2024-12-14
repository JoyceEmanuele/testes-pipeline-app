import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addServedeEnvironmentMachines = INSERT
  FROM VTSERVEDENVIRONMENTMACHINE
  FIELD VTSERVEDENVIRONMENTMACHINE.ID
  FIELD VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID
  FIELD VTSERVEDENVIRONMENTMACHINE.TYPE
  FIELD VTSERVEDENVIRONMENTMACHINE.TAG
  FIELD VTSERVEDENVIRONMENTMACHINE.SIGNALQUALITY
  FIELD VTSERVEDENVIRONMENTMACHINE.DISTANCETOAP
  FIELD VTSERVEDENVIRONMENTMACHINE.COMMENTS
*/
export async function w_addServedeEnvironmentMachines (qPars: {
  ID: string,
  ACCESSPOINT_ID: string,
  TYPE: string,
  TAG: string,
  SIGNALQUALITY: string,
  DISTANCETOAP: string,
  COMMENTS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('ACCESSPOINT_ID')
  fields.push('TYPE')
  fields.push('TAG')
  fields.push('SIGNALQUALITY')
  fields.push('DISTANCETOAP')
  fields.push('COMMENTS')

  const sentence = `INSERT INTO VTSERVEDENVIRONMENTMACHINE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
    dbLogger('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtServedeEnvironmentMachines = UPDATE
  PARAM ID: {VTSERVEDENVIRONMENTMACHINE.ID}
  FROM VTSERVEDENVIRONMENTMACHINE
  FIELD [[IFOWNPROP {:ACCESSPOINT_ID}]]       VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID
  FIELD [[IFOWNPROP {:TYPE}]]         VTSERVEDENVIRONMENTMACHINE.TYPE
  FIELD [[IFOWNPROP {:TAG}]]       VTSERVEDENVIRONMENTMACHINE.TAG
  FIELD [[IFOWNPROP {:SIGNALQUALITY}]]      VTSERVEDENVIRONMENTMACHINE.SIGNALQUALITY
  FIELD [[IFOWNPROP {:DISTANCETOAP}]]          VTSERVEDENVIRONMENTMACHINE.DISTANCETOAP
  FIELD [[IFOWNPROP {:COMMENTS}]]          VTSERVEDENVIRONMENTMACHINE.COMMENTS
*/
export async function w_updateVtServedeEnvironmentMachines (qPars: {
  ID: string,
  ACCESSPOINT_ID: string,
  TYPE: string,
  TAG: string,
  SIGNALQUALITY: string,
  DISTANCETOAP: string,
  COMMENTS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.ACCESSPOINT_ID !== undefined) { fields.push('ACCESSPOINT_ID = :ACCESSPOINT_ID') }
  if (qPars.TYPE !== undefined) { fields.push('TYPE = :TYPE') }
  if (qPars.TAG !== undefined) { fields.push('TAG = :TAG') }
  if (qPars.SIGNALQUALITY !== undefined) { fields.push('SIGNALQUALITY = :SIGNALQUALITY') }
  if (qPars.DISTANCETOAP !== undefined) { fields.push('DISTANCETOAP = :DISTANCETOAP') }
  if (qPars.COMMENTS !== undefined) { fields.push('COMMENTS = :COMMENTS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTSERVEDENVIRONMENTMACHINE SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
    dbLogger('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC servedeEnvironmentMachinesExist = SELECT ROW
  PARAM ID: {VTSERVEDENVIRONMENTMACHINE.ID}

  FROM VTSERVEDENVIRONMENTMACHINE

  SELECT VTSERVEDENVIRONMENTMACHINE.ID

  WHERE [[IFJS {:ID}]] {VTSERVEDENVIRONMENTMACHINE.ID} = {:ID}
*/
export function servedeEnvironmentMachinesExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTSERVEDENVIRONMENTMACHINE.ID
  `
  sentence += `
    FROM
      VTSERVEDENVIRONMENTMACHINE
  `

  if (qPars.ID) { sentence += ` WHERE VTSERVEDENVIRONMENTMACHINE.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtServedeEnvironmentMachines = SELECT LIST
  PARAM ACCESSPOINT_ID: {VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID}

  FROM VTSERVEDENVIRONMENTMACHINE

  SELECT VTSERVEDENVIRONMENTMACHINE.ID

  WHERE [[IFJS {:ACCESSPOINT_ID}]] {VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID} = {:ACCESSPOINT_ID}
*/
export function getVtServedeEnvironmentMachines (qPars: { ACCESSPOINT_ID: string }) {
  let sentence = `
    SELECT
      VTSERVEDENVIRONMENTMACHINE.ID
  `
  sentence += `
    FROM
      VTSERVEDENVIRONMENTMACHINE
  `

  if (qPars.ACCESSPOINT_ID) { sentence += ` WHERE VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID = :ACCESSPOINT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtServedeEnvironmentMachines = DELETE
  PARAM ACCESSPOINT_ID: {VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID}
  FROM VTSERVEDENVIRONMENTMACHINE
  WHERE {VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID} = {:ACCESSPOINT_ID}
*/
export async function w_deleteVtServedeEnvironmentMachines (qPars: { ACCESSPOINT_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTSERVEDENVIRONMENTMACHINE WHERE VTSERVEDENVIRONMENTMACHINE.ACCESSPOINT_ID = :ACCESSPOINT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
    dbLogger('VTSERVEDENVIRONMENTMACHINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

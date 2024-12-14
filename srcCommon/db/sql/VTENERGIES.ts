import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addEnergies = INSERT
  FROM VTENERGIES
  FIELD VTENERGIES.VT_ID
*/
export async function w_addEnergies (qPars: { VT_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('VT_ID')

  const sentence = `INSERT INTO VTENERGIES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTENERGIES', sentence, qPars, operationLogData);
    dbLogger('VTENERGIES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtEnergies = UPDATE
  PARAM ID: {VTENERGIES.ID}
  FROM VTENERGIES
  FIELD VTENERGIES.VT_ID
*/
export async function w_updateVtEnergies (qPars: { ID: number, VT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `UPDATE VTENERGIES SET VT_ID = :VT_ID WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTENERGIES', sentence, qPars, operationLogData);
    dbLogger('VTENERGIES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC energyExist = SELECT ROW
  PARAM VT_ID: {VTENERGIES.VT_ID}

  FROM VTENERGIES

  SELECT VTENERGIES.ID

  WHERE [[IFJS {:VT_ID}]] {VTENERGIES.VT_ID} = {:VT_ID}
*/
export function energyExist (qPars: { VT_ID: number }) {
  let sentence = `
    SELECT
      VTENERGIES.ID
  `
  sentence += `
    FROM
      VTENERGIES
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTENERGIES.VT_ID = :VT_ID ` }

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtEnergies = SELECT ROW
  PARAM VT_ID: {VTENERGIES.VT_ID}

  FROM VTENERGIES

  SELECT VTENERGIES.ID

  WHERE [[IFJS {:VT_ID}]] {VTENERGIES.VT_ID} = {:VT_ID}
*/
export function getVtEnergies (qPars: { VT_ID: number }) {
  let sentence = `
    SELECT
      VTENERGIES.ID
  `
  sentence += `
    FROM
      VTENERGIES
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTENERGIES.VT_ID = :VT_ID ` }

  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtEnergies = DELETE
  PARAM VT_ID: {VTENERGIES.VT_ID}
  FROM VTENERGIES
  WHERE {VTENERGIES.VT_ID} = {:VT_ID}
*/
export async function w_deleteVtEnergies (qPars: { VT_ID: number }, delChecks: {
  VTENERGYIMAGES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTENERGIES WHERE VTENERGIES.VT_ID = :VT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTENERGIES', sentence, qPars, operationLogData);
    dbLogger('VTENERGIES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

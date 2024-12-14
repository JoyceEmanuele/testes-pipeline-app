import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtMachineMachines = INSERT
  FROM VTMACHINEMACHINES
  FIELD VTMACHINEMACHINES.ID_MACHINE
  FIELD VTMACHINEMACHINES.ID_ASSOCIETED
*/
export async function w_addVtMachineMachines (qPars: { ID_MACHINE: string, ID_ASSOCIETED: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID_MACHINE')
  fields.push('ID_ASSOCIETED')

  const sentence = `INSERT INTO VTMACHINEMACHINES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTMACHINEMACHINES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEMACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC machineMachineExist = SELECT ROW
  PARAM ID_MACHINE: {VTMACHINEMACHINES.ID_MACHINE}
  PARAM ID_ASSOCIETED: {VTMACHINEMACHINES.ID_ASSOCIETED}

  FROM VTMACHINEMACHINES

  SELECT VTMACHINEMACHINES.ID_MACHINE

  WHERE [[IFJS {:ID_MACHINE}]] {VTMACHINEMACHINES.ID_MACHINE} = {:ID_MACHINE}
  WHERE [[IFJS {:ID_ASSOCIETED}]] {VTMACHINEMACHINES.ID_ASSOCIETED} = {:ID_ASSOCIETED}
*/
export function machineMachineExist (qPars: { ID_MACHINE: string, ID_ASSOCIETED: string }) {
  let sentence = `
    SELECT
      VTMACHINEMACHINES.ID_MACHINE
  `
  sentence += `
    FROM
      VTMACHINEMACHINES
  `

  const conditions: string[] = []
  if (qPars.ID_MACHINE) { conditions.push(`VTMACHINEMACHINES.ID_MACHINE = :ID_MACHINE`) }
  if (qPars.ID_ASSOCIETED) { conditions.push(`VTMACHINEMACHINES.ID_ASSOCIETED = :ID_ASSOCIETED`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID_MACHINE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineMachines = DELETE
  PARAM ID_MACHINE: {VTMACHINEMACHINES.ID_MACHINE}
  FROM VTMACHINEMACHINES
  WHERE {VTMACHINEMACHINES.ID_MACHINE} = {:ID_MACHINE}
*/
export async function w_deleteVtMachineMachines (qPars: { ID_MACHINE: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEMACHINES WHERE VTMACHINEMACHINES.ID_MACHINE = :ID_MACHINE`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEMACHINES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEMACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

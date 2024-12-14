import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtMachineEnvsLocation = INSERT
  FROM VTMACHINEENVSLOCATION
  FIELD VTMACHINEENVSLOCATION.ID_MACHINE
  FIELD VTMACHINEENVSLOCATION.ID_ENV
*/
export async function w_addVtMachineEnvsLocation (qPars: { ID_MACHINE: string, ID_ENV: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID_MACHINE')
  fields.push('ID_ENV')

  const sentence = `INSERT INTO VTMACHINEENVSLOCATION (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC machineEnvLocationExist = SELECT ROW
  PARAM ID_MACHINE: {VTMACHINEENVSLOCATION.ID_MACHINE}
  PARAM ID_ENV: {VTMACHINEENVSLOCATION.ID_ENV}

  FROM VTMACHINEENVSLOCATION

  SELECT VTMACHINEENVSLOCATION.ID_MACHINE

  WHERE [[IFJS {:ID_MACHINE}]] {VTMACHINEENVSLOCATION.ID_MACHINE} = {:ID_MACHINE}
  WHERE [[IFJS {:ID_ENV}]] {VTMACHINEENVSLOCATION.ID_ENV} = {:ID_ENV}
*/
export function machineEnvLocationExist (qPars: { ID_MACHINE: string, ID_ENV: string }) {
  let sentence = `
    SELECT
      VTMACHINEENVSLOCATION.ID_MACHINE
  `
  sentence += `
    FROM
      VTMACHINEENVSLOCATION
  `

  const conditions: string[] = []
  if (qPars.ID_MACHINE) { conditions.push(`VTMACHINEENVSLOCATION.ID_MACHINE = :ID_MACHINE`) }
  if (qPars.ID_ENV) { conditions.push(`VTMACHINEENVSLOCATION.ID_ENV = :ID_ENV`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID_MACHINE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineEnvsLocation = DELETE
  PARAM ID_MACHINE: {VTMACHINEENVSLOCATION.ID_MACHINE}
  FROM VTMACHINEENVSLOCATION
  WHERE {VTMACHINEENVSLOCATION.ID_MACHINE} = {:ID_MACHINE}
*/
export async function w_deleteVtMachineEnvsLocation (qPars: { ID_MACHINE: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEENVSLOCATION WHERE VTMACHINEENVSLOCATION.ID_MACHINE = :ID_MACHINE`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineEnvsLocation2 = DELETE
  PARAM ID_ENV: {VTMACHINEENVSLOCATION.ID_ENV}
  FROM VTMACHINEENVSLOCATION
  WHERE {VTMACHINEENVSLOCATION.ID_ENV} = {:ID_ENV}
*/
export async function w_deleteVtMachineEnvsLocation2 (qPars: { ID_ENV: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEENVSLOCATION WHERE VTMACHINEENVSLOCATION.ID_ENV = :ID_ENV`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVSLOCATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

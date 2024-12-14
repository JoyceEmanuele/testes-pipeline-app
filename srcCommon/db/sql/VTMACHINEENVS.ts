import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtMachineEnvs = INSERT
  FROM VTMACHINEENVS
  FIELD VTMACHINEENVS.ID_MACHINE
  FIELD VTMACHINEENVS.ID_ENV
*/
export async function w_addVtMachineEnvs (qPars: { ID_MACHINE: string, ID_ENV: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID_MACHINE')
  fields.push('ID_ENV')

  const sentence = `INSERT INTO VTMACHINEENVS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVS', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC machineEnvExist = SELECT ROW
  PARAM ID_MACHINE: {VTMACHINEENVS.ID_MACHINE}
  PARAM ID_ENV: {VTMACHINEENVS.ID_ENV}

  FROM VTMACHINEENVS

  SELECT VTMACHINEENVS.ID_MACHINE

  WHERE [[IFJS {:ID_MACHINE}]] {VTMACHINEENVS.ID_MACHINE} = {:ID_MACHINE}
  WHERE [[IFJS {:ID_ENV}]] {VTMACHINEENVS.ID_ENV} = {:ID_ENV}
*/
export function machineEnvExist (qPars: { ID_MACHINE: string, ID_ENV: string }) {
  let sentence = `
    SELECT
      VTMACHINEENVS.ID_MACHINE
  `
  sentence += `
    FROM
      VTMACHINEENVS
  `

  const conditions: string[] = []
  if (qPars.ID_MACHINE) { conditions.push(`VTMACHINEENVS.ID_MACHINE = :ID_MACHINE`) }
  if (qPars.ID_ENV) { conditions.push(`VTMACHINEENVS.ID_ENV = :ID_ENV`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID_MACHINE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineEnvs = DELETE
  PARAM ID_MACHINE: {VTMACHINEENVS.ID_MACHINE}
  FROM VTMACHINEENVS
  WHERE {VTMACHINEENVS.ID_MACHINE} = {:ID_MACHINE}
*/
export async function w_deleteVtMachineEnvs (qPars: { ID_MACHINE: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEENVS WHERE VTMACHINEENVS.ID_MACHINE = :ID_MACHINE`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVS', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachineEnvs2 = DELETE
  PARAM ID_ENV: {VTMACHINEENVS.ID_ENV}
  FROM VTMACHINEENVS
  WHERE {VTMACHINEENVS.ID_ENV} = {:ID_ENV}
*/
export async function w_deleteVtMachineEnvs2 (qPars: { ID_ENV: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINEENVS WHERE VTMACHINEENVS.ID_ENV = :ID_ENV`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINEENVS', sentence, qPars, operationLogData);
    dbLogger('VTMACHINEENVS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

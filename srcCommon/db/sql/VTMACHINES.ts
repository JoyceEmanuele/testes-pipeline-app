import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addMachines = INSERT
  FROM VTMACHINES
  FIELD VTMACHINES.ID
  FIELD VTMACHINES.VT_ID
  FIELD VTMACHINES.TYPE_ID
  FIELD VTMACHINES.UNIT_ID
  FIELD VTMACHINES.TAG
  FIELD VTMACHINES.TYPE
  FIELD VTMACHINES.MODEL
  FIELD VTMACHINES.BRAND
  FIELD VTMACHINES.CYCLES
  FIELD VTMACHINES.FRIGO_CAPACITY
  FIELD VTMACHINES.RATED_POWER
  FIELD VTMACHINES.TENSION
  FIELD VTMACHINES.FLUID
  FIELD VTMACHINES.VALVE
*/
export async function w_addMachines (qPars: {
  ID: string,
  VT_ID: number,
  TYPE_ID: number,
  UNIT_ID: number,
  TAG: string,
  TYPE: string,
  MODEL: string,
  BRAND: string,
  CYCLES: number,
  FRIGO_CAPACITY: string,
  RATED_POWER: string,
  TENSION: string,
  FLUID: string,
  VALVE: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('VT_ID')
  fields.push('TYPE_ID')
  fields.push('UNIT_ID')
  fields.push('TAG')
  fields.push('TYPE')
  fields.push('MODEL')
  fields.push('BRAND')
  fields.push('CYCLES')
  fields.push('FRIGO_CAPACITY')
  fields.push('RATED_POWER')
  fields.push('TENSION')
  fields.push('FLUID')
  fields.push('VALVE')

  const sentence = `INSERT INTO VTMACHINES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTMACHINES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtMachines = UPDATE
  PARAM ID: {VTMACHINES.ID}
  FROM VTMACHINES
  FIELD [[IFOWNPROP {:VT_ID}]]       VTMACHINES.VT_ID
  FIELD [[IFOWNPROP {:TYPE_ID}]]         VTMACHINES.TYPE_ID
  FIELD [[IFOWNPROP {:UNIT_ID}]]       VTMACHINES.UNIT_ID
  FIELD [[IFOWNPROP {:TAG}]]      VTMACHINES.TAG
  FIELD [[IFOWNPROP {:TYPE}]]          VTMACHINES.TYPE
  FIELD [[IFOWNPROP {:MODEL}]]          VTMACHINES.MODEL
  FIELD [[IFOWNPROP {:BRAND}]]          VTMACHINES.BRAND
  FIELD [[IFOWNPROP {:CYCLES}]]       VTMACHINES.CYCLES
  FIELD [[IFOWNPROP {:FRIGO_CAPACITY}]]        VTMACHINES.FRIGO_CAPACITY
  FIELD [[IFOWNPROP {:RATED_POWER}]]  VTMACHINES.RATED_POWER
  FIELD [[IFOWNPROP {:TENSION}]] VTMACHINES.TENSION
  FIELD [[IFOWNPROP {:FLUID}]] VTMACHINES.FLUID
  FIELD [[IFOWNPROP {:VALVE}]] VTMACHINES.VALVE
*/
export async function w_updateVtMachines (qPars: {
  ID: string,
  VT_ID: number,
  TYPE_ID: number,
  UNIT_ID: number,
  TAG: string,
  TYPE: string,
  MODEL: string,
  BRAND: string,
  CYCLES: number,
  FRIGO_CAPACITY: string,
  RATED_POWER: string,
  TENSION: string,
  FLUID: string,
  VALVE: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.VT_ID !== undefined) { fields.push('VT_ID = :VT_ID') }
  if (qPars.TYPE_ID !== undefined) { fields.push('TYPE_ID = :TYPE_ID') }
  if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
  if (qPars.TAG !== undefined) { fields.push('TAG = :TAG') }
  if (qPars.TYPE !== undefined) { fields.push('TYPE = :TYPE') }
  if (qPars.MODEL !== undefined) { fields.push('MODEL = :MODEL') }
  if (qPars.BRAND !== undefined) { fields.push('BRAND = :BRAND') }
  if (qPars.CYCLES !== undefined) { fields.push('CYCLES = :CYCLES') }
  if (qPars.FRIGO_CAPACITY !== undefined) { fields.push('FRIGO_CAPACITY = :FRIGO_CAPACITY') }
  if (qPars.RATED_POWER !== undefined) { fields.push('RATED_POWER = :RATED_POWER') }
  if (qPars.TENSION !== undefined) { fields.push('TENSION = :TENSION') }
  if (qPars.FLUID !== undefined) { fields.push('FLUID = :FLUID') }
  if (qPars.VALVE !== undefined) { fields.push('VALVE = :VALVE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTMACHINES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTMACHINES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC machineExist = SELECT ROW
  PARAM ID: {VTMACHINES.ID}

  FROM VTMACHINES

  SELECT VTMACHINES.ID

  WHERE [[IFJS {:ID}]] {VTMACHINES.ID} = {:ID}
*/
export function machineExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTMACHINES.ID
  `
  sentence += `
    FROM
      VTMACHINES
  `

  if (qPars.ID) { sentence += ` WHERE VTMACHINES.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtMachines = SELECT LIST
  PARAM VT_ID: {VTMACHINES.VT_ID}

  FROM VTMACHINES

  SELECT VTMACHINES.ID

  WHERE [[IFJS {:VT_ID}]] {VTMACHINES.VT_ID} = {:VT_ID}
*/
export function getVtMachines (qPars: { VT_ID: number }) {
  let sentence = `
    SELECT
      VTMACHINES.ID
  `
  sentence += `
    FROM
      VTMACHINES
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTMACHINES.VT_ID = :VT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtMachines = DELETE
  PARAM VT_ID: {VTMACHINES.VT_ID}
  FROM VTMACHINES
  WHERE {VTMACHINES.VT_ID} = {:VT_ID}
*/
export async function w_deleteVtMachines (qPars: { VT_ID: number }, delChecks: {
  VTMACHINEENVS: true,
  VTMACHINEENVSLOCATION: true,
  VTMACHINEIMAGES: true,
  VTMACHINEMACHINES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTMACHINES WHERE VTMACHINES.VT_ID = :VT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTMACHINES', sentence, qPars, operationLogData);
    dbLogger('VTMACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

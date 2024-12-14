import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVtEnvironment = INSERT
  FROM VTENVIRONMENTS
  FIELD VTENVIRONMENTS.ID
  FIELD VTENVIRONMENTS.VT_ID
  FIELD VTENVIRONMENTS.ENVTYPE_ID
  FIELD VTENVIRONMENTS.TAG
  FIELD VTENVIRONMENTS.NAME
  FIELD VTENVIRONMENTS.LOCATION
  FIELD VTENVIRONMENTS.TYPE
  FIELD VTENVIRONMENTS.EVAPORATORS_COUNT
  FIELD VTENVIRONMENTS.SHOULD_EVAPORATORS_WORK_FULLTIME
  FIELD VTENVIRONMENTS.CONTROLLERTIME
  FIELD VTENVIRONMENTS.MINTEMPERATURE
  FIELD VTENVIRONMENTS.MAXTEMPERATURE
  FIELD VTENVIRONMENTS.AREA_IN_SQUARE_METERS
*/
export async function w_addVtEnvironment (qPars: {
  ID: string,
  VT_ID: number,
  ENVTYPE_ID: number,
  TAG: string,
  NAME: string,
  LOCATION: string,
  TYPE: string,
  EVAPORATORS_COUNT: number,
  SHOULD_EVAPORATORS_WORK_FULLTIME: number,
  CONTROLLERTIME: string,
  MINTEMPERATURE: string,
  MAXTEMPERATURE: string,
  AREA_IN_SQUARE_METERS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('VT_ID')
  fields.push('ENVTYPE_ID')
  fields.push('TAG')
  fields.push('NAME')
  fields.push('LOCATION')
  fields.push('TYPE')
  fields.push('EVAPORATORS_COUNT')
  fields.push('SHOULD_EVAPORATORS_WORK_FULLTIME')
  fields.push('CONTROLLERTIME')
  fields.push('MINTEMPERATURE')
  fields.push('MAXTEMPERATURE')
  fields.push('AREA_IN_SQUARE_METERS')

  const sentence = `INSERT INTO VTENVIRONMENTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('VTENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtEnvironment = UPDATE
  PARAM ID: {VTENVIRONMENTS.ID}
  FROM VTENVIRONMENTS
  FIELD [[IFOWNPROP {:VT_ID}]]       VTENVIRONMENTS.VT_ID
  FIELD [[IFOWNPROP {:ENVTYPE_ID}]]       VTENVIRONMENTS.ENVTYPE_ID
  FIELD [[IFOWNPROP {:TAG}]]         VTENVIRONMENTS.TAG
  FIELD [[IFOWNPROP {:NAME}]]       VTENVIRONMENTS.NAME
  FIELD [[IFOWNPROP {:LOCATION}]]      VTENVIRONMENTS.LOCATION
  FIELD [[IFOWNPROP {:TYPE}]]          VTENVIRONMENTS.TYPE
  FIELD [[IFOWNPROP {:EVAPORATORS_COUNT}]]          VTENVIRONMENTS.EVAPORATORS_COUNT
  FIELD [[IFOWNPROP {:SHOULD_EVAPORATORS_WORK_FULLTIME}]]       VTENVIRONMENTS.SHOULD_EVAPORATORS_WORK_FULLTIME
  FIELD [[IFOWNPROP {:CONTROLLERTIME}]]        VTENVIRONMENTS.CONTROLLERTIME
  FIELD [[IFOWNPROP {:MINTEMPERATURE}]]  VTENVIRONMENTS.MINTEMPERATURE
  FIELD [[IFOWNPROP {:MAXTEMPERATURE}]] VTENVIRONMENTS.MAXTEMPERATURE
  FIELD [[IFOWNPROP {:AREA_IN_SQUARE_METERS}]] VTENVIRONMENTS.AREA_IN_SQUARE_METERS
*/
export async function w_updateVtEnvironment (qPars: {
  ID: string,
  VT_ID: number,
  ENVTYPE_ID: number,
  TAG: string,
  NAME: string,
  LOCATION: string,
  TYPE: string,
  EVAPORATORS_COUNT?: number,
  SHOULD_EVAPORATORS_WORK_FULLTIME?: number,
  CONTROLLERTIME: string,
  MINTEMPERATURE: string,
  MAXTEMPERATURE: string,
  AREA_IN_SQUARE_METERS: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.VT_ID !== undefined) { fields.push('VT_ID = :VT_ID') }
  if (qPars.ENVTYPE_ID !== undefined) { fields.push('ENVTYPE_ID = :ENVTYPE_ID') }
  if (qPars.TAG !== undefined) { fields.push('TAG = :TAG') }
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (qPars.LOCATION !== undefined) { fields.push('LOCATION = :LOCATION') }
  if (qPars.TYPE !== undefined) { fields.push('TYPE = :TYPE') }
  if (qPars.EVAPORATORS_COUNT !== undefined) { fields.push('EVAPORATORS_COUNT = :EVAPORATORS_COUNT') }
  if (qPars.SHOULD_EVAPORATORS_WORK_FULLTIME !== undefined) { fields.push('SHOULD_EVAPORATORS_WORK_FULLTIME = :SHOULD_EVAPORATORS_WORK_FULLTIME') }
  if (qPars.CONTROLLERTIME !== undefined) { fields.push('CONTROLLERTIME = :CONTROLLERTIME') }
  if (qPars.MINTEMPERATURE !== undefined) { fields.push('MINTEMPERATURE = :MINTEMPERATURE') }
  if (qPars.MAXTEMPERATURE !== undefined) { fields.push('MAXTEMPERATURE = :MAXTEMPERATURE') }
  if (qPars.AREA_IN_SQUARE_METERS !== undefined) { fields.push('AREA_IN_SQUARE_METERS = :AREA_IN_SQUARE_METERS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTENVIRONMENTS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('VTENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC environmentExist = SELECT ROW
  PARAM ID?: {VTENVIRONMENTS.ID}

  FROM VTENVIRONMENTS

  SELECT VTENVIRONMENTS.ID

  WHERE [[IFJS {:ID}]] {VTENVIRONMENTS.ID} = {:ID}
*/
export function environmentExist (qPars: { ID?: string }) {
  let sentence = `
    SELECT
      VTENVIRONMENTS.ID
  `
  sentence += `
    FROM
      VTENVIRONMENTS
  `

  if (qPars.ID) { sentence += ` WHERE VTENVIRONMENTS.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtEnvironments = SELECT LIST
  PARAM VT_ID?: {VTENVIRONMENTS.VT_ID}

  FROM VTENVIRONMENTS

  SELECT VTENVIRONMENTS.ID

  WHERE [[IFJS {:VT_ID}]] {VTENVIRONMENTS.VT_ID} = {:VT_ID}
*/
export function getVtEnvironments (qPars: { VT_ID?: number }) {
  let sentence = `
    SELECT
      VTENVIRONMENTS.ID
  `
  sentence += `
    FROM
      VTENVIRONMENTS
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTENVIRONMENTS.VT_ID = :VT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtEnvironment = DELETE
  PARAM VT_ID: {VTENVIRONMENTS.VT_ID}
  FROM VTENVIRONMENTS
  WHERE {VTENVIRONMENTS.VT_ID} = {:VT_ID}
*/
export async function w_deleteVtEnvironment (qPars: { VT_ID: number }, delChecks: {
  VTENVIMAGES: true,
  VTMACHINEENVS: true,
  VTMACHINEENVSLOCATION: true,
  VTDRTS?: true,
  VTRACKS?: true,
  VTACCESSPOINTS?: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTENVIRONMENTS WHERE VTENVIRONMENTS.VT_ID = :VT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTENVIRONMENTS', sentence, qPars, operationLogData);
    dbLogger('VTENVIRONMENTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

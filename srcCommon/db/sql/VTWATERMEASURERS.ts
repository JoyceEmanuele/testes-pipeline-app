import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addWaterMeasurer = INSERT
  FROM VTWATERMEASURERS
  FIELD VTWATERMEASURERS.ID
  FIELD VTWATERMEASURERS.VT_ID
  FIELD VTWATERMEASURERS.SITUATION
  FIELD VTWATERMEASURERS.BRAND
  FIELD VTWATERMEASURERS.MODEL
  FIELD VTWATERMEASURERS.LOCALIZATION
  FIELD VTWATERMEASURERS.FLOORLOCALIZATION
  FIELD VTWATERMEASURERS.PIPEDIAMETER
  FIELD VTWATERMEASURERS.INSTALLOTHERMETERWITHOUTBUILDING
  FIELD VTWATERMEASURERS.TRANSMISSIONGIVENSUCCESSFULY
*/
export async function w_addWaterMeasurer (qPars: {
  ID: string,
  VT_ID: number,
  SITUATION: string,
  BRAND: string,
  MODEL: string,
  LOCALIZATION: string,
  FLOORLOCALIZATION: string,
  PIPEDIAMETER: string,
  INSTALLOTHERMETERWITHOUTBUILDING: string,
  TRANSMISSIONGIVENSUCCESSFULY: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ID')
  fields.push('VT_ID')
  fields.push('SITUATION')
  fields.push('BRAND')
  fields.push('MODEL')
  fields.push('LOCALIZATION')
  fields.push('FLOORLOCALIZATION')
  fields.push('PIPEDIAMETER')
  fields.push('INSTALLOTHERMETERWITHOUTBUILDING')
  fields.push('TRANSMISSIONGIVENSUCCESSFULY')

  const sentence = `INSERT INTO VTWATERMEASURERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VTWATERMEASURERS', sentence, qPars, operationLogData);
    dbLogger('VTWATERMEASURERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVtWaterMeasurers = UPDATE
  PARAM ID: {VTWATERMEASURERS.ID}
  FROM VTWATERMEASURERS
  FIELD [[IFOWNPROP {:VT_ID}]]       VTWATERMEASURERS.VT_ID
  FIELD [[IFOWNPROP {:SITUATION}]]         VTWATERMEASURERS.SITUATION
  FIELD [[IFOWNPROP {:BRAND}]]       VTWATERMEASURERS.BRAND
  FIELD [[IFOWNPROP {:MODEL}]]      VTWATERMEASURERS.MODEL
  FIELD [[IFOWNPROP {:LOCALIZATION}]]          VTWATERMEASURERS.LOCALIZATION
  FIELD [[IFOWNPROP {:FLOORLOCALIZATION}]]          VTWATERMEASURERS.FLOORLOCALIZATION
  FIELD [[IFOWNPROP {:PIPEDIAMETER}]]          VTWATERMEASURERS.PIPEDIAMETER
  FIELD [[IFOWNPROP {:INSTALLOTHERMETERWITHOUTBUILDING}]]       VTWATERMEASURERS.INSTALLOTHERMETERWITHOUTBUILDING
  FIELD [[IFOWNPROP {:TRANSMISSIONGIVENSUCCESSFULY}]]        VTWATERMEASURERS.TRANSMISSIONGIVENSUCCESSFULY
*/
export async function w_updateVtWaterMeasurers (qPars: {
  ID: string,
  VT_ID: number,
  SITUATION: string,
  BRAND: string,
  MODEL: string,
  LOCALIZATION: string,
  FLOORLOCALIZATION: string,
  PIPEDIAMETER: string,
  INSTALLOTHERMETERWITHOUTBUILDING: string,
  TRANSMISSIONGIVENSUCCESSFULY: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.VT_ID !== undefined) { fields.push('VT_ID = :VT_ID') }
  if (qPars.SITUATION !== undefined) { fields.push('SITUATION = :SITUATION') }
  if (qPars.BRAND !== undefined) { fields.push('BRAND = :BRAND') }
  if (qPars.MODEL !== undefined) { fields.push('MODEL = :MODEL') }
  if (qPars.LOCALIZATION !== undefined) { fields.push('LOCALIZATION = :LOCALIZATION') }
  if (qPars.FLOORLOCALIZATION !== undefined) { fields.push('FLOORLOCALIZATION = :FLOORLOCALIZATION') }
  if (qPars.PIPEDIAMETER !== undefined) { fields.push('PIPEDIAMETER = :PIPEDIAMETER') }
  if (qPars.INSTALLOTHERMETERWITHOUTBUILDING !== undefined) { fields.push('INSTALLOTHERMETERWITHOUTBUILDING = :INSTALLOTHERMETERWITHOUTBUILDING') }
  if (qPars.TRANSMISSIONGIVENSUCCESSFULY !== undefined) { fields.push('TRANSMISSIONGIVENSUCCESSFULY = :TRANSMISSIONGIVENSUCCESSFULY') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE VTWATERMEASURERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VTWATERMEASURERS', sentence, qPars, operationLogData);
    dbLogger('VTWATERMEASURERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC waterMeasurerExist = SELECT ROW
  PARAM ID: {VTWATERMEASURERS.ID}

  FROM VTWATERMEASURERS

  SELECT VTWATERMEASURERS.ID

  WHERE [[IFJS {:ID}]] {VTWATERMEASURERS.ID} = {:ID}
*/
export function waterMeasurerExist (qPars: { ID: string }) {
  let sentence = `
    SELECT
      VTWATERMEASURERS.ID
  `
  sentence += `
    FROM
      VTWATERMEASURERS
  `

  if (qPars.ID) { sentence += ` WHERE VTWATERMEASURERS.ID = :ID ` }

  return sqldb.querySingle<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVtWaterMeasurers = SELECT LIST
  PARAM VT_ID: {VTWATERMEASURERS.VT_ID}

  FROM VTWATERMEASURERS

  SELECT VTWATERMEASURERS.ID

  WHERE [[IFJS {:VT_ID}]] {VTWATERMEASURERS.VT_ID} = {:VT_ID}
*/
export function getVtWaterMeasurers (qPars: { VT_ID: number }) {
  let sentence = `
    SELECT
      VTWATERMEASURERS.ID
  `
  sentence += `
    FROM
      VTWATERMEASURERS
  `

  if (qPars.VT_ID) { sentence += ` WHERE VTWATERMEASURERS.VT_ID = :VT_ID ` }

  return sqldb.query<{
    ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVtWaterMeasurers = DELETE
  PARAM VT_ID: {VTWATERMEASURERS.VT_ID}
  FROM VTWATERMEASURERS
  WHERE {VTWATERMEASURERS.VT_ID} = {:VT_ID}
*/
export async function w_deleteVtWaterMeasurers (qPars: { VT_ID: number }, delChecks: {
  VTWATERMEASURERIMAGES: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VTWATERMEASURERS WHERE VTWATERMEASURERS.VT_ID = :VT_ID`;

  if (operationLogData) {
    await saveOperationLog('VTWATERMEASURERS', sentence, qPars, operationLogData);
    dbLogger('VTWATERMEASURERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

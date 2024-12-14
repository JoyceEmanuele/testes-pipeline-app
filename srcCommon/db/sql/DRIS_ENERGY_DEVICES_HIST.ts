import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM ID: {DRIS_ENERGY_DEVICES_HIST.ID}
  FROM DRIS_ENERGY_DEVICES_HIST
  WHERE {DRIS_ENERGY_DEVICES_HIST.ID} = {:ID}
*/
export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DRIS_ENERGY_DEVICES_HIST WHERE DRIS_ENERGY_DEVICES_HIST.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DRIS_ENERGY_DEVICES_HIST

  FIELD DRIS_ENERGY_DEVICES_HIST.ELECTRIC_CIRCUIT
  FIELD DRIS_ENERGY_DEVICES_HIST.DME_CODE
  FIELD DRIS_ENERGY_DEVICES_HIST.START_DATE
  FIELD DRIS_ENERGY_DEVICES_HIST.END_DATE
*/
export async function w_insert (qPars: {
  ELECTRIC_CIRCUIT: number,
  DME_CODE?: string, 
  START_DATE?: string,
  END_DATE?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  if (qPars.ELECTRIC_CIRCUIT != null) fields.push('ELECTRIC_CIRCUIT')
  if (qPars.DME_CODE != null) fields.push('DME_CODE')
  if (qPars.START_DATE != null) fields.push('START_DATE')
  if (qPars.END_DATE != null) fields.push('END_DATE')

  const sentence = `INSERT INTO DRIS_ENERGY_DEVICES_HIST (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
    dbLogger('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DRIS_ENERGY_DEVICES_HIST
  PARAM ID: {DRIS_ENERGY_DEVICES_HIST.ID}
  FIELD [[IFOWNPROP {:ELECTRIC_CIRCUIT}]] DRIS_ENERGY_DEVICES_HIST.ELECTRIC_CIRCUIT
  FIELD [[IFOWNPROP {:DME_CODE}]] DRIS_ENERGY_DEVICES_HIST.DME_CODE
  FIELD [[IFOWNPROP {:START_DATE}]] DRIS_ENERGY_DEVICES_HIST.START_DATE
  FIELD [[IFOWNPROP {:END_DATE}]] DRIS_ENERGY_DEVICES_HIST.END_DATE
*/
export async function w_updateInfo (
    qPars: { ID: number, 
      ELECTRIC_CIRCUIT?: number,
      DME_CODE?: string, 
      START_DATE?: string,
      END_DATE?: string, }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.ELECTRIC_CIRCUIT !== undefined) { fields.push('ELECTRIC_CIRCUIT = :ELECTRIC_CIRCUIT') }
    if (qPars.DME_CODE !== undefined) { fields.push('DME_CODE = :DME_CODE') }
    if (qPars.START_DATE !== undefined) { fields.push('START_DATE = :START_DATE')}
    if (qPars.END_DATE !== undefined) { fields.push('END_DATE = :END_DATE') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE DRIS_ENERGY_DEVICES_HIST SET ${fields.join(', ')} WHERE ID = :ID`
  
    if (operationLogData) {
      await saveOperationLog('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
      dbLogger('DRIS_ENERGY_DEVICES_HIST', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
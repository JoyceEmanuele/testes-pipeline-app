import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

export function w_insert (qPars: {
  UNIT_ID: number,
  GROUNDPLAN_ID: number
}) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('GROUNDPLAN_ID')

  const sentence = `INSERT INTO GROUND_PLANS_UNITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

export async function w_delete (qPars: {
  UNIT_ID: number,
  GROUNDPLAN_ID: number,
}, operationLogData: OperationLogData) {
    const sentence = `DELETE FROM GROUND_PLANS_UNITS WHERE GROUNDPLAN_ID = :GROUNDPLAN_ID AND UNIT_ID = :UNIT_ID;`;
  
    if (operationLogData) {
      await saveOperationLog('GROUND_PLANS_UNITS', sentence, qPars, operationLogData);
      dbLogger('GROUND_PLANS_UNITS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

  export async function w_deleteByUnit (qPars: {
    UNIT_ID: number,
  }, operationLogData: OperationLogData) {
      const sentence = `DELETE FROM GROUND_PLANS_UNITS WHERE UNIT_ID = :UNIT_ID;`;
    
      if (operationLogData) {
        await saveOperationLog('GROUND_PLANS_UNITS', sentence, qPars, operationLogData);
        dbLogger('GROUND_PLANS_UNITS', sentence, qPars, operationLogData);
      }
    
      return sqldb.execute(sentence, qPars)
    }
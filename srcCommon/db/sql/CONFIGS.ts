import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM CONFIGS

  FIELD CONFIGS.CFG_ID
  FIELD CONFIGS.VAL
*/
export async function w_insert (qPars: { CFG_ID: string, VAL: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CFG_ID')
  fields.push('VAL')

  const sentence = `INSERT INTO CONFIGS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CONFIGS', sentence, qPars, operationLogData);
    dbLogger('CONFIGS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM CFG_ID: {CONFIGS.CFG_ID}

  FROM CONFIGS

  SELECT CONFIGS.CFG_ID
  SELECT CONFIGS.VAL
*/
export function getExtraInfo (qPars: { CFG_ID: string}) {
  let sentence = `
    SELECT
      CONFIGS.CFG_ID,
      CONFIGS.VAL
  `
  sentence += `
    FROM
        CONFIGS
  `
  const conditions: string[] = []
  if (qPars.CFG_ID) { conditions.push(`CONFIGS.CFG_ID = :CFG_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    CFG_ID: string
    VAL: string
  }>(sentence, qPars)
}


  /* @IFHELPER:FUNC updateInfo = UPDATE
  FROM CONFIGS
  PARAM BASELINE_TEMPLATE_ID: {CONFIGS.BASELINE_TEMPLATE_ID}
  FIELD [[IFOWNPROP {:CFG_ID}]] CONFIGS.CFG_ID
  FIELD [[IFOWNPROP {:VAL}]] CONFIGS.VAL
*/
export async function w_updateInfo (
    qPars: { CFG_ID: string, VAL?: string }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.VAL !== undefined) { fields.push('VAL = :VAL') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE CONFIGS SET ${fields.join(', ')} WHERE CFG_ID = :CFG_ID`
  
    if (operationLogData) {
      await saveOperationLog('CONFIGS', sentence, qPars, operationLogData);
      dbLogger('CONFIGS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  
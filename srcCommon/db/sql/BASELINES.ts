import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteBaseLinesInfo = DELETE
  PARAM UNIT_ID: {BASELINES.BASELINE_ID}
  FROM BASELINES
  WHERE {BASELINES.BASELINE_ID} = {:BASELINE_ID}
*/
export async function w_deleteBaselinesInfo (qPars: { BASELINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM BASELINES WHERE BASELINES.BASELINE_ID = :BASELINE_ID`;

  if (operationLogData) {
    await saveOperationLog('BASELINES', sentence, qPars, operationLogData);
    dbLogger('BASELINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM BASELINES

  FIELD BASELINES.UNIT_ID
  FIELD BASELINES.BASELINE_TEMPLATE_ID
*/
export async function w_insert (
  qPars: { 
	UNIT_ID: number,
    BASELINE_TEMPLATE_ID: number,
  }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('BASELINE_TEMPLATE_ID');

  const sentence = `INSERT INTO BASELINES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('BASELINES', sentence, qPars, operationLogData);
    dbLogger('BASELINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM BASELINE_ID: {BASELINES.BASELINE_ID}

  FROM BASELINES

  SELECT BASELINES.BASELINE_ID
  SELECT BASELINES.UNIT_ID
  SELECT BASELINES.BASELINE_TEMPLATE_ID
  SELECT BASELINES.BASELINE_TEMPLATE_TAG
*/
export function getExtraInfo (qPars: { BASELINE_ID?: number, UNIT_ID?: number}) {
  let sentence = `
    SELECT
      BASELINES.BASELINE_ID,
      BASELINES.UNIT_ID,
      CLUNITS.CLIENT_ID,
      BASELINES.BASELINE_TEMPLATE_ID,
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
  `
  sentence += `
    FROM
        BASELINES
        INNER JOIN BASELINE_TEMPLATES ON (BASELINES.BASELINE_TEMPLATE_ID = BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID)
        INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = BASELINES.UNIT_ID)
  `

  const conditions: string[] = []
  if (qPars.BASELINE_ID != null) { conditions.push(`BASELINES.BASELINE_ID = :BASELINE_ID`) }
  if (qPars.UNIT_ID) { conditions.push(`BASELINES.UNIT_ID = :UNIT_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    BASELINE_ID: number
    UNIT_ID: number
    CLIENT_ID: number
    BASELINE_TEMPLATE_ID: number
    BASELINE_TEMPLATE_TAG: string
  }>(sentence, qPars)
}



  /* @IFHELPER:FUNC updateInfo = UPDATE
  FROM BASELINES
  PARAM BASELINE_ID: {BASELINES.BASELINE_ID}
  FIELD [[IFOWNPROP {:BASELINES.UNIT_ID}]] BASELINES.UNIT_ID
  FIELD [[IFOWNPROP {:BASELINES.BASELINE_TEMPLATE_ID}]] BASELINESBASELINE_TEMPLATE_ID
*/
export async function w_updateInfo (
    qPars: { 
        BASELINE_ID: number,
        UNIT_ID?: number,
        BASELINE_TEMPLATE_ID?: number,
    }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
    if (qPars.BASELINE_TEMPLATE_ID !== undefined) { fields.push('BASELINE_TEMPLATE_ID = :BASELINE_TEMPLATE_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE BASELINES SET ${fields.join(', ')} WHERE BASELINE_ID = :BASELINE_ID`
  
    if (operationLogData) {
      await saveOperationLog('BASELINES', sentence, qPars, operationLogData);
      dbLogger('BASELINES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteBaselineTemplatesInfo = DELETE
  PARAM UNIT_ID: {BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID}
  FROM BASELINE_TEMPLATES
  WHERE {BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID} = {:BASELINE_TEMPLATE_ID}
*/
export async function w_deleteBaselineTemplatesInfo (qPars: { BASELINE_TEMPLATE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM BASELINE_TEMPLATES WHERE BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID = :BASELINE_TEMPLATE_ID`;

  if (operationLogData) {
    await saveOperationLog('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
    dbLogger('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM BASELINE_TEMPLATES

  FIELD BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION
  FIELD BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
*/
export async function w_insert (qPars: { BASELINE_TEMPLATE_DESCRIPTION: string, BASELINE_TEMPLATE_TAG: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('BASELINE_TEMPLATE_DESCRIPTION')
  fields.push('BASELINE_TEMPLATE_TAG')

  const sentence = `INSERT INTO BASELINE_TEMPLATES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
    dbLogger('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getAllBaselineTemplates = SELECT LIST

  FROM BASELINE_TEMPLATES

  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID
  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION
  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
*/
export function getAllBaselineTemplates () {
  let sentence = `
    SELECT
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID,
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION,
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
  `
  sentence += `
    FROM
        BASELINE_TEMPLATES
  `

  return sqldb.query<{
    BASELINE_TEMPLATE_ID: number
    BASELINE_TEMPLATE_DESCRIPTION: string
    BASELINE_TEMPLATE_TAG: string
  }>(sentence)
}

/* @IFHELPER:FUNC getExtraInfo = SELECT ROW
  PARAM BASELINE_ID: {BASELINES.BASELINE_TEMPLATE_ID}

  FROM BASELINE_TEMPLATES

  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID
  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION
  SELECT BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
*/
export function getExtraInfo (qPars: { BASELINE_TEMPLATE_ID: number}) {
  let sentence = `
    SELECT
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID,
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION,
      BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
  `
  sentence += `
    FROM
        BASELINE_TEMPLATES
  `
  const conditions: string[] = []
  if (qPars.BASELINE_TEMPLATE_ID) { conditions.push(`BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID = :BASELINE_TEMPLATE_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    BASELINE_TEMPLATE_ID: number
    BASELINE_TEMPLATE_DESCRIPTION: string
    BASELINE_TEMPLATE_TAG: string
  }>(sentence, qPars)
}


  /* @IFHELPER:FUNC updateInfo = UPDATE
  FROM BASELINE_TEMPLATES
  PARAM BASELINE_TEMPLATE_ID: {BASELINE_TEMPLATES.BASELINE_TEMPLATE_ID}
  FIELD [[IFOWNPROP {:BASELINE_TEMPLATE_DESCRIPTION}]] BASELINE_TEMPLATES.BASELINE_TEMPLATE_DESCRIPTION
  FIELD [[IFOWNPROP {:BASELINE_TEMPLATE_TAG}]] BASELINE_TEMPLATES.BASELINE_TEMPLATE_TAG
*/
export async function w_updateInfo (
    qPars: { BASELINE_TEMPLATE_ID: number, BASELINE_TEMPLATE_DESCRIPTION?: string, BASELINE_TEMPLATE_TAG?: string }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.BASELINE_TEMPLATE_DESCRIPTION !== undefined) { fields.push('BASELINE_TEMPLATE_DESCRIPTION = :BASELINE_TEMPLATE_DESCRIPTION') }
    if (qPars.BASELINE_TEMPLATE_TAG !== undefined) { fields.push('BASELINE_TEMPLATE_TAG = :BASELINE_TEMPLATE_TAG') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE BASELINE_TEMPLATES SET ${fields.join(', ')} WHERE BASELINE_TEMPLATE_ID = :BASELINE_TEMPLATE_ID`
  
    if (operationLogData) {
      await saveOperationLog('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
      dbLogger('BASELINE_TEMPLATES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  
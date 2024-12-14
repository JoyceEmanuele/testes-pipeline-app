import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM AV_OPTS
  FIELD AV_OPTS.OPT_TYPE
  FIELD AV_OPTS.OPT_ID
  FIELD AV_OPTS.OPT_LABEL
  FIELD AV_OPTS.TAGS
*/
export async function w_insert (qPars: { OPT_TYPE: string, OPT_ID: string, OPT_LABEL: string, TAGS: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('OPT_TYPE')
  fields.push('OPT_ID')
  fields.push('OPT_LABEL')
  fields.push('TAGS')

  const sentence = `INSERT INTO AV_OPTS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('AV_OPTS', sentence, qPars, operationLogData);
    dbLogger('AV_OPTS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getOptsOfType = SELECT LIST
  PARAM OPT_TYPE: {AV_OPTS.OPT_TYPE}
  FROM AV_OPTS
  SELECT AV_OPTS.OPT_ID AS value
  SELECT AV_OPTS.OPT_LABEL AS label
  SELECT AV_OPTS.TAGS AS tags
  WHERE {AV_OPTS.OPT_TYPE} = {:OPT_TYPE}
*/
export function getOptsOfType (qPars: { OPT_TYPE: string }) {
  let sentence = `
    SELECT
      AV_OPTS.OPT_ID AS value,
      AV_OPTS.OPT_LABEL AS label,
      AV_OPTS.TAGS AS tags
  `
  sentence += `
    FROM
      AV_OPTS
  `

  sentence += ` WHERE AV_OPTS.OPT_TYPE = :OPT_TYPE `

  return sqldb.query<{
    value: string
    label: string
    tags: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getOptsOfTag = SELECT LIST
  PARAM TAGS: {AV_OPTS.TAGS}
  FROM AV_OPTS
  SELECT AV_OPTS.OPT_ID AS value
  SELECT AV_OPTS.OPT_LABEL AS label
  SELECT AV_OPTS.TAGS AS tags
  WHERE {AV_OPTS.TAGS} = {:TAGS}
*/
export function getOptsOfTag (qPars: { TAGS: string }) {
  let sentence = `
    SELECT
      AV_OPTS.OPT_ID AS value,
      AV_OPTS.OPT_LABEL AS label,
      AV_OPTS.OPT_TYPE AS type
  `
  sentence += `
    FROM
      AV_OPTS
  `

  sentence += ` WHERE AV_OPTS.TAGS = :TAGS `

  return sqldb.query<{
    value: string
    label: string
    type: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getOptsDesc = SELECT LIST
PARAM avOptsIds: {AV_OPTS.OPT_ID}[]
FROM AV_OPTS
SELECT AV_OPTS.OPT_ID
SELECT AV_OPTS.OPT_LABEL
WHERE {AV_OPTS.OPT_ID} IN ({:avOptsIds})
*/
export function getOptsDesc (qPars: { avOptsIds: string[] }) {
  let sentence = `
    SELECT
      AV_OPTS.OPT_ID,
      AV_OPTS.OPT_LABEL
  `
  sentence += `
    FROM
      AV_OPTS
  `

  sentence += ` WHERE AV_OPTS.OPT_ID IN (:avOptsIds) `

  return sqldb.query<{
    OPT_ID: string
    OPT_LABEL: string
  }>(sentence, qPars)
}

export function getMachineOpts(qPars: {}) {
  let sentence = `
  SELECT 
    AV_OPTS.OPT_ID as ID,
    AV_OPTS.OPT_LABEL AS MACHINE_TYPE
  FROM
    AV_OPTS
  WHERE 
    AV_OPTS.OPT_TYPE = 'TIPO'
  `
  return sqldb.query<{
    ID: string
    MACHINE_TYPE: string
  }>(sentence, qPars);
}
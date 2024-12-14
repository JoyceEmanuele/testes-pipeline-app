import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM FIRMWARES

  FIELD FIRMWARES.S3_PATH
  FIELD FIRMWARES.HW_REV
  FIELD FIRMWARES.FW_VERS
  FIELD FIRMWARES.DAT_UPLOAD
*/
export async function w_insert (qPars: { S3_PATH: string, HW_REV: string, FW_VERS: string, DAT_UPLOAD: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('S3_PATH')
  fields.push('HW_REV')
  fields.push('FW_VERS')
  fields.push('DAT_UPLOAD')

  const sentence = `INSERT INTO FIRMWARES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('FIRMWARES', sentence, qPars, operationLogData);
    dbLogger('FIRMWARES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM FIRMWARES

  SELECT FIRMWARES.S3_PATH
  SELECT FIRMWARES.HW_REV
  SELECT FIRMWARES.FW_VERS
  SELECT FIRMWARES.DAT_UPLOAD
*/
export function getList ( qPars: { hwRevs?: string[], deviceType?: string } ) {
  let sentence = `
    SELECT
      FIRMWARES.S3_PATH,
      FIRMWARES.HW_REV,
      FIRMWARES.FW_VERS,
      FIRMWARES.DAT_UPLOAD
  `
  sentence += `
    FROM
      FIRMWARES
  `

  const conditions = [];

  if (qPars.hwRevs?.length > 0) {
    conditions.push("FIRMWARES.HW_REV IN (:hwRevs)")
  }

  if (qPars.deviceType) {
    qPars.deviceType = `${qPars.deviceType}%`
    conditions.push(`FIRMWARES.HW_REV LIKE :deviceType`)
  }

  if (conditions.length > 0) {
    sentence += "WHERE " + conditions.join(" AND "); 
  }

  return sqldb.query<{
    S3_PATH: string
    HW_REV: string
    FW_VERS: string
    DAT_UPLOAD: string
  }>(sentence, qPars)
}

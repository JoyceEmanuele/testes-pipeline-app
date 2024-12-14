import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


/* @IFHELPER:FUNC insertOrUpdate = INSERT-UPDATE
  FROM FAULTS_DATAS
  FIELD FAULTS_DATAS.ASSET_HEALTH_ID
  FIELD FAULTS_DATAS.DATA
*/
export async function w_insertOrUpdate(qPars: { ASSET_HEALTH_ID: number, DATA: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_HEALTH_ID')
  fields.push('DATA')

  let sentence = `INSERT INTO FAULTS_DATAS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("ASSET_HEALTH_ID = :ASSET_HEALTH_ID")
  updateFields.push("DATA = :DATA")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('FAULTS_DATAS', sentence, qPars, operationLogData);
    dbLogger('FAULTS_DATAS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        FAULTS_DATAS
      FROM
        FAULTS_DATAS
          INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = FAULTS_DATAS.ASSET_HEALTH_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
          INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
      WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
      await saveOperationLog('FAULTS_DATAS', sentence, qPars, operationLogData);
      dbLogger('FAULTS_DATAS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        FAULTS_DATAS
      FROM
        FAULTS_DATAS
          INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = FAULTS_DATAS.ASSET_HEALTH_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
        
      WHERE ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('FAULTS_DATAS', sentence, qPars, operationLogData);
      dbLogger('FAULTS_DATAS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetHealthId(qPars: { ASSET_HEALTH_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        FAULTS_DATAS
      FROM
        FAULTS_DATAS
        
      WHERE FAULTS_DATAS.ASSET_HEALTH_ID = :ASSET_HEALTH_ID
  `

  if (operationLogData) {
    await saveOperationLog('FAULTS_DATAS', sentence, qPars, operationLogData);
    dbLogger('FAULTS_DATAS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = FAULTS_DATAS.ASSET_HEALTH_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE FAULTS_DATAS FROM FAULTS_DATAS ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('FAULTS_DATAS', sentence, qPars, operationLogData);
    dbLogger('FAULTS_DATAS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

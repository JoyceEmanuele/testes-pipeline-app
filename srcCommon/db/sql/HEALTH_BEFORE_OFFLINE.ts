import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'


export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        HEALTH_BEFORE_OFFLINE
      FROM
        HEALTH_BEFORE_OFFLINE
          INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = HEALTH_BEFORE_OFFLINE.ASSET_HEALTH_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
          INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
      WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
      await saveOperationLog('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
      dbLogger('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        HEALTH_BEFORE_OFFLINE
      FROM
        HEALTH_BEFORE_OFFLINE
          INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = HEALTH_BEFORE_OFFLINE.ASSET_HEALTH_ID)
          INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
        
      WHERE ASSETS.ID = :ASSET_ID
  `

  if (operationLogData) {
      await saveOperationLog('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
      dbLogger('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const join = `
    INNER JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ID = HEALTH_BEFORE_OFFLINE.ASSET_HEALTH_ID)
    INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH.ASSET_ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
  `

  const sentence = `DELETE HEALTH_BEFORE_OFFLINE FROM HEALTH_BEFORE_OFFLINE ${join} WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
    dbLogger('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetHealthId(qPars: { ASSET_HEALTH_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        HEALTH_BEFORE_OFFLINE
      FROM
      HEALTH_BEFORE_OFFLINE
        
      WHERE HEALTH_BEFORE_OFFLINE.ASSET_HEALTH_ID = :ASSET_HEALTH_ID
  `

  if (operationLogData) {
    await saveOperationLog('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
    dbLogger('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertOrUpdate(qPars: { ASSET_HEALTH_ID: number, H_OFFL: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSET_HEALTH_ID')
  fields.push('H_OFFL')

  let sentence = `INSERT INTO HEALTH_BEFORE_OFFLINE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("H_OFFL = :H_OFFL")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
    dbLogger('HEALTH_BEFORE_OFFLINE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'


export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            CONDENSERS_HEAT_EXCHANGERS
        FROM
            CONDENSERS_HEAT_EXCHANGERS
            INNER JOIN CONDENSERS ON (CONDENSERS.ID = CONDENSERS_HEAT_EXCHANGERS.CONDENSER_ID)
            INNER JOIN ASSETS ON (ASSETS.ID = CONDENSERS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE
            CLUNITS.UNIT_ID = :UNIT_ID
    `

    if (operationLogData) {
        await saveOperationLog('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
        dbLogger('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            CONDENSERS_HEAT_EXCHANGERS
        FROM
            CONDENSERS_HEAT_EXCHANGERS
            INNER JOIN CONDENSERS ON (CONDENSERS.ID = CONDENSERS_HEAT_EXCHANGERS.CONDENSER_ID)
            INNER JOIN ASSETS ON (ASSETS.ID = CONDENSERS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
    `

    if (operationLogData) {
        await saveOperationLog('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
        dbLogger('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow(qPars: { HEAT_EXCHANGER_ID: number }, operationLogData: OperationLogData) {
    const join = `INNER JOIN HEAT_EXCHANGERS ON (HEAT_EXCHANGERS.ID = CONDENSERS_HEAT_EXCHANGERS.HEAT_EXCHANGER_ID)`
    const sentence = `DELETE CONDENSERS_HEAT_EXCHANGERS FROM CONDENSERS_HEAT_EXCHANGERS ${join} WHERE HEAT_EXCHANGERS.ID = :HEAT_EXCHANGER_ID`;

    if (operationLogData) {
        await saveOperationLog('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
        dbLogger('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            CONDENSERS_HEAT_EXCHANGERS
        FROM
            CONDENSERS_HEAT_EXCHANGERS
            INNER JOIN CONDENSERS ON (CONDENSERS.ID = CONDENSERS_HEAT_EXCHANGERS.CONDENSER_ID)
            INNER JOIN ASSETS ON (ASSETS.ID = CONDENSERS.ASSET_ID)
        WHERE
            ASSETS.ID = :ASSET_ID
    `

    if (operationLogData) {
        await saveOperationLog('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
        dbLogger('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_insertOrUpdate (qPars: { CONDENSER_ID: number, HEAT_EXCHANGER_ID: number }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('CONDENSER_ID')
    fields.push('HEAT_EXCHANGER_ID')
  
    let sentence = `INSERT INTO CONDENSERS_HEAT_EXCHANGERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
    const updateFields: string[] = []
    updateFields.push("CONDENSER_ID = :CONDENSER_ID")
    sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `
  
    if (operationLogData) {
      await saveOperationLog('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('CONDENSERS_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM AIR_CURTAINS
*/

export async function w_insert(qPars: {
    MACHINE_ID: number,
    ASSET_ID: number,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('MACHINE_ID');
    fields.push('ASSET_ID');

    const sentence = `INSERT INTO AIR_CURTAINS (${fields.join(', ')}) VALUES(:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM AIR_CURTAINS
  PARAM ID: {AIR_CURTAINS.ID}
*/
export async function w_updateInfo(
    qPars: {
        AIR_CURTAIN_ID: number
        MACHINE_ID?: number
        ASSET_ID?: number
    }, operationLogData: OperationLogData
) {
    const fields: string[] = []
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (qPars.ASSET_ID !== undefined) { fields.push('ASSET_ID = :ASSET_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE AIR_CURTAINS SET ${fields.join(', ')} WHERE ID = :AIR_CURTAIN_ID`

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM ID: {AIR_CURTAINS.ID}
  FROM AIR_CURTAINS
  WHERE {AIR_CURTAINS.ID} = {:ID}
*/
export async function w_delete(qPars: { ID: number }, operationLogData: OperationLogData) {
    const sentence = `DELETE FROM AIR_CURTAINS WHERE AIR_CURTAINS.ID = :ID`;

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            AIR_CURTAINS
        FROM
            AIR_CURTAINS
            INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE
            CLUNITS.UNIT_ID = :UNIT_ID
    `

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            AIR_CURTAINS
        FROM
            AIR_CURTAINS
            INNER JOIN ASSETS ON (ASSETS.ID = AIR_CURTAINS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
    `

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function getAirCurtainsByAssetId(qPars: { ASSET_ID: number }) {
    const sentence = `
    SELECT
      AIR_CURTAINS.ID AS AIR_CURTAIN_ID
    FROM 
        AIR_CURTAINS
    WHERE AIR_CURTAINS.ASSET_ID = :ASSET_ID
  `

    return sqldb.querySingle<{
        AIR_CURTAIN_ID: number
    }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByAssetId = DELETE
  PARAM ASSET_ID: {AIR_CURTAINS.ASSET_ID}
  FROM AIR_CURTAINS
  WHERE {AIR_CURTAINS.ASSET_ID} = {:ASSET_ID}
*/

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
    const sentence = `DELETE AIR_CURTAINS FROM AIR_CURTAINS WHERE AIR_CURTAINS.ASSET_ID = :ASSET_ID`;

    if (operationLogData) {
        await saveOperationLog('AIR_CURTAINS', sentence, qPars, operationLogData);
        dbLogger('AIR_CURTAINS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

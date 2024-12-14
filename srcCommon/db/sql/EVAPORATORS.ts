import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM EVAPORATORS
*/

export async function w_insert(qPars: {
    MACHINE_ID: number,
    ASSET_ID: number,
    CAPACITY_POWER?: number,
    CAPACITY_UNIT?: string,
    MACHINE_KW?: number,
    EQUIPMENT_POWER?: string,
    COMPRESSOR_NOMINAL_CURRENT?: number,
    EVAPORATOR_MODEL_ID?: number,
    TYPE_CFG?: string,
    APPL_CFG?: string,
    INSUFFLATION_SPEED?: number,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('MACHINE_ID');
    fields.push('ASSET_ID');

    if (qPars.CAPACITY_POWER !== undefined) fields.push('CAPACITY_POWER')
    if (qPars.CAPACITY_UNIT !== undefined) fields.push('CAPACITY_UNIT')
    if (qPars.MACHINE_KW !== undefined) fields.push('MACHINE_KW')
    if (qPars.EQUIPMENT_POWER !== undefined) fields.push('EQUIPMENT_POWER')
    if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) fields.push('COMPRESSOR_NOMINAL_CURRENT')
    if (qPars.EVAPORATOR_MODEL_ID !== undefined) fields.push('EVAPORATOR_MODEL_ID')
    if (qPars.TYPE_CFG !== undefined) fields.push('TYPE_CFG')
    if (qPars.APPL_CFG !== undefined) fields.push('APPL_CFG')
    if (qPars.INSUFFLATION_SPEED !== undefined) fields.push('INSUFFLATION_SPEED')

    const sentence = `INSERT INTO EVAPORATORS (${fields.join(', ')}) VALUES(:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM EVAPORATORS
  PARAM ID: {EVAPORATORS.ID}
*/
export async function w_updateInfo(
    qPars: {
        EVAPORATOR_ID: number
        MACHINE_ID?: number
        ASSET_ID?: number
        CAPACITY_POWER?: number,
        CAPACITY_UNIT?: string,
        MACHINE_KW?: number,
        EQUIPMENT_POWER?: string,
        COMPRESSOR_NOMINAL_CURRENT?: number,
        EVAPORATOR_MODEL_ID?: number
        TYPE_CFG?: string
        APPL_CFG?: string
        INSUFFLATION_SPEED?: number,
    }, operationLogData: OperationLogData
) {
    const fields: string[] = []
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (qPars.ASSET_ID !== undefined) { fields.push('ASSET_ID = :ASSET_ID') }
    if (qPars.CAPACITY_POWER !== undefined) { fields.push('CAPACITY_POWER = :CAPACITY_POWER') }
    if (qPars.CAPACITY_UNIT !== undefined) { fields.push('CAPACITY_UNIT = :CAPACITY_UNIT') }
    if (qPars.MACHINE_KW !== undefined) { fields.push('MACHINE_KW = :MACHINE_KW') }
    if (qPars.EQUIPMENT_POWER !== undefined) { fields.push('EQUIPMENT_POWER = :EQUIPMENT_POWER') }
    if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) { fields.push('COMPRESSOR_NOMINAL_CURRENT = :COMPRESSOR_NOMINAL_CURRENT') }
    if (qPars.EVAPORATOR_MODEL_ID !== undefined) { fields.push('EVAPORATOR_MODEL_ID = :EVAPORATOR_MODEL_ID') }
    if (qPars.TYPE_CFG !== undefined) { fields.push('TYPE_CFG = :TYPE_CFG') }
    if (qPars.APPL_CFG !== undefined) { fields.push('APPL_CFG = :APPL_CFG') }
    if (qPars.INSUFFLATION_SPEED !== undefined) { fields.push('INSUFFLATION_SPEED = :INSUFFLATION_SPEED') }

    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE EVAPORATORS SET ${fields.join(', ')} WHERE ID = :EVAPORATOR_ID`

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_updateInfoByAssetId(
    qPars: {
        ASSET_ID: number,
        CAPACITY_POWER?: number,
        CAPACITY_UNIT?: string,
        MACHINE_KW?: number,
        MACHINE_ID?: number,
        EQUIPMENT_POWER?: string,
        COMPRESSOR_NOMINAL_CURRENT?: number,
        EVAPORATOR_MODEL_ID?: number,
        TYPE_CFG?: string,
        APPL_CFG?: string,
        INSUFFLATION_SPEED?: number,
    }, operationLogData: OperationLogData
) {
    const fields: string[] = []
    if (qPars.CAPACITY_POWER !== undefined) { fields.push('CAPACITY_POWER = :CAPACITY_POWER') }
    if (qPars.CAPACITY_UNIT !== undefined) { fields.push('CAPACITY_UNIT = :CAPACITY_UNIT') }
    if (qPars.MACHINE_KW !== undefined) { fields.push('MACHINE_KW = :MACHINE_KW') }
    if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
    if (qPars.EQUIPMENT_POWER !== undefined) { fields.push('EQUIPMENT_POWER = :EQUIPMENT_POWER') }
    if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) { fields.push('COMPRESSOR_NOMINAL_CURRENT = :COMPRESSOR_NOMINAL_CURRENT') }
    if (qPars.EVAPORATOR_MODEL_ID !== undefined) { fields.push('EVAPORATOR_MODEL_ID = :EVAPORATOR_MODEL_ID') }
    if (qPars.TYPE_CFG !== undefined) { fields.push('TYPE_CFG = :TYPE_CFG') }
    if (qPars.APPL_CFG !== undefined) { fields.push('APPL_CFG = :APPL_CFG') }
    if (qPars.INSUFFLATION_SPEED !== undefined) { fields.push('INSUFFLATION_SPEED = :INSUFFLATION_SPEED') }

    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

    const sentence = `UPDATE EVAPORATORS SET ${fields.join(', ')} WHERE ASSET_ID = :ASSET_ID`

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC delete = DELETE
  PARAM ID: {EVAPORATORS.ID}
  FROM EVAPORATORS
  WHERE {EVAPORATORS.ID} = {:ID}
*/
export async function w_delete(qPars: { ID: number }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM EVAPORATORS WHERE EVAPORATORS.ID = :ID`;

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            EVAPORATORS
        FROM
            EVAPORATORS
            INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE
            CLUNITS.UNIT_ID = :UNIT_ID
    `

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
    const sentence = `
        DELETE
            EVAPORATORS
        FROM
            EVAPORATORS
            INNER JOIN ASSETS ON (ASSETS.ID = EVAPORATORS.ASSET_ID)
            INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
        WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
    `

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function getEvaporatorByAssetId(qPars: { ASSET_ID: number }) {
    const sentence = `
    SELECT
      EVAPORATORS.ID AS EVAPORATOR_ID
    FROM 
      EVAPORATORS
    WHERE EVAPORATORS.ASSET_ID = :ASSET_ID
  `

    return sqldb.querySingle<{
        EVAPORATOR_ID: number
    }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteByAssetId = DELETE
  PARAM ASSET_ID: {EVAPORATORS.ASSET_ID}
  FROM EVAPORATORS
  WHERE {EVAPORATORS.ASSET_ID} = {:ASSET_ID}
*/

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
    const sentence = `DELETE EVAPORATORS FROM EVAPORATORS WHERE EVAPORATORS.ASSET_ID = :ASSET_ID`;

    if (operationLogData) {
        await saveOperationLog('EVAPORATORS', sentence, qPars, operationLogData);
        dbLogger('EVAPORATORS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

export async function w_insert(qPars: {
    DAT_REPORT: number,
    OBS_DESC: string,
    USER_REPORT: string,
    ASSET_ID: number,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('DAT_REPORT')
    fields.push('OBS_DESC')
    fields.push('USER_REPORT')
    fields.push('ASSET_ID')

    const sentence = `INSERT INTO ASSETS_HEALTH_OBS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
        dbLogger('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export function getList(qPars: {
    dacId?: string,
    assetId?: number,
    SINCE?: number
}) {
    let sentence = `
      SELECT
        DEVICES.DEVICE_CODE AS DEV_ID,
        ASSETS_HEALTH_OBS.DAT_REPORT,
        ASSETS_HEALTH_OBS.OBS_DESC,
        ASSETS_HEALTH_OBS.USER_REPORT,
        ASSETS_HEALTH_OBS.ID AS OBS_ID,
        ASSETS.ID AS ASSET_ID
    `
    sentence += `
    FROM 
        ASSETS_HEALTH_OBS
        INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH_OBS.ASSET_ID)
        LEFT JOIN CONDENSERS ON (CONDENSERS.ASSET_ID = ASSETS.ID)
        LEFT JOIN EVAPORATORS ON (EVAPORATORS.ASSET_ID = ASSETS.ID)
        LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ASSET_ID = ASSETS.ID)
        LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.EVAPORATOR_ID = EVAPORATORS.ID)
        LEFT JOIN DACS_CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
        LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID = ASSET_HEAT_EXCHANGERS.ID)
        INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = COALESCE(DACS_CONDENSERS.DAC_DEVICE_ID, DACS_EVAPORATORS.DAC_DEVICE_ID, DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID))
        INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    `

    const conditions: string[] = []
    if (qPars.dacId) { conditions.push(`DEVICES.DEVICE_CODE = :dacId`) }
    if (qPars.assetId !== undefined) { conditions.push(`ASSETS.ID = :assetId`) }
    if (qPars.SINCE !== undefined) { conditions.push(`ASSETS_HEALTH_OBS.DAT_REPORT >= :SINCE`) }
    if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

    sentence += ` ORDER BY ASSETS_HEALTH_OBS.DAT_REPORT DESC`

    return sqldb.query<{
        DEV_ID: string
        DAT_REPORT: number
        OBS_DESC: string
        USER_REPORT: string
        OBS_ID: string
        ASSET_ID: number
    }>(sentence, qPars)
}

/* @IFHELPER:FUNC updateObservation = UPDATE
  FROM ASSETS_HEALTH_OBS
  FIELD ASSETS_HEALTH_OBS.OBS_DESC
*/
export async function w_updateObservation(qPars: { OBS_DESC: string, OBS_ID: string }, operationLogData: OperationLogData) {
    const sentence = `UPDATE ASSETS_HEALTH_OBS SET OBS_DESC = :OBS_DESC WHERE ID = :OBS_ID`

    if (operationLogData) {
        await saveOperationLog('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
        dbLogger('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow(qPars: { DAC_DEVICE_ID: number, itemsDates: number[] }, operationLogData: OperationLogData) {
    const join = `
    INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH_OBS.ASSET_ID)
    LEFT JOIN CONDENSERS ON (CONDENSERS.ASSET_ID = ASSETS.ID)
    LEFT JOIN EVAPORATORS ON (EVAPORATORS.ASSET_ID = ASSETS.ID)
    LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ASSET_ID = ASSETS.ID)
    LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.CONDENSER_ID = CONDENSERS.ID)
    LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.EVAPORATOR_ID = EVAPORATORS.ID)
    LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID = ASSET_HEAT_EXCHANGERS.ID)
    INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = COALESCE(DACS_CONDENSERS.DAC_DEVICE_ID, DACS_EVAPORATORS.DAC_DEVICE_ID, DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID))
  `
    const sentence = `DELETE ASSETS_HEALTH_OBS FROM ASSETS_HEALTH_OBS ${join} WHERE DACS_DEVICES.ID = :DAC_DEVICE_ID AND ASSETS_HEALTH_OBS.DAT_REPORT IN (:itemsDates)`;
    if (operationLogData) {
        await saveOperationLog('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
        dbLogger('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: {ASSET_ID: number, itemsDates: number[]}, operationLogData: OperationLogData) {
    const sentence = `DELETE FROM ASSETS_HEALTH_OBS WHERE ASSET_ID = :ASSET_ID AND ASSETS_HEALTH_OBS.DAT_REPORT IN (:itemsDates)`
    if (operationLogData) {
        await saveOperationLog('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
        dbLogger('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars)
}

export async function w_deleteAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

    const sentence = `
      DELETE
        ASSETS_HEALTH_OBS 
      FROM
        ASSETS_HEALTH_OBS 
        INNER JOIN ASSETS ON (ASSETS.ID = ASSETS_HEALTH_OBS.ASSET_ID)
        LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
      WHERE
        CLUNITS.UNIT_ID = :UNIT_ID
    `
  
    if (operationLogData) {
      dbLogger('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData)
      await saveOperationLog('ASSETS_HEALTH_OBS', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }
  
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_insert(qPars: {
    SENSOR_ID: string,
    MIN_FW_VERSION: string,
    MULT_QUAD: number,
    MULT_LIN: number,
    OFST: number,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('SENSOR_ID')
    fields.push('MIN_FW_VERSION')
    fields.push('MULT_QUAD')
    fields.push('MULT_LIN')
    fields.push('OFST')

    const sentence = `INSERT INTO SENSOR_FIRMWARE_CURVES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}


export async function w_delete(qPars: { ID: number }, operationLogData: OperationLogData) {
    const sentence = "DELETE FROM SENSOR_FIRMWARE_CURVES WHERE SENSOR_FIRMWARE_CURVES.ID=:ID"
    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars);
}

export async function w_deleteAllSensor(qPars: { SENSOR_ID: string }, operationLogData: OperationLogData) {
    const sentence = "DELETE FROM SENSOR_FIRMWARE_CURVES WHERE SENSOR_FIRMWARE_CURVES.SENSOR_ID=:SENSOR_ID"
    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }
    return sqldb.execute(sentence, qPars);
}

export async function w_update(qPars: {
    ID: number,
    SENSOR_ID?: string,
    MIN_FW_VERSION?: string,
    MULT_QUAD?: number,
    MULT_LIN?: number,
    OFST?: number,
}, operationLogData: OperationLogData) {
    const fields: string[] = []
    if (typeof qPars.SENSOR_ID === 'string') { fields.push('SENSOR_ID=:SENSOR_ID') }
    if (typeof qPars.MIN_FW_VERSION === 'string') { fields.push('MIN_FW_VERSION=:MIN_FW_VERSION') }
    if (typeof qPars.MULT_QUAD === 'number') { fields.push('MULT_QUAD=:MULT_QUAD') }
    if (typeof qPars.MULT_LIN === 'number') { fields.push('MULT_LIN=:MULT_LIN') }
    if (typeof qPars.OFST === 'number') { fields.push('OFST=:OFST') }

    const sentence = `UPDATE SENSOR_FIRMWARE_CURVES SET ${fields.join(', ')} WHERE ID=:ID`

    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

export async function getList(qPars: {CURVE_IDS? : number[], SENSOR_ID?: string}, operationLogData: OperationLogData) {
    let sentence = `SELECT
            SENSOR_FIRMWARE_CURVES.ID,
            SENSORS.SENSOR_ID,
            SENSORS.SENSOR_NAME,
            SENSOR_FIRMWARE_CURVES.MIN_FW_VERSION,
            SENSOR_FIRMWARE_CURVES.MULT_QUAD,
            SENSOR_FIRMWARE_CURVES.MULT_LIN,
            SENSOR_FIRMWARE_CURVES.OFST
        FROM SENSOR_FIRMWARE_CURVES
            LEFT JOIN SENSORS ON SENSOR_FIRMWARE_CURVES.SENSOR_ID=SENSORS.SENSOR_ID
    `
    const conditions = [];
    if (qPars.CURVE_IDS?.length > 0) {
        conditions.push("SENSORS_FIRMWARE_CURVES.ID IN (:CURVE_IDS)");
    }
    if (qPars.SENSOR_ID?.length > 0) {
        conditions.push("SENSORS.SENSOR_ID=:SENSOR_ID");
    }
    if (conditions.length > 0) {
        sentence += " WHERE " + conditions.join(" AND ");
    }

    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }

    return sqldb.query<{
        ID: number,
        SENSOR_ID: string,
        SENSOR_NAME: string,
        MIN_FW_VERSION: string,
        MULT_QUAD: number,
        MULT_LIN: number,
        OFST: number,
    }>(sentence, qPars)
}

export async function getInfo(qPars: { ID: number }, operationLogData: OperationLogData) {
    let sentence = `SELECT
        SENSOR_FIRMWARE_CURVES.ID,
        SENSORS.SENSOR_ID,
        SENSORS.SENSOR_NAME,
        SENSOR_FIRMWARE_CURVES.MIN_FW_VERSION,
        SENSOR_FIRMWARE_CURVES.MULT_QUAD,
        SENSOR_FIRMWARE_CURVES.MULT_LIN,
        SENSOR_FIRMWARE_CURVES.OFST
        FROM SENSOR_FIRMWARE_CURVES
        LEFT JOIN SENSORS ON SENSOR_FIRMWARE_CURVES.SENSOR_ID=SENSORS.SENSOR_ID
        WHERE SENSOR_FIRMWARE_CURVES.ID=:ID
    `;

    if (operationLogData) {
        await saveOperationLog('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
        dbLogger('SENSOR_FIRMWARE_CURVES', sentence, qPars, operationLogData);
    }

    return sqldb.querySingle<{
        ID: number,
        SENSOR_ID: string,
        SENSOR_NAME: string,
        MIN_FW_VERSION: string,
        MULT_QUAD: number,
        MULT_LIN: number,
        OFST: number,
    }>(sentence, qPars)

}
import * as sqldb from '../connectSql'
import { dbLogger } from '../../../srcCommon/helpers/logger'
import { saveOperationLog, OperationLogData } from '../dbModifLog'


/* @IFHELPER:FUNC deleteSchedule = DELETE
    PARAM NOTIF_ID: {NOTIFDESTS.NOTIF_ID}
    FROM NOTIFSCHEDULE
    WHERE {NOTIFDESTS.NOTIF_ID} = {:NOTIF_ID}
*/
export async function w_deleteSchedule (qPars: { NOTIF_ID: number }) {
    const sentence = `DELETE FROM NOTIFDESTS WHERE NOTIFSCHEDULE.NOTIF_ID = :NOTIF_ID`;
    return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC insert = INSERT
    FROM NOTIFSCHEDULE
    FIELD NOTIFSCHEDULE.NOTIF_ID
    FIELD NOTIFSCHEDULE.DEV_ID
    FIELD NOTIFSCHEDULE.COND_VAL_MAX
    FIELD NOTIFSCHEDULE.UNIT_ID
    FIELD NOTIFSCHEDULE.ROOM_NAME
    FIELD NOTIFSCHEDULE.TIMESTAMP_INI
    FIELD NOTIFSCHEDULE.TIMESTAMP_END
*/
export async function w_insert (qPars: 
    {   NOTIF_ID: number, 
        DEV_ID: string, 
        COND_VAL_MAX: string, 
        UNIT_ID?: number,
        ROOM_NAME?: string,
        TIMESTAMP_INI?: string, 
        TIMESTAMP_END?: string 
    }) {
    // Para as notificações de ambiente timestamp será a data e hora de quando a notificação foi enviada
    const fields: string[] = []
    fields.push('NOTIF_ID')
    fields.push('DEV_ID')
    fields.push('COND_VAL_MAX')
    fields.push('UNIT_ID')
    fields.push('ROOM_NAME')
    fields.push('TIMESTAMP_INI')
    if (qPars.TIMESTAMP_END) fields.push('TIMESTAMP_END')

    const sentence = `INSERT INTO NOTIFSCHEDULE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
    PARAM NOTIF_ID: {NOTIFSCHEDULE.NOTIF_ID}
    PARAM DEV_ID: {NOTIFSCHEDULE.DEV_ID}
    PARAM COND_VAL_MAX: {NOTIFSCHEDULE.COND_VAL_MAX}
    PARAM TIMESTAMP_END: {NOTIFSCHEDULE.TIMESTAMP_END}
    FROM NOTIFSCHEDULE
    WHERE {NOTIFSCHEDULE.NOTIF_ID} = {:NOTIF_ID}
    AND {NOTIFSCHEDULE.DEV_ID} = {:DEV_ID}
*/
export async function w_update (qPars: { ID?: number, NOTIF_ID?: number, DEV_ID?: string, COND_VAL_MAX?: string, TIMESTAMP_END?: string }, operationLogData: OperationLogData) {
    const sentence = `UPDATE 
        NOTIFSCHEDULE 
            SET 
                NOTIFSCHEDULE.TIMESTAMP_END = :TIMESTAMP_END
            WHERE NOTIFSCHEDULE.NOTIF_ID = :NOTIF_ID`

    if (operationLogData) {
        await saveOperationLog('NOTIFSCHEDULE', sentence, null, operationLogData);
        dbLogger('NOTIFSCHEDULE', sentence, null, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC selectGetNotif = SELECT
    PARAM NOTIF_ID: {NOTIFSCHEDULE.NOTIF_ID}
    FROM NOTIFSCHEDULE
    SELECT NOTIFSCHEDULE.NOTIF_ID
    SELECT NOTIFSCHEDULE.DEV_ID
    SELECT NOTIFSCHEDULE.COND_VAL_MAX
    SELECT NOTIFSCHEDULE.UNIT_ID
    SELECT NOTIFSCHEDULE.ROOM_NAME
    SELECT NOTIFSCHEDULE.TIMESTAMP_INI
    SELECT NOTIFSCHEDULE.TIMESTAMP_END
    WHERE {NOTIFSCHEDULE.NOTIF_ID} = {:NOTIF_ID}
*/
export async function w_selectGetNotif (qPars: { NOTIF_ID: number }) {
    let sentence = `
        SELECT 
            NOTIFSCHEDULE.NOTIF_ID, 
            NOTIFSCHEDULE.DEV_ID, 
            NOTIFSCHEDULE.COND_VAL_MAX, 
            NOTIFSCHEDULE.UNIT_ID,
            NOTIFSCHEDULE.ROOM_NAME,
            NOTIFSCHEDULE.TIMESTAMP_INI,
            NOTIFSCHEDULE.TIMESTAMP_END`

    sentence += `
        FROM 
            NOTIFSCHEDULE
    `

    sentence += `WHERE NOTIFSCHEDULE.NOTIF_ID = :NOTIF_ID`
    
    return sqldb.query<{
        NOTIF_ID: number,
        DEV_ID: string,
        COND_VAL_MAX: string,
        UNIT_ID: number,
        ROOM_NAME: string,
        TIMESTAMP_INI: string,
        TIMESTAMP_END: string
    }>(sentence, qPars)
}

/* @IFHELPER:FUNC selectGetNotifTimestampNull = SELECT
    FROM NOTIFSCHEDULE
    SELECT NOTIFSCHEDULE.NOTIF_ID
    SELECT NOTIFSCHEDULE.DEV_ID
    SELECT NOTIFSCHEDULE.COND_VAL_MAX
    SELECT NOTIFSCHEDULE.UNIT_ID
    SELECT NOTIFSCHEDULE.ROOM_NAME
    SELECT NOTIFSCHEDULE.TIMESTAMP
    WHERE {NOTIFSCHEDULE.TIMESTAMP} IS NULL
*/
export async function w_selectGetNotifTimestampNull (
    operationLogData: OperationLogData
) {
    let sentence = `
        SELECT 
            NOTIFSCHEDULE.ID,
            NOTIFSCHEDULE.NOTIF_ID, 
            NOTIFSCHEDULE.DEV_ID, 
            NOTIFSCHEDULE.COND_VAL_MAX, 
            NOTIFSCHEDULE.UNIT_ID,
            NOTIFSCHEDULE.ROOM_NAME,
            NOTIFSCHEDULE.TIMESTAMP_INI,
            NOTIFSCHEDULE.TIMESTAMP_END,
            CLUNITS.UNIT_NAME
            `

    sentence += `
        FROM 
            NOTIFSCHEDULE
            LEFT JOIN CLUNITS ON CLUNITS.UNIT_ID = NOTIFSCHEDULE.UNIT_ID
    `

    sentence += `WHERE NOTIFSCHEDULE.TIMESTAMP_END IS NULL`

    if (operationLogData) {
        await saveOperationLog('NOTIFSCHEDULE', sentence, null, operationLogData);
        dbLogger('NOTIFSCHEDULE', sentence, null, operationLogData);
    }

    
    return sqldb.query<{
        ID: number,
        NOTIF_ID: number,
        DEV_ID: string,
        COND_VAL_MAX: string,
        UNIT_ID: number,
        ROOM_NAME: string,
        TIMESTAMP_INI: string
        UNIT_NAME: string
    }>(sentence)
}
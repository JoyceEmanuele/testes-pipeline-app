import { dbLogger } from '../../helpers/logger';
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';

export async function getAlarmsHist(qPars: {
  START_DATE?: string,
  END_DATE?: string,
  ACTUAL_ALARMS?: boolean,
  DEVICE_CODE: string,
  LIMIT?: number,
  SKIP?: number,
  ORDER_BY_COLUMN?: string,
  ORDER_BY_DESC?: boolean,
  HAS_FILTER?: boolean,
  FILTER_ALARM_CODE?: string[],
  FILTER_DESCRIPTION?: string[],
  FILTER_REASON_ALARM?: string[],
  FILTER_ACTION_TAKEN?: string[],
  FILTER_RESET_TYPE?: string[],
  FILTER_CAUSE?: string[],
  HOUR_INTERVAL: number
 }
  ) {
    let sentence = `
      SELECT 
        DRIS_CHILLER_ALARMS_HIST.ID,
        CHILLER_CARRIER_ALARMS.ALARM_CODE,
        CHILLER_CARRIER_ALARMS.DESCRIPTION,
        CHILLER_CARRIER_ALARMS.REASON_ALARM,
        CHILLER_CARRIER_ALARMS.ACTION_TAKEN,
        CHILLER_CARRIER_ALARMS.RESET_TYPE,
        CHILLER_CARRIER_ALARMS.CAUSE,
        DRIS_CHILLER_ALARMS_HIST.START_DATE,
        DRIS_CHILLER_ALARMS_HIST.END_DATE
    `

    sentence += `
      FROM
        DRIS_CHILLER_ALARMS_HIST
        INNER JOIN CHILLER_CARRIER_ALARMS ON (CHILLER_CARRIER_ALARMS.ID = DRIS_CHILLER_ALARMS_HIST.ALARM_ID)
        INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLER_ALARMS_HIST.DRI_DEVICE_ID)
        INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    `
    const conditions: string[] = []
    conditions.push('DEVICES.DEVICE_CODE = :DEVICE_CODE');

    if (qPars.ACTUAL_ALARMS) conditions.push('DRIS_CHILLER_ALARMS_HIST.END_DATE IS NULL');

    if ([qPars.START_DATE, qPars.END_DATE].every((date) => date != null)) {
        conditions.push(`
            ((DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.END_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE 
            AND DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE) OR
            (DRIS_CHILLER_ALARMS_HIST.END_DATE IS NULL AND 
            DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE AND
            DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE))
        `)
    }

    const conditionsFilters: string[] = []

    verifyFilterColumns({
      conditionsFilterColumns: conditionsFilters,
      HAS_FILTER: qPars.HAS_FILTER,
      FILTER_ALARM_CODE: qPars.FILTER_ALARM_CODE,
      FILTER_DESCRIPTION: qPars.FILTER_DESCRIPTION,
      FILTER_REASON_ALARM: qPars.FILTER_REASON_ALARM,
      FILTER_ACTION_TAKEN: qPars.FILTER_ACTION_TAKEN,
      FILTER_RESET_TYPE: qPars.FILTER_RESET_TYPE,
      FILTER_CAUSE: qPars.FILTER_CAUSE,
    })

    sentence += ' WHERE ' + conditions.join(' AND ');

    if (conditionsFilters.length) {
      sentence += ' AND (' + conditionsFilters.join(' OR ') + ')';
    }

    if (qPars.ORDER_BY_COLUMN?.length) {
        let foundColumn = false;
        if (['DESCRIPTION', 'REASON_ALARM', 'ACTION_TAKEN', 'RESET_TYPE', 'CAUSE', 'START_DATE', 'END_DATE'].includes(qPars.ORDER_BY_COLUMN)) {
            sentence += ' ORDER BY ' + qPars.ORDER_BY_COLUMN;
            foundColumn = true;
        } else if (qPars.ORDER_BY_COLUMN === 'ALARM_CODE') {
            sentence +=  ` ORDER BY CAST(CHILLER_CARRIER_ALARMS.ALARM_CODE AS UNSIGNED)`
            foundColumn = true;
        } 
        if (foundColumn) {
          sentence += qPars.ORDER_BY_DESC ? ' DESC' : ' ASC';
      }
    }

    if ([qPars.LIMIT, qPars.SKIP].every((param) => param != null)) {
        sentence += ` LIMIT :LIMIT OFFSET :SKIP`;
    }

    return sqldb.query<{
        ID: number
        ALARM_CODE: string
        DESCRIPTION: string
        REASON_ALARM: string
        ACTION_TAKEN: string
        RESET_TYPE: string
        START_DATE: string
        END_DATE: string
    }>(sentence, qPars)
}

function verifyFilterColumns(params: {
  conditionsFilterColumns: string[],
  HAS_FILTER: boolean,
  FILTER_ALARM_CODE?: string[],
  FILTER_DESCRIPTION?: string[],
  FILTER_REASON_ALARM?: string[],
  FILTER_ACTION_TAKEN?: string[],
  FILTER_RESET_TYPE?: string[],
  FILTER_CAUSE?: string[],
}) {
  if (params.HAS_FILTER) {
    if (params.FILTER_ALARM_CODE?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.ALARM_CODE IN (:FILTER_ALARM_CODE) `)
    }
    if (params.FILTER_DESCRIPTION?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.DESCRIPTION IN (:FILTER_DESCRIPTION) `)
    }
    if (params.FILTER_REASON_ALARM?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_REASON_ALARM) `)
    }
    if (params.FILTER_ACTION_TAKEN?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_ACTION_TAKEN) `)
    }
    if (params.FILTER_RESET_TYPE?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_RESET_TYPE) `)
    }
    if (params.FILTER_CAUSE?.length) {
      params.conditionsFilterColumns.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_CAUSE) `)
    }
  }
}

export async function countAlarmsToPage(qPars: {
  START_DATE: string,
  END_DATE: string,
  DEVICE_CODE: string,
  HAS_FILTER?: boolean,
  FILTER_ALARM_CODE?: string[],
  FILTER_DESCRIPTION?: string[],
  FILTER_REASON_ALARM?: string[],
  FILTER_ACTION_TAKEN?: string[],
  FILTER_RESET_TYPE?: string[],
  FILTER_CAUSE?: string[],
  HOUR_INTERVAL: number
}) {
    let sentence = `
      SELECT 
        COUNT (*) AS TOTAL_ALARMS
    `

    sentence += `
      FROM
        DRIS_CHILLER_ALARMS_HIST
        INNER JOIN CHILLER_CARRIER_ALARMS ON (CHILLER_CARRIER_ALARMS.ID = DRIS_CHILLER_ALARMS_HIST.ALARM_ID)
        INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLER_ALARMS_HIST.DRI_DEVICE_ID)
        INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    `
    const conditions: string[] = []
    conditions.push('DEVICES.DEVICE_CODE = :DEVICE_CODE');
    conditions.push(`
    ((DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.END_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE 
    AND DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE) OR
    (DRIS_CHILLER_ALARMS_HIST.END_DATE IS NULL AND 
    DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE AND
    DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE))`
    );

      const conditionsFilters: string[] = []
    if (qPars.HAS_FILTER) {
      if (qPars.FILTER_ALARM_CODE?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.ALARM_CODE IN (:FILTER_ALARM_CODE) `)
      }
      if (qPars.FILTER_DESCRIPTION?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.DESCRIPTION IN (:FILTER_DESCRIPTION) `)
      }
      if (qPars.FILTER_REASON_ALARM?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_REASON_ALARM) `)
      }
      if (qPars.FILTER_ACTION_TAKEN?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_ACTION_TAKEN) `)
      }
      if (qPars.FILTER_RESET_TYPE?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_RESET_TYPE) `)
      }
      if (qPars.FILTER_CAUSE?.length) {
        conditionsFilters.push(` CHILLER_CARRIER_ALARMS.REASON_ALARM IN (:FILTER_CAUSE) `)
      }
    }

    sentence += ' WHERE ' + conditions.join(' AND ');

    if (conditionsFilters.length) {
      sentence += ' AND (' + conditionsFilters.join(' OR ') + ')';
    }

    return sqldb.querySingle<{
        TOTAL_ALARMS: number
    }>(sentence, qPars)
}

export async function w_insert(qPars: { ALARM_ID: number, DRI_DEVICE_ID: number, START_DATE: string }, operationLogData: OperationLogData) {
    const fields: string[] = []
    fields.push('ALARM_ID');
    fields.push('DRI_DEVICE_ID');
    fields.push('START_DATE');

    const sentence = `INSERT INTO DRIS_CHILLER_ALARMS_HIST (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
    if (operationLogData) {
        await saveOperationLog('DRIS_CHILLER_ALARMS_HIST', sentence, qPars, operationLogData);
        dbLogger('DRIS_CHILLER_ALARMS_HIST', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars);
}

export async function w_update(qPars: { END_DATE: string, HIST_IDS: number[] }, operationLogData: OperationLogData) {
    const sentence = `UPDATE DRIS_CHILLER_ALARMS_HIST SET END_DATE = :END_DATE WHERE DRIS_CHILLER_ALARMS_HIST.ID IN (:HIST_IDS)`;

    if (operationLogData) {
        await saveOperationLog('DRIS_CHILLER_ALARMS_HIST', sentence, qPars, operationLogData);
        dbLogger('DRIS_CHILLER_ALARMS_HIST', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars);
}

export async function getAllChillerAlarmsCodes(qPars: { DEVICE_CODE: string, START_DATE: string, END_DATE: string, HOUR_INTERVAL: number }) {
    let sentence = `
        SELECT DISTINCT
            CHILLER_CARRIER_ALARMS.ALARM_CODE
        FROM 
            DRIS_CHILLER_ALARMS_HIST
            INNER JOIN CHILLER_CARRIER_ALARMS ON (CHILLER_CARRIER_ALARMS.ID = DRIS_CHILLER_ALARMS_HIST.ALARM_ID)
            INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_CHILLER_ALARMS_HIST.DRI_DEVICE_ID)
            INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
    `

    const conditions: string[] = []
    conditions.push('DEVICES.DEVICE_CODE = :DEVICE_CODE');
    conditions.push(`
    ((DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.END_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE 
    AND DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE) OR
    (DRIS_CHILLER_ALARMS_HIST.END_DATE IS NULL AND 
    DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') >= :START_DATE AND
    DATE_FORMAT(DATE_ADD(DRIS_CHILLER_ALARMS_HIST.START_DATE, INTERVAL :HOUR_INTERVAL HOUR), '%Y-%m-%d') <= :END_DATE))`
    );

    sentence += ' WHERE ' + conditions.join(' AND ');

    return sqldb.query<{
        ALARM_CODE: string
    }>(sentence, qPars)
}



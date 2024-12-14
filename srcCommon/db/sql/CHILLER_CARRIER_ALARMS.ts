import { dbLogger } from '../../helpers/logger'
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog'

export async function w_insert(qPars: {
  ALARM_CODE: string, DESCRIPTION?: string, REASON_ALARM?: string, ACTION_TAKEN?: string, RESET_TYPE?: string, CAUSE?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ALARM_CODE')

  if (qPars.DESCRIPTION !== undefined) {
    fields.push('DESCRIPTION')
  }
  if (qPars.REASON_ALARM !== undefined) {
    fields.push('REASON_ALARM')
  }
  if (qPars.ACTION_TAKEN !== undefined) {
    fields.push('ACTION_TAKEN')
  }
  if (qPars.RESET_TYPE !== undefined) {
    fields.push('RESET_TYPE')
  }
  if (qPars.CAUSE !== undefined) {
    fields.push('CAUSE')
  }

  const sentence = `INSERT INTO CHILLER_CARRIER_ALARMS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  if (operationLogData) {
    await saveOperationLog('CHILLER_CARRIER_ALARMS', sentence, qPars, operationLogData);
    dbLogger('CHILLER_CARRIER_ALARMS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getAlarmsList () {
  let sentence = `
    SELECT
        CHILLER_CARRIER_ALARMS.ID,
        CHILLER_CARRIER_ALARMS.ALARM_CODE
  `

  sentence += `
    FROM
      CHILLER_CARRIER_ALARMS
  `

  return sqldb.query<{
    ID: number
    ALARM_CODE: string
  }>(sentence)
}

export async function getAlarmIdByCode (qPars: { ALARM_CODE: string }) {
  let sentence = `
    SELECT
      CHILLER_CARRIER_ALARMS.ID
    FROM
      CHILLER_CARRIER_ALARMS
    WHERE CHILLER_CARRIER_ALARMS.ALARM_CODE = :ALARM_CODE
  `
  return sqldb.querySingle<{
    ID: number
  }>(sentence, qPars)
}

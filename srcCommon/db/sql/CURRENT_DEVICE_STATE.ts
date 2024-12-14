import * as sqldb from '../connectSql'

export function w_insertUpdate (qPars: { DEVICE_CODE: string, STATE_CONN?: string, TEMPERATURE?: number, TEMPERATURE1?: number, STATE?: string }) {
  const insertFields: string[] = []
  const updateFields: string[] = []

  insertFields.push('DEVICE_CODE')
  if (qPars.STATE_CONN !== undefined) insertFields.push('STATE_CONN');
  if (qPars.STATE_CONN !== undefined) updateFields.push("STATE_CONN = :STATE_CONN");
  if (qPars.TEMPERATURE1 !== undefined) insertFields.push('TEMPERATURE1');
  if (qPars.TEMPERATURE1 !== undefined) updateFields.push("TEMPERATURE1 = :TEMPERATURE1");
  if (qPars.TEMPERATURE !== undefined) insertFields.push('TEMPERATURE');
  if (qPars.TEMPERATURE !== undefined) updateFields.push("TEMPERATURE = :TEMPERATURE");
  if (qPars.STATE !== undefined) insertFields.push('STATE');
  if (qPars.STATE !== undefined) updateFields.push("STATE = :STATE");

  let sentence = `INSERT INTO CURRENT_DEVICE_STATE (${insertFields.join(', ')}) VALUES (:${insertFields.join(', :')})`
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  return sqldb.execute(sentence, qPars)
}

export function w_deleteUnused (qPars: {}) {
  const join = `LEFT JOIN DEVICES ON (DEVICES.DEVICE_CODE = CURRENT_DEVICE_STATE.DEVICE_CODE)`;

  const sentence = `DELETE CURRENT_DEVICE_STATE FROM CURRENT_DEVICE_STATE ${join} WHERE DEVICES.DEVICE_CODE IS NULL`;

  return sqldb.execute(sentence, qPars)
}

export function getList (qPars: {}) {
  let sentence = `
    SELECT
      CURRENT_DEVICE_STATE.DEVICE_CODE,
      CURRENT_DEVICE_STATE.STATE_CONN,
      CURRENT_DEVICE_STATE.TEMPERATURE,
      CURRENT_DEVICE_STATE.TEMPERATURE1,
      CURRENT_DEVICE_STATE.STATE
  `
  sentence += `
    FROM
      CURRENT_DEVICE_STATE
  `

  return sqldb.query<{
    DEVICE_CODE: string
    STATE_CONN: 'ONLINE'|'OFFLINE'|'LATE'|null
    TEMPERATURE: number
    TEMPERATURE1: number
    STATE: string
  }>(sentence, qPars)
}

export function getStates() {
  let sentence = `
    SELECT DISTINCT
      CURRENT_DEVICE_STATE.STATE
  `
  sentence += `
    FROM
      CURRENT_DEVICE_STATE
    WHERE CURRENT_DEVICE_STATE.STATE IS NOT NULL
  `
  return sqldb.query<{
    STATE: string
  }>(sentence)
}

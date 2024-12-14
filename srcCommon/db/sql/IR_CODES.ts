import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM IRCODES_DUT
  FIELD IRCODES_DUT.IR_ID
  FIELD IRCODES_DUT.CODE_DATA
*/
export async function w_insertIgnore (qPars: { IR_ID: string, CODE_DATA: string }, operationLogData: OperationLogData) { 
  const fields: string[] = []
  fields.push('IR_ID')
  fields.push('CODE_DATA')

  const sentence = `INSERT IGNORE INTO IR_CODES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getCode = SELECT ROW
  PARAM DUT_CODE: {DEVICES.DEVICE_CODE}
  PARAM CMD_TYPE?: {IR_CODES.CMD_TYPE}
  PARAM IR_ID?: {IR_CODES.IR_ID}
  FROM IR_CODES
  SELECT DEVICES.DEVICE_CODE AS DUT_CODE
  SELECT IR_CODES.ID
  SELECT IR_CODES.IR_ID
  SELECT IR_CODES.CODE_DATA
  SELECT IR_CODES.CMD_TYPE
  SELECT IR_CODES.TEMPERATURE
  WHERE {DEVICES.DEVICE_CODE} = {:DUT_CODE}
  WHERE [[IFOWNPROP {:CMD_TYPE}]] {IRCODES_DUT.CMD_TYPE} = {:CMD_TYPE}
  WHERE [[IFOWNPROP {:IR_ID}]] {IRCODES_DUT.IR_ID} = {:IR_ID}
*/
export function getCode (qPars: { DUT_CODE: string, CMD_TYPE?: string, IR_ID?: string }) { 
  let sentence = `
    SELECT
      IR_CODES.ID,
      DEVICES.DEVICE_CODE AS DUT_CODE,
      IR_CODES.IR_ID,
      IR_CODES.CODE_DATA,
      IR_CODES.CMD_TYPE,
      IR_CODES.TEMPERATURE
  `
  sentence += `
    FROM 
      DUTS_IR_CODES
    INNER JOIN DUTS_DEVICES ON DUTS_DEVICES.ID = DUTS_IR_CODES.DUT_DEVICE_ID
    LEFT JOIN DEVICES ON DEVICES.ID = DUTS_DEVICES.DEVICE_ID
    LEFT JOIN IR_CODES ON DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID
  `

  const conditions: string[] = []
  conditions.push(`DEVICES.DEVICE_CODE = :DUT_CODE`)
  if (qPars.CMD_TYPE !== undefined) { conditions.push(`IR_CODES.CMD_TYPE = :CMD_TYPE`) }
  if (qPars.IR_ID !== undefined) { conditions.push(`IR_CODES.IR_ID = :IR_ID`) }
  sentence += ' WHERE ' + conditions.join(' AND ') + ' ORDER BY IR_CODES.CMD_TYPE DESC'

  return sqldb.query<{
    ID: number
    DUT_CODE: string
    IR_ID: string
    CODE_DATA: string
    CMD_TYPE: string
    TEMPERATURE: number
  }>(sentence, qPars)
}

export function getAllCodes (qPars: { DUT_CODES: string[] }) { 
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DUT_CODE,
      IR_CODES.IR_ID,
      IR_CODES.CMD_TYPE,
      IR_CODES.CMD_DESC,
      IR_CODES.TEMPERATURE,
      IR_CODES.CODE_DATA
  `
  sentence += `
    FROM 
      DUTS_IR_CODES
    INNER JOIN DUTS_DEVICES ON DUTS_DEVICES.ID = DUTS_IR_CODES.DUT_DEVICE_ID
    LEFT JOIN DEVICES ON DEVICES.ID = DUTS_DEVICES.DEVICE_ID
    LEFT JOIN IR_CODES ON DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE IN (:DUT_CODES) `

  return sqldb.query<{
    DUT_CODE: string
    IR_ID: string
    CMD_TYPE: string
    CMD_DESC: string
    TEMPERATURE: number
    CODE_DATA: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getCodesByIrIdCmdType = SELECT FIRST
  PARAM IR_ID: {IR_CODES.IR_ID}
  PARAM CMD_TYPE?: {IR_CODES.CMD_TYPE}
  FROM IR_CODES
  SELECT IR_CODES.CODE_DATA
  SELECT IR_CODES.TEMPER
  SELECT IR_CODES.CMD_DESC
  WHERE {IR_CODES.IR_ID} = {:IR_ID}
  WHERE [[IFJS {:CMD_TYPE}]] {IR_CODES.CMD_TYPE} = {:CMD_TYPE}
  WHERE [[ELSE]] {IR_CODES.CMD_TYPE} IS NULL
*/
export function getCodesByIrIdCmdType (qPars: { IR_ID: string, CMD_TYPE?: string }) { 
  let sentence = `
    SELECT
      IR_CODES.CODE_DATA,
      IR_CODES.TEMPERATURE,
      IR_CODES.CMD_DESC
  `
  sentence += `
    FROM
      IR_CODES
  `

  const conditions: string[] = []
  conditions.push(`IR_CODES.IR_ID = :IR_ID`)
  if (qPars.CMD_TYPE) { conditions.push(`IR_CODES.CMD_TYPE = :CMD_TYPE`) }
  else { conditions.push(`IR_CODES.CMD_TYPE IS NULL`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.queryFirst<{
    CODE_DATA: string
    TEMPERATURE: number
    CMD_DESC: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC insertNewCommand = INSERT-UPDATE
  FROM  IR_CODES
  FIELD IR_CODES.IR_ID
  FIELD IR_CODES.CMD_TYPE
  FIELD IR_CODES.CODE_DATA
  FIELD IR_CODES.CMD_DESC
  FIELD IR_CODES.TEMPERATURE
*/
export async function w_insertNewCommand (qPars: { 
  IR_ID: string,
  CMD_TYPE: string,
  CODE_DATA: string,
  CMD_DESC: string,
  TEMPERATURE: number
}, operationLogData: OperationLogData) { // DONE
  const fields: string[] = []
  fields.push('IR_ID')
  fields.push('CMD_TYPE')
  fields.push('CODE_DATA')
  fields.push('CMD_DESC')
  fields.push('TEMPERATURE')

  let sentence = `INSERT INTO IR_CODES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("CMD_TYPE = :CMD_TYPE")
  updateFields.push("CODE_DATA = :CODE_DATA")
  updateFields.push("CMD_DESC = :CMD_DESC")
  updateFields.push("TEMPERATURE = :TEMPERATURE")
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}



/* @IFHELPER:FUNC update = UPDATE
  PARAM DUT_ID: {IRCODES_DUT.DUT_ID}
  PARAM IR_ID: {IRCODES_DUT.IR_ID}
  FROM IRCODES_DUT
  FIELD [[IFOWNPROP {:CMD_TYPE}]] IRCODES_DUT.CMD_TYPE
  FIELD [[IFOWNPROP {:CMD_DESC}]] IRCODES_DUT.CMD_DESC
  FIELD [[IFOWNPROP {:TEMPER}]] IRCODES_DUT.TEMPER
  WHERE {IRCODES_DUT.DUT_ID} = {:DUT_ID}
  WHERE {IRCODES_DUT.IR_ID} = {:IR_ID}
*/
export async function w_update (qPars: { DUT_CODE: string, IR_ID: string, CMD_TYPE?: string, CMD_DESC?: string, TEMPERATURE?: number }, operationLogData: OperationLogData) { 
  const fields: string[] = []
  if (qPars.CMD_TYPE !== undefined) { fields.push('CMD_TYPE = :CMD_TYPE') }
  if (qPars.CMD_DESC !== undefined) { fields.push('CMD_DESC = :CMD_DESC') }
  if (qPars.TEMPERATURE !== undefined) { fields.push('TEMPERATURE = :TEMPERATURE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const join = ` 
    INNER JOIN DUTS_IR_CODES ON (DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID)
    INNER JOIN DUTS_DEVICES ON (DUTS_IR_CODES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
    `;

  const sentence = `UPDATE IR_CODES ${join} SET ${fields.join(', ')} WHERE DEVICES.DEVICE_CODE = :DUT_CODE AND IR_CODES.IR_ID = :IR_ID`

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteIrCodeById = DELETE
  PARAM ID: {IR_CODES.ID}
  FROM IR_CODES
  WHERE {IR_CODES.ID} = {:ID}
*/
export async function w_deleteIrCodeById (qPars: { ID: number }, operationLogData: OperationLogData) { 

  const sentence = `DELETE FROM IR_CODES WHERE IR_CODES.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteIrCodeByIds = DELETE
  PARAM IDs: {IR_CODES.ID}
  FROM IR_CODES
  WHERE {IR_CODES.ID} IN {:IDs}
*/
export async function w_deleteIrCodeByIds (qPars: { IDs: number[] }, operationLogData: OperationLogData) { 

  const sentence = `DELETE FROM IR_CODES WHERE IR_CODES.ID IN (:IDs)`;

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeAction = UPDATE
  PARAM DUT_CODE: {DEVICES.DEVICE_CODE}
  PARAM CMD_TYPE: {IR_CODES.CMD_TYPE}
  FROM IR_CODES
  CONSTFIELD CMD_TYPE = NULL
  WHERE {DEVICES.DEVICE_CODE} = {:DUT_CODE}
  WHERE {IR_CODES.CMD_TYPE} = {:CMD_TYPE}
*/
export async function w_removeAction (qPars: { DUT_CODE: string, CMD_TYPE: string }, operationLogData: OperationLogData) {

  const join = ` 
    INNER JOIN DUTS_IR_CODES ON (DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID)
    INNER JOIN DUTS_DEVICES ON (DUTS_IR_CODES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
    `;

  const sentence = `UPDATE IR_CODES ${join} SET CMD_TYPE = NULL WHERE DEVICES.DEVICE_CODE = :DUT_CODE AND IR_CODES.CMD_TYPE = :CMD_TYPE`

  if (operationLogData) {
    await saveOperationLog('IR_CODES', sentence, qPars, operationLogData);
    dbLogger('IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
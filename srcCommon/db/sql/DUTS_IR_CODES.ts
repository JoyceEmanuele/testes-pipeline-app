import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DUTS_IR_CODES
  FIELD DUTS_IR_CODES.DUT_DEVICE_ID
  FIELD DUTS_IR_CODES.IR_CODE_ID
*/
export async function w_insert (qPars: { DUT_DEVICE_ID: number, IR_CODE_ID: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DUT_DEVICE_ID')
  fields.push('IR_CODE_ID')

  const sentence = `INSERT INTO DUTS_IR_CODES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DUTS_IR_CODES', sentence, qPars, operationLogData);
    dbLogger('DUTS_IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDuts (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) { 
  const join = ` 
                 INNER JOIN DUTS_DEVICES ON (DUTS_IR_CODES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID) `;

  const sentence = `DELETE DUTS_IR_CODES FROM DUTS_IR_CODES ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DUTS_IR_CODES', sentence, qPars, operationLogData);
    dbLogger('DUTS_IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)

}

/* @IFHELPER:FUNC deleteFromDut = DELETE
  PARAM DUT_CODE: {DEVICES.DEVICE_CODE}
  FROM DUTS_IR_CODES
  WHERE {DEVICES.DEVICE_CODE} = {:DUT_CODE}
*/
export async function w_deleteFromDut (qPars: { DUT_CODE: string }, operationLogData: OperationLogData) {
  const join = ` 
                INNER JOIN DUTS_DEVICES ON (DUTS_IR_CODES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
                `;

  const sentence = `DELETE FROM DUTS_IR_CODES ${join} WHERE DEVICES.DEVICE_CODE = :DUT_CODE`;

  if (operationLogData) {
    await saveOperationLog('DUTS_IR_CODES', sentence, qPars, operationLogData);
    dbLogger('DUTS_IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


/* @IFHELPER:FUNC w_deleteDutsIrCode = DELETE
  PARAM DUT_CODE: {DEVICES.DEVICE_CODE}
  PARAM IR_ID: {IR_CODES.IR_ID}
  FROM DUTS_IR_CODES
  WHERE {DEVICES.DEVICE_CODE} = {:DUT_CODE}
  WHERE {IR_CODES.IR_ID} = {:IR_ID}
*/
export async function w_deleteDutsIrCode (qPars: { DUT_CODE: string, IR_ID: string }, operationLogData: OperationLogData) { 
  const join = ` 
                INNER JOIN IR_CODES ON (DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID)   
                INNER JOIN DUTS_DEVICES ON (DUTS_IR_CODES.DUT_DEVICE_ID = DUTS_DEVICES.ID)
                INNER JOIN DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
                `;

  const sentence = `DELETE DUTS_IR_CODES FROM DUTS_IR_CODES ${join} WHERE DEVICES.DEVICE_CODE = :DUT_CODE AND IR_CODES.IR_ID = :IR_ID`;

  if (operationLogData) {
      dbLogger('DUTS_IR_CODES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getAllCodesByClientId (qPars: { CLIENT_ID: number }) { 
  let sentence = `
    SELECT
      IR_CODES.ID,
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
    LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    LEFT JOIN IR_CODES ON DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID
  `

  sentence += ` WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID `

  return sqldb.query<{
    ID: number
    DUT_CODE: string
    IR_ID: string
    CMD_TYPE: string
    CMD_DESC: string
    TEMPERATURE: number
    CODE_DATA: string
  }>(sentence, qPars)
}

export function getAllCodesByDutCode (qPars: { DUT_CODE: string }) {
  let sentence = `
    SELECT
      IR_CODES.ID AS ID,
      DEVICES.DEVICE_CODE AS DUT_CODE,
      IR_CODES.IR_ID AS IR_ID,
      IR_CODES.CMD_TYPE AS CMD_TYPE,
      IR_CODES.CMD_DESC AS CMD_DESC,
      IR_CODES.TEMPERATURE AS TEMPERATURE,
      IR_CODES.CODE_DATA AS CODE_DATA
  `
  sentence += `
    FROM 
      DUTS_IR_CODES
    INNER JOIN DUTS_DEVICES ON DUTS_DEVICES.ID = DUTS_IR_CODES.DUT_DEVICE_ID
    LEFT JOIN DEVICES ON DEVICES.ID = DUTS_DEVICES.DEVICE_ID
    LEFT JOIN IR_CODES ON DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :DUT_CODE `

  return sqldb.query<{
    ID: number
    DUT_CODE: string
    IR_ID: string
    CMD_TYPE: string
    CMD_DESC: string
    TEMPERATURE: number
    CODE_DATA: string
  }>(sentence, qPars)
}

export function getAllCodesByDutCodeAndIrId (qPars: { DUT_CODE: string, IR_ID: string }) { 
  let sentence = `
    SELECT
      IR_CODES.ID AS ID,
      DEVICES.DEVICE_CODE AS DUT_CODE,
      IR_CODES.IR_ID AS IR_ID,
      IR_CODES.CMD_TYPE AS CMD_TYPE,
      IR_CODES.CMD_DESC AS CMD_DESC,
      IR_CODES.TEMPERATURE AS TEMPERATURE,
      IR_CODES.CODE_DATA AS CODE_DATA
  `
  sentence += `
    FROM 
      DUTS_IR_CODES
    INNER JOIN DUTS_DEVICES ON DUTS_DEVICES.ID = DUTS_IR_CODES.DUT_DEVICE_ID
    LEFT JOIN DEVICES ON DEVICES.ID = DUTS_DEVICES.DEVICE_ID
    LEFT JOIN IR_CODES ON DUTS_IR_CODES.IR_CODE_ID = IR_CODES.ID
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :DUT_CODE AND IR_CODES.IR_ID = :IR_ID `

  return sqldb.query<{
    ID: number
    DUT_CODE: string
    IR_ID: string
    CMD_TYPE: string
    CMD_DESC: string
    TEMPERATURE: number
    CODE_DATA: string
  }>(sentence, qPars)
}
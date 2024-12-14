import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DAMS_AUTOMATIONS
  FIELD DAMS_AUTOMATIONS.DAM_DEVICE_ID
  FIELD DAMS_AUTOMATIONS.MACHINE_ID
  FIELD DAMS_AUTOMATIONS.READ_DUT_TEMPERATURE_FROM_BROKER
*/
export async function w_insert (qPars: {
  DAM_DEVICE_ID: number,
  MACHINE_ID: number,
  READ_DUT_TEMPERATURE_FROM_BROKER: boolean,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAM_DEVICE_ID');
  fields.push('MACHINE_ID');
  fields.push('READ_DUT_TEMPERATURE_FROM_BROKER');

  const sentence = `INSERT INTO DAMS_AUTOMATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DAMS_AUTOMATIONS
  FIELD [[IFOWNPROP {:DAM_DEVICE_ID}]] DAMS_AUTOMATIONS.DAM_DEVICE_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] DAMS_AUTOMATIONS.MACHINE_ID
  FIELD [[IFOWNPROP {:CONFIG_ECO_LOCAL_SENT}]] DAMS_AUTOMATIONS.CONFIG_ECO_LOCAL_SENT
  FIELD [[IFOWNPROP {:READ_DUT_TEMPERATURE_FROM_BROKER}]] DAMS_AUTOMATIONS.READ_DUT_TEMPERATURE_FROM_BROKER
  WHERE {DAMS_AUTOMATIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DAM_DEVICE_ID?: number,
  MACHINE_ID?: number,
  CONFIG_ECO_LOCAL_SENT?: number,
  READ_DUT_TEMPERATURE_FROM_BROKER?: boolean
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DAM_DEVICE_ID !== undefined) { fields.push('DAM_DEVICE_ID = :DAM_DEVICE_ID') }
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.CONFIG_ECO_LOCAL_SENT !== undefined) { fields.push('CONFIG_ECO_LOCAL_SENT = :CONFIG_ECO_LOCAL_SENT') }
  if (qPars.READ_DUT_TEMPERATURE_FROM_BROKER !== undefined) { fields.push('READ_DUT_TEMPERATURE_FROM_BROKER = :READ_DUT_TEMPERATURE_FROM_BROKER') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DAMS_AUTOMATIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  
  let sentence = `DELETE FROM DAMS_AUTOMATIONS`;
  
  if (qPars.ID) { conditions.push(`ID = :ID`)}

  if (conditions.length === 0) {
    throw new Error('Error: Forbidden to delete without conditions!');
  }

  sentence += ' WHERE ' + conditions.join(' AND ')

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DAMS_AUTOMATIONS FROM DAMS_AUTOMATIONS${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientMachine (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN MACHINES ON (MACHINES.ID = DAMS_AUTOMATIONS.MACHINE_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE DAMS_AUTOMATIONS FROM DAMS_AUTOMATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DAMS_DEVICES ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
                 INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DAMS_AUTOMATIONS FROM DAMS_AUTOMATIONS${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DAMS_AUTOMATIONS WHERE DAMS_AUTOMATIONS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DAMS_AUTOMATIONS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}
  
export function getDamsAutomationsList (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT
      DAMS_AUTOMATIONS.ID AS DAM_AUTOMATION_ID,
      DAMS_AUTOMATIONS.MACHINE_ID AS MACHINE_ID,
      DAMS_ILLUMINATIONS.ILLUMINATION_ID AS ILLUMINATION_ID
  `
  sentence += `
    FROM
      DAMS_DEVICES
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }
  conditions.push('DAMS_DEVICES.ID = COALESCE(DAMS_AUTOMATIONS.DAM_DEVICE_ID, DAMS_ILLUMINATIONS.DAM_DEVICE_ID)')
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DAM_AUTOMATION_ID: number
    MACHINE_ID: number
    ILLUMINATION_ID: number
  }>(sentence, qPars)
}

export async function getDamsAutomationsListToScript () {
  let sentence = `
    SELECT DISTINCT
      DEVICES.DEVICE_CODE AS DAM_CODE,
      DAMS_DEVICES.ID,
      DAMS_AUTOMATIONS.ID AS DAMS_AUTOMATION_ID,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO AS ENABLE_ECO,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO_LOCAL AS ENABLE_ECO_LOCAL,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_CFG AS ECO_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.SETPOINT AS SETPOINT,
      CURRENT_AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS AS UPPER_HYSTERESIS,
      CURRENT_AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS AS LOWER_HYSTERESIS,
      CURRENT_AUTOMATIONS_PARAMETERS.SELF_REFERENCE AS SELF_REFERENCE,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_INT_TIME AS ECO_INT_TIME,
      DAMS_DEVICES.CAN_SELF_REFERENCE AS CAN_SELF_REFERENCE
    FROM
      DAMS_DEVICES
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      INNER JOIN DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DAMS_AUTOMATIONS.MACHINE_ID)
      INNER JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (
        CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID
      )
  `;

  return sqldb.query<{
    DAM_CODE: string
    DAM_ID: number
    DAMS_AUTOMATION_ID: number
    ENABLE_ECO: number
    ENABLE_ECO_LOCAL: number
    ECO_CFG: string
    SETPOINT: number
    UPPER_HYSTERESIS: number
    LOWER_HYSTERESIS: number
    SELF_REFERENCE: number
    ECO_INT_TIME: number
    CAN_SELF_REFERENCE: number
    CONFIG_ECO_LOCAL_SENT: boolean
  }>(sentence);
}

export async function getDamsAutomationsToFix(qPars: {}) {
  const sentence = 
    `SELECT
      DAMS_AUTOMATIONS.ID AS DAM_AUTOMATION_ID
    FROM 
      DAMS_AUTOMATIONS 
      INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = DAMS_AUTOMATIONS.DAM_DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DAMS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (MACHINES.ID = DAMS_AUTOMATIONS.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLIENTS.CLIENT_ID`;

    return sqldb.query<{
      DAM_AUTOMATION_ID: number
    }>(sentence, qPars)
}


export async function w_removeDam(qPars: { DEV_AUT: string }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          DAMS_AUTOMATION
      FROM
          DAMS_AUTOMATION
          INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = DAMS_AUTOMATION.DAM_DEVICE_ID)
          INNER JOIN DEVICES ON (DEVICES.ID = DAMS_DEVICES.DEVICE_ID)
      WHERE
          DEVICES.DEVICE_CODE = :DEV_AUT
  `

  if (operationLogData) {
      await saveOperationLog('DAMS_AUTOMATION', sentence, qPars, operationLogData);
      dbLogger('DAMS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeClientMachinesDam(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE 
          DAMS_AUTOMATION
      FROM 
          DAMS_AUTOMATION 
          INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = DAMS_AUTOMATION.DAM_DEVICE_ID)
          INNER JOIN DEVICES ON (DEVICES.ID = DAMS_DEVICES.DEVICE_ID)
          INNER JOIN DEVICES_CLIENT ON (DEVICES_CLIENT.DEVICE_ID = DEVICES.ID)
      WHERE
          DEVICES_CLIENT.CLIENT_ID = :CLIENT_ID
  `
  if (operationLogData) {
      await saveOperationLog('DAMS_AUTOMATION', sentence, qPars, operationLogData);
      dbLogger('DAMS_AUTOMATION', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDamAutomationUsed = SELECT LIST
  PARAM DAM_DEVICE_ID: {DAMS_AUTOMATIONS.DAM_DEVICE_ID}
  FROM DAMS_AUTOMATIONS
  SELECT DAMS_AUTOMATIONS.ID
  SELECT DAMS_AUTOMATIONS.DAM_DEVICE_ID
  SELECT DAMS_AUTOMATIONS.MACHINE_ID

  WHERE {DAMS_AUTOMATIONS.DAM_DEVICE_ID} = ({:DAM_DEVICE_ID})
*/
export function getDamAutomationUsed (qPars: { DAM_DEVICE_ID: number }) {
  let sentence = `
    SELECT
      DAMS_AUTOMATIONS.ID,
      DAMS_AUTOMATIONS.DAM_DEVICE_ID,
      DAMS_AUTOMATIONS.MACHINE_ID,
      MACHINES.NAME
      `
  sentence += `
    FROM
    DAMS_AUTOMATIONS
      LEFT JOIN MACHINES ON (DAMS_AUTOMATIONS.MACHINE_ID = MACHINES.ID)
    WHERE
      DAMS_AUTOMATIONS.DAM_DEVICE_ID = :DAM_DEVICE_ID
  `;

  return sqldb.query<{
    ID: number
    DAM_DEVICE_ID: number
    MACHINE_ID: number
    NAME: string
  }>(sentence, qPars)
}
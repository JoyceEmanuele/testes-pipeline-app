import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DACS_AUTOMATIONS
  FIELD DACS_AUTOMATIONS.DAC_DEVICE_ID
  FIELD DACS_AUTOMATIONS.MACHINE_ID
*/
export async function w_insert (qPars: {
  DAC_DEVICE_ID: number,
  MACHINE_ID: number,
  DISAB: number,
  FW_MODE: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAC_DEVICE_ID');
  fields.push('MACHINE_ID');
  fields.push('DISAB');
  fields.push('FW_MODE');

  const sentence = `INSERT INTO DACS_AUTOMATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DACS_AUTOMATIONS
  FIELD [[IFOWNPROP {:DAC_DEVICE_ID}]] DACS_AUTOMATIONS.DAC_DEVICE_ID
  FIELD [[IFOWNPROP {:MACHINE_ID}]] DACS_AUTOMATIONS.MACHINE_ID
  WHERE {DACS_AUTOMATIONS.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DAC_DEVICE_ID?: number,
  MACHINE_ID?: number,
  DISAB?: number,
  FW_MODE?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DAC_DEVICE_ID !== undefined) { fields.push('DAC_DEVICE_ID = :DAC_DEVICE_ID') }
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.DISAB !== undefined) { fields.push('DISAB = :DISAB') }
  if (qPars.FW_MODE !== undefined) { fields.push('FW_MODE = :FW_MODE') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DACS_AUTOMATIONS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteRow (qPars: { ID: number}, operationLogData: OperationLogData) {

  const conditions: string[] = []
  
  let sentence = `DELETE FROM DACS_AUTOMATIONS`;
  
  if (qPars.ID) { conditions.push(`ID = :ID`)}

  if (conditions.length === 0) {
    throw new Error('Error: Forbidden to delete without conditions!');
  }

  sentence += ' WHERE ' + conditions.join(' AND ')

  if (operationLogData) {
    await saveOperationLog('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByMachineId(qPars: { MACHINE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DACS_AUTOMATIONS WHERE DACS_AUTOMATIONS.MACHINE_ID = :MACHINE_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
  }
  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientMachine (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN MACHINES ON (MACHINES.ID = DACS_AUTOMATIONS.MACHINE_ID)
                 INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)`;

  const sentence = `DELETE DACS_AUTOMATIONS FROM DACS_AUTOMATIONS ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
    dbLogger('DACS_AUTOMATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export function getDacsAutomationsList (qPars: {
  DEVICE_CODE: string,
}) {

  if (qPars.DEVICE_CODE == null) { throw new Error('Parameter DEVICE_CODE not found!'); }
  let sentence = `
    SELECT
      DACS_AUTOMATIONS.ID AS DAC_AUTOMATION_ID,
      DACS_AUTOMATIONS.MACHINE_ID AS MACHINE_ID
  `
  sentence += `
    FROM
      DACS_AUTOMATIONS
      INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_AUTOMATIONS.DAC_DEVICE_ID)
      INNER JOIN DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  const conditions: string[] = []
  conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`);

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DAC_AUTOMATION_ID: number,
    MACHINE_ID: number,
  }>(sentence, qPars)
}

export async function getDacsAutomationsToFix(qPars: {}) {
  const sentence = 
    `SELECT
      DACS_AUTOMATIONS.ID AS DAC_AUTOMATION_ID
    FROM 
      DACS_AUTOMATIONS 
      INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_AUTOMATIONS.DAC_DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DACS_DEVICES.DEVICE_ID)
      INNER JOIN MACHINES ON (MACHINES.ID = DACS_AUTOMATIONS.MACHINE_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    WHERE
      DEVICES_CLIENTS.CLIENT_ID IS NULL OR DEVICES_CLIENTS.CLIENT_ID <> CLIENTS.CLIENT_ID`;

    return sqldb.query<{
      DAC_AUTOMATION_ID: number
    }>(sentence, qPars)
}
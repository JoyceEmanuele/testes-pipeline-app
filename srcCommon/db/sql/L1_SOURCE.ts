import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insertOrUpdate = INSERT-UPDATE
  FROM L1_SOURCE
  FIELD L1_SOURCE.DAC_DEVICE_ID
  FIELD L1_SOURCE.SELECTED_L1_SIM
*/
export async function w_insertOrUpdate(qPars: { DAC_DEVICE_ID: number, SELECTED_L1_SIM: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DAC_DEVICE_ID')
  fields.push('SELECTED_L1_SIM')

  let sentence = `INSERT INTO L1_SOURCE (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  updateFields.push("DAC_DEVICE_ID = :DAC_DEVICE_ID")
  updateFields.push('SELECTED_L1_SIM  = :SELECTED_L1_SIM');
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('L1_SOURCE', sentence, qPars, operationLogData);
    dbLogger('L1_SOURCE', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteDacInfo = DELETE
  PARAM DAC_DEVICE_ID: {L1_SOURCE.DAC_DEVICE_ID}
  FROM L1_SOURCE
  WHERE {L1_SOURCE.DAC_DEVICE_ID} = {:DAC_DEVICE_ID}
*/
export async function w_deleteDacInfo(qPars: { DAC_DEVICE_ID: number }, operationLogData: OperationLogData) {

    const sentence = `DELETE FROM L1_SOURCE WHERE L1_SOURCE.DAC_DEVICE_ID = :DAC_DEVICE_ID`;

    if (operationLogData) {
        await saveOperationLog('L1_SOURCE', sentence, qPars, operationLogData);
        dbLogger('L1_SOURCE', sentence, qPars, operationLogData);
    }

    return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClientDacs = DELETE
  PARAM CLIENT_ID: {DEVICES_CLIENTS.CLIENT_ID}
  FROM L1_SOURCE
  INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = L1_SOURCE.DAC_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
  INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
  WHERE {DEVICES_CLIENTS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClientDacs (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
    const join = `
      INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = L1_SOURCE.DAC_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    `
  
    const sentence = `DELETE L1_SOURCE FROM L1_SOURCE ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;
  
    if (operationLogData) {
      await saveOperationLog('L1_SOURCE', sentence, qPars, operationLogData);
      dbLogger('L1_SOURCE', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

export async function getAllDacsL1VirtualPsuc(qPars: { 
  dayInit: string, 
  dayFinish: string, 
  CLIENT_NAME?: string, 
  UNIT_ID?: number,
  CITY_ID?: number,
  STATE_NAME?: string,
  DACS_ID?: string[],
  last_calculated_date?: string
}) {
  let sentence = `SELECT DEVICES.DEVICE_CODE,
    DACS_DEVICES.DEVICE_ID,
    SELECTED_L1_SIM,
    DACS_DEVICES.P0_POSITN,
    DACS_DEVICES.P1_POSITN,
    cache_cond_tel.YMD
    FROM L1_SOURCE
    INNER JOIN DACS_DEVICES ON (L1_SOURCE.DAC_DEVICE_ID = DACS_DEVICES.ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
    INNER JOIN cache_cond_tel ON (cache_cond_tel.devId = DEVICES.DEVICE_CODE) `;

  if (qPars.CLIENT_NAME) {
    sentence += `
    INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
    INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID) `;
  }

  if (qPars.UNIT_ID || qPars.STATE_NAME || qPars.CITY_ID) {
    sentence += `
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID) `;
  }

  if (qPars.STATE_NAME || qPars.CITY_ID) {
    sentence += `
    INNER JOIN CITY ON (CLUNITS.CITY_ID = CITY.CITY_ID)
    INNER JOIN STATEREGION ON (CITY.STATE_ID = STATEREGION.ID) `;
  }

  sentence += `
  WHERE SELECTED_L1_SIM = 'virtual' 
  AND (cache_cond_tel.YMD >= :dayInit AND cache_cond_tel.YMD <= :dayFinish) 
  AND (DACS_DEVICES.P0_POSITN = 'psuc' OR DACS_DEVICES.P1_POSITN = 'psuc') `;


  if (qPars.CLIENT_NAME) {
    sentence += `
    AND CLIENTS.NAME = :CLIENT_NAME `;
  }

  if (qPars.STATE_NAME) {
    sentence += `
    AND STATEREGION.NAME = :STATE_NAME `;
  }

  if (qPars.UNIT_ID) {
    sentence += `
    AND CLUNITS.UNIT_ID = :UNIT_ID `;
  }

  if (qPars.CITY_ID) {
    sentence += `
    AND CITY.CITY_ID = :CITY_ID `;
  }


  if (qPars.DACS_ID && qPars.DACS_ID.length > 0) {
    sentence += `
    AND DEVICES.DEVICE_CODE IN (${qPars.DACS_ID});
    `
  }

  if (qPars.last_calculated_date) {
    sentence += `
    AND cache_cond_tel.last_calculated_date <= :last_calculated_date`
  }

  return sqldb.query<{
    DEVICE_CODE: string
    DEVICE_ID: number
    SELECTED_L1_SIM: string
    P0_POSITN?: string
    P1_POSITN?: string
    YMD: string
  }>(sentence, qPars);
}

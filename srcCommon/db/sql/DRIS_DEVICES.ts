import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM DRIS_DEVICES
  FIELD DRIS_DEVICES.DEVICE_ID
  FIELD DRIS_DEVICES.SYSTEM_NAME
  FIELD DRIS_DEVICES.LASTCFGSEND
  FIELD DRIS_DEVICES.CARDSCFG
  FIELD DRIS_DEVICES.VARSCFG
*/
export async function w_insert (qPars: {
  DEVICE_ID: number,
  SYSTEM_NAME: string,
  LASTCFGSEND: string,
  CARDSCFG: string,
  VARSCFG: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');
  fields.push('SYSTEM_NAME');
  fields.push('LASTCFGSEND');
  fields.push('CARDSCFG');
  fields.push('VARSCFG');

  const sentence = `INSERT INTO DRIS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insertIgnore (qPars: {
  DEVICE_ID: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEVICE_ID');

  const sentence = `INSERT INTO DRIS_DEVICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClient (qPars: { CLIENT_ID: number}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES.ID = DEVICES_CLIENTS.DEVICE_ID)`;

  const sentence = `DELETE DRIS_DEVICES FROM DRIS_DEVICES${join} WHERE CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromDeviceCode (qPars: { DEVICE_CODE: string}, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DRIS_DEVICES FROM DRIS_DEVICES${join} WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM DRIS_DEVICES
  FIELD [[IFOWNPROP {:DEVICE_ID}]] DRIS_DEVICES.DEVICE_ID
  FIELD [[IFOWNPROP {:SYSTEM_NAME}]] DRIS_DEVICES.SYSTEM_NAME
  FIELD [[IFOWNPROP {:LASTCFGSEND}]] DRIS_DEVICES.LASTCFGSEND
  FIELD [[IFOWNPROP {:CARDSCFG}]] DRIS_DEVICES.CARDSCFG
  FIELD [[IFOWNPROP {:VARSCFG}]] DRIS_DEVICES.VARSCFG
  WHERE {DRIS_DEVICES.ID} = {:ID}
*/
export async function w_updateInfo (qPars: {
  ID: number,
  DEVICE_ID?: number,
  SYSTEM_NAME?: string,
  LASTCFGSEND?: string,
  CARDSCFG?: string,
  VARSCFG?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.DEVICE_ID !== undefined) { fields.push('DEVICE_ID = :DEVICE_ID') }
  if (qPars.SYSTEM_NAME !== undefined) { fields.push('SYSTEM_NAME = :SYSTEM_NAME') }
  if (qPars.LASTCFGSEND !== undefined) { fields.push('LASTCFGSEND = :LASTCFGSEND') }
  if (qPars.CARDSCFG !== undefined) { fields.push('CARDSCFG = :CARDSCFG') }
  if (qPars.VARSCFG !== undefined) { fields.push('VARSCFG = :VARSCFG') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DRIS_DEVICES SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('DRIS_DEVICES', sentence, qPars, operationLogData);
    dbLogger('DRIS_DEVICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
export function getDriDeviceInfo (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT DISTINCT
      DRIS_DEVICES.ID AS DRI_DEVICE_ID,
      DRIS_DEVICES.DEVICE_ID AS DEVICE_ID,
      DRIS_DEVICES.SYSTEM_NAME AS SYSTEM_NAME,
      DRIS_DEVICES.LASTCFGSEND AS LASTCFGSEND,
      DRIS_DEVICES.CARDSCFG AS CARDSCFG,
      DRIS_DEVICES.VARSCFG AS VARSCFG,
      DRIS_ENERGY_DEVICES.ID AS DRI_ENERGY_DEVICE_ID
  `
  sentence += `
    FROM
      DRIS_DEVICES
      LEFT JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.DRI_DEVICE_ID = DRIS_DEVICES.ID)
    `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    DRI_DEVICE_ID: number,
    DEVICE_ID: number
    SYSTEM_NAME: string
    LASTCFGSEND: string
    CARDSCFG: string
    VARSCFG: string
    DRI_ENERGY_DEVICE_ID: number
  }>(sentence, qPars)
}

export async function getBaciInfoByDeviceCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      DRIS_DEVICES.ID AS DRI_DEVICE_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID
  `
  sentence += `
    FROM
      DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    `

  sentence += `WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE`;

  return sqldb.querySingle<{
    DRI_DEVICE_ID: number
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

export function getAllDrisByUnit(qPars: { UNIT_ID: number }) {
  let sentence = `
  SELECT
    DEVICES.DEVICE_CODE
  `
  sentence += `
    FROM DRIS_DEVICES
      INNER JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
    `
  sentence += ` WHERE DEVICES_UNITS.UNIT_ID = :UNIT_ID`;

  return sqldb.query<{
    DEVICE_CODE: string
  }>(sentence, qPars);
}

export function getAllDrisVarsByUnit(qPars: { UNIT_ID: number }) {
  let sentence = `
  SELECT
    DRIS_DEVICES.VARSCFG,
    DRIS_DEVICES.DEVICE_ID,
    DEVICES.DEVICE_CODE,
    MACHINES.NAME AS MACHINE_NAME
  FROM 
    DRIS_DEVICES
  `
  sentence += `
    LEFT JOIN DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
    LEFT JOIN DEVICES_UNITS ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
    LEFT JOIN CLUNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
    LEFT JOIN DRIS_CHILLERS  ON (DRIS_CHILLERS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
    LEFT JOIN CHILLERS ON (DRIS_CHILLERS.CHILLER_ID = CHILLERS.ID)
    LEFT JOIN MACHINES ON (MACHINES.ID = CHILLERS.MACHINE_ID)
  `
  sentence += ` WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  return sqldb.query<{
    VARSCFG: string
    DEVICE_ID: string
    DEVICE_CODE: string
    MACHINE_NAME: string
  }>(sentence, qPars);
}

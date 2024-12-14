import { dbLogger } from '../../helpers/logger';
import * as sqldb from '../connectSql'
import { OperationLogData, saveOperationLog } from '../dbModifLog';

/* @IFHELPER:FUNC getDmtUsedPorts = SELECT LIST
  PARAM DMT_ID: {DMTS_NOBREAK_CIRCUITS.DMT_ID}
  FROM DMTS_NOBREAK_CIRCUITS
  SELECT DMTS_NOBREAK_CIRCUITS.ID
  SELECT DMTS_NOBREAK_CIRCUITS.DMT_ID
  SELECT DMTS_NOBREAK_CIRCUITS.PORT

  WHERE {DMTS_NOBREAK_CIRCUITS.DMT_ID} = ({:DMT_ID})
*/
export function getDmtUsedPorts (qPars: { DMT_ID: number }) {
  let sentence = `
    SELECT
      DMTS_NOBREAK_CIRCUITS.ID,
      DMTS_NOBREAK_CIRCUITS.DMT_ID,
      DMTS_NOBREAK_CIRCUITS.PORT  
  `
  sentence += `
    FROM
      DMTS_NOBREAK_CIRCUITS
    WHERE
      DMTS_NOBREAK_CIRCUITS.DMT_ID = :DMT_ID
  `;

  return sqldb.query<{
    ID: number
    DMT_ID: number
    PORT: number
  }>(sentence, qPars)
}

export function getList (qPars: { deviceCodes?: string[], clientIds?: number[], unitIds?: number[] }) {
  let sentence = `
    SELECT
      DMTS_NOBREAK_CIRCUITS.DMT_ID,
      DMTS_NOBREAK_CIRCUITS.PORT
  `
  sentence += `
    FROM
      DMTS_NOBREAK_CIRCUITS
      LEFT JOIN DMTS ON (DMTS_NOBREAK_CIRCUITS.DMT_ID = DMTS.ID)
      LEFT JOIN DEVICES ON (DEVICES.ID = DMTS.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DMTS.DEVICE_ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DMTS.DEVICE_ID)
  `;

  const conditions: string[] = []
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES.DEVICE_CODE IN (:deviceCodes)`) }
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.deviceCodes != null) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DMT_ID: number
    PORT: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM DMTS_NOBREAK_CIRCUITS
  FIELD DMTS_NOBREAK_CIRCUITS.DMT_ID
  FIELD DMTS_NOBREAK_CIRCUITS.PORT
*/
export async function w_insert (qPars: { DMT_ID: number, PORT: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DMT_ID')
  fields.push('PORT')

  const sentence = `INSERT INTO DMTS_NOBREAK_CIRCUITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAK_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAK_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC w_deleteDmtNobreakCircuitByDmtId = DELETE
  FROM DMTS_NOBREAK_CIRCUITS
*/
export async function w_deleteDmtNobreakCircuitByDmtId (qPars: { DMT_ID: number}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DMTS_NOBREAK_CIRCUITS WHERE DMTS_NOBREAK_CIRCUITS.DMT_ID = :DMT_ID `;

  if (operationLogData) {
    await saveOperationLog('DMTS_NOBREAK_CIRCUITS', sentence, qPars, operationLogData);
    dbLogger('DMTS_NOBREAK_CIRCUITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
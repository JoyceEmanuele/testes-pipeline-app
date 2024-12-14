import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC getDetails = SELECT ROW
  PARAM ICCID: {SIMCARDS.ICCID}

  FROM SIMCARDS

  SELECT SIMCARDS.ID
  SELECT SIMCARDS.ICCID
  SELECT SIMCARDS.CLIENT
  SELECT SIMCARDS.UNIT
  SELECT SIMCARDS.ACCESSPOINT
  SELECT SIMCARDS.MODEM
  SELECT SIMCARDS.MACACCESSPOINT
  SELECT SIMCARDS.MACREPEATER

  WHERE {SIMCARDS.ID} = {:ID}
*/
export function getDetails (qPars: { ICCID: string }) {
  let sentence = `
    SELECT
      SIMCARDS.ID,
      SIMCARDS.CLIENT,
      SIMCARDS.UNIT,
      SIMCARDS.ACCESSPOINT,
      SIMCARDS.MODEM,
      SIMCARDS.MACACCESSPOINT,
      SIMCARDS.MACREPEATER
  `
  sentence += `
    FROM
      SIMCARDS
  `

  sentence += ` WHERE SIMCARDS.ICCID = :ICCID `

  return sqldb.querySingle<{
    ID: number
    ICCID: string
    CLIENT: number
    UNIT: number
    ACCESSPOINT: string
    MODEM: string
    MACACCESSPOINT: string
    MACREPEATER: string
  }>(sentence, qPars)
}

export function getClientUnit (qPars: { ID: number }) {
  let sentence = `
    SELECT
      SIMCARDS.CLIENT AS CLIENT_ID,
      SIMCARDS.UNIT AS UNIT_ID
  `
  sentence += `
    FROM
      SIMCARDS
  `

  sentence += ` WHERE SIMCARDS.ID = :ID `

  return sqldb.querySingle<{
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}


/* @IFHELPER:FUNC getList = SELECT LIST
  FROM SIMCARDS
  INNER JOIN (CLIENTS.CLIENT_ID = SIMCARDS.CLIENT)
  INNER JOIN (CLUNITS.UNIT_ID = SIMCARDS.UNIT)

  SELECT SIMCARDS.ID
  SELECT SIMCARDS.ICCID
  SELECT SIMCARDS.CLIENT
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT SIMCARDS.UNIT
  SELECT CLUNITS.UNIT_NAME
  SELECT SIMCARDS.ACCESSPOINT
  SELECT SIMCARDS.MODEM
  SELECT SIMCARDS.MACACCESSPOINT
  SELECT SIMCARDS.MACREPEATER
*/
export function getList (qPars: { unitId?: number }) {
  let sentence = `
    SELECT
      SIMCARDS.ID,
      SIMCARDS.ICCID,
      SIMCARDS.CLIENT,
      CLIENTS.NAME AS CLIENT_NAME,
      SIMCARDS.UNIT,
      CLUNITS.UNIT_NAME,
      SIMCARDS.ACCESSPOINT,
      SIMCARDS.MODEM,
      SIMCARDS.MACACCESSPOINT,
      SIMCARDS.MACREPEATER,
      SIMCARDS.ASSOCIATION_DATE,
      CITY.CITY_ID,
      STATEREGION.ID AS STATE_ID
  `
  sentence += `
    FROM
      SIMCARDS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = SIMCARDS.CLIENT)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = SIMCARDS.UNIT)
      LEFT JOIN CITY ON (CLUNITS.CITY_ID = CITY.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `
  if (qPars.unitId) {
    sentence += `WHERE SIMCARDS.UNIT = :unitId`
  }

  return sqldb.query<{
    ID: number
    ICCID: string
    CLIENT: number
    CLIENT_NAME: string
    UNIT: number
    UNIT_NAME: string
    ACCESSPOINT: string
    MODEM: string
    MACACCESSPOINT: string
    MACREPEATER: string
    ASSOCIATION_DATE: string
    CITY_ID: number,
    STATE_ID: number,
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC insertOrUpdate = INSERT-UPDATE
  FROM SIMCARDS
  FIELD SIMCARDS.ICCID
  FIELD [[IFOWNPROP {:ID}]] SIMCARDS.ID
  FIELD [[IFOWNPROP {:CLIENT}]] SIMCARDS.CLIENT
  FIELD [[IFOWNPROP {:UNIT}]] SIMCARDS.UNIT
  FIELD [[IFOWNPROP {:ACCESSPOINT}]] SIMCARDS.ACCESSPOINT
  FIELD [[IFOWNPROP {:MODEM}]] SIMCARDS.MODEM
  FIELD [[IFOWNPROP {:MACACCESSPOINT}]] SIMCARDS.MACACCESSPOINT
  FIELD [[IFOWNPROP {:MACREPEATER}]] SIMCARDS.MACREPEATER
*/
export async function w_insertOrUpdate (qPars: {
  ICCID: string,
  ID?: number,
  CLIENT?: number,
  UNIT?: number,
  ACCESSPOINT?: string,
  MODEM?: string,
  MACACCESSPOINT?: string,
  MACREPEATER?: string,
  ASSOCIATION_DATE?: Date
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ICCID')
  if (qPars.ID !== undefined) { fields.push('ID') }
  if (qPars.CLIENT !== undefined) { fields.push('CLIENT') }
  if (qPars.UNIT !== undefined) { fields.push('UNIT') }
  if (qPars.ACCESSPOINT !== undefined) { fields.push('ACCESSPOINT') }
  if (qPars.MODEM !== undefined) { fields.push('MODEM') }
  if (qPars.MACACCESSPOINT !== undefined) { fields.push('MACACCESSPOINT') }
  if (qPars.MACREPEATER !== undefined) { fields.push('MACREPEATER') }
  if (qPars.ASSOCIATION_DATE !== undefined) { fields.push('ASSOCIATION_DATE')}

  let sentence = `INSERT INTO SIMCARDS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  const updateFields: string[] = []
  // updateFields.push('ID = :ID')
  // updateFields.push('ICCID = :ICCID')
  if (qPars.CLIENT !== undefined) { updateFields.push('CLIENT = :CLIENT') }
  if (qPars.UNIT !== undefined) { updateFields.push('UNIT = :UNIT') }
  if (qPars.ACCESSPOINT !== undefined) { updateFields.push('ACCESSPOINT = :ACCESSPOINT') }
  if (qPars.MODEM !== undefined) { updateFields.push('MODEM = :MODEM') }
  if (qPars.MACACCESSPOINT !== undefined) { updateFields.push('MACACCESSPOINT = :MACACCESSPOINT') }
  if (qPars.MACREPEATER !== undefined) { updateFields.push('MACREPEATER = :MACREPEATER') }
  if (qPars.ASSOCIATION_DATE !== undefined) { updateFields.push('ASSOCIATION_DATE = :ASSOCIATION_DATE')}

  if (!updateFields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  sentence += ` ON DUPLICATE KEY UPDATE ${updateFields.join(', ')} `

  if (operationLogData) {
    await saveOperationLog('SIMCARDS', sentence, qPars, operationLogData);
    dbLogger('SIMCARDS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_update (qPars: {
  ICCID: string,
  OLDICCID?: string,
  ID?: number,
  CLIENT?: number,
  UNIT?: number,
  ACCESSPOINT?: string,
  MODEM?: string,
  MACACCESSPOINT?: string,
  MACREPEATER?: string,
  ASSOCIATION_DATE?: Date
}, operationLogData: OperationLogData) {
  const updateFields: string[] = []
  // updateFields.push('ID = :ID')
  updateFields.push('ICCID = :ICCID')
  if (qPars.CLIENT !== undefined) { updateFields.push('CLIENT = :CLIENT') }
  if (qPars.UNIT !== undefined) { updateFields.push('UNIT = :UNIT') }
  if (qPars.ACCESSPOINT !== undefined) { updateFields.push('ACCESSPOINT = :ACCESSPOINT') }
  if (qPars.MODEM !== undefined) { updateFields.push('MODEM = :MODEM') }
  if (qPars.MACACCESSPOINT !== undefined) { updateFields.push('MACACCESSPOINT = :MACACCESSPOINT') }
  if (qPars.MACREPEATER !== undefined) { updateFields.push('MACREPEATER = :MACREPEATER') }
  if (qPars.ASSOCIATION_DATE !== undefined) { updateFields.push('ASSOCIATION_DATE = :ASSOCIATION_DATE')}

  if (!updateFields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars });

  let sentence = `UPDATE SIMCARDS SET ${updateFields.join(', ')}`
  sentence += ` WHERE ICCID = :OLDICCID;`

  if (operationLogData) {
    await saveOperationLog('SIMCARDS', sentence, qPars, operationLogData);
    dbLogger('SIMCARDS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeClient = UPDATE
  PARAM clientId: {SIMCARDS.CLIENT}
  FROM SIMCARDS
  CONSTFIELD CLIENT = NULL
  CONSTFIELD UNIT = NULL
  WHERE {SIMCARDS.CLIENT} = {:clientId}
*/
export async function w_removeClient (qPars: { clientId: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push("CLIENT = NULL")
  fields.push("UNIT = NULL")
  fields.push("ASSOCIATION_DATE = NULL")

  const sentence = `UPDATE SIMCARDS SET ${fields.join(', ')} WHERE SIMCARDS.CLIENT = :clientId`

  if (operationLogData) {
    await saveOperationLog('SIMCARDS', sentence, qPars, operationLogData);
    dbLogger('SIMCARDS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC removeUnit = UPDATE
  PARAM unitId: {SIMCARDS.UNIT}
  FROM SIMCARDS
  CONSTFIELD UNIT = NULL
  WHERE {SIMCARDS.UNIT} = {:unitId}
*/
export async function w_removeUnit (qPars: { unitId: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push("UNIT = NULL")
  fields.push("ASSOCIATION_DATE = NULL")

  const sentence = `UPDATE SIMCARDS SET ${fields.join(', ')} WHERE SIMCARDS.UNIT = :unitId`

  if (operationLogData) {
    await saveOperationLog('SIMCARDS', sentence, qPars, operationLogData);
    dbLogger('SIMCARDS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


export async function w_delete(qPars: { iccid: string }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM SIMCARDS WHERE SIMCARDS.ICCID = :iccid ;`
  if (operationLogData) {
    await saveOperationLog('SIMCARDS', sentence, qPars, operationLogData);
    dbLogger('SIMCARDS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}
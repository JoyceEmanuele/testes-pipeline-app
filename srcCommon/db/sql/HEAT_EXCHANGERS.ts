import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export function getHeatExchangersList () {
  let sentence = `
    SELECT
      HEAT_EXCHANGERS.ID,
      HEAT_EXCHANGERS.NAME,
      NULL AS BRAND,
      NULL AS MODEL,
      HEAT_EXCHANGERS.T_MIN, 
      HEAT_EXCHANGERS.T_MAX,
      HEAT_EXCHANGERS.DELTA_T_MIN,
      HEAT_EXCHANGERS.DELTA_T_MAX,
      NULL AS CLIENT_ID
  `
  sentence += `
    FROM
      HEAT_EXCHANGERS
  `
  
  return sqldb.query<{
    ID: number
    NAME: string
    BRAND: string
    MODEL: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }>(sentence)
}

export async function w_deleteRow (qPars: { ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM HEAT_EXCHANGERS WHERE ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_insert (qPars: { NAME: string, T_MIN: number, T_MAX: number, DELTA_T_MIN: number, DELTA_T_MAX: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.NAME !== undefined) { fields.push('NAME') }
  if (qPars.T_MIN !== undefined) { fields.push('T_MIN') }
  if (qPars.T_MAX !== undefined) { fields.push('T_MAX') }
  if (qPars.DELTA_T_MIN !== undefined) { fields.push('DELTA_T_MIN') }
  if (qPars.DELTA_T_MAX !== undefined) { fields.push('DELTA_T_MAX') }


  const sentence = `INSERT INTO HEAT_EXCHANGERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_updateInfo ( qPars: { ID: number, NAME?: string, T_MIN?: number, T_MAX?: number, DELTA_T_MIN?: number, DELTA_T_MAX?: number}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.NAME !== undefined) { fields.push('NAME = :NAME') }
  if (qPars.T_MIN !== undefined) { fields.push('T_MIN = :T_MIN') }
  if (qPars.T_MAX !== undefined) { fields.push('T_MAX = :T_MAX') }
  if (qPars.DELTA_T_MIN !== undefined) { fields.push('DELTA_T_MIN = :DELTA_T_MIN') }
  if (qPars.DELTA_T_MAX !== undefined) { fields.push('DELTA_T_MAX = :DELTA_T_MAX') }


  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE HEAT_EXCHANGERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

// export async function w_updateInfoByDac ( qPars: { HEAT_EXCHANGER_ID: number, MACHINE_ID?: number}, operationLogData: OperationLogData) {
//   const fields: string[] = []
//   if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
//   if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

//   const sentence = `UPDATE HEAT_EXCHANGERS SET ${fields.join(', ')} WHERE ID = :HEAT_EXCHANGER_ID`

//   if (operationLogData) {
//     await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
//     dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
//   }

//   return sqldb.execute(sentence, qPars)
// }

export function getHeatExchangerById (qPars: { ID: number }) {
  let sentence = `
    SELECT
      HEAT_EXCHANGERS.ID,
      HEAT_EXCHANGERS.NAME,
      NULL AS BRAND,
      NULL AS MODEL,
      HEAT_EXCHANGERS.T_MIN, 
      HEAT_EXCHANGERS.T_MAX,
      HEAT_EXCHANGERS.DELTA_T_MIN,
      HEAT_EXCHANGERS.DELTA_T_MAX,
      NULL AS CLIENT_ID
  `
  sentence += `
    FROM
      HEAT_EXCHANGERS
  `
  sentence += ` WHERE ID = :ID`;
  
  return sqldb.querySingle<{
    ID: number
    NAME: string
    BRAND: string
    MODEL: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
        HEAT_EXCHANGERS
      FROM
        HEAT_EXCHANGERS
          INNER JOIN MACHINES ON (MACHINES.ID = HEAT_EXCHANGERS.MACHINE_ID)
          INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      WHERE
          CLUNITS.UNIT_ID = :UNIT_ID
  `

  if (operationLogData) {
      await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
      DELETE
          HEAT_EXCHANGERS
      FROM
        HEAT_EXCHANGERS
          INNER JOIN MACHINES ON (MACHINES.ID = HEAT_EXCHANGERS.MACHINE_ID)
          INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
      await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE HEAT_EXCHANGERS FROM HEAT_EXCHANGERS WHERE HEAT_EXCHANGERS.ASSET_ID = :ASSET_ID`;

  if (operationLogData) {
      await saveOperationLog('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}


import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../../srcCommon/helpers/logger'

export async function w_insert(qPars: {
  MACHINE_ID: number,
  ASSET_ID: number,
  CAPACITY_POWER?: number,
  CAPACITY_UNIT?: string,
  MACHINE_KW?: number,
  EQUIPMENT_POWER?: string,
  COMPRESSOR_NOMINAL_CURRENT?: number,
  EVAPORATOR_MODEL_ID?: number,
  HEAT_EXCHANGER_ID?: number,
  TYPE_CFG?: string,
  APPL_CFG?: string,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('MACHINE_ID');
  fields.push('ASSET_ID');

  if (qPars.CAPACITY_POWER !== undefined) fields.push('CAPACITY_POWER')
  if (qPars.CAPACITY_UNIT !== undefined) fields.push('CAPACITY_UNIT')
  if (qPars.MACHINE_KW !== undefined) fields.push('MACHINE_KW')
  if (qPars.EQUIPMENT_POWER !== undefined) fields.push('EQUIPMENT_POWER')
  if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) fields.push('COMPRESSOR_NOMINAL_CURRENT')
  if (qPars.EVAPORATOR_MODEL_ID !== undefined) fields.push('EVAPORATOR_MODEL_ID')
  if (qPars.HEAT_EXCHANGER_ID !== undefined) fields.push('HEAT_EXCHANGER_ID')
  if (qPars.TYPE_CFG !== undefined) fields.push('TYPE_CFG')
  if (qPars.APPL_CFG !== undefined) fields.push('APPL_CFG')

  const sentence = `INSERT INTO ASSET_HEAT_EXCHANGERS (${fields.join(', ')}) VALUES(:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

export async function w_updateInfo(
  qPars: {
    ID: number
    MACHINE_ID?: number
    ASSET_ID?: number,
    CAPACITY_POWER?: number,
    CAPACITY_UNIT?: string,
    MACHINE_KW?: number,
    EQUIPMENT_POWER?: string,
    COMPRESSOR_NOMINAL_CURRENT?: number,
    EVAPORATOR_MODEL_ID?: number,
    HEAT_EXCHANGER_ID?: number,
    TYPE_CFG?: string,
    APPL_CFG?: string,
  }, operationLogData: OperationLogData
) {
  const fields: string[] = []
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.ASSET_ID !== undefined) { fields.push('ASSET_ID = :ASSET_ID') }
  if (qPars.CAPACITY_POWER !== undefined) { fields.push('CAPACITY_POWER = :CAPACITY_POWER') }
  if (qPars.CAPACITY_UNIT !== undefined) { fields.push('CAPACITY_UNIT = :CAPACITY_UNIT') }
  if (qPars.MACHINE_KW !== undefined) { fields.push('MACHINE_KW = :MACHINE_KW') }
  if (qPars.EQUIPMENT_POWER !== undefined) { fields.push('EQUIPMENT_POWER = :EQUIPMENT_POWER') }
  if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) { fields.push('COMPRESSOR_NOMINAL_CURRENT = :COMPRESSOR_NOMINAL_CURRENT') }
  if (qPars.EVAPORATOR_MODEL_ID !== undefined) { fields.push('EVAPORATOR_MODEL_ID = :EVAPORATOR_MODEL_ID') }
  if (qPars.HEAT_EXCHANGER_ID !== undefined) { fields.push('HEAT_EXCHANGER_ID = :HEAT_EXCHANGER_ID') }
  if (qPars.TYPE_CFG !== undefined) { fields.push('TYPE_CFG = :TYPE_CFG') }
  if (qPars.APPL_CFG !== undefined) { fields.push('APPL_CFG = :APPL_CFG') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ASSET_HEAT_EXCHANGERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_updateInfoByAssetId(
  qPars: {
    ASSET_ID: number,
    CAPACITY_POWER?: number,
    CAPACITY_UNIT?: string,
    MACHINE_KW?: number,
    MACHINE_ID?: number,
    EQUIPMENT_POWER?: string,
    COMPRESSOR_NOMINAL_CURRENT?: number,
    EVAPORATOR_MODEL_ID?: number,
    TYPE_CFG?: string,
    APPL_CFG?: string,
    HEAT_EXCHANGER_ID?: number,
  }, operationLogData: OperationLogData
) {
  const fields: string[] = []
  if (qPars.CAPACITY_POWER !== undefined) { fields.push('CAPACITY_POWER = :CAPACITY_POWER') }
  if (qPars.CAPACITY_UNIT !== undefined) { fields.push('CAPACITY_UNIT = :CAPACITY_UNIT') }
  if (qPars.MACHINE_KW !== undefined) { fields.push('MACHINE_KW = :MACHINE_KW') }
  if (qPars.MACHINE_ID !== undefined) { fields.push('MACHINE_ID = :MACHINE_ID') }
  if (qPars.EQUIPMENT_POWER !== undefined) { fields.push('EQUIPMENT_POWER = :EQUIPMENT_POWER') }
  if (qPars.COMPRESSOR_NOMINAL_CURRENT !== undefined) { fields.push('COMPRESSOR_NOMINAL_CURRENT = :COMPRESSOR_NOMINAL_CURRENT') }
  if (qPars.EVAPORATOR_MODEL_ID !== undefined) { fields.push('EVAPORATOR_MODEL_ID = :EVAPORATOR_MODEL_ID') }
  if (qPars.TYPE_CFG !== undefined) { fields.push('TYPE_CFG = :TYPE_CFG') }
  if (qPars.APPL_CFG !== undefined) { fields.push('APPL_CFG = :APPL_CFG') }
  if (qPars.HEAT_EXCHANGER_ID !== undefined) { fields.push('HEAT_EXCHANGER_ID = :HEAT_EXCHANGER_ID') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE ASSET_HEAT_EXCHANGERS SET ${fields.join(', ')} WHERE ASSET_ID = :ASSET_ID`

  if (operationLogData) {
      await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
      dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_delete(qPars: { ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM ASSET_HEAT_EXCHANGERS WHERE ASSET_HEAT_EXCHANGERS.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE
      ASSET_HEAT_EXCHANGERS
    FROM
      ASSET_HEAT_EXCHANGERS
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGERS.ASSET_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE
      CLUNITS.UNIT_ID = :UNIT_ID
  `

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_removeAssetsFromClient(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const sentence = `
    DELETE
      ASSET_HEAT_EXCHANGERS
    FROM
      ASSET_HEAT_EXCHANGERS
      INNER JOIN ASSETS ON (ASSETS.ID = ASSET_HEAT_EXCHANGERS.ASSET_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = ASSETS.UNIT_ID)
    WHERE CLUNITS.CLIENT_ID = :CLIENT_ID
  `

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getAssetHeatExchangerByAssetId(qPars: { ASSET_ID: number }) {
  const sentence = `
    SELECT
      ASSET_HEAT_EXCHANGERS.ID AS ASSET_HEAT_EXCHANGER_ID
    FROM 
      ASSET_HEAT_EXCHANGERS
    WHERE ASSET_HEAT_EXCHANGERS.ASSET_ID = :ASSET_ID
  `

  return sqldb.querySingle<{
    ASSET_HEAT_EXCHANGER_ID: number
  }>(sentence, qPars)
}

export async function w_deleteByAssetId(qPars: { ASSET_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE ASSET_HEAT_EXCHANGERS FROM ASSET_HEAT_EXCHANGERS WHERE ASSET_HEAT_EXCHANGERS.ASSET_ID = :ASSET_ID`;

  if (operationLogData) {
    await saveOperationLog('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
    dbLogger('ASSET_HEAT_EXCHANGERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

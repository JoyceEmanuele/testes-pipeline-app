import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

export function getListBasic (qPars: { clientIds?: number[], unitIds?: number[], devIds?: string[] }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DRI_ID,
      DRIS_DEVICES.VARSCFG,
      DEVICES_DUT.DEVICE_CODE AS DUT_ID,
      CLUNITS.TIMEZONE_ID,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_START,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_END,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_INT_TIME,
      CURRENT_AUTOMATIONS_PARAMETERS.DAT_BEGAUT,
      CURRENT_AUTOMATIONS_PARAMETERS.AUTOMATION_INTERVAL,
      DEVFWVERS.CURRFW_VERS AS CURRFW_VERS
  `
  sentence += `
    FROM
      DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS. CURRENT_AUTOMATION_PARAMETERS_ID)
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN DEVICES DEVICES_DUT ON (DEVICES_DUT.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)
  `

  const conditions: string[] = []
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.devIds) { conditions.push(`DEVICES.DEVICE_CODE IN (:devIds)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DRI_ID: string
    VARSCFG: string
    DUT_ID: string
    TIMEZONE_ID: number
    ENABLE_ECO: number
    ECO_CFG: string
    ECO_OFST_START: number
    ECO_OFST_END: number
    ECO_INT_TIME: number
    DAT_BEGAUT: string
    CURRFW_VERS: string
    AUTOMATION_INTERVAL: number
  }>(sentence, qPars)
}

export function getList (qPars: { driId?: string, clientIds?: number[], stateIds?: string[], cityIds?: string[], unitIds?: number[], INCLUDE_INSTALLATION_UNIT?: boolean }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DRI_ID,
      DRIS_DEVICES.VARSCFG,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID,
      CLIENTS.NAME AS CLIENT_NAME
  `
  sentence += `
    FROM
      DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.driId) { conditions.push(`DEVICES.DEVICE_CODE = :driId`) }
  if (qPars.clientIds) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.unitIds) { conditions.push(`DEVICES_UNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DRI_ID: string
    VARSCFG: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    CLIENT_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

export function getExtraInfo (qPars: { driId: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DRI_ID,
      DEVICES.ID AS DEVICE_ID,
      DRIS_DEVICES.SYSTEM_NAME,
      DRIS_DEVICES.VARSCFG,
      DRIS_DEVICES.CARDSCFG,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_START,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_END,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_INT_TIME,
      CURRENT_AUTOMATIONS_PARAMETERS.AUTOMATION_INTERVAL,
      DEVICES_DUT.DEVICE_CODE AS DUT_ID,
      CURRENT_AUTOMATIONS_PARAMETERS.DAT_BEGAUT,
      DEVICES.BT_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.CITY_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      ENVIRONMENTS.ENVIRONMENT_NAME AS ROOM_NAME,
      CHILLER_CARRIER_LINES.LINE_NAME AS CHILLER_LINE_NAME,
      CHILLER_CARRIER_MODELS.MODEL_NAME AS CHILLER_MODEL_NAME,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET

  `
  sentence += `
  FROM
    DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN DRIS_CHILLERS ON (DRIS_CHILLERS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN CHILLERS ON (CHILLERS.ID = DRIS_CHILLERS.CHILLER_ID)
      LEFT JOIN CHILLER_CARRIER_MODELS ON (CHILLER_CARRIER_MODELS.ID = CHILLERS.CHILLER_CARRIER_MODEL_ID)
      LEFT JOIN CHILLER_CARRIER_LINES ON (CHILLER_CARRIER_LINES.ID = CHILLER_CARRIER_MODELS.CHILLER_CARRIER_LINE_ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS. CURRENT_AUTOMATION_PARAMETERS_ID)
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN DEVICES DEVICES_DUT ON (DEVICES_DUT.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN ENVIRONMENTS ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :driId `

  return sqldb.querySingle<{
    DRI_ID: string
    DEVICE_ID: number
    SYSTEM_NAME: string
    VARSCFG: string
    CARDSCFG: string
    ENABLE_ECO: number
    ECO_CFG: string
    ECO_OFST_START: number
    ECO_OFST_END: number
    ECO_INT_TIME: number
    DUT_ID: string
    ROOM_NAME: string
    DAT_BEGAUT: string
    BT_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    CHILLER_LINE_NAME: string
    CHILLER_MODEL_NAME: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
    AUTOMATION_INTERVAL: number
  }>(sentence, qPars)
}

export function getBasicInfo (qPars: { driId: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DRI_ID,
      DEVICES.ID AS DEVICE_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID,
      DRIS_DEVICES.VARSCFG,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO,
      CURRENT_AUTOMATIONS_PARAMETERS.DAT_BEGAUT,
      CURRENT_AUTOMATIONS_PARAMETERS.AUTOMATION_INTERVAL,
      DRIS_DEVICES.ID AS DRI_DEVICE_ID
  `
  sentence += `
    FROM
      DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS. CURRENT_AUTOMATION_PARAMETERS_ID)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :driId `

  return sqldb.querySingle<{
    DRI_ID: string
    DEVICE_ID: number
    CLIENT_ID: number
    UNIT_ID: number
    VARSCFG: string
    ENABLE_ECO: number
    DAT_BEGAUT: string
    DRI_DEVICE_ID: number
    AUTOMATION_INTERVAL: number
  }>(sentence, qPars)
}

export async function w_updateInfo (qPars: {
  DRI_ID: string,
  SYSTEM_NAME?: string,
  VARSCFG?: string,
  CARDSCFG?: string
  DUT_ID?: string
  ENABLE_ECO?: number
  ECO_CFG?: string
  ECO_OFST_START?: number
  ECO_OFST_END?: number
  ECO_INT_TIME?: number
  DAT_BEGAUT?: string
  AUTOMATION_INTERVAL?: number
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if(qPars.SYSTEM_NAME !== undefined) { fields.push('SYSTEM_NAME = :SYSTEM_NAME') }
  if (qPars.VARSCFG !== undefined) { fields.push('VARSCFG = :VARSCFG') }
  if (qPars.CARDSCFG !== undefined) { fields.push('CARDSCFG = :CARDSCFG') }
  if (qPars.DUT_ID !== undefined) { fields.push('DUT_ID = :DUT_ID') }
  if (qPars.ENABLE_ECO !== undefined) { fields.push('ENABLE_ECO = :ENABLE_ECO') }
  if (qPars.ECO_CFG !== undefined) { fields.push('ECO_CFG = :ECO_CFG') }
  if (qPars.ECO_OFST_START !== undefined) { fields.push('ECO_OFST_START = :ECO_OFST_START') }
  if (qPars.ECO_OFST_END !== undefined) { fields.push('ECO_OFST_END = :ECO_OFST_END') }
  if (qPars.ECO_INT_TIME != undefined) { fields.push('ECO_INT_TIME = :ECO_INT_TIME') }
  if (qPars.DAT_BEGAUT !== undefined) { fields.push('DAT_BEGAUT = :DAT_BEGAUT') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DRIS SET ${fields.join(', ')} WHERE DRI_ID = :DRI_ID`

  if (operationLogData) {
    await saveOperationLog('DRIS', sentence, qPars, operationLogData);
    dbLogger('DRIS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getAssocInfo (qPars: { driId: string }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DRI_ID,
      DRIS_DEVICES.VARSCFG,
      DEVICES_DUT.DEVICE_CODE AS DUT_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      VAVS.RTYPE_ID AS VAV_RTYPE,
      FANCOILS.THERM_T_MIN,
      FANCOILS.THERM_T_MAX,
      ENVIRONMENTS_ROOM_TYPES.RTYPE_ID AS DUT_RTYPE,
      ROOMTYPES.USEPERIOD,
      ROOMTYPES.TUSEMAX,
      ROOMTYPES.TUSEMIN
  `
  sentence += `
    FROM      
      DRIS_DEVICES
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS. CURRENT_AUTOMATION_PARAMETERS_ID)
      LEFT JOIN DUTS_REFERENCE ON (DUTS_REFERENCE.MACHINE_ID = DRIS_AUTOMATIONS.MACHINE_ID)
      LEFT JOIN DUTS_MONITORING ON (DUTS_MONITORING.ID = DUTS_REFERENCE.DUT_MONITORING_ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
      LEFT JOIN DEVICES DEVICES_DUT ON (DEVICES_DUT.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN ENVIRONMENTS ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
      LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
      LEFT JOIN VAVS ON (VAVS.VAV_ID = DEVICES.DEVICE_CODE)
      LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = COALESCE(ENVIRONMENTS_ROOM_TYPES.RTYPE_ID, VAVS.RTYPE_ID))
      LEFT JOIN FANCOILS ON (DEVICES.DEVICE_CODE = FANCOILS.FANCOIL_ID)
  `

  sentence += ` WHERE DEVICES.DEVICE_CODE = :driId `

  return sqldb.querySingle<{
    DRI_ID: string
    VARSCFG: string
    DUT_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    VAV_RTYPE: number
    DUT_RTYPE: number
    USEPERIOD: string
    TUSEMAX: number
    TUSEMIN: number
    THERM_T_MIN: number
    THERM_T_MAX: number
  }>(sentence, qPars)
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM UNIT_ID: {CLUNITS.UNIT_ID}
  FROM CLUNITS
  WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteRow (qPars: { UNIT_ID: number }, delChecks: {
  ASSOCIATIONS: true,
  CLIENT_ASSETS: true,
  DEVGROUPS: true,
  DEVS: true,
  INTEGRCOOLAUT: true,
  LAAGER: true,
  INTEGRNESS: true,
  INTEGROXYN: true,
  ROOMS: true,
  SIMCARDS: true,
  UNITCLASSES: true,
  UNITSUPERVISORS: true,
  VISITATECNICA: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CLUNITS WHERE CLUNITS.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('CLUNITS', sentence, qPars, operationLogData);
    dbLogger('CLUNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM CLUNITS
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  ASSOCIATIONS: true,
  CLIENT_ASSETS: true,
  DEVGROUPS: true,
  DEVS: true,
  INTEGRCOOLAUT: true,
  LAAGER: true,
  INTEGRNESS: true,
  INTEGROXYN: true,
  ROOMS: true,
  SIMCARDS: true,
  UNITCLASSES: true,
  UNITSUPERVISORS: true,
  VISITATECNICA: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM CLUNITS WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('CLUNITS', sentence, qPars, operationLogData);
    dbLogger('CLUNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
FROM CLUNITS

FIELD CLUNITS.CLIENT_ID
FIELD CLUNITS.UNIT_NAME
FIELD [[IFOWNPROP {:LAT}]] CLUNITS.LAT
FIELD [[IFOWNPROP {:LON}]] CLUNITS.LON
FIELD [[IFOWNPROP {:CITY_ID}]] CLUNITS.CITY_ID
FIELD [[IFOWNPROP {:EXTRA_DATA}]] CLUNITS.EXTRA_DATA
*/
export async function w_insert (qPars: {
  CLIENT_ID: number,
  UNIT_NAME: string,
  TIMEZONE_ID: number,
  LAT?: string,
  LON?: string,
  CITY_ID?: string,
  EXTRA_DATA?: string,
  ADDRESS?: string,
  PRODUCTION?: boolean,
  PRODUCTION_TIMESTAMP?: Date
  AMOUNT_PEOPLE?: number
  CONSTRUCTED_AREA?: number
  UNIT_CODE_CELSIUS?: string
  UNIT_CODE_API?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLIENT_ID')
  fields.push('UNIT_NAME')
  fields.push('TIMEZONE_ID')
  if (qPars.UNIT_CODE_CELSIUS !== undefined) { fields.push('UNIT_CODE_CELSIUS') }
  if (qPars.UNIT_CODE_API !== undefined) { fields.push('UNIT_CODE_API') }
  if (qPars.LAT !== undefined) { fields.push('LAT') }
  if (qPars.LON !== undefined) { fields.push('LON') }
  if (qPars.CITY_ID !== undefined) { fields.push('CITY_ID') }
  if (qPars.EXTRA_DATA !== undefined) { fields.push('EXTRA_DATA') }
  if (qPars.ADDRESS !== undefined) { fields.push('ADDRESS') }
  if (qPars.PRODUCTION !== undefined) { fields.push('PRODUCTION') }
  if (qPars.PRODUCTION_TIMESTAMP !== undefined) { fields.push('PRODUCTION_TIMESTAMP') }
  if (qPars.AMOUNT_PEOPLE !== undefined) { fields.push('AMOUNT_PEOPLE') }
  if (qPars.CONSTRUCTED_AREA !== undefined) { fields.push('CONSTRUCTED_AREA')}

  const sentence = `INSERT INTO CLUNITS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CLUNITS', sentence, qPars, operationLogData);
    dbLogger('CLUNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC update = UPDATE
  PARAM UNIT_ID: {CLUNITS.UNIT_ID}

  FROM CLUNITS

  FIELD [[IFOWNPROP {:UNIT_NAME}]] CLUNITS.UNIT_NAME
  FIELD [[IFOWNPROP {:CITY_ID}]] CLUNITS.CITY_ID
  FIELD [[IFOWNPROP {:LAT}]] CLUNITS.LAT
  FIELD [[IFOWNPROP {:LON}]] CLUNITS.LON
  FIELD [[IFOWNPROP {:DISABREP}]] CLUNITS.DISABREP
  FIELD [[IFOWNPROP {:TARIFA_KWH}]] CLUNITS.TARIFA_KWH
  FIELD [[IFOWNPROP {:EXTRA_DATA}]] CLUNITS.EXTRA_DATA
  FIELD [[IFOWNPROP {:GA_METER}]] CLUNITS.GA_METER
  FIELD [[IFOWNPROP {:TARIFA_DIEL}]] CLUNITS.TARIFA_DIEL
  FIELD [[IFOWNPROP {:ADDRESS}]] CLUNITS.ADDRESS
*/
export async function w_update (qPars: {
  UNIT_ID: number,
  UNIT_CODE_CELSIUS?: string,
  UNIT_CODE_API?: string,
  RATE_MODEL_ID?: number,
  UNIT_NAME?: string,
  CITY_ID?: string,
  LAT?: string,
  LON?: string,
  DISABREP?: number,
  TARIFA_KWH?: number,
  EXTRA_DATA?: string,
  GA_METER?: number,
  TARIFA_DIEL?: number,
  PRODUCTION?: boolean,
  PRODUCTION_TIMESTAMP?: Date
  TIMEZONE_ID?: number
  ADDRESS?: string
  AMOUNT_PEOPLE?: number
  CONSTRUCTED_AREA?: number,
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.UNIT_CODE_CELSIUS !== undefined) { fields.push('UNIT_CODE_CELSIUS = :UNIT_CODE_CELSIUS') }
  if (qPars.UNIT_CODE_API !== undefined) { fields.push('UNIT_CODE_API = :UNIT_CODE_API') }
  if (qPars.RATE_MODEL_ID !== undefined) { fields.push('RATE_MODEL_ID = :RATE_MODEL_ID') }
  if (qPars.UNIT_NAME !== undefined) { fields.push('UNIT_NAME = :UNIT_NAME') }
  if (qPars.CITY_ID !== undefined) { fields.push('CITY_ID = :CITY_ID') }
  if (qPars.LAT !== undefined) { fields.push('LAT = :LAT') }
  if (qPars.LON !== undefined) { fields.push('LON = :LON') }
  if (qPars.DISABREP !== undefined) { fields.push('DISABREP = :DISABREP') }
  if (qPars.TARIFA_KWH !== undefined) { fields.push('TARIFA_KWH = :TARIFA_KWH') }
  if (qPars.EXTRA_DATA !== undefined) { fields.push('EXTRA_DATA = :EXTRA_DATA') }
  if (qPars.GA_METER !== undefined) { fields.push('GA_METER = :GA_METER') }
  if (qPars.TARIFA_DIEL !== undefined) { fields.push('TARIFA_DIEL = :TARIFA_DIEL') }
  if (qPars.TIMEZONE_ID !== undefined) { fields.push('TIMEZONE_ID = :TIMEZONE_ID')}
  if (qPars.ADDRESS !== undefined) { fields.push('ADDRESS = :ADDRESS') }
  if (qPars.PRODUCTION !== undefined) { fields.push('PRODUCTION = :PRODUCTION') }
  if (qPars.PRODUCTION_TIMESTAMP !== undefined) { fields.push('PRODUCTION_TIMESTAMP = :PRODUCTION_TIMESTAMP') }
  if (qPars.AMOUNT_PEOPLE !== undefined) { fields.push('AMOUNT_PEOPLE = :AMOUNT_PEOPLE') }
  if (qPars.CONSTRUCTED_AREA !== undefined) { fields.push('CONSTRUCTED_AREA = :CONSTRUCTED_AREA') }

  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE CLUNITS SET ${fields.join(', ')} WHERE UNIT_ID = :UNIT_ID`

  if (operationLogData) {
    await saveOperationLog('CLUNITS', sentence, qPars, operationLogData);
    dbLogger('CLUNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitsList = SELECT LIST
  PARAM UNIT_IDS?: {CLUNITS.UNIT_ID}[]
  PARAM CLIENT_IDS?: {CLUNITS.CLIENT_ID}[]

  FROM CLUNITS
  LEFT JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.UNIT_CODE_CELSIUS
  SELECT CLUNITS.UNIT_CODE_API
  SELECT CLUNITS.LAT
  SELECT CLUNITS.LON
  SELECT CLUNITS.CITY_ID
  SELECT CLUNITS.TARIFA_KWH
  SELECT CLUNITS.DISABREP
  SELECT CLUNITS.ADDRESS
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID
  SELECT ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID,
  SELECT ACCESS_DISTRIBUTORS.CONSUMER_UNIT,
  SELECT ACCESS_DISTRIBUTORS.LOGIN,
  SELECT ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
  SELECT DISTRIBUTORS.DISTRIBUTOR_LABEL,
  SELECT BASELINES.BASELINE_ID,
  SELECT CLIENTS.NAME as CLIENT_NAME,

  WHERE [[IFJS qPars.CLIENT_IDS != null]] {CLUNITS.CLIENT_ID} IN ({:CLIENT_IDS})
  WHERE [[IFJS qPars.UNIT_IDS != null]] {CLUNITS.UNIT_ID} IN ({:UNIT_IDS})
*/
export function getUnitsList (qPars: { UNIT_IDS?: number[], CLIENT_IDS?: number[], INCLUDE_INSTALLATION_UNIT?: boolean}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API,
      CLUNITS.LAT,
      CLUNITS.LON,
      CLUNITS.CITY_ID,
      CLUNITS.TARIFA_KWH,
      CLUNITS.DISABREP,
      CLUNITS.ADDRESS,
      CLUNITS.PRODUCTION,
      CLUNITS.PRODUCTION_TIMESTAMP,
      CLUNITS.AMOUNT_PEOPLE,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      STATEREGION.FULL_NAME AS STATE_NAME,
      COUNTRY.NAME AS COUNTRY_NAME,
      ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID,
      ACCESS_DISTRIBUTORS.ADDITIONAL_DISTRIBUTOR_INFO,
      ACCESS_DISTRIBUTORS.CONSUMER_UNIT,
      ACCESS_DISTRIBUTORS.LOGIN,
      ACCESS_DISTRIBUTORS.LOGIN_EXTRA,
      DISTRIBUTORS.DISTRIBUTOR_LABEL,
      BASELINES.BASELINE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET,
      u.USER_ID AS SUPERVISOR_ID,
      d.NOME AS SUPERVISOR_NAME,
      d.SOBRENOME AS SUPERVISOR_SOBRENOME,
      CLUNITS.RATE_MODEL_ID,
      RATE_MODELS.MODEL_NAME,
      CLUNITS.CONSTRUCTED_AREA
  `
  sentence += `
    FROM
      CLUNITS
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN RATE_MODELS ON (RATE_MODELS.MODEL_ID = CLUNITS.RATE_MODEL_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
      LEFT JOIN ACCESS_DISTRIBUTORS ON (ACCESS_DISTRIBUTORS.UNIT_ID = CLUNITS.UNIT_ID)
      LEFT JOIN DISTRIBUTORS ON (DISTRIBUTORS.DISTRIBUTOR_ID = ACCESS_DISTRIBUTORS.DISTRIBUTOR_ID)
      LEFT JOIN BASELINES ON (BASELINES.UNIT_ID = ACCESS_DISTRIBUTORS.UNIT_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN UNITSUPERVISORS u ON (u.UNIT_ID = CLUNITS.UNIT_ID)
      LEFT JOIN DASHUSERS d ON (u.USER_ID = d.EMAIL)
  `

  const conditions: string[] = []
  if (qPars.CLIENT_IDS != null) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  if (qPars.UNIT_IDS != null) { conditions.push(`CLUNITS.UNIT_ID IN (:UNIT_IDS)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS: string
    UNIT_CODE_API: string
    LAT: string
    LON: string
    CITY_ID: string
    TARIFA_KWH: number
    PRODUCTION: boolean
    PRODUCTION_TIMESTAMP: string
    AMOUNT_PEOPLE: number
    DISABREP: number
    ADDRESS: string
    CLIENT_NAME: string
    MODEL_NAME: string
    RATE_MODEL_ID: number,
    CITY_NAME: string
    STATE_ID: string
    STATE_NAME: string
    COUNTRY_NAME: string
    DISTRIBUTOR_ID: string
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    BASELINE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_ID: number
    TIMEZONE_OFFSET: number
    SUPERVISOR_ID: string
    SUPERVISOR_NAME: string
    SUPERVISOR_SOBRENOME: string
    CONSTRUCTED_AREA: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitsList2 = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM unitIds?: {CLUNITS.UNIT_ID}[]
  PARAM cityIds?: {CLUNITS.CITY_ID}[]
  PARAM stateIds?: {CITY.STATE_ID}[]
  PARAM excludeClient?: {CLUNITS.CLIENT_ID}
  PARAM+ onlyWithGA?: boolean

  FROM CLUNITS
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.UNIT_CODE_CELSIUS
  SELECT CLUNITS.UNIT_CODE_API
  SELECT CLUNITS.GA_METER
  SELECT CLUNITS.TARIFA_KWH
  SELECT CLUNITS.TARIFA_DIEL
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE [[IFJS {:excludeClient}]] {CLUNITS.CLIENT_ID} <> {:excludeClient}
  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {CLUNITS.UNIT_ID} IN ({:unitIds})
  WHERE [[IFJS {:cityIds}]] {CLUNITS.CITY_ID} IN ({:cityIds})
  WHERE [[IFJS {:stateIds}]] {CITY.STATE_ID} IN ({:stateIds})
  WHERE [[IFJS {::onlyWithGA}]] ({CLUNITS.GA_METER} IS NOT NULL)
*/
export function getUnitsList2 (qPars: {
  clientIds?: number[],
  unitIds?: number[],
  cityIds?: string[],
  stateIds?: string[],
  excludeClient?: number,
  INCLUDE_INSTALLATION_UNIT?: boolean
}, admPars: {
  onlyWithGA?: boolean
}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API,
      CLUNITS.GA_METER,
      CLUNITS.TARIFA_KWH,
      CLUNITS.TARIFA_DIEL,
      CLUNITS.STATUS_GA,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      CITY.CITY_ID AS CITY_ID,
      STATEREGION.NAME AS STATE_NAME,
      STATEREGION.ID AS STATE_ID,
      COUNTRY.NAME AS COUNTRY_NAME
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
  `

  const conditions: string[] = []
  if (qPars.excludeClient) { conditions.push(`CLUNITS.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (admPars.onlyWithGA) { conditions.push(`(CLUNITS.GA_METER IS NOT NULL)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS: string
    UNIT_CODE_API: string
    GA_METER: number
    TARIFA_KWH: number
    TARIFA_DIEL: number
    STATUS_GA: number
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    COUNTRY_NAME: string
    STATE_NAME: string
    STATE_ID: number
    CITY_ID: string
  }>(sentence, qPars)
}

/*
/* @IFHELPER:FUNC getUnitsListWithEnergyDevice = SELECT LIST
  FROM ENERGY_DEVICES_INFO
  INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICE_ID = ENERGY_DEVICES_INFO.ID)
  INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
  INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
  INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)
  INNER JOIN CLUNITS on (ELECTRIC_CIRCUITS.UNIT_ID = CLUNITS.UNIT_ID)

  SELECT DEVICES.DEVICE_CODE AS ENERGY_DEVICE_ID
  SELECT ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME
  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
 
  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
*/
export function getUnitsListWithEnergyDevice(
  qPars: { clientIds?: number[], INCLUDE_INSTALLATION_UNIT?: boolean }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS ENERGY_DEVICE_ID,
      ELECTRIC_CIRCUITS.ESTABLISHMENT_NAME,
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME
  `
  sentence += `
    FROM
      ENERGY_DEVICES_INFO
      INNER JOIN DRIS_ENERGY_DEVICES ON (DRIS_ENERGY_DEVICES.ENERGY_DEVICES_INFO_ID = ENERGY_DEVICES_INFO.ID)
      INNER JOIN DRIS_DEVICES ON (DRIS_DEVICES.ID = DRIS_ENERGY_DEVICES.DRI_DEVICE_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DRIS_DEVICES.DEVICE_ID)
      INNER JOIN ELECTRIC_CIRCUITS ON (ELECTRIC_CIRCUITS.ID = ENERGY_DEVICES_INFO.ELECTRIC_CIRCUIT_ID)
      INNER JOIN CLUNITS on (ELECTRIC_CIRCUITS.UNIT_ID = CLUNITS.UNIT_ID)
  `

  const conditions: string[] = []

  if (qPars.clientIds) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`)}
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    ENERGY_DEVICE_ID: string,
    ESTABLISHMENT_NAME: string,
    UNIT_ID: number
    UNIT_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitWithGA = SELECT ROW
  PARAM GA_METER: {CLUNITS.GA_METER}

  FROM CLUNITS
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.GA_METER
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID

  WHERE {CLUNITS.GA_METER} = {:GA_METER}
*/
export function getUnitWithGA (qPars: { GA_METER: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.GA_METER,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      CLUNITS
      LEFT JOIN TIME_ZONES ON (CLUNITS.TIMEZONE_ID = TIME_ZONES.ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.GA_METER :GA_METER`);
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    UNIT_ID: number
    UNIT_NAME: string
    GA_METER: number
    CLIENT_NAME: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_ID: string
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitInfo = SELECT ROW
  PARAM UNIT_ID: number
  PARAM CLIENT_ID?: number

  FROM CLUNITS
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.CLIENT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.LAT
  SELECT CLUNITS.LON
  SELECT CLUNITS.DISABREP
  SELECT CLUNITS.CITY_ID
  SELECT CLUNITS.ADDRESS
  SELECT CITY.NAME AS CITY_NAME
  SELECT CITY.STATE_ID
  SELECT CLUNITS.TARIFA_KWH
  SELECT CLUNITS.EXTRA_DATA
  SELECT CLUNITS.GA_METER
  SELECT CLUNITS.TARIFA_DIEL: 0|1

  WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
  WHERE [[IFJS qPars.CLIENT_ID != null]] {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export function getUnitInfo (qPars: { UNIT_ID: number, CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API,
      CLUNITS.LAT,
      CLUNITS.LON,
      CLUNITS.DISABREP,
      CLUNITS.CITY_ID,
      CLUNITS.ADDRESS,
      CLUNITS.PRODUCTION,
      CLUNITS.PRODUCTION_TIMESTAMP,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      CLUNITS.TARIFA_KWH,
      CLUNITS.EXTRA_DATA,
      CLUNITS.GA_METER,
      CLUNITS.TARIFA_DIEL,
      CLUNITS.AMOUNT_PEOPLE,
      BASELINES.BASELINE_ID,
      CLIENTS.NAME as CLIENT_NAME,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.ID AS TIMEZONE_ID,
      TIME_ZONES.TIME_ZONE_OFFSET AS TIMEZONE_OFFSET,
      COUNTRY.NAME AS COUNTRY_NAME,
      CLUNITS.CONSTRUCTED_AREA
  `
  sentence += `
    FROM
      CLUNITS
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      LEFT JOIN BASELINES ON (BASELINES.UNIT_ID = CLUNITS.UNIT_ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.UNIT_ID = :UNIT_ID`)
  if (qPars.CLIENT_ID != null) { conditions.push(`CLUNITS.CLIENT_ID = :CLIENT_ID`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS: string
    UNIT_CODE_API: string
    LAT: string
    LON: string
    DISABREP: number
    CITY_ID: string
    ADDRESS: string
    PRODUCTION: boolean
    PRODUCTION_TIMESTAMP: string
    CITY_NAME: string
    STATE_ID: string
    TARIFA_KWH: number
    EXTRA_DATA: string
    GA_METER: number
    TARIFA_DIEL: 0|1
    AMOUNT_PEOPLE: number
    BASELINE_ID: number
    CLIENT_NAME: string
    TIMEZONE_AREA: string
    TIMEZONE_ID: number
    TIMEZONE_OFFSET: number
    COUNTRY_NAME: string
    CONSTRUCTED_AREA: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitInfoWithMeter = SELECT ROW
  PARAM UNIT_ID: {CLUNITS.UNIT_ID}
  PARAM CLIENT_ID?: {CLUNITS.CLIENT_ID}

  FROM CLUNITS

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.CLIENT_ID
  SELECT CLUNITS.GA_METER

  WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
  WHERE [[IFJS qPars.CLIENT_ID != null]] {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export function getUnitInfoWithMeter (qPars: { UNIT_ID: number, CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.GA_METER
  `
  sentence += `
    FROM
      CLUNITS
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.UNIT_ID = :UNIT_ID`)
  if (qPars.CLIENT_ID != null) { conditions.push(`CLUNITS.CLIENT_ID = :CLIENT_ID`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    UNIT_ID: number
    CLIENT_ID: number
    GA_METER: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitBasicInfo = SELECT ROW
  PARAM UNIT_ID: {CLUNITS.UNIT_ID}
  PARAM CLIENT_ID?: {CLUNITS.CLIENT_ID}

  FROM CLUNITS

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.CLIENT_ID

  WHERE {CLUNITS.UNIT_ID} = {:UNIT_ID}
  WHERE [[IFJS qPars.CLIENT_ID != null]] {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export function getUnitBasicInfo (qPars: { UNIT_ID: number, CLIENT_ID?: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.CLIENT_ID,
      CLUNITS.PRODUCTION,
      CLUNITS.PRODUCTION_TIMESTAMP,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET as TIMEZONE_OFFSET
  `
  sentence += `
    FROM
      CLUNITS
    LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.UNIT_ID = :UNIT_ID`)
  if (qPars.CLIENT_ID != null) { conditions.push(`CLUNITS.CLIENT_ID = :CLIENT_ID`) }

  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    UNIT_ID: number
    CLIENT_ID: number
    PRODUCTION: number
    TIMEZONE_AREA: string
    TIMEZONE_OFFSET: number
    PRODUCTION_TIMESTAMP?: string
  }>(sentence, qPars)
}

export function getTimezoneByUnit (qPars: { UNIT_ID: number}) {
  let sentence = `
    SELECT
      CLUNITS.TIMEZONE_ID,
      TIME_ZONES.AREA AS TIMEZONE_AREA,
      TIME_ZONES.TIME_ZONE_OFFSET as TIMEZONE_OFFSET
    FROM
      CLUNITS
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)

    WHERE CLUNITS.UNIT_ID = :UNIT_ID
  `

  return sqldb.querySingle<{
    TIMEZONE_ID: number
    TIMEZONE_AREA: string,
    TIMEZONE_OFFSET: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC listRequiredReports = SELECT LIST
  PARAM clientId: {CLUNITS.CLIENT_ID}

  FROM CLUNITS
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  INNER JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.STATE_ID
  SELECT CITY.NAME AS CITY_NAME

  WHERE {CLUNITS.CLIENT_ID} = {:clientId}
  WHERE {CLUNITS.CITY_ID} IS NOT NULL
  WHERE ({CLUNITS.DISABREP} IS NULL OR {CLUNITS.DISABREP} <> 1)
*/
export function listRequiredReports (qPars: { clientId: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.CLIENT_ID = :clientId`)
  conditions.push(`CLUNITS.CITY_ID IS NOT NULL`)
  conditions.push(`(CLUNITS.DISABREP IS NULL OR CLUNITS.DISABREP <> 1)`)
  conditions.push(`CLUNITS.PRODUCTION = 1`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
    CLIENT_ID: number
    STATE_ID: string
    CITY_NAME: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitsAndMeters = SELECT LIST
  FROM CLUNITS
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.GA_METER
  SELECT CLUNITS.TARIFA_DIEL: 0|1
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLIENTS.CLIENT_ID

  WHERE {CLIENTS.ENABLED} = '1'
*/
export function getUnitsAndMeters () {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.GA_METER,
      CLUNITS.TARIFA_DIEL,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.CLIENT_ID
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  `

  sentence += ` WHERE CLIENTS.ENABLED = '1' `

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    GA_METER: number
    TARIFA_DIEL: 0|1
    CLIENT_NAME: string
    CLIENT_ID: number
  }>(sentence)
}


export function getUnitReportInfo (qPars: { unitId: number, clientId: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.TARIFA_KWH,
      CLUNITS.GA_METER,
      CLIENTS.NAME AS CLIENT_NAME,
      CLIENTS.ENABLED AS CLIENT_STATUS,
      CLIENTS.CLIENT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      INNER JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  conditions.push(`CLUNITS.UNIT_ID = :unitId`)
  conditions.push(`CLIENTS.ENABLED = '1'`)
  conditions.push(`CLUNITS.CLIENT_ID = :clientId`)
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    UNIT_ID: number
    UNIT_NAME: string
    TARIFA_KWH: number
    GA_METER: number
    CLIENT_NAME: string
    CLIENT_STATUS: string
    CLIENT_ID: number
    CITY_NAME: string
    STATE_ID: string
  }>(sentence, qPars)
}

export function getHealthReportInfo (qPars: { clientId?: number, unitId?: number }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DAC_ID,
      ASSETS_HEALTH_HIST.H_INDEX,
      ASSETS_HEALTH_HIST.H_DESC,
      P_CAUSES.CAUSES AS P_CAUSES,
      MACHINES.APPLICATION AS MACHINE_APPLICATION,
      CASE WHEN DACS_DEVICES.DATE_COMIS IS NOT NULL THEN '1' ELSE '0' END AS DAC_COMIS,
      MACHINES.ID AS MACHINE_ID,
      CASE
        WHEN CONDENSERS.ASSET_ID IS NOT NULL THEN ASSETS.NAME
        ELSE NULL
      END AS DAC_NAME,
      CASE
        WHEN CONDENSERS.MACHINE_KW IS NOT NULL THEN CONDENSERS.MACHINE_KW
        WHEN EVAPORATORS.MACHINE_KW IS NOT NULL THEN EVAPORATORS.MACHINE_KW
        ELSE NULL
      END AS MACHINE_KW,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID,
      MACHINES.NAME AS MACHINE_NAME,
      DEVICES_CLIENTS.CLIENT_ID,
      DEVICES_UNITS.UNIT_ID
  `
  sentence += `
      FROM
      CLUNITS
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
      INNER JOIN DEVICES ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DUTS_DUO ON (DUTS_DUO.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DUTS_DUO_CONDENSERS ON (DUTS_DUO_CONDENSERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_DUO_EVAPORATORS ON (DUTS_DUO_EVAPORATORS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN DUTS_DUO_ASSET_HEAT_EXCHANGERS ON (DUTS_DUO_ASSET_HEAT_EXCHANGERS.DUT_DUO_ID = DUTS_DUO.ID)
      LEFT JOIN CONDENSERS ON CONDENSERS.ID=COALESCE(DACS_CONDENSERS.CONDENSER_ID, DUTS_DUO_CONDENSERS.CONDENSER_ID)
      LEFT JOIN EVAPORATORS ON EVAPORATORS.ID=COALESCE(DACS_EVAPORATORS.EVAPORATOR_ID, DUTS_DUO_EVAPORATORS.EVAPORATOR_ID)
      LEFT JOIN ASSET_HEAT_EXCHANGERS ON ASSET_HEAT_EXCHANGERS.ID=COALESCE(DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID, DUTS_DUO_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
      INNER JOIN MACHINES ON MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID)
      LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID))
      LEFT JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ASSET_ID = ASSETS.ID)
      LEFT JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH_HIST.ID = ASSETS_HEALTH.HEALTH_HIST_ID)
      LEFT JOIN P_CAUSES ON (P_CAUSES.ID = ASSETS_HEALTH_HIST.P_CAUSE_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  conditions.push(`DEVICES_UNITS.UNIT_ID = :unitId`)
  if (qPars.clientId != null) { conditions.push(`DEVICES_CLIENTS.CLIENT_ID = :clientId`) }
  if (qPars.clientId != null) { conditions.push(`CLUNITS.CLIENT_ID = :clientId`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  sentence += ` ORDER BY MACHINE_NAME ASC, MACHINE_ID ASC, DAC_ID ASC `

  return sqldb.query<{
    DAC_ID: string
    H_INDEX: number
    H_DESC: string
    P_CAUSES: string
    MACHINE_APPLICATION: string
    DAC_COMIS: string
    MACHINE_ID: number
    DAC_NAME: string
    MACHINE_KW: number
    CITY_NAME: string
    STATE_ID: string
    MACHINE_NAME: string
    CLIENT_ID: number
    UNIT_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC dacInfoComboOpts = SELECT LIST
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}

  FROM CLUNITS

  SELECT CLUNITS.UNIT_ID AS value
  SELECT CLUNITS.UNIT_NAME AS label

  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export function dacInfoComboOpts (qPars: { CLIENT_ID: number }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID AS value,
      CLUNITS.UNIT_NAME AS label
  `
  sentence += `
    FROM
      CLUNITS
  `

  sentence += ` WHERE CLUNITS.CLIENT_ID = :CLIENT_ID `

  return sqldb.query<{
    value: number
    label: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC removeCity = UPDATE
  PARAM CITY_ID: {CLUNITS.CITY_ID}
  FROM CLUNITS
  CONSTFIELD CITY_ID = NULL
  WHERE {CLUNITS.CITY_ID} = {:CITY_ID}
*/
export async function w_removeCity (qPars: { CITY_ID: string }, operationLogData: OperationLogData) {

  const sentence = `UPDATE CLUNITS SET CITY_ID = NULL WHERE CLUNITS.CITY_ID = :CITY_ID`

  if (operationLogData) {
    await saveOperationLog('CLUNITS', sentence, qPars, operationLogData);
    dbLogger('CLUNITS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export function getClientNameByUnitId (qPars: { UNIT_ID: number }) {
  let sentence = `    
    SELECT c.name as NAME FROM CLUNITS cl 
    INNER JOIN CLIENTS c 
    ON c.CLIENT_ID = cl.CLIENT_ID  
  `
  sentence += `WHERE cl.unit_id = :UNIT_ID `

  return sqldb.querySingle<{   
    NAME: string      
  }>(sentence, qPars)
}

export function getUnitIdByUnitName (qPars: { UNIT_NAME: string, CLIENT_ID: number}) {
  let sentence = ` SELECT 
    UNIT_ID FROM CLUNITS
  `
  sentence += `WHERE UNIT_NAME = :UNIT_NAME AND CLIENT_ID = :CLIENT_ID `

  return sqldb.querySingle<{   
    UNIT_ID: number      
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitsListBasic = SELECT LIST
  PARAM UNIT_IDS?: {CLUNITS.UNIT_ID}[]
  PARAM CLIENT_IDS?: {CLUNITS.CLIENT_ID}[]
  PARAM INCLUDE_INSTALLATION_UNIT?: {CLUNITS.PRODUCTION}

  FROM CLUNITS
  LEFT JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)

  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.CITY_ID
  SELECT CLIENTS.CLIENT_ID
  SELECT CITY.STATE_ID

  WHERE [[IFJS qPars.CLIENT_IDS != null]] {CLUNITS.CLIENT_ID} IN ({:CLIENT_IDS})
  WHERE [[IFJS qPars.UNIT_IDS != null]] {CLUNITS.UNIT_ID} IN ({:UNIT_IDS})
  WHERE [[IFJS qPars.INCLUDE_INSTALLATION_UNIT === false]] {CLUNITS.PRODUCTION} = 1
*/
export function getUnitsListBasic (qPars: { UNIT_IDS?: number[], CLIENT_IDS?: number[], STATE_IDS?: number[], CITY_IDS?: number[], INCLUDE_INSTALLATION_UNIT?: boolean, PRE_FILTERS_CLIENTS_UNITS?: boolean }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API,
      CLUNITS.CITY_ID,
      CLIENTS.CLIENT_ID,
      CITY.STATE_ID,
      CLUNITS.PRODUCTION,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_NAME,
      CLUNITS.PRODUCTION_TIMESTAMP
  `
  sentence += `
    FROM
      CLUNITS
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (CITY.STATE_ID = STATEREGION.ID)      
  `

  const conditions: string[] = []
  if (qPars.CLIENT_IDS?.length && !qPars.UNIT_IDS?.length) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  if (qPars.UNIT_IDS?.length && !qPars.CLIENT_IDS?.length) { conditions.push(`CLUNITS.UNIT_ID IN (:UNIT_IDS)`) }
  if ([qPars.UNIT_IDS?.length, qPars.CLIENT_IDS?.length].every(length => length > 0)) {
    if (qPars.PRE_FILTERS_CLIENTS_UNITS) {
      conditions.push(`(CLUNITS.UNIT_ID IN (:UNIT_IDS) AND CLUNITS.CLIENT_ID IN (:CLIENT_IDS))`)
    } else {
      conditions.push(`(CLUNITS.UNIT_ID IN (:UNIT_IDS) OR CLUNITS.CLIENT_ID IN (:CLIENT_IDS))`)
    }
  }
  if (qPars.STATE_IDS?.length) { conditions.push(`STATEREGION.ID IN (:STATE_IDS)`) }
  if (qPars.CITY_IDS?.length) { conditions.push(`CITY.CITY_ID IN (:CITY_IDS)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS: string
    UNIT_CODE_API: string
    CITY_ID: string
    STATE_ID: string
    PRODUCTION: number
    PRODUCTION_TIMESTAMP: string
  }>(sentence, qPars)
}

export function getUnitsAndDevsList( qPars: {
  clientIds?: number[],
  unitIds?: number[],
  cityIds?: string[],
  stateIds?: string[],
  excludeClient?: number,
  SKIP?: number,
  LIMIT?: number,
  searchTerms?: string[],
  INCLUDE_INSTALLATION_UNIT?: boolean
  status?: string,
  startOperation?: string,
  endOperation?: string,
}) {
  let sentence = `
  WITH units AS (
    SELECT
      u.UNIT_ID,
      u.UNIT_NAME,
      u.UNIT_CODE_CELSIUS,
      u.UNIT_CODE_API,
      u.CLIENT_ID,
      u.CITY_ID,
      u.PRODUCTION,
      u.PRODUCTION_TIMESTAMP,
      c.NAME AS CLIENT_NAME,
      s.NAME AS STATE_ID,
      s.ID AS STATE_ID_KEY,
      c2.NAME AS CITY_NAME, 
      COUNT(u.UNIT_ID) OVER() as totalItems
    FROM
      CLUNITS u
      INNER JOIN CLIENTS c ON (c.CLIENT_ID = u.CLIENT_ID)
      LEFT JOIN CITY c2 ON (c2.CITY_ID = u.CITY_ID)
      LEFT JOIN STATEREGION s ON (s.ID = c2.STATE_ID)
  `
  const pars = {...qPars} as any;
  const conditions: string[] = [];

  if(qPars.searchTerms) {
    for (let i = 0; i < qPars.searchTerms.length; i++) {
      pars[`term_${i}`] = `%${qPars.searchTerms[i]}%`;
      conditions.push(`
        (u.UNIT_NAME like :term_${i}
        OR c.NAME like :term_${i}
        OR c2.NAME like :term_${i}
        OR c2.STATE_ID like :term_${i})
      `)
    }
  }

  if (qPars.excludeClient) { conditions.push(`u.CLIENT_ID <> :excludeClient`) }
  if (qPars.clientIds) { conditions.push(`u.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds) { conditions.push(`u.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds) { conditions.push(`u.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds) { conditions.push(`c2.STATE_ID IN (:stateIds)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`u.PRODUCTION = 1`) }
  if (qPars.status && (qPars.status === '1' || qPars.status === '0')) { conditions.push(`u.PRODUCTION = :status`) }
  if (qPars.startOperation !== '' && qPars.startOperation) { conditions.push(`u.PRODUCTION_TIMESTAMP >= :startOperation`) }
  if (qPars.endOperation !== '' && qPars.endOperation && (qPars.startOperation !== '' && qPars.startOperation)) { conditions.push(`u.PRODUCTION_TIMESTAMP <= :endOperation`) }
  if (qPars.endOperation !== '' && qPars.endOperation && (qPars.startOperation === '' || !qPars.startOperation)) { conditions.push(`(u.PRODUCTION_TIMESTAMP <= :endOperation OR u.PRODUCTION_TIMESTAMP IS NULL)`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  if (qPars.SKIP != null && qPars.LIMIT != null) {
    sentence += ' LIMIT :LIMIT OFFSET :SKIP)'
  } else {
    sentence += ')'
  }

  sentence += `
    SELECT
      units.totalItems,
      units.UNIT_ID,
      units.UNIT_NAME,
      units.UNIT_CODE_CELSIUS,
      units.UNIT_CODE_API,
      units.CLIENT_ID,
      units.CLIENT_NAME,
      units.STATE_ID,
      units.STATE_ID_KEY,
      units.CITY_NAME,
      units.PRODUCTION,
      units.PRODUCTION_TIMESTAMP,
      COUNTRY.NAME AS COUNTRY_NAME,
      CASE
        WHEN DACS_DEVICES.ID IS NOT NULL THEN DEVICES.DEVICE_CODE
        ELSE NULL
      END AS DAC_ID,
      MACHINES.ID AS DAC_MACHINE_ID,
      ASSETS_HEALTH_HIST.H_INDEX,
      ASSETS_HEALTH_HIST.H_DESC,
      ASSETS_HEALTH_HIST.H_DATE,
      (CASE WHEN DAMS_DEVICES.ID IS NOT NULL THEN DEVICE_CODE ELSE NULL END) AS DAM_ID,
      (CASE WHEN DUTS_DEVICES.ID IS NOT NULL THEN DEVICE_CODE ELSE NULL END) AS DUT_ID,
      ENVIRONMENTS.ENVIRONMENT_NAME AS DUT_ROOM_NAME,
      ROOMTYPES.RTYPE_ID AS DUT_RTYPE_ID,
      ENVIRONMENTS.IS_VISIBLE AS DUTS_VISIBLE,
      VAVS.ISVISIBLE as VAVS_VISIBLE,
      DUTS_DEVICES.PLACEMENT,
      DUTS_AUTOMATION.DISAB,
      CURRENT_AUTOMATIONS_PARAMETERS.PORT_CFG AS PORTCFG,
      VAVS.VAV_ID,
      VAVS.ROOM_NAME AS VAV_ROOM_NAME,
      VAVS.RTYPE_ID AS VAV_RTYPE_ID,
      DRIS_DEVICES.VARSCFG AS DRI_VARSCFG,
      ROOMTYPES.TUSEMAX,
      ROOMTYPES.TUSEMIN,
      ROOMTYPES.CO2MAX,
      ROOMTYPES.USEPERIOD AS RTYPE_SCHED,
      ASSETS.DAT_CODE AS DAT_ID
  `
  sentence += `
    FROM
      units
        LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.UNIT_ID = units.UNIT_ID)
        LEFT JOIN DEVICES ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
        LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.DEVICE_ID = DEVICES.ID)
        LEFT JOIN DACS_CONDENSERS ON (DACS_CONDENSERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
        LEFT JOIN DACS_EVAPORATORS ON (DACS_EVAPORATORS.DAC_DEVICE_ID = DACS_DEVICES.ID)
        LEFT JOIN CONDENSERS ON (CONDENSERS.ID = DACS_CONDENSERS.CONDENSER_ID)
        LEFT JOIN EVAPORATORS ON (EVAPORATORS.ID = DACS_EVAPORATORS.EVAPORATOR_ID)
        LEFT JOIN DACS_ASSET_HEAT_EXCHANGERS ON (DACS_ASSET_HEAT_EXCHANGERS.DAC_DEVICE_ID = DACS_DEVICES.ID)
        LEFT JOIN ASSET_HEAT_EXCHANGERS ON (ASSET_HEAT_EXCHANGERS.ID = DACS_ASSET_HEAT_EXCHANGERS.ASSET_HEAT_EXCHANGER_ID)
        LEFT JOIN ASSETS ON (ASSETS.ID = COALESCE(CONDENSERS.ASSET_ID, EVAPORATORS.ASSET_ID, ASSET_HEAT_EXCHANGERS.ASSET_ID))
        LEFT JOIN ASSETS_HEALTH ON (ASSETS_HEALTH.ASSET_ID = ASSETS.ID)
        LEFT JOIN ASSETS_HEALTH_HIST ON (ASSETS_HEALTH_HIST.ID = ASSETS_HEALTH.HEALTH_HIST_ID)
        LEFT JOIN DUTS_DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
        LEFT JOIN DUTS_MONITORING ON (DUTS_DEVICES.ID = DUTS_MONITORING.DUT_DEVICE_ID)
        LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
        LEFT JOIN MACHINES ON MACHINES.ID = COALESCE(CONDENSERS.MACHINE_ID, EVAPORATORS.MACHINE_ID, ASSET_HEAT_EXCHANGERS.MACHINE_ID)
        LEFT JOIN MACHINES MACHINES_DUT_AUT ON (MACHINES_DUT_AUT.ID = DUTS_AUTOMATION.MACHINE_ID)
        LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS on (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = MACHINES_DUT_AUT.ID)
        LEFT JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (CURRENT_AUTOMATIONS_PARAMETERS.ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID)  
        LEFT JOIN ENVIRONMENTS ON (DUTS_MONITORING.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN ENVIRONMENTS_ROOM_TYPES ON (ENVIRONMENTS_ROOM_TYPES.ENVIRONMENT_ID = ENVIRONMENTS.ID)
        LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
        LEFT JOIN VAVS ON (VAVS.VAV_ID = DEVICES.DEVICE_CODE)
        LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
        LEFT JOIN ROOMTYPES ON (ROOMTYPES.RTYPE_ID = ENVIRONMENTS_ROOM_TYPES.RTYPE_ID OR ROOMTYPES.RTYPE_ID = VAVS.RTYPE_ID)
        LEFT JOIN STATEREGION ON (STATEREGION.ID = units.STATE_ID)
        LEFT JOIN COUNTRY ON (COUNTRY.ID = STATEREGION.COUNTRY_ID)
  `

  sentence += ` ORDER BY units.UNIT_ID ASC`

  return sqldb.query<{
    totalItems: number,
    UNIT_ID: number,
    UNIT_NAME: string,
    UNIT_CODE_CELSIUS: string;
    UNIT_CODE_API: string;
    CLIENT_ID: number,
    CLIENT_NAME: string,
    STATE_ID: string,
    STATE_ID_KEY: number,
    CITY_NAME: string,
    PRODUCTION: number,
    PRODUCTION_TIMESTAMP: string,
    COUNTRY_NAME: string,
    DAC_ID: string,
    DAC_MACHINE_ID: number,
    H_INDEX: number,
    H_DESC: string,
    H_DATE: string,
    DAM_ID: string,
    DUT_ID: string,
    DUT_ROOM_NAME: string,
    DUT_RTYPE_ID: number,
    DUTS_VISIBLE: number,
    VAVS_VISIBLE: number,
    PLACEMENT: string,
    DISAB: number,
    PORTCFG: string,
    VAV_ID: string,
    VAV_ROOM_NAME: string,
    VAV_RTYPE_ID: number,
    DRI_VARSCFG: string,
    TUSEMAX: number,
    TUSEMIN: number,
    CO2MAX: number,
    RTYPE_SCHED: string,
    DAT_ID: string,
  }>(sentence, pars)
}

export function saveInDataBaseStatusGA (qPars: { GA_METER: string, STATUS: boolean }) {
  let sentence = `
    UPDATE CLUNITS SET STATUS_GA = :STATUS WHERE GA_METER = :GA_METER;
  `
  return sqldb.execute(sentence, qPars)
}

export function getAllStatusGA (qPars: { }) {
  let sentence = `
    SELECT CLUNITS.STATUS_GA, CLUNITS.GA_METER FROM CLUNITS WHERE GA_METER is NOT NULL;
  `
  return sqldb.query<{
    STATUS: number,
    GA_METER: number
  }>(sentence, qPars)
}

export function setAllStatusGANull (qPars: { }){
  let sentence = `
  UPDATE
  CLUNITS
  SET
  CLUNITS.STATUS_GA = NULL
  WHERE CLUNITS.GA_METER IS NOT NULL
  `
  return sqldb.execute(sentence, qPars)
}

export function getHumidityOffsetByDeviceCode (qPars: { DEVICE_CODE: string }) {
  let sentence = `
    SELECT
      CLUNITS.HUMIDITY_OFFSET
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
      INNER JOIN DEVICES ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
  `

  sentence += ' WHERE DEVICES.DEVICE_CODE = :DEVICE_CODE'

  return sqldb.querySingle<{
    HUMIDITY_OFFSET: number
  }>(sentence, qPars)
}


export function getUnitsByPage (qPars: { 
  UNIT_IDS?: number[],
  CLIENT_IDS?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean,
  STATE_IDS?: number[],
  CITY_IDS?: string[]
}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_NAME
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)`

  const conditions: string[] = []
  if (qPars.CLIENT_IDS != null && qPars.CLIENT_IDS.length > 0) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  if (qPars.UNIT_IDS != null && qPars.UNIT_IDS.length > 0) { conditions.push(`CLUNITS.UNIT_ID IN (:UNIT_IDS)`) }
  if (qPars.STATE_IDS != null && qPars.STATE_IDS.length > 0) { conditions.push(`STATEREGION.ID IN (:STATE_IDS)`) }
  if (qPars.CITY_IDS != null && qPars.CITY_IDS.length > 0) { conditions.push(`CITY.CITY_ID IN (:CITY_IDS)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` GROUP BY CLUNITS.UNIT_ID;`

  return sqldb.query<{
    UNIT_ID: number
    CITY_NAME: string
    STATE_NAME: string
  }>(sentence, qPars)
}

export function countUnitsToPage (qPars: { UNIT_IDS?: number[], CLIENT_IDS?: number[], INCLUDE_INSTALLATION_UNIT?: boolean, STATE_IDS?: number[], CITY_IDS?: number[] }) {
  let sentence = `
    SELECT
      COUNT(0) as QUANTITY,
      COUNT(DISTINCT CLUNITS.CITY_ID) AS TOTAL_CITY,
      COUNT(DISTINCT STATEREGION.ID) as TOTAL_STATES
    `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.CLIENT_IDS != null && qPars.CLIENT_IDS.length > 0) { conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENT_IDS)`) }
  if (qPars.UNIT_IDS != null && qPars.UNIT_IDS.length > 0) { conditions.push(`CLUNITS.UNIT_ID IN (:UNIT_IDS)`) }
  if (qPars.STATE_IDS != null && qPars.STATE_IDS.length > 0) { conditions.push(`STATEREGION.ID IN (:STATE_IDS)`) }
  if (qPars.CITY_IDS != null && qPars.CITY_IDS.length > 0) { conditions.push(`CITY.CITY_ID IN (:CITY_IDS)`) }
  if (qPars.INCLUDE_INSTALLATION_UNIT === false) { conditions.push(`CLUNITS.PRODUCTION = 1`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    QUANTITY: number
    TOTAL_CITY: number,
    TOTAL_STATES: number
  }>(sentence, qPars)
}

export function getListDevicesUnitsWithTimezone(qPars: { TIMEZONES_IDS: number[], UNIT_ID?: number }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE
    FROM 
      CLUNITS
    INNER JOIN DEVICES_UNITS ON (DEVICES_UNITS.UNIT_ID = CLUNITS.UNIT_ID)
    INNER JOIN DEVICES ON (DEVICES.ID = DEVICES_UNITS.DEVICE_ID)
  `;

  const conditions: string[] = []
  if (qPars.TIMEZONES_IDS != null) { conditions.push(`CLUNITS.TIMEZONE_ID IN (:TIMEZONES_IDS)`) }
  if (qPars.UNIT_ID != null) { conditions.push(`CLUNITS.UNIT_ID = :UNIT_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    DEVICE_CODE: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getUnitsMainService = SELECT LIST
  PARAM clientIds?: {CLUNITS.CLIENT_ID}[]
  PARAM unitIds?: {CLUNITS.UNIT_ID}[]
  PARAM cityIds?: {CLUNITS.CITY_ID}[]
  PARAM stateIds?: {CITY.STATE_ID}[]

  FROM CLUNITS
  INNER JOIN (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  LEFT JOIN (CITY.CITY_ID = CLUNITS.CITY_ID)
  LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)


  SELECT CLUNITS.UNIT_ID
  SELECT CLUNITS.UNIT_NAME

  WHERE [[IFJS {:clientIds}]] {CLUNITS.CLIENT_ID} IN ({:clientIds})
  WHERE [[IFJS {:unitIds}]] {CLUNITS.UNIT_ID} IN ({:unitIds})
  WHERE [[IFJS {:cityIds}]] {CLUNITS.CITY_ID} IN ({:cityIds})
  WHERE [[IFJS {:stateIds}]] {CITY.STATE_ID} IN ({:stateIds})
*/
export function getUnitsMainService (qPars: {
  clientIds?: number[],
  unitIds?: number[],
  cityIds?: string[],
  stateIds?: string[],
}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      TIME_ZONES.AREA as timezoneArea,
      TIME_ZONES.TIME_ZONE_OFFSET as gmt
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN TIME_ZONES ON (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length > 0) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds?.length > 0) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.cityIds?.length > 0) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (qPars.stateIds?.length > 0) { conditions.push(`STATEREGION.ID IN (:stateIds)`) }
  if (conditions.length > 0) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_NAME: string
  }>(sentence, qPars)
}

export function getAllUnitsByClient (qPars: { CLIENT_ID: number, UNITS_WITH_OTHERS_TIMEZONES?: boolean, FILTER_BY_UNIT_IDS?: number[], FILTER_BY_PRODUCTION_TIMESTAMP_DATE?: string }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API,
      CLIENTS.NAME AS CLIENT_NAME,
      CITY.NAME as CITY_NAME,
      STATEREGION.NAME AS STATE_NAME,
      CLUNITS.PRODUCTION_TIMESTAMP,
      CLUNITS.TARIFA_KWH,
      CLUNITS.CONSTRUCTED_AREA,
      SUM(CONDENSERS.CAPACITY_POWER) AS CAPACITY_POWER
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN MACHINES ON CLUNITS.UNIT_ID = MACHINES.UNIT_ID
	    LEFT JOIN CONDENSERS ON MACHINES.ID = CONDENSERS.MACHINE_ID
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)`;

  const conditions: string[] = []
  conditions.push(`CLIENTS.CLIENT_ID = :CLIENT_ID and CLUNITS.PRODUCTION = 1`)

  if (qPars.UNITS_WITH_OTHERS_TIMEZONES != null) { 
    sentence += ` LEFT JOIN TIME_ZONES on (TIME_ZONES.ID = CLUNITS.TIMEZONE_ID) `
    if (qPars.UNITS_WITH_OTHERS_TIMEZONES) {
      conditions.push(`TIME_ZONES.TIME_ZONE_OFFSET <> -3`);
    } else {
      conditions.push(`TIME_ZONES.TIME_ZONE_OFFSET = -3`);
    }
 }

 if (qPars.FILTER_BY_UNIT_IDS?.length) { conditions.push(`CLUNITS.UNIT_ID IN (:FILTER_BY_UNIT_IDS)`) }

 if (qPars.FILTER_BY_PRODUCTION_TIMESTAMP_DATE != null) { conditions.push(`(CLUNITS.PRODUCTION_TIMESTAMP <= :FILTER_BY_PRODUCTION_TIMESTAMP_DATE || CLUNITS.PRODUCTION_TIMESTAMP IS NULL)`)}

  sentence += ' WHERE ' + conditions.join(' AND ');

  sentence += ' GROUP BY CLUNITS.UNIT_ID, CLUNITS.UNIT_NAME, CLIENTS.NAME, CITY.NAME, STATEREGION.NAME, CLUNITS.TARIFA_KWH, CLUNITS.CONSTRUCTED_AREA '

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS: string
    UNIT_CODE_API: string
    CLIENT_NAME: string
    CITY_NAME?: string
    STATE_NAME?: string
    PRODUCTION_TIMESTAMP?: string
    TARIFA_KWH?: number
    CONSTRUCTED_AREA?: number
    CAPACITY_POWER?: number
  }>(sentence, qPars)
}

export function getUnitCodesByClient (qPars: { CLIENT_ID: number, UNITS_WITH_OTHERS_TIMEZONES?: boolean, FILTER_BY_UNIT_IDS?: number[], FILTER_BY_PRODUCTION_TIMESTAMP_DATE?: string }) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)`;

  const conditions: string[] = []
  conditions.push(`CLIENTS.CLIENT_ID = :CLIENT_ID`)

  sentence += ' WHERE ' + conditions.join(' AND ');

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS?: string
    UNIT_CODE_API?: string
  }>(sentence, qPars)
}

export async function getEnergyFilterData(qPars: { 
  CLIENTS: number[] 
  STATES?: number[],
  CITIES?: string[],
  UNITS?: number[],
}) {

    let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLIENTS.CLIENT_ID,
      CLIENTS.NAME AS CLIENT_NAME,
      CITY.CITY_ID,
      CITY.NAME as CITY_NAME,
      STATEREGION.ID AS STATE_ID,
      STATEREGION.NAME AS STATE_NAME
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)`


  const conditions: string[] = []
  if(qPars.CLIENTS?.length > 0){
    conditions.push(`CLUNITS.CLIENT_ID IN (:CLIENTS) `)
  }

  if (qPars.STATES !== null && qPars.STATES?.length > 0) {
    conditions.push(`STATEREGION.ID IN (:STATES)`)
  }

  if (qPars.CITIES !== null && qPars.CITIES?.length > 0) {
    conditions.push(`CITY.CITY_ID IN (:CITIES)`)
  }

  if (qPars.UNITS !== null && qPars.UNITS?.length > 0) {
    conditions.push(`CLUNITS.UNIT_ID IN (:UNITS)`)
  }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_ID: number
    CLIENT_NAME: string
    CITY_ID: string
    CITY_NAME: string
    STATE_ID: number
    STATE_NAME: string
  }>(sentence, qPars)
}

export function getUnitsAllowedAndFilteredByClients (qPars: {
  clientIds: number[],
}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds.length > 0) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }

  if (conditions.length > 0) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  return sqldb.query<{
    UNIT_ID: number
  }>(sentence, qPars)
}


export function getListUnitsFilters (qPars: {
  clientIds: number[],
  unitIds?: number[],
  stateIds?: number[],
  cityIds?: string[]
}) {
  let sentence = `
    SELECT
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CLUNITS.UNIT_CODE_CELSIUS,
      CLUNITS.UNIT_CODE_API
  `
  sentence += `
    FROM
      CLUNITS
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
  `

  const conditions: string[] = []
  if (qPars.clientIds?.length > 0) { conditions.push(`CLIENTS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.unitIds?.length > 0) { conditions.push(`CLUNITS.UNIT_ID IN (:unitIds)`) }
  if (qPars.stateIds?.length) { conditions.push(`CITY.STATE_ID IN (:stateIds)`) }
  if (qPars.cityIds?.length) { conditions.push(`CLUNITS.CITY_ID IN (:cityIds)`) }
  if (conditions.length > 0) { sentence += ' WHERE ' + conditions.join(' AND ') }
  
  sentence += ' ORDER BY UNIT_NAME'

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
  }>(sentence, qPars)
}

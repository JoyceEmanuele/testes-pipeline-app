import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC update = UPDATE
  FROM DEVFWVERS
  FIELD [[IFOWNPROP {:HW_TYPE}]] DEVFWVERS.HW_TYPE
  FIELD [[IFOWNPROP {:CERT_CHKDATE}]] DEVFWVERS.CERT_CHKDATE
  FIELD [[IFOWNPROP {:CERT_CURRFW}]] DEVFWVERS.CERT_CURRFW
  FIELD [[IFOWNPROP {:CERT_DATA}]] DEVFWVERS.CERT_DATA
  FIELD [[IFOWNPROP {:CURRFW_MSG}]] DEVFWVERS.CURRFW_MSG
  FIELD [[IFOWNPROP {:CURRFW_VERS}]] DEVFWVERS.CURRFW_VERS
  FIELD [[IFOWNPROP {:CURRFW_DATE}]] DEVFWVERS.CURRFW_DATE
  FIELD [[IFOWNPROP {:CURRFW_VLDSENT}]] DEVFWVERS.CURRFW_VLDSENT
  FIELD [[IFOWNPROP {:TARGFW_REQDATE}]] DEVFWVERS.TARGFW_REQDATE
  FIELD [[IFOWNPROP {:TARGFW_REQVERS}]] DEVFWVERS.TARGFW_REQVERS
  FIELD [[IFOWNPROP {:TARGFW_RCVDATE}]] DEVFWVERS.TARGFW_RCVDATE
  FIELD [[IFOWNPROP {:TARGFW_RCVPATH}]] DEVFWVERS.TARGFW_RCVPATH
  FIELD [[IFOWNPROP {:TARGFW_SENDDATE}]] DEVFWVERS.TARGFW_SENDDATE
  FIELD [[IFOWNPROP {:TARGFW_SENDPATH}]] DEVFWVERS.TARGFW_SENDPATH
  FIELD [[IFOWNPROP {:OTAPROCSTATUS}]] DEVFWVERS.OTAPROCSTATUS
  FIELD [[IFOWNPROP {:FWVERSSTATUS}]] DEVFWVERS.FWVERSSTATUS
*/
export async function w_update (qPars: {
  HW_TYPE?: string,
  CERT_CHKDATE?: string,
  CERT_CURRFW?: string,
  CERT_DATA?: string,
  CURRFW_MSG?: string,
  CURRFW_VERS?: string,
  CURRFW_DATE?: string,
  CURRFW_VLDSENT?: string,
  TARGFW_REQDATE?: string,
  TARGFW_REQVERS?: string,
  TARGFW_RCVDATE?: string,
  TARGFW_RCVPATH?: string,
  TARGFW_SENDDATE?: string,
  TARGFW_SENDPATH?: string,
  OTAPROCSTATUS?: string,
  FWVERSSTATUS?: string,
  DEV_ID: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.HW_TYPE !== undefined) { fields.push('HW_TYPE = :HW_TYPE') }
  if (qPars.CERT_CHKDATE !== undefined) { fields.push('CERT_CHKDATE = :CERT_CHKDATE') }
  if (qPars.CERT_CURRFW !== undefined) { fields.push('CERT_CURRFW = :CERT_CURRFW') }
  if (qPars.CERT_DATA !== undefined) { fields.push('CERT_DATA = :CERT_DATA') }
  if (qPars.CURRFW_MSG !== undefined) { fields.push('CURRFW_MSG = :CURRFW_MSG') }
  if (qPars.CURRFW_VERS !== undefined) { fields.push('CURRFW_VERS = :CURRFW_VERS') }
  if (qPars.CURRFW_DATE !== undefined) { fields.push('CURRFW_DATE = :CURRFW_DATE') }
  if (qPars.CURRFW_VLDSENT !== undefined) { fields.push('CURRFW_VLDSENT = :CURRFW_VLDSENT') }
  if (qPars.TARGFW_REQDATE !== undefined) { fields.push('TARGFW_REQDATE = :TARGFW_REQDATE') }
  if (qPars.TARGFW_REQVERS !== undefined) { fields.push('TARGFW_REQVERS = :TARGFW_REQVERS') }
  if (qPars.TARGFW_RCVDATE !== undefined) { fields.push('TARGFW_RCVDATE = :TARGFW_RCVDATE') }
  if (qPars.TARGFW_RCVPATH !== undefined) { fields.push('TARGFW_RCVPATH = :TARGFW_RCVPATH') }
  if (qPars.TARGFW_SENDDATE !== undefined) { fields.push('TARGFW_SENDDATE = :TARGFW_SENDDATE') }
  if (qPars.TARGFW_SENDPATH !== undefined) { fields.push('TARGFW_SENDPATH = :TARGFW_SENDPATH') }
  if (qPars.OTAPROCSTATUS !== undefined) { fields.push('OTAPROCSTATUS = :OTAPROCSTATUS') }
  if (qPars.FWVERSSTATUS !== undefined) { fields.push('FWVERSSTATUS = :FWVERSSTATUS') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE DEVFWVERS SET ${fields.join(', ')} WHERE DEV_ID = :DEV_ID`

  if (operationLogData) {
    await saveOperationLog('DEVFWVERS', sentence, qPars, operationLogData);
    dbLogger('DEVFWVERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insertIgnore = INSERT IGNORE
  FROM DEVFWVERS
  FIELD DEVFWVERS.DEV_ID
  FIELD DEVFWVERS.HW_TYPE
*/
export async function w_insertIgnore (qPars: { DEV_ID: string, HW_TYPE: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('DEV_ID')
  fields.push('HW_TYPE')

  const sentence = `INSERT IGNORE INTO DEVFWVERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('DEVFWVERS', sentence, qPars, operationLogData);
    dbLogger('DEVFWVERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getDevFwInfo = SELECT ROW
  PARAM devId: {DEVFWVERS.DEV_ID}

  FROM DEVFWVERS

  SELECT DEVFWVERS.DEV_ID
  SELECT DEVFWVERS.HW_TYPE
  SELECT DEVFWVERS.CURRFW_MSG
  SELECT DEVFWVERS.CURRFW_VERS
  SELECT DEVFWVERS.CURRFW_DATE
  SELECT DEVFWVERS.CURRFW_VLDSENT
  SELECT DEVFWVERS.TARGFW_REQDATE
  SELECT DEVFWVERS.TARGFW_REQVERS
  SELECT DEVFWVERS.TARGFW_RCVDATE
  SELECT DEVFWVERS.TARGFW_RCVPATH
  SELECT DEVFWVERS.TARGFW_SENDDATE
  SELECT DEVFWVERS.TARGFW_SENDPATH

  WHERE {DEVFWVERS.DEV_ID} = {:devId}
*/
export function getDevFwInfo (qPars: { devId: string }) {
  let sentence = `
    SELECT
      DEVFWVERS.DEV_ID,
      DEVFWVERS.HW_TYPE,
      DEVFWVERS.CURRFW_MSG,
      DEVFWVERS.CURRFW_VERS,
      DEVFWVERS.CURRFW_DATE,
      DEVFWVERS.CURRFW_VLDSENT,
      DEVFWVERS.TARGFW_REQDATE,
      DEVFWVERS.TARGFW_REQVERS,
      DEVFWVERS.TARGFW_RCVDATE,
      DEVFWVERS.TARGFW_RCVPATH,
      DEVFWVERS.TARGFW_SENDDATE,
      DEVFWVERS.TARGFW_SENDPATH,
      DEVFWVERS.V_MAJOR,
      DEVFWVERS.V_MINOR,
      DEVFWVERS.V_PATCH,
      DEVFWVERS.V_EXTRA
  `
  sentence += `
    FROM
      DEVFWVERS
  `

  sentence += ` WHERE DEVFWVERS.DEV_ID = :devId `

  return sqldb.querySingle<{
    DEV_ID: string
    HW_TYPE: string
    CURRFW_MSG: string
    CURRFW_VERS: string
    CURRFW_DATE: string
    CURRFW_VLDSENT: string
    TARGFW_REQDATE: string
    TARGFW_REQVERS: string
    TARGFW_RCVDATE: string
    TARGFW_RCVPATH: string
    TARGFW_SENDDATE: string
    TARGFW_SENDPATH: string
    V_MAJOR: number
    V_MINOR: number
    V_PATCH: number
    V_EXTRA: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getList = SELECT LIST
  FROM DEVFWVERS

  SELECT DEVFWVERS.DEV_ID
  SELECT DEVFWVERS.HW_TYPE
  SELECT DEVFWVERS.CURRFW_MSG
  SELECT DEVFWVERS.CURRFW_VERS
  SELECT DEVFWVERS.CURRFW_DATE
  SELECT DEVFWVERS.CURRFW_VLDSENT
  SELECT DEVFWVERS.OTAPROCSTATUS
  SELECT DEVFWVERS.FWVERSSTATUS
  SELECT DEVFWVERS.TARGFW_REQDATE
  SELECT DEVFWVERS.TARGFW_REQVERS
  SELECT DEVFWVERS.TARGFW_RCVDATE
  SELECT DEVFWVERS.TARGFW_RCVPATH
  SELECT DEVFWVERS.TARGFW_SENDDATE
  SELECT DEVFWVERS.TARGFW_SENDPATH
*/
export function getList () {
  let sentence = `
    SELECT
      DEVFWVERS.DEV_ID,
      DEVFWVERS.HW_TYPE,
      DEVFWVERS.CURRFW_MSG,
      DEVFWVERS.CURRFW_VERS,
      DEVFWVERS.CURRFW_DATE,
      DEVFWVERS.CURRFW_VLDSENT,
      DEVFWVERS.OTAPROCSTATUS,
      DEVFWVERS.FWVERSSTATUS,
      DEVFWVERS.TARGFW_REQDATE,
      DEVFWVERS.TARGFW_REQVERS,
      DEVFWVERS.TARGFW_RCVDATE,
      DEVFWVERS.TARGFW_RCVPATH,
      DEVFWVERS.TARGFW_SENDDATE,
      DEVFWVERS.TARGFW_SENDPATH
  `
  sentence += `
    FROM
      DEVFWVERS
  `

  return sqldb.query<{
    DEV_ID: string
    HW_TYPE: string
    CURRFW_MSG: string
    CURRFW_VERS: string
    CURRFW_DATE: string
    CURRFW_VLDSENT: string
    OTAPROCSTATUS: string
    FWVERSSTATUS: string
    TARGFW_REQDATE: string
    TARGFW_REQVERS: string
    TARGFW_RCVDATE: string
    TARGFW_RCVPATH: string
    TARGFW_SENDDATE: string
    TARGFW_SENDPATH: string
  }>(sentence)
}

export function getList_v2 (qPars: { devices?: string[] }) {
  let sentence = `
    SELECT
      DEVICES.DEVICE_CODE AS DEV_ID,
      DEVICES_UNITS.UNIT_ID,
      DEVICES_CLIENTS.CLIENT_ID,
      CLUNITS.UNIT_NAME,
      STATEREGION.NAME AS STATE_ID,
      CITY.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      DEVFWVERS.CURRFW_MSG,
      DEVFWVERS.OTAPROCSTATUS,
      DEVFWVERS.FWVERSSTATUS
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DEVFWVERS ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)
      LEFT JOIN DEVICES_UNITS ON (DEVICES_UNITS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)
      LEFT JOIN CLIENTS ON (CLIENTS.CLIENT_ID = DEVICES_CLIENTS.CLIENT_ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVICES_UNITS.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `
  if (qPars.devices?.length > 0) {
    sentence += ` WHERE DEVICES.DEVICE_CODE IN (:devices)`
  }
  return sqldb.query<{
    DEV_ID: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    STATE_ID: string
    CITY_NAME: string
    CLIENT_NAME: string
    CURRFW_MSG: string
    OTAPROCSTATUS: string
    FWVERSSTATUS: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromDev = DELETE
  PARAM DEV_ID: {DEVFWVERS.DEV_ID}
  FROM DEVFWVERS
  WHERE {DEVFWVERS.DEV_ID} = {:DEV_ID}
*/
export async function w_deleteFromDev (qPars: { DEV_ID: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM DEVFWVERS WHERE DEVFWVERS.DEV_ID = :DEV_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVFWVERS', sentence, qPars, operationLogData);
    dbLogger('DEVFWVERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteFromClientDevs (qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = ` INNER JOIN DEVICES ON (DEVICES.DEVICE_CODE = DEVFWVERS.DEV_ID) 
                 INNER JOIN DEVICES_CLIENTS ON (DEVICES_CLIENTS.DEVICE_ID = DEVICES.ID)`;

  const sentence = `DELETE DEVFWVERS FROM DEVFWVERS ${join} WHERE DEVICES_CLIENTS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('DEVFWVERS', sentence, qPars, operationLogData);
    dbLogger('DEVFWVERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getListPendingCmd = SELECT LIST
  FROM DEVFWVERS

  SELECT DEVFWVERS.DEV_ID
  SELECT DEVFWVERS.HW_TYPE
  SELECT DEVFWVERS.CURRFW_MSG
  SELECT DEVFWVERS.CURRFW_VERS
  SELECT DEVFWVERS.CURRFW_DATE
  SELECT DEVFWVERS.CURRFW_VLDSENT
  SELECT DEVFWVERS.TARGFW_REQDATE
  SELECT DEVFWVERS.TARGFW_REQVERS
  SELECT DEVFWVERS.TARGFW_RCVDATE
  SELECT DEVFWVERS.TARGFW_RCVPATH
  SELECT DEVFWVERS.TARGFW_SENDDATE
  SELECT DEVFWVERS.TARGFW_SENDPATH
*/
export function getListPendingCmd () {
  let sentence = `
    SELECT
      DEVFWVERS.DEV_ID,
      DEVFWVERS.HW_TYPE,
      DEVFWVERS.CURRFW_MSG,
      DEVFWVERS.CURRFW_VERS,
      DEVFWVERS.CURRFW_DATE,
      DEVFWVERS.CURRFW_VLDSENT,
      DEVFWVERS.TARGFW_REQDATE,
      DEVFWVERS.TARGFW_REQVERS,
      DEVFWVERS.TARGFW_RCVDATE,
      DEVFWVERS.TARGFW_RCVPATH,
      DEVFWVERS.TARGFW_SENDDATE,
      DEVFWVERS.TARGFW_SENDPATH
  `
  sentence += `
    FROM
      DEVFWVERS
  `

  sentence += ` WHERE DEVFWVERS.TARGFW_REQDATE IS NOT NULL AND (DEVFWVERS.TARGFW_SENDDATE IS NULL OR DEVFWVERS.TARGFW_SENDDATE < DEVFWVERS.TARGFW_REQDATE) `

  return sqldb.query<{
    DEV_ID: string
    HW_TYPE: string
    CURRFW_MSG: string
    CURRFW_VERS: string
    CURRFW_DATE: string
    CURRFW_VLDSENT: string
    TARGFW_REQDATE: string
    TARGFW_REQVERS: string
    TARGFW_RCVDATE: string
    TARGFW_RCVPATH: string
    TARGFW_SENDDATE: string
    TARGFW_SENDPATH: string
  }>(sentence)
}

/* @IFHELPER:FUNC getListPendingCmd = SELECT LIST
  FROM DEVFWVERS

  SELECT DEVFWVERS.DEV_ID
  SELECT DEVFWVERS.HW_TYPE
  SELECT DEVFWVERS.CURRFW_MSG
  SELECT DEVFWVERS.CURRFW_VERS
  SELECT DEVFWVERS.CURRFW_DATE
  SELECT DEVFWVERS.CURRFW_VLDSENT
  SELECT DEVFWVERS.TARGFW_REQDATE
  SELECT DEVFWVERS.TARGFW_REQVERS
  SELECT DEVFWVERS.TARGFW_RCVDATE
  SELECT DEVFWVERS.TARGFW_RCVPATH
  SELECT DEVFWVERS.TARGFW_SENDDATE
  SELECT DEVFWVERS.TARGFW_SENDPATH
*/
export function getListDamPendingNewParameters (qPars: { dateToFilter: string }) {
  let sentence = `
    SELECT
      DEVFWVERS.DEV_ID,
      DEVFWVERS.HW_TYPE,
      DEVFWVERS.CURRFW_MSG,
      DEVFWVERS.CURRFW_VERS,
      DEVFWVERS.CURRFW_DATE,
      DEVFWVERS.CURRFW_VLDSENT,
      DEVFWVERS.TARGFW_REQDATE,
      DEVFWVERS.TARGFW_REQVERS,
      DEVFWVERS.TARGFW_RCVDATE,
      DEVFWVERS.TARGFW_RCVPATH,
      DEVFWVERS.TARGFW_SENDDATE,
      DEVFWVERS.TARGFW_SENDPATH,
      DAMS_DEVICES.ID AS DAM_DEVICE_ID
  `
  sentence += `
    FROM
      DEVFWVERS
      INNER JOIN DEVICES ON (DEVFWVERS.DEV_ID = DEVICES.DEVICE_CODE)
      INNER JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
  `

  sentence += ` WHERE
                  DAMS_DEVICES.CAN_SELF_REFERENCE = 0 AND
                    (
                      (
                        DEVFWVERS.TARGFW_SENDDATE > :dateToFilter AND
                        DEVFWVERS.TARGFW_REQDATE > :dateToFilter
                      ) OR
                      (
                        DEVFWVERS.TARGFW_REQDATE IS NULL AND
                        DEVFWVERS.TARGFW_SENDDATE is null AND
                        DEVFWVERS.CURRFW_DATE > :dateToFilter
                      )
                    );
  `

  return sqldb.query<{
    DEV_ID: string
    HW_TYPE: string
    CURRFW_MSG: string
    CURRFW_VERS: string
    CURRFW_DATE: string
    CURRFW_VLDSENT: string
    TARGFW_REQDATE: string
    TARGFW_REQVERS: string
    TARGFW_RCVDATE: string
    TARGFW_RCVPATH: string
    TARGFW_SENDDATE: string
    TARGFW_SENDPATH: string
    DAM_DEVICE_ID: number
  }>(sentence, qPars)
}

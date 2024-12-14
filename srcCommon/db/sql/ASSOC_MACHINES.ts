import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'
import { selectDevAutMachine, selectDutIdMachine } from './MACHINES'

export async function w_insert (qPars: { ASSOC_ID: number, MACHINE_ID: number, POSITION: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('ASSOC_ID')
  fields.push('MACHINE_ID')
  fields.push('POSITION')

  const sentence = `INSERT INTO ASSOC_MACHINES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    dbLogger('ASSOC_MACHINES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOC_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_delete(qPars: { ASSOC_ID: number }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM ASSOC_MACHINES WHERE ASSOC_MACHINES.ASSOC_ID = :ASSOC_ID`;

  if (operationLogData) {
    dbLogger('ASSOC_MACHINES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOC_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function w_deleteMany(qPars: { ASSOC_IDS: number[] }, operationLogData: OperationLogData) {
  const sentence = `DELETE FROM ASSOC_MACHINES WHERE ASSOC_MACHINES.ASSOC_ID IN (:ASSOC_IDS)`;

  if (operationLogData) {
    dbLogger('ASSOC_MACHINES', sentence, qPars, operationLogData)
    await saveOperationLog('ASSOC_MACHINES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

export async function getMachinesBasicInfo(qPars: { ASSOC_ID: number }) {
  const sentence = `
    SELECT
      ASSOC_MACHINES.GROUP_ID,
      ASSOC_MACHINES.POSITION
    FROM
      ASSOC_MACHINES
    WHERE
      ASSOC_MACHINES.ASSOC_ID = :ASSOC_ID
  `

  return sqldb.query<{
    GROUP_ID: number
    POSITION: number
  }>(sentence, qPars)
}

export async function getMachineAssoc(qPars: { MACHINE_ID: number }) {
    const sentence = `
      SELECT
        ASSOC_MACHINES.ASSOC_ID
      FROM
        ASSOC_MACHINES
      WHERE
        ASSOC_MACHINES.MACHINE_ID = :MACHINE_ID
    `
  
    return sqldb.querySingle<{
      ASSOC_ID: number
    }>(sentence, qPars)
  }

export async function getMachines(qPars: { ASSOC_ID: number }) {
  let sentence = `
    SELECT DISTINCT
      ASSOC_MACHINES.ASSOC_ID,
      ASSOC_MACHINES.POSITION,
      MACHINES.ID as GROUP_ID,
      MACHINES.NAME as GROUP_NAME,
      ${selectDevAutMachine} as DEV_AUT,
      ${selectDutIdMachine} as DUT_ID,
      CLUNITS.UNIT_ID,
      CLUNITS.UNIT_NAME,
      CITY.NAME AS CITY_NAME,
      STATEREGION.NAME AS STATE_ID
  `
  sentence += `
    FROM
      ASSOC_MACHINES
      INNER JOIN MACHINES ON (ASSOC_MACHINES.MACHINE_ID = MACHINES.ID)
      LEFT JOIN CLUNITS ON (CLUNITS.UNIT_ID = MACHINES.UNIT_ID)
      LEFT JOIN CITY ON (CITY.CITY_ID = CLUNITS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
  `

  const conditions: string[] = []

  if (qPars.ASSOC_ID) { conditions.push(`ASSOC_MACHINES.ASSOC_ID = :ASSOC_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    ASSOC_ID: number
    POSITION: number
    GROUP_ID: number
    GROUP_NAME: string
    DEV_AUT: string
    DUT_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
  }>(sentence, qPars)
}



export async function getAllMachines(qPars: { CLIENT_ID?: number, CLIENT_IDS?: number[], UNIT_ID?: number }) {
  let sentence = `
    SELECT
      ASSOC_MACHINES.ASSOC_ID,
      ASSOC_MACHINES.GROUP_ID,
      ASSOC_MACHINES.POSITION,
      MACHINES.NAME as GROUP_NAME,
      ASSOCIATIONS.NAME as ASSOC_NAME,
      ASSOCIATIONS.UNIT_ID,
      ASSOCIATIONS.CLIENT_ID
  `
  sentence += `
    FROM
      ASSOC_MACHINES
    INNER JOIN ASSOCIATIONS ON (ASSOC_MACHINES.ASSOC_ID = ASSOCIATIONS.ID)
    INNER JOIN MACHINES ON (ASSOC_MACHINES.MACHINE_ID = MACHINES.ID)
  `

  const conditions: string[] = []
  if (qPars.CLIENT_ID) { conditions.push(`ASSOCIATIONS.CLIENT_ID = :CLIENT_ID`) }
  if (qPars.UNIT_ID) { conditions.push(`ASSOCIATIONS.UNIT_ID = :UNIT_ID`) }
  if (qPars.CLIENT_IDS) { conditions.push(`ASSOCIATIONS.CLIENT_ID IN (:CLIENT_IDS)`) }

  return sqldb.query<{
    ASSOC_ID: number
    GROUP_ID: number
    POSITION: number
    GROUP_NAME: string
    ASSOC_NAME: string
    UNIT_ID: number
    CLIENT_ID: number
  }>(sentence, qPars)
}

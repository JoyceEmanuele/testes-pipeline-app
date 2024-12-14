import * as sqldb from '../connectSql'

export function getDevsToTelemetry (qPars: { GROUP_ID: number, DEV_ID?: string, dateStart?: string, dateEnd?: string,  }) {
  let sentence = `
  WITH CTE_AUTOM_HISTORY AS (
    SELECT
      ID,
      MACHINE_ID,
      DAC_CODE AS DEV_ID,
      START_DATE,
      END_DATE
    FROM
      DACS_AUTOMATIONS_HIST
    UNION
    SELECT
      ID,
      MACHINE_ID,
      DAM_CODE AS DEV_ID,
      START_DATE,
      END_DATE
    FROM
      DAMS_AUTOMATIONS_HIST
    UNION
    SELECT
      ID,
      MACHINE_ID,
      DRI_CODE AS DEV_ID,
      START_DATE,
      END_DATE
    FROM
      DRIS_AUTOMATIONS_HIST
    UNION
    SELECT
      ID,
      MACHINE_ID,
      DUT_CODE AS DEV_ID,
      START_DATE,
      END_DATE
    FROM
      DUTS_AUTOMATION_HIST
  )
    SELECT
      AUTOM_GROUPS_HISTORY.ID AS AUTOM_GROUP_HISTORY_ID,
      AUTOM_GROUPS_HISTORY.DEV_ID,
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.START_DATE, '%Y-%m-%d') AS START_DATE,
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.END_DATE, '%Y-%m-%d') AS END_DATE,
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.START_DATE, '%Y-%m-%d %H:%i:%S') AS FULL_START_DATE, 
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.END_DATE, '%Y-%m-%d %H:%i:%S') AS FULL_END_DATE
  `
  sentence += `
    FROM
        CTE_AUTOM_HISTORY AUTOM_GROUPS_HISTORY
  `

  const conditions: string[] = []
  if (qPars.GROUP_ID != null) { conditions.push(`AUTOM_GROUPS_HISTORY.MACHINE_ID = :GROUP_ID`) }
  if (qPars.dateEnd != null) { conditions.push(`DATE_FORMAT(AUTOM_GROUPS_HISTORY.START_DATE, '%Y-%m-%d') <= :dateEnd`) }
  if (qPars.dateStart != null) { conditions.push(`(DATE_FORMAT(AUTOM_GROUPS_HISTORY.END_DATE, '%Y-%m-%d') >= :dateStart OR AUTOM_GROUPS_HISTORY.END_DATE IS NULL)`) }
  if (qPars.DEV_ID != null) { conditions.push(`AUTOM_GROUPS_HISTORY.DEV_ID = :DEV_ID AND AUTOM_GROUPS_HISTORY.END_DATE IS NULL`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ' ORDER BY FULL_START_DATE ASC';

  return sqldb.query<{
    AUTOM_GROUP_HISTORY_ID: number
    DEV_ID: string
    START_DATE: string
    END_DATE: string
    FULL_START_DATE: string
    FULL_END_DATE: string
  }>(sentence, qPars)
}


export function getDevGroupToRealocationHistory (qPars: { DEV_ID: string }) {
  let fromSentence = '';
  let devIdField = '';
  if (qPars.DEV_ID.startsWith('DAC')) { 
    fromSentence = 'DACS_AUTOMATIONS_HIST';
    devIdField = 'DAC_CODE';
  }
  else if (qPars.DEV_ID.startsWith('DAM')) { 
    fromSentence = 'DAMS_AUTOMATIONS_HIST';
    devIdField = 'DAM_CODE';
  }
  else if (qPars.DEV_ID.startsWith('DUT')) { 
    fromSentence = 'DUTS_AUTOMATION_HIST';
    devIdField = 'DUT_CODE';
  }
  else if (qPars.DEV_ID.startsWith('DRI')) { 
    fromSentence = 'DRIS_AUTOMATIONS_HIST';
    devIdField = 'DRI_CODE';
  }
  let sentence = `
    SELECT
      AUTOM_GROUPS_HISTORY.ID AS AUTOM_GROUP_HISTORY_ID,
      AUTOM_GROUPS_HISTORY.MACHINE_ID AS GROUP_ID,
      AUTOM_GROUPS_HISTORY.${devIdField} AS DEV_ID,
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.START_DATE, '%Y-%m-%d') AS START_DATE,
      DATE_FORMAT(AUTOM_GROUPS_HISTORY.END_DATE, '%Y-%m-%d') AS END_DATE
  `
  sentence += `
    FROM
      ${fromSentence} AUTOM_GROUPS_HISTORY
  `

  const conditions: string[] = []
  if (qPars.DEV_ID != null) { conditions.push(`AUTOM_GROUPS_HISTORY.${devIdField} = :DEV_ID`) }
  // select only current devices
  conditions.push(`AUTOM_GROUPS_HISTORY.END_DATE IS NULL `)
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    AUTOM_GROUP_HISTORY_ID: number,
    GROUP_ID: number
    DEV_ID: string
    START_DATE: string
    END_DATE: string
  }>(sentence, qPars)
}
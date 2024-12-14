import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'

/* @IFHELPER:FUNC deleteInvoicesInfo = DELETE
  PARAM INVOICE_ID: {INVOICES.INVOICE_ID}
  FROM INVOICES
  WHERE {INVOICES.INVOICE_ID} = {:INVOICE_ID}
*/
export async function w_deleteInvoicesInfo (qPars: { INVOICE_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INVOICES WHERE INVOICES.INVOICE_ID = :INVOICE_ID`;

  if (operationLogData) {
    await saveOperationLog('INVOICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC insert = INSERT
  FROM INVOICES

  FIELD INVOICES.UNIT_ID
  FIELD INVOICES.INVOICE_DATE
  FIELD INVOICES.TOTAL_CHARGES
  FIELD INVOICES.TOTAL_MEASURED
*/
export async function w_insert (qPars: { UNIT_ID: number, INVOICE_DATE: string, TOTAL_CHARGES: number, TOTAL_MEASURED: number }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('INVOICE_DATE')
  fields.push('TOTAL_CHARGES')
  fields.push('TOTAL_MEASURED')

  const sentence = `INSERT INTO INVOICES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('INVOICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

  /* @IFHELPER:FUNC updateInfo = UPDATE
  FROM INVOICES
  PARAM INVOICE_ID: {INVOICES.INVOICE_ID}
  FIELD [[IFOWNPROP {:UNIT_ID}]] INVOICES.UNIT_ID
  FIELD [[IFOWNPROP {:INVOICE_DATE}]] INVOICES.INVOICE_DATE
  FIELD [[IFOWNPROP {:TOTAL_CHARGES}]] INVOICES.TOTAL_CHARGES
  FIELD [[IFOWNPROP {:TOTAL_MEASURED}]] INVOICES.TOTAL_MEASURED
*/
export async function w_updateInfo (
    qPars: { INVOICE_ID:number, UNIT_ID?: number, INVOICE_DATE?: string, TOTAL_CHARGES?: number, TOTAL_MEASURED?: number }, operationLogData: OperationLogData
  ) {
    const fields: string[] = []
    if (qPars.UNIT_ID !== undefined) { fields.push('UNIT_ID = :UNIT_ID') }
    if (qPars.INVOICE_DATE !== undefined) { fields.push('INVOICE_DATE = :INVOICE_DATE') }
    if (qPars.TOTAL_CHARGES !== undefined) { fields.push('TOTAL_CHARGES = :TOTAL_CHARGES') }
    if (qPars.TOTAL_MEASURED !== undefined) { fields.push('TOTAL_MEASURED = :TOTAL_MEASURED') }

    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE INVOICES SET ${fields.join(', ')} WHERE INVOICE_ID = :INVOICE_ID`
  
    if (operationLogData) {
      await saveOperationLog('INVOICES', sentence, qPars, operationLogData);
    }
  
    return sqldb.execute(sentence, qPars)
  }

/* @IFHELPER:FUNC getInvoicesGroupByDate = SELECT ROW
  PARAM unitIds: {INVOICES.UNIT_ID}[]
  PARAM clientIds: {CLIENTS.CLIENT_ID}[]
  PARAM periodStart: {INVOICES.INVOICE_DATE}
  PARAM periodEnd: {INVOICES.INVOICE_DATE}

  FROM INVOICES 
  INNER JOIN CLUNITS (CLUNITS.UNIT_ID = INVOICES.UNIT_ID)
  INNER JOIN CLIENTS (CLUNITS.CLIENT_ID = CLUNITS.CLIENT_ID)

  SELECT INVOICES.INVOICE_DATE
  SELECT INVOICES.TOTAL_CHARGES
  SELECT INVOICES.TOTAL_MEASURED
  SELECT INVOICES.TOTAL_INVOICES
*/
export function getInvoicesGroupByDate (qPars: { unitIds?: number[], clientIds?: number[], periodStart?: string, periodEnd?: string}) {
  let sentence = `
    SELECT 
      DATE_FORMAT(INVOICE_DATE, '%Y-%m-%d') AS INVOICE_DATE,
      SUM(TOTAL_CHARGES) AS TOTAL_CHARGES,
      SUM(TOTAL_MEASURED) AS TOTAL_MEASURED,
      COUNT(0) AS TOTAL_INVOICES
  `
  sentence += `
    FROM
      INVOICES
  `

  if (qPars.unitIds != null) { sentence += ' INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INVOICES.UNIT_ID) '; }
  if (qPars.clientIds != null) { sentence += ' INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)'; }

  const conditions: string[] = []
  if (qPars.unitIds != null) { conditions.push(`INVOICES.UNIT_ID IN (:unitIds)`) }
  if (qPars.clientIds != null) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.periodStart && qPars.periodEnd) { conditions.push(`INVOICE_DATE BETWEEN :periodStart AND :periodEnd`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ' GROUP BY INVOICE_DATE';

  return sqldb.query<{
    INVOICE_DATE: string
    TOTAL_CHARGES: number
    TOTAL_MEASURED: number
    TOTAL_INVOICES: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInvoicesGroupByDate = SELECT ROW
  PARAM unitIds: {INVOICES.UNIT_ID}[]
  PARAM clientIds: {CLIENTS.CLIENT_ID}[]
  PARAM periodStart: {INVOICES.INVOICE_DATE}
  PARAM periodEnd: {INVOICES.INVOICE_DATE}

  FROM INVOICES 
  INNER JOIN CLUNITS (CLUNITS.UNIT_ID = INVOICES.UNIT_ID)
  INNER JOIN CLIENTS (CLUNITS.CLIENT_ID = CLUNITS.CLIENT_ID)

  SELECT INVOICES.UNIT_ID
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.CLIENT_ID
  SELECT INVOICES.INVOICE_DATE
  SELECT INVOICES.TOTAL_CHARGES
  SELECT INVOICES.TOTAL_MEASURED
*/
export function getLastInvoicesGroupByUnit (qPars: { unitIds?: number[], clientIds?: number[], periodStart?: string, periodEnd?: string}) {
  let sentence = `
    SELECT 
      SUBTABLE.UNIT_ID,
      SUBTABLE.UNIT_NAME,
      SUBTABLE.CLIENT_ID,
      SUBTABLE.INVOICE_DATE,
      SUBTABLE.TOTAL_CHARGES,
      SUBTABLE.TOTAL_MEASURED
  `
  sentence += `
    FROM
      (
        SELECT
          INVOICES.UNIT_ID, 
          CLUNITS.UNIT_NAME, 
          CLUNITS.CLIENT_ID,
          DATE_FORMAT(INVOICES.INVOICE_DATE, '%Y-%m-%d') AS INVOICE_DATE,
          INVOICES.TOTAL_CHARGES, 
          INVOICES.TOTAL_MEASURED,
          ROW_NUMBER() OVER (PARTITION BY UNIT_ID ORDER BY INVOICE_DATE DESC) AS RN
        FROM INVOICES
        INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = INVOICES.UNIT_ID)
        INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
  `
  const conditions: string[] = []
  if (qPars.unitIds != null) { conditions.push(`INVOICES.UNIT_ID IN (:unitIds)`) }
  if (qPars.clientIds != null) { conditions.push(`CLUNITS.CLIENT_ID IN (:clientIds)`) }
  if (qPars.periodStart && qPars.periodEnd) { conditions.push(`INVOICE_DATE BETWEEN :periodStart AND :periodEnd`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ` 
      ) AS SUBTABLE
  WHERE
    SUBTABLE.RN = 1`;

  return sqldb.query<{
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_ID: number
    INVOICE_DATE: string
    TOTAL_CHARGES: number
    TOTAL_MEASURED: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInvoiceUnitCount = SELECT ROW
  PARAM UNIT_ID: {INVOICES.UNIT_ID}
  PARAM periodStart: {INVOICES.INVOICE_DATE}
  PARAM periodEnd: {INVOICES.INVOICE_DATE}

  FROM INVOICES 

  SELECT INVOICES.UNIT_ID
  SELECT INVOICES.COUNT(0)
*/
export function getInvoiceUnitCount (qPars: { UNIT_ID: number, periodStart?: string, periodEnd?: string}) {
  let sentence = `
    SELECT 
      INVOICES.UNIT_ID,
      COUNT(0) AS REGISTER_QUANTITY
  `
  sentence += `
    FROM
      INVOICES
  `
  const conditions: string[] = []
  if (qPars.UNIT_ID != null) { conditions.push(`INVOICES.UNIT_ID = :UNIT_ID`) }
  if (qPars.periodStart && qPars.periodEnd) { conditions.push(`INVOICE_DATE BETWEEN :periodStart AND :periodEnd`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  sentence += ' GROUP BY INVOICES.UNIT_ID';

  return sqldb.querySingle<{
    INVOICE_ID: number
    REGISTER_QUANTITY: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInvoiceExist = SELECT ROW
  PARAM UNIT_ID: {INVOICES.UNIT_ID}
  PARAM INVOICE_DATE: {INVOICES.INVOICE_DATE}

  FROM INVOICES 

  SELECT INVOICES.INVOICE_ID
*/
export function getInvoiceExist(qPars: { UNIT_ID: number, INVOICE_DATE: string}) {
  let sentence = `
    SELECT 
      INVOICES.INVOICE_ID
  `
  sentence += `
    FROM
      INVOICES
  `
  const conditions: string[] = []
  if (qPars.UNIT_ID != null) { conditions.push(`INVOICES.UNIT_ID = :UNIT_ID`) }
  if (qPars.INVOICE_DATE != null) { conditions.push(`INVOICES.INVOICE_DATE = :INVOICE_DATE`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    INVOICE_ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteInvoicesInfo = DELETE
  PARAM UNIT_ID: {INVOICES.UNIT_ID}
  FROM INVOICES
  WHERE {INVOICES.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteInvoicesPerUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM INVOICES WHERE INVOICES.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('INVOICES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

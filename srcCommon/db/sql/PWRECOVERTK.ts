import * as sqldb from '../connectSql'
// @IFHELPER:CONFIG DISABLE_MODIF_LOG

/* @IFHELPER:FUNC insert = INSERT
  FROM PWRECOVERTK

  FIELD PWRECOVERTK.TOKEN
  FIELD PWRECOVERTK.DAT_ISSUE
  FIELD PWRECOVERTK.EMAIL
*/
export function w_insert (qPars: { TOKEN: string, DAT_ISSUE: string, EMAIL: string }) {
  const fields: string[] = []
  fields.push('TOKEN')
  fields.push('DAT_ISSUE')
  fields.push('EMAIL')

  const sentence = `INSERT INTO PWRECOVERTK (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getTokenData = SELECT ROW
  PARAM TOKEN: {PWRECOVERTK.TOKEN}
  PARAM EMAIL?: {PWRECOVERTK.EMAIL}

  FROM PWRECOVERTK

  SELECT PWRECOVERTK.TOKEN
  SELECT PWRECOVERTK.DAT_ISSUE
  SELECT PWRECOVERTK.EMAIL

  WHERE {PWRECOVERTK.TOKEN} = {:TOKEN}
  WHERE [[IFOWNPROP {:EMAIL}]] {PWRECOVERTK.EMAIL} = {:EMAIL}
*/
export function getTokenData (qPars: { TOKEN: string, EMAIL?: string }) {
  let sentence = `
    SELECT
      PWRECOVERTK.TOKEN,
      PWRECOVERTK.DAT_ISSUE,
      PWRECOVERTK.EMAIL
  `
  sentence += `
    FROM
      PWRECOVERTK
  `

  const conditions: string[] = []
  conditions.push(`PWRECOVERTK.TOKEN = :TOKEN`)
  if (qPars.EMAIL !== undefined) { conditions.push(`PWRECOVERTK.EMAIL = :EMAIL`) }
  sentence += ' WHERE ' + conditions.join(' AND ')

  return sqldb.querySingle<{
    TOKEN: string
    DAT_ISSUE: string
    EMAIL: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC deleteOldTokens = DELETE
  PARAM minDate: {PWRECOVERTK.DAT_ISSUE}
  PARAM maxDate: {PWRECOVERTK.DAT_ISSUE}
  FROM PWRECOVERTK
  WHERE NOT ({PWRECOVERTK.DAT_ISSUE} >= {:minDate} AND {PWRECOVERTK.DAT_ISSUE} <= {:maxDate})
*/
export function w_deleteOldTokens (qPars: { minDate: string, maxDate: string }) {

  const sentence = `DELETE FROM PWRECOVERTK WHERE NOT (PWRECOVERTK.DAT_ISSUE >= :minDate AND PWRECOVERTK.DAT_ISSUE <= :maxDate)`;

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUser = DELETE
  PARAM EMAIL: {PWRECOVERTK.EMAIL}
  FROM PWRECOVERTK
  WHERE {PWRECOVERTK.EMAIL} = {:EMAIL}
*/
export function w_deleteFromUser (qPars: { EMAIL: string }) {

  const sentence = `DELETE FROM PWRECOVERTK WHERE PWRECOVERTK.EMAIL = :EMAIL`;

  return sqldb.execute(sentence, qPars)
}

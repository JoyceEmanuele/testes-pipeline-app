import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getList = SELECT LIST
  PARAM datStart: {FERIADOS.DAT_FER}
  PARAM datEndExc: {FERIADOS.DAT_FER}

  FROM FERIADOS

  SELECT FERIADOS.DAT_FER
  SELECT FERIADOS.DESC_FER

  WHERE {FERIADOS.DAT_FER} >= {:datStart} AND {FERIADOS.DAT_FER} < {:datEndExc}
*/
export function getList (qPars: { datStart: string, datEndExc: string }) {
  let sentence = `
    SELECT
      FERIADOS.DAT_FER,
      FERIADOS.DESC_FER
  `
  sentence += `
    FROM
      FERIADOS
  `

  sentence += ` WHERE FERIADOS.DAT_FER >= :datStart AND FERIADOS.DAT_FER < :datEndExc `

  return sqldb.query<{
    DAT_FER: string
    DESC_FER: string
  }>(sentence, qPars)
}

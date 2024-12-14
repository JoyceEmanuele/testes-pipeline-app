import * as sqldb from '../connectSql'

export async function w_insert (qPars: { MODEL_ID: number, START_CICLE_DATE: string, END_CICLE_DATE: string, PIS: number, COFINS: number, ICMS: number, CONVENTIONALRATE_ID?: number, WHITERATE_ID?: number, GREENRATE_ID?: number, VIGENCYCICLE?: boolean }) {
    const fields: string[] = []
    fields.push('MODEL_ID')
    fields.push('START_CICLE_DATE')
    fields.push('END_CICLE_DATE')
    fields.push('PIS')
    fields.push('COFINS')
    fields.push('ICMS')
    fields.push('VIGENCYCICLE')
    if (qPars.CONVENTIONALRATE_ID) { fields.push('CONVENTIONALRATE_ID') }
    if (qPars.WHITERATE_ID) { fields.push('WHITERATE_ID') }
    if (qPars.GREENRATE_ID) { fields.push('GREENRATE_ID') }

    const sentence = `INSERT INTO RATE_CICLES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    return sqldb.execute(sentence, qPars)
}

export function getRateCicleById (qPars: { CICLE_ID: number }) {
    let sentence = `
        SELECT
        RATE_CICLES.MODEL_ID,
        RATE_CICLES.START_CICLE_DATE,
        RATE_CICLES.END_CICLE_DATE,
        RATE_CICLES.PIS,
        RATE_CICLES.COFINS,
        RATE_CICLES.ICMS,
        RATE_CICLES.CONVENTIONALRATE_ID,
        RATE_CICLES.WHITERATE_ID,
        RATE_CICLES.GREENRATE_ID,
        RATE_CICLES.VIGENCYCICLE
    `
    sentence += `
        FROM
        RATE_CICLES
    `
    
    const conditions: string[] = []
    conditions.push(`RATE_CICLES.CICLE_ID = :CICLE_ID`)
    sentence += ' WHERE ' + conditions.join(' AND ')
    
    return sqldb.querySingle<{
        MODEL_ID: number,
        START_CICLE_DATE: string,
        END_CICLE_DATE: string,
        PIS: number,
        COFINS: number,
        ICMS: number,
        VIGENCYCICLE: boolean,
        CONVENTIONALRATE_ID?: number,
        WHITERATE_ID?: number,
        GREENRATE_ID?: number
      }>(sentence, qPars) 
    }

export function getRateCicles (qPars: { MODEL_ID: number }) {
let sentence = `
    SELECT
    RATE_CICLES.CICLE_ID,
    RATE_CICLES.MODEL_ID,
    RATE_CICLES.START_CICLE_DATE,
    RATE_CICLES.END_CICLE_DATE,
    RATE_CICLES.PIS,
    RATE_CICLES.COFINS,
    RATE_CICLES.ICMS,
    RATE_CICLES.CONVENTIONALRATE_ID,
    RATE_CICLES.WHITERATE_ID,
    RATE_CICLES.GREENRATE_ID,
    RATE_CICLES.VIGENCYCICLE
`
sentence += `
    FROM
    RATE_CICLES
`

const conditions: string[] = []
conditions.push(`RATE_CICLES.MODEL_ID = :MODEL_ID`)
sentence += ' WHERE ' + conditions.join(' AND ')

return sqldb.query<{
    MODEL_ID: number,
    CICLE_ID: number,
    START_CICLE_DATE: string,
    END_CICLE_DATE: string,
    PIS: number,
    COFINS: number,
    ICMS: number,
    VIGENCYCICLE: boolean,
    CONVENTIONALRATE_ID?: number,
    WHITERATE_ID?: number,
    GREENRATE_ID?: number
  }>(sentence, qPars) 
}

export async function w_deleteRow (qPars: { CICLE_ID: number }) {
  
  const sentence = `DELETE FROM RATE_CICLES WHERE RATE_CICLES.CICLE_ID = :CICLE_ID`;
  
  return sqldb.execute(sentence, qPars)
}

export async function w_updateCicle (qPars: { CICLE_ID: number, MODEL_ID?: number, START_CICLE_DATE?: string, END_CICLE_DATE?: string, PIS?: number, COFINS?: number, ICMS?: number, CONVENTIONALRATE_ID?: number, WHITERATE_ID?: number, GREENRATE_ID?: number, VIGENCYCICLE: boolean }) {
    const fields: string[] = []
    if (qPars.MODEL_ID !== undefined) { fields.push('MODEL_ID = :MODEL_ID') }
    if (qPars.START_CICLE_DATE !== undefined) { fields.push('START_CICLE_DATE = :START_CICLE_DATE') }
    if (qPars.END_CICLE_DATE !== undefined) { fields.push('END_CICLE_DATE = :END_CICLE_DATE') }
    if (qPars.PIS !== undefined) { fields.push('PIS = :PIS') }
    if (qPars.COFINS !== undefined) { fields.push('COFINS = :COFINS') }
    if (qPars.ICMS !== undefined) { fields.push('ICMS = :ICMS') }
    if (qPars.CONVENTIONALRATE_ID !== undefined) { fields.push('CONVENTIONALRATE_ID = :CONVENTIONALRATE_ID') }
    if (qPars.WHITERATE_ID !== undefined) { fields.push('WHITERATE_ID = :WHITERATE_ID') }
    if (qPars.GREENRATE_ID !== undefined) { fields.push('GREENRATE_ID = :GREENRATE_ID') }
    if (qPars.VIGENCYCICLE !== undefined) { fields.push('VIGENCYCICLE = :VIGENCYCICLE') }

  
    const sentence = `UPDATE RATE_CICLES SET ${fields.join(', ')} WHERE CICLE_ID = :CICLE_ID`
    
    return sqldb.execute(sentence, qPars)
  }
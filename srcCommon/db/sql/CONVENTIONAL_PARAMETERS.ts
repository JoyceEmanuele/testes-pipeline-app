import * as sqldb from '../connectSql'

export async function w_insert (qPars: { RATE: string }) {
    const fields: string[] = []
    fields.push('RATE')

    const sentence = `INSERT INTO CONVENTIONAL_RATE_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    return sqldb.execute(sentence, qPars)
}

export function getConventionalRateParameters (qPars: { CONVENTIONALRATE_ID: number }) {
let sentence = `
    SELECT
    CONVENTIONAL_RATE_PARAMETERS.RATE,
    CONVENTIONAL_RATE_PARAMETERS.CONVENTIONALRATE_ID
`
sentence += `
    FROM
    CONVENTIONAL_RATE_PARAMETERS
`

const conditions: string[] = []
conditions.push(`CONVENTIONAL_RATE_PARAMETERS.CONVENTIONALRATE_ID = :CONVENTIONALRATE_ID`)
sentence += ' WHERE ' + conditions.join(' AND ')

return sqldb.querySingle<{
    RATE: string,
    CONVENTIONALRATE_ID: number,
}>(sentence, qPars)
}

export async function w_deleteRow (qPars: { CONVENTIONALRATE_ID: number }) {
  
  const sentence = `DELETE FROM CONVENTIONAL_RATE_PARAMETERS WHERE CONVENTIONAL_RATE_PARAMETERS.CONVENTIONALRATE_ID = :CONVENTIONALRATE_ID`;
  
  return sqldb.execute(sentence, qPars)
}

export async function w_updateConventionalRateParameter (qPars: { CONVENTIONALRATE_ID: number, RATE?: string }) {
    const fields: string[] = []
    if (qPars.RATE !== undefined) { fields.push('RATE = :RATE') }
  
    const sentence = `UPDATE CONVENTIONAL_RATE_PARAMETERS SET ${fields.join(', ')} WHERE CONVENTIONALRATE_ID = :CONVENTIONALRATE_ID`
    
    return sqldb.execute(sentence, qPars)
  }
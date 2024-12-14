import * as sqldb from '../connectSql'

export async function w_insert (qPars: { RATE_PONTA: string, RATE_OUTPONTA: string, START_PONTA: string, END_PONTA: string, FIRST_MID_RATE: string, START_FIRST_MID_RATE: string, END_FIRST_MID_RATE: string, LAST_MID_RATE: string, START_LAST_MID_RATE: string, END_LAST_MID_RATE: string }) {
    const fields: string[] = []
    fields.push('RATE_PONTA')
    fields.push('RATE_OUTPONTA')
    fields.push('START_PONTA')
    fields.push('END_PONTA')
    fields.push('FIRST_MID_RATE')
    fields.push('START_FIRST_MID_RATE') 
    fields.push('END_FIRST_MID_RATE')
    fields.push('LAST_MID_RATE')
    fields.push('START_LAST_MID_RATE')
    fields.push('END_LAST_MID_RATE')

    const sentence = `INSERT INTO WHITE_RATE_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    return sqldb.execute(sentence, qPars)
}

export function getWhiteRateParameters (qPars: { WHITERATE_ID: number }) {
let sentence = `
    SELECT
    WHITE_RATE_PARAMETERS.RATE_PONTA,
    WHITE_RATE_PARAMETERS.WHITERATE_ID,
    WHITE_RATE_PARAMETERS.RATE_OUTPONTA,
    WHITE_RATE_PARAMETERS.START_PONTA,
    WHITE_RATE_PARAMETERS.END_PONTA,
    WHITE_RATE_PARAMETERS.FIRST_MID_RATE,
    WHITE_RATE_PARAMETERS.END_FIRST_MID_RATE,
    WHITE_RATE_PARAMETERS.LAST_MID_RATE,
    WHITE_RATE_PARAMETERS.START_LAST_MID_RATE,
    WHITE_RATE_PARAMETERS.START_FIRST_MID_RATE,
    WHITE_RATE_PARAMETERS.END_LAST_MID_RATE
`
sentence += `
    FROM
    WHITE_RATE_PARAMETERS
`

const conditions: string[] = []
conditions.push(`WHITE_RATE_PARAMETERS.WHITERATE_ID = :WHITERATE_ID`)
sentence += ' WHERE ' + conditions.join(' AND ')

return sqldb.querySingle<{
    WHITERATE_ID: number,
    RATE_PONTA: string,
    RATE_OUTPONTA: string,
    START_PONTA: string,
    END_PONTA: string,
    FIRST_MID_RATE: string,
    START_FIRST_MID_RATE: string,
    END_FIRST_MID_RATE: string,
    LAST_MID_RATE?: string,
    START_LAST_MID_RATE: string,
    END_LAST_MID_RATE: string,
}>(sentence, qPars)
}

export async function w_deleteRow (qPars: { WHITERATE_ID: number }) {
  
  const sentence = `DELETE FROM WHITE_RATE_PARAMETERS WHERE WHITE_RATE_PARAMETERS.WHITERATE_ID = :WHITERATE_ID`;
  
  return sqldb.execute(sentence, qPars)
}

export async function w_updateWhiteParameter (qPars: { WHITERATE_ID: number, RATE_PONTA?: string, RATE_OUTPONTA?: string, START_PONTA?: string, END_PONTA?: string, FIRST_MID_RATE?: string, START_FIRST_MID_RATE?: string, END_FIRST_MID_RATE?: string, LAST_MID_RATE?: string, START_LAST_MID_RATE?: string, END_LAST_MID_RATE?: string}) {
    const fields: string[] = []

    if (qPars.RATE_PONTA !== undefined) { fields.push('RATE_PONTA = :RATE_PONTA') }
    if (qPars.RATE_OUTPONTA !== undefined) { fields.push('RATE_OUTPONTA = :RATE_OUTPONTA') }
    if (qPars.START_PONTA !== undefined) { fields.push('START_PONTA = :START_PONTA') }
    if (qPars.END_PONTA !== undefined) { fields.push('END_PONTA = :END_PONTA') }
    if (qPars.FIRST_MID_RATE !== undefined) { fields.push('FIRST_MID_RATE = :FIRST_MID_RATE') }
    if (qPars.START_FIRST_MID_RATE !== undefined) { fields.push('START_FIRST_MID_RATE = :START_FIRST_MID_RATE') }
    if (qPars.END_FIRST_MID_RATE !== undefined) { fields.push('END_FIRST_MID_RATE = :END_FIRST_MID_RATE') }
    if (qPars.LAST_MID_RATE !== undefined) { fields.push('LAST_MID_RATE = :LAST_MID_RATE') }
    if (qPars.START_LAST_MID_RATE !== undefined) { fields.push('START_LAST_MID_RATE = :START_LAST_MID_RATE') }
    if (qPars.END_LAST_MID_RATE !== undefined) { fields.push('END_LAST_MID_RATE = :END_LAST_MID_RATE') }
  
    const sentence = `UPDATE WHITE_RATE_PARAMETERS SET ${fields.join(', ')} WHERE WHITERATE_ID = :WHITERATE_ID`
    
    return sqldb.execute(sentence, qPars);
  }
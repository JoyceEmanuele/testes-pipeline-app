import * as sqldb from '../connectSql'

export function getRateModality (qPars: { RATEMODALITY_ID: number }) {
    let sentence = `
        SELECT
        RATE_MODALITY.RATEMODALITY_ID,
        RATE_MODALITY.RATEMODALITY_NAME,
        RATE_MODALITY.RATEGROUP_ID


    `
    sentence += `
        FROM
        RATE_MODALITY
    `
    
    const conditions: string[] = []
    conditions.push(`RATE_MODALITY.RATEMODALITY_ID = :RATEMODALITY_ID`)
    sentence += ' WHERE ' + conditions.join(' AND ')
    
    return sqldb.querySingle<{
        RATEMODALITY_ID: number
        RATEGROUP_ID: number
        RATEMODALITY_NAME: string
    }>(sentence, qPars)
    }

export function getRateModalities () {
    let sentence = `
        SELECT
        RATE_MODALITY.RATEMODALITY_ID,
        RATE_MODALITY.RATEMODALITY_NAME,
        RATE_MODALITY.RATEGROUP_ID


    `
    sentence += `
        FROM
        RATE_MODALITY
    `

    
    return sqldb.query<{
        RATEMODALITY_ID: number
        RATEGROUP_ID: number
        RATEMODALITY_NAME: string
    }>(sentence)
    }
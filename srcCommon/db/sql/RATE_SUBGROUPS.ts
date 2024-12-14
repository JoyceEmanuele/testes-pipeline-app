import * as sqldb from '../connectSql'

export function getSubgroup () {
    let sentence = `
        SELECT
        RATE_SUBGROUPS.SUBGROUP_ID,
        RATE_SUBGROUPS.SUBGROUP_NAME,
        RATE_SUBGROUPS.RATEGROUP_ID
    `
    sentence += `
        FROM
        RATE_SUBGROUPS
    `

    return sqldb.query<{
        SUBGROUP_ID: number
        RATEGROUP_ID: number
        SUBGROUP_NAME: string
    }>(sentence)
    }
    
export function getSubgroups (qPars: { SUBGROUP_ID: number }) {
    let sentence = `
        SELECT
        RATE_SUBGROUPS.SUBGROUP_ID,
        RATE_SUBGROUPS.SUBGROUP_NAME,
        RATE_SUBGROUPS.RATEGROUP_ID

    `
    sentence += `
        FROM
        RATE_SUBGROUPS
    `
    
    const conditions: string[] = []
    conditions.push(`RATE_SUBGROUPS.SUBGROUP_ID = :SUBGROUP_ID`)
    sentence += ' WHERE ' + conditions.join(' AND ')
    
    return sqldb.querySingle<{
        SUBGROUP_ID: number
        RATEGROUP_ID: number
        SUBGROUP_NAME: string
    }>(sentence, qPars)
    }
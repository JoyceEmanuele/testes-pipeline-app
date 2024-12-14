import * as sqldb from '../connectSql'

export function getRateGroup (qPars: { RATEGROUP_ID: number }) {
    let sentence = `
        SELECT
        RATE_GROUPS.RATEGROUP_ID,
        RATE_GROUPS.GROUP_NAME,


    `
    sentence += `
        FROM
        RATE_GROUPS
    `
    
    const conditions: string[] = []
    conditions.push(`RATE_GROUPS.RATEGROUP_ID = :RATEGROUP_ID`)
    sentence += ' WHERE ' + conditions.join(' AND ')
    
    return sqldb.querySingle<{
        RATEGROUP_ID: number
        GROUP_NAME: string
    }>(sentence, qPars)
    }

export function getRateGroups () {
    let sentence = `
        SELECT
        RATE_GROUPS.RATEGROUP_ID,
        RATE_GROUPS.GROUP_NAME
    `
    sentence += `
        FROM
        RATE_GROUPS
    `

    
    return sqldb.query<{
        RATEGROUP_ID: number
        GROUP_NAME: string
    }>(sentence)
    }
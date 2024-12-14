import * as sqldb from '../connectSql'

export async function w_insert (qPars: { CLIENT_ID: number, MODEL_NAME?: string, RATEMODALITY_ID: number, SUBGROUP_ID: number, DISTRIBUTOR_ID: number }) {
    const fields: string[] = []
    fields.push('CLIENT_ID')
    fields.push('MODEL_NAME')
    fields.push('RATEMODALITY_ID')
    fields.push('SUBGROUP_ID')
    fields.push('DISTRIBUTOR_ID')

    const sentence = `INSERT INTO RATE_MODELS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

    return sqldb.execute(sentence, qPars)
}

export function getRateModels (qPars: { CLIENT_ID: number }) {
let sentence = `
    SELECT
    RATE_MODELS.MODEL_NAME,
    RATE_MODELS.MODEL_ID,
    RATE_MODELS.DISTRIBUTOR_ID,
    RATE_MODELS.RATEMODALITY_ID,
    RATE_MODELS.SUBGROUP_ID,
    RATE_SUBGROUPS.SUBGROUP_NAME,
    RATE_SUBGROUPS.RATEGROUP_ID,
    RATE_GROUPS.GROUP_NAME,
    RATE_MODALITY.RATEMODALITY_NAME,
    DISTRIBUTORS.DISTRIBUTOR_TAG,
    DISTRIBUTORS.DISTRIBUTOR_LABEL
`
sentence += `
    FROM
    RATE_MODELS
    INNER JOIN RATE_SUBGROUPS ON RATE_MODELS.SUBGROUP_ID = RATE_SUBGROUPS.SUBGROUP_ID
    INNER JOIN RATE_GROUPS ON RATE_SUBGROUPS.RATEGROUP_ID = RATE_GROUPS.RATEGROUP_ID
    INNER JOIN RATE_MODALITY ON RATE_MODELS.RATEMODALITY_ID = RATE_MODALITY.RATEMODALITY_ID
    INNER JOIN DISTRIBUTORS ON RATE_MODELS.DISTRIBUTOR_ID = DISTRIBUTORS.DISTRIBUTOR_ID

`

const conditions: string[] = []
conditions.push(`RATE_MODELS.CLIENT_ID = :CLIENT_ID`)
sentence += ' WHERE ' + conditions.join(' AND ')

return sqldb.query<{
    MODEL_NAME: string
    MODEL_ID: number
    DISTRIBUTOR_ID: number
    SUBGROUP_ID: number
    SUBGROUP_NAME: string
    RATEGROUP_ID: number
    GROUP_NAME: string
    RATEMODALITY_ID: number
    RATEMODALITY_NAME: string
    DISTRIBUTOR_TAG: string
    DISTRIBUTOR_LABEL: string
}>(sentence, qPars)
}

export function getRateModelById (qPars: { MODEL_ID: number }) {
    let sentence = `
        SELECT
        RATE_MODELS.MODEL_NAME,
        RATE_MODELS.MODEL_ID,
        RATE_MODELS.DISTRIBUTOR_ID,
        RATE_MODELS.RATEMODALITY_ID,
        RATE_MODELS.SUBGROUP_ID,
        RATE_SUBGROUPS.SUBGROUP_NAME,
        RATE_SUBGROUPS.RATEGROUP_ID,
        RATE_GROUPS.GROUP_NAME,
        RATE_MODALITY.RATEMODALITY_NAME,
        DISTRIBUTORS.DISTRIBUTOR_TAG,
        DISTRIBUTORS.DISTRIBUTOR_LABEL,
    `
    sentence += `
        FROM
        RATE_MODELS
        INNER JOIN RATE_SUBGROUPS ON RATE_MODELS.SUBGROUP_ID = RATE_SUBGROUPS.SUBGROUP_ID
        INNER JOIN RATE_GROUPS ON RATE_SUBGROUPS.RATEGROUP_ID = RATE_GROUPS.RATEGROUP_ID
        INNER JOIN RATE_MODALITY ON RATE_MODELS.RATEMODALITY_ID = RATE_MODALITY.RATEMODALITY_ID
        INNER JOIN DISTRIBUTORS ON RATE_MODELS.DISTRIBUTOR_ID = DISTRIBUTORS.DISTRIBUTOR_ID
    `
    
    const conditions: string[] = []
    conditions.push(`RATE_MODELS.MODEL_ID = :MODEL_ID`)
    sentence += ' WHERE ' + conditions.join(' AND ')
    
    return sqldb.querySingle<{
        MODEL_NAME: string
        MODEL_ID: number
        DISTRIBUTOR_ID: number
        SUBGROUP_ID: number
        SUBGROUP_NAME: string
        RATEGROUP_ID: number
        GROUP_NAME: string
        RATEMODALITY_ID: number
        RATEMODALITY_NAME: string
        DISTRIBUTOR_TAG: string
        DISTRIBUTOR_LABEL: string
    }>(sentence, qPars)
    }

export async function w_deleteRow (qPars: { MODEL_ID: number }) {
  
  const sentence = `DELETE FROM RATE_MODELS WHERE RATE_MODELS.MODEL_ID = :MODEL_ID`;
  
  return sqldb.execute(sentence, qPars)
}

export async function w_updateModel (qPars: { MODEL_ID: number, MODEL_NAME?: string, RATEMODALITY_ID?: number, SUBGROUP_ID?: number, DISTRIBUTOR_ID?: number }) {
    const fields: string[] = []
    if (qPars.MODEL_NAME !== undefined) { fields.push('MODEL_NAME = :MODEL_NAME') }
    if (qPars.RATEMODALITY_ID !== undefined) { fields.push('RATEMODALITY_ID = :RATEMODALITY_ID') }
    if (qPars.SUBGROUP_ID !== undefined) { fields.push('SUBGROUP_ID = :SUBGROUP_ID') }
    if (qPars.DISTRIBUTOR_ID !== undefined) { fields.push('DISTRIBUTOR_ID = :DISTRIBUTOR_ID') }
    if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })
  
    const sentence = `UPDATE RATE_MODELS SET ${fields.join(', ')} WHERE MODEL_ID = :MODEL_ID`
    
    return sqldb.execute(sentence, qPars)
  }
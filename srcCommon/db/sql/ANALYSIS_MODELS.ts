import * as sqldb from '../connectSql'

export function getModelsGeneral(qPars:{ NAME?: string }) {
  let sentence = `SELECT ID, NAME, INTERESTS_ORGANIZATION, USER_ID, IS_HISTORIC FROM ANALYSIS_MODELS WHERE USER_ID IS NULL`;

  if(qPars.NAME != null){
    qPars.NAME = `%${qPars.NAME.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}%`
    sentence = sentence.concat(` AND NAME LIKE :NAME`)
  }

  return sqldb.query<{ID: number, NAME: string, INTERESTS_ORGANIZATION: string, USER_ID?: string, IS_HISTORIC: 0|1}>(sentence, qPars)
}

export function getModelsByUser(qPars: { USER: string, NAME?: string }) {
  let sentence = `SELECT ID, NAME, INTERESTS_ORGANIZATION, USER_ID, IS_HISTORIC FROM ANALYSIS_MODELS WHERE USER_ID =:USER`;

  if(qPars?.NAME){
    qPars.NAME = `%${qPars.NAME.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}%`
    sentence = sentence.concat(` AND NAME LIKE :NAME`)
  }

  return sqldb.query<{ID: number, NAME: string, INTERESTS_ORGANIZATION: string, USER_ID?: string, IS_HISTORIC: 0|1}>(sentence, qPars)
}

export async function getModelsById(qPars: { ID: number }) {
  const sentence = `
    SELECT
      eam.ID,
      eam.NAME,
      eam.INTERESTS_ORGANIZATION,
      eam.USER_ID,
      eam.IS_HISTORIC,
      JSON_ARRAYAGG(JSON_OBJECT('category', eamfv.CATEGORY , 'field', eamfv.FIELD , 'value', eamfv.VALUE)) as filters,
      JSON_ARRAYAGG(DISTINCT JSON_OBJECT('user', eams.USER_ID)) as shared
    FROM
      ANALYSIS_MODELS eam,
      ANALYSIS_MODELS_FILTERS_VALUES eamfv,
      ANALYSIS_MODELS_SHARED eams
    WHERE
      eamfv.MODEL_ID = eam.id
      AND eam.id = :ID
      AND eams.MODEL_ID = eam.id
  `;

  return sqldb.query<{ID: number, NAME: string, INTERESTS_ORGANIZATION: string, USER_ID?: string, IS_HISTORIC: 0|1, filters: string, shared: string}>(sentence, qPars)
}

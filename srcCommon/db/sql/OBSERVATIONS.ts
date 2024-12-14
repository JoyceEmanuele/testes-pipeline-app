import { dbLogger } from '../../helpers/logger';
import * as sqldb from '../connectSql';
import { OperationLogData, saveOperationLog } from '../dbModifLog';

export function w_insert (qPars: { ISVISIBLE: number, DATE_OBS: Date, OBS: string, USER_ID: string }) {
  const fields: string[] = []
  fields.push('ISVISIBLE')
  fields.push('DATE_OBS')
  fields.push('OBS')
  fields.push('USER_ID')

  let sentence = `INSERT INTO OBSERVATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}

export function w_update (qPars: { ID: number, ISVISIBLE: number, DATE_OBS: Date, OBS: string }) {

  let sentence = `
  UPDATE 
    OBSERVATIONS
  SET 
    ISVISIBLE = :ISVISIBLE,
    DATE_OBS = :DATE_OBS,
    OBS = :OBS
  WHERE
    ID = :ID;
  `

  return sqldb.execute(sentence, qPars);
}

export function getObsByUnitId (qPars: { UNIT_ID: number }) {
  let sentence = `
  SELECT
    O.ID,
    O.ISVISIBLE,
    O.DATE_OBS,
    O.USER_ID,
    O.OBS,
    UO.UNIT_ID,
    DASHUSERS.NOME,
    DASHUSERS.SOBRENOME
  FROM OBSERVATIONS O
  LEFT JOIN UNITS_OBSERVATIONS UO ON (UO.OBS_ID = O.ID)
  LEFT JOIN DASHUSERS ON (DASHUSERS.EMAIL = O.USER_ID)
  WHERE UO.UNIT_ID = :UNIT_ID
  ORDER BY DATE_OBS DESC
  ;
`;

return sqldb.query<{
  ID: number
  ISVISIBLE: number
  DATE_OBS: Date
  OBS: string
  UNIT_ID: number
  USER_ID: string
  NOME: string,
  SOBRENOME: string
}>(sentence, qPars)
}

export function getObsByObsId (qPars: { ID: number }) {
  let sentence = `
  SELECT
    O.ID,
    O.ISVISIBLE,
    O.DATE_OBS,
    O.USER_ID,
    O.OBS,
    UO.UNIT_ID,
    DASHUSERS.NOME,
    DASHUSERS.SOBRENOME
  FROM OBSERVATIONS O
  LEFT JOIN UNITS_OBSERVATIONS UO ON (UO.OBS_ID = O.ID)
  LEFT JOIN DASHUSERS ON (DASHUSERS.EMAIL = O.USER_ID)
  WHERE O.ID = :ID
  ORDER BY DATE_OBS DESC
  ;
`;

return sqldb.querySingle<{
  ID: number
  ISVISIBLE: number
  DATE_OBS: Date
  OBS: string
  UNIT_ID: number
  USER_ID: string
  NOME: string,
  SOBRENOME: string
}>(sentence, qPars)
}

export async function w_deleteRow(qPars: { OBS_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE OBSERVATIONS, UNITS_OBSERVATIONS
  FROM OBSERVATIONS 
  INNER JOIN UNITS_OBSERVATIONS ON (OBSERVATIONS.ID = UNITS_OBSERVATIONS.OBS_ID)
  WHERE OBSERVATIONS.ID = :OBS_ID`;

  if (operationLogData) {
    await saveOperationLog('OBSERVATIONS', sentence, qPars, operationLogData);
    dbLogger('OBSERVATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

export async function w_deleteByUnitId(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE OBSERVATIONS, UNITS_OBSERVATIONS
  FROM 
  OBSERVATIONS
  INNER JOIN UNITS_OBSERVATIONS ON (OBSERVATIONS.ID = UNITS_OBSERVATIONS.OBS_ID)
  WHERE UNITS_OBSERVATIONS.UNIT_ID = :UNIT_ID;`;

  if (operationLogData) {
    await saveOperationLog('OBSERVATIONS', sentence, qPars, operationLogData);
    dbLogger('OBSERVATIONS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}
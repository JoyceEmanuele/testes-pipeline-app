import * as sqldb from '../connectSql';

export function w_insert (qPars: { UNIT_ID: number, OBS_ID: number }) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('OBS_ID')

  let sentence = `INSERT INTO UNITS_OBSERVATIONS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  return sqldb.execute(sentence, qPars)
}
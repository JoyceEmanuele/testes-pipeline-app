import * as sqldb from '../connectSql';
import { saveOperationLog, OperationLogData } from '../dbModifLog';
import { dbLogger } from '../../helpers/logger';

/* @IFHELPER:FUNC deleteRow = DELETE
  PARAM UNIT_SKETCH_ID: {UNITS_SKETCHES.UNIT_SKETCH_ID}
  PARAM FILENAME: {UNITS_SKETCHES.FILENAME}
  FROM UNITS_SKETCHES
  WHERE {UNITS_SKETCHES.UNIT_SKETCH_ID} = {:UNIT_SKETCH_ID} AND {UNITS_SKETCHES.FILENAME} = {:FILENAME}
*/
export async function w_deleteRow(qPars: { UNIT_SKETCH_ID: number, FILENAME: string }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITS_SKETCHES WHERE UNITS_SKETCHES.UNIT_SKETCH_ID = :UNIT_SKETCH_ID AND UNITS_SKETCHES.FILENAME = :FILENAME`;

  if (operationLogData) {
    await saveOperationLog('UNITS_SKETCHES', sentence, qPars, operationLogData);
    dbLogger('UNITS_SKETCHES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {UNITS_SKETCHES.UNIT_ID}
  FROM UNITS_SKETCHES
  WHERE {UNITS_SKETCHES.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit(qPars: { UNIT_ID: number }, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM UNITS_SKETCHES WHERE UNITS_SKETCHES.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITS_SKETCHES', sentence, qPars, operationLogData);
    dbLogger('UNITS_SKETCHES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC deleteFromClunits = DELETE
  PARAM CLIENT_ID: {CLUNITS.CLIENT_ID}
  FROM UNITS_SKETCHES
  INNER JOIN (CLUNITS.UNIT_ID = UNITS_SKETCHES.UNIT_ID)
  WHERE {CLUNITS.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClunits(qPars: { CLIENT_ID: number }, operationLogData: OperationLogData) {
  const join = " INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = UNITS_SKETCHES.UNIT_ID)";

  const sentence = `DELETE UNITS_SKETCHES FROM UNITS_SKETCHES ${join} WHERE CLUNITS.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('UNITS_SKETCHES', sentence, qPars, operationLogData);
    dbLogger('UNITS_SKETCHES', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars);
}

/* @IFHELPER:FUNC insert = INSERT
FROM UNITS_SKETCHES
FIELD UNITS_SKETCHES.UNIT_ID
FIELD UNITS_SKETCHES.DAT_UPLOAD
FIELD UNITS_SKETCHES.FILENAME
*/
export async function w_insert (qPars: { UNIT_ID: number, DAT_UPLOAD: number, FILENAME: string, NAME_SKETCH: string }, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('UNIT_ID')
  fields.push('DAT_UPLOAD')
  fields.push('FILENAME')
  fields.push('NAME_SKETCH')
  
  const sentence = `INSERT INTO UNITS_SKETCHES (${fields.join(', ')}) VALUES (:${fields.join(', :')})`
  
  if (operationLogData) {
  await saveOperationLog('UNITS_SKETCHES', sentence, qPars, operationLogData);
  dbLogger('UNITS_SKETCHES', sentence, qPars, operationLogData);
  }
  
  return sqldb.execute(sentence, qPars)
}
    
/* @IFHELPER:FUNC getList = SELECT LIST
PARAM UNIT_ID: {UNITS_SKETCHES.UNIT_ID}
FROM UNITS_SKETCHES
SELECT UNITS_SKETCHES.FILENAME
WHERE {UNITS_SKETCHES.UNIT_ID} = {:UNIT_ID}
ORDER BY UNITS_SKETCHES.DAT_UPLOAD DESC
*/
export function getList (qPars: { UNIT_ID: number }) {
  let sentence = 'SELECT UNITS_SKETCHES.UNIT_SKETCH_ID, UNITS_SKETCHES.FILENAME, UNITS_SKETCHES.ISVISIBLE, UNITS_SKETCHES.NAME_SKETCH'
  sentence += ' FROM UNITS_SKETCHES'

  sentence += ` WHERE UNITS_SKETCHES.UNIT_ID = :UNIT_ID`

  sentence += ' ORDER BY UNITS_SKETCHES.DAT_UPLOAD DESC'

  return sqldb.query<{
  UNIT_SKETCH_ID: number
  FILENAME: string
  ISVISIBLE: number
  NAME_SKETCH: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getInfo = SELECT
PARAM UNIT_ID: {UNITS_SKETCHES.UNIT_ID}
PARAM FILENAME: {UNITS_SKETCHES.FILENAME}
FROM UNITS_SKETCHES

SELECT UNITS_SKETCHES.UNIT_SKETCH_ID
SELECT UNITS_SKETCHES.FILENAME
WHERE {UNITS_SKETCHES.UNIT_ID} = {:UNIT_ID}
WHERE {UNITS_SKETCHES.FILENAME} = {:FILENAME}
*/
export function getInfo (qPars: { UNIT_ID: number, FILENAME: string }) {
  let sentence = 
    `SELECT 
      UNITS_SKETCHES.UNIT_SKETCH_ID,
      UNITS_SKETCHES.FILENAME
  `;
    
  sentence += `
    FROM
      UNITS_SKETCHES
  `

  const conditions: string[] = []
  if (qPars.UNIT_ID != null) { conditions.push(`UNITS_SKETCHES.UNIT_ID = :UNIT_ID`) }
  if (qPars.FILENAME != null) { conditions.push(`UNITS_SKETCHES.FILENAME = :FILENAME`) }

  if (conditions.length > 0) {
    sentence += ' WHERE ' + conditions.join(' AND ');
  }

  return sqldb.querySingle<{
    UNIT_SKETCH_ID: number
    FILENAME: string
  }>(sentence, qPars)
}

export function editSketch(qPars: { isVisible: boolean, name_sketch?: string, unitSketchId: number }) {
  let sentence = `
    UPDATE UNITS_SKETCHES
  `

  const conditions: string[] = []
  if (qPars.isVisible != null) { conditions.push(`UNITS_SKETCHES.ISVISIBLE = :isVisible`) }
  if (qPars.name_sketch != null) { conditions.push(`UNITS_SKETCHES.NAME_SKETCH = :name_sketch`) }
  if (conditions.length > 0) {
    sentence += ' SET ' + conditions.join(', ');
  }
  sentence += `
    WHERE UNITS_SKETCHES.UNIT_SKETCH_ID = :unitSketchId;
  `

  return sqldb.execute(sentence, qPars);
}
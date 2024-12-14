import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getAllMachineTypes = SELECT LIST

  FROM VTMACHINETYPES

  SELECT VTMACHINETYPES.ID
  SELECT VTMACHINETYPES.NAME
*/
export function getAllMachineTypes () {
    let sentence = `
      SELECT
        VTMACHINETYPES.ID,
        VTMACHINETYPES.NAME
    `
    sentence += `
      FROM
        VTMACHINETYPES
    `
  
    return sqldb.query<{
      ID: number
      NAME: string
    }>(sentence)
  }

/* @IFHELPER:FUNC getOptsOfType = SELECT LIST
  FROM VTMACHINETYPES
  SELECT VTMACHINETYPES.ID AS value
  SELECT VTMACHINETYPES.NAME AS label
*/
export function getOptsOfType () {
  let sentence = `
    SELECT
      VTMACHINETYPES.ID AS value,
      VTMACHINETYPES.NAME AS label
  `
  sentence += `
    FROM
      VTMACHINETYPES
  `

  return sqldb.query<{
    value: string
    label: string
  }>(sentence)
}

import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM CARRIER_ECOSPLIT_AUTOMATION_COMMANDS

  SELECT CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.ALIAS,
  SELECT CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.ARRAY,
  SELECT CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.DESCRIPTION
*/
export function getCommandsList() {
  let sentence = `
    SELECT
      CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.ALIAS,
      CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.ARRAY,
      CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.DESCRIPTION
  `

  sentence += `
    FROM
      CARRIER_ECOSPLIT_AUTOMATION_COMMANDS
  `

  return sqldb.query<{
    ALIAS: string
    DESCRIPTION: string
    ARRAY: string
  }>(sentence);
}
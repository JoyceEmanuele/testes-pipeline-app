import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS

  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ADDRESS,
  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ALIAS,
  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.DESCRIPTION,
  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.VALUE,
  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ID,
  SELECT VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.IP,
*/
export function getCommandsList () {
  let sentence = `
    SELECT
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ADDRESS,
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ALIAS,
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.DESCRIPTION,
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.VALUE,
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.ID,
    VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.IP
  `

  sentence += `
    FROM
      VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS
    ORDER BY ALIAS
  `

  return sqldb.query<{
    ADDRESS: number
    ALIAS: string
    DESCRIPTION: string
    VALUE: number
    ID: number
    IP: string | null
  }>(sentence, {})
}
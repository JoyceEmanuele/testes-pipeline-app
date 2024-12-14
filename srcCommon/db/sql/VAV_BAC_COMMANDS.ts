import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM VAV_BAC_COMMANDS

  SELECT VAV_BAC_COMMANDS.COMMAND,
  SELECT VAV_BAC_COMMANDS.SYS_ID,
  SELECT VAV_BAC_COMMANDS.ADDRESS,
  SELECT VAV_BAC_COMMANDS.DESCRIPTION,
  SELECT VAV_BAC_COMMANDS.IP,
  SELECT VAV_BAC_COMMANDS.ID,
  SELECT VAV_BAC_COMMANDS.SIZE,
  SELECT VAV_BAC_COMMANDS.FUNC_ID,
  SELECT VAV_BAC_COMMANDS.R_W,
  SELECT VAV_BAC_COMMANDS.UNIT,
  SELECT VAV_BAC_COMMANDS.FORMULA,
  SELECT VAV_BAC_COMMANDS.ALIAS
*/
export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
    VAV_BAC_COMMANDS.COMMAND,
    VAV_BAC_COMMANDS.SYS_ID,
    VAV_BAC_COMMANDS.ADDRESS,
    VAV_BAC_COMMANDS.DESCRIPTION,
    VAV_BAC_COMMANDS.IP,
    VAV_BAC_COMMANDS.ID,
    VAV_BAC_COMMANDS.SIZE,
    VAV_BAC_COMMANDS.FUNC_ID,
    VAV_BAC_COMMANDS.R_W,
    VAV_BAC_COMMANDS.UNIT,
    VAV_BAC_COMMANDS.FORMULA,
    VAV_BAC_COMMANDS.ALIAS
  `

  sentence += `
    FROM
      VAV_BAC_COMMANDS
    ORDER BY CAST(SUBSTRING(COMMAND, 4, 3) AS UNSIGNED)
  `

  return sqldb.query<{
    COMMAND: string
    SYS_ID: number
    ADDRESS: number
    DESCRIPTION: string
    IP: string
    ID: number
    SIZE: number
    FUNC_ID: number
    R_W: string
    UNIT: string
    FORMULA: string
    ALIAS: string
  }>(sentence, qPars)
}
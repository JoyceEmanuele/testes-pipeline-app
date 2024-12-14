import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM ETE_30_COMMANDS

  SELECT ETE_30_COMMANDS.COMMAND,
  SELECT ETE_30_COMMANDS.SYS_ID,
  SELECT ETE_30_COMMANDS.ADDRESS,
  SELECT ETE_30_COMMANDS.DESCRIPTION,
  SELECT ETE_30_COMMANDS.IP,
  SELECT ETE_30_COMMANDS.ID,
  SELECT ETE_30_COMMANDS.SIZE,
  SELECT ETE_30_COMMANDS.FUNC_ID,
  SELECT ETE_30_COMMANDS.R_W,
  SELECT ETE_30_COMMANDS.UNIT,
  SELECT ETE_30_COMMANDS.FORMULA
  SELECT ETE_30_COMMANDS.ALIAS
*/
export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
    ETE_30_COMMANDS.COMMAND,
    ETE_30_COMMANDS.SYS_ID,
    ETE_30_COMMANDS.ADDRESS,
    ETE_30_COMMANDS.DESCRIPTION,
    ETE_30_COMMANDS.HAS_SIGNAL,
    ETE_30_COMMANDS.IP,
    ETE_30_COMMANDS.ID,
    ETE_30_COMMANDS.SIZE,
    ETE_30_COMMANDS.FUNC_ID,
    ETE_30_COMMANDS.R_W,
    ETE_30_COMMANDS.UNIT,
    ETE_30_COMMANDS.FORMULA,
    ETE_30_COMMANDS.ALIAS
  `

  sentence += `
    FROM
      ETE_30_COMMANDS
    ORDER BY CAST(SUBSTRING(COMMAND, 4, 3) AS UNSIGNED)
  `

  return sqldb.query<{
    COMMAND: string
    SYS_ID: number
    ADDRESS: number
    DESCRIPTION: string
    HAS_SIGNAL: string
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
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM KRON_IKRON_03_COMMANDS

  SELECT KRON_IKRON_03_COMMANDS.COMMAND,
  SELECT KRON_IKRON_03_COMMANDS.SYS_ID,
  SELECT KRON_IKRON_03_COMMANDS.ADDRESS,
  SELECT KRON_IKRON_03_COMMANDS.DESCRIPTION,
  SELECT KRON_IKRON_03_COMMANDS.IP,
  SELECT KRON_IKRON_03_COMMANDS.ID,
  SELECT KRON_IKRON_03_COMMANDS.SIZE,
  SELECT KRON_IKRON_03_COMMANDS.FUNC_ID,
  SELECT KRON_IKRON_03_COMMANDS.R_W,
  SELECT KRON_IKRON_03_COMMANDS.UNIT,
  SELECT KRON_IKRON_03_COMMANDS.FORMULA,
  SELECT KRON_IKRON_03_COMMANDS.ALIAS
*/
export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
    KRON_IKRON_03_COMMANDS.COMMAND,
    KRON_IKRON_03_COMMANDS.SYS_ID,
    KRON_IKRON_03_COMMANDS.ADDRESS,
    KRON_IKRON_03_COMMANDS.DESCRIPTION,
    KRON_IKRON_03_COMMANDS.IP,
    KRON_IKRON_03_COMMANDS.ID,
    KRON_IKRON_03_COMMANDS.SIZE,
    KRON_IKRON_03_COMMANDS.FUNC_ID,
    KRON_IKRON_03_COMMANDS.R_W,
    KRON_IKRON_03_COMMANDS.UNIT,
    KRON_IKRON_03_COMMANDS.FORMULA,
    KRON_IKRON_03_COMMANDS.ALIAS
  `

  sentence += `
    FROM
      KRON_IKRON_03_COMMANDS
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
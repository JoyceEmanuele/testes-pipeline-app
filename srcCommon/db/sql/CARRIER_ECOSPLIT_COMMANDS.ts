import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM CARRIER_ECOSPLIT_COMMANDS

  SELECT CARRIER_ECOSPLIT_COMMANDS.COMMAND,
  SELECT CARRIER_ECOSPLIT_COMMANDS.R_W,
  SELECT CARRIER_ECOSPLIT_COMMANDS.DESCRIPTION,
  SELECT CARRIER_ECOSPLIT_COMMANDS.ARRAY
*/
export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
      CARRIER_ECOSPLIT_COMMANDS.COMMAND,
      CARRIER_ECOSPLIT_COMMANDS.R_W,
      CARRIER_ECOSPLIT_COMMANDS.DESCRIPTION,
      CARRIER_ECOSPLIT_COMMANDS.ARRAY
  `

  sentence += `
    FROM
      CARRIER_ECOSPLIT_COMMANDS
  `

  return sqldb.query<{
    COMMAND: string
    R_W: string
    DESCRIPTION: string
    ARRAY: string
  }>(sentence, qPars)
}
import * as sqldb from '../connectSql'

export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.COMMAND,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.SYS_ID,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.ADDRESS,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.DESCRIPTION,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.DESCRIPTION_EN,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.IP,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.ID,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.SIZE,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.FUNC_ID,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.R_W,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.UNIT,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.FORMULA,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.ALIAS,
    CHILLER_CARRIER_30XA_HVAR_COMMANDS.HAS_SIGNAL
  `

  sentence += `
    FROM
      CHILLER_CARRIER_30XA_HVAR_COMMANDS
    ORDER BY CAST(SUBSTRING(COMMAND, 4, 3) AS UNSIGNED)
  `

  return sqldb.query<{
    COMMAND: string
    SYS_ID: number
    ADDRESS: number
    DESCRIPTION: string
    DESCRIPTION_EN: string
    IP: string
    ID: number
    SIZE: number
    FUNC_ID: number
    R_W: string
    UNIT: string
    FORMULA: string
    ALIAS: string
    HAS_SIGNAL: string
  }>(sentence, qPars)
}

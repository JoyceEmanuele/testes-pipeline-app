import * as sqldb from '../connectSql'

/* @IFHELPER:FUNC getCommandsList = SELECT

  FROM CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS

  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.COMMAND,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.SYS_ID,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ADDRESS,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.DESCRIPTION,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.DESCRIPTION_EN,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.IP,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ID,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.SIZE,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.FUNC_ID,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.R_W,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.UNIT,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.FORMULA,
  SELECT CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ALIAS
*/
export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.COMMAND,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.SYS_ID,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ADDRESS,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.DESCRIPTION,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.DESCRIPTION_EN,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.IP,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ID,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.SIZE,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.FUNC_ID,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.R_W,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.UNIT,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.FORMULA,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.ALIAS,
    CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS.HAS_SIGNAL
  `

  sentence += `
    FROM
      CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS
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
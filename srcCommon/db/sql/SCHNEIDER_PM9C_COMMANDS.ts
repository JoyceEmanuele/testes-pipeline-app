import * as sqldb from '../connectSql'


export function getCommandsList (qPars: {
}) {
  let sentence = `
    SELECT
        COMMAND,
        SYS_ID,
        ADDRESS,
        DESCRIPTION,
        IP,
        ID,
        SIZE,
        FUNC_ID,
        R_W,
        UNIT,
        FORMULA,
        ALIAS,
        HAS_SIGNAL
  `

  sentence += `
    FROM
      SCHNEIDER_PM9C_COMMANDS
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
    HAS_SIGNAL: string
  }>(sentence, qPars)
}
import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../helpers/logger'

/* @IFHELPER:FUNC insert = INSERT
  FROM CURRENT_AUTOMATIONS_PARAMETERS
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LAST_AUTOMATION_DEVICE_TYPE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ACTION_MODE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ACTION_TIME
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.MODE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.FORCED_BEHAVIOR
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.IR_ID_COOL
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LTC
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LTI
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.SCHEDULE_END_BEHAVIOR
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.SCHEDULE_START_BEHAVIOR
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.SETPOINT
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.LAST_CHANGE_IN_MULTIPLE_SCHEDULE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.PORT_CFG
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.RESENDPER
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.DAT_BEGAUT
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ECO_CFG
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ECO_INT_TIME
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_START
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_END
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.EXT_THERM_CFG
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.FAULTS_DATA
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.FU_NOM
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.MAXIMUM_TEMPERATURE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.MINIMUM_TEMPERATURE
  FIELD CURRENT_AUTOMATIONS_PARAMETERS.SELF_REFERENCE
*/

type TQparsInsert = {
  LAST_AUTOMATION_DEVICE_TYPE?: string,
  LAST_PROG?: string,
  DESIRED_PROG?: string,
  ACTION_MODE?: string,
  ACTION_TIME?: string,
  ACTION_POST_BEHAVIOR?: string,
  MODE?: string,
  FORCED_BEHAVIOR?: string,
  IR_ID_COOL?: string,
  LOWER_HYSTERESIS?: number,
  UPPER_HYSTERESIS?: number,
  LTC?: number,
  LTI?: number,
  SCHEDULE_END_BEHAVIOR?: string,
  SCHEDULE_START_BEHAVIOR?: string,
  SETPOINT?: number,
  LAST_CHANGE_IN_MULTIPLE_SCHEDULE?: string,
  PORT_CFG?: string,
  RESENDPER?: number,
  DAT_BEGAUT?: string,
  ECO_CFG?: string,
  ECO_INT_TIME?: number,
  ECO_OFST_START?: number,
  ECO_OFST_END?: number,
  ENABLE_ECO?: number,
  EXT_THERM_CFG?: string,
  FAULTS_DATA?: string,
  FU_NOM?: number,
  MAXIMUM_TEMPERATURE?: number,
  MINIMUM_TEMPERATURE?: number,
  SELF_REFERENCE?: number,
  SETPOINT_ECO_REAL_TIME?: number,
}

function generateFieldsInsertPart3(qPars: TQparsInsert, fields: string[]) {
  if (qPars.FU_NOM !== undefined) fields.push('FU_NOM');
  if (qPars.MAXIMUM_TEMPERATURE !== undefined) fields.push('MAXIMUM_TEMPERATURE');
  if (qPars.MINIMUM_TEMPERATURE !== undefined) fields.push('MINIMUM_TEMPERATURE');
  if (qPars.SELF_REFERENCE !== undefined) fields.push('SELF_REFERENCE');
  if (qPars.SETPOINT_ECO_REAL_TIME !== undefined) fields.push('SETPOINT_ECO_REAL_TIME');
}

function generateFieldsInsertPart2(qPars: TQparsInsert, fields: string[]) {
  if (qPars.SETPOINT !== undefined) fields.push('SETPOINT');
  if (qPars.LAST_CHANGE_IN_MULTIPLE_SCHEDULE !== undefined) fields.push('LAST_CHANGE_IN_MULTIPLE_SCHEDULE');
  if (qPars.PORT_CFG !== undefined) fields.push('PORT_CFG');
  if (qPars.RESENDPER !== undefined) fields.push('RESENDPER');
  if (qPars.DAT_BEGAUT !== undefined) fields.push('DAT_BEGAUT');
  if (qPars.ECO_CFG !== undefined) fields.push('ECO_CFG');
  if (qPars.ECO_INT_TIME !== undefined) fields.push('ECO_INT_TIME');
  if (qPars.ECO_OFST_START !== undefined) fields.push('ECO_OFST_START');
  if (qPars.ECO_OFST_END !== undefined) fields.push('ECO_OFST_END');
  if (qPars.ENABLE_ECO !== undefined) fields.push('ENABLE_ECO');
  if (qPars.EXT_THERM_CFG !== undefined) fields.push('EXT_THERM_CFG');
  if (qPars.FAULTS_DATA !== undefined) fields.push('FAULTS_DATA');
}

function generateFieldsInsertPart1(qPars: TQparsInsert) {
  const fields: string[] = []
  if (qPars.LAST_AUTOMATION_DEVICE_TYPE !== undefined) fields.push('LAST_AUTOMATION_DEVICE_TYPE');
  if (qPars.LAST_PROG !== undefined) fields.push('LAST_PROG');
  if (qPars.DESIRED_PROG !== undefined) fields.push('DESIRED_PROG');
  if (qPars.ACTION_MODE !== undefined) fields.push('ACTION_MODE');
  if (qPars.ACTION_POST_BEHAVIOR !== undefined) fields.push('ACTION_POST_BEHAVIOR');
  if (qPars.ACTION_TIME !== undefined) fields.push('ACTION_TIME');
  if (qPars.MODE !== undefined) fields.push('MODE');
  if (qPars.FORCED_BEHAVIOR !== undefined) fields.push('FORCED_BEHAVIOR');
  if (qPars.IR_ID_COOL !== undefined) fields.push('IR_ID_COOL');
  if (qPars.LOWER_HYSTERESIS !== undefined) fields.push('LOWER_HYSTERESIS');
  if (qPars.UPPER_HYSTERESIS !== undefined) fields.push('UPPER_HYSTERESIS');
  if (qPars.LTC !== undefined) fields.push('LTC');
  if (qPars.LTI !== undefined) fields.push('LTI');
  if (qPars.SCHEDULE_END_BEHAVIOR !== undefined) fields.push('SCHEDULE_END_BEHAVIOR');
  if (qPars.SCHEDULE_START_BEHAVIOR !== undefined) fields.push('SCHEDULE_START_BEHAVIOR');
  generateFieldsInsertPart2(qPars, fields);
  generateFieldsInsertPart3(qPars, fields);
  return fields;
}


export async function w_insert (qPars: TQparsInsert, operationLogData: OperationLogData) {
  const fields: string[] = generateFieldsInsertPart1(qPars);

  const sentence = `INSERT INTO CURRENT_AUTOMATIONS_PARAMETERS (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  
/* @IFHELPER:FUNC updateInfo = UPDATE
  FROM CURRENT_AUTOMATIONS_PARAMETERS
  FIELD [[IFOWNPROP {:LAST_AUTOMATION_DEVICE_TYPE}]] AUTOMATIONS_PERIODS.LAST_AUTOMATION_DEVICE_TYPE
  FIELD [[IFOWNPROP {:LAST_PROG}]] AUTOMATIONS_PERIODS.LAST_PROG
  FIELD [[IFOWNPROP {:DESIRED_PROG}]] AUTOMATIONS_PERIODS.DESIRED_PROG
  FIELD [[IFOWNPROP {:ACTION_MODE}]] AUTOMATIONS_PERIODS.ACTION_MODE
  FIELD [[IFOWNPROP {:ACTION_TIME}]] AUTOMATIONS_PERIODS.ACTION_TIME
  FIELD [[IFOWNPROP {:MODE}]] AUTOMATIONS_PERIODS.MODE
  FIELD [[IFOWNPROP {:FORCED_BEHAVIOR}]] AUTOMATIONS_PERIODS.FORCED_BEHAVIOR
  FIELD [[IFOWNPROP {:IR_ID_COOL}]] AUTOMATIONS_PERIODS.IR_ID_COOL
  FIELD [[IFOWNPROP {:LOWER_HYSTERESIS}]] AUTOMATIONS_PERIODS.LOWER_HYSTERESIS
  FIELD [[IFOWNPROP {:UPPER_HYSTERESIS}]] AUTOMATIONS_PERIODS.UPPER_HYSTERESIS
  FIELD [[IFOWNPROP {:LTC}]] AUTOMATIONS_PERIODS.LTC
  FIELD [[IFOWNPROP {:LTI}]] AUTOMATIONS_PERIODS.LTI
  FIELD [[IFOWNPROP {:SCHEDULE_END_BEHAVIOR}]] AUTOMATIONS_PERIODS.SCHEDULE_END_BEHAVIOR
  FIELD [[IFOWNPROP {:SCHEDULE_START_BEHAVIOR}]] AUTOMATIONS_PERIODS.SCHEDULE_START_BEHAVIOR
  FIELD [[IFOWNPROP {:SETPOINT}]] AUTOMATIONS_PERIODS.SETPOINT
  FIELD [[IFOWNPROP {:LAST_CHANGE_IN_MULTIPLE_SCHEDULE}]] AUTOMATIONS_PERIODS.LAST_CHANGE_IN_MULTIPLE_SCHEDULE
  FIELD [[IFOWNPROP {:PORT_CFG}]] AUTOMATIONS_PERIODS.PORT_CFG
  FIELD [[IFOWNPROP {:RESENDPER}]] AUTOMATIONS_PERIODS.RESENDPER
  FIELD [[IFOWNPROP {:DAT_BEGAUT}]] AUTOMATIONS_PERIODS.DAT_BEGAUT
  FIELD [[IFOWNPROP {:ECO_CFG}]] AUTOMATIONS_PERIODS.ECO_CFG
  FIELD [[IFOWNPROP {:ECO_INT_TIME}]] AUTOMATIONS_PERIODS.ECO_INT_TIME
  FIELD [[IFOWNPROP {:ECO_OFST_START}]] AUTOMATIONS_PERIODS.ECO_OFST_START
  FIELD [[IFOWNPROP {:ECO_OFST_END}]] AUTOMATIONS_PERIODS.ECO_OFST_END
  FIELD [[IFOWNPROP {:ENABLE_ECO}]] AUTOMATIONS_PERIODS.ENABLE_ECO
  FIELD [[IFOWNPROP {:EXT_THERM_CFG}]] AUTOMATIONS_PERIODS.EXT_THERM_CFG
  FIELD [[IFOWNPROP {:FAULTS_DATA}]] AUTOMATIONS_PERIODS.FAULTS_DATA
  FIELD [[IFOWNPROP {:FU_NOM}]] AUTOMATIONS_PERIODS.FU_NOM
  FIELD [[IFOWNPROP {:MAXIMUM_TEMPERATURE}]] AUTOMATIONS_PERIODS.MAXIMUM_TEMPERATURE
  FIELD [[IFOWNPROP {:MINIMUM_TEMPERATURE}]] AUTOMATIONS_PERIODS.MINIMUM_TEMPERATURE
  FIELD [[IFOWNPROP {:SELF_REFERENCE}]] AUTOMATIONS_PERIODS.SELF_REFERENCE
  FIELD [[IFOWNPROP {:SETPOINT_ECO_REAL_TIME}]] AUTOMATIONS_PERIODS.SETPOINT_ECO_REAL_TIME
  WHERE {CURRENT_AUTOMATIONS_PARAMETERS.ID} = {:ID}
*/

type TQparsUpdateInfo = {
  ID: number,
  LAST_AUTOMATION_DEVICE_TYPE?: string,
  LAST_PROG?: string,
  DESIRED_PROG?: string,
  ACTION_MODE?: string,
  ACTION_POST_BEHAVIOR?: string,
  ACTION_TIME?: number,
  MODE?: string,
  FORCED_BEHAVIOR?: string,
  IR_ID_COOL?: string,
  LOWER_HYSTERESIS?: number,
  UPPER_HYSTERESIS?: number,
  LTC?: number,
  LTI?: number,
  SCHEDULE_END_BEHAVIOR?: string,
  SCHEDULE_START_BEHAVIOR?: string,
  SETPOINT?: number,
  LAST_CHANGE_IN_MULTIPLE_SCHEDULE?: string,
  PORT_CFG?: string,
  RESENDPER?: number,
  DAT_BEGAUT?: string,
  ECO_CFG?: string,
  ECO_INT_TIME?: number,
  ECO_OFST_START?: number,
  ECO_OFST_END?: number,
  ENABLE_ECO?: number,
  ENABLE_ECO_LOCAL?: number,
  EXT_THERM_CFG?: string,
  FAULTS_DATA?: string,
  FU_NOM?: number,
  MAXIMUM_TEMPERATURE?: number,
  MINIMUM_TEMPERATURE?: number,
  SELF_REFERENCE?: number,
  SETPOINT_ECO_REAL_TIME?: number,
  FIRST_PROGRAMMING_DATE?: string,
  RESEND_PROGRAMMING?: number,
  AUTOMATION_INTERVAL?: number,
}
function generateFieldsUpdateInfoPart3(qPars: TQparsUpdateInfo, fields: string[]){
  if (qPars.EXT_THERM_CFG !== undefined) { fields.push('EXT_THERM_CFG = :EXT_THERM_CFG') }
  if (qPars.FAULTS_DATA !== undefined) { fields.push('FAULTS_DATA = :FAULTS_DATA') }
  if (qPars.FU_NOM !== undefined) { fields.push('FU_NOM = :FU_NOM') }
  if (qPars.MAXIMUM_TEMPERATURE !== undefined) { fields.push('MAXIMUM_TEMPERATURE = :MAXIMUM_TEMPERATURE') }
  if (qPars.MINIMUM_TEMPERATURE !== undefined) { fields.push('MINIMUM_TEMPERATURE = :MINIMUM_TEMPERATURE') }
  if (qPars.SELF_REFERENCE !== undefined) { fields.push('SELF_REFERENCE = :SELF_REFERENCE') }
  if (qPars.SETPOINT_ECO_REAL_TIME !== undefined) { fields.push('SETPOINT_ECO_REAL_TIME = :SETPOINT_ECO_REAL_TIME') }
  if (qPars.FIRST_PROGRAMMING_DATE !== undefined) { fields.push('FIRST_PROGRAMMING_DATE = :FIRST_PROGRAMMING_DATE') }
  if (qPars.RESEND_PROGRAMMING !== undefined) { fields.push('RESEND_PROGRAMMING = :RESEND_PROGRAMMING') }
  if (qPars.AUTOMATION_INTERVAL !== undefined) { fields.push('AUTOMATION_INTERVAL = :AUTOMATION_INTERVAL') }
}

function generateFieldsUpdateInfoPart2(qPars: TQparsUpdateInfo, fields: string[]){
  if (qPars.SETPOINT !== undefined) { fields.push('SETPOINT = :SETPOINT') }
  if (qPars.LAST_CHANGE_IN_MULTIPLE_SCHEDULE !== undefined) { fields.push('LAST_CHANGE_IN_MULTIPLE_SCHEDULE = :LAST_CHANGE_IN_MULTIPLE_SCHEDULE') }
  if (qPars.PORT_CFG !== undefined) { fields.push('PORT_CFG = :PORT_CFG') }
  if (qPars.RESENDPER !== undefined) { fields.push('RESENDPER = :RESENDPER') }
  if (qPars.DAT_BEGAUT !== undefined) { fields.push('DAT_BEGAUT = :DAT_BEGAUT') }
  if (qPars.ECO_CFG !== undefined) { fields.push('ECO_CFG = :ECO_CFG') }
  if (qPars.ECO_INT_TIME !== undefined) { fields.push('ECO_INT_TIME = :ECO_INT_TIME') }
  if (qPars.ECO_OFST_START !== undefined) { fields.push('ECO_OFST_START = :ECO_OFST_START') }
  if (qPars.ECO_OFST_END !== undefined) { fields.push('ECO_OFST_END = :ECO_OFST_END') }
  if (qPars.ENABLE_ECO !== undefined) { fields.push('ENABLE_ECO = :ENABLE_ECO') }
  if (qPars.ENABLE_ECO_LOCAL !== undefined) { fields.push('ENABLE_ECO_LOCAL = :ENABLE_ECO_LOCAL') }
}

function generateFieldsUpdateInfoPart1(qPars: TQparsUpdateInfo) {
  const fields: string[] = []
  if (qPars.LAST_AUTOMATION_DEVICE_TYPE !== undefined) { fields.push('LAST_AUTOMATION_DEVICE_TYPE = :LAST_AUTOMATION_DEVICE_TYPE') }
  if (qPars.LAST_PROG !== undefined) { fields.push('LAST_PROG = :LAST_PROG') }
  if (qPars.DESIRED_PROG !== undefined) { fields.push('DESIRED_PROG = :DESIRED_PROG') }
  if (qPars.ACTION_MODE !== undefined) { fields.push('ACTION_MODE = :ACTION_MODE') }
  if (qPars.ACTION_POST_BEHAVIOR !== undefined) { fields.push('ACTION_POST_BEHAVIOR = :ACTION_POST_BEHAVIOR') }
  if (qPars.ACTION_TIME !== undefined) { fields.push('ACTION_TIME = :ACTION_TIME') }
  if (qPars.MODE !== undefined) { fields.push('MODE = :MODE') }
  if (qPars.FORCED_BEHAVIOR !== undefined) { fields.push('FORCED_BEHAVIOR = :FORCED_BEHAVIOR') }
  if (qPars.IR_ID_COOL !== undefined) { fields.push('IR_ID_COOL = :IR_ID_COOL') }
  if (qPars.LOWER_HYSTERESIS !== undefined) { fields.push('LOWER_HYSTERESIS = :LOWER_HYSTERESIS') }
  if (qPars.UPPER_HYSTERESIS !== undefined) { fields.push('UPPER_HYSTERESIS = :UPPER_HYSTERESIS') }
  if (qPars.LTC !== undefined) { fields.push('LTC = :LTC') }
  if (qPars.LTI !== undefined) { fields.push('LTI = :LTI') }
  if (qPars.SCHEDULE_END_BEHAVIOR !== undefined) { fields.push('SCHEDULE_END_BEHAVIOR = :SCHEDULE_END_BEHAVIOR') }
  if (qPars.SCHEDULE_START_BEHAVIOR !== undefined) { fields.push('SCHEDULE_START_BEHAVIOR = :SCHEDULE_START_BEHAVIOR') }
  generateFieldsUpdateInfoPart2(qPars, fields);
  generateFieldsUpdateInfoPart3(qPars, fields);
  return fields;
}

export async function w_updateInfo (qPars: TQparsUpdateInfo, operationLogData: OperationLogData) {
  const fields: string[] = generateFieldsUpdateInfoPart1(qPars);
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  const sentence = `UPDATE CURRENT_AUTOMATIONS_PARAMETERS SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
    dbLogger('CURRENT_AUTOMATIONS_PARAMETERS', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}
  

export function getCurrentAutomationsParametersByDevice (qPars: {
  DEVICE_CODE: string,
}) {
  let sentence = `
    SELECT DISTINCT
      CURRENT_AUTOMATIONS_PARAMETERS.ID AS ID,
      DAMS_DEVICES.ID AS DAM_DEVICE_ID,
      DUTS_DEVICES.ID AS DUT_DEVICE_ID,
      DACS_DEVICES.ID AS DAC_DEVICE_ID,
      DRIS_DEVICES.ID AS DRI_DEVICE_ID,
      DACS_AUTOMATIONS.ID AS DAC_AUTOMATION_ID,
      CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG,
      CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG,
      CURRENT_AUTOMATIONS_PARAMETERS.FIRST_PROGRAMMING_DATE
  `
  sentence += `
    FROM
      DEVICES
      LEFT JOIN DUTS_DEVICES ON (DEVICES.ID = DUTS_DEVICES.DEVICE_ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.DUT_DEVICE_ID = DUTS_DEVICES.ID)
      LEFT JOIN DACS_DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
      LEFT JOIN DACS_AUTOMATIONS ON (DACS_AUTOMATIONS.DAC_DEVICE_ID = DACS_DEVICES.ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_DEVICES ON (DRIS_DEVICES.DEVICE_ID = DEVICES.ID)
      LEFT JOIN DRIS_AUTOMATIONS ON (DRIS_AUTOMATIONS.DRI_DEVICE_ID = DRIS_DEVICES.ID)
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_ILLUMINATIONS.DAM_DEVICE_ID = DAMS_DEVICES.ID)
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (
        MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID = COALESCE(DUTS_AUTOMATION.MACHINE_ID, DACS_AUTOMATIONS.MACHINE_ID, DAMS_AUTOMATIONS.MACHINE_ID, DRIS_AUTOMATIONS.MACHINE_ID)
      )
      LEFT JOIN ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ON (
        ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID = DAMS_ILLUMINATIONS.ILLUMINATION_ID
      )
      INNER JOIN CURRENT_AUTOMATIONS_PARAMETERS ON (
        CURRENT_AUTOMATIONS_PARAMETERS.ID = COALESCE(MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID, ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID)
      )
 `

  const conditions: string[] = []
  if (qPars.DEVICE_CODE != null) { conditions.push(`DEVICES.DEVICE_CODE = :DEVICE_CODE`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID: number
    DAM_DEVICE_ID: number
    DUT_DEVICE_ID: number
    DAC_DEVICE_ID: number
    DRI_DEVICE_ID: number
    DAC_AUTOMATION_ID: number
    DESIRED_PROG: string
    LAST_PROG: string
    FIRST_PROGRAMMING_DATE: string
  }>(sentence, qPars)
}

export function getCurrentAutomationsParameters (qPars: {
  ID: number,
}) {
  let sentence = `
    SELECT
      CURRENT_AUTOMATIONS_PARAMETERS.ID AS ID,
      CURRENT_AUTOMATIONS_PARAMETERS.LAST_AUTOMATION_DEVICE_TYPE,
      CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG,
      CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG,
      CURRENT_AUTOMATIONS_PARAMETERS.ACTION_MODE,
      CURRENT_AUTOMATIONS_PARAMETERS.ACTION_TIME,
      CURRENT_AUTOMATIONS_PARAMETERS.ACTION_POST_BEHAVIOR,
      CURRENT_AUTOMATIONS_PARAMETERS.MODE,
      CURRENT_AUTOMATIONS_PARAMETERS.FORCED_BEHAVIOR,
      CURRENT_AUTOMATIONS_PARAMETERS.IR_ID_COOL,
      CURRENT_AUTOMATIONS_PARAMETERS.LOWER_HYSTERESIS,
      CURRENT_AUTOMATIONS_PARAMETERS.UPPER_HYSTERESIS,
      CURRENT_AUTOMATIONS_PARAMETERS.LTC,
      CURRENT_AUTOMATIONS_PARAMETERS.LTI,
      CURRENT_AUTOMATIONS_PARAMETERS.SCHEDULE_END_BEHAVIOR,
      CURRENT_AUTOMATIONS_PARAMETERS.SCHEDULE_START_BEHAVIOR,
      CURRENT_AUTOMATIONS_PARAMETERS.SETPOINT,
      CURRENT_AUTOMATIONS_PARAMETERS.LAST_CHANGE_IN_MULTIPLE_SCHEDULE,
      CURRENT_AUTOMATIONS_PARAMETERS.PORT_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.RESENDPER,
      CURRENT_AUTOMATIONS_PARAMETERS.DAT_BEGAUT,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_INT_TIME,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_START,
      CURRENT_AUTOMATIONS_PARAMETERS.ECO_OFST_END,
      CURRENT_AUTOMATIONS_PARAMETERS.ENABLE_ECO,
      CURRENT_AUTOMATIONS_PARAMETERS.EXT_THERM_CFG,
      CURRENT_AUTOMATIONS_PARAMETERS.FAULTS_DATA,
      CURRENT_AUTOMATIONS_PARAMETERS.FU_NOM,
      CURRENT_AUTOMATIONS_PARAMETERS.MAXIMUM_TEMPERATURE,
      CURRENT_AUTOMATIONS_PARAMETERS.MINIMUM_TEMPERATURE,
      CURRENT_AUTOMATIONS_PARAMETERS.SELF_REFERENCE,
      CURRENT_AUTOMATIONS_PARAMETERS.SETPOINT_ECO_REAL_TIME
  `
  sentence += `
    FROM
      CURRENT_AUTOMATIONS_PARAMETERS
 `

  const conditions: string[] = []
  if (qPars.ID != null) { conditions.push(`CURRENT_AUTOMATIONS_PARAMETERS.ID = :ID`) }

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.querySingle<{
    ID: number
    LAST_AUTOMATION_DEVICE_TYPE: string,
    LAST_PROG: string,
    DESIRED_PROG: string,
    ACTION_MODE: string,
    ACTION_TIME: string,
    ACTION_POST_BEHAVIOR: string,
    MODE: string,
    FORCED_BEHAVIOR: string,
    IR_ID_COOL: string,
    LOWER_HYSTERESIS: number,
    UPPER_HYSTERESIS: number,
    LTC: number,
    LTI: number,
    SCHEDULE_END_BEHAVIOR: string,
    SCHEDULE_START_BEHAVIOR: string,
    SETPOINT: number,
    LAST_CHANGE_IN_MULTIPLE_SCHEDULE: string
    PORT_CFG: string,
    RESENDPER: number,
    DAT_BEGAUT: string,
    ECO_CFG: string,
    ECO_INT_TIME: number,
    ECO_OFST_START: number,
    ECO_OFST_END: number,
    ENABLE_ECO: number,
    EXT_THERM_CFG: string,
    FAULTS_DATA: string,
    FU_NOM: number,
    MAXIMUM_TEMPERATURE: number,
    MINIMUM_TEMPERATURE: number,
    SELF_REFERENCE: number,
    SETPOINT_ECO_REAL_TIME: number,
  }>(sentence, qPars)
}

export function getCurrentAutomationsParametersToResendProgramming () {
  let sentence = `
    SELECT
      CURRENT_AUTOMATIONS_PARAMETERS.ID AS CURRENT_AUTOMATION_PARAMETERS_ID,
      DEVICES.DEVICE_CODE AS DEVICE_CODE,
      DAMS_DEVICES.ID AS DAM_DEVICE_ID,
      DACS_DEVICES.ID AS DAC_DEVICE_ID,
      DUTS_DEVICES.ID AS DUT_DEVICE_ID,
      CURRENT_AUTOMATIONS_PARAMETERS.LAST_PROG AS LAST_PROG,
      CURRENT_AUTOMATIONS_PARAMETERS.DESIRED_PROG AS DESIRED_PROG
  `
  sentence += `
    FROM 
      CURRENT_AUTOMATIONS_PARAMETERS
      LEFT JOIN MACHINES_CURRENT_AUTOMATIONS_PARAMETERS ON (MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID = CURRENT_AUTOMATIONS_PARAMETERS.ID)
      LEFT JOIN ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ON (ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.CURRENT_AUTOMATION_PARAMETERS_ID = CURRENT_AUTOMATIONS_PARAMETERS.ID)
      LEFT JOIN DAMS_ILLUMINATIONS ON (DAMS_ILLUMINATIONS.ILLUMINATION_ID = ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS.ILLUMINATION_ID)
      LEFT JOIN DAMS_AUTOMATIONS ON (DAMS_AUTOMATIONS.MACHINE_ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID)
      LEFT JOIN DUTS_AUTOMATION ON (DUTS_AUTOMATION.MACHINE_ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID)
      LEFT JOIN DACS_AUTOMATIONS ON (DACS_AUTOMATIONS.MACHINE_ID = MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.MACHINE_ID)
      LEFT JOIN DAMS_DEVICES ON (DAMS_DEVICES.ID = COALESCE(DAMS_AUTOMATIONS.DAM_DEVICE_ID, DAMS_ILLUMINATIONS.DAM_DEVICE_ID))
      LEFT JOIN DUTS_DEVICES ON (DUTS_DEVICES.ID = DUTS_AUTOMATION.DUT_DEVICE_ID)
      LEFT JOIN DACS_DEVICES ON (DACS_DEVICES.ID = DACS_AUTOMATIONS.DAC_DEVICE_ID)
      LEFT JOIN DEVICES ON (DEVICES.ID = COALESCE(DAMS_DEVICES.DEVICE_ID, DUTS_DEVICES.DEVICE_ID, DACS_DEVICES.DEVICE_ID))
 `

  const conditions: string[] = []
  conditions.push(`CURRENT_AUTOMATIONS_PARAMETERS.RESEND_PROGRAMMING = 1`);

  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    CURRENT_AUTOMATION_PARAMETERS_ID: number
    DEVICE_CODE: string,
    DAM_DEVICE_ID: number,
    DAC_DEVICE_ID: number,
    DUT_DEVICE_ID: number,
    LAST_PROG: string,
    DESIRED_PROG: string,
  }>(sentence)
}

export function getAllModes() {
  let sentence = `
    SELECT DISTINCT
      CURRENT_AUTOMATIONS_PARAMETERS.MODE AS MODE
  `
  sentence += `
    FROM
      CURRENT_AUTOMATIONS_PARAMETERS
    WHERE CURRENT_AUTOMATIONS_PARAMETERS.MODE IS NOT NULL
 `
  return sqldb.query<{
    MODE: string,
  }>(sentence)
}
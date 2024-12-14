interface DevMessage_OTA {
  ['new-version']: {
    host: string
    port: number
    path: string
  }
}
interface DevMessage_ValidateFwVersion {
  ['validate-version']: boolean
}
interface DevMessage_GetFwVersion {
  ['version-request']: 1
}
// {
//   "data-request" : "connection_data" | "version_data"
// }

export interface DevMessage_TimeSync {
  msgtype: "SYNC"
  TIME: number
  TZ: string
}
export interface DevSetTimezoneRefatorado {
  msgtype: "SYNC"
  tz: string
  time: number
}

export interface DamMessage_SetException {
  exception: {
    date: { day: number, month: number, year: number }
    programming: {
      begin: { hours: number, minutes: number }
      end: { hours: number, minutes: number }
      command?: 'Disabled' | 'Enabled' | 'Ventilation'
    }
  }
}
export interface DamMessage_EraseException {
  ['erase-exception']: {
    date: { day: number, month: number, year: number }
  }
}
export interface DamMessage_EraseProgramming {
  ['erase-programming']: number // 0=segunda 6=domingo
}
export interface DamMessage_SetProgramming {
  begin: { hours: number, minutes: number }
  end: { hours: number, minutes: number }
  type: number // 0=segunda 6=domingo
  command: 'Disabled' | 'Enabled' | 'Ventilation'
}
export interface DamMessage_SetVentilation {
  ventilation: number
  ventilation_end: number
}
export interface DamMessage_SetMode {
  mode: 'Auto' | 'Manual' // 0 | 1
}
export interface DamMessage_SetBypass {
  bypass: 0 | 1 | 2 | 6 // 'allow' | 'forbid' | 'onlyfan' | 'thermostat'
}
interface DamMessage_GetProgramming {
  ['programming-request']: 1
}
interface DevMessage_RealTime {
  rt: 1 | 0
}

interface DamMessage_TemperatureSetpoint {
  setpoint : {
    min : number,
    max : number
  }
}

export interface DamMessage_EcoMode {
  "eco-programming": {
    start: string // "2020-10-27T16:12:00", //timestamp no mesmo formato que o device envia na telemetria
    duration: number, // 2, //tempo em minutos para o qual a programação se aplica
    command: 'Enabled'|'Disabled'|'Ventilation'|'Condenser 1'|'Condenser 2' // estado do device nesse intervalo
  }
}

interface DutCmdSetIrCodeDeprecated {
  msgtype: "set-ir-code",
  name: string, // "AC_OFF"|"AC_COOL"|"AC_FAN",
  temperature?: number, // 21
  data: any, // [4466,-4365,560,...,612,-1569,612,0]
  data_id: string,
}

interface DutCmdSetIrCode {
  msgtype: "save_raw_ir",
  command: string, // "Fan"|"Off"|"SETX",
  ir_code: any, // [4466,-4365,560,...,612,-1569,612,0]
}
// interface DutCmd_SetIrCodes {
//   msgtype: "set-ir-codes",
//   AC_OFF?: any,
//   AC_COOL?: any,
//   AC_FAN?: any,
// }
interface DutCmd_GetIrCodesIds {
  msgtype: "get-ir-codes-ids",
}
interface DutCmd_SendIrCode {
  msgtype: "send-ir-code",
  ir_code: any,
}
interface DutCmd_SendCommand {
  msgtype: "send-command",
  command: string,
}
// interface DutCmd_SetGroup {
//   group: string
// }

interface DutCmdSetIrLearnDeprecated {
  msgtype: "set-ir-learn",
  enabled: boolean,
}

interface DutCmdSetIrLearn {
  msgtype: "set_ir_learning",
  enabled: boolean,
}

interface DutCmdEraseIr {
  msgtype: "erase_raw_ir",
  command: string,
}
export interface DutCmd_SetTemperatureControl {
  msgtype: "set-temperature-control",
  temperature?: number,
  LTC?: number,
  mode: number, // 0-OP_NO_CONTROL, 1-OP_CONTROL, 2-OP_SOB_DEMANDA, 3-OP_BACKUP
  enabled?: boolean,
  LTI?: number,
  action?: string,
  action_interval?: number
  action_post?: string
}
export interface DutCmd_SetV3Control {
  msgtype: "set-v3-control",
  temperature: number,
  setpoint: number,
  LTC: number,
  LTI: number,
  mode: number, //8_ECO_2
  enabled: boolean,
  hist_sup: number,
  hist_inf: number,
}
export interface DutCmd_ForcedParams {
  msgtype: "set-lock-mode",
  mode: number,
}
export interface DutCmd_GetTemperatureControlState {
  msgtype: "get-temperature-control-state"
}
interface DutCmd_GetV3ControlState {
  msgtype: "get-v3-control-state"
}
interface DutCmd_SetRmtCycle {
  msgtype: "set-rmt-cycle"
  period: number
}
interface DutCmd_GetRmtCycle {
  msgtype: "get-rmt-cycle"
}
export interface DamCmd_SetEcoCfg {
  "msgtype": "set-eco-cfg"
  "en_eco": 0|1     // 0 = eco desativado, 1 = eco ativado
  "remote_dut": 0|1 // 0 = sem dut de referência, 1 = com dut de referência
}
export interface DamCmd_SetLocalEcoCfg {
  "msgtype": "set-eco-local-cfg"
  "en_ecolocal": 0|1 // 0 = remote, 1 = local
  "setpoint": number // ex: 25°C (to DAMs above 2_7_0, multiple by 10)
  "hist_sup": number // ex: 1°C (to DAMs above 2_7_0, multiple by 10)
  "hist_inf": number // ex: 1°C (to DAMs above 2_7_0, multiple by 10)
  "interval": number // ex: 300 seconds
  "en_eco"?: 0|1 // 0 = eco disabled, 1 = eco enabled
  "en_remote_dut"?: number // 0 = without reference dut, 1 = with reference dut
  "ext_ref_devid"?: string // ex: 'DUT123456789' (empty meaning DUT incompatible)
  "ext_ref_offset"?: number, // ex:10 (1 °C)
  "int_ref_offset"?: number, // ex:10 (1 °C)
}

export interface DamCmd_SetExtThermCfg {
  msgtype: "set-thermostat-cfg",
  value: number
}

export interface DamCmd_SetSensorsTemperature {
  msgtype: "set-sensors-temperature",
  number_sensors: number
}

export interface DamCmd_Reset {
  msgtype: "software-reset-device",
}

interface DutCmd_SetControlPortMode {
  msgtype: "set-control-mode"
  mode: 0|1 // 0=LED, 1=RELAY
}
interface DutCmd_GetControlPortMode {
  msgtype: "get-control-mode"
}
interface DutCmd_SetSensorAutomation {
  msgtype: "set-sensor-automation"
  index: number
  number_sensors: number
}


interface DutCmdSetSensorAutomationV2 {
  msgtype: "set_sensor_temperature"
  number_sensors: number
  sensor_autom_index: number
}

interface DutCmd_Reset {
  msgtype: "software-reset-device",
}

interface DevMessage_SamplingConfig {
  msgtype: "set-sampling-config"
  samplingPeriod: number
  samplesPerPackage: number
}

interface DmaCmd_OperationMode {
  operation_mode: number
}

interface DmaCmd_LogicLevel {
  msgtype: "set-pcnt-logic-level"
  mode: number
}

export interface DamMessage_SetSchedulerWeek {
  msgtype: 'set-scheduler-week',
  machine: number,
  days: string[],
  default_mode: string[],
  schedule: {
    start: string,
    end: string,
    mode: string[],
  }[],
}

export interface DamMessage_SetSchedulerException {
  msgtype: "set-scheduler-exceptions";
  machine: number;
  exceptions: {
      [date: string]: {
          default_mode: string[];
          schedule: {
            start: string,
            end: string,
            mode: string[],
          }[];
      };
  };
}

export interface DamMessageGetSchedulerInfo {
  msgtype: "get-scheduler-info"
}

export interface DamMessage_SetSchedulerConfig {
  msgtype: "set-scheduler-cfg",
  automation_interval: number,
  cmds_interval: number,
}

export interface DalMessage_SetMode {
  msgtype: "set-operation-mode",
  relays: number,
  mode: "AUTO"|"MANUAL"
}

export interface DalMessage_SetRelays {
  msgtype: "set-relays",
  relays: number[],
  values: number[],
}

export interface SetMultProg {
  msgtype: "set-mult-prog",
  status: boolean
}



export type DamCommand = DevMessage_OTA
                       | DevMessage_ValidateFwVersion
                       | DevMessage_GetFwVersion
                       | DamMessage_EraseException
                       | DamMessage_EraseProgramming
                       | DamMessage_SetProgramming
                       | DamMessage_SetVentilation
                       | DamMessage_SetMode
                       | DamMessage_SetBypass
                       | DamMessage_GetProgramming
                       | DamMessage_SetException
                       | DamMessage_TemperatureSetpoint
                       | DamMessage_EcoMode
                       | DamCmd_SetLocalEcoCfg
                       | DamCmd_SetEcoCfg
                       | DamCmd_SetExtThermCfg
                       | DamCmd_SetSensorsTemperature
                       | DamCmd_Reset
                       | DamMessage_SetSchedulerWeek
                       | DamMessage_SetSchedulerException
                       | DamMessageGetSchedulerInfo
                       | DamMessage_SetSchedulerConfig

export type DacCommand = DevMessage_OTA
                       | DevMessage_ValidateFwVersion
                       | DevMessage_GetFwVersion
                       | DevMessage_RealTime

export type DutCommand = DevMessage_OTA
                       | DevMessage_ValidateFwVersion
                       | DevMessage_GetFwVersion
                       | DevMessage_RealTime
                       | DutCmdSetIrCode
                       | DutCmdSetIrCodeDeprecated
                       | DutCmd_GetIrCodesIds
                       | DutCmd_SendIrCode
                       | DutCmd_SendCommand
                       | DutCmdSetIrLearn
                       | DutCmdSetIrLearnDeprecated
                       | DutCmdEraseIr
                       | DamMessage_EraseException
                       | DamMessage_EraseProgramming
                       | DamMessage_SetProgramming
                       | DamMessage_SetVentilation
                       | DutCmd_SetTemperatureControl
                       | DutCmd_GetTemperatureControlState
                       | DutCmd_SetRmtCycle
                       | DutCmd_GetRmtCycle
                       | DutCmd_SetControlPortMode
                       | DutCmd_GetControlPortMode
                       | DutCmd_SetV3Control
                       | DutCmd_GetV3ControlState
                       | DutCmd_ForcedParams
                       | DutCmd_SetSensorAutomation
                       | DutCmdSetSensorAutomationV2
                       | DutCmd_Reset
                       | SetMultProg

export type OtaCommand = DevMessage_OTA
                       | DevMessage_ValidateFwVersion
                       | DevMessage_GetFwVersion

export type DmaCommand = DevMessage_SamplingConfig
                       | DmaCmd_OperationMode
                       | DmaCmd_LogicLevel

export type DalCommand = DalMessage_SetMode
                       | DalMessage_SetRelays
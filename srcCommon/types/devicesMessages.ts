import { ControlMode } from '../helpers/dutAutomation';

export interface DamDayProg {
  mode: 'Enabled' | 'Disabled'
  start: { hour: number, minute: number }
  end: { hour: number, minute: number }
}
export interface DamProgramming {
  dev_id: string
  monday?: DamDayProg
  tuesday?: DamDayProg
  wednesday?: DamDayProg
  thursday?: DamDayProg
  friday?: DamDayProg
  saturday?: DamDayProg
  sunday?: DamDayProg
  ventilation?: number
  exceptions?: { [date: string]: DamDayProg }
}
export interface MsgDamProgBasic {
  dev_id: string
  message_type: "programming"
  programming: {
   monday: string | DamDayProg
   tuesday: string | DamDayProg
   wednesday: string | DamDayProg
   thursday: string | DamDayProg
   friday: string | DamDayProg
   saturday: string | DamDayProg
   sunday: string | DamDayProg
  }
  ventilation: number
  ventilation_end: number
  exceptions: number
}

export interface MsgDamScheduler {
  dev_id: string
  msgtype: "echo_json_scheduler"
  json_data: string
  json_status: boolean
}

export interface MsgDamProgExcepts {
  dev_id: string
  message_type: "exceptions"
  tag: string
  exceptions: {
    [date: string]: DamDayProg
  }
}

export interface MsgDamGetScheduler {
  dev_id: string
  msgtype: "get-scheduler-info-week"
  weekday: string
  machine: number
  data: string
}

export interface MsgDamGetExceptions {
  dev_id: string
  msgtype: "get-scheduler-info-exceptions"
  machine: number
  data: string
}

export interface MsgDamExtThermCfg {
  dev_id: string
  msgtype: "return-thermostat-cfg"
  value: number
}

export interface MsgDamEchoJson {
  msgtype: "echo_json",
  dev_id: string
  json_data: string,
  json_status: number
}

interface DamTemporaryProgramming {
  start: string,
  duration: number,
  command: string
}

export interface MsgDamEcoProgramming {
  message_type: "eco_programming",
  temporary_programming: DamTemporaryProgramming,
  dev_id: string
}

export interface MsgDalEchoJson {
  msgtype: "echo_json",
  dev_id: string
  json_data: string,
  json_status: boolean
}

export interface ControlMsgFirmwareVersion {
  dev_id: string
  hardware_type: string
  firmware_version: string
  firmware_status?: string // "New", "Pending", "Valid", "Invalid" , "Aborted", "Undefined"
  last_update_result?: string
  dam_mode?: string // "Splitao", "Multi split"
  mac?: string
  message_type?: string;
  msgtype?: string;
}

export interface TelemetryDME {
  erro?: number | string
  timestamp: string,
  type?: string,
  v_a?: number,
  v_b?: number,
  v_c?: number,
  v_ab?: number,
  v_bc?: number,
  v_ca?: number,
  i_a?: number,
  i_b?: number,
  i_c?: number,
  pot_at_a?: number,
  pot_at_b?: number,
  pot_at_c?: number,
  pot_ap_a?: number,
  pot_ap_b?: number,
  pot_ap_c?: number,
  pot_re_a?: number,
  pot_re_b?: number,
  pot_re_c?: number,
  v_tri_ln?: number,
  v_tri_ll?: number,
  pot_at_tri?: number,
  pot_ap_tri?: number,
  pot_re_tri?: number,
  en_at_tri?: number,
  en_re_tri?: number,
  en_ap_tri?: number,
  fp_a?: number,
  fp_b?: number,
  fp_c?: number,
  fp?: number,
  freq?: number,
  demanda?: number,
  demanda_at?: number,
  demanda_ap?: number,
  demanda_med_at?: number,
  GMT?: number
}

export interface TelemetryVAV {
  TempAmb?: number,
  ValveOn?: number,
  Lock?: number,
  Setpoint?: number
  ThermOn?: number
  Fanspeed?: number
  Mode?: number | string
}
export interface TelemetryFancoil {
  TempAmb?: number,
  ValveOn?: number,
  Lock?: number,
  Setpoint?: number
  ThermOn?: number
  Fanspeed?: number
  Mode?: number | string
  FanStatus?: number
}

export interface TelemetryChillerCarrierHxGx {
	CHIL_S_S?:	number,
	ALM?: number,
	alarm_1?: number,
	alarm_2?: number,
	alarm_3?: number,
	alarm_4?: number,
	alarm_5?: number,
	CAP_T?: number,
	DEM_LIM?: number,
	LAG_LIM?: number,
	SP?: number,
	CTRL_PNT?: number,
	EMSTOP?: number,
	CP_A1?: number,
	CP_A2?: number,
	CAPA_T?: number,
	DP_A?: number,
	SP_A?: number,
	SCT_A?: number,
	SST_A?: number,
	CP_B1?: number,
	CP_B2?: number,
	CAPB_T?: number,
	DP_B?: number,
	SP_B?: number,
	SCT_B?: number,
	SST_B?: number,
	COND_LWT?: number,
	COND_EWT?: number,
	COOL_LWT?:	number,
	COOL_EWT?: number,
	CPA1_OP?: number,
	CPA2_OP?: number,
	DOP_A1?: number,
	DOP_A2?: number,
	CPA1_DGT?: number,
	CPA2_DGT?: number,
	EXV_A?: number,
	HR_CP_A1?:	number,
	HR_CP_A2?: number,
	CPA1_TMP?: number,
	CPA2_TMP?: number,
	CPA1_CUR?: number,
	CPA2_CUR?: number,
	CPB1_OP?: number,
	CPB2_OP?: number,
	DOP_B1?: number,
	DOP_B2?: number,
	CPB1_DGT?: number,
	CPB2_DGT?:	number,
	EXV_B?: number,
	HR_CP_B1?: number,
	HR_CP_B2?: number,
	CPB1_TMP?: number,
	CPB2_TMP?: number,
	CPB1_CUR?: number,
	CPB2_CUR?: number,
	COND_SP?: number,
	CHIL_OCC?: number,
	STATUS?:	number,
}

export interface TelemetryChillerCarrierXaXwXsXv {
	CAP_T?: number,
  CHIL_OCC?: number,
  CHIL_S_S?: number, 
  COND_EWT?: number, 
  COND_LWT?: number, 
  COOL_EWT?: number, 
  COOL_LWT?: number, 
  CTRL_PNT?: number, 
  CTRL_TYP?: number, 
  DEM_LIM?: number, 
  DP_A?: number, 
  DP_B?: number, 
  EMSTOP?: number, 
  HR_CP_A?: number, 
  HR_CP_B?: number, 
  HR_MACH?: number, 
  HR_MACH_B?: number, 
  OAT?: number, 
  OP_A?: number, 
  OP_B?: number, 
  SCT_A?: number, 
  SCT_B?: number, 
  SLC_HM?: number, 
  SLT_A?: number, 
  SLT_B?: number, 
  SP?: number, 
  SP_A?: number, 
  SP_B?: number, 
  SP_OCC?: number, 
  SST_A?: number, 
  SST_B?: number, 
  STATUS?: number, 
}

export interface TelemetryChillerCarrierXaHvar {
	GENUNIT_UI?: number;
  CTRL_TYP?: number;
  STATUS?: number;
  ALM?: number;
  SP_OCC?: number;
  CHIL_S_S?: number;
  CHIL_OCC?: number;
  CAP_T?: number;
  DEM_LIM?: number;
  TOT_CURR?: number;
  CTRL_PNT?: number;
  OAT?: number;
  COOL_EWT?: number;
  COOL_LWT?: number;
  EMSTOP?: number;
  CIRCA_AN_UI?: number;
  CAPA_T?: number;
  DP_A?: number;
  SP_A?: number;
  ECON_P_A?: number;
  OP_A?: number;
  DOP_A?: number;
  CURREN_A?: number;
  CP_TMP_A?: number;
  DGT_A?: number;
  ECO_TP_A?: number;
  SCT_A?: number;
  SST_A?: number;
  SUCT_T_A?: number;
  EXV_A?: number;
  CIRCB_AN_UI?: number;
  CAPB_T?: number;
  DP_B?: number;
  SP_B?: number;
  ECON_P_B?: number;
  OP_B?: number;
  DOP_B?: number;
  CURREN_B?: number;
  CP_TMP_B?: number;
  DGT_B?: number;
  ECO_TP_B?: number;
  SCT_B?: number;
  SST_B?: number;
  SUCT_T_B?: number;
  EXV_B?: number;
  CIRCC_AN_UI?: number;
  CAPC_T?: number;
  DP_C?: number;
  SP_C?: number;
  ECON_P_C?: number;
  OP_C?: number;
  DOP_C?: number;
  CURREN_C?: number;
  CP_TMP_C?: number;
  DGT_C?: number;
  ECO_TP_C?: number;
  SCT_C?: number;
  SST_C?: number;
  SUCT_T_C?: number;
  EXV_C?: number;
}

export interface TelemetryRawDRI extends TelemetryDME, TelemetryVAV, TelemetryFancoil, TelemetryChillerCarrierHxGx, TelemetryChillerCarrierXaXwXsXv, TelemetryChillerCarrierXaHvar {
  dev_id: string
  timestamp: string
  type: string
  machine: number
  values?: number[]
  Temp?: number
  MachineStatus?: number
  Mode?: string | number
  machineVars?: { [name: string]: string|number }
}

export interface TelemetryRawDAM {
  dev_id?: string
  dam_id?: string
  bt_id?: string
  timestamp?: string
  Mode?: 'Auto' | 'Manual'
  State?: 'Enabled' | 'Disabled' | 'Ventilation' | 'Enabling' | 'Disabling' | 'Condenser 1' | 'Condenser 2' | 'THERMOSTAT'
  Temperature?: string
  Temperature_1?: string
  GMT?: number
}

export interface TelemetryRawDUT {
  dut_id?: string
  dev_id?: string
  bt_id?: string
  timestamp?: string
  Temperature?: number
  Humidity?: number
  GMT?: number
}

export interface TelemetryPackRawDUT {
  dut_id?: string
  dev_id: string
  bt_id: string
  operation_mode?: number,
  timestamp?: string
  samplingTime?: number
  Temperature?: number[]
  Temperature_1?: number[]
  Tmp?: number[]
  Humidity?: number[]
  eCO2? : number[]
  raw_eCO2? : number[]
  TVOC? : number[]
  L1? : number[]
  GMT?: number
}

export interface TelemetryPackRawDMA {
  dev_id: string
  bt_id: string
  timestamp?: string
  samplingTime?: number
  mode?: string
  operation_mode?: number
  pulses?: number
  saved_data?: boolean
  GMT?: number
}

export interface TelemetryPackRawDMT {
  dev_id: string
  bt_id: string
  timestamp?: string
  samplingTime?: number
  F1?: boolean
  F2?: boolean
  F3?: boolean
  F4?: boolean
  GMT?: number
}

export interface TelemetryPackRawDutAut {
  dev_id: string
  bt_id: string
  timestamp: string
  Mode: 'AUTO'|'Auto'
  State: 'Enabled' | 'Disabled'
  GMT: number}

export interface TelemetryRawDAL {
  dev_id: string
  bt_id?: string
  timestamp?: string
  Mode?: string[]
  Feedback?: boolean[]
  Relays?: boolean[]
  State?: string
  GMT?: number
}

export interface DevOtaConfirmation {
  dev_id: string
  ota_command : {
    host: string
    port: number
    path: string
  }
}

export interface DevDebugSystemInfo {
  msgtype: "debug-device"
  dev_id: string
  WIFI_STA_RSSI: number
  AP_CON_RSSI: number
  Free_RAM: number
  Min_RAM: number
  Free_NVS: number
  ALL_NVS: number
  Used_NVS: number
  LTE_RSRP?: number
}

export interface DevLTEDebugSystemInfo {
  message_type: "device_data"
  dev_id: string
  LTE_NETWORK: string
  LTE_RSRP: number
  LTE_OPERATOR: string
  LTE_ICCID: string
}

export interface DutIrReadDeprecated {
  msgtype: "ir-read",
  dev_id: string,
  ir_code: any
}

export interface DutIrRead {
  msgtype: "ir_received",
  dev_id: string
  ir_code: any
}

export interface DutSensorAutomRead {
  msgtype: "sensor-automation",
  dev_id: string,
  index: number,
  num_sensors: number,
}

export interface DeviceGroupCommand {
  group?: string;
  id?: string;
  action: "Add" | "Remove" | "Show" | "Show All";
}

export interface DutMsg_RespSetIrCode {
  msgtype: "resp:set-ir-code",
  dev_id: string,
  name: string, // "AC_OFF"|"AC_COOL"|"AC_FAN",
  data_id: string,
  success?: boolean,
  error?: string,
}

export interface DutMsgEchoJsonScheduler {
  msgtype: "echo_json_scheduler",
  dev_id: string,
  json_data: string,
  json_status: boolean,
  success?: boolean,
  error?: string,
}

export interface DutMsgEchoJson {
  msgtype: "echo_json",
  dev_id: string,
  json_data: string,
  json_status: boolean,
  success?: boolean,
  error?: string,
}

// export interface DutMsg_RespSetIrCodes {
//   msgtype: "resp:set-ir-codes",
//   dev_id: string,
//   success?: boolean,
//   error?: string,
// }

export interface DutMsg_IrCodesIds {
  msgtype: "ir-codes-ids",
  dev_id: string,
  AC_OFF: string,
  AC_COOL: string,
  AC_FAN: string,
}

export interface DutMsg_RespSendIrCode {
  msgtype: "resp:send-ir-code",
  dev_id: string,
  success?: boolean,
  error?: string,
}

export interface DutMsg_RespSendCommand {
  msgtype: "resp:send-command",
  dev_id: string,
  command: string,
  success?: boolean,
  error?: string,
}

export interface DutMsg_IrLearnState {
  msgtype: "ir-learn-state",
  dev_id: string,
  enabled: boolean,
}

export interface DutMsg_TemperatureControlState {
  msgtype: "temperature-control-state",
  dev_id: string,
  LTC: number,
  temperature: string|number,
  mode: number, // 0-OP_NO_CONTROL, 1-OP_CONTROL, 2-OP_SOB_DEMANDA, 3-OP_BACKUP, 5_BACKUP_CONTROL, 6_BACKUP_CONTROL_V2, 7_FORCED, 8_ECO_2
  ctrl_mode: ControlMode
  setpoint: number,
  enabled: boolean,
  LTI: number,
  hist_sup?: number,
  hist_inf?: number,
}

export interface DutMsg_V3ControlState {
  msgtype: "v3-control-state",
  dev_id: string,
  enabled: boolean,
  setpoint: number,
  mode?: number,
  LTC?: number,
  LTI?: number,
  hist_sup?: number,
  hist_inf?: number,
}

export interface DutMsg_ReturnRmtCycle {
  msgtype: "return-rmt-cycle",
  dev_id: string,
  period: number
}

export interface DutMsg_ReturnReset {
  dev_id: string,
  message_type: "device_data",
  last_reset_reason: string,
  hardware_type: string,
  firmware_status: string,
  last_update_result: string,
  firmware_version: string
}

export interface DutMsg_ReturnSensorAutomation {
  msgtype: "return-sensor-automation",
  dev_id: string,
  index?: number,
  number_sensors: number
}

export interface DriMsg_GetVarsConfig {
  msgtype: "get-vars-config",
  dev_id: string,
}

export interface DriMsg_GetConfigsHash {
  msgtype: "get-hash",
  dev_id: string,
}

interface DutMsg_ControlPortMode {
  msgtype: "control-mode"
  dev_id: string,
  mode: 0|1 // 0=LED, 1=RELAY
}

export interface MsgDutEchoJson {
  msgtype: "echo_json",
  dev_id: string
  json_data: string,
  json_status: boolean,
  number_sensors: number
}

export interface MsgMultProgFlag {
  msgtype: "return-multprog-flag",
  dev_id: string,
  multprog_flag_enabled: boolean,
}

export interface EnergyTelemetry {
  tens_a: number,
  tens_b: number,
  tens_c: number,
  curr_a: number,
  curr_b: number,
  curr_c: number,
  demanda: number,
  energia_ativa_tri: number,
  energia_reativa_tri: number,
  fp: number,
  timestamp: string,
  id: string,
  GMT?: number
}

export interface CurrentDmaOperationMode {
  dev_id: string
  operation_mode: number
}

export type DevMessage = { dev_id: string }

export type ControlMsgDEV = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo

export type ControlMsgDAM = MsgDamProgBasic
                          | MsgDamProgExcepts
                          | ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | MsgDamExtThermCfg
                          | MsgDamScheduler
                          | MsgDamEchoJson
                          | MsgDamEcoProgramming

export type ControlMsgDAL = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | MsgDalEchoJson
                          | MsgDamScheduler
                          | MsgDamGetExceptions
                          | MsgDamGetScheduler

export type ControlMsgDRI = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | DevLTEDebugSystemInfo
                          | DriMsg_GetVarsConfig
                          | DriMsg_GetConfigsHash
                          | MsgDamScheduler
                          | MsgDamGetExceptions
                          | MsgDamGetScheduler

export type ControlMsgDAC = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | MsgDamProgBasic
                          | MsgDamProgExcepts

export type ControlMsgDUT = DutIrRead
                          | DutIrReadDeprecated
                          | ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | MsgDamProgBasic
                          | MsgDamProgExcepts
                          | DutMsg_ReturnReset
                          | DutMsg_RespSetIrCode
                          | DutMsgEchoJson
                          | DutMsgEchoJsonScheduler
                          | DutMsg_IrCodesIds
                          | DutMsg_RespSendIrCode
                          | DutMsg_RespSendCommand
                          | DutMsg_TemperatureControlState
                          | DutMsg_V3ControlState
                          | DutMsg_ReturnRmtCycle
                          | DutMsg_ReturnSensorAutomation
                          | DutSensorAutomRead
                          | MsgDutEchoJson
                          | MsgMultProgFlag


export type ControlMsgDMA = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
                          | CurrentDmaOperationMode

export type ControlMsgDMT = ControlMsgFirmwareVersion
                          | DevOtaConfirmation
                          | DevDebugSystemInfo
import { WebSocket } from 'ws'
import * as tls from 'node:tls'
export { FullProg_v4, FullProg_v3, DayProg } from '../helpers/scheduleData';
export { ControlMode } from '../helpers/dutAutomation';
import { TelemetryChillerCarrierHxGx, TelemetryDME, TelemetryFancoil, TelemetryVAV, TelemetryChillerCarrierXaXwXsXv, TelemetryChillerCarrierXaHvar } from './devicesMessages';

declare global {
  interface Error {
    HttpStatus(code: number): Error
    DebugInfo(debugInfo: any): Error
    Details(status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }): Error
  }
  namespace Express {
    export interface Request {
      session?: SessionData
      extraSessionData?: any
      realUserSession?: SessionData
      gwData?: {
        tls?: {
          authorized: boolean
          cert: { valid_to: string, fingerprint: string } // tls.PeerCertificate
        }
      }
    }
  }
}

export interface TelemetryDRI extends TelemetryDME, TelemetryVAV, TelemetryFancoil, TelemetryChillerCarrierHxGx, TelemetryChillerCarrierXaXwXsXv, TelemetryChillerCarrierXaHvar {
  dev_id: string
  timestamp: string
  Temp?: number
  MachineStatus?: number
  Mode?: string | number
  machineVars?: { [name: string]: string|number }
  // RSSI: number;
  // type: string;
  // machine: number;
  // values: number[];
  status?: string,
}

export interface TelemetryDAC {
  dac_id: string
  timestamp: string
  Tamb?: number
  Tsuc?: number
  Tliq?: number
  Psuc?: number
  Pliq?: number
  Levp?: 0 | 1
  Lcmp?: 0 | 1
  Lcut?: 0 | 1
  Tsc?: number
  Tsh?: number
  P0raw?: number
  P1raw?: number
  status?: string
  GMT?: number
}

export interface TelemetryPackDAC {
  dev_id: string
  bt_id: string
  timestamp: string
  samplingTime?: number
  Lcmp: (0|1)[]
  Tamb?: number[]
  Tsuc?: number[]
  Tliq?: number[]
  Psuc?: number[]
  Pliq?: number[]
  Levp?: (0|1)[]
  Lcut?: (0|1)[]
  Tsc?: number[]
  Tsh?: number[]
  P0?: number[]
  P1?: number[]
  Mode?: "Auto"|"Manual"
  State?: "Enabled"|"Disabled"|"Enabling"|"Disabling"
  GMT?: number
}

export interface FaultsActs {
  [faultId: string]: {
    lastAction?: 'APPROVED'|'REJECTED'|'ERASED'|'RESTAB_WAITING'|'RESTAB_PENDING'|'RESTABLISHED'|'RESTAB_REJECTED'|'PENDING'
    lastActionTime?: number
    lastAdmMessage?: number
    lastRiseTS?: number,
    firstRiseTS?: number,
  }
}

export interface AlertParams {
  NOTIF_ID: number
  COND_VAL: string
  COND_SECONDARY_VAL: string
  value: any
  lastNotifSent?: number
  CLIENT_ID?: number
  UNIT_IDS?: number[]
}

export interface EnergyAlertParams extends AlertParams {
  energyCards?: {
    condOper: string,
    limiarInput: string,
    allDays: boolean,
    selectedDays: {
      mon: boolean,
      tue: boolean,
      wed: boolean,
      thu: boolean,
      fri: boolean,
      sat: boolean,
      sun: boolean
    },
    schedulesList: {
      start: string,
      end: string,
      lastMessages?: {
        [devId: string]: number
      }
    }[],
    allHours: boolean,
    instant: boolean,
    endOfDay: boolean,
    detected?: {
      [devId: string]: {
        name: string
        time: string,
        cons: string,
        unitName: string,
        unitId: number,
      }
    }
  }[]
}

export interface AlertDetection {
  notifId: number
  devId: string
  details: { text: string, html: string }
}

export interface DetectionSchedule {
  notifId: number
  devId: string
  cond: string
  init: string
}

export interface TelemetryDUT {
  dev_id?: string
  Temperature?: number
  Temperature_1?: number
  Tmp?: number
  operation_mode?: number
  Humidity?: number
  eCO2?: number
  raw_eCO2?: number
  TVOC?: number
  status?: string
  timestamp?: string
  GMT?: number
}

export interface PeriodData {
  permission: "allow" | "forbid"
  start: string // "00:00"
  end: string // "23:59"
  indexIni: number
  indexEnd: number
  days: string[]
  fullDay: boolean
}

export interface TelemetryDAM {
  dev_id: string
  timestamp: string
  Mode?: "Auto" | "Manual" | "Local"
  State?: "allow" | "forbid" | "onlyfan" | "enabling" | "disabling" | "eco" | "thermostat"
  status?: string
  Temperature?: string
  Temperature_1?: string
  GMT?: number
}

export interface TelemetryDutAut {
  dev_id?: string
  timestamp?: string
  Mode?: "Auto"
  State?: "allow" | "forbid" | "onlyfan"
  status?: string
  GMT?: number
}

export interface TelemetryDMA {
  dev_id?: string
  mode?: string
  operation_mode?: number
  pulses?: number
  status?: string
  samplingTime?: number
  saved_data?: boolean
  timestamp?: string
  GMT?: number
}

export interface TelemetryDMT {
  dev_id?: string
  F1?: boolean
  F2?: boolean
  F3?: boolean
  F4?: boolean
  status?: string
  samplingTime?: number
  timestamp?: string
  GMT?: number
}

export interface TelemetryDAL {
  dev_id: string
  timestamp: string
  Mode?: string[]
  Feedback?: boolean[]
  Relays?: boolean[]
  State?: string
  status?: string
  GMT?: number
}

export interface DetectedFaultInfo {
  faultId: string
  faultName: string
  faultLevel: number
  condDesc: string
  rise: boolean
  restab: boolean
  autoApprove: boolean
}
export interface BaseFaultData {
  faultId: string
  faultName: string
  faultLevel: number
}

export interface SessionData {
  user: string
  permissions: UserPermissions
  fakeProfile?: FakeProfile
}

export interface InternalRequestSession {
  clientIP: string
}

export interface FakeProfile {
  clients?: { [clientId: string]: string }
  clients_v2?: {
    CLIENT_ID: number
    PERMS: string
    UNITS?: string|null
  }[]
  PERMS_U?: string
  CLBIND_ID?: number
}

export type ProfilePerClient = '[U]'|'[C]'|'[M]'|'[T]'|'[MN]'|'[I]'|'[CP]';

export interface UserPermissions {
  MANAGE_ALL_CLIENTS_AND_DACS?: boolean
  PER_CLIENT: { clientId: number, p: ProfilePerClient[] }[]
  PER_UNIT?: { clientId: number, units: number[], p: ProfilePerClient[] }[]
  ALTER_SYSTEM_PARS?: boolean
  VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS?: boolean
  MANAGE_UNOWNED_DEVS?: boolean
  HEALTH_MANAGEMENT?: boolean
  isUserManut?: boolean
  isParceiroValidador?: boolean
  isAdminSistema?: boolean
  isInstaller?: boolean
  isMasterUser?: boolean
  API_MANAGEMENT?: boolean
}

export class WebSocketClient extends WebSocket {
  isAlive?: boolean
  session?: SessionData
  subscrStat?: string[]
  subscrTelm?: string[]
  realTimeDUTs?: string[]
  realTimeDMAs?: string[]
  realTimeDRIs?: string[]
  realTimeDMTs?: string[]
  realTimeDALs?: string[]
  subscrDutIrRead?: string[]
  subscrDevMessages?: string
  subscrDevLog?: string
}

export interface DacHealthInfo {
  DAC_ID: string
  H_INDEX: number
  H_DESC: string
  P_CAUSES: string
  DAC_APPL: string
  DAC_COMIS: string
  CITY_NAME: string
  STATE_ID: string
  GROUP_NAME: string

  LAUDO?: string
  LEVEL_DESC?: string
  HLEVEL?: string
  inactiveGroup? : boolean
  POSS_CAUSES?: string
  MEAN_USE?: string
  USAGE_HISTORY?: { dayDesc: string }[]
}

export interface WSListener<T> extends Promise<T> {
  pack?: WSListenerPack<T>
}
export interface WSListenerPack<T> {
  resolve?: (value?: T) => void
  reject?: (value?: unknown) => void
  checker?: (payload: T) => boolean
  timedOut?: () => void
  finished?: boolean
}

export interface CompiledHistoryVar {
  v: number[]
  c: number[]
}
export interface CompiledHistoryVar2 {
  v: (string[])|(number[])
  c: number[]
  L?: number[]
}

export interface ComboItem {
  value: string
  label: string
  tags?: string
}
export interface ComboItemN {
  value: number
  label: string
}

export const enum ChangeType {
  Desconhecido = 0,
  Manual = 1,
  FDD = 2,
  ApiServer = 3,
  Timeout = 4,
  BackOnline = 5,
  Realocacao = 6,
}

export interface DacHwCfg {
  FLUID_TYPE: string
  isVrf: boolean
  calculate_L1_fancoil: boolean
  P0Psuc: boolean
  P1Psuc: boolean
  P0Pliq: boolean
  P1Pliq: boolean
  P0multQuad: number,
  P0multLin: number,
  P0ofst: number,
  P1multQuad: number,
  P1multLin: number,
  P1ofst: number
  TsensRename: { T0: string, T1: string, T2: string } | null
  hasAutomation: boolean
  hasRelay: boolean
  DAC_TYPE: string
  DAC_APPL: string
  simulateL1: boolean
  L1CalcCfg?: {
    psucOffset: number,
  }
}

export interface RecHealthData {
  H_INDEX: number
  H_DESC: string
  P_CAUSES: string
}

export interface ChartsBasic_DAC {
  Lcmp: string
  Levp: string
  Lcut: string
  State: string
  Mode: string
  L1raw?: string
  L1fancoil?: string
  SavedData?: string
}
export interface ChartsDetailed_DAC {
  Psuc: string
  Pliq: string
  Tamb: string
  Tsuc: string
  Tliq: string
  Tsc: string
  Tsh: string
  L1raw?: string
  L1fancoil?: string
}
export interface ChartsExtra_DAC {
  faults : {
    [faultName : string] : string
  }
}
export interface CompiledStats_DAC {
  numDeparts: number
  hoursOn: number
  hoursOff: number
  hoursBlocked: number
  startLcmp: number
  endLcmp: number
  first_saved_data_index?: number
}

export interface CompiledStats_DUT_DUO {
  numDeparts: number
  hoursOnL1: number
  hoursOffL1: number
}

export interface MeanTemperature_DAC_DUT_DRI {
  med: number
  max: number
  min: number
  secI: number
  secF: number
}
export interface ChartsBasic_DUT_AUT {
  State: string
  Mode: string
}
export interface ChartsDetailed_DUT {
  Temp: string
  Temp1: string
  Hum: string
  eCO2: string
  TVOC: string
  L1: string
}
export interface ChartsBasic_DAM {
  State: string
  Mode: string
  Temperature: string
  Temperature_1: string
}

export interface ChartsBasic_DRI {
  Setpoint?: string
  Status?: string
  Mode?: string
  ThermOn?: string
  Fanspeed?: string
  Lock?: string
  TempAmb?: string
  ValveOn?: string
  FanStatus?: string
}

export interface Chiller_Carrier_DRI {
  params_changed?: {
    device_code: string,
    parameter_name: string,
    parameter_value: number,
    record_date: string
  }[],
  params_grouped?: {
    device_code: string;
    record_date: string;
    cap_t: number;
    dem_lim: number;
    lag_lim: number;
    sp: number;
    ctrl_pnt: number;
    capa_t: number;
    dp_a: number;
    sp_a: number;
    sct_a: number;
    sst_a: number;
    capb_t: number;
    dp_b: number;
    sp_b: number;
    sct_b: number;
    sst_b: number;
    cond_lwt: number;
    cond_ewt: number;
    cool_lwt: number;
    cool_ewt: number;
    cpa1_op: number;
    cpa2_op: number;
    dop_a1: number;
    dop_a2: number;
    cpa1_dgt: number;
    cpa2_dgt: number;
    exv_a: number;
    hr_cp_a1: number;
    hr_cp_a2: number;
    cpa1_tmp: number;
    cpa2_tmp: number;
    cpa1_cur: number;
    cpa2_cur: number;
    cpb1_op: number;
    cpb2_op: number;
    dop_b1: number;
    dop_b2: number;
    cpb1_dgt: number;
    cpb2_dgt: number;
    exv_b: number;
    hr_cp_b1: number;
    hr_cp_b2: number;
    cpb1_tmp: number;
    cpb2_tmp: number;
    cpb1_cur: number;
    cpb2_cur: number;
    cond_sp: number;
  }[]
}

export interface ChartsBasic_DMA {
  TelemetryList?: {pulses: number, time: string}[]
  timeOfTheLastTelemetry?: string
}

export interface ChartsBasic_DMT {
  F1?: string
  F2?: string
  F3?: string
  F4?: string
}

export interface ChartsBasic_DAL {
  Relays?: string[]
  Feedback?: string[]
}

export type HistoryTypeDAC = "TelemetryCharts" | "L1-Charts&Stats" | "Stats-L1-Tamb"
export type HistoryTypeDUT = "TelemetryCharts" | "StatsT"
export type FullHist_DAC = Partial<ChartsBasic_DAC & ChartsDetailed_DAC & ChartsExtra_DAC & MeanTemperature_DAC_DUT_DRI & CompiledStats_DAC & { provision_error: boolean }>;
export type FullHist_DUT = Partial<MeanTemperature_DAC_DUT_DRI & ChartsDetailed_DUT & ChartsBasic_DUT_AUT & CompiledStats_DUT_DUO & { provision_error: boolean, hoursOnline: number }>;
export type FullHist_DAM = Partial<ChartsBasic_DAM & { provision_error: boolean, hoursOnline: number }>;
export type FullHist_DRI = Partial<ChartsBasic_DRI &  Chiller_Carrier_DRI & { provision_error?: boolean, hoursOnline: number }>;
export type FullHist_DMA = Partial<ChartsBasic_DMA & { provision_error?: boolean, hoursOnline: number }>;
export type FullHist_DMT = Partial<ChartsBasic_DMT & { provision_error?: boolean, hoursOnline: number }>;
export type FullHist_DAL = Partial<ChartsBasic_DAL & { provision_error?: boolean, hoursOnline: number }>;

export interface DriVarsConfig {
  application: string
  protocol: string
  worksheetName: string
  driConfigs?: {
    protocol?: string
    value: number | string
  }[]
  varsList: {
    address?: {
      protocol?: string
      machine?: number
      ip?: string
      id: number
      function?: number
      address?: number
      value?: string
    }
    name: string
    value?: string
    // equipId: string
    // valUnit: string
    inputRow?: DriParsedRowType,
  }[]
  w_varsList: {
    name: string,
    address: {
      protocol?: string
      machine?: number
      ip?: string
      id?: number
      function?: number
      address?: number
      values?: number[],
      alias?: string,
    },
  }[],
  automationList?: {
    alias: string;
    description: string;
    value?: number;
    address?: number;
    array?: string;
  }[];
}

export interface DriParsedRowType {
  Nome?: string
  Pacote?: string
  Tipo_de_variavel?: string
  Unidade_de_medida?: string
  Comando?: string
  Sistema?: string
  Endereco?: string
  Descricao?: string
  IP?: string
  ID?: string
  Sinal?: string
  Size?: string
  Funcao?: string
  Leitura_Escrita?: string
  Unidade?: string
  Formula?: string
  Alias?: string
  Array?: string
}

// Aqui não se refere ao tipo de dispositivo e sim aos tópicos usados no MQTT. O DMA por exemplo usa tópico 'data/dut'.
export type TopicType = 'dac'|'dut'|'dam'|'dri'|null;

export interface DmaLeakInfo {
  checkContinuousConsumptionLastDayResult: boolean,
  period_usage: number,
  dma_LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL: number,
  dma_LA_CONTINUOUS_CONSUMPTION_MIN_VALUE: number,
}

export interface DriBodyVarsCfg {
  driId: string;
  application: string;
  protocol: string;
  modbusBaudRate?: string;
  telemetryInterval?: string;
  serialMode?: string;
  parity?: string;
  stopBits?: string;
  capacityTc?: string;
  installationType?: string;
  slaveId?: string;
  worksheetName?: string;
}

export interface DriProg {
  SCHED_ID: number;
  DRI_ID: string;
  ACTIVE: string;
  OPERATION: string;
  BEGIN_TIME: string;
  END_TIME: string;
  MODE: string;
  DAYS: string;
  SETPOINT: number;
  EXCEPTION_DATE?: string;
  EXCEPTION_REPEAT_YEARLY?: string;
}
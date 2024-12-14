export interface DacItem {
  DAC_ID: string;
  DAT_ID?: string
  GROUP_ID: number;
  GROUP_NAME: string;
  UNIT_ID: number;
  DAC_NAME: string;
  H_INDEX: number;
  status: string;
  Lcmp: number;
  lastCommTs: string;
  capacityKW?: number;
  MEAN_USE?: string;
  usageHistory?: {
    DAY_HOURS_ON: number;
    DAT_REPORT: string;
  }[];
  DAC_KW?: number;
  insufDut?: DutItem;
  dutDuo?: DutItem;
  DAC_APPL?: string;
  DAC_TYPE?: string;
  CLIENT_ID: number;
  HEAT_EXCHANGER_ID: number;
  RSSI?: number;
}
export interface DamItem {
  DAM_ID: string;
  UNIT_ID: number;
  State: string;
  Mode: string;
  switchProgOn?: boolean;
  emptyProg?: boolean;
  status: string;
}
export interface DutItem {
  DEV_ID: string;
  UNIT_ID: number;
  ROOM_NAME: string;
  PLACEMENT: 'AMB' | 'INS' | 'DUO';
  ISVISIBLE: number,
  Temperature?: number | string;
  Temperature_1?: number | string;
  temprtAlert: 'low'|'high'|'good'|null
  Mode?: string|number
  TUSEMIN?: number
  TUSEMAX?: number
  status: string;
  RSSI?: number;
  Humidity?: number;
  CO2MAX?: number;
  eCO2?: number;
  HUMIMAX?: number;
  HUMIMIN?: number;
  tpstats?: { med: number, max: number, min: number }
}
export interface DriItem {
  DEV_ID: string
  ROOM_NAME: string
  UNIT_ID: number
  RTYPE_ID: number
  RTYPE_NAME: string
  ISVISIBLE: number,
  status: string
  lastCommTs: string
  Temperature?: number
  Mode?: string|number
  ValveState?: number
  TUSEMIN?: number
  TUSEMAX?: number
  temprtAlert: 'low'|'high'|'good'|null
  tpstats?: { med: number, max: number, min: number }
}
export interface DatItem {
  DAT_ID: string;
  UNIT_ID: number;
  GROUP_NAME: string;
  GROUP_ID: number;
  DEV_ID: string;
  AST_DESC: string;
}
export interface AssociationItem {
  ASSOC_ID: number;
  ASSOC_NAME: string;
  CLIENT_ID: number;
  UNIT_ID: number;
  GROUPS: GroupItem[];
}
export interface GroupItem {
  application: string;
  DEV_AUT: string;
  name: string;
  groupId: number;
  dacs: DacItem[];
  dams: DamItem[];
  dam?: DamItem;
  dri?: DriItem;
  dats: DatItem[];
  duts?: DutItem[];
}

export interface ChillerHxParamsGrouped {
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
}
export interface ChillerXaParamsGrouped {
  device_code: string;
  record_date: string;
  cap_t: number;
  cond_ewt: number;
  cond_lwt: number;
  cool_ewt: number;
  cool_lwt: number;
  ctrl_pnt: number;
  dp_a: number;
  dp_b: number;
  hr_cp_a: number;
  hr_cp_b: number;
  hr_mach: number;
  hr_mach_b: number;
  oat: number;
  op_a: number;
  op_b: number;
  sct_a: number;
  sct_b: number;
  slt_a: number;
  slt_b: number;
  sp: number;
  sp_a: number;
  sp_b: number;
  sst_a: number;
  sst_b: number;
}

export interface ChillerXaHvarParamsGrouped {
  device_code: string;
  record_date: string;
  genunit_ui: number;
  cap_t: number;
  tot_curr: number;
  ctrl_pnt: number;
  oat: number;
  cool_ewt: number;
  cool_lwt: number;
  circa_an_ui: number;
  capa_t: number;
  dp_a: number;
  sp_a: number;
  econ_p_a: number;
  op_a: number;
  dop_a: number;
  curren_a: number;
  cp_tmp_a: number;
  dgt_a: number;
  eco_tp_a: number;
  sct_a: number;
  sst_a: number;
  sst_b: number;
  suct_t_a: number;
  exv_a: number;
  circb_an_ui: number;
  capb_t: number;
  dp_b: number;
  sp_b: number;
  econ_p_b: number;
  op_b: number;
  dop_b: number;
  curren_b: number;
  cp_tmp_b: number;
  dgt_b: number;
  eco_tp_b: number;
  sct_b: number;
  suct_t_b: number;
  exv_b: number;
  circc_an_ui: number;
  capc_t: number;
  dp_c: number;
  sp_c: number;
  econ_p_c: number;
  op_c: number;
  dop_c: number;
  curren_c: number;
  cp_tmp_c: number;
  dgt_c: number;
  eco_tp_c: number;
  sct_c: number;
  sst_c: number;
  suct_t_c: number;
  exv_c: number;
}

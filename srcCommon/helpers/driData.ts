import { TelemetryDRI } from '../types'
import { TelemetryRawDRI } from '../types/devicesMessages'

const dmeMetersTypes = ['CG-ET330', 'ABB-NEXUS-II', 'ABB-ETE-30', 'ABB-ETE-50', 'CG-EM210', 'KRON-MULT-K', 'KRON-MULT-K 05', 'KRON-MULT-K 120', 'KRON-IKRON-03', 'SCHNEIDER-ELETRIC-PM2100', 'SCHNEIDER-ELECTRIC-PM210', 'SCHNEIDER-ELECTRIC-PM9C'];

export interface DriConfig {
  application: string
  machines?: {
    id: number
    vars: { name: string }[]
  }[],
}

export function processRawTelemetry (payload: TelemetryRawDRI, driCfg: DriConfig): TelemetryDRI {
  // MÁQUINAS TIPO CARRIER ECOSPLIT
  if(payload.type === 'CCN') {
    const telemetry: TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      Temp: null,
      MachineStatus: null,
      Mode: null,
    }

    telemetry.Temp = payload && payload.values && payload.values[0];
    telemetry.MachineStatus = payload && payload.values && payload.values[1];
    if (payload && payload.values) {
      if (payload.values[2] === 0 || payload.values[2] === 1) telemetry.Mode = 'COOL';
      if (payload.values[2] === 3) telemetry.Mode = 'FAN';
    }
    return telemetry;

  } else if (dmeMetersTypes.includes(payload.type)) {
    const telemetry: TelemetryDRI = {
      erro: verifyNullTelemtry(payload) ? 256 :  payload.erro,
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      v_a: payload.v_a ?? null,
      v_b: payload.v_b ?? null,
      v_c: payload.v_c ?? null,
      i_a: payload.i_a ?? null,
      i_b: payload.i_b ?? null,
      i_c: payload.i_c ?? null,
      pot_at_a: payload.pot_at_a ?? null,
      pot_at_b: payload.pot_at_b ?? null,
      pot_at_c: payload.pot_at_c ?? null,
      pot_ap_tri: payload.pot_ap_tri ?? null,
      pot_at_tri: payload.pot_at_tri ?? null,
      en_at_tri: payload.en_at_tri ?? null,
      fp_a: payload.fp_a ?? null,
      fp_b: payload.fp_b ?? null,
      fp_c: payload.fp_c ?? null,
      fp: payload.fp ?? null,
      en_ap_tri: payload.en_ap_tri ?? null,
    }
    return telemetry;
  // DEMAIS APLICAÇÕES DRI (TODO)
  } else if (driCfg?.application?.startsWith('vav') || driCfg?.application?.startsWith('fancoil') || payload.type.startsWith('VAV') || payload.type.startsWith('FANCOIL')) {
    const telemetry : TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      TempAmb: payload.TempAmb ?? null,
      ValveOn: payload.ValveOn ?? null,
      Lock: payload.Lock ?? null,
      Setpoint: payload.Setpoint ?? null,
      ThermOn: payload.ThermOn ?? null,
      Fanspeed: payload.Fanspeed ?? null,
      Mode: payload.Mode ?? null,
      FanStatus: payload.FanStatus ?? null,
    }

    return telemetry;
  } else if(payload.type === 'CHILLER-CARRIER-30HXE' ||  payload.type === 'CHILLER-CARRIER-30GXE' || payload.type === 'CHILLER-CARRIER-30HXF') {
    const telemetry: TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      CHIL_S_S:	payload.CHIL_S_S ?? null,
      ALM: payload.ALM ?? null,
      alarm_1: payload.alarm_1 ?? null,
      alarm_2: payload.alarm_2 ?? null,
      alarm_3: payload.alarm_3 ?? null,
      alarm_4: payload.alarm_4 ?? null,
      alarm_5: payload.alarm_5 ?? null,
      CAP_T: payload.CAP_T ?? null,
      DEM_LIM: payload.DEM_LIM ?? null,
      LAG_LIM: payload.LAG_LIM ?? null,
      SP: payload.SP ?? null,
      CTRL_PNT: payload.CTRL_PNT ?? null,
      EMSTOP: payload.EMSTOP ?? null,
      CP_A1: payload.CP_A1 ?? null,
      CP_A2: payload.CP_A2 ?? null,
      CAPA_T: payload.CAPA_T ?? null,
      DP_A: payload.DP_A ?? null,
      SP_A: payload.SP_A ?? null,
      SCT_A: payload.SCT_A ?? null,
      SST_A: payload.SST_A ?? null,
      CP_B1: payload.CP_B1 ?? null,
      CP_B2: payload.CP_B2 ?? null,
      CAPB_T: payload.CAPB_T ?? null,
      DP_B: payload.DP_B ?? null,
      SP_B: payload.SP_B ?? null,
      SCT_B: payload.SCT_B ?? null,
      SST_B: payload.SST_B ?? null,
      COND_LWT: payload.COND_LWT ?? null,
      COND_EWT: payload.COND_EWT ?? null,
      COOL_LWT:	payload.COOL_LWT ?? null,
      COOL_EWT: payload.COOL_EWT ?? null,
      CPA1_OP: payload.CPA1_OP ?? null,
      CPA2_OP: payload.CPA2_OP ?? null,
      DOP_A1: payload.DOP_A1 ?? null,
      DOP_A2: payload.DOP_A2 ?? null,
      CPA1_DGT: payload.CPA1_DGT ?? null,
      CPA2_DGT: payload.CPA2_DGT ?? null,
      EXV_A: payload.EXV_A ?? null,
      HR_CP_A1:	payload.HR_CP_A1 ?? null,
      HR_CP_A2:	payload.HR_CP_A2 ?? null,
      CPA1_TMP: payload.CPA1_TMP ?? null,
      CPA2_TMP: payload.CPA2_TMP ?? null,
      CPA1_CUR: payload.CPA1_CUR ?? null,
      CPA2_CUR: payload.CPA2_CUR ?? null,
      CPB1_OP: payload.CPB1_OP ?? null,
      CPB2_OP: payload.CPB2_OP ?? null,
      DOP_B1: payload.DOP_B1 ?? null,
      DOP_B2: payload.DOP_B2 ?? null,
      CPB1_DGT: payload.CPB1_DGT ?? null,
      CPB2_DGT:	payload.CPB2_DGT ?? null,
      EXV_B: payload.EXV_B ?? null,
      HR_CP_B1:	payload.HR_CP_B1 ?? null,
      HR_CP_B2:	payload.HR_CP_B2 ?? null,
      CPB1_TMP: payload.CPB1_TMP ?? null,
      CPB2_TMP: payload.CPB2_TMP ?? null,
      CPB1_CUR: payload.CPB1_CUR ?? null,
      CPB2_CUR: payload.CPB2_CUR ?? null,
      COND_SP: payload.COND_SP ?? null,
      CHIL_OCC: payload.CHIL_OCC ?? null,
      STATUS:	payload.STATUS ?? null
    } 
    return telemetry;
  } else if (payload.type === 'CHILLER-CARRIER-30XAB-HVAR') {
    const telemetry: TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      GENUNIT_UI: payload.GENUNIT_UI ?? null,
      CTRL_TYP: payload.CTRL_TYP ?? null,
      STATUS: payload.STATUS ?? null,
      ALM: payload.ALM ?? null,
      SP_OCC: payload.SP_OCC ?? null,
      CHIL_S_S: payload.CHIL_S_S ?? null,
      CHIL_OCC: payload.CHIL_OCC ?? null,
      CAP_T: payload.CAP_T ?? null,
      DEM_LIM: payload.DEM_LIM ?? null,
      TOT_CURR: payload.TOT_CURR ?? null,
      CTRL_PNT: payload.CTRL_PNT ?? null,
      OAT: payload.OAT ?? null,
      COOL_EWT: payload.COOL_EWT ?? null,
      COOL_LWT: payload.COOL_LWT ?? null,
      EMSTOP: payload.EMSTOP ?? null,
      CIRCA_AN_UI: payload.CIRCA_AN_UI ?? null,
      CAPA_T: payload.CAPA_T ?? null,
      DP_A: payload.DP_A ?? null,
      SP_A: payload.SP_A ?? null,
      ECON_P_A: payload.ECON_P_A ?? null,
      OP_A: payload.OP_A ?? null,
      DOP_A: payload.DOP_A ?? null,
      CURREN_A: payload.CURREN_A ?? null,
      CP_TMP_A: payload.CP_TMP_A ?? null,
      DGT_A: payload.DGT_A ?? null,
      ECO_TP_A: payload.ECO_TP_A ?? null,
      SCT_A: payload.SCT_A ?? null,
      SST_A: payload.SST_A ?? null,
      SUCT_T_A: payload.SUCT_T_A ?? null,
      EXV_A: payload.EXV_A ?? null,
      CIRCB_AN_UI: payload.CIRCB_AN_UI ?? null,
      CAPB_T: payload.CAPB_T ?? null,
      DP_B: payload.DP_B ?? null,
      SP_B: payload.SP_B ?? null,
      ECON_P_B: payload.ECON_P_B ?? null,
      OP_B: payload.OP_B ?? null,
      DOP_B: payload.DOP_B ?? null,
      CURREN_B: payload.CURREN_B ?? null,
      CP_TMP_B: payload.CP_TMP_B ?? null,
      DGT_B: payload.DGT_B ?? null,
      ECO_TP_B: payload.ECO_TP_B ?? null,
      SCT_B: payload.SCT_B ?? null,
      SST_B: payload.SST_B ?? null,
      SUCT_T_B: payload.SUCT_T_B ?? null,
      EXV_B: payload.EXV_B ?? null,
      CIRCC_AN_UI: payload.CIRCC_AN_UI ?? null,
      CAPC_T: payload.CAPC_T ?? null,
      DP_C: payload.DP_C ?? null,
      SP_C: payload.SP_C ?? null,
      ECON_P_C: payload.ECON_P_C ?? null,
      OP_C: payload.OP_C ?? null,
      DOP_C: payload.DOP_C ?? null,
      CURREN_C: payload.CURREN_C ?? null,
      CP_TMP_C: payload.CP_TMP_C ?? null,
      DGT_C: payload.DGT_C ?? null,
      ECO_TP_C: payload.ECO_TP_C ?? null,
      SCT_C: payload.SCT_C ?? null,
      SST_C: payload.SST_C ?? null,
      SUCT_T_C: payload.SUCT_T_C ?? null,
      EXV_C: payload.EXV_C ?? null
    } 
    return telemetry;
  } else if(payload.type?.startsWith('CHILLER-CARRIER-30XA')) {
    const telemetry: TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
      CAP_T: payload.CAP_T ?? null,
      CHIL_OCC: payload.CHIL_OCC ?? null,
      CHIL_S_S: payload.CHIL_S_S ?? null,
      COND_EWT: payload.COND_EWT ?? null,
      COND_LWT: payload.COND_LWT ?? null,
      COOL_EWT: payload.COOL_EWT ?? null,
      COOL_LWT: payload.COOL_LWT ?? null,
      CTRL_PNT: payload.CTRL_PNT ?? null,
      CTRL_TYP: payload.CTRL_TYP ?? null,
      DEM_LIM: payload.DEM_LIM ?? null,
      DP_A: payload.DP_A ?? null,
      DP_B: payload.DP_B ?? null,
      EMSTOP: payload.EMSTOP ?? null,
      HR_CP_A: payload.HR_CP_A ?? null,
      HR_CP_B: payload.HR_CP_B ?? null,
      HR_MACH: payload.HR_MACH ?? null,
      HR_MACH_B: payload.HR_MACH_B ?? null,
      OAT: payload.OAT ?? null,
      OP_A: payload.OP_A ?? null,
      OP_B: payload.OP_B ?? null,
      SCT_A: payload.SCT_A ?? null,
      SCT_B: payload.SCT_B ?? null,
      SLC_HM: payload.SLC_HM ?? null,
      SLT_A: payload.SLT_A ?? null,
      SLT_B: payload.SLT_B ?? null,
      SP: payload.SP ?? null,
      SP_A: payload.SP_A ?? null,
      SP_B: payload.SP_B ?? null,
      SP_OCC: payload.SP_OCC ?? null,
      SST_A: payload.SST_A ?? null,
      SST_B: payload.SST_B ?? null,
      STATUS: payload.STATUS ?? null
    } 
    return telemetry;
  } 
  
  else {
    const telemetry: TelemetryDRI = {
      dev_id: payload.dev_id,
      timestamp: payload.timestamp,
    }

    const machinecfg = driCfg && driCfg.machines && driCfg.machines.find((x) => x.id === payload.machine);
    let machineVars: { [name: string]: string|number } = undefined;
    if (machinecfg && (machinecfg.vars.length === payload.values.length)) {
      machineVars = {};
      for (let i = 0; i < payload.values.length; i++) {
        const name = machinecfg.vars[i].name;
        if (!name) continue;
        machineVars[name] = payload.values[i];
      }
    }
    telemetry.machineVars = machineVars;
    return telemetry;
  } 
}

const verifyNullTelemtry = (payload: TelemetryDRI) => {
  const fakePayload = {
    v_a: payload.v_a,
    v_b: payload.v_b,
    v_c: payload.v_c,
    v_ab: payload.v_ab,
    v_bc: payload.v_bc,
    v_ca: payload.v_ca,
    i_a: payload.i_a,
    i_b: payload.i_b,
    i_c: payload.i_c,
    pot_at_a: payload.pot_at_a,
    pot_at_b: payload.pot_at_b,
    pot_at_c: payload.pot_at_c,
    pot_ap_a: payload.pot_ap_a,
    pot_ap_b: payload.pot_ap_b,
    pot_ap_c: payload.pot_ap_c,
    pot_re_a: payload.pot_re_a,
    pot_re_b: payload.pot_re_b,
    pot_re_c: payload.pot_re_c,
    v_tri_ln: payload.v_tri_ln,
    v_tri_ll: payload.v_tri_ll,
    pot_at_tri: payload.pot_at_tri,
    pot_ap_tri: payload.pot_ap_tri,
    pot_re_tri: payload.pot_re_tri,
    en_at_tri: payload.en_at_tri,
    en_re_tri: payload.en_re_tri,
    fp_a: payload.fp_a,
    fp_b: payload.fp_b,
    fp_c: payload.fp_c,
    fp: payload.fp,
    freq: payload.freq,
    demanda: payload.demanda,
    demanda_at: payload.demanda_at,
    demanda_ap: payload.demanda_ap,
  };
  return Object.values(fakePayload).every(value => (value === null || value === undefined));
}

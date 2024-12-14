import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import servConfig from '../../configfile';

import { logger } from '../../srcCommon/helpers/logger';
import { TelemetryDME } from '../types/devicesMessages';

// curl http://127.0.0.1:29547/comp-dam --data-raw '{"dev_id":"DAM303221307","day":"2022-05-24"}'

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações do rusthist').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_RUSTHIST' });
  }
  throw err;
}

async function apiPost (route: string, body: any) {
  if (servConfig.rusthist.token) {
    body.token = servConfig.rusthist.token;
  }
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: servConfig.rusthist.url,
    url: route,
    data: body,
  };
  return axios(config)
  .catch(checkAxiosError);
}

export interface EnergyStats {
  tens_a: {max: number, avg: number, min: number}
  tens_b: {max: number, avg: number, min: number}
  tens_c: {max: number, avg: number, min: number}
  curr_a: {max: number, avg: number, min: number}
  curr_b: {max: number, avg: number, min: number}
  curr_c: {max: number, avg: number, min: number}
  demanda: {max: number, avg: number, min: number}
  energia_ativa_tri: {max: number, avg: number, min: number}
  energia_reativa_tri: {max: number, avg: number, min: number}
  fp: {max: number, avg: number, min: number}
  start_timestamp: string
  end_timestamp: string
}

export default {
  ['/comp-dut']: async (body: {
    dev_id: string
    day: string
    offset_temp: number
    timezoneOffset?: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dut'};dev_id=${body.dev_id};day=${body.day}`);
    const response = await apiPost(`/comp-dut`, body);
    return response.data as {
      Temp: string
      Temp1: string
      Hum: string
      eCO2: string
      TVOC: string
      L1: string
      State: string
      Mode: string
      hoursOnL1: number
      hoursOffL1: number
      provision_error?: boolean
      numDeparts: number
      hoursOnline: number
    };
  },

  ['/comp-dma']: async (body: {
    dev_id: string
    day: string
    timezoneOffset?: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dma'};dev_id=${body.dev_id};day=${body.day}`);
    const response = await apiPost(`/comp-dma`, body);
    return response.data as {
      TelemetryList: {pulses: number, time: string}[]
      timeOfTheLastTelemetry?: string
      hoursOnline: number
      provision_error?: boolean
    };
  },

  ['/comp-dam']: async (body: {
    dev_id: string
    day?: string // Ou envia o "day" ou envia "ts_ini" e "interval_length_s"
    ts_ini?: string
    interval_length_s?: number
    open_end?: boolean
    timezoneOffset?: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dam'};dev_id=${body.dev_id};day=${body.day};ts_ini=${body.ts_ini};interval_length_s=${body.interval_length_s};open_end=${body.open_end}`);
    const response = await apiPost(`/comp-dam`, body);
    return response.data as {
      State: string
      Mode: string
      hoursOnline: number
      provision_error?: boolean
      Temperature: string
      Temperature_1: string
    };
  },

  ['/comp-dri']: async (body: {
    dev_id: string
    dri_type: string
    formulas?: {[alias: string]: string}
    dri_interval?: number
    day: string
    timezone_offset?: number
    chiller_carrier_hour_graphic?: boolean
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dri'};dev_id=${body.dev_id};day=${body.day}`);
    const response = await apiPost(`/comp-dri`, body);
    return response.data as {
      dev_id: string,
      dri_type: string,
      timestamp: string,
      data: {
        Setpoint?: string,
        Status?: string,
        Mode?: string,
        ThermOn?: string
        Fanspeed?: string
        Lock?: string
        TempAmb?: string
        ValveOn?: string
        FanStatus?: string
        hoursOnline?: number,
        provision_error?: boolean,
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
    };
  },

  ['/comp-dmt']: async (body: {
    dev_id: string
    day: string
    timezoneOffset?: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dmt'};dev_id=${body.dev_id};day=${body.day}`);
    const response = await apiPost(`/comp-dmt`, body);
    return response.data as {
      F1?: string,
      F2?: string,
      F3?: string,
      F4?: string,
      hoursOnline: number
      provision_error?: boolean,
    };
  },

  ['/comp-dal']: async (body: {
    dev_id: string
    day?: string // Ou envia o "day" ou envia "ts_ini" e "interval_length_s"
    timezoneOffset?: number
    ts_ini?: string
    interval_length_s?: number
    open_end?: boolean
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dal'};dev_id=${body.dev_id};day=${body.day}`);
    const response = await apiPost(`/comp-dal`, body);
    return response.data as {
      Mode?: string[],
      Relays?: string[],
      Feedback?: string[],
      hoursOnline: number
      provision_error?: boolean,
    };
  },

  ['/comp-dac-v2']: async (body: {
    dev_id: string
    fluid_type: string
    ts_ini: string
    interval_length_s: number
    isVrf: boolean
    virtualL1: boolean
    calculate_L1_fancoil: boolean
    debug_L1_fancoil: boolean
    hasAutomation: boolean
    P0Psuc: boolean
    P1Psuc: boolean
    P0Pliq: boolean
    P1Pliq: boolean
    P0mult?: number
    P0ofst?: number
    P1mult?: number
    P1ofst?: number
    P0multLin?: number
    P0multQuad?: number
    P1multLin?: number
    P1multQuad? : number
    T0_T1_T2: [string, string, string]
    open_end?: boolean
    DAC_APPL?: string
    DAC_TYPE?: string
    timezoneOffset?: number
    L1CalcCfg: {
      psucOffset: number;
    }
    first_saved_data_index?: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/comp-dac-v2'};dev_id=${body.dev_id};ts_ini=${body.ts_ini};interval_length_s=${body.interval_length_s};open_end=${body.open_end}`);
    const response = await apiPost(`/comp-dac-v2`, body);
    return response.data as {
      Lcmp: string
      Psuc: string
      Pliq: string
      Tamb: string
      Tsuc: string
      Tliq: string
      Levp: string
      Lcut: string
      Tsc: string
      Tsh: string
      State: string
      Mode: string
      L1raw?: string
      L1fancoil?: string
      numDeparts: number
      hoursOn: number
      hoursOff: number
      hoursBlocked: number
      startLcmp: number
      endLcmp: number
      provision_error?: boolean
      SavedData: string
      faults? : { [faultName : string] : string }
    };
  },

  ['/clear-cache']: async (body: {
    before: string
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/clear-cache'};before=${body.before}`);
    const response = await apiPost(`/clear-cache`, body);
    return response.data as {
      success: boolean
    };
  },
  ['/energy-query']: async (body: {
    energy_device_id: string
    serial: string
    manufacturer: string
    model: string
    start_time: string
    end_time: string
    formulas?: {
      [key: string]: string
    },
    params?: string[],
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/energy-query'};energy_device_id=${body.energy_device_id};start_time=${body.start_time};end_time=${body.end_time}`);
    const response = await apiPost('/energy-query', body);
    return response.data as {
      energy_device_id: string
      serial: string
      manufacturer: string
      model: string
      data: TelemetryDME[]
      grouped_demand?: {average_demand: number, min_demand: number, max_demand: number, record_date: string}[] 
    }
  },
  ['/energy-stats']: async (body: {
    serial: string
    manufacturer: string
    start_time: string
    end_time: string
    stats_interval_hours: number
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/energy-stats'};serial=${body.serial};start_time=${body.start_time};end_time=${body.end_time};stats_interval_hours=${body.stats_interval_hours}`);
    const response = await apiPost('/energy-stats', body);
    return response.data as {
      serial: string
      manufacturer: string
      data: EnergyStats[]
    };
  },
  ['/export-dev-telemetries']: async (body: {
    dev_id: string
    table_name: string
    day_YMD: string
  }, motivo: string) => {
    logger.info(`[RUSTHIST];motivo="${motivo}";endpoint=${'/export-dev-telemetries'};dev_id=${body.dev_id};day_YMD=${body.day_YMD}`);
    const response = await apiPost('/export-dev-telemetries', body);
    return response.data as string;
  },
}

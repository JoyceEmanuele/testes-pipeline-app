import {
  DacHwCfg,
  HistoryTypeDAC,
  FullHist_DAC,
  HistoryTypeDUT,
  FullHist_DUT,
  FullHist_DAM,
  FullHist_DRI,
  FullHist_DMA,
  FullHist_DMT,
  FullHist_DAL,
  ControlMode,
} from '../srcCommon/types';
import { ExtraRouteParams } from '../srcCommon/types/backendTypes';

export interface ApiInternal {
  '/diel-internal/api-async/processDacDay': (reqParams: {
    motivo: string,
    dac: { devId: string, hwCfg: DacHwCfg },
    day: string,
    hType: HistoryTypeDAC,
    dacExtInf: { GROUP_ID: number, DAC_APPL: string, UNIT_ID?: number },
    debug_L1_fancoil?: boolean
  }) => FullHist_DAC,

  '/diel-internal/api-async/processDutDay': (reqParams: {
    motivo: string,
    dutId: string,
    day: string,
    hType: HistoryTypeDUT,
    dutExtInf: { RTYPE_ID: number, UNIT_ID?: number }
  }) => FullHist_DUT,

  '/diel-internal/api-async/processDamDay': (reqParams: {
    motivo: string,
    damId: string,
    day: string,
    unitId?: number
  }) => FullHist_DAM,

  '/diel-internal/api-async/processDriDay': (reqParams: {
    motivo: string,
    driId: string,
    driType: string,
    driInterval: number|undefined,
    day: string,
    formulas?: {[alias: string]: string}
    chiller_carrier_hour_graphic?: boolean
  }) => FullHist_DRI,

  '/diel-internal/api-async/processDmaDay': (reqParams: {
    motivo: string,
    dmaId: string,
    day: string
    unitId?: number
  }) => FullHist_DMA,

  '/diel-internal/api-async/processDmtDay': (reqParams: {
    motivo: string,
    dmtCode: string,
    day: string,
  }) => FullHist_DMT,

  '/diel-internal/api-async/processDalDay': (reqParams: {
    motivo: string,
    dalCode: string,
    day: string,
  }) => FullHist_DAL,

  '/diel-internal/api-async/get_unit_power_consumption': (reqParams: { dayStart: string, dayEndInc: string, greenantMeterId: number }) => {
    date: string;
    consumedEnergy: number;
    invoice: {
        value: number;
    };
  }[],

  '/diel-internal/api-async/getDutDaySimpleStats': (reqParams: { devId: string, dateIni: string, numDays: number, progObrigatoria: boolean, motivo: string }) => {
    med?: number;
    max?: number;
    min?: number;
    accTacima?: number;
    accTabaixo?: number;
  },

  '/diel-internal/api-async/getDailyUsage': (reqParams: { dacId: string, datIni: string, numDays: number, DAC_KW: number }) => {
    day: string;
    hoursOn: number;
    energyCons: number;
    hoursOff: number;
    hoursBlocked: number;
    numDeparts: number;
    meanT: number;
    maxT: number;
    minT: number;
  }[],

  '/diel-internal/api-async/getDmaDayUsage': (reqParams: {
    dmaId: string,
    dayYMD: string,
    motivo: string,
    unitIdLaager?: number
  }) => {
    period_usage: number,
    history: {
      information_date: string,
      usage: number,
      readings_per_day: { time: string, usage: number }[],
      devId: string
    }[]
  },

  '/diel-internal/api-async/getDmaMeanHistory': (reqParams: {
    motivo: string,
    dmaId: string,
    userId: string,
  }) => {
    day: string
    averageConsumption: number
    consideredDays: number
  }[],

  '/diel-internal/api-async/updateDutInfoSchedule': (reqParams: {
    DEV_ID: string;
    CTRLOPER: ControlMode;
    LTCRIT: number;
    LTINF: number;
    PORTCFG: "IR" | "RELAY";
    TSETPOINT: number;
    USE_IR: 0 | 1;
    groups: string[];
    UPPER_HYSTERESIS: number;
    LOWER_HYSTERESIS: number;
    SCHEDULE_START_BEHAVIOR: string;
    SCHEDULE_END_BEHAVIOR: string;
    FORCED_BEHAVIOR: string;
    UPDATE_AUTOM_INFO: boolean;
    IR_ID_COOL: string;
    ACTION_MODE?: string|null
    ACTION_TIME?: number|null
    ACTION_POST_BEHAVIOR?: string|null
    userId: string;
  }) => {},

  '/diel-internal/api-async/sendDriCurrentSchedules': (reqParams: {
    DRI_ID: string;
  }) => boolean,
}

export type ApiInternalParams = {
  [Route in keyof ApiInternal]: Parameters<ApiInternal[Route]>[0];
};

type ApiInternalResps = {
  [Route in keyof ApiInternal]: Awaited<ReturnType<ApiInternal[Route]>>;
};

export type API_Internal = {
  [Route in keyof ApiInternal]: (reqParams: ApiInternalParams[Route], session?: void, extra?: ExtraRouteParams) => Promise<ApiInternalResps[Route]>;
};

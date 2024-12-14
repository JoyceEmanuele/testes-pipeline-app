import { ExtraRouteParams } from "../srcCommon/types/backendTypes"

export interface InternalRequestSession {
  clientIP: string,
}

export interface ApiInternal {
  ['/diel-internal/bgtasks/addDeviceToOtaQueue']: (reqParams: {
    devId: string
  }) => {},

  ['/diel-internal/bgtasks/getDevsCfg']: (reqParams: {
    last_update_token: string|null
  }) => {
    dacs: {
      DAC_ID: string;
      DAC_TYPE: string;
      DAC_APPL: string;
      FLUID_TYPE: string;
      hasAutomation: boolean;
      isVrf: boolean;
      calculate_L1_fancoil: boolean;
      P0Psuc: boolean;
      P1Psuc: boolean;
      P0Pliq: boolean;
      P1Pliq: boolean;
      P0mult: number;
      P0ofst: number;
      P1mult: number;
      P1ofst: number;
      T0_T1_T2: [string, string, string] | null;
      virtualL1: boolean;
      L1CalcCfg: {
        psucOffset: number;
      }
    }[]
    duts: {
      DUT_ID: string;
      TEMPERATURE_OFFSET: number;
    }[]
    dris: {
      DRI_ID: string;
      FORMULAS: {};
    }[]
  },

  ['/diel-internal/bgtasks/checkOtaQueue']: (reqParams: {
  }) => {
    enviosPendentes: string[]
    reenviosPendentes: string[]
  },
}

export type ApiInternalParams = {
  [Route in keyof ApiInternal]: Parameters<ApiInternal[Route]>[0];
};

type ApiInternalResps = {
  [Route in keyof ApiInternal]: Awaited<ReturnType<ApiInternal[Route]>>;
};

export type API_Internal = {
  [Route in keyof ApiInternal]: (reqParams: ApiInternalParams[Route], session: InternalRequestSession, extra: ExtraRouteParams) => Promise<ApiInternalResps[Route]>;
};

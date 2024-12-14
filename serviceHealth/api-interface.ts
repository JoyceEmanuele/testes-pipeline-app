import { DayProg } from "../srcCommon/types";
import { ExtraRouteParams } from "../srcCommon/types/backendTypes";

export interface ApiInternal {
  '/diel-internal/health/setDacHealthStatus': (reqParams: {
    DAC_ID: string
    H_INDEX: number
    H_DESC: string
    H_OFFL: null|string
    CT_ID: number
    userId: string
  }) => {
    affectedRows: number
  },
  '/diel-internal/health/getDacHIndex': (reqParams: {
    dac_id: string
  }) => {
    H_INDEX: number
  },
  ['/diel-internal/health/dev/get-fr-list-updates']: (reqParams: {
    update_token?: string
  }) => {
    dacs: {
      DAC_ID: string
      DAC_TYPE: string
      DAC_APPL: string
      FLUID_TYPE: string
      hasAutomation: boolean
      isVrf: boolean
      P0Psuc: boolean
      P1Psuc: boolean
      P0Pliq: boolean
      P1Pliq: boolean
      P0mult: number
      P0ofst: number
      P1mult: number
      P1ofst: number
      T0_T1_T2: string
      ignoreFaults: string
      groupChillerCount: number
      groupId: number
    }[]
    duts: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature: number,
      minTemperature: number,
      groupId: number,
      devId: string
    }[]
    removed_dacs: string[]
    removed_duts: string[]
    update_token: string
  }
  ['/diel-internal/health/dev/get-fr-list-updates-v2']: (reqParams: {
    update_token?: string
  }, extra: ExtraRouteParams) => {
    dacs: {
      DAC_ID: string
      DAC_TYPE: string
      DAC_APPL: string
      FLUID_TYPE: string
      hasAutomation: boolean
      isVrf: boolean
      P0Psuc: boolean
      P1Psuc: boolean
      P0Pliq: boolean
      P1Pliq: boolean
      P0mult: number
      P0ofst: number
      P1mult: number
      P1ofst: number
      T0_T1_T2: string
      ignoreFaults: string
      groupChillerCount: number
      groupId: number
      virtualL1: boolean
    }[]
    duts_aut: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature?: number,
      minTemperature?: number,
      groupId: number,
      devId: string,
      setpoint: number | null,
      application: string | null,
    }[]
    dutsduo: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature?: number,
      minTemperature?: number,
      groupId: number,
      devId: string,
      setpoint: number | null,
      application: string | null,
    }[]
    dams: {
      damId: string;
      dacId: string;
      groupId: number;
    }[]
    removed_dams: string[]
    removed_dacs: string[]
    removed_duts_aut: string[]
    removed_dutsduo: string[]
    update_token: string
  }
  ['/diel-internal/health/dac/falha-repentina-detectada-v2']: (reqParams: {
    devId: string,
    timestamp: string,
    fault_id: string,
    name: string,
    gravity: string,
    approval_type: string,
    rise: boolean,
    restab: boolean,
  }) => {
    success?: boolean,
    error?: string,
  }
  ['/diel-internal/health/dac/falha-instalacao-detectada']: (reqParams: {
    devId: string,
    faultName: string,
    faultTime: string,
    notifType: string,
  }) => {
    success: boolean,
  }
  ['/diel-internal/health/dac/get-health-hist']: (reqParams: {
    clientIds?: number[],
    clientId?: number,
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    dacId?: string,
    SKIP?: number,
    LIMIT?: number,
    SINCE?: string,
  }) => Promise<{
    list: {
      devId: string,
      assetId: number,
      date: string,
      DAT_REPORT: number,
      healthIndex: string,
      H_INDEX: number,
      possCauses: string[],
      UNIT_ID: number,
      desc: string,
      changeType: string,
    }[]
  }>
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

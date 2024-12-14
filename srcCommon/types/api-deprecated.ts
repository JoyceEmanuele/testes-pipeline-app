import { SessionData } from '.';
import { ExtraRouteParams, BinaryRouteResponse } from './backendTypes';

export default interface API_private_deprecated {
  ['/dam/get-programming-v2']: (reqParams: { damId: string }, session: SessionData) => Promise<FullProg_v3>
  ['/dam/set-programming-v2']: (reqParams: { damId: string } & FullProg_v3, session: SessionData) => Promise<FullProg_v3>
  ['/set-full-sched-batch']: (reqParams: { damIds: string[], dutIds: string[] } & FullProg_v3, session: SessionData) => Promise<{
    responsesDAM: ({ devId: string } & FullProg_v3)[]
    responsesDUT: ({ devId: string } & FullProg_v3)[]
  }>
  ['/dam/get-sched-list']: (reqParams: { damIds?: string[] }, session: SessionData) => Promise<{
    list: {
      damId: string,
      current: FullProg_v3,
      desired: FullProg_v3
    }[]
  }>
  ['/dut/get-programming-v2']: (reqParams: { dutId: string }, session: SessionData) => Promise<FullProg_v3>
  ['/dut/set-programming-v2']: (reqParams: { dutId: string } & FullProg_v3, session: SessionData) => Promise<FullProg_v3>
  ['/clients/set-room-progs']: (reqParams: {
    ROOM_ID: number
    progs: {
      ON: FullProg_v3
      OFF: FullProg_v3
    }
    schedTurn: {
      numDays: number
      datRef: string // "YYYY-MM-DD"
      devs: {
        [devId: string]: ('ON'|'OFF')[]
      }
    }
  }, session: SessionData) => Promise<{
    success: true
    schedTurnStatus: boolean
  }>
  ['/clients/get-room-info']: (reqParams: {
    ROOM_ID: number
  }, session: SessionData) => Promise<{
    info: {
      ROOM_ID: number
      CLIENT_ID: number
      UNIT_ID: number
      ROOM_NAME: string
      progs: null|{
        ON: FullProg_v3
        OFF: FullProg_v3
      }
      schedTurn: null|{
        numDays: number
        datRef: string // "YYYY-MM-DD"
        devs: {
          [devId: string]: ('ON'|'OFF')[]
        }
      }
    }
  }>
  ['/users/set-notif-faults']: (reqParams: {
    USER?: string
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    FREQ: 'NONE'|'DAY'|'WEEK'|'MONTH'
  }, session: SessionData) => Promise<string>

  ['/users/get-notif-faults']: (reqParams: {
    USER?: string
  }, session: SessionData) => Promise<{
    USER: string
    FILT_TYPE: string
    FILT_IDS: string[] | number[]
    filter: string
    FREQ: string // 'NONE'|'DAY'|'WEEK'|'MONTH'
  }>

  ['/clients/get-unit-devs-disp']: (reqParams: {
    UNIT_ID: number
    startDate: string
    endDate: string
  }, session: SessionData) => Promise<{
      list: {
        devId: string,
        disponibility: number,
        startDate: string,
        endDate: string,
        daysCounted: number,
        clientName: string,
        unitName: string,
        groupName?: string,
        roomName?: string,
      }[]
  }>

  ['/dac/get-fr-list-updates']: (reqParams: {
    update_token?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
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
    }[]
    removed: string[]
    update_token: string
  }>

  ['/sims']: (reqParams: {}, session: SessionData) => Promise<{
    id: number
    soldplan__consumption_f: string
    line__total_f: string
    iccid: string
    status__name: string
    soldplan__name: string
    last_conn: string
    last_disc: string
    client: number
    clientName: string
    unit: number
    unitName: string
    accessPoint: string
    modem: string
    accessPointMAC: string
    repeaterMAC: string
  }[]>

  ['/clients/add-baseline-values']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
    baselineValues:{
      BASELINE_MONTH: number,
      BASELINE_KWH: number,
      BASELINE_PRICE: number,
    }[]
  }, session: SessionData) => Promise<{
    BASELINE_ID: number,
  }>

  ['/clients/edit-baseline-values']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
    baselineValues:{
      BASELINE_MONTH: number,
      BASELINE_KWH: number,
      BASELINE_PRICE: number,
    }[]
  }, session: SessionData) => Promise<{
    BASELINE_ID: number,
  }>

  ['/heat-exchanger/get-list']: (reqParams: {
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    NAME: string
    BRAND: string
    MODEL: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }[]>

  ['/heat-exchanger/set-info']: (reqParams: {
    ID: number
    NAME: string
    BRAND?: string
    MODEL?: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/create']: (reqParams: {
    NAME: string
    BRAND?: string
    MODEL?: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/get-brands-list']: (reqParams: {
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    value: string
    label: string
    tags: string
  }[]>

  ['/heat-exchanger/get-info']: (reqParams: {
    CLIENT_ID: number
    HEAT_EXCHANGER_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    NAME: string
    BRAND: string
    MODEL: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }>
  ['/dut/set-dut-rtype']: (reqParams: {
    DEV_IDS: {
      DEV_ID: string,
      ENVIRONMENT_ID: number,
      ROOM_NAME: string,
      RTYPE_ID: number,
      ENVIRONMENTS_ROOM_TYPES_ID: number
    }[],
    RTYPE_ID: number | null,
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/clients/get-machines-list-overview']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    MACHINE_ID: number | null
    MACHINE_NAME: string | null
    UNIT_ID: number | null
    UNIT_NAME: string | null
    CITY_NAME: string | null
    STATE_ID: string | null
    GROUP_ID: number | null
    assets: AssetWithStatus[]
  }[]>

  ['/environments/get-environment-list-overview']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    environments: {
      ENVIRONMENT: string | null
      DUT_CODE: string | null
      STATUS: string | null
    }[]
  }>

  ['/energy/get-energy-list-overview']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    device: {
      DEVICE: string;
      ENERGY_DEVICES_INFO_ID: number;
      STATUS?: string;
    }[]
  }>

  ['/get-integrations-list/water-overview']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    list: {
      DEVICE: string;
      STATUS?: string;
    }[]
  }>

  ['/dac/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dac/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dac/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dut/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dut/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dut/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dam/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dam/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dam/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dri/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dri/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dri/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dma/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dma/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dma/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/laager/upload-image']: (reqParams: { unLaager: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/laager/get-images-list']: (reqParams: { unLaager: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/laager/delete-image']: (reqParams: { unLaager: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/asset/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/asset/get-images-list']: (reqParams: { devId?: string, assetId?: number }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/asset/delete-image']: (reqParams: { devId?: string, assetId?: number, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/devgroups/upload-image']: (reqParams: { groupId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/devgroups/get-images-list']: (reqParams: { groupId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/devgroups/delete-image']: (reqParams: { groupId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dal/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dal/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dal/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/illumination/upload-image']: (reqParams: { illuminationId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/illumination/get-images-list']: (reqParams: { illuminationId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/illumination/delete-image']: (reqParams: { illuminationId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/dmt/upload-image']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dmt/get-images-list']: (reqParams: { devId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/dmt/delete-image']: (reqParams: { devId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/nobreak/upload-image']: (reqParams: { nobreakId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/nobreak/get-images-list']: (reqParams: { nobreakId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{ list: string[] }>
  ['/nobreak/delete-image']: (reqParams: { nobreakId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  
  ['/unit/upload-sketch']: (reqParams: {
    unitId: string,
    isVisible: string,
    name_sketch: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/unit/get-sketches-list']: (reqParams: { unitId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      UNIT_SKETCH_ID: number;
      FILENAME: string;
      ISVISIBLE: number;
      NAME_SKETCH: string;
    }[]
  }>
  ['/unit/delete-sketch']: (reqParams: { unitId: string, filename: string }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/unit/edit-sketch']: (reqParams: {
    sketchList: {
      UNIT_SKETCH_ID: number
      FILENAME: string
      ISVISIBLE: number
      NAME_SKETCH: string
    }[],
    unitId: number,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    UNIT_SKETCH_ID: number
    FILENAME: string
    ISVISIBLE: number
    NAME_SKETCH: string
  }[]>

  ['/unit/download-sketches']: (reqParams: {
    unit_id: number,
    UNIT_SKETCH_ID: number,
    FILENAME: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/sims/upload-sim-photo']: (reqParams: {
    iccid: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/sims/delete-sim-photo']: (reqParams: {
    deletePhotos: {
      iccid: string,
      filename: string
    }[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<string>
}

type ControlMode = '0_NO_CONTROL'|'1_CONTROL'|'2_SOB_DEMANDA'|'3_BACKUP'|'4_BLOCKED'|'5_BACKUP_CONTROL'|'6_BACKUP_CONTROL_V2'|'7_FORCED'|'8_ECO_2';

interface DayProg {
  permission: 'allow'|'forbid',
  start: string, // '00:00'
  end: string, // '23:59'
  clearProg?: boolean,
}

interface FullProg_v3 {
  // version: "v3"
  week: {
    mon?: DayProg
    tue?: DayProg
    wed?: DayProg
    thu?: DayProg
    fri?: DayProg
    sat?: DayProg
    sun?: DayProg
  }
  exceptions: {
    [day: string]: DayProg
  },
  ventilation?: number
  temprtControl?: {
    temperature: number
    LTC: number
    mode: ControlMode
    LTI: number
  }
}

interface ParamsOverview {
  clientIds?: number[],
  stateIds?: number[],
  cityIds?: string[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}

export interface Asset {
  ASSET_ID: number;
  DAT_ID: string | null;
  AST_DESC: string;
  INSTALLATION_LOCATION: string | null;
  AST_TYPE: string | null;
  CAPACITY_PWR: number | null;
  CAPACITY_UNIT: string | null;
  CLIENT_ID: number | null;
  FLUID_TYPE: string | null;
  GROUP_ID: number | null;
  MCHN_APPL: string | null;
  MCHN_BRAND: string | null;
  MCHN_ENV: string | null;
  MCHN_KW: number | null;
  MCHN_MODEL: string | null;
  UNIT_ID: number;
  INSTALLATION_DATE: string | null;
  AST_ROLE: number | null;
  DEV_ID: string | null;
  DEV_CLIENT_ASSET_ID: number | null;
  DAT_INDEX: number | null;
}

export interface AssetWithStatus extends Asset {
  STATUS?: string | null;
}
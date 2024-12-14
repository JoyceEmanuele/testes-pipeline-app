import { faker } from "@faker-js/faker";
import express = require("express");
import { ExtraRouteParams } from "../../../srcCommon/types/backendTypes";
import { ApiParams } from "../../apiServer/httpRouter";
import sqldb from '../../../srcCommon/db';
import { DriVarsConfig } from "../../../srcCommon/types";
import moment = require("moment-timezone");
import { parseFirmwareVersion } from '../../../srcCommon/helpers/fwVersion'

interface RowDriVar {
  COMMAND: string;
  SYS_ID: number;
  ADDRESS: number;
  DESCRIPTION: string;
  IP: string;
  ID: number;
  SIZE: number;
  FUNC_ID: number;
  R_W: string;
  UNIT: string;
  FORMULA: string;
  ALIAS: string;
}

export function generateDriVarsParsedTable() {
  const commandsList = [] as RowDriVar[];
  for (let i = 0; i < 10; i++) {
    commandsList.push({
      COMMAND: `CMN${faker.string.numeric(2)}`,
      SYS_ID: faker.number.int({ min: 1 }),
      ADDRESS: Number(faker.string.numeric(2)),
      DESCRIPTION: faker.word.noun(),
      IP: null,
      ID: faker.number.int({ min: 1 }),
      SIZE: faker.number.int({ min: 1 }),
      FUNC_ID: faker.number.int({ min: 1 }),
      R_W: "R",
      UNIT: null,
      FORMULA: null,
      ALIAS: faker.word.noun(),
    });
  }
  return commandsList;
}

type DriBasicInfoProps = {
  FANCOIL_ID?: string;
};
export function generateDriBasicInfo(props: DriBasicInfoProps) {
  return {
    DRI_ID: props.FANCOIL_ID,
    CLIENT_ID: faker.number.int({ min: 1 }),
    UNIT_ID: faker.number.int({ min: 1 }),
    VARSCFG: JSON.stringify(mockLoadDriCfg()),
    ENABLE_ECO: 0,
    DAT_BEGAUT: "",
    DEVICE_ID: 1,
    DRI_DEVICE_ID: 1,
    AUTOMATION_INTERVAL: 5
  };
}

export interface DriFancoil {
  FANCOIL_ID: string;
  THERM_MANUF: string;
  THERM_MODEL: string;
  THERM_T_MIN: number;
  THERM_T_MAX: number;
  VALVE_MANUF: string;
  VALVE_MODEL: string;
  VALVE_TYPE: string;
  FANCOIL_MANUF: string;
  FANCOIL_MODEL: string;
  ROOM_NAME: string;
  RTYPE_ID: number;
  HAS_ROOMTYPE: number;
  DUT_ID_FROM_ROOM: string;
  ROOM_TYPE_NAME: string;
  TUSEMIN: number;
  TUSEMAX: number;
}

type DriFancoilInfoProps = {
  FANCOIL_ID?: string;
  HAS_ROOMTYPE?: number;
};

export function generateDriFancoilInfo(props: DriFancoilInfoProps) {
  return {
    FANCOIL_ID: props.FANCOIL_ID || faker.string.alphanumeric({ length: 12 }),
    THERM_MANUF: faker.company.name(),
    THERM_MODEL: faker.commerce.product(),
    THERM_T_MIN: faker.string.numeric({ length: 2 }),
    THERM_T_MAX: faker.string.numeric({ length: 2 }),
    VALVE_MANUF: faker.company.name(),
    VALVE_MODEL: faker.commerce.product(),
    VALVE_TYPE: faker.number.int() % 2 ? 'PROPORTIONAL' : 'ON-OFF',
    FANCOIL_MANUF: faker.company.name(),
    FANCOIL_MODEL: faker.commerce.product(),
    ROOM_NAME: faker.word.words({ count: 2 }),
    RTYPE_ID: faker.string.numeric({ length: 2 }),
    HAS_ROOMTYPE: props.HAS_ROOMTYPE ?? faker.datatype.boolean(),
    DUT_ID_FROM_ROOM: faker.string.alphanumeric({ length: 12 }),
    ROOM_TYPE_NAME: faker.word.words({ count: 2 }),
    TUSEMIN: faker.string.numeric({ length: 2 }),
    TUSEMAX: faker.string.numeric({ length: 2 }),
  };
}

export function mockGetChillersAlarmsList() {
  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      ID: Number(faker.string.numeric({ exclude: ['0'] })),
      ALARM_CODE: faker.string.alphanumeric(),
    }
  })
}

export function mockParamsGetAllChillerAlarmsCodes() {
  return {
    DEVICE_CODE: faker.string.alphanumeric({ length: 12 }),
    START_DATE: faker.date.past().toISOString(),
    END_DATE: faker.date.past().toISOString(),
  }
}

export function mockGetBasicInfoDri() {
  return {
    DRI_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
  }
}

export function mockGetAlarmsHist() {
  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      ID: Number(faker.string.numeric({ exclude: ['0'] })),
      ALARM_CODE: faker.string.alphanumeric(),
      START_DATE: faker.date.past().toISOString(),
      END_DATE: faker.date.past().toISOString(),
      REASON_ALARM: faker.string.alphanumeric(),
      DESCRIPTION: faker.string.alphanumeric(),
      ACTION_TAKEN: faker.string.alphanumeric(),
      RESET_TYPE: faker.string.alphanumeric(),
    }
  })
}

export function mockGetAllChillerAlarmsCodes() {
  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      ALARM_CODE: faker.string.alphanumeric(),
    }
  });
}

export function mockGetTimezoneByUnit() {
  return {
    TIMEZONE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    TIMEZONE_AREA: faker.string.alphanumeric(),
    TIMEZONE_OFFSET: faker.number.int({ min: -12, max: 12 }),
  }
}

export function mockParamsGetChillerAlarmsHist() {
  return {
    DEVICE_CODE: faker.string.alphanumeric({ length: 12 }),
    START_DATE: faker.date.past().toISOString(),
    END_DATE: faker.date.past().toISOString(),
    SKIP: faker.number.int({ min: 0, max: 10 }),
    LIMIT: faker.number.int({ min: 1, max: 10 }),
    ORDER_BY: { column: faker.string.alphanumeric({ length: 12 }), desc: !!faker.number.int({ min: 0, max: 1 }) },
    columnsToExport: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => {
      return faker.string.alphanumeric({ length: 12 });
    }),
    filterBy: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => {
      return {
        column: faker.string.alphanumeric({ length: 12 }),
        values: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
          return faker.string.alphanumeric({ length: 10 })
        }),
      }
    }),
  }
}

export function mockCountAlarmsToPage() {
  return {
    TOTAL_ALARMS: faker.number.int({ min: 0, max: 10 }),
  }
}

export function mockGetFilterColumnsFormatted() {
  return {
    FILTER_ALARM_CODE: [] as string[],
    FILTER_DESCRIPTION: [] as string[],
    FILTER_REASON_ALARM: [] as string[],
    FILTER_ACTION_TAKEN: [] as string[],
    FILTER_RESET_TYPE: [] as string[],
    FILTER_CAUSE: [] as string[],
  }
}

const mockedReq = {
  body: mockParamsGetChillerAlarmsHist(),
  headers: {
    "accept-language": 'pt',
  },
} as express.Request;

const mockedResponse = {
  setHeader: jest.fn(),
  status: jest.fn(() => mockedResponse),
  send: jest.fn(),
  json: jest.fn(),
  append: jest.fn(),
  end: jest.fn(),
} as unknown as express.Response;

export const mockedExtraParams: ExtraRouteParams = {
  req: mockedReq,
  res: mockedResponse,
};

export function mockGetLanguage() {
  const languages = ['pt', 'en'];
  const randomIndex = faker.number.int({ min: 0, max: 1 });

  return languages[randomIndex];
}

export function mockGetPrefsUser() {
  return [{ PREFS: mockGetLanguage() }];
}

export function mockCalculateDateByTimezone() {
  return faker.date.past().toISOString();
}

export function mockParamsGetFilterColumnsFormatted() {
  const columns = ['ALARM_CODE', 'DESCRIPTION', 'REASON_ALARM', 'ACTION_TAKEN', 'RESET_TYPE', 'CAUSE'];

  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      column: columns[faker.number.int({ min: 0, max: columns.length - 1 })],
      values: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return String(faker.number.int({ min: 1, max: 400 }));
      })
    }
  });
}

export function mockParamsGetChillerParametersHist() {
  return {
    DEVICE_CODE: faker.string.alphanumeric({ length: 12 }),
    START_DATE: faker.date.past().toISOString(),
    END_DATE: faker.date.past().toISOString(),
    MODEL: 'XA',
    HOUR_GRAPHIC: !!faker.number.int({ min: 0, max: 1 }),
  }
}

export function mockGetChillerParametersHist() {
  return {
    data: {
      parameters_grouped_hist: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
          device_code: faker.string.alphanumeric({ length: 12 }),
          record_date: faker.date.past().toISOString(),
          cap_t: faker.number.int(),
          dem_lim: faker.number.int(),
          lag_lim: faker.number.int(),
          sp: faker.number.int(),
          ctrl_pnt: faker.number.int(),
          capa_t: faker.number.int(),
          dp_a: faker.number.int(),
          sp_a: faker.number.int(),
          sct_a: faker.number.int(),
          sst_a: faker.number.int(),
          capb_t: faker.number.int(),
          dp_b: faker.number.int(),
          sp_b: faker.number.int(),
          sct_b: faker.number.int(),
          sst_b: faker.number.int(),
          cond_lwt: faker.number.int(),
          cond_ewt: faker.number.int(),
          cool_lwt: faker.number.int(),
          cool_ewt: faker.number.int(),
          cpa1_op: faker.number.int(),
          cpa2_op: faker.number.int(),
          dop_a1: faker.number.int(),
          dop_a2: faker.number.int(),
          cpa1_dgt: faker.number.int(),
          cpa2_dgt: faker.number.int(),
          exv_a: faker.number.int(),
          hr_cp_a1: faker.number.int(),
          hr_cp_a2: faker.number.int(),
          cpa1_tmp: faker.number.int(),
          cpa2_tmp: faker.number.int(),
          cpa1_cur: faker.number.int(),
          cpa2_cur: faker.number.int(),
          cpb1_op: faker.number.int(),
          cpb2_op: faker.number.int(),
          dop_b1: faker.number.int(),
          dop_b2: faker.number.int(),
          cpb1_dgt: faker.number.int(),
          cpb2_dgt: faker.number.int(),
          exv_b: faker.number.int(),
          hr_cp_b1: faker.number.int(),
          hr_cp_b2: faker.number.int(),
          cpb1_tmp: faker.number.int(),
          cpb2_tmp: faker.number.int(),
          cpb1_cur: faker.number.int(),
          cpb2_cur: faker.number.int(),
          cond_sp: faker.number.int(),
        }
      }),
      parameters_changes_hist: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
          device_code: faker.string.alphanumeric({ length: 12 }),
          record_date: faker.date.past().toISOString(),
          parameter_name: faker.string.alphanumeric({ length: 6 }),
          parameter_value: faker.number.int(),
        }
      }),
    }
  }
}


export function mockAddDriSchedParams(exception?: boolean, active?: boolean, additionalInputs?: Partial<ApiParams['/dri/add-dri-sched']>): ApiParams['/dri/add-dri-sched'] {
  return {
    ACTIVE: active ? '1' : '0',
    BEGIN_TIME: '00:00',
    END_TIME: '23:59',
    DRI_ID: `DRI${faker.number.int({ min: 0, max: 999999999 }).toString().padStart(9, '0')}`,
    NAME: faker.string.alpha({ length: 5 }),
    OPERATION: '1',
    MODE: 'COOL',
    SETPOINT: 24,
    ...(exception && {
      EXCEPTION_DATE: moment(faker.date.soon()).format('YYYY-MM-DD'),
      EXCEPTION_REPEAT_YEARLY: '0',
    }),
    DAYS: JSON.stringify(exception ? {} : {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: true,
    }),
    ...additionalInputs,
  }
}

export function mockUpdateDriSchedParams(exception?: boolean, active?: boolean, additionalInputs?: Partial<ApiParams['/dri/update-dri-sched']>): ApiParams['/dri/update-dri-sched'] {
  return {
    ACTIVE: active ? '1' : '0',
    BEGIN_TIME: '00:00',
    END_TIME: '23:59',
    DRI_ID: `DRI${faker.number.int({ min: 0, max: 999999999 }).toString().padStart(9, '0')}`,
    NAME: faker.string.alpha({ length: 5 }),
    OPERATION: '1',
    MODE: 'COOL',
    SETPOINT: 24,
    ...(exception && {
      EXCEPTION_DATE: moment(faker.date.soon()).format('YYYY-MM-DD'),
      EXCEPTION_REPEAT_YEARLY: '0',
    }),
    DAYS: JSON.stringify(exception ? {} : {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: true,
    }),
    ...additionalInputs,
    SCHED_ID: faker.number.int({ min: 1 }),
  }
}

export function mockDeleteDriSchedParams(): ApiParams['/dri/delete-dri-sched'] {
  return {
    DRI_ID: `DRI${faker.number.int({ min: 0, max: 999999999 }).toString().padStart(9, '0')}`,
    SCHED_ID: faker.number.int({ min: 1 }),
  }
}

export function mockFwVersion(devId: string, version: string): Awaited<ReturnType<typeof sqldb.DEVFWVERS.getDevFwInfo>> {
  const parsedVersion = parseFirmwareVersion(version);
  return {
    DEV_ID: devId,
    CURRFW_VERS: version,
    CURRFW_DATE: new Date().toISOString(),
    CURRFW_MSG: JSON.stringify({}),
    CURRFW_VLDSENT: '',
    HW_TYPE: 'dri0',
    TARGFW_RCVDATE: '',
    TARGFW_RCVPATH: '',
    TARGFW_REQDATE: '',
    TARGFW_REQVERS: '',
    TARGFW_SENDDATE: '',
    TARGFW_SENDPATH: '',
    V_MAJOR: parsedVersion.vMajor,
    V_MINOR: parsedVersion.vMinor,
    V_PATCH: parsedVersion.vPatch,
    V_EXTRA: parsedVersion.vExtra,
  }
}

export function mockGetDrisAutomationInfo(): Awaited<ReturnType<typeof sqldb.DRIS_AUTOMATIONS.getDrisAutomationInfo>> {
  return [
    {
      DUT_AUTOMATION_ID: faker.number.int({ min: 1 }),
      MACHINE_ID: faker.number.int({ min: 1 }),
      MACHINE_NAME: 'Máquina'
    }
  ]
}

export function mockGetCurrentAutomationsParametersByDevice():
  Awaited<ReturnType<typeof sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice>> {
  return {
    ID: faker.number.int({ min: 1 }),
    DAC_AUTOMATION_ID: 0,
    DAC_DEVICE_ID: 0,
    DAM_DEVICE_ID: 0,
    DESIRED_PROG: JSON.stringify({}),
    DRI_DEVICE_ID: faker.number.int({ min: 1 }),
    DUT_DEVICE_ID: 0,
    FIRST_PROGRAMMING_DATE: '',
    LAST_PROG: JSON.stringify({})
  }
}

export function mockLoadDriCfg(): DriVarsConfig & { formulas: Record<string, string> } {
  return {
    application: "carrier-ecosplit",
    protocol: "carrier-ecosplit",
    automationList: [
      {
        "alias": "FAN",
        "array": "[154,86,241,254,14,185,0,25,0,0,3,0,110,48]",
        "description": "Fan"
      },
      {
        "alias": "OFF",
        "array": "[154,86,241,254,14,182,0,24,0,0,1,0,98,30]",
        "description": "Turn OFF"
      },
      {
        "alias": "SET17",
        "array": "[154,86,241,254,14,185,0,17,0,0,1,0,100,28]",
        "description": "Setpoint Temp 17"
      },
      {
        "alias": "SET18",
        "array": "[154,86,241,254,14,185,0,18,0,0,1,0,103,32]",
        "description": "Setpoint Temp 18"
      },
      {
        "alias": "SET19",
        "array": "[154,86,241,254,14,185,0,19,0,0,1,0,102,32]",
        "description": "Setpoint Temp 19"
      },
      {
        "alias": "SET20",
        "array": "[154,86,241,254,14,185,0,20,0,0,1,0,97,28]",
        "description": "Setpoint Temp 20"
      },
      {
        "alias": "SET21",
        "array": "[154,86,241,254,14,185,0,21,0,0,1,0,96,28]",
        "description": "Setpoint Temp 21"
      },
      {
        "alias": "SET22",
        "array": "[154,86,241,254,14,185,0,22,0,0,1,0,99,32]",
        "description": "Setpoint Temp 22"
      },
      {
        "alias": "SET23",
        "array": "[154,86,241,254,14,185,0,23,0,0,1,0,98,32]",
        "description": "Setpoint Temp 23"
      },
      {
        "alias": "SET24",
        "array": "[154,86,241,254,14,185,0,24,0,0,1,0,109,44]",
        "description": "Setpoint Temp 24"
      },
      {
        "alias": "SET25",
        "array": "[154,86,241,254,14,185,0,25,0,0,1,0,108,44]",
        "description": "Setpoint Temp 25"
      }
    ]
  } as unknown as DriVarsConfig & { formulas: Record<string, string> };
}

type DriSchedDatabase = Awaited<ReturnType<typeof sqldb.DRISCHEDS.getDriScheds>>[number];

export function mockDriSchedDatabase(driId: string, exception?: boolean, active?: boolean, additionalInfo?: Partial<DriSchedDatabase>): DriSchedDatabase {
  return {
    ACTIVE: active ? '1' : '0',
    AUTOMATION_PARAMETERS_ID: faker.number.int({ min: 1 }),
    MACHINE: faker.number.int({ min: 1 }),
    NAME: faker.string.alpha(10),
    BEGIN_TIME: '00:00',
    END_TIME: '23:59',
    DAYS: JSON.stringify(exception ? {} : {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: true,
    }),
    DRI_ID: driId,
    OPERATION: '1',
    MODE: 'FAN',
    SETPOINT: null,
    SCHED_ID: faker.number.int({ min: 1 }),
    ...(exception ? {
      EXCEPTION_DATE: moment(faker.date.soon()).format('YYYY-MM-DD'),
      EXCEPTION_REPEAT_YEARLY: '0',
      EXCEPTION_ID: faker.number.int({ min: 1 }),
      SCHEDULE_ID: null,
    } : {
      SCHEDULE_ID: faker.number.int({ min: 1 }),
      EXCEPTION_ID: null,
      EXCEPTION_DATE: null,
      EXCEPTION_REPEAT_YEARLY: '0'
    }),
    ...additionalInfo,
  }
}
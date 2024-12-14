import { faker } from "@faker-js/faker";
type TTypeReq = "setStatus" | "setWeeklyReport" | "setResponsible";
import { ExtraRouteParams } from '../../../srcCommon/types/backendTypes';
import * as httpRouter from "../../apiServer/httpRouter";
import * as express from "express";
import * as fs from "node:fs";
import * as path from "path";

export function generateUnitsMultiReqParams(selected: string, type: TTypeReq) {
    return {
        UNITS_IDS: [
        {
            UNIT_ID: faker.number.int(),
            SUPERVISOR_ID: faker.string.alpha(),
        },
        {
            UNIT_ID: faker.number.int(),
            SUPERVISOR_ID: faker.string.alpha(),
        }
        ],
        CLIENT_ID: faker.number.int(),
        TYPE: type,
        SELECTED: selected,
    }
}
export function generateUnitsMultiReqParamsWithoutSupervisor(selected: string, type: TTypeReq) {
    return {
        UNITS_IDS: [
        {
            UNIT_ID: faker.number.int(),
            SUPERVISOR_ID: null as any,
        },
        {
            UNIT_ID: faker.number.int(),
            SUPERVISOR_ID: null as any,
        }
        ],
        CLIENT_ID: faker.number.int(),
        TYPE: type,
        SELECTED: selected,
    }
}

export function generatePermissionOnClient(bool: boolean) {
    return {
        canManageClient: bool,
        canAddUsersToClient: bool,
        isClientUser: bool,
        canConfigureNewUnits: bool,
        canManageClientNotifs: bool,
        canManageDevs: bool,
        canViewDevs: bool,
        canDeleteDevs: bool,
        canEditProgramming: bool,
        canViewClientUnits: bool,
        canManageObservations: bool,
        canViewObservations: bool,
        canManageSketches: bool,
    }
}

const mockedReq = {
    body: {
      CLIENT_ID: faker.string.numeric(),
    },
    headers: {
    "accept-language": 'pt',
    },
  } as express.Request;
  
  const mockedResponse = {
    setHeader: jest.fn(),
  } as unknown as express.Response;
  
  export const mockedExtraParams: ExtraRouteParams = {
    req: mockedReq,
    res: mockedResponse,
  };
  

  export function generateReqparamsExportRealTimeMachine(exportation: string, mode: string) {
    return {
    EXPORTATION: exportation,
    UNIT_ID: faker.number.int(),
    CLIENT_ID: faker.number.int(),
    ...generateMachine(),
    ...generateEnvironment(),
    MODE: mode,
    }
  }

  export function generateMachine() {
    return {
        DATA_MACHINE: [
            {
                application: faker.string.alphanumeric(),
                DEV_AUT: faker.string.alphanumeric(),
                name: faker.string.alphanumeric(),
                groupId: faker.number.int(),
                dacs: [{
                    DAC_ID: faker.string.alphanumeric(),
                    GROUP_ID: faker.number.int(),
                    GROUP_NAME: faker.string.alphanumeric(),
                    UNIT_ID: faker.number.int(),
                    DAC_NAME: faker.string.alphanumeric(),
                    H_INDEX: faker.number.int(),
                    status: faker.string.alphanumeric(),
                    Lcmp: faker.number.int(),
                    lastCommTs: faker.string.alphanumeric(),
                    CLIENT_ID: faker.number.int(),
                    HEAT_EXCHANGER_ID: faker.number.int(),
                }],
                dams: [
                    {
                        DAM_ID: faker.string.alphanumeric(),
                        UNIT_ID: faker.number.int(),
                        State: faker.string.alphanumeric(),
                        Mode: faker.string.alphanumeric(),
                        status: faker.string.alphanumeric(),
                      }
                ],
                dats: [
                    {
                        DAT_ID: faker.string.alphanumeric(),
                        UNIT_ID: faker.number.int(),
                        GROUP_NAME: faker.string.alphanumeric(),
                        GROUP_ID: faker.number.int(),
                        DEV_ID: faker.string.alphanumeric(),
                        AST_DESC: faker.string.alphanumeric(),
                      },
                ],
            }
        ],
    }
  }

  export function generateEnvironment() {
    return {
    DATA_ENVIRONMENT: [
        {
            DEV_ID: faker.string.alphanumeric(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_NAME: faker.string.alphanumeric(),
            PLACEMENT: 'AMB' as 'AMB' | 'INS' | 'DUO',
            ISVISIBLE: Number(faker.string.numeric({ exclude: ['0'] })),
            Temperature: faker.string.alphanumeric(),
            Temperature_1: faker.string.alphanumeric(),
            temprtAlert: 'low' as 'low'|'high'|'good'|null,
            Mode: faker.string.alphanumeric(),
            TUSEMIN: faker.string.alphanumeric(),
            TUSEMAX: faker.string.alphanumeric(),
            status: faker.string.alphanumeric(),
            RSSI: Number(faker.string.numeric({ exclude: ['0'] })),
            Humidity: Number(faker.string.numeric({ exclude: ['0'] })),
            CO2MAX: Number(faker.string.numeric({ exclude: ['0'] })),
            eCO2: Number(faker.string.numeric({ exclude: ['0'] })),
            HUMIMAX: Number(faker.string.numeric({ exclude: ['0'] })),
            HUMIMIN: Number(faker.string.numeric({ exclude: ['0'] })),
            tpstats: { med: Number(faker.string.numeric({ exclude: ['0'] })), max: Number(faker.string.numeric({ exclude: ['0'] })), min:  Number(faker.string.numeric({ exclude: ['0'] })), }
        }
    ]
    }
}

export function mockReqParamsGetAllUnitsByClient() {
    return {
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNITS_WITH_OTHERS_TIMEZONES: !!faker.number.int({ min: 0, max : 1 }),
        FILTER_BY_UNIT_IDS: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
            return faker.number.int();
        }),
        FILTER_BY_PRODUCTION_TIMESTAMP: faker.date.past().toISOString(),
    }
}

export function mockGetAllUnitsByClient() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            UNIT_NAME: faker.string.alphanumeric(),
            UNIT_CODE_CELSIUS: faker.string.alphanumeric(),
            UNIT_CODE_API: faker.string.alphanumeric(),
            CLIENT_NAME: faker.string.alphanumeric(),
            CITY_NAME: faker.string.alphanumeric(),
            STATE_NAME: faker.string.alphanumeric(),
            TARIFA_KWH: faker.number.float(),
            CONSTRUCTED_AREA: faker.number.float(),
            CAPACITY_POWER: faker.number.float()
        }
    })
}
export function generateObservation() {
    return {
        ID: Number(faker.string.numeric({ exclude: ['0'] })),
        ISVISIBLE: Number(faker.string.numeric({ exclude: ['0'] })),
        DATE_OBS: faker.date.anytime(),
        OBS: faker.string.alphanumeric(),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        USER_ID: faker.string.alphanumeric(),
        NOME: faker.string.alphanumeric(),
        SOBRENOME: faker.string.alphanumeric(),
    }
}

export function generateObservationSample() {
    return {
        ID: Number(faker.string.numeric({ exclude: ['0'] })),
        ISVISIBLE: Number(faker.string.numeric({ exclude: ['0'] })),
        DATE_OBS: faker.date.anytime(),
        OBS: faker.string.alphanumeric(),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        USER_ID: faker.string.alphanumeric(),
    }
}

export function generatePermissionOnUnit(bool: boolean) {
    return {
        canManageDevs: bool,
        canViewDevs: bool,
        canChangeDeviceOperation: bool,
        canManageObservations: bool,
        canViewObservations: bool,
        canManageSketches: bool,
        canEditProgramming: bool,
    }
}

export function mockUnitBasic() {
    return {
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        PRODUCTION: Number(faker.string.numeric({ exclude: ['0'] })),
        PRODUCTION_TIMESTAMP: faker.string.alphanumeric(),
        TIMEZONE_OFFSET: faker.number.int({ min: 1 }),
        TIMEZONE_AREA: faker.string.alphanumeric(),
    }
}

export function mockParamsGetEnergyUnit() {
    return {
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        START_DATE: faker.date.past().toISOString(),
        END_DATE: faker.date.past().toISOString(),
        GET_HOURS_CONSUMPTION: !!faker.number.int({ min: 0, max: 1 }),
    }
}

export function mockGetRefrigerationConsumptionComputedDataService() {
    return {
        data: {
            total_refigeration_consumption: faker.number.int(),
            consumption_by_device_machine: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
                return {
                    machine_id: Number(faker.string.numeric({ exclude: ['0'] })),
                    device_code: faker.string.alphanumeric(),
                    total_refrigration_consumption: faker.number.int(),
                    total_utilization_time: faker.number.int(),
                }
            }),
        }
    }
}

export function mockGetEnergyDevicesByUnit() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DEVICE_CODE: faker.string.alphanumeric(),
            SERIAL: faker.string.alphanumeric(),
            MODEL: faker.string.alphanumeric(),
            ELECTRIC_CIRCUIT_NAME: faker.string.alphanumeric(),
            ELECTRIC_CIRCUIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MANUFACTURER: faker.string.alphanumeric(),
        }
    });
}

export function mockGetEnergyConsumptionComputeDataService() {
    return {
        data: {
            energy_consumption_list: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
                return {
                    electric_circuit_reference_id: Number(faker.string.numeric({ exclude: ['0'] })),
                    day: faker.date.past().toISOString(),
                    total_measured: faker.number.int(),
                    max_day_total_measured: faker.number.int(),
                    hours: Array.from({ length: 24 }, () => {
                        return {
                            hour: String(faker.date.past().getHours()),
                            totalMeasured: faker.number.int(),
                        }
                    }),
                }
            }),
        }
    }
}

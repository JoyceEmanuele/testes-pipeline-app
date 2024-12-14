import { faker } from "@faker-js/faker";
import { mockDmaGetBasicInfo } from './laagerApiFactory';

export function getDeviceInfo(DEVICE_CODE: string) {
    return {
        DEVICE_CODE,
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_NAME: faker.string.alphanumeric(),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        CLIENT_NAME: faker.string.alphanumeric(),
    }
}

export function mockGetDutsDuoByUnit() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_NAME: faker.string.alphanumeric(),
            ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ASSET_NAME: faker.string.alphanumeric(),
            DEVICE_CODE: faker.string.alphanumeric(),
            MACHINE_KW: faker.number.int(),
            TEMPERATURE_OFFSET: faker.number.int(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        }
    })
}

function mockDacsDevicesWithConfig() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alphanumeric(),
            MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_NAME: faker.string.alphanumeric(),
            MACHINE_KW: faker.number.int(),
            IS_VRF: !!faker.number.int({ min: 0, max: 1 }),
            CALCULATE_L1_FANCOIL: !!faker.number.int({ min: 0, max: 1 }),
            HAS_AUTOMATION: !!faker.number.int({ min: 0, max: 1 }),
            FLUID_TYPE: faker.string.alphanumeric(),
            P0_PSUC: !!faker.number.int({ min: 0, max: 1 }),
            P1_PSUC: !!faker.number.int({ min: 0, max: 1 }),
            P0_PLIQ: !!faker.number.int({ min: 0, max: 1 }),
            P1_PLIQ: !!faker.number.int({ min: 0, max: 1 }),
            P0_MULT: faker.number.float(),
            P1_MULT: faker.number.float(),
            P0_MULT_LIN: faker.number.float(),
            P1_MULT_LIN: faker.number.float(),
            P0_MULT_QUAD: faker.number.float(),
            P1_MULT_QUAD: faker.number.float(),
            P0_OFST: faker.number.float(),
            P1_OFST: faker.number.float(),
            T0_T1_T2: mockT0_T1_T2(),
            VIRTUAL_L1: !!faker.number.int({ min: 0, max: 1 }),
        }
    })
}

function mockT0_T1_T2() {
    let T0_T1_T2 = ['T0', 'T1', 'T2'];
    T0_T1_T2 = T0_T1_T2.sort(() => Math.random() - 0.5);

    return T0_T1_T2;
}
export function mockParamsDevicesToDisponibility() {
    return {
        unitId: Number(faker.string.numeric({ exclude: ['0'] })),
        duts_devices_list: mockGetDutsDuoByUnit(),
        dacs_devices_list: mockDacsDevicesWithConfig(),
        duts_to_l1_automation: mockGetDutsDuoByUnit(),
    }
}

export function getAllDutsByUnit() {
    return Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alphanumeric(),
            TEMPERATURE_OFFSET: faker.number.int(),
        }
    })
}

export function getAllDevicesSimpleByUnit() {
    return Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alphanumeric(),
        }
    })
}

export function mockReqParamsGetConfigDevices() {
    return {
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DAY: faker.date.past().toISOString(),
    }
}

export function mockGetUnitBasicInfo() {
    return {
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        PRODUCTION: 1,
        PRODUCTION_TIMESTAMP: faker.date.recent().toISOString(),
        TIMEZONE_OFFSET: -3,
        TIMEZONE_AREA: faker.string.alphanumeric(),
    }
}

export function mockGetDmaByUnit() {
    return {
        DMA_ID: faker.string.alphanumeric(),
        INSTALLATION_DATE: faker.date.past().toISOString(),
        INSTALLATION_LOCATION: faker.string.alphanumeric(),
        QUANTITY_OF_RESERVOIRS: faker.number.int(),
        TOTAL_CAPACITY: faker.number.int(),
        HYDROMETER_MODEL: faker.string.alphanumeric(),
        INSTALLATION_DATE_YMD: faker.string.alphanumeric(),
    }
}

export function mockGetLaagerByUnit() {
    return {
        LAAGER_CODE: faker.string.alphanumeric(),
    }
}

export function mockGetEnergyDevicesDriByUnit() {
    return Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alphanumeric(),
            SERIAL: faker.string.alphanumeric(),
            MODEL: faker.string.alphanumeric(),
            ELECTRIC_CIRCUIT_NAME: faker.string.alphanumeric(),
            ELECTRIC_CIRCUIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MANUFACTURER: faker.string.alphanumeric(),
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        }
    })
}

export function mockDacsByUnitWithMachineInfo() {
    return Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alphanumeric(),
            MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_NAME: faker.string.alphanumeric(),
            MACHINE_KW: faker.number.int(),
            FLUID_TYPE: faker.string.alphanumeric(),
            DAC_APPL: faker.string.alphanumeric(),
            DAC_TYPE:faker.string.alphanumeric(),
            P0_MULT_QUAD: faker.number.float(),
            P0_MULT_LIN: faker.number.float(),
            P0_OFST: faker.number.int(),
            P1_MULT: faker.number.int(),
            P1_MULT_QUAD: faker.number.float(),
            P1_MULT_LIN: faker.number.float(),
            P1_OFST: faker.number.int(),
            P0_SENSOR: faker.string.alphanumeric(),
            P1_SENSOR: faker.string.alphanumeric(),
            P0_POSITN: faker.string.alphanumeric(),
            P1_POSITN: faker.string.alphanumeric(),
            T0_T1_T2: faker.string.alphanumeric(),
            DAM_DISABLED: faker.number.int({ min: 0, max: 1}),
            SELECTED_L1_SIM: faker.string.alphanumeric(),
            ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ASSET_NAME: faker.string.alphanumeric(),
            V_MAJOR: faker.number.int(),
        }
    })
}

export function mockGetMachineAutInfo() {
    return {
        MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        MACHINE_NAME: faker.string.alphanumeric(),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DEV_AUT: faker.string.alphanumeric(),
        DUT_ID: faker.string.alphanumeric(),
        DAM_DISABLED: Number(faker.string.numeric({ exclude: ['0'] })),
        DAM_AS_DAC: faker.string.alphanumeric(),
        DUT_AS_DUTAUT: faker.string.alphanumeric(),
        DUT_AUT_DISABLED: Number(faker.string.numeric({ exclude: ['0'] })),
        TUSEMIN: Number(faker.string.numeric({ exclude: ['0'] })),
        TUSEMAX: Number(faker.string.numeric({ exclude: ['0'] })),
    }
}

export function mockDacHwCfg() {
    return {
        isVrf: !!faker.number.int({ min: 0, max: 1 }),
        calculate_L1_fancoil: !!faker.number.int({ min: 0, max: 1 }),
        hasAutomation: !!faker.number.int({ min: 0, max: 1 }),
        FLUID_TYPE: faker.string.alphanumeric(),
        P0Psuc: !!faker.number.int({ min: 0, max: 1 }),
        P1Psuc: !!faker.number.int({ min: 0, max: 1 }),
        P0Pliq: !!faker.number.int({ min: 0, max: 1 }),
        P1Pliq: !!faker.number.int({ min: 0, max: 1 }),
        P0mult: faker.number.int(),
        P1mult: faker.number.int(),
        P0ofst: faker.number.int(),
        P1ofst: faker.number.int(),
        TsensRename: {
            T0: 'T0',
            T1: 'T1',
            T2: 'T2'
        },
        simulateL1: !!faker.number.int({ min: 0, max: 1 }),
    }
}

export function mockGetDmaHist() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DMA_ID: faker.string.alphanumeric(),
            START_DATE: faker.date.past().toISOString(),
            FULL_START_DATE: faker.date.past().toISOString(),
            END_DATE: faker.date.past().toISOString(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] }))
        }
    })
}

export function mockGetLaagerHist() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            ID: Number(faker.string.numeric({ exclude: ['0'] })),
            LAAGER_ID: faker.string.alphanumeric(),
            START_DATE: faker.date.past().toISOString(),
            FULL_START_DATE: faker.date.past().toISOString(),
            END_DATE: faker.date.past().toISOString(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] }))
        }
    })
}

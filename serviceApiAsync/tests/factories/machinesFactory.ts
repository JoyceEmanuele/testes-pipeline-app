import { faker } from "@faker-js/faker";


export function getMachineInfo(MACHINE_ID: number) {
    return {
        GROUP_ID: MACHINE_ID,
        GROUP_NAME: faker.string.alphanumeric(),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DUT_ID: faker.string.alphanumeric(),
        DEV_AUT: faker.string.alphanumeric(),
        INSTALLATION_DATE: faker.string.alphanumeric(),
        MODEL: faker.string.alphanumeric(),
        APPLICATION: faker.string.alphanumeric(),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_NAME: faker.string.alphanumeric(),
        CITY_NAME: faker.string.alphanumeric(),
        STATE_ID: faker.string.alphanumeric(),
        DAM_DAT_BEGMON: faker.string.alphanumeric(),
        FLUID_TYPE: faker.string.alphanumeric(),
        MACHINE_BRAND: faker.string.alphanumeric(),
        RATED_POWER: Number(faker.string.numeric({ exclude: ['0'] })),
    }
}

export function getAllParametersByMachine() {
    return [
        {
            ID: Number(faker.string.numeric({ exclude: ['0'] })),
            COLUMN_NAME: faker.string.alphanumeric(),
            COLUMN_VALUE: faker.string.alphanumeric(),
        }
    ]
}

export function mockReqParamsAddNewMachine() {
    return {
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        GROUP_NAME: faker.string.alphanumeric(),
        DEV_AUT: faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(9),
        REL_DUT_ID: faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(9),
        MODEL: faker.string.alphanumeric(),
        INSTALLATION_DATE: faker.date.past.toString(),
        MCHN_APPL: faker.string.alphanumeric(),
        GROUP_TYPE: faker.string.alphanumeric(),
        BRAND: faker.string.alphanumeric(),
        FRIGO_CAPACITY: Number(faker.string.numeric({ exclude: ['0'] })),
        FRIGO_CAPACITY_UNIT: faker.string.alphanumeric(),
        FLUID_TYPE: faker.string.alphanumeric(),
        RATED_POWER: Number(faker.string.numeric({ exclude: ['0'] })),
        ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        ENVIRONMENT_NAME: faker.string.alphanumeric(),
        SUM_RATED_POWER_CONDENSERS: Number(faker.string.numeric({ exclude: ['0'] })),
    }
}

export function mockReqParamsEditMachineInfo() {
    return {
        GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        GROUP_NAME: faker.string.alphanumeric(),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        REL_DUT_ID: faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(9),
        REL_DEV_AUT: faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(9),
        MODEL: faker.string.alphanumeric(),
        INSTALLATION_DATE: faker.date.past.toString(),
        GROUP_TYPE: faker.string.alphanumeric(),
        BRAND: faker.string.alphanumeric(),
        FRIGO_CAPACITY: Number(faker.string.numeric({ exclude: ['0'] })),
        FRIGO_CAPACITY_UNIT: faker.string.alphanumeric(),
        FLUID_TYPE: faker.string.alphanumeric(),
        RATED_POWER: Number(faker.string.numeric({ exclude: ['0'] })),
        MCHN_APPL: faker.string.alphanumeric(),
        ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        ENVIRONMENT_NAME: faker.string.alphanumeric(),
        SUM_RATED_POWER_CONDENSERS: Number(faker.string.numeric({ exclude: ['0'] })),
    } 
}

export function mockUnitBasicInfo(CLIENT_ID: number) {
    return {
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        CLIENT_ID,
        PRODUCTION: faker.number.int({ min: 0, max: 1 }),
        PRODUCTION_TIMESTAMP: faker.date.past.toString(),
        TIMEZONE_OFFSET: Number(faker.string.numeric({ exclude: ['0'] })),
        TIMEZONE_AREA: faker.string.alphanumeric(),
    }
}

export function mockGetAssetsByMachine() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DAT_CODE: faker.string.alphanumeric(),
            CONDENSER_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CONDENSER_MACHINE_KW: Number(faker.string.numeric()),
        }
    })
}

export function mockMachineGetBasicInfo() {
    return {
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    }
}

export function mockGetMachineAutInfo(MACHINE_ID: number) {
    return {
        MACHINE_ID: MACHINE_ID,
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

export function mockGetMachineList() {
    return [{
        MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        ILLUMINATION_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        MACHINE_NAME: faker.string.alphanumeric(),
        ILLUMINATION_NAME: faker.string.alphanumeric(),
        MCHN_APPL: faker.string.alphanumeric(),
        BRAND: faker.string.alphanumeric(),
        DEV_AUT: faker.string.alphanumeric(),
        DUT_ID: faker.string.alphanumeric(),
        INSTALLATION_DATE: faker.string.alphanumeric(),
        GROUP_TYPE: faker.string.alphanumeric(),
        FLUID_TYPE: faker.string.alphanumeric(),
        UNIT_NAME: faker.string.alphanumeric(),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        STATE_ID: faker.string.alphanumeric(),
        CITY_NAME: faker.string.alphanumeric(),
        MODEL: faker.string.alphanumeric(),
        FRIGO_CAPACITY: Number(faker.string.numeric({ exclude: ['0'] })),
        FRIGO_CAPACITY_UNIT: faker.string.alphanumeric(), 
        RATED_POWER: Number(faker.string.numeric({ exclude: ['0'] })),
        MACHINE_RATED_POWER: Number(faker.string.numeric({ exclude: ['0'] })),
    }]
}

export function mockAssetsList() {
    return [{
        ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DAT_ID: faker.string.alphanumeric(),
        AST_DESC: faker.string.alphanumeric(),
        INSTALLATION_LOCATION: faker.string.alphanumeric(),
        MCHN_MODEL: faker.string.alphanumeric(),
        AST_TYPE: faker.string.alphanumeric(),
        CAPACITY_PWR: Number(faker.string.numeric({ exclude: ['0'] })),
        CAPACITY_UNIT: faker.string.alphanumeric(),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        FLUID_TYPE: faker.string.alphanumeric(),
        GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        MCHN_APPL: faker.string.alphanumeric(),
        MCHN_BRAND: faker.string.alphanumeric(),
        MCHN_ENV: faker.string.alphanumeric(),
        MCHN_KW: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        INSTALLATION_DATE: faker.string.alphanumeric(),
        AST_ROLE: Number(faker.string.numeric({ exclude: ['0'] })),
        AST_ROLE_NAME: faker.string.alphanumeric(),
        GROUP_NAME: faker.string.alphanumeric(),
        UNIT_NAME: faker.string.alphanumeric(),
        CLIENT_NAME: faker.string.alphanumeric(),
        CITY_NAME: faker.string.alphanumeric(),
        STATE_ID: faker.string.alphanumeric(),
        DEV_CLIENT_ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DAT_INDEX: Number(faker.string.numeric({ exclude: ['0'] })),
        DEV_ID: faker.string.alphanumeric(),
        CHILLER_MODEL_NAME: faker.string.alphanumeric(),
        CHILLER_MODEL_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        CHILLER_LINE_NAME: faker.string.alphanumeric(),
        CHILLER_LINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        NOMINAL_CAPACITY: Number(faker.string.numeric({ exclude: ['0'] })),
        NOMINAL_VOLTAGE: Number(faker.string.numeric({ exclude: ['0'] })),
        NOMINAL_FREQUENCY: Number(faker.string.numeric({ exclude: ['0'] })),
    }]
}
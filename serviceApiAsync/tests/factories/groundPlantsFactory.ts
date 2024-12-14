import { faker } from '@faker-js/faker';
import sqldb from '../../../srcCommon/db';


export function mockGetByUnitSql(){
    return {
        GROUNDPLAN_ID: Number(faker.string.numeric({ exclude: '0' })),
        UNIT_ID: Number(faker.string.numeric({ exclude: '0' })),
        FILENAME: faker.string.alphanumeric(),
        NAME_GP: faker.string.alphanumeric(),
        DAT_UPLOAD: faker.date.anytime(),
    }
}

export function mockPointsOfGPSql() {
    return {
        GROUND_PLAN_ID: Number(faker.string.numeric({ exclude: '0' })),
        POINT_ID: Number(faker.string.numeric({ exclude: '0' })),
        DEVICE_UNIT:  Number(faker.string.numeric({ exclude: '0' })),
        POINT_X: faker.string.alphanumeric(),
        POINT_Y: faker.string.alphanumeric(),
        DEV_ID: faker.string.alphanumeric(),
        ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: '0' })),
        DUT_ID: Number(faker.string.numeric({ exclude: '0' })),
        ROOM_NAME: faker.string.alphanumeric(),
        CO2MAX: Number(faker.string.numeric({ exclude: '0' })),
        TUSEMAX: Number(faker.string.numeric({ exclude: '0' })),
        TUSEMIN: Number(faker.string.numeric({ exclude: '0' })),
        HUMIMAX: Number(faker.string.numeric({ exclude: '0' })),
        HUMIMIN: Number(faker.string.numeric({ exclude: '0' })),
    }
}

export function mockAddTemperatureList() {
    return {
        TEMPERATURE: Number(faker.string.numeric({ exclude: '0' })),
        Temperature_1: Number(faker.string.numeric({ exclude: '0' })),
        HUMIDITY: Number(faker.string.numeric({ exclude: '0' })),
        eCO2: Number(faker.string.numeric({ exclude: '0' })),
        isDutQA: true,
    }
}

export function mockUnitBasic(){
    return {
        UNIT_ID: Number(faker.string.numeric({ exclude: '0' })),
        CLIENT_ID: Number(faker.string.numeric({ exclude: '0' })),
        PRODUCTION: Number(faker.string.numeric({ exclude: '0' })),
        TIMEZONE_OFFSET: Number(faker.string.numeric({ exclude: '0' })),
        TIMEZONE_AREA: faker.string.alphanumeric(),
        PRODUCTION_TIMESTAMP: faker.string.alphanumeric(),
    }
}

export function mockPermissionUnit(boolean: boolean) {
    return {
        canManageDevs: boolean,
        canViewDevs: boolean,
        canChangeDeviceOperation: boolean,
        canManageSketches: boolean,
        canManageObservations: boolean,
        canViewObservations: boolean,
        canEditProgramming: boolean,
    }
}

export function mockDuts() {
    return {
        DEV_ID: faker.string.alphanumeric(),
        DUT_ID: Number(faker.string.numeric({ exclude: '0' })),
        ROOM_NAME: faker.string.alphanumeric(),
        ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: '0' })),
        HUMIMAX: Number(faker.string.numeric({ exclude: '0' })),
        HUMIMIN: Number(faker.string.numeric({ exclude: '0' })),
        TUSEMAX: Number(faker.string.numeric({ exclude: '0' })),
        TUSEMIN: Number(faker.string.numeric({ exclude: '0' })),
        CO2MAX: Number(faker.string.numeric({ exclude: '0' })),
    }
}

export function mockSetPoints() {
    return {
        GROUNDPLAN_ID: Number(faker.string.numeric({ exclude: '0' })),
        UNIT_ID: Number(faker.string.numeric({ exclude: '0' })),
        POINTS: [{
            DUT_ID: Number(faker.string.numeric({ exclude: '0' })),
            x: faker.string.alphanumeric(),
            y: faker.string.alphanumeric(),
        }]
    }
}

export function mockUpdatedGP() {
    return {
        GROUNDPLAN_ID:  Number(faker.string.numeric({ exclude: '0' })),
        UNIT_ID:  Number(faker.string.numeric({ exclude: '0' })),
        NAME_GP: faker.string.alphanumeric(),
        POINTS: [{
            POINT_ID:  Number(faker.string.numeric({ exclude: '0' })),
            DUT_ID:  Number(faker.string.numeric({ exclude: '0' })),
            x: faker.string.alphanumeric(),
            y: faker.string.alphanumeric(),
        }]
    }
}

export function deleteMock() {
    return {
        GROUND_PLAN_IDS: [Number(faker.string.numeric({ exclude: '0' })), Number(faker.string.numeric({ exclude: '0' }))],
        UNIT_ID: Number(faker.string.numeric({ exclude: '0' })),
    }
}

export function infoGp() {
    return {
        ID: Number(faker.string.numeric({ exclude: '0' })),
        FILENAME: faker.string.alphanumeric(),
        NAME_GP: faker.string.alphanumeric(),
        DAT_UPLOAD: faker.date.anytime(),
    }
}
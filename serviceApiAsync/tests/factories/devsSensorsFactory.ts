import { faker } from '@faker-js/faker';

export function mockGetSensorInfo() {
    return {
        SENSOR_ID: faker.string.alpha(),
        SENSOR_NAME: faker.string.alpha(),
    }
}

export function mockGetCurveInfo() {
    return {
        ID: faker.number.int(),
        SENSOR_ID: faker.string.alpha(),
        MIN_FW_VERSION: faker.string.alpha(),
        MULT_QUAD: faker.number.float(),
        MULT_LIN: faker.number.float(),
        OFST: faker.number.float(),
        SENSOR_NAME: faker.string.alpha(),
    }
}

export function mockGetSensorList() {
    return faker.helpers.multiple(mockGetSensorInfo)
}

export function mockGetCurveList() {
    return faker.helpers.multiple(mockGetCurveInfo)
}

export function mockWDeleteRow() {
    return {
        affectedRows: faker.number.int(),
        insertId: faker.number.int()
    }
}
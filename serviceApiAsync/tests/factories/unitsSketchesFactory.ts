import { faker } from "@faker-js/faker";
import sqldb from "../../../srcCommon/db";

export function generateUnitInfo() {
    return {
        UNIT_ID: faker.number.int({min: 1}),
        CLIENT_ID: faker.number.int({min: 1}),
        UNIT_NAME: faker.string.alpha(),
        UNIT_CODE_CELSIUS: faker.string.alpha(),
        UNIT_CODE_API: faker.string.alpha(),
        LAT: faker.string.alpha(),
        LON: faker.string.alpha(),
        DISABREP: faker.number.int({min: 1}),
        CITY_ID: faker.string.alpha(),
        ADDRESS: faker.string.alpha(),
        AMOUNT_PEOPLE: faker.number.int({min: 1}),
        PRODUCTION: faker.datatype.boolean(),
        PRODUCTION_TIMESTAMP: faker.string.alpha(),
        CITY_NAME: faker.string.alpha(),
        STATE_ID: faker.string.alpha(),
        TARIFA_KWH: faker.number.int({min: 1}),
        EXTRA_DATA: faker.string.alpha(),
        GA_METER: faker.number.int({min: 1}),
        TARIFA_DIEL: 0 as 0|1,
        BASELINE_ID: faker.number.int({min: 1}),
        CLIENT_NAME: faker.string.alpha(),
        TIMEZONE_AREA: faker.string.alpha(),
        TIMEZONE_ID: faker.number.int({min: 1}),
        TIMEZONE_OFFSET: faker.number.int({min: 1}),
        COUNTRY_NAME: faker.string.alpha(),
        CONSTRUCTED_AREA: faker.number.int({min:1}),
        SUPERVISOR_ID: faker.string.alpha(),
        SUPERVISOR_NAME: faker.string.alpha(),
        SUPERVISOR_SOBRENOME: faker.string.alpha(),
    }
}

export function generateParamsEditSketch(){
    return {
    sketchList: [generateSketch(), generateSketch()],
    unitId: faker.number.int({min: 1})
}
}

export function generateSketch() {
    return {
        UNIT_SKETCH_ID: faker.number.int({min: 1}),
        FILENAME: faker.string.alpha(),
        ISVISIBLE: faker.number.int({min: 1}),
        NAME_SKETCH: faker.string.alpha(),
    }
}

export function paramsDownloadSketch() {
    return {
        unit_id: faker.number.int({min: 1}),
        UNIT_SKETCH_ID: faker.number.int({min: 1}),
        FILENAME: faker.string.alphanumeric(),
    }
}
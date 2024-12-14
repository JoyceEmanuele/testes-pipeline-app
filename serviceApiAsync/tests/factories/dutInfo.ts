import { faker } from "@faker-js/faker"
export function mockParametersSetDutRType() {
    return {
        DEVS_INFO: [{
          DEV_ID: faker.string.alpha(),
          ...mockParametersRTypeWithoutDevId()
        },
        {
          DEV_ID: 'DRI' + faker.string.alpha(),
          ...mockParametersRTypeWithoutDevId()
        },
        {
          DEV_ID: 'DUT' + faker.string.alpha(),
          ...mockParametersRTypeWithoutDevId()
        }],
        CLIENT_ID: faker.number.int({ min: 1 }),
        RTYPE_ID: faker.number.int({ min: 1 })
    }
}

function mockParametersRTypeWithoutDevId() {
  return {
    ENV_ID: faker.number.int({ min: 1 }),
  }
}

export function mockValueGetDevExtraInfo() {
  return {
    DEV_ID: faker.string.alpha(),
    BT_ID: faker.string.alpha(),
    DAT_BEGMON: faker.string.alpha(),
    ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    ROOM_NAME: faker.string.alpha(),
    DUT_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    PLACEMENT: 'AMB',
    VARS: faker.string.alpha(),
    UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    CITY_ID: faker.string.alpha(),
    STATE_ID: faker.string.alpha(),
    CITY_NAME: faker.string.alpha(),
    UNIT_NAME: faker.string.alpha(),
    LAT: faker.string.alpha(),
    LON: faker.string.alpha(),
    TUSEMIN: Number(faker.string.numeric({ exclude: ['0'] })),
    TUSEMAX: Number(faker.string.numeric({ exclude: ['0'] })),
    USEPERIOD: faker.string.alpha(),
    RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    RTYPE_NAME: faker.string.alpha(),
    DUT_DUO_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    SENSOR_AUTOM: Number(faker.string.numeric({ exclude: ['0'] })),
    ENVIRONMENT_ROOM_TYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    ROOM_ID: Number(faker.string.numeric({ exclude: ['0'] })),
    DUT_REFERENCE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
  }
}
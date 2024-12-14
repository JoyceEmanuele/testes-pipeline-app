import { faker } from "@faker-js/faker"

export function mockGetFreshDevInfo() {
    return {
        CLIENT_ID: faker.number.int(),
        VARS: 'T',
        RTYPE_ID: faker.number.int(),
        UNIT_ID: faker.number.int(),
        LASTPROG: "",
        DISAB: false,
        IS_DUT_AUT: "",
        TUSEMAX: faker.number.float(),
        TUSEMIN: faker.number.float(),
        DESIREDPROG: "",
        USEPERIOD: "",
    }
}

export function mockGetDevExtraInfo(devId: string) {
    return {
        CLIENT_ID: faker.number.int(),
        VARS: 'T',
        RTYPE_ID: faker.number.int(),
        UNIT_ID: faker.number.int(),
        TUSEMAX: faker.number.float(),
        TUSEMIN: faker.number.float(),
        USEPERIOD: "",
        BT_ID: faker.string.alphanumeric(),
        CITY_ID: faker.location.city(),
        CITY_NAME: faker.location.city(),
        DAT_BEGMON: faker.date.recent().toISOString().substring(0, 19),
        DEV_ID: devId,
        DUT_DEVICE_ID: faker.number.int(),
        DUT_DUO_ID: faker.number.int(),
        DUT_REFERENCE_ID: faker.number.int(),
        ENVIRONMENT_ID: faker.number.int(),
        ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
        LAT: faker.string.numeric(),
        LON: faker.string.numeric(),
        PLACEMENT: "DUO",
        ROOM_ID: faker.number.int(),
        ROOM_NAME: faker.string.alphanumeric(),
        RTYPE_NAME: faker.string.alphanumeric(),
        SENSOR_AUTOM: faker.number.int(),
        STATE_ID: faker.location.county(),
        UNIT_NAME: faker.string.alphanumeric(),
    }
}

export function getItemCacheCondTel(devId: string) {
    return {
        devId: devId,
        YMD: faker.date.recent().toDateString(),
        chartsBas: '{}',
        chartsDet: '{}',
        chartsExt: '',
        temperatureOffset: faker.number.float(),
        vers: 'dut-1',
        meantp: '{}',
        cstats: '{}',
        hoursOnline: faker.number.float({ min: 0, max: 24 })
    }
}

export function getCompDut() {
    return {
        L1: "1*1000,0*1000",
        eCO2: "",
        Hum: "",
        Temp: "17*1000, 23*1000",
        Temp1: "21*1000, 23*1000",
        hoursOnline: faker.number.float({ min: 0, max: 24 }),
        hoursOnL1: faker.number.float({ min: 0, max: 24 }),
        hoursOffL1: faker.number.float({ min: 0, max: 24 }),
        numDeparts: faker.number.int(),
        Mode: "",
        State: "",
        TVOC: "",
    }
}

export function getDevsToTelemetry(devId: string) {
    return [{
        DEV_ID: devId,
        START_DATE: faker.date.recent().toISOString().substring(0, 10),
        END_DATE: faker.date.recent().toISOString().substring(0, 10),
        FULL_START_DATE: faker.date.recent().toISOString(),
        FULL_END_DATE: faker.date.recent().toISOString(),
    }]
}

export function getReqParamsUsagePerDay() {
    return {
        dutId: faker.string.alpha(12),
        datIni: faker.date.recent().toISOString().substring(0, 10),
        numDays: faker.number.int({ min: 1, max: 7 }),
    }
}

export function getReqParamsUsagePerMonth() {
    return {
        dutId: faker.string.alpha(12),
        datIni: faker.date.recent().toISOString().substring(0, 10),
        numMonths: faker.number.int({ min: 1, max: 12 }),
    }
}

export function getDailyUsage() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            hoursOnL1: faker.number.float({ min: 0, max: 24 }),
            hoursOffL1: faker.number.float({ min: 0, max: 24 }),
            numDeparts: faker.number.int(),
            day: faker.date.recent().toISOString().substring(0, 10),
            dutId: faker.string.alpha(12),
        }
    })

}

export function processDutDay(numDays: number) {
    return Array.from({ length: numDays }, () => {
        return {
            hoursOnL1: faker.number.float({ min: 0, max: 24 }),
            hoursOffL1: faker.number.float({ min: 0, max: 24 }),
            numDeparts: faker.number.int(),
        }
    })
}

export function mockReqParamsGetDutDuoConsumption() {
    return {
        day: faker.date.recent().toISOString().substring(0, 10),
        dutId: faker.string.alpha(12) ,
    }
}

export function mockParseCompressedChartData() {
    const length = faker.number.int({ min: 1, max: 10 });
    return {
        v: Array.from({ length }, () => {
            return faker.number.int();
        }),
        c: Array.from({ length }, () => {
            return faker.number.int();
        })
    }
}

export function mockConsumoPorHora() {
    return Array.from({ length: 24 }, () => {
        return faker.number.int();
    })
}

export function mockReqParamsGetDutDuoEnergyEfficiency() {
    return {
        unitId: Number(faker.string.numeric({ exclude: ['0'] })),
        dateStart: faker.date.recent().toISOString().substring(0, 10),
        dateEnd: faker.date.recent().toISOString().substring(0, 10),
    }
}

export function mockGetDutsDuoByUnit() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alpha(12),
            ASSET_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ASSET_NAME: faker.string.alphanumeric(),
            MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_NAME: faker.string.alphanumeric(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_KW: faker.number.float({ min: 0, max: 24 }),
            TEMPERATURE_OFFSET: faker.number.float({ min: 0, max: 24 }),
        }
    })
}

export function mockLoadLastDutTelemetry() {
    return {
        lastDutTelemetry: () => {
            return {
                lastTelemetry: {
                    L1: faker.datatype.boolean()
                }
            }
        }
        
    }
}

export function getDailyUsageDac() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            hoursOn: faker.number.float({ min: 0, max: 24 }),
            hoursOff: faker.number.float({ min: 0, max: 24 }),
            numDeparts: faker.number.int(),
            day: faker.date.recent().toISOString().substring(0, 10),
            hoursBlocked: faker.number.float({ min: 0, max: 24 }),
            energyCons: faker.number.int(),
            meanT: faker.number.float({ min: 0, max: 35 }),
            minT: faker.number.float({ min: 0, max: 35 }),
            maxT: faker.number.float({ min: 0, max: 35 })
        }
    })
}

export function getDacsByUnit() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            DEVICE_CODE: faker.string.alpha(12),
        }
    })
}

import { faker } from "@faker-js/faker";
import * as moment from 'moment';

export function mockParamsGetDmaForecastUsage() {
    return {
        DEVICE_CODE: faker.string.alphanumeric(12),
    }
}

export function mockDmaGetBasicInfo() {
    return {
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        DMA_ID: faker.string.alphanumeric(12),
        DAT_BEGMON: faker.date.past().toISOString(),
        INSTALLATION_DATE: faker.date.past().toISOString(),
        HYDROMETER_MODEL: `${faker.string.alphanumeric(5)} (${faker.number.int({ min: 1, max: 10 })} L/pulso)`,
        INSTALLATION_DATE_YMD: faker.date.past().toISOString(),
    }
}

export function mockGetDmaForecastUsage() {
    return {
        data: {
            monday: faker.number.int(),
            tuesday: faker.number.int(),
            wednesday: faker.number.int(),
            thursday: faker.number.int(),
            friday: faker.number.int(),
            saturday: faker.number.int(),
            sunday: faker.number.int(),
        }
    }
}

export function mockParamsGetDmaConsumptionHistory(params: { actualDay?: boolean, lessOneDay?: boolean }) {
    let start_date =
    params.actualDay || params.lessOneDay
      ? moment().format("YYYY-MM-DD")
      : faker.date.past().toISOString();
  const end_date = start_date;
  let last_start_date = moment(start_date).subtract(1, "days").format("YYYY-MM-DD");
  let last_end_date = moment(end_date).subtract(1, "days").format("YYYY-MM-DD");
  if (params.lessOneDay) {
    start_date = moment(start_date).subtract(2, "days").format("YYYY-MM-DD");
  }
    return {
        DEVICE_CODE: faker.string.alphanumeric(12),
        START_DATE: start_date,
        LAST_START_DATE: last_start_date,
        LAST_END_DATE: last_end_date,
        END_DATE: end_date,
        YEAR_GRAPHIC: false,
    }
}

export function mockDmaConsumption() {
    return {
        history: mockHistory(),
        daily_average: faker.number.int(),
        period_usage: faker.number.int(),
    }
}

export function mockHistory() {
    return Array.from({ length: 24 }, () => {
        return {
            device_code: faker.string.alphanumeric(12),
            information_date: faker.date.past().toISOString(),
            usage: faker.number.int(),
            month: 0,
            year: 0
        }
    })
}

export function mockGetDmaConsumptionFromComputedDataService() {
    return {
        data: mockDmaConsumption()
    }
}

export function mockParamsGetDmaConsumptionHistoryInActualDay() {
    return {
        history: mockHistory(),
        day: faker.date.past().toISOString(),
        litersPerPulse: faker.number.int(),
        device_code: faker.string.alphanumeric(12),
        userId: faker.string.alphanumeric(10),
        unitId: faker.number.int(),
        hour_graphic: !!faker.number.int({ min: 0, max: 1 }),
        periodInfoAux: {
            daily_average: faker.number.int(),
            period_usage: faker.number.int(),
            period_usage_last: faker.number.int(),
            num_days: faker.number.int(),
        },
    }
}

export function mockCompDma() {
    return {
        TelemetryList: Array.from({ length: 24 }, () => {
            return {
                pulses: faker.number.int(),
                time: faker.date.past().toISOString(),
            }
        }),
    }
}

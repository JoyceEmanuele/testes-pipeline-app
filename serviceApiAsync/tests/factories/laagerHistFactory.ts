import { faker } from "@faker-js/faker";
import * as moment from 'moment';

export function mockParamsGetLaagerForecastUsage() {
    return {
        LAAGER_CODE: faker.string.alphanumeric(12),
    }
}

export function mockLaagerGetSimpleInfo() {
    return {
        LAAGER_CODE: faker.string.alphanumeric(12),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        INSTALLATION_DATE: faker.date.past().toISOString(),
    }
}

export function mockGetLaagerForecastUsage() {
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

export function mockParamsGetLaagerConsumptionHistory(params: { actualDay?: boolean, lessOneDay?: boolean }) {
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
        LAAGER_CODE: faker.string.alphanumeric(12),
        START_DATE: start_date,
        END_DATE: end_date,
        LAST_START_DATE: last_start_date,
        LAST_END_DATE: last_end_date,
        YEAR_GRAPHIC: false
    }
}

export function mockLaagerConsumption() {
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

export function mockGetLaagerConsumptionFromComputedDataService() {
    return {
        data: mockLaagerConsumption()
    }
}

export function mockParamsGetLaagerConsumptionHistoryInActualDay() {
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

export function mockGetCustomer(laager_code: string) {
    return [
        {
            rf_device_id: faker.string.alphanumeric(12),
            customer_id: laager_code,
        }
    ]
}

export function mockHistoryApiLaager(day: string, hour_graphic: boolean) {
    return {
        history: [{
            date: day,
            reading: faker.number.int(),
            usage: faker.number.int(),
            estimatedUsage: !!faker.number.int(),
            readings_per_day: hour_graphic ? Array.from({ length: 24 }, () => {
                return {
                    time: faker.date.past().toISOString(),
                    reading: faker.number.int(),
                    usage: faker.number.int()
                }
            }) : []

        }]
    }
}
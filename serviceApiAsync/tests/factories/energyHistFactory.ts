import { faker } from "@faker-js/faker";
import * as moment from "moment-timezone";

export function mockGetDemandHistReqParams(params: {
  actualDay?: boolean;
  lessOneDay?: boolean;
}) {
  let start_date =
    params.actualDay || params.lessOneDay
      ? moment().format("YYYY-MM-DD")
      : faker.date.past().toISOString();
  const end_date = start_date;
  if (params.lessOneDay) {
    start_date = moment(start_date).subtract(2, "days").format("YYYY-MM-DD");
  }

  return {
    START_DATE: start_date,
    END_DATE:
      params.actualDay || params.lessOneDay
        ? end_date
        : faker.date.past().toISOString(),
    UNIT_ID: Number(faker.string.numeric({ exclude: ["0"] })),
    ELECTRIC_CIRCUIT_IDS: Array.from(
      { length: faker.number.int({ min: 1, max: 10 }) },
      () => {
        return faker.number.int();
      }
    ),
  };
}

export function mockGetEnergyDevicesDriByUnit() {
  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      DEVICE_CODE: faker.string.alphanumeric(12),
      SERIAL: faker.string.alphanumeric(),
      MODEL: faker.string.alphanumeric(),
      ELECTRIC_CIRCUIT_NAME: faker.string.alphanumeric(),
      ELECTRIC_CIRCUIT_ID: Number(faker.string.numeric({ exclude: ["0"] })),
      MANUFACTURER: faker.string.alphanumeric(),
      UNIT_ID: Number(faker.string.numeric({ exclude: ["0"] })),
      CLIENT_ID: Number(faker.string.numeric({ exclude: ["0"] })),
    };
  });
}

export function mockDemands() {
  return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
    return {
      record_date: faker.date.past().toISOString(),
      average_demand: faker.number.int(),
      max_demand: faker.number.int(),
      min_demand: faker.number.int(),
    };
  });
}

export function mockGetEnergyDemandFromComputedDataService() {
  return {
    data: {
      demand_info: {
        average_demand: faker.number.int(),
        max_demand: faker.number.int(),
        min_demand: faker.number.int(),
        max_demand_date: faker.date.past().toISOString(),
        min_demand_date: faker.date.past().toISOString(),
        sum_demand: faker.number.int(),
        qtd_demand: faker.number.int(),
      },
      demands: mockDemands(),
    },
  };
}

export function mockParamsVerifyValueDemand() {
  return {
    valueToCompare: faker.number.int(),
    recordDateValueToCompare: faker.date.past().toISOString(),
    oldValue: faker.number.int(),
    oldRecordDate: faker.date.past().toISOString(),
  };
}

export function mockEnergyQuery() {
  return {
    energy_device_id: faker.string.alphanumeric(12),
    serial: faker.string.alphanumeric(5),
    manufacturer: faker.string.alphanumeric(3),
    model: faker.string.alphanumeric(5),
    data: [] as any[],
    grouped_demand: mockDemands(),
  };
}

export function mockVerifyDemandValue() {
  return {
    value: faker.number.int(),
    timestamp: faker.date.past().toISOString(),
  };
}

export function mockVerifyDemandInActualDayParams() {
  return {
    energy_devices: mockGetEnergyDevicesDriByUnit(),
    day: faker.date.past().toISOString(),
    hour_interval: !!faker.number.int({ min: 0, max: 1 }),
    demand_metrics: {
      max_demand: {
        value: faker.number.int(),
        timestamp: faker.date.past().toISOString(),
      },
      min_demand: {
        value: faker.number.int(),
        timestamp: faker.date.past().toISOString(),
      },
      avg_demand: faker.number.int(),
      sum_demand: faker.number.int(),
      qtd_demand: faker.number.int(),
    },
    user: faker.string.alphanumeric(),
  };
}

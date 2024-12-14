import { faker } from "@faker-js/faker";

export function generateReqParamsSetBaselineValue() {
  return {
    ...generateReqParamsGetBaselineValue(),
    baselineValues: [generateBaselineValue(), generateBaselineValue()],
  };
}

function generateBaselineValue() {
  return {
    BASELINE_MONTH: faker.number.int({ min: 1, max: 12 }),
    BASELINE_KWH: faker.number.int({ min: 1 }),
    BASELINE_PRICE: faker.number.int({ min: 1 }),
  };
}

export function generateReqParamsGetBaselineValue() {
  return {
    ...generateUnitClient(),
    BASELINE_ID: faker.number.int({ min: 1 }),
  };
}

export function generateUnitClient() {
  return {
    UNIT_ID: faker.number.int({ min: 1 }),
    CLIENT_ID: faker.number.int({ min: 1 }),
    PRODUCTION: faker.number.int({ min: 1 }),
    TIMEZONE_OFFSET: faker.number.int({ min: 1 }),
    TIMEZONE_AREA: faker.string.alphanumeric(),
  };
}

export function generateBaseline() {
  return {
    BASELINE_VALUE_ID: faker.number.int({ min: 1 }),
    BASELINE_ID: faker.number.int({ min: 1 }),
    ...generateBaselineValue(),
  };
}

export function generateBaselineExtraInfo(baselineId: number) {
  return {
    BASELINE_ID: baselineId,
    UNIT_ID: faker.number.int({ min: 1 }),
    CLIENT_ID: faker.number.int({ min: 1 }),
    BASELINE_TEMPLATE_ID: faker.number.int({ min: 1 }),
    BASELINE_TEMPLATE_TAG: faker.word.adjective(),
  };
}

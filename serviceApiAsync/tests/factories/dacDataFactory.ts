import { faker } from "@faker-js/faker";

interface BaseDacData {
  FLUID_TYPE: string;
  DAC_APPL: string;
  DAC_TYPE: string;
  P0_MULT: number;
  P0_OFST: number;
  P1_MULT: number;
  P1_OFST: number;
  P0_MULT_QUAD: number
  P0_MULT_LIN: number
  P1_MULT_QUAD: number
  P1_MULT_LIN: number  
  P0_POSITN: string;
  P1_POSITN: string;
  P0_SENSOR: string;
  P1_SENSOR: string;
  T0_T1_T2: string;
  DAM_DISABLED: number;
  SELECTED_L1_SIM?: string;
}

export function generateDacFreshData(
  dacAppl?: string,
  dacType?: string,
  l1Sim?: string | null
): BaseDacData {
  let possibleSensors = [undefined, "Psuc", "Pliq"];
  const p0 = faker.helpers.arrayElement(possibleSensors);
  if (p0) {
    possibleSensors = possibleSensors.filter((x) => x !== p0);
  }
  const p1 = faker.helpers.arrayElement(possibleSensors);

  let data: BaseDacData = {
    FLUID_TYPE: faker.string.sample(5),
    DAC_APPL: dacAppl || faker.string.sample(5),
    DAC_TYPE: dacType || faker.string.sample(5),
    DAM_DISABLED: Number(faker.datatype.boolean()),
    P0_POSITN: p0,
    P1_POSITN: p1,
    P0_MULT: p0 && faker.number.float({ min: -1, max: 2 }),
    P0_MULT_LIN: p0 && faker.number.float({ min: -1, max: 2 }),
    P0_MULT_QUAD: p0 && faker.number.float({ min: -1, max: 2 }),
    P0_OFST: p0 && faker.number.float({ min: -1, max: 2 }),
    P1_MULT: p1 && faker.number.float({ min: -1, max: 2 }),
    P1_MULT_LIN: p1 && faker.number.float({ min: -1, max: 2 }),
    P1_MULT_QUAD: p1 && faker.number.float({ min: -1, max: 2 }),
    P1_OFST: p1 && faker.number.float({ min: -1, max: 2 }),
    P0_SENSOR: p0 && faker.string.alphanumeric(),
    P1_SENSOR: p1 && faker.string.alphanumeric(),
    T0_T1_T2: undefined,
  };

  if (l1Sim !== null) {
    data.SELECTED_L1_SIM =
      l1Sim || faker.helpers.arrayElement([undefined, "virtual", "fancoil"]);
  }

  return data;
}

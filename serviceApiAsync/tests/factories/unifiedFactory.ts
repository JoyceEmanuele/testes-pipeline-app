import { faker } from "@faker-js/faker";
import * as httpRouter from "../../apiServer/httpRouter";
import { ExtraRouteParams } from "../../../srcCommon/types/backendTypes";
import * as express from "express";
import * as fs from "node:fs";
import * as path from "path";
import { hydrometerModels } from "../../batchInputs/dmas";

type TableRow = Parameters<
  (typeof httpRouter.privateRoutes)["/add-client-unified-batch"]
>[0]["datas"][0];

export function mockParseFilesRowUnit() {
  const tableRows = [] as TableRow[];
  tableRows.push(mockParseUnit());
  return tableRows;
}

const dmtNobreakObject = {
  UTILITY_ID: "",
  UTILITY_NAME: "",
  INSTALLATION_DATE_UTIL: "",
  DISTRIBUTOR: "",
  MODEL: "",
  ENTRY_VOLTAGE: "",
  OUT_VOLTAGE: "",
  POT_NOMINAL: "",
  AUTON_NOMINAL: "",
  INPUT_ELECTRIC_CURRENT: "",
  OUTPUT_ELECTRIC_CURRENT: "",
  NOMINAL_BATTERY_CAPACITY: "",
  ASSOCIATE_DEV: "",
  ASSOCIATE_DEV_PORT: "",
  ASSOCIATE_ASSET: "",
  PHOTO_DMT: "",
  PHOTO_UTILITY: "",
}

export function mockParseUnit() {
  return {
    SOLUTION_TYPE: "Unidade",
    ...mockUnitFieldsWithoutValue(),
    PLACEMENT: "",
    SENSORS_DUT_DUO: "",
    DAM_INSTALLATION_LOCATION: "",
    DAM_PLACEMENT: "",
    DAM_T0_POSITION: "",
    DAM_T1_POSITION: "",
    PHOTO_AUTOM_DEV_1: "",
    PHOTO_AUTOM_DEV_2: "",
    PHOTO_AUTOM_DEV_3: "",
    PHOTO_AUTOM_DEV_4: "",
    PHOTO_AUTOM_DEV_5: "",
    DUT_ID: "",
    PHOTO_DUT_1: "",
    PHOTO_DUT_2: "",
    PHOTO_DUT_3: "",
    PHOTO_DUT_4: "",
    PHOTO_DUT_5: "",
    ROOM_NAME: "",
    RTYPE_NAME: "",
    ...mockAssetFieldsWithoutValue(),
    ...mockParseDma(),
    ...mockEnergyFieldsWithoutValue(),
    ...mockParseUtility(),
    key: faker.string.alphanumeric({ length: 10 }),
  };
}

export function parseCheckedUnit() {
  return { ...mockParseUnit(), errors: [] as { message: string }[] };
}

export function mockParseFilesRowIlumination() {
  const tableRows = [] as TableRow[];
  tableRows.push(mockParseIlumination());

  return tableRows;
}

export function mockParseIlumination() {
  return {
    SOLUTION_TYPE: 'Iluminação',
    UNIT_NAME: faker.string.alphanumeric(),
    UNIT_ID: '',
    UNIT_CODE_CELSIUS: '',
    UNIT_CODE_API: '',
    COUNTRY: '',
    STATE_ID: '',
    CITY_NAME: '',
    TIME_ZONE: '',
    CONSTRUCTED_AREA: '',
    UNIT_STATUS: '',
    LATLONG: '',
    ADDRESS: '',
    AMOUNT_PEOPLE: '',
    ICCID: '',
    MODEM: '',
    ACCESSPOINT: '',
    MACACCESSPOINT: '',
    MACREPEATER: '',
    SIMCARD_PHOTO1: '',
    SIMCARD_PHOTO2: '',
    SIMCARD_PHOTO3: '',
    SKETCH_1: '',
    SKETCH_2: '',
    SKETCH_3: '',
    SKETCH_4: '',
    SKETCH_5: '',
    GROUP_ID: '',
    GROUP_NAME: faker.string.alphanumeric(),
    INSTALLATION_DATE: '',
    MCHN_APPL: 'Iluminação',
    GROUP_TYPE: '',
    MCHN_BRAND: '',
    FLUID_TYPE: '',
    MACHINE_RATED_POWER: '',
    PHOTO_DEVGROUPS_1: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_2: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_3: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_4: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_5: faker.string.alphanumeric(),
    DEV_AUTOM_ID: `DAM${faker.string.numeric()}`,
    PLACEMENT: '',
    SENSORS_DUT_DUO: '',
    DAM_INSTALLATION_LOCATION: '',
    DAM_PLACEMENT: '',
    DAM_T0_POSITION: '',
    DAM_T1_POSITION: '',
    PHOTO_AUTOM_DEV_1: '',
    PHOTO_AUTOM_DEV_2: '',
    PHOTO_AUTOM_DEV_3: '',
    PHOTO_AUTOM_DEV_4: '',
    PHOTO_AUTOM_DEV_5: '',
    DUT_ID: '',
    PHOTO_DUT_1: '',
    PHOTO_DUT_2: '',
    PHOTO_DUT_3: '',
    PHOTO_DUT_4: '',
    PHOTO_DUT_5: '',
    ROOM_NAME: '',
    RTYPE_NAME: '',
    ...mockAssetFieldsWithoutValue(),
    ...mockEnergyFieldsWithoutValue(),
    ...mockParseDma(),
    ...mockParseUtility(),
    key: faker.string.alphanumeric({ length: 10 }),
  };
}

export function mockParseDma() {
  return {
    DMA_ID: `DMA${faker.string.numeric(9)}`,
    WATER_SUPPLIER: 'Diel Energia',
    HYDROMETER_MODEL: hydrometerModels[Math.floor(faker.number.int() * hydrometerModels.length)],
    INSTALLATION_LOCATION: faker.string.alphanumeric(),
    WATER_INSTALLATION_DATE: '',
    TOTAL_CAPACITY: faker.string.numeric(),
    TOTAL_RESERVOIRS: faker.string.numeric(),
    PHOTO_DMA_1: faker.string.alphanumeric(),
    PHOTO_DMA_2: faker.string.alphanumeric(),
    PHOTO_DMA_3: faker.string.alphanumeric(),
    PHOTO_DMA_4: faker.string.alphanumeric(),
    PHOTO_DMA_5: faker.string.alphanumeric(),
  }
}

export function mockParseUnits() {
  return {
    UNIT_NAME: faker.string.alphanumeric(),
    UNIT_ID: '',
    UNIT_CODE_CELSIUS: '',
    UNIT_CODE_API: '',
    COUNTRY: '',
    STATE_ID: '',
    CITY_NAME: '',
    TIME_ZONE: '',
    CONSTRUCTED_AREA: '',
    UNIT_STATUS: '',
    LATLONG: '',
    ADDRESS: '',
    AMOUNT_PEOPLE: '',
    ICCID: '',
    MODEM: '',
    ACCESSPOINT: '',
    MACACCESSPOINT: '',
    MACREPEATER: '',
    SIMCARD_PHOTO1: '',
    SIMCARD_PHOTO2: '',
    SIMCARD_PHOTO3: '',
    SKETCH_1: '',
    SKETCH_2: '',
    SKETCH_3: '',
    SKETCH_4: '',
    SKETCH_5: '',
  }
}

export function mockParseWater() {
  return {
    SOLUTION_TYPE: 'Água',
    ...mockParseUnits(),
    GROUP_ID: '',
    GROUP_NAME: faker.string.alphanumeric(),
    INSTALLATION_DATE: '',
    MCHN_APPL: '',
    GROUP_TYPE: '',
    MCHN_BRAND: '',
    FLUID_TYPE: '',
    MACHINE_RATED_POWER: '',
    PHOTO_DEVGROUPS_1: '',
    PHOTO_DEVGROUPS_2: '',
    PHOTO_DEVGROUPS_3: '',
    PHOTO_DEVGROUPS_4: '',
    PHOTO_DEVGROUPS_5: '',
    DEV_AUTOM_ID: '',
    PLACEMENT: '',
    SENSORS_DUT_DUO: '',
    DAM_INSTALLATION_LOCATION: '',
    DAM_PLACEMENT: '',
    DAM_T0_POSITION: '',
    DAM_T1_POSITION: '',
    PHOTO_AUTOM_DEV_1: '',
    PHOTO_AUTOM_DEV_2: '',
    PHOTO_AUTOM_DEV_3: '',
    PHOTO_AUTOM_DEV_4: '',
    PHOTO_AUTOM_DEV_5: '',
    DUT_ID: '',
    PHOTO_DUT_1: '',
    PHOTO_DUT_2: '',
    PHOTO_DUT_3: '',
    PHOTO_DUT_4: '',
    PHOTO_DUT_5: '',
    ROOM_NAME: '',
    RTYPE_NAME: '',
    DAT_ID: '',
    AST_DESC: '',
    AST_ROLE_NAME: '',
    MCHN_MODEL: '',
    CAPACITY_PWR: '',
    CAPACITY_UNIT: '',
    DAC_COP: '',
    MCHN_KW: '',
    EVAPORATOR_MODEL: '',
    INSUFFLATION_SPEED: '',
    COMPRESSOR_RLA: '',
    EQUIPMENT_POWER: '',
    PHOTO_ASSET_1: '',
    PHOTO_ASSET_2: '',
    PHOTO_ASSET_3: '',
    PHOTO_ASSET_4: '',
    PHOTO_ASSET_5: '',
    DEV_ID: '',
    DAC_COMIS: '',
    AUTOM_ENABLE: '',
    P0_SENSOR: '',
    P0_POSITN: '',
    P1_SENSOR: '',
    P1_POSITN: '',
    DAC_DESC: '',
    PHOTO_DAC_1: '',
    PHOTO_DAC_2: '',
    PHOTO_DAC_3: '',
    PHOTO_DAC_4: '',
    PHOTO_DAC_5: '',
    ...mockParseDma(),
    ...dmtNobreakObject,
    ...mockEnergyFieldsWithoutValue(),
    ...mockParseUtility(),
    key: faker.string.alphanumeric({ length: 10 }),
  };
}

export function parseCheckedWater() {
  return { ...mockParseWater(), errors: [] as { message: string }[] };
}

export function mockParseFilesRowWater() {
  const tableRows = [] as TableRow[];
  tableRows.push(mockParseWater());

  return tableRows;
}

export function parseCheckedIlumiation() {
  return { ...mockParseIlumination(), errors: [] as { message: string }[] };
}

export function mockInsertedMachine(groupName: string) {
  return {
    GROUP_NAME: groupName,
    GROUP_ID: faker.number.int({min: 1}),
    UNIT_ID: faker.number.int({min: 1}),
    CLIENT_ID: faker.number.int({min: 1}),
    UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
    CITY_NAME: faker.string.alphanumeric({ length: 10 }),
    STATE_ID: faker.string.alphanumeric({ length: 10 }),
  };
}

export function mockInsertedEnvironment() {
  return {
    DEV_ID: faker.string.alphanumeric({ length: 10 }),
    ROOM_NAME: faker.string.alphanumeric({ length: 10 }),
    UNIT_ID: faker.number.int({min: 1}),
    RTYPE_ID: faker.number.int({min: 1}),
    RTYPE_NAME: faker.string.alphanumeric({ length: 10 }),
    CLIENT_ID: faker.number.int({min: 1}),
    UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
  };
}

export function mockInsertedAsset() {
  return {
    info: {
      DAT_ID: faker.string.alphanumeric({ length: 10 }),
      AST_DESC: faker.string.alphanumeric({ length: 10 }),
      AST_TYPE: faker.string.alphanumeric({ length: 10 }),
      CAPACITY_PWR: faker.number.int({min: 1}),
      CAPACITY_UNIT: faker.string.alphanumeric({ length: 10 }),
      CLIENT_ID: faker.number.int({min: 1}),
      FLUID_TYPE: faker.string.alphanumeric({ length: 10 }),
      GROUP_ID: faker.number.int({min: 1}),
      MCHN_APPL: faker.string.alphanumeric({ length: 10 }),
      MCHN_BRAND: faker.string.alphanumeric({ length: 10 }),
      MCHN_ENV: faker.string.alphanumeric({ length: 10 }),
      MCHN_KW: faker.number.int({min: 1}),
      MCHN_MODEL: faker.string.alphanumeric({ length: 10 }),
      UNIT_ID: faker.number.int({min: 1}),
      INSTALLATION_DATE: faker.string.alphanumeric({ length: 10 }),
      AST_ROLE: faker.number.int({min: 1}),
    },
  };
}

export function mockParseFilesRowsMachine() {
  const tableRows = [] as TableRow[];
  const sensor = faker.string.alphanumeric({ length: 10 });

  tableRows.push({
    SOLUTION_TYPE: 'Máquina',
    ...mockParseUnits(),
    GROUP_ID: '',
    GROUP_NAME: faker.string.alphanumeric(),
    INSTALLATION_DATE: faker.string.alphanumeric(),
    MCHN_APPL: faker.string.alphanumeric(),
    GROUP_TYPE: faker.string.alphanumeric(),
    MCHN_BRAND: faker.string.alphanumeric(),
    FLUID_TYPE: faker.string.alphanumeric(),
    MACHINE_RATED_POWER: '',
    PHOTO_DEVGROUPS_1: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_2: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_3: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_4: faker.string.alphanumeric(),
    PHOTO_DEVGROUPS_5: faker.string.alphanumeric(),
    DEV_AUTOM_ID: `DAM${faker.string.alphanumeric()}`,
    PLACEMENT: '',
    SENSORS_DUT_DUO: '',
    DAM_INSTALLATION_LOCATION: '',
    DAM_PLACEMENT: '',
    DAM_T0_POSITION: '',
    DAM_T1_POSITION: '',
    PHOTO_AUTOM_DEV_1: faker.string.alphanumeric(),
    PHOTO_AUTOM_DEV_2: faker.string.alphanumeric(),
    PHOTO_AUTOM_DEV_3: faker.string.alphanumeric(),
    PHOTO_AUTOM_DEV_4: faker.string.alphanumeric(),
    PHOTO_AUTOM_DEV_5: faker.string.alphanumeric(),
    DUT_ID: `DUT${faker.string.alphanumeric()}`,
    PHOTO_DUT_1: faker.string.alphanumeric(),
    PHOTO_DUT_2: faker.string.alphanumeric(),
    PHOTO_DUT_3: faker.string.alphanumeric(),
    PHOTO_DUT_4: faker.string.alphanumeric(),
    PHOTO_DUT_5: faker.string.alphanumeric(),
    ROOM_NAME: faker.string.alphanumeric(),
    RTYPE_NAME: '',
    DAT_ID: `DAT${faker.string.numeric(7)}`,
    AST_DESC: faker.string.alphanumeric(),
    AST_ROLE_NAME: 'Evaporadora',
    MCHN_MODEL: faker.string.alphanumeric(),
    CAPACITY_PWR: faker.string.numeric(2),
    // CAPACITY_UNIT: 'TR',
    DAC_COP: faker.string.numeric(1),
    MCHN_KW: faker.string.numeric(1),
    EVAPORATOR_MODEL: faker.string.alphanumeric(),
    INSUFFLATION_SPEED: faker.string.numeric(2),
    COMPRESSOR_RLA: faker.string.numeric(2),
    EQUIPMENT_POWER: faker.string.alphanumeric(),
    PHOTO_ASSET_1: faker.string.alphanumeric(),
    PHOTO_ASSET_2: faker.string.alphanumeric(),
    PHOTO_ASSET_3: faker.string.alphanumeric(),
    PHOTO_ASSET_4: faker.string.alphanumeric(),
    PHOTO_ASSET_5: faker.string.alphanumeric(),
    DEV_ID: `DAC${faker.string.numeric(7)}`,
    DAC_COMIS: 'N',
    // AUTOM_ENABLE: 'N',
    P0_SENSOR: sensor,
    P0_POSITN: "Pliq",
    P1_SENSOR: sensor,
    P1_POSITN: 'Psuc',
    // DAC_DESC: faker.string.alphanumeric(),
    PHOTO_DAC_1: faker.string.alphanumeric(),
    PHOTO_DAC_2: faker.string.alphanumeric(),
    PHOTO_DAC_3: faker.string.alphanumeric(),
    PHOTO_DAC_4: faker.string.alphanumeric(),
    PHOTO_DAC_5: faker.string.alphanumeric(),
    ...mockEnergyFieldsWithoutValue(),
    ...mockParseDma(),
    ...mockParseUtility(),
    key: faker.string.alphanumeric()
  });
  return tableRows;
}

export function mockParseUtility() {
  return {
    UTILITY_ID: faker.string.alpha(),
    UTILITY_NAME: faker.string.alpha(),
    INSTALLATION_DATE_UTIL: faker.string.alpha(),
    DISTRIBUTOR: faker.string.alpha(),
    MODEL: faker.string.alpha(), 
    ENTRY_VOLTAGE: faker.string.alpha(),
    OUT_VOLTAGE: faker.string.alpha(),
    POT_NOMINAL: faker.string.alpha(),
    AUTON_NOMINAL: faker.string.alpha(),
    INPUT_ELECTRIC_CURRENT: faker.string.alpha(),
    OUTPUT_ELECTRIC_CURRENT: faker.string.alpha(),
    NOMINAL_BATTERY_CAPACITY: faker.string.alpha(),
    GRID_VOLTAGE: faker.string.alpha(),
    MAINS_CURRENT: faker.string.alpha(),
    ASSOCIATE_DEV: faker.string.alpha(),
    ASSOCIATE_DEV_PORT: faker.string.alpha(),
    FEEDBACK_DAL: faker.string.alpha(),
    ASSOCIATE_ASSET: faker.string.alpha(),
    PHOTO_DMT: faker.string.alpha(),
    PHOTO_DAL: faker.string.alpha(),
    PHOTO_UTILITY: faker.string.alpha(),
  }
}

export function mockParseFilesRowEnvironment() {
  const tableRows = [] as TableRow[];

  tableRows.push({
    SOLUTION_TYPE: "Ambiente",
    ...mockUnitFieldsWithoutValue(),
    PLACEMENT: "AMB",
    SENSORS_DUT_DUO: "",
    DAM_INSTALLATION_LOCATION: "",
    DAM_PLACEMENT: "",
    DAM_T0_POSITION: "",
    DAM_T1_POSITION: "",
    PHOTO_AUTOM_DEV_1: "",
    PHOTO_AUTOM_DEV_2: "",
    PHOTO_AUTOM_DEV_3: "",
    PHOTO_AUTOM_DEV_4: "",
    PHOTO_AUTOM_DEV_5: "",
    DUT_ID: `DUT${faker.string.alphanumeric({ length: 9 })}`,
    PHOTO_DUT_1: "",
    PHOTO_DUT_2: "",
    PHOTO_DUT_3: "",
    PHOTO_DUT_4: "",
    PHOTO_DUT_5: "",
    ROOM_NAME: faker.string.alphanumeric({ length: 10 }),
    RTYPE_NAME: faker.string.alphanumeric({ length: 10 }),
    ...mockAssetFieldsWithoutValue(),
    DMA_ID: '',
    // WATER_SUPPLIER: '',
    HYDROMETER_MODEL: '',
    INSTALLATION_LOCATION: faker.string.alphanumeric(),
    WATER_INSTALLATION_DATE: '',
    TOTAL_CAPACITY: '',
    TOTAL_RESERVOIRS: '',
    PHOTO_DMA_1: '',
    PHOTO_DMA_2: '',
    PHOTO_DMA_3: '',
    PHOTO_DMA_4: '',
    PHOTO_DMA_5: '',
    ...mockParseUtility(),
    ...mockEnergyFieldsWithoutValue(),
    key: faker.string.alphanumeric({ length: 10 }),
    ...dmtNobreakObject,
  });
  return tableRows;
}

const mockedReq = {
  body: {
    CLIENT_ID: faker.string.numeric(),
  },
  file: {
    buffer: fs.readFileSync(
      path.join(__dirname, "../assets/unifiedBatchMock.xlsx")
    ),
    originalname: "unifiedBatchMock.xlsx",
    mimetype: "text/xlsx",
  },
} as express.Request;

Object.defineProperty(mockedReq, 'get', {
  value: jest.fn(), // Simula o método `get`
});

const mockedResponse = {
  setHeader: jest.fn(),
} as unknown as express.Response;

export const mockedExtraParams: ExtraRouteParams = {
  req: mockedReq,
  res: mockedResponse,
};

export function mockUnitsList(
  unitName: string,
  fakeUnitId?: number,
  clientId?: number
) {
  return [
    {
      CLIENT_ID: clientId || faker.number.int({min: 1}),
      UNIT_ID: fakeUnitId || faker.number.int({min: 1}),
      UNIT_NAME: unitName,
      LAT: faker.location.latitude().toString(),
      LON: faker.location.longitude().toString(),
      CITY_ID: faker.string.alphanumeric({ length: 10 }),
      TARIFA_KWH: faker.number.float(),
      PRODUCTION: faker.datatype.boolean(),
      PRODUCTION_TIMESTAMP: faker.date.recent().getTime().toString(),
      DISABREP: faker.number.int({ min: 0, max: 1 }),
      ADDRESS: faker.location.streetAddress(),
      CLIENT_NAME: faker.company.name(),
      CITY_NAME: faker.location.city(),
      STATE_ID: faker.string.alphanumeric({ length: 10 }),
      STATE_NAME: faker.location.state(),
      COUNTRY_NAME: faker.location.country(),
      DISTRIBUTOR_ID: faker.string.alphanumeric({ length: 10 }),
      ADDITIONAL_DISTRIBUTOR_INFO: faker.string.alphanumeric({ length: 10 }),
      CONSUMER_UNIT: faker.string.alphanumeric({ length: 10 }),
      LOGIN: faker.string.alphanumeric({ length: 10 }),
      LOGIN_EXTRA: faker.string.alphanumeric(),
      DISTRIBUTOR_LABEL: faker.string.alphanumeric({ length: 10 }),
      BASELINE_ID: faker.number.int({min: 1}),
      TIMEZONE_ID: faker.number.int({min: 1}),
      TIMEZONE_NAME: faker.string.alphanumeric({ length: 10 }),
      CONSTRUCTED_AREA: faker.number.int({min: 1}),
    },
  ];
}

export function mockGetCity() {
  return {
    id: faker.string.alphanumeric({ length: 5 }),
    name: faker.location.city(),
    state: faker.location.state(),
    country: faker.location.country(),
    lat: faker.location.latitude().toString(),
    lon: faker.location.longitude().toString(),
  };
}

export function getUnitListMock() {
  return {
    UNIT_ID: Number(faker.string.numeric()),
    CLIENT_ID: Number(faker.string.numeric()),
    TIMEZONE_AREA: faker.string.alpha(),
    CONSTRUCTED_AREA: Number(faker.string.numeric()),
    COUNTRY_NAME: faker.string.alpha(),
    UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
    LAT: faker.string.alphanumeric({ length: 10 }),
    LON: faker.string.alphanumeric({ length: 10 }),
    DISABREP: faker.number.int({min: 1}),
    CITY_ID: faker.string.alphanumeric({ length: 10 }),
    ADDRESS: faker.string.alphanumeric({ length: 10 }),
    PRODUCTION: faker.datatype.boolean(),
    PRODUCTION_TIMESTAMP: faker.date.recent().getTime().toString(),
    CITY_NAME: faker.string.alphanumeric({ length: 10 }),
    STATE_ID: faker.string.alphanumeric({ length: 10 }),
    TARIFA_KWH: faker.number.int({min: 1}),
    EXTRA_DATA: faker.string.alphanumeric({ length: 10 }),
    GA_METER: faker.number.int({min: 1}),
    TARIFA_DIEL: 0 as 0 | 1,
    BASELINE_ID: faker.number.int({min: 1}),
    CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
    TIMEZONE_NAME: faker.string.alphanumeric({ length: 10 }),
    TIMEZONE_ID: faker.number.int({min: 1}),
  };
}


export const mockCity = {
  id: faker.random.alphaNumeric(),
  name: faker.random.alphaNumeric(),
  state: faker.random.alphaNumeric(),
  country: faker.random.alphaNumeric(),
  lat: faker.address.latitude().toString(),
  lon: faker.address.longitude().toString(),
}

export const mockAvaliableOptionsEmpty = {
  units: [{}],
  fluids: [{}],
  applics: [{}],
  types: [{}],
  envs: [{}],
  vavs: [{}],
  brands: [{}],
  roles: [{}],
  rtypes: [{}],
  psens: [{}],
  energy: [{}],
  fancoils: [{}]
};

export function mockPermissionsUnifiedBatch(permission: boolean) {
  return {
    canManageClient: permission,
    canAddUsersToClient: permission,
    isClientUser: permission,
    canConfigureNewUnits: permission,
    canManageClientNotifs: permission,
    canManageDevs: permission,
    canViewDevs: permission,
    canDeleteDevs: permission,
  };
}

export const mockUnitInfo = {
  UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})),
  CLIENT_ID: Number(faker.string.numeric({ exclude: ['0']})),
  UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
  UNIT_CODE_CELSIUS: faker.string.alphanumeric({ length: 10 }),
  UNIT_CODE_API: faker.string.alphanumeric({ length: 10 }),
  LAT: faker.string.alphanumeric({ length: 10 }),
  LON: faker.string.alphanumeric({ length: 10 }),
  DISABREP: faker.number.int({min: 1}),
  CITY_ID: faker.string.alphanumeric({ length: 10 }),
  ADDRESS: faker.string.alphanumeric({ length: 10 }),
  AMOUNT_PEOPLE: Number(faker.string.numeric({ exclude: ['0']})),
  PRODUCTION: faker.datatype.boolean(),
  PRODUCTION_TIMESTAMP: faker.date.recent().getTime().toString(),
  CITY_NAME: faker.string.alphanumeric({ length: 10 }),
  STATE_ID: faker.string.alphanumeric({ length: 10 }),
  TARIFA_KWH: faker.number.int({min: 1}),
  EXTRA_DATA: faker.string.alphanumeric({ length: 10 }),
  GA_METER: faker.number.int({min: 1}),
  TARIFA_DIEL: 0 as 0 | 1,
  BASELINE_ID: Number(faker.string.numeric({ exclude: ['0']})),
  CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
  TIMEZONE_ID: Number(faker.string.numeric({ exclude: ['0']})),
  TIMEZONE_AREA: faker.string.alphanumeric({ length: 10 }),
  TIMEZONE_OFFSET: faker.number.int({min: 0, max: 5}),
  CONSTRUCTED_AREA: faker.number.int({min: 1}),
  COUNTRY_NAME: faker.string.alphanumeric({ length: 10 }),
  SUPERVISOR_ID: faker.string.alphanumeric({ length: 10 }),
  SUPERVISOR_NAME: faker.string.alphanumeric({ length: 10 }),
  SUPERVISOR_SOBRENOME: faker.string.alphanumeric({ length: 10 }),
};

export function mockGetGroupsList(unitId: number) {
  return [
    {
      GROUP_ID: faker.number.int({min: 1}),
      GROUP_NAME: faker.string.alphanumeric({ length: 10 }),
      DEV_AUT: faker.string.alphanumeric({ length: 10 }),
      MODEL: faker.string.alphanumeric({ length: 10 }),
      INSTALLATION_DATE: faker.string.alphanumeric({ length: 10 }),
      GROUP_TYPE: faker.string.alphanumeric({ length: 10 }),
      BRAND: faker.string.alphanumeric({ length: 10 }),
      FRIGO_CAPACITY: faker.number.int({min: 1}),
      FRIGO_CAPACITY_UNIT: faker.string.alphanumeric({ length: 10 }),
      FLUID_TYPE: faker.string.alphanumeric({ length: 10 }),
      RATED_POWER: faker.number.int({min: 1}),
      MCHN_APPL: faker.string.alphanumeric({ length: 10 }),
      DUT_ID: faker.string.alphanumeric({ length: 10 }),
      UNIT_ID: unitId,
      UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
      CITY_NAME: faker.string.alphanumeric({ length: 10 }),
      STATE_ID: faker.string.alphanumeric({ length: 10 }),
    },
  ];
}

export function mockGetBasicInfo() {
  return {
    DEV_ID: faker.random.alphaNumeric(),
    DEVICE_ID: Number(faker.random.numeric()),
    CLIENT_ID: Number(faker.random.numeric()),
    DEVICE_CLIENT_ID: Number(faker.random.numeric()),
    UNIT_ID: Number(faker.random.numeric()),
    DEVICE_UNIT_ID: Number(faker.random.numeric()),
    DAC_ID: faker.string.alphanumeric({ length: 10 }),
    DAM_ID: faker.string.alphanumeric({ length: 10 }),
    DUT_ID: faker.string.alphanumeric({ length: 10 }),
  }
}

export function mockCheckedEnergy(params: {
  SOLUTION?: string;
  UNIT_NAME?: string;
  ID_MED_ENERGY?: string;
  MCHN_APPL?: string;
  ROOM_VAV?: string;
  THERM_MANUF?: string;
  THERM_MODEL?: string;
  VALVE_MANUF?: string;
  VALVE_MODEL?: string;
  VALVE_TYPE?: string;
  BOX_MANUF?: string;
  BOX_MODEL?: string;
  FANCOIL_MANUF?: string;
  FANCOIL_MODEL?: string;
  NUM_SERIE_MED_ENERGY?: string;
  MODEL_MED_ENERGY?: string;
  CAPACITY_TCA?: string;
  INSTALLATION_ELETRICAL_TYPE?: string;
  SHIPPING_INTERVAL?: string;
}) {
  return {
    key: faker.string.numeric(),
    SOLUTION_TYPE: params.SOLUTION || "",
    UNIT_NAME: params.UNIT_NAME || "",
    ...mockUnitFieldsWithoutValue(),
    GROUP_ID: "",
    GROUP_NAME: "",
    INSTALLATION_DATE: "",
    MCHN_APPL: params.MCHN_APPL || "",
    GROUP_TYPE: "",
    MCHN_BRAND: "",
    FLUID_TYPE: "",
    PHOTO_DEVGROUPS_1: "",
    PHOTO_DEVGROUPS_2: "",
    PHOTO_DEVGROUPS_3: "",
    PHOTO_DEVGROUPS_4: "",
    PHOTO_DEVGROUPS_5: "",
    DEV_AUTOM_ID: "",
    PLACEMENT: "",
    SENSORS_DUT_DUO: "",
    PHOTO_AUTOM_DEV_1: "",
    PHOTO_AUTOM_DEV_2: "",
    PHOTO_AUTOM_DEV_3: "",
    PHOTO_AUTOM_DEV_4: "",
    PHOTO_AUTOM_DEV_5: "",
    DUT_ID: "",
    PHOTO_DUT_1: "",
    PHOTO_DUT_2: "",
    PHOTO_DUT_3: "",
    PHOTO_DUT_4: "",
    PHOTO_DUT_5: "",
    ROOM_NAME: "",
    RTYPE_NAME: "",
    DAT_ID: "",
    AST_DESC: "",
    AST_ROLE_NAME: "",
    MCHN_MODEL: "",
    CAPACITY_PWR: "",
    CAPACITY_UNIT: "",
    DAC_COP: "",
    MCHN_KW: "",
    PHOTO_ASSET_1: "",
    PHOTO_ASSET_2: "",
    PHOTO_ASSET_3: "",
    PHOTO_ASSET_4: "",
    PHOTO_ASSET_5: "",
    DEV_ID: "",
    DAC_COMIS: "",
    AUTOM_ENABLE: "",
    P0_SENSOR: "",
    P0_POSITN: "",
    P1_SENSOR: "",
    P1_POSITN: "",
    DAC_DESC: "",
    PHOTO_DAC_1: "",
    PHOTO_DAC_2: "",
    PHOTO_DAC_3: "",
    PHOTO_DAC_4: "",
    PHOTO_DAC_5: "",
    ID_MED_ENERGY: params.ID_MED_ENERGY || "",
    NUM_SERIE_MED_ENERGY: params.NUM_SERIE_MED_ENERGY || "",
    MODEL_MED_ENERGY: params.MODEL_MED_ENERGY || "",
    CAPACITY_TCA: params.CAPACITY_TCA || "",
    INSTALLATION_ELETRICAL_TYPE: "",
    SHIPPING_INTERVAL: "",
    ROOM_VAV: params.ROOM_VAV || "",
    THERM_MANUF: params.THERM_MANUF || "",
    THERM_MODEL: params.THERM_MODEL || "",
    VALVE_MANUF: params.VALVE_MANUF || "",
    VALVE_MODEL: params.VALVE_MODEL || "",
    VALVE_TYPE: params.VALVE_TYPE || "",
    BOX_MANUF: params.BOX_MANUF || "",
    BOX_MODEL: params.BOX_MODEL || "",
    FANCOIL_MANUF: params.FANCOIL_MANUF || "",
    FANCOIL_MODEL: params.FANCOIL_MODEL || "",
    PHOTO_DRI_1: "",
    PHOTO_DRI_2: "",
    PHOTO_DRI_3: "",
    PHOTO_DRI_4: "",
    PHOTO_DRI_5: "",
    ...mockParseDma(),
    ...dmtNobreakObject,
  };
}

export function optsVAV() {
  return [
    {
      value: "box-manuf-tropical",
      label: "Tropical-Tosi",
      type: "BOX_MANUF",
      norms: ["tropical-tosi"],
    },
    {
      value: "box-manuf-trox",
      label: "Trox",
      type: "BOX_MANUF",
      norms: ["trox"],
    },
    {
      value: "therm-manuf-beca-smart",
      label: "Beca Smart",
      type: "THERM_MANUF",
      norms: ["beca-smart"],
    },
    {
      value: "valve-manuf-belimo",
      label: "Belimo",
      type: "VALVE_MANUF",
      norms: ["belimo"],
    },
    {
      value: "valve-manuf-trox",
      label: "Trox",
      type: "VALVE_MANUF",
      norms: ["trox"],
    },
  ];
}

export function roomTypesMocked(rtypeName: string) {
  return [
    {
      RTYPE_ID: faker.number.int({min: 1}),
      RTYPE_NAME: rtypeName,
      CLIENT_ID: faker.number.int({min: 1}),
      TUSEMIN: faker.number.int({min: 1}),
      TUSEMAX: faker.number.int({min: 1}),
      USEPERIOD: faker.string.alphanumeric({ length: 10 }),
      CO2MAX: faker.number.int({min: 1}),
    },
  ];
}

function mockUnitFieldsWithoutValue() {
  return {
    UNIT_NAME: faker.string.alphanumeric(),
    UNIT_ID: '',
    UNIT_CODE_CELSIUS: '',
    UNIT_CODE_API: '',
    COUNTRY: '',
    STATE_ID: '',
    CITY_NAME: '',
    TIME_ZONE: '',
    CONSTRUCTED_AREA: '',
    UNIT_STATUS: '',
    LATLONG: '',
    ADDRESS: '',
    AMOUNT_PEOPLE: '',
    ICCID: '',
    MODEM: '',
    ACCESSPOINT: '',
    MACACCESSPOINT: '',
    MACREPEATER: '',
    SIMCARD_PHOTO1: '',
    SIMCARD_PHOTO2: '',
    SIMCARD_PHOTO3: '',
    SKETCH_1: '',
    SKETCH_2: '',
    SKETCH_3: '',
    SKETCH_4: '',
    SKETCH_5: '',
    GROUP_ID: '',
    GROUP_NAME: '',
    INSTALLATION_DATE: '',
    MCHN_APPL: '',
    GROUP_TYPE: '',
    MCHN_BRAND: '',
    FLUID_TYPE: '',
    MACHINE_RATED_POWER: '',
    PHOTO_DEVGROUPS_1: '',
    PHOTO_DEVGROUPS_2: '',
    PHOTO_DEVGROUPS_3: '',
    PHOTO_DEVGROUPS_4: '',
    PHOTO_DEVGROUPS_5: '',
    DEV_AUTOM_ID: '',
  }
}

function mockEnergyFieldsWithoutValue() {
  return {
    ELECTRIC_CIRCUIT_ID: "",
    ELECTRIC_CIRCUIT_NAME: "",
    ENERGY_DEVICES_INFO_ID: "",
    ID_MED_ENERGY: "",
    NUM_SERIE_MED_ENERGY: "",
    MODEL_MED_ENERGY: "",
    CAPACITY_TCA: "",
    INSTALLATION_ELETRICAL_TYPE: "",
    SHIPPING_INTERVAL: "",
    ROOM_VAV: "",
    THERM_MANUF: "",
    THERM_MODEL: "",
    VALVE_MANUF: "",
    VALVE_MODEL: "",
    VALVE_TYPE: "",
    BOX_MANUF: "",
    BOX_MODEL: "",
    FANCOIL_MANUF: "",
    FANCOIL_MODEL: "",
    PHOTO_DRI_1: "",
    PHOTO_DRI_2: "",
    PHOTO_DRI_3: "",
    PHOTO_DRI_4: "",
    PHOTO_DRI_5: "",
  };
}

function mockAssetFieldsWithoutValue() {
  return {
    DAT_ID: "",
    AST_DESC: "",
    AST_ROLE_NAME: "",
    MCHN_MODEL: "",
    CAPACITY_PWR: "",
    CAPACITY_UNIT: "",
    DAC_COP: "",
    MCHN_KW: "",
    EQUIPMENT_POWER: "",
    EVAPORATOR_MODEL: "",
    INSUFFLATION_SPEED: "",
    COMPRESSOR_RLA: "",
    PHOTO_ASSET_1: "",
    PHOTO_ASSET_2: "",
    PHOTO_ASSET_3: "",
    PHOTO_ASSET_4: "",
    PHOTO_ASSET_5: "",
    DEV_ID: "",
    DAC_COMIS: "",
    AUTOM_ENABLE: "",
    P0_SENSOR: "",
    P0_POSITN: "",
    P1_SENSOR: "",
    P1_POSITN: "",
    DAC_DESC: "",
    PHOTO_DAC_1: "",
    PHOTO_DAC_2: "",
    PHOTO_DAC_3: "",
    PHOTO_DAC_4: "",
    PHOTO_DAC_5: "",
  };
}
export function mockDevsGetBasicInfo(
  dmaId: string,
  clientId: number,
  fakeUnitId: number
) {
  return {
    DEV_ID: dmaId,
    CLIENT_ID: clientId,
    UNIT_ID: fakeUnitId,
    DEVICE_ID: Number(faker.random.numeric()),
    DEVICE_CLIENT_ID: Number(faker.random.numeric()),
    DEVICE_UNIT_ID: Number(faker.random.numeric()),
    DAC_ID: '',
    DAM_ID: '',
    DUT_ID: '',
  }
}

export function mockDevsGetClientInfo(dmaId: string, clientId: number) {
  return {
    DEV_ID: dmaId,
    CLIENT_ID: clientId,
    PERMS_C: "[F]",
  };
}

import { faker } from "@faker-js/faker"
import express = require("express");
import { ExtraRouteParams } from "../../../srcCommon/types/backendTypes";
import sqldb from '../../../srcCommon/db';

export function mockgetMachinesInfoAnalysis() {
  return {
    CLIENT_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    CLIENT_NAME: faker.string.alphanumeric(),
    UNIT_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    UNIT_NAME: faker.string.alphanumeric(),
    STATE_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    STATE_NAME: faker.string.alphanumeric(),
    CITY_ID: faker.string.alphanumeric(),
    CITY_NAME: faker.string.alphanumeric(),
    MACHINE_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    MACHINE_NAME: faker.string.alphanumeric(),
    DEV_AUT: faker.string.alphanumeric(),
    LAST_PROG: faker.string.alphanumeric(),
    MACHINE_TYPE: faker.string.alphanumeric(),
    MCHN_BRAND: faker.string.alphanumeric(),
    RATED_POWER: Number(faker.string.alphanumeric({ exclude: ['0']})),
    ECO_CFG: faker.string.alphanumeric(),
    ENABLE_ECO: 1,
    SETPOINT: Number(faker.string.alphanumeric({ exclude: ['0']})),
    MODE: faker.string.alphanumeric(),
    STATE: faker.string.alphanumeric(),
    STATE_CONN: faker.string.alphanumeric(),
    TUSEMAX: Number(faker.string.alphanumeric({ exclude: ['0']})),
    TUSEMIN: Number(faker.string.alphanumeric({ exclude: ['0']})),
    TEMPERATURE: Number(faker.string.alphanumeric({ exclude: ['0']})),
    TEMPERATURE1: Number(faker.string.alphanumeric({ exclude: ['0']})),
    CAPACITY_PWR: Number(faker.string.alphanumeric({ exclude: ['0']})),
    CAPACITY_UNIT: faker.string.alphanumeric(),
    MACHINE_KW: Number(faker.string.alphanumeric({ exclude: ['0']})),
    MODEL: faker.string.alphanumeric(),
    AST_ROLE_NAME: faker.string.alphanumeric(),
    TOTAL_CAPACITY_CONDENSER: Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_DEV_COUNT: Number(faker.string.alphanumeric({ exclude: ['0']})),
    ASSETS: []  as Awaited<ReturnType<typeof sqldb.ASSETS.getListAssetMachinesAnalysis>>,
  }
}

export function mockgetMachinesIds() {
  return {
    MACHINE_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function mockReturnMachinesInfoAnalisys() {
  return [
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
    mockgetMachinesInfoAnalysis(),
  ]
}

export function mockGetListAssetMachinesAnalysis() {
  return {
    MACHINE_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    ASSET_NAME: faker.string.alphanumeric(),
    ASSET_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    DAT_CODE: faker.string.alphanumeric(),
    DEVICE_CODE: faker.string.alphanumeric(),
    CAPACITY_PWR: Number(faker.string.alphanumeric({ exclude: ['0']})),
    CAPACITY_UNIT: faker.string.alphanumeric(),
    MACHINE_KW: Number(faker.string.alphanumeric({ exclude: ['0']})),
    H_INDEX: Number(faker.string.alphanumeric({ exclude: ['0']})),
    BRAND: faker.string.alphanumeric(),
    STATE_CONN: faker.string.alphanumeric(),
    MODE: faker.string.alphanumeric(),
    STATE: faker.string.alphanumeric(),
    MODEL: faker.string.alphanumeric(),
    ASSET_TYPE: faker.string.alphanumeric(),
    AST_ROLE_NAME: faker.string.alphanumeric(),
  }
}

export function getTotalInfoAssets() {
  return {
    TOTAL_CAPACITY_PWR_TR:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_CAPACITY_PWR_BTU:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_MACHINE_KW:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_ASSETS:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_CITY:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_UNITS:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_STATE:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_MACHINES:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX100:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX50:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX75:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX25:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX2:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX4:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_H_INDEX_NULL:  Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function getTotalConnMachines() {
  return {
    TOTAL_ONLINE:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_OFFLINE:  Number(faker.string.alphanumeric({ exclude: ['0']})),
    TOTAL_LATE:  Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function getTotalMachinesKW() {
  return {
    TOTAL_MACHINE_KW:  Number(faker.string.alphanumeric({ exclude: ['0']}))
  }
}

export function mockgetListUnitsFilters() {
  return {
    UNIT_NAME: faker.string.alphanumeric(),
    UNIT_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function mockgetAllClientsEnabled() {
  return {
    CLIENT_NAME: faker.string.alphanumeric(),
    CLIENT_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function mockgetAllMachinesInfo() {
  return {
    MACHINE_ID: Number(faker.string.alphanumeric({ exclude: ['0']})),
    MACHINE_NAME: faker.string.alphanumeric(),
  }
}

export function mockgetAllCitiesFiltered() {
  return {
    CITY_ID: faker.string.alphanumeric(),
    CITY_NAME: faker.string.alphanumeric(),
  }
}

export function mockselectStates() {
  return {
    id: faker.string.alphanumeric(),
    name: faker.string.alphanumeric(),
    fullName: faker.string.alphanumeric(),
    lat: faker.string.alphanumeric(),
    lon: faker.string.alphanumeric(),
    countryId: Number(faker.string.alphanumeric({ exclude: ['0']})),
  }
}

export function mockgetAllMachinesTypeInfo() {
  return { MACHINE_TYPE: faker.string.alphanumeric(), ID: faker.string.alphanumeric() }
}

export function mockgetAllMode() {
  return { MODE: faker.string.alphanumeric() }
}

export function mockgetAllState() {
  return { STATE: faker.string.alphanumeric() }
}

export function mockParamsExportMachinesAnalysisList() {
  return {
    columnsToExport: ["CLIENT_NAME", "STATE_NAME", "CITY_NAME", "UNIT_NAME", "MACHINE_NAME", "MACHINE_TYPE", "STATE", "CURRENT_HEALTH", "SETPOINT", "TEMPERATURE", "TEMPERATURE1", "DEV_AUT", "MODE","TOTAL_DEV_COUNT", "CONNECTION", "MCHN_BRAND", "MODEL", "CAPACITY_POWER", "RATED_POWER"],
    haveProg: false,
    groupIds: [] as number[],
  }
}

const mockedReq = {
  body: mockParamsExportMachinesAnalysisList(),
  headers: {
    "accept-language": 'pt',
  },
} as express.Request;

const mockedResponse = {
  setHeader: jest.fn(),
  status: jest.fn(() => mockedResponse),
  send: jest.fn(),
  json: jest.fn(),
  append: jest.fn(),
  end: jest.fn(),
} as unknown as express.Response;

export const mockedExtraParams: ExtraRouteParams = {
  req: mockedReq,
  res: mockedResponse,
};

import { faker } from '@faker-js/faker';


export interface DalPortsInfo {
  freePorts: boolean
  freeFeedbacks: boolean
  ports: {
    label: string
    associated: boolean
    port: number
    illuminationId?: number
  }[]
  feedbacks: {
    label: string
    associated: boolean
    port: number
    illuminationId?: number
  }[]
};

export interface DalIllumination {
  ID: number;
  UNIT_ID: number;
  DAL_CODE: string;
  DMT_CODE: string;
  DEVICE_CODE: string;
  NAME: string;
  GRID_VOLTAGE: number;
  GRID_CURRENT: number;
  PORT: number;
  FEEDBACK: number;
  UNIT_NAME: string;
  APPLICATION: 'Iluminação';
  STATUS: string;
};

export interface IlluminationFullInfo {
  ID: number;
  NAME: string;
  GRID_VOLTAGE: number;
  GRID_CURRENT: number;
  DAL_ID: number;
  DAL_CODE: string;
  DMT_ID: number;
  DMT_CODE: string;
  PORT: number;
  FEEDBACK: number;
  UNIT_ID: number;
  UNIT_NAME: string;
  CLIENT_ID: number;
  CLIENT_NAME: string;
  STATUS: string;
}


export function generateDalPortsInfo() {
  const usedPorts = faker.number.int({
    'min': 1,
    'max': 3
  });

  const ports: DalPortsInfo['ports'] = [
    {label: '1', port: 1, associated: false},
    {label: '2', port: 2, associated: false},
    {label: '3', port: 3, associated: false},
    {label: '4', port: 4, associated: false},
  ];
  const feedbacks: DalPortsInfo['feedbacks'] = [
    {label: '1', port: 1, associated: false},
    {label: '2', port: 2, associated: false},
    {label: '3', port: 3, associated: false},
    {label: '4', port: 4, associated: false},
  ];

  for(let i = 1; i <= usedPorts; i++){
    ports[i-1].associated = true;
    ports[i-1].illuminationId = faker.number.int(100);
    feedbacks[i-1].associated = true;
    feedbacks[i-1].illuminationId = faker.number.int(100);
  }
  return {
    freePorts: usedPorts < 4,
    freeFeedbacks: usedPorts < 4,
    ports,
    feedbacks,
  };
}

export function generateId() {
  return faker.number.int();
}

export function generateDalIlluminationsList() {
  const item = {
    ID: faker.number.int(),
    UNIT_ID: faker.number.int(),
    DAL_CODE: 'DAL000000000',
    DMT_CODE: undefined,
    DEVICE_CODE: 'DAL000000000',
    NAME: faker.word.noun(),
    GRID_VOLTAGE: faker.number.int(),
    GRID_CURRENT: faker.number.int(),
    PORT: faker.number.int({ min: 0, max: 4 }),
    FEEDBACK: faker.number.int({ min: 0, max: 4 }),
    UNIT_NAME: faker.word.noun(),
    APPLICATION: 'Iluminação',
    STATUS: 'Desligado'
  } as DalIllumination;
  return [item];
}

export function generateIlluminationFullInfo() {
  const item = {
    ID: faker.number.int(),
    UNIT_ID: faker.number.int(),
    DAL_ID: faker.number.int(),
    DAL_CODE: 'DAL000000000',
    DMT_ID: undefined,
    DMT_CODE: undefined,
    NAME: faker.word.noun(),
    GRID_VOLTAGE: faker.number.int(),
    GRID_CURRENT: faker.number.int(),
    PORT: faker.number.int({ min: 0, max: 4 }),
    FEEDBACK: faker.number.int({ min: 0, max: 4 }),
    UNIT_NAME: faker.word.noun(),
    CLIENT_ID: faker.number.int(),
    CLIENT_NAME: faker.word.noun(),
    STATUS: 'Desligado'
  } as IlluminationFullInfo;
  return item;
}

export function generateIllumination(id: number) {
  const item = {
    ID: id,
    NAME: faker.word.noun(),
    GRID_VOLTAGE: faker.number.int(),
    GRID_CURRENT: faker.number.int(),
    DAL_ID: faker.number.int(),
    DAL_CODE: 'DAL000000000',
    PORT: faker.number.int({ min: 0, max: 4 }),
    FEEDBACK: faker.number.int({ min: 0, max: 4 }),
  }
  return item;
}

export function generateDalUsedPorts(DAL_ID: number) {
  const item = {
    ID: faker.number.int(),
    DAL_ID,
    ILLUMINATION_ID: faker.number.int(),
    PORT: faker.number.int({ min: 0, max: 4 }),
    FEEDBACK: faker.number.int({ min: 0, max: 4 }),
  }
  return [item];
}

export function generateIdByCode(DAL_CODE: string) {
  return { ID: faker.number.int() };
}

export function generateDalByCode(DAL_CODE: string, CLIENT_ID: number) {
  return {
    ID: faker.number.int(),
    DEVICE_CODE: DAL_CODE,
    CLIENT_ID,
  }
}
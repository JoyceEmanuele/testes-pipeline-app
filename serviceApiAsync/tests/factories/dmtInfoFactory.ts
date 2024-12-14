import { faker } from '@faker-js/faker';


export interface DmtPortsInfo {
  freePorts: boolean 
  ports: {
    label: string
    associated: boolean
    port: number
    nobreakId?: number
    eletricCircuitId?: number
    illuminationId?: number

  }[]
};

export interface DmtNobreak {
  ID: number
  UNIT_ID: number
  UNIT_NAME: string
  DMT_CODE: string
  DAT_CODE: string
  NAME: string
  MANUFACTURER: string
  MODEL: string
  INPUT_VOLTAGE: number
  OUTPUT_VOLTAGE: number
  NOMINAL_POTENTIAL: number
  NOMINAL_BATTERY_LIFE: number
  INPUT_ELECTRIC_CURRENT: number
  OUTPUT_ELECTRIC_CURRENT: number
  NOMINAL_BATTERY_CAPACITY: number
  INSTALLATION_DATE: string
  PORT: number
  APPLICATION: string
};

export interface NobreakFullInfo {
  NOBREAK_ID: number;
  NAME: string;
  MANUFACTURER: string;
  MODEL: string;
  INPUT_VOLTAGE: number;
  OUTPUT_VOLTAGE: number;
  NOMINAL_POTENTIAL: number;
  NOMINAL_BATTERY_LIFE: number;
  INPUT_ELECTRIC_CURRENT: number
  OUTPUT_ELECTRIC_CURRENT: number
  NOMINAL_BATTERY_CAPACITY: number
  INSTALLATION_DATE: string;
  DAT_CODE: string;
  DMT_ID: number;
  DMT_CODE: string;
  PORT: number;
  UNIT_ID: number;
  UNIT_NAME: string;
  CLIENT_ID: number;
  CLIENT_NAME: string;
  STATUS: string;
}

export interface DmtIllumination {
  ID: number;
  UNIT_ID: number;
  DMT_CODE: string;
  DEVICE_CODE: string;
  NAME: string;
  GRID_VOLTAGE: number;
  GRID_CURRENT: number;
  PORT: number;
  UNIT_NAME: string;
  APPLICATION: 'Iluminação';
  STATUS: string;
};

export interface DmtUtilitiesOp {
  INSERT: boolean;
  DISSOCIATE: boolean;
  APPLICATION: 'Nobreak'|'Illumination'|'Electric Network';
  NOBREAK_ID: number;
  ILLUMINATION_ID: number;
  CIRCUIT_ID: number;
  PORT: number;
  DMT_CODE: string;
  UNIT_ID: number;
};

export function generateDmtPortsInfo() {
  const usedPorts = faker.number.int({
    'min': 0,
    'max': 3
  });

  const ports: DmtPortsInfo['ports'] = [{label: '1', port: 1, associated: false},
                {label: '2', port: 2, associated: false},
                {label: '3', port: 3, associated: false},
                {label: '4', port: 4, associated: false}];

  for(let i = 1; i <= usedPorts; i++){
    ports[i-1].associated = true;
    ports[i-1].nobreakId = faker.number.int({min: 1}); 
  }
  return {
    freePorts: usedPorts < 3,
    ports: ports
  };
}

export function generateId() {
  return faker.number.int();
}

export function generateNobreak(id?: number) {
  const item = {
    ID: id || faker.number.int(),
    UNIT_ID: faker.number.int(),
    DAT_CODE: 'DAT000000000',
    NAME: faker.word.noun(),
    MANUFACTURER: faker.word.noun(),
    MODEL: faker.word.noun(),
    INPUT_VOLTAGE: faker.number.int(),
    OUTPUT_VOLTAGE: faker.number.int(),
    NOMINAL_POTENTIAL: faker.number.int(),
    NOMINAL_BATTERY_LIFE: faker.number.int(),
    INPUT_ELECTRIC_CURRENT: faker.number.int(),
    OUTPUT_ELECTRIC_CURRENT: faker.number.int(),
    NOMINAL_BATTERY_CAPACITY: faker.number.int(),
    INSTALLATION_DATE: faker.date.past().toUTCString(),
    ASSET_ID: faker.number.int(),
    DMT_ID: faker.number.int(),
    DMT_CODE: 'DMT000000000',
    PORT: faker.number.int({ min: 0, max: 4 }),
  }
  return item;
}
export function generateNobreakFullInfo() {
  const item = {
    ...generateNobreak(),
    NOBREAK_ID: faker.number.int(),
    UNIT_NAME: faker.word.noun(),
    CLIENT_ID: faker.number.int(),
    CLIENT_NAME: faker.word.noun(),
    STATUS: 'Desligado',
  } as NobreakFullInfo;
  return item;
}


export function generateDmtNobreaksList() {
  const item = {
    ID: faker.number.int(),
    UNIT_ID: faker.number.int(),
    UNIT_NAME: faker.word.noun(),
    DMT_CODE: 'DMT000000000',
    DAT_CODE: 'DAT000000000',
    NAME: faker.word.noun(),
    MANUFACTURER: faker.word.noun(),
    MODEL: faker.word.noun(),
    INPUT_VOLTAGE: faker.number.int(),
    OUTPUT_VOLTAGE: faker.number.int(),
    INPUT_ELECTRIC_CURRENT: faker.number.int(),
    OUTPUT_ELECTRIC_CURRENT: faker.number.int(),
    NOMINAL_BATTERY_CAPACITY: faker.number.int(),    
    NOMINAL_POTENTIAL: faker.number.int(),
    NOMINAL_BATTERY_LIFE: faker.number.int(),
    INSTALLATION_DATE: faker.date.past().toUTCString(),
    PORT: faker.number.int({ min: 0, max: 4 }),
    APPLICATION: 'Iluminação',
  } as DmtNobreak;
  return [item];
}

export function generateGetList() {
  const item = {
    DMT_ID: faker.number.int(),
    PORT: faker.number.int(),
  }
  return [item];
}

export function generateGetListDmtNobreak() {
  const item = {
    DMT_ID: faker.number.int(),
    NOBREAK_ID: faker.number.int(),
    PORT: faker.number.int(),
  }
  return [item];
}

export function generateDmtIlluminationsList() {
  const item = {
    ID: faker.number.int(),
    UNIT_NAME: faker.word.noun(),
    UNIT_ID: faker.number.int(),
    PORT: faker.number.int({ min: 0, max: 4 }),
    DEVICE_CODE: 'DMT000000000',
    DAL_CODE: undefined,
    DMT_CODE: 'DMT000000000',
    NAME: faker.word.noun(),
    GRID_CURRENT: faker.number.int(),
    GRID_VOLTAGE: faker.number.int(),
    APPLICATION: 'Iluminação',
    STATUS: 'Desligado'
  } as DmtIllumination;
  return [item];
}

export function generateDmtTelemetry() {
  const lastMessages = {
    [faker.string.alpha()] : {
      ts: faker.number.int(),
    }
  }
  return {
    lastMessages,
    lastDacTelemetry(devId: string) {
            const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDamTelemetry(devId: string) {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDutTelemetry(devId: string) {
            const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDutAutTelemetry(devId: string) {
            const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDriTelemetry() {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDriTelemetry_raw(devId: string) {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDmaTelemetry(devId: string) {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined =  undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDmtTelemetry(devId: string) {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDalTelemetry(devId: string) {
            const lastCommInfo = {
        ts: faker.number.int(),
      }
      const lastTelemetry: undefined = undefined;
      const status: undefined = undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    connectionStatus(devId: string) {
      const status: undefined = undefined;
      return status;
    },
    lastTS(devId: string) {
      const lastCommInfo = {
        ts: faker.number.int(),
      }
      return lastCommInfo?.ts;
    },
  }
}

export function generateIdByDmtCode(DMT_CODE: string) {
  return { ID: faker.number.int() };
}

export function generateDmtUsedPorts(DMT_ID: number) {
  const item = {
    ID: faker.number.int(),
    DMT_ID,
    NOBREAK_ID: faker.number.int(),
    PORT: faker.number.int({ min: 0, max: 4 }),
  }
  return [item];
}

export function getAllParametersByNobreak() {
  return [
      {
          ID: Number(faker.string.numeric({ exclude: ['0'] })),
          COLUMN_NAME: faker.string.alphanumeric(),
          COLUMN_VALUE: faker.string.alphanumeric(),
      }
  ]
}

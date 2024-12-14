import { faker } from "@faker-js/faker";

export function greenAntListGenerator() {
  return [
    {
      UNIT_ID: faker.string.numeric(),
      UNIT_NAME: faker.internet.userName(),
      GA_METER: faker.string.numeric(),
      TARIFA_KWH: faker.string.numeric(),
      TARIFA_DIEL: faker.string.numeric(),
      STATUS_GA: faker.string.numeric(1),
      CLIENT_NAME: faker.internet.userName(),
      CLIENT_ID: faker.string.numeric(),
      CITY_NAME: faker.internet.userName(),
      STATE_ID: faker.string.alphanumeric({ length: 5 }),
      COUNTRY_NAME: faker.internet.userName(),
    },
  ];
}

export function getListENERGY_DEVICES() {
  return [
    {
      ENERGY_DEVICE_ID: faker.string.alphanumeric({ length: 5 }),
      SERIAL: faker.internet.userName(),
      MODEL: faker.internet.userName(),
      MANUFACTURER: "Diel Energia",
      ESTABLISHMENT_NAME: faker.internet.userName(),
      CLIENT_ID: faker.string.numeric(),
      CLIENT_NAME: faker.internet.userName(),
      UNIT_ID: faker.string.numeric(),
      UNIT_NAME: faker.internet.userName(),
      STATE_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_NAME: faker.internet.userName(),
    },
  ];
}

export function getElectricCircuitsList() {
  return [
    {
      STATE_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_NAME: faker.internet.userName(),
      CLIENT_ID: faker.string.numeric(),
      CLIENT_NAME: faker.internet.userName(),
      UNIT_ID: faker.string.numeric(),
      UNIT_NAME: faker.internet.userName(),
      machineName: null as string,
      roomName: null as string,
      vertical: 'Energia',
      supplier: 'Diel',
      dataSource: null as string,
      integrId: null as string,
      equipType: 'Virtual',
      method: '',
      status: null as string,
    },
  ];
}

export function getExtraInfoDRIS() {
  return [
    {
      DRI_ID: faker.string.alphanumeric({ length: 5 }),
      SYSTEM_NAME: faker.internet.userName(),
      VARSCFG: faker.string.alphanumeric({ length: 5 }),
      CARDSCFG: faker.string.alphanumeric({ length: 5 }),
      ENABLE_ECO: faker.string.numeric(),
      ECO_CFG: faker.string.alphanumeric({ length: 5 }),
      ECO_OFST_START: faker.string.numeric(),
      ECO_OFST_END: faker.string.numeric(),
      ECO_INT_TIME: faker.string.numeric(),
      DUT_ID: faker.string.alphanumeric({ length: 5 }),
      ROOM_NAME: faker.internet.userName(),
      DAT_BEGAUT: faker.string.alphanumeric({ length: 5 }),
      BT_ID: faker.string.alphanumeric({ length: 5 }),
      UNIT_ID: faker.string.numeric(),
      CLIENT_ID: faker.string.numeric(),
      UNIT_NAME: faker.internet.userName(),
      STATE_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_NAME: faker.internet.userName(),
      CLIENT_NAME: faker.internet.userName(),
    },
  ];
}

export function getListELECTRIC_CIRCUITS() {
  return [
    {
      UNIT_ID: faker.string.numeric(),
      CLIENT_ID: faker.string.numeric(),
      UNIT_NAME: faker.internet.userName(),
      STATE_ID: faker.string.alphanumeric({ length: 5 }),
      CITY_NAME: faker.internet.userName(),
      CLIENT_NAME: faker.internet.userName(),
    }
  ]
}

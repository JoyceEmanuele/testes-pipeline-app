import { faker } from "@faker-js/faker";

export function generateReqParams(changedByUnit?: boolean) {
  return {
    meterId: faker.string.alphanumeric({ length: 10 }),
    unitId: faker.number.int({min: 1}),
    cardsCfg: faker.string.alphanumeric({ length: 10 }),
    installationLocation: faker.location.streetAddress(),
    installationDate: faker.date.past().toString(),
    hydrometerModel: faker.string.alphanumeric({ length: 10 }),
    totalCapacity: faker.number.int({min: 1}),
    quantityOfReservoirs: faker.number.int({min: 1}),
    changedByUnit: changedByUnit ?? faker.datatype.boolean(),
  }
}

export function mockGetUserGlobalPermissions(permission: boolean){
  return {
    editCreateDeleteClientsProfiles: permission,
    deleteClientUnitsMachinesRooms: permission,
    manageAllUsersAndNotifications: permission,
    manageFirmwares: permission,
    sendOtaProd: permission,
    readAllDevsLogs: permission,
    manageAllSimcards: permission,
    readAllIntegrationDevices: permission,
    editCitiesList: permission,
    listAllDetectedFaults: permission,
    viewAllDevs: permission,
    editAnyDevInfo: permission,
    manageAllClientsUnitsAndDevs: permission,
    editAnyDevSchedule: permission,
    canManageSketches: permission,
    canManageObservations: permission,
    canViewObservations: true,
  }
}

export function mockIntegrlaagerGetSimpleInfo(){
  return { 
    LAAGER_CODE: faker.string.alphanumeric({ length: 10 }),
    UNIT_ID: faker.number.int({min: 1}), 
    CLIENT_ID: faker.number.int({min: 1}), 
    INSTALLATION_DATE: faker.date.past().toString() }
}

export function mockIntegrlaagerGetListWithUnitInfo(){
  return [
    { 
      LAAGER_CODE: faker.string.alphanumeric({ length: 10 }),
      UNIT_ID: faker.number.int({min: 1}),
      INSTALLATION_DATE: faker.date.past().toString(),
      UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
      CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
      CLIENT_ID: faker.number.int({min: 1}),
      CITY_NAME: faker.string.alphanumeric({ length: 10 }),
      STATE_ID: faker.number.int({min: 1}),
      CITY_ID: faker.string.alphanumeric({ length: 10 }),
      STATE_NAME: faker.string.alphanumeric({ length: 10 })
    }
  ]
}

export function mockDmaGetList(){
  return [
    { 
      DMA_ID: faker.string.alphanumeric({ length: 10 }), 
      UNIT_ID: faker.number.int({min: 1}),
      UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
      CLIENT_ID: faker.number.int({min: 1}),
      CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
      CITY_NAME: faker.string.alphanumeric({ length: 10 }),
      STATE_ID: faker.number.int({min: 1}),
      CITY_ID: faker.string.alphanumeric({ length: 10 }),
      STATE_NAME: faker.string.alphanumeric({ length: 10 })
    }
  ]
}

export function mockDmaGetBasicInfo(){
  return {
    CLIENT_ID: Number(faker.string.numeric({ exclude: ['0']})),
    UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})),
    DMA_ID: faker.string.alphanumeric({ length: 10 }),
    DAT_BEGMON: faker.date.past().toString(),
    INSTALLATION_DATE: faker.date.past().toString(),
    DEVICE_ID: Number(faker.string.numeric({ exclude: ['0']})),
    HYDROMETER_MODEL: faker.string.alphanumeric(),
    INSTALLATION_DATE_YMD: faker.string.alphanumeric()
  }
}

export function mockSetEndDateLaagerUnitHistory(){
  return {
    UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})),
    LAAGER_ID: faker.string.alphanumeric({ length: 10 }),
    START_DATE: faker.date.past().toString(),
  }
}

export function mockGetDevUnitHist(){
  return [
    {
      DEV_UNIT_HISTORY_ID: faker.number.int({min: 1}),
      DMA_ID: faker.string.alphanumeric({ length: 10 }),
      LAAGER_ID: faker.string.alphanumeric({ length: 10 }),
      START_DATE: faker.date.past().toString(),
      END_DATE: faker.date.past().toString(),
      UNIT_ID: faker.number.int({min: 1})
    }
  ]
}

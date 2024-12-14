import { faker } from "@faker-js/faker";

export function mockGetPermissionsOnUnit(permission: boolean) {
    return {
        canManageDevs: permission,
        canViewDevs: permission,
        canChangeDeviceOperation: permission,
        canManageObservations: permission,
        canViewObservations: permission,
        canManageSketches: permission,
        canEditProgramming: permission,
    };
}

export function mockGetPermissionsOnClient(permission: boolean) {
    return {
      canManageClient: permission,
      canAddUsersToClient: permission,
      isClientUser: permission,
      canConfigureNewUnits: permission,
      canManageClientNotifs: permission,
      canManageDevs: permission,
      canViewDevs: permission,
      canDeleteDevs: permission,
      canEditProgramming: permission,
      canViewClientUnits: permission,
      canManageObservations: permission,
      canViewObservations: permission,
      canManageSketches: permission,
    };
}

export function mockGetFacilityNearestStation() {
    const dt_fim_operacao : any | null = null;
    return [{
        CD_OSCAR: faker.string.alphanumeric({ length: 10 }),
        DC_NOME: faker.string.alphanumeric({ length: 10 }),
        FL_CAPITAL: faker.string.alphanumeric({ length: 1 }),
        DT_FIM_OPERACAO: dt_fim_operacao,
        CD_SITUACAO: faker.string.alphanumeric({ length: 10 }),
        TP_ESTACAO: faker.string.alphanumeric({ length: 10 }),
        VL_LATITUDE: faker.string.alphanumeric({ length: 10 }),
        CD_WSI: faker.string.alphanumeric({ length: 10 }),
        CD_DISTRITO: faker.string.alphanumeric({ length: 10 }),
        VL_ALTITUDE: faker.string.alphanumeric({ length: 10 }),
        DT_INICIO_OPERACAO: faker.string.alphanumeric({ length: 10 }),
        SG_ENTIDADE: faker.string.alphanumeric({ length: 10 }),
        SG_ESTADO: faker.string.alphanumeric({ length: 2 }),
        CD_ESTACAO: faker.string.alphanumeric({ length: 10 }),
        VL_LONGITUDE: faker.string.alphanumeric({ length: 10 }),
        DISTANCIA_EM_KM: `${faker.string.numeric(2)} Km`,
    }]
}
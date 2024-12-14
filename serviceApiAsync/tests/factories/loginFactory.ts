import { faker } from "@faker-js/faker";
import { SessionData } from "../../../srcCommon/types";

export interface ISession {
  session: SessionData;
  extraSessionData: any;
  realUserSession?: SessionData;
}

type UserInfoProps = {
  user?: string;
  name?: string;
};

export function generateUserInfo(props: UserInfoProps) {
  return {
    EMAIL: props.user || faker.internet.email(),
    NOME: props.name || faker.person.firstName(),
    SOBRENOME: faker.person.lastName(),
    LAST_ACCESS: faker.date.past(),
    PERMS_U: "",
    CLBIND_ID: 1,
    CLBIND_ENABLED: "",
    CLBIND_PERMS_C: "",
  };
}

type SessionProps = {
  token?: string;
  user?: string;
  password?: string;
  invalid?: boolean;
};

export function generateSession(props: SessionProps) {
  return {
    session: props.invalid
      ? undefined
      : {
          user: props.user || faker.person.fullName(),
          permissions: {
            PER_CLIENT: [{ clientId: faker.string.numeric(), p: ["[U]"] }],
            isAdminSistema: true,
            isUserManut: false,
            ALTER_SYSTEM_PARS: true,
            MANAGE_ALL_CLIENTS_AND_DACS: true,
            VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: true,
            MANAGE_UNOWNED_DEVS: true,
            HEALTH_MANAGEMENT: true,
          },
        },
    extraSessionData: "",
    realUserSession: {},
  };
}

export function generateUserDataToFront() {
  return {
    token: faker.string.alphanumeric(20),
    user: faker.string.alpha(),
    name: faker.string.alpha(),
    lastName: faker.string.alpha(),
    phonenb: faker.phone.number(),
    notifsby: faker.string.alpha(),
    isMasterUser: faker.number.binary(),
    permissions: {
      PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: ["I"] }],
      isAdminSistema: false,
      isUserManut: false,
      ALTER_SYSTEM_PARS: false,
      MANAGE_ALL_CLIENTS_AND_DACS: false,
      VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: false,
      MANAGE_UNOWNED_DEVS: false,
      HEALTH_MANAGEMENT: false,
    },
    prefs: faker.string.alpha(),
    profileSim: faker.number.binary(),
  }
}

export function generateSessionReal(): SessionData {
  return {
    user: faker.person.fullName(),
    permissions: {
      PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: ["[U]"] }],
      isAdminSistema: true,
      isUserManut: false,
      ALTER_SYSTEM_PARS: true,
      MANAGE_ALL_CLIENTS_AND_DACS: true,
      VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: true,
      MANAGE_UNOWNED_DEVS: true,
      HEALTH_MANAGEMENT: true,
    },
  };
}

export function generateSessionNoPermissions(): SessionData {
  return {
    user: faker.person.fullName(),
    permissions: {
      PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: [] }],
      isAdminSistema: false,
      isUserManut: false,
      ALTER_SYSTEM_PARS: false,
      MANAGE_ALL_CLIENTS_AND_DACS: false,
      VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: false,
      MANAGE_UNOWNED_DEVS: false,
      HEALTH_MANAGEMENT: false,
    },
  };
}

export function generateSessionRealNotAdmin(): SessionData {
  return {
    user: faker.person.fullName(),
    permissions: {
      PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: ["[U]"] }],
      isAdminSistema: false,
      isUserManut: false,
      ALTER_SYSTEM_PARS: false,
      MANAGE_ALL_CLIENTS_AND_DACS: false,
      VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: false,
      MANAGE_UNOWNED_DEVS: false,
      HEALTH_MANAGEMENT: true,
    },
  };
}

export function generatePermission(permissions: boolean) {
  return {
    canManageDevs: permissions,
    canViewDevs: permissions,
    canChangeDeviceOperation: permissions,
    canViewObservations: permissions,
    canManageObservations: permissions,
    canManageSketches: permissions,
    canEditProgramming: permissions,
  };
}

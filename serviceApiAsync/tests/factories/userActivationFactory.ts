import { faker } from "@faker-js/faker";
import { SessionData } from '../../../srcCommon/types';

export type ProfilePerClient = '[U]'|'[C]'|'[M]'|'[T]'|'[MN]';

export function generateReqParamsReactivateUser() {
    return {
        USER: faker.internet.email(),
        clientIds: [generateClientIds()]
    }
}


export function generateClientIds() {
  return faker.number.int({min: 1})

}

export function generateReqParamsReactivateUserNoClients() {
    return {
        USER: faker.internet.email(),
        clientIds: [] as number []
    }
}

export function generateSessionReal(): SessionData {
  return { user: faker.person.fullName(), permissions: {  PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: ['[C]'] }],  isAdminSistema: true, isUserManut: false, ALTER_SYSTEM_PARS: true, MANAGE_ALL_CLIENTS_AND_DACS: true, VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: true, MANAGE_UNOWNED_DEVS: true, HEALTH_MANAGEMENT: true } }
}

export function generateSessionFaker(): SessionData {
  return { user: faker.person.fullName(), permissions: {  PER_CLIENT: [{ clientId: faker.number.int({min: 1}), p: ['[U]'] }],  isAdminSistema: false, isUserManut: false, ALTER_SYSTEM_PARS: true, MANAGE_ALL_CLIENTS_AND_DACS: true, VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS: true, MANAGE_UNOWNED_DEVS: true, HEALTH_MANAGEMENT: true } }
}


export function generateGetAllowedClientsManageFull() {
  return {    
    clientIds: [] as number[]      
  } 
}

export function generateGetUserClients(userId: string){
  return [ {
      USER_ID: userId,
      CLIENT_ID: faker.string.numeric(),
      PERMS: '[U]',
      UNITS: faker.location.city(),
      ENABLED: faker.string.alpha(2),
      PERMS_C: '[U]',
  }]
}

export function generateGetList(userId: string, clientIds: number[]){
  return [ {
      USER_ID: userId,
      CLIENT_ID: clientIds[0],
      PERMS: '[U]',
      UNITS: faker.location.city(),
  }]
}

export function generateGetUserData_basic(){
  return [ {
    EMAIL:  faker.internet.email(),
    NOME: faker.person.firstName(),
    SOBRENOME: faker.person.lastName(),
    LAST_ACCESS: faker.date.past(),
    PERMS_U: "",
    CLBIND_ID: 1,
    CLBIND_ENABLED: "",
    CLBIND_PERMS_C: "",
  }]
}
import { ProfilePerClient, SessionData, UserPermissions } from '../types'
import sqldb from '../db'

export const PROFILECODES = {
  PERUSER: {
    AdminDiel: '[A]' as '[A]',
    HealthManager: '[HM]' as '[HM]', // Permite alterar saúde dos dispositivos
    DemoViewAll: '[D]' as '[D]', // Perfil de demonstração que pode ver todos os dispositivos de todos os clientes, somente leitura
    Mantenedor: '[M]' as '[M]',
    ParceiroValidador: '[PV]' as '[PV]',
    Instalador: '[I]' as '[I]',
    AdminApisIntegrations: '[API]' as '[API]' // Permite cadastrar APIs de testes personalizadas no painel integração
  },
  PERCLIENT: {
    AdminCliente: '[C]' as '[C]',
    AdminClienteProg: '[CP]' as '[CP]', // Permite alterar a programação dos dispositivos
    UsuarioBasico: '[U]' as '[U]',
    Parceiro: '[M]' as '[M]',
    MantenedorV2: '[MN]' as '[MN]',
    Tecnico: '[T]' as '[T]',
    Instalador: '[I]' as '[I]',
  },
  EMPRESA: {
    Cliente: '[C]', // Cliente normal, com unidades e dispositivos
    Fabricante: '[F]', // Fabricante de dispositivos, como a Serdia e a Expoente
    Mantenedor: '[M]', // Empresa de manutenção, os usuário mantenedores ficam associados a ela
    Parceiro: '[P]',
  },
}

export const profileDesc = {
  '[U]': 'Usuário',
  '[C]': 'Admin', // Admin Cliente
  '[CP]': 'Admin Cliente Programação', // Admin Cliente Programador
  '[A]': 'Admin Sistema',
  '[M]': 'Parceiro', // Provisionador
  '[D]': 'Demonstração',
  '[T]': 'Técnico',
  '[MN]': 'Mantenedor',
  '[PV]': 'Parceiro Validador',
  '[I]': 'Instalador',
};
export const clientTypes = {
  '[C]': { cod2: 'cliente' as 'cliente', label: 'Cliente' },
  '[F]': { cod2: 'fabricante' as 'fabricante', label: 'Fabricante' },
  '[M]': { cod2: 'mantenedor' as 'mantenedor', label: 'Mantenedora' },
  // '[I]': { cod2: 'instalador' as 'instalador', label: 'Instalador' },
  '[P]': { cod2: 'parceira' as 'parceira', label: 'Parceira' },
};

export async function getAllowedUnitsView (session: SessionData): Promise<{ clientIds?: number[], unitIds?: number[] }> {
  let allowedClients: number[] = [];
  let allowedUnits: number[] = undefined;
  for (const { clientId } of session.permissions.PER_CLIENT) {
    allowedClients.push(clientId);
  }
  if (session.permissions.PER_UNIT) {
    for (const { clientId, units } of session.permissions.PER_UNIT) {
      if (!allowedClients.includes(clientId)) {
        allowedClients.push(clientId);
      }
      if (!allowedUnits) allowedUnits = [];
      allowedUnits = allowedUnits.concat(units);
    }
  }
  if (session.permissions.MANAGE_UNOWNED_DEVS) {
    const manufIds = (await sqldb.CLIENTS.getManufacturers()).map((x) => x.CLIENT_ID);
    allowedClients = allowedClients.concat(manufIds);
  }
  return { clientIds: allowedClients, unitIds: allowedUnits };
}

export async function adjustUnitsViewFilter(session: SessionData, preFilter: { clientIds?: number[], unitIds?: number[] }): Promise<{ clientIds?: number[], unitIds?: number[] }> {
  const adjusted = {
    clientIds: preFilter?.clientIds,
    unitIds: preFilter?.unitIds,
  };
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    return adjusted;
  }
  const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
  if (!adjusted.clientIds || adjusted.clientIds.length === 0) { adjusted.clientIds = allowedClients; }
  adjusted.clientIds = adjusted.clientIds.filter(x => allowedClients.includes(Number(x)));
  if (allowedUnits && (!adjusted.unitIds || adjusted.unitIds.length === 0)) { adjusted.unitIds = allowedUnits; }
  if (allowedUnits) adjusted.unitIds = adjusted.unitIds.filter(x => allowedUnits.includes(Number(x)));
  return adjusted;
};

export async function getUnitsAndClients(preFilter: { CLIENT_IDS?: number[], UNIT_IDS?: number[] }, session: SessionData) {
  const qPars: { CLIENT_IDS: number[], UNIT_IDS: number[] } = { CLIENT_IDS: [], UNIT_IDS: [] };
  qPars.CLIENT_IDS = session.permissions?.PER_CLIENT?.map((p) => p.clientId) ?? [];
  qPars.UNIT_IDS = session.permissions?.PER_UNIT?.map((p) => p.units?.map((u) => u)).flat() ?? [];

  if (session.permissions.MANAGE_UNOWNED_DEVS) {
    const manufIds = (await sqldb.CLIENTS.getManufacturers()).map((x) => x.CLIENT_ID);
    qPars.CLIENT_IDS = qPars.CLIENT_IDS.concat(manufIds);
  }

  if (preFilter.CLIENT_IDS || preFilter.UNIT_IDS) {
    await getAllowedUnitsWithFilter(preFilter, qPars, session);
  }

  return qPars
}

export async function getAllowedUnitsWithFilter(preFilter: { CLIENT_IDS?: number[], UNIT_IDS?: number[] }, qPars: { CLIENT_IDS: number[], UNIT_IDS: number[] }, session: SessionData){
  let clientsByUnits = session.permissions?.PER_UNIT?.map((p) => p.clientId) ?? [];
  if ([preFilter.CLIENT_IDS?.length, preFilter.UNIT_IDS.length].every(length => length === 0)) {
    await handleNoPreFilters(qPars, clientsByUnits);
  } else {
    await handleWithPreFilters(preFilter, qPars, session, clientsByUnits);
  }
}

async function handleNoPreFilters(qPars: { CLIENT_IDS: number[], UNIT_IDS: number[] }, clientsByUnits: number[]) {
  let unitsAllowedByPermissionPerClient = [] as {
    UNIT_ID: number;
  }[];
  if (qPars.CLIENT_IDS.length !== 0) {
    unitsAllowedByPermissionPerClient = await sqldb.CLUNITS.getUnitsAllowedAndFilteredByClients({ clientIds: qPars.CLIENT_IDS });
  }
  qPars.UNIT_IDS = qPars.UNIT_IDS.concat(unitsAllowedByPermissionPerClient.map((u) => u.UNIT_ID));
  qPars.CLIENT_IDS = qPars.CLIENT_IDS.concat(clientsByUnits);
}

async function handleWithPreFilters(preFilter: { CLIENT_IDS?: number[], UNIT_IDS?: number[] }, qPars: { CLIENT_IDS: number[], UNIT_IDS: number[] }, session: SessionData, clientsByUnits: number[]) {
  const permissionClientAux = qPars.CLIENT_IDS;
    let alreadyFilteredUnitsByPermissions = false;

    if (preFilter.CLIENT_IDS?.length) {
      qPars.UNIT_IDS = [];
      const filterUnitsByPermissionByUnit = session.permissions?.PER_UNIT?.filter((u) => preFilter.CLIENT_IDS.includes(u.clientId)).map((p) => p.units?.map((u) => u)).flat();
      const filterClientsByPermissionByUnits = clientsByUnits.filter((client) => preFilter.CLIENT_IDS.includes(client));
      const filterClientsByPermissionByClients = qPars.CLIENT_IDS.filter((client) => preFilter.CLIENT_IDS.includes(client));

      if (filterClientsByPermissionByClients.length) {
        const unitsAllowedByPermissionPerClient = await sqldb.CLUNITS.getUnitsAllowedAndFilteredByClients({ clientIds: filterClientsByPermissionByClients });
        qPars.UNIT_IDS = unitsAllowedByPermissionPerClient.map((unit) => unit.UNIT_ID);
        alreadyFilteredUnitsByPermissions = true;
      }
      qPars.UNIT_IDS = qPars.UNIT_IDS.concat(filterUnitsByPermissionByUnit);
      qPars.CLIENT_IDS = filterClientsByPermissionByUnits.concat(filterClientsByPermissionByClients);
      
    }
    if (preFilter.UNIT_IDS?.length) {
      if (permissionClientAux.length && !alreadyFilteredUnitsByPermissions) {
        const unitsAllowedByPermissionPerClient = await sqldb.CLUNITS.getUnitsAllowedAndFilteredByClients({ clientIds: permissionClientAux });
        qPars.UNIT_IDS = qPars.UNIT_IDS.concat(unitsAllowedByPermissionPerClient.map((u) => u.UNIT_ID));
        qPars.CLIENT_IDS = preFilter.CLIENT_IDS?.length ? qPars.CLIENT_IDS.concat(clientsByUnits) : [];
      }
      qPars.UNIT_IDS = qPars.UNIT_IDS.filter(x => preFilter.UNIT_IDS.includes(Number(x)));
    }
}

export async function getAllowedUnitsManage (session: SessionData): Promise<{ clientIds?: number[], unitIds?: number[] }> {
  let allowedClients: number[] = [];
  let allowedUnits: number[] = undefined;
  for (const cperms of session.permissions.PER_CLIENT) {
    if (cperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente)) { /* OK */ }
    else if (cperms.p.includes(PROFILECODES.PERCLIENT.Parceiro)) { /* OK */ }
    else if (cperms.p.includes(PROFILECODES.PERCLIENT.Instalador)) { /* OK */ }
    else continue;
    allowedClients.push(cperms.clientId);
  }
  if (session.permissions.PER_UNIT) {
    for (const { p, units } of session.permissions.PER_UNIT) {
      if (p.includes(PROFILECODES.PERCLIENT.AdminCliente)) { /* OK */ }
      else if (p.includes(PROFILECODES.PERCLIENT.Parceiro)) { /* OK */ }
      else if (p.includes(PROFILECODES.PERCLIENT.Instalador)) { /* OK */ }
      else continue;
      if (!allowedUnits) allowedUnits = [];
      allowedUnits = allowedUnits.concat(units);
    }
  }
  if (session.permissions.MANAGE_UNOWNED_DEVS) {
    const manufIds = (await sqldb.CLIENTS.getManufacturers()).map((x) => x.CLIENT_ID);
    allowedClients = allowedClients.concat(manufIds);
  }
  return { clientIds: allowedClients, unitIds: allowedUnits };
}

export async function getAllowedClientsManageFull (session: SessionData): Promise<{ clientIds?: number[] }> {
  let allowedClients: number[] = [];
  for (const cperms of session.permissions.PER_CLIENT) {
    if (cperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente)) { /* OK */ }
    else if (cperms.p.includes(PROFILECODES.PERCLIENT.Parceiro)) { /* OK */ }
    else continue;
    allowedClients.push(cperms.clientId);
  }
  return { clientIds: allowedClients };
}

export function getUserGlobalPermissions(session: SessionData) {
  return {
    editCreateDeleteClientsProfiles: session.permissions.isAdminSistema,
    deleteClientUnitsMachinesRooms: session.permissions.isAdminSistema,
    manageAllUsersAndNotifications: session.permissions.isAdminSistema,
    manageFirmwares: session.permissions.isAdminSistema,
    sendOtaProd: session.permissions.isAdminSistema || session.permissions.isParceiroValidador || session.permissions.MANAGE_UNOWNED_DEVS,
    readAllDevsLogs: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    manageAllSimcards: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    readAllIntegrationDevices: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    editCitiesList: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    listAllDetectedFaults: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    viewAllDevs: session.permissions.isAdminSistema || session.permissions.isParceiroValidador || session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS,
    editAnyDevInfo: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    manageAllClientsUnitsAndDevs: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    editAnyDevSchedule: session.permissions.isAdminSistema || session.permissions.isParceiroValidador,
    canManageObservations: session.permissions.isAdminSistema || session.permissions.isParceiroValidador || session.permissions.isInstaller,
    canViewObservations: session.permissions.isAdminSistema || session.permissions.isParceiroValidador || session.permissions.isInstaller,
    canManageSketches: session.permissions.isAdminSistema || session.permissions.isParceiroValidador || session.permissions.isInstaller,
  };
}

type TPermsGlobal = {
  editCreateDeleteClientsProfiles: boolean,
  deleteClientUnitsMachinesRooms: boolean,
  manageAllUsersAndNotifications: boolean,
  manageFirmwares: boolean,
  sendOtaProd: boolean,
  readAllDevsLogs: boolean,
  manageAllSimcards: boolean,
  readAllIntegrationDevices: boolean,
  editCitiesList: boolean,
  listAllDetectedFaults: boolean,
  viewAllDevs: boolean,
  editAnyDevInfo: boolean,
  manageAllClientsUnitsAndDevs: boolean,
  editAnyDevSchedule: boolean,
  canManageObservations: boolean,
  canViewObservations: boolean,
  canManageSketches: boolean,
}

function verifyPermissionsGeneral(permsGlobal: TPermsGlobal) {
  let isClientUser = false;
  let canManageClient = permsGlobal.manageAllClientsUnitsAndDevs || false;
  let canAddUsersToClient = permsGlobal.manageAllUsersAndNotifications || false;
  let canManageClientNotifs = permsGlobal.manageAllUsersAndNotifications || false;
  let canConfigureNewUnits = permsGlobal.manageAllClientsUnitsAndDevs || false;
  let canViewClientUnits = permsGlobal.viewAllDevs || false;
  let editAnyDevSchedule = permsGlobal.editAnyDevSchedule || false;
  let canManageObservations = permsGlobal.canManageObservations || false;
  let canViewObservations = permsGlobal.canViewObservations || false;
  let canManageSketches = permsGlobal.canManageSketches || false;
  return {
    isClientUser,
    canManageClient,
    canAddUsersToClient,
    canManageClientNotifs,
    canConfigureNewUnits,
    canViewClientUnits,
    editAnyDevSchedule,
    canManageObservations,
    canViewObservations,
    canManageSketches,
  }
}

async function permissionCanManageDev(permsGlobal: TPermsGlobal, canManageClient: boolean, permsOnClient: {
  clientId: number;
  p: ProfilePerClient[];
}, CLIENT_ID: number, session: SessionData) {
  let canManageDevs = permsGlobal.manageAllClientsUnitsAndDevs || canManageClient
  || (permsOnClient && (permsOnClient.p.includes(PROFILECODES.PERCLIENT.Parceiro) || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador)));
  if ((!canManageDevs) && session.permissions.MANAGE_UNOWNED_DEVS) {
    if (CLIENT_ID === null) canManageDevs = true;
    else {
      const manufs = await sqldb.CLIENTS.getManufacturers();
      if (manufs.some((x) => x.CLIENT_ID === CLIENT_ID)) canManageDevs = true;
    }
  }
  return canManageDevs;
}

export async function getPermissionsOnClient(session: SessionData, CLIENT_ID: number) {
  const permsGlobal = getUserGlobalPermissions(session);

  let {
    isClientUser,
    canManageClient,
    canAddUsersToClient,
    canManageClientNotifs,
    canConfigureNewUnits,
    canViewClientUnits,
    editAnyDevSchedule, canManageObservations, canViewObservations,
    canManageSketches,
  } = verifyPermissionsGeneral(permsGlobal);
  let canEditProgramming = editAnyDevSchedule;

  const permsOnClient = CLIENT_ID && session.permissions.PER_CLIENT.find(x => x.clientId === CLIENT_ID);

  if (permsOnClient) {
    isClientUser = permsOnClient.p.includes(PROFILECODES.PERCLIENT.UsuarioBasico)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador);
    canEditProgramming = canEditProgramming || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminClienteProg);
    canManageClient = canManageClient || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente) || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador);
    canAddUsersToClient = canAddUsersToClient || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente);
    canManageClientNotifs = canManageClientNotifs || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente);
    canConfigureNewUnits = canConfigureNewUnits
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Parceiro);
    canViewClientUnits = canViewClientUnits
      || isClientUser
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Parceiro)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.MantenedorV2)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador)
    canManageObservations = canManageObservations
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Parceiro)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.MantenedorV2)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente)
    canViewObservations = canViewObservations
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Parceiro)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.MantenedorV2)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.Instalador)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente)
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.UsuarioBasico)
    canManageSketches = canManageSketches
      || permsOnClient.p.includes(PROFILECODES.PERCLIENT.AdminCliente)
  }

  let canManageDevs = await permissionCanManageDev(permsGlobal, canManageClient, permsOnClient, CLIENT_ID, session);
  const canViewDevs = canViewClientUnits || canManageDevs;

  const canDeleteDevs = canManageDevs && (session.permissions.isAdminSistema);

  return {
    canManageClient,
    canAddUsersToClient,
    canEditProgramming,
    isClientUser,
    canViewClientUnits,
    canConfigureNewUnits,
    canManageClientNotifs,
    canManageDevs,
    canViewDevs,
    canDeleteDevs,
    canManageObservations,
    canViewObservations,
    canManageSketches,
  };
}

export async function getPermissionsOnUnit(session: SessionData, CLIENT_ID: number, UNIT_ID: number) {
  let { canConfigureNewUnits, canManageDevs, canViewDevs, canManageObservations, canViewObservations, canManageSketches, canEditProgramming } = await getPermissionsOnClient(session, CLIENT_ID);

  if (session.permissions.PER_UNIT && UNIT_ID && CLIENT_ID) {
    const uperms = session.permissions.PER_UNIT.find((x) => (x.clientId === CLIENT_ID && x.units.includes(UNIT_ID)));
    if (uperms) {
      canConfigureNewUnits = canConfigureNewUnits
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Parceiro));
      canManageDevs = canManageDevs
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Instalador))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Parceiro))
      canViewDevs = canViewDevs
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Instalador))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Parceiro))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.MantenedorV2))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.UsuarioBasico))
      canManageObservations = canManageObservations
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Instalador))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Parceiro))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.MantenedorV2))
      canViewObservations = canViewObservations
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Instalador))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.Parceiro))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.MantenedorV2))
        || (uperms.p.includes(PROFILECODES.PERCLIENT.UsuarioBasico))
      canManageSketches = canManageSketches
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))
      canEditProgramming = canEditProgramming
        || (uperms.p.includes(PROFILECODES.PERCLIENT.AdminClienteProg))
    }
  }

  // Permissão para acionar os botões de automação no dash
  const canChangeDeviceOperation = canViewDevs;

  return {
    canManageDevs,
    canViewDevs,
    canChangeDeviceOperation,
    canManageObservations,
    canViewObservations,
    canManageSketches,
    canEditProgramming,
  };
}

export async function checkDevEditPermission (session: SessionData, current: { CLIENT_ID: number, UNIT_ID: number }, wanted: { CLIENT_ID: number, UNIT_ID: number }): Promise<{
  userCanChangeClient?: boolean
  userCanAddNewInfo?: boolean
  userCanEditDev?: boolean
  clientChanged: boolean
  finalClient: number|null
}> {
  const wantedClient = ((wanted.CLIENT_ID === undefined) ? current?.CLIENT_ID : wanted.CLIENT_ID) || null;
  const wantedUnit = ((wanted.UNIT_ID === undefined) ? current?.UNIT_ID : wanted.UNIT_ID) || null;
  const willChangeClient = wantedClient !== current?.CLIENT_ID;

  if (session.permissions.isAdminSistema || session.permissions.isInstaller) {
    return {
      userCanChangeClient: true, // Pode reassociar qualquer dispositivo para qualuqer cliente
      userCanAddNewInfo: true, // Pode inserir novos dispositivos no banco e associar a qualquer cliente
      userCanEditDev: true, // Pode editar as informações de todos os dispositivos, independente do cliente
      clientChanged: willChangeClient,
      finalClient: wantedClient,
    };
  }

  // Se for novo dispositivo
  if (!current) {
    if (session.permissions.MANAGE_UNOWNED_DEVS) {
      return {
        userCanChangeClient: true, // Pode passar o novo dispositivo para qualquer cliente
        userCanAddNewInfo: true, // Pode inserir novos dispositivos no banco e associar a qualquer cliente
        userCanEditDev: true, // Pode editar as informações do dispositivo
        clientChanged: willChangeClient,
        finalClient: wantedClient,
      };
    }

    // Não pode adicionar novos dispositivos
    throw Error('Permission denied! Profile cannot add new devices.').HttpStatus(403);
  }

  if (willChangeClient && (current.CLIENT_ID === null) && session.permissions.MANAGE_UNOWNED_DEVS) {
    return {
      userCanChangeClient: true, // Pode passar o dispositivo desassociado para qualquer cliente
      userCanEditDev: true, // Pode editar as informações do dispositivo
      clientChanged: willChangeClient,
      finalClient: wantedClient,
    };
  }

  // Se não entrou nas condições acima, o usuário não tem direito de trocar o cliente atribuído ao dispositivo
  if (willChangeClient) {
    throw Error('Permission denied! Profile cannot change to the requested client.').HttpStatus(403);
  }

  if ((current.UNIT_ID === null) && session.permissions.MANAGE_UNOWNED_DEVS) {
    // Se o dispositivo já estiver associado a um cliente mas ainda sem unidade, permite editar
    return {
      userCanEditDev: true, // Pode editar as informações do dispositivo
      clientChanged: willChangeClient,
      finalClient: wantedClient,
    };
  }

  const permsFrom = await getPermissionsOnUnit(session, current.CLIENT_ID, current.UNIT_ID);
  const permsTo = await getPermissionsOnUnit(session, wantedClient, wantedUnit);

  // Pode editar as informações do dispositivo, inclusive a unidade
  const userCanEditDev = !!(permsFrom.canManageDevs && permsTo.canManageDevs);

  return {
    userCanEditDev,
    clientChanged: willChangeClient,
    finalClient: wantedClient,
  };
}

export function canEditUserInfo(sessionUserPerms: UserPermissions, editedUserPerms: UserPermissions): boolean {
  // Pode alterar os dados do usuário como nome, senha, telefone, etc...
  // Um usuário admin do cliente pode alterar os dados dos usuários comuns do cliente
  if (editedUserPerms.PER_CLIENT.length > 0) {
    for (const editedPerms of editedUserPerms.PER_CLIENT) {
      const sessionPerms = sessionUserPerms.PER_CLIENT.find(x => x.clientId === editedPerms.clientId);
      if (sessionPerms && (sessionPerms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))) {
        // OK, o que edita é admin do cliente (e não limitado por unidade)
      } else return false;
      if (editedPerms.p.length === 1 && editedPerms.p[0] === PROFILECODES.PERCLIENT.UsuarioBasico) {
        // OK, o usuário editado não tem permissões especiais no cliente
      } else return false;
    }
    return true;
  } else return false;
}

export function canAlterUserProfile(sessionUserPerms: UserPermissions, editedUserPerms: UserPermissions, clientId: number): boolean {
  // Pode alterar o perfil? Tem que ter manage do perfil e o usuário editado não pode ter manage
  const sessionPerms = sessionUserPerms.PER_CLIENT.find(x => x.clientId === clientId);
  if (sessionPerms && (sessionPerms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))) {
    // OK, o que edita é admin do cliente (e não limitado por unidade)
  } else return false;

  const editedPerms = editedUserPerms.PER_CLIENT.find(x => x.clientId === clientId);
  if (!editedPerms) return true;
  const isLowerUser = editedPerms.p.every((p) => (
    (p === PROFILECODES.PERCLIENT.UsuarioBasico)
    || (p === PROFILECODES.PERCLIENT.MantenedorV2)
    || (p === PROFILECODES.PERCLIENT.Tecnico)
    || (p === PROFILECODES.PERCLIENT.Parceiro)
    || (p === PROFILECODES.PERCLIENT.Instalador)
  ));
  if (isLowerUser) return true;
  return false;
}

export function canViewUserInfo(sessionUserPerms: UserPermissions, editedUserPerms: UserPermissions): boolean {
  // Pode ler as informações do usuário
  for (const { clientId } of editedUserPerms.PER_CLIENT) {
    const sessionPerms = sessionUserPerms.PER_CLIENT.find(x => x.clientId === clientId);
    if (sessionPerms && (sessionPerms.p.includes(PROFILECODES.PERCLIENT.AdminCliente))) {
      return true;
    }
  }
  return false;
}

function checkProfilePermsClient(userPermsOnClient: string) {
  const p: ProfilePerClient[] = [];
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.AdminCliente)) p.push(PROFILECODES.PERCLIENT.AdminCliente);
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.Parceiro)) p.push(PROFILECODES.PERCLIENT.Parceiro);
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.MantenedorV2)) p.push(PROFILECODES.PERCLIENT.MantenedorV2);
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.UsuarioBasico)) p.push(PROFILECODES.PERCLIENT.UsuarioBasico);
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.Instalador)) p.push(PROFILECODES.PERCLIENT.Instalador);
  if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.AdminClienteProg)) p.push(PROFILECODES.PERCLIENT.AdminClienteProg);
  return p;
}

function verifyPermsGetPermissions(clientsPerms: {
  CLIENT_ID: number;
  PERMS: string;
  UNITS: string;
  PERMS_C: string;
  ENABLED: string;
}[], perms: UserPermissions) {
  for (const clientPerm of clientsPerms) {
    if (!clientPerm.CLIENT_ID) continue;
    if (clientPerm.ENABLED !== '1') continue;
    const userPermsOnClient = clientPerm.PERMS || '';
    const p = checkProfilePermsClient(userPermsOnClient);
    if (p[0] === PROFILECODES.PERCLIENT.Instalador) {
      perms.isInstaller = true;
    }
    const units = clientPerm.UNITS && clientPerm.UNITS.split(',').map((x) => Number(x));
    if (units) {
      if (!perms.PER_UNIT) perms.PER_UNIT = [];
      perms.PER_UNIT.push({ clientId: clientPerm.CLIENT_ID, p, units });
    } else {
      perms.PER_CLIENT.push({ clientId: clientPerm.CLIENT_ID, p });
    }

    //  - Adicionar e remover fotos para o próprio cliente
    //  - Gerenciar dados não cadastrais do próprio cliente, incluindo editar informações de DAC, de unidades e de grupos, adicionar e remover usuários
    //  - ALTER_OWN_CLIENT_UNITS_GROUPS
    //  - INVITE_USERS (para o próprio cliente ou por outros clientes)

    /*if (!clientPerm.UNITS) {
      perms.CLIENT_VIEW.push(clientPerm.CLIENT_ID);
  
      if (userPermsOnClient.includes(PROFILECODES.PERCLIENT.AdminCliente) || userPermsOnClient.includes(PROFILECODES.PERCLIENT.Parceiro)) {
        perms.CLIENT_MANAGE.push(clientPerm.CLIENT_ID);
      }
    }*/
  }
}

function checkWhichProfile(userInfo: {
  isMasterUser?: boolean,
  userPerms: string,
  CLBIND_ID: number,
  CLBIND_ENABLED: string,
  CLBIND_PERMS_C: string,
  }, userPerms: string, perms: UserPermissions) {
  if (userInfo.isMasterUser || userPerms.includes(PROFILECODES.PERUSER.AdminDiel)) perms.isAdminSistema = true;
  if (userInfo.isMasterUser && userPerms.includes(PROFILECODES.PERUSER.AdminDiel)) perms.isMasterUser = true;
  if (userPerms.includes(PROFILECODES.PERUSER.ParceiroValidador)) perms.isParceiroValidador = true;
}


export function getPermissions(userInfo: {
  isMasterUser?: boolean,
  userPerms: string,
  CLBIND_ID: number,
  CLBIND_ENABLED: string,
  CLBIND_PERMS_C: string,
}, clientsPerms: {
  CLIENT_ID: number,
  PERMS: string,
  UNITS: string,
  PERMS_C: string,
  ENABLED: string,
}[]) {
  const perms: UserPermissions = {
    PER_CLIENT: [],
    isUserManut: (userInfo.CLBIND_PERMS_C || '').includes(PROFILECODES.EMPRESA.Mantenedor),
  };
  const userPerms = userInfo.userPerms || '';
  checkWhichProfile(userInfo, userPerms, perms);
  
  if (userInfo.isMasterUser || userPerms.includes(PROFILECODES.PERUSER.AdminDiel)) perms.ALTER_SYSTEM_PARS = true;
  //  - Alterar parâmetros do sistema todo: valor padrão de calibração de sensores, lista de cidades

  if (userInfo.isMasterUser || perms.isAdminSistema || perms.isParceiroValidador) perms.MANAGE_ALL_CLIENTS_AND_DACS = true;
  //  - Listar todos os clientes e ver suas informações de cadastro
  //  - Editar cadstro dos clientes, adicionar clientes, remover clientes, remover DACs, associar DACs a clientes, adicionar usuários para qualquer cliente, definir primeira senha de qualquer usuário.
  //  - ADD_CLIENTS
  //  - INVITE_USERS (para o próprio cliente ou por outros clientes)
  //  - REMOVE_CLIENTS
  //  - SET_FIRST_USER_PASSWORD
  //  - DELETE_ALL_DAC_DATA
  //  - EDIT_CLIENTS_INFO
  //  - LIST_ALL_CLIENTS_USERS
  //  - MANAGE_ALL_CLIENTS_USERS
  //  - Adicionar e remover fotos para todos os clientes
  //  - ALTER_ALL_CLIENTS_HEALTH_DATA
  //  - Adicionar alarmes, editar índice de saúde, alterar laudo, para todos os clientes
  //  - ALTER_ALARMS
  //  - Editar dados de DAC de todos os clientes
  //  - ALTER_ALL_CLIENTS_DACS_INFO
  //  - ALTER_ALL_CLIENTS_DATA

  if (perms.MANAGE_ALL_CLIENTS_AND_DACS || userPerms.includes(PROFILECODES.PERUSER.DemoViewAll)) perms.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS = true;
  //  - Ver lista de DACs e suas informações de todos os clientes, acessar dados de telemetria de todos os DACs
  //  - VIEW_ALL_CLIENTS_DACS
  //  - VIEW_ALL_CLIENTS_UNITS_GROUPS
  //  - Visualizar histórico de dados de DACs de todos os clientes
  //  - Ver fotos de todos os clientes
  verifyPermsGetPermissions(clientsPerms, perms);

  if (perms.MANAGE_ALL_CLIENTS_AND_DACS || userPerms.includes(PROFILECODES.PERUSER.Mantenedor) || userPerms.includes(PROFILECODES.PERUSER.ParceiroValidador) || perms.isInstaller) {
    perms.MANAGE_UNOWNED_DEVS = true;
  }
  //  - Comissionar novos dispositivos: trocar configurações de DEVs com CLIENT_ID = null

  if (userInfo.isMasterUser || (userPerms.includes(PROFILECODES.PERUSER.HealthManager) && perms.MANAGE_ALL_CLIENTS_AND_DACS)) perms.HEALTH_MANAGEMENT = true;

  if (userInfo.isMasterUser || userPerms.includes(PROFILECODES.PERUSER.AdminApisIntegrations) && perms.isAdminSistema) perms.API_MANAGEMENT = true;
  //  - Permite cadastrar novas apis com a funcionalidade de teste onde é possível selecionar uma quantidade de unidades específicas

  // perms.DELETE_UNNAMED_DACS = perms.MANAGE_ALL_CLIENTS_AND_DACS // || perms.MANAGE_UNOWNED_DEVS || userInfo.profileManuf;

  return perms;
}

export async function canSeeDevicesWithoutProductionUnit(clientIds: number[], ) {
  const manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  return clientIds.some(item => manufacturers.includes(item));
}

export async function validateAllowedRequestedUnits(requested: { clientIds?: number[], unitIds?: number[] }, session: SessionData) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ } 
    else {
        const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
        if (!requested.clientIds) { requested.clientIds = allowedClients; }
        requested.clientIds = requested.clientIds.filter(x => allowedClients.includes(x));
        if (allowedUnits && !requested.unitIds) { requested.unitIds = allowedUnits; }
        if (allowedUnits) requested.unitIds = requested.unitIds.filter(x => allowedUnits.includes(x));
    }
  return requested;
}
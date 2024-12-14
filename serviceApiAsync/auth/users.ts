import * as httpRouter from '../apiServer/httpRouter'
import * as uuid from 'uuid'
import * as generatePassword from 'password-generator'
import * as dacAlerts from '../notifs/dacAlerts'
import sqldb from '../../srcCommon/db'
import * as fs from 'fs'
import * as path from 'path'
import * as sendEmail from '../../srcCommon/extServices/sendEmail'
import servConfig from '../../configfile'
import {
  canAlterUserProfile,
  canEditUserInfo,
  canViewUserInfo,
  getAllowedClientsManageFull,
  getPermissions,
  PROFILECODES,
  profileDesc,
} from '../../srcCommon/helpers/permissionControl'
import './userNotifs'
import './userActivation'
import './userPrefsOverview'
import './userTgNumber'
import { convertUserPermissions, createPasswordHashDb } from './login'
import { ProfilePerClient, SessionData } from '../../srcCommon/types'

type profiles = ('[U]'|'[C]'|'[M]'|'[T]')[];

/**
 * @swagger
 * /users/list-users:
 *   get:
 *     summary: Lista usuários
 *     description: Retorna uma lista de usuários de acordo com as permissões do usuário autenticado
 *     tags:
 *       - Usuários
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: CLIENT_ID
 *         in: query
 *         description: ID do cliente
 *         required: false
 *         schema:
 *           type: integer
 *       - name: CLIENT_IDS
 *         in: query
 *         description: IDs dos clientes
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *       - name: USER
 *         in: query
 *         description: Nome do usuário
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do usuário
 *                       nome:
 *                         type: string
 *                         description: Nome do usuário
 *                       sobrenome:
 *                         type: string
 *                         description: Sobrenome do usuário
 *                       email:
 *                         type: string
 *                         description: Email do usuário
 *                       perfil:
 *                         type: string
 *                         description: Perfil do usuário
 *                       cliente:
 *                         type: string
 *                         description: Nome do cliente
 *                       clientIds:
 *                         type: array
 *                         items:
 *                           type: integer
 *                         description: IDs dos clientes aos quais o usuário está associado
 *       400:
 *         description: Faltando parâmetros
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */

type TUsersList = {
  USER: string;
  LAST_ACCESS: string;
  NOME: string;
  SOBRENOME: string;
  PERMS_U: string;
  CLIENT_BIND: number;
  RG: string;
  COMMENTS: string;
  PICTURE: string;
  CITY_ID: string;
  IS_ACTIVE: "0" | "1";
  CITY_NAME: string;
  STATE_ID: string;
  STATE_NAME: string;
}

function getProfile(row: TUsersList) {
  let perfil = null as string;
  if (row.PERMS_U.includes(PROFILECODES.PERUSER.AdminDiel)) perfil = profileDesc[PROFILECODES.PERUSER.AdminDiel];
  else if (row.PERMS_U.includes(PROFILECODES.PERUSER.DemoViewAll)) perfil = profileDesc[PROFILECODES.PERUSER.DemoViewAll];
  else if (row.PERMS_U.includes(PROFILECODES.PERUSER.Mantenedor)) perfil = profileDesc[PROFILECODES.PERUSER.Mantenedor];
  else if (row.PERMS_U.includes(PROFILECODES.PERUSER.Instalador)) perfil = profileDesc[PROFILECODES.PERUSER.Instalador];
  return perfil;
}

type TPermissions = {
  EMAIL: string;
  NOME: string;
  SOBRENOME: string;
  PERMS_U: string;
}

function getFullName(row: TPermissions | TUsersList) {
  let FULLNAME;
  if ((!row.NOME) && (!row.SOBRENOME)) FULLNAME = ''
  else if ((row.NOME) && (row.SOBRENOME)) FULLNAME = row.NOME + ' ' + row.SOBRENOME
  else FULLNAME = row.NOME || row.SOBRENOME
  return FULLNAME;
}

function addProfiles(userClients: {
  USER_ID: string;
  CLIENT_ID: number;
  PERMS: string;
  UNITS: string;
  CLIENT_NAME?: string;
}[], perfis: Set<string>) {
  userClients.forEach(row => {
    if (row.PERMS && row.PERMS.includes(PROFILECODES.PERCLIENT.AdminCliente)) {
      perfis.add(profileDesc[PROFILECODES.PERCLIENT.AdminCliente]);
    } else if (row.PERMS && row.PERMS.includes(PROFILECODES.PERCLIENT.Tecnico)) {
      perfis.add(profileDesc[PROFILECODES.PERCLIENT.Tecnico]);
    } else if (row.PERMS && row.PERMS.includes(PROFILECODES.PERCLIENT.Instalador)) {
      perfis.add(profileDesc[PROFILECODES.PERCLIENT.Instalador]);
    } else {
      perfis.add(profileDesc[PROFILECODES.PERCLIENT.UsuarioBasico]);
    }
  });
}

function getTypeProfile(perfis: Set<string>, userClients:{
  USER_ID: string;
  CLIENT_ID: number;
  PERMS: string;
  UNITS: string;
  CLIENT_NAME?: string;
}[]) {
  let perfil = null as string;
  let clientName = null as string;
  if (userClients[0]?.PERMS === PROFILECODES.PERCLIENT.Instalador) perfil = 'Instalador';
  if (perfis.size === 1) perfil = perfis.values().next().value;
  else if (perfis.size > 1) perfil = '(variado)';

  if (userClients.length === 1) clientName = userClients[0].CLIENT_NAME;
  else if (userClients.length === 0) clientName = '(nenhum)';
  else clientName = `${userClients.length} clientes`;
  return {
    perfil,
    clientName,
  }
}

async function getList(reqParams: {
  CLIENT_ID?: number;
  CLIENT_IDS?: number[];
  USER?: string;
  includeAdmins?: boolean;
  includeAllUsers?: boolean;
}) {
  const usersList = await sqldb.DASHUSERS.getListOfUsers({
    CLIENT_IDS: reqParams.CLIENT_IDS,
    USER: reqParams.USER,
    isAllUsers: reqParams.includeAllUsers,
  });

  const usersClients = await sqldb.USERSCLIENTS.getList({
    userId: reqParams.USER,
    clientIds: reqParams.CLIENT_IDS,
  }, { includeClientName: true });
  
  const list = usersList.map((row) => {
    const FULLNAME = getFullName(row);

    let perfil = null as string;
    let clientName = null as string;
    let clientIds = undefined as number[];
    let clientNames = undefined as string[];
    let unitIds = undefined as number[];

    if (row.PERMS_U) {
      perfil = getProfile(row);
    }
    else {
      const perfis: Set<string> = new Set();

      const userClients = usersClients.filter(x => x.USER_ID === row.USER);

      addProfiles(userClients, perfis);

      const profileAndName = getTypeProfile(perfis, userClients);
      perfil = profileAndName.perfil;
      clientName = profileAndName.clientName;

      if (userClients.length > 0) {
        clientIds = userClients.map(x => x.CLIENT_ID);
        clientNames = userClients.map(x => x.CLIENT_NAME);
        userClients.forEach((item) => {
          if (item.UNITS) {
            if (!unitIds) unitIds = [];
            const ids = item.UNITS.split(',').map((id) => Number(id));
            unitIds.push(...ids);
          }
        });
      }
    }

    return Object.assign(row, {
      FULLNAME,
      perfil,
      clientName,
      clientIds,
      clientNames,
      unitIds,
    })
  })
  return list;
}

httpRouter.privateRoutes['/users/list-users'] = async function (reqParams, session) {
  if (reqParams.CLIENT_ID) {
    reqParams.CLIENT_IDS = [reqParams.CLIENT_ID];
  }
  delete reqParams.CLIENT_ID;
  // TODO: Passar para o arquivo de controle de permissões em uma função específica
  if (session.permissions.isAdminSistema) { } // OK
  else if (reqParams.USER && reqParams.USER === session.user) { } // OK
  else {
    const { clientIds: CLIENT_MANAGE } = await getAllowedClientsManageFull(session);
    if (CLIENT_MANAGE.length > 0) {
      if (!reqParams.CLIENT_IDS) {
        reqParams.CLIENT_IDS = CLIENT_MANAGE
      }
      reqParams.CLIENT_IDS = reqParams.CLIENT_IDS.filter(x => CLIENT_MANAGE.includes(x))
    }
    else if (session.user) {
      reqParams.USER = session.user
    }
    else {
      throw Error('Permission denied!').HttpStatus(403).DebugInfo(session)
    }
  }

  const list = await getList(reqParams);

  let adminUsers;
  if (session.permissions.isAdminSistema && reqParams.includeAdmins) {
    adminUsers = await sqldb.DASHUSERS.getUsersWithPermA();
    adminUsers = adminUsers.map((row) => {
      const FULLNAME = getFullName(row);

      return {
        USER: row.EMAIL,
        NOME: row.NOME,
        SOBRENOME: row.SOBRENOME,
        FULLNAME: FULLNAME,
      };
    });
  }

  return { list, adminUsers, profileDesc };
}

httpRouter.privateRoutes['/users/get-user-info'] = async function (reqParams, session) {
  if (!reqParams.userId) throw Error('userId required').HttpStatus(400);
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.userId });
  if (!userInfo) throw Error('User not found!').HttpStatus(400);

  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL });
  const editedUserPerms = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);

  if (session.permissions.isAdminSistema) {/* OK */} // OK
  else if (reqParams.userId && reqParams.userId === session.user) {/* OK */} 
  else {
    if (canViewUserInfo(session.permissions, editedUserPerms) !== true) {
      throw Error('Acesso negado').HttpStatus(403);
    }
  }

  let FULLNAME
  if ((!userInfo.NOME) && (!userInfo.SOBRENOME)) FULLNAME = ''
  else if ((userInfo.NOME) && (userInfo.SOBRENOME)) FULLNAME = userInfo.NOME + ' ' + userInfo.SOBRENOME
  else FULLNAME = userInfo.NOME || userInfo.SOBRENOME

  const item = {
    EMAIL: userInfo.EMAIL,
    LAST_ACCESS: userInfo.LAST_ACCESS,
    NOME: userInfo.NOME,
    SOBRENOME: userInfo.SOBRENOME,
    PERMS_U: userInfo.PERMS_U,
    RG: userInfo.RG,
    COMMENTS: userInfo.COMMENTS,
    PICTURE: userInfo.PICTURE,
    CITY_ID: userInfo.CITY_ID,
    CITY_NAME: userInfo.CITY_NAME,
    STATE_ID: userInfo.STATE_ID,
    STATE_NAME: userInfo.STATE_NAME,
    PHONENB: userInfo.PHONENB,
    CLBIND_ID: userInfo.CLBIND_ID,
  };

  const sessionUserPerms_old = convertUserPermissions(session.permissions);
  const editedUserPerms_old = convertUserPermissions(editedUserPerms);
  const permissions = {
    MANAGE_ALL_CLIENTS_AND_DACS: editedUserPerms.isAdminSistema,
    CLIENT_VIEW: editedUserPerms_old.CLIENT_VIEW.filter(id => session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS || sessionUserPerms_old.CLIENT_VIEW.includes(id)),
    CLIENT_MANAGE: editedUserPerms_old.CLIENT_MANAGE.filter(id => session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS || sessionUserPerms_old.CLIENT_VIEW.includes(id)),
    isUserManut: editedUserPerms.isUserManut,
  }

  const profiles = {} as {
    [clientId: string]: string
  };
  const profiles_v2 = [] as {
    clientId: number
    p: profiles
    units: number[]|null
  }[];
  for (const row of userClients) {
    if (!row.UNITS) {
      profiles[String(row.CLIENT_ID)] = row.PERMS;
    }
    if (row.PERMS && row.PERMS.startsWith('[') && row.PERMS.endsWith(']')) { /* OK */ }
    else throw Error('Erro ao carregar o perfil do usuário').HttpStatus(500);
    const perfs = row.PERMS.replace(/\]\[/g,'],[').split(',') as profiles;
    profiles_v2.push({
      clientId: row.CLIENT_ID,
      p: perfs,
      units: row.UNITS && row.UNITS.split(',').map((x) => Number(x)),
    });
  }

  return {
    item,
    permissions,
    profiles_v2,
  };
}

type TParamsInviteUsers = {
  EMAIL: string
  NOME?: string
  SOBRENOME?: string
  PASSWORD?: string
  CLIENT_BIND?: number
  RG?: string,
  COMMENTS?: string,
  PICTURE?: string|null,
  CITY_ID?: string,
  PHONENB?: string,
  clients_v2: {
    clientId: number
    p: ProfilePerClient[] | null
    units?: number[]|null
  }[]
}

async function verifySession(session: SessionData, reqParams: TParamsInviteUsers) {
  // É obrigatório informar algum cliente ao adicionar/editar o usuário
  if (!reqParams.clients_v2.length) throw Error('Invalid properties! Missing: clients').HttpStatus(400)

  // Se quem estiver editando o uusário não for admin-sistema, verifica se ele tem permissão nos clientes informados
  if (!session.permissions.isAdminSistema) {
    const { clientIds: CLIENT_MANAGE } = await getAllowedClientsManageFull(session);
    for (const { clientId } of reqParams.clients_v2) {
      if (CLIENT_MANAGE.includes(clientId)) {
        // OK
      }
      else throw Error('Permission denied!').HttpStatus(403)
    }
  }
}

type TUserInfo = {
  EMAIL: string
  NOME: string
  SOBRENOME: string
  LAST_ACCESS: string
  PERMS_U: string
  CLBIND_ID: number
  CLBIND_ENABLED: string
  CLBIND_PERMS_C: string
  RG?: string
  COMMENTS?: string
  PICTURE?: string
  CITY_ID?: string
  CITY_NAME?: string
  STATE_ID?: string
  STATE_NAME?: string
  PHONENB?: string
}

async function responseInviteNewUser(adminChosePassword: boolean, userInfo: TUserInfo, session: SessionData, reqParams: TParamsInviteUsers, link: string) {
  if (adminChosePassword) {
    return 'added'
  } else {
    const { subject, emailBody } = buildEmailFirstLogin({
      LINK: link,
      USER: userInfo.EMAIL,
      PASSWORD: reqParams.PASSWORD,
    });
    await sendEmail.simple({ user: session.user }, [userInfo.EMAIL], subject, emailBody);
    return 'userInvitationSent'
  }
}

async function addNewUserInviteUser(reqParams: TParamsInviteUsers, session: SessionData, pwhash: string) {
  await sqldb.DASHUSERS.w_addNewUser({
    INVITED_BY: session.user,
    EMAIL: reqParams.EMAIL,
    NOME: reqParams.NOME,
    SOBRENOME: reqParams.SOBRENOME,
    PASSWORD: pwhash,
    PERMS_U: null,
    CLIENT_BIND: (session.permissions.isAdminSistema && reqParams.CLIENT_BIND) || undefined,
    RG: reqParams.RG,
    COMMENTS: reqParams.COMMENTS,
    PICTURE: reqParams.PICTURE,
    CITY_ID: reqParams.CITY_ID,
    PHONENB: reqParams.PHONENB
  }, session.user);
  const prefsEnvironment = await sqldb.PREFS_OVERVIEW_INFO.w_insert({TYPE: 1, TITLE: 'Ambientes', IS_ACTIVE: '1', IS_EXPANDED: '0', POSITION: 0}, session.user)
  const prefsMachine = await sqldb.PREFS_OVERVIEW_INFO.w_insert({TYPE: 2, TITLE: 'Máquinas', IS_ACTIVE: '1', IS_EXPANDED: '0', POSITION: 1}, session.user)
  const prefsEnergy = await sqldb.PREFS_OVERVIEW_INFO.w_insert({TYPE: 3, TITLE: 'Energia', IS_ACTIVE: '1', IS_EXPANDED: '0', POSITION: 2}, session.user)
  const prefsWater = await sqldb.PREFS_OVERVIEW_INFO.w_insert({TYPE: 4, TITLE: 'Agua', IS_ACTIVE: '1', IS_EXPANDED: '0', POSITION: 3}, session.user)
  await sqldb.PREFS_OVERVIEW.w_insert({EMAIL: reqParams.EMAIL, PREFS_OVERVIEW_INFO_ID: prefsEnvironment.insertId}, session.user)
  await sqldb.PREFS_OVERVIEW.w_insert({EMAIL: reqParams.EMAIL, PREFS_OVERVIEW_INFO_ID: prefsMachine.insertId}, session.user)
  await sqldb.PREFS_OVERVIEW.w_insert({EMAIL: reqParams.EMAIL, PREFS_OVERVIEW_INFO_ID: prefsEnergy.insertId}, session.user)
  await sqldb.PREFS_OVERVIEW.w_insert({EMAIL: reqParams.EMAIL, PREFS_OVERVIEW_INFO_ID: prefsWater.insertId}, session.user)
}

function verifyGeneratePassword(reqParams: TParamsInviteUsers, session: SessionData) {
  if (reqParams.PASSWORD && (!session.permissions.isAdminSistema)) {
    throw Error('Cannot choose password for the new user!').HttpStatus(400)
  }
  const adminChosePassword = (reqParams.PASSWORD && session.permissions.isAdminSistema)

  if (!adminChosePassword) {
    reqParams.PASSWORD = uuid.v4()
    const randomLength = 6 + Math.floor(Math.random() * 3);
    reqParams.PASSWORD = generatePassword(randomLength)
  }

  if (!(reqParams.PASSWORD.length >= 4)) {
    throw Error('There was an error!\nPassword should have at least 4 characters.').HttpStatus(400)
  }

  return adminChosePassword;
}

httpRouter.privateRoutes['/users/invite-new-user'] = async function (reqParams, session) {
  if (!reqParams.clients_v2) throw Error('Invalid properties! Missing: clients').HttpStatus(400)
  if (!reqParams.EMAIL) throw Error('Invalid properties! Missing: EMAIL').HttpStatus(400)
  if (!reqParams.NOME) reqParams.NOME = null
  if (!reqParams.SOBRENOME) reqParams.SOBRENOME = null
  if (!reqParams.RG) reqParams.RG = null
  if (!reqParams.COMMENTS) reqParams.COMMENTS = null
  if (!reqParams.PICTURE) reqParams.PICTURE = null
  if (!reqParams.CITY_ID) reqParams.CITY_ID = null
  if (!reqParams.PHONENB) reqParams.PHONENB = null

  // Verifica o "reqParams.clients_v2"
  await verifySession(session, reqParams);

  // Check if user already exists in the system
  let userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.EMAIL });

  if (userInfo) {
    await httpRouter.privateRoutes['/users/set-profiles']({
      userId: reqParams.EMAIL,
      clients_v2: reqParams.clients_v2,
    }, session);
    return 'added-access-to-client';
  }

  const adminChosePassword = verifyGeneratePassword(reqParams, session);

  const pwhash = createPasswordHashDb(reqParams.PASSWORD);

  await addNewUserInviteUser(reqParams, session, pwhash);

  userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.EMAIL });

  await httpRouter.privateRoutes['/users/set-profiles']({
    userId: reqParams.EMAIL,
    clients_v2: reqParams.clients_v2,
  }, session);

  const passwordResetToken = uuid.v4();
  await sqldb.PWRECOVERTK.w_insert({
    TOKEN: passwordResetToken,
    DAT_ISSUE: new Date().toISOString(),
    EMAIL: userInfo.EMAIL,
  });

  // temporário, até modificar reset
  const link = `${servConfig.frontUrls.base}/login`;

  // if (servConfig.isTestServer) {
  //   return { token: passwordResetToken } // Used for testing
  // }

  const response = await responseInviteNewUser(adminChosePassword, userInfo, session, reqParams, link);
  return response;
}

export function buildEmailFirstLogin(tokens: {
  LINK: string
  USER: string
  PASSWORD: string
}) {
  let emailBody = fs.readFileSync(path.resolve('./assets/PrimeiroLogin_v2.html'), 'utf-8')
  emailBody = emailBody
    .split('$LINK$').join(tokens.LINK)
    .split('$USER$').join(tokens.USER)
    .split('$PASSWORD$').join(tokens.PASSWORD)
  // `Acesse o link para redefinir a sua senha:<br><a href="${link}">${link}</a>`
  const subject = 'Acesso ao Sistema - Plataforma Celsius 360';
  return { subject, emailBody };
}

function checkProfiles(p: ProfilePerClient[], isUserManut: boolean, isUserInstaller: boolean, clientId: number) {
  if (p.length === 0) {
    throw Error('Nenhum perfil selecionado para o cliente').HttpStatus(400).DebugInfo({ clientId });
  }
  if (isUserManut) {
    if (p.every((x) => (x === PROFILECODES.PERCLIENT.Parceiro || x === PROFILECODES.PERCLIENT.Tecnico || x === PROFILECODES.PERCLIENT.MantenedorV2))) {
      // OK
    } 
    else throw Error('Invalid profile for user').HttpStatus(400).DebugInfo({ clientId });
  }
  else if (p[0] === PROFILECODES.PERCLIENT.Instalador) {
    if (p.every((x) => (x === PROFILECODES.PERCLIENT.Instalador))) {
      // OK
    } 
    else throw Error('Invalid profile for user').HttpStatus(400).DebugInfo({ clientId });
  }
  else {
    if (p.every((x) => (x === PROFILECODES.PERCLIENT.UsuarioBasico || x === PROFILECODES.PERCLIENT.AdminCliente || x === PROFILECODES.PERCLIENT.AdminClienteProg))) {
      // OK
    }
    else throw Error('Invalid profile for user').HttpStatus(400).DebugInfo({ clientId });
  }
}

async function checkUnits(units: number[], clientId: number) {
  if (units) {
    const possibleUnits = (await sqldb.CLUNITS.getUnitsList2({ clientIds: [clientId] }, {})).map((x) => x.UNIT_ID);
    units = units.map((x) => Number(x)).filter((x) => !!x).filter((x) => possibleUnits.includes(x));
    units = Array.from(new Set(units));
    if (units.length === 0) throw Error('Nenhuma unidade válida selecionada').HttpStatus(400);
  }
}

function defineIsManutAndIsInstaller(userInfo: TUserInfo) {
  const isUserManut = (userInfo.CLBIND_PERMS_C || '').includes(PROFILECODES.EMPRESA.Mantenedor)
  return {
    isUserManut,
  }
}

async function checkUsersSetProfilesParams(reqParams: {
  userId: string;
  clients_v2: {
      clientId: number;
      p: ProfilePerClient[];
      units?: number[];
  }[];
}) {
  if (!reqParams.userId) {
    throw Error('Invalid properties. Missing userId.').HttpStatus(400)
  }
  if (reqParams.clients_v2 && reqParams.clients_v2.length > 0) { /* OK */ }
  else {
    throw Error('Invalid properties. Missing clients.').HttpStatus(400)
  }
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.userId });
  if (!userInfo) {
    throw Error('User not found!').HttpStatus(400)
  }
  return userInfo;
}

async function setProfiles(reqParams: {
  userId: string;
  clients_v2: {
      clientId: number;
      p: ProfilePerClient[];
      units?: number[];
  }[];
}, isUserInstaller: boolean, isUserManut: boolean) {
  const profiles: Map<number, { PERMS: string, UNITS: string }> = new Map();

  for (let { clientId, p, units } of reqParams.clients_v2) {
    if (!clientId) {
      throw Error('Invalid profile data').HttpStatus(400).DebugInfo({ clientId });
    }
    if (profiles.has(clientId)) {
      throw Error('Múltiplas definições para o mesmo cliente').HttpStatus(400).DebugInfo({ clientId });
    }
    if (p === null) {
      // Remove cliente access
      profiles.set(clientId, { PERMS: null, UNITS: null });
      continue;
    }

    p = p.map((x) => String(x))
      .map((x) => x.startsWith('[') ? x : `[${x}]`) as typeof p;
    p = Array.from(new Set(p));
    checkProfiles(p, isUserManut, isUserInstaller, clientId);

    await checkUnits(units, clientId);

    profiles.set(clientId, {
      PERMS: p.join(''),
      UNITS: units ? (units.join(',') || '[]') : null,
    });
  }
  return profiles;
}

export async function usersSetProfiles(reqParams: {
  userId: string;
  clients_v2: {
      clientId: number;
      p: ProfilePerClient[];
      units?: number[];
  }[];
}, session: SessionData){

  const userInfo = await checkUsersSetProfilesParams(reqParams);

  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL });

  const editedUserPerms = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);

  const { isUserManut } = defineIsManutAndIsInstaller(userInfo);
  let isUserInstaller = false;

  if (reqParams.clients_v2[0].p && reqParams.clients_v2[0].p[0]) {
    isUserInstaller = reqParams.clients_v2[0].p[0] === PROFILECODES.PERCLIENT.Instalador;
  }
  if (session.permissions.isAdminSistema) {
    // System admins can edit any user, including other system admins
  }
  else {
    for (const { clientId } of reqParams.clients_v2) {
      if (canAlterUserProfile(session.permissions, editedUserPerms, clientId) !== true) {
        throw Error('Not allowed').HttpStatus(403);
      }
    }
  }

  const profiles = await setProfiles(reqParams, isUserInstaller, isUserManut);

  for (const [CLIENT_ID, { PERMS, UNITS }] of profiles.entries()) {
    await sqldb.USERSCLIENTS.w_removeRow({ USER_ID: userInfo.EMAIL, CLIENT_ID }, session.user);
    if (PERMS) {
      await sqldb.USERSCLIENTS.w_insert({ USER_ID: userInfo.EMAIL, CLIENT_ID, PERMS, UNITS }, session.user);
    }
  }

  return 'OK';
}

httpRouter.privateRoutes['/users/set-profiles'] = usersSetProfiles;

httpRouter.privateRoutes['/users/edit-user'] = async function (reqParams, session) {
  // TODO: Delete users from disabled clients
  // Alter user password

  if (!reqParams.USER) throw Error('Invalid properties. Missing USER.').HttpStatus(400);
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.USER });
  if (!userInfo) {
    throw Error('User not found!').HttpStatus(400);
  }
  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL });
  const editedUserPerms = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);

  if (session.permissions.isAdminSistema) {
    // System admins can edit any user, including other system admins
  }
  else if (session.user === reqParams.USER) {
    // Users can edit their own information
  }
  else {
    if (!userInfo.LAST_ACCESS) {
      throw Error('User must login at least once!').HttpStatus(403)
    }
    if (canEditUserInfo(session.permissions, editedUserPerms) !== true) {
      throw Error('Not allowed').HttpStatus(403);
    }
  }

  const qPars: Parameters<typeof sqldb.DASHUSERS.w_updateUser>[0] = {
    EMAIL: reqParams.USER,
  }
  if (reqParams.NOME !== undefined) qPars.NOME = reqParams.NOME || null;
  if (reqParams.SOBRENOME !== undefined) qPars.SOBRENOME = reqParams.SOBRENOME || null;
  if (reqParams.RG !== undefined) qPars.RG = reqParams.RG || null;
  if (reqParams.COMMENTS !== undefined) qPars.COMMENTS = reqParams.COMMENTS || null;
  if (reqParams.PICTURE !== undefined) qPars.PICTURE = reqParams.PICTURE || null;
  if (reqParams.CITY_ID !== undefined) qPars.CITY_ID = reqParams.CITY_ID || null;
  if (reqParams.PHONENB !== undefined) qPars.PHONENB = reqParams.PHONENB || null;

  if (reqParams.PASSWORD !== undefined) {
    // TODO: se não for admin, tem que pedir a senha atual
    if (!(reqParams.PASSWORD.length >= 4)) {
      throw Error('There was an error!\nPassword should have at least 4 characters.').HttpStatus(400)
    }
    qPars.PASSWORD = createPasswordHashDb(reqParams.PASSWORD);
  }
  if (reqParams.NOTIFSBY !== undefined) {
    if (!['email', 'telegram', 'email and telegram', null].includes(reqParams.NOTIFSBY)) {
      throw Error('Invalid NOTIFSBY').HttpStatus(400);
    }
    qPars.NOTIFSBY = reqParams.NOTIFSBY;
  }

  if (reqParams.PREFS !== undefined) qPars.PREFS = reqParams.PREFS || null;
  qPars.CLIENT_BIND = (session.permissions.isAdminSistema && reqParams.CLIENT_BIND) || undefined;

  await sqldb.DASHUSERS.w_updateUser(qPars, session.user);

  if (reqParams.clients_v2) {
    await httpRouter.privateRoutes['/users/set-profiles']({
      userId: userInfo.EMAIL,
      clients_v2: reqParams.clients_v2,
    }, session);
  }

  const userInfoAfter = await sqldb.DASHUSERS.getUserData_front({ USER: reqParams.USER });

  return {
    NOME: userInfoAfter.NOME,
    SOBRENOME: userInfoAfter.SOBRENOME,
    NOTIFSBY: userInfoAfter.NOTIFSBY,
    PREFS: userInfoAfter.PREFS,
    RG: userInfoAfter.RG,
    COMMENTS: userInfoAfter.COMMENTS,
    PICTURE: userInfoAfter.PICTURE,
    CITY_ID: userInfoAfter.CITY_ID,
    PHONENB: userInfoAfter.PHONENB,
  }
}

httpRouter.privateRoutes['/users/remove-user'] = async function (reqParams, session) {
  if (!reqParams.USER) {
    throw Error('Invalid parameters, missing "USER"').HttpStatus(400);
  }

  // Os admins sistema podem desativar qualquer usuário do sistema.
  if (!session.permissions.isAdminSistema) {
    // Um admin do cliente só consegue desativar um usuário se ele tiver permissões de gerenciar todas as empresas do usuário
    const { clientIds: CLIENT_MANAGE } = await getAllowedClientsManageFull(session);
    const clientsAssociates = await sqldb.USERSCLIENTS.getUserClients({ userId: reqParams.USER });

    // Verifica se o solicitante é realmente admin das empresas associadas ao usuário
    for (const { CLIENT_ID } of clientsAssociates) {
      if (!CLIENT_MANAGE.includes(CLIENT_ID)) {
        throw Error('Permission denied!').HttpStatus(403);
      }
    }
  }

  const { affectedRows } = await inactivateUser(reqParams.USER, session.user);
  return 'UPDATED ' + affectedRows;
}

async function inactivateUser (USER_ID: string, sessionUser: string) {
  await sqldb.PWRECOVERTK.w_deleteFromUser({ EMAIL: USER_ID });
  await sqldb.USERSTOKENS.w_deleteAllFromUser({ EMAIL: USER_ID }, sessionUser);
  await dacAlerts.deleteFromUser({ USER_ID: USER_ID }, sessionUser);
  return sqldb.DASHUSERS.w_inativeUser({USER_ID: USER_ID}, sessionUser);
}

export async function removingClient (qPars: { CLIENT_ID: number }, sessionUser: string) {
  const boundUsers = await sqldb.DASHUSERS.boundUsers({ CLIENT_BIND: qPars.CLIENT_ID });
  for (const user of boundUsers) {
    // TODO: isto aqui vai dar erro. Não adianta só marcar o usuário como inativo pois a coluna CLIENT_BIND vai dar erro de foreign key quando tentar excluir o cliente.
    await inactivateUser(user.EMAIL, sessionUser);
  }
  await sqldb.DASHUSERS.w_deleteFromClient({ CLIENT_BIND: qPars.CLIENT_ID }, {
    NOTIFDESTS: true,
    NOTIFSCFG: true,
    PWRECOVERTK: true,
    USERSCLIENTS: true,
    USERSTOKENS: true,
    VISITATECNICA: true,
    UNITSUPERVISORS: true,
  }, sessionUser);
  await sqldb.USERSCLIENTS.w_removeFromClient({ CLIENT_ID: qPars.CLIENT_ID }, sessionUser);
  await removeEmptyUsers(sessionUser);
}

export async function removingCity(qPars: { CITY_ID: string }, userId: string) {
  await sqldb.DASHUSERS.w_removeCity({ CITY_ID: qPars.CITY_ID }, userId);
}

export async function removeEmptyUsers (sessionUser: string) {
  const list = await sqldb.DASHUSERS.getClientLessUsers();
  for (const row of list) {
    if (row.PERMS_U) continue;
    await inactivateUser(row.EMAIL, sessionUser);
  }
}
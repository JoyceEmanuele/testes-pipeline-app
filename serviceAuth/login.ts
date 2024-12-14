import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import servConfig from '../configfile'
import { checkStaticUserToken, checkTokenRedirectToDash } from './redirAuth'
import sqldb from '../srcCommon/db'
import { FakeProfile, SessionData } from '../srcCommon/types'
import { logger } from '../srcCommon/helpers/logger'
import { getPermissions, PROFILECODES } from '../srcCommon/helpers/permissionControl'

interface JwtTokenContents {
  date: string|Date
  user: string
  pwcheck: string
  fakeProfile?: any
}
interface AuthenticatedUser {
  userId: string,
  isMasterUser: boolean
}
interface AuthenticationInfo {
  authenticatedUser: AuthenticatedUser
  fakeProfile?: FakeProfile
  extraSessionData?: any
}

export async function processHttpAuth (authHeader: string): Promise<AuthenticationInfo> {
  /* if (authHeader.startsWith('SID ')) {
     const sid = authHeader.substr('SID '.length);
     return recoverHttpSession(sid);
  }*/
  if (authHeader.startsWith('Bearer ')) {
    const jwtData = authHeader.substring('Bearer '.length);
    return recoverJwtSession(jwtData);
  }
  if (authHeader.startsWith('JWT ')) {
    const jwtData = authHeader.substring('JWT '.length);
    return recoverJwtSession(jwtData);
  }
  if (authHeader.startsWith('RD2D ')) {
    const rdtoken = authHeader.substring('RD2D '.length);
    return checkTokenRedirectToDash(rdtoken);
  }
  if (authHeader.startsWith('SUTK ')) {
    const rdtoken = authHeader.substring('SUTK '.length);
    return checkStaticUserToken(rdtoken);
  }
  if (authHeader.startsWith('JSON ')) {
    const credsB64 = authHeader.substring('JSON '.length);
    const credsStr = Buffer.from(credsB64, 'base64').toString('utf8');
    const creds: { userId: string, password: string } = JSON.parse(credsStr);
    const { session } = await checkUserPassword(creds);
    const authenticatedUser = {
      userId: session.user,
      isMasterUser: session.permissions.isMasterUser,
    };
    return { authenticatedUser };
  }
  if (authHeader.startsWith('Plain ')) {
    const iColon = authHeader.indexOf(':');
    if (iColon) {
      const creds = {
        userId: authHeader.substring('Plain '.length, iColon),
        password: authHeader.substring(iColon + 1),
      };
      const { session } = await checkUserPassword(creds);
      const authenticatedUser = {
        userId: session.user,
        isMasterUser: session.permissions.isMasterUser,
      };
      return { authenticatedUser };
    }
  }
  /*if (authHeader.startsWith('SSO ')) {
    const cbToken = authHeader.substr('SSO '.length);
    const authenticatedUser = await apiSSO['/get-login-data']({ cbToken });
    return createUserSession(authenticatedUser);
  }*/
  throw Error('Invalid Authorization header').Details(401, { errorCode: '70', debugInfo: { authHeader } });
}

export async function saveJwtSession (user: string, fakeProfile?: FakeProfile): Promise<string> {
  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: user })
  if (!userInfo) throw Error('Could not find informed user').Details(401, { errorCode: '75', debugInfo: user });
  if (!userInfo.PASSWORD) throw Error('User not allowed: no password').Details(401, { errorCode: '76', debugInfo: user });
  const pwhash_db = userInfo.PASSWORD.toUpperCase();

  const newTokenData: JwtTokenContents = {
    user: user,
    date: new Date().toISOString(),
    pwcheck: <string>null,
    fakeProfile: fakeProfile || undefined,
  }
  newTokenData.pwcheck = '{V1}' + crypto.createHmac('sha256', servConfig.pwcheckKey).update(newTokenData.user + '\t' + pwhash_db + '\t' + newTokenData.date).digest('hex').toUpperCase();

  const jwtToken = jwt.sign(newTokenData, servConfig.jwtSecretKey);

  sqldb.DASHUSERS.w_updateUser({
    EMAIL: user,
    LAST_ACCESS: new Date().toISOString()
  }, user).catch((err) => logger.error(err))

  return jwtToken
}

async function recoverJwtSession (jwtToken: string): Promise<{ authenticatedUser: AuthenticatedUser, fakeProfile: FakeProfile }> {
  let tokenData;
  try {
    tokenData = jwt.verify(jwtToken, servConfig.jwtSecretKey) as JwtTokenContents;
  } catch (err) {
    throw Error('Erro ao verificar as credenciais').Details(401, { errorCode: 'INVALID_AUTH_TOKEN', frontDebug: 'decodificação do token' });
  }

  // tokenData.date = new Date(tokenData.date)
  // const dateLimit = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
  // if (!(tokenData.date <= new Date() && tokenData.date > dateLimit)) {
  //   throw Error('Expired token').Details(401, { debugInfo: {tokenData})
  // }
  // tokenData.date = tokenData.date.toISOString();

  const isMasterUser = (tokenData.user === servConfig.frontUser.user);
  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: tokenData.user })
  if (!userInfo) throw Error('Could not find informed user').Details(401, { errorCode: '114', debugInfo: tokenData });
  if (!userInfo.PASSWORD) throw Error('User not allowed: no password').Details(401, { errorCode: '115', debugInfo: tokenData });
  const pwhash_db = userInfo.PASSWORD.toUpperCase();
  if (isMasterUser) {
    const adm_pwhash_db = createPasswordHashDb(servConfig.frontUser.password2 || servConfig.frontUser.password);
    if (pwhash_db !== adm_pwhash_db) throw Error('Denied!').Details(500, { errorCode: '119' });
  }

  const pwcheck = '{V1}' + crypto.createHmac('sha256', servConfig.pwcheckKey).update(tokenData.user + '\t' + pwhash_db + '\t' + tokenData.date).digest('hex').toUpperCase();
  if (tokenData.pwcheck !== pwcheck) {
    throw Error('Erro ao verificar as credenciais').Details(401, { errorCode: 'INVALID_AUTH_TOKEN', debugInfo: { tokenData, pwcheck }, frontDebug: 'senha não confere' });
  }

  return {
    authenticatedUser: { userId: tokenData.user, isMasterUser },
    fakeProfile: tokenData.fakeProfile
  };
}

export async function checkUserPassword (reqCredentials: { userId: string, password: string }) {
  if (!reqCredentials.userId) throw Error("userId required").Details(400, { errorCode: '134', debugInfo: reqCredentials });
  if (!reqCredentials.password) throw Error("password required").Details(400, { errorCode: '135', debugInfo: reqCredentials });
  const pwhash_req = createPasswordHashDb(reqCredentials.password);

  let isMasterUser = false;
  let userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: reqCredentials.userId });
  if (reqCredentials.userId === servConfig.frontUser.user) {
    const adm_pwhash_db = createPasswordHashDb(servConfig.frontUser.password2 || servConfig.frontUser.password);
    if (!userInfo) {
      await sqldb.DASHUSERS.w_addNewUser({
        INVITED_BY: '<SYSTEM>',
        EMAIL: servConfig.frontUser.user,
        PASSWORD: adm_pwhash_db,
        PERMS_U: PROFILECODES.PERUSER.AdminDiel,
        NOME: 'Admin',
        SOBRENOME: null,
      }, '[SYSTEM]');
      userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: reqCredentials.userId });
    }
    if (userInfo.PASSWORD !== adm_pwhash_db) {
      await sqldb.DASHUSERS.w_updateUser({
        EMAIL: servConfig.frontUser.user,
        PASSWORD: adm_pwhash_db,
        PERMS_U: PROFILECODES.PERUSER.AdminDiel,
      }, '[SYSTEM]');
      userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: reqCredentials.userId });
      if (userInfo.PASSWORD !== adm_pwhash_db) {
        throw Error('User not allowed: invalid password').Details(401, { errorCode: '154', debugInfo: { reqCredentials, adm_pwhash_db } });
      }
    }
    isMasterUser = true;
  }
  if (!userInfo) throw Error('Could not find informed user').Details(401, { errorCode: 'INVALID_USER', debugInfo: { ...reqCredentials, password: '****' } });
  if (!userInfo.PASSWORD) throw Error('User not allowed: no password').Details(401, { errorCode: 'INVALID_USER', debugInfo: { ...reqCredentials, password: '****' } });
  const pwhash_db = userInfo.PASSWORD.toUpperCase();

  if (pwhash_req !== pwhash_db) {
    throw Error('Password check failed').Details(401, { errorCode: 'PW_CHECK_FAILED', debugInfo: { ...reqCredentials, password: '****' } });
  }

  const authenticatedUser: AuthenticatedUser = { userId: reqCredentials.userId, isMasterUser };
  const session = await createUserSession(authenticatedUser, null);
  return { session };
}

function createPasswordHashDb (plainPassword: string) {
  if (!plainPassword) throw Error('Invalid password').Details(400, { errorCode: 'NO_PASSSWORD' });
  if (typeof(plainPassword) !== 'string') throw Error('Invalid password type').Details(500, { errorCode: 'INAVALID_PASSSWORD' });
  if (plainPassword.length >= 4) { /* OK */ }
  else throw Error('Invalid password').Details(400, { errorCode: 'SHORT_PASSSWORD' });
  return '{V1}' + crypto.createHmac('sha256', servConfig.pwHashDb).update(plainPassword).digest('hex').toUpperCase();
}

export async function authAndGetSession(reqParams: { authHeader: string }): Promise<{ session: SessionData, extraSessionData: any, realUserSession?: SessionData }> {
  const { authenticatedUser, fakeProfile, extraSessionData } = await processHttpAuth(reqParams.authHeader);
  const session = await createUserSession(authenticatedUser, fakeProfile);
  const realUserSession = fakeProfile ? (await createUserSession(authenticatedUser, null)) : undefined;
  return { session, extraSessionData, realUserSession };
}


function getPermsU(fakeProfile: FakeProfile) {
  let PERMS_U: string = null;
  if (fakeProfile.PERMS_U === PROFILECODES.PERUSER.DemoViewAll) PERMS_U = fakeProfile.PERMS_U;
  if (fakeProfile.PERMS_U === PROFILECODES.PERUSER.Mantenedor) PERMS_U = fakeProfile.PERMS_U;
  if (fakeProfile.PERMS_U === PROFILECODES.PERUSER.ParceiroValidador) PERMS_U = fakeProfile.PERMS_U;
  if (fakeProfile.PERMS_U === PROFILECODES.PERUSER.Instalador) PERMS_U = fakeProfile.PERMS_U;
  return PERMS_U;
}

type IFakeClientBind = {
  CLIENT_ID: number
  NAME: string
  EMAIL: string
  PICTURE: string
  ENABLED: string
  PERMS_C: string
  CNPJ: string
  PHONE: string
}

type TFakeClientPerms = {
  CLIENT_ID: number,
  PERMS: string,
  UNITS: null | string,
  ENABLED: IFakeClientBind["ENABLED"],
  PERMS_C: IFakeClientBind["PERMS_C"],
}

function getPermsFakeProfileAdmin(profile: string, fakeClientBind: IFakeClientBind) {
  let PERMS: string = null;
  if (profile === PROFILECODES.PERCLIENT.UsuarioBasico) PERMS = profile;
  if (profile === PROFILECODES.PERCLIENT.AdminCliente) PERMS = profile;
  if (profile === PROFILECODES.PERCLIENT.Instalador) PERMS = profile;
  if (fakeClientBind && (fakeClientBind.PERMS_C === PROFILECODES.EMPRESA.Mantenedor) && (profile === PROFILECODES.PERCLIENT.MantenedorV2)) PERMS = profile;
  if (fakeClientBind && (fakeClientBind.PERMS_C === PROFILECODES.EMPRESA.Parceiro) && (profile === PROFILECODES.PERCLIENT.Parceiro)) PERMS = profile;
  return PERMS;
}

function getPermsFakeProfileClientV2(profile: {
  CLIENT_ID: number;
  PERMS: string;
  UNITS?: string;
}, fakeClientBind: {
  CLIENT_ID: number;
  NAME: string;
  EMAIL: string;
  PICTURE: string;
  ENABLED: string;
  PERMS_C: string;
  CNPJ: string;
  PHONE: string;
}) {
  let PERMS: string = null;
  if (profile.PERMS === PROFILECODES.PERCLIENT.UsuarioBasico) PERMS = profile.PERMS;
  if (profile.PERMS === PROFILECODES.PERCLIENT.AdminCliente) PERMS = profile.PERMS;
  if (profile.PERMS === PROFILECODES.PERCLIENT.Instalador) PERMS = profile.PERMS;
  if (profile.PERMS === PROFILECODES.PERCLIENT.AdminClienteProg) PERMS = `${profile.PERMS}, [C]`;
  if (fakeClientBind && (fakeClientBind.PERMS_C === PROFILECODES.EMPRESA.Mantenedor) && (profile.PERMS === PROFILECODES.PERCLIENT.MantenedorV2)) PERMS = profile.PERMS;
  if (fakeClientBind && (fakeClientBind.PERMS_C === PROFILECODES.EMPRESA.Parceiro) && (profile.PERMS === PROFILECODES.PERCLIENT.Parceiro)) PERMS = profile.PERMS;
  return PERMS;
}

async function getAllfakeProfileAdmin(fakeProfile: FakeProfile, fakeclientPerms: TFakeClientPerms[], fakeClientBind: IFakeClientBind) {
  for (const [CLIENT_ID, profile] of Object.entries(fakeProfile.clients)) {
    const fakeClientId = Number(CLIENT_ID);
    const faleClientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: fakeClientId })
    let PERMS: string = getPermsFakeProfileAdmin(profile, fakeClientBind);
    fakeclientPerms.push({
      CLIENT_ID: fakeClientId,
      PERMS,
      UNITS: null,
      ENABLED: faleClientInfo.ENABLED,
      PERMS_C: faleClientInfo.PERMS_C,
    });
  }
}

async function getAllPermsFakeProfileClientV2(fakeProfile: FakeProfile, fakeClientBind: IFakeClientBind, fakeclientPerms: TFakeClientPerms[]) {
  for (const profile of fakeProfile.clients_v2) {
    const fakeClientId = Number(profile.CLIENT_ID);
    const faleClientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: fakeClientId })
    let PERMS: string = getPermsFakeProfileClientV2(profile, fakeClientBind);
    fakeclientPerms.push({
      CLIENT_ID: fakeClientId,
      PERMS,
      UNITS: null,
      ENABLED: faleClientInfo.ENABLED,
      PERMS_C: faleClientInfo.PERMS_C,
    });
  }
}

function getCLBIND(fakeClientBind: IFakeClientBind, userInfo: {
  EMAIL: string;
  NOME: string;
  SOBRENOME: string;
  LAST_ACCESS: string;
  PERMS_U: string;
  CLBIND_ID: number;
  CLBIND_ENABLED: string;
  CLBIND_PERMS_C: string;
  PASSWORD?: string;
}) {
  if (fakeClientBind) {
    return {
      CLBIND_ID: fakeClientBind.CLIENT_ID,
      CLBIND_ENABLED: fakeClientBind.ENABLED,
      CLBIND_PERMS_C: fakeClientBind.PERMS_C,
    }
  }
  return {
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }
}

async function getFakeClientBind(fakeProfile: FakeProfile) {
  const fakeProfileForClient = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: fakeProfile.CLBIND_ID })
  if (fakeProfile.CLBIND_ID && fakeProfileForClient) {
    return fakeProfileForClient;
  }
  return null;
}

function notFakeCraft(isFakeCraft: boolean, userInfo: {
  EMAIL: string;
  NOME: string;
  SOBRENOME: string;
  LAST_ACCESS: string;
  PERMS_U: string;
  CLBIND_ID: number;
  CLBIND_ENABLED: string;
  CLBIND_PERMS_C: string;
  PASSWORD?: string;
}) {
  if (!isFakeCraft) {
    onUserAccess(userInfo);
  }
}

async function createUserSession (authenticatedUser: AuthenticatedUser, fakeProfile?: FakeProfile, isFakeCraft?: boolean): Promise<SessionData> {
  if (!authenticatedUser) throw Error('No auth info').HttpStatus(500);
  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: authenticatedUser.userId })
  if (!userInfo) throw Error('Could not find informed user').HttpStatus(401).DebugInfo(authenticatedUser)
  if (!userInfo.PASSWORD) {
    throw Error('User not allowed!').HttpStatus(403).DebugInfo(userInfo)
  }

  const clientsPerms = await sqldb.USERSCLIENTS.getUserClients({ userId: authenticatedUser.userId });
  let permissions = getPermissions({
    isMasterUser: authenticatedUser.isMasterUser,
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, clientsPerms)

  if (fakeProfile && permissions.isAdminSistema) {
    const fakeClientBind: IFakeClientBind = await getFakeClientBind(fakeProfile);
    const fakeclientPerms = [] as TFakeClientPerms[];
    if (fakeProfile.clients) {
      await getAllfakeProfileAdmin(fakeProfile, fakeclientPerms, fakeClientBind);
    }
    else if (fakeProfile.clients_v2) {
      await getAllPermsFakeProfileClientV2(fakeProfile, fakeClientBind, fakeclientPerms);
    }

    let PERMS_U: string = getPermsU(fakeProfile);
    const { CLBIND_ID, CLBIND_ENABLED, CLBIND_PERMS_C } = getCLBIND(fakeClientBind, userInfo);
    permissions = getPermissions({
      userPerms: PERMS_U,
      CLBIND_ID,
      CLBIND_ENABLED,
      CLBIND_PERMS_C,
    }, fakeclientPerms)
  }

  if (permissions.PER_CLIENT.length > 0) {
    // OK
  } 
  else if (permissions.PER_UNIT && permissions.PER_UNIT.length > 0) {
    // OK
  }
  else if (permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS === true) {
    // OK
  }
  else if (permissions.MANAGE_UNOWNED_DEVS) {
    // OK
  }
  else {
    throw Error('User not allowed!').HttpStatus(403).DebugInfo(userInfo)
  }

  const session: SessionData = {
    user: authenticatedUser.userId,
    permissions,
    fakeProfile,
  }

  notFakeCraft(isFakeCraft, userInfo);

  return session;
}

let LAST_ACCESS_REFRESH = new Date(Date.now() - 60 * 60 * 1000).toISOString();
let updatingLastAccess = false;
setInterval(function () {
  LAST_ACCESS_REFRESH = new Date(Date.now() - 60 * 60 * 1000).toISOString();
}, 5 * 60 * 1000);
function onUserAccess(userInfo: { EMAIL: string, LAST_ACCESS: string }) {
  if (userInfo.LAST_ACCESS > LAST_ACCESS_REFRESH) {
    // OK
  }
  else {
    if (!updatingLastAccess) {
      updatingLastAccess = true;
      sqldb.DASHUSERS.w_updateUser({
        EMAIL: userInfo.EMAIL,
        LAST_ACCESS: new Date().toISOString(),
      }, userInfo.EMAIL)
      .catch(logger.error)
      .then(() => { updatingLastAccess = false; });
    }
  }
}

export async function impersonate(reqParams: {
  authHeader: string
  fakeProfile: FakeProfile
}) {
  const { authenticatedUser } = await processHttpAuth(reqParams.authHeader);
  const realUserSession = await createUserSession(authenticatedUser, null, true);
  if (!realUserSession.permissions.isAdminSistema) throw Error('Not allowed').HttpStatus(403);
  const fakeProfileSession = await createUserSession(authenticatedUser, reqParams.fakeProfile, true);
  return { fakeProfileSession };
}

export async function craftToken(reqParams: {
  authHeader: string
  userId: string
}) {
  const { authenticatedUser } = await processHttpAuth(reqParams.authHeader);
  const session = await createUserSession(authenticatedUser, null);
  if (!session.permissions.isAdminSistema) throw Error('Not allowed').HttpStatus(403);
  if (!session.permissions.isMasterUser) throw Error('Not allowed').HttpStatus(403);
  if (!reqParams.userId) throw Error('Missing userId').HttpStatus(400);
  const userSession = await createUserSession({ userId: reqParams.userId, isMasterUser: false }, null, true);
  return {
    userSession,
  };
}

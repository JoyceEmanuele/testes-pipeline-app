import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import {
  canEditUserInfo,
  getPermissions,
} from '../../srcCommon/helpers/permissionControl'
import { SessionData } from '../../srcCommon/types'

interface UserInfo {
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

export const checkUsersSetPrefsOverviewParams = async (reqParams: {
  userId: string,
  prefs: {
    type: number
    title?: string
    position?: number
    isActive?: boolean
    isExpanded?: boolean
  }[]
}) => {
  if (!reqParams.userId) {
    throw Error('Invalid properties. Missing userId.').HttpStatus(400)
  }
  if (reqParams.prefs && reqParams.prefs.length > 0) { /* OK */ }
  else {
    throw Error('Invalid properties. Missing prefs.').HttpStatus(400)
  }
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.userId });
  if (!userInfo) {
    throw Error('User not found!').HttpStatus(400)
  }
  return userInfo;
}

export async function usersSetPrefsOverview(reqParams: {
  userId: string,
  prefs: {
    type: number
    title?: string
    position?: number
    isActive?: boolean
    isExpanded?: boolean
  }[]
}, session: SessionData){
  const userInfo = await checkUsersSetPrefsOverviewParams(reqParams);
  await checkPermissionsClients(reqParams.userId, userInfo, session);
  
  for (const pref of reqParams.prefs) {
    const prefInfo = await sqldb.PREFS_OVERVIEW.getPrefsOverviewInfoId({EMAIL: reqParams.userId, TYPE: pref.type} );
    const qPars: Parameters<typeof sqldb.PREFS_OVERVIEW_INFO.w_update>[0] = {
      ID: prefInfo.ID,
    }
    if (pref.isActive != undefined) qPars.IS_ACTIVE = getPrefsOverviewIsActive(pref.isActive);     
    else qPars.IS_ACTIVE = prefInfo.IS_ACTIVE;
    if (pref.isExpanded != undefined) qPars.IS_EXPANDED = getPrefsOverviewIsExpanded(pref.isExpanded);
    else qPars.IS_EXPANDED = prefInfo.IS_EXPANDED;
    if (pref.position != undefined) qPars.POSITION = pref.position;
    else qPars.POSITION = prefInfo.POSITION;

    await sqldb.PREFS_OVERVIEW_INFO.w_update(qPars, session.user);
  }

  return 'OK';
}

httpRouter.privateRoutes['/users/set-prefs-overview'] = usersSetPrefsOverview;

function getPrefsOverviewIsActive(isActive:boolean) {
  if (isActive){
    return '1'
  }
  else return '0'  
}
function getPrefsOverviewIsExpanded(isExpanded:boolean) {
  if (isExpanded){
    return '1'
  }
  else return '0'  
}

export async function usersGetPrefsOverview(reqParams: { userId: string }, session: SessionData) {
  if (!reqParams.userId) throw Error('userId required').HttpStatus(400);
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.userId });
  if (!userInfo) throw Error('User not found!').HttpStatus(400);
  await checkPermissionsClients(reqParams.userId, userInfo, session);

  let prefs = [] as {
    type: number
    title?: string
    position?: number
    isActive?: boolean
    isExpanded?: boolean
  }[]

  const prefsOverview = await sqldb.PREFS_OVERVIEW.getPrefsOverview({EMAIL: reqParams.userId})
  if (prefsOverview?.length > 0) {
    for (const pref of prefsOverview) {  
      const prefCurrent = {
        type: pref.TYPE,
        title: pref.TITLE,
        position: pref.POSITION,
        isActive: pref.IS_ACTIVE === '1',
        isExpanded: pref.IS_EXPANDED === '1'
      }
      prefs.push(prefCurrent)
    }  
  }
  if (session.permissions.isAdminSistema) {
    return { prefs };
  } else {
    const clients = session.permissions.PER_CLIENT?.map((item) => item.clientId) || [];
    const unitsList = [] as number[];
    session.permissions.PER_UNIT?.map((item) => unitsList.push(...item.units));

    const hasWater = await sqldb.DMAS_DEVICES.getListToOverview({ clientIds: clients, unitIds: unitsList });
    if (hasWater.length === 0) {
      prefs = prefs.filter((item) => item.type !== 4);
    }
    const hasEnergy = await sqldb.ENERGY_DEVICES_INFO.getListToOverview({ clientIds: clients, unitIds: unitsList });
    if (hasEnergy.length === 0) {
      prefs = prefs.filter((item) => item.type !== 3);
    }
  }
  return { prefs }
}

httpRouter.privateRoutes['/users/get-prefs-overview'] = usersGetPrefsOverview;

async function checkPermissionsClients(userId: string, userInfo: UserInfo, session: SessionData) {
  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL });

  const editedUserPerms = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);

  if (!session.permissions.isAdminSistema && session.user !== userId) {
    if (!userInfo.LAST_ACCESS) {
      throw Error('User must login at least once!').HttpStatus(403)
    }
    if (canEditUserInfo(session.permissions, editedUserPerms) !== true) {
      throw Error('Not allowed').HttpStatus(403);
    }
  }  
}

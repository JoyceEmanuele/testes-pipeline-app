import * as httpRouter from '../apiServer/httpRouter'
import { getAllowedUnitsView, getPermissionsOnClient, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import sqldb from '../../srcCommon/db'

httpRouter.privateRoutes['/clients/add-client-class'] = async function (reqParams, session) {
  const { CLIENT_ID, CLASS_TYPE, CLASS_NAME } = reqParams;
  if (!CLIENT_ID) {
    throw Error('Client id missing').HttpStatus(400);
  }
  if (!CLASS_TYPE) {
    throw Error('Class type missing').HttpStatus(400);
  }
  if (!CLASS_NAME) {
    throw Error('Class name missing').HttpStatus(400);
  }
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  const data = await sqldb.CLASSES.w_addClientClass({ CLIENT_ID, CLASS_NAME, CLASS_TYPE }, session.user);
  return { CLASS_ID: data.insertId, CLASS_TYPE, CLASS_NAME, CLIENT_ID };
}

httpRouter.privateRoutes['/clients/get-client-classes'] = async function (reqParams, session) {
  const { CLIENT_ID } = reqParams;
  if (!CLIENT_ID) {
    throw Error('Client id missing').HttpStatus(400);
  }

  const perms = await getPermissionsOnClient(session, CLIENT_ID);
  if (perms.canManageClient) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403)

  const data = await sqldb.CLASSES.getClientClasses({ CLIENT_ID });
  return { list: data }
}

httpRouter.privateRoutes['/clients/get-classes-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { return { list: [] } } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.CLIENT_IDS) { reqParams.CLIENT_IDS = allowedClients; }
    reqParams.CLIENT_IDS = reqParams.CLIENT_IDS.filter(x => allowedClients.includes(x));
  }

  const clientsClasses = await sqldb.CLASSES.getAllClasses({
    CLIENT_IDS: reqParams.CLIENT_IDS,
  });
  const clientsClassesInfo = await Promise.all(clientsClasses.map(async (item) => {
    const { list: clientUnits } = await httpRouter.privateRoutes['/clients/get-class-units']({ CLASS_ID: item.CLASS_ID, CLIENT_ID: item.CLIENT_ID }, session);
    const units = clientUnits.map((item) => ({
      UNIT_ID: item.UNIT_ID,
      UNIT_NAME: item.UNIT_NAME,
    }));
    return {
      client: { CLIENT_ID: item.CLIENT_ID, CLIENT_NAME: item.CLIENT_NAME },
      class: { CLASS_ID: item.CLASS_ID, CLASS_TYPE: item.CLASS_TYPE, CLASS_NAME: item.CLASS_NAME },
      units: units,
    }
  }));
  return { list: clientsClassesInfo }
}

httpRouter.privateRoutes['/clients/edit-client-class'] = async function (reqParams, session) {
  const { CLIENT_ID, CLASS_ID, CLASS_TYPE, CLASS_NAME } = reqParams;
  if (!CLIENT_ID) {
    throw Error('Client id missing').HttpStatus(400);
  }
  if (!CLASS_ID) {
    throw Error('Class id missing').HttpStatus(400);
  }
  if (!CLASS_TYPE) {
    throw Error('Class type missing').HttpStatus(400);
  }
  if (!CLASS_NAME) {
    throw Error('Class name missing').HttpStatus(400);
  }

  let currentClass = await sqldb.CLASSES.getClientClass({ CLASS_ID, CLIENT_ID });
  if (!currentClass) throw Error('Class not found on client').HttpStatus(404);

  const perms = await getPermissionsOnClient(session, currentClass.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  await sqldb.CLASSES.w_updateClientClass({ CLASS_ID, CLASS_TYPE, CLASS_NAME }, session.user);

  currentClass = await sqldb.CLASSES.getClientClass({ CLASS_ID, CLIENT_ID });
  const { list: classUnitsList } = await httpRouter.privateRoutes['/clients/get-class-units']({ CLASS_ID, CLIENT_ID }, session);

  return {
    class: currentClass,
    units: classUnitsList.map((classUnit) => ({ UNIT_ID: classUnit.UNIT_ID, UNIT_NAME: classUnit.UNIT_NAME })),
  }
}

httpRouter.privateRoutes['/clients/remove-client-class'] = async function (reqParams, session) {
  const { CLIENT_ID, CLASS_ID } = reqParams;
  if (!CLIENT_ID) {
    throw Error('Client id missing').HttpStatus(400);
  }
  if (!CLASS_ID) {
    throw Error('Group id missing').HttpStatus(400);
  }

  const perms = await getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  await sqldb.UNITCLASSES.w_clearClassUnits({ CLASS_ID }, session.user);
  await sqldb.CLASSES.w_removeClientClass({ CLIENT_ID, CLASS_ID }, { UNITCLASSES: true }, session.user);

  return 'DELETE OK'
}

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.UNITCLASSES.w_removeFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.CLASSES.w_removeFromClient({ CLIENT_ID: qPars.CLIENT_ID }, { UNITCLASSES: true }, userId);
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.UNITCLASSES.w_removeFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
}

httpRouter.privateRoutes['/clients/set-class-units'] = async function (reqParams, session) {
  const { UNIT_IDS, CLASS_ID, CLIENT_ID } = reqParams;
  if (!UNIT_IDS) {
    throw Error ('Unit ids missing').HttpStatus(400);
  }
  if (!CLASS_ID) {
    throw Error ('Class id missing').HttpStatus(400);
  }
  if (!CLIENT_ID) {
    throw Error ('Client id missing').HttpStatus(400);
  }

  const perms = await getPermissionsOnClient(session, CLIENT_ID);
  if (!perms.canManageClient) {
    throw Error('Permission denied').HttpStatus(403);
  }

  for (const UNIT_ID of UNIT_IDS) {
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID });
    if (unitInfo.CLIENT_ID !== CLIENT_ID) throw Error(`Some unit (${UNIT_ID}) does not belong to this client ${CLIENT_ID}`).HttpStatus(400);
  }

  const clientClassesList = await httpRouter.privateRoutes['/clients/get-client-classes']({ CLIENT_ID }, session);
  if (!clientClassesList.list.map(({CLASS_ID}) => CLASS_ID).includes(CLASS_ID)) {
    throw Error (`Class (${CLASS_ID}) does not belong to client (${CLIENT_ID})`).HttpStatus(400);
  }

  await sqldb.UNITCLASSES.w_clearClassUnits({ CLASS_ID: CLASS_ID }, session.user);

  for (const UNIT_ID of reqParams.UNIT_IDS) {
    await sqldb.UNITCLASSES.w_setClassUnits({ UNIT_ID, CLASS_ID }, session.user);
  }

  return 'SET OK'
}

httpRouter.privateRoutes['/clients/get-class-units'] = async function (reqParams, session) {
  const { CLASS_ID, CLIENT_ID } = reqParams;
  if (!CLASS_ID) {
    throw Error('Class id missing').HttpStatus(400);
  }

  let unitsFilter: number[] = undefined;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { /* OK */ }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!allowedClients.includes(CLIENT_ID)) {
      throw Error('Permission denied!').HttpStatus(403);
    }
    unitsFilter = allowedUnits;
  }

  const data = await sqldb.UNITCLASSES.getClassUnits({ CLASS_ID, CLIENT_ID, UNIT_IDS: unitsFilter });
  return { list: data }
}

import * as httpRouter from '../apiServer/httpRouter'
import * as users from '../auth/users'
import * as dacAlerts from '../notifs/dacAlerts'
import * as devInfo from '../devInfo'
import * as roomTypes from './roomTypes'
import * as machines from './machines'
import * as assets from './assets'
import * as rooms from './rooms'
import * as vtInfo from '../visitaTecnica/vtInfo'
import * as units from './units'
import * as simcards from '../painel/simcards'
import * as classes from './classes';
import * as associations from './associations';
import sqldb from '../../srcCommon/db'
import servConfig from '../../configfile'
import { getAllowedClientsManageFull, getAllowedUnitsView, PROFILECODES, clientTypes, getUserGlobalPermissions, getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'
import { SessionData } from '../../srcCommon/types'

// TODO: Separar clientes de fabricantes quando retornar a listagem

async function getCitiesClients(list: httpRouter.ApiResps['/clients/get-clients-list']['list']) {
  for (const client of list) {
    const cities = await sqldb.CLIENTS.getCitiesClients({ clientId: client.CLIENT_ID })
    const listCities = cities.map((item) => item.CITY_ID);
    client.CITIES = listCities;
  }
}

async function verifyPerms(reqParams: httpRouter.ApiParams['/clients/get-clients-list'], session: SessionData) {
  const perms = getUserGlobalPermissions(session);
  if (reqParams.withManagerPermission) {
    // Lista de clientes que o usuário solicitante tem direito de gerenciar
    if (perms.manageAllClientsUnitsAndDevs) { /* OK */ }
    else {
      const { clientIds: allowedClients } = await getAllowedClientsManageFull(session);
      if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
      reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    }
  }
  const admPars = {
    full: (perms.manageAllClientsUnitsAndDevs && (reqParams.full === true))
  }
  delete reqParams.full
  return admPars;
}

async function getStatesClients(list: httpRouter.ApiResps['/clients/get-clients-list']['list']) {
  for (const client of list) {
    const states = await sqldb.CLIENTS.getStatesClients({ clientId: client.CLIENT_ID })
    const listStates = states.map((item) => item.STATE_ID);
    client.STATES = listStates;
  }
}

async function formatList(_list: Awaited<ReturnType<typeof sqldb.CLIENTS.getClientsList>>, reqParams: httpRouter.ApiParams['/clients/get-clients-list']) {
  const list =_list.map((row) => {
    const clientType: ('cliente' | 'fabricante' | 'mantenedor'|'parceira')[] = [];
    if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Cliente)) clientType.push('cliente');
    if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Fabricante)) clientType.push('fabricante');
    if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Mantenedor)) clientType.push('mantenedor');
    if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Parceiro)) clientType.push('parceira');
    return Object.assign(row, { clientType });
  });

  if (reqParams.INCLUDE_CITIES) {
    await getCitiesClients(list);
  }

  if (reqParams.INCLUDE_STATES) {
    await getStatesClients(list);
  }
  return list;
}

httpRouter.privateRoutes['/clients/get-clients-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
  }
  const perms = getUserGlobalPermissions(session);
  if (reqParams.withManagerPermission) {
    // Lista de clientes que o usuário solicitante tem direito de gerenciar
    if (perms.manageAllClientsUnitsAndDevs) { /* OK */ }
    else {
      const { clientIds: allowedClients } = await getAllowedClientsManageFull(session);
      if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
      reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    }
  }

  const admPars = await verifyPerms(reqParams, session);

  if (reqParams.clientIds && reqParams.clientIds.length === 0) {
    return { list: [] };
  }

  const _list = await sqldb.CLIENTS.getClientsList(reqParams, admPars);
  const list: httpRouter.ApiResps['/clients/get-clients-list']['list'] = await formatList(_list, reqParams);
  const dielClientId = session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS ? servConfig.dielClientId : undefined;

  return { list, dielClientId, clientTypes };
}

httpRouter.privateRoutes['/clients/get-client-info'] = async function (reqParams, session) {
  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canManageClient) throw Error('Permission denied!').HttpStatus(403);

  if (reqParams.CLIENT_ID !== 0 && (!reqParams.CLIENT_ID)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }

  const row = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.CLIENT_ID });
  if (!row) throw Error('Could not find requested client').HttpStatus(400)

  const clientType: ('cliente' | 'fabricante' | 'mantenedor')[] = [];
  if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Cliente)) clientType.push('cliente');
  if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Fabricante)) clientType.push('fabricante');
  if ((row.PERMS_C || '').includes(PROFILECODES.EMPRESA.Mantenedor)) clientType.push('mantenedor');

  const client = Object.assign(row, { clientType });

  return { client }
}

httpRouter.privateRoutes['/clients/add-new-client'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.editCreateDeleteClientsProfiles) throw Error('Permission denied!').HttpStatus(403);

  if (!reqParams.NAME) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }

  if (reqParams.ENABLED !== '0') reqParams.ENABLED = '1'
  // reqParams.DATE_REG = new Date().toISOString()

  let PERMS_C = undefined;
  if (reqParams.clientType !== undefined) {
    if (reqParams.clientType) {
      PERMS_C = '';
      if (reqParams.clientType.includes('cliente')) PERMS_C += PROFILECODES.EMPRESA.Cliente;
      if (reqParams.clientType.includes('fabricante')) PERMS_C += PROFILECODES.EMPRESA.Fabricante;
      if (reqParams.clientType.includes('mantenedor')) PERMS_C += PROFILECODES.EMPRESA.Mantenedor;
    }
    PERMS_C = PERMS_C || null;
  }

  const { insertId } = await sqldb.CLIENTS.w_insert({
    EMAIL: reqParams.EMAIL,
    PICTURE: reqParams.PICTURE,
    ENABLED: reqParams.ENABLED,
    NAME: reqParams.NAME,
    PERMS_C,
    CNPJ: reqParams.CNPJ,
    PHONE: reqParams.PHONE,
  }, session.user)
  // return { id: insertId }
  const getClientInfo = httpRouter.privateRoutes['/clients/get-client-info']
  return (await getClientInfo({ CLIENT_ID: insertId }, session)).client
}

httpRouter.privateRoutes['/clients/edit-client'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.editCreateDeleteClientsProfiles) throw Error('Permission denied!').HttpStatus(403);

  if (reqParams.ENABLED != null) {
    reqParams.ENABLED = reqParams.ENABLED == '1' ? '1' : '0';
  }
  else {
    delete reqParams.ENABLED;
  }

  if (reqParams.CLIENT_ID !== 0 && (!reqParams.CLIENT_ID)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }

  let PERMS_C = undefined;
  if (reqParams.clientType !== undefined) {
    if (reqParams.clientType) {
      PERMS_C = '';
      if (reqParams.clientType.includes('cliente')) PERMS_C += PROFILECODES.EMPRESA.Cliente;
      if (reqParams.clientType.includes('fabricante')) PERMS_C += PROFILECODES.EMPRESA.Fabricante;
      if (reqParams.clientType.includes('mantenedor')) PERMS_C += PROFILECODES.EMPRESA.Mantenedor;
    }
    PERMS_C = PERMS_C || null;
  }

  await sqldb.CLIENTS.w_update({
    CLIENT_ID: reqParams.CLIENT_ID,
    EMAIL: reqParams.EMAIL,
    NAME: reqParams.NAME,
    PICTURE: reqParams.PICTURE,
    ENABLED: reqParams.ENABLED,
    PERMS_C,
    CNPJ: reqParams.CNPJ,
    PHONE: reqParams.PHONE,
  }, session.user)
  const getClientInfo = httpRouter.privateRoutes['/clients/get-client-info']
  const { client } = await getClientInfo({ CLIENT_ID: reqParams.CLIENT_ID }, session);
  if (reqParams.ENABLED === '0') {
    await sqldb.USERSCLIENTS.w_removeFromClient({ CLIENT_ID: reqParams.CLIENT_ID }, session.user);
    await users.removeEmptyUsers(session.user);
  }
  return client
}

httpRouter.privateRoutes['/clients/remove-client'] = async function (reqParams, session) {

  return 'Rota desabilitada temporariamente';
  // TODO: perguntar no front se é para apagar os DACs do cliente ou só desassociar
  const perms = getUserGlobalPermissions(session);
  if (!perms.editCreateDeleteClientsProfiles) throw Error('Permission denied!').HttpStatus(403);

  if (reqParams.clientId !== 0 && (!reqParams.clientId)) {
    throw Error('There was an error!\nInvalid properties.').HttpStatus(400)
  }
  const clientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.clientId });
  if (!clientInfo) throw Error('Client not found').HttpStatus(400);

  await devInfo.removingClient({ CLIENT_ID: reqParams.clientId }, reqParams.keepDevsData, session.user);
  await dacAlerts.deleteFromClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await roomTypes.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await assets.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await machines.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await rooms.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await units.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await users.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await simcards.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await classes.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await vtInfo.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await sqldb.MANUFACT_DEVS.w_deleteFromClient({ CLIENT_ID: reqParams.clientId }, session.user);
  await associations.removingClient({ CLIENT_ID: reqParams.clientId }, session.user);

  const { affectedRows } = await sqldb.CLIENTS.w_deleteRow({ clientId: reqParams.clientId }, {
    CLASSES: true,
    CLUNITS: true,
    DEVGROUPS: true,
    ROOMS: true,
    DEVS: true,
    NOTIFSCFG: true,
    ROOMTYPES: true,
    CLIENT_ASSETS: true,
    USERSCLIENTS: true,
    DASHUSERS: true,
    SIMCARDS: true,
    MANUFACT_DEVS: true,
    VISITATECNICA: true,
    ASSOCIATIONS: true,
  }, session.user)
  return `DELETED ` + affectedRows
}

// THE ENDPOINTS BELOW ARE RELATED TO UNIT'S RESPONSIBLE ON FRONT END ('Resonsáveis da Unidade')

httpRouter.privateRoutes['/clients/set-unit-supervisors'] = async function (reqParams, session) {
  const { USER_ID, UNIT_ID, isBatch } = reqParams;
  if (!USER_ID || !UNIT_ID) {
    throw Error('User or Unit id missing.').HttpStatus(400);
  }

  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  if (!isBatch) {
    await sqldb.UNITSUPERVISORS.w_clearUnitSupervisors({ UNIT_ID }, session.user);
  }
  await sqldb.UNITSUPERVISORS.w_setUnitSupervisors({ USER_ID, UNIT_ID }, session.user);

  return 'SET OK'
}

httpRouter.privateRoutes['/clients/get-unit-supervisors'] = async function (reqParams, session) {
  if (reqParams.UNIT_ID && !reqParams.UNIT_IDS) reqParams.UNIT_IDS = [reqParams.UNIT_ID];
  delete reqParams.UNIT_ID;

  if (reqParams.UNIT_IDS && (reqParams.UNIT_IDS.length > 0)) { } // OK
  else {
    throw Error('UNIT_ID or UNIT_IDS missing').HttpStatus(400);
  }

  let CLIENT_IDS: number[] = undefined;
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    CLIENT_IDS = allowedClients;
    if (allowedUnits) {
      if (!reqParams.UNIT_IDS) reqParams.UNIT_IDS = allowedUnits;
      reqParams.UNIT_IDS = reqParams.UNIT_IDS.filter((id) => allowedUnits.includes(id));
    }
  }
  if (reqParams.UNIT_IDS && reqParams.UNIT_IDS.length === 0) {
    return { list: [] };
  }

  const data = await sqldb.UNITSUPERVISORS.getUnitSupervisors({ UNIT_IDS: reqParams.UNIT_IDS, CLIENT_IDS });

  return { list: data };
}

httpRouter.privateRoutes['/clients/get-supervisor-units'] = async function (reqParams, session) {
  const { USER_ID } = reqParams;

  let UNIT_IDS: number[] = undefined;
  let CLIENT_IDS: number[] = undefined;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {} // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    UNIT_IDS = allowedUnits;
    CLIENT_IDS = allowedClients;
  }

  const data = await sqldb.UNITSUPERVISORS.getSupervisorUnits({ USER_ID, UNIT_IDS, CLIENT_IDS });

  return { list: data.map(({ UNIT_ID }) => UNIT_ID) };
}

httpRouter.privateRoutes['/clients/clear-unit-supervisors'] = async function (reqParams, session) {
  const { UNIT_ID } = reqParams;
  if (!UNIT_ID) {
    throw Error('Unit id missing').HttpStatus(400);
  }

  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  await sqldb.UNITSUPERVISORS.w_clearUnitSupervisors({ UNIT_ID }, session.user)

  return 'CLEAR OK'
}

/**
 * @swagger
 * /clients/get-all-clients:
 *   post:
 *     summary: Lista de clientes
 *     description: Retorna uma lista de clientes
 *     tags:
 *       - Client
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             FILTER_BY_CLIENT_IDS:
 *               required: false
 *               type: array
 *               items:
 *                 type: number
 *               default: ""
 *               description: Ids de clientes a se filtrar
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   list:
 *                     type: array
 *                     items:
 *                        type: object
 *                        properties:
 *                          CLIENT_ID:
 *                            type: number
 *                            description: Id do cliente
 *                          CLIENT_NAME:
 *                            type: string
 *                            description: Nome do cliente
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getAllClients = async (reqParams: httpRouter.ApiParams['/clients/get-all-clients'], session: SessionData) => {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) throw Error('Permission Denied!').HttpStatus(403);

  const clients = await sqldb.CLIENTS.getAllClientsEnabled(reqParams);
  return { list: clients }
}

httpRouter.privateRoutes['/clients/get-all-clients'] = getAllClients;

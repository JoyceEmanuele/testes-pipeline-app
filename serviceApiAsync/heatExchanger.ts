import sqldb from '../srcCommon/db';
import * as httpRouter from './apiServer/httpRouter';
import { getPermissionsOnClient } from '../srcCommon/helpers/permissionControl';

httpRouter.privateRoutes['/heat-exchanger/get-list-v2'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) return [];

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const rows = await sqldb.HEAT_EXCHANGERS.getHeatExchangersList();

  return rows;
}

httpRouter.privateRoutesDeprecated['/heat-exchanger/get-list'] = async function (reqParams, session) {
  const list = await httpRouter.privateRoutes['/heat-exchanger/get-list-v2'](reqParams, session) as { ID: number, NAME: string, BRAND: string, MODEL: string, T_MIN: number, T_MAX: number, DELTA_T_MIN: number, DELTA_T_MAX: number, CLIENT_ID: number}[] ;
  return list;
}

httpRouter.privateRoutes['/heat-exchanger/delete-info'] = async function (reqParams, session) {
  if (!reqParams.ID) throw Error('There was an error!\nInvalid properties. Missing ID.').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_deleteRow({ HEAT_EXCHANGER_ID: reqParams.ID }, session.user);
  await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_deleteRow({ HEAT_EXCHANGER_ID: reqParams.ID }, session.user);
  
  const {affectedRows} = await sqldb.HEAT_EXCHANGERS.w_deleteRow({
    ID: reqParams.ID
  }, session.user);

  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutes['/heat-exchanger/set-info-v2'] = async function (reqParams, session) {
  if (!reqParams.ID) throw Error('There was an error!\nInvalid properties. Missing ID.').HttpStatus(400);
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const {affectedRows} = await sqldb.HEAT_EXCHANGERS.w_updateInfo({
    ID: reqParams.ID,
    NAME: reqParams.NAME,
    T_MIN: reqParams.T_MIN,
    T_MAX: reqParams.T_MAX,
    DELTA_T_MIN: reqParams.DELTA_T_MIN,
    DELTA_T_MAX: reqParams.DELTA_T_MAX,
  }, session.user);
  
  return 'SET - OK';
}

httpRouter.privateRoutesDeprecated['/heat-exchanger/set-info'] = async function (reqParams, session) {
  const updated = await httpRouter.privateRoutes['/heat-exchanger/set-info-v2'](reqParams, session);
  return updated;
}

httpRouter.privateRoutes['/heat-exchanger/create-v2'] = async function (reqParams, session) {
  if (!reqParams.NAME) throw Error('There was an error!\nInvalid properties. Missing NAME.').HttpStatus(400);
  if (!reqParams.T_MIN) throw Error('There was an error!\nInvalid properties. Missing T_MIN.').HttpStatus(400);
  if (!reqParams.T_MAX) throw Error('There was an error!\nInvalid properties. Missing T_MAX.').HttpStatus(400);
  if (!reqParams.DELTA_T_MIN) throw Error('There was an error!\nInvalid properties. Missing DELTA_T_MIN.').HttpStatus(400);
  if (!reqParams.DELTA_T_MAX) throw Error('There was an error!\nInvalid properties. Missing DELTA_T_MAX.').HttpStatus(400);
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);


  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  await sqldb.HEAT_EXCHANGERS.w_insert({
    NAME: reqParams.NAME,
    T_MIN: reqParams.T_MIN,
    T_MAX: reqParams.T_MAX,
    DELTA_T_MIN: reqParams.DELTA_T_MIN,
    DELTA_T_MAX: reqParams.DELTA_T_MAX,
  }, session.user);

  return "INSERT - OK";
}

httpRouter.privateRoutesDeprecated['/heat-exchanger/create'] = async function (reqParams, session) {
  const created = await httpRouter.privateRoutes['/heat-exchanger/create-v2'](reqParams, session);
  return created;
}
httpRouter.privateRoutes['/heat-exchanger/get-brands-list-v2'] = async function (_reqParams, _session) {
  return await sqldb.AV_OPTS.getOptsOfType({OPT_TYPE: 'EXCHANGERS-BRAND'});
}

httpRouter.privateRoutesDeprecated['/heat-exchanger/get-brands-list'] = async function (reqParams, session) {
  const list = await httpRouter.privateRoutes['/heat-exchanger/get-brands-list-v2'](reqParams, session);
  return list;
}

httpRouter.privateRoutes['/heat-exchanger/get-info-v2'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing CLIENT_ID.').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const row = await sqldb.HEAT_EXCHANGERS.getHeatExchangerById({
    ID: reqParams.HEAT_EXCHANGER_ID,
  });

  return row;
}

httpRouter.privateRoutesDeprecated['/heat-exchanger/get-info'] = async function (reqParams, session) {
  const list = await httpRouter.privateRoutes['/heat-exchanger/get-info-v2'](reqParams, session) as { ID: number, NAME: string, BRAND: string, MODEL: string, T_MIN: number, T_MAX: number, DELTA_T_MIN: number, DELTA_T_MAX: number, CLIENT_ID: number };
  return list;
}

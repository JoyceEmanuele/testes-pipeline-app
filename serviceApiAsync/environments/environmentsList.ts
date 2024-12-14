import sqldb from '../../srcCommon/db'
import * as httpRouter from '../apiServer/httpRouter'
import {
  getPermissionsOnUnit
} from '../../srcCommon/helpers/permissionControl'
import { logger } from '../../srcCommon/helpers/logger';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { verifyPermsParams } from '../clientData/machines';

httpRouter.privateRoutes['/environments/get-environment-list'] = async function (reqParams, session) {
  const clientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.CLIENT_ID });
  if (!clientInfo) {
    logger.error('Client not found!');
    throw Error('Client not found!').HttpStatus(400);
  }

  if (reqParams.UNIT_ID) {
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
    if (!unitInfo) {    
      logger.error('Unit not found!');
      throw Error('Unit not found!').HttpStatus(400);
    }
  }

  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canViewDevs) {
    logger.error('Permission denied!');
    throw Error('Permission denied!').HttpStatus(403);
  }

  const environments = await sqldb.ENVIRONMENTS.getEnvironmentsList({ CLIENT_IDs: reqParams.CLIENT_ID ? [reqParams.CLIENT_ID] : undefined, UNIT_ID: reqParams.UNIT_ID, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT });

  return {environments: environments.map(env => ({
    ENVIRONMENT_ID: env.ID,
    ENVIRONMENT_NAME: env.ENVIRONMENT_NAME,
    ENVIRONMENTS_ROOM_TYPES_ID: env.ENVIRONMENTS_ROOM_TYPES_ID,
    UNIT_ID: env.UNIT_ID,
    UNIT_NAME: env.UNIT_NAME,
    IS_VISIBLE: env.IS_VISIBLE,
    CITY_ID: env.CITY_ID,
    CITY_NAME: env.CITY_NAME,
    STATE_ID: env.STATE_ID,
    STATE_NAME: env.STATE_NAME,
    COUNTRY_NAME: env.COUNTRY_NAME,
    LAT: env.LAT,
    LON: env.LON,
    CLIENT_NAME: env.NAME,
    CLIENT_ID: env.CLIENT_ID,
    RTYPE_ID: env.RTYPE_ID,
    RTYPE_NAME: env.RTYPE_NAME,
    DUT_CODE: env.DUT_CODE,
    MACHINE_ID: env.MACHINE_ID
  }))};
}
  
httpRouter.privateRoutes['/environments/edit-environment'] = async function (reqParams, session) {
  const clientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.CLIENT_ID });
  if (!clientInfo) {
    logger.error('Client not found!');
    throw Error('Client not found!').HttpStatus(400);
  }

  if (reqParams.UNIT_ID) {
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
    if (!unitInfo) {    
      logger.error('Unit not found!');
      throw Error('Unit not found!').HttpStatus(400);
    }
  }

  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canViewDevs) {
    logger.error('Permission denied!');
    throw Error('Permission denied!').HttpStatus(403);
  }

  const environmentInfo = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID});
  if (!environmentInfo) {
    logger.error('Environment not found!');
    throw Error('Environment not found!');
  }

  if (reqParams.UNIT_ID !== environmentInfo.UNIT_ID) {
    logger.error('Environment can not change from unit!');
    throw Error('Environment can not change from unit!');
  }

  if (reqParams.RTYPE_ID !== undefined && environmentInfo.RTYPE_ID !== reqParams.RTYPE_ID) {
    if (reqParams.RTYPE_ID !== null) {
      if (environmentInfo.ENVIRONMENT_ROOM_TYPE_ID) {
        await sqldb.ENVIRONMENTS_ROOM_TYPES.w_updateInfo({ID: environmentInfo.ENVIRONMENT_ROOM_TYPE_ID, RTYPE_ID: environmentInfo.RTYPE_ID}, session.user);
      }
      else {
        await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID, RTYPE_ID: reqParams.RTYPE_ID}, session.user);
      }
    }
    else {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ID: environmentInfo.ENVIRONMENT_ROOM_TYPE_ID}, session.user);
    }
  }
  await sqldb.ENVIRONMENTS.w_updateInfo({ID: reqParams.ENVIRONMENT_ID, ENVIRONMENT_NAME: reqParams.ENVIRONMENT_NAME, UNIT_ID: reqParams.UNIT_ID}, session.user);
  
  return 'EDIT OK';
}
  
httpRouter.privateRoutes['/environments/delete-environment'] = async function (reqParams, session) {
  const clientInfo = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.CLIENT_ID });
  if (!clientInfo) {
    logger.error('Client not found!');
    throw Error('Client not found!').HttpStatus(400);
  }

  if (reqParams.UNIT_ID) {
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID });
    if (!unitInfo) {    
      logger.error('Unit not found!');
      throw Error('Unit not found!').HttpStatus(400);
    }
  }

  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canViewDevs) {
    logger.error('Permission denied!');
    throw Error('Permission denied!').HttpStatus(403);
  }

  const environmentInfo = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID});
  if (!environmentInfo) {
    logger.error('Environment not found!');
    throw Error('Environment not found!');
  }

  await sqldb.DUTS_REFERENCE.w_deleteRowFromEnvironment({ ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID }, session.user);
  await sqldb.DUTS_MONITORING.w_deleteRow({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID}, session.user);
  await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteRow({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID}, session.user);
  await sqldb.REFRIGERATES.w_deleteRow({ENVIRONMENT_ID: reqParams.ENVIRONMENT_ID}, session.user);
  await sqldb.ENVIRONMENTS.w_deleteRow({ID: reqParams.ENVIRONMENT_ID}, session.user);

  return 'DELETE OK';
}


httpRouter.privateRoutesDeprecated['/environments/get-environment-list-overview'] = async function (reqParams, session) {
  await verifyPermsParams(session, reqParams);

  const environments = await sqldb.DUTS.buildRoomsDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  const unmonitoredEnvironments = await sqldb.ENVIRONMENTS.getUnmonitoredEnvironments({ unitIds: reqParams.unitIds, clientIds: reqParams.clientIds, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT});

  const response = [] as {
    ENVIRONMENT: string | null
    DUT_CODE: string | null
    STATUS: string | null
  }[];

  for(const env of unmonitoredEnvironments) {
    response.push({
      ENVIRONMENT: env.ENVIRONMENT,
      DUT_CODE: null,
      STATUS: null
    });
  }

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (environments.length <= 500) ? environments.map((x) => x.DEV_ID) : undefined,
  });

  for(const env of environments) {
    response.push({
      ENVIRONMENT: env.ROOM_NAME,
      DUT_CODE: env.DEV_ID,
      STATUS: lastMessagesTimes.connectionStatus(env.DEV_ID) || 'OFFLINE'
    });
  }

  return {environments: response};
}

httpRouter.privateRoutes['/environments/get-environment-list-overview-v2'] = async function (reqParams, session) {
  await verifyPermsParams(session, reqParams);

  const environments = await sqldb.DUTS.buildRoomsDevsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  const unmonitoredEnvironments = await sqldb.ENVIRONMENTS.getUnmonitoredEnvironments({ unitIds: reqParams.unitIds, clientIds: reqParams.clientIds, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT});

  const response = [] as {
    ENVIRONMENT: string | null
    DUT_CODE: string | null
    STATUS: string | null
  }[];

  
  let count = {
    unMonitored: 0,
    online: 0,
    offline: 0,
  }

  for(const env of unmonitoredEnvironments) {
    response.push({
      ENVIRONMENT: env.ENVIRONMENT,
      DUT_CODE: null,
      STATUS: null
    });
    count.unMonitored++;
  }

  const lastTelemetries = await devsLastComm.loadLastMessagesTimes({
    devIds: (environments.length <= 500) ? environments.map((x) => x.DEV_ID) : undefined,
  });

  for(const env of environments) {
    if(lastTelemetries.connectionStatus(env.DEV_ID) === 'ONLINE') {
      count.online++;
    }
    else {
      count.offline++;
    }
  }

  return {count: count};
}
import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl';

httpRouter.privateRoutes['/mainservice/get-units-list'] = async function (reqParams, session) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const rows = await sqldb.CLUNITS.getUnitsMainService({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
  });

  return rows;

}
import sqldb from '../../srcCommon/db';
import { sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones';
import * as httpRouter from '../apiServer/httpRouter';
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl';

export async function editDeviceUnit(ID: number, UNIT_ID: number, user: string) {
  const unitId = await sqldb.DEVICES_UNITS.getUnitByDevId({DEVICE_ID: ID});
  if(!unitId){
    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({UNIT_ID: UNIT_ID});
    if(unitInfo){
      await sqldb.DEVICES_CLIENTS.w_insertIgnore({CLIENT_ID: unitInfo.CLIENT_ID, DEVICE_ID: ID }, user);
      await sqldb.DEVICES_UNITS.w_insertIgnore({UNIT_ID: UNIT_ID, DEVICE_ID: ID}, user);
      await sendCommandToDeviceWithConfigTimezone({ userId: user, devId: ID });
    }
  }else if (UNIT_ID !== unitId.UNIT_ID){
    throw Error('Device already associated to other unit!').HttpStatus(400);
  }
}


httpRouter.privateRoutes['/devices/get-client-unit'] = async function (reqParams, session) {
  const deviceInfo = await sqldb.DEVICES.getUnitClientFromDevice({DEVICE_ID: reqParams.deviceId});

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS || session.permissions.isParceiroValidador || session.permissions.isInstaller) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits?.includes(deviceInfo.UNIT_ID) || allowedClients?.includes(deviceInfo.CLIENT_ID)) {
      // OK
    }
    else throw Error('Permission denied!').HttpStatus(403);
  }

  return {
    clientId: deviceInfo.CLIENT_ID,
    unitId: deviceInfo.UNIT_ID
  }
}
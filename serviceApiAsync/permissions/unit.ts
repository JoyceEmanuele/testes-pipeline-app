import * as httpRouter from '../apiServer/httpRouter'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'

httpRouter.privateRoutes['/permissions/get-permissions-on-unit'] = async function (reqParams, session) {
  if (reqParams.CLIENT_ID === undefined) throw Error('Invalid parameters! Missing CLIENT_ID').HttpStatus(400)
  if (reqParams.UNIT_ID === undefined) throw Error('Invalid parameters! Missing CLIENT_ID').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);

  return {
      canManageDevs: perms.canManageDevs,
      canViewDevs: perms.canViewDevs,
      canChangeDeviceOperation: perms.canChangeDeviceOperation,
      canManageObservations: perms.canManageObservations,
      canViewObservations: perms.canViewObservations,
      canManageSketches: perms.canManageSketches,
   }
}



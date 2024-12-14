import * as httpRouter from '../apiServer/httpRouter'
import { apiMainService } from '../extServices/mainServiceApi'

httpRouter.privateRoutes['/mainservice/notifications/view-notification'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService['PATCH /mainservice/notifications/view-notification'](
      reqParams,
      authHeader
    )
  }

httpRouter.privateRoutes['/mainservice/notifications/view-all-notifications'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'POST /mainservice/notifications/view-all-notifications'
    ](reqParams, authHeader)
  }

httpRouter.privateRoutes['/mainservice/notifications/get-notifications'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService['GET /mainservice/notifications/get-notifications'](
      reqParams,
      authHeader
    )
  }

httpRouter.privateRoutes['/mainservice/notifications/get-count-notifications'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'GET /mainservice/notifications/get-count-notifications'
    ](reqParams, authHeader)
  }

httpRouter.privateRoutes['/mainservice/api-registries/get-apis'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'POST /mainservice/api-registries/get-apis'
    ](reqParams, authHeader)
  }

httpRouter.privateRoutes['/mainservice/api-registries/get-combo-opts'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'GET /mainservice/api-registries/get-combo-opts'
    ](reqParams, authHeader)
  }

httpRouter.privateRoutes['/mainservice/api-registries'] =
  async function (body, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'POST /mainservice/api-registries'
    ](body, authHeader)
  }

httpRouter.privateRoutes['/mainservice/api-registries/delete-apis'] =
  async function (body, session, { req }) {
    const authHeader = req.get('Authorization')
    return apiMainService[
      'POST /mainservice/api-registries/delete-apis'
    ](body, authHeader)
  }

  httpRouter.privateRoutes['/mainservice/api-registries/update-api'] =
  async function (reqParams, session, { req }) {
    const authHeader = req.get('Authorization');
    return apiMainService[
      'PATCH /mainservice/api-registries/update-api/:id'
    ](reqParams.id, reqParams.body, authHeader);
  };

import * as httpRouter from '../apiServer/httpRouter'

httpRouter.privateRoutes['/ness/get-meters-list'] = async function (reqParams, session) {
  throw Error('Not implemented').HttpStatus(501);
}
httpRouter.privateRoutes['/ness/get-meter-history'] = async function (reqParams, session) {
  throw Error('Not implemented').HttpStatus(501);
}

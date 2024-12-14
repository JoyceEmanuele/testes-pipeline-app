import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'

httpRouter.privateRoutes['/config/add-manufact-devs'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403);
  const related = await sqldb.MANUFACT_DEVS.getRelated({
    IDSTART: reqParams.IDSTART,
    IDEND: reqParams.IDEND,
  });
  if (related.length !== 0) {
    throw Error('A faixa informada já está associada').HttpStatus(400);
  }
  await sqldb.MANUFACT_DEVS.w_insert({
    IDSTART: reqParams.IDSTART,
    IDEND: reqParams.IDEND,
    CLIENT_ID: reqParams.CLIENT_ID,
  }, session.user)
  return sqldb.MANUFACT_DEVS.getInfo({
    DEV_ID: reqParams.IDSTART,
  })
}

httpRouter.privateRoutes['/config/delete-manufact-devs'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  const { affectedRows } = await sqldb.MANUFACT_DEVS.w_deleteRow({
    IDSTART: reqParams.IDSTART,
    IDEND: reqParams.IDEND,
  }, session.user);
  return `DELETED ${affectedRows}`
}

httpRouter.privateRoutes['/config/get-manufact-devs'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  const list = await sqldb.MANUFACT_DEVS.getList()
  return { list }
}

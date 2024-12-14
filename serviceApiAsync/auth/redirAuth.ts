import servConfig from '../../configfile'
import * as uuid from 'uuid'
import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'

interface DataToFront {
  topage: string
}

httpRouter.privateRoutes['/login/craft-redirect-to-dash-token'] = async function (reqParams, session) {
  if (!session.user) throw Error('Invalid user').HttpStatus(500);
  await sqldb.USERSTOKENS.w_deleteTokenType({ EMAIL: session.user, TKTYPE: 'RDTODASH' }, session.user);

  const TOKEN = uuid.v4();
  const dataToFront: DataToFront = { topage: reqParams.topage };
  await sqldb.USERSTOKENS.w_insert({
    TOKEN,
    EMAIL: session.user,
    DAT_ISSUE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    TKTYPE: 'RDTODASH',
    EXTRADATA: JSON.stringify(dataToFront),
  }, session.user);

  return {
    rdtoken: TOKEN,
    dashUrl: servConfig.frontRdToDashUrl.replace('$RDTOKEN$', TOKEN),
  }
}

httpRouter.privateRoutes['/login/craft-static-user-token'] = async function (reqParams, session) {
  if (!session.permissions.isMasterUser) throw Error('Acesso negado').HttpStatus(403);
  if (!reqParams.userId) throw Error('Usuário não informado').HttpStatus(400);
  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: reqParams.userId });
  if (!userInfo) throw Error('Usuário não encontrado').HttpStatus(400);
  await sqldb.USERSTOKENS.w_deleteTokenType({ EMAIL: session.user, TKTYPE: 'SUTK' }, session.user);

  const TOKEN = uuid.v4();
  await sqldb.USERSTOKENS.w_insert({
    TOKEN,
    EMAIL: userInfo.EMAIL,
    DAT_ISSUE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    TKTYPE: 'SUTK',
    EXTRADATA: null, // JSON.stringify({}),
  }, session.user);

  return {
    sutoken: TOKEN,
  }
}

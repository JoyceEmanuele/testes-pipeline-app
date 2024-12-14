import * as httpRouter from '../apiServer/httpRouter'
import * as dacAlerts from '../notifs/dacAlerts'
import sqldb from '../../srcCommon/db'

httpRouter.privateRoutes['/users/set-notif-unitrep'] = async function (reqParams, session) {
  reqParams.USER = reqParams.USER || session.user
  if (!reqParams.USER) throw Error('Invalid USER.').HttpStatus(400)
  if (!['NONE', 'DAY', 'WEEK', 'MONTH'].includes(reqParams.FREQ)) throw Error('Invalid FREQ.').HttpStatus(400)
  let UNITREPFILT
  if (reqParams.FILT_TYPE === 'DAC') UNITREPFILT = `DACS:,${reqParams.FILT_IDS.join(',')},`
  else if (reqParams.FILT_TYPE === 'GROUP') UNITREPFILT = `GROUPS:,${reqParams.FILT_IDS.join(',')},`
  else if (reqParams.FILT_TYPE === 'UNIT') UNITREPFILT = `UNITS:,${reqParams.FILT_IDS.join(',')},`
  else UNITREPFILT = null

  const { affectedRows } = await sqldb.DASHUSERS.w_updateUser({
    UNITREP: reqParams.FREQ,
    UNITREPFILT,
    EMAIL: reqParams.USER
  }, session.user)
  return 'UPDATED ' + affectedRows
}

httpRouter.privateRoutes['/users/get-notif-unitrep'] = async function (_reqParams, session) {
  const userInfo = await sqldb.DASHUSERS.getUserData_reports({ USER: session.user });
  if (!userInfo) throw Error('Could not find USER.').HttpStatus(400);

  const filter: string = userInfo.UNITREPFILT
  let FILT_TYPE: string = null
  let FILT_IDS: string[] | number[] = null
  if (filter && filter.startsWith('DACS:')) {
    FILT_TYPE = 'DAC'
    FILT_IDS = filter.substr('DACS:'.length).split(',').filter(x => !!x)
  }
  if (filter && filter.startsWith('GROUPS:')) {
    FILT_TYPE = 'GROUP'
    FILT_IDS = filter.substr('GROUPS:'.length).split(',').filter(x => !!x).map(x => Number(x))
  }
  if (filter && filter.startsWith('UNITS:')) {
    FILT_TYPE = 'UNIT'
    FILT_IDS = filter.substr('UNITS:'.length).split(',').filter(x => !!x).map(x => Number(x))
  }
  const data = {
    USER: userInfo.EMAIL,
    FILT_TYPE,
    FILT_IDS,
    FREQ: userInfo.UNITREP || 'WEEK',
    filter: '?'
  }
  let clientIds: number[] = undefined;
  if (!session.permissions.isAdminSistema) {
    clientIds = (await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL })).map(x => x.CLIENT_ID);
  }
  data.filter = await dacAlerts.getFilterDescArr(data, clientIds);
  return data
}


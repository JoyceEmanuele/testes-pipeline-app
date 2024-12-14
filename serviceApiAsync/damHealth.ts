import { FaultsActs } from '../srcCommon/types'
import sqldb from '../srcCommon/db'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import * as httpRouter from './apiServer/httpRouter'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm';
import * as eventHooks from './realTime/eventHooks'
import { saveFaultsData } from '../srcCommon/dam/damHealth'

httpRouter.privateRoutes['/dam/clear-fault-daminop'] = async function (reqParams, session) {
  if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Permission denied!').HttpStatus(403)

  const damInf = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.damId });
  if (!damInf) throw Error('Invalid dam!').HttpStatus(400)

  const faultsData = jsonTryParse<FaultsActs>(damInf.FAULTSDATA) || {};

  delete faultsData['DAMNOP'];
  await saveFaultsData(reqParams.damId, faultsData, session.user);

  eventHooks.damFaults_clearDamNOp(reqParams.damId);

  return { DAM_ID: damInf.DAM_ID, damInop: false };
}

httpRouter.privateRoutes['/get-dams-faults'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else { throw Error('Not allowed').HttpStatus(403) }

  const admPars: Parameters<typeof sqldb.DAMS.getDamsList>[1] = {
    includeFaultsData: true,
    includeDacs: true,
  }
  const qPars: Parameters<typeof sqldb.DAMS.getDamsList>[0] = {
    clientIds: reqParams.clientIds,
  }
  const list = [];
  const rows = await sqldb.DAMS.getDamsList(qPars, admPars)
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DAM_ID) : undefined,
  });

  for (const regDevRaw of rows) {
    if (!regDevRaw.FAULTSDATA) { continue; }
    const faultsActs = (regDevRaw.FAULTSDATA && jsonTryParse<FaultsActs>(regDevRaw.FAULTSDATA)) || {};
    if (!faultsActs['DAMNOP']) { continue; }

    const regDev = {
      DAM_ID: regDevRaw.DAM_ID,
      CITY_ID: regDevRaw.CITY_ID,
      CITY_NAME: regDevRaw.CITY_NAME,
      STATE_ID: regDevRaw.STATE_ID,
      UNIT_ID: regDevRaw.UNIT_ID,
      UNIT_NAME: regDevRaw.UNIT_NAME,
      CLIENT_NAME: regDevRaw.CLIENT_NAME,
      CLIENT_ID: regDevRaw.CLIENT_ID,
      groupIds: [] as number[],
      groupNames: [] as string[],
      status: null as string,
      fdetected: {
        ['DAMNOP']: {
          id: 'DAMNOP',
          faultName: 'DAM inoperante',
          lastRiseTS: faultsActs['DAMNOP'].lastRiseTS,
          firstRiseTS: faultsActs['DAMNOP'].firstRiseTS,
        }
      },
    };

    regDev.status = lastMessagesTimes.connectionStatus(regDevRaw.DAM_ID) || 'OFFLINE';

    list.push(regDev);
  }

  return { list }
}

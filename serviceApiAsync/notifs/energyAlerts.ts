import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import { getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'
import { getNotifTypes } from '../../srcCommon/helpers/userNotifs';
import * as eventHooks from '../realTime/eventHooks';
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { EnergyAlertCondPars } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';

httpRouter.privateRoutes['/energy/add-notification-request'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('CLIENT_ID required').HttpStatus(400);
  if (!reqParams.NOTIF_DESTS) throw Error('NOTIF_DESTS required').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClientNotifs) { } // OK
  else if (perms.isClientUser) {
    reqParams.NOTIF_DESTS = [session.user];
  }
  else throw Error('Permission denied').HttpStatus(403);

  const clientUsers = await sqldb.USERSCLIENTS.getClientUsers({ clientIds: [reqParams.CLIENT_ID] });
  const adminUsers = await sqldb.DASHUSERS.getUsersWithPermA();
  reqParams.NOTIF_DESTS = reqParams.NOTIF_DESTS.filter(userId => clientUsers.some(y => y.USER_ID === userId) || adminUsers.some(y => y.EMAIL === userId));
  if (!reqParams.NOTIF_DESTS.length) throw Error('No valid users').HttpStatus(400);

  const FILT_DEVS = prepareNotificationParameters({
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    FILT_TYPE: reqParams.FILT_TYPE,
    FILT_IDS: reqParams.FILT_IDS,
  });

  const DAT_CREATE = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300'

  const { insertId } = await sqldb.NOTIFSCFG.w_insert({
    NAME: reqParams.NAME,
    CLIENT_ID: reqParams.CLIENT_ID,
    FILT_DEVS,
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    COND_VAL: null,
    COND_SECONDARY_VAL: null,
    DAT_CREATE,
    CREATED_BY: session.user,
    COND_PARS: reqParams.ENERGY_CARDS && JSON.stringify({ energyCards: reqParams.ENERGY_CARDS }),
  }, session.user);
  for (const dest of reqParams.NOTIF_DESTS) {
    await sqldb.NOTIFDESTS.w_insert({ NOTIF_ID: insertId, USER_ID: dest }, session.user)
  }
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
  return { id: insertId }
}

export const resetConditionsEditedCards = function (
  currCards: EnergyAlertCondPars['energyCards'],
  newCards: EnergyAlertCondPars['energyCards']
) {
  newCards.forEach((card) => {
    const equal = currCards.find((x) => JSON.stringify(x) === JSON.stringify(card));
    if (!equal) {
      delete card.detected
      card.schedulesList.forEach((sched) => delete sched.lastMessages);
    }
  })
}

httpRouter.privateRoutes['/energy/edit-notification-request'] = async function (reqParams, session) {
  if (!reqParams.NOTIF_ID) throw Error('Missing notification ID!').HttpStatus(400)

  const notifInfo = await sqldb.NOTIFSCFG.getNotifData({ notifId: reqParams.NOTIF_ID });
  if (!notifInfo) throw Error('Notification not found').HttpStatus(404);
  // TODO: ao remover o acesso de um usuário a um cliente, tem que remover as configurações de notificações envolvendo dados do cliente

  const perms = await getPermissionsOnClient(session, notifInfo.CLIENT_ID);

  if (perms.canManageClientNotifs) { } // OK
  else if (perms.isClientUser && notifInfo.CREATED_BY === session.user) { } // OK
  else { throw Error('Invalid client').HttpStatus(500).DebugInfo(session) }

  const FILT_DEVS = prepareNotificationParameters({
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    FILT_TYPE: reqParams.FILT_TYPE,
    FILT_IDS: reqParams.FILT_IDS,
  });

  const currCards = jsonTryParse<EnergyAlertCondPars>(notifInfo.COND_PARS)?.energyCards || [];
  resetConditionsEditedCards(currCards, reqParams.ENERGY_CARDS);

  const { affectedRows } = await sqldb.NOTIFSCFG.w_update({
    NOTIF_ID: reqParams.NOTIF_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    NAME: reqParams.NAME,
    FILT_DEVS,
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    COND_PARS: reqParams.ENERGY_CARDS && JSON.stringify({ energyCards: reqParams.ENERGY_CARDS }),
  }, session.user);

  if (perms.canManageClientNotifs && reqParams.NOTIF_DESTS) {
    const clientUsers = await sqldb.USERSCLIENTS.getClientUsers({ clientIds: [reqParams.CLIENT_ID] });
    const adminUsers = await sqldb.DASHUSERS.getUsersWithPermA();
    reqParams.NOTIF_DESTS = reqParams.NOTIF_DESTS.filter(userId => clientUsers.some(y => y.USER_ID === userId) || adminUsers.some(y => y.EMAIL === userId));
    if (!reqParams.NOTIF_DESTS.length) throw Error('No valid users').HttpStatus(400);

    await sqldb.NOTIFDESTS.w_deleteDests({ NOTIF_ID: reqParams.NOTIF_ID }, session.user)
    for (const dest of reqParams.NOTIF_DESTS) {
      await sqldb.NOTIFDESTS.w_insert({ NOTIF_ID: reqParams.NOTIF_ID, USER_ID: dest }, session.user)
    }
  }
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
  return 'UPDATED ' + affectedRows
}

function prepareNotificationParameters (reqParams: {
  COND_VAR: string
  COND_OP?: string
  FILT_TYPE: null|string
  FILT_IDS: null|(number[])|(string[])
}) {
  const notifData = getNotifTypes()[reqParams.COND_VAR]
  if (!notifData) throw Error('Invalid notification type!').HttpStatus(400)
  const opData = notifData.ops.find(op => op.value === reqParams.COND_OP)
  if (!opData) throw Error('Invalid condition operator!').HttpStatus(400)

  let FILT_DEVS;
  if (['UNIT', 'DRI'].includes(reqParams.FILT_TYPE)) {
    FILT_DEVS = `${reqParams.FILT_TYPE}:,${reqParams.FILT_IDS.join(',')},`
  } else {
    FILT_DEVS = null
  }

  return FILT_DEVS;
}

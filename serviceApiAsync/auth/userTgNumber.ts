import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse'
import * as dielServices from '../../srcCommon/dielServices'
import { canEditUserInfo, getPermissions } from '../../srcCommon/helpers/permissionControl';

import { logger } from '../../srcCommon/helpers/logger';

const rgx_phoneNumber = /^\+\d+$/;

httpRouter.privateRoutes['/users/send-tg-number-check'] = async function (reqParams, session) {
  // Criar uma rota para solicitar código por Telegram para adicionar número de telefone
  if (!reqParams.USER_ID) throw Error('Invalid properties. Missing USER_ID.').HttpStatus(400);

  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: reqParams.USER_ID });
  if (!userInfo) {
    throw Error('User not found!').HttpStatus(400);
  }
  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: userInfo.EMAIL });
  const editedUserPerms = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);

  if (session.permissions.isAdminSistema) {
    // Master profile can edit any user
  }
  else if (session.user === reqParams.USER_ID) {
    // Users can edit their own information
  }
  else {
    if (editedUserPerms.isAdminSistema) {
      // Usuário admin sistema só pode ser editado por ele mesmo ou pelo master
      throw Error('Not allowed').HttpStatus(403);
    }
    else if (session.permissions.isAdminSistema) {
      // System admins can edit any user that is not system admin
    }
    else {
      if (canEditUserInfo(session.permissions, editedUserPerms) !== true) {
        throw Error('Not allowed').HttpStatus(403);
      }
    }
  }

  if (reqParams.PHONENB === null) {
    const { affectedRows } = await sqldb.DASHUSERS.w_updateUser({
      EMAIL: userInfo.EMAIL,
      PHONENB: null,
    }, session.user);
    return 'UPDATED ' + affectedRows
  }

  if (!reqParams.PHONENB) throw Error('Invalid properties! Missing: PHONENB').HttpStatus(400)
  if (reqParams.PHONENB && !reqParams.PHONENB.match(rgx_phoneNumber)) {
    throw Error('Invalid PHONENB').HttpStatus(400)
  }

  const TOKEN = Math.random().toFixed(5).substr(2);
  await sqldb.USERSTOKENS.w_insert({
    TOKEN,
    EMAIL: userInfo.EMAIL,
    DAT_ISSUE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    TKTYPE: 'PHONENB',
    EXTRADATA: JSON.stringify({ PHONENB: reqParams.PHONENB }),
  }, session.user);

  try {
    await dielServices.telegramInternalApi('/diel-internal/telegram/send-message-to', {
      phoneNumber: reqParams.PHONENB,
      msgText: `Diel Energia\nCódigo: ${TOKEN}`,
    });
  } catch (err) {
    logger.error(err);
    throw Error("Erro ao enviar o código pelo Telegram").HttpStatus(500);
  }

  return 'SENT'
}

httpRouter.privateRoutes['/users/check-tg-number-code'] = async function (reqParams, session) {
  // E outra para confirmar o código
  if (!reqParams.TOKEN) throw Error('Invalid parameters').HttpStatus(400).DebugInfo({ reqParams })
  if (!reqParams.USER_ID) throw Error('Invalid parameters').HttpStatus(400).DebugInfo({ reqParams })

  const now = Date.now();
  const minDate = new Date(now - (3 * 60 * 60 * 1000) - (1 * 60 * 60 * 1000)).toISOString().substr(0, 19) + '-0300';
  const maxDate = new Date(now - (3 * 60 * 60 * 1000)).toISOString().substr(0, 19) + '-0300';
  await sqldb.USERSTOKENS.w_deleteOldTokens({ TKTYPE: 'PHONENB', minDate, maxDate }, session.user);

  const tokenInfo = await sqldb.USERSTOKENS.getTokenData({
    TOKEN: reqParams.TOKEN,
    TKTYPE: 'PHONENB',
    minDate,
    maxDate,
  });
  await sqldb.USERSTOKENS.w_deleteUsedToken({ TOKEN: reqParams.TOKEN }, session.user);
  if (!tokenInfo) {
    // logger.info({ sentence, token, results})
    throw Error('Invalid token').HttpStatus(400)
  }
  const { PHONENB } = jsonTryParse<{ PHONENB: string }>(tokenInfo.EXTRADATA);

  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: tokenInfo.EMAIL })
  if (!userInfo) throw Error('Could not find informed user').HttpStatus(401).DebugInfo(tokenInfo)

  const { affectedRows } = await sqldb.DASHUSERS.w_updateUser({
    EMAIL: tokenInfo.EMAIL,
    PHONENB,
  }, session.user)

  return 'UPDATED ' + affectedRows
}

import * as httpRouter from './apiServer/httpRouter'
import * as iotMessageListener from '../srcCommon/iotMessages/iotMessageListener'
import {
  parseFullProgV4,
  FullProg_v4,
  checkFullProgV4,
  FullProgV4_to_deprecated_FullProgV3,
  FullProgV3_to_FullProgV4,
} from '../srcCommon/helpers/scheduleData'
import sqldb from '../srcCommon/db'
import { getPermissionsOnClient, getPermissionsOnUnit, getUserGlobalPermissions } from '../srcCommon/helpers/permissionControl'
import { logger } from '../srcCommon/helpers/logger'
import { SessionData } from '../srcCommon/types'
import { adjustSchedule, adjustSchedule_v2, saveDesiredprogDAM, saveDesiredprogDAM_v2, saveDesiredprogDUT, saveDesiredprogDUT_v2, sendDevSchedule } from '../srcCommon/helpers/automationControl'
import { DalCommandSetOper, DamCommandSetOper, ScheduleCommand, sendDalCommand_oper, sendDamCommand_oper } from '../srcCommon/iotMessages/devsCommands'
import { MsgDalEchoJson } from '../srcCommon/types/devicesMessages'
import { collectFullDutProg, compareDutProg } from '../srcCommon/dut/dutSchedule'
import { collectFullDamProg } from '../srcCommon/dam/damSchedule'
import * as devsLastComm from '../srcCommon/helpers/devsLastComm';

const rgxDate = /^\d\d\d\d-\d\d-\d\d$/;

interface DamsListInf {
  DAM_ID: string;
  DISAB: number;
  UNIT_ID: number;
  CLIENT_ID: number;
  DESIREDPROG: string;
  LASTPROG: string;
  FU_NOM: number;
}

interface DutsListInf {  
  DUT_ID: string;
  DISAB: number;
  CLIENT_ID: number;
  DESIREDPROG: string;
  LASTPROG: string;
  FU_NOM: number;
}

httpRouter.privateRoutes['/dam/get-programming-v3'] = async function (reqParams, session) {
  if (!reqParams.damId) { throw Error('Missing devId').HttpStatus(400) }
  const damInf = await sqldb.DAMS.getDamBasicInfo({ devId: reqParams.damId });
  if (!damInf) { throw Error('Invalid devId').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, damInf.CLIENT_ID, damInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const programming: FullProg_v4 = await collectFullDamProg({ devId: reqParams.damId, userId: session.user })
  .catch(async () => {
    // if (requireRealResponse) throw Error('Timeout waiting for dev response').HttpStatus(500)
    const damInf = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: reqParams.damId });
    return parseFullProgV4(damInf.LASTPROG);
  })
  .catch(() => {
    return { week: {} } as FullProg_v4;
  });
  return programming;
}
httpRouter.privateRoutesDeprecated['/dam/get-programming-v2'] = async function (reqParams, session) {
  const programming = await httpRouter.privateRoutes['/dam/get-programming-v3'](reqParams, session);
  return FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...programming });
}

async function getListWithProg (reqParams: { damIds: string[], dutIds: string[] }) {
  reqParams.damIds = [...(reqParams.damIds || []).map(x => String(x))];
  const damsList = (reqParams.damIds.length > 0) ? (await sqldb.DAMS.getListWithProgFU({ damIds: reqParams.damIds }, { includeDacs: true })) : [];
  
  reqParams.dutIds = [...(reqParams.dutIds || []).map(x => String(x))];
  const dutsList = (reqParams.dutIds.length > 0) ? (await sqldb.AUTOM_EVAP.getListWithProgFU({ dutIds: reqParams.dutIds })) : [];

  return { dutsList, damsList }
}

function desiredProgThrow(err: Error, session: SessionData, reqParams: { damIds: string[], dutIds: string[] }) {
  logger.error(`msg: ${(err ? err.message : 'ERROR 129')} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
  throw Error((err ? err.message : 'ERROR 129')).HttpStatus(400);
}

async function saveDesiredprog(damsList: DamsListInf[], dutsList: DutsListInf[], desiredProg:FullProg_v4,session: SessionData) {
  for (const damInf of damsList) {
    await saveDesiredprogDAM(damInf.DAM_ID, desiredProg, session.user);
  }

  for (const dutInf of dutsList) {
    await saveDesiredprogDUT(dutInf.DUT_ID, desiredProg, session.user);
  }
}

httpRouter.privateRoutes['/set-full-sched-batch-v2'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) throw Error('Permission denied!').HttpStatus(403)

  const { dutsList, damsList } = await getListWithProg(reqParams)
  if (damsList.length !== reqParams.damIds.length) throw Error('One or more DAMs not found!').HttpStatus(400)
  if (dutsList.length !== reqParams.dutIds.length) throw Error('One or more DUTs not found!').HttpStatus(400)

  Object.entries(reqParams.exceptions || {}).forEach(([day, prog]) => {
    if (!rgxDate.test(day)) throw Error('Data inválida da exceção').Details(400, { errorCode: 'INVALID-EXCEPTION-DATE', frontDebug: { date: day } });
  });

  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      week: reqParams.week,
      exceptions: reqParams.exceptions,
      temprtControl: reqParams.temprtControl,
      ventTime: reqParams.ventTime,
    });
  } catch (err) {
    desiredProgThrow(err as Error, session, reqParams)
  }

  saveDesiredprog(damsList, dutsList, desiredProg, session)

  const promisesDAM = damsList.map(async (damInf) => {
    try {
      const currentProg = parseFullProgV4(damInf.LASTPROG);
      const commands = adjustSchedule(desiredProg, currentProg, false, null);
      await sendDevSchedule(damInf.DAM_ID, commands, session.user, '/set-full-sched-batch-v2');
      const x = await collectFullDamProg({ devId: damInf.DAM_ID, userId: session.user });
      if (!x.week) x.week = {};
      return {
        devId: damInf.DAM_ID,
        ...x,
      };
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      return null;
    }
  });
  const resultsDAM = await Promise.all(promisesDAM);
  const responsesDAM = resultsDAM.filter(x => !!x);

  const promisesDUT = dutsList.map(async (dutInf) => {
    try {
      const currentProg = parseFullProgV4(dutInf.LASTPROG);
      const commands = adjustSchedule(desiredProg, currentProg, false, dutInf.DISAB);
      await sendDevSchedule(dutInf.DUT_ID, commands, session.user, '/set-full-sched-batch-v2');
      const x = await collectFullDutProg({ devId: dutInf.DUT_ID, userId: session.user });
      if (!x.week) x.week = {};
      return {
        devId: dutInf.DUT_ID,
        ...x,
      };
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      return null;
    }
  });
  const resultsDUT = await Promise.all(promisesDUT);
  const responsesDUT = resultsDUT.filter(x => !!x);

  return { responsesDAM, responsesDUT };
}
httpRouter.privateRoutesDeprecated['/set-full-sched-batch'] = async function (reqParams, session) {
  const { responsesDAM, responsesDUT } = await httpRouter.privateRoutes['/set-full-sched-batch-v2']({
    damIds: reqParams.damIds,
    dutIds: reqParams.dutIds,
    ...FullProgV3_to_FullProgV4({ version: 'v3', ...reqParams }),
  }, session);

  return {
    responsesDAM: responsesDAM.map((x) => ({ devId: x.devId, ...FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...x }) })),
    responsesDUT: responsesDUT.map((x) => ({ devId: x.devId, ...FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...x }) })),
  };
}

httpRouter.privateRoutes['/dam/set-programming-v3'] = async function (reqParams, session) {
  const devId = reqParams.damId;
  const damDbInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId });
  if (!damDbInfo) { throw Error('DAM not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, damDbInfo.CLIENT_ID, damDbInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const currentProg = parseFullProgV4(damDbInfo.LASTPROG);
  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      ventTime: reqParams.ventTime,
      week: reqParams.week,
      exceptions: reqParams.exceptions,
      temprtControl: reqParams.temprtControl,
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDAM(devId, desiredProg, session.user);

  const commands = adjustSchedule(desiredProg, currentProg, false, null);

  await sendDevSchedule(devId, commands, session.user, '/dam/set-programming-v3');
  const programming: FullProg_v4 = await collectFullDamProg({ devId, userId: session.user });

  if (!programming.week) programming.week = {};
  return programming;
}

httpRouter.privateRoutes['/dam/delete-all-schedules'] = async function (reqParams, session) {
  const devCode = reqParams.damId;
  const damInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devCode });
  if (!damInfo) { throw Error('DAM not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, damInfo.CLIENT_ID, damInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const currentProg = parseFullProgV4(damInfo.LASTPROG);
  let newProg: FullProg_v4;
  try {
    newProg = checkFullProgV4({
      version: 'v4',
      temprtControl: currentProg.temprtControl,
      exceptions: currentProg.exceptions,
      ventTime: currentProg.ventTime,
      week: {},

    });
  } catch (err) {
    logger.error(`msg error: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDAM(devCode, newProg, session.user);

  const commands = adjustSchedule(newProg, currentProg, false, null);

  await sendDevSchedule(devCode, commands, session.user, '/dam/delete-all-schedules');

  await collectFullDamProg({ devId: devCode, userId: session.user });

  return 'DELETE OK';
}


httpRouter.privateRoutes['/dam/delete-all-exceptions'] = async function (reqParams, session) {
  const devId = reqParams.damId;
  const devInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId });
  if (!devInfo) { throw Error('DAM not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, devInfo.CLIENT_ID, devInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const currentProg = parseFullProgV4(devInfo.LASTPROG);
  let desiredProgWithoutExcepts: FullProg_v4;
  try {
    desiredProgWithoutExcepts = checkFullProgV4({
      ventTime: currentProg.ventTime,
      version: 'v4',
      temprtControl: currentProg.temprtControl,
      week: currentProg.week,
      exceptions: {},
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDAM(devId, desiredProgWithoutExcepts, session.user);

  const commands = adjustSchedule(desiredProgWithoutExcepts, currentProg, false, null);

  await sendDevSchedule(devId, commands, session.user, '/dam/delete-all-exceptions');

  await collectFullDamProg({ devId, userId: session.user });

  return 'DELETE OK';
}


httpRouter.privateRoutes['/dam/update-programming'] = async function (reqParams, session) {
  const devId = reqParams.damId;
  const damDbInfo = await sqldb.DAMS.getDevExtraInfo({ DAM_ID: devId });
  if (!damDbInfo) { throw Error('DAM not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, damDbInfo.CLIENT_ID, damDbInfo.UNIT_ID);
  const permsClient = await getPermissionsOnClient(session, damDbInfo.CLIENT_ID);

  if (!permsClient.canEditProgramming) {
    if (!perms.canManageDevs) {
      throw Error('Permission denied!').HttpStatus(403)
    }
  }

  const currentProg = parseFullProgV4(damDbInfo.LASTPROG);
  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      ventTime: reqParams.ventTime,
      temprtControl: reqParams.temprtControl,
      week: reqParams.week,
      exceptions: reqParams.exceptions,
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDAM_v2(devId, desiredProg, session.user);

  const { status: connectionStatus } = await devsLastComm.loadDeviceConnectionStatus(devId);

  if (connectionStatus !== 'ONLINE') {
    throw Error('Offline device!').HttpStatus(400);
  }

  const commands = adjustSchedule_v2(desiredProg, currentProg, false, null);

  await sendDevSchedule(devId, commands, session.user, '/dam/update-programming');
  const programming: FullProg_v4 = await collectFullDamProg({ devId, userId: session.user });

  if (!programming.week) programming.week = {};
  return programming;
}

httpRouter.privateRoutesDeprecated['/dam/set-programming-v2'] = async function (reqParams, session) {
  const response = await httpRouter.privateRoutes['/dam/set-programming-v3']({
    damId: reqParams.damId,
    ...FullProgV3_to_FullProgV4({ version: 'v3', ...reqParams }),
  }, session);
  return FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...response });
}

httpRouter.privateRoutes['/dam/set-dam-operation'] = async function (reqParams, session) {
  if (!reqParams.dev_id) {
    throw Error('There was an error! Missing dev_id.').HttpStatus(400)
  }
  const devId = reqParams.dev_id
  const dam = await sqldb.DAMS.getDamBasicInfo({ devId })

  const perms = await getPermissionsOnUnit(session, dam.CLIENT_ID, dam.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let commands: DamCommandSetOper[] = [];

  if (reqParams.relay === 'forbid') {
    commands.push({ bypass: 1 }); // bypass: 1 : Ativa o bypass; impede que o equipamento monitorado seja alimentado
  } else if (reqParams.relay === 'allow') {
    commands.push({ bypass: 0 }); // bypass: 0 : Desativa o bypass; permite que o equipamento ligue
  } else if (reqParams.relay === 'onlyfan') {
    commands.push({ bypass: 2 });
  } else if (reqParams.relay === 'thermostat') {
    commands.push({ bypass: 6 });
  } else if (reqParams.mode === 'auto') {
    commands.push({ mode: 'Auto' });
  } else if (reqParams.mode === 'manual') {
    commands.push({ mode: 'Manual' });
  }

  if (commands.length === 0) {
    throw Error('Invalid command request.').HttpStatus(400)
  }

  const promise = iotMessageListener.waitForDamTelemetry((telemetry) => {
    if (!telemetry) return false
    if (telemetry.dev_id !== devId) return false
    return true
  }, 5000)

  for (const command of commands) {
    sendDamCommand_oper(devId, command, session.user);
  }

  return promise;
}

httpRouter.privateRoutes['/dut/set-dut-aut-operation'] = async function (reqParams, session) {
  if (!reqParams.dut_id) {
    throw Error('There was an error! Missing dut_id.').HttpStatus(400);
  }
  const dutId = reqParams.dut_id;
  const dutAut = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: dutId });

  const perms = await getPermissionsOnUnit(session, dutAut.CLIENT_ID, dutAut.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let command: DamCommandSetOper = null
  if (reqParams.mode === 'auto') {
    command = { mode: 'Auto' }
  } else if (reqParams.mode === 'manual') {
    command = { mode: 'Manual' }
  }

  if (!command) {
    throw Error('Invalid command request.').HttpStatus(400)
  }

  const promise = iotMessageListener.waitForDutTelemetry((telemetry) => {
    if (!telemetry) return false
    if (telemetry.dev_id !== dutId) return false
    return true
  }, 5000);

  sendDamCommand_oper(dutId, command, session.user);

  return promise;
}

httpRouter.privateRoutes['/dut/get-programming-v3'] = async function (reqParams, session) {
  if (!reqParams.dutId) { throw Error('Missing dutId').HttpStatus(400) }
  const dutInf = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: reqParams.dutId });
  if (!dutInf) { throw Error('Invalid devId').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, dutInf.CLIENT_ID, dutInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const programming: FullProg_v4 = await dutGetProgrammingV3(reqParams.dutId, session.user)

  return programming;
}
httpRouter.privateRoutesDeprecated['/dut/get-programming-v2'] = async function (reqParams, session) {
  const response = await httpRouter.privateRoutes['/dut/get-programming-v3'](reqParams, session);
  return FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...response });
}

async function trySendFullDutProg(devId: string, commands: ScheduleCommand[], user: string) {
  const attemptsQuantity = 4;

  for (let i = 0; i < attemptsQuantity; i++) {
    try{
      await sendDevSchedule(devId, commands, user, '/dut/set-programming-v3');
      break;
    }
    catch(err) {
      logger.warn(`Erro na tentativa ${i + 1} de sendDevSchedule do dispositivo ${devId}: ${err && (err as Error).message || 'ERROR 419'}`);
      if (i === attemptsQuantity - 1) {
        logger.error({
          message: 'Programação horaria não enviada (sendDevSchedule)',
          devId: devId,
          err: `${err && (err as Error).message || 'ERROR 419'}`
        });
        throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
      }
    }
  }
}

async function tryCollectFullDutProg(devId: string, user: string) {
  const attemptsQuantity = 4;
  let programming: FullProg_v4;
  for (let i = 0; i < attemptsQuantity; i++) {
    try{
      programming = await collectFullDutProg({ devId, userId: user });
      break;
    }
    catch(err) {
      logger.warn(`Erro na tentativa ${i + 1} de collectFullDutProg do dispositivo ${devId}: ${err && (err as Error).message || 'ERROR 419'}`);
      if (i === attemptsQuantity - 1) {
        logger.error({
          message: 'Erro ao buscar a programação horária do dispositivo (collectFullDutProg)',
          devId: devId,
          err: `${err && (err as Error).message || 'ERROR 419'}`
        });
        throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
      }
    }
  }
  return programming;
}

httpRouter.privateRoutes['/dut/set-programming-v3'] = async function (reqParams, session) {
  const devId = reqParams.dutId;
  const dutDbInfo = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });
  if (!dutDbInfo) { throw Error('DUT not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, dutDbInfo.CLIENT_ID, dutDbInfo.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const currentAutomationId = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: devId});
  const currentProg = parseFullProgV4(currentAutomationId?.LAST_PROG);
  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      week: reqParams.week,
      exceptions: reqParams.exceptions,
      ventTime: reqParams.ventTime,
      temprtControl: reqParams.temprtControl,
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDUT(devId, desiredProg, session.user);

  const commands = adjustSchedule_v2(desiredProg, currentProg, false, dutDbInfo.DISAB);

  await trySendFullDutProg(devId, commands, session.user).catch((err) => { throw err; });
  const programming = await tryCollectFullDutProg(devId, session.user).catch((err) => { throw err; });

  if (!programming.week) programming.week = {};

  compareDutProg(desiredProg, programming);

  return programming;
}


httpRouter.privateRoutes['/dut/update-programming'] = async function (reqParams, session) {
  const devId = reqParams.dutId;
  const dutDbInfo = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: devId });
  if (!dutDbInfo) { throw Error('DUT not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, dutDbInfo.CLIENT_ID, dutDbInfo.UNIT_ID);
  const permsClient = await getPermissionsOnClient(session, dutDbInfo.CLIENT_ID);

  if (!permsClient.canEditProgramming) {
    if (!perms.canManageDevs) {
      throw Error('Permission denied!').HttpStatus(403)
    }
  }

  const currentProg = parseFullProgV4(dutDbInfo.LASTPROG);
  let desiredProg: FullProg_v4;
  try {
    desiredProg = checkFullProgV4({
      version: 'v4',
      week: reqParams.week,
      exceptions: reqParams.exceptions,
      ventTime: reqParams.ventTime,
      temprtControl: reqParams.temprtControl,
    });
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 419'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 419').HttpStatus(400);
  }

  await saveDesiredprogDUT_v2(devId, desiredProg, session.user);

  const commands = adjustSchedule_v2(desiredProg, currentProg, false, dutDbInfo.DISAB);

  await sendDevSchedule(devId, commands, session.user, '/dut/update-programming');
  
  const programming: FullProg_v4 = await collectFullDutProg({ devId, userId: session.user });
  if (!programming.week) programming.week = {};

  compareDutProg(desiredProg, programming);

  return programming;
}

httpRouter.privateRoutesDeprecated['/dut/set-programming-v2'] = async function (reqParams, session) {
  const response = await httpRouter.privateRoutes['/dut/set-programming-v3']({
    dutId: reqParams.dutId,
    ...FullProgV3_to_FullProgV4({ version: 'v3', ...reqParams })
  }, session);
  return FullProgV4_to_deprecated_FullProgV3({ version: 'v4', ...response });
}

export async function dutGetProgrammingV3(dutId: string, user: string){
  const programming: FullProg_v4 = await collectFullDutProg({ devId: dutId, userId: user })
  .catch(async () => {
    const dutInf = await sqldb.AUTOM_EVAP.getDevExtraInfo({ DUT_ID: dutId });
    return parseFullProgV4(dutInf.LASTPROG);
  })
  .catch(() => {
    return { version: 'v4', week: {} };
  });

  return programming;
}

/**
 * @swagger
 * /dal/set-dal-operation:
 *   post:
 *     summary: Enviar comandos para DAL
 *     description: Enviar comandos de automação operacional para o DAL
 *     tags:
 *       - DAL
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Informações dos comandos
 *         schema:
 *           type: object
 *           properties:
 *             dalCode:
 *               type: string
 *               description: Código do DAL
 *               required: true
 *             instance:
 *               type: number
 *               description: Instância do Relé para comando de modo de operação
 *               default: ""
 *               required: false
 *             mode:
 *               type: string
 *               description: Modo de operação para o Relé do DAL (AUTO | MANUAL)
 *               default: ""
 *               required: false
 *             relays:
 *               type: array
 *               description: Posições dos Relés para alterar status
 *               default: ""
 *               items:
 *                 type: number
 *               required: false
 *             values:
 *               type: array
 *               description: Valor para status do Relé
 *               items:
 *                 type: number
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Nova telemetria do DAL após envio de comandos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dev_id:
 *                   type: string
 *                   description: Código do DAL
 *                 status:
 *                   type: string
 *                   description: Status da conexão do dispositivo
 *                 Mode:
 *                   type: array
 *                   description: Modo de operação de cada relé
 *                   items:
 *                     type: string (AUTO|MANUAL)
 *                 Relays:
 *                   type: array
 *                   description: Leitura do estado de cada relé
 *                   items:
 *                     type: boolean
 *                 Feedback:
 *                   type: array
 *                   description: Leitura do feedback de cada porta
 *                   items:
 *                     type: boolean
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para envio de comandos
 *       500:
 *         description: Erro interno do servidor
*/
httpRouter.privateRoutes['/dal/set-dal-operation'] = async function (reqParams, session) {
  if (!reqParams.dalCode) {
    throw Error('There was an error! Missing dalCode.').HttpStatus(400)
  }
  const dalInfo = await sqldb.DALS.getBasicInfo({ DAL_CODE: reqParams.dalCode });

  const perms = await getPermissionsOnUnit(session, dalInfo.CLIENT_ID, dalInfo.UNIT_ID);
  if (!perms.canChangeDeviceOperation) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let commands: DalCommandSetOper[] = [];
  let returnEcho: boolean = false;

  if (reqParams.instance != null && reqParams.mode) {
    returnEcho = true;
    commands.push({
      msgtype: "set-operation-mode",
      relays: reqParams.instance,
      mode: reqParams.mode
    });
  } else if (reqParams.relays && reqParams.values) {
    commands.push({
      msgtype: "set-relays",
      relays: reqParams.relays,
      values: reqParams.values,
    });
  }

  if (commands.length === 0) {
    throw Error('Invalid command request.').HttpStatus(400)
  }

  const promise = returnDeviceMsg(returnEcho, dalInfo.DEVICE_CODE);

  for (const command of commands) {
    sendDalCommand_oper(dalInfo.DEVICE_CODE, command, session.user);
  }

  return promise;
}

function returnDeviceMsg (returnEcho: boolean, devId: string) {
  let promise;
  if (returnEcho) {
    promise = getEchoMsg(devId);
  } else {
    promise = iotMessageListener.waitForDalTelemetry((telemetry) => {
    if (!telemetry) return false
    if (telemetry.dev_id !== devId) return false
    return true
  }, 5000);
}

  return promise;
}

function getEchoMsg(devId: string) {
  return iotMessageListener.waitForDalControl((message) => {
    if (!message) return false;
    if (message.dev_id !== devId) return false;
    message = message as MsgDalEchoJson;
    if (message.msgtype !== 'echo_json') return false;
    if (message.json_status === false) throw Error('Error setting DAL status mode').HttpStatus(400);
    return true;
  }, 5000);
}

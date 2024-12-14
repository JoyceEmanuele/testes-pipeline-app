import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as dutInfo from '../dutInfo'
import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import * as eventHooks from '../realTime/eventHooks'
import { getAllowedUnitsView, getPermissionsOnClient, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { logger } from '../../srcCommon/helpers/logger';
import { zeroPad } from '../../srcCommon/helpers/dates'

httpRouter.privateRoutes['/clients/add-new-roomtype'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.RTYPE_NAME) throw Error('Missing parameter: RTYPE_NAME').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canConfigureNewUnits) { } // OK
  else throw Error('Permission denied!').HttpStatus(403);

  let USEPERIOD: string;
  try {
    const fullProg = scheduleData.WorkPeriods_to_FullProgV4(reqParams.workPeriods);
    USEPERIOD = (fullProg && JSON.stringify(fullProg)) || null;
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 70'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 70').HttpStatus(400);
  }

  const { insertId } = await sqldb.ROOMTYPES.w_insert({
    CLIENT_ID: reqParams.CLIENT_ID,
    RTYPE_NAME: reqParams.RTYPE_NAME,
    TUSEMIN: reqParams.TUSEMIN,
    TUSEMAX: reqParams.TUSEMAX,
    USEPERIOD,
    CO2MAX: reqParams.CO2MAX,
    HUMIMAX: reqParams.HUMIMAX,
    HUMIMIN: reqParams.HUMIMIN,
  }, session.user)

  await eventHooks.ramCaches_ROOMTYPES_loadRtypeSched(insertId);
  const info = await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID: insertId });
  const fullProg = scheduleData.parseFullProgV4(info.USEPERIOD);
  const { workPeriods, workPeriodExceptions } = scheduleData.FullProgV4_to_deprecated_WorkPeriods(fullProg);
  delete info.USEPERIOD;
  return { workPeriods, workPeriodExceptions, ...info }
}

httpRouter.privateRoutes['/clients/get-roomtypes-list'] = async function (reqParams, session) {
  if (reqParams.CLIENT_ID) reqParams.CLIENT_IDS = [reqParams.CLIENT_ID];
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.CLIENT_IDS) { reqParams.CLIENT_IDS = allowedClients; }
    reqParams.CLIENT_IDS = reqParams.CLIENT_IDS.filter(x => allowedClients.includes(x));
  }

  const dbList = await sqldb.ROOMTYPES.getRoomTypesList(reqParams)

  const list = dbList.map((row) => {
    const fullProg = scheduleData.parseFullProgV4(row.USEPERIOD);
      const { workPeriods, workPeriodExceptions } = scheduleData.FullProgV4_to_deprecated_WorkPeriods(fullProg);
    delete row.USEPERIOD;
    return { fullProg, workPeriods, workPeriodExceptions, ...row };
  })

  return { rtypes: list }
}

httpRouter.privateRoutes['/clients/edit-roomtype'] = async function (reqParams, session) {
  if (!reqParams.RTYPE_ID) {
    throw Error('Invalid properties. Missing RTYPE_ID.').HttpStatus(400)
  }
  const roomTypeInfo = await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID: reqParams.RTYPE_ID });
  if (!roomTypeInfo) { throw Error('room-type not found').HttpStatus(400); }

  const perms = await getPermissionsOnClient(session, roomTypeInfo.CLIENT_ID);
  if (perms.canManageDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403);

  let USEPERIOD: string;
  try {
    const fullProg = scheduleData.WorkPeriods_to_FullProgV4(reqParams.workPeriods);
    USEPERIOD = (fullProg && JSON.stringify(fullProg)) || null;
  } catch (err) {
    logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 70'} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error((err && (err as Error).message) || 'ERROR 70').HttpStatus(400);
  }

  const { affectedRows } = await sqldb.ROOMTYPES.w_update({
    RTYPE_ID: reqParams.RTYPE_ID,
    RTYPE_NAME: reqParams.RTYPE_NAME,
    TUSEMIN: reqParams.TUSEMIN,
    TUSEMAX: reqParams.TUSEMAX,
    HUMIMAX: reqParams.HUMIMAX,
    HUMIMIN: reqParams.HUMIMIN,
    USEPERIOD,
    CO2MAX: reqParams.CO2MAX,
  }, session.user)

  const info = await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID: reqParams.RTYPE_ID });
  await eventHooks.ramCaches_ROOMTYPES_loadRtypeSched(info.RTYPE_ID);
  const fullProg = scheduleData.parseFullProgV4(info.USEPERIOD);
  const { workPeriods, workPeriodExceptions } = scheduleData.FullProgV4_to_deprecated_WorkPeriods(fullProg);
  delete info.USEPERIOD;

  await changedRoomtypeSchedule({ RTYPE_ID: info.RTYPE_ID, USEPERIOD: info.USEPERIOD }, session.user);

  return { workPeriods, workPeriodExceptions, ...info }
}

httpRouter.privateRoutes['/clients/remove-roomtype'] = async function (reqParams, session) {
  if (!reqParams.RTYPE_ID) {
    throw Error('Invalid properties. Missing RTYPE_ID.').HttpStatus(400)
  }
  const roomTypeInfo = await sqldb.ROOMTYPES.getRoomTypeInfo({ RTYPE_ID: reqParams.RTYPE_ID });
  if (!roomTypeInfo) { throw Error('room-type not found').HttpStatus(400); }

  const perms = getUserGlobalPermissions(session);
  if (!perms.deleteClientUnitsMachinesRooms) {
    throw Error('Permission denied').HttpStatus(403);
  }

  await changedRoomtypeSchedule({ RTYPE_ID: reqParams.RTYPE_ID }, session.user);

  await sqldb.VAVS.w_removeRoomType({  RTYPE_ID: reqParams.RTYPE_ID }, session.user);
  await sqldb.FANCOILS.w_removeRoomType({  RTYPE_ID: reqParams.RTYPE_ID }, session.user);
  const { affectedRows } = await sqldb.ROOMTYPES.w_deleteRow({ RTYPE_ID: reqParams.RTYPE_ID }, { DUTS: true }, session.user)

  eventHooks.ramCaches_ROOMTYPES_deleteRType(roomTypeInfo.RTYPE_ID);

  return `DELETED ` + affectedRows
}

async function changedRoomtypeSchedule (reqParams: { RTYPE_ID: number, USEPERIOD?: string }, userId: string) {
  const duts = await sqldb.DUTS.getListBasic({ RTYPE_ID: reqParams.RTYPE_ID }, {});
  for (const dut of duts) {
    const lastCfgModif = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const lastCfgModifToUpdate = `${lastCfgModif.getUTCFullYear()}-${zeroPad(lastCfgModif.getUTCMonth() + 1, 2)}-${zeroPad(lastCfgModif.getUTCDate(), 2)} ${zeroPad(lastCfgModif.getUTCHours(), 2)}:${zeroPad(lastCfgModif.getUTCMinutes(), 2)}:${zeroPad(lastCfgModif.getUTCSeconds(), 2)}`;
    await sqldb.DEVICES.w_updateInfo({ DEVICE_CODE: dut.DEV_ID, LAST_CFG_MODIF: lastCfgModifToUpdate }, null);
  }
}

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteFromClient(qPars, userId);
  await sqldb.ROOMTYPES.w_deleteFromClient(qPars, { DUTS: true }, userId);
  await eventHooks.ramCaches_ROOMTYPES_loadRtypesScheds();
}

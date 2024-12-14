import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as dutInfo from '../dutInfo'
import * as scheduleData from '../../srcCommon/helpers/scheduleData'
import { checkRoomSchedTurning } from '../../srcCommon/rooms/schedTurning';
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData'
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import { getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { RoomSchedConfig, checkRoomProgValid, parseRoomSchedConfig } from '../../srcCommon/helpers/roomProg'

httpRouter.privateRoutes['/clients/add-new-room'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400);
  if (!reqParams.UNIT_ID) throw Error('Missing parameter: UNIT_ID').HttpStatus(400);
  if (!reqParams.ROOM_NAME) throw Error('Missing parameter: ROOM_NAME').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canConfigureNewUnits) throw Error('Permission denied!').HttpStatus(403);

  const { insertId } = await sqldb.ROOMS.w_insert({
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_ID: reqParams.UNIT_ID,
    ROOM_NAME: reqParams.ROOM_NAME,
  }, session.user);

  const info = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: insertId });
  return { info };
}

httpRouter.privateRoutes['/clients/get-rooms-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const list = await sqldb.ROOMS.getRoomsList({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });

  return { list };
}

httpRouter.privateRoutes['/clients/get-room-info-v2'] = async function (reqParams, session) {
  if (!reqParams.ROOM_ID) { throw Error('ID de grupo inválido').HttpStatus(400) }
  const roomInf = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: reqParams.ROOM_ID });
  if (!roomInf) { throw Error('Grupo não encontrado').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, roomInf.CLIENT_ID, roomInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let roomProgs = parseRoomSchedConfig(roomInf.ROOM_PROGS);
  if (roomProgs) {
    const [progError] = checkRoomProgValid(roomProgs);
    if (progError) {
      eventWarn.typedWarn('SCHED_TURN', progError);
      roomProgs = null;
    }
  }

  const roomProg = parseRoomSchedConfig(roomInf.ROOM_PROGS);
  if (roomProg && roomProg.schedTurn && roomProg.schedTurn.devs) {
    const dutsList = await sqldb.DUTS.getListInRoom({ ROOM_ID: roomInf.ROOM_ID });
    for (const devId of Object.keys(roomProg.schedTurn.devs)) {
      const dutAssociated = dutsList.some((row) => (row.DUT_ID === devId));
      if (!dutAssociated) {
        delete roomProg.schedTurn.devs[devId];
      }
    }
  }

  const response = {
    info: {
      ROOM_ID: roomInf.ROOM_ID,
      CLIENT_ID: roomInf.CLIENT_ID,
      UNIT_ID: roomInf.UNIT_ID,
      ROOM_NAME: roomInf.ROOM_NAME,
      ...roomProg,
    }
  };

  return response;
}
httpRouter.privateRoutesDeprecated['/clients/get-room-info'] = async function (reqParams, session) {
  const { info } = await httpRouter.privateRoutes['/clients/get-room-info-v2'](reqParams, session);
  const progsV2 = info.progs;
  const progsV1 = progsV2 && {
    ON: scheduleData.FullProgV4_to_deprecated_FullProgV3(progsV2.ON && { version: 'v4', ...progsV2.ON }),
    OFF: scheduleData.FullProgV4_to_deprecated_FullProgV3(progsV2.OFF && { version: 'v4', ...progsV2.OFF }),
  };
  return { info: { ...info, progs: progsV1 }};
}

httpRouter.privateRoutes['/clients/set-room-progs-v2'] = async function (reqParams, session) {
  if (!reqParams.ROOM_ID) { throw Error('ID de grupo inválido').HttpStatus(400) }
  const roomInf = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: reqParams.ROOM_ID });
  if (!roomInf) { throw Error('Grupo não encontrado').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, roomInf.CLIENT_ID, roomInf.UNIT_ID);
  if (perms.canManageDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403);

  function adjustParams (temprtControl: FullProg_v4['temprtControl']) {
    if (temprtControl) {
      if (temprtControl.mode !== '3_BACKUP') {
        temprtControl.LTC = null;
      }
      if (!['1_CONTROL', '2_SOB_DEMANDA', '3_BACKUP'].includes(temprtControl.mode)) {
        temprtControl.temperature = null;
      }
    }
  }

  if (reqParams.progs.ON && reqParams.progs.ON.temprtControl) adjustParams(reqParams.progs.ON.temprtControl);
  if (reqParams.progs.OFF && reqParams.progs.OFF.temprtControl) adjustParams(reqParams.progs.OFF.temprtControl);

  const roomProgs: RoomSchedConfig = {
    progs: reqParams.progs && {
      ON: scheduleData.checkFullProgV4(reqParams.progs.ON && { version: 'v4', ...reqParams.progs.ON }),
      OFF: scheduleData.checkFullProgV4(reqParams.progs.OFF && { version: 'v4', ...reqParams.progs.OFF }),
    },
    schedTurn: reqParams.schedTurn && {
      numDays: Number(reqParams.schedTurn.numDays),
      datRef: String(reqParams.schedTurn.datRef), // "YYYY-MM-DD"
      devs: {}, // [devId: string]: ('ON'|'OFF')[]
    },
  };
  for (const [devId, seq] of Object.entries(reqParams.schedTurn.devs)) {
    roomProgs.schedTurn.devs[String(devId)] = seq.map((progType) => {
      if (!['ON', 'OFF'].includes(progType)) throw Error('Programação de revezamento inválida [95]').HttpStatus(400);
      return progType;
    });
    const dutInf = await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: devId });
    if (!dutInf) throw Error(`DUT não encontrado: ${devId}`).HttpStatus(400);
    if (dutInf.UNIT_ID !== roomInf.UNIT_ID) throw Error(`O ${devId} se encontra em outra unidade`).HttpStatus(400);
  }
  const [progError] = checkRoomProgValid(roomProgs);
  if (progError) {
    eventWarn.typedWarn('SCHED_TURN', progError);
    throw Error('Programação de revezamento inválida [102]').HttpStatus(400);
  }

  const { affectedRows } = await sqldb.ROOMS.w_update({
    ROOM_ID: reqParams.ROOM_ID,
    ROOM_PROGS: (roomProgs || null) && JSON.stringify(roomProgs),
  }, session.user);
  if (affectedRows !== 1) throw Error(`Algo deu errado: ${affectedRows}`).HttpStatus(500);

  for (const devId of Object.keys(reqParams.schedTurn.devs)) {
    const roomEnvironment = await sqldb.DEVICES.getRoomFromDevicesInfo({ DEVICE_CODE: devId })
    if (roomEnvironment) {
      if (roomEnvironment.ROOM_ID !== roomInf.ROOM_ID) {
        await sqldb.DUTS_DEVICES_ROOMS.w_deleteRow({ ID: roomEnvironment.DUT_DEVICE_ROOM_ID }, session.user);
        await sqldb.DUTS_DEVICES_ROOMS.w_insert({ DUT_DEVICE_ID: roomEnvironment.DUT_DEVICE_ID, ROOM_ID: roomInf.ROOM_ID }, session.user);
      }
    }
    else {
      await sqldb.DUTS_DEVICES_ROOMS.w_insert({ DUT_DEVICE_ID: roomEnvironment.DUT_DEVICE_ID, ROOM_ID: roomInf.ROOM_ID }, session.user);
    }
  }

  const schedTurnStatus = await checkRoomSchedTurning({ roomId: reqParams.ROOM_ID, userId: session.user, lastComms: null });

  return { success: true, schedTurnStatus };
}
httpRouter.privateRoutesDeprecated['/clients/set-room-progs'] = async function (reqParams, session) {
  const progsV1 = reqParams.progs;
  const progsV2 = progsV1 && {
    ON: scheduleData.FullProgV3_to_FullProgV4(progsV1.ON && { version: 'v3', ...progsV1.ON }),
    OFF: scheduleData.FullProgV3_to_FullProgV4(progsV1.OFF && { version: 'v3', ...progsV1.OFF }),
  };

  return httpRouter.privateRoutes['/clients/set-room-progs-v2']({ ...reqParams, progs: progsV2 }, session);
}

httpRouter.privateRoutes['/clients/edit-room'] = async function (reqParams, session) {
  if (!reqParams.ROOM_ID) throw Error('Missing parameter: ROOM_ID').HttpStatus(400);

  const roomInfo = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: reqParams.ROOM_ID });
  if (!roomInfo) { throw Error('room not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, roomInfo.CLIENT_ID, roomInfo.UNIT_ID);
  if (!perms.canManageDevs) throw Error('Permission denied!').HttpStatus(403);

  const { affectedRows } = await sqldb.ROOMS.w_update({
    ROOM_ID: reqParams.ROOM_ID,
    ROOM_NAME: reqParams.ROOM_NAME,
  }, session.user);

  const info = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: reqParams.ROOM_ID });

  return { info };
}

httpRouter.privateRoutes['/clients/remove-room'] = async function (reqParams, session) {
  if (!reqParams.ROOM_ID) throw Error('Missing parameter: ROOM_ID').HttpStatus(400);

  const roomInfo = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: reqParams.ROOM_ID });
  if (!roomInfo) { throw Error('room not found').HttpStatus(400); }

  const perms = getUserGlobalPermissions(session);
  if (!perms.deleteClientUnitsMachinesRooms) {
    throw Error('Permission denied').HttpStatus(403);
  }

  const { affectedRows } = await sqldb.ROOMS.w_deleteRow({ ROOM_ID: reqParams.ROOM_ID }, { DUTS: true }, session.user)

  return { count: affectedRows };
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  await sqldb.ROOMS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, { DUTS: true }, userId);
}

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DUTS_DEVICES_ROOMS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.ROOMS.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, { DUTS: true }, userId);
}

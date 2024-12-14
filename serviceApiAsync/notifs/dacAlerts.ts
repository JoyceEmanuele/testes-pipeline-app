import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as eventHooks from '../realTime/eventHooks';
import { getAllowedUnitsView, getPermissionsOnClient, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { decodeFilterIds } from '../../srcCommon/helpers/notifications'
import { TFunction } from 'i18next';
import { getNotifTypes } from '../../srcCommon/helpers/userNotifs';

function prepareNotificationParameters (reqParams: {
  COND_VAR: string
  COND_OP: string
  FILT_TYPE: null|string
  FILT_IDS: null|(number[])|(string[])
  CLIENT_ID?: number
}) {
  const notifData = getNotifTypes()[reqParams.COND_VAR]
  if (!notifData) throw Error('Invalid notification type!').HttpStatus(400)
  const opData = notifData.ops.find(op => op.value === reqParams.COND_OP)
  if (!opData) throw Error('Invalid condition operator!').HttpStatus(400)

  let FILT_DEVS;
  if (['DAC', 'GROUP', 'UNIT', 'DUT'].includes(reqParams.FILT_TYPE)) {
    FILT_DEVS = `${reqParams.FILT_TYPE}:,${reqParams.FILT_IDS.join(',')},`
  } else {
    FILT_DEVS = null
  }

  return FILT_DEVS;
}

httpRouter.privateRoutes['/dac/edit-notification-request'] = async function (reqParams, session) {
  if (!reqParams.NOTIF_ID) throw Error('Missing notification ID!').HttpStatus(400)

  const notifInfo = await sqldb.NOTIFSCFG.getNotifData({ notifId: reqParams.NOTIF_ID });
  if (!notifInfo) throw Error('Notification not found').HttpStatus(400);
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
    CLIENT_ID: reqParams.CLIENT_ID,
  });

  const { affectedRows } = await sqldb.NOTIFSCFG.w_update({
    NOTIF_ID: reqParams.NOTIF_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    NAME: reqParams.NAME,
    FILT_DEVS,
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    COND_VAL: reqParams.COND_VAL,
    COND_SECONDARY_VAL: reqParams.COND_SECONDARY_VAL,
    COND_PARS: reqParams.COND_PARS,
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

httpRouter.privateRoutes['/dac/add-notification-request'] = async function (reqParams, session) {
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
    CLIENT_ID: reqParams.CLIENT_ID,
  });

  const DAT_CREATE = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300'

  const { insertId } = await sqldb.NOTIFSCFG.w_insert({
    NAME: reqParams.NAME,
    CLIENT_ID: reqParams.CLIENT_ID,
    FILT_DEVS,
    COND_VAR: reqParams.COND_VAR,
    COND_OP: reqParams.COND_OP,
    COND_VAL: reqParams.COND_VAL,
    COND_SECONDARY_VAL: reqParams.COND_SECONDARY_VAL,
    COND_PARS: reqParams.COND_PARS,
    DAT_CREATE,
    CREATED_BY: session.user
  }, session.user);
  for (const dest of reqParams.NOTIF_DESTS) {
    await sqldb.NOTIFDESTS.w_insert({ NOTIF_ID: insertId, USER_ID: dest }, session.user)
  }
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
  return { id: insertId }
}

httpRouter.privateRoutes['/dac/list-notification-requests'] = async function (reqParams, session, { req }) {
  reqParams.unitIds = (reqParams.unitIds.length > 0 ) ? reqParams.unitIds.map(e => Number(e)) : null
  reqParams.clientIds = (reqParams.clientIds.length > 0 ) ? reqParams.clientIds.map(e => Number(e)) : null

  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllUsersAndNotifications) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(Number(x)));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(Number(x)));
  }

  const qPars: Parameters<typeof sqldb.NOTIFSCFG.getList1>[0] = {
    condVars: reqParams.COND_VAR && [reqParams.COND_VAR],
  };
  if (reqParams.typeIds)  getTypeIdsParams(qPars, reqParams.typeIds);
  if (reqParams.subtypeIds) getSubtypeIdsParams(qPars, reqParams.subtypeIds);
  if (reqParams.clientIds) {
    if (reqParams.clientIds.length > 0) {
      qPars.clientIds = reqParams.clientIds;
    } else {
      qPars.createdBy = session.user;
    }
  }
  const searchTerms = reqParams.searchTerms;

  const results = await sqldb.NOTIFSCFG.getList1(qPars);
  const notifTypes = getNotifTypes(true);
  const promises = results.map(async (row) => {
    const notifData = notifTypes[row.COND_VAR];
    if (!notifData) { return null; } // TODO: add invalid item, logger.info
    const opData = notifData.ops.find(op => op.value === row.COND_OP)
    if (!opData) { return null; } // TODO: add invalid item, logger.info

    let dispValue = row.COND_VAL
    if (opData.unit && (opData.unit !== 'HH:mm')) dispValue += ' ' + opData.unit

    const filter = await getFilterDesc(row, row.CLIENT_ID, req.t, reqParams.unitIds);
    if (filter) {
      const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: row.NOTIF_ID, destinataryIds: reqParams.destinataryIds });
      if (dests.length > 0) {
        return {
          id: row.NOTIF_ID,
          name: row.NAME,
          condition: req.t(opData.describe(row.COND_VAL), {val: row.COND_VAL}), // notifData.name + ' ' + opData.label,
          value: dispValue,
          dests: dests.map(x => x.USER_ID),
          filter,
          clientId: row.CLIENT_ID,
          owner: row.CREATED_BY,
          clientName: row.CLIENT_NAME,
        }
      }
    }
    return null;
    
  })
  const list = await Promise.all(promises)
  const filteredList = list.filter(x => !!x);

  const notificationList = [] as {
    id: number
    name: string
    condition: string
    value: string
    dests: string[]
    filter: string
    clientId: number
    owner: string
    clientName: string
  }[];

  for(const item of filteredList) {
    if (searchTerms && searchTerms.length > 0) {
      let shouldNotInclude = false;
      for (const searchTerm of searchTerms) {
        if (item.clientName && item.clientName.toLowerCase().includes(searchTerm)) { continue; }
        if (item.filter && item.filter.toLowerCase().includes(searchTerm)) { continue; }
        if (item.condition && item.condition.toLowerCase().includes(searchTerm)) { continue; }
        if (item.name && item.name.toLowerCase().includes(searchTerm)) { continue; }

        let found = false;

        for (const dest of item.dests) {
          if (dest && dest.toLowerCase().includes(searchTerm)) { found = true; continue; }
        }

        if (found) continue;

        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }
    notificationList.push(item);
  }
  
  return notificationList;
}

function getTypeIdsParams(qParams: Parameters<typeof sqldb.NOTIFSCFG.getList1>[0], typeIds: number[]) {
  let types: string[] = []
  // TypeIds: 1 - Ambiente
  if (typeIds.includes(1)) {
    types.push('DUT_T')
    types.push('DUT_CO2')
  }

  //TypeIds: 2 - Máquina
  if (typeIds.includes(2)) {
    types.push('HEALTH_IDX')
    types.push('COMP_DUR')
    types.push('NUM_DEPS')
    types.push('COMP_TIME')
    types.push('VRF_COOLAUT')
  }

  // TypeIds: 3 - Utilitário
  if (typeIds.includes(3)) {
    types.push('ENERGY')
    types.push('WATER')
  }

  if (types.length > 0) qParams.typeIds = types
  
}
function getSubtypeIdsParams(qParams: Parameters<typeof sqldb.NOTIFSCFG.getList1>[0], subtypeIds: number[]) {
  let subtypes: string[] = []

   // TypeIds: 1 - Ambiente
   if (subtypeIds.includes(1)) {
    subtypes.push('DUT_T')
    subtypes.push('DUT_CO2')
  }

  // SubtypeIds: 3 - Energia
  if (subtypeIds.includes(3)) {
    subtypes.push('ENERGY')
  }

  // SubtypeIds: 4 - Água
  if (subtypeIds.includes(4)) {
    subtypes.push('WATER')
  }

  // SubtypeIds: 5 - Índice de saúde
  if (subtypeIds.includes(5)) {
    subtypes.push('HEALTH_IDX')
  }

  // SubtypeIds: 6 - Uso de Condensadora
  if (subtypeIds.includes(6)) {
    subtypes.push('COMP_DUR')
    subtypes.push('NUM_DEPS')
    subtypes.push('COMP_TIME')
  }

  // SubtypeIds: 7 - VRF
  if (subtypeIds.includes(7)) {
    subtypes.push('VRF_COOLAUT')
  }

  if (subtypes.length > 0) qParams.subtypeIds = subtypes
}

async function getFilterDesc (row: { FILT_DEVS: string, COND_VAR: string }, clientId: number, t: TFunction, unitIds: number[]) {
  const [FILT_TYPE, FILT_IDS] = row.FILT_DEVS && row.FILT_DEVS.split(':') || []

  let dacs: { DEVICE_CODE: string }[] = [];
  let duts: { DEVICE_CODE: string }[] = [];
  let units: { UNIT_ID: number, UNIT_NAME: string }[] = [];
  let machines: { MACHINE_ID: number, MACHINE_NAME: string }[] = [];
  let energyMeters: { ENERGY_DEVICE_ID: string, ESTABLISHMENT_NAME: string }[] = [];
  if (FILT_TYPE === 'DAC') dacs = await sqldb.DACS_DEVICES.getList({clientIds: [clientId], unitIds: unitIds });
  if (FILT_TYPE === 'DUT') duts = await sqldb.DUTS_DEVICES.getList({clientIds: [clientId], unitIds: unitIds });
  if (FILT_TYPE === 'UNIT') units = await sqldb.CLUNITS.getUnitsList({CLIENT_IDS: [clientId], UNIT_IDS: unitIds });
  if (FILT_TYPE === 'GROUP') machines = await sqldb.MACHINES.getMachinesList({CLIENT_IDS: [clientId], UNIT_IDS: unitIds });
  if (FILT_TYPE === 'DRI' && row.COND_VAR === 'ENERGY') energyMeters = await sqldb.ENERGY_DEVICES_INFO.getList({clientIds: [clientId], unitIds: unitIds }, {})


  let filter
  if (FILT_TYPE === 'DAC') {
    const ids = FILT_IDS.split(',').filter(x => !!x);
    const isFilter = dacs.some(dac => ids.includes(dac.DEVICE_CODE));
    if (!isFilter) return null
    filter = FILT_IDS.split(',').filter(x => !!x).join(', ')
  }
    
  else if (FILT_TYPE === 'DUT') {
    const ids = FILT_IDS.split(',').filter(x => !!x);
    const isFilter = duts.some(dut => ids.includes(dut.DEVICE_CODE));
    if (!isFilter) return null
    filter = FILT_IDS.split(',').filter(x => !!x).join(', ')    
  }
  else if (FILT_TYPE === 'UNIT') {
    const ids = FILT_IDS.split(',').filter(x => !!x).map(x => Number(x));
    const isFilter = units.some(unit => ids.includes(unit.UNIT_ID));
    if (!isFilter) return null
    filter = (ids.length === 1 ? `${t('notificacao.unidade')} ` : `${t('notificacao.unidades')} `) + ids.map(unitId => {
      const unit = units.find(unit => unit.UNIT_ID === unitId);
      return unit && unit.UNIT_NAME || unitId;
    }).join(', ');
  }
  else if (FILT_TYPE === 'GROUP') {
    const ids = FILT_IDS.split(',').filter(x => !!x).map(x => Number(x));
    const isFilter = machines.some(machine => ids.includes(machine.MACHINE_ID));
    if (!isFilter) return null
    filter = (ids.length === 1 ? `${t('notificacao.grupo')} ` : `${t('notificacao.grupos')} `) + ids.map(machineId => {
      const machine = machines.find(machine => machine.MACHINE_ID === machineId);
      return machine && machine.MACHINE_NAME || machineId;
    }).join(', ');
  }
  else if (FILT_TYPE === 'DRI' && row.COND_VAR === 'ENERGY') {
    const ids = FILT_IDS.split(',').filter(x => !!x);
    const isFilter = energyMeters.some(meter => ids.includes(meter.ENERGY_DEVICE_ID));
    if (!isFilter) return null
    filter = (ids.length === 1 ? `${t('notificacao.medidor')} ` : `${t('notificacao.medidores')} `) + ids.map(meterId => {
      const meter = energyMeters.find((meter) => meter.ENERGY_DEVICE_ID === meterId)
      return meter && meter.ESTABLISHMENT_NAME || meterId;
    }).join(', ');
  }
  else filter = t('notificacao.todosOsDispositivos')
  return filter
}

export async function getFilterDescArr (row: { FILT_TYPE: string, FILT_IDS: string[] | number[] }, clientIds: number[]) {
  let filter
  if (row.FILT_TYPE === 'DAC') filter = row.FILT_IDS.join(', ')
  else if (row.FILT_TYPE === 'DUT') filter = row.FILT_IDS.join(', ')
  else if (row.FILT_TYPE === 'UNIT') {
    const ids = (row.FILT_IDS as number[]).map(x => Number(x));
    const units = await sqldb.CLUNITS.getUnitsList({ UNIT_IDS: ids, CLIENT_IDS: clientIds });
    filter = (ids.length === 1 ? 'Unidade ' : 'Unidades ') + ids.map(unitId => {
      const unit = units.find(unit => unit.UNIT_ID === unitId);
      return unit && unit.UNIT_NAME || unitId;
    }).join(', ');
  }
  else if (row.FILT_TYPE === 'GROUP') {
    const ids = (row.FILT_IDS as number[]).map(x => Number(x));
    const machines = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: ids, CLIENT_IDS: clientIds });
    filter = (ids.length === 1 ? 'Grupo ' : 'Grupos ') + ids.map(machineId => {
      const machine = machines.find(machine => machine.MACHINE_ID === machineId);
      return machine && machine.MACHINE_NAME || machineId;
    }).join(', ');
  }
  else filter = 'Todos os dispositivos'
  return filter
}

httpRouter.privateRoutes['/dac/get-notification-request'] = async function (reqParams, session) {
  if (!reqParams.notifId) {
    throw Error('Invalid properties, missing notifId.').HttpStatus(400)
  }
  const row = await sqldb.NOTIFSCFG.getNotifData({
    notifId: reqParams.notifId,
    clientId: reqParams.clientId,
  })
  if (!row) throw Error('Notification not found!').HttpStatus(400)

  // TODO: usuário comum deveria conseguir ver só as próprias
  const perms = await getPermissionsOnClient(session, row.CLIENT_ID);
  
 if (perms.isClientUser || perms.canManageClientNotifs) { /* OK */ }
  else {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const NOTIF_DESTS = (await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: row.NOTIF_ID })).map(x => x.USER_ID)
  const info = Object.assign(row, decodeFilterIds(row.FILT_DEVS, row.CLIENT_ID), { NOTIF_DESTS })

  return info
}

httpRouter.privateRoutes['/dac/remove-notification-request'] = async function (reqParams, session) {
  if (!reqParams.id) { //  && reqParams.allAlerts !== true
    throw Error('Invalid properties, missing id.').HttpStatus(400)
  }
  const row = await sqldb.NOTIFSCFG.getNotifData({ notifId: reqParams.id })
  if (!row) throw Error('Notification not found!').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, row.CLIENT_ID);
  if (perms.canManageClientNotifs) { } // OK
  else if (session.user && row.CREATED_BY === session.user) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  await sqldb.NOTIFDESTS.w_deleteDests({ NOTIF_ID: row.NOTIF_ID }, session.user)
  const { affectedRows } = await sqldb.NOTIFSCFG.w_deleteRow({
    id: reqParams.id,
    clientId: reqParams.clientId,
  }, { NOTIFDESTS: true }, session.user);
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutes['/dac/notifications-options'] = async function (reqParams, session, { req }) {
  const notifTypes = getNotifTypes();
  return {
    notifTypes: Object.keys(notifTypes).map(id => ({
      id,
      name: req.t(notifTypes[id].name),
      ops: notifTypes[id].ops.map(opData => ({ 
        label: req.t(opData.label), 
        value: opData.value, 
        unit: req.t(opData.unit), 
        unit2: req.t(opData.unit2) })),
      type: notifTypes[id].type
    })),
    destTypes: [{ label: 'E-mail', value: 'EMAIL'}], // { label: 'Mensagem SMS', value: 'SMS'}
    frequencyOptions: [
      // { label: 'Diariamente', value: 'DAY' },
      { label: req.t('notificacao.semanalmente'), value: 'WEEK' },
      // { label: 'Mensalmente', value: 'MONTH' },
      { label: req.t('notificacao.naoEnviar'), value: 'NONE' }
    ],
  }
}

export async function deleteFromClient (qPars: { CLIENT_ID: number }, userId: string) {
  // TODO: update in-memory data (devStatus, subscriptions, etc)
  await sqldb.NOTIFDESTS.w_deleteFromClient(qPars, userId);
  await sqldb.NOTIFSCFG.w_deleteFromClient(qPars, { NOTIFDESTS: true }, userId);
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
}

export async function deleteFromUser (qPars: { USER_ID: string }, userId: string) {
  // TODO: update in-memory data (devStatus, subscriptions, etc)
  await sqldb.NOTIFDESTS.w_deleteFromUser(qPars, userId);
  await sqldb.NOTIFSCFG.w_deleteFromUserNoDests({}, { NOTIFDESTS: true }, userId);
  await eventHooks.ramCaches_NOTIFSCFG_updateAllUserNotifs()
}


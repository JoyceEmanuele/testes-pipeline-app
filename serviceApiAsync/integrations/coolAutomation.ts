import * as httpRouter from '../apiServer/httpRouter';
import { getPermissionsOnUnit, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import sqldb from '../../srcCommon/db';
import { coolAutomationApi } from '../../srcCommon/extServices/coolAutomation';
import { addDays_YMD } from '../../srcCommon/helpers/dates';
import { SessionData } from '../../srcCommon/types';
import servConfig from '../../configfile';

const rgxTime = /^((2[0-3])|([0-1][0-9])):[0-5][0-9]$/;

async function userCanReadCoolAutDevice (session: SessionData, coolAutDeviceId: string) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) return true;
  const integrInf = coolAutDeviceId && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: coolAutDeviceId });
  if (!integrInf) { throw Error('Device inválido').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  return perms.canViewDevs;
}
async function userCanReadCoolAutSystem (session: SessionData, coolAutSystemId: string) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) return true;
  const systemInf = coolAutSystemId && await coolAutomationApi('GET /systems/:systemId', { systemId: coolAutSystemId });
  const integrInf = systemInf && systemInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: systemInf.device });
  if (!integrInf) { throw Error('Sistema inválido').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  return perms.canViewDevs;
}
async function userCanReadCoolAutUnit (session: SessionData, coolAutUnitId: string) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) return true;
  const unitInf = coolAutUnitId && await coolAutomationApi('GET /units/:unitId', { unitId: coolAutUnitId });
  const integrInf = unitInf && unitInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: unitInf.device });
  if (!integrInf) { throw Error('Unidade inválida').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  return perms.canViewDevs;
}
async function userCanManageCoolAutUnit (session: SessionData, coolAutUnitId: string) {
  const permsG = getUserGlobalPermissions(session);
  if (permsG.manageAllClientsUnitsAndDevs) return true;
  const unitInf = coolAutUnitId && await coolAutomationApi('GET /units/:unitId', { unitId: coolAutUnitId });
  const integrInf = unitInf && unitInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: unitInf.device });
  if (!integrInf) { throw Error('Unidade inválida').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  return perms.canEditProgramming;
}

httpRouter.privateRoutes['/coolautomation/get-unit-charts'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Faltou o parâmetro unitId').HttpStatus(400); }
  if (!userCanReadCoolAutUnit(session, reqParams.unitId)) throw Error('Acesso negado').HttpStatus(403);

  const startTimeUTC = new Date(`${reqParams.day}T00:00:00-0300`).getTime();
  const endTimeUTC = startTimeUTC + (24 * 60 * 60 * 1000) - 1;
  const [
    unitHist,
    serviceParams,
  ] = await Promise.all([
    coolAutomationApi('GET /service-params/units/:unitId', {
      unitId: reqParams.unitId,
      startTimeUTC,
      endTimeUTC,
      isReduced: true,
    }),
    coolAutomationApi('GET /service-params'),
  ]);

  const tlmFiles = {} as {
    [variable: string]: {
      name: string
      x: number[]
      y: number[]
    }
  };

  for (const [varId, varRange] of Object.entries(unitHist.ranges)) {
    if (typeof varRange.max !== 'number') continue;
    if (typeof varRange.min !== 'number') continue;
    if (!serviceParams[varId]) continue;
    const { title, data_unit_of_measurement } = serviceParams[varId];
    if (varRange.min < -20) continue;
    if (varRange.max > 100) continue;
    tlmFiles[varId] = {
      name: (title && `${title} [${data_unit_of_measurement || '-'}]`) || varId,
      x: [],
      y: [],
    };
  }
  const varIds = Object.keys(tlmFiles);

  const commonx = unitHist.entries.map((row) => Math.round((row.timestamp - startTimeUTC) / 60 / 60) / 1000);

  for (const varId of varIds) {
    const varChart = tlmFiles[varId];
    const y = unitHist.entries.map((row) => row[varId] as number); // (row[varId] != null) ? Number(row[varId]) : null;
    // if (!Number.isFinite(y as number)) y = null;
    varChart.x = commonx;
    varChart.y = y;
  }

  const list = Object.values(tlmFiles);
  // list = [];

  return { list };
}

httpRouter.privateRoutes['/coolautomation/get-unit-history'] = async function (reqParams, session) {
  if (!reqParams.coolAutUnitId) { throw Error('Faltou o parâmetro coolAutUnitId').HttpStatus(400); }
  if (!userCanReadCoolAutUnit(session, reqParams.coolAutUnitId)) throw Error('Acesso negado').HttpStatus(403);

  let dayEnd = reqParams.dayYMD;
  if (reqParams.numDays !== undefined) {
    if ((reqParams.numDays >= 1) && (reqParams.numDays <= 8)) { } // OK
    else throw Error('O período aceitável é de 1 a 8 dias');
    dayEnd = addDays_YMD(dayEnd, reqParams.numDays - 1);
  }

  const startTimeUTC = new Date(`${reqParams.dayYMD}T00:00:00.000-0300`).getTime();
  const endTimeUTC = new Date(`${dayEnd}T23:59:59.999-0300`).getTime();

  const [
    unitHist,
    serviceParams
  ] = await Promise.all([
    coolAutomationApi('GET /service-params/units/:unitId', {
      unitId: reqParams.coolAutUnitId,
      startTimeUTC,
      endTimeUTC,
      isReduced: true,
    }),
    coolAutomationApi('GET /service-params')
  ]);

  const commonX = [] as number[]; // (unitHist.entries || []).map((row) => Math.round((row.timestamp - startTimeUTC) / 60 / 60) / 1000);
  const vars = {} as {
    [varId: string]: {
      name: string
      y: number[]
    }
  };

  for (const [varId, varRange] of Object.entries(unitHist.ranges)) {
    if (typeof varRange.max !== 'number') continue;
    if (typeof varRange.min !== 'number') continue;
    if (!serviceParams[varId]) continue;
    const { title, data_unit_of_measurement } = serviceParams[varId];
    if (varRange.min < -20) continue;
    if (varRange.max > 100) continue;
    vars[varId] = {
      name: (title && `${title} [${data_unit_of_measurement || '-'}]`) || varId,
      y: [], // unitHist.entries.map((row) => row[varId] as number), // (row[varId] != null) ? Number(row[varId]) : null; // if (!Number.isFinite(y as number)) y = null;
    };
  }

  if (unitHist.entries && unitHist.entries.length > 0) {
    const varIds = Object.keys(vars);
    const gapLimit = (endTimeUTC - startTimeUTC) / 500; // se tiver um intervalo maior que 1/500 do período total, tem que inserir null
    let lastTs = startTimeUTC;
    for (const element of unitHist.entries) {
      const telemetry = element;
      if ((telemetry.timestamp - lastTs) > gapLimit) {
        commonX.push(Math.round(((lastTs + (gapLimit / 2)) - startTimeUTC) / 60 / 60) / 1000);
        for (const varId of varIds) {
          vars[varId].y.push(null as number);
        }
      }
      lastTs = telemetry.timestamp;
      commonX.push(Math.round((telemetry.timestamp - startTimeUTC) / 60 / 60) / 1000);
      for (const varId of varIds) {
        const varChart = vars[varId];
        varChart.y.push(telemetry[varId] as number);
      }
    }
  }

  return { vars, commonX };
}

httpRouter.privateRoutes['/coolautomation/get-units-and-systems'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (perms.readAllIntegrationDevices) { } // OK
  else { throw Error('Not allowed').HttpStatus(403); }

  const [
    customers,
    sites,
    devices,
    systems,
    units,
    valsTransl,
  ] = await Promise.all([
    coolAutomationApi('GET /customers'),
    coolAutomationApi('GET /sites'),
    coolAutomationApi('GET /devices'),
    coolAutomationApi('GET /systems'),
    coolAutomationApi('GET /units'),
    getValsTranslations(),
  ]);

  return {
    customers,
    sites,
    devices,
    systems,
    units,
    valsTransl,
  };
}

httpRouter.privateRoutes['/coolautomation/associate-device-to-diel-unit'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllClientsUnitsAndDevs) { } // OK
  else { throw Error('Not allowed').HttpStatus(403); }

  if (!reqParams.dielUnitId) { throw Error('Faltou o parâmetro dielUnitId').HttpStatus(400); }
  if (!reqParams.coolAutSystemId) { throw Error('Faltou o parâmetro coolAutSystemId').HttpStatus(400); }

  const device = await coolAutomationApi('GET /devices/:id', { id: reqParams.coolAutSystemId });
  if (!device) { throw Error('Device não encontrado').HttpStatus(400); }
  // UNIT_ID: unitId,
  // COOLAUT_SITE_ID: (state.combo_selectedCoolAutSite || null) && state.combo_selectedCoolAutSite!.id,
  // Buscar da CoolAutomation todos os sistemas associadas ao site-id.
  await sqldb.INTEGRCOOLAUT.w_insertOrUpdate({
    UNIT_ID: reqParams.dielUnitId,
    COOLAUT_ID: reqParams.coolAutSystemId,
  }, session.user);

  return { success: true };
}

export async function getAllDevices () {
  const devices = await coolAutomationApi('GET /devices');
  return Object.values(devices);
}

export async function getAllSystems () {
  const systems = await coolAutomationApi('GET /systems');
  return Object.values(systems);
}

async function getDeviceSystems (deviceId: string) {
  const fullList = await getAllSystems();
  return fullList.filter((item) => (item.device === deviceId));
}

httpRouter.privateRoutes['/coolautomation/get-system-units'] = async function (reqParams, session) {
  if (!reqParams.coolAutSystemId) { throw Error('Faltou o parâmetro coolAutSystemId').HttpStatus(400); }
  if (!userCanReadCoolAutSystem(session, reqParams.coolAutSystemId)) throw Error('Acesso negado').HttpStatus(403);

  const [
    units,
    valsTransl,
  ] = await Promise.all([
    coolAutomationApi('GET /units'),
    getValsTranslations(),
  ]);

  const list = Object.values(units).filter((unit) => unit.system === reqParams.coolAutSystemId);

  // "activeOperationStatus": 1,
  // "activeOperationMode": 0,
  // "activeFanMode": 4,
  // "activeSwingMode": 4,

  return { list, valsTransl };
}

httpRouter.privateRoutes['/coolautomation/get-device-units'] = async function (reqParams, session) {
  if (!reqParams.coolAutDeviceId) { throw Error('Faltou o parâmetro coolAutDeviceId').HttpStatus(400); }
  if (!userCanReadCoolAutDevice(session, reqParams.coolAutDeviceId)) throw Error('Acesso negado').HttpStatus(403);

  const [
    device,
    valsTransl,
  ] = await Promise.all([
    coolAutomationApi('GET /devices/:id', { id: reqParams.coolAutDeviceId }),
    getValsTranslations(),
  ]);

  if (!device) { throw Error('Device não encontrado').HttpStatus(400); }

  const sitesUnits = await coolAutomationApi('GET /sites/:siteId/units', { siteId: device.site});
  const list = Object.values(sitesUnits).filter((site) => site.airnet != null);

  return { list, valsTransl };
}

httpRouter.privateRoutes['/coolautomation/get-unit-last-telemetry'] = async function (reqParams, session) {
  if (!reqParams.coolAutUnitId) { throw Error('Faltou o parâmetro coolAutUnitId').HttpStatus(400); }
  if (!userCanReadCoolAutUnit(session, reqParams.coolAutUnitId)) throw Error('Acesso negado').HttpStatus(403);

  const startTimeUTC = Date.now() - 60 * 60 * 10000;
  const endTimeUTC = Date.now() + 60 * 60 * 10000;
  const [
    unitHist,
    serviceParams,
    valsTransl,
  ] = await Promise.all([
    coolAutomationApi('GET /service-params/units/:unitId', {
      unitId: reqParams.coolAutUnitId,
      startTimeUTC,
      endTimeUTC,
      isReduced: true,
    }),
    coolAutomationApi('GET /service-params'),
    getValsTranslations(),
  ]);

  const telemetry = {} as {
    [variable: string]: {
      name: string
      y: number
    }
  };

  const lastTelemetry = unitHist.entries && unitHist.entries.pop();

  if (lastTelemetry) {
    for (const [varId, varRange] of Object.entries(unitHist.ranges)) {
      if (typeof varRange.max !== 'number') continue;
      if (typeof varRange.min !== 'number') continue;
      if (!serviceParams[varId]) continue;
      const { title, data_unit_of_measurement } = serviceParams[varId];
      if (varRange.min < -20) continue;
      if (varRange.max > 100) continue;
      telemetry[varId] = {
        name: (title && `${title} [${data_unit_of_measurement || '-'}]`) || varId,
        y: null,
      };
    }
    const varIds = Object.keys(telemetry);
  
    for (const varId of varIds) {
      const varChart = telemetry[varId];
      // if (!Number.isFinite(y as number)) y = null;
      varChart.y = lastTelemetry[varId] as number;
      // "48": { "name": "ON/OFF [-]", "y": 1 },
      // "51": { "name": "Mode [-]", "y": 0 },
      // "52": { "name": "Fan Mode [-]", "y": 4 },
    }
  }

  return { telemetry, valsTransl };
}

httpRouter.privateRoutes['/coolautomation/get-system-programming'] = async function (reqParams, session) {
  if (!reqParams.coolAutSystemId) { throw Error('Faltou o parâmetro coolAutSystemId').HttpStatus(400); }
  if (!userCanReadCoolAutSystem(session, reqParams.coolAutSystemId)) throw Error('Acesso negado').HttpStatus(403);

  const [
    schedules,
  ] = await Promise.all([
    coolAutomationApi('GET /systems/:systemId/schedules', { systemId: reqParams.coolAutSystemId }),
  ]);

  const list = Object.values(schedules);

  return { list };
}

httpRouter.privateRoutes['/coolautomation/get-unit-programming'] = async function (reqParams, session) {
  if (!reqParams.coolAutUnitId) { throw Error('Faltou o parâmetro coolAutUnitId').HttpStatus(400); }
  if (!userCanReadCoolAutUnit(session, reqParams.coolAutUnitId)) throw Error('Acesso negado').HttpStatus(403);

  const [
    schedules,
  ] = await Promise.all([
    coolAutomationApi('GET /units/:unitId/schedules', { unitId: reqParams.coolAutUnitId }),
  ]);

  const list = Object.values(schedules);

  return { list };
}

async function getValsTranslations () {
  const serviceTypes = await coolAutomationApi('GET /services/types');
  const valsTransl = {
    operationStatuses: serviceTypes.operationStatuses,
    operationModes: serviceTypes.operationModesExtended,
    fanModes: serviceTypes.fanModes,
    swingModes: serviceTypes.swingModes,
    unitTypes: {} as { [k: string]: string }, // serviceTypes.unitTypes,
    outdoorUnitTasks: {} as { [k: string]: string }, // serviceTypes.outdoorUnitTasks,
  };
  for (const [text, value] of Object.entries(serviceTypes.unitTypes)) {
    valsTransl.unitTypes[String(value)] = text;
  }
  for (const [text, value] of Object.entries(serviceTypes.outdoorUnitTasks)) {
    valsTransl.outdoorUnitTasks[String(value)] = text;
  }
  return valsTransl;
}

httpRouter.privateRoutes['/coolautomation/control-unit-operation'] = async function (reqParams, session) {
  if (!servConfig.isProductionServer) throw Error('Não permitido fora de produção').HttpStatus(403);
  if (!reqParams.unitId) throw Error('Código de unidade inválido').HttpStatus(400);
  if (!userCanManageCoolAutUnit(session, reqParams.unitId)) throw Error('Acesso negado').HttpStatus(403);

  const responses = {} as {
    setpoint?: null
    mode?: null
    fan?: null
    swing?: null
    switch?: null
  }

  // set unit temperature setpoint
  if (reqParams.setpoint != undefined) {
    if (reqParams.setpoint == null) throw Error("Valor inválido para 'setpoint'").HttpStatus(400);
    responses.setpoint = await coolAutomationApi('PUT /units/:unitId/controls/setpoints', { unitId: reqParams.unitId, setpoint: reqParams.setpoint });
  }

  // set unit operation mode
  if (reqParams.operationMode != undefined) {
    if (reqParams.operationMode == null) throw Error("Valor inválido para 'operationMode'").HttpStatus(400);
    responses.mode = await coolAutomationApi('PUT /units/:unitId/controls/operation-modes', { unitId: reqParams.unitId, operationMode: String(reqParams.operationMode) });
  }

  // set unit fan mode
  if (reqParams.fanMode != undefined) {
    if (reqParams.fanMode == null) throw Error("Valor inválido para 'fanMode'").HttpStatus(400);
    responses.fan = await coolAutomationApi('PUT /units/:unitId/controls/fan-modes', { unitId: reqParams.unitId, fanMode: reqParams.fanMode });
  }

  // set unit swing mode
  if (reqParams.swingMode != undefined) {
    if (reqParams.swingMode == null) throw Error("Valor inválido para 'swingMode'").HttpStatus(400);
    responses.swing = await coolAutomationApi('PUT /units/:unitId/controls/swing-modes', { unitId: reqParams.unitId, swingMode: reqParams.swingMode });
  }

  // set unit switch mode
  if (reqParams.operationStatus != undefined) {
    if (reqParams.operationStatus == null) throw Error("Valor inválido para 'operationStatus'").HttpStatus(400);
    responses.switch = await coolAutomationApi('PUT /units/:unitId/controls/operation-statuses', { unitId: reqParams.unitId, operationStatus: reqParams.operationStatus });
  }

  return { success: true, responses };
}

httpRouter.privateRoutes['/coolautomation/add-unit-schedule'] = async function (reqParams, session) {
  if (!servConfig.isProductionServer) throw Error('Não permitido fora de produção').HttpStatus(403);
  if (!rgxTime.test(reqParams.powerOnTime)) { throw Error('Hora inválida para "powerOnTime"').HttpStatus(400); }
  if (!rgxTime.test(reqParams.powerOffTime)) { throw Error('Hora inválida para "powerOffTime"').HttpStatus(400); }

  const unitInf = reqParams.unitId && await coolAutomationApi('GET /units/:unitId', { unitId: reqParams.unitId });
  const integrInf = unitInf && unitInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: unitInf.device });
  if (!integrInf) { throw Error('Unidade inválida').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  if (!perms.canEditProgramming) { throw Error('Not allowed').HttpStatus(403); }

  const powerOnTime = reqParams.powerOnTime && (Number(reqParams.powerOnTime.substring(0, 2)) * 60 + Number(reqParams.powerOnTime.substring(3, 5)));
  const powerOffTime = reqParams.powerOffTime && (Number(reqParams.powerOffTime.substring(0, 2)) * 60 + Number(reqParams.powerOffTime.substring(3, 5)));

  const newSched = await coolAutomationApi('POST /schedules/units/:unitId', {
    unitId: unitInf.id,
    isDisabled: reqParams.isDisabled, // boolean
    name: reqParams.name, // string
    powerOnTime, // number
    powerOffTime, // number
    setpoint: reqParams.setpoint, // null|number
    scheduleCategory: 1,
    days: reqParams.days, // ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
  });

  return { info: newSched };
}

httpRouter.privateRoutes['/coolautomation/alter-unit-schedule'] = async function (reqParams, session) {
  if (!servConfig.isProductionServer) throw Error('Não permitido fora de produção').HttpStatus(403);
  if ((reqParams.powerOnTime !== undefined) && !rgxTime.test(reqParams.powerOnTime)) { throw Error('Hora inválida para "powerOnTime"').HttpStatus(400); }
  if ((reqParams.powerOffTime !== undefined) && !rgxTime.test(reqParams.powerOffTime)) { throw Error('Hora inválida para "powerOffTime"').HttpStatus(400); }

  const scheduleInf = reqParams.scheduleId && await coolAutomationApi('GET /schedules/:scheduleId', { scheduleId: reqParams.scheduleId });
  const unitInf = scheduleInf && await coolAutomationApi('GET /units/:unitId', { unitId: scheduleInf.unit });
  const integrInf = unitInf && unitInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: unitInf.device });
  if (!integrInf) { throw Error('Programação inválida').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  if (!perms.canEditProgramming) { throw Error('Not allowed').HttpStatus(403); }

  const powerOnTime = reqParams.powerOnTime && (Number(reqParams.powerOnTime.substring(0, 2)) * 60 + Number(reqParams.powerOnTime.substring(3, 5)));
  const powerOffTime = reqParams.powerOffTime && (Number(reqParams.powerOffTime.substring(0, 2)) * 60 + Number(reqParams.powerOffTime.substring(3, 5)));

  const newSched = await coolAutomationApi('PUT /schedules/:scheduleId', {
    scheduleId: scheduleInf.id,
    isDisabled: reqParams.isDisabled, // boolean
    name: reqParams.name, // string
    powerOnTime, // number
    powerOffTime, // number
    setpoint: reqParams.setpoint, // null|number
    // scheduleCategory: 1,
    days: reqParams.days, // ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
  });

  return { info: newSched };
}

httpRouter.privateRoutes['/coolautomation/delete-unit-schedule'] = async function (reqParams, session) {
  if (!servConfig.isProductionServer) throw Error('Não permitido fora de produção').HttpStatus(403);
  const scheduleInf = reqParams.scheduleId && await coolAutomationApi('GET /schedules/:scheduleId', { scheduleId: reqParams.scheduleId });
  const unitInf = scheduleInf && await coolAutomationApi('GET /units/:unitId', { unitId: scheduleInf.unit });
  const integrInf = unitInf && unitInf.device && await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: unitInf.device });
  if (!integrInf) { throw Error('Programação inválida').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, integrInf.CLIENT_ID, integrInf.UNIT_ID);
  if (!perms.canEditProgramming) { throw Error('Not allowed').HttpStatus(403); }

  await coolAutomationApi('DELETE /schedules/:scheduleId', { scheduleId: scheduleInf.id });

  return 'OK';
}

httpRouter.privateRoutes['/coolautomation/debug-alerts'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllIntegrationDevices) { throw Error('Not allowed').HttpStatus(403); }
  const groupedEvents = await getFullEvents({
    startTime: reqParams.startTime && new Date(reqParams.startTime).getTime(),
    endTime: reqParams.endTime && new Date(reqParams.endTime).getTime(),
  });
  return { groupedEvents };
}

async function getFullEvents(reqParams: {
  startTime?: number,
  endTime?: number,
}) {
  const groupedEvents = [] as {
    colSite: string
    colDevice: string
    colSystem: string
    colResources: string
    colEventType: string
    colCode: string
    colDescription: string
    colStatus: string
    firstTs: string
    lastTs: string
    evCount: number
  }[];

  if ((!reqParams.startTime) || (!reqParams.endTime)) {
    reqParams.startTime = reqParams.endTime = undefined;
  } else {
    if ((reqParams.endTime - reqParams.startTime) > 5 * 24 * 60 * 60 * 1000) {
      throw Error('O intervalo solicitado é longo demais').HttpStatus(400);
    }
  }

  const [
    events,
    { errorCodeTypes },
    { eventTypeStrings },
    sitesAll,
    devicesAll,
    systemsAll,
  ] = await Promise.all([
    coolAutomationApi('GET /events', {
      startTime: reqParams.startTime || (Date.now() - 24 * 60 * 60 * 1000),
      endTime: reqParams.endTime || (Date.now() + 10 * 60 * 1000),
      type: 1,
    }),
    coolAutomationApi('GET /services/error-codes'),
    coolAutomationApi('GET /services/types'),
    coolAutomationApi('GET /sites'),
    coolAutomationApi('GET /devices'),
    coolAutomationApi('GET /systems'),
  ]);
  // logger.info(events);
  const statusDescs: { [k: string]: string } = {
    '1': 'Open',
    '2': 'Closed',
  };
  for (const event of Object.values(events)) {
    const eventType = (event.type != null) ? String(event.type) : null;
    const typeDesc = (eventType && eventTypeStrings[eventType]) || null;
    const code = (event.data && String(event.data)) || null;
    const description = (eventType && code && errorCodeTypes[eventType] && errorCodeTypes[eventType][code]) || null;
    const statusDesc = statusDescs[String(event.status)] || String(event.status);
    const eventTime = new Date(event.eventTime - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300';
    
    const colSite = (event.site && ((sitesAll[event.site] && sitesAll[event.site].name) || String(event.site))) || '';
    const colDevice = (event.device && ((devicesAll[event.device] && devicesAll[event.device].name) || String(event.device))) || '';
    const colSystem = (event.system && ((systemsAll[event.system] && systemsAll[event.system].name) || String(event.system))) || '';
    const colResources = (event.resources || []).map(x => x.name).filter(x => !!x).join(', ');
    const colEventType = typeDesc || '';
    const colCode = code || '';
    const colDescription = description || event.trapDescription || '';
    const colStatus = statusDesc || '';
    let eventRow = groupedEvents.find((row) => {
      if (row.colSite !== colSite) return false;
      if (row.colDevice !== colDevice) return false;
      if (row.colSystem !== colSystem) return false;
      if (row.colResources !== colResources) return false;
      if (row.colEventType !== colEventType) return false;
      if (row.colCode !== colCode) return false;
      if (row.colDescription !== colDescription) return false;
      if (row.colStatus !== colStatus) return false;
      return true;
    });
    if (!eventRow) {
      eventRow = {
        colSite,
        colDevice,
        colSystem,
        colResources,
        colEventType,
        colCode,
        colDescription,
        colStatus,
        firstTs: eventTime,
        lastTs: eventTime,
        evCount: 0,
      };
      groupedEvents.push(eventRow);
    }
    if (eventTime < eventRow.firstTs) eventRow.firstTs = eventTime;
    if (eventTime > eventRow.lastTs) eventRow.lastTs = eventTime;
    eventRow.evCount += 1;
  }
  
  // for (const row of groupedEvents) {
  //   // logger.info(JSON.stringify(event));
  //   logger.info(`${row.site} ~ ${row.device} ~ ${row.system} ~ ${row.typeDesc} ~ ${row.code} ~ ${row.description} ~ ${row.evCount} ~ ${row.firstTs} ~ ${row.lastTs}`);
  // }

  return groupedEvents.sort((a, b) => {
    function cpStr(a: string, b: string) {
      if ((a == null) && (b != null)) return 1;
      if ((a != null) && (b == null)) return -1;
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    }
    return (false
      || cpStr(a.colSite, b.colSite)
      || cpStr(a.colDevice, b.colDevice)
      || cpStr(a.colSystem, b.colSystem)
      || cpStr(a.colResources, b.colResources)
      || cpStr(a.colEventType, b.colEventType)
      || cpStr(a.colCode, b.colCode)
      || cpStr(a.colDescription, b.colDescription)
      || cpStr(a.colStatus, b.colStatus)
    );
  });
}

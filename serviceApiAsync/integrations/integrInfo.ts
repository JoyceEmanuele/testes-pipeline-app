import * as httpRouter from '../apiServer/httpRouter';
import { getPermissionsOnUnit, getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import sqldb from '../../srcCommon/db';
import { parseDriVarsCfg } from '../../srcCommon/dri/driInfo';
import * as laager from '../extServices/laagerApi';
import { apiLaarger } from '../../srcCommon/extServices/laagerApi';
import { coolAutomationApi } from '../../srcCommon/extServices/coolAutomation';

httpRouter.privateRoutes['/get-integration-info'] = async function (reqParams, session) {
  switch (reqParams.supplier) {
    case 'diel': {
      const row = await sqldb.DRIS.getExtraInfo({ driId: reqParams.integrId });
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      if (!row) throw Error('Dispositivo não encontrado').HttpStatus(400);
      const electricCircuit = await sqldb.ELECTRIC_CIRCUITS.getInfoDeviceCode({DEVICE_CODE: reqParams.integrId});
      const drisAutomations = await sqldb.DRIS_AUTOMATIONS.getDrisAutomationInfo({DEVICE_CODE: reqParams.integrId});
      const driAutomation = (drisAutomations && drisAutomations.length > 0) ? drisAutomations[0] : null
      const connStatus = await devsLastComm.loadDeviceConnectionStatus(row.DRI_ID);
      const varsCfg = parseDriVarsCfg(row?.VARSCFG);
      return {
        info: {
          STATE_ID: electricCircuit ? electricCircuit.STATE_ID : row.STATE_ID,
          CITY_NAME: electricCircuit ? electricCircuit.CITY_NAME : row.CITY_NAME,
          CLIENT_ID: electricCircuit ? electricCircuit.CLIENT_ID : row.CLIENT_ID,
          CLIENT_NAME: electricCircuit ? electricCircuit.CLIENT_NAME : row.CLIENT_NAME,
          UNIT_ID: electricCircuit ? electricCircuit.UNIT_ID : row.UNIT_ID,
          UNIT_NAME: electricCircuit ? electricCircuit.UNIT_NAME : row.UNIT_NAME,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
          machineName: row.SYSTEM_NAME,
          roomName: row.ROOM_NAME,
          vertical: 'HVAC',
          supplier: 'Diel',
          dataSource: row.DRI_ID,
          integrId: row.DRI_ID,
          equipType: 'físico',
          method: 'MQTT',
          status: connStatus.status || 'OFFLINE',
          establishmentName: electricCircuit ? electricCircuit.ESTABLISHMENT_NAME : '',
          automatedMachine: (driAutomation && driAutomation.MACHINE_NAME) ? driAutomation.MACHINE_NAME : '',
          DEVICE_ID: row.DEVICE_ID
        },
        cardsCfg: row.CARDSCFG,
        dri: {
          chillerName: row.CHILLER_LINE_NAME,
          chillerModel: row.CHILLER_MODEL_NAME,
          application: varsCfg && varsCfg.application,
          protocol: varsCfg && varsCfg.protocol,
          worksheetName: varsCfg && varsCfg.worksheetName,
          driConfigs: varsCfg && varsCfg.driConfigs,
          w_varsList: varsCfg && varsCfg.w_varsList,
          varsList: varsCfg && varsCfg.varsList.map((row) => {
            // as variáveis precisam ter ids únicos dentro de um DRI. No TCP modbus é IP>endereço
            return {
              ...row,
              varId: `${row.address?.ip||''}>${row.address?.id||''}>${row.address?.address||''}`,
            }
          }),
          ecoCfg: {
            ENABLE_ECO: row.ENABLE_ECO,
            ECO_CFG: row.ECO_CFG,
            ECO_OFST_START: row.ECO_OFST_START,
            ECO_OFST_END: row.ECO_OFST_END,
            ECO_INT_TIME: row.ECO_INT_TIME,
            DUT_ID: row.DUT_ID,
          },
          automationCfg: {
            AUTOMATION_INTERVAL: row.AUTOMATION_INTERVAL,
          },
        },
      };
    }
    case 'ness': {
      const row = await sqldb.INTEGRNESS.getExtraInfo({ NESS_ID: reqParams.integrId });
      if (!row) throw Error('Integração não encontrada').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      return {
        info: {
          STATE_ID: row.STATE_ID,
          CITY_NAME: row.CITY_NAME,
          CLIENT_ID: row.CLIENT_ID,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
          CLIENT_NAME: row.CLIENT_NAME,
          UNIT_ID: row.UNIT_ID,
          UNIT_NAME: row.UNIT_NAME,
          machineName: null,
          roomName: null,
          dataSource: row.NESS_ID,
          integrId: row.NESS_ID,
          vertical: 'HVAC',
          supplier: 'NESS',
          equipType: 'físico',
          method: 'API',
          status: null,
        },
      };
    }
    case 'greenant': {
      const gaMeterId = Number(reqParams.integrId);
      const row = await sqldb.CLUNITS.getUnitWithGA({ GA_METER: gaMeterId });
      if (!row) throw Error('Integração não encontrada');
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      return {
        info: {
          STATE_ID: row.STATE_ID,
          CITY_NAME: row.CITY_NAME,
          CLIENT_ID: row.CLIENT_ID,
          CLIENT_NAME: row.CLIENT_NAME,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
          UNIT_ID: row.UNIT_ID,
          UNIT_NAME: row.UNIT_NAME,
          machineName: null,
          roomName: null,
          vertical: 'Energia',
          supplier: 'GreenAnt',
          dataSource: String(row.GA_METER),
          integrId: String(row.GA_METER),
          equipType: 'físico',
          method: 'API',
          status: null,
        },
        cardsCfg: null,
      };
    }
    case 'laager': {
      const unitIdLaager = reqParams.integrId;
      const row = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: unitIdLaager });
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1);
      const { rf_device_id: id } = responseGroup.find((meter) => meter.customer_id === row.LAAGER_CODE);
      let statusResult = await laager.returnStatus(id.toString())
      return {
        info: {
          STATE_ID: row.STATE_ID,
          CITY_NAME: row.CITY_NAME,
          CLIENT_ID: row.CLIENT_ID,
          CLIENT_NAME: row.CLIENT_NAME,
          UNIT_ID: row.UNIT_ID,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
          UNIT_NAME: row.UNIT_NAME,
          machineName: null,
          roomName: null,
          vertical: 'Água',
          supplier: 'Laager',
          dataSource: row.LAAGER_CODE,
          integrId: row.LAAGER_CODE,
          installationLocation: row.INSTALLATION_LOCATION,
          installationDate: row.INSTALLATION_DATE,
          totalCapacity: row.TOTAL_CAPACITY,
          quantityOfReservoirs: row.QUANTITY_OF_RESERVOIRS,
          hydrometerModel: row.HYDROMETER_MODEL,
          equipType: 'físico',
          method: 'API',
          status: statusResult ? 'ONLINE' : 'OFFLINE', 
          DEVICE_ID: row?.LAAGER_DEVICE_ID || undefined,
        },
        cardsCfg: row.CARDSCFG,
      };
    }
    case 'coolautomation': {
      const deviceInf = await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: reqParams.integrId });
      if (!deviceInf) throw Error('Integração não encontrada').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, deviceInf.CLIENT_ID, deviceInf.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      const coolAutDevice = await coolAutomationApi('GET /devices/:id', { id: deviceInf.COOLAUT_ID });
      if (!coolAutDevice) throw Error('Integração não encontrada').HttpStatus(400);
      const site = await coolAutomationApi('GET /sites/:siteId', { siteId: coolAutDevice.site });
      if (!site) throw Error('Integração não encontrada').HttpStatus(400);
      const customerScheds = await coolAutomationApi('GET /customers/:customerId/schedules', { customerId: site.customer });
      const systems = await coolAutomationApi('GET /systems');
      const units = await coolAutomationApi('GET /devices/:deviceId/units', { deviceId: deviceInf.COOLAUT_ID });
      const groups = await coolAutomationApi('GET /sites/:siteId/groups', { siteId: coolAutDevice.site });
      const schedules = {} as {
        [schedId: string]: {
          days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[],
          isDisabled: boolean
          endActionType: number
          scheduleCategory: number
          dates: unknown[]
          name: string
          powerOnTime: number
          powerOffTime?: number
          operationMode?: number
          setpoint: number
          system?: string
          unit?: string
          units?: string[]
          unitName?: string
          id: string
        }
      };

      for(const sched of Object.values(customerScheds)) {
        const system = sched.system && Object.values(systems).find((systemItem) => systemItem.id === sched.system && systemItem.site === coolAutDevice.site);
        const group = sched.group && Object.values(groups).find((groupItem) => groupItem.id === sched.group);
        const unit = sched.unit && Object.values(units).find((unitItem) => unitItem.id === sched.unit);
        if (system) {
          const unitNames = system.units.map((unitId) => units[unitId].name).join(', ');
          schedules[sched.id] = sched;
          schedules[sched.id].units = system.units;
          schedules[sched.id].unitName = unitNames;
        }
        if (group) {
          const unitNames = group.units.map((unitId) => units[unitId].name).join(', ');
          schedules[sched.id] = sched;
          schedules[sched.id].units = group.units;
          schedules[sched.id].unitName = unitNames;
        }
        if (unit) {
          if (!schedules[sched.id]) {
            schedules[sched.id] = sched;
            schedules[sched.id].unitName = unit.name;
          } else {
            schedules[sched.id].unitName += `, ${unit.name}`;
          }
        }
      }

      return {
        info: {
          STATE_ID: deviceInf.STATE_ID,
          CITY_NAME: deviceInf.CITY_NAME,
          CLIENT_ID: deviceInf.CLIENT_ID,
          CLIENT_NAME: deviceInf.CLIENT_NAME,
          UNIT_ID: deviceInf.UNIT_ID,
          TIMEZONE_AREA: deviceInf.TIMEZONE_AREA,
          TIMEZONE_OFFSET: deviceInf.TIMEZONE_OFFSET,
          UNIT_NAME: deviceInf.UNIT_NAME,
          machineName: null,
          roomName: null,
          dataSource: coolAutDevice.name,
          integrId: coolAutDevice.id,
          vertical: 'HVAC',
          supplier: 'CoolAutomation',
          equipType: 'físico',
          method: 'API',
          status: (coolAutDevice.isConnected === true) ? 'ONLINE' : (coolAutDevice.isConnected === false) ? 'OFFLINE' : null,
        },
        cardsCfg: deviceInf.CARDSCFG,
        coolautomation: {
          schedules: Object.values(schedules),
        },
      };
    }
    case 'diel-dma' : {
      const dmaId = reqParams.integrId;
      const row = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: dmaId });
      if (!row) throw Error('Dispositivo não encontrado').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      const { status } = await devsLastComm.loadDeviceConnectionStatus(row.DMA_ID);
      return {
        info: {
          STATE_ID: row.STATE_ID,
          CITY_NAME: row.CITY_NAME,
          CLIENT_ID: row.CLIENT_ID,
          CLIENT_NAME: row.CLIENT_NAME,
          UNIT_ID: row.UNIT_ID,
          TIMEZONE_AREA: row.TIMEZONE_AREA,
          TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
          UNIT_NAME: row.UNIT_NAME,
          machineName: null,
          roomName: null,
          vertical: 'Água',
          supplier: 'Diel',
          dataSource: row.DMA_ID,
          integrId: row.DMA_ID,
          hydrometerModel: row.HYDROMETER_MODEL,
          installationLocation: row.INSTALLATION_LOCATION,
          installationDate: row.INSTALLATION_DATE,
          totalCapacity: row.TOTAL_CAPACITY,
          quantityOfReservoirs: row.QUANTITY_OF_RESERVOIRS,
          equipType: 'Físico',
          method: 'API',
          status: status || 'OFFLINE',
          DEVICE_ID: row.DEVICE_ID,
        },
        cardsCfg: null,
      };
    }
    case 'water-virtual' : {
      if (reqParams.unitId) {
        const row = await sqldb.WATERS.getWaterInfoByUnit({UNIT_ID: reqParams.unitId})
        if (!row) throw Error('Ambiente Virtual não encontrado').HttpStatus(400);
        const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
        if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
        return {
          info: {
            STATE_ID: row.STATE_ID,
            CITY_NAME: row.CITY_NAME,
            CLIENT_ID: row.CLIENT_ID,
            TIMEZONE_AREA: row.TIMEZONE_AREA,
            TIMEZONE_OFFSET: row.TIMEZONE_OFFSET,
            CLIENT_NAME: row.CLIENT_NAME,
            UNIT_ID: row.UNIT_ID,
            UNIT_NAME: row.UNIT_NAME,
            machineName: null,
            roomName: null,
            vertical: 'Água',
            supplier: 'Diel',
            dataSource: null,
            integrId: null,
            hydrometerModel: row.HYDROMETER_MODEL,
            installationLocation: null,
            installationDate: null,
            totalCapacity: row.TOTAL_CAPACITY,
            quantityOfReservoirs: row.QUANTITY_OF_RESERVOIRS,
            equipType: 'Virtual',
            method: 'API',
            status: null, 
          },
          cardsCfg: null,
        };
      }
      else return null
    }
    default: {
      throw Error('Tipo de integração inválido').HttpStatus(400);
    }
  }
}

httpRouter.privateRoutes['/save-integration-info'] = async function (reqParams, session) {
  switch (reqParams.supplier) {
    case 'diel': {
      let row = await sqldb.DRIS.getExtraInfo({ driId: reqParams.integrId });
      if (!row) throw Error('Dispositivo não encontrado').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      const driDeviceInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({DEVICE_CODE: reqParams.integrId});
      if (driDeviceInfo) {
        await sqldb.DRIS_DEVICES.w_updateInfo({
          ID: driDeviceInfo.DRI_DEVICE_ID,
          CARDSCFG: reqParams.cardsCfg,
          // VARSCFG?: string;
        }, session.user);
      }
      return httpRouter.privateRoutes['/get-integration-info']({ supplier: reqParams.supplier, integrId: reqParams.integrId }, session);
    }
    case 'ness': {
      throw Error('Tipo de integração inválido').HttpStatus(400);
    }
    case 'laager': {
      const row = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.integrId });
      if (!row) throw Error('Integração não encontrada').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      await httpRouter.privateRoutes['/laager/set-meter-info']({
        unitId: reqParams.unitId, 
        meterId: reqParams.integrId,
        cardsCfg: reqParams.cardsCfg,
        installationLocation: reqParams.installationLocation,
        installationDate: reqParams.installationDate,
        totalCapacity: reqParams.totalCapacity,
        quantityOfReservoirs: reqParams.quantityOfReservoirs,
        hydrometerModel: reqParams.hydrometerModel,
      }, session);

      return httpRouter.privateRoutes['/get-integration-info']({ supplier: reqParams.supplier, integrId: reqParams.integrId }, session);
    }
    case 'diel-dma': {
      const row = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: reqParams.integrId });
      if (!row) throw Error('Integração não encontrada').HttpStatus(400);
      const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
      if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
      await httpRouter.privateRoutes['/dma/set-dma-info']({
        CLIENT_ID: reqParams.clientId,
        DMA_ID: reqParams.integrId,
        UNIT_ID: reqParams.unitId,
        HYDROMETER_MODEL: reqParams.hydrometerModel,
        INSTALLATION_LOCATION: reqParams.installationLocation,
        INSTALLATION_DATE: reqParams.installationDate,
        TOTAL_CAPACITY: reqParams.totalCapacity,
        QUANTITY_OF_RESERVOIRS: reqParams.quantityOfReservoirs,
      }, session);
      return httpRouter.privateRoutes['/get-integration-info']({ supplier: reqParams.supplier, integrId: reqParams.integrId }, session);
    }
    default: {
      throw Error('Tipo de integração inválido').HttpStatus(400);
    }
  }
}

httpRouter.privateRoutes['/get-integration-dri-info'] = async function (reqParams, session) {
  const row = await sqldb.DRIS.getExtraInfo({ driId: reqParams.integrId });
  if (!row) throw Error('Dispositivo não encontrado').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);
  const varsCfg = parseDriVarsCfg(row && row.VARSCFG);
  return {
    dri: {
      protocol: varsCfg && varsCfg.protocol,
      varsList: varsCfg && varsCfg.varsList.map((row) => {
        // as variáveis precisam ter ids únicos dentro de um DRI. No TCP modbus é IP>endereço
        return {
          ...row,
          varId: `${row.address?.ip||''}>${row.address?.id||''}>${row.address?.address||''}`,
        }
      }),
    },
  };
}

httpRouter.privateRoutes['/get-integration-coolautomation-info'] = async function (reqParams, session) {
  const row = await sqldb.INTEGRCOOLAUT.getExtraInfo({ COOLAUT_ID: reqParams.integrId });
  if (!row) throw Error('Integração não encontrada').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Acesso negado').HttpStatus(403);

  const coolAutDevice = await coolAutomationApi('GET /devices/:id', { id: row.COOLAUT_ID });
  if (!coolAutDevice) throw Error('Integração não encontrada').HttpStatus(400);
  const site = await coolAutomationApi('GET /sites/:siteId', { siteId: coolAutDevice.site });
  if (!site) throw Error('Integração não encontrada').HttpStatus(400);
  const customerScheds = await coolAutomationApi('GET /customers/:customerId/schedules', { customerId: site.customer });
  const units = await coolAutomationApi('GET /devices/:deviceId/units', { deviceId: row.COOLAUT_ID });

  const schedules = {} as {
    [schedId: string]: {
      days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[],
      isDisabled: boolean
      endActionType: number
      scheduleCategory: number
      dates: unknown[]
      name: string
      powerOnTime: number
      powerOffTime?: number
      operationMode?: number
      setpoint: number
      system?: string
      unit?: string
      unitName?: string
      id: string
    }
  };
  for (const unit of Object.values(units)) {
    for (const schedId of (unit.schedules || [])) {
      if (!schedules[schedId]) {
        if (customerScheds[schedId]) {
          schedules[schedId] = customerScheds[schedId];
          schedules[schedId].unitName = unit.name || '';
        }
      } else {
        // mais de uma unidade com mesma programação
        schedules[schedId].unitName += `, ${unit.name}`;
      }
    }
  }

  return {
    coolautomation: {
      schedules: Object.values(schedules),
    }
  };
}

httpRouter.privateRoutes['/laager/get-client-unit'] = async function (reqParams, session) {
  const laagerInfo = await sqldb.LAAGER.getClientUnit({ID: reqParams.laagerId});

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS || session.permissions.isParceiroValidador) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (allowedUnits?.includes(laagerInfo.UNIT_ID) || allowedClients?.includes(laagerInfo.CLIENT_ID)) {
      // OK
    }
    else throw Error('Permission denied!').HttpStatus(403);
  }

  return {
    clientId: laagerInfo.CLIENT_ID,
    unitId: laagerInfo.UNIT_ID
  }
}
(Error.prototype as any).HttpStatus = function (status: number) {
    this.Status = status;
    return this;
  };
  (Error.prototype as any).DebugInfo = function (info: any) {
    this.debugInfo = info;
    return this;
  };
  (Error.prototype as any).Details = function (
    status: number,
    pars: { errorCode: string; frontDebug?: any; debugInfo?: any }
  ) {
    return Object.assign(this, { Status: status }, pars || {});
  };
  
  import sqldb from "../../srcCommon/db";
  import { faker } from "@faker-js/faker";
  import { generateSessionNoPermissions, generateSessionReal } from "./factories/loginFactory";
  import { mockGetPermissionsOnClient } from "../tests/factories/weatherFactory";
  import * as permissionControl from '../../srcCommon/helpers/permissionControl'
  import * as devsLastComm from '../../srcCommon/helpers/devsLastComm'
  import * as eventHooks from '../../serviceApiAsync/realTime/eventHooks'
  import * as eventHooksEcoModeDam from '../../serviceApiAsync/ecoModeDam/eventHooks'
  import * as eventHooksDriAutomation from '../../serviceApiAsync/driAutomation/eventHooks'
  import { setDutRTypeV2, deleteEnvironmentMultiProgDuts } from "../dutInfo";
  import { mockParametersSetDutRType } from './factories/dutInfo';
  
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  
  afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  
export function mockRealtimeCalls() {
  jest.spyOn(devsLastComm, "loadLastMessagesTimes").mockImplementationOnce((): any => ({
    connectionStatus() { return 'ONLINE'; },
  }));
  jest.spyOn(devsLastComm, "loadLastTelemetries").mockImplementationOnce((): any => ({
    lastDacTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDamTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDutTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDutAutTelemetry()  { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDriTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDriTelemetry_raw() { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDmaTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDmtTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    lastDalTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
    connectionStatus() { return 'ONLINE'; },
    lastTS() { return Date.now() - 10 * 1000; },
  }));
  jest.spyOn(eventHooksEcoModeDam, 'ramCaches_DAMS_loadDamsEcoCfg').mockResolvedValue(Promise.resolve({}));
  jest.spyOn(eventHooks, 'ramCaches_DEVACS_loadDacDbInfo').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_loadAutomationRefs').mockResolvedValue({});
  jest.spyOn(eventHooksDriAutomation, 'ramCaches_DRIS_loadDrisCfg').mockResolvedValue(Promise.resolve({}));
  jest.spyOn(eventHooks, 'ramCaches_DUTS_loadDutRoomTypes').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_ROOMTYPES_loadRtypeSched').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_ROOMTYPES_loadRtypesScheds').mockResolvedValue({});
  // jest.spyOn(eventHooks, 'timezoneDevicesInfo').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_TIMEZONES_updatePosixTimezone').mockResolvedValue({});
  // jest.spyOn(eventHooks, 'ramCaches_TIMEZONES_deleteDeviceInfo').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_TIMEZONES_updateTimezoneId').mockResolvedValue({});
  // jest.spyOn(eventHooks, 'ramCaches_TIMEZONES_updateLastDate').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_NOTIFSCFG_updateAllUserNotifs').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_deleteGroupDam').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_setGroupDam').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DUTS_deleteDutRoomPars').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DUTS_setDutRTypeId').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_DUTS_setDutRoomPars').mockResolvedValue({});
  jest.spyOn(eventHooks, 'ramCaches_ROOMTYPES_deleteRType').mockResolvedValue({});
  jest.spyOn(eventHooks, 'damFaults_clearDamNOp').mockResolvedValue({});
}

  describe("dutInfo", () => {
    describe("/dut/set-dut-rtype-v2", () => {
      describe("Success", () => {
        test("rota retorna OK", async () => {
          const params = mockParametersSetDutRType();
          const session = generateSessionReal();
          session.permissions.isAdminSistema = true;
          jest.spyOn(sqldb.DEVICES, 'getClientInfo').mockResolvedValue({
            DEV_ID: faker.string.alpha(),
            CLIENT_ID: Number(faker.string.numeric()),
            PERMS_C: faker.string.alpha()
          })
          jest.spyOn(permissionControl, 'getPermissionsOnClient').mockResolvedValue(mockGetPermissionsOnClient(true))
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_insertUpdate').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_deleteRow').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.DUTS, 'getDevExtraInfo').mockResolvedValue({
            DEV_ID: faker.string.alpha(),
            BT_ID: faker.string.alpha(),
            DAT_BEGMON: faker.string.alpha(),
            ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_NAME: faker.string.alpha(),
            DUT_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            PLACEMENT: 'AMB',
            VARS: faker.string.alpha(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CITY_ID: faker.string.alpha(),
            STATE_ID: faker.string.alpha(),
            CITY_NAME: faker.string.alpha(),
            UNIT_NAME: faker.string.alpha(),
            LAT: faker.string.alpha(),
            LON: faker.string.alpha(),
            TUSEMIN: Number(faker.string.numeric({ exclude: ['0'] })),
            TUSEMAX: Number(faker.string.numeric({ exclude: ['0'] })),
            USEPERIOD: faker.string.alpha(),
            RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            RTYPE_NAME: faker.string.alpha(),
            DUT_DUO_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            SENSOR_AUTOM: Number(faker.string.numeric({ exclude: ['0'] })),
            ENVIRONMENT_ROOM_TYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DUT_REFERENCE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_REFERENCE: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_APPLICATION: faker.string.alpha(),
            TEMPERATURE_OFFSET: faker.number.float(),
          })
          jest.spyOn(sqldb.VAVS, 'w_insertUpdate').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          mockRealtimeCalls();
  
          const response = await setDutRTypeV2(params, session);
          expect(response).toBe("OK");
        });
        test("rota retorna OK com RTYPE null", async () => {
  
          const params =  mockParametersSetDutRType();
          const paramsNull = params as any;
          paramsNull.RTYPE_ID = null;
          const session = generateSessionReal();
          session.permissions.isAdminSistema = true;
          jest.spyOn(sqldb.DEVICES, 'getClientInfo').mockResolvedValue({
            DEV_ID: faker.string.alpha(),
            CLIENT_ID: Number(faker.string.numeric()),
            PERMS_C: faker.string.alpha()
          })
          jest.spyOn(permissionControl, 'getPermissionsOnClient').mockResolvedValue(mockGetPermissionsOnClient(true))
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_insertUpdate').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_deleteRow').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.DUTS, 'getDevExtraInfo').mockResolvedValue({
            DEV_ID: faker.string.alpha(),
            BT_ID: faker.string.alpha(),
            DAT_BEGMON: faker.string.alpha(),
            ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_NAME: faker.string.alpha(),
            DUT_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            PLACEMENT: 'AMB',
            VARS: faker.string.alpha(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CITY_ID: faker.string.alpha(),
            STATE_ID: faker.string.alpha(),
            CITY_NAME: faker.string.alpha(),
            UNIT_NAME: faker.string.alpha(),
            LAT: faker.string.alpha(),
            LON: faker.string.alpha(),
            TUSEMIN: Number(faker.string.numeric({ exclude: ['0'] })),
            TUSEMAX: Number(faker.string.numeric({ exclude: ['0'] })),
            USEPERIOD: faker.string.alpha(),
            RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            RTYPE_NAME: faker.string.alpha(),
            DUT_DUO_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            SENSOR_AUTOM: Number(faker.string.numeric({ exclude: ['0'] })),
            ENVIRONMENT_ROOM_TYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DUT_REFERENCE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_REFERENCE: Number(faker.string.numeric({ exclude: ['0'] })),
            MACHINE_APPLICATION: faker.string.alpha(),
            TEMPERATURE_OFFSET: faker.number.float(),
          })
          jest.spyOn(sqldb.VAVS, 'w_insertUpdateNullRType').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.VAVS, 'w_insertUpdate').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          mockRealtimeCalls();
  
          const response = await setDutRTypeV2(paramsNull, session);
          expect(response).toBe("OK");
        });
      });
      describe("Error", () => {
        test("Invalid properties. Erro clientId.", async () => {
          const params = mockParametersSetDutRType();
          const paramsFake = params as any;
          delete paramsFake.DEVS_INFO;
          const session = generateSessionReal();
          await expect(setDutRTypeV2(paramsFake, session)).rejects.toThrow('There was an error! Invalid properties.')
          .catch((error) => {
            expect(error.httpStatus).toBe('400');
          });
        });
        test("Invalid properties. Erro dev_ids", async () => {
          const params = {
          CLIENT_ID: faker.number.int({ min: 1 }),
          RTYPE_ID: null as any,
          }
          const session = generateSessionReal();
          await expect(setDutRTypeV2(params as any, session)).rejects.toThrow('There was an error! Invalid properties.')
          .catch((error) => {
            expect(error.httpStatus).toBe('400');
          });
        });
        test("Erro parametros", async () => {
          const params =  mockParametersSetDutRType();
          const session = generateSessionReal();
          jest.spyOn(sqldb.DEVICES, 'getClientInfo').mockResolvedValue({
            DEV_ID: faker.string.alpha(),
            CLIENT_ID: Number(faker.string.numeric()),
            PERMS_C: faker.string.alpha()
          })
          jest.spyOn(permissionControl, 'getPermissionsOnClient').mockResolvedValue(mockGetPermissionsOnClient(true))
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_insertUpdate').mockResolvedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_insertUpdate').mockRejectedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_deleteRow').mockRejectedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.DUTS, 'getDevExtraInfo').mockRejectedValue({
            DEV_ID: faker.string.alpha(),
            BT_ID: faker.string.alpha(),
            DAT_BEGMON: faker.string.alpha(),
            ENVIRONMENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_NAME: faker.string.alpha(),
            DUT_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            PLACEMENT: 'AMB',
            VARS: faker.string.alpha(),
            UNIT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CITY_ID: faker.string.alpha(),
            STATE_ID: faker.string.alpha(),
            CITY_NAME: faker.string.alpha(),
            UNIT_NAME: faker.string.alpha(),
            LAT: faker.string.alpha(),
            LON: faker.string.alpha(),
            TUSEMIN: Number(faker.string.numeric({ exclude: ['0'] })),
            TUSEMAX: Number(faker.string.numeric({ exclude: ['0'] })),
            USEPERIOD: faker.string.alpha(),
            RTYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            RTYPE_NAME: faker.string.alpha(),
            DUT_DUO_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            SENSOR_AUTOM: Number(faker.string.numeric({ exclude: ['0'] })),
            ENVIRONMENT_ROOM_TYPE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            ROOM_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            DUT_REFERENCE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
          })
          jest.spyOn(sqldb.VAVS, 'w_insertUpdateNullRType').mockRejectedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          jest.spyOn(sqldb.VAVS, 'w_insertUpdate').mockRejectedValue({
            affectedRows: faker.number.int(),
            insertId: faker.number.int()
          })
          mockRealtimeCalls();
          await expect(setDutRTypeV2(params as any, session)).rejects.toThrow('Error update room type of environments')
          .catch((error) => {
            expect(error.httpStatus).toBe('408');
        });

        });
      });
    });
    describe("/dut/delete-environments", () => {
      describe("Success", () => {
        test("Espera que retorne ok deletando", async () => {
        const params: any = mockParametersSetDutRType();
        delete params.RTYPE_ID;
        const session = generateSessionReal();
        jest.spyOn(sqldb.DUTS_MONITORING, 'w_deleteRow').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        });
        jest.spyOn(permissionControl, 'getPermissionsOnClient').mockResolvedValue({
          canManageClient: true,
          canAddUsersToClient: true,
          canEditProgramming: true,
          isClientUser: true,
          canConfigureNewUnits: true,
          canManageClientNotifs: true,
          canManageDevs: true,
          canViewDevs: true,
          canDeleteDevs: true,
          canManageObservations: true,
          canViewObservations: true,
          canManageSketches: true,
          canViewClientUnits: true,
        });
        jest.spyOn(sqldb.ENVIRONMENTS, 'getEnvironmentsInfo').mockResolvedValue({
          ID: faker.number.int(),
          UNIT_ID: faker.number.int(),
          ENVIRONMENT_NAME: faker.string.alpha(),
          IS_VISIBLE: faker.number.int(),
          ENVIRONMENT_TYPE: faker.string.alpha(),
          ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
          RTYPE_ID: faker.number.int(),
          RTYPE_NAME: faker.string.alpha(),
          CLIENT_ID: faker.number.int(),
        });
        jest.spyOn(sqldb.ENVIRONMENTS_ROOM_TYPES, 'w_deleteRow').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        jest.spyOn(sqldb.ENVIRONMENTS, 'w_deleteRow').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        jest.spyOn(sqldb.REFRIGERATES, 'w_deleteRow').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        jest.spyOn(sqldb.DUTS_REFERENCE, 'w_deleteRowFromEnvironment').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        jest.spyOn(sqldb.DEVICES_UNITS, 'w_deleteFromDeviceCode').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        jest.spyOn(sqldb.DEVICES_CLIENTS, 'w_deleteFromDeviceCode').mockResolvedValue({
          affectedRows: faker.number.int(),
          insertId: faker.number.int(),
        })
        const response = await deleteEnvironmentMultiProgDuts(params, session);
        
        mockRealtimeCalls();
        expect(response).toBe("OK");
        });
      });
      describe("Error", () => {
        test("Erro parametros", async () => {
          const params: any = mockParametersSetDutRType();
          delete params.DEVS_INFO;
          const session = generateSessionReal();
          await expect(deleteEnvironmentMultiProgDuts(params, session)).rejects.toThrow('There was an error! Invalid properties.').catch((error) => {
            expect(error.httpStatus).toBe('400');
          });
        });
        test("Erro permissão", async () => {
          const params: any = mockParametersSetDutRType();
          delete params.RTYPE_ID;
          const session = generateSessionReal();
          jest.spyOn(sqldb.ENVIRONMENTS, 'getEnvironmentsInfo').mockResolvedValue({
            ID: faker.number.int(),
            UNIT_ID: faker.number.int(),
            ENVIRONMENT_NAME: faker.string.alpha(),
            IS_VISIBLE: faker.number.int(),
            ENVIRONMENT_TYPE: faker.string.alpha(),
            ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
            RTYPE_ID: faker.number.int(),
            RTYPE_NAME: faker.string.alpha(),
            CLIENT_ID: faker.number.int(),
          });
          jest.spyOn(permissionControl, 'getPermissionsOnClient').mockResolvedValue({
            canManageClient: false,
            canAddUsersToClient: false,
            canEditProgramming: false,
            isClientUser: false,
            canConfigureNewUnits: false,
            canManageClientNotifs: false,
            canManageDevs: false,
            canViewDevs: false,
            canDeleteDevs: false,
            canManageObservations: true,
            canViewObservations: true,
            canManageSketches: true,
            canViewClientUnits: true
          });
          
          mockRealtimeCalls();
          await expect(deleteEnvironmentMultiProgDuts(params, session)).rejects.toThrow('Error delete environments');
        });
      });
    });
  });
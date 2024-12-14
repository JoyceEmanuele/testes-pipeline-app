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

import sqldb from "../../../srcCommon/db";
import * as factories from "../factories/energyAlertsFactory";
import * as energyAlerts from "../../notifs/energyAlerts";
import * as httpRouter from "../../apiServer/httpRouter";
import { faker } from "@faker-js/faker";
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";
import * as devsLastComm from "../../../srcCommon/helpers/devsLastComm";
import * as eventHooks from "../../realTime/eventHooks";
import * as eventHooksDriAutomation from "../../driAutomation/eventHooks";
import * as eventHooksEcoModeDam from "../../ecoModeDam/eventHooks";
import * as factoriesLogin from "../factories/loginFactory";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

function mockRealtimeCalls() {
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

describe("energyAlerts", () => {
  describe("/energy/add-notification-request", () => {
    describe("Success", () => {
      test("should return the insert notification id", async () => {
        const fakeUserId = faker.string.alphanumeric();
        const fakeClientId = Number(faker.string.numeric({length: 1, exclude: ['0']}));
        const reqParams = {
          COND_VAR: "ENERGY",
          COND_OP: "ECPD",
          FILT_TYPE: "DRI",
          FILT_IDS: ["DRI008220724", "DRI008220863"],
          CLIENT_ID: fakeClientId,
          NAME: "Teste",
          NOTIF_DESTS: [fakeUserId],
          ENERGY_CARDS: [
            {
              condOper: "<",
              limiarInput: "1234",
              allDays: true,
              selectedDays: {
                mon: true,
                tue: true,
                wed: true,
                thu: true,
                fri: true,
                sat: true,
                sun: true,
              },
              schedulesList: [
                {
                  start: "",
                  end: "",
                },
              ],
              allHours: false,
              instant: true,
              endOfDay: false,
            },
          ],
        };
        let session = factoriesLogin.generateSessionReal();

        jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canManageClientNotifs: true })
          );
        jest
          .spyOn(sqldb.USERSCLIENTS, "getClientUsers")
          .mockImplementationOnce((): any =>
            Promise.resolve([{ USER_ID: fakeUserId, CLIENT_ID: fakeClientId }])
          );
        jest
          .spyOn(sqldb.DASHUSERS, "getUsersWithPermA")
          .mockImplementationOnce((): any => Promise.resolve([]));

        const insertId = faker.number.int({ min: 1 });
        jest
          .spyOn(sqldb.NOTIFSCFG, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({ insertId }));
        jest
          .spyOn(sqldb.NOTIFDESTS, "w_insert")
          .mockImplementationOnce((): any =>
            Promise.resolve({
              insertId: faker.number.int({ min: 1 }),
            })
          );
        jest
          .spyOn(sqldb.NOTIFSCFG, "getList1")
          .mockImplementationOnce((): any => Promise.resolve([]));
        mockRealtimeCalls();

        const response = await httpRouter.privateRoutes[
          "/energy/add-notification-request"
        ](reqParams, session);
        expect(response).toMatchObject<{ id: number }>;
        expect(response.id).toBe(insertId);
      });
    });
    describe("Error", () => {
      test("should throw an error if CLIENT_ID not in reqParams", async () => {
        try {
          const reqParams = {};
          let session = factoriesLogin.generateSessionReal();

          await httpRouter.privateRoutes["/energy/add-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/add-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("CLIENT_ID required");
          expect(err).toHaveProperty("Status", 400);
        }
      });
      test("should throw an error if NOTIF_DESTS not in reqParams", async () => {
        try {
          const reqParams = { CLIENT_ID: faker.number.int({ min: 1 }) };
          let session = factoriesLogin.generateSessionReal();

          await httpRouter.privateRoutes["/energy/add-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/add-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("NOTIF_DESTS required");
          expect(err).toHaveProperty("Status", 400);
        }
      });
      test("should throw an error if user has not permission", async () => {
        try {
          const reqParams = {
            CLIENT_ID: faker.number.int({ min: 1 }),
            NOTIF_DESTS: ["devmaster"],
          };
          let session = factoriesLogin.generateSessionReal();

          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockImplementationOnce((): any =>
              Promise.resolve({
                canManageClientNotifs: false,
                isClientUser: false,
              })
            );
          await httpRouter.privateRoutes["/energy/add-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/add-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Permission denied");
          expect(err).toHaveProperty("Status", 403);
        }
      });
      test("should throw an error if COND_VAR is not valid", async () => {
        try {
          const fakeUserId = faker.string.alphanumeric();
          const fakeClientId = faker.number.int({ min: 1 });
          const reqParams = {
            CLIENT_ID: fakeClientId,
            NOTIF_DESTS: [fakeUserId],
            COND_VAR: faker.word.noun(),
          };

          let session = factoriesLogin.generateSessionReal();
          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockImplementationOnce((): any =>
              Promise.resolve({
                canManageClientNotifs: true,
              })
            );
          jest
            .spyOn(sqldb.USERSCLIENTS, "getClientUsers")
            .mockImplementationOnce((): any =>
              Promise.resolve([
                { USER_ID: fakeUserId, CLIENT_ID: fakeClientId },
              ])
            );
          jest
            .spyOn(sqldb.DASHUSERS, "getUsersWithPermA")
            .mockImplementationOnce((): any => Promise.resolve([]));

          await httpRouter.privateRoutes["/energy/add-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/add-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Invalid notification type!");
          expect(err).toHaveProperty("Status", 400);
        }
      });
      test("should throw an error if COND_OP is not valid", async () => {
        try {
          const fakeUserId = faker.string.alphanumeric();
          const fakeClientId = faker.number.int({ min: 1 });
          const reqParams = {
            CLIENT_ID: fakeClientId,
            NOTIF_DESTS: [fakeUserId],
            COND_VAR: "ENERGY",
            COND_OP: faker.word.noun(),
          };

          let session = factoriesLogin.generateSessionReal();
          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockImplementationOnce((): any =>
              Promise.resolve({
                canManageClientNotifs: true,
              })
            );
          jest
            .spyOn(sqldb.USERSCLIENTS, "getClientUsers")
            .mockImplementationOnce((): any =>
              Promise.resolve([
                { USER_ID: fakeUserId, CLIENT_ID: fakeClientId },
              ])
            );
          jest
            .spyOn(sqldb.DASHUSERS, "getUsersWithPermA")
            .mockImplementationOnce((): any => Promise.resolve([]));

          await httpRouter.privateRoutes["/energy/add-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/add-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Invalid condition operator!");
          expect(err).toHaveProperty("Status", 400);
        }
      });
    });
  });

  describe("/energy/edit-notification-request", () => {
    describe("Success", () => {
      test("should return the updated message with affectedRows", async () => {
        const reqParams = {
          NOTIF_ID: faker.number.int({ min: 1 }),
          COND_VAR: "ENERGY",
          COND_OP: "ECPD",
          CLIENT_ID: faker.number.int({ min: 1 }),
          NAME: faker.word.noun(),
        };
        let session = factoriesLogin.generateSessionReal();

        jest
          .spyOn(sqldb.NOTIFSCFG, "getNotifData")
          .mockImplementationOnce((): any => {
            const data = factories.generateNotifInfo({
              NOTIF_ID: reqParams.NOTIF_ID,
            });
            return Promise.resolve(data);
          });
        jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canManageClientNotifs: true })
          );
        jest
          .spyOn(eventHooks, "ramCaches_NOTIFSCFG_updateAllUserNotifs")
          .mockImplementationOnce((): any => Promise.resolve({}));
        jest
          .spyOn(sqldb.NOTIFSCFG, "w_update")
          .mockImplementationOnce((): any =>
            Promise.resolve({ affectedRows: 1 })
          );
        jest
          .spyOn(sqldb.NOTIFSCFG, "getList1")
          .mockImplementationOnce((): any => Promise.resolve([]));

        jest
          .spyOn(sqldb.NOTIFSCFG, "getList1")
          .mockImplementationOnce((): any => Promise.resolve([]));

        jest
          .spyOn(energyAlerts, "resetConditionsEditedCards")
          .mockImplementationOnce((): any => Promise.resolve());
        mockRealtimeCalls();

        const response = await httpRouter.privateRoutes[
          "/energy/edit-notification-request"
        ](
          reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
          session
        );
        expect(response).toMatch("UPDATED 1");
      });
    });

    describe("Error", () => {
      test("should throw an error if NOTIF_ID not in reqParams", async () => {
        try {
          const reqParams = {};
          let session = factoriesLogin.generateSessionReal();

          await httpRouter.privateRoutes["/energy/edit-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Missing notification ID!");
          expect(err).toHaveProperty("Status", 400);
        }
      });
      test("should throw an error if notification is not found", async () => {
        try {
          const reqParams = {
            NOTIF_ID: faker.number.int({ min: 1 }),
            COND_VAR: "ENERGY",
            COND_OP: "ECPD",
            CLIENT_ID: faker.number.int({ min: 1 }),
            NAME: faker.word.noun(),
          };
          let session = factoriesLogin.generateSessionReal();

          jest
            .spyOn(sqldb.NOTIFSCFG, "getNotifData")
            .mockImplementationOnce((): any => Promise.resolve(null));
          await httpRouter.privateRoutes["/energy/edit-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Notification not found");
          expect(err).toHaveProperty("Status", 404);
        }
      });
      test("should throw an error if user has not permission", async () => {
        try {
          const reqParams = {
            NOTIF_ID: faker.number.int({ min: 1 }),
            COND_VAR: "ENERGY",
            COND_OP: "ECPD",
            CLIENT_ID: faker.number.int({ min: 1 }),
            NAME: faker.word.noun(),
          };

          let session = factoriesLogin.generateSessionNoPermissions();

          jest
            .spyOn(sqldb.NOTIFSCFG, "getNotifData")
            .mockImplementationOnce((): any => {
              const data = factories.generateNotifInfo({
                NOTIF_ID: reqParams.NOTIF_ID,
              });
              return Promise.resolve(data);
            });
          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockResolvedValue({
              canManageClientNotifs: false,
              isClientUser: false,
              canAddUsersToClient: false,
              canConfigureNewUnits: false,
              canDeleteDevs: false,
              canManageClient: false,
              canManageDevs: false,
              canViewDevs: false,
              canEditProgramming: false,
              canViewClientUnits: false,
              canManageObservations: false,
              canViewObservations: true,
              canManageSketches: true,
            });

          await httpRouter.privateRoutes["/energy/edit-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Invalid client");
          expect(err).toHaveProperty("Status", 500);
        }
      });
      test("should throw an error if COND_VAR is not valid", async () => {
        try {
          const reqParams = {
            NOTIF_ID: faker.number.int({ min: 1 }),
            COND_VAR: faker.word.noun(),
            COND_OP: "ECPD",
            CLIENT_ID: faker.number.int({ min: 1 }),
            NAME: faker.word.noun(),
          };
          let session = factoriesLogin.generateSessionReal();

          jest
            .spyOn(sqldb.NOTIFSCFG, "getNotifData")
            .mockImplementationOnce((): any => {
              const data = factories.generateNotifInfo({
                NOTIF_ID: reqParams.NOTIF_ID,
              });
              return Promise.resolve(data);
            });
          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockImplementationOnce((): any =>
              Promise.resolve({
                canManageClientNotifs: true,
              })
            );
          await httpRouter.privateRoutes["/energy/edit-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
            session
          );
        } catch (err: any) {
          console.log(err);
          expect(err.message).toBe("Invalid notification type!");
          expect(err).toHaveProperty("Status", 400);
        }
      });
      test("should throw an error if COND_OP is not valid", async () => {
        try {
          const reqParams = {
            NOTIF_ID: faker.number.int({ min: 1 }),
            COND_VAR: "ENERGY",
            COND_OP: faker.word.noun(),
            CLIENT_ID: faker.number.int({ min: 1 }),
            NAME: faker.company.name(),
          };
          let session = factoriesLogin.generateSessionReal();

          jest
            .spyOn(sqldb.NOTIFSCFG, "getNotifData")
            .mockImplementationOnce((): any => {
              const data = factories.generateNotifInfo({
                NOTIF_ID: reqParams.NOTIF_ID,
              });
              return Promise.resolve(data);
            });
          jest
            .spyOn(permissionControl, "getPermissionsOnClient")
            .mockImplementationOnce((): any =>
              Promise.resolve({
                canManageClientNotifs: true,
              })
            );
          await httpRouter.privateRoutes["/energy/edit-notification-request"](
            reqParams as httpRouter.ApiParams["/energy/edit-notification-request"],
            session
          );
        } catch (err: any) {
          expect(err.message).toBe("Invalid condition operator!");
          expect(err).toHaveProperty("Status", 400);
        }
      });
    });
  });
});

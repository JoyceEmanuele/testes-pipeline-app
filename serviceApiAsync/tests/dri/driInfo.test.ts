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
import * as factories from "../factories/driInfoFactory";
import * as automationFactories from "../factories/driAutomationFactory";
import * as driInfo from '../../dri/driInfo';
import { DriProg, DriParsedRowType as ParsedRowType, WSListener } from "../../../srcCommon/types";
import servConfig from "../../../configfile";
import * as httpRouter from "../../apiServer/httpRouter";
import { faker } from "@faker-js/faker";
import * as dielServices from "../../../srcCommon/dielServices";
import * as factoriesLogin from "../../tests/factories/loginFactory";
import { verifyClient_classicLogin } from "../../../srcCommon/helpers/auth";
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";
import * as timezone from "../../../srcCommon/helpers/timezones";
import * as languageFunctions from "../../../srcCommon/helpers/i18nextradution";
import axios from "axios";
import * as driHist from "../../telemHistory/driHist";
import * as driCompiler from "../../dayCompilers/dri";
import * as dates from "../../../srcCommon/helpers/dates";
import * as devsScheduler from "../../devsScheduler";
import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import * as iotMessageListener from '../../../srcCommon/iotMessages/iotMessageListener';
import { ControlMsgDRI } from "../../../srcCommon/types/devicesMessages";
import * as devsCommands from "../../../srcCommon/iotMessages/devsCommands";
import * as retries from '../../../srcCommon/helpers/retries';
import * as driAutomationeventHooks from '../../driAutomation/eventHooks';

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();

  jest.spyOn(retries, 'retryFunction').mockImplementation(async (fn) => {
    await fn();
  });

  jest.spyOn(driAutomationeventHooks, 'ramCaches_DRIS_loadDrisCfg').mockImplementation(
    jest.fn()
  );
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

expect.extend({
  checkRTYPE(received) {
    if (received.HAS_ROOMTYPE === 0 && received.RTYPE_ID !== -1)
      return { message: () => "expected RTYPE_ID equal to -1", pass: false };
    return { message: () => "expected RTYPE_ID was returned", pass: true };
  },
});

interface CustomMatchers<R = unknown> {
  checkRTYPE(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers { }
    interface Matchers<R> extends CustomMatchers<R> { }
    interface InverseAsymmetricMatchers extends CustomMatchers { }
  }
}

function defineMocksAddDriSchedule(): void {
  jest.spyOn(sqldb.DRIS_AUTOMATIONS, 'getDrisAutomationInfo').mockResolvedValueOnce(factories.mockGetDrisAutomationInfo());

  jest.spyOn(sqldb.AUTOMATIONS_PERIODS, 'w_insert').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });

  jest.spyOn(sqldb.AUTOMATIONS_PARAMETERS, 'w_insert').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });

  jest.spyOn(sqldb.MACHINES_AUTOMATIONS_PERIODS, 'w_insert').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });

  jest.spyOn(sqldb.AUTOMATIONS_PERIODS_PARAMETERS, 'w_insert').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });

  jest.spyOn(sqldb.CURRENT_AUTOMATIONS_PARAMETERS, 'getCurrentAutomationsParametersByDevice').mockResolvedValueOnce(factories.mockGetCurrentAutomationsParametersByDevice());

  jest.spyOn(sqldb.CURRENT_AUTOMATIONS_PARAMETERS, 'w_updateInfo').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
}

function defineMocksUpdateDriSchedule(): void {
  jest.spyOn(sqldb.AUTOMATIONS_PERIODS, 'w_updateInfo').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });

  jest.spyOn(sqldb.AUTOMATIONS_PARAMETERS, 'w_updateInfo').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
}

function defineMocksDeleteDriSchedule(): void {
  jest.spyOn(sqldb.MACHINES_AUTOMATIONS_PERIODS, 'w_deleteByAutomationPeriodId').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
  jest.spyOn(sqldb.AUTOMATIONS_PERIODS_PARAMETERS, 'w_deleteByAutomationPeriodId').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
  jest.spyOn(sqldb.AUTOMATIONS_PARAMETERS, 'w_delete').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
  jest.spyOn(sqldb.EXCEPTIONS, 'w_deleteByAutomationPeriod').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
  jest.spyOn(sqldb.SCHEDULES, 'w_deleteByAutomationPeriod').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
  jest.spyOn(sqldb.AUTOMATIONS_PERIODS, 'w_deleteRow').mockResolvedValueOnce({
    affectedRows: 1,
    insertId: faker.number.int({ min: 1 })
  });
}

function defineMocksAutomationScheduler(driId: string): void {
  jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValueOnce(factories.mockFwVersion(driId, 'v4.5.5'));

  jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValueOnce({
    lastTs: 1,
    status: 'ONLINE'
  });

  jest.spyOn(devsCommands, 'sendDamCommand_scheduler').mockImplementation(jest.fn());
}

function defineDriControlMessage(messages: ControlMsgDRI[]): void {
  jest.spyOn(iotMessageListener, 'waitForDriControl').mockImplementationOnce((fn, timeout) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(
        new Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })
      ), timeout);

      for (const message of messages) {
        fn(message);
      }

      if (messages.length > 0) {
        clearTimeout(timeoutId);
        resolve(true);
      }

    }) as unknown as WSListener<ControlMsgDRI>;
  });
}

describe("Dri Info", () => {
  describe("Parse Kron iKRON 03 File", () => {
    it("Success", async () => {
      const commandsMock = jest
        .spyOn(sqldb.KRON_IKRON_03_COMMANDS, "getCommandsList")
        .mockImplementationOnce((): any =>
          factories.generateDriVarsParsedTable()
        );
      const result = await driInfo.parseKroniKron03File();
      expect(commandsMock).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result).toHaveLength(10);
      expect(result).toMatchObject<ParsedRowType[]>;
    });
  });

  describe("/dri/get-dri-fancoil-info", () => {
    describe("Success", () => {
      test("should return object with dri fancoil properties", async () => {
        servConfig.isTestServer = false;
        const reqParams = { FANCOIL_ID: "DRI001291141" };

        const queryData = { token: faker.string.alphanumeric({ length: 10 }) };

        jest
          .spyOn(dielServices, "authInternalApi")
          .mockImplementationOnce((): any =>
            Promise.resolve(
              factoriesLogin.generateSession({ token: queryData.token })
            )
          );
        let session = await verifyClient_classicLogin(queryData);
        jest
          .spyOn(sqldb.DRIS, "getBasicInfo")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateDriBasicInfo(reqParams))
          );
        jest
          .spyOn(permissionControl, "getPermissionsOnUnit")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: true })
          );
        jest
          .spyOn(sqldb.FANCOILS, "getDriFancoil")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateDriFancoilInfo({ ...reqParams }))
          );

        const response = await httpRouter.privateRoutes[
          "/dri/get-dri-fancoil-info"
        ](reqParams, {
          ...session,
          permissions: {
            isAdminSistema: true,
            ...session.permissions,
          },
        });
        expect(response).toMatchObject<factories.DriFancoil>;
      });
    });
    describe("Error", () => {
      test("should throw an error if FANCOIL_ID not in reqParams", async () => {
        servConfig.isTestServer = false;
        const reqParams = { FANCOIL_ID: "" };
        try {
          const queryData = {
            token: faker.string.alphanumeric({ length: 10 }),
          };
          jest
            .spyOn(dielServices, "authInternalApi")
            .mockImplementationOnce((): any =>
              Promise.resolve(
                factoriesLogin.generateSession({ token: queryData.token })
              )
            );
          let session = await verifyClient_classicLogin(queryData);
          jest
            .spyOn(sqldb.DRIS, "getBasicInfo")
            .mockImplementationOnce((): any =>
              Promise.resolve(factories.generateDriBasicInfo(reqParams))
            );
          jest
            .spyOn(permissionControl, "getPermissionsOnUnit")
            .mockImplementationOnce((): any =>
              Promise.resolve({ canViewDevs: true })
            );
          jest
            .spyOn(sqldb.FANCOILS, "getDriFancoil")
            .mockImplementationOnce((): any =>
              Promise.resolve(
                factories.generateDriFancoilInfo({ ...reqParams })
              )
            );

          await httpRouter.privateRoutes["/dri/get-dri-fancoil-info"](
            reqParams,
            {
              ...session,
              permissions: {
                isAdminSistema: true,
                ...session.permissions,
              },
            }
          );
        } catch (error: any) {
          expect(error.message).toBe("Parâmetro FANCOIL_ID não informado");
          expect(error).toHaveProperty("Status", 400);
        }
      });
      test("should return RTYPE_ID = -1 if HAS_ROOMTYPE == 0", async () => {
        servConfig.isTestServer = false;
        const reqParams = { FANCOIL_ID: "DRI001291141", HAS_ROOMTYPE: 0 };

        const queryData = { token: faker.string.alphanumeric({ length: 10 }) };
        jest
          .spyOn(dielServices, "authInternalApi")
          .mockImplementationOnce((): any =>
            Promise.resolve(
              factoriesLogin.generateSession({ token: queryData.token })
            )
          );
        let session = await verifyClient_classicLogin(queryData);
        jest
          .spyOn(sqldb.DRIS, "getBasicInfo")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateDriBasicInfo(reqParams))
          );
        jest
          .spyOn(permissionControl, "getPermissionsOnUnit")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: true })
          );
        jest
          .spyOn(sqldb.FANCOILS, "getDriFancoil")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateDriFancoilInfo({ ...reqParams }))
          );

        const response = await httpRouter.privateRoutes[
          "/dri/get-dri-fancoil-info"
        ](reqParams, {
          ...session,
          permissions: {
            isAdminSistema: true,
            ...session.permissions,
          },
        });
        expect(response).checkRTYPE();
      });
    });
  });
  describe("/dri/get-chiller-alarms-list", () => {
    describe("Success", () => {
      test('Ok', async () => {
        const reqParams = {};
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.CHILLER_CARRIER_ALARMS, 'getAlarmsList').mockResolvedValue(factories.mockGetChillersAlarmsList());

        const result = await driInfo.getChillerAlarmsList(reqParams, session);
        expect(result).toBeDefined();
        expect(result.list).toBeInstanceOf(Array);
      });
    })
  });
  describe("/dri/get-chiller-alarms-list-hist", () => {
    describe("Success", () => {
      test("Ok, actual alarms", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        reqParams.START_DATE = <any>null;
        reqParams.END_DATE = <any>null;

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue(factories.mockGetTimezoneByUnit());
        jest.spyOn(driInfo, 'getFilterColumnsFormatted').mockImplementation((): any => factories.mockGetFilterColumnsFormatted());
        jest.spyOn(timezone, 'getOffsetTimezone').mockImplementation((): any => faker.number.int({ min: -12, max: 12 }))
        jest.spyOn(sqldb.DRIS_CHILLER_ALARMS_HIST, 'getAlarmsHist').mockResolvedValue(factories.mockGetAlarmsHist());

        const result = await driInfo.getChillerAlarmsHist(reqParams, session);

        expect(result).toBeDefined();
        expect(result.list).toBeInstanceOf(Array);
      });
      test("Ok, filtered alarms", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue(factories.mockGetTimezoneByUnit());
        jest.spyOn(timezone, 'getOffsetTimezone').mockImplementation((): any => faker.number.int({ min: -12, max: 12 }))
        jest.spyOn(driInfo, 'getFilterColumnsFormatted').mockImplementation((): any => factories.mockGetFilterColumnsFormatted());
        jest.spyOn(sqldb.DRIS_CHILLER_ALARMS_HIST, 'countAlarmsToPage').mockResolvedValue(factories.mockCountAlarmsToPage());
        jest.spyOn(sqldb.DRIS_CHILLER_ALARMS_HIST, 'getAlarmsHist').mockResolvedValue(factories.mockGetAlarmsHist());

        const result = await driInfo.getChillerAlarmsHist(reqParams, session);

        expect(result).toBeDefined();
        expect(result.list).toBeInstanceOf(Array);
      });
    })
    describe("Error", () => {
      test("Missing DEVICE_CODE", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        reqParams.DEVICE_CODE = <any>null;

        await driInfo.getChillerAlarmsHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE');
        });
      });
      test("Device not found", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(null);

        await driInfo.getChillerAlarmsHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Device not found');
        });
      });
      test("Permission denied!", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());

        await driInfo.getChillerAlarmsHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      });
    })
  });
  describe("getFilterColumnsFormatted", () => {
    describe("Success", () => {
      test("Ok with filterParams", () => {
        const params = factories.mockParamsGetFilterColumnsFormatted()

        const result = driInfo.getFilterColumnsFormatted(params);

        expect(result).toBeDefined();
      });
      test("Ok without filterParams", () => {
        let params = factories.mockParamsGetFilterColumnsFormatted()
        params = <any>null;

        const result = driInfo.getFilterColumnsFormatted(params);

        expect(result).toBeDefined();
        expect(result.FILTER_ALARM_CODE).toHaveLength(0);
        expect(result.FILTER_DESCRIPTION).toHaveLength(0);
        expect(result.FILTER_REASON_ALARM).toHaveLength(0);
        expect(result.FILTER_ACTION_TAKEN).toHaveLength(0);
        expect(result.FILTER_RESET_TYPE).toHaveLength(0);
        expect(result.FILTER_CAUSE).toHaveLength(0);
      })
    });
  });
  describe("/dri/export-chiller-alarms-hist", () => {
    describe("Success", () => {
      test("Ok", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue(factories.mockGetPrefsUser());
        jest.spyOn(languageFunctions, 'getLanguage').mockImplementation((): any => factories.mockGetLanguage());
        jest.spyOn(driInfo, 'getFilterColumnsFormatted').mockImplementation((): any => factories.mockGetFilterColumnsFormatted());
        jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue(factories.mockGetTimezoneByUnit());
        jest.spyOn(timezone, 'getOffsetTimezone').mockImplementation((): any => faker.number.int({ min: -12, max: 12 }))
        jest.spyOn(sqldb.DRIS_CHILLER_ALARMS_HIST, 'getAlarmsHist').mockResolvedValue(factories.mockGetAlarmsHist());
        jest.spyOn(timezone, 'calculateDateByTimezone').mockImplementation((): any => factories.mockCalculateDateByTimezone());

        const result = await driInfo.exportChillerAlarmsHist(reqParams, session, extra);
        expect(result.status).toHaveBeenCalledWith(200);
      })

    });
    describe("Error", () => {
      test("Missing DEVICE_CODE", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        reqParams.DEVICE_CODE = <any>null;

        await driInfo.exportChillerAlarmsHist(reqParams, session, extra).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE');
        });
      });
      test("Missing Dates", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        reqParams.START_DATE = <any>null;
        reqParams.END_DATE = <any>null;

        await driInfo.exportChillerAlarmsHist(reqParams, session, extra).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DATES params');
        });
      });
      test("Missing Export Columns", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        reqParams.columnsToExport = <any>[];

        await driInfo.exportChillerAlarmsHist(reqParams, session, extra).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing Export Columns');
        });
      });
      test("Device not found", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(null);

        await driInfo.exportChillerAlarmsHist(reqParams, session, extra).catch((err) => {
          expect(err.message).toBe('Device not found');
        });
      });
      test("Permission denied!", async () => {
        const reqParams = factories.mockParamsGetChillerAlarmsHist();
        const session = factoriesLogin.generateSessionReal();
        const extra = factories.mockedExtraParams;

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());

        await driInfo.exportChillerAlarmsHist(reqParams, session, extra).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      });
    });
  });
  describe("/dri/get-all-chiller-alarms-codes", () => {
    describe("Success", () => {
      test("Ok", async () => {
        const reqParams = factories.mockParamsGetAllChillerAlarmsCodes();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(sqldb.DRIS_CHILLER_ALARMS_HIST, 'getAllChillerAlarmsCodes').mockResolvedValue(factories.mockGetAllChillerAlarmsCodes());
        jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue(factories.mockGetTimezoneByUnit());
        jest.spyOn(timezone, 'getOffsetTimezone').mockImplementation((): any => faker.number.int({ min: -12, max: 12 }))

        const result = await driInfo.getAllChillerAlarmsCodesByDRI(reqParams, session);

        expect(result).toBeDefined();
        expect(result.list).toBeInstanceOf(Array);
      })
    });
    describe("Error", () => {
      test("Missing DEVICE_CODE", async () => {
        const reqParams = factories.mockParamsGetAllChillerAlarmsCodes();
        const session = factoriesLogin.generateSessionReal();

        reqParams.DEVICE_CODE = <any>null;

        await driInfo.getAllChillerAlarmsCodesByDRI(reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE');
        });
      });
      test("Missing Dates", async () => {
        const reqParams = factories.mockParamsGetAllChillerAlarmsCodes();
        const session = factoriesLogin.generateSessionReal();

        reqParams.START_DATE = <any>null;
        reqParams.END_DATE = <any>null;

        await driInfo.getAllChillerAlarmsCodesByDRI(reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DATES params');
        });
      });
      test("Device not found", async () => {
        const reqParams = factories.mockParamsGetAllChillerAlarmsCodes();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(null);

        await driInfo.getAllChillerAlarmsCodesByDRI(reqParams, session).catch((err) => {
          expect(err.message).toBe('Device not found');
        });
      });
      test("Permission denied!", async () => {
        const reqParams = factories.mockParamsGetAllChillerAlarmsCodes();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());

        await driInfo.getAllChillerAlarmsCodesByDRI(reqParams, session).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      });
    });
  });
  describe("/dri/get-chiller-parameters-hist", () => {
    describe("Success", () => {
      test("Success without actual day", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
        jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(factories.mockGetChillerParametersHist()));

        const result = await driInfo.getChillerParametersHist(reqParams, session);

        expect(result).toBeDefined();
        expect(result.paramsLists.paramsChanged).toBeInstanceOf(Array);
        expect(result.paramsLists.paramsGrouped).toBeInstanceOf(Array);
      });
      test("Success with actual day", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => new Date().toISOString().split('T')[0]);
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());
        jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(factories.mockGetChillerParametersHist()));
        jest.spyOn(driHist, 'loadDriCfg').mockResolvedValue(null);
        jest.spyOn(driCompiler, 'processDriDay').mockImplementation((): any => Promise.resolve(factories.mockGetChillerParametersHist()));

        const result = await driInfo.getChillerParametersHist(reqParams, session);
        expect(result).toBeDefined();
        expect(result.paramsLists.paramsChanged).toBeInstanceOf(Array);
        expect(result.paramsLists.paramsGrouped).toBeInstanceOf(Array);
      });
    });
    describe("Error", () => {
      test("Missing DEVICE_CODE", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();
        reqParams.DEVICE_CODE = <any>null;

        await driInfo.getChillerParametersHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE');
        });
      });
      test("Missing Dates!", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();
        reqParams.START_DATE = <any>null;
        reqParams.END_DATE = <any>null;

        await driInfo.getChillerParametersHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing Dates');
        });
      });
      test("Device not found", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(null);

        await driInfo.getChillerParametersHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Device not found');
        });
      });
      test("Permission denied!", async () => {
        const reqParams = factories.mockParamsGetChillerParametersHist();
        const session = factoriesLogin.generateSessionReal();
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));
        jest.spyOn(sqldb.DRIS_DEVICES, 'getBaciInfoByDeviceCode').mockResolvedValue(factories.mockGetBasicInfoDri());

        await driInfo.getChillerParametersHist(reqParams, session).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      });
    });
  });
  describe("/dri/add-dri-sched", () => {
    describe("Success", () => {
      test("should insert new schedule successfully without sent to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksAddDriSchedule();

        insertScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(insertScheduleDbSpy).toHaveBeenCalled();
        expect(insertExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should insert new exception successfully without sent to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, true);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksAddDriSchedule();

        insertExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(insertScheduleDbSpy).not.toHaveBeenCalled();
        expect(insertExceptionDbSpy).toHaveBeenCalled();
      });

      test("should insert an inactive schedule without sent to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, false);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));

        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksAddDriSchedule();

        insertScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(insertScheduleDbSpy).toHaveBeenCalled();
        expect(insertExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should insert an inactive exception without sent to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, false);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksAddDriSchedule();

        insertExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(insertScheduleDbSpy).not.toHaveBeenCalled();
        expect(insertExceptionDbSpy).toHaveBeenCalled();
      })

      test("should insert new schedule successfully after sent schedules to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValueOnce(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);

        defineMocksAddDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineDriControlMessage(automationFactories.setScheduleMockMessages(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessages(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));

        insertScheduleDbSpy.mockResolvedValueOnce({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(insertScheduleDbSpy).toHaveBeenCalled();
        expect(insertExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should insert new exception successfully after sent schedules to device", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, true);
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([]);

        defineMocksAddDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(reqParams.DRI_ID,
          dates.formatISODate(reqParams.EXCEPTION_DATE))
        );

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessages(reqParams.DRI_ID,
          dates.formatISODate(reqParams.EXCEPTION_DATE))
        );

        insertExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(insertScheduleDbSpy).not.toHaveBeenCalled();
        expect(insertExceptionDbSpy).toHaveBeenCalled();
      });

      test("should insert new schedule and send to the device with current schedules", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true, {
          DAYS: JSON.stringify({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false })
        });
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true, {
          DAYS: JSON.stringify({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: true, sun: true }),
          MODE: 'FAN',
        });

        defineMocksAddDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        const { week: scheduler } = await devsScheduler.parseDriScheduleCardsToScheduler([
          ...devsScheduler.parseDriScheduleToCards([mockScheduleDatabase]),
          { ...reqParams, SCHED_ID: 0 } as DriProg
        ], factories.mockLoadDriCfg());

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([mockScheduleDatabase]);


        for (const schedule of scheduler) {
          defineDriControlMessage(automationFactories.setScheduleMockMessages(reqParams.DRI_ID,
            [schedule]
          ));
        }

        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessages(reqParams.DRI_ID, automationFactories.getSchedulerMessageWeekDaysMode({ start: '00:00', end: '23:59', mode: 'SET24' }, {
          saturday: {
            start: '00:00',
            end: '23:59',
            mode: 'FAN'
          },
          sunday: {
            start: '00:00',
            end: '23:59',
            mode: 'FAN'
          }
        })));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));

        insertScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(insertScheduleDbSpy).toHaveBeenCalled();
        expect(insertExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should insert new exception and send to the device with current exceptions", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, true, { EXCEPTION_DATE: '2025-01-01' });
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        const mockExceptionDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
          MODE: null,
          OPERATION: '0',
          EXCEPTION_DATE: dates.formatISODate('2026-02-01')
        });

        defineMocksAddDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        const { exceptions: { exceptions } } = await devsScheduler.parseDriScheduleCardsToScheduler([
          ...devsScheduler.parseDriScheduleToCards([mockExceptionDatabase]),
          { ...reqParams, SCHED_ID: 0 } as DriProg
        ], factories.mockLoadDriCfg());

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([mockExceptionDatabase]);

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(reqParams.DRI_ID,
          dates.formatISODate(reqParams.EXCEPTION_DATE),
          exceptions)
        );
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessages(reqParams.DRI_ID,
          dates.formatISODate(reqParams.EXCEPTION_DATE),
          [{
            date: dates.formatISODate(mockExceptionDatabase.EXCEPTION_DATE),
            schedule: { start: '00:00', end: '23:59', mode: 'OFF' }
          }]
        ));

        insertExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({ min: 1 })
        });

        const response = await httpRouter.privateRoutes[
          "/dri/add-dri-sched"
        ](reqParams, session);

        expect(response).toBeDefined();
        expect(response).toMatch('ADD OK');
        expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(insertScheduleDbSpy).not.toHaveBeenCalled();
        expect(insertExceptionDbSpy).toHaveBeenCalled();
      });
    });

    describe("Error", () => {
      test("should throw an error when permission cannot manage devices", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Permission denied!");
          expect(error).toHaveProperty("Status", 403);
        }
      });

      test("should throw an error when request parameters are invalid", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ]({ ...reqParams, DRI_ID: null }, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Parâmetro DRI_ID não informado");
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when device is OFFLINE to sent scheduler", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.5.5'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'OFFLINE'
        });

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(`Dispositivo ${reqParams.DRI_ID} não está online`);
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when the new schedule is invalid by another", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true, {
            MODE: 'COOL',
            SETPOINT: 24,
          })
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Há programações sobrepostas');
        }
      });

      test("should throw an error when the new exception is invalid by another", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, true, {
          EXCEPTION_DATE: '2025-01-01'
        });
        const session = factoriesLogin.generateSessionReal();

        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
            EXCEPTION_DATE: dates.formatISODate('2025-01-01')
          })
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Há programações sobrepostas');
        }
      });

      test("should throw an error when device did not respond after sending scheduler", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage([]);

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Timeout waiting for DEV response');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(insertScheduleDbSpy).not.toHaveBeenCalled();
          expect(insertExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);

      test("should throw an error when device did not respond correctly after scheduler verification", async () => {
        const reqParams = factories.mockAddDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage(automationFactories.setScheduleMockMessages(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
          expect(insertScheduleDbSpy).not.toHaveBeenCalled();
          expect(insertExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);

      test("should throw an error when device did not respond correctly after scheduler verification to an exception", async () => {
        const reqParams = factories.mockAddDriSchedParams(true, true);
        const session = factoriesLogin.generateSessionReal();

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const insertExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_insert');
        const insertScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_insert');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(reqParams.DRI_ID, dates.formatISODate(reqParams.EXCEPTION_DATE)));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/add-dri-sched"
          ](reqParams, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
          expect(insertScheduleDbSpy).not.toHaveBeenCalled();
          expect(insertExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);
    });
  });
  describe("/dri/update-dri-sched", () => {
    describe("Success", () => {
      test("should update schedule successfully without sent to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksUpdateDriSchedule();

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        updateScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(updateScheduleDbSpy).toHaveBeenCalled();
        expect(updateExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should update exception successfully without sent to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(true, true);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');


        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksUpdateDriSchedule();

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        updateExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(updateScheduleDbSpy).not.toHaveBeenCalled();
        expect(updateExceptionDbSpy).toHaveBeenCalled();
      });

      test("should update an inactive schedule without sent to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, false);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, false);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');


        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));

        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksUpdateDriSchedule();

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        updateScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(updateScheduleDbSpy).toHaveBeenCalled();
        expect(updateExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should update an inactive exception without sent to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, false);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, false);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));

        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        defineMocksUpdateDriSchedule();

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        updateScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        expect(updateScheduleDbSpy).toHaveBeenCalled();
        expect(updateExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should update schedule successfully after sent to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true, { NAME: 'Teste' });
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksUpdateDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        updateScheduleDbSpy.mockResolvedValueOnce({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        defineDriControlMessage(automationFactories.setScheduleMockMessages(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));

        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessages(reqParams.DRI_ID));

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(updateScheduleDbSpy).toHaveBeenCalled();
        expect(updateExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should update exception successfully after sent to device", async () => {
        const newDate = '2025-01-01';
        const reqParams = factories.mockUpdateDriSchedParams(true, true, { NAME: 'Teste', EXCEPTION_DATE: newDate });
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
          EXCEPTION_DATE: dates.formatISODate('2026-02-01')
        });

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksUpdateDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]).mockResolvedValueOnce([mockScheduleDatabase]);

        updateExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(
          reqParams.DRI_ID, dates.formatISODate(newDate)
        ));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessages(
          reqParams.DRI_ID,
          dates.formatISODate(newDate)
        ));

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(updateScheduleDbSpy).not.toHaveBeenCalled();
        expect(updateExceptionDbSpy).toHaveBeenCalled();
      });

      test("should update schedule successfully after change to inactive and sending to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, false, { NAME: 'Teste' });
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksUpdateDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]).mockResolvedValueOnce([mockScheduleDatabase]);

        updateScheduleDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(updateScheduleDbSpy).toHaveBeenCalled();
        expect(updateExceptionDbSpy).not.toHaveBeenCalled();
      });

      test("should update exception successfully after change to inactive and sending to device", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(true, false, { NAME: 'Teste' });
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksUpdateDriSchedule();
        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]).mockResolvedValueOnce([mockScheduleDatabase]);

        updateExceptionDbSpy.mockResolvedValue({
          affectedRows: 1,
          insertId: mockScheduleDatabase.SCHED_ID,
        });

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));

        const response = await httpRouter.privateRoutes[
          "/dri/update-dri-sched"
        ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('UPDATE OK');
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(updateScheduleDbSpy).not.toHaveBeenCalled();
        expect(updateExceptionDbSpy).toHaveBeenCalled();
      });
    });
    describe("Error", () => {
      test("should throw an error when permission cannot manage devices", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Permission denied!");
          expect(error).toHaveProperty("Status", 403);
        }
      });

      test("should throw an error when request parameters are invalid", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: null }, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Parâmetro SCHED_ID não informado");
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when device is OFFLINE to sent scheduler", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);
        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(
          factories.mockFwVersion(reqParams.DRI_ID, 'v4.5.5')
        );
        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'OFFLINE'
        });

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase,
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(`Dispositivo ${reqParams.DRI_ID} não está online`);
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when the schedule was not found", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Programação/Exceção não encontrada');
          expect(error).toHaveProperty("Status", 400);
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        }
      });

      test("should throw an error when the exception was not found", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(true, true);
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Programação/Exceção não encontrada');
          expect(error).toHaveProperty("Status", 400);
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        }
      });

      test("should throw an error when the new schedule is invalid by another", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase,
          factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true, {
            MODE: 'COOL',
            SETPOINT: 24,
          })
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);
        } catch (error) {
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Há programações sobrepostas');
        }
      });

      test("should throw an error when the new exception is invalid by another", async () => {
        const newDate = '2025-01-01';
        const reqParams = factories.mockUpdateDriSchedParams(true, true, {
          EXCEPTION_DATE: newDate
        });
        const session = factoriesLogin.generateSessionReal();

        const mockOldScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true);

        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockOldScheduleDatabase,
          factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
            EXCEPTION_DATE: dates.formatISODate(newDate)
          })
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockOldScheduleDatabase.SCHED_ID }, session);
        } catch (error) {
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Há programações sobrepostas');
        }
      });

      test("should throw an error when device did not respond after sending scheduler", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage([]);
        defineDriControlMessage([]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Timeout waiting for DEV response');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
          expect(updateScheduleDbSpy).not.toHaveBeenCalled();
          expect(updateExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);

      test("should throw an error when device did not respond correctly after scheduler verification", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true, { NAME: 'Teste' });
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage(automationFactories.setScheduleMockMessages(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
          expect(updateScheduleDbSpy).not.toHaveBeenCalled();
          expect(updateExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);

      test("should throw an error when device did not respond correctly after scheduler verification to an exception", async () => {
        const newDate = '2025-01-01';
        const reqParams = factories.mockUpdateDriSchedParams(true, true, { NAME: 'Teste', EXCEPTION_DATE: newDate });
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true);

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');
        const updateExceptionDbSpy = jest.spyOn(sqldb.EXCEPTIONS, 'w_updateInfo');
        const updateScheduleDbSpy = jest.spyOn(sqldb.SCHEDULES, 'w_updateInfo');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(
          reqParams.DRI_ID, dates.formatISODate(newDate)
        ));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
          expect(updateScheduleDbSpy).not.toHaveBeenCalled();
          expect(updateExceptionDbSpy).not.toHaveBeenCalled();
        }
      }, 6000);
    });
  });
  describe("/dri/delete-dri-sched", () => {
    describe("Success", () => {
      test("should delete schedule successfully without sent to device", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(factories.mockFwVersion(reqParams.DRI_ID, 'v4.3.3'));

        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'ONLINE'
        });

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksDeleteDriSchedule();

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
      });

      test("should delete inactive schedule without sent to device", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, false);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
        expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
      });

      test("should delete schedule successfully after sent to device", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(
          reqParams.DRI_ID
        ));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
      });

      test("should delete exception successfully after sent to device", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true);

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(
          reqParams.DRI_ID
        ));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
      });

      test("should delete schedule successfully after sent to device with another schedules", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true, {
          DAYS: JSON.stringify({
            mon: false, tue: false, wed: false, thu: false, fri: false, sat: true, sun: true
          })
        });
        const anotherScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, false, true, {
          DAYS: JSON.stringify({
            mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
          })
        })

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase,
          anotherScheduleDatabase,
        ]).mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        const { week: scheduler } = await devsScheduler.parseDriScheduleCardsToScheduler(
          devsScheduler.parseDriScheduleToCards([anotherScheduleDatabase]),
          factories.mockLoadDriCfg()
        );

        for (const schedule of scheduler) {
          defineDriControlMessage(automationFactories.setScheduleMockMessages(
            reqParams.DRI_ID,
            [schedule]
          ));
        }
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(
          reqParams.DRI_ID
        ));

        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));

        defineDriControlMessage(automationFactories.scheduleVerificationMockMessages(
          reqParams.DRI_ID,
          automationFactories.getSchedulerMessageWeekDaysMode({ start: '00:00', end: '23:59', mode: 'FAN' })
        ));

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
      }, 6000);

      test("should delete exception successfully after sent to device with another exceptions", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();

        const deletedDate = dates.formatISODate('2026-02-01');
        const anotherDate = dates.formatISODate('2025-01-01');

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, { EXCEPTION_DATE: deletedDate, SCHED_ID: 1 });
        const anotherScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
          EXCEPTION_DATE: anotherDate,
          SCHED_ID: 2,
          MODE: 'COOL',
          SETPOINT: 24
        });

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase,
          anotherScheduleDatabase,
        ]).mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.setExceptionMockMessage(
          reqParams.DRI_ID,
          anotherDate
        ));

        defineDriControlMessage(automationFactories.exceptionVerificationMockMessages(
          reqParams.DRI_ID,
          anotherDate
        ));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(
          reqParams.DRI_ID
        ));

        const response = await httpRouter.privateRoutes[
          "/dri/delete-dri-sched"
        ]({
          DRI_ID: reqParams.DRI_ID,
          SCHED_ID: mockScheduleDatabase.SCHED_ID
        }, session);

        expect(response).toBeDefined();
        expect(response).toMatch('DELETE OK');
        expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        expect(sendDriSchedulerSpy).toHaveBeenCalled();
      }, 6000);
    });
    describe("Error", () => {
      test("should throw an error when permission cannot manage devices", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        try {
          await httpRouter.privateRoutes[
            "/dri/delete-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Permission denied!");
          expect(error).toHaveProperty("Status", 403);
        }
      });

      test("should throw an error when request parameters are invalid", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionNoPermissions();

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        try {
          await httpRouter.privateRoutes[
            "/dri/delete-dri-sched"
          ]({ ...reqParams, SCHED_ID: null }, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Parâmetro SCHED_ID não informado");
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when schedule was not found", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();

        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([]);

        try {
          await httpRouter.privateRoutes[
            "/dri/delete-dri-sched"
          ](reqParams, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Programação/Exceção não encontrada');
          expect(error).toHaveProperty("Status", 400);
          expect(sendDriSchedulerSpy).not.toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).not.toHaveBeenCalled();
        }
      });

      test("should throw an error when device is OFFLINE to send scheduler", async () => {
        const reqParams = factories.mockUpdateDriSchedParams(false, true);
        const session = factoriesLogin.generateSessionReal();
        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue([{ PREFS: JSON.stringify({ language: 'pt' }) }]);

        jest.spyOn(sqldb.DEVFWVERS, 'getDevFwInfo').mockResolvedValue(
          factories.mockFwVersion(reqParams.DRI_ID, 'v4.5.5')
        );

        jest.spyOn(devsLastComm, "loadDeviceConnectionStatus").mockResolvedValue({
          lastTs: 1,
          status: 'OFFLINE'
        });

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValue([
          mockScheduleDatabase
        ]);

        try {
          await httpRouter.privateRoutes[
            "/dri/update-dri-sched"
          ]({
            DRI_ID: reqParams.DRI_ID,
            SCHED_ID: mockScheduleDatabase.SCHED_ID
          }, session);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(`Dispositivo ${reqParams.DRI_ID} não está online`);
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test("should throw an error when device did not respond correctly after scheduler verification", async () => {
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID);

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]).mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);
        defineMocksDeleteDriSchedule();

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(reqParams.DRI_ID));

        defineDriControlMessage(automationFactories.exceptionVerificationMockMessagesEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessages(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/delete-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        }
      }, 6000);

      test("should throw an error when device did not respond correctly after scheduler verification to an exception", async () => {
        const dateException = dates.formatISODate('2025-01-01');
        const reqParams = factories.mockDeleteDriSchedParams();
        const session = factoriesLogin.generateSessionReal();

        const mockScheduleDatabase = factories.mockDriSchedDatabase(reqParams.DRI_ID, true, true, {
          EXCEPTION_DATE: dateException
        });

        const parseDriCarsSchedulerSpy = jest.spyOn(devsScheduler, 'parseDriScheduleCardsToScheduler');
        const sendDriSchedulerSpy = jest.spyOn(devsScheduler, 'sendDriScheduler');
        const validateDeviceSchedulerCardsSpy = jest.spyOn(devsScheduler, 'validateDeviceSchedulerCards');

        jest.spyOn(sqldb.DRIS, 'getBasicInfo').mockResolvedValue(
          factories.generateDriBasicInfo({
            FANCOIL_ID: '1234'
          })
        );

        jest.spyOn(sqldb.DRISCHEDS, 'getDriScheds').mockResolvedValueOnce([
          mockScheduleDatabase
        ]).mockResolvedValueOnce([
          mockScheduleDatabase
        ]);

        defineMocksAutomationScheduler(reqParams.DRI_ID);

        defineDriControlMessage(automationFactories.setScheduleMockMessageEmpty(reqParams.DRI_ID));
        defineDriControlMessage(automationFactories.setExceptionMockMessageEmpty(
          reqParams.DRI_ID
        ));
        defineDriControlMessage(automationFactories.exceptionVerificationMockMessages(reqParams.DRI_ID, dateException));
        defineDriControlMessage(automationFactories.scheduleVerificationMockMessagesEmpty(reqParams.DRI_ID));

        try {
          await httpRouter.privateRoutes[
            "/dri/delete-dri-sched"
          ]({ ...reqParams, SCHED_ID: mockScheduleDatabase.SCHED_ID }, session);

        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Invalid configuration');
          expect(parseDriCarsSchedulerSpy).toHaveBeenCalled();
          expect(sendDriSchedulerSpy).toHaveBeenCalled();
          expect(validateDeviceSchedulerCardsSpy).toHaveBeenCalled();
        }
      }, 6000);
    });
  });
});

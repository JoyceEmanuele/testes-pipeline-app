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

import {
generateSessionReal,
} from "../factories/loginFactory";
import * as groundFactory from "../factories/groundPlantsFactory";
import sqldb from "../../../srcCommon/db";
import { faker } from "@faker-js/faker";
import * as permission from "../../../srcCommon/helpers/permissionControl";
import * as groundFunctions from "../../unit/groundPlansUnit";
import * as s3Helper from '../../../srcCommon/s3/connectS3';
import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import * as eventHooks from '../../../serviceApiAsync/realTime/eventHooks';

beforeEach(() => {
jest.restoreAllMocks();
});

afterAll(() => {
jest.restoreAllMocks();
jest.clearAllMocks();
});

describe("GroundPlans Function", () => {
  describe("/unit/get-ground-plans", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const unit = faker.string.numeric({ exclude: '0' });
        const session = generateSessionReal();
        const getUnitGP = jest.spyOn(sqldb.GROUND_PLANS, 'getByUnit').mockResolvedValue([groundFactory.mockGetByUnitSql()]);
        jest.spyOn(sqldb.GROUND_PLANS, 'getPointsByGroundPlanId').mockResolvedValue([groundFactory.mockPointsOfGPSql()])
        jest.spyOn(sqldb.GROUND_PLANS, 'getPointsByUnitId').mockResolvedValue([groundFactory.mockPointsOfGPSql()])
        jest.spyOn(groundFunctions, 'getPointsOnUnit').mockResolvedValue({});
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(sqldb.DEV_POINTS, 'w_delete').mockResolvedValue({ affectedRows: 0, insertId: 0 });
        jest.spyOn(s3Helper, 'preSigningUrl').mockResolvedValue(faker.string.alphanumeric());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(devsLastComm, "loadLastTelemetries_dut").mockImplementationOnce((): any => ({
          lastMessages() { return <any> { '2312312': { ts: 1 }}},
          lastDutTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          lastDutAutTelemetry()  { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          connectionStatus() { return 'ONLINE'; },
          lastTS() { return Date.now() - 10 * 1000; },
        }));
        jest.spyOn(groundFunctions, 'addTemperatureInList').mockReturnValue(groundFactory.mockAddTemperatureList());
        const result = await groundFunctions.listGroundPlanRoute({ UNIT_ID: Number(unit) }, session);
        expect(getUnitGP).toHaveBeenCalled();
      });
    });
    describe("ERRO", () => {
      test("Erro parametros unit id", async () => {
        const session = generateSessionReal();
        jest.spyOn(groundFunctions, 'addTemperatureInList').mockReturnValue(groundFactory.mockAddTemperatureList());
        await expect(groundFunctions.listGroundPlanRoute({ UNIT_ID: null as any }, session)).rejects.toThrow('Missing params')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro parametros unit", async () => {
        const unit = faker.string.numeric({ exclude: '0' });
        const session = generateSessionReal();
        const getUnitGP = jest.spyOn(sqldb.GROUND_PLANS, 'getByUnit').mockResolvedValue([groundFactory.mockGetByUnitSql()]);
        jest.spyOn(sqldb.GROUND_PLANS, 'getPointsByUnitId').mockResolvedValue([groundFactory.mockPointsOfGPSql()])
        jest.spyOn(sqldb.DEVICES, 'getDutsInnerDevsToGetVisibility').mockResolvedValue([]);
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(s3Helper, 'preSigningUrl').mockResolvedValue(faker.string.alphanumeric());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(devsLastComm, "loadLastTelemetries_dut").mockImplementationOnce((): any => ({
          lastMessages() { return <any> { '2312312': { ts: 1 }}},
          lastDutTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          lastDutAutTelemetry()  { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          connectionStatus() { return 'ONLINE'; },
          lastTS() { return Date.now() - 10 * 1000; },
        }));
        jest.spyOn(groundFunctions, 'addTemperatureInList').mockReturnValue(groundFactory.mockAddTemperatureList());
        await expect(groundFunctions.listGroundPlanRoute({ UNIT_ID: null as any }, session)).rejects.toThrow('Missing params')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro unidade", async () => {
        const unit = faker.string.numeric({ exclude: '0' });
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(false));
        await expect(groundFunctions.listGroundPlanRoute({ UNIT_ID: Number(unit) }, session)).rejects.toThrow('Permission denied!')
        .catch((error) => {
            expect(error.httpStatus).toBe('403');
        });
      });
    });
  });

  describe("/unit/list-devs-unit", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const unit = faker.string.numeric({ exclude: '0' });
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(groundFunctions, 'verifyPermissionsGroundPlan').mockResolvedValue(groundFactory.mockUnitBasic());
        const get = jest.spyOn(sqldb.DUTS, 'getListDutsBasicGroundPlant').mockResolvedValue([groundFactory.mockDuts()]);
        const telemetry = jest.spyOn(devsLastComm, "loadLastTelemetries_dut").mockImplementationOnce((): any => ({
          lastMessages() { return <any> { '2312312': { ts: 1 }}},
          lastDutTelemetry()     { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          lastDutAutTelemetry()  { return <any>{ lastTelemetry: undefined, status: undefined, lastMessageTS: undefined }; },
          connectionStatus() { return 'ONLINE'; },
          lastTS() { return Date.now() - 10 * 1000; },
        }));
        jest.spyOn(groundFunctions, 'addTemperatureInList').mockReturnValue(groundFactory.mockAddTemperatureList());
        await groundFunctions.listDutsRoute({ UNIT_ID: Number(unit) }, session);
        expect(get).toHaveBeenCalled();
        expect(telemetry).toHaveBeenCalled();
      });
    });
    describe("ERRO", () => {
      test("Erro parametros unit id", async () => {
        const session = generateSessionReal();
        jest.spyOn(groundFunctions, 'addTemperatureInList').mockReturnValue(groundFactory.mockAddTemperatureList());
        await expect(groundFunctions.listDutsRoute({ UNIT_ID: null as any }, session)).rejects.toThrow('Missing params')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro unidade", async () => {
        const unit = faker.string.numeric({ exclude: '0' });
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(false));
        await expect(groundFunctions.listDutsRoute({ UNIT_ID: Number(unit) }, session)).rejects.toThrow('Permission denied!')
        .catch((error) => {
            expect(error.httpStatus).toBe('403');
        });
      });
    });
  });

  describe("/unit/set-points-ground-plan", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const reqParams = groundFactory.mockSetPoints();
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(groundFunctions, 'verifyPermissionsGroundPlan').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(sqldb.DEV_POINTS, 'w_insert').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        jest.spyOn(sqldb.GROUND_PLANS_POINTS, 'w_insert').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        const result = await groundFunctions.setPoints(reqParams, session);
        expect(result).toBe('OK');
      });
    });
    describe("ERRO", () => {
      test("Erro parametros sketch", async () => {
        const reqParams = groundFactory.mockSetPoints();
        const session = generateSessionReal();
        const erroparams: any = reqParams;
        delete reqParams.GROUNDPLAN_ID;
        await expect(groundFunctions.setPoints(erroparams, session)).rejects.toThrow('Missing params')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
    });
  });

  describe("/unit/update-ground-plan", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const reqParams = groundFactory.mockUpdatedGP();
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(groundFunctions, 'verifyPermissionsGroundPlan').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(sqldb.DEV_POINTS, 'getDevPoint').mockResolvedValue([]);
        jest.spyOn(sqldb.GROUND_PLANS, 'w_update').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        jest.spyOn(sqldb.GROUND_PLANS, 'getByIdAndUnit').mockResolvedValue(groundFactory.infoGp());
        jest.spyOn(sqldb.DEV_POINTS, 'w_update').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        jest.spyOn(sqldb.DEV_POINTS, 'w_delete').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        jest.spyOn(sqldb.DEV_POINTS, 'getAllPointsUnit').mockResolvedValue([{
          POINT_ID: Number(faker.string.numeric({exclude: ['0']})),
          DEVICE_ID: Number(faker.string.numeric({exclude: ['0']})),
        }]);
        const result = await groundFunctions.updateGroundPlanRoute(reqParams, session);
        expect(result).toBe('OK');
      });
    });
    describe("ERRO", () => {
      test("Erro parametros sketch", async () => {
        const reqParams = groundFactory.mockUpdatedGP();
        const session = generateSessionReal();
        const erroparams: any = reqParams;
        delete reqParams.GROUNDPLAN_ID;
        await expect(groundFunctions.updateGroundPlanRoute(erroparams, session)).rejects.toThrow('Missing params')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
    });
  });

  describe("/unit/delete-ground-plan", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const reqParams = groundFactory.deleteMock();
        const session = generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(groundFactory.mockPermissionUnit(true));
        jest.spyOn(sqldb.GROUND_PLANS, 'getPointsByGroundPlanId').mockResolvedValue([groundFactory.mockPointsOfGPSql()]);
        jest.spyOn(groundFunctions, 'verifyPermissionsGroundPlan').mockResolvedValue(groundFactory.mockUnitBasic());
        jest.spyOn(sqldb.GROUND_PLANS, 'getByIdAndUnit').mockResolvedValue(groundFactory.infoGp())
        jest.spyOn(sqldb.GROUND_PLANS, 'w_delete').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        jest.spyOn(sqldb.DEV_POINTS, 'w_delete').mockResolvedValue({
          affectedRows: Number(faker.string.numeric({ exclude: '0' })),
          insertId: Number(faker.string.numeric({ exclude: '0' })),
        });
        const result = await groundFunctions.deleteGroundPlanRoute(reqParams, session);
        expect(result).toBe('OK');
      });
    });
    describe("ERRO", () => {
      test("Erro parametros sketch", async () => {
      });
    });
  });
});

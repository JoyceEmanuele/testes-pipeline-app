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
import * as sketchFactory from "../factories/unitsSketchesFactory";
import sqldb from "../../../srcCommon/db";
import { faker } from "@faker-js/faker";
import * as permission from "../../../srcCommon/helpers/permissionControl";
import * as sketchFunction from "../../clientData/unitsSketches";
import { mockedExtraParams } from '../factories/unifiedFactory';
import * as s3Helper from '../../../srcCommon/s3/connectS3';
import { apiUploadService } from '../../extServices/uploadServiceApi'

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("unitsSketches", () => {
  describe("/unit/edit-sketch", () => {
    describe("SUCESSO", () => {
      test("Espera que passe", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.generateParamsEditSketch();
        const check = jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => { return Promise.resolve(sketchFactory.generateUnitInfo)})
        const set = jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
          canManageDevs: true,
          canViewDevs: true,
          canChangeDeviceOperation: true,
          canViewObservations: true,
          canManageObservations: true,
          canManageSketches: true,
          canEditProgramming: true,
        })
        jest.spyOn(mockedExtraParams.req, 'get').mockImplementation((): any => { faker.string.alpha()})
        jest.spyOn(apiUploadService, 'POST /upload-service/edit-sketch').mockResolvedValue((): any => { return null;})
        await sketchFunction.unitEditSketch(reqParams, session, mockedExtraParams);
        expect(check).toHaveBeenCalled();
        expect(set).toHaveBeenCalled();
      });
    });
    describe("ERRO", () => {
      test("Erro parametros sketch", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.generateParamsEditSketch();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.sketchList;
        await expect(sketchFunction.unitEditSketch(reqParamsFalse, session, mockedExtraParams)).rejects.toThrow('There was an error!\nInvalid properties. Missing sketList.')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro parametros unit", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.generateParamsEditSketch();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.unitId;
        await expect(sketchFunction.unitEditSketch(reqParamsFalse, session, mockedExtraParams)).rejects.toThrow('There was an error!\nInvalid properties. Missing sketList.')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro unidade", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.generateParamsEditSketch();
        const check = jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => { return Promise.resolve(undefined)})
        await expect(sketchFunction.unitEditSketch(reqParams, session, mockedExtraParams)).rejects.toThrow('Group not found')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro permission", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.generateParamsEditSketch();
        jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => { return Promise.resolve(sketchFactory.generateUnitInfo)})
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
          canManageDevs: false,
          canViewDevs: true,
          canChangeDeviceOperation: true,
          canViewObservations: true,
          canManageObservations: true,
          canManageSketches: true,
          canEditProgramming: true,
        })
        await expect(sketchFunction.unitEditSketch(reqParams, session, mockedExtraParams)).rejects.toThrow('You dont have the permission')
        .catch((error) => {
            expect(error.httpStatus).toBe('403');
        });
      });
    });
  });

  describe("/unit/download-sketch", () => {
    describe("ERRO", () => {
      test("Erro parametros unitid", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.paramsDownloadSketch();
        const extra = mockedExtraParams;
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.unit_id;
        await expect(sketchFunction.unitDownloadSketches(reqParamsFalse, session, extra)).rejects.toThrow('There was an error!\nInvalid properties. Missing unit_id.')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro parametros sketchid", async () => {
        const session = generateSessionReal();
        const reqParams = sketchFactory.paramsDownloadSketch();
        const extra = mockedExtraParams;
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.UNIT_SKETCH_ID;
        await expect(sketchFunction.unitDownloadSketches(reqParamsFalse, session, extra)).rejects.toThrow('There was an error!\nInvalid properties.')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro parametros filename", async () => {
        const session = generateSessionReal();
        const extra = mockedExtraParams;
        const reqParams = sketchFactory.paramsDownloadSketch();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.FILENAME;
        await expect(sketchFunction.unitDownloadSketches(reqParamsFalse, session, extra)).rejects.toThrow('There was an error!\nInvalid properties.')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro unidade", async () => {
        const session = generateSessionReal();
        const extra = mockedExtraParams;
        const reqParams = sketchFactory.paramsDownloadSketch();
        jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => { return Promise.resolve(undefined)})
        await expect(sketchFunction.unitDownloadSketches(reqParams, session, extra)).rejects.toThrow('Unit not found')
        .catch((error) => {
            expect(error.httpStatus).toBe('400');
        });
      });
      test("Erro permission", async () => {
        const session = generateSessionReal();
        const extra = mockedExtraParams;
        const reqParams = sketchFactory.paramsDownloadSketch();
        jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => { return Promise.resolve(sketchFactory.generateUnitInfo)})
        jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
          canManageDevs: false,
          canViewDevs: false,
          canChangeDeviceOperation: true,
          canViewObservations: true,
          canManageObservations: true,
          canManageSketches: true,
          canEditProgramming: true,
        })
        await expect(sketchFunction.unitDownloadSketches(reqParams, session, extra)).rejects.toThrow('Permission denied!')
        .catch((error) => {
            expect(error.httpStatus).toBe('403');
        });
      });
    });
  });
})
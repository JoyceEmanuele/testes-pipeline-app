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
  generatePermission,
  generateSessionRealNotAdmin,
} from "../../factories/loginFactory";
import * as httpRouter from "../../../apiServer/httpRouter";
import {
  generateReqParamsSetBaselineValue,
  generateReqParamsGetBaselineValue,
  generateUnitClient,
  generateBaseline,
  generateBaselineExtraInfo,
} from "../../factories/baselineValuesFactory";
import sqldb from "../../../../srcCommon/db";
import { fa, faker } from "@faker-js/faker";
import { getPermissionsOnUnit } from "../../../../srcCommon/helpers/permissionControl";
import * as baselineFunctions from "../../../clientData/baselines/baselineValues";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("baselineValues", () => {
  describe("/clients/set-baseline-values", () => {
    describe("SUCESSO", () => {
      test("Espera que chame as funcoes", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const check = jest.spyOn(baselineFunctions, 'checkBaselinevalueToSet').mockResolvedValue()
        const set = jest.spyOn(baselineFunctions, 'setBaselineValue').mockResolvedValue({
          BASELINE_ID: faker.number.int()
        })
        await baselineFunctions.setBaselineValuesRoute(reqParams, session);
        expect(check).toHaveBeenCalled();
        expect(set).toHaveBeenCalled();
      });
    });
  });

  describe('setBaselineValue', () => {
    describe('SUCESSO', () => {
      test('DEVE RETORNAR BASELINE_ID: baselineInfo.BASELINE_ID } -> pelo Update',  async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const baseLine = jest
        .spyOn(sqldb.BASELINE_VALUES, "getUnitBaselineValueInfo")
        .mockResolvedValue(generateBaseline());

      const update = jest
        .spyOn(sqldb.BASELINE_VALUES, "w_updateInfo")
        .mockImplementation((): any => Promise.resolve({}));
      const getBaseline = jest
        .spyOn(sqldb.BASELINES, "getExtraInfo")
        .mockResolvedValueOnce(
          generateBaselineExtraInfo(reqParams.BASELINE_ID)
        );
      const result = await baselineFunctions.setBaselineValue(reqParams, session);
      expect(result).toHaveProperty("BASELINE_ID");
      expect(baseLine).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
      expect(getBaseline).toHaveBeenCalled();
      })
      test('DEVE RETORNAR BASELINE_ID: baselineInfo.BASELINE_ID } -> pelo Insert',  async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const baseLine = jest
        .spyOn(sqldb.BASELINE_VALUES, "getUnitBaselineValueInfo")
        .mockResolvedValue(null as any);
        const insert = jest
        .spyOn(sqldb.BASELINE_VALUES, "w_insert")
        .mockImplementation((): any => Promise.resolve({}));
    
        const getBaseline = jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockResolvedValueOnce(
            generateBaselineExtraInfo(reqParams.BASELINE_ID)
          );
        const result = await baselineFunctions.setBaselineValue(reqParams, session);
        expect(result).toHaveProperty("BASELINE_ID");
        expect(baseLine).toHaveBeenCalled();
        expect(insert).toHaveBeenCalled();
        expect(getBaseline).toHaveBeenCalled();
      })
    })
    describe('FALHA', () => {
      test('Invalid Month > 12', async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();

        jest.fn(getPermissionsOnUnit).mockResolvedValue(generatePermission(true));

        reqParams.baselineValues[0].BASELINE_MONTH = 13;

        await expect(
          baselineFunctions.setBaselineValue(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid Month");
      })

      test('Invalid Month <= 0', async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();

        jest.fn(getPermissionsOnUnit).mockResolvedValue(generatePermission(true));

        reqParams.baselineValues[0].BASELINE_MONTH = 0;

        await expect(
          baselineFunctions.setBaselineValue(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid Month");
      })

      test("'Baseline not found'", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();

        jest
          .spyOn(sqldb.BASELINE_VALUES, "getUnitBaselineValueInfo")
          .mockImplementationOnce((): any => Promise.resolve({}));

        jest
          .spyOn(sqldb.BASELINE_VALUES, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({}));

        jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockImplementationOnce((): any => Promise.resolve(null));
        
        await expect(
          baselineFunctions.setBaselineValue(
            reqParams,
            session
          )
        ).rejects.toThrow("Error inserting Baseline Values");
      });
    })
  });

  describe("checkBaselinevalueToSet", () => {
    describe("SUCESSO", () => {
      test("ESPERA QUE NAO DE ERRO", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();

        jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockResolvedValueOnce(generateUnitClient());

        jest.fn(getPermissionsOnUnit).mockImplementation((): any => {
          Promise.resolve(generatePermission(true));
        });

        await expect(baselineFunctions.checkBaselinevalueToSet(reqParams, session)).resolves.not.toThrow();
      });
    });
    describe("FALHA", () => {
      test("Invalid properties. Missing baselineValues. - Missing UNIT_ID", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.UNIT_ID;

        expect(baselineFunctions.checkBaselinevalueToSet(reqParamsFalse, session)).rejects.toThrow('Invalid properties. Missing UNIT_ID.');
      });
      test("Invalid properties. Missing CLIENT_ID", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.CLIENT_ID;

        expect(baselineFunctions.checkBaselinevalueToSet(reqParamsFalse, session)).rejects.toThrow('Invalid properties. Missing CLIENT_ID.');
      });
      test("Invalid properties. Missing baselineValues.", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.baselineValues;

        expect(baselineFunctions.checkBaselinevalueToSet(reqParamsFalse, session)).rejects.toThrow('Invalid properties. Missing baselineValues.');
      });
      test("Unit not found", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();
        jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockResolvedValueOnce(undefined as any);


        expect(baselineFunctions.checkBaselinevalueToSet(reqParams, session)).rejects.toThrow('Unit not found');
      });

      test("'Permission denied!'", async () => {
        const session = generateSessionRealNotAdmin();
        const reqParams = generateReqParamsSetBaselineValue();

        jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockResolvedValueOnce(generateUnitClient());
        jest.fn(getPermissionsOnUnit).mockRejectedValue(null);

        await expect(
          baselineFunctions.setBaselineValuesRoute(
            reqParams,
            session
          )
        ).rejects.toThrow("Permission denied!");
      });
    });
  });
  describe("/clients/get-baseline-values", () => {
    describe("SUCESSO", () => {
      test("ESPERA QUE RETORNE BASELINES", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();

        const getBaseline = jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockResolvedValueOnce(
            generateBaselineExtraInfo(reqParams.BASELINE_ID)
          );

        const getUnit = jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockResolvedValueOnce(generateUnitClient());

        jest
          .fn(getPermissionsOnUnit)
          .mockImplementation((): any =>
            Promise.resolve(generatePermission(true))
          );

        const getBaselineValues = jest
          .spyOn(sqldb.BASELINE_VALUES, "getUnitBaselineValues")
          .mockResolvedValueOnce([generateBaseline(), generateBaseline()]);

        const result = await baselineFunctions.getBaselineValues(reqParams, session);

        expect(getUnit).toBeCalledWith({
          UNIT_ID: reqParams.UNIT_ID,
          CLIENT_ID: reqParams.CLIENT_ID,
        });
        expect(getBaseline).toBeCalledWith({
          BASELINE_ID: reqParams.BASELINE_ID,
          UNIT_ID: reqParams.UNIT_ID,
        });
        expect(getBaselineValues).toBeCalledWith({
          BASELINE_ID: reqParams.BASELINE_ID,
        });
        expect(result).toBeInstanceOf(Array);
      });
    });
    describe("FALHA", () => {
      test("Invalid properties. Missing UNIT_ID. - Sem enviar UNIT_ID", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.UNIT_ID;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing UNIT_ID.");
      });
      test("Invalid properties. Missing UNIT_ID. - Enviando UNIT_ID nulo", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        reqParams.UNIT_ID = <any>null;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing UNIT_ID.");
      });
      test("Invalid properties. Missing CLIENT_ID. - Sem enviar CLIENT_ID", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.CLIENT_ID;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing CLIENT_ID.");
      });
      test("Invalid properties. Missing CLIENT_ID. - Enviando CLIENT_ID nulo", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        reqParams.CLIENT_ID = <any>null;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing CLIENT_ID.");
      });
      test("Invalid properties. Missing BASELINE_ID. - Sem enviar BASELINE_ID", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.BASELINE_ID;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing BASELINE_ID.");
      });
      test("Invalid properties. Missing BASELINE_ID. - Enviando BASELINE_ID nulo", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();
        reqParams.BASELINE_ID = <any>null;

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Invalid properties. Missing BASELINE_ID.");
      });
      test("Baseline not found", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsGetBaselineValue();

        jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockImplementationOnce((): any => Promise.resolve(null));

        const permissions = jest
          .fn(getPermissionsOnUnit)
          .mockImplementationOnce((): any => Promise.resolve({}));

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Baseline not found");
        expect(permissions).not.toHaveBeenCalled();
      });
      test("Unit not found", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsSetBaselineValue();

        jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockResolvedValueOnce(
            generateBaselineExtraInfo(faker.number.int({min: 1}))
          );

        jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockImplementationOnce((): any => Promise.resolve());

        const permissions = jest
          .fn(getPermissionsOnUnit)
          .mockImplementationOnce((): any => Promise.resolve());

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Unit not found");
        expect(permissions).not.toHaveBeenCalled();
      });
      test("Permission denied!", async () => {
        const session = generateSessionRealNotAdmin();
        const reqParams = generateReqParamsGetBaselineValue();

        jest
          .spyOn(sqldb.BASELINES, "getExtraInfo")
          .mockResolvedValueOnce(
            generateBaselineExtraInfo(faker.number.int({min: 1}))
          );

        jest
          .spyOn(sqldb.CLUNITS, "getUnitBasicInfo")
          .mockResolvedValueOnce(generateUnitClient());

        jest.fn(getPermissionsOnUnit).mockRejectedValue(null);

        await expect(
          baselineFunctions.getBaselineValues(
            reqParams,
            session
          )
        ).rejects.toThrow("Permission denied!");
      });
    });
  });
});

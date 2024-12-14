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
    generateSessionNoPermissions,
    generateSessionReal,
  } from "../factories/loginFactory";
  import * as unitsFactory from "../factories/unitsFactory";
  import sqldb from "../../../srcCommon/db";
  import { faker } from "@faker-js/faker";
  import * as permission from "../../../srcCommon/helpers/permissionControl";
  import * as unitsFunctions from '../../clientData/units';
  import * as htmlFunctions from '../../clientData/htmlGenerateFunctions';
  import * as sketchFactory from "../factories/unitsSketchesFactory";
  import * as dutFunctions from "../../dutAutomation";
  import * as environment from "../../clientData/htmlEnvrionmentGenerateFunction";
  import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import axios from "axios";
  
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  
  describe("units", () => {
    describe("multipleConfigsUnits", () => {
      describe("SUCESSO", () => {
        test("Espera que passe setStatus", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(unitsFactory.generatePermissionOnClient(true));
          jest.spyOn(unitsFunctions, 'verifyStatus').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyWeeklyReport').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyResponsible').mockImplementation((): any => { return Promise.resolve()})
          const response = await unitsFunctions.multipleConfigsUnits(reqParams, session)
          expect(response).toBe('OK')
        });
        test("Espera que passe setWeeklyReport", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(unitsFactory.generatePermissionOnClient(true));
          jest.spyOn(unitsFunctions, 'verifyStatus').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyWeeklyReport').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyResponsible').mockImplementation((): any => { return Promise.resolve()})
          const response = await unitsFunctions.multipleConfigsUnits(reqParams, session)
          expect(response).toBe('OK')
        });
        test("Espera que passe verifyResponsible", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus')
          jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(unitsFactory.generatePermissionOnClient(true));
          jest.spyOn(unitsFunctions, 'verifyStatus').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyWeeklyReport').mockImplementation((): any => { return Promise.resolve()})
          jest.spyOn(unitsFunctions, 'verifyResponsible').mockImplementation((): any => { return Promise.resolve()})
          const response = await unitsFunctions.multipleConfigsUnits(reqParams, session)
          expect(response).toBe('OK')
        });
      });
      describe("ERRO", () => {
        test("Erro parametros", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          const reqParamsFalse = reqParams as any;
          delete reqParamsFalse.UNITS_IDS;
          jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(unitsFactory.generatePermissionOnClient(false));
          await expect(unitsFunctions.multipleConfigsUnits(reqParamsFalse, session)).rejects.toThrow('There was an error! Invalid properties.')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
        test("Erro permissions", async () => {
          const session = generateSessionNoPermissions();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(unitsFactory.generatePermissionOnClient(false));
          await expect(unitsFunctions.multipleConfigsUnits(reqParams, session)).rejects.toThrow('You dont have permission')
          .catch((error) => {
              expect(error.httpStatus).toBe('401');
          });
        });
      });
    });
  
    describe("verifyWeeklyReport", () => {
      describe("SUCESSO", () => {
        test("Espera que passe com sucesso weeklyreport", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams('enable', 'setWeeklyReport');
          const update = jest.spyOn(sqldb.CLUNITS, 'w_update').mockResolvedValue({
            affectedRows: 1,
            insertId: 1
          })
          await unitsFunctions.verifyWeeklyReport(reqParams, session);
          expect(update).toHaveBeenCalledTimes(2);
        });
      });
      describe("ERRO", () => {
        test("Erro update weeklyreport", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams('enable', 'setWeeklyReport');
          jest.spyOn(sqldb.CLUNITS, 'w_update').mockRejectedValue({
            affectedRows: 1,
            insertId: 1
          })
          await expect(unitsFunctions.verifyWeeklyReport(reqParams, session)).rejects.toThrow('Error update weekly reports')
          .catch((error) => {
              expect(error.httpStatus).toBe('408');
          });
        });
      });
    });    
    describe("verifyResponsible", () => {
      describe("SUCESSO", () => {
        test("Espera que passe verifyResponsible to call", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams('clear', 'setResponsible');
          const loop = jest.spyOn(unitsFunctions, 'loopSetSupervisors').mockResolvedValue()
          await unitsFunctions.verifyResponsible(reqParams, session);
          expect(loop).toHaveBeenCalled();
        });
      });
    });

    describe("verifyLoopResponsible", () => {
      describe("SUCESSO", () => {
        test("Espera que passe verifyResponsibleClear", async () => {
          const session = generateSessionReal();
          const deleteRow = jest.spyOn(sqldb.UNITSUPERVISORS, 'w_clearUnitSupervisors').mockResolvedValue({
            affectedRows: 1,
            insertId: 1
          })
          await unitsFunctions.loopSetSupervisors({ UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})), SUPERVISOR_ID: faker.string.numeric({ exclude: ['0']})}, session, null);
          expect(deleteRow).toHaveBeenCalledTimes(1);
        });
        test("Espera que passe verifyResponsible SetRow", async () => {
          const session = generateSessionReal();
          const setRow = jest.spyOn(unitsFunctions, 'setSupervisor').mockResolvedValue();
          await unitsFunctions.loopSetSupervisors({ UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})), SUPERVISOR_ID: null  as any}, session, faker.string.numeric({ exclude: ['0']}));
          expect(setRow).toHaveBeenCalledTimes(1);
        });
        test("Espera que passe verifyResponsible update", async () => {
          const session = generateSessionReal();
          jest.spyOn(sqldb.UNITSUPERVISORS, 'w_clearUnitSupervisors').mockResolvedValue({
            affectedRows: 1,
            insertId: 1
          })
          const setRow = jest.spyOn(unitsFunctions, 'setSupervisor').mockResolvedValue();
          await unitsFunctions.loopSetSupervisors({ UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})), SUPERVISOR_ID: faker.string.numeric({ exclude: ['0']})}, session, faker.string.numeric({ exclude: ['0']}));
          expect(setRow).toHaveBeenCalledTimes(1);
        });
      });
      describe("ERRO", () => {
        test("Erro parametros promisseAll", async () => {
          const session = generateSessionReal();
          jest.spyOn(sqldb.UNITSUPERVISORS, 'w_clearUnitSupervisors').mockRejectedValue({
            affectedRows: 1,
            insertId: 1
          })
          await expect(unitsFunctions.loopSetSupervisors({ UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})), SUPERVISOR_ID: faker.string.numeric({ exclude: ['0']})}, session, null)).rejects.toThrow('Error update Units Responsibles')
          .catch((error) => {
              expect(error.httpStatus).toBe('408');
          });
        });
      });
    });
    describe("verifyStatus", () => {
      describe("SUCESSO", () => {
        test("Espera que passe com operation", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams('operation', 'setStatus');
          const setRow = jest.spyOn(sqldb.CLUNITS, 'w_update').mockResolvedValue({
            affectedRows: 1,
            insertId: 1
          })
          await unitsFunctions.verifyStatus(reqParams, session);
          expect(setRow).toHaveBeenCalledTimes(2);
        });
        test("Espera que passe sem operation", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          const setRow = jest.spyOn(sqldb.CLUNITS, 'w_update').mockResolvedValue({
            affectedRows: 1,
            insertId: 1
          })
          await unitsFunctions.verifyStatus(reqParams, session);
          expect(setRow).toHaveBeenCalledTimes(2);
        });
      });
      describe("ERRO", () => {
        test("Erro update status", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateUnitsMultiReqParams(faker.string.alpha(), 'setStatus');
          jest.spyOn(sqldb.CLUNITS, 'w_update').mockRejectedValue({
            affectedRows: 1,
            insertId: 1
          })
          await expect(unitsFunctions.verifyStatus(reqParams, session)).rejects.toThrow('Error update Units Status')
          .catch((error) => {
              expect(error.httpStatus).toBe('408');
          });
        });
      });
    });

    describe("exportReportRealTime", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('machine', 'mosaic');
          const extra = unitsFactory.mockedExtraParams;
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
            canManageDevs: true,
            canViewDevs: true,
            canChangeDeviceOperation: true,
            canManageObservations: true,
            canViewObservations: true,
            canManageSketches: true,
            canEditProgramming: true,
          })
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          const mosaicVerify = jest.spyOn(unitsFunctions, 'mosaicDecide').mockResolvedValue();
          const infoUnit = jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockResolvedValue(sketchFactory.generateUnitInfo())
          await unitsFunctions.exportReportRealTime(reqParams, session, extra);
          expect(infoUnit).toBeCalled();
          expect(mosaicVerify).toBeCalled();
        });
      });
      describe("ERRO", () => {
        test("Error in parameters", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('machine', 'mosaic');
          const reqParamsFalse = reqParams as any;
          delete reqParamsFalse.EXPORTATION;
          const extra = unitsFactory.mockedExtraParams;
          await expect(unitsFunctions.exportReportRealTime(reqParamsFalse, session, extra)).rejects.toThrow('Error in parameters')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
        
        test("Permission denied", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('machine', 'mosaic');
          const extra = unitsFactory.mockedExtraParams;
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
            canManageDevs: false,
            canViewDevs: false,
            canChangeDeviceOperation: false,
            canManageObservations: true,
            canViewObservations: true,
            canManageSketches: true,
            canEditProgramming: true,
          })
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          await expect(unitsFunctions.exportReportRealTime(reqParams, session, extra)).rejects.toThrow('Permission denied')
          .catch((error) => {
              expect(error.httpStatus).toBe('403');
          });
        });
        test("Unidade não encontrada", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('machine', 'mosaic');
          const extra = unitsFactory.mockedExtraParams;
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
            canManageDevs: true,
            canViewDevs: true,
            canChangeDeviceOperation: true,
            canManageObservations: true,
            canViewObservations: true,
            canManageSketches: true,
            canEditProgramming: true,
          })
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => {})

          await expect(unitsFunctions.exportReportRealTime(reqParams, session, extra)).rejects.toThrow('Unidade não encontrada')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
      });
    });
    describe("getMachineHtml", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne", async () => {
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('machine', 'mosaic');
          const infoUnit = sketchFactory.generateUnitInfo();
          const language = 'pt';
          const session = generateSessionReal();
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue({
            canManageDevs: true,
            canViewDevs: true,
            canChangeDeviceOperation: true,
            canManageObservations: true,
            canViewObservations: true,
            canManageSketches: true,
            canEditProgramming: true,
          })
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
          jest.spyOn(unitsFunctions, 'getSetPointOfDuts').mockResolvedValue({});
          jest.spyOn(dutFunctions, 'addIrCodeinList').mockResolvedValue();
          jest.spyOn(htmlFunctions, 'generateHtmlContainerItemMachine').mockResolvedValue('teste');
          jest.spyOn(htmlFunctions, 'generateSistemContainerItem').mockResolvedValue('teste');
          const result = await unitsFunctions.getMachineHtml(language, infoUnit, reqParams, session);
          expect(typeof result).toBe("string");
        });
      });
    });
    describe("getSetPointOfDuts", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne", async () => {
          const list = [faker.string.alpha(), faker.string.alpha()]
          const setpoint = jest.spyOn(sqldb.DEVICES, 'getSetPointDutAut').mockResolvedValue({ SETPOINT: faker.number.int() });
          const result = await unitsFunctions.getSetPointOfDuts(list);
          expect(setpoint).toBeCalledTimes(2);
          expect(typeof result).toBe("object");
        });
      });
    });
    describe("getEnvironmentHtml", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne", async () => {
          jest.spyOn(environment, 'generateHtmlContainerItemEnvironment').mockReturnValue('');
          const session = generateSessionReal();
          const infoUnit = sketchFactory.generateUnitInfo();
          const language = 'pt';
          const reqParams = unitsFactory.generateReqparamsExportRealTimeMachine('environments', 'mosaic');
          const result = unitsFunctions.getEnvironmentsHtml(language, infoUnit, reqParams, session);
          expect(typeof result).toBe("string");
        });
      });
    });
    describe("getAllUnitsByClient", () => {
      describe('Success', () => {
        test('Ok', async () => {
          let reqParams = unitsFactory.mockReqParamsGetAllUnitsByClient();
          reqParams.UNITS_WITH_OTHERS_TIMEZONES = <any>null;
          reqParams.FILTER_BY_UNIT_IDS = <any>null;
          reqParams.FILTER_BY_PRODUCTION_TIMESTAMP = <any>null;
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getAllUnitsByClient').mockResolvedValue(unitsFactory.mockGetAllUnitsByClient());
          const response = await unitsFunctions.getAllUnitsProductionByClient(reqParams, session);
          expect(response).toBeDefined();
        });
        test('Ok with filters', async () => {
          let reqParams = unitsFactory.mockReqParamsGetAllUnitsByClient();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getAllUnitsByClient').mockResolvedValue(unitsFactory.mockGetAllUnitsByClient());
          const response = await unitsFunctions.getAllUnitsProductionByClient(reqParams, session);
          expect(response).toBeDefined();
        });
      });
      describe('Error', () => {
        test('Missing CLIENT_ID', async () => {
          let reqParams = unitsFactory.mockReqParamsGetAllUnitsByClient();
          reqParams.CLIENT_ID = <any>null;
          const session = generateSessionReal();
  
          await expect(unitsFunctions.getAllUnitsProductionByClient(reqParams, session)).rejects.toThrow('Invalid properties. Missing CLIENT_ID')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test('Permission Denied', async () => {
          let reqParams = unitsFactory.mockReqParamsGetAllUnitsByClient();
          const session = generateSessionNoPermissions();
  
          await expect(unitsFunctions.getAllUnitsProductionByClient(reqParams, session)).rejects.toThrow('Permission Denied!')
            .catch((error) => {
              expect(error.httpStatus).toBe('403');
            });
        });
      });
    });

    describe("getObservationRoute", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne a lista de observacoes", async () => {
          const session = generateSessionReal();
          const reqParams = {
            unitId: faker.number.int(),
          }
          jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue( {
            TIMEZONE_ID: 31,
            TIMEZONE_AREA: "America/Sao_Paulo",
            TIMEZONE_OFFSET: -3,
          });
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          const getlist = jest.spyOn(sqldb.OBSERVATIONS, 'getObsByUnitId').mockResolvedValue([unitsFactory.generateObservation()]);
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          await unitsFunctions.getObservationRoute(reqParams, session);
          expect(getlist).toHaveBeenCalled();
        });
      });
      describe("ERRO", () => {
        test("Params", async () => {
          const session = generateSessionReal();
          const reqParams = {
          } as any;
          await expect(unitsFunctions.getObservationRoute(reqParams, session)).rejects.toThrow('Missing Params')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
        test("Permission", async () => {
          const session = generateSessionReal();
          const reqParams = {
            unitId: Number(faker.string.numeric({ exclude: ['0'] })),
          };
          jest.spyOn(sqldb.CLUNITS, 'getTimezoneByUnit').mockResolvedValue( {
            TIMEZONE_ID: 31,
            TIMEZONE_AREA: "America/Sao_Paulo",
            TIMEZONE_OFFSET: -3,
          });
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(false));
          await expect(unitsFunctions.getObservationRoute(reqParams, session)).rejects.toThrow('Permission denied!')
          .catch((error) => {
              expect(error.httpStatus).toBe('403');
          });
        });
      });
    });
    describe("setObservationRoute", () => {
      describe("SUCESSO", () => {
        test("Espera que crie observacao", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateObservationSample();
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(sqldb.OBSERVATIONS, 'w_update').mockResolvedValue({
            affectedRows: Number(faker.string.numeric({ exclude: ['0'] })),
            insertId: Number(faker.string.numeric({ exclude: ['0'] })),
          });
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          const result = await unitsFunctions.setObservationRoute(reqParams, session);
          expect(result).toBe("OK");
        });
        test("Espera que edite observacao", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateObservationSample();
          delete reqParams.ID;
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(sqldb.OBSERVATIONS, 'w_insert').mockResolvedValue({
            affectedRows: Number(faker.string.numeric({ exclude: ['0'] })),
            insertId: Number(faker.string.numeric({ exclude: ['0'] })),
          });
          jest.spyOn(sqldb.UNITS_OBSERVATIONS, 'w_insert').mockResolvedValue({
            affectedRows: Number(faker.string.numeric({ exclude: ['0'] })),
            insertId: Number(faker.string.numeric({ exclude: ['0'] })),
          });
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          const result = await unitsFunctions.setObservationRoute(reqParams, session);
          expect(result).toBe("OK");
        });
      });
      describe("ERRO", () => {
        test("Params", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateObservationSample() as any;
          delete reqParams.ID;
          delete reqParams.UNIT_ID;
          await expect(unitsFunctions.setObservationRoute(reqParams, session)).rejects.toThrow('Missing Params')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
        test("Permission", async () => {
          const session = generateSessionReal();
          const reqParams = unitsFactory.generateObservationSample();
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(false));
          await expect(unitsFunctions.setObservationRoute(reqParams, session)).rejects.toThrow('Permission denied!')
          .catch((error) => {
              expect(error.httpStatus).toBe('403');
          });
        });
      });
    });   
    describe("deleteObservationRoute", () => {
      describe("SUCESSO", () => {
        test("Espera que retorne ok", async () => {
          const session = generateSessionReal();
          const reqParams = {
            observation: { ID: Number(faker.string.numeric({ exclude: ['0'] })),},
            unitId: Number(faker.string.numeric({ exclude: ['0'] })),
          }
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(sqldb.OBSERVATIONS, 'w_deleteRow').mockResolvedValue({
            affectedRows: Number(faker.string.numeric({ exclude: ['0'] })),
            insertId: Number(faker.string.numeric({ exclude: ['0'] })),
          });
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          const result = await unitsFunctions.deleteObservationRoute(reqParams, session);
          expect(result).toBe("OK");
        });
      });
      describe("ERRO", () => {
        test("Params", async () => {
          const session = generateSessionReal();
          const reqParams = {
          } as any;
          await expect(unitsFunctions.deleteObservationRoute(reqParams, session)).rejects.toThrow('Missing Params')
          .catch((error) => {
              expect(error.httpStatus).toBe('400');
          });
        });
        test("Permission", async () => {
          const session = generateSessionReal();
          const reqParams = {
            observation: { ID: Number(faker.string.numeric({ exclude: ['0'] })),},
            unitId: Number(faker.string.numeric({ exclude: ['0'] })),
          };
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(false));
          await expect(unitsFunctions. deleteObservationRoute(reqParams, session)).rejects.toThrow('Permission denied!')
          .catch((error) => {
              expect(error.httpStatus).toBe('403');
          });
        });
      });
    });
    describe("getRefrigerationConsumptionUnit", () => {
      describe("Success", () => {
        test('Ok', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(unitsFactory.mockGetRefrigerationConsumptionComputedDataService()));

          const result = await unitsFunctions.getRefrigerationConsumptionUnit(reqParams, session);
          expect(result).toBeDefined()
          expect(result.total_consumption).toBeDefined();
        });
      });
      describe("Error", () => {
        test('Missing UNIT_ID', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          reqParams.UNIT_ID = <any>null;
          const session = generateSessionReal();
  
          await expect(unitsFunctions.getRefrigerationConsumptionUnit(reqParams, session)).rejects.toThrow('Invalid properties. Missing UNIT_ID')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test("Missing Dates", async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();
  
          reqParams.START_DATE = <any>null;
          reqParams.END_DATE = <any>null;
  
          await expect(unitsFunctions.getRefrigerationConsumptionUnit(reqParams, session)).rejects.toThrow('Invalid properties. Missing Dates')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test("Unit not found", async () => {
          const reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();
  
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(null);
  
          await expect(unitsFunctions.getRefrigerationConsumptionUnit(reqParams, session)).rejects.toThrow('Unit not found')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test('Permission Denied', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(false));
  
          await expect(unitsFunctions.getRefrigerationConsumptionUnit(reqParams, session)).rejects.toThrow('Permission Denied!')
            .catch((error) => {
              expect(error.httpStatus).toBe('403');
            });
        });
      });
    });
    describe("getEnergyConsumptionUnit", () => {
      describe("Success", () => {
        test('Ok without energy_devices', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue([]);


          const result = await unitsFunctions.getEnergyConsumptionUnit(reqParams, session);
          expect(result).toBeDefined();
          expect(result.consumptionByDevice).toHaveLength(0);
        });
        test('Ok with energy_devices', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(true));
          jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(unitsFactory.mockGetEnergyDevicesByUnit());
          jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(unitsFactory.mockGetEnergyConsumptionComputeDataService()));
          
          const result = await unitsFunctions.getEnergyConsumptionUnit(reqParams, session);
          expect(result).toBeDefined();
          expect(result.consumptionByDevice).not.toHaveLength(0);
        });
      });
      describe("Error", () => {
        test('Missing UNIT_ID', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          reqParams.UNIT_ID = <any>null;
          const session = generateSessionReal();
  
          await expect(unitsFunctions.getEnergyConsumptionUnit(reqParams, session)).rejects.toThrow('Invalid properties. Missing UNIT_ID')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test("Missing Dates", async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();
  
          reqParams.START_DATE = <any>null;
          reqParams.END_DATE = <any>null;
  
          await expect(unitsFunctions.getEnergyConsumptionUnit(reqParams, session)).rejects.toThrow('Invalid properties. Missing Dates')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test("Unit not found", async () => {
          const reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();
  
          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(null);
  
          await expect(unitsFunctions.getEnergyConsumptionUnit(reqParams, session)).rejects.toThrow('Unit not found')
            .catch((error) => {
              expect(error.httpStatus).toBe('400');
            });
        });
        test('Permission Denied', async () => {
          let reqParams = unitsFactory.mockParamsGetEnergyUnit();
          const session = generateSessionReal();

          jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(unitsFactory.mockUnitBasic());
          jest.spyOn(permission, 'getPermissionsOnUnit').mockResolvedValue(unitsFactory.generatePermissionOnUnit(false));
  
          await expect(unitsFunctions.getEnergyConsumptionUnit(reqParams, session)).rejects.toThrow('Permission Denied!')
            .catch((error) => {
              expect(error.httpStatus).toBe('403');
            });
        });
      });
    })
  })
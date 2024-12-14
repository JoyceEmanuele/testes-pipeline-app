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

import sqldb from '../../../../srcCommon/db';
import { exportMachinesAnalysisList, getTotalAnalyseMachinesRoutes, getFiltersAnalysisMachines, getListAnalyseMachinesRoutes } from "../../../analise/machines";
import { mockGetLanguage, mockGetPrefsUser } from '../../factories/driInfoFactory';
import * as factoriesLogin from '../../factories/loginFactory';
import * as factoriesMachines from '../../factories/machinesAnalisys';
import * as languageFunctions from "../../../../srcCommon/helpers/i18nextradution";
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

describe("Machines", () => {
  describe("/unit/get-list-analyse-machines", () => {
      describe("Success", () => {
        test("Success", async () => {
          const session = factoriesLogin.generateSessionReal();
          jest.spyOn(sqldb.MACHINES, "getMachinesInfoAnalysis").mockResolvedValueOnce(factoriesMachines.mockReturnMachinesInfoAnalisys());
          jest.spyOn(sqldb.ASSETS, "getListAssetMachinesAnalysis").mockResolvedValueOnce([factoriesMachines.mockGetListAssetMachinesAnalysis()]);
          jest.spyOn(sqldb.ASSETS, "getMachinesIds").mockResolvedValueOnce([factoriesMachines.mockgetMachinesIds()]);
          jest.spyOn(sqldb.DUTS_SCHEDULES, "getDutScheds").mockResolvedValue([]);
          const result = await getListAnalyseMachinesRoutes({ offset: 10, groupIds: [] }, session);
          expect(result[0]).toHaveProperty("ASSETS");
        });
      });
  });
  describe("/unit/get-total-analyse-machines", () => {
    describe("Success", () => {
      test("success", async () => {
        const session = factoriesLogin.generateSessionReal();
        jest.spyOn(sqldb.ASSETS, "getTotalInfoAssets").mockResolvedValueOnce(factoriesMachines.getTotalInfoAssets());
        jest.spyOn(sqldb.MACHINES, "getMachinesInfoConnectionAnalysis").mockResolvedValueOnce(factoriesMachines.getTotalConnMachines());
        jest.spyOn(sqldb.ASSETS, "getMachinesIds").mockResolvedValueOnce([]);
        jest.spyOn(sqldb.ASSETS, "machinesSelect").mockResolvedValueOnce([]);
        jest.spyOn(sqldb.MACHINES, "getMachinesTotalRatedPower").mockResolvedValueOnce(factoriesMachines.getTotalMachinesKW());
        const result = await getTotalAnalyseMachinesRoutes({ groupIds: [] }, session);
        expect(result).toHaveProperty("TOTAL_CAPACITY_PWR");
        expect(result).toHaveProperty("TOTAL_STATE");
      })
    });
  });
  describe("/unit/get-filters-analyse-machines", () => {
    describe("Success", () => {
      test("success", async () => {
        const session = factoriesLogin.generateSessionReal();
        jest.spyOn(sqldb.CLUNITS, "getListUnitsFilters").mockResolvedValueOnce([factoriesMachines.mockgetListUnitsFilters()]);
        jest.spyOn(sqldb.CLIENTS, "getAllClientsEnabled").mockResolvedValueOnce([factoriesMachines.mockgetAllClientsEnabled()]);
        jest.spyOn(sqldb.MACHINES, "getAllMachinesInfo").mockResolvedValueOnce([factoriesMachines.mockgetAllMachinesInfo()]);
        jest.spyOn(sqldb.CITY, "getAllCitiesFiltered").mockResolvedValueOnce([factoriesMachines.mockgetAllCitiesFiltered()]);
        jest.spyOn(sqldb.STATEREGION, "selectStates").mockResolvedValueOnce([factoriesMachines.mockselectStates()]);
        jest.spyOn(sqldb.AV_OPTS, "getMachineOpts").mockResolvedValueOnce([factoriesMachines.mockgetAllMachinesTypeInfo()]);
        jest.spyOn(sqldb.CURRENT_AUTOMATIONS_PARAMETERS, "getAllModes").mockResolvedValueOnce([factoriesMachines.mockgetAllMode()]);
        jest.spyOn(sqldb.CURRENT_DEVICE_STATE, "getStates").mockResolvedValueOnce([factoriesMachines.mockgetAllState()]);
        const result = await getFiltersAnalysisMachines({}, session);
        expect(result).toHaveProperty('CLIENTS');
        expect(result).toHaveProperty('UNITS');
        expect(result).toHaveProperty('STATES');
        expect(result).toHaveProperty('CITIES');
        expect(result).toHaveProperty('MACHINES');
      })
    });
  });
  describe("/machines/export-machines-analysis-list", () => {
    describe("Success", () => {
      test("Success", async () => {
        const session = factoriesLogin.generateSessionReal();
        const extra = factoriesMachines.mockedExtraParams;
        const reqParams = factoriesMachines.mockParamsExportMachinesAnalysisList();
        
        jest.spyOn(sqldb.MACHINES, "getMachinesInfoAnalysis").mockResolvedValueOnce(factoriesMachines.mockReturnMachinesInfoAnalisys());
        jest.spyOn(sqldb.ASSETS, "getListAssetMachinesAnalysis").mockResolvedValueOnce([factoriesMachines.mockGetListAssetMachinesAnalysis()]);
        jest.spyOn(sqldb.DASHUSERS, 'getPrefsUser').mockResolvedValue(mockGetPrefsUser());
        jest.spyOn(languageFunctions, 'getLanguage').mockImplementation((): any => mockGetLanguage());
        jest.spyOn(sqldb.ASSETS, "getMachinesIds").mockResolvedValueOnce([]);
        jest.spyOn(sqldb.ASSETS, "machinesSelect").mockResolvedValueOnce([]);

        const result = await exportMachinesAnalysisList(reqParams, session, extra);
        expect(result.status).toHaveBeenCalledWith(200);
      })
    });
  });
});

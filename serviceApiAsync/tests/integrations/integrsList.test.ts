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
import "../../integrations/integrsList";
import * as integrsList from "../../integrations/integrsList";
import * as httpRouter from "../../apiServer/httpRouter";
import { faker } from "@faker-js/faker";
import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import * as loginFactories from "../factories/loginFactory";
import {
  greenAntListGenerator,
  getListENERGY_DEVICES,
  getExtraInfoDRIS,
  getListELECTRIC_CIRCUITS,
  getElectricCircuitsList
} from "../factories/integrsListFactory";
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";

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
}

describe("integrsList", () => {
  describe("/get-integrations-list/energy", () => {
    describe("SUCESSO", () => {
      test("Teste deve retornar lista dos dispositivos de energia", async () => {
        const session = loginFactories.generateSessionReal();
        jest.spyOn(integrsList, "verifyPermissionsListEnergy").mockImplementation();
        const listGreenAnt = jest
          .spyOn(sqldb.CLUNITS, "getUnitsList2")
          .mockImplementationOnce((): any => {
            return Promise.resolve(greenAntListGenerator());
          });
        const getList = jest
          .spyOn(sqldb.ENERGY_DEVICES_INFO, "getList")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getListENERGY_DEVICES());
          });
        jest
          .spyOn(sqldb.DRIS, "getListBasic")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getExtraInfoDRIS());
          });
        jest
          .spyOn(sqldb.ELECTRIC_CIRCUITS, "getListDisassociate")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getListELECTRIC_CIRCUITS());
          });
        mockRealtimeCalls();
        jest
          .spyOn(sqldb.ELECTRIC_CIRCUITS, "getListDisassociate")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getElectricCircuitsList());
          });
        const { list: result } = await integrsList.getIntegrationsListEnergy({}, session);
        expect(result).toHaveLength(2);
        expect(getList).toHaveBeenCalled();
        expect(listGreenAnt).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Array);
      });
      test("Teste sem detectar DIEL ENERGIA dispositivo", async () => {
        const session = loginFactories.generateSessionReal();
        jest.spyOn(integrsList, "verifyPermissionsListEnergy").mockImplementation();
        const listGreenAnt = jest
          .spyOn(sqldb.CLUNITS, "getUnitsList2")
          .mockImplementationOnce((): any => {
            return Promise.resolve(greenAntListGenerator());
          });
        const getList = jest
          .spyOn(sqldb.ENERGY_DEVICES_INFO, "getList")
          .mockImplementationOnce((): any => {
            const list = getListENERGY_DEVICES();
            list[0].MANUFACTURER = "";
            return Promise.resolve(list);
          });
        jest
          .spyOn(sqldb.DRIS, "getListBasic")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getExtraInfoDRIS());
          });
        jest
          .spyOn(sqldb.ELECTRIC_CIRCUITS, "getListDisassociate")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getListELECTRIC_CIRCUITS());
          });
        mockRealtimeCalls();
        jest
          .spyOn(sqldb.ELECTRIC_CIRCUITS, "getListDisassociate")
          .mockImplementationOnce((): any => {
            return Promise.resolve(getElectricCircuitsList());
          });
        const { list: result } = await integrsList.getIntegrationsListEnergy({}, session);
        expect(result).toHaveLength(1);
        expect(getList).toHaveBeenCalled();
        expect(listGreenAnt).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Array);
      });
      test("Teste deve passar mesmo com permissoes mais baixas", async () => {
        const session = loginFactories.generateSessionReal();
        session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS = false;
        const reqParams = {
        }
        jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
          clientIds: [faker.number.int()],
          unitIds: [faker.number.int(), faker.number.int()],
        })
        await integrsList.verifyPermissionsListEnergy(session, reqParams);
        expect(reqParams).not.toBeNull()
      });
      test("Teste deve passar com permissoes mais altas", async () => {
        const session = loginFactories.generateSessionReal();
        const reqParams = {
        }
        jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
          clientIds: [faker.number.int()],
          unitIds: [faker.number.int(), faker.number.int()],
        })
        await integrsList.verifyPermissionsListEnergy(session, reqParams);
        expect(reqParams).toEqual({})
      });
    });
  });
});
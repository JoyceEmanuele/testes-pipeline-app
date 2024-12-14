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

import * as factories from "../factories/dmtInfoFactory";
import servConfig from "../../../configfile";
import * as httpRouter from "../../apiServer/httpRouter";
import * as dmtInfo from "../../../serviceApiAsync/dmt/dmtInfo";
import * as factoriesLogin from "../../tests/factories/loginFactory";
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";
import * as dalInfo from '../../../serviceApiAsync/dal/dalInfo';
import sqldb from '../../../srcCommon/db';
import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import * as dmtHelper from '../../../serviceApiAsync/dmt/dmtInfoHelper';
import { faker } from '@faker-js/faker';

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

function mockRealtimeCalls() {
  jest.spyOn(devsLastComm, "loadLastMessagesTimes").mockImplementationOnce((): any => ({
    connectionStatus() { return 'ONLINE'; },
  }));
  jest.spyOn(devsLastComm, "loadLastTelemetries").mockImplementation((): any => ({
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

expect.extend({
  checkFreePorts(received) {
    let associateds = 0;
    for (const port of received.ports) {
      if (port.associated && port.nobreakId) associateds++;
    }

    if (associateds < 3 && !received.freePorts) {
      return {
        message: () => `expected freePorts equal to TRUE`,
        pass: false,
      };
    }
    if (associateds >= 3 && received.freePorts) {
      return {
        message: () => `expected freePorts equal to FALSE`,
        pass: false,
      };
    } else {
      return { message: () => "expected freePorts was returned", pass: true };
    }
  },
});

interface CustomMatchers<R = unknown> {
  checkFreePorts(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

describe("Dmt Info", () => {
  describe("/dmt/get-dmt-ports-info", () => {
    describe("Success", () => {
      test("should return object with freePorts property equal to true if the ports array has ports not associates", async () => {
        servConfig.isTestServer = false;
        const reqParams = { DMT_CODE: "DMT000000000" };

        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
        jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: true })
          );
        jest
          .spyOn(dmtInfo, "checkAvailablePorts")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateDmtPortsInfo())
          );

        const response = await httpRouter.privateRoutes[
          "/dmt/get-dmt-ports-info"
        ](reqParams, factoriesLogin.generateSessionReal());
        expect(response).checkFreePorts();
      });
    });
    describe("Error", () => {
      test('should throw if user has no permissions', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DMT_CODE: 'DMT00000000', CLIENT_ID: 1};
        jest.spyOn(sqldb.DEVICES, "getBasicInfo").mockImplementationOnce((): any => ({CLIENT_ID: 1}));
        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: false}));
        try{
          const response = await httpRouter.privateRoutes['/dmt/get-dmt-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('Permission denied!');
          expect(error).toHaveProperty("Status", 403);
        }
      });
      test("should throw an error if invalid DMT_CODE in reqParams", async () => {
        servConfig.isTestServer = false;
        const reqParams = { DMT_CODE: "DMT00000000" };

        try {
          jest
          .spyOn(sqldb.DEVICES, "getBasicInfo")
          .mockImplementationOnce((): any =>
            Promise.resolve({ CLIENT_ID: 1 })
          );
          jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: true })
          );
          jest
            .spyOn(dmtInfo, "checkAvailablePorts")
            .mockImplementationOnce((): any =>
              Promise.resolve(factories.generateDmtPortsInfo())
            );

          await httpRouter.privateRoutes["/dmt/get-dmt-ports-info"](
            reqParams,
            factoriesLogin.generateSessionReal()
          );
        } catch (error: any) {
          expect(error.message).toBe(
            "There was an error!\nInvalid properties. Invalid DMT_CODE."
          );
          expect(error).toHaveProperty("Status", 400);
        }
      });
    });
  });

  describe('/dmt/set-dmt-nobreak', () => {
    describe('Success', () => {
      test('should return success string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Nobreak'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));
        jest.spyOn(dmtInfo, "setDmt").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dmtInfo, "setNobreak").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(dmtInfo, "associateUtilityToDmt").mockImplementationOnce((): any => (null));
        
        const response = await httpRouter.privateRoutes['/dmt/set-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toEqual({ dmtId: expect.any(Number), nobreakId: expect.any(Number) });
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Nobreak'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: false}));
        jest.spyOn(dmtInfo, "setDmt").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dmtInfo, "setNobreak").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(dmtInfo, "associateUtilityToDmt").mockImplementationOnce((): any => (null));

        await httpRouter.privateRoutes['/dmt/set-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Acesso negado')
        });
      });

      test('should throw if UNIT_ID is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NAME: 'Nobreak'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing UNIT_ID.');
        });
      });

      test('should throw if NAME is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing NAME.');
        });
      });
    });
  });

  describe('/dmt/set-dmt-illumination', () => {
    describe('Success', () => {
      test('should return success string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Iluminação'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));
        jest.spyOn(dmtInfo, "setDmt").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dalInfo, "setIllumination").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(dmtInfo, "associateUtilityToDmt").mockImplementationOnce((): any => (null));
        
        const response = await httpRouter.privateRoutes['/dmt/set-dmt-illumination'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('SUCCESS ON SET DMT ILLUMINATION');
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Iluminação'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: false}));
        jest.spyOn(dmtInfo, "setDmt").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dalInfo, "setIllumination").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(dmtInfo, "associateUtilityToDmt").mockImplementationOnce((): any => (null));

        await httpRouter.privateRoutes['/dmt/set-dmt-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Acesso negado')
        });
      });

      test('should throw if UNIT_ID is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NAME: 'Iluminação'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing UNIT_ID.');
        });
      });

      test('should throw if NAME is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing NAME.');
        });
      });
    });
  });

  describe('/dmt/get-dmt-nobreak-list', () => {
    describe('Success', () => {
      test('should return list of DMT Nobreaks by clientIds', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          clientIds: [1],
        };

        jest.spyOn(sqldb.NOBREAKS, "getNobreakInfoList").mockImplementationOnce((): any => (factories.generateDmtNobreaksList()));
        jest.spyOn(dmtInfo, "getNobreakStatus").mockImplementationOnce((): any => ({STATUS: 'Rede Elétrica'}));
        jest.spyOn(permissionControl, "canSeeDevicesWithoutProductionUnit").mockResolvedValue(true);
        jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
          clientIds: [1], 
          unitIds: []
        });

        jest.spyOn(dmtHelper, "getNobreakDmtsCircuitPorts").mockImplementationOnce((): any => {});
        jest.spyOn(dmtHelper, "getNobreakDmtsNobreakPorts").mockImplementationOnce((): any => {});

        jest.spyOn(sqldb.DMTS_NOBREAK_CIRCUITS, "getList").mockImplementationOnce((): any => (factories.generateGetList()));
        jest.spyOn(sqldb.DMTS_NOBREAKS, "getList").mockImplementationOnce((): any => (factories.generateGetListDmtNobreak()));
        mockRealtimeCalls();
        
        const response = await httpRouter.privateRoutes['/dmt/get-dmt-nobreak-list'](reqParams, factoriesLogin.generateSessionReal());
        expect(Array.isArray(response)).toBe(true);
        expect(response).toMatchObject<factories.DmtNobreak>
      });
    });
  });

  describe('/dmt/delete-dmt-nobreak', () => {
    describe('Success', () => {
      test('should return DELETED string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NOBREAK_ID: 1,
        };

        const nobreakInfo = factories.generateNobreak(reqParams.NOBREAK_ID);

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));
        jest.spyOn(sqldb.DMTS_NOBREAKS, "w_deleteDmtNobreakByNobreakId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ELECTRIC_CIRCUITS_NOBREAKS, "w_deleteElectricCircuitsNobreakByID").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ELECTRIC_CIRCUITS, "w_deleteByNobreakId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ADDITIONAL_NOBREAK_PARAMETERS, 'w_deleteByNobreakId').mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.NOBREAKS, "w_delete").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ASSETS, "w_delete").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.NOBREAKS, "getNobreak").mockImplementationOnce((): any => (nobreakInfo));
        jest.spyOn(sqldb.DMTS_NOBREAKS, "getDmtUsedPorts").mockImplementationOnce((): any => (factories.generateDmtUsedPorts(nobreakInfo.DMT_ID)));
        jest.spyOn(sqldb.DMTS_ILLUMINATIONS, "getDmtUsedPorts").mockImplementationOnce((): any => (factories.generateDmtUsedPorts(nobreakInfo.DMT_ID)));
        jest.spyOn(sqldb.DEVICES, "getIdByCode").mockImplementationOnce((): any => (factories.generateIdByDmtCode(nobreakInfo.DMT_CODE)));
        jest.spyOn(sqldb.DEVICES_UNITS, "w_deleteRow").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DEVICES_CLIENTS, "w_deleteRow").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DMTS, "getIdByCode").mockImplementationOnce((): any => (factories.generateIdByDmtCode(nobreakInfo.DMT_CODE)));
        jest.spyOn(sqldb.DMTS_NOBREAK_CIRCUITS, "w_deleteDmtNobreakCircuitByDmtId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.NOBREAK_IMAGES, "w_deleteRowByNobreakId").mockImplementationOnce((): any => (null));

        const response = await httpRouter.privateRoutes['/dmt/delete-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('DELETED');
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NOBREAK_ID: 1,
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: false}));

        await httpRouter.privateRoutes['/dmt/delete-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Acesso negado')
        });
      })

      test('should throw if NOBREAK_ID is not on reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        //@ts-ignore
        await httpRouter.privateRoutes['/dmt/delete-dmt-nobreak'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing NOBREAK_ID.');
        });
      })
    });
  });

  describe('/dmt/get-nobreak-info', () => {
    describe('Success', () => {
      test('should return object with nobreak info', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NOBREAK_ID: 1,
        };
        jest.spyOn(devsLastComm, "loadLastTelemetries").mockImplementationOnce((): any => Promise.resolve(factories.generateDmtTelemetry()));
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({canViewDevs: true}));
        jest.spyOn(sqldb.NOBREAKS, "getNobreakFullInfo").mockImplementationOnce((): any => (factories.generateNobreakFullInfo()));
        jest.spyOn(dmtInfo, "getNobreakStatus").mockImplementationOnce((): any => ({STATUS: 'Rede Elétrica'}));
        mockRealtimeCalls();
        
        const response = await httpRouter.privateRoutes['/dmt/get-nobreak-info'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toMatchObject<factories.NobreakFullInfo>
      })
    })

    describe('Error', () => {
      test('should throw if NOBREAK_ID is not on reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
        };

        //@ts-ignore
        await httpRouter.privateRoutes['/dmt/get-nobreak-info'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Invalid parameters! Missing NOBREAK_ID');
        });
      })

      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NOBREAK_ID: 1,
        };

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({canViewDevs: false}));
        jest.spyOn(sqldb.NOBREAKS, "getNobreakFullInfo").mockImplementationOnce((): any => (factories.generateNobreakFullInfo()));
        jest.spyOn(dmtInfo, "getNobreakStatus").mockImplementationOnce((): any => ({STATUS: 'Rede Elétrica'}));

        await httpRouter.privateRoutes['/dmt/get-nobreak-info'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      })
    })
  });

  describe('/dmt/get-dmt-utilities-list', () => {
    describe('Success', () => {
      test('should return list of DMT Utilities by CLIENT_ID', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          CLIENT_ID: 1,
        };

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: true}));
        jest.spyOn(sqldb.NOBREAKS, "getNobreakInfoList").mockImplementationOnce((): any => (factories.generateDmtNobreaksList()));
        jest.spyOn(sqldb.ILLUMINATIONS, "getIllumDmtInfoList").mockImplementationOnce((): any => (factories.generateDmtIlluminationsList()));
        
        const response = await httpRouter.privateRoutes['/dmt/get-dmt-utilities-list'](reqParams, factoriesLogin.generateSessionReal());
        expect(Array.isArray(response)).toBe(true);
        expect(response).toMatchObject<factories.DmtNobreak>
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          CLIENT_ID: 1,
        };

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: false}));

        await httpRouter.privateRoutes['/dmt/get-dmt-utilities-list'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Permission denied!')
        });
      });

      test('should throw if CLIENT_ID is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
        };

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/get-dmt-utilities-list'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing CLIENT_ID.');
        });
      });
    });
  });

  describe('/dmt/set-dmt-utilities', () => {
    describe('Success', () => {
      test('should return success string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          DMT_CODE: 'DMT000000000',
          utilities: [] as factories.DmtUtilitiesOp[],
        };

        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockImplementationOnce((): any => Promise.resolve({canManageDevs: true}));
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockImplementationOnce((): any => Promise.resolve({
          UNIT_ID: faker.number.int(),
          CLIENT_ID: faker.number.int(),
          PRODUCTION: faker.number.int(),
        }));
        jest.spyOn(dmtInfo, "validateNumberOfUtilities").mockImplementationOnce((): any => (null));
        jest.spyOn(dmtInfo, "validateUtilitiesPorts").mockImplementationOnce((): any => (null));
        jest.spyOn(dmtInfo, "setDmtUtilities").mockImplementationOnce((): any => (null));
        
        const response = await httpRouter.privateRoutes['/dmt/set-dmt-utilities'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('SETTED');
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          DMT_CODE: 'DMT000000000',
          utilities: [] as factories.DmtUtilitiesOp[],
        };
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockImplementationOnce((): any => Promise.resolve({
          UNIT_ID: faker.number.int(),
          CLIENT_ID: faker.number.int(),
          PRODUCTION: faker.number.int(),
        }));
        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockImplementationOnce((): any => Promise.resolve({canManageDevs: false}));
        jest.spyOn(dmtInfo, "validateNumberOfUtilities").mockImplementationOnce((): any => (null));
        jest.spyOn(dmtInfo, "validateUtilitiesPorts").mockImplementationOnce((): any => (null));
        jest.spyOn(dmtInfo, "setDmtUtilities").mockImplementationOnce((): any => (null));

        await httpRouter.privateRoutes['/dmt/set-dmt-utilities'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Acesso negado')
        });
      });

      test('should throw if UNIT_ID is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          DMT_CODE: 'DMT000000000'
        };

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-utilities'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Invalid parameters! Missing UNIT_ID');
        });
      });

      test('should throw if DMT_CODE is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
        };

        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockImplementationOnce((): any => Promise.resolve({canManageDevs: true}));

        // @ts-ignore
        await httpRouter.privateRoutes['/dmt/set-dmt-utilities'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Invalid parameters! Missing DMT_CODE');
        });
      });
    });
  });

  describe('get-nobreak-additional-parameters', () => {
    describe('Success', () => {
      test("get-nobreak-additional-parameters", async () => {
        let reqParams = { NOBREAK_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
        const session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.NOBREAKS, 'getNobreakFullInfo').mockResolvedValue(factories.generateNobreakFullInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
        jest.spyOn(sqldb.ADDITIONAL_NOBREAK_PARAMETERS, 'getAllParametersByNobreak').mockResolvedValue(factories.getAllParametersByNobreak());

        const response = await httpRouter.privateRoutes["/dmt/get-nobreak-additional-parameters"](
          reqParams,
          session
        );
        expect(typeof response).toBe("object");
      })
    })
    describe('Error', () => {
      test("Missing NOBREAK_ID", async () => {
        let reqParams = { NOBREAK_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
        const session = factoriesLogin.generateSessionReal();
        reqParams.NOBREAK_ID = <any>null;
        await httpRouter.privateRoutes['/dmt/get-nobreak-additional-parameters'](reqParams, session).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing NOBREAK_ID.');
        });
      });
      test("Permission Denied!", async () => {
        let reqParams = { NOBREAK_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
        const session = factoriesLogin.generateSessionReal();
        jest.spyOn(sqldb.NOBREAKS, 'getNobreakFullInfo').mockResolvedValue(factories.generateNobreakFullInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));
        await httpRouter.privateRoutes['/dmt/get-nobreak-additional-parameters'](reqParams, session).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      });
    })
  })
});

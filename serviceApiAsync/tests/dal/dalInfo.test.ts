(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
    return Object.assign(this, { Status: status }, pars || {});
};

import * as factories from '../factories/dalInfoFactory';
import servConfig from '../../../configfile';
import * as httpRouter from '../../apiServer/httpRouter';
import * as dalInfo from '../../../serviceApiAsync/dal/dalInfo';
import * as factoriesLogin from '../../tests/factories/loginFactory';
import * as permissionControl from '../../../srcCommon/helpers/permissionControl';
import * as devsLastComm from '../../../srcCommon/helpers/devsLastComm';
import sqldb from '../../../srcCommon/db';
import { faker } from '@faker-js/faker';

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

expect.extend({
  checkFreePorts(received) {
    let associateds = 0;
    for (const port of received.ports) {
      if (port.associated) associateds++;
    }

    if (associateds < 4 && !received.freePorts) {
      return {
        message: () => `expected freePorts equal to TRUE`,
        pass: false,
      };
    }
    if (associateds >= 4 && received.freePorts) {
      return {
        message: () => `expected freePorts equal to FALSE`,
        pass: false,
      };
    } else {
      return { message: () => "expected freePorts was returned", pass: true };
    }
  },
  checkFreeFeedbacks(received) {
    let associateds = 0;
    for (const feedback of received.feedbacks) {
      if (feedback.associated) associateds++;
    }

    if (associateds < 4 && !received.freeFeedbacks) {
      return {
        message: () => `expected freeFeedbacks equal to TRUE`,
        pass: false,
      };
    }
    if (associateds >= 4 && received.freeFeedbacks) {
      return {
        message: () => `expected freeFeedbacks equal to FALSE`,
        pass: false,
      };
    } else {
      return { message: () => "expected freeFeedbacks was returned", pass: true };
    }
  },
});

interface CustomMatchers<R = unknown> {
  checkFreePorts(): R;
  checkFreeFeedbacks(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

describe('Dal Info', () => {
  describe('/dal/get-dal-ports-info', () => {
    describe('Success', () => {
      test('should return object with freePorts property equal to true if the ports array has ports not associates', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAL_CODE: 'DAL000000000', CLIENT_ID: 1};

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: true}));
        jest.spyOn(dalInfo, "checkAvailablePorts").mockImplementationOnce((): any => (factories.generateDalPortsInfo()));
        
        const response = await httpRouter.privateRoutes['/dal/get-dal-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).checkFreePorts()
      });
      test('should return object with freeFeedbacks property equal to true if the feedbacks array has ports not associates', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAL_CODE: 'DAL000000000', CLIENT_ID: 1};

        jest.spyOn(sqldb.DALS, "getDalByCode").mockImplementationOnce((): any => (Promise.resolve(factories.generateDalByCode(reqParams.DAL_CODE, reqParams.CLIENT_ID))));
        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: true}));
        jest.spyOn(dalInfo, "checkAvailablePorts").mockImplementationOnce((): any => (factories.generateDalPortsInfo()));
        
        const response = await httpRouter.privateRoutes['/dal/get-dal-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).checkFreeFeedbacks()
      });
    });
    describe('Error', () => {
      test('should throw an error if missing CLIENT_ID in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAL_CODE: 'DAL00000000'};

        try{
          // @ts-ignore
          const response = await httpRouter.privateRoutes['/dal/get-dal-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('There was an error!\nInvalid properties. Missing CLIENT_ID.');
          expect(error).toHaveProperty("Status", 400);
        }
      });
      test('should throw if user has no permissions', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAL_CODE: 'DAL00000000', CLIENT_ID: 1};

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: false}));
        try{
          const response = await httpRouter.privateRoutes['/dal/get-dal-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('Permission denied!');
          expect(error).toHaveProperty("Status", 403);
        }
      });
      test('should throw an error if invalid DAL_CODE in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAL_CODE: 'DAL00000000', CLIENT_ID: 1};

        jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({canViewDevs: true}));
        try{
          const response = await httpRouter.privateRoutes['/dal/get-dal-ports-info'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('There was an error!\nInvalid properties. Invalid DAL_CODE.');
          expect(error).toHaveProperty("Status", 400);
        }
      });
  });
  });

  describe('/dal/set-dal-illumination', () => {
    describe('Success', () => {
      test('should return success string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Iluminação'
        };

        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockImplementationOnce((): any => Promise.resolve({canManageDevs: true}));
        jest.spyOn(dalInfo, "checkNeedResendScheds").mockImplementationOnce((): any => Promise.resolve(false));
        jest.spyOn(dalInfo, "setDal").mockImplementationOnce((): any => Promise.resolve({ ID: factories.generateId() }));
        jest.spyOn(dalInfo, "setIllumination").mockImplementationOnce((): any => Promise.resolve(factories.generateId()));
        jest.spyOn(dalInfo, "associateIlluminationToDal").mockImplementationOnce((): any => Promise.resolve(null));
        jest.spyOn(dalInfo, "desasociateDalFromClientAndUnit").mockResolvedValue();
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockImplementationOnce((): any => Promise.resolve({
          UNIT_ID: faker.number.int(),
          CLIENT_ID: faker.number.int(),
          PRODUCTION: faker.number.int(),
        }));
        
        const response = await httpRouter.privateRoutes['/dal/set-dal-illumination'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('SUCCESS ON SET DAL ILLUMINATION');
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Iluminação'
        };
        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockImplementationOnce((): any => Promise.resolve({
          UNIT_ID: faker.number.int(),
          CLIENT_ID: faker.number.int(),
          PRODUCTION: faker.number.int(),
        }));
        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockImplementationOnce((): any => Promise.resolve({canManageDevs: false}));

        await expect(httpRouter.privateRoutes['/dal/set-dal-illumination'](reqParams, factoriesLogin.generateSessionReal())).rejects.toThrow('Acesso negado').catch((err) => {
          expect(err.httpStatus).toBe('403');
        });
      });

      test('should throw if UNIT_ID is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          NAME: 'Iluminação'
        };

        // @ts-ignore
        await httpRouter.privateRoutes['/dal/set-dal-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing UNIT_ID.');
        });
      });

      test('should throw if NAME is not in reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
        };

        // @ts-ignore
        await httpRouter.privateRoutes['/dal/set-dal-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing NAME.');
        });
      });
    });
  });

  describe('/dal/get-dal-illumination-list', () => {
    describe('Success', () => {
      test('should return list of DAL Illuminations by CLIENT_ID', async () => {
        servConfig.isTestServer = false;

        jest.spyOn(permissionControl, "getAllowedUnitsView").mockImplementationOnce((): any => ({clientIds: [], unitIds: []}));
        jest.spyOn(sqldb.ILLUMINATIONS, "getIllumInfoList").mockImplementationOnce((): any => (factories.generateDalIlluminationsList()));
        mockRealtimeCalls();
        
        const response = await httpRouter.privateRoutes['/dal/get-dal-illumination-list']({}, factoriesLogin.generateSessionReal());
        expect(Array.isArray(response)).toBe(true);
        expect(response).toMatchObject<factories.DalIllumination>
      });
    });
  });

  describe('/dal/delete-dal-illumination', () => {
    describe('Success', () => {
      test('should return DELETED string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          ILLUMINATION_ID: 1,
        };

        const illuminationInfo = factories.generateIllumination(reqParams.ILLUMINATION_ID);

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));
        jest.spyOn(sqldb.DALS_ILLUMINATIONS, "w_deleteDalIllumByIllumId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS, "w_deleteByIlluminationId").mockImplementationOnce((): any => (null));        
        jest.spyOn(sqldb.DMTS_ILLUMINATIONS, "w_deleteDmtIlluminationstByIlluminationId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DAMS_ILLUMINATIONS, "w_deleteByIlluminationId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ELECTRIC_CIRCUITS_ILLUMINATIONS, "w_deleteElectricCircuitsIlluminationsByID").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ELECTRIC_CIRCUITS, "w_deleteByIlluminationId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DALS_SCHEDULES, "w_deleteByIllumId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DALS_EXCEPTIONS, "w_deleteByIllumId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ILLUMINATIONS, "getIllumination").mockImplementationOnce((): any => (illuminationInfo));
        jest.spyOn(sqldb.ILLUMINATIONS, "w_delete").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DALS_ILLUMINATIONS, "getDalUsedPorts").mockImplementationOnce((): any => (factories.generateDalUsedPorts(illuminationInfo.DAL_ID)));
        jest.spyOn(sqldb.DMTS_ILLUMINATIONS, "getDmtUsedPorts").mockImplementationOnce((): any => (factories.generateDalUsedPorts(illuminationInfo.DAL_ID)));
        jest.spyOn(sqldb.DMTS_NOBREAKS, "getDmtUsedPorts").mockImplementationOnce((): any => (factories.generateDalUsedPorts(illuminationInfo.DAL_ID)));
        jest.spyOn(sqldb.DEVICES, "getIdByCode").mockImplementationOnce((): any => (factories.generateIdByCode(illuminationInfo.DAL_CODE)));
        jest.spyOn(sqldb.DEVICES_UNITS, "w_deleteRow").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DEVICES_CLIENTS, "w_deleteRow").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DMTS_NOBREAK_CIRCUITS, "w_deleteDmtNobreakCircuitByDmtId").mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ILLUMINATION_IMAGES, 'w_deleteFromIllumination').mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS, 'w_deleteByIlluminationId').mockImplementationOnce((): any => (null));
        jest.spyOn(sqldb.DAMS_ILLUMINATIONS, 'w_deleteByIlluminationId').mockImplementationOnce((): any => (null));

        const response = await httpRouter.privateRoutes['/dal/delete-dal-illumination'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('DELETED');
      });
    });

    describe('Error', () => {
      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          ILLUMINATION_ID: 1,
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: false}));

        await httpRouter.privateRoutes['/dal/delete-dal-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Acesso negado')
        });
      })

      test('should throw if ILLUMINATION_ID is not on reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));

        //@ts-ignore
        await httpRouter.privateRoutes['/dal/delete-dal-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing ILLUMINATION_ID.');
        });
      })
    });
  });

  describe('/dal/get-illumination-info', () => {
    // describe('Success', () => {
    //   test('should return object with illumination info', async () => {
    //     servConfig.isTestServer = false;
    //     const reqParams = {
    //       ILLUMINATION_ID: 1,
    //     };

    //     jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({canViewDevs: true}));
    //     jest.spyOn(sqldb.ILLUMINATIONS, "getIlluminationFullInfo").mockImplementationOnce((): any => (factories.generateIlluminationFullInfo()));
        
    //     const response = await httpRouter.privateRoutes['/dal/get-illumination-info'](reqParams, factoriesLogin.generateSessionReal());
    //     expect(response).toMatchObject<factories.IlluminationFullInfo>
    //   })
    // })

    describe('Error', () => {
      test('should throw if ILLUMINATION_ID is not on reqParams', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
        };

        //@ts-ignore
        await httpRouter.privateRoutes['/dal/get-illumination-info'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Invalid parameters! Missing ILLUMINATION_ID');
        });
      })

      test('should throw if user does not have permission', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          ILLUMINATION_ID: 1,
        };

        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({canViewDevs: false}));
        jest.spyOn(sqldb.ILLUMINATIONS, "getIlluminationFullInfo").mockImplementationOnce((): any => (factories.generateIlluminationFullInfo()));

        await httpRouter.privateRoutes['/dal/get-illumination-info'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('Permission denied!');
        });
      })
    })
  })
});
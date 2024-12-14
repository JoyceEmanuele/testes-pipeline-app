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
import * as factoriesLogin from "../factories/loginFactory";
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";
import * as dalInfo from '../../dal/dalInfo';
import * as damIllumination from '../../damIllumination/damIlluminationInfo';
import sqldb from '../../../srcCommon/db';

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

describe("Dam Illumination Info", () => {  
  describe('/dam/set-dam-illumination', () => {
    describe('Success', () => {
      test('should return success string', async () => {
        servConfig.isTestServer = false;
        const reqParams = {
          UNIT_ID: 1,
          NAME: 'Iluminação'
        };

        jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementationOnce((): any => ({manageAllClientsUnitsAndDevs: true}));
        jest.spyOn(damIllumination, "setDamIllumination").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dalInfo, "setIllumination").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(damIllumination, "associateUtilityToDam").mockImplementationOnce((): any => (null));
        
        const response = await httpRouter.privateRoutes['/dam/set-dam-illumination'](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toBe('SUCCESS ON SET DAM ILLUMINATION');
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
        jest.spyOn(damIllumination, "setDamIllumination").mockImplementationOnce((): any => ({ ID: factories.generateId() }));
        jest.spyOn(dalInfo, "setIllumination").mockImplementationOnce((): any => (factories.generateId()));
        jest.spyOn(damIllumination, "associateUtilityToDam").mockImplementationOnce((): any => (null));

        await httpRouter.privateRoutes['/dam/set-dam-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
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
        await httpRouter.privateRoutes['/dam/set-dam-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
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
        await httpRouter.privateRoutes['/dam/set-dam-illumination'](reqParams, factoriesLogin.generateSessionReal()).catch((err) => {
          expect(err.message).toBe('There was an error!\nInvalid properties. Missing NAME.');
        });
      });
    });
  });

  describe("/dam/get-dam-illumination-validation", () => {
    describe("Success", () => {
      test("should return object with freeDevice property equal to true if the device has not been associated with a unit", async () => {
        servConfig.isTestServer = false;
        const reqParams = { DAM_ILLUMINATION_CODE: "DAM000000000", CLIENT_ID: 1, UNIT_ID: 1 };
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
        jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        );
        jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DAMS_ILLUMINATIONS, "getDamIlluminationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_UNITS, "getUnitByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_CLIENTS, "getClientByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: true })
          );

        const response = await httpRouter.privateRoutes[
          "/dam/get-dam-illumination-validation"
        ](reqParams, factoriesLogin.generateSessionReal());
        expect(response).toMatchObject<{ freeDevice: true, newDevice: false, hasMachine: false }>;
      });
    });
    describe("Error", () => {
      test("should throw an error if invalid DAM_ILLUMINATION_CODE in reqParams", async () => {
        servConfig.isTestServer = false;
        const reqParams = { DAM_ILLUMINATION_CODE: "DAM00000000", CLIENT_ID: 1, UNIT_ID: 1 };
        try {
          await httpRouter.privateRoutes["/dam/get-dam-illumination-validation"](
            reqParams,
            factoriesLogin.generateSessionReal()
          );
        } catch (error: any) {
          expect(error.message).toBe(
            "There was an error!\nInvalid properties. Invalid DAM_ILLUMINATION_CODE."
          );
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test('should throw an error if device already associated to machine', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAM_ILLUMINATION_CODE: 'DAM000000000', CLIENT_ID: 1, UNIT_ID: 1};
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
        jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        );
        const deviceAssociated = jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockResolvedValue(        
          [{
          ID: 1,
          DAM_DEVICE_ID: 1,
          MACHINE_ID: 1,
          NAME: "Máquina com DAM" 
        }])         

        const response = await httpRouter.privateRoutes[
          "/dam/get-dam-illumination-validation"
        ](reqParams, factoriesLogin.generateSessionReal());
        expect(deviceAssociated).toHaveBeenCalled();
        expect(response).toMatchObject<{ freeDevice: false, newDevice: false, hasMachine: true }>;
      });

      test('should throw an error if device already associated to other utility', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAM_ILLUMINATION_CODE: 'DAM000000000', CLIENT_ID: 1, UNIT_ID: 1};
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
        jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        );
        jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        const deviceAssociated = jest
        .spyOn(sqldb.DAMS_ILLUMINATIONS, "getDamIlluminationUsed")
        .mockResolvedValue(        
            [{
            ID: 1,
            DAM_DEVICE_ID: 1,
            ILLUMINATION_ID: 1,
            NAME: "Iluminação com DAM" 
          }])        

        try{
          await httpRouter.privateRoutes['/dam/get-dam-illumination-validation'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(deviceAssociated).toHaveBeenCalled();
          expect(error.message).toBe('Device already associated to other utility!');
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test('should throw an error if device already associated to other unit', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAM_ILLUMINATION_CODE: 'DAM000000000', CLIENT_ID: 1, UNIT_ID: 2};
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
        jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        );
        jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DAMS_ILLUMINATIONS, "getDamIlluminationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_UNITS, "getUnitByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve({ UNIT_ID: 1 })
        );

        try{
          await httpRouter.privateRoutes['/dam/get-dam-illumination-validation'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('Device already associated to other unit!');
          expect(error).toHaveProperty("Status", 400);
        }
      });

      test('should throw an error if device already associated to other client', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAM_ILLUMINATION_CODE: 'DAM000000000', CLIENT_ID: 1, UNIT_ID: 1};
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 2 })
        );
        jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        );
        jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DAMS_ILLUMINATIONS, "getDamIlluminationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_UNITS, "getUnitByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_CLIENTS, "getClientByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 2 })
        );
        try{
          await httpRouter.privateRoutes['/dam/get-dam-illumination-validation'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('Device already associated to other client!');
          expect(error).toHaveProperty("Status", 400);
        }
      });
      
      test('should throw an error if user has no permissions', async () => {
        servConfig.isTestServer = false;
        const reqParams = {DAM_ILLUMINATION_CODE: 'DAM000000000', CLIENT_ID: 1, UNIT_ID: 1};
        jest
        .spyOn(sqldb.DEVICES, "getBasicInfo")
        .mockImplementationOnce((): any =>
          Promise.resolve({ CLIENT_ID: 1 })
        );
         jest
        .spyOn(sqldb.DAMS_DEVICES, "getDamByCode")
        .mockImplementationOnce((): any =>
          Promise.resolve({
            ID: 1,
            DEVICE_CODE: "DAM000000000"            
          })
        ); 
        jest
        .spyOn(sqldb.DAMS_AUTOMATIONS, "getDamAutomationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );       
        jest
        .spyOn(sqldb.DAMS_ILLUMINATIONS, "getDamIlluminationUsed")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_UNITS, "getUnitByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
        .spyOn(sqldb.DEVICES_CLIENTS, "getClientByDevId")
        .mockImplementationOnce((): any =>
          Promise.resolve(null)
        );
        jest
          .spyOn(permissionControl, "getPermissionsOnClient")
          .mockImplementationOnce((): any =>
            Promise.resolve({ canViewDevs: false })
          );
          
        try{
          await httpRouter.privateRoutes['/dam/get-dam-illumination-validation'](reqParams, factoriesLogin.generateSessionReal());
        } catch(error: any){
          expect(error.message).toBe('Permission denied!');
          expect(error).toHaveProperty("Status", 403);
        }
      });
      
    });
  });
});
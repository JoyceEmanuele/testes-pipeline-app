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
import * as httpRouter from "../../apiServer/httpRouter";
import {
  generateSessionReal,
  generateGetUserData_basic,
  generateGetUserClients,
  generateUserPermissions,
} from "../factories/userPrefsOverviewFactory";
import { getPermissions } from "../../../srcCommon/helpers/permissionControl";

import * as userPrefsOverview from "../../auth/userPrefsOverview";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("User Prefs Overview", () => {

  describe("checkUsersSetPrefsOverviewParams", () => {
    describe("Success", () => {
      test("checkUsersSetPrefsOverviewParams SUCCESS", async () => {
        const reqParams = {
          userId: 'admin@admin.com',
          prefs: [{
            type: 1,
            title: 'Máquinas',
            position: 1,
            isActive: true,
            isExpanded: true
          }]
        };

        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_basic")
          .mockImplementation((): any => {
            const data = generateGetUserData_basic();
            return Promise.resolve(data);
          });       

        const result = await userPrefsOverview.checkUsersSetPrefsOverviewParams(reqParams);
        
        expect(result).toEqual(expect.any(Object));
      });
         
    });

    describe("Error", () => {
      test("should throw if userId is not in reqParams", async () => {
        const reqParams = {
          prefs: [{
            type: 1,
            title: 'Máquinas',
            position: 1,
            isActive: true,
            isExpanded: true
          }]
        };      

        await userPrefsOverview.checkUsersSetPrefsOverviewParams(reqParams as {
          userId: string,
          prefs: {
            type: number
            title?: string
            position?: number
            isActive?: boolean
            isExpanded?: boolean
          }[]
        }).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing userId.');
        });   
      });
      test("should throw if prefs is not in reqParams", async () => {
        const reqParams = {
          userId: 'admin@admin.com',
        };      

        await userPrefsOverview.checkUsersSetPrefsOverviewParams(reqParams as {
          userId: string,
          prefs: {
            type: number
            title?: string
            position?: number
            isActive?: boolean
            isExpanded?: boolean
          }[]
        }).catch((err) => {
          expect(err.message).toBe('Invalid properties. Missing prefs.');
        });       
      });
      test("should throw if user not found!", async () => {
        const reqParams = {
          userId: 'admin@admin.com',
          prefs: [{
            type: 1,
            title: 'Máquinas',
            position: 1,
            isActive: true,
            isExpanded: true
          }]
        }; 
        
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_basic")
          .mockImplementationOnce((): any => {
            Promise.resolve(null)
          }); 

        await userPrefsOverview.checkUsersSetPrefsOverviewParams(reqParams as {
          userId: string,
          prefs: {
            type: number
            title?: string
            position?: number
            isActive?: boolean
            isExpanded?: boolean
          }[]
        }).catch((err) => {
          expect(err.message).toBe('User not found!');
        }); 
      });
    });
  });

  describe("/users/set-prefs-overview", () => {
    describe("Success", () => {
      test("/users/set-prefs-overview SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = {
          userId: session.user,
          prefs: [{
            type: 1,
            title: 'Máquinas',
            position: 1,
            isActive: true,
            isExpanded: true
          }]
        };

        const checkUsersSetPrefsOverviewParamsFunc = jest
          .spyOn(userPrefsOverview, "checkUsersSetPrefsOverviewParams")
          .mockImplementation((): any => {
            const data = generateGetUserData_basic();
            return Promise.resolve(data);
        });

        jest
          .spyOn(sqldb.USERSCLIENTS, "getUserClients")
          .mockImplementation((): any => {
            const data = generateGetUserClients(reqParams.userId);
            return Promise.resolve(data);
        });

        jest.fn(getPermissions).mockImplementationOnce((): any => {
          Promise.resolve(generateUserPermissions());
        });

        jest
        .spyOn(sqldb.PREFS_OVERVIEW, "getPrefsOverviewInfoId")
        .mockImplementationOnce((): any =>
          Promise.resolve([{
            EMAIL: session.user,
            ID: 1,
            TYPE: 1,
          }])
        );  
        
        const update = jest.spyOn(sqldb.PREFS_OVERVIEW_INFO, 'w_update').mockResolvedValue({
          affectedRows: 1,
          insertId: 1
        })

        const response = await httpRouter.privateRoutes[
          "/users/set-prefs-overview"
        ](reqParams, session);

        expect(checkUsersSetPrefsOverviewParamsFunc).toHaveBeenCalled();
        expect(update).toHaveBeenCalledTimes(1);
        expect(response).toBe('OK');        
      });
    });
  });

  describe("/users/get-prefs-overview", () => {
    describe("Success", () => {
      test("/users/get-prefs-overview SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = {
          userId: session.user,
        };

        jest
        .spyOn(sqldb.DASHUSERS, "getUserData_basic")
        .mockImplementation((): any => {
          const data = generateGetUserData_basic();
          return Promise.resolve(data);
      });

        jest
          .spyOn(sqldb.USERSCLIENTS, "getUserClients")
          .mockImplementation((): any => {
            const data = generateGetUserClients(reqParams.userId);
            return Promise.resolve(data);
        });

        jest
        .spyOn(sqldb.PREFS_OVERVIEW, "getPrefsOverview")
        .mockImplementationOnce((): any =>
          Promise.resolve([{
            ID: 1,
            TYPE: 1,
            TITLE: 'Máquinas',
            POSITION: 1,
            IS_ACTIVE: '1',
            IS_EXPANDED: '1',           
          }])
        );        

        const response = await httpRouter.privateRoutes[
          "/users/get-prefs-overview"
        ](reqParams, session);
        expect(response).toMatchObject<{prefs: [{
          type: 1,
          title: 'Máquinas',
          position: 1,
          isActive: true,
          isExpanded: true,
        }]}>;
      });
    });

    describe("Error", () => {
      test("should throw if userId is not in reqParams", async () => {
        const session = generateSessionReal();
        const reqParams = {
        };      

        await httpRouter.privateRoutes[
          "/users/get-prefs-overview"
        ](reqParams as {
          userId: string,
        }, session).catch((err) => {
          expect(err.message).toBe('userId required');
        });
      });

      test("should throw if user not found!", async () => {
        const session = generateSessionReal();
        const reqParams = {
          userId: 'admin@admin.com',
        };         
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_basic")
          .mockImplementationOnce((): any => {
            Promise.resolve(null)
          }); 
          await httpRouter.privateRoutes[
            "/users/get-prefs-overview"
          ](reqParams as {
            userId: string,
          }, session).catch((err) => {
            expect(err.message).toBe('User not found!');
          });
        });
      });
    });
  });


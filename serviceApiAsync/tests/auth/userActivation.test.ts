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
import { faker } from "@faker-js/faker";
import { generateSessionReal } from "../factories/loginFactory";
import {
  generateGetAllowedClientsManageFull,
  generateReqParamsReactivateUser,
  generateReqParamsReactivateUserNoClients,
  generateSessionFaker,
  generateGetUserData_basic,
} from "../factories/userActivationFactory";
import { getAllowedClientsManageFull } from "../../../srcCommon/helpers/permissionControl";

import * as userReactivate from "../../auth/userActivation";
import * as sendEmail from '../../../srcCommon/extServices/sendEmail'
import * as users from "../../auth/users";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("Users", () => {
  describe("/users/reactivate-user", () => {
    describe("Success", () => {
      test("/users/reactivate-user SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsReactivateUser();
        const reactivateFunc = jest
          .spyOn(userReactivate, "reactivateUser")
          .mockResolvedValue("Função reactivateUser foi chamada!");
        const result = await userReactivate.usersReactivateUser(
          reqParams,
          session
        );
        expect(reactivateFunc).toHaveBeenCalled();
        expect(result).toBe("Função reactivateUser foi chamada!");
      });
    });

    describe("Error", () => {
      test('Invalid parameters, missing "USER" - Sem USER', async () => {
        const session = generateSessionFaker();
        const reqParams = generateReqParamsReactivateUser();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.USER;
        const result = httpRouter.privateRoutes["/users/reactivate-user"](
          reqParams,
          session
        );
        expect(result).rejects.toThrow('Invalid parameters, missing "USER"');
      });

      test("Permission denied! - Sem clients", async () => {
        const session = generateSessionFaker();
        const reqParams = generateReqParamsReactivateUser();
        const reqParamsFalse = reqParams as any;
        delete reqParamsFalse.clientIds;
        const result = httpRouter.privateRoutes["/users/reactivate-user"](
          reqParams,
          session
        );
        expect(result).rejects.toThrow("Permission denied!");
      });

      test("Permission denied! - Não é admin da empresa que deseja reativar", async () => {
        const session = generateSessionFaker();
        const reqParams = generateReqParamsReactivateUser();
        jest.fn(getAllowedClientsManageFull).mockImplementationOnce((): any => {
          Promise.resolve(generateGetAllowedClientsManageFull());
        });
        const result = httpRouter.privateRoutes["/users/reactivate-user"](
          reqParams,
          session
        );
        expect(result).rejects.toThrow("Permission denied!");
      });
    });
  });

  describe("reactivateUser", () => {
    describe("Success", () => {
      test("reactivateUser SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsReactivateUser();

        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_basic")
          .mockImplementation((): any => {
            const data = generateGetUserData_basic();
            return Promise.resolve(data);
          });

        jest.spyOn(sqldb.DASHUSERS, "w_ativeUser").mockResolvedValue({
          affectedRows: 1,
          insertId: faker.number.int({min: 1}),
        });        

        const associateFunc = jest
          .spyOn(userReactivate, "associateClients")
          .mockImplementation((): any => Promise.resolve({}));

        jest.spyOn(userReactivate, "buildEmailReactivateUser").mockResolvedValue({
          subject: '',
          emailBody: '',
        });

        const sendEmailSimple = jest
        .spyOn(sendEmail, "simple")
        .mockImplementation((): any => Promise.resolve({}));

        const result = await userReactivate.reactivateUser(
          reqParams.USER,
          reqParams.clientIds,
          session
        );
        
        expect(sendEmailSimple).toBeCalled();
        expect(associateFunc).toBeCalled();
        expect(result).toContain("REACTIVATED");
      });
         
    });

    describe("Error", () => {
      test("reactivateUser ERROR", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsReactivateUserNoClients();
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_basic")
          .mockImplementation((): any => {
            const data = generateGetUserData_basic();
            return Promise.resolve(data);
          });
        
        const result = userReactivate.reactivateUser(
          reqParams.USER,
          reqParams.clientIds,
          session
        );
        expect(result).rejects.toThrow("Permission denied!");
      });
    });
  });

  describe("associateClients", () => {
    describe("Success", () => {
      test("associateClients SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsReactivateUser();
        jest
          .spyOn(sqldb.USERSCLIENTS, "getUserClients")
          .mockImplementationOnce((): any => [
            { USER_ID: reqParams, CLIENT_ID: reqParams.clientIds[0] },
          ]);
        jest
          .spyOn(sqldb.USERSCLIENTS, "getList")
          .mockImplementationOnce((): any => [
            {
              USER_ID: reqParams,
              CLIENT_ID: reqParams.clientIds[0],
              PERMS: "[U]",
            },
          ]);
        const disassociateFunc = jest
          .spyOn(userReactivate, "disassociateClients")
          .mockImplementation((): any => {});
        jest
          .spyOn(users, "usersSetProfiles")
          .mockImplementationOnce((): any => {
            return "Set Profile";
          });
        const result = await userReactivate.associateClients(
          reqParams.USER,
          reqParams.clientIds,
          session
        );
        expect(disassociateFunc).toBeCalled();
        expect(result).toBe("Set Profile");
      });
    });
  });

  describe("disassociateClients", () => {
    describe("Success", () => {
      test("associateClients SUCCESS", async () => {
        const session = generateSessionReal();
        const reqParams = generateReqParamsReactivateUser();
        jest
          .spyOn(users, "usersSetProfiles")
          .mockImplementationOnce((): any => {
            return "Set Profile";
          });
        const result = await userReactivate.disassociateClients(
          reqParams.USER,
          reqParams.clientIds,
          session
        );
        expect(result).toBe("Set Profile");
      });
    });
  });
});

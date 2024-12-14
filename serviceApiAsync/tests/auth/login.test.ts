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
import * as dielServices from "../../../srcCommon/dielServices";
import "../../../srcCommon/types/api-public";
import servConfig from "../../../configfile";
import { faker } from "@faker-js/faker";
import * as factories from "../factories/loginFactory";
import * as loginFunctions from '../../auth/login';
import * as loginFunctionsCommon from "../../../srcCommon/helpers/auth";
import * as i18nHelper from "../../../srcCommon/helpers/i18nextradution";
import * as helpers from '../../../srcCommon/helpers/auth'

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("Login", () => {
  describe('login', () => {
    describe('SUCESSO', () => {
      test('espera-se que retone o objeto criado', async () => {
        const reqParams = { user: faker.internet.email() };
        const session = factories.generateSessionReal();
        jest.spyOn(helpers, 'verifyClient_classicLogin').mockResolvedValue(session);
        jest.spyOn(loginFunctions, 'createUserDataToFront').mockImplementation((): any => {
          return Promise.resolve(factories.generateUserDataToFront());
        });
        await loginFunctions.login(reqParams);
        expect(helpers.verifyClient_classicLogin).toHaveBeenCalled();
        expect(loginFunctions.createUserDataToFront).toHaveBeenCalled();
      })
    });
    describe('ERRO', () => {
      test('espera-se que retorne erro "Could not check credentials!" ', async () => {
        const reqParams = { user: faker.internet.email() };
        const session = null as any;
        jest.spyOn(helpers, 'verifyClient_classicLogin').mockImplementation((): any => { return Promise.resolve(session)});
        jest.spyOn(loginFunctions, 'createUserDataToFront').mockImplementation((): any => {
          return Promise.resolve(factories.generateUserDataToFront());
        });
        try {
          await loginFunctions.login(reqParams);
        } catch (error: any) {
          expect(error.message).toBe("Could not check credentials!");
          expect(error).toHaveProperty("Status", 500);
        }
        expect(helpers.verifyClient_classicLogin).toHaveBeenCalled();
        expect(loginFunctions.createUserDataToFront).not.toHaveBeenCalled();
      })
    });
  });
  describe("login/forgot send email", () => {
    describe("Success", () => {
      test("login/forgot send email", async () => {
        servConfig.isTestServer = false;
        const reqParams = { user: faker.internet.email() };
        jest
          .spyOn(sqldb.DASHUSERS, "getPrefsUser")
          .mockImplementationOnce((): any =>
            Promise.resolve([{ PREFS: null }])
          );

        jest
          .spyOn(i18nHelper, "getLanguage")
          .mockImplementationOnce((): "pt" | "en" => {
            return 'pt';
          });
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_password")
          .mockImplementationOnce((): any => {
            const data = factories.generateUserInfo(reqParams);
            return Promise.resolve(data);
          });
        jest
          .spyOn(sqldb.PWRECOVERTK, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({}));
        jest
          .spyOn(sqldb.EMAILSEND, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({}));
        jest
          .spyOn(loginFunctions, "buildEmailForgotPassword")
          .mockImplementationOnce((): any => Promise.resolve({
            subject: faker.string.alpha(),
            emailBody: faker.string.alpha()
        }));
        const response = await loginFunctions.loginForgot(reqParams)
        expect(response).toBe("sent");
      });
      test("login/forgot test Server", async () => {
        servConfig.isTestServer = true;
        const reqParams = { user: faker.internet.email() };
        jest
          .spyOn(i18nHelper, "getLanguage")
          .mockImplementationOnce((): "pt" | "en" => {
            return 'pt';
          });
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_password")
          .mockImplementationOnce((): any => {
            const data = factories.generateUserInfo(reqParams);
            return Promise.resolve(data);
          });
        jest
          .spyOn(sqldb.DASHUSERS, "getPrefsUser")
          .mockImplementationOnce((): any =>
            Promise.resolve([{ PREFS: null }])
          );

        jest
          .spyOn(sqldb.PWRECOVERTK, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({}));
        const response = await loginFunctions.loginForgot(reqParams);
        expect(response).toHaveProperty("dev");
      });
    });

    describe("Error", () => {
      test("login/forgot not valid email", async () => {
        servConfig.isTestServer = false;
        const reqParams = { user: "user" };
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_password")
          .mockImplementationOnce((): any => {
            const data = factories.generateUserInfo(reqParams);
            return Promise.resolve(data);
          });
        jest
          .spyOn(i18nHelper, "getLanguage")
          .mockImplementationOnce((): "pt" | "en" => {
            return 'pt';
          });
        jest
          .spyOn(sqldb.DASHUSERS, "getPrefsUser")
          .mockImplementationOnce((): any =>
            Promise.resolve([{ PREFS: null }])
          );

        jest
          .spyOn(sqldb.PWRECOVERTK, "w_insert")
          .mockImplementationOnce((): any => Promise.resolve({}));
        const response = await loginFunctions.loginForgot(reqParams);
        expect(response).toBe("not-sent (email not-valid)");
      });
      test("login/forgot, Could not find requested user", async () => {
        servConfig.isTestServer = false;
        const reqParams = { user: "user" };
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_password")
          .mockImplementationOnce((): any => {
            const data = null as any;
            return Promise.resolve(data);
          });
        try {
          await loginFunctions.loginForgot(reqParams);
        } catch (error: any) {
          expect(error.message).toBe("Could not find requested user");
          expect(error).toHaveProperty("Status", 401);
        }
      });
      test("login/forgot, Could not find requested user", async () => {
        servConfig.isTestServer = false;
        const reqParams = { user: "user" };
        jest
          .spyOn(sqldb.DASHUSERS, "getUserData_password")
          .mockImplementationOnce((): any => {
            const data = factories.generateUserInfo({ user: faker.string.alpha() });
            return Promise.resolve(data);
          });
        try {
          await loginFunctions.loginForgot(reqParams);
        } catch (error: any) {
          expect(error.message).toBe("Could not get user information");
          expect(error).toHaveProperty("Status", 500);
        }
      });
    });
  });
  describe("verifyClient_classicLogin", () => {
    describe("Success", () => {
      test("Verificar cliente e realizar login com token", async () => {
        const queryData = { token: faker.string.alphanumeric({ length: 10 }) };
        const userSession = jest
          .spyOn(dielServices, "authInternalApi")
          .mockImplementationOnce((): any => {
            const data = factories.generateSession({ token: queryData.token });
            return Promise.resolve(data);
          });
        await helpers.verifyClient_classicLogin(queryData);

        expect(userSession).toBeCalledWith(
          "/diel-internal/auth/get-user-session",
          { authHeader: `JWT ${queryData.token}` }
        );
        expect(userSession).toHaveBeenCalledTimes(1);
      });
      test("Verificar cliente e realizar login com usuário e senha", async () => {
        const queryData = {
          user: faker.internet.email(),
          password: faker.internet.password(),
        };

        const userSession = jest
          .spyOn(dielServices, "authInternalApi")
          .mockImplementationOnce((): any => {
            const data = factories.generateSession({ user: queryData.user });
            return Promise.resolve(data);
          });
        const response = await helpers.verifyClient_classicLogin(queryData);

        expect(userSession).toBeCalledWith(
          "/diel-internal/auth/check-user-password",
          { userId: queryData.user, password: queryData.password }
        );
        expect(response.user).toBe(queryData.user);
        expect(userSession).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error", () => {
      test("Falha de sessao", async () => {
        const queryData = { user: faker.internet.email() };
        const userSession = jest
          .spyOn(dielServices, "authInternalApi")
          .mockImplementationOnce((): any => {
            const data = factories.generateSession({ invalid: true });
            return Promise.resolve(data);
          });
        try {
          await helpers.verifyClient_classicLogin(queryData);
        } catch (error: any) {
          expect(error.message).toBe("Could not check credentials!");
          expect(error).toHaveProperty("Status", 500);
        }
        expect(userSession).toHaveBeenCalledTimes(1);
      });
    });
  });
});

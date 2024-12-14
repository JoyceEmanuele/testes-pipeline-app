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
import "../../../serviceApiAsync/extServices/weatherData";
import * as httpApiRouter from "../../../serviceApiAsync/httpApiRouter";
import { faker } from "@faker-js/faker";
import { generateSessionReal } from "../factories/loginFactory";
import { mockUnitInfo } from "../../tests/factories/unifiedFactory";
import { mockGetFacilityNearestStation, mockGetPermissionsOnUnit } from "../../tests/factories/weatherFactory";
import * as permissionControl from '../../../srcCommon/helpers/permissionControl'
import * as weatherDataExt from '../../../serviceApiAsync/extServices/weatherData'

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("Weather", () => {
  describe("/get-weather-stations-near-unit", () => {
    describe("Success", () => {
      test("get-weather-stations-near-unit", async () => {

        const data = mockUnitInfo;
        const reqParams = { unitId: data.UNIT_ID}
        const session = generateSessionReal();
        session.permissions.isAdminSistema = true;

        jest.spyOn(sqldb.CLUNITS, "getUnitInfo").mockResolvedValue(data);
        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockResolvedValue(mockGetPermissionsOnUnit(true))
        jest.spyOn(weatherDataExt, 'getFacilityNearestStation').mockResolvedValue(mockGetFacilityNearestStation())

        const response = await httpApiRouter.externalRoutes["/get-weather-stations-near-unit"](
          reqParams,
          session
        );
        expect(response).toHaveProperty("list");
      });
    });
    describe("Error", () => {
      test("Invalid properties. Missing unitId.", async () => {
        const reqParams = { unitId: 0 };
        const session = generateSessionReal();

        await expect(httpApiRouter.externalRoutes['/get-weather-stations-near-unit'](reqParams, session))
        .rejects.toThrow('Invalid properties. Missing unitId.')
        .catch((error) => {
          expect(error.httpStatus).toBe('400');
        });
      });

      test("Unit not found", async () => {
        const session = generateSessionReal();
        let reqParams = { unitId: faker.number.int({min: 1}) }

        jest.spyOn(sqldb.CLUNITS, "getUnitInfo").mockImplementationOnce((): any => null);

        await expect(httpApiRouter.externalRoutes['/get-weather-stations-near-unit'](reqParams, session))
          .rejects.toThrow('Unit not found')
          .catch((error) => {
            expect(error.httpStatus).toBe('400');
          });
      });

      test("Permission denied", async () => {
        const session = generateSessionReal();
        let reqParams = { unitId: faker.number.int({min: 1}) }

        jest.spyOn(sqldb.CLUNITS, "getUnitInfo").mockResolvedValue(mockUnitInfo);
        jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockResolvedValue(mockGetPermissionsOnUnit(false))

        await expect(httpApiRouter.externalRoutes['/get-weather-stations-near-unit'](reqParams, session))
          .rejects.toThrow('Permission denied!')
          .catch((error) => {
            expect(error.httpStatus).toBe('403');
          });
      });
    });
  });
});
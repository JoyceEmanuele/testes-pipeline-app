import sqldb from "../../../srcCommon/db";
import { generateSessionReal } from "../factories/loginFactory";
import { faker } from "@faker-js/faker";
import { externalRoutes } from "../../httpApiRouter";
import * as permissionControl from '../../../srcCommon/helpers/permissionControl'
import { healthOverviewCard } from "../../crossData/overviewData";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("Health Overview", () => {
  describe("/health-overview-card", () => {
    describe("Success", () => {
      test("/health-overview-card no specific day", async () => {
        const reqParams: Parameters<typeof externalRoutes["/health-overview-card"]>[0] = {
            INCLUDE_INSTALLATION_UNIT: faker.helpers.maybe(() => faker.datatype.boolean()),
            clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
            stateIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.state())),
            cityIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.city())),
            unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
          };
        const session = generateSessionReal();
        jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
            clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
            unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
        });

        const healthPwr = jest.spyOn(sqldb.DEVICES, "getClientMachinesHealthPower").mockResolvedValueOnce(faker.helpers.multiple(() => ({
            ASSET_CAPACITY_UNIT: faker.helpers.arrayElement(["TR", "BTU/hr", "kW", faker.string.alpha()]),
            ASSET_CAPACITY_POWER: faker.number.float(),
            H_INDEX: faker.helpers.arrayElement([0, 1, 2, 3, 4, 25, 50, 75, 100, faker.number.int()]),
            N_DEVICES: faker.number.int(),
        })));
        const healthPwrDate = jest.spyOn(sqldb.DEVICES, "getClientMachinesHealthPowerAtDate").mockResolvedValueOnce(faker.helpers.multiple(() => ({
            ASSET_CAPACITY_UNIT: faker.helpers.arrayElement(["TR", "BTU/hr", "kW", faker.string.alpha()]),
            ASSET_CAPACITY_POWER: faker.number.float(),
            H_INDEX: faker.helpers.arrayElement([0, 1, 2, 3, 4, 25, 50, 75, 100, faker.number.int()]),
            N_DEVICES: faker.number.int(),
        })));
        const response = await healthOverviewCard(
          reqParams,
          session
        );
        expect(response.health).toBeInstanceOf(Object);
        expect(healthPwr).toHaveBeenCalledTimes(1);
        expect(healthPwrDate).not.toHaveBeenCalled();
      });
      test("/health-overview-card specific day", async () => {
        const reqParams: Parameters<typeof externalRoutes["/health-overview-card"]>[0] = {
            INCLUDE_INSTALLATION_UNIT: faker.helpers.maybe(() => faker.datatype.boolean()),
            clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
            stateIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.state())),
            cityIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.city())),
            unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
            atDayYMD: faker.date.recent().toISOString(),
        };
        const session = generateSessionReal();
        jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
            clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
            unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
        });

        const healthPwr = jest.spyOn(sqldb.DEVICES, "getClientMachinesHealthPower").mockResolvedValueOnce(faker.helpers.multiple(() => ({
            ASSET_CAPACITY_UNIT: faker.helpers.arrayElement(["TR", "BTU/hr", "kW", faker.string.alpha()]),
            ASSET_CAPACITY_POWER: faker.number.float(),
            H_INDEX: faker.helpers.arrayElement([0, 1, 2, 3, 4, 25, 50, 75, 100, faker.number.int()]),
            N_DEVICES: faker.number.int(),
        })));
        const healthPwrDate = jest.spyOn(sqldb.DEVICES, "getClientMachinesHealthPowerAtDate").mockResolvedValueOnce(faker.helpers.multiple(() => ({
            ASSET_CAPACITY_UNIT: faker.helpers.arrayElement(["TR", "BTU/hr", "kW", faker.string.alpha()]),
            ASSET_CAPACITY_POWER: faker.number.float(),
            H_INDEX: faker.helpers.arrayElement([0, 1, 2, 3, 4, 25, 50, 75, 100, faker.number.int()]),
            N_DEVICES: faker.number.int(),
        })));
        const response = await healthOverviewCard(
            reqParams,
            session
        );
        expect(response.health).toBeInstanceOf(Object);
        expect(healthPwrDate).toHaveBeenCalledTimes(1);
        expect(healthPwr).not.toHaveBeenCalled();
      });
    });
  });
});

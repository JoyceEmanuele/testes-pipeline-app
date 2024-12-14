import * as httpRouter from "../../apiServer/httpRouter";
import sqldb from "../../../srcCommon/db";
import "../../crossData/holidays";
import { generateSessionReal } from "../factories/loginFactory";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("Holiday", () => {
  describe("get-holidays-list", () => {
    describe("Success", () => {
      test("get-holidays-list", async () => {
        const reqParams = {};
        const session = generateSessionReal();
        jest.spyOn(sqldb.FERIADOS, "getList").mockResolvedValueOnce([]);
        const response = await httpRouter.privateRoutes["/get-holidays-list"](
          reqParams,
          session
        );
        expect(response.list).toBeInstanceOf(Array);
      });
    });
  });
});

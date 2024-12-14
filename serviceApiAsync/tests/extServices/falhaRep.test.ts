import sqldb from "../../../srcCommon/db";
import * as factories from "../factories/faultsFactory";
import falhaRep from "../../../serviceHealth/extServices/falhaRep";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

describe("Faults", () => {
  describe("/detected-faults/list-dacs", () => {
    describe("Success", () => {
      test("list-dacs", async () => {
        const reqParams = { dacs_id: ["dac_id"] };
        jest
          .spyOn(sqldb.DACS_DEVICES, "buildDacsListSentence")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacs(reqParams))
          );
        jest
          .spyOn(falhaRep, "/detected-faults/list-dacs")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsAlerts(true))
          );
        const response = await falhaRep["/detected-faults/list-dacs"](
          reqParams
        );
        expect(response).toHaveProperty("list");
      });
    });

    describe("Error", () => {
      test("list-dacs", async () => {
        const reqParams = { dacs_id: ["dac_id"] };
        jest
          .spyOn(sqldb.DACS_DEVICES, "buildDacsListSentence")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacs(reqParams))
          );
        jest
          .spyOn(falhaRep, "/detected-faults/list-dacs")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsAlerts(false))
          );
        const response = await falhaRep["/detected-faults/list-dacs"](
          reqParams
        );
        expect(response).not.toHaveProperty("list");
      });
    });
  });

  describe("/enabled-faults/list-dac", () => {
    describe("Success", () => {
      test("list-dacs", async () => {
        const reqParams = { dev_id: "dac_id" };
        jest
          .spyOn(falhaRep, "/enabled-faults/list-dac")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsEnabled(reqParams))
          );
        const response = await falhaRep["/enabled-faults/list-dac"](reqParams);
        expect(response).toHaveProperty("list");
      });
    });

    describe("Error", () => {
      test("list-dacs", async () => {
        const reqParams = { dev_id: "dac_id" };
        jest
          .spyOn(falhaRep, "/enabled-faults/list-dac")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsAlerts(false))
          );
        const response = await falhaRep["/enabled-faults/list-dac"](reqParams);
        expect(response).not.toHaveProperty("list");
      });
    });
  });

  describe("/enabled-faults/list-all", () => {
    describe("Success", () => {
      test("list-dacs", async () => {
        jest
          .spyOn(falhaRep, "/enabled-faults/list-all")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsEnabledAll())
          );
        const response = await falhaRep["/enabled-faults/list-all"]();
        expect(response).toHaveProperty("list");
      });
    });

    describe("Error", () => {
      test("list-dacs", async () => {
        jest
          .spyOn(falhaRep, "/enabled-faults/list-all")
          .mockImplementationOnce((): any =>
            Promise.resolve(factories.generateListDacsAlerts(false))
          );
        const response = await falhaRep["/enabled-faults/list-all"]();
        expect(response).not.toHaveProperty("list");
      });
    });
  });
});

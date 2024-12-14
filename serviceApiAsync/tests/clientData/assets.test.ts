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

import sqldb from '../../../srcCommon/db';
import * as mock from "../factories/assetsFactory";
import * as factoriesLogin from "../factories/loginFactory";
import * as assets from "../../clientData/assets";
import { faker } from '@faker-js/faker';

beforeEach(() => {
    jest.restoreAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
});

describe("Assets", () => {
    describe('verifyRatedPowerMachine', () => {
        describe('Success', () => {
            test('No update machine rated power', async () => {
                let params = mock.mockVerifyRatedPowerMachineParams(false);
                let session = factoriesLogin.generateSessionReal();

                const mockMachine = jest.spyOn(sqldb.MACHINES, 'getMachineRatedPower').mockImplementation();
                await assets.verifyRatedPowerMachine({ ...params, userId: session.user });
                expect(mockMachine).not.toHaveBeenCalled();
            });
            test('No oldRatedPowerAsset', async () => {
                let params = mock.mockVerifyRatedPowerMachineParams(true);
                let session = factoriesLogin.generateSessionReal();
                params.oldRatedPowerAsset = <any>null;

                const getMachine = jest.spyOn(sqldb.MACHINES, 'getMachineRatedPower').mockResolvedValue({ RATED_POWER: faker.number.int({ min: 0, max: 20 })});
                jest.spyOn(sqldb.MACHINES, 'w_update').mockImplementation();

                await assets.verifyRatedPowerMachine({ ...params, userId: session.user });
                expect(getMachine).toHaveBeenCalled();
            });
            test('Ok', async () => {
                let params = mock.mockVerifyRatedPowerMachineParams(true, true);
                let session = factoriesLogin.generateSessionReal();

                const getMachine = jest.spyOn(sqldb.MACHINES, 'getMachineRatedPower').mockResolvedValue({ RATED_POWER: faker.number.int({ min: 0, max: 20 })});
                const updateMachine = jest.spyOn(sqldb.MACHINES, 'w_update').mockImplementation();

                await assets.verifyRatedPowerMachine({ ...params, userId: session.user });
                expect(getMachine).toHaveBeenCalledTimes(1);
                expect(updateMachine).toHaveBeenCalledTimes(1);
            });
        })
    })
});

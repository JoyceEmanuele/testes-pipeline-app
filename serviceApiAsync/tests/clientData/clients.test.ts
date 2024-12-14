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

import {
    generateSessionNoPermissions,
    generateSessionReal,
} from "../factories/loginFactory";
import sqldb from "../../../srcCommon/db";
import * as clientsFunctions from '../../clientData/clients';
import * as clientsFactory from '../factories/clientsFactory';

beforeEach(() => {
    jest.restoreAllMocks();
});

afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe("clients", () => {
    describe("getAllClients", () => {
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = null;
                const session = generateSessionReal();

                jest.spyOn(sqldb.CLIENTS, 'getAllClientsEnabled').mockResolvedValue(clientsFactory.getAllClientsEnabled());
                const response = await clientsFunctions.getAllClients(reqParams, session);
                expect(response).toBeDefined();
            })
            test('Ok with filters', async () => {
                let reqParams = clientsFactory.mockReqParamsGetAllClients();
                const session = generateSessionReal();

                jest.spyOn(sqldb.CLIENTS, 'getAllClientsEnabled').mockResolvedValue(clientsFactory.getAllClientsEnabled());
                const response = await clientsFunctions.getAllClients(reqParams, session);
                expect(response).toBeDefined();
            })
        });
        describe('Error', () => {
            test('Permission Denied', async () => {
                let reqParams = null;
                const session = generateSessionNoPermissions();

                await expect(clientsFunctions.getAllClients(reqParams, session)).rejects.toThrow('Permission Denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
        });
    });
})

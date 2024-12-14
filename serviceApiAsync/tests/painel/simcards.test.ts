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
    
    import * as simcardFunc from '../../painel/simcards';
    import { generateSessionReal } from '../factories/loginFactory';
    import * as permsFunc from '../../../srcCommon/helpers/permissionControl';
    import * as linkSolutionsAPI from '../../extServices/linkSolutionsAPI';
    import * as metaTelecom from '../../extServices/metaTelecom';
    import * as kiteApi from '../../extServices/KiteApi';
    import sqldb from '../../../srcCommon/db';
    import { faker } from '@faker-js/faker';
    
    beforeEach(() => {
        jest.restoreAllMocks();
    });
    
    afterAll(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });
    
    describe("simcards", () => {
        describe("/sims-v2", () => {
            describe("Success", () => {
            test("rotorna lista", async () => {
                const session = generateSessionReal();
                const params = { solution: 'todos' as 'kite' | 'tns' | 'meta' | 'todos' };
                jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                    return {
                        manageAllSimcards: true,
                    }
                })
                jest.spyOn(simcardFunc, 'getValueSolutions').mockReturnValue({
                    kite: true,
                    tns: true, 
                    meta: true
                })
                jest.spyOn(simcardFunc, 'resolvePromiseAllApiSims').mockResolvedValue({
                    listDbSims: null,
                    listMetaSims: null,
                    listTnsSims: null,
                    listVivoSims: null,
                })
                const result = await simcardFunc.simV2Route(params, session);
                expect(result).toHaveProperty('tns');
                expect(result).toHaveProperty('meta');
                expect(result).toHaveProperty('vivo');
            });
            });
            describe("Error", () => {
                test("Error Permissions", async () => {
                    const session = generateSessionReal();
                    const params = { solution: 'todos' as 'kite' | 'tns' | 'meta' | 'todos' };
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: false,
                        }
                    })
                    await expect(simcardFunc.simV2Route(params, session)).rejects.toThrow('Not allowed')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
                });
            });
        });
        describe("/resolvePromiseAllApiSims", () => {
            describe("Success", () => {
                test("rotorna lista", async () => {
                    jest.spyOn(kiteApi, 'getListSimsKiteVivo').mockResolvedValue(null);
                    jest.spyOn(linkSolutionsAPI, 'getLsmSimsList').mockResolvedValue(null);
                    jest.spyOn(metaTelecom, 'getalluserservices').mockResolvedValue(null);
                    jest.spyOn(sqldb.SIMCARDS, 'getList').mockResolvedValue(null);
                    const param = { kite: true, tns: true, meta: true }
                    const resp = await simcardFunc.resolvePromiseAllApiSims(param);
                    expect(resp).toHaveProperty('listDbSims');
                    expect(resp).toHaveProperty('listTnsSims');
                    expect(resp).toHaveProperty('listMetaSims');
                    expect(resp).toHaveProperty('listVivoSims');
                });
            });
        });
        describe("/getValueSolutions", () => {
            describe("Success", () => {
                test("rotorna todos", async () => {
                    const params = { solution: 'todos' as 'kite' | 'tns' | 'meta' | 'todos' }
                    const resp = simcardFunc.getValueSolutions(params);
                    expect(resp).toStrictEqual({ kite: true, tns: true, meta: true });
                });
                test("retorna kite", async () => {
                    const params = { solution: 'kite' as 'kite' | 'tns' | 'meta' | 'todos' }
                    const resp = simcardFunc.getValueSolutions(params);
                    expect(resp).toStrictEqual({ kite: true, tns: false, meta: false });
                });
                test("retorna meta", async () => {
                    const params = { solution: 'meta' as 'kite' | 'tns' | 'meta' | 'todos' }
                    const resp = simcardFunc.getValueSolutions(params);
                    expect(resp).toStrictEqual({ kite: false, tns: false, meta: true });
                });
                test("retorna tns", async () => {
                    const params = { solution: 'tns' as 'kite' | 'tns' | 'meta' | 'todos' }
                    const resp = simcardFunc.getValueSolutions(params);
                    expect(resp).toStrictEqual({ kite: false, tns: true, meta: false });
                });
            });
        });
        describe("/sims/send-reset-request", () => {
            describe("Success", () => {
                test("rotorna lista", async () => {
                    const session = generateSessionReal();
                    const params = {
                    iccid: faker.string.alphanumeric(),
                    type: 'VIVO',
                    };
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: true,
                        }
                    })
                    jest.spyOn(kiteApi, 'resetNetworkVivo').mockResolvedValue(true);
                    jest.spyOn(linkSolutionsAPI, 'sendResetRequest').mockResolvedValue(null);
                    const result = await simcardFunc.sendResetRequestRoute(params, session);
                    expect(result).toStrictEqual({ respostas: [{ iccid: params.iccid }]});
                });
            });
                describe("Error", () => {
                    test("Error Permissions", async () => {
                    const session = generateSessionReal();
                    const params = {
                        iccid: faker.string.alphanumeric(),
                        type: 'VIVO',
                    };
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: false,
                        }
                    })
                        await expect(simcardFunc.sendResetRequestRoute(params, session)).rejects.toThrow('Permission denied')
                        .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
                    });
                    test("Error Permissions", async () => {
                    const session = generateSessionReal();
                    const params = {
                        type: 'VIVO',
                    } as any;
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: true,
                        }
                    })
                        await expect(simcardFunc.sendResetRequestRoute(params, session)).rejects.toThrow('Faltou informar o iccid.')
                        .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
                    });
                });
        });
        describe("/sims/set-sim-info", () => {
            describe("Success", () => {
                test("rotorna iccid atualizado", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCID: faker.string.alphanumeric(),
                        CLIENT: faker.number.int(),
                        UNIT: faker.number.int(),
                        ACCESSPOINT: faker.string.alphanumeric(),
                        OLDICCID: faker.string.alphanumeric(),
                        MODEM: faker.string.alphanumeric(),
                        MACACCESSPOINT: faker.string.alphanumeric(),
                        MACREPEATER: faker.string.alphanumeric(),
                        ASSOCIATION_DATE: faker.string.alphanumeric(),
                    };
                    jest.spyOn(simcardFunc, 'verifyPermisionsSimCard').mockReturnValue();
                    jest.spyOn(sqldb.SIMCARDS, 'w_update').mockImplementation((): any => {});
                    jest.spyOn(sqldb.SIMCARDS, 'w_insertOrUpdate').mockImplementation((): any => {});
                    jest.spyOn(sqldb.SIMCARDS, 'getDetails').mockImplementation((): any => { return {
                        ICCID: params.ICCID,
                    }});
                    const result = await simcardFunc.setSimInfoRoute(params, session);
                    expect(result).toHaveProperty("ICCID");
                });
            });
            describe("Error", () => {
                test("Error Permissions", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCID: faker.string.alphanumeric(),
                        CLIENT: faker.number.int(),
                        UNIT: faker.number.int(),
                        ACCESSPOINT: faker.string.alphanumeric(),
                        OLDICCID: faker.string.alphanumeric(),
                        MODEM: faker.string.alphanumeric(),
                        MACACCESSPOINT: faker.string.alphanumeric(),
                        MACREPEATER: faker.string.alphanumeric(),
                        ASSOCIATION_DATE: faker.string.alphanumeric(),
                    };
                    const paramsFalse: any = params;
                    delete paramsFalse.ICCID;
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: false,
                        }
                    })
                    await expect(simcardFunc.setSimInfoRoute(params, session)).rejects.toThrow('Permission denied')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
                });
                test("Error Params", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCID: faker.string.alphanumeric(),
                        CLIENT: faker.number.int(),
                        UNIT: faker.number.int(),
                        ACCESSPOINT: faker.string.alphanumeric(),
                        OLDICCID: faker.string.alphanumeric(),
                        MODEM: faker.string.alphanumeric(),
                        MACACCESSPOINT: faker.string.alphanumeric(),
                        MACREPEATER: faker.string.alphanumeric(),
                        ASSOCIATION_DATE: faker.date.anytime(),
                    };
                    const paramsFalse: any = params;
                    delete paramsFalse.ICCID;
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: true,
                        }
                    })
                    await expect(simcardFunc.setSimInfoRoute(paramsFalse, session)).rejects.toThrow('There was an error!\nInvalid properties. Missing SIM ICCID.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
                });
            });
        });
        describe("/sims/delete-sim", () => {
            describe("Success", () => {
                test("retorna OK", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCIDS: [
                            {
                                OLDICCID: faker.string.alphanumeric(),
                                ICCID: faker.string.alphanumeric(),
                            },
                            {
                                OLDICCID: faker.string.alphanumeric(),
                                ICCID: faker.string.alphanumeric(),
                            }
                        ]
                    }
                    jest.spyOn(simcardFunc, 'verifyPermisionsSimCard').mockReturnValue();
                    jest.spyOn(sqldb.SIMCARDS, 'w_delete').mockImplementation((): any => {});
                    const result = await simcardFunc.deleteSimRoute(params, session);
                    expect(result).toBe("OK");
                });
            });
            describe("Error", () => {
                test("Error Permissions", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCIDS: []
                    } as {
                        ICCIDS: { OLDICCID: string, ICCID: string }[]
                    }
                    jest.spyOn(permsFunc, 'getUserGlobalPermissions').mockImplementation((): any => {
                        return {
                            manageAllSimcards: false,
                        }
                    })
                    await expect(simcardFunc.deleteSimRoute(params, session)).rejects.toThrow('Permission denied')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
                });
                test("Error Params", async () => {
                    const session = generateSessionReal();
                    const params = {
                        ICCIDS: []
                    } as {
                        ICCIDS: { OLDICCID: string, ICCID: string }[]
                    }
                    jest.spyOn(simcardFunc, 'verifyPermisionsSimCard').mockReturnValue();
                    await expect(simcardFunc.deleteSimRoute(params, session)).rejects.toThrow('There was an error!\nInvalid properties. Missing SIM ICCID.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
                });
            });
        });
    });
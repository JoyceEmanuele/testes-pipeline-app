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
import { faker } from '@faker-js/faker';
import * as factoriesLogin from '../factories/loginFactory';
import * as permissionControl from "../../../srcCommon/helpers/permissionControl";
import * as mock from '../factories/machinesFactory';
import * as machines from "../../clientData/machines";
import * as eventHooks from "../../realTime/eventHooks";
import * as dacInfo from "../../dacInfo";
import * as assets from '../../clientData/assets';
import * as associations from "../../clientData/associations";

beforeEach(() => {
    jest.restoreAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
});

describe("Machines", () => {
    describe('get-machine-additional-parameters', () => {
        describe('Success', () => {
            test("get-machine-additional-parameters", async () => {
                let reqParams = { MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.MACHINE_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(sqldb.ADDITIONAL_MACHINE_PARAMETERS, 'getAllParametersByMachine').mockResolvedValue(mock.getAllParametersByMachine());

                const response = await machines.getMachineAdditionalParameters(
                    reqParams,
                    session
                );
                expect(Array.isArray(response)).toBe(true);
            })
        })
        describe('Error',  () => {
            test("Missing MACHINE_ID", async() => {
                let reqParams = { MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
                const session = factoriesLogin.generateSessionReal();
                reqParams.MACHINE_ID = <any>null;
                await machines.getMachineAdditionalParameters(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing MACHINE_ID.');
                  });
            });
            test("Máquina não encontrada", async() => {
                let reqParams = { MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
                const session = factoriesLogin.generateSessionReal();
                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(null);

                await machines.getMachineAdditionalParameters(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Máquina não encontrada');
                  });
            })
            test("Permission Denied!", async() => {
                let reqParams = { MACHINE_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
                const session = factoriesLogin.generateSessionReal();
                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.MACHINE_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));
                await machines.getMachineAdditionalParameters(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                  });
            });
        })
    });
    describe('addNewMachine', () => {
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({ canConfigureNewUnits: true }));
                jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mock.mockUnitBasicInfo(reqParams.CLIENT_ID));
                jest.spyOn(machines, 'verifyRatedPowerMachine').mockImplementation();
                const machineIdInserted = Number(faker.string.numeric({ exclude: ['0'] }));
                jest.spyOn(sqldb.MACHINES, 'w_insert').mockImplementation((): any => Promise.resolve({
                    insertId: machineIdInserted,
                }));
                jest.spyOn(machines, 'addMachineHelper').mockImplementation();
                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(machineIdInserted));
                jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_loadAutomationRefs').mockImplementation();

                const response = await machines.addNewMachine(reqParams, session);
                expect(response).toBeDefined();
            })
        });
        describe('Error', () => {
            test('Missing CLIENT_ID', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                reqParams.CLIENT_ID = <any>null;
                const session = factoriesLogin.generateSessionReal();

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Missing parameter: CLIENT_ID')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Missing UNIT_ID', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                reqParams.UNIT_ID = <any>null;
                const session = factoriesLogin.generateSessionReal();

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Missing parameter: UNIT_ID')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Missing GROUP_NAME', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                reqParams.GROUP_NAME = <any>null;
                const session = factoriesLogin.generateSessionReal();

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Missing parameter: GROUP_NAME')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Invalid automation device!', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                const session = factoriesLogin.generateSessionReal();
                reqParams.DEV_AUT += ' ';

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Invalid automation device!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Invalid reference device!', async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                const session = factoriesLogin.generateSessionReal();
                reqParams.REL_DUT_ID += ' ';

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Invalid reference device!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Permission Denied!", async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({ canConfigureNewUnits: false }));

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
            test("Invalid UNIT_ID!", async () => {
                let reqParams = mock.mockReqParamsAddNewMachine();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(permissionControl, "getPermissionsOnClient").mockImplementationOnce((): any => ({ canConfigureNewUnits: true }));
                jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(null);

                await expect(machines.addNewMachine(reqParams, session)).rejects.toThrow('Invalid UNIT_ID!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
        })
    });
    describe('editMachineInfo', () => {
        describe('Success', () => {
            test('Only Edit Name', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();
                session.permissions.isAdminSistema = false;

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canManageDevs: true }));
                jest.spyOn(machines, 'editOnlyName').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));

                const response = await machines.editMachineInfo(reqParams, session);
                expect(response).toBeDefined();
            })
            test('Ok', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canManageDevs: true }));
                jest.spyOn(sqldb.DUTS, 'getBasicInfo').mockResolvedValue(null);
                jest.spyOn(machines, 'editRatedPowerMachine').mockImplementation();
                jest.spyOn(machines, 'editMachineHelper').mockImplementation();
                jest.spyOn(machines, 'realocateManufacturerDevice').mockImplementation();
                jest.spyOn(machines, 'setMachineRefrigeratesEnvironment').mockImplementation();
                jest.spyOn(machines, 'setMachineAutomation').mockImplementation();
                jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_loadAutomationRefs').mockImplementation();
                jest.spyOn(sqldb.MACHINES, 'checkConsistency_AUTOM').mockResolvedValue([]);

                const response = await machines.editMachineInfo(reqParams, session);
                expect(response).toBeDefined();
            })
        });
        describe('Error', () => {
            test('Missing GROUP_ID', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                reqParams.GROUP_ID = <any>null;
                const session = factoriesLogin.generateSessionReal();

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('Invalid properties. Missing GROUP_ID.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Machine not found', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(null);

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('Machine not found')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Permission Denied', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canManageDevs: false }));

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
            test("DUTs QA REFERENCE", async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canManageDevs: true }));
                jest.spyOn(sqldb.DUTS, 'getBasicInfo').mockImplementation((): any => Promise.resolve({ VARS: 'HD' }));

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('DUTs QA cannot be used as temperature references.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Invalid automation device!', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();
                reqParams.REL_DEV_AUT += ' ';

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('Invalid automation device!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test('Invalid reference device!', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                const session = factoriesLogin.generateSessionReal();
                reqParams.REL_DUT_ID += ' ';

                await expect(machines.editMachineInfo(reqParams, session)).rejects.toThrow('Invalid reference device!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
        })
    });
    describe('verifyRatedPowerMachine', () => {
        describe('Error', () => {
            test ('ratedPowerMachine < sumRatedPowerCondensers', () => {
                let params = { ratedPowerMachine: faker.number.int({ min: 0, max : 12 }), sumRatedPowerCondensers: faker.number.int({ min: 13 , max : 20 } )}

                try {
                    machines.verifyRatedPowerMachine(params.ratedPowerMachine, params.sumRatedPowerCondensers);
                } 
                catch(e) {
                    expect(e).toHaveProperty('message', 'O valor mínimo para a potência nominal da máquina deve ser a soma das potências das condensadoras.');
                }
            })
        })
    });
    describe('editRatedPowerMachine', () => {
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                let session = factoriesLogin.generateSessionReal();
                

                jest.spyOn(machines, 'verifyRatedPowerMachine').mockImplementation();
                const machineUpdate = jest.spyOn(sqldb.MACHINES, 'w_update').mockImplementation();

                await machines.editRatedPowerMachine(reqParams, session.user, (reqParams.RATED_POWER + 1));
                expect(machineUpdate).toHaveBeenCalled();
            });
            test('Ok with no sum rated power condensers', async () => {
                let reqParams = mock.mockReqParamsEditMachineInfo();
                let session = factoriesLogin.generateSessionReal();
                reqParams.SUM_RATED_POWER_CONDENSERS = <any>null;

                jest.spyOn(machines, 'verifyRatedPowerMachine').mockImplementation();
                const machineUpdate = jest.spyOn(sqldb.MACHINES, 'w_update').mockImplementation();
                jest.spyOn(sqldb.ASSETS, 'getAssetsByMachine').mockResolvedValue(mock.mockGetAssetsByMachine());

                await machines.editRatedPowerMachine(reqParams, session.user, (reqParams.RATED_POWER + 1));
                expect(machineUpdate).toHaveBeenCalled();
            })
        })
    });
    // describe('removeMachine', () => {
    //     describe('Success', () => {
    //         test('Ok', async () => {
    //             let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
    //             const session = factoriesLogin.generateSessionReal();

    //             jest.spyOn(sqldb.MACHINES, 'getBasicInfo').mockResolvedValue(mock.mockMachineGetBasicInfo());
    //             jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementation((): any => ({ deleteClientUnitsMachinesRooms: true }));
    //             jest.spyOn(dacInfo, "removingMachine").mockImplementation();
    //             jest.spyOn(associations, "removingMachine").mockImplementation();
    //             jest.spyOn(assets, "removingAssetsByMachine").mockImplementation();

    //             jest.spyOn(sqldb.MACHINES_AUTOMATIONS_PERIODS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.DAMS_AUTOMATIONS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.DACS_AUTOMATIONS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.DRIS_AUTOMATIONS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.DUTS_AUTOMATION, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.DUTS_REFERENCE, "w_deleteFromMachine").mockResolvedValue(null);
    //             jest.spyOn(sqldb.MACHINE_IMAGES, "w_deleteMachineImgInfo").mockResolvedValue(null);
    //             jest.spyOn(sqldb.ELECTRIC_CIRCUITS_MACHINES, "w_deleteElectricCircuitsMachinesByID").mockResolvedValue(null);
    //             jest.spyOn(sqldb.ELECTRIC_CIRCUITS, "w_deleteByMachineId").mockResolvedValue(null);
    //             jest.spyOn(sqldb.REFRIGERATES, "w_deleteFromMachineRow").mockResolvedValue(null);
    //             jest.spyOn(sqldb.ADDITIONAL_MACHINE_PARAMETERS, "w_deleteFromMachine").mockResolvedValue(null);
    //             jest.spyOn(sqldb.MACHINES, "w_deleteRow").mockResolvedValue({ affectedRows: 0, insertId: 0 });
    //             jest.spyOn(eventHooks, 'ramCaches_DEVGROUPS_loadAutomationRefs').mockImplementation();
    //             const response = await machines.removeMachine(reqParams, session);
    //             expect(response).toBeDefined();
    //         })
    //     })
    //     describe('Error', () => {
    //         test('Missing GROUP_ID', async () => {
    //             let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
    //             reqParams.GROUP_ID = <any>null;
    //             const session = factoriesLogin.generateSessionReal();

    //             await expect(machines.removeMachine(reqParams, session)).rejects.toThrow('Invalid properties. Missing GROUP_ID.')
    //                 .catch((error) => {
    //                     expect(error.httpStatus).toBe('400');
    //                 });
    //         });
    //         test('Machine not found', async () => {
    //             let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
    //             const session = factoriesLogin.generateSessionReal();

    //             jest.spyOn(sqldb.MACHINES, 'getBasicInfo').mockResolvedValue(null);

    //             await expect(machines.removeMachine(reqParams, session)).rejects.toThrow('Máquina não encontrada')
    //                 .catch((error) => {
    //                     expect(error.httpStatus).toBe('400');
    //                 });
    //         });
    //         test("Permission Denied!", async () => {
    //             let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
    //             const session = factoriesLogin.generateSessionReal();

    //             jest.spyOn(sqldb.MACHINES, 'getBasicInfo').mockResolvedValue(mock.mockMachineGetBasicInfo());

    //             jest.spyOn(permissionControl, "getUserGlobalPermissions").mockImplementation((): any => ({ deleteClientUnitsMachinesRooms: false }));

    //             await expect(machines.removeMachine(reqParams, session)).rejects.toThrow('Permission denied')
    //                 .catch((error) => {
    //                     expect(error.httpStatus).toBe('403');
    //                 });
    //         });
    //     })
    // }); 
    describe('getGroupInfo', () => {
        describe('Error', () => {
            test('Missing GROUP_ID', async () => {
                let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0']})) };
                reqParams.GROUP_ID = <any>null;
                const session = factoriesLogin.generateSessionReal();

                await expect(machines.getGroupInfo(reqParams, session)).rejects.toThrow('Invalid properties. Missing GROUP_ID.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            }),
            test('Máquina não encontrada', async () => {
                let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0']})) };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(null);

                await expect(machines.getGroupInfo(reqParams, session)).rejects.toThrow('Máquina não encontrada')
                .catch((error) => {
                    expect(error.httpStatus).toBe('400');
                });
            }),
            test('Permission denied!', async () => {
                let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0']})) };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(sqldb.MACHINES, 'getMachineAutInfo').mockResolvedValue(mock.mockGetMachineAutInfo(reqParams.GROUP_ID));
                jest.spyOn(sqldb.DEVICES, 'getDeviceIdByDeviceCode').mockResolvedValue({DEVICE_ID: faker.number.int()});

                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => ({ canViewDevs: false }));

                await expect(machines.getGroupInfo(reqParams, session)).rejects.toThrow('Permission denied!')
                .catch((error) => {
                    expect(error.httpStatus).toBe('403');
                });
            })
        })
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = { GROUP_ID: Number(faker.string.numeric({ exclude: ['0']})) };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachineInfo').mockResolvedValue(mock.getMachineInfo(reqParams.GROUP_ID));
                jest.spyOn(sqldb.MACHINES, 'getMachineAutInfo').mockResolvedValue(mock.mockGetMachineAutInfo(reqParams.GROUP_ID));
                jest.spyOn(sqldb.DEVICES, 'getDeviceIdByDeviceCode').mockResolvedValue({DEVICE_ID: faker.number.int()});

                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => ({ canViewDevs: true }));

                const response = await machines.getGroupInfo(reqParams, session);
                expect(response).toBeDefined();
            })
        })
    });
    describe('getMachinesList', () => {
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = {
                    clientIds: [Number(faker.string.numeric({ exclude: ['0']}))],
                    unitIds: [Number(faker.string.numeric({ exclude: ['0']}))],
                    INCLUDE_INSTALLATION_UNIT: !!faker.number.int({  min: 0, max: 1}),
                };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.MACHINES, 'getMachinesList').mockResolvedValue(mock.mockGetMachineList());
                jest.spyOn(sqldb.ASSETS, 'getAssetsList').mockResolvedValue(mock.mockAssetsList());


                const response = await machines.getMachinesList(reqParams, session);
                expect(Array.isArray(response)).toBe(true);
            })
        })
    })
})

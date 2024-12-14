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

import sqldb from '../../srcCommon/db';
import { faker } from '@faker-js/faker';
import * as factoriesLogin from './factories/loginFactory';
import * as httpRouter from '../apiServer/httpRouter';
import * as permissionControl from "../../srcCommon/helpers/permissionControl";
import * as mock from './factories/devInfoFactory';
import "../devInfo";
import * as driHist from '../telemHistory/driHist';
import * as devInfo from '../devInfo';
import * as drisCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import * as dacsData from '../../srcCommon/helpers/dacData';
import { mockDmaGetBasicInfo } from './factories/laagerApiFactory';
import { mockGetMachineAutInfo } from './factories/machinesFactory';

beforeEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
});

describe("Devices", () => {
    describe('devices/get-offline-device-info', () => {
        describe('Success', () => {
            test("Retornando informação do DEVICE", async () => {
                let reqParams = { DEVICE_CODE: faker.string.alphanumeric() };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DEVICES, 'getDeviceInfo').mockResolvedValue(mock.getDeviceInfo(reqParams.DEVICE_CODE));
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));

                const response = await httpRouter.privateRoutes["/devices/get-offline-device-info"](
                    reqParams,
                    session
                );
                expect(response!.device!.DEVICE_CODE).toEqual(expect.any(String));
            })
            test("Retornando device vazio, dispositivo excluído", async () => {
                let reqParams = { DEVICE_CODE: faker.string.alphanumeric() };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DEVICES, 'getDeviceInfo').mockResolvedValue(null);
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));

                const response = await httpRouter.privateRoutes["/devices/get-offline-device-info"](
                    reqParams,
                    session
                );
                expect(response.device).toBe(null);
            })
        })
        describe('Error', () => {
            test("Missing DEVICE_CODE", async () => {
                let reqParams = { DEVICE_CODE: faker.string.alphanumeric() };
                const session = factoriesLogin.generateSessionReal();
                reqParams.DEVICE_CODE = <any>null;

                await httpRouter.privateRoutes['/devices/get-offline-device-info'](reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE.');
                });
            })
            test("Permission denied!", async () => {
                let reqParams = { DEVICE_CODE: faker.string.alphanumeric() };
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DEVICES, 'getDeviceInfo').mockResolvedValue(null);
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await httpRouter.privateRoutes['/devices/get-offline-device-info'](reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                });
            })
        })
    })
    describe('getDevicesToDisponibility', () => {
        describe('Success', () => {
            test('Ok', async () => {
                let params = mock.mockParamsDevicesToDisponibility();

                jest.spyOn(sqldb.DUTS, 'getAllDutsByUnit').mockResolvedValue(mock.getAllDutsByUnit());
                jest.spyOn(sqldb.DRIS_DEVICES, 'getAllDrisByUnit').mockResolvedValue(mock.getAllDevicesSimpleByUnit());
                jest.spyOn(sqldb.DMTS, 'getAllDmtsByUnit').mockResolvedValue(mock.getAllDevicesSimpleByUnit());
                jest.spyOn(sqldb.DALS, 'getAllDalsByUnit').mockResolvedValue(mock.getAllDevicesSimpleByUnit());
                jest.spyOn(sqldb.DAMS_DEVICES, 'getAllDamsByUnit').mockResolvedValue(mock.getAllDevicesSimpleByUnit());
                jest.spyOn(driHist, 'loadDriCfg').mockResolvedValue(null);

                const response = await devInfo.getDevicesToDisponibility(params.unitId, params.dacs_devices_list, params.duts_devices_list, [], params.duts_to_l1_automation);

                expect(response).toBeDefined();
                
            })
        })
    })
    describe('getConfigDevices', () => {
        describe('Success', () => {
            test('Ok', async () => {
                let reqParams = mock.mockReqParamsGetConfigDevices();
                let session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mock.mockGetUnitBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(sqldb.DUTS, 'getDutsDuoByUnit').mockResolvedValue(mock.mockGetDutsDuoByUnit());
                jest.spyOn(sqldb.DUTS, 'getDutsDuoToL1AutomationByUnit').mockResolvedValue(mock.mockGetDutsDuoByUnit());
                jest.spyOn(devInfo, 'verifyWaterDevice').mockResolvedValue({ laager_device: null, dma_device: null });
                jest.spyOn(sqldb.DACS_DEVICES, 'getDacsByUnitWithMachineInfo').mockResolvedValue(mock.mockDacsByUnitWithMachineInfo());
                jest.spyOn(sqldb.MACHINES, 'getMachineAutInfo').mockResolvedValue(mock.mockGetMachineAutInfo());
                jest.spyOn(devInfo, 'getSecondsCurrentProgAutom').mockResolvedValue([{ seconds_start: Number(faker.string.numeric({ exclude: ['0'] })), seconds_end: Number(faker.string.numeric({ exclude: ['0'] })), must_be_on: true}])
                jest.spyOn(dacsData, 'dacHwCfg').mockImplementationOnce((): any => mock.mockDacHwCfg());
                jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(mock.mockGetEnergyDevicesDriByUnit())
                jest.spyOn(drisCfgLoader, 'loadDrisCfg').mockImplementation((): any => ({ drisCfg: {} }));
                jest.spyOn(drisCfgLoader, 'getDrisCfgFormulas').mockImplementation((): any => {});
                jest.spyOn(devInfo, 'getDevicesToDisponibility').mockResolvedValue({ dacs_to_disponibility: [], dals_to_disponibility: [], duts_to_disponibility: [], dris_to_disponibility: [], dmts_to_disponibility: [], dams_to_disponibility: [] })
                jest.spyOn(devInfo, 'getSecondsCurrentProgAutom').mockResolvedValue([]);
                jest.spyOn(sqldb.MACHINES, 'getMachineAutInfo').mockResolvedValue(null);
               
                const response = await devInfo.getConfigDevices(reqParams, session);
                expect(response).toBeDefined();
            })
        })
        describe('Error', () => {
            test('Missing UNIT_ID', async () => {
                let reqParams = mock.mockReqParamsGetConfigDevices();
                let session = factoriesLogin.generateSessionReal();
                reqParams.UNIT_ID = <any>null;

                await expect(devInfo.getConfigDevices(reqParams, session)).rejects.toThrow('Invalid properties. Missing UNIT_ID')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            })
            test('Missing DAY', async () => {
                let reqParams = mock.mockReqParamsGetConfigDevices();
                let session = factoriesLogin.generateSessionReal();
                reqParams.DAY = <any>null;

                await expect(devInfo.getConfigDevices(reqParams, session)).rejects.toThrow('Invalid properties. Missing Day')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            })
            test('Permission Denied', async () => {
                let reqParams = mock.mockReqParamsGetConfigDevices();
                let session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mock.mockGetUnitBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await expect(devInfo.getConfigDevices(reqParams, session)).rejects.toThrow('Permission Denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            })
        })
    })
    describe('verifyWaterDevice', () => {
        describe('Success', () => {
            test('Ok with dma history', async () => {
                const mockParams = mock.mockReqParamsGetConfigDevices();

                jest.spyOn(sqldb.DMAS_HIST, 'getDmaHist').mockResolvedValue(mock.mockGetDmaHist());
                jest.spyOn(sqldb.LAAGER_HIST, 'getLaagerHist').mockResolvedValue([]);
                jest.spyOn(sqldb.LAAGER, 'getLaagerByUnit').mockResolvedValue(null);
                jest.spyOn(sqldb.DMAS_DEVICES, 'getDmaInfoByUnit').mockResolvedValue(mock.mockGetDmaByUnit());
                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(mockDmaGetBasicInfo());
                
                const response = await devInfo.verifyWaterDevice(mockParams.UNIT_ID, mockParams.DAY);
                expect(response.dma_device).toBeDefined();
            });
            test('Ok with laager history', async () => {
                const mockParams = mock.mockReqParamsGetConfigDevices();

                jest.spyOn(sqldb.DMAS_HIST, 'getDmaHist').mockResolvedValue([]);
                jest.spyOn(sqldb.LAAGER_HIST, 'getLaagerHist').mockResolvedValue(mock.mockGetLaagerHist());
                // jest.spyOn(sqldb.LAAGER, 'getLaagerByUnit').mockResolvedValue(mock.mockGetLaagerByUnit());
                jest.spyOn(sqldb.DMAS_DEVICES, 'getDmaInfoByUnit').mockResolvedValue(null);
                
                const response = await devInfo.verifyWaterDevice(mockParams.UNIT_ID, mockParams.DAY);
                expect(response.laager_device).toBeDefined();
            });
            test('Ok with DMA as current device and no history', async () => {
                const mockParams = mock.mockReqParamsGetConfigDevices();

                jest.spyOn(sqldb.DMAS_HIST, 'getDmaHist').mockResolvedValue([]);
                jest.spyOn(sqldb.LAAGER_HIST, 'getLaagerHist').mockResolvedValue([]);
                jest.spyOn(sqldb.LAAGER, 'getLaagerByUnit').mockResolvedValue(null);
                jest.spyOn(sqldb.DMAS_DEVICES, 'getDmaInfoByUnit').mockResolvedValue(mock.mockGetDmaByUnit());
                
                const response = await devInfo.verifyWaterDevice(mockParams.UNIT_ID, mockParams.DAY);
                expect(response.dma_device).toBeDefined();
            });
            test('Ok with Laager as current device and no history', async () => {
                const mockParams = mock.mockReqParamsGetConfigDevices();

                jest.spyOn(sqldb.DMAS_HIST, 'getDmaHist').mockResolvedValue([]);
                jest.spyOn(sqldb.LAAGER_HIST, 'getLaagerHist').mockResolvedValue([]);
                // jest.spyOn(sqldb.LAAGER, 'getLaagerByUnit').mockResolvedValue(mock.mockGetLaagerByUnit());
                jest.spyOn(sqldb.DMAS_DEVICES, 'getDmaInfoByUnit').mockResolvedValue(null);
                
                const response = await devInfo.verifyWaterDevice(mockParams.UNIT_ID, mockParams.DAY);
                expect(response.laager_device).toBeDefined();
            });
            test ('Ok with multiple history, getting the most recent of the day', async () => {
                const mockParams = mock.mockReqParamsGetConfigDevices();

                jest.spyOn(sqldb.DMAS_HIST, 'getDmaHist').mockResolvedValue(mock.mockGetDmaHist());
                jest.spyOn(sqldb.LAAGER_HIST, 'getLaagerHist').mockResolvedValue(mock.mockGetLaagerHist());
                // jest.spyOn(sqldb.LAAGER, 'getLaagerByUnit').mockResolvedValue(mock.mockGetLaagerByUnit());
                jest.spyOn(sqldb.DMAS_DEVICES, 'getDmaInfoByUnit').mockResolvedValue(mock.mockGetDmaByUnit());
                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(mockDmaGetBasicInfo());
                
                const response = await devInfo.verifyWaterDevice(mockParams.UNIT_ID, mockParams.DAY);
                expect(response).toBeDefined()
            });
        });
    });
    describe('dev/get-health-power-data', () => {
        describe('Success', () => {
            test('/dev/get-health-power-data', async () => {
                const session = factoriesLogin.generateSessionReal();
                jest.spyOn(permissionControl, "getAllowedUnitsView").mockResolvedValue({
                    clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
                    unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
                });
                jest.spyOn(permissionControl, "canSeeDevicesWithoutProductionUnit").mockResolvedValue(faker.datatype.boolean());
                jest.spyOn(sqldb.CLIENTS, "getManufacturers").mockResolvedValue(faker.helpers.multiple(() => ({
                    CLIENT_ID: faker.number.int(),
                    CNPJ: faker.string.alphanumeric(),
                    PERMS_C: faker.string.alphanumeric(),
                    PHONE: faker.phone.number(),    
                })));

                const reqParams: Parameters<typeof httpRouter.privateRoutes['/dev/get-health-power-data']>[0] = {
                    clientIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
                    stateIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.state())),
                    cityIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.location.city())),
                    unitIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
                    groupIds: faker.helpers.maybe(() => faker.helpers.multiple(() => faker.number.int())),
                    SKIP: faker.helpers.maybe(() => faker.number.int()),
                    LIMIT: faker.helpers.maybe(() => faker.number.int()),
                };
                
                jest.spyOn(sqldb.DEVICES, "getDevicesMachineHealthPower").mockResolvedValue({
                    totalItems: faker.number.int(),
                    rows: faker.helpers.multiple(() => ({
                        STATE_NAME: faker.location.state(),
                        CITY_NAME: faker.location.city(),
                        CLIENT: faker.company.name(),
                        CLIENT_ID: faker.number.int(),
                        DEV_ID: faker.string.alphanumeric(),
                        UNIT: faker.string.alphanumeric(),
                        UNIT_ID: faker.number.int(),
                        MACHINE_ID: faker.number.int(),
                        H_INDEX: faker.helpers.arrayElement([0, 1, 2, 3, 4, 25, 50, 75, 100, faker.number.int()]),
                        H_DATE: faker.date.recent().toISOString(),
                        MACHINE_KW: faker.number.float(),
                        ASSET_CAPACITY_POWER: faker.number.float(),
                        ASSET_CAPACITY_UNIT: faker.helpers.arrayElement(["TR", "BTU/hr", "kW", faker.string.alpha()]),
                    }))
                })

                const response = await devInfo.getDevicesHealthPower(reqParams, session);
                expect(response.list).toBeDefined();
                expect(response.totalItems).toBeDefined();
            });
        });
    });
})

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
    return Object.assign(this, { Status: status }, pars || {});
};


import sqldb from '../../../srcCommon/db';
import { faker } from '@faker-js/faker';
import * as factoriesLogin from '../factories/loginFactory';
import * as factoriesDevsSensors from '../factories/devsSensorsFactory';
import * as httpRouter from '../../apiServer/httpRouter';
import '../../crossData/devsSensors';
import * as dacInfo from '../../dacInfo'

beforeEach(() => {
    jest.restoreAllMocks();
})

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
})

describe('Devs Sensors', () => {
    describe('/config/add-pressure-sensor', () => {
        describe('Success', () => {
            test('add-pressure-sensor success', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    SENSOR_NAME: faker.string.alpha()
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSORS, 'w_insert').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());
                
                const result = await httpRouter.privateRoutes['/config/add-pressure-sensor'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('add-pressure-sensor error', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    SENSOR_NAME: faker.string.alpha()
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSORS, 'w_insert').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());

                const result = httpRouter.privateRoutes['/config/add-pressure-sensor'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
            test('add-pressure-sensor duplicate error', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    SENSOR_NAME: faker.string.alpha()
                }

                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSORS, 'w_insert').mockRejectedValue({
                    code: "ER_DUP_ENTRY"
                });
                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());

                const result = httpRouter.privateRoutes['/config/add-pressure-sensor'](reqParams, session);
                expect(result).rejects.toThrow('Sensor already exists');
            })
        })
    })
    describe('/config/delete-pressure-sensor', () => {
        describe('Success', () => {
            test('delete-pressure-sensor success', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha()
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(dacInfo, 'removingSensor').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'w_deleteRow').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_deleteAllSensor').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());

                const result = await httpRouter.privateRoutes['/config/delete-pressure-sensor'](reqParams, session);
                expect(typeof result).toBe('string');
            })
        })
        describe('Error', () => {
            test('delete-pressure-sensor error', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha()
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(dacInfo, 'removingSensor').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'w_deleteRow').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_deleteAllSensor').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());

                const result = httpRouter.privateRoutes['/config/delete-pressure-sensor'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/edit-pressure-sensor', () => {
        describe('Success', () => {
            test('edit-pressure-sensor success', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    SENSOR_NAME: faker.string.alpha()
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSORS, 'w_update').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());
                
                const result = await httpRouter.privateRoutes['/config/edit-pressure-sensor'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('edit-pressure-sensor error', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    SENSOR_NAME: faker.string.alpha()
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSORS, 'w_update').mockImplementation();
                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());

                const result = httpRouter.privateRoutes['/config/edit-pressure-sensor'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/get-pressure-sensors', () => {
        describe('Success', () => {
            test('get-pressure-sensors success', async () => {
                const reqParams = {};
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSORS, 'getList').mockResolvedValue(factoriesDevsSensors.mockGetSensorList());
                
                const result = await httpRouter.privateRoutes['/config/get-pressure-sensors'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('get-pressure-sensors error', async () => {
                const reqParams = {};

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSORS, 'getList').mockResolvedValue(factoriesDevsSensors.mockGetSensorList());
                
                const result = httpRouter.privateRoutes['/config/get-pressure-sensors'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/add-pressure-curve', () => {
        describe('Success', () => {
            test('add-pressure-curve success', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    MIN_FIRMWARE_VERSION: faker.string.alpha(),
                    MULT_QUAD: faker.number.float(),
                    MULT_LIN: faker.number.float(),
                    OFST: faker.number.float(),
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_insert').mockResolvedValue({
                    insertId: faker.number.int(),
                    affectedRows: faker.number.int(),
                });
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetCurveInfo());
                
                const result = await httpRouter.privateRoutes['/config/add-pressure-curve'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('add-pressure-curve error', async () => {
                const reqParams = {
                    SENSOR_ID: faker.string.alpha(),
                    MIN_FIRMWARE_VERSION: faker.string.alpha(),
                    MULT_QUAD: faker.number.float(),
                    MULT_LIN: faker.number.float(),
                    OFST: faker.number.float(),
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSORS, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetSensorInfo());
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_insert').mockImplementation();
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetCurveInfo());

                const result = httpRouter.privateRoutes['/config/add-pressure-curve'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/delete-pressure-curve', () => {
        describe('Success', () => {
            test('delete-pressure-curve success', async () => {
                const reqParams = {
                    CURVE_ID: faker.number.int({ min: 0 }),
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_delete').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());
                
                const result = await httpRouter.privateRoutes['/config/delete-pressure-curve'](reqParams, session);
                expect(typeof result).toBe('string');
            })
        })
        describe('Error', () => {
            test('delete-pressure-curve error', async () => {
                const reqParams = {
                    CURVE_ID: faker.number.int({ min: 0 }),
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_delete').mockResolvedValue(factoriesDevsSensors.mockWDeleteRow());

                const result = httpRouter.privateRoutes['/config/delete-pressure-curve'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/edit-pressure-curve', () => {
        describe('Success', () => {
            test('edit-pressure-curve success', async () => {
                const reqParams = {
                    ID: faker.number.int(),
                    SENSOR_ID: faker.helpers.maybe(() => faker.string.alpha()),
                    MIN_FIRMWARE_VERSION: faker.helpers.maybe(() => faker.string.alpha()),
                    MULT_QUAD: faker.helpers.maybe(() => faker.number.float()),
                    MULT_LIN: faker.helpers.maybe(() => faker.number.float()),
                    OFST: faker.helpers.maybe(() => faker.number.float()),
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_update').mockImplementation();
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetCurveInfo());
                
                const result = await httpRouter.privateRoutes['/config/edit-pressure-curve'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('edit-pressure-curve error', async () => {
                const reqParams = {
                    ID: faker.number.int(),
                    SENSOR_ID: faker.helpers.maybe(() => faker.string.alpha()),
                    MIN_FIRMWARE_VERSION: faker.helpers.maybe(() => faker.string.alpha()),
                    MULT_QUAD: faker.helpers.maybe(() => faker.number.float()),
                    MULT_LIN: faker.helpers.maybe(() => faker.number.float()),
                    OFST: faker.helpers.maybe(() => faker.number.float()),
                }

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'w_update').mockImplementation();
                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getInfo').mockResolvedValue(factoriesDevsSensors.mockGetCurveInfo());

                const result = httpRouter.privateRoutes['/config/edit-pressure-curve'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
    describe('/config/get-pressure-curves', () => {
        describe('Success', () => {
            test('get-pressure-sensors success', async () => {
                const reqParams = {};
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getList').mockResolvedValue(factoriesDevsSensors.mockGetCurveList());
                
                const result = await httpRouter.privateRoutes['/config/get-pressure-curves'](reqParams, session);
                expect(typeof result).toBe('object');
            })
        })
        describe('Error', () => {
            test('get-pressure-curves error', async () => {
                const reqParams = {};

                const session = factoriesLogin.generateSessionNoPermissions();

                jest.spyOn(sqldb.SENSOR_FIRMWARE_CURVES, 'getList').mockResolvedValue(factoriesDevsSensors.mockGetCurveList());
                
                const result = httpRouter.privateRoutes['/config/get-pressure-curves'](reqParams, session);
                expect(result).rejects.toThrow('Permission denied!');
            })
        })
    })
})
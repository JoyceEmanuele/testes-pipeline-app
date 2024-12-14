(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
    return Object.assign(this, { Status: status }, pars || {});
};

import sqldb from '../../../srcCommon/db';
import * as httpRouter from '../../apiServer/httpRouter';
import { faker } from '@faker-js/faker';
import * as factoriesLogin from '../factories/loginFactory';
import * as mock from '../factories/timezoneFactory';
import * as timezones from '../../crossData/timezones';
import * as timezonesHelper from '../../../srcCommon/helpers/timezones';
import { mockRealtimeCalls } from '../dutInfo.test';

beforeEach(() => {
    jest.restoreAllMocks();
})

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
})

describe('Timezone', () => {
    describe('get-timezones-list', () => {
        describe('Success', () => {
            test('get-timezones-list success', async () => {
                const reqParams = {}
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.TIME_ZONES, 'selectTimeZones').mockResolvedValue([]);
                
                const result = await httpRouter.privateRoutes['/get-timezones-list'](reqParams, session);
                expect(result.list).toBeInstanceOf(Array);
            });
        });
    })
    describe('get-timezones-list-with-offset', () => {
        describe('Success', () => {
            test('get-timezones-list-with-offset success', async () => {
                const reqParams = {}
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.TIME_ZONES, 'selectTimeZonesWithOffset').mockResolvedValue([]);
                
                const result = await httpRouter.privateRoutes['/get-timezones-list-with-offset'](reqParams, session);
                expect(result.list).toBeInstanceOf(Array);
            });
        });
    })

    describe('getOffsetTimezone', () => {
        describe('Success', () => {
            test('getOffsetTimezone Success', () => {
                let reqParams = { TIMEZONE_ID: Number(faker.string.numeric({ exclude: ['0'] })) }
                
                const data = mock.mockTimezoneInfo(reqParams.TIMEZONE_ID);
                
                const result = timezonesHelper.getOffsetTimezone({ TIMEZONE_ID: reqParams.TIMEZONE_ID, TIMEZONE_AREA: data.TIMEZONE_AREA, TIMEZONE_OFFSET: data.TIMEZONE_OFFSET })
                expect(typeof result).toBe('number');             
            })
        })
    })

    describe('/get-timezone-offset-by-devId', () => {
        describe('Success', () => {
            test('get-timezone-offset-by-devId success', async () => {
                const reqParams = { devId: faker.string.alphanumeric({ length: 10 }) }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DEVICES, 'getTimezoneInfoByDev').mockResolvedValue(mock.mockTimezoneInfo());
                jest.spyOn(timezonesHelper, 'getOffsetTimezone').mockImplementation((): any => mock.mockOffsetInfo());
                
                const result = await timezones.getTimezoneOffsetByDevId(reqParams, session);
                expect(typeof result).toBe('number');
            });
        });
        describe('Error', () => {
            test('get-timezone-offset-by-devId forgot devId', async () => {
                let reqParams = { devId: faker.string.alphanumeric({ length: 10 }) }
                const session = factoriesLogin.generateSessionReal();
                reqParams.devId = <any>null;

                await expect(timezones.getTimezoneOffsetByDevId(reqParams, session)).rejects.toThrowError('INVALID DATA, missing devId');
            });
        });

    })
    describe('/timezone/set-posix', () => {
        describe('Success', () => {
            test('get-timezone-offset-by-devId success', async () => {
                const reqParams = {
                    dateInitial: faker.string.alphanumeric(),
                    dateFinal: faker.string.alphanumeric(),
                    hourInitial: faker.string.alphanumeric(),
                    hourFinal: faker.string.alphanumeric(),
                    areas: [Number(faker.string.numeric({ exclude: ['0'] }))],
                }
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.TIME_ZONES, 'getTimezoneAllInfo').mockResolvedValue(mock.mockAllinfo());
                jest.spyOn(sqldb.TIME_ZONES, 'setPosixTimezone').mockResolvedValue({
                    affectedRows: Number(faker.string.numeric({ exclude: ['0'] })),
                    insertId: Number(faker.string.numeric({ exclude: ['0'] }))
                })
                jest.spyOn(timezonesHelper, 'sendCommandToDeviceWithConfigTimezone').mockResolvedValue();
                jest.spyOn(sqldb.CLUNITS, 'getListDevicesUnitsWithTimezone').mockResolvedValue([{ DEVICE_CODE: faker.string.alphanumeric() }])
                mockRealtimeCalls();
                const result = await timezones.setPosixRoute(reqParams, session);
                expect(result).toBe("OK");
            });
        });
        describe('Error', () => {
            test('Permission Denied', async () => {
                const reqParams = {
                    dateInitial: faker.string.alphanumeric(),
                    dateFinal: faker.string.alphanumeric(),
                    hourInitial: faker.string.alphanumeric(),
                    hourFinal: faker.string.alphanumeric(),
                    areas: [Number(faker.string.numeric({ exclude: ['0'] }))],
                }
                const session = factoriesLogin.generateSessionNoPermissions();
                await expect(timezones.setPosixRoute(reqParams, session)).rejects.toThrow('Permission denied!')
                .catch((error) => {
                    expect(error.httpStatus).toBe('403');
                });
            });
            test('Missing params', async () => {
                const reqParamsFalse: any = {
                    dateFinal: faker.string.alphanumeric(),
                    hourInitial: faker.string.alphanumeric(),
                    hourFinal: faker.string.alphanumeric(),
                }
                const session = factoriesLogin.generateSessionReal();
                await expect(timezones.setPosixRoute(reqParamsFalse, session)).rejects.toThrow('Missing params')
                .catch((error) => {
                    expect(error.httpStatus).toBe('400');
                });
            });
        });

    })
})

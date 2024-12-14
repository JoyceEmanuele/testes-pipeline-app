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

import sqldb from "../../../../srcCommon/db";
import * as laagerFactories from "../../factories/laagerHistFactory";
import * as laagerHist from "../../../telemHistory/laagerHist";
import { generateSessionReal } from "../../factories/loginFactory";
import * as permissionControl from "../../../../srcCommon/helpers/permissionControl";
import * as dates from "../../../../srcCommon/helpers/dates";
import * as waterHelpers from "../../../../srcCommon/helpers/waterData";
import * as laagerApi from "../../../../srcCommon/extServices/laagerApi"
import axios from "axios";

beforeEach(() => {
    jest.restoreAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
});

describe('LaagerHist', () => {
    describe('getLaagerForecastUsage', () => {
        describe('Ok', () => {
            test('Ok', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(laagerFactories.mockGetLaagerForecastUsage()));

                const response = await laagerHist.getLaagerForecastUsage(reqParams, session);

                expect(response).toBeDefined();
                expect(response).not.toEqual(null);
            })
        });
        describe('Error', () => {
            test('Missing LAAGER_CODE', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();
                reqParams.LAAGER_CODE = <any>null;

                await laagerHist.getLaagerForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid parameters! Missing LAAGER_CODE');
                });
            });
            test('Could not find LAAGER information', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(null);

                await laagerHist.getLaagerForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Could not find LAAGER information');
                });
            });
            test('Could not find UNIT information', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();

                const laagerInfo = laagerFactories.mockLaagerGetSimpleInfo();
                laagerInfo.UNIT_ID = <any>null;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerInfo);

                await laagerHist.getLaagerForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Could not find UNIT information');
                });
            });
            test('Installation date from LAAGER not was informed', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();

                const laagerInfo = laagerFactories.mockLaagerGetSimpleInfo();
                laagerInfo.INSTALLATION_DATE = <any>null;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerInfo);

                await laagerHist.getLaagerForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Installation date from LAAGER device not was informed');
                });
            });
            test('Permission denied!', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await laagerHist.getLaagerForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                });
            });
        });
    });
    describe('getLaagerConsumptionHistoryInActualDay', () => {
        describe('Ok', () => {
            test('Ok without data', async () => {
                const params = laagerFactories.mockParamsGetLaagerConsumptionHistoryInActualDay();
                
                jest.spyOn(laagerApi.apiLaarger, 'GET /leitura/:meter_type/:group_id').mockImplementation((): any => laagerFactories.mockGetCustomer(params.device_code));
                jest.spyOn(laagerApi.apiLaarger, 'GET /consumption/meter_details/:unit_id').mockImplementation((): any => []);
                jest.spyOn(laagerApi, 'normalizeLaagerConsumption').mockImplementation();
                const result = await laagerHist.getLaagerConsumptionHistoryInActualDay(params.history, params.day, params.device_code, params.hour_graphic, params.periodInfoAux);
                
                expect(result.history).toEqual(params.history);
            });
            test('Ok', async () => {
                const params = laagerFactories.mockParamsGetLaagerConsumptionHistoryInActualDay();

                jest.spyOn(laagerApi.apiLaarger, 'GET /leitura/:meter_type/:group_id').mockImplementation((): any => laagerFactories.mockGetCustomer(params.device_code));
                jest.spyOn(laagerApi.apiLaarger, 'GET /consumption/meter_details/:unit_id').mockImplementation((): any => laagerFactories.mockHistoryApiLaager(params.day, params.hour_graphic));


                const result = await laagerHist.getLaagerConsumptionHistoryInActualDay(params.history, params.day, params.device_code, params.hour_graphic, params.periodInfoAux);
                expect(result.history).not.toHaveLength(0);
            });
        });
        describe('Error', () => {
            test('Water meter not found', async () => {
                const params = laagerFactories.mockParamsGetLaagerConsumptionHistoryInActualDay();
                
                jest.spyOn(laagerApi.apiLaarger, 'GET /leitura/:meter_type/:group_id').mockImplementation((): any => []);
                
                await await laagerHist.getLaagerConsumptionHistoryInActualDay(params.history, params.day, params.device_code, params.hour_graphic, params.periodInfoAux).catch((err) => {
                    expect(err.message).toBe('Water meter not found');
                });
            });
        });
    });
    describe('getLaagerConsumptionHistory', () => {
        describe('Ok', () => {
            test('OK withou unit', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                const laagerInfo = laagerFactories.mockLaagerGetSimpleInfo();
                laagerInfo.UNIT_ID = <any>null;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerInfo);

                const response = await laagerHist.getLaagerConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).toHaveLength(0);
            });
            test('OK with CDS data only', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(laagerFactories.mockGetLaagerConsumptionFromComputedDataService()));
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => laagerFactories.mockHistory());

                const response = await laagerHist.getLaagerConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
            });
            test('OK with CDS data per day', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({ lessOneDay: true });
                const session = generateSessionReal();
                reqParams.END_DATE = reqParams.START_DATE;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(laagerFactories.mockGetLaagerConsumptionFromComputedDataService()));
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => laagerFactories.mockHistory());

                const response = await laagerHist.getLaagerConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
            });
            test('OK with rusthist data only', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({ actualDay: true });
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(laagerHist, 'getLaagerConsumptionHistoryInActualDay').mockImplementation((): any => laagerFactories.mockLaagerConsumption());
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => laagerFactories.mockHistory());
                jest.spyOn(axios, 'post').mockImplementationOnce((): any => Promise.resolve(laagerFactories.mockGetLaagerConsumptionFromComputedDataService()))
                const response = await laagerHist.getLaagerConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
            });
        });
        describe('Error', () => {
            test('Missing DEVICE_CODE', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                reqParams.LAAGER_CODE = <any>null;

                await laagerHist.getLaagerConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing LAAGER_CODE');
                });
            });
            test('Missing Dates', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                reqParams.START_DATE = <any>null;
                reqParams.END_DATE = <any>null;
                reqParams.LAST_START_DATE = <any>null;
                reqParams.LAST_END_DATE = <any>null;

                await laagerHist.getLaagerConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing Dates');
                });
            });
            test('Could not find LAAGER information', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(null);

                await laagerHist.getLaagerConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Laager device not found');
                });
            });

            test('Permission Denied', async () => {
                const reqParams = laagerFactories.mockParamsGetLaagerConsumptionHistory({});
                const session = generateSessionReal();

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(laagerFactories.mockLaagerGetSimpleInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await laagerHist.getLaagerConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                });
            });

        });
    });
})

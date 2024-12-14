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
import * as dielServices from '../../../../srcCommon/dielServices'
import * as dmaFactories from "../../factories/dmaHistFactory";
import * as dmaHist from "../../../telemHistory/dmaHist";
import { generateSessionReal } from "../../factories/loginFactory";
import * as permissionControl from "../../../../srcCommon/helpers/permissionControl";
import axios from "axios";
import * as dates from '../../../../srcCommon/helpers/dates';
import * as waterHelpers from '../../../../srcCommon/helpers/waterData';

beforeEach(() => {
    jest.restoreAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
});

describe('DmaHist', () => {
    describe('getDmaForecastUsage', () => {
        describe('Ok', () => {
            test('Ok', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(dmaFactories.mockGetDmaForecastUsage()));

                const response = await dmaHist.getDmaForecastUsage(reqParams, session);

                expect(response).toBeDefined();
                expect(response).not.toEqual(null);
            })
        });
        describe('Error', () => {
            test('Missing DEVICE_CODE', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();
                reqParams.DEVICE_CODE = <any>null;

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties! Missing DEVICE_CODE');
                });
            });
            test('Could not find DMA information', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(null);

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Could not find DMA information');
                });
            });
            test('Could not find UNIT information', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                const dmaInfo = dmaFactories.mockDmaGetBasicInfo();
                dmaInfo.UNIT_ID = <any>null;

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaInfo);

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Could not find UNIT information');
                });
            });
            test('Hydrometer model from DMA not was informed', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                const dmaInfo = dmaFactories.mockDmaGetBasicInfo();
                dmaInfo.HYDROMETER_MODEL = <any>null;

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaInfo);

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Hydrometer model from DMA not was informed');
                });
            });
            test('Installation date from DMA not was informed', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                const dmaInfo = dmaFactories.mockDmaGetBasicInfo();
                dmaInfo.INSTALLATION_DATE = <any>null;

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaInfo);

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Installation date from DMA not was informed');
                });
            });
            test('Permission denied!', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaForecastUsage();
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await dmaHist.getDmaForecastUsage(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                });
            });
        });
    });
    describe('getDmaConsumptionHistory', () => {
        describe('Ok', () => {
            test('OK withou unit', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                const dmaInfo = dmaFactories.mockDmaGetBasicInfo();
                dmaInfo.UNIT_ID = <any>null;

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaInfo);

                const response = await dmaHist.getDmaConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).toHaveLength(0);
            });

            test('OK with CDS data only', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({ lessOneDay: true });
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(dmaFactories.mockGetDmaConsumptionFromComputedDataService()));
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => dmaFactories.mockHistory());
                jest.spyOn(dielServices, 'apiAsyncInternalApi').mockImplementationOnce((): any => null);

                const response = await dmaHist.getDmaConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
            });
            test('OK with CDS data per day', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({ lessOneDay: true });
                const session = generateSessionReal();
                reqParams.END_DATE = reqParams.START_DATE;

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(dmaFactories.mockGetDmaConsumptionFromComputedDataService()));
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => dmaFactories.mockHistory());

                const response = await dmaHist.getDmaConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
            });
            test('OK with rusthist data only', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({ actualDay: true });
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: true }));
                jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
                jest.spyOn(dmaHist, 'getDmaConsumptionHistoryInActualDay').mockImplementation((): any => dmaFactories.mockDmaConsumption());
                jest.spyOn(waterHelpers, 'verifyEmptyWaterConsumptionHist').mockImplementation((): any => dmaFactories.mockHistory());
                jest.spyOn(dielServices, 'apiAsyncInternalApi').mockImplementation((): any => null);
                jest.spyOn(axios, 'post').mockImplementationOnce((): any => Promise.resolve(dmaFactories.mockGetDmaConsumptionFromComputedDataService()))
                const response = await dmaHist.getDmaConsumptionHistory(reqParams, session);
                expect(response).toBeDefined();
                expect(response.history).not.toHaveLength(0);
               });
        });
        describe('Error', () => {
            test('Missing DEVICE_CODE', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                reqParams.DEVICE_CODE = <any>null;

                await dmaHist.getDmaConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing DEVICE_CODE');
                });
            });
            test('Missing Dates', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                reqParams.START_DATE = <any>null;
                reqParams.END_DATE = <any>null;

                await dmaHist.getDmaConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Invalid properties. Missing Dates');
                });
            });
            test('Could not find DMA information', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(null);

                await dmaHist.getDmaConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('DMA device not found.');
                });
            });

            test('Not found the number of liters by pulse', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                const dmaInfo = dmaFactories.mockDmaGetBasicInfo();
                dmaInfo.HYDROMETER_MODEL = '';

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaInfo);

                await dmaHist.getDmaConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Not found the number of liters by pulse');
                });
            });

            test('Permission Denied', async () => {
                const reqParams = dmaFactories.mockParamsGetDmaConsumptionHistory({});
                const session = generateSessionReal();

                jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(dmaFactories.mockDmaGetBasicInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementationOnce((): any => ({ canViewDevs: false }));

                await dmaHist.getDmaConsumptionHistory(reqParams, session).catch((err) => {
                    expect(err.message).toBe('Permission denied!');
                });
            });

        });
    });
    describe('getDmaConsumptionHistoryInActualDay', () => {
        describe('Ok', () => {
            test('Ok without data', async () => {
                const params = dmaFactories.mockParamsGetDmaConsumptionHistoryInActualDay();
                
                jest.spyOn(dielServices, 'apiAsyncInternalApi').mockImplementation((): any => null);
                
                const result = await dmaHist.getDmaConsumptionHistoryInActualDay(params.history, { day: params.day, device_code: params.device_code, hourGraphic: params.hour_graphic, litersPerPulse: params.litersPerPulse, unitId: params.unitId, userId: params.userId },params.periodInfoAux);
                
                expect(result.history).toEqual(params.history);
            });
            test('Ok', async () => {
                const params = dmaFactories.mockParamsGetDmaConsumptionHistoryInActualDay();

                jest.spyOn(dielServices, 'apiAsyncInternalApi').mockImplementation((): any => dmaFactories.mockCompDma());
                
                const result = await dmaHist.getDmaConsumptionHistoryInActualDay(params.history, { day: params.day, device_code: params.device_code, hourGraphic: params.hour_graphic, litersPerPulse: params.litersPerPulse, unitId: params.unitId, userId: params.userId },params.periodInfoAux);
                console.log(result.history.length);
                console.log(params.history.length);
                expect(result.history).not.toHaveLength(0);
            });
        });
    });
})

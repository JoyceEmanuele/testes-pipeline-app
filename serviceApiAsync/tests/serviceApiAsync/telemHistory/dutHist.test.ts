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


import { faker } from "@faker-js/faker"
import servConfig from "../../../../configfile";
import sqldb from "../../../../srcCommon/db";
import { generateDevExtraInfo } from "../../factories/devicesFactory"
import rusthistApi from '../../../../srcCommon/dielServices/rusthistApi'
import * as permissionControl from '../../../../srcCommon/helpers/permissionControl'
import * as factoriesLogin from "../../../tests/factories/loginFactory";
import { verifyClient_classicLogin } from '../../../../srcCommon/helpers/auth';
import * as dielServices from "../../../../srcCommon/dielServices";
import * as mockDutHist from "../../factories/dutHistFactory";
import * as dutHist from "../../../../serviceApiAsync/telemHistory/dutHist";
import * as devInfo from "../../../../srcCommon/helpers/devInfo";
import * as dut from "../../../../serviceApiAsync/dayCompilers/dut";
import * as chartData from "../../../../srcCommon/helpers/chartDataFormats";
import * as dacHist from "../../../../serviceApiAsync/telemHistory/dacHist";
import { generateUnitClient } from "../../factories/baselineValuesFactory";
import * as devsLastComm from "../../../../srcCommon/helpers/devsLastComm";

beforeEach(() => {
    jest.restoreAllMocks();

    servConfig.prodApiForwarder.user = ""; // não quero testar o caminho de forward para prod.

});

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
});

describe("dutHist", () => {
    describe("getDayChartsData", () => {
        describe("Success", () => {
            test("getDayChartsData success", async () => {
                const devId = faker.string.alpha(12);
                const reqParams = {
                    day: faker.date.recent().toISOString().substring(0, 10),
                    devId: devId,
                    selectedParams: ["Temperature", "Temperature_1", "L1"]
                };
                const queryData = { token: faker.string.alphanumeric({ length: 10 }) };

                jest
                    .spyOn(dielServices, "authInternalApi")
                    .mockImplementationOnce((): any =>
                        Promise.resolve(
                            factoriesLogin.generateSession({ token: queryData.token })
                        )
                    );
                let session = await verifyClient_classicLogin(queryData);

                jest.spyOn(sqldb.ROOMTYPES, "getRoomTypeInfo").mockResolvedValueOnce({
                    TUSEMAX: faker.number.float(),
                    TUSEMIN: faker.number.float(),
                    USEPERIOD: '{"version":"v4","week":{"mon":{"permission":"allow","start":"00:00","end":"23:59"},"tue":{"permission":"allow","start":"00:00","end":"23:59"},"wed":{"permission":"allow","start":"00:00","end":"23:59"},"thu":{"permission":"allow","start":"00:00","end":"23:59"},"fri":{"permission":"allow","start":"00:00","end":"23:59"},"sat":{"permission":"allow","start":"00:00","end":"23:59"},"sun":{"permission":"allow","start":"00:00","end":"23:59"}}}'
                } as Awaited<ReturnType<typeof sqldb.ROOMTYPES.getRoomTypeInfo>>)

                jest
                    .spyOn(permissionControl, "getPermissionsOnUnit")
                    .mockImplementationOnce((): any =>
                        Promise.resolve({ canViewDevs: true })
                    );


                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValueOnce(mockDutHist.mockGetFreshDevInfo());

                jest.spyOn(sqldb.DUTS, "getDevExtraInfo").mockImplementationOnce((): any => Promise.resolve(mockDutHist.mockGetDevExtraInfo(devId)));

                jest.spyOn(sqldb.cache_cond_tel, "getItem").mockResolvedValueOnce(mockDutHist.getItemCacheCondTel(devId));

                jest.spyOn(sqldb.cache_cond_tel, 'w_insertUpdate').mockResolvedValueOnce({
                    affectedRows: 1,
                    insertId: faker.number.int(),
                })

                jest.spyOn(permissionControl, 'getPermissionsOnUnit')
                    .mockResolvedValueOnce({
                        canViewDevs: true,
                        canChangeDeviceOperation: false,
                        canManageDevs: false,
                        canViewObservations: false,
                        canManageObservations: false,
                        canManageSketches: true,
                        canEditProgramming: true,
                    })

                jest.spyOn(rusthistApi, '/comp-dut').mockResolvedValueOnce(mockDutHist.getCompDut()).mockName("/comp-dut");

                const tz = {
                    TIMEZONE_ID: faker.number.int(),
                    TIMEZONE_AREA: faker.location.timeZone(),
                    TIMEZONE_OFFSET: faker.number.int({ min: -12, max: 12 })
                };

                jest.spyOn(sqldb.DEVICES, "getTimezoneInfoByDev").mockResolvedValueOnce(tz)

                jest.spyOn(sqldb.CLUNITS, "getTimezoneByUnit")
                    .mockResolvedValueOnce(tz)
                    .mockResolvedValueOnce(tz)

                jest.spyOn(sqldb.DUTS_SPOTS_HISTORY, 'getDevsToTelemetry').mockResolvedValueOnce(mockDutHist.getDevsToTelemetry(devId));

                jest.spyOn(sqldb.DUTS, "getDevExtraInfo").mockResolvedValueOnce({
                    BT_ID: faker.string.alphanumeric(),
                    CITY_NAME: faker.location.city(),
                    CITY_ID: faker.location.city(),
                    DAT_BEGMON: faker.date.recent().toISOString(),
                    CLIENT_ID: faker.number.int(),
                    ENVIRONMENT_ID: faker.number.int(),
                    DUT_DEVICE_ID: faker.number.int(),
                    DUT_DUO_ID: faker.number.int(),
                    DUT_REFERENCE_ID: faker.number.int(),
                    ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
                    RTYPE_ID: faker.number.int(),
                    LAT: String(faker.location.latitude()),
                    LON: String(faker.location.longitude()),
                    UNIT_ID: faker.number.int(),
                    UNIT_NAME: faker.string.alpha(),
                    ROOM_ID: faker.number.int(),
                    STATE_ID: faker.location.state(),
                    MACHINE_APPLICATION: faker.string.alpha(),
                    MACHINE_REFERENCE: faker.number.int(),
                    PLACEMENT: faker.helpers.arrayElement(['AMB', 'DUO', 'INS']),
                    ROOM_NAME: faker.string.alpha(),
                    RTYPE_NAME: faker.string.alpha(),
                    SENSOR_AUTOM: faker.number.int(),
                    TEMPERATURE_OFFSET: faker.number.int(),
                    TUSEMAX: faker.number.int(),
                    TUSEMIN: faker.number.int(),
                    USEPERIOD: faker.string.alphanumeric(),
                    VARS: faker.string.alpha(),
                    DEV_ID: faker.string.alpha(),
                });

                const ret = await dutHist.getDayChartsData(reqParams, session);

                expect(ret).toHaveProperty('L1');
                expect(ret).toHaveProperty('Temperature');
                expect(ret).toHaveProperty('Temperature_1');
            })
        });
        describe("Error", () => {
            test("processDutDay bad day", async () => {
                const devId = faker.string.alphanumeric();
                const reqParams = {
                    day: faker.string.alphanumeric(),
                    devId: devId,
                    selectedParams: ["Temperature", "Temperature_1", "L1"]
                };
                const queryData = { token: faker.string.alphanumeric({ length: 10 }) };

                jest
                    .spyOn(dielServices, "authInternalApi")
                    .mockImplementationOnce((): any =>
                        Promise.resolve(
                            factoriesLogin.generateSession({ token: queryData.token })
                        )
                    );
                let session = await verifyClient_classicLogin(queryData);


                expect.assertions(1);

                try {
                    await dutHist.getDayChartsData(reqParams, session);
                }
                catch (e) {
                    expect(e).toHaveProperty('message', 'Invalid day');
                }
            });
        });
    });
    describe("getDutDuoUsagePerDay", () => {
        describe("Success", () => {
            test('isTemporaryId', async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => true);

                const response = await dutHist.getDutDuoUsagePerDay(reqParams, session);
                expect(response.list).toBeDefined();
                expect(response.list).toBeInstanceOf(Array);
                expect(response.list).toHaveLength(0);
            });
            test('Ok', async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => false);
                jest.spyOn(dutHist, "getDailyUsage").mockResolvedValue(mockDutHist.getDailyUsage());

                const response = await dutHist.getDutDuoUsagePerDay(reqParams, session);
                expect(response.list).toBeDefined();
                expect(response.list).toBeInstanceOf(Array);
                expect(response.list).not.toHaveLength(0);
            });
        });
        describe("Error", () => {
            test("Invalid Day", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();
                reqParams.datIni = <any>null;

                await expect(dutHist.getDutDuoUsagePerDay(reqParams, session)).rejects.toThrow('Invalid day')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing dutId", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();
                reqParams.dutId = <any>null;

                await expect(dutHist.getDutDuoUsagePerDay(reqParams, session)).rejects.toThrow('Invalid parameters! Missing dutId')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Dut not found", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(null);

                await expect(dutHist.getDutDuoUsagePerDay(reqParams, session)).rejects.toThrow('DUT não encontrado')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Permission Denied", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));

                await expect(dutHist.getDutDuoUsagePerDay(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
            test("Missing numDays", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerDay();
                const session = factoriesLogin.generateSessionReal();
                reqParams.numDays = <any>null;

                await expect(dutHist.getDutDuoUsagePerDay(reqParams, session)).rejects.toThrow('Invalid parameters! Missing numDays')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
        });
    });
    describe("getDuoDuoUsagePerMonth", () => {
        describe("Success", () => {
            test('isTemporaryId', async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => true);

                const response = await dutHist.getDutDuoUsagePerMonth(reqParams, session);
                expect(response.list).toBeDefined();
                expect(response.list).toBeInstanceOf(Array);
                expect(response.list).toHaveLength(0);
            });
            test('Ok', async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => false);
                jest.spyOn(dutHist, "getDailyUsage").mockResolvedValue(mockDutHist.getDailyUsage());

                const response = await dutHist.getDutDuoUsagePerMonth(reqParams, session);
                expect(response.list).toBeDefined();
                expect(response.list).toBeInstanceOf(Array);
                expect(response.list).not.toHaveLength(0);
            });
        });
        describe("Error", () => {
            test("Invalid Day", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();
                reqParams.datIni = <any>null;

                await expect(dutHist.getDutDuoUsagePerMonth(reqParams, session)).rejects.toThrow('Invalid date')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing dutId", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();
                reqParams.dutId = <any>null;

                await expect(dutHist.getDutDuoUsagePerMonth(reqParams, session)).rejects.toThrow('Invalid parameters! Missing dutId')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing numMonths", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();
                reqParams.numMonths = <any>null;

                await expect(dutHist.getDutDuoUsagePerMonth(reqParams, session)).rejects.toThrow('Invalid parameters! Missing numMonths')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Dut not found", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(null);

                await expect(dutHist.getDutDuoUsagePerMonth(reqParams, session)).rejects.toThrow('DUT não encontrado')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Permission Denied", async () => {
                const reqParams = mockDutHist.getReqParamsUsagePerMonth();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));

                await expect(dutHist.getDutDuoUsagePerMonth(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
        })
    });
    describe("getDailyUsage", () => {
        describe("Success", () => {
            test("numDays > 370 || numDays <= 0", async () => {
                const params = mockDutHist.getReqParamsUsagePerDay();
                params.numDays = Math.random() < 0.5 ? Math.floor(Math.random() * 370) - 370 : Math.floor(Math.random() * 371) + 370;
                const dutFreshInf = mockDutHist.mockGetFreshDevInfo();
                
                const result = await dutHist.getDailyUsage( params.dutId, params.datIni, params.numDays, dutFreshInf, { motivo: `tests`} );
                expect(result).toBeNull();
            });
            test("Ok", async () => {
                const params = mockDutHist.getReqParamsUsagePerDay();
                const dutFreshInf = mockDutHist.mockGetFreshDevInfo();
                
                jest.spyOn(dut, 'processDutDay').mockImplementation((): any => Promise.resolve(mockDutHist.processDutDay(params.numDays)));

                const result = await dutHist.getDailyUsage(params.dutId, params.datIni, params.numDays, dutFreshInf, { motivo: `tests`} );
                expect(result).toBeInstanceOf(Array);
                expect(result?.length).toBe(params.numDays);
            })
        });
    });
    describe("getDutDuoConsumptionPerDay", () => {
        describe("Success", () => {
            test("Ok", async () => {
                const params = mockDutHist.mockReqParamsGetDutDuoConsumption();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => false);
                jest.spyOn(dut, 'processDutDay').mockImplementation((): any => Promise.resolve(mockDutHist.processDutDay(1)));
                jest.spyOn(chartData, 'parseCompressedChartData').mockImplementation((): any => mockDutHist.mockParseCompressedChartData());
                jest.spyOn(dacHist, 'consumoPorHora').mockImplementation((): any => mockDutHist.mockConsumoPorHora());

                const result = await dutHist.getDutDuoConsumptionPerDay({ dutId: params.dutId, day: params.day }, session);
                expect(result.consumption).toHaveLength(24);
            });
            test("isTemporaryId", async () => {
                const params = mockDutHist.mockReqParamsGetDutDuoConsumption();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(devInfo, "isTemporaryId").mockImplementation((): any => true);

                const result = await dutHist.getDutDuoConsumptionPerDay({ dutId: params.dutId, day: params.day }, session);
                expect(result.consumption).toHaveLength(0);
            });

        });
        describe("Error", () => {
            test("Invalid Day", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoConsumption();
                const session = factoriesLogin.generateSessionReal();
                reqParams.day = <any>null;

                await expect(dutHist.getDutDuoConsumptionPerDay(reqParams, session)).rejects.toThrow('Invalid day')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing dutId", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoConsumption();
                const session = factoriesLogin.generateSessionReal();
                reqParams.dutId = <any>null;

                await expect(dutHist.getDutDuoConsumptionPerDay(reqParams, session)).rejects.toThrow('Invalid parameters! Missing dutId')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Permission Denied", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoConsumption();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.DUTS, "getFreshDevInfo").mockResolvedValue(mockDutHist.mockGetFreshDevInfo());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));

                await expect(dutHist.getDutDuoConsumptionPerDay(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            });
        });
    });
    describe("getDutsDuoEnergyEfficiency", () => {
        describe("Success", () => {
            test("Ok", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();
                
                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue(generateUnitClient());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(sqldb.DUTS, 'getDutsDuoByUnit').mockResolvedValue(mockDutHist.mockGetDutsDuoByUnit());
                jest.spyOn(sqldb.DACS_DEVICES, 'getDacsByUnit').mockResolvedValue(mockDutHist.getDacsByUnit());
                jest.spyOn(dutHist, "getDailyUsage").mockImplementation((): any => Promise.resolve(mockDutHist.getDailyUsage()));
                jest.spyOn(dacHist, "getDailyUsage").mockImplementation((): any => Promise.resolve(mockDutHist.getDailyUsageDac()));
                jest.spyOn(dutHist, "verifyAverageExternalTemperature").mockImplementation(() => mockDutHist.getDailyUsageDac());
                jest.spyOn(devsLastComm, 'loadLastTelemetries').mockImplementation((): any => Promise.resolve(mockDutHist.mockLoadLastDutTelemetry()));
                const result = await dutHist.getDutsDuoEnergyEfficiency(reqParams, session);
                expect(result.list).not.toHaveLength(0);
            });
            test("Ok with no devices", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();
                
                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue(generateUnitClient());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
                jest.spyOn(sqldb.DUTS, 'getDutsDuoByUnit').mockResolvedValue([]);
                
                const result = await dutHist.getDutsDuoEnergyEfficiency(reqParams, session);
                expect(result.list).toHaveLength(0);
            });
        });
        describe("Error", () => {
            test("Missing unitId", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();
                reqParams.unitId = <any>null;

                await expect(dutHist.getDutsDuoEnergyEfficiency(reqParams, session)).rejects.toThrow('Invalid Parameters, missing unitId.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing dateStart", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();
                reqParams.dateStart = <any>null;

                await expect(dutHist.getDutsDuoEnergyEfficiency(reqParams, session)).rejects.toThrow('Invalid Parameters, missing dateStart.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Missing dateEnd", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();
                reqParams.dateEnd = <any>null;

                await expect(dutHist.getDutsDuoEnergyEfficiency(reqParams, session)).rejects.toThrow('Invalid Parameters, missing dateEnd.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            });
            test("Unit not found", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue(null);
                await expect(dutHist.getDutsDuoEnergyEfficiency(reqParams, session)).rejects.toThrow('Unit not found.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });

            });
            test("Permission denied", async () => {
                const reqParams = mockDutHist.mockReqParamsGetDutDuoEnergyEfficiency();
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue(generateUnitClient());
                jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));

                await expect(dutHist.getDutsDuoEnergyEfficiency(reqParams, session)).rejects.toThrow('Permission denied!')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });

            });
        });
    });
    describe("verifyAverageExternalTemperature", () => {
        describe('Success', () => {
            test('OK', async () => {
                const params = mockDutHist.getDailyUsageDac();

                const result = dutHist.verifyAverageExternalTemperature(params);
                expect(result).not.toHaveLength(0);
            })
        })
    });
});

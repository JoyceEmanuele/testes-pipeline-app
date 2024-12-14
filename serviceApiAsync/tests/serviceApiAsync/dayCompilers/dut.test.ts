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
import * as dut from "../../../../serviceApiAsync/dayCompilers/dut"
import servConfig from "../../../../configfile";
import { HistoryTypeDUT } from "../../../../srcCommon/types";
import sqldb from "../../../../srcCommon/db";
import { generateDevExtraInfo } from "../../factories/devicesFactory"
import { generateFullProg } from '../../factories/roomTypeFactory'
import rusthistApi from '../../../../srcCommon/dielServices/rusthistApi'
import * as permissionControl from '../../../../srcCommon/helpers/permissionControl'
import * as mockDutHist from "../../factories/dutHistFactory";

beforeEach(() => {
    jest.clearAllMocks();

    servConfig.prodApiForwarder.user = ""; // não quero testar o caminho de forward para prod.

});

afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
});

describe("DUT Compiler", () => {
    describe("processDutDay", () => {
        describe("Success", () => {
            test("processDutDay success", async () => {
                const devId = faker.string.alphanumeric();
                const reqParams = {
                    day: faker.date.recent().toISOString().substring(0, 10),
                    dutId: devId,
                    motivo: "test",
                    hType: "TelemetryCharts" as HistoryTypeDUT,
                    dutExtInf: { RTYPE_ID: faker.number.int({ min: 1 }) }
                };

                jest.spyOn(sqldb.ROOMTYPES, "getRoomTypeInfo").mockResolvedValueOnce({
                    TUSEMAX: faker.number.float(),
                    TUSEMIN: faker.number.float(),
                    USEPERIOD: '{"version":"v4","week":{"mon":{"permission":"allow","start":"00:00","end":"23:59"},"tue":{"permission":"allow","start":"00:00","end":"23:59"},"wed":{"permission":"allow","start":"00:00","end":"23:59"},"thu":{"permission":"allow","start":"00:00","end":"23:59"},"fri":{"permission":"allow","start":"00:00","end":"23:59"},"sat":{"permission":"allow","start":"00:00","end":"23:59"},"sun":{"permission":"allow","start":"00:00","end":"23:59"}}}'
                } as Awaited<ReturnType<typeof sqldb.ROOMTYPES.getRoomTypeInfo>>)

                const tOffset = faker.number.float();

                jest.spyOn(sqldb.DUTS, "getDevExtraInfo").mockResolvedValueOnce({
                    DUT_DEVICE_ID: faker.number.int(),
                    VARS: faker.string.alpha(),
                    LAT: faker.location.latitude().toString(),
                    LON: faker.location.longitude().toString(),
                    DUT_DUO_ID: faker.number.int(),
                    ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
                    ROOM_ID: faker.number.int(),
                    DUT_REFERENCE_ID: faker.number.int(),
                    MACHINE_REFERENCE: faker.number.int(),
                    MACHINE_APPLICATION: faker.string.alpha(),
                    ...generateDevExtraInfo(devId)
                })

                jest.spyOn(sqldb.cache_cond_tel, "getItem").mockResolvedValueOnce({
                    devId: devId,
                    YMD: faker.date.recent().toDateString(),
                    chartsBas: '{}',
                    chartsDet: '{}',
                    chartsExt: '',
                    temperatureOffset: tOffset,
                    vers: 'dut-1',
                    meantp: '{}',
                    cstats: '{}',
                    hoursOnline: faker.number.float({ min: 0, max: 24 })
                })

                jest.spyOn(permissionControl, 'getPermissionsOnUnit')
                    .mockResolvedValueOnce({
                        canViewDevs: true,
                        canChangeDeviceOperation: false,
                        canManageDevs: false,
                        canViewObservations: true,
                        canManageObservations: true,
                        canManageSketches: true,
                        canEditProgramming: true,
                    })

                jest.spyOn(rusthistApi, '/comp-dut').mockResolvedValueOnce(mockDutHist.getCompDut()).mockName("/comp-dut");

                const tz = {
                    TIMEZONE_ID: faker.number.int(),
                    TIMEZONE_AREA: faker.location.timeZone(),
                    TIMEZONE_OFFSET: faker.number.int({min: -12, max: 12})
                };

                jest.spyOn(sqldb.DEVICES, "getTimezoneInfoByDev").mockResolvedValueOnce(tz)

                jest.spyOn(sqldb.CLUNITS, "getTimezoneByUnit")
                    .mockResolvedValueOnce(tz)

                jest.spyOn(dut, 'loadRtypeSched').mockResolvedValueOnce(generateFullProg());

                jest.spyOn(sqldb.cache_cond_tel, "w_insertUpdate").mockResolvedValueOnce({
                    affectedRows: 1,
                    insertId: faker.number.int(),
                })

                const ret = await dut.processDutDay(reqParams);

                expect(ret).toHaveProperty('L1');
                expect(ret).toHaveProperty('Temp');
            })
        });
        describe("Error", () => {
            test("processDutDay bad day", async () => {
                const devId = faker.string.alphanumeric();
                const reqParams = {
                    day: faker.string.alphanumeric(), // bad day
                    dutId: devId,
                    motivo: "test",
                    hType: "TelemetryCharts" as HistoryTypeDUT,
                    dutExtInf: { RTYPE_ID: faker.number.int({ min: 1 }) }
                };

                jest.spyOn(sqldb.ROOMTYPES, "getRoomTypeInfo").mockResolvedValueOnce({
                    TUSEMAX: faker.number.float(),
                    TUSEMIN: faker.number.float(),
                    USEPERIOD: '{"version":"v4","week":{"mon":{"permission":"allow","start":"00:00","end":"23:59"},"tue":{"permission":"allow","start":"00:00","end":"23:59"},"wed":{"permission":"allow","start":"00:00","end":"23:59"},"thu":{"permission":"allow","start":"00:00","end":"23:59"},"fri":{"permission":"allow","start":"00:00","end":"23:59"},"sat":{"permission":"allow","start":"00:00","end":"23:59"},"sun":{"permission":"allow","start":"00:00","end":"23:59"}}}'
                } as Awaited<ReturnType<typeof sqldb.ROOMTYPES.getRoomTypeInfo>>)

                const tOffset = faker.number.float();

                jest.spyOn(sqldb.DUTS, "getDevExtraInfo").mockResolvedValueOnce({
                    DUT_DEVICE_ID: faker.number.int(),
                    VARS: faker.string.alpha(),
                    LAT: faker.location.latitude().toString(),
                    LON: faker.location.longitude().toString(),
                    DUT_DUO_ID: faker.number.int(),
                    ENVIRONMENT_ROOM_TYPE_ID: faker.number.int(),
                    ROOM_ID: faker.number.int(),
                    DUT_REFERENCE_ID: faker.number.int(),
                    MACHINE_REFERENCE: faker.number.int(),
                    MACHINE_APPLICATION: faker.string.alpha(),
                    ...generateDevExtraInfo(devId)
                })

                jest.spyOn(sqldb.cache_cond_tel, "getItem").mockResolvedValueOnce({
                    devId: devId,
                    YMD: faker.date.recent().toDateString(),
                    chartsBas: '{}',
                    chartsDet: '{}',
                    chartsExt: '',
                    temperatureOffset: tOffset,
                    vers: 'dut-1',
                    meantp: '{}',
                    cstats: '{}',
                    hoursOnline: faker.number.float({ min: 0, max: 24 })
                })

                jest.spyOn(permissionControl, 'getPermissionsOnUnit')
                    .mockResolvedValueOnce({
                        canViewDevs: true,
                        canChangeDeviceOperation: false,
                        canManageDevs: false,
                        canViewObservations: true,
                        canManageObservations: true,
                        canManageSketches: false,
                        canEditProgramming: false,
                    })

                jest.spyOn(rusthistApi, '/comp-dut').mockResolvedValueOnce(mockDutHist.getCompDut()).mockName("/comp-dut");

                jest.spyOn(sqldb.DEVICES, "getTimezoneInfoByDev").mockResolvedValueOnce({
                    TIMEZONE_ID: faker.number.int(),
                    TIMEZONE_AREA: faker.location.timeZone(),
                    TIMEZONE_OFFSET: faker.number.int({min: -12, max: 12})
                })

                expect.assertions(1);

                jest.spyOn(dut, 'loadRtypeSched').mockResolvedValueOnce(generateFullProg());
                try {
                    await dut.processDutDay(reqParams);
                }
                catch (e) {
                    expect(e).toHaveProperty('message', 'Invalid day');
                }
            });
        });
    });
});

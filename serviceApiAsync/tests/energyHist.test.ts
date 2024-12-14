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

import sqldb from "../../srcCommon/db";
import axios from "axios";
import * as factories from "./factories/energyHistFactory";
import * as energyHist from "../energyHist";
import { mockGetUnitBasicInfo } from "./factories/devInfoFactory";
import * as permissionControl from "../../srcCommon/helpers/permissionControl";
import * as dates from "../../srcCommon/helpers/dates";
import * as drisCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import * as factoriesLogin from './factories/loginFactory';
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'

import * as moment from 'moment-timezone';

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
});

describe('getEnergyDemandHist', () => {
    describe('Success', () => {
       test('OK with CDS data only', async () => {
        let reqParams = factories.mockGetDemandHistReqParams({ lessOneDay: true });
        let session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(factories.mockGetEnergyDevicesDriByUnit());
        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
        jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(factories.mockGetEnergyDemandFromComputedDataService()));


        const result = await energyHist.getEnergyDemandHist(reqParams, session);
        expect(result).toHaveProperty('demands');
       });
       test('Ok only with data per CDS per day', async () => {
        let reqParams = factories.mockGetDemandHistReqParams({ lessOneDay: true });
        let session = factoriesLogin.generateSessionReal();
        reqParams.END_DATE = reqParams.START_DATE;

        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(factories.mockGetEnergyDevicesDriByUnit());
        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
        jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(factories.mockGetEnergyDemandFromComputedDataService()));

        const verifyDemandMinutesMock = jest.spyOn(energyHist, 'verifyDemandMinutesHist').mockImplementation((): any => Promise.resolve(factories.mockDemands()));

        const result = await energyHist.getEnergyDemandHist(reqParams, session);
        expect(result).toHaveProperty('demands');
        expect(verifyDemandMinutesMock).toHaveBeenCalled()
       });
       test('OK with rusthist data only', async () => {
        let reqParams = factories.mockGetDemandHistReqParams({ actualDay: true });
        let session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(factories.mockGetEnergyDevicesDriByUnit());
        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => reqParams.END_DATE);
        
        jest.spyOn(energyHist, 'verifyDemandInActualDay').mockResolvedValue(factories.mockDemands());
        jest.spyOn(energyHist, 'verifyDemandMinutesHist').mockImplementation((): any => Promise.resolve(factories.mockDemands()));

        const result = await energyHist.getEnergyDemandHist(reqParams, session);
        expect(result).toHaveProperty('demands');
       });
       test('OK', async () => {
        let reqParams = factories.mockGetDemandHistReqParams({ lessOneDay: true });
        let session = factoriesLogin.generateSessionReal();
        const endDateVerified = moment().subtract(1, 'day').format('YYYY-MM-DD');

        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue(factories.mockGetEnergyDevicesDriByUnit());
        jest.spyOn(dates, 'checkEndDateNoLaterThanYesterday').mockImplementation((): any => endDateVerified);
        const getDemandInComputedDataServiceMock = jest.spyOn(axios, 'post').mockImplementation((): any => Promise.resolve(factories.mockGetEnergyDemandFromComputedDataService()));

        const verifyDemandInActualDayMock = jest.spyOn(energyHist, 'verifyDemandInActualDay').mockResolvedValue(factories.mockDemands());

        const result = await energyHist.getEnergyDemandHist(reqParams, session);
        expect(result).toHaveProperty('demands');
        expect(getDemandInComputedDataServiceMock).toHaveBeenCalled();
        expect(verifyDemandInActualDayMock).toHaveBeenCalled();
       });
       test('OK without meters on demand', async () => {
        let reqParams = factories.mockGetDemandHistReqParams({});
        let session = factoriesLogin.generateSessionReal();

        jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
        jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: true }));
        jest.spyOn(sqldb.ENERGY_DEVICES_INFO, 'getEnergyDevicesDriByUnit').mockResolvedValue([]);

        const result = await energyHist.getEnergyDemandHist(reqParams, session);
        expect(result).not.toHaveProperty('demands');
       });
    });
    describe('Error', () => {
        test('Missing UNIT_ID', async () => {
            let reqParams = factories.mockGetDemandHistReqParams({});
            let session = factoriesLogin.generateSessionReal();

            reqParams.UNIT_ID = <any>null;

            await energyHist.getEnergyDemandHist(reqParams, session).catch((err) => {
                expect(err.message).toBe('Invalid properties. Missing UNIT_ID');
            });
        });
        test('Missing Dates', async () => {
            let reqParams = factories.mockGetDemandHistReqParams({});
            let session = factoriesLogin.generateSessionReal();

            reqParams.START_DATE = <any>null;
            reqParams.END_DATE = <any>null;

            await energyHist.getEnergyDemandHist(reqParams, session).catch((err) => {
                expect(err.message).toBe('Invalid properties. Missing Dates');
            });
        });
        test('Missing ELECTRIC_CIRCUIT_IDS', async () => {
            let reqParams = factories.mockGetDemandHistReqParams({});
            let session = factoriesLogin.generateSessionReal();

            reqParams.ELECTRIC_CIRCUIT_IDS = [];

            await energyHist.getEnergyDemandHist(reqParams, session).catch((err) => {
                expect(err.message).toBe('Invalid properties. Missing ELECTRIC_CIRCUIT_IDS');
            });
        });
        test('Unit not found', async () => {
            let reqParams = factories.mockGetDemandHistReqParams({});
            let session = factoriesLogin.generateSessionReal();

            jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(null);

            await energyHist.getEnergyDemandHist(reqParams, session).catch((err) => {
                expect(err.message).toBe('Unit not found');
            });
        });
        test('Permission Denied!', async () => {
            let reqParams = factories.mockGetDemandHistReqParams({});
            let session = factoriesLogin.generateSessionReal();

            jest.spyOn(sqldb.CLUNITS, 'getUnitBasicInfo').mockResolvedValue(mockGetUnitBasicInfo());
            jest.spyOn(permissionControl, "getPermissionsOnUnit").mockImplementation((): any => Promise.resolve({ canViewDevs: false }));

            await energyHist.getEnergyDemandHist(reqParams, session).catch((err) => {
                expect(err.message).toBe('Permission Denied!');
            });
        });
    });
});
describe('verifyDemandInActualDay', () => {
  describe('Success', () => {
    test('Ok', async () => {
      const params = factories.mockVerifyDemandInActualDayParams();

      jest.spyOn(drisCfgLoader, 'loadDrisCfg').mockImplementation((): any => ({ drisCfg: {} }));
      jest.spyOn(drisCfgLoader, 'getDrisCfgFormulas').mockImplementation((): any => {});
      jest.spyOn(rusthistApi, '/energy-query').mockResolvedValue(factories.mockEnergyQuery());
      jest.spyOn(energyHist, 'verifyMinValueDemand').mockImplementation((): any => factories.mockVerifyDemandValue());
      jest.spyOn(energyHist, 'verifyMaxValueDemand').mockImplementation((): any => factories.mockVerifyDemandValue());

      const result = await energyHist.verifyDemandInActualDay(params.energy_devices, params.day, params.hour_interval, params.demand_metrics, params.user)
      expect(result).not.toHaveLength(0)
    });
  })
});
describe('verifyDemandMinutesHist', () => {
  describe('Success', () => {
    test('Ok', () => {
      const params = factories.mockDemands();

      const result = energyHist.verifyDemandMinutesHist(params);
      expect(result).toBeDefined();
    })
  })
});
describe('verifyMinValueDemand', () => {
  describe('Success', () => {
    test('Ok', () => {
      const params = factories.mockParamsVerifyValueDemand();

      const result = energyHist.verifyMaxValueDemand(params.valueToCompare, params.recordDateValueToCompare, params.oldValue, params.oldRecordDate);
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('timestamp')
    })
  })
});
describe('verifyMaxValueDemand', () => {
  describe('Success', () => {
    test('Ok', () => {
      const params = factories.mockParamsVerifyValueDemand();

      const result = energyHist.verifyMinValueDemand(params.valueToCompare, params.recordDateValueToCompare, params.oldValue, params.oldRecordDate);
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('timestamp')
    })
  })
});

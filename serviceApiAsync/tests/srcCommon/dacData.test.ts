(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import { faker } from '@faker-js/faker';
import * as dacData from '../../../srcCommon/helpers/dacData'
import * as dacFactory from '../factories/dacDataFactory'


beforeEach(() => {
    jest.clearAllMocks();
})

afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
})

describe('dacData', () => {
    describe('HwCfg', () => {
        test('HwCfg is vrf', () => {
            let devId = faker.helpers.regexpStyleStringParse(
                "DAC[100000000-999999999]"
            );
            const freshData = dacFactory.generateDacFreshData('vrf', 'vrf');
            const result = dacData.dacHwCfg(devId, freshData);
            expect(result).toHaveProperty('isVrf', true);
        });
        test('HwCfg simulate', () => {
            let devId = faker.helpers.regexpStyleStringParse(
                "DAC[100000000-999999999]"
            );
            const freshData = dacFactory.generateDacFreshData('split', 'splitao', 'virtual');
            const result = dacData.dacHwCfg(devId, freshData);
            expect(result).toHaveProperty('isVrf', false);
            expect(result).toHaveProperty('simulateL1', true);
        });

        test('HwCfg not simulate', () => {
            let devId = faker.helpers.regexpStyleStringParse(
                "DAC[100000000-999999999]"
            );
            const freshData = dacFactory.generateDacFreshData('split', 'splitao', null);
            const result = dacData.dacHwCfg(devId, freshData);
            expect(result).toHaveProperty('isVrf', false);
            expect(result).toHaveProperty('simulateL1', false);
        });
        test('HwCfg is fancoil', () => {
            let devId = faker.helpers.regexpStyleStringParse(
                "DAC[100000000-999999999]"
            );
            const freshData = dacFactory.generateDacFreshData('fancoil', 'fancoil', 'fancoil');
            const result = dacData.dacHwCfg(devId, freshData);
            expect(result).toHaveProperty('isVrf', false);
            expect(result).toHaveProperty('simulateL1', false);
            expect(result).toHaveProperty('calculate_L1_fancoil', true);
        });
    })
})
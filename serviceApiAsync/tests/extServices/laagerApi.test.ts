(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
    return Object.assign(this, { Status: status }, pars || {});
};

import sqldb from '../../../srcCommon/db';
import * as factoriesLogin from '../../tests/factories/loginFactory';
import * as mock from '../factories/laagerApiFactory';
import * as permissionControl from '../../../srcCommon/helpers/permissionControl';
import * as laagerApi from '../../extServices/laagerApi';
import * as devInfo from '../../devInfo';
import * as dmaInfo from '../../dmaInfo';
import { faker } from "@faker-js/faker";

beforeEach(() => {
    jest.restoreAllMocks();
})

afterAll(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
})

describe('laagerApi', () => {
    describe('laager/set meter info', () => {
        describe('Success', () => {
            test('Set new meter info', async () => {
                const reqParams = mock.generateReqParams()
                let session = factoriesLogin.generateSessionReal();
                jest.spyOn(permissionControl, 'getUserGlobalPermissions').mockReturnValue(mock.mockGetUserGlobalPermissions(true));
                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValueOnce(null);
                jest.spyOn(laagerApi, 'verifyActualDevicesByUnit').mockImplementation();
                jest.spyOn(dmaInfo, 'checkWaterInfo').mockImplementation();
                jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();
                jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();
                jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockResolvedValueOnce({ HYDROMETER_ID: 1});

                // jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValueOnce({ LAAGER_CODE: faker.datatype.string(), UNIT_ID: 0, INSTALLATION_DATE: faker.date.past().toString() });
                // jest.spyOn(laagerApi, 'verifyActualDevicesByUnit').mockImplementation();
                // jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockResolvedValueOnce({ HYDROMETER_ID: 1});
                // jest.spyOn(laagerApi, 'checkWaterInfo').mockResolvedValueOnce(1);
                // jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();
                // jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();

                const result = await laagerApi.laagerSetMeterInfo(reqParams, session);

                expect(result).toBe('OK');
            })

            test('Set new meter info without unit', async () => {
                const reqParams = mock.generateReqParams()
                let session = factoriesLogin.generateSessionReal();
                const reqParamsFalse = reqParams as any;
                delete reqParamsFalse.unitId;

                jest.spyOn(permissionControl, 'getUserGlobalPermissions').mockReturnValue(mock.mockGetUserGlobalPermissions(true));
                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(null);
                // jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue({ LAAGER_CODE: faker.datatype.string(), UNIT_ID: 0, INSTALLATION_DATE: faker.date.past().toString() });
                jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();
                jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockImplementation();
                jest.spyOn(dmaInfo, 'checkWaterInfo').mockImplementation();
                jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();

                const result = await laagerApi.laagerSetMeterInfo(reqParams, session);

                expect(result).toBe('OK');
            })

            test('Update meter info without unit', async () => {
                const reqParams = mock.generateReqParams()
                let session = factoriesLogin.generateSessionReal();

                const meterInfo = mock.mockIntegrlaagerGetSimpleInfo();
                const meterInfoFalse = meterInfo as any;
                delete meterInfoFalse.UNIT_ID;

                jest.spyOn(permissionControl, 'getUserGlobalPermissions').mockReturnValue(mock.mockGetUserGlobalPermissions(true));
                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(meterInfoFalse);
                jest.spyOn(laagerApi, 'verifyActualDevicesByUnit').mockImplementation();
                jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();
                jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockImplementation();
                jest.spyOn(dmaInfo, 'checkWaterInfo').mockImplementation();
                jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();

                const result = await laagerApi.laagerSetMeterInfo(reqParams, session);

                expect(result).toBe('OK');
            })

            test('Update meter info with different unit', async () => {
                const reqParams = mock.generateReqParams(true)
                let session = factoriesLogin.generateSessionReal();

                const meterInfo = mock.mockIntegrlaagerGetSimpleInfo();

                jest.spyOn(permissionControl, 'getUserGlobalPermissions').mockReturnValue(mock.mockGetUserGlobalPermissions(true));
                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue(meterInfo);
                jest.spyOn(laagerApi, 'verifyActualDevicesByUnit').mockImplementation();
                jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();
                jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockImplementation();
                jest.spyOn(dmaInfo, 'checkWaterInfo').mockImplementation();
                jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();

                const result = await laagerApi.laagerSetMeterInfo(reqParams, session);

                expect(result).toBe('OK');
            })

            test('Disassociate meter from unit', async () => {
                const reqParams = mock.generateReqParams()
                let session = factoriesLogin.generateSessionReal();
                const reqParamsFalse = reqParams as any;
                delete reqParamsFalse.unitId;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValueOnce({ LAAGER_CODE: faker.datatype.string(), UNIT_ID: 0, CLIENT_ID: 0, INSTALLATION_DATE: faker.date.past().toString() });
                jest.spyOn(sqldb.LAAGER, 'getListWithUnitInfo').mockResolvedValueOnce([]);
                jest.spyOn(sqldb.DMAS_DEVICES, 'getList').mockResolvedValueOnce([]);
                jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementationOnce(() => Promise.resolve({ affectedRows: faker.datatype.number(), insertId: faker.datatype.number() }));
                jest.spyOn(sqldb.HYDROMETER_MODELS, 'getHydrometerId').mockImplementation();
                jest.spyOn(dmaInfo, 'checkWaterInfo').mockImplementation();
                jest.spyOn(sqldb.WATERS, 'w_update').mockImplementation();

                const result = await laagerApi.laagerSetMeterInfo(reqParams, session);

                expect(result).toBe('OK');
            })
        });
        describe('Error', () => {
            test('Medidor Inválido', async () => {
                const reqParams = mock.generateReqParams()
                const reqParamsFalse = reqParams as any;
                const session = factoriesLogin.generateSessionReal();
                delete reqParamsFalse.meterId;

                await expect(laagerApi.laagerSetMeterInfo(reqParamsFalse, session)).rejects.toThrow('Medidor de água Laager inválido.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            })
            test('Erro de Permissão', async () => {
                const reqParams = mock.generateReqParams()
                const session = factoriesLogin.generateSessionReal();

                jest.spyOn(permissionControl, 'getUserGlobalPermissions').mockReturnValue(mock.mockGetUserGlobalPermissions(false));

                await expect(laagerApi.laagerSetMeterInfo(reqParams, session)).rejects.toThrow('Permission denied')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('403');
                    });
            })
        })
    })
    describe('verifyActualDevicesByUnit', () => {
        describe('Success', () => {
            test('Unit has Laager device', async () => {
                const reqParams = mock.generateReqParams(true)
                let session = factoriesLogin.generateSessionReal();
                
                jest.spyOn(sqldb.LAAGER, 'getListWithUnitInfo').mockResolvedValue(mock.mockIntegrlaagerGetListWithUnitInfo())
                jest.spyOn(sqldb.DMAS_DEVICES, 'getList').mockResolvedValue([]);
                
                const integrLaagerUpdateInfo = jest.spyOn(sqldb.LAAGER, 'w_updateInfo').mockImplementation();

                await laagerApi.verifyActualDevicesByUnit(reqParams.changedByUnit, reqParams.unitId, reqParams.meterId, session)
                expect(integrLaagerUpdateInfo).toHaveBeenCalledTimes(1);
            })
            test('Unit has Dma device', async () => {
                const reqParams = mock.generateReqParams(true)
                let session = factoriesLogin.generateSessionReal();
                
                jest.spyOn(sqldb.LAAGER, 'getListWithUnitInfo').mockResolvedValue([])
                jest.spyOn(sqldb.DMAS_DEVICES, 'getList').mockResolvedValue(mock.mockDmaGetList());
                
                const getBasicInfoDma = jest.spyOn(sqldb.DMAS_DEVICES, 'getBasicInfo').mockResolvedValue(mock.mockDmaGetBasicInfo())
                const setGetDevInfo = jest.spyOn(devInfo, 'setGetDevInfo').mockImplementation();

                await laagerApi.verifyActualDevicesByUnit(reqParams.changedByUnit, reqParams.unitId, reqParams.meterId, session)
                expect(getBasicInfoDma).toHaveBeenCalledTimes(1);
                expect(setGetDevInfo).toHaveBeenCalledTimes(1);
            })
        })
        describe('Error', () => {
            test('Unidade já possui medidor Laager associado à ela', async () => {
                const reqParams = mock.generateReqParams(false)
                const session = factoriesLogin.generateSessionReal();
                session.permissions.isAdminSistema = true;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValue({ LAAGER_CODE: faker.datatype.string(), UNIT_ID: 0, CLIENT_ID: 0, INSTALLATION_DATE: faker.date.past().toString() });
                sqldb.LAAGER.getListWithUnitInfo = jest.fn().mockResolvedValue([{ LAAGER_CODE: faker.datatype.string(), UNIT_ID: faker.datatype.number() }]);
                sqldb.DMAS_DEVICES.getList = jest.fn().mockResolvedValue([]);


                await expect(laagerApi.verifyActualDevicesByUnit(reqParams.changedByUnit, reqParams.unitId, reqParams.meterId, session)).rejects.toThrow('A unidade escolhida já possui um medidor de água Laager associado a ela.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            })

            test('Unidade já possui medidor DMA associado à ela', async () => {
                const reqParams = mock.generateReqParams(false)
                const session = factoriesLogin.generateSessionReal();
                session.permissions.isAdminSistema = true;

                jest.spyOn(sqldb.LAAGER, 'getSimpleInfo').mockResolvedValueOnce({ LAAGER_CODE: faker.datatype.string(), UNIT_ID: 0, CLIENT_ID: 0, INSTALLATION_DATE: faker.date.past().toString() });
                sqldb.LAAGER.getListWithUnitInfo = jest.fn().mockResolvedValue([]);
                sqldb.DMAS_DEVICES.getList = jest.fn().mockResolvedValue([{ DMA_ID: faker.datatype.string(), UNIT_ID: faker.datatype.number() }]);

                await expect(laagerApi.verifyActualDevicesByUnit(reqParams.changedByUnit, reqParams.unitId, reqParams.meterId, session)).rejects.toThrow('Unidade já possui DMA associado.')
                    .catch((error) => {
                        expect(error.httpStatus).toBe('400');
                    });
            })
        })
    })
})

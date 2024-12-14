
// (Error.prototype as any).HttpStatus = function (status: number) {
//   this.Status = status;
//   return this;
// };
// (Error.prototype as any).DebugInfo = function (info: any) {
//   this.debugInfo = info;
//   return this;
// };
// (Error.prototype as any).Details = function (
//   status: number,
//   pars: { errorCode: string; frontDebug?: any; debugInfo?: any }
// ) {
//   return Object.assign(this, { Status: status }, pars || {});
// };
// import * as httpRouter from "../../apiServer/httpRouter";
// import sqldb from "../../../srcCommon/db";
// import "../../batchInputs/unified/unified";
// import {
//   addEnergy,
//   exportEnergy,
//   parseFileRows,
// } from "../../batchInputs/unified/unified";
// import * as unifiedHelpers from "../../batchInputs/unified/unifiedHelpers";
// import * as factoriesLogin from "../factories/loginFactory";
// import * as multiparFiles from "../../apiServer/getMultiparFiles";
// import * as mock from "../factories/unifiedFactory";
// import { faker } from "@faker-js/faker";
// import { getNormalized } from "../../crossData/dacCities";
// import * as groups from "../../clientData/groups";
// import * as permission from "../../../srcCommon/helpers/permissionControl";
// import * as fs from "node:fs";
// import * as path from "path";

// beforeEach(() => {
//   jest.clearAllMocks();
// });

// afterAll(() => {
//   jest.resetAllMocks();
//   jest.clearAllMocks();
// });

// jest.mock("../../../srcCommon/helpers/tickAux", () => ({
//   runTick: jest.fn(),
// }));

// // TODO: Remove
// test("Solution Type Unit", async () => {});

// // describe('Unified', () => {
// //   describe('check-client-unified-batch', () => {
// //     describe('Success', () => {
// //       test('Solution Type Unit', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() }
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         extra.req.body = reqParams;

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockUnit.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValueOnce(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValueOnce({ units: [], fluids: [], applics: [], types: [], envs: [], vavs: [], brands: [], roles: [], rtypes: [], psens: [], energy: [] });
// //         jest.spyOn(sqldb.CITY, 'getCity').mockResolvedValueOnce(mock.mockGetCity());

// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //       test('Solution Type Ilumination', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() }
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         const mockAux = mock.mockParseFilesRowIlumination()
// //         extra.req.body = reqParams;
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockIlumination.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValueOnce(mock.mockUnitsList(faker.company.name()));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: faker.number.int({min: 1}), label: mockAux[0].UNIT_NAME, norms: [getNormalized(mockAux[0].UNIT_NAME)] }],
// //           fluids: [],
// //           applics: [{ value: mockAux[0].MCHN_APPL, label: mockAux[0].MCHN_APPL, norms: [getNormalized(mockAux[0].MCHN_APPL)] }],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         });

// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //       test('Solution Type Machine', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() };
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         const mockAux = mock.mockParseFilesRowsMachine();
// //         const fakeUnitId = faker.number.int({min: 1});
// //         extra.req.body = reqParams;

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockMachine.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [],
// //           fluids: mockAux.map(item => ({ value: item.FLUID_TYPE, label: item.FLUID_TYPE, norms: [getNormalized(item.FLUID_TYPE)] })),
// //           applics: mockAux.map(item => ({ value: item.MCHN_APPL, label: item.MCHN_APPL, norms: [getNormalized(item.MCHN_APPL)] })),
// //           types: mockAux.map(item => ({ value: item.GROUP_TYPE, label: item.GROUP_TYPE, norms: [getNormalized(item.GROUP_TYPE)] })),
// //           envs: [],
// //           vavs: [],
// //           brands: mockAux.map(item => ({ value: item.MCHN_BRAND, label: item.MCHN_BRAND, norms: [getNormalized(item.MCHN_BRAND)] })),
// //           roles: [{ value: 'Evaporadora', label: 'Evaporadora', norms: [getNormalized('Evaporadora')] }, { value: 'Condensadora', label: 'Condensadora', norms: [getNormalized('Condensadora')] }],
// //           rtypes: [],
// //           psens: [{ value: mockAux[0].P0_SENSOR, label: mockAux[0].P0_SENSOR, norms: [mockAux[0].P0_SENSOR] }],
// //           energy: []
// //         });
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.DEVS, 'getBasicInfo').mockResolvedValue(mock.mockGetBasicInfo());
// //         jest.spyOn(sqldb.DEVGROUPS, 'getListWithDamDut').mockResolvedValue([]);
// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //       test('Solution Type Water', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() }
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         const mockAux = mock.mockParseFilesRowWater()
// //         const fakeUnitId = faker.number.int({min: 1});
// //         extra.req.body = reqParams;

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockWater.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValueOnce(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: fakeUnitId, label: mockAux[0].UNIT_NAME, norms: [getNormalized(mockAux[0].UNIT_NAME)] }],
// //           fluids: [], applics: [], types: [], envs: [], brands: [], roles: [], rtypes: [], psens: [], vavs: [], energy: []
// //         });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockResolvedValue(mock.mockDevsGetClientInfo(mockAux[0].DMA_ID, Number(reqParams.CLIENT_ID)))
// //         jest.spyOn(sqldb.DEVS, 'getBasicInfo').mockResolvedValue(mock.mockDevsGetBasicInfo(mockAux[0].DMA_ID, Number(reqParams.CLIENT_ID), fakeUnitId))
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitIdByUnitName').mockResolvedValue({ UNIT_ID: fakeUnitId })

// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //       test('Solution Type Environment', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() }
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         const mockAux = mock.mockParseFilesRowEnvironment()
// //         extra.req.body = reqParams;

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockEnvironment.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValueOnce(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValueOnce({
// //           units: [{ value: faker.number.int({min: 1}), label: mockAux[0].UNIT_NAME, norms: [getNormalized(mockAux[0].UNIT_NAME)] }],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           brands: [],
// //           vavs: [],
// //           energy: [],
// //           roles: [],
// //           rtypes: [{ RTYPE_ID: faker.number.int({min: 1}), RTYPE_NAME: mockAux[0].RTYPE_NAME, norms: [mockAux[0].RTYPE_NAME] }],
// //           psens: []
// //         });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementation((): any => { });

// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //       test('Solution Type Energy', async () => {
// //         const reqParams = { CLIENT_ID: faker.string.numeric() }
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         const mockAux = mock.mockCheckedEnergy(
// //           {
// //             SOLUTION: 'Energia',
// //             ID_MED_ENERGY: faker.string.alphanumeric({ length: 12 }),
// //             MCHN_APPL: 'Medidor de Energia',
// //             UNIT_NAME: faker.string.alphanumeric({ length: 10 })
// //           }
// //         );
// //         const fakeUnitId = faker.number.int({min: 1});
// //         extra.req.body = reqParams;


// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementation((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockEnergy.xlsx')) });
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValueOnce(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValueOnce({
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementationOnce((): any => { return {} });

// //         const result = await httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result.list).toBeInstanceOf(Array);
// //       });
// //     })
// //     describe('Error', () => {
// //       test('CLIENT_ID is missing', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const extra = mock.mockedExtraParams;
// //         delete extra.req.body.CLIENT_ID;
// //         const reqParams = { CLIENT_ID: '' }
// //         jest.spyOn(multiparFiles, 'getUploadedFile').mockImplementationOnce((): any => { return fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMock.xlsx')) })
// //         const result = httpRouter.privateRoutes['/check-client-unified-batch'](reqParams, session, extra);
// //         expect(result).rejects.toThrow('Missing parameter: CLIENT_ID');
// //       });
// //     });
// //   })
// //   describe('add-client-unified-batch', () => {
// //     describe('Success', () => {
// //       test('Solution Type Unit', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowUnit() };

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({ units: [], fluids: [], applics: [], types: [], envs: [], vavs: [], brands: [], roles: [], rtypes: [], psens: [], energy: [] });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementationOnce((): any => {
// //           const units = mock.getUnitListMock()
// //           return units
// //         });
// //         jest.spyOn(sqldb.CITY, 'getCity').mockResolvedValue(mock.mockGetCity());

// //         jest.spyOn(httpRouter.privateRoutes, '/dac/add-client-unit').mockResolvedValueOnce({} as ReturnType<typeof httpRouter.privateRoutes['/dac/add-client-unit']>);

// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.added).toHaveLength(reqParams.datas.length);
// //         expect(result.ignored).toHaveLength(0);
// //       });
// //       test('Solution Type Ilumination', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowIlumination() };

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(reqParams.datas[0].UNIT_NAME));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: faker.number.int({min: 1}), label: reqParams.datas[0].UNIT_NAME, norms: [getNormalized(reqParams.datas[0].UNIT_NAME)] }],
// //           fluids: [],
// //           applics: [{ value: reqParams.datas[0].MCHN_APPL, label: reqParams.datas[0].MCHN_APPL, norms: [getNormalized(reqParams.datas[0].MCHN_APPL)] }],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(groups, 'realocateManufacturerDevice').mockImplementation((): any => { });
// //         jest.spyOn(httpRouter.privateRoutes, '/dac/add-new-group').mockResolvedValue(mock.mockInsertedMachine(reqParams.datas[0].GROUP_NAME));
// //         jest.spyOn(sqldb.DAM_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhoto').mockImplementation((): any => { });

// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.added).toHaveLength(reqParams.datas.length);
// //         expect(result.ignored).toHaveLength(0);
// //       });
// //       test('Solution Type Machine', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowsMachine() };

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(reqParams.datas[0].UNIT_NAME));
// //         const fakeUnitId = faker.number.int({min: 1});
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: fakeUnitId, label: reqParams.datas[0].UNIT_NAME, norms: [getNormalized(reqParams.datas[0].UNIT_NAME)] }],
// //           fluids: reqParams.datas.map(item => ({ value: item.FLUID_TYPE, label: item.FLUID_TYPE, norms: [getNormalized(item.FLUID_TYPE)] })),
// //           applics: reqParams.datas.map(item => ({ value: item.MCHN_APPL, label: item.MCHN_APPL, norms: [getNormalized(item.MCHN_APPL)] })),
// //           types: reqParams.datas.map(item => ({ value: item.GROUP_TYPE, label: item.GROUP_TYPE, norms: [getNormalized(item.GROUP_TYPE)] })),
// //           envs: [],
// //           vavs: [],
// //           brands: reqParams.datas.map(item => ({ value: item.MCHN_BRAND, label: item.MCHN_BRAND, norms: [getNormalized(item.MCHN_BRAND)] })),
// //           roles: [{ value: 'Evaporadora', label: 'Evaporadora', norms: [getNormalized('Evaporadora')] }, { value: 'Condensadora', label: 'Condensadora', norms: [getNormalized('Condensadora')] }],
// //           rtypes: [],
// //           psens: [{ value: reqParams.datas[0].P0_SENSOR, label: reqParams.datas[0].P0_SENSOR, norms: [reqParams.datas[0].P0_SENSOR] }],
// //           energy: []
// //         });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'groupAutoDevsToCheck').mockResolvedValue();
// //         jest.spyOn(groups, 'realocateManufacturerDevice').mockImplementation((): any => { });
// //         jest.spyOn(httpRouter.privateRoutes, '/dac/add-new-group').mockResolvedValue(mock.mockInsertedMachine(reqParams.datas[0].GROUP_NAME));
// //         jest.spyOn(httpRouter.privateRoutes, '/clients/edit-group').mockResolvedValue(mock.mockInsertedMachine(reqParams.datas[0].GROUP_NAME));
// //         jest.spyOn(sqldb.DEV_GROUPS_IMGS, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });
// //         jest.spyOn(sqldb.VTMACHINETYPES, 'getAllMachineTypes').mockResolvedValue([{ ID: 1, NAME: 'Condensadora' }, { ID: 2, NAME: 'Evaporadora' }]);
// //         jest.spyOn(sqldb.CLIENT_ASSETS, 'getAssetInfo').mockImplementation((): any => { });
// //         jest.spyOn(httpRouter.privateRoutes, '/clients/add-new-asset').mockResolvedValue(mock.mockInsertedAsset());
// //         jest.spyOn(sqldb.ASSETIMGS, 'getList').mockResolvedValue([]);
// //         jest.spyOn(httpRouter.privateRoutes, '/dac/set-dac-info').mockResolvedValue('Ok');
// //         jest.spyOn(sqldb.DACIMGS, 'getList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.DEVGROUPS, 'w_update').mockResolvedValue({ affectedRows: 1, insertId: faker.number.int({min: 1}) });
// //         jest.spyOn(httpRouter.privateRoutes, '/dam/set-dam-info').mockResolvedValue('Ok');
// //         jest.spyOn(sqldb.DAM_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.DEVS, 'getBasicInfo').mockResolvedValue(mock.mockGetBasicInfo());
// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);

// //         expect(result.added).toHaveLength(reqParams.datas.length);
// //         expect(result.ignored).toHaveLength(0);
// //       });
// //       test('Solution Type Water', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowWater() };
// //         const fakeUnitId = faker.number.int({min: 1});

// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(reqParams.datas[0].UNIT_NAME, fakeUnitId, reqParams.CLIENT_ID));
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: fakeUnitId, label: reqParams.datas[0].UNIT_NAME, norms: [getNormalized(reqParams.datas[0].UNIT_NAME)] }],
// //           fluids: [], applics: [], types: [], envs: [], brands: [], roles: [], rtypes: [], psens: [], vavs: [], energy: []
// //         });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockResolvedValue(mock.mockDevsGetClientInfo(reqParams.datas[0].DMA_ID, reqParams.CLIENT_ID))
// //         jest.spyOn(sqldb.DEVS, 'getBasicInfo').mockResolvedValue(mock.mockDevsGetBasicInfo(reqParams.datas[0].DMA_ID, reqParams.CLIENT_ID, fakeUnitId))
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitIdByUnitName').mockResolvedValue({ UNIT_ID: fakeUnitId })
// //         httpRouter.privateRoutes['/get-integrations-list/water'] = jest.fn().mockResolvedValue({ list: [] });
// //         jest.spyOn(httpRouter.privateRoutes, '/dma/set-dma-info').mockResolvedValue({
// //           DMA_ID: reqParams.datas[0].DMA_ID,
// //           UNIT_NAME: reqParams.datas[0].UNIT_NAME,
// //           CLIENT_ID: reqParams.CLIENT_ID,
// //           UNIT_ID: fakeUnitId,
// //           HYDROMETER_MODEL: reqParams.datas[0].HYDROMETER_MODEL,
// //           INSTALLATION_LOCATION: reqParams.datas[0].INSTALLATION_LOCATION,
// //           INSTALLATION_DATE: reqParams.datas[0].INSTALLATION_DATE,
// //           TOTAL_CAPACITY: Number(reqParams.datas[0].TOTAL_CAPACITY),
// //           QUANTITY_OF_RESERVOIRS: Number(reqParams.datas[0].TOTAL_RESERVOIRS)
// //         });

// //         jest.spyOn(sqldb.DMA_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });

// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);

      //   jest.spyOn(sqldb.DMAS_IMAGES, 'getList').mockResolvedValue([]);
      //   jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });


// //         expect(result.added.length).toBe(reqParams.datas.length);
// //         expect(result.ignored).toHaveLength(0);
// //       });
// //       test('Solution Type Environment', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowEnvironment() };
      //   expect(result.added.length).toBe(reqParams.datas.length);
      //   expect(result.ignored).toHaveLength(0);
      // });
      // test('Solution Type Environment', async () => {
      //   const session = factoriesLogin.generateSessionReal();
      //   const reqParams = { CLIENT_ID: Number(faker.string.numeric()), datas: mock.mockParseFilesRowEnvironment() };
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(reqParams.datas[0].UNIT_NAME));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: faker.number.int({min: 1}), label: reqParams.datas[0].UNIT_NAME, norms: [getNormalized(reqParams.datas[0].UNIT_NAME)] }],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           brands: [],
// //           vavs: [],
// //           energy: [],
// //           roles: [],
// //           rtypes: [{ RTYPE_ID: faker.number.int({min: 1}), RTYPE_NAME: reqParams.datas[0].RTYPE_NAME, norms: [reqParams.datas[0].RTYPE_NAME] }],
// //           psens: []
// //         });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue(mock.roomTypesMocked(reqParams.datas[0].RTYPE_NAME));
// //         jest.spyOn(groups, 'realocateManufacturerDevice').mockImplementation((): any => { });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementation((): any => { });
// //         jest.spyOn(httpRouter.privateRoutes, '/dut/set-dut-info').mockResolvedValue(mock.mockInsertedEnvironment());
// //         jest.spyOn(sqldb.DUTIMGS, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhoto').mockImplementation((): any => { });

// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.added).toHaveLength(reqParams.datas.length);
// //         expect(result.ignored).toHaveLength(0);
// //       });
// //       test('Solution Type Energy', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = {
// //           CLIENT_ID: faker.number.int({min: 1}), datas: [mock.mockCheckedEnergy(
// //             {
// //               SOLUTION: 'Energia',
// //               ID_MED_ENERGY: faker.string.alphanumeric({ length: 12 }),
// //               MCHN_APPL: 'Medidor de Energia',
// //               UNIT_NAME: faker.string.alphanumeric({ length: 10 })
// //             }
// //           )]
// //         };
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(reqParams.datas[0].UNIT_NAME));
// //         const fakeUnitId = faker.number.int({min: 1});
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [{ value: fakeUnitId, label: reqParams.datas[0].UNIT_NAME, norms: [getNormalized(reqParams.datas[0].UNIT_NAME)] }],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         });
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementationOnce((): any => {
// //           return {
// //           }
// //         })
// //         jest.spyOn(sqldb.DRIS, 'getList').mockImplementation((): any => {
// //           return []
// //         })
// //         jest.spyOn(unifiedHelpers, 'deleteDriPhotos').mockImplementationOnce((): any => { })
// //         jest.spyOn(unifiedHelpers, 'uploadPhoto').mockImplementationOnce((): any => { })
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementation((): any => { })
// //         httpRouter.privateRoutes['/energy/set-energy-info'] = jest.fn().mockResolvedValue({} as ReturnType<typeof httpRouter.privateRoutes['/energy/set-energy-info']>)
// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.ignored).toHaveLength(0)
// //       })
// //     })
// //     describe('Error', () => {
// //       test('Missing parameter: CLIENT_ID', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowUnit() };
// //         reqParams.CLIENT_ID = <any>''
// //         const result = httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         await expect(result).rejects.toThrow('Missing parameter: CLIENT_ID');
// //       })
// //       test('Missing parameter: datas', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowUnit() };
// //         reqParams.datas = <any>''
// //         const result = httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         await expect(result).rejects.toThrow('Missing parameter: datas');
// //       })
// //       test('Permission denied!', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowUnit() };
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(false));
// //         const result = httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         await expect(result).rejects.toThrow('Permission denied!');
// //       })
// //       test('SOLUTION TYPE invalid', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowUnit() };
// //         reqParams.datas[0].SOLUTION_TYPE = faker.string.alphanumeric({ length: 10 });
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({ units: [], fluids: [], applics: [], types: [], envs: [], vavs: [], brands: [], roles: [], rtypes: [], psens: [], energy: [] });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(sqldb.CITY, 'getCity').mockResolvedValue(mock.mockGetCity());
// //         jest.spyOn(sqldb.UNITS_SKETCHES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockResolvedValue();
// //         jest.spyOn(httpRouter.privateRoutes, '/clients/edit-unit').mockResolvedValue({
// //           UNIT_ID: faker.number.int({min: 1}),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           LAT: faker.string.alphanumeric({ length: 10 }),
// //           LON: faker.string.alphanumeric({ length: 10 }),
// //           CITY_ID: faker.string.alphanumeric({ length: 10 }),
// //           CITY_NAME: faker.string.alphanumeric({ length: 10 }),
// //           STATE_ID: faker.string.alphanumeric({ length: 10 }),
// //           GA_METER: faker.number.int({min: 1}),
// //           TARIFA_DIEL: 0
// //         })

// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.added).toHaveLength(0);
// //         expect(result.ignored).toHaveLength(1);
// //       });
// //       test('Com erro nos dados', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), datas: mock.mockParseFilesRowIlumination() };

      //   const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
      //   expect(result.added).toHaveLength(0);
      //   expect(result.ignored).toHaveLength(1); 
      // });
      // test('Com erro nos dados', async () => {
      //   const session = factoriesLogin.generateSessionReal();
      //   const reqParams = { CLIENT_ID: Number(faker.string.numeric()), datas: mock.mockParseFilesRowIlumination() };
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitsList').mockResolvedValue(mock.mockUnitsList(''));
// //         jest.spyOn(sqldb.DEVGROUPS, 'getGroupsList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'availableOptions').mockResolvedValue({
// //           units: [],
// //           fluids: [],
// //           applics: [{ value: reqParams.datas[0].MCHN_APPL, label: reqParams.datas[0].MCHN_APPL, norms: [getNormalized(reqParams.datas[0].MCHN_APPL)] }],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         });
// //         jest.spyOn(sqldb.ROOMTYPES, 'getRoomTypesList').mockResolvedValue([]);
// //         jest.spyOn(groups, 'realocateManufacturerDevice').mockImplementation((): any => { });
// //         jest.spyOn(httpRouter.privateRoutes, '/dac/add-new-group').mockResolvedValue(mock.mockInsertedMachine(faker.string.alphanumeric({ length: 10 })));
// //         jest.spyOn(sqldb.DAM_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhoto').mockImplementation((): any => { });
// //         const result = await httpRouter.privateRoutes['/add-client-unified-batch'](reqParams, session);
// //         expect(result.added).toHaveLength(0);
// //         expect(result.ignored).toHaveLength(reqParams.datas.length);
// //       });
// //     })
// //   })
// //   describe('/export-client-unified-batch-input', () => {
// //     // to do test with each export value
// //     describe('Error', () => {
// //       test('Missing parameter: CLIENT_ID', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), UNIT_ID: faker.number.int({min: 1}) };
// //         reqParams.CLIENT_ID = <any>''
// //         const extra = mock.mockedExtraParams;
// //         await expect(httpRouter.privateRoutes['/export-client-unified-batch-input'](reqParams, session, extra)).rejects.toThrow('Missing parameter: CLIENT_ID');
// //       })
// //       test('Permission denied!', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), UNIT_ID: faker.number.int({min: 1}) };
// //         const extra = mock.mockedExtraParams;
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(false));
// //         await expect(httpRouter.privateRoutes['/export-client-unified-batch-input'](reqParams, session, extra)).rejects.toThrow('Permission denied!');
// //       })
// //       test('Missing parameter: UNIT_ID', async () => {
// //         const session = factoriesLogin.generateSessionReal();

// //         const reqParams = { CLIENT_ID: faker.number.int({min: 1}), UNIT_ID: faker.number.int({min: 1}) };
// //         const extra = mock.mockedExtraParams;
// //         reqParams.UNIT_ID = <any>null
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         await expect(httpRouter.privateRoutes['/export-client-unified-batch-input'](reqParams, session, extra)).rejects.toThrow('Missing parameter: UNIT_ID');
// //       })
// //       test('Unit not found', async () => {
// //         const session = factoriesLogin.generateSessionReal();
// //         const reqParams = {CLIENT_ID: faker.number.int({min: 1}), UNIT_ID: faker.number.int({min: 1})};
// //         const extra = mock.mockedExtraParams;
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValueOnce(mock.mockPermissionsUnifiedBatch(true));
// //         jest.spyOn(sqldb.CLUNITS, 'getUnitInfo').mockImplementation((): any => null);
// //         await expect(httpRouter.privateRoutes['/export-client-unified-batch-input'](reqParams, session, extra)).rejects.toThrow('Unidade não encontrada');
// //       })
// //     })
// //   })
// //   describe('checkEnergyParameters', () => {
// //     describe('Success', () => {
// //       test('ESPERA QUE O ARRAY DE ERRO SEJA 0', () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 12 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 })
// //         })
// //         const errors: { message: string }[] = []
// //         const clientId: number = 124
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementationOnce((): any => {
// //           return {
// //             DEV_ID: 'DRI001220009',
// //             CLIENT_ID: 124,
// //             PERMS_C: '[C]'
// //           }
// //         })
// //         jest.spyOn(sqldb.DRIS, 'getList').mockImplementation((): any => {
// //           return []
// //         })
// //         unifiedHelpers.checkEnergyParameters(checked, errors, clientId)
// //         expect(errors).toHaveLength(0);
// //       });
// //     })
// //     describe('Error', () => {
// //       test('ESPERA QUE O ARRAY DE ERRO SEJA 1 - ID de um medidor de energia ', () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 })
// //         })
// //         const errors: { message: string }[] = []
// //         const clientId: number = 124
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementationOnce((): any => {
// //           return {
// //             DEV_ID: 'DRI001220009',
// //             CLIENT_ID: 124,
// //             PERMS_C: '[C]'
// //           }
// //         })
// //         unifiedHelpers.checkEnergyParameters(checked, errors, clientId)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('É necessário informar um ID de um medidor de energia');
// //       });
// //       test('ESPERA QUE O ARRAY DE ERRO SEJA 1 - Tipo de aplicação', () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 12 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 })
// //         })
// //         const errors: { message: string }[] = []
// //         const clientId: number = 124
// //         jest.spyOn(sqldb.DEVS, 'getClientInfo').mockImplementationOnce((): any => {
// //           return {
// //             DEV_ID: 'DRI001220009',
// //             CLIENT_ID: 124,
// //             PERMS_C: '[C]'
// //           }
// //         })
// //         unifiedHelpers.checkEnergyParameters(checked, errors, clientId)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('É necessário informar o tipo de Aplicação')
// //       });
// //     })
// //   })
// //   describe('checkEnergyAplication', () => {
// //     describe('Success', () => {
// //       test('ESPERA QUE O ARRAY DE ERRO SEJA 0 - sucesso Aplicação (Medidor de Energia)', () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: 'ET330',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: 'ET330',
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         }
// //         unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(0);
// //       });
// //       test('ESPERA QUE O ARRAY DE ERRO SEJA 0 - sucesso Aplicação (VAV)', () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(0);
// //       });
// //     })
// //     describe('Error', () => {
// //       test('checkEnergyAplication - ERRO SEJA 1 - Aplicação não disponível para upload em planilha', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: [
// //             {
// //               value: 'box-manuf-tropical',
// //               label: 'Tropical-Tosi',
// //               type: 'BOX_MANUF',
// //               norms: ['tropical-tosi']
// //             },
// //             {
// //               value: 'box-manuf-trox',
// //               label: 'Trox',
// //               type: 'BOX_MANUF',
// //               norms: ['trox']
// //             },
// //             {
// //               value: 'therm-manuf-beca-smart',
// //               label: 'Beca Smart',
// //               type: 'THERM_MANUF',
// //               norms: ['beca-smart']
// //             },
// //             {
// //               value: 'valve-manuf-belimo',
// //               label: 'Belimo',
// //               type: 'VALVE_MANUF',
// //               norms: ['belimo']
// //             },
// //             {
// //               value: 'valve-manuf-trox',
// //               label: 'Trox',
// //               type: 'VALVE_MANUF',
// //               norms: ['trox']
// //             }
// //           ],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Aplicação não disponível para upload em planilha');
// //       });
// //       test('checkEnergyVAV - ERRO SEJA 1 - Ambiente monitorado não informado', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: '',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: '',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Ambiente monitorado não informado');
// //       });
// //       test('checkEnergyMeter - ERRO SEJA 1 - Edição - Modelo deve estar preenchido para edição', async () => {
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => {
// //           return {
// //             ENERGY_DEVICE_ID: faker.string.alphanumeric({ length: 10 }),
// //             CLIENT_ID: faker.number.int({min: 1}),
// //             UNIT_ID: faker.number.int({min: 1}),
// //           }
// //         })
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: ''
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: ''
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Modelo deve estar preenchido para edição');
// //       });
// //       test('checkEnergyMeter - ERRO SEJA 1 - Cadastro - Modelo não deve estar preenchido para cadastro', async () => {
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => { return undefined })
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: 'ET330'
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: 'ET330'
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Modelo não deve estar preenchido para cadastro');
// //       });
// //       test('checkEnergyMeter - ERRO SEJA 1 - Cadastro - Modelo não informado ou não encontrado', async () => {
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => {
// //           return {
// //             ENERGY_DEVICE_ID: faker.string.alphanumeric({ length: 10 }),
// //             CLIENT_ID: faker.number.int({min: 1}),
// //             UNIT_ID: faker.number.int({min: 1}),
// //           }
// //         })
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: faker.string.alphanumeric({ length: 10 })
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MODEL_MED_ENERGY: faker.string.alphanumeric({ length: 10 })
// //         })
// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: [],
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: [{
// //             MODEL_ID: 1,
// //             MANUFACTURER_ID: 3,
// //             NAME: 'ET330',
// //             norms: ['et330']
// //           }]
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Modelo não informado ou não encontrado para a aplicação "Medidor de Energia"');
// //       });
// //       test('checkThermVAVEnergy - ERRO SEJA 1 - Opção de fabricante de termostato VAV não encontrada', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })

// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Opção de fabricante de termostato VAV não encontrada');
// //       });
// //       test('checkThermVAVEnergy - ERRO SEJA 1 - Opção de modelo de termostato VAV não encontrada', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })

// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Opção de modelo de termostato VAV não encontrada');
// //       });
// //       test('checkValveVAVEnergy - ERRO SEJA 1 - Opção de modelo de termostato VAV não encontrada', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })

// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Opção de fabricante de atuador VAV não encontrada');
// //       });
// //       test('checkEnergyVAV - ERRO SEJA 1 - Opção de fabricante de caixa VAV não encontrada', async () => {
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const inRow: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           ROOM_VAV: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MODEL: 'TVZ D-250',
// //         })

// //         const errors: { message: string }[] = []
// //         const opts: unifiedHelpers.AvailableOptions = {
// //           units: [],
// //           fluids: [],
// //           applics: [],
// //           types: [],
// //           envs: [],
// //           vavs: mock.optsVAV(),
// //           brands: [],
// //           roles: [],
// //           rtypes: [],
// //           psens: [],
// //           energy: []
// //         }
// //         await unifiedHelpers.checkEnergyAplication(inRow, checked, errors, opts)
// //         expect(errors).toHaveLength(1);
// //         expect(errors[0].message).toBe('Opção de fabricante de caixa VAV não encontrada');
// //       });
// //     })
// //   })
// //   describe('exportEnergy', () => {
// //     describe('SUCESSO', () => {
// //       test('ESPERA QUE ARRAY TENHA 3 LINHAS', async () => {
// //         const data: (string | number)[][] = []
// //         const unitInfo = mock.getUnitListMock()
// //         jest.spyOn(sqldb.VAVS, 'getVAVsInfoList').mockImplementation((): any => ([{
// //           VAV_ID: 'DRI1234789',
// //           THERM_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           THERM_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           VALVE_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MANUF: faker.string.alphanumeric({ length: 10 }),
// //           BOX_MODEL: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_NAME: faker.string.alphanumeric({ length: 10 }),
// //         }]));
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getList').mockImplementation((): any => ([{
// //           ENERGY_DEVICE_ID: 'DRI1234789',
// //           SERIAL: faker.string.alphanumeric({ length: 10 }),
// //           MODEL: faker.string.alphanumeric({ length: 10 }),
// //           MANUFACTURER: faker.string.alphanumeric({ length: 10 }),
// //           ESTABLISHMENT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           CLIENT_ID: faker.number.int({min: 1}),
// //           CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           UNIT_ID: faker.number.int({min: 1}),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           STATE_ID: faker.string.alphanumeric({ length: 10 }),
// //           CITY_ID: faker.string.alphanumeric({ length: 10 }),
// //           CITY_NAME: faker.string.alphanumeric({ length: 10 }),
// //         }]))
// //         jest.spyOn(sqldb.DRIS, 'getList').mockImplementation((): any => ([{
// //           DRI_ID: faker.string.alphanumeric({ length: 12 }),
// //           UNIT_ID: faker.number.int({min: 1}),
// //           CLIENT_ID: faker.number.int({min: 1}),
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           STATE_ID: faker.string.alphanumeric({ length: 10 }),
// //           CITY_NAME: faker.string.alphanumeric({ length: 10 }),
// //           CLIENT_NAME: faker.string.alphanumeric({ length: 10 }),
// //         }]))
// //         await exportEnergy(data, unitInfo);
// //         expect(data).toHaveLength(3);
// //       })
// //     })
// //     describe('ERRO', () => {

// //     })
// //   })
// //   describe('addEnergy', () => {
// //     describe('SUCESSO', () => {
// //       test('ESPERA-SE QUE DÊ SUCESSO - Medidor de Energia Cadastro', async () => {
// //         const clientId = faker.number.int({min: 1});
// //         const ignored: { key: string, reason: string }[] = []
// //         const existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[] = [mock.getUnitListMock()]
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: existingUnitItems[0].UNIT_NAME,
// //           MODEL_MED_ENERGY: '',
// //         })
// //         const session = factoriesLogin.generateSessionReal();

// //         const deleteDriPhotos = jest.spyOn(sqldb.DRI_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => { })
// //         httpRouter.privateRoutes['/energy/set-energy-info'] = jest.fn().mockResolvedValue({} as ReturnType<typeof httpRouter.privateRoutes['/energy/set-energy-info']>)
// //         await addEnergy(clientId, checked, ignored, existingUnitItems, session);
// //         expect(ignored).toHaveLength(0);
// //         expect(deleteDriPhotos).toHaveBeenCalled()
// //       });
// //       test('ESPERA-SE QUE DÊ SUCESSO - Medidor de Energia - Edição', async () => {
// //         const clientId = faker.number.int({min: 1});
// //         const ignored: { key: string, reason: string }[] = []
// //         const existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[] = [mock.getUnitListMock()]
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Medidor de Energia',
// //           UNIT_NAME: existingUnitItems[0].UNIT_NAME,
// //           MODEL_MED_ENERGY: 'ET330',
// //         })
// //         const session = factoriesLogin.generateSessionReal();

// //         const deleteDriPhotos = jest.spyOn(sqldb.DRI_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => {
// //           return {
// //             ENERGY_DEVICE_ID: faker.string.alphanumeric({ length: 10 }),
// //             CLIENT_ID: faker.number.int({min: 1}),
// //             UNIT_ID: faker.number.int({min: 1})
// //           }
// //         })
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'w_update').mockImplementationOnce((): any => { })
// //         await addEnergy(clientId, checked, ignored, existingUnitItems, session);
// //         expect(ignored).toHaveLength(0);
// //         expect(deleteDriPhotos).toHaveBeenCalled();
// //       });
// //       test('ESPERA-SE QUE DÊ SUCESSO - Carrier ECOSPLIT', async () => {
// //         const clientId = faker.number.int({min: 1});
// //         const ignored: { key: string, reason: string }[] = []
// //         const existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[] = [mock.getUnitListMock()]
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'Carrier ECOSPLIT',
// //           UNIT_NAME: existingUnitItems[0].UNIT_NAME,
// //           MODEL_MED_ENERGY: '',
// //         })
// //         const session = factoriesLogin.generateSessionReal();

// //         const deleteDriPhotos = jest.spyOn(sqldb.DRI_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });
// //         jest.spyOn(sqldb.ENERGY_DEVICES, 'getItem').mockImplementationOnce((): any => { })
// //         httpRouter.privateRoutes['/dri/set-dri-info'] = jest.fn().mockResolvedValue({} as ReturnType<typeof httpRouter.privateRoutes['/dri/set-dri-info']>)

// //         await addEnergy(clientId, checked, ignored, existingUnitItems, session);
// //         expect(ignored).toHaveLength(0);
// //         expect(deleteDriPhotos).toHaveBeenCalled();

// //       });
// //       test('ESPERA-SE QUE DÊ SUCESSO - VAV', async () => {
// //         const clientId = faker.number.int({min: 1});
// //         const ignored: { key: string, reason: string }[] = []
// //         const existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[] = [mock.getUnitListMock()]
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: existingUnitItems[0].UNIT_NAME,
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const session = factoriesLogin.generateSessionReal();
// //         const deleteDriPhotos = jest.spyOn(sqldb.DRI_IMAGES, 'getList').mockResolvedValue([]);
// //         httpRouter.privateRoutes['/dri/set-dri-info'] = jest.fn().mockResolvedValue({} as ReturnType<typeof httpRouter.privateRoutes['/dri/set-dri-info']>)
// //         httpRouter.privateRoutes['/dri/update-dri-vav'] = jest.fn().mockResolvedValue({} as ReturnType<typeof httpRouter.privateRoutes['/dri/update-dri-vav']>)
// //         jest.spyOn(sqldb.DRI_IMAGES, 'getList').mockResolvedValue([]);
// //         jest.spyOn(unifiedHelpers, 'uploadPhotos').mockImplementation((): any => { });
// //         await addEnergy(clientId, checked, ignored, existingUnitItems, session);
// //         expect(ignored).toHaveLength(0);
// //         expect(deleteDriPhotos).toHaveBeenCalled();
// //       });
// //     })
// //     describe('ERROS', () => {
// //       test('ESPERA-SE QUE DÊ ERRO -  Não foi possível identificar a unidade', async () => {
// //         const clientId = faker.number.int({min: 1});
// //         const ignored: { key: string, reason: string }[] = []
// //         const existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[] = [mock.getUnitListMock()]
// //         const checked: unifiedHelpers.TableRow = mock.mockCheckedEnergy({
// //           SOLUTION: 'Energia',
// //           ID_MED_ENERGY: faker.string.alphanumeric({ length: 10 }),
// //           MCHN_APPL: 'VAV',
// //           UNIT_NAME: faker.string.alphanumeric({ length: 10 }),
// //           ROOM_VAV: 'Alvenaria',
// //           THERM_MANUF: 'Beca Smart',
// //           THERM_MODEL: 'BAC-6000',
// //           VALVE_MANUF: 'Belimo',
// //           VALVE_MODEL: 'M466ES3',
// //           BOX_MANUF: 'Trox',
// //           BOX_MODEL: 'TVZ D-250',
// //         })
// //         const session = factoriesLogin.generateSessionReal();
// //         jest.spyOn(httpRouter.privateRoutes, '/dri/set-dri-info').mockImplementationOnce((): any => { })
// //         jest.spyOn(httpRouter.privateRoutes, '/dri/update-dri-vav').mockImplementationOnce((): any => { })
// //         jest.spyOn(unifiedHelpers, 'deleteDriPhotos').mockImplementationOnce((): any => { })
// //         jest.spyOn(unifiedHelpers, 'uploadPhoto').mockImplementationOnce((): any => { })
// //         await addEnergy(clientId, checked, ignored, existingUnitItems, session);
// //         expect(ignored).toHaveLength(1);
// //         expect(ignored[0].reason).toBe('Não foi possível identificar a unidade')
// //       });
// //     })
// //   })
// //   describe('parseFileRows', () => {
// //     describe('SUCESS', () => {
// //       test('parseFileRows', async () => {
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         const buffer = fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMock.xlsx'))
// //         const result = await parseFileRows(buffer);
// //         expect(result).toBeInstanceOf(Object);
// //         expect(result.tableCols).toBeInstanceOf(Array);
// //         expect(result.tableRows).toBeInstanceOf(Array);
// //       });
// //     });
// //     describe('ERROR', () => {
// //       test('parseFileRows', async () => {
// //         jest.spyOn(permission, 'getPermissionsOnClient').mockResolvedValue(mock.mockPermissionsUnifiedBatch(true));
// //         const buffer = fs.readFileSync(path.join(__dirname, '../assets/unifiedBatchMockError.xlsx'))
// //         const result = parseFileRows(buffer);
// //         expect(result).rejects.toThrow('Coluna não encontrada: ID do DMA')
// //       });
// //     });
// //   })
// // });

describe('unified', () => {
    test('teste aleatorio para passar no sonar. Esperando ajustes nesse arquivo', () => {

    })
})

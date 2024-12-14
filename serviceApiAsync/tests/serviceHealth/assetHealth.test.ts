(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};


import { faker } from '@faker-js/faker';
import * as assetHealth from '../../../serviceHealth/assetHealth'
import { generateSessionNoPermissions, generateSessionReal } from '../factories/loginFactory';
import sqldb from "../../../srcCommon/db";
import * as permissionControl from '../../../srcCommon/helpers/permissionControl'
import * as faultsFactory from '../factories/faultsFactory'
import * as assetHealthFactory from '../factories/assetsHealthFactory'
import falhaRep from '../../../serviceHealth/extServices/falhaRep';
import * as faultDetection from "../../../serviceHealth/faultDetection";
import * as dacHealth from '../../../serviceHealth/dacHealth'
import { ChangeType } from '../../../srcCommon/types';

beforeEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
});

describe("Asset Health", () => {
    describe("getAssetHealthStatus", () => {
        describe("Success", () => {
            test("getAssetHealthStatus Success", async () => {
                const session = generateSessionReal();
                const faultDefs = faultsFactory.generateFaultsDefs();
                const faultIds = faultDefs.defs.map((x) => x.fault_id);
                
                jest.spyOn(faultDetection, "getKnownFaults").mockResolvedValue(faultsFactory.generateKnownFaults(faultIds));
                jest.spyOn(permissionControl, 'getPermissionsOnUnit').mockResolvedValue({
                    canChangeDeviceOperation: true,
                    canManageDevs: true,
                    canViewDevs: true,
                    canViewObservations: true,
                    canManageObservations: true,
                    canManageSketches: true,
                    canEditProgramming: true,
                });
                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue({
                    CLIENT_ID: faker.number.int({ min: 1 }),
                    UNIT_ID: faker.number.int({ min: 1 }),
                    PRODUCTION: 1,
                    TIMEZONE_OFFSET: 0,
                    TIMEZONE_AREA: faker.string.alphanumeric(),
                    PRODUCTION_TIMESTAMP: faker.date.recent().toISOString(),
                });
                jest.spyOn(falhaRep, '/detected-faults/dev').mockResolvedValue(faultsFactory.generateDetectedFaults(faultIds));
                const fdetected = faultsFactory.generateFdetected(faultIds);
                jest.spyOn(assetHealth, "fetchFdetected").mockImplementation(async () => fdetected);
                const id_state_pairs: Parameters<typeof faultsFactory.generateHealthStatus>[0] = [];
                for (const f of fdetected) {
                    id_state_pairs.push([f.id, f.lastAction])
                }
                fdetected.map((x) => [x.id, x.lastAction]);
                
                const hs = faultsFactory.generateHealthStatus(id_state_pairs);
                jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockResolvedValue({DEV_ID: faker.string.alpha(), ...hs })
                const resp = await assetHealth.getAssetHealthStatus({ ASSET_ID: faker.number.int({ min: 1 }) }, session);
                expect(resp.healthStatus.H_INDEX).toBe(hs?.H_INDEX);
                expect(resp.healthStatus.H_DESC).toBe(hs?.H_DESC);
                expect(resp.healthStatus.P_CAUSES).toBe(hs?.P_CAUSES);
                expect(resp.healthStatus.fdetected).toBe(fdetected);
            })
        })
    })
    describe("assetSaveHealthInfo", () => {
        describe("Success", () => {
            test("assetSaveHealthInfo Success", async () => {
                const reqParams: Parameters<typeof assetHealth.assetSaveHealthInfo>[0] = {
                    assetId: faker.number.int({ min: 1 }),
                    healthIndex: faker.helpers.arrayElement([1, 2, 3, 4, 25, 50, 75, 100]),
                    laudo: faker.word.noun(),
                    possibleCauses: faker.helpers.multiple(faker.number.int).map(String)
                }
                const session = generateSessionReal();
                const faultDefs = faultsFactory.generateFaultsDefs();
                const faultIds = faultDefs.defs.map((x) => x.fault_id);
                const fdetected = faultsFactory.generateFdetected(faultIds);
                
                const id_state_pairs: Parameters<typeof faultsFactory.generateHealthStatus>[0] = [];
                for (const f of fdetected) {
                    id_state_pairs.push([f.id, f.lastAction])
                }
                fdetected.map((x) => [x.id, x.lastAction]);
                
                const hs = faultsFactory.generateHealthStatus(id_state_pairs);
                const health_status = {DEV_ID: faker.string.alpha(), ...hs };
                jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockResolvedValue(health_status)
                const unitInfo = {
                    CLIENT_ID: faker.number.int({ min: 1 }),
                    UNIT_ID: faker.number.int({ min: 1 }),
                    PRODUCTION: 1,
                    TIMEZONE_OFFSET: 0,
                    TIMEZONE_AREA: faker.string.alphanumeric(),
                    PRODUCTION_TIMESTAMP: faker.date.recent().toISOString(),
                };
                jest.spyOn(sqldb.CLUNITS, "getUnitBasicInfo").mockResolvedValue(unitInfo);
                const setAssetHealthStatus = jest.spyOn(dacHealth, "setAssetHealthStatus").mockResolvedValue({ affectedRows: 1 })
                jest.spyOn(dacHealth, "resendAssociatedFault").mockImplementation(jest.fn())
                const getAsset = jest.spyOn(assetHealth, "getAssetHealthStatus").mockResolvedValueOnce({
                    healthStatus: {
                        H_DESC: reqParams.laudo,
                        H_INDEX: reqParams.healthIndex,
                        P_CAUSES: reqParams.possibleCauses?.join(',')!,
                        H_REP: "",
                        fdetected: fdetected,
                    }
                })
                const qPars = {
                    ASSET_ID: reqParams.assetId,
                    H_INDEX: reqParams.healthIndex,
                    P_CAUSES: reqParams.possibleCauses.join(','),
                    H_DESC: reqParams.laudo,
                    H_OFFL: null as string|null,
                    CT_ID: ChangeType.Manual,
                    userId: session.user,
                };
                const resp = await assetHealth.assetSaveHealthInfo(reqParams, session);
                expect(setAssetHealthStatus).toBeCalledWith(health_status, qPars);
                expect(getAsset).toHaveBeenCalled();
            })
        })
        describe("Error", () => {
            test("assetSaveHealthInfo 403", async () => {
                const reqParams: Parameters<typeof assetHealth.assetSaveHealthInfo>[0] = {
                    assetId: faker.number.int({ min: 1 }),
                    healthIndex: faker.helpers.arrayElement([1, 2, 3, 4, 25, 50, 75, 100]),
                    laudo: faker.word.noun(),
                    possibleCauses: faker.helpers.multiple(faker.number.int).map(String)
                }
                const session = generateSessionNoPermissions();

                let e = undefined;
                try {
                    await assetHealth.assetSaveHealthInfo(reqParams, session);
                }
                catch(err) {
                    e = err;
                }
                expect(e).toBeDefined();
            })
            test("assetSaveHealthInfo bad comm fdd", async () => {
                const reqParams: Parameters<typeof assetHealth.assetSaveHealthInfo>[0] = {
                    assetId: faker.number.int({ min: 1 }),
                    healthIndex: faker.helpers.arrayElement([1, 2, 3, 4, 25, 50, 75, 100]),
                    laudo: faker.word.noun(),
                    possibleCauses: faker.helpers.multiple(faker.number.int).map(String)
                }
                const session = generateSessionReal();
                jest.spyOn(dacHealth, "resendAssociatedFault").mockImplementation(() => {
                    throw Error("erro do fdd")
                })
                let e = undefined;
                try {
                    await assetHealth.assetSaveHealthInfo(reqParams, session);
                }
                catch(err) {
                    e = err;
                }
                expect(e).toHaveProperty("message", "erro do fdd");
            })
        })
    })
    describe("assetHealthHist", () => {
        describe("Success", () => {
            test("assetHealthHist success", async () => {
                const reqParams: Parameters<typeof assetHealth.assetHealthHist>[0] = {
                    clientIds: faker.helpers.multiple(() => faker.number.int({min: 1})),
                    unitIds: faker.helpers.multiple(() => faker.number.int({min: 1}))
                };
                const session = generateSessionReal();
                const validateAllowedRequestedUnits = jest.spyOn(permissionControl, "validateAllowedRequestedUnits").mockResolvedValueOnce({
                    clientIds: reqParams.clientIds,
                    unitIds: reqParams.unitIds,
                })
                
                const getHealthHist = jest.spyOn(sqldb.ASSETS_HEALTH_HIST, "getList").mockResolvedValueOnce(assetHealthFactory.generateHealthHist())
                jest.spyOn(sqldb.CLUNITS, "getTimezoneByUnit").mockResolvedValueOnce({
                    TIMEZONE_AREA: faker.location.timeZone(),
                    TIMEZONE_ID: faker.number.int(),
                    TIMEZONE_OFFSET: faker.number.int({min: -12, max: 12})
                })
                const resp = await assetHealth.assetHealthHist(reqParams, session);
                expect(validateAllowedRequestedUnits).toHaveBeenCalledTimes(1);
                expect(resp.list.length).toBeDefined();
                expect(getHealthHist).toHaveBeenCalledTimes(1);
            })
        })
        describe("Error", () => {
            /* does not fail */
        })
    })
    
})
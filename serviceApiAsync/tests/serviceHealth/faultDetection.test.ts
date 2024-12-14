(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
    return Object.assign(this, { Status: status }, pars || {});
};


import * as factories from "../factories/faultsFactory";
import * as faultDetection from "../../../serviceHealth/faultDetection";
import sqldb from "../../../srcCommon/db";
import { faker } from "@faker-js/faker";
import falhaRep from "../../../serviceHealth/extServices/falhaRep";
import jsonTryParse from "../../../srcCommon/helpers/jsonTryParse";
import { FaultsActs } from "../../../srcCommon/types";
import * as dacHealth from "../../../serviceHealth/dacHealth";
import * as assetHealth from '../../../serviceHealth/assetHealth'


beforeEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
});

const msgToService = jest.spyOn(sqldb.MSGTOSERVICE, "w_insert").mockImplementation(async (_qPars) => {
    return {
        affectedRows: 1,
        insertId: faker.number.int(),
    }
})

describe('FaultDetection', () => {
    describe('Success', () => {
        test('getNextFaultState auto approve', () => {
            // falha ainda não existe
            const fa = factories.generateListFaultsActs([]);

            const nextState = faultDetection.getNextFaultState(fa, 'falha1', 'fault', true);
            expect(nextState).toBe('APPROVED')
        });
        test('getNextFaultState set pending', () => {
            const fa = factories.generateListFaultsActs([]);

            const nextState = faultDetection.getNextFaultState(fa, 'falha1', 'fault', false);
            expect(nextState).toBe('PENDING')
        });
        test('getNextFaultState auto restablish', () => {
            const fa = factories.generateListFaultsActs([
                ['falha1', 'APPROVED'],
            ]);

            const nextState = faultDetection.getNextFaultState(fa, 'falha1', 'restab', true);
            expect(nextState).toBe('RESTABLISHED')
        });
        test('getNextFaultState restablish pending', () => {
            const fa = factories.generateListFaultsActs([
                ['falha1', 'APPROVED'],
            ]);

            const nextState = faultDetection.getNextFaultState(fa, 'falha1', 'restab', false);
            expect(nextState).toBe('RESTAB_PENDING')
        });
        test('getNextFaultState restablish pending with others', () => {
            const fa = factories.generateListFaultsActs([
                ['falha1', 'APPROVED'],
                ['falha2', 'APPROVED'],
            ]);

            const nextState = faultDetection.getNextFaultState(fa, 'falha1', 'restab', false);
            expect(nextState).toBe('RESTAB_PENDING')

        });
        test('getNextFaultState wait for pending fault', () => {
            const fa = factories.generateListFaultsActs([
                ['falha1', 'APPROVED'],
                ['falha2', 'PENDING']
            ]);

            expect(faultDetection.getNextFaultState(fa, 'falha1', 'restab', true)).toBe('RESTAB_PENDING')
            expect(faultDetection.getNextFaultState(fa, 'falha1', 'restab', false)).toBe('RESTAB_WAITING')
        });
        test('takeFaultAction approve automatic', async () => {
            const validIds = ['falha1', 'falha2', 'falha3', 'falha4', 'falha5']
            const dacId = faker.helpers.fromRegExp("DAC[100000000-999999999]")

            const detectedFault = factories.generateDetectedFaultInfo(validIds, { autoApprove: true });
            const getAssetByDeviceCode = jest.spyOn(sqldb.ASSETS, "getAssetByDeviceCode")
                .mockResolvedValueOnce({
                    ASSET_ID: faker.number.int({ min: 0 })
                })

            const assetHealthStatus = jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockImplementation(async () => {
                let hs = factories.generateHealthStatus([
                    ["falha4", "PENDING"],
                    ["falha5", "PENDING"]
                ])
                hs.DEV_ID = dacId
                return hs;
            }).mockName("ASSETS_HEALTH getAssetHealthStatus")
            const saveFaultsData = jest.spyOn(assetHealth, "saveFaultsData").mockResolvedValueOnce({
                affectedRows: 1,
                insertId: faker.number.int(),
            });
            const setAssetHealthStatus = jest.spyOn(dacHealth, "setAssetHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });
            jest.spyOn(faultDetection, 'performFaultFeedback').mockResolvedValue();
            const faultDefs = jest.spyOn(falhaRep, '/definitions-fault').mockImplementationOnce(async () => {
                return factories.generateFaultsDefs(validIds)
            }).mockName("/definitions-fault");

            const dacDetectedFaults = jest.spyOn(falhaRep, '/detected-faults/dev').mockImplementationOnce(async (_body) => {
                return factories.generateDetectedFaults(validIds)
            }).mockName("/detected-faults/dev");

            // jest.spyOn(assetHealth, "saveFaultsData").mockResolvedValueOnce({ affectedRows: 1, insertId: faker.number.int()})

            await faultDetection.takeFaultAction(dacId, detectedFault, "rise", faker.person.firstName());
            expect(assetHealthStatus).toHaveBeenCalledTimes(1);
            expect(faultDefs).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledWith({ dev_id: dacId })
            // expect(saveFaultsData).toHaveBeenCalledTimes(1);
            // expect(setDacHealthStatus).toHaveBeenCalledTimes(1);
        });
        test('takeFaultAction reject to approved', async () => {
            const validIds = ['falha1', 'falha2', 'falha3', 'falha4', 'falha5']
            const dacId = faker.helpers.fromRegExp("DAC[100000000-999999999]")
            const detectedFault = factories.generateDetectedFaultInfo(validIds, { autoApprove: true });
            const faultId = detectedFault.faultId;

            const getAssetByDeviceCode = jest.spyOn(sqldb.ASSETS, "getAssetByDeviceCode")
                .mockResolvedValueOnce({
                    ASSET_ID: faker.number.int({ min: 0 })
                })

            const assetHealthStatus = jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockImplementation(async () => {
                let hs = factories.generateHealthStatus([
                    ["falha4", "PENDING"],
                    ["falha5", "PENDING"]
                ])
                hs.DEV_ID = dacId
                return hs;
            }).mockName("ASSETS_HEALTH getAssetHealthStatus");
            const hist_insert = jest.spyOn(sqldb.ASSETS_HEALTH_HIST, "w_insert").mockImplementationOnce(async (_qPars) => {
                return {
                    affectedRows: 1,
                    insertId: faker.number.int(),
                }
            }).mockName("ASSETS_HEALTH_HIST insert");
            const update_health = jest.spyOn(sqldb.ASSETS_HEALTH, "w_insertOrUpdate").mockImplementationOnce(async (qPars) => {
                return {
                    affectedRows: 1,
                    insertId: faker.number.int(),
                }
            }).mockName("ASSETS_HEALTH w_insertOrUpdate");
            jest.spyOn(faultDetection, 'performFaultFeedback').mockResolvedValue();

            const faultDefs = jest.spyOn(falhaRep, '/definitions-fault').mockImplementationOnce(async () => {
                return factories.generateFaultsDefs(validIds)
            }).mockName("/definitions-fault");

            const dacDetectedFaults = jest.spyOn(falhaRep, '/detected-faults/dev').mockImplementationOnce(async (_body) => {
                return factories.generateDetectedFaults(validIds)
            }).mockName("/detected-faults/dev");

            const saveFaultsData = jest.spyOn(assetHealth, "saveFaultsData").mockResolvedValueOnce({
                affectedRows: 1,
                insertId: faker.number.int(),
            });
            const setDacHealthStatus = jest.spyOn(dacHealth, "setDacHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            const setAssetHealthStatus = jest.spyOn(dacHealth, "setAssetHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            await faultDetection.takeFaultAction(dacId, detectedFault, "rise", faker.person.firstName());
            expect(assetHealthStatus).toHaveBeenCalledTimes(1);
            expect(faultDefs).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledWith({ dev_id: dacId })
            // expect(setDacHealthStatus).toHaveBeenCalledTimes(1);
            // expect(saveFaultsData).toHaveBeenCalledTimes(1);
        });
        test('takeFaultAction auto restab', async () => {
            const validIds = ['falha1', 'falha2', 'falha3', 'falha4', 'falha5']
            const dacId = faker.helpers.fromRegExp("DAC[100000000-999999999]")
            const unitId = faker.number.int();
            const clientId = faker.number.int();
            const detectedFault = factories.generateDetectedFaultInfo(validIds, { autoApprove: true, isRestab: true, isRise: false });
            const detId = detectedFault.faultId;
            const getAssetByDeviceCode = jest.spyOn(sqldb.ASSETS, "getAssetByDeviceCode")
                .mockResolvedValueOnce({
                    ASSET_ID: faker.number.int({ min: 0 })
                })

            const assetHealthStatus = jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockImplementation(async () => {
                
                let hs = factories.generateHealthStatus([
                    ["falha4", "PENDING"],
                    ["falha5", "PENDING"]
                ])
                hs.DEV_ID = dacId
                return hs;
            }).mockName("ASSETS_HEALTH getAssetHealthStatus");

            jest.spyOn(faultDetection, 'performFaultFeedback').mockResolvedValue();

            const faultDefs = jest.spyOn(falhaRep, '/definitions-fault').mockImplementationOnce(async () => {
                return factories.generateFaultsDefs(validIds)
            }).mockName("/definitions-fault");

            const knownFaults = jest.spyOn(faultDetection, "getKnownFaults").mockResolvedValue(factories.generateKnownFaults(validIds));
            const dacDetectedFaults = jest.spyOn(falhaRep, '/detected-faults/dev').mockImplementationOnce(async (_body) => {
                return factories.generateDetectedFaults(validIds)
            }).mockName("/detected-faults/dev");

            const saveFaultsData = jest.spyOn(assetHealth, "saveFaultsData").mockResolvedValueOnce({
                affectedRows: 1,
                insertId: faker.number.int(),
            });
            const setDacHealthStatus = jest.spyOn(dacHealth, "setDacHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            const setAssetHealthStatus = jest.spyOn(dacHealth, "setAssetHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            await faultDetection.takeFaultAction(dacId, detectedFault, "restab", faker.person.firstName());
            expect(assetHealthStatus).toHaveBeenCalledTimes(1);
            expect(faultDefs).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledWith({ dev_id: dacId });
            // expect(setDacHealthStatus).toHaveBeenCalledTimes(1);
            // expect(saveFaultsData).toHaveBeenCalledTimes(1);
        });
        test('takeFaultAction restab rejected', async () => {
            /// Comportamento esperado, continua rejected, rejeita o SR e não atualiza saúde.
            const validIds = ['falha1', 'falha2', 'falha3', 'falha4', 'falha5']
            const dacId = faker.helpers.fromRegExp("DAC[100000000-999999999]")
            const detectedFault = factories.generateDetectedFaultInfo(validIds, { autoApprove: true, isRestab: true, isRise: false });
            let newIndex: number;
            const assetHealthStatus = jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockImplementation(async () => {
                const id_list = validIds.map((x) => [x, "PENDING"]);
                id_list.find((x) => x[0] == detectedFault.faultId)[1] = "REJECTED";
                // @ts-ignore
                let hs = factories.generateHealthStatus(id_list)
                hs.DEV_ID = dacId
                return hs;
            }).mockName("ASSETS_HEALTH getAssetHealthStatus");

            const getAssetByDeviceCode = jest.spyOn(sqldb.ASSETS, "getAssetByDeviceCode")
                .mockResolvedValueOnce({
                    ASSET_ID: faker.number.int({ min: 0 })
                })

            const faultDefs = jest.spyOn(falhaRep, '/definitions-fault').mockImplementationOnce(async () => {
                return factories.generateFaultsDefs(validIds)
            }).mockName("/definitions-fault");

            const dacDetectedFaults = jest.spyOn(falhaRep, '/detected-faults/dev')
                .mockImplementationOnce(async (_body) => {
                    const det = factories.generateDetectedFaults(validIds)
                    det.list.find((x) => x.fault_id == detectedFault.faultId)
                    return det
                }).mockName("/detected-faults/dev");

            const saveFaultsData = jest.spyOn(assetHealth, "saveFaultsData")
                .mockResolvedValueOnce({
                    affectedRows: 1,
                    insertId: faker.number.int(),
                }).mockName("saveFaultsData");
            const setDacHealthStatus = jest.spyOn(dacHealth, "setDacHealthStatus")
                .mockResolvedValueOnce({
                    affectedRows: 1,
                });

            const setAssetHealthStatus = jest
                .spyOn(dacHealth, "setAssetHealthStatus")
                .mockResolvedValueOnce({
                    affectedRows: 1,
                })
                .mockName("setAssetHealthStatus");

            const faultFeedback = jest
                .spyOn(faultDetection, 'performFaultFeedback')
                .mockImplementation(async () => { });

            await faultDetection.takeFaultAction(dacId, detectedFault, "restab", faker.person.firstName());
            expect(assetHealthStatus).toHaveBeenCalledTimes(1);
            expect(faultDefs).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledWith({ dev_id: dacId })
            expect(setAssetHealthStatus).not.toHaveBeenCalledTimes(1);
            expect(saveFaultsData).not.toHaveBeenCalledTimes(1);
        });

        test('takeFaultAction restab waiting', async () => {
            const validIds = ['falha1', 'falha2', 'falha3', 'falha4', 'falha5']
            const dacId = faker.helpers.fromRegExp("DAC[100000000-999999999]")
            const detectedFault = factories.generateDetectedFaultInfo(validIds, { autoApprove: true, isRestab: true, isRise: false });
            const assetHealthStatus = jest.spyOn(sqldb.ASSETS_HEALTH, "getAssetHealthStatus").mockImplementation(async () => {
                const id_list = validIds.map((x) => [x, "PENDING"]);
                id_list.find((x) => x[0] == detectedFault.faultId)[1] = "APPROVED";
                // @ts-ignore
                let hs = factories.generateHealthStatus(id_list)
                hs.DEV_ID = dacId
                return hs;
            }).mockName("ASSETS_HEALTH getAssetHealthStatus");


            const faultFeedback = jest
                .spyOn(faultDetection, 'performFaultFeedback')
                .mockImplementation(async () => { });

            const getAssetByDeviceCode = jest.spyOn(sqldb.ASSETS, "getAssetByDeviceCode")
                .mockResolvedValueOnce({
                    ASSET_ID: faker.number.int({ min: 0 })
                })

            const faultDefs = jest.spyOn(falhaRep, '/definitions-fault').mockImplementationOnce(async () => {
                return factories.generateFaultsDefs(validIds)
            }).mockName("/definitions-fault");

            const dacDetectedFaults = jest.spyOn(falhaRep, '/detected-faults/dev').mockImplementationOnce(async (_body) => {
                return factories.generateDetectedFaults(validIds)
            }).mockName("/detected-faults/dev");

            const saveFaultsData = jest.spyOn(assetHealth, "saveFaultsData").mockResolvedValueOnce({
                affectedRows: 1,
                insertId: faker.number.int(),
            });
            const setDacHealthStatus = jest.spyOn(dacHealth, "setDacHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            const setAssetHealthStatus = jest.spyOn(dacHealth, "setAssetHealthStatus").mockResolvedValueOnce({
                affectedRows: 1,
            });

            await faultDetection.takeFaultAction(dacId, detectedFault, "restab", faker.person.firstName());
            expect(assetHealthStatus).toHaveBeenCalledTimes(1);
            expect(faultDefs).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledTimes(1);
            expect(dacDetectedFaults).toHaveBeenCalledWith({ dev_id: dacId });
            // expect(saveFaultsData).toHaveBeenCalledTimes(1);
            expect(setAssetHealthStatus).not.toHaveBeenCalledTimes(1);
        })
    })
})
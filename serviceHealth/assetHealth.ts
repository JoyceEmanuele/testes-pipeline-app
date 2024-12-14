import type { API_External } from './httpApiRouter'
import sqldb from '../srcCommon/db'
import { getPermissionsOnUnit, validateAllowedRequestedUnits } from '../srcCommon/helpers/permissionControl'
import { BaseFaultData, ChangeType, FaultsActs } from '../srcCommon/types'
import { healthIndexes, possibleCauses } from '../srcCommon/helpers/healthTypes'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import falhaRepApi from './extServices/falhaRep'
import * as faultDetection from './faultDetection'
import { cleanHistory, dac_editObservationInfo, resendAssociatedFault, setAssetHealthStatus } from './dacHealth'
import { calculateDateByTimezone, getOffsetTimezone } from '../srcCommon/helpers/timezones'
import * as ramCaches from './ramCaches';

const filterHealthStatus = function (
    healthStatus: Awaited<ReturnType<typeof getAssetHealthStatus>>['healthStatus'],
    unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitBasicInfo>>
) {
    if (unitInfo && unitInfo.PRODUCTION === 0 && healthStatus.H_INDEX == null) {
        healthStatus.H_INDEX = 1
        healthStatus.H_DESC = 'Recém instalado'
    } else if (healthStatus.H_INDEX == null) {
        healthStatus.H_INDEX = 0
        healthStatus.H_DESC = 'Sem informação'
        healthStatus.P_CAUSES = null
    }
}

export const fetchFdetected = async function (
    row: {
        DEV_ID: string,
        FAULTS_DATA: string,
    }, timezone: {
        area: string,
        offset: number
    }
) {
    const fdetected = [];
    const faultsActs = (row.FAULTS_DATA && jsonTryParse<FaultsActs>(row.FAULTS_DATA)) || {};

    const fdetect = (await falhaRepApi['/detected-faults/dev']({ dev_id: row.DEV_ID }))['list'];

    const knownFaults = await faultDetection.getKnownFaults();


    for (const faultType of (fdetect || [])) {
        if (faultType.last_det) {
            const faultAct = faultsActs[faultType.fault_id] || {};
            const faultInfo = knownFaults[faultType.fault_id] || null;
            const offset = getOffsetTimezone({ TIMEZONE_AREA: timezone.area, TIMEZONE_OFFSET: timezone.offset });
            fdetected.push({
                id: faultType.fault_id,
                faultName: faultInfo && faultInfo.faultName,
                origin: 'Repentina V2',
                faultLevel: faultInfo && faultInfo.faultLevel,
                lastActionTime: (faultAct.lastActionTime + 3 * 60 * 60 * 1000) + offset * 60 * 60 * 1000,
                lastAction: faultAct.lastAction,
                lastDet: (faultType.last_det + 3 * 60 * 60 * 1000) + offset * 60 * 60 * 1000,
                lastRiseTS: faultAct.lastRiseTS,
                firstRiseTS: faultAct.firstRiseTS,
            });
        }
    }
    return fdetected;
}

export const generateHealthRepr = function(hDesc: string, pCauses: string) {
    let hRep = `${hDesc || 'Estado desconhecido'}`
    if (pCauses) {
        const causas = pCauses.split(',').map(id => (possibleCauses[id] && possibleCauses[id].text)).filter(x => !!x)
        if (causas.length === 1) {
            hRep += `<br><br>Possível causa: ${causas[0]}`
        } else if (causas.length > 1) {
            hRep += `<br><br>Possíveis causas: <br>- ${causas.join('<br>- ')}`
        }
    }
    return hRep;
}

const setHealthStatus = async function (qPars: {
    ASSET_ID: number,
    H_INDEX: number,
    H_DESC: string,
    CT_ID: ChangeType,
    H_OFFL?: string,
    P_CAUSES?: string,
    userId: string,
}) {
    const healthStatus = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ ASSET_ID: qPars.ASSET_ID });

    if (!healthStatus) {
        return null;
    }

    return setAssetHealthStatus(healthStatus, qPars)
        .then(async (x) => {
            await resendAssociatedFault(
                { devId: healthStatus.DEV_ID, healthIndex: qPars.H_INDEX, laudo: qPars.H_DESC },
                healthStatus
            );
            return x;
        });
}

/**
 * @swagger
 * /asset/get-health-status:
 *   post:
 *     summary: Obter o estado atual de saúde de um asset.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do asset
 *         schema:
 *           type: object
 *           properties:
 *             ASSET_ID:
 *               type: number
 *               description: ID do asset
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Estado atual de saúde do asset.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 healthStatus:
 *                   type: object
 *                   description: Objeto contendo estado de saúde do asset
 *                   properties:
 *                     H_INDEX:
 *                       type: number
 *                       description: Representação numérica da saúde.
 *                     H_DESC:
 *                       type: string
 *                       description: Laudo da saúde
 *                     P_CAUSES:
 *                       type: string
 *                       description: Ids da lista de causas, separadas por vírgulas
 *                     H_REP:
 *                       type: string
 *                       description: Representação em texto da lista de causas
 *                     fdetected:
 *                       type: object
 *                       properties:
 *                         origin:
 *                           type: string
 *                           description: Origem da falha. Sempre "Repentina V2".
 *                         id:
 *                           type: string
 *                           description: ID da falha.
 *                         faultName:
 *                           type: string
 *                           description: Nome da falha para exibição.
 *                         faultLevel:
 *                           type: number
 *                           description: Gravidade da falha, no mesmo formato de H_INDEX.
 *                         lastActionTime:
 *                           type: number
 *                           description: Timestamp da última mudança do estado da falha.
 *                         lastAction:
 *                           type: string
 *                           description: Estado da falha quanto à aprovação/rejeição/restabelecimento.
 *       400:
 *         description: Faltando ASSET_ID.
 *       403:
 *         description: Sem permissão para ver dispositivos na unidade associada ao asset.
 *       500:
 *         description: Erro interno do servidor
 */
export const getAssetHealthStatus: API_External['/asset/get-health-status'] = async function (reqParams, session) {
    if (!reqParams.ASSET_ID) throw Error('Invalid parameters, missing assetId!').HttpStatus(400);

    const row = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ ASSET_ID: reqParams.ASSET_ID });

    const perms = await getPermissionsOnUnit(session, row.CLIENT_ID, row.UNIT_ID);
    if (!perms.canViewDevs) {
        throw Error('Permission denied!').HttpStatus(403);
    }

    const healthStatus = {
        H_INDEX: row.H_INDEX,
        H_DESC: row.H_DESC,
        P_CAUSES: row.P_CAUSES,
        UNIT_ID: row.UNIT_ID,
        H_REP: undefined as string,
        fdetected: undefined as {
            origin: string;
            id: string;
            faultName: string;
            faultLevel: number;
            lastActionTime: number;
            lastAction: FaultsActs[string]['lastAction'];
            lastDet?: number;
            lastRiseTS: number;
            firstRiseTS: number;
        }[]
    };

    const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: healthStatus.UNIT_ID });

    filterHealthStatus(healthStatus, unitInfo);

    healthStatus.H_REP = generateHealthRepr(healthStatus.H_DESC, healthStatus.P_CAUSES);
    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
        const fdetected = await fetchFdetected(row, { area: unitInfo.TIMEZONE_AREA, offset: unitInfo.TIMEZONE_OFFSET });
        if (fdetected.length) {
            healthStatus.fdetected = fdetected;
        }
    }

    if (healthStatus.H_DESC == 'Compressor Inoperante (L1 Virtual)') {
        healthStatus.H_DESC = 'Compressor Inoperante'
    }

    if (healthStatus.fdetected) {
        healthStatus.fdetected.forEach(f => {
            if (f.faultName == 'Compressor Inoperante (L1 Virtual)') {
                f.faultName = 'Compressor Inoperante';
            }
        });
    }

    return { healthStatus };
}

/**
 * @swagger
 * /asset/save-health-info:
 *   post:
 *    summary: Alterar o estado atual de saúde de um asset.
 *    tags:
 *      - HEALTH
 *    security:
 *      - Bearer: []
 *    parameters:
 *      - name: Req
 *        in: body
 *        description: Dados do asset
 *        schema:
 *          type: object
 *          properties:
 *            assetId:
 *              type: number
 *              description: ID do asset
 *              required: true
 *            healthIndex:
 *              type: number
 *              description: Índice de saúde novo
 *              required: true
 *            laudo:
 *              type: string
 *              description: Laudo novo de saúde
 *              default: ""
 *              required: false
 *            possibleCauses:
 *              type: array
 *              items:
 *                type: string
 *              description: Lista de IDs de causas prováveis da saúde
 *              default: []
 *              required: false
 *    responses:
 *      200:
 *        description: Estado atual de saúde do asset. Retorna a mesma coisa que /asset/get-health-status.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                healthStatus:
 *                  type: object
 *                  description: Objeto contendo estado de saúde do asset
 *                  properties:
 *                    H_INDEX:
 *                      type: number
 *                      description: Representação numérica da saúde.
 *                    H_DESC:
 *                      type: string
 *                      description: Laudo da saúde
 *                    P_CAUSES:
 *                      type: string
 *                      description: Ids da lista de causas, separadas por vírgulas
 *                    H_REP:
 *                      type: string
 *                      description: Representação em texto da lista de causas
 *                    fdetected:
 *                      type: object
 *                      properties:
 *                        origin:
 *                          type: string
 *                          description: Origem da falha. Sempre "Repentina V2".
 *                        id:
 *                          type: string
 *                          description: ID da falha.
 *                        faultName:
 *                          type: string
 *                          description: Nome da falha para exibição.
 *                        faultLevel:
 *                          type: number
 *                          description: Gravidade da falha, no mesmo formato de H_INDEX.
 *                        lastActionTime:
 *                          type: number
 *                          description: Timestamp da última mudança do estado da falha.
 *                        lastAction:
 *                          type: string
 *                          description: Estado da falha quanto à aprovação/rejeição/restabelecimento.
 *      400:
 *        description: Faltando assetId ou healthIndex.
 *      403:
 *        description: Sem permissão para gerenciar saúde.
 *      500:
 *        description: Erro interno do servidor
 */
export const assetSaveHealthInfo: API_External['/asset/save-health-info'] = async (reqParams, session) => {
    if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Permission denied!').HttpStatus(403)
    const indexInfo = healthIndexes[String(reqParams.healthIndex)]
    if (!reqParams.assetId) throw Error('Invalid parameters, missing assetId!').HttpStatus(400);
    if (!indexInfo) throw Error('Invalid health index').HttpStatus(400)

    await setHealthStatus({
        ASSET_ID: reqParams.assetId,
        H_INDEX: reqParams.healthIndex,
        P_CAUSES: (reqParams.possibleCauses && reqParams.possibleCauses.join(',')) || null,
        H_DESC: reqParams.laudo || indexInfo.laudo,
        H_OFFL: null,
        CT_ID: ChangeType.Manual,
        userId: session.user,
    });

    return getAssetHealthStatus( { ASSET_ID: reqParams.assetId }, session);
}

/**
 * @swagger
 * /asset/get-health-hist:
 *   post:
 *     summary: Obter histórico de saúde, ordenado em ordem decrescente de tempo, sujeito a filtros.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros da busca do histórico.
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *             clientId:
 *               type: number
 *               description: ID do cliente
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs de cliente
 *             unitId:
 *               type: number
 *               description: ID da unidade
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das unidades
 *             groupId:
 *               type: number
 *               description: ID da máquina
 *             SKIP:
 *               type: number
 *               description: Número de entradas de histórico mais recentes a pular
 *             LIMIT:
 *               type: number
 *               description: Número de entradas de histórico máximas na resposta.
 *             SINCE:
 *               type: string
 *               description: Data limite para histórico, em ISO8601.
 *     responses:
 *       200:
 *         description: Histórico de saúde.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   description: Objeto contendo estado de saúde do asset
 *                   items:
 *                     type: object
 *                     properties:
 *                       H_INDEX:
 *                         type: number
 *                         description: Representação numérica da saúde.
 *                       desc:
 *                         type: string
 *                         description: Laudo da saúde
 *                       possCauses:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Representações em texto da lista de causas
 *                       assetId:
 *                         type: number
 *                       devId:
 *                         type: string
 *                       date:
 *                         type: string
 *                       healthIndex:
 *                         type: string
 *                         description: Representação em string do índice de saúde
 *                       UNIT_ID:
 *                         type: number
 *                         description: ID da unidade
 *                       changeType:
 *                         type: string
 *                         description: Fonte da mudança de saúde.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetHealthHist: API_External['/asset/get-health-hist'] = async (reqParams, session) => {
    if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
    delete reqParams.clientId;
    if (reqParams.unitId !== undefined) {
        reqParams.unitIds = [reqParams.unitId];
    }
    delete reqParams.unitId;

    const allowed = await validateAllowedRequestedUnits(reqParams, session);

    reqParams.clientIds = allowed.clientIds;
    reqParams.unitIds = allowed.unitIds;

    if (reqParams.LIMIT != null) {
        if (reqParams.SKIP == null) { reqParams.SKIP = 0; }
    }
    const calculated: { since?: number } = {};
    if (reqParams.SINCE != null) {
        if (reqParams.SINCE.length === 19) { reqParams.SINCE += '-0300'; }
        calculated.since = Math.trunc(new Date(reqParams.SINCE).getTime() / 1000);
        if (!calculated.since) { throw Error('Invalid parameter: SINCE'); }
    }

    const rows = await sqldb.ASSETS_HEALTH_HIST.getList({
        clientIds: reqParams.clientIds,
        unitIds: reqParams.unitIds,
        machineId: reqParams.groupId,
        assetId: reqParams.assetId,
        SKIP: reqParams.SKIP,
        LIMIT: reqParams.LIMIT,
        since: calculated.since,
        withDatBegMon: true,
    });

    const timezoneInfo = rows.length && await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: rows[0].UNIT_ID });

    rows.forEach(f => {
        if (f.H_DESC == 'Compressor Inoperante (L1 Virtual)') {
            f.H_DESC = 'Compressor Inoperante';
        }
    });
    

    return { list: cleanHistory(rows, timezoneInfo) }

}

const sameHealth = (a: { H_DESC: string, H_INDEX: number }, b: typeof a) => (a.H_DESC === b.H_DESC && a.H_INDEX === b.H_INDEX);

const getLaterIdsToDelete = function (
    laterEntries: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getList>>,
    entryToDelete: {
        DAT_REPORT: number;
        HEALTH_HIST_ID?: number;
        CT_ID: number;
        H_INDEX: number;
        H_DESC: string;
    }
) {
    const idsToDelete = [];
    // olhamos histórico posterior para remover saúdes "de volta online" iguais.
    for (const histEntry of laterEntries) {
        if (histEntry.H_INDEX === 2) { continue; } // offline
        if (histEntry.CT_ID === 5 && sameHealth(histEntry, entryToDelete)) {
            idsToDelete.push({
                ID: histEntry.HEALTH_HIST_ID,
                ASSOC_PCAUSES_ID: histEntry.P_CAUSES_ID,
            });
            continue; // de volta online com mesma saúde do que eu quero apagar
        }
        break; // se não for offline ou a mesma saúde de volta online, paro de checar
    }
    return idsToDelete;
}

/* healthHist é ESPERADO em ordem *inversa* de DAT_REPORT (mais recente para mais antigo) */
export const getIdsToDelete = function (
    healthHist: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getList>>,
    entryToDelete: {
        DAT_REPORT: number;
        HEALTH_HIST_ID?: number;
        CT_ID: number;
        H_INDEX: number;
        H_DESC: string;
    }
): { ID: number, ASSOC_PCAUSES_ID: number }[] {
    const mainIdx = healthHist.findIndex((v) => v.DAT_REPORT === entryToDelete.DAT_REPORT);
    if (mainIdx === -1) return [];
    const laterEntries = healthHist.slice(0, mainIdx).reverse(); // mais antigos para mais recentes 
    const earlierEntries = healthHist.slice(mainIdx + 1); // mais recentes para mais antigos
    let idsToDelete = [{ ID: healthHist[mainIdx].HEALTH_HIST_ID, ASSOC_PCAUSES_ID: healthHist[mainIdx].P_CAUSES_ID }];

    idsToDelete = idsToDelete.concat(getLaterIdsToDelete(laterEntries, entryToDelete));

    // temos que consumir até 1 entrada que seja FDD ou manual, incluindo a original a ser apagada.
    // Se a original for essa uma, nem olhamos entradas anteriores.
    if ([1, 2, 3].includes(entryToDelete.CT_ID)) {
        return idsToDelete;
    }


    for (const histEntry of earlierEntries) {
        if (histEntry.H_INDEX === 2) { continue; } // offline
        if (sameHealth(histEntry, entryToDelete)) {
            idsToDelete.push({
                ID: histEntry.HEALTH_HIST_ID,
                ASSOC_PCAUSES_ID: histEntry.P_CAUSES_ID,
            });

            if ([1, 2, 3].includes(entryToDelete.CT_ID)) {
                break; // se cheguei numa saúde "de verdade" paro de checar
            }
            continue; // mesma saúde do que eu quero apagar
        }
        break; // se não for offline ou a mesma saúde, paro de checar
    }

    return idsToDelete;

}

const getHealthFinalState = function (
    healthList: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getList>>,
    hist: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getAssetHealthHistInfo>>[number]
) {
    const idsToDelete = getIdsToDelete(healthList, hist);
    const shouldChangeHealth = healthList && healthList[0] && idsToDelete.map((x) => x.ID).includes(healthList[0].HEALTH_HIST_ID)
    const historyFinalState = healthList.filter(
        (v) => !idsToDelete.map((x) => x.ID).includes(v.HEALTH_HIST_ID)
    )
    let healthFinalState: (typeof historyFinalState)[number];
    if (shouldChangeHealth) {
        const isCurrentlyOffline = healthList && healthList[0] && healthList[0].H_INDEX === 2;
        if (isCurrentlyOffline) {
            healthFinalState = historyFinalState[0]; // elemento mais recente; delete não apaga offlines
        }
        else {
            healthFinalState = historyFinalState.find((v) => v.H_INDEX !== 2); // elemento mais recente não offline
        }
    }
    else {
        healthFinalState = historyFinalState[0];
    }
    return { healthFinalState, idsToDelete };
}

const deleteIds = async function (ids: ReturnType<typeof getIdsToDelete>, user: string) {
    let affectedRows = 0;
    for (const v of ids) {
        const id = v.ID;
        const deletionResult = await sqldb.ASSETS_HEALTH_HIST.w_deleteById({
            ID: id,
        }, user);

        affectedRows += deletionResult.affectedRows;
        v.ASSOC_PCAUSES_ID && await sqldb.P_CAUSES.w_deleteRow({ P_CAUSE_ID: v.ASSOC_PCAUSES_ID });
    }
    return affectedRows
}

const onDeleteHealthChange = async function (
    healthFinalState: ReturnType<typeof getHealthFinalState>['healthFinalState'],
    hist: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getAssetHealthHistInfo>>[number],
    user: string,
) {
    if (healthFinalState) {
        // Se for saúde atual mas não única, atualiza DAT_UNTIL da saúde que será a atual e aponta ASSETS_HEALTH para ela
        await sqldb.ASSETS_HEALTH_HIST.w_updateById({ ID: healthFinalState.HEALTH_HIST_ID, DAT_UNTIL: null }, user);
        await sqldb.ASSETS_HEALTH.w_insertOrUpdate({ ASSET_ID: hist.ASSET_ID, HEALTH_HIST_ID: healthFinalState.HEALTH_HIST_ID }, user);
    }
    else { // saúde vazia, apaga entrada de saúde
        if (hist.ASSET_HEALTH_ID) {
            await sqldb.FAULTS_DATAS.w_deleteByAssetHealthId({ ASSET_HEALTH_ID: hist.ASSET_HEALTH_ID }, user);
            await sqldb.HEALTH_BEFORE_OFFLINE.w_deleteByAssetHealthId({ ASSET_HEALTH_ID: hist.ASSET_HEALTH_ID }, user);
        }

        await sqldb.ASSETS_HEALTH.w_deleteByHealthHistId({ HEALTH_HIST_ID: hist.HEALTH_HIST_ID }, user);
    }
}

export const deleteSingleHistEntry = async (
    assetId: number,
    histEntry: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getAssetHealthHistInfo>>[number],
    userId: string
) => {
    const healthList = await sqldb.ASSETS_HEALTH_HIST.getList({
        assetId,
        withDatBegMon: true,
    });

    const { healthFinalState, idsToDelete } = getHealthFinalState(healthList, histEntry);

    const assetsHealthInfo = await sqldb.ASSETS_HEALTH.getAssetHealthByAssetId({ ASSET_ID: assetId });

    if (assetsHealthInfo.HEALTH_HIST_ID !== healthFinalState.HEALTH_HIST_ID) { 
        //saúde vai mudar
        await falhaRepApi['/new-fault']({
            dev_id: healthFinalState.DEV_ID,
            fault_id: histEntry.H_DESC,
            restab: true,
        });

        await onDeleteHealthChange(healthFinalState, histEntry, userId);
    }

    return await deleteIds(idsToDelete, userId);
}

/**
 * @swagger
 * /asset/delete-health-hist:
 *   post:
 *     summary: Apagar entradas do histórico de saúde. Pode apagar mais de uma entrada por timestamp, se houverem saúdes redundantes correspondentes a "de volta online."
 *     tags:
 *       - HEALTH 
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados das entradas a serem apagadas do histórico.
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *             healthIndex:
 *               type: number
 *               description: Índice de saúde a ser apagado
 *             itemDate:
 *               type: number
 *               description: Timestamp do item do histórico a ser apagado
 *             itemsDates:
 *               type: array
 *               items:
 *                 type: number
 *               description: Timestamps dos itens do histórico a serem apagados
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: String "DELETED " seguido do número de linhas excluídas.
 *       400:
 *         description: itemDate null e itemsDates vazio
 *       403:
 *         description: Usuário sem permissão para alterar saúde.
 *       500:
 *         description: Erro interno do servidor
 */
export const deleteHealthHist: API_External['/asset/delete-health-hist'] = async (reqParams, session) => {
    if (session.permissions.HEALTH_MANAGEMENT) { /* OK */ }
    else { throw Error('Ação não permitida para o seu usuário').HttpStatus(403); }

    if (reqParams.itemDate) { reqParams.itemsDates = [reqParams.itemDate]; }
    delete reqParams.itemDate;
    if (reqParams.itemsDates && reqParams.itemsDates.length > 0) { /* OK */ }
    else { throw Error('Nenhum item informado').HttpStatus(400); }

    const healthHistInfo = await sqldb.ASSETS_HEALTH_HIST.getAssetHealthHistInfo({ ASSET_ID: reqParams.assetId, itemDates: reqParams.itemsDates, healthIndex: reqParams.healthIndex })
    if (!healthHistInfo) throw Error('Health Hist not found').HttpStatus(400);
    if (!healthHistInfo.length) { return `DELETED 0` }
    let delInfo = {
        affectedRows: 0,
    };
    
    for (const hist of healthHistInfo) {
        delInfo.affectedRows += await deleteSingleHistEntry(
            reqParams.assetId,
            hist,
            session.user,
        )
    }
    return `DELETED ${delInfo.affectedRows}`;
}

/**
 * @swagger
 * /asset/list-enabled-faults:
 *   post:
 *     summary: Lista falhas habilitadas para um asset.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de falhas por ativação.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       description: ID da entrada de falha ativada
 *                     assetId:
 *                       type: number
 *                       description: ID do asset
 *                     dev_id:
 *                       type: string
 *                       description: ID do dispositivo associado
 *                     fault_id:
 *                       type: string
 *                       description: ID da falha
 *                     enabled:
 *                       type: boolean
 *                       description: Estado de ativação da falha
 *                     user:
 *                       type: string
 *                       description: Usuário
 *                     description:
 *                       type: string
 *                       description: Observação escrita pelo usuário
 *                     client:
 *                       type: string
 *                       description: Cliente
 *                     unit:
 *                       type: string
 *                       description: Unidade
 *                     unit_id:
 *                       type: number
 *                       description: ID da unidade
 *                     timestamp:
 *                       type: string
 *                       description: Datetime ISO8601 do enable/disable.
 *       403:
 *         description: Usuário sem permissão para alterar saúde.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetListEnabledFaults: API_External['/asset/list-enabled-faults'] = async (reqParams, session) => {
    if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Not allowed').HttpStatus(403);

    const assetInfo = await sqldb.ASSETS.getAssetInfo({ ASSET_ID: reqParams.assetId, withDev: true });

    return await falhaRepApi['/enabled-faults/list-dac']({
        dev_id: assetInfo.DEV_ID,
    }).then(({ list }) => ({
        list: list.map((val) => ({ assetId: reqParams.assetId, ...val }))
    })
    );

}

/**
 * @swagger
 * /asset/enable-faults:
 *   post:
 *     summary: Habilita uma falha para um asset.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *               required: true
 *             fault_id:
 *               type: string
 *               description: ID da falha
 *               required: true
 *             description:
 *               type: string
 *               description: Observação escrita pelo usuário
 *               required: true
 *             enabled:
 *               type: boolean
 *               description: Estado de ativação da falha
 *               required: true
 *             user:
 *               type: string
 *               description: Usuário
 *               required: true
 *             client:
 *               type: string
 *               description: Cliente
 *               required: true
 *             unit:
 *               type: string
 *               description: Unidade
 *               required: true
 *             unit_id:
 *               type: number
 *               description: ID da unidade
 *               required: true
 *       
 *     responses:
 *       200:
 *         description: Lista de falhas por ativação.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       403:
 *         description: Usuário sem permissão para alterar saúde.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetEnableFaults: API_External['/asset/enable-faults'] = async (reqParams, session) => {
    if (!session.permissions.HEALTH_MANAGEMENT) throw Error('Not allowed').HttpStatus(403);

    const assetInfo = await sqldb.ASSETS.getAssetInfo({ ASSET_ID: reqParams.assetId, withDev: true });
    return await falhaRepApi['/enabled-faults']({
        dev_id: assetInfo.DEV_ID,
        fault_id: reqParams.faultId,
        enabled: reqParams.enabled,
        description: reqParams.description,
        user: reqParams.user,
        client: reqParams.client,
        unit: reqParams.unit,
        unit_id: reqParams.unitId,
    });
}

/**
 * @swagger
 * /asset/save-observation-info:
 *   post:
 *     summary: Salva uma observação de usuário.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *               required: true
 *             observationDesc:
 *               type: string
 *               description: Observação escrita por usuário
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: String "INSERT " seguida pelo número de linhas alteradas
 *       403:
 *         description: Usuário não é instalador e não tem permissão para alterar todos os dacs.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetSaveObs: API_External['/asset/save-observation-info'] = async (reqParams, session) => {
    if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Permission denied!').HttpStatus(403)

    const saveInfo = await sqldb.ASSETS_HEALTH_OBS.w_insert({
        ASSET_ID: reqParams.assetId,
        OBS_DESC: reqParams.observationDesc || '',
        DAT_REPORT: Math.round(new Date().getTime() / 1000),
        USER_REPORT: session.user,
    }, session.user);

    return `INSERT ${saveInfo.affectedRows}`;
}


/**
 * @swagger
 * /asset/edit-observation-info:
 *   post:
 *     summary: Altera uma observação de usuário.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             observationId:
 *               type: number
 *               description: ID da observação
 *               required: true
 *             observationDesc:
 *               type: string
 *               description: Novo texto da observação escrita por usuário
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: String "UPDATE " seguida pelo número de linhas alteradas
 *       403:
 *         description: Usuário não é instalador e não tem permissão para alterar todos os dacs.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetEditObs: API_External['/asset/edit-observation-info'] = async function (reqParams, session) {
    return dac_editObservationInfo(reqParams, session);
  };

/**
 * @swagger
 * /asset/get-observation:
 *   post:
 *     summary: Obtém histórico de observações.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *               required: true
 *             SINCE:
 *               type: string
 *               description: Data ISO8601 de início da lista de histórico
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       devId:
 *                         type: string
 *                       assetId:
 *                         type: number
 *                       date:
 *                         type: string
 *                       OBS_DESC:
 *                         type: string
 *                         description: Texto da observação
 *                       userId:
 *                         type: string
 *                         description: ID de usuário
 *                       observationId:
 *                         type: string
 *                         description: ID da observação
 *       400:
 *         description: SINCE é não nulo e não é data válida 
 *       403:
 *         description: Usuário não é instalador e não tem permissão para alterar todos os dacs.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetGetObs: API_External['/asset/get-observation'] = async (reqParams, session) => {
    if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Permission denied!').HttpStatus(403)

    const calculated: { since?: number } = {};
    if (reqParams.SINCE != null) {
        if (reqParams.SINCE.length === 19) { reqParams.SINCE += '-0300'; }
        calculated.since = Math.trunc(new Date(reqParams.SINCE).getTime() / 1000);
        if (!calculated.since) { throw Error('Invalid parameter: SINCE'); }
    }

    const rows = await sqldb.ASSETS_HEALTH_OBS.getList({
        assetId: reqParams.assetId,
        SINCE: calculated.since,
    });


    const timezoneInfo = reqParams.assetId && (await sqldb.ASSETS.getAssetsList_dacsAndAssets({ assetId: reqParams.assetId, INCLUDE_INSTALLATION_UNIT: true }, { addUnownedDevs: true }))[0];

    const list = rows.map((row) => {
        return {
            devId: row.DEV_ID,
            assetId: row.ASSET_ID,
            date: timezoneInfo ? calculateDateByTimezone({ DATE: new Date(row.DAT_REPORT * 1000).toISOString(), TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET }) : new Date(row.DAT_REPORT * 1000 - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300',
            OBS_DESC: row.OBS_DESC,
            userId: row.USER_REPORT,
            observationId: row.OBS_ID
        };
    });

    return { list }
}
/**
 * @swagger
 * /asset/delete-observation:
 *   post:
 *     summary: Deleta uma observação.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             assetId:
 *               type: number
 *               description: ID do asset
 *               required: true
 *             itemDate:
 *               type: number
 *               description: Timestamp da observação a ser apagada
 *             itemsDates:
 *               type: array
 *               items:
 *                 type: number
 *               description: Timestamps das observações a serem apagadas
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: String "DELETE " seguida do número de linhas deletadas
 *       400:
 *         description: Tanto itemDate quanto itemsDates são vazios.
 *       403:
 *         description: Usuário não é instalador e não tem permissão para alterar todos os dacs.
 *       500:
 *         description: Erro interno do servidor
 */
export const assetDeleteObs: API_External['/asset/delete-observation'] = async (reqParams, session) => {
    if (!session.permissions.MANAGE_ALL_CLIENTS_AND_DACS && !session.permissions.isInstaller) throw Error('Permission denied!').HttpStatus(403)

    if (reqParams.itemDate) { reqParams.itemsDates = [reqParams.itemDate]; }
    delete reqParams.itemDate;
    if (!(reqParams.itemsDates && reqParams.itemsDates.length > 0)) { throw Error('Nenhum item informado').HttpStatus(400) };

    const delInfo = await sqldb.ASSETS_HEALTH_OBS.w_deleteByAssetId({
        ASSET_ID: reqParams.assetId,
        itemsDates: reqParams.itemsDates,
    }, session.user);


    return `DELETED ${delInfo.affectedRows}`;
}

export async function saveFaultsData(
    DEV_ID: string,
    ASSET_ID: number,
    faultsActs: FaultsActs,
    userId: string
) {
    const assetInfo = await sqldb.ASSETS_HEALTH.getAssetHealthByAssetId({ ASSET_ID });
    if (!assetInfo) throw Error('Asset Health not found').HttpStatus(400);
  
    const result = await sqldb.FAULTS_DATAS.w_insertOrUpdate({ ASSET_HEALTH_ID: assetInfo.ASSET_HEALTH_ID, DATA: JSON.stringify(faultsActs) }, userId)
    ramCaches.DEVACS.setDacFActs(DEV_ID, faultsActs);
    return result;
}

/**
 * @swagger
 * /dev/get-faults:
 *   post:
 *     summary: Recupera as informações de falhas detectadas dentro do limite de tempo de 14 dias.
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             clientId:
 *               type: number
 *               description: ID do cliente
 *               required: false
 *             clientIds:
 *               type: array
 *               description: IDs do cliente
 *               required: false
 *               items:
 *                 type: number
 *             devId:
 *               type: string
 *               description: ID do dispositivo a recuperar
 *             devType:
 *               type: string
 *               description: Tipo de dispositivo (dac / dut) para o qual recuperar dados
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             properties:
 *               list:
 *                 type: object
 *                 description: Lista de objetos com dados de ativos com falhas detectadas
 *               expirationLimit:
 *                 type: number
 *                 description: Timestamp do limite de tempo depois do qual retornamos falhas. Padrão 14 dias no passado.
 *       400:
 *         description: Tanto itemDate quanto itemsDates são vazios.
 *       403:
 *         description: Usuário não é instalador e não tem permissão para alterar todos os dacs.
 *       500:
 *         description: Erro interno do servidor
 */
export const getDevsFaults: API_External['/dev/get-faults'] = async function (reqParams, session) {
    if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
    delete reqParams.clientId;
  
    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
    else { throw Error('Not allowed').HttpStatus(403) }
  
    const admPars: Parameters<typeof sqldb.ASSETS_HEALTH.getAssetsListHealth>[1] = {
      withClientData: true,
      deviceType: reqParams.devType,
    }
    const qPars: Parameters<typeof sqldb.ASSETS_HEALTH.getAssetsListHealth>[0] = {}
    const limitDays = Date.now() - 14 * 24 * 60 * 60 * 1000; // 14 dias, duas semanas
    const limit24h = Date.now() - 24 * 60 * 60 * 1000; // 24 horas, um dia
    const rows = await sqldb.ASSETS_HEALTH.getAssetsListHealth(qPars, admPars)
    const knownFaults = await faultDetection.getKnownFaults();
    const { list: detectedFaults } = await faultDetection.getAllDetectedFaults();
  
    let ids = [];
    ids.push(...rows.map((x) => x.DEV_ID).filter((x) => !!x));
  
    let value = await falhaRepApi['/detected-faults/list-dacs']({
      dacs_id: ids,
    });

    return buildFaultsList(
        rows,
        knownFaults,
        detectedFaults,
        value['list'],
        limit24h,
        limitDays,
    );
  }

export function buildFaultsList(
  deviceData: {
    H_INDEX: number
    H_DESC?: string
    FAULTS_DATA?: string
    H_OFFL?: string
    UNIT_ID: number
    CLIENT_ID: number
    DEV_ID: string
    UNIT_NAME?: string
    CLIENT_NAME?: string
  }[],
  knownFaults: Awaited<ReturnType<typeof faultDetection.getKnownFaults>>,
  detectedFaults: Awaited<ReturnType<typeof faultDetection.getAllDetectedFaults>>['list'],
  cleanedFaults: Awaited<ReturnType<typeof falhaRepApi['/detected-faults/list-dacs']>>['list'],
  immediateTimeLimit: number,
  maxTimeLimit: number,
) {
    const list = [];
    for (const regDevRaw of deviceData) {
        const dacFaults = detectedFaults.find((x) => x.dev_id === regDevRaw.DEV_ID);
        const fdetect = dacFaults && dacFaults.faults;
        if (!fdetect) { continue; }
    
        const regDev = {
          DEV_ID: regDevRaw.DEV_ID,
          UNIT_ID: regDevRaw.UNIT_ID,
          UNIT_NAME: regDevRaw.UNIT_NAME,
          H_INDEX: regDevRaw.H_INDEX,
          H_DESC: regDevRaw.H_DESC,
          CLIENT_NAME: regDevRaw.CLIENT_NAME,
          CLIENT_ID: regDevRaw.CLIENT_ID,
          fdetected: {} as {
            [id: string]: {
              id: string
              faultName: string
              origin: string
              faultLevel: number
              lastActionTime: number
              lastAction: FaultsActs[string]['lastAction']
              lastDet: number
              lastRiseTS: string
              firstRiseTS: string
            }
          },
        };
    
        const faultsActs = (regDevRaw.FAULTS_DATA && jsonTryParse<FaultsActs>(regDevRaw.FAULTS_DATA)) || {};
    
        regDev.fdetected = buildFdetected(
            regDev.DEV_ID,
            fdetect,
            knownFaults,
            cleanedFaults,
            faultsActs,
            immediateTimeLimit,
            maxTimeLimit,
        );
        if (!Object.keys(regDev.fdetected).length) {
          continue;
        }
    
        if (regDev.H_INDEX == null) {
          regDev.H_DESC = 'Sem informação'
        }
    
        list.push(regDev);
      }
    
      return { list, expirationLimit: maxTimeLimit }
}

function buildFdetected(
  devId: string,
  faultTypes: {
    fault_id: string;
    first_det: number;
    last_det: number;
    last_restab: number;
  }[],
  knownFaults: {
    [faultId: string]: BaseFaultData;
  },
  cleanedFaults: [{
    dac_id: string;
    fault: string;
    first_detected: string;
    last_detected: string;
  }],
  faultsActs: FaultsActs,
  immediateTimeLimit: number,
  maxTimeLimit: number,
) {
    const fdetected: ReturnType<typeof buildFaultsList>['list'][number]['fdetected'] = {};
    for (const faultType of faultTypes) {
        // Se a última ação tiver sido ha menos de 24h
        const faultActs = faultsActs[faultType.fault_id] ?? {};
        if ((faultActs?.lastActionTime > immediateTimeLimit)
            && (faultActs?.lastAction === 'ERASED')
        ) {
          continue;
        }
  
        if ((faultType?.last_det > maxTimeLimit)
            || (faultActs?.lastActionTime > maxTimeLimit)
            || (faultActs?.lastRiseTS > maxTimeLimit)
            || (faultActs?.lastAdmMessage > maxTimeLimit)
            || ['RESTAB_PENDING', 'RESTAB_WAITING'].includes(faultActs.lastAction)
        ) {
          const origin = 'Repentina V2';
          const faultInfo = knownFaults[faultType.fault_id];
  
          const dac = cleanedFaults.find((x) => x.fault === faultType.fault_id && x.dac_id === devId);
  
          if (dac) {
            fdetected[faultType.fault_id] = {
              id: faultType.fault_id,
              faultName: faultInfo?.faultName,
              origin: origin,
              faultLevel: faultInfo?.faultLevel,
              lastActionTime: faultActs.lastActionTime,
              lastAction: faultActs.lastAction,
              lastDet: faultType.last_det,
              lastRiseTS: dac.last_detected,
              firstRiseTS: dac.first_detected,
            };
          } else {
            continue;
          }
        }
      }
      return fdetected;
}

import { BaseFaultData, DetectedFaultInfo, FaultsActs, ChangeType } from '../srcCommon/types'

import * as assetHealth from './assetHealth'
import * as dacHealth from './dacHealth'
import * as ramCaches from './ramCaches'
import sqldb from '../srcCommon/db'
import falhaRepApi from './extServices/falhaRep'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import changeHealth from '../srcCommon/helpers/changeHealth'
import { logger } from '../srcCommon/helpers/logger';
import { healthIndexes, falhaAssociadaAoLaudo } from '../srcCommon/helpers/healthTypes'

export type FaultApprovalState = FaultsActs[string]['lastAction'];

let checkingFaultAction = [] as [string, string][];
export async function checkFault(faultInfo: DetectedFaultInfo, devId: string, userId: string) {
  const faultId = faultInfo.faultId;
  if (checkingFaultAction.some(([c_devId, c_faultId]) => (c_devId === devId && c_faultId === faultId))) {
    return;
  }
  let shouldRecheck = true;
  const ftsData = ramCaches.DEVACS.tryGetDacFActs(devId);
  if (ftsData && ftsData[faultId]) {
    const faultData = ftsData[faultId];
    if (faultData.approved || (faultData.noNotifUntil && faultData.noNotifUntil > Date.now())) {
      shouldRecheck = false;
    }
  }
  if (faultInfo.rise || faultInfo.restab || shouldRecheck) {
    let reason: null|Parameters<typeof takeFaultAction>[2] = null;
    if (faultInfo.restab) {
      reason = "restab";
    }
    else if (faultInfo.rise) {
      reason = "rise";
    }
    else if (shouldRecheck) {
      reason = "recheck";
    }
    // Queremos apagar faultStats.checkingFaultAction sempre que terminarmos o processamento
    checkingFaultAction.push([devId, faultId])
    await takeFaultAction(devId, faultInfo, reason, userId)
      .finally(() => {
        checkingFaultAction = checkingFaultAction.filter(([c_devId, c_faultId]) => !(c_devId === devId && c_faultId === faultId));
      });
  }
}

export async function takeAssetFaultAction(
  devInfo: Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH.getAssetHealthStatus>>,
  faultInfo: DetectedFaultInfo,
  reason: null | 'rise' | 'recheck' | 'restab' ,
  userId: string
) {
  try {
      const assetId = devInfo.ASSET_ID;
      const [knownFaults, { list: fdetect }] = await Promise.all([getKnownFaults(), getDevDetectedFaults(devInfo.DEV_ID)]).catch((err) => {
      logger.error(`Error get asset detected Faults: ${err} - user: ${userId} - assetId: ${assetId} faultInfo: ${JSON.stringify(faultInfo)} reason: ${reason}`);
      throw Error('Error get asset detected Faults').HttpStatus(400);
    });

    let faultsActs = cleanFaultsActs(
      (devInfo.FAULTS_DATA && jsonTryParse<FaultsActs>(devInfo.FAULTS_DATA)) || {},
      knownFaults
    );
    const application = `${devInfo.ASSET_ROLE}-${devInfo.DEV_ID.substring(0,3)}`
      
    const currFault = findFaultByDesc(devInfo.H_DESC, devInfo.H_INDEX, application);
    faultsActs = setCurrentFaultToCorrectState(currFault, faultsActs);
      
    /*  
    Se nunca encontramos essa falha antes, inicializa os tempos de detecção.
    Caso ocorra da primeira notificação de falha não ter rise=true, esses tempos não seriam inicializados.
    Essa flag rise perdeu muito significado desde o início do falhas;
    atualmente, ela só serve para impedir que essas datas sejam atualizadas a cada notificação.
    Caso a primeira notificação da falha seja um restabelecimento,
    confiamos que dacHealth.setDacHealthStatus filtrará corretamente qualquer setting para a mesma saúde que a atual.
    */
   let faultActs = faultsActs[faultInfo.faultId];
   let previousAction = faultActs?.lastAction;
   if (!faultActs) {
      faultsActs[faultInfo.faultId] = {
        firstRiseTS: Date.now(),
        lastRiseTS: Date.now(),
        lastAction: 'PENDING',
      };
      faultActs = faultsActs[faultInfo.faultId];
   }
    
    
    // estado anterior para pendente era undefined, portanto vai atualizando conforme encontra
    if (!previousAction) {
      faultActs.lastAction = 'PENDING';
    }
    
    if (reason === 'rise') {
      faultActs.lastRiseTS = Date.now();
      if (!faultActs.firstRiseTS) faultActs.firstRiseTS = Date.now();
    }
    
    const actionToApply = (reason === 'restab') ? 'restab' : 'fault';
    
    let autoApprove = faultInfo.autoApprove && (faultInfo.faultId !== currFault?.faultId || (devInfo.H_TYPECHANGE !== 'Manual' || actionToApply === 'fault'))
    
    const nextState = getNextFaultState(faultsActs, faultInfo.faultId, actionToApply, autoApprove);
    
    await performFaultFeedback(devInfo.DEV_ID, faultInfo.faultId, nextState);
    
    if (previousAction !== nextState) { // se o estado muda, salva o novo estado de falha
      const currHealthPars = {
        H_DESC: devInfo.H_DESC,
        H_INDEX: devInfo.H_INDEX,
        faultId: currFault?.faultId,
        H_DATE: devInfo.H_DAT_REPORT,
        H_TYPECHANGE: devInfo.H_TYPECHANGE
      };
      faultActs.lastAction = nextState;
      faultActs.lastActionTime = Date.now();
      const newFaultsActs = cleanFaultsActs(faultsActs, knownFaults);
      
      if (nextState === 'RESTABLISHED' || nextState === 'APPROVED') {
        await performHealthChangeActions(
          devInfo,
          faultsActs,
          knownFaults,
          fdetect,
          currHealthPars
        );
      }
      await assetHealth.saveFaultsData(devInfo.DEV_ID, devInfo.ASSET_ID, newFaultsActs, userId); // sempre salva o novo faultsActs
    }
  } catch (err) {
    logger.error({
      message: "Erro genérico ao processar falha",
      error: err,
      stack: (err as Error).stack,
      device: {
        devId: devInfo?.DEV_ID,
        detectedFaultId: faultInfo?.faultId,
        currentHDesc: devInfo?.H_DESC,
        currentHIndex: devInfo?.H_INDEX, 
      }
    });
    throw Error(`Erro, params: ${faultInfo.faultId} ${devInfo.ASSET_ID} ${devInfo.H_DESC} ${devInfo.H_INDEX}`).HttpStatus(400);
  }
}

function setCurrentFaultToCorrectState(
  currFault: ReturnType<typeof findFaultByDesc>,
  faultsActs: ReturnType<typeof cleanFaultsActs>
) {    
  // se o estado atual corresponder a uma falha mas ela não estiver marcada como aprovada, marque
  // não marca se estado atual estiver esperando restabelecimento
  if (currFault) {
    if (!(faultsActs[currFault.faultId]?.lastAction) || ['PENDING', 'REJECTED', 'ERASED', 'RESTABLISHED'].includes(faultsActs[currFault.faultId]?.lastAction))
    faultsActs[currFault.faultId] = Object.assign(
    faultsActs[currFault.faultId] || {},
    { lastAction: 'APPROVED', lastActionTime: Date.now() }
    );
  }

  return faultsActs;
}

export async function takeFaultAction(devId: string, faultInfo: DetectedFaultInfo, reason: null | 'rise' | 'recheck' | 'restab', userId: string) {
  let devInfo;
  try {
    const asset = await sqldb.ASSETS.getAssetByDeviceCode({ DEVICE_CODE: devId });
    if (asset) devInfo = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ ASSET_ID: asset.ASSET_ID });
  }
  catch (err) {
    logger.error(err);
    throw Error(`Failed getting device ${devId} info for fault ${faultInfo.faultId} analysis`).HttpStatus(400);
  }
  if (!devInfo) {
    throw Error(`Didn't find device ${devId} info for fault ${faultInfo.faultId} analysis`).HttpStatus(400);
  }

  await takeAssetFaultAction(devInfo, faultInfo, reason, userId);
}

export async function getKnownFaults() {
  const response = await falhaRepApi['/definitions-fault']();
  const knownFaults: {
    [faultId: string]: BaseFaultData
  } = {};
  for (const def of response.defs) {
    knownFaults[def.fault_id] = {
      faultId: def.fault_id,
      faultName: def.name,
      faultLevel: changeHealth(def.gravity)
    }
  }
  return knownFaults;
}

export async function getAllDetectedFaults() {
  return falhaRepApi['/detected-faults']();
}

export async function getDevDetectedFaults(dac_id: string) {
  return falhaRepApi['/detected-faults/dev']({ dev_id: dac_id });
}

export function cleanFaultsActs(
  faultsActs: FaultsActs,
  knownFaults: {[faultId: string]: BaseFaultData},
) {
  // limpando faultsActs de falhas antigas ou outros erros
  // Limpa também faultActs que têm "lastAction" e não têm lastActionTime. Isso é um erro.
  let newFaultsActs = Object.fromEntries(
    Object.entries(faultsActs)
      .filter(([id, fa]) => !!knownFaults[id] && (!fa.lastAction || fa.lastActionTime))
  );
  const hasPendingFaults = Object.values(newFaultsActs).some((f) => !f.lastAction || f.lastAction === 'PENDING');
  const hasApprovedFaults = Object.values(newFaultsActs).some((f) => f.lastAction === 'APPROVED');

  // se não tem mais falhas pendentes, restabelece os SRs que estavam esperando resolução de falhas pendentes.
  // mesma coisa se há alguma falha aprovada.
  // em ambos os casos, sabemos que podemos restabelecer as falhas esperando pois sabemos que haverá uma saúde correta.
  if (!hasPendingFaults || hasApprovedFaults) {
    Object.values(newFaultsActs)
      .filter((fa) => fa.lastAction === 'RESTAB_WAITING')
      .forEach((fa) => {
        fa.lastAction = 'RESTABLISHED'
        fa.lastActionTime = Date.now()
      });
  }
  return newFaultsActs;
}

export function getNextFaultState(
  currentFaultsState: FaultsActs,
  faultId: string,
  actionToApply: 'fault' | 'restab',
  autoApprove: boolean,
): FaultApprovalState {
  const currentState = currentFaultsState[faultId] && currentFaultsState[faultId].lastAction;
  
  // após discussão, falhas reprovadas/apagadas voltam para 'PENDING' na próxima detecção
  if (actionToApply === 'fault') {
    return (autoApprove) ? 'APPROVED' : 'PENDING';
  }

  if (currentState === 'REJECTED' || currentState === 'ERASED') {
    return currentState;
  }

  if (currentState ==='APPROVED' || currentState === 'RESTAB_WAITING') {
    const anyPendingFaults = Object.values(currentFaultsState).some((fa) => !fa.lastAction || fa.lastAction === 'PENDING');
    const anyOtherApprovedFaults = Object.entries(currentFaultsState).some(([id, fa]) => (fa.lastAction === 'APPROVED' && id !== faultId));
    if (anyPendingFaults && !anyOtherApprovedFaults) {
      // iria para verde mas existem falhas pendentes
      return (autoApprove) ? 'RESTAB_PENDING' : 'RESTAB_WAITING';
    }
  }
  
  // casos restantes: restabelecer falhas PENDING / RESTAB_PENDING / RESTABLISHED
  // ou restabelecer falhas APPROVED / RESTAB_WAITING sem outras falhas pendentes e/ou com outras falhas aprovadas
  return (autoApprove) ? 'RESTABLISHED' : 'RESTAB_PENDING'
}

async function performHealthChangeActions(
  deviceData: {
    DEV_ID: string,
    ASSET_ID: number,
    UNIT_ID: number,
    CLIENT_ID: number,
    MACHINE_ID: number,
    ASSET_ROLE: string
  },
  faultsActs: FaultsActs,
  knownFaults: {[faultId: string]: BaseFaultData},
  fdetect: { fault_id: string; last_det: number; }[],
  currentHealth: { H_DESC: string, H_INDEX: number, faultId?: string, H_DATE: number, H_TYPECHANGE: string }
) {
  const nextHealth = dacHealth.calculateHealth(faultsActs, knownFaults, fdetect, currentHealth);
  const laudo = nextHealth.laudo; 
  const indexInfo = healthIndexes[String(nextHealth.H_INDEX)];
  if (!indexInfo) throw Error('Invalid health index').HttpStatus(500);
  await dacHealth.setAssetHealthStatus({...deviceData, ...currentHealth}, {
    H_INDEX: nextHealth.H_INDEX,
    P_CAUSES: (laudo && laudo.pcauses && laudo.pcauses.join(',')) || null,
    H_DESC: (laudo && laudo.text) || indexInfo.laudo,
    CT_ID: ChangeType.FDD,
    userId: '[SYSTEM]',
  });
}

export async function performFaultFeedback(dacId:string, faultId: string, state: FaultApprovalState) {
  try {
    let responseState: "APPROVED" | "REJECTED";
    let notifType: "DETECT"|"RESTAB" = "DETECT";
    if (state === 'APPROVED' || state === 'RESTAB_WAITING') {
      responseState = "APPROVED";
    }
    else if (state === 'RESTABLISHED') {
      responseState = "APPROVED";
      notifType = "RESTAB";
    }
    else if (state === 'REJECTED' || state === 'ERASED') {
      responseState = "REJECTED";
    }
  
    if (responseState) {
      await falhaRepApi['/fault-feedback']({
        dev_id: dacId,
        fault_id: faultId,
        state: responseState,
        notif_type: notifType,
        update_first_detect: false,
      });
    }
  } catch (err) {
    logger.error(err);
  }
}

function findFaultByDesc(h_desc: string, h_index: number, application?: string): typeof falhaAssociadaAoLaudo[number] {
  return falhaAssociadaAoLaudo.find((falha) => {
    if (falha.laudo !== h_desc) return false;
    if (falha.healthIndex != null && falha.healthIndex !== h_index) return false;
    if (falha.application != null && falha.application !== application) return false;
    return true;
  });
}
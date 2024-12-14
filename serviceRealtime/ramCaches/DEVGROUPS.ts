import * as automationRefsLoader from '../../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'

// TAG: RAM-CACHE DEVGROUPS
let groupDams: {
  [groupId: string]: string
} = {};
let dutDamsRef: {
  [dutId: string]: {
    damId: string
    canSelfReference: boolean
  }[]
} = {};
let damDutsRef: {
  [damId: string]: string[]
} = {};
let damGroupsRef: {
  [damId: string]: number[]
} = {};
export function tryGetGroupDam (groupId: number) {
  if (!groupId) return null;
  return groupDams[groupId.toString()];
}
export function setGroupDam (reqParams: { machineId: number, DEV_AUT: string }) {
  const { machineId, DEV_AUT } = reqParams;
  if (machineId != null) groupDams[machineId.toString()] = DEV_AUT;
}
export function deleteGroupDam (reqParams: { machineId: number }) {
  const { machineId } = reqParams;
  if (machineId != null) delete groupDams[machineId.toString()];
}
export function tryGetDutDamsRef (dutId: string) {
  return dutDamsRef[dutId];
}
export function tryGetDamDutsRef (damId: string) {
  return damDutsRef[damId];
}
export function tryGetDamGroupsRef (damId: string) {
  return damGroupsRef[damId];
}

export async function loadAutomationRefs (reqParams?: {}) { // TODO: recarregar quando houver alteração no BD
  const response = await automationRefsLoader.loadAutomationRefs({});
  groupDams = response.groupDams;
  dutDamsRef = response.dutDamsRef;
  damDutsRef = response.damDutsRef;
  damGroupsRef = response.damGroupsRef;
}

function getDutsRelatedDams (dutIds: string[]) {
  const list: {damId: string, canSelfReference: boolean }[] = [];
  const listIds: string[] = [];
  for (const dutId of dutIds) {
    if (!dutDamsRef[dutId]) continue;
    for (const dam of dutDamsRef[dutId]) {
      if (listIds.includes(dam.damId)) continue;
      list.push(dam);
      listIds.push(dam.damId);
    }
  }
  return list;
}

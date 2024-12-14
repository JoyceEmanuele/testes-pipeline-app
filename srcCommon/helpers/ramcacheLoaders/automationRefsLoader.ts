import sqldb from '../../db'

export async function loadAutomationRefs(filter: {
  clientIds?: number[]
  unitIds?: number[]; 
}) {
  const list = await sqldb.MACHINES.getMachinesDamDacAutInfo({
    CLIENT_IDS: filter.clientIds,
    unitIds: filter.unitIds,
  });

  const groupDams: {
    [groupId: string]: string
  } = {};
  const dutDamsRef: {
    [dutId: string]: {
      damId: string
      canSelfReference: boolean
    }[]
  } = {};
  const damDutsRef: {
    [damId: string]: string[]
  } = {};
  const damGroupsRef: {
    [damId: string]: number[]
  } = {};

  for (const row of list) {
    if (row.DAM_SELF_REFERENCE !== 0) continue;
    if (!row.MACHINE_ID) continue;
    if (row.DEV_AUT.startsWith('DAM') || row.DEV_AUT.startsWith('DAC')) {
      groupDams[row.MACHINE_ID.toString()] = row.DEV_AUT;
      if (!damGroupsRef[row.DEV_AUT]) damGroupsRef[row.DEV_AUT] = [];
      if (!damGroupsRef[row.DEV_AUT].includes(row.MACHINE_ID)) damGroupsRef[row.DEV_AUT].push(row.MACHINE_ID);
      if (row.DUT_ID) {
        if (!dutDamsRef[row.DUT_ID]) dutDamsRef[row.DUT_ID] = [];
        if (!dutDamsRef[row.DUT_ID].some((item) => item.damId === row.DEV_AUT && item.canSelfReference === !!row.CAN_SELF_REFERENCE)) dutDamsRef[row.DUT_ID].push({damId: row.DEV_AUT, canSelfReference: !!row.CAN_SELF_REFERENCE});
        if (!damDutsRef[row.DEV_AUT]) damDutsRef[row.DEV_AUT] = [];
        if (!damDutsRef[row.DEV_AUT].includes(row.DUT_ID)) damDutsRef[row.DEV_AUT].push(row.DUT_ID);
      }
    }
  }

  return { groupDams, dutDamsRef, damDutsRef, damGroupsRef };
}

/* Carrega do banco e retorna os DUTs usados como referência por um DAM */
export async function getDutsUsedAsRefByDam(damId: string, clientId: number, unitId: number) {
  if (!damId) return undefined;

  const { damDutsRef } = await loadAutomationRefs({
    clientIds: clientId ? [clientId] : undefined,
    unitIds: unitId ? [unitId] : undefined,
  });

  return damDutsRef[damId];
}

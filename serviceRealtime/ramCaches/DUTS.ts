import sqldb from '../../srcCommon/db'

// TAG: RAM-CACHE DUTS
let dutRoomType: {
  [dutId: string]: {
    rTypeId: number
    vars?: string //monitored vars
  }
} = {};
export function tryGetDutRTypeId (dutId: string) {
  return dutRoomType[dutId] && dutRoomType[dutId].rTypeId;
}

export function tryGetDutRoomPars(dutId: string) {
  return dutRoomType[dutId]
}

export function deleteDutRoomPars(reqParams: { dutId: string }) {
  const { dutId } = reqParams;
  return delete dutRoomType[dutId];
}

export function tryGetDutVars(dutId: string) {
  return dutRoomType[dutId] && dutRoomType[dutId].vars;
}

export function setDutRTypeId(reqParams: { devId: string, RTYPE_ID: number }) {
  const { devId, RTYPE_ID } = reqParams;
  if (dutRoomType[devId]) dutRoomType[devId].rTypeId = RTYPE_ID;
  else dutRoomType[devId] = { rTypeId: RTYPE_ID };
}

export function setDutRoomPars(reqParams: { DEV_ID: string, RTYPE_ID: number, VARS: string }) {
  const { DEV_ID, RTYPE_ID, VARS } = reqParams;
  dutRoomType[DEV_ID] = { rTypeId: RTYPE_ID, vars: VARS };
}

export async function loadDutRoomTypes (reqParams?: {}) { // TODO: recarregar quando houver alteração no BD
  const list = await sqldb.DUTS.getListBasic({}, {});
  dutRoomType = {};
  for (const row of list) {
    dutRoomType[row.DEV_ID] = {rTypeId : row.RTYPE_ID, vars : row.VARS};
  }
}

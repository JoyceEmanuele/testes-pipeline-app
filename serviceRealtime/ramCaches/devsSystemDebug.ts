import { API_Internal } from '../api-internal';
import { DevDebugSystemInfo } from '../../srcCommon/types/devicesMessages';

let devsSystemInfo: {
  [devId: string]: DevDebugSystemInfo
} = {};
export function receivedDevSysDebug (devId: string, payload: DevDebugSystemInfo): void {
  if (!devId) return;
  devsSystemInfo[devId] = payload;
}
export function tryGetDevSysDebug (devId: string) {
  return (devId && devsSystemInfo[devId]) || null;
}

export const getDevsSystemInfo: API_Internal['/diel-internal/realtime/getDevsSystemInfo'] = async function (reqParams) {
  if (!reqParams.devIds) {
    return { devsSystemInfo };
  }
  const filtered: typeof devsSystemInfo = {};
  for (const devId of reqParams.devIds) {
    filtered[devId] = devsSystemInfo[devId];
  }
  return { devsSystemInfo: filtered };
}

import { API_Internal } from '../api-internal';
import { loadDrisCfg } from '../ramCaches/dbRamCache'

export const triggerLoadDrisCfg: API_Internal['/diel-internal/serviceDriAutomation/triggerLoadDrisCfg'] = async function (reqParams) {
  await loadDrisCfg();
  return {};
}

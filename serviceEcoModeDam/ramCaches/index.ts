import { API_Internal } from '../api-internal';
import { loadDamsEcoCfg } from '../ramCaches/dbRamCache'

export const triggerLoadDamsCfg: API_Internal['/diel-internal/serviceEcoModeDam/triggerLoadDamsCfg'] = async function (reqParams) {
  await loadDamsEcoCfg();
  return {};
}

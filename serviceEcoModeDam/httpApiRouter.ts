import * as expressApiCreator from '../srcCommon/helpers/network/expressApiCreator';
import { serviceName } from "./configs";
import { API_Internal } from "./api-internal";
import * as ecoModeTools from './realTime/ecoModeTools';
import * as ramCaches from './ramCaches';

const internalRoutes: API_Internal = {
  ['/diel-internal/serviceEcoModeDam/get_damEcoMonitor']: ecoModeTools.get_damEcoMonitor,
  ['/diel-internal/serviceEcoModeDam/debug_dam_ecomode']: ecoModeTools.debug_dam_ecomode,
  ['/diel-internal/serviceEcoModeDam/triggerLoadDamsCfg']: ramCaches.triggerLoadDamsCfg,
};

export function createInternalApi() {
  return expressApiCreator.createInternalApi(serviceName, internalRoutes);
}

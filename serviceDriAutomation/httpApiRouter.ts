import * as expressApiCreator from '../srcCommon/helpers/network/expressApiCreator';
import { serviceName } from "./configs";
import { API_Internal } from "./api-internal";
import * as ramCaches from './ramCaches';

const internalRoutes: API_Internal = {
  ['/diel-internal/serviceDriAutomation/triggerLoadDrisCfg']: ramCaches.triggerLoadDrisCfg,
};

export function createInternalApi() {
  return expressApiCreator.createInternalApi(serviceName, internalRoutes);
}

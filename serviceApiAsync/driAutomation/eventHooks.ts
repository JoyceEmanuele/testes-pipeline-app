import * as dielServices from '../../srcCommon/dielServices';

export const ramCaches_DRIS_loadDrisCfg = function () {
  return dielServices.driAutomationInternalApi('/diel-internal/serviceDriAutomation/triggerLoadDrisCfg', {});
};

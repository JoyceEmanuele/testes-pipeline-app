import * as dielServices from '../../srcCommon/dielServices';

export const ramCaches_DAMS_loadDamsEcoCfg = function () {
  return dielServices.ecoModeDamInternalApi('/diel-internal/serviceEcoModeDam/triggerLoadDamsCfg', {});
};
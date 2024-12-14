import * as drisCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import type { DriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
export type { DriConfig };

// TAG: RAM-CACHE DRIS
let drisCfg: {
  [driId: string]: DriConfig
} = {};
export function getCachedDriCfgList() {
  return drisCfg;
}

export function tryGetDriCfg(driId: string) {
  return drisCfg[driId];
}

// TAG: RAM-CACHE DRIS
let dutDrisRef: {
  [dutId: string]: string[]
} = {};

export function tryGetDutDrisRef(dutId: string) {
  return dutDrisRef[dutId];
}

export async function loadDrisCfg(reqParams?: {}) {
  const response = await drisCfgLoader.loadDrisCfg();
  drisCfg = response.drisCfg;
  dutDrisRef = response.dutDrisRef;
}

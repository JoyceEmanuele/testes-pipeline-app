import { DacHwCfg } from '../../srcCommon/types'
import sqldb from '../../srcCommon/db'
import * as dacData from '../../srcCommon/helpers/dacData'

// TAG: RAM-CACHE DEVACS
let dacDbInfo: {
  [dacId: string]: {
    GROUP_ID: number
    hwCfg: DacHwCfg
  }
} = {};
export function tryGetDacInfo (dacId: string) {
  return dacDbInfo[dacId];
}
export async function loadDacsDbInfo () { // TODO: recarregar quando houver alteração no BD
  const rows = await sqldb.DACS_DEVICES.getExtraInfoList({}, { addUnownedDevs: true });
  dacDbInfo = {};
  for (const row of rows) {
    dacDbInfo[row.DAC_ID] = {
      GROUP_ID: row.GROUP_ID,
      hwCfg: dacData.dacHwCfg(row.DAC_ID, row),
    }
  }
}
export async function loadDacDbInfo (reqParams: { dacId: string }) { // TODO: recarregar quando houver alteração no BD
  const { dacId } = reqParams;
  const row = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: dacId });
  dacDbInfo[row.DAC_ID] = {
    GROUP_ID: row.GROUP_ID,
    hwCfg: dacData.dacHwCfg(row.DAC_ID, row),
  }
}

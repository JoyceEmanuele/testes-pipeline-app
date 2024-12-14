import sqldb from '../../srcCommon/db';
import * as dacData from '../../srcCommon/helpers/dacData';
import { loadDrisCfgFormulas } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { DacHwCfg } from '../../srcCommon/types';
import { API_Internal } from '../api-internal';

const buildDacsListUpdates = (dacsList: Awaited<ReturnType<typeof sqldb.DACS_DEVICES.getExtraInfoList>>) => {
  const listUpdates = [] as (
    DacHwCfg
    & { DAC_ID: string, T0_T1_T2: [string, string, string], virtualL1: boolean, L1CalcCfg: { psucOffset: number }, P0mult: number, P1mult: number})[];
  for (const row of dacsList) {
    const hwCfg = dacData.dacHwCfg(row.DAC_ID, row);
    const dacCfg: (typeof listUpdates)[number] = Object.assign({
      DAC_ID: row.DAC_ID,
      T0_T1_T2: (hwCfg.TsensRename || null)
        && [hwCfg.TsensRename.T0, hwCfg.TsensRename.T1, hwCfg.TsensRename.T2] as [string, string, string] | null,
      virtualL1: hwCfg.simulateL1,
      L1CalcCfg: hwCfg.L1CalcCfg ?? { psucOffset: 0.0 },
      P0mult: hwCfg.P0multLin,
      P1mult: hwCfg.P1multLin,      
    }, hwCfg);
    listUpdates.push(dacCfg);
  }
  return listUpdates;
}

/** Cria a lista de configurações de dispositivo que o iotrelay precisa para processar as telemetrias */
export const getDevsCfg: API_Internal['/diel-internal/bgtasks/getDevsCfg'] = async function (reqParams) {
  const { last_update_token } = reqParams;
  const removed = [] as string[];
  
  // DACs
  const dacsList = await sqldb.DACS_DEVICES.getExtraInfoList({}, {});
  const dacsListUpdates = buildDacsListUpdates(dacsList);

  // DUTs
  const dutsWithOffset = await sqldb.DUTS.getListBasic({withOffset: true}, {});
  const listDutsOffsets = dutsWithOffset.map(dut => ({DUT_ID: dut.DEV_ID, TEMPERATURE_OFFSET: dut.TEMPERATURE_OFFSET}));
  
  // DRIs
  const drisFormulas = await loadDrisCfgFormulas();
  const listDrisCfgFormulas = [] as { DRI_ID: string, FORMULAS: {} }[];
  for (const [driId, formulas] of drisFormulas) {
    if (!formulas) continue;
    listDrisCfgFormulas.push({ DRI_ID: driId, FORMULAS: formulas });
  }

  return {
    dacs: dacsListUpdates,
    duts: listDutsOffsets,
    dris: listDrisCfgFormulas,
    removed,
  };
}

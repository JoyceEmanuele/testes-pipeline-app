import sqldb from '../../db'
import jsonTryParse from '../jsonTryParse';
import { logger } from '../logger';
import { DriVarsConfig } from '../../types';

export interface DriConfig {
  application: string
  protocol: string
  TIMEZONE_ID?: number,
  CURRFW_VERS?: string,
  machines?: {
    id: number
    vars: { name: string }[]
  }[],
  varsList?: { address?: {}, name: string, inputRow?: any, value?: string }[],
  w_varsList?: {
    name: string,
    address: {
      protocol?: string
      machine?: number
      ip?: string
      id?: number
      function?: number
      address?: number
      values?: number[],
    },
  }[],
  driConfigs?: { 
    protocol?: string
    value: string | number;
  }[],
  driScheds?: {
    SCHED_ID: number;
    DRI_ID: string;
    ACTIVE: string;
    OPERATION: string;
    BEGIN_TIME: string;
    END_TIME: string;
    MODE: string;
    DAYS: string;
    SETPOINT: number;
    EXCEPTION_DATE: string;
    EXCEPTION_REPEAT_YEARLY: string;
    MACHINE: number;
  }[],
  ecoModeCfg?: {
    ENABLE_ECO: number;
    ECO_CFG: string;
    ECO_OFST_START: number;
    ECO_OFST_END: number;
    ECO_INT_TIME: number;
  },
  automationList?: {
    alias: string;
    description: string;
    value?: number;
    address?: number;
    array?: string;
  }[]
}

export async function loadDrisCfg(opts?: {
  skipSchedule?: boolean
  clientIds?: number[]
  unitIds?: number[]
  devIds?: string[]
}) {
  const list = await sqldb.DRIS.getListBasic({
    clientIds: opts?.clientIds,
    unitIds: opts?.unitIds,
    devIds: opts?.devIds,
  });
  const schedsList = opts?.skipSchedule ? undefined : await sqldb.DRISCHEDS.getDriScheds({});
  const drisCfg: {
    [driId: string]: DriConfig
  } = {};
  const dutDrisRef: {
    [dutId: string]: string[]
  } = {};
  for (const row of list) {
    try {
      if (row.DUT_ID) {
        if (!dutDrisRef[row.DUT_ID]) dutDrisRef[row.DUT_ID] = [];
        if (!dutDrisRef[row.DUT_ID].includes(row.DRI_ID)) dutDrisRef[row.DUT_ID].push(row.DRI_ID);
      }

      const driCfg: DriConfig = parseDriConfigWithEco(row);
      if (!driCfg) continue;

      driCfg.driScheds = schedsList?.filter((sched) => sched.DRI_ID === row.DRI_ID);
      drisCfg[row.DRI_ID] = driCfg;
    } catch (err) { logger.error(err); }
  }

  return { drisCfg, dutDrisRef };
}

export async function loadDrisCfgFormulas() {
  const list = await sqldb.DRIS.getListBasic({});
  const drisFormulas = [] as [string, { [alias: string]: string }][];
  for (const row of list) {
    try {
      const cfg = row.VARSCFG && jsonTryParse<DriVarsConfig>(row.VARSCFG);
      if (!cfg) continue;
      const { varsList, w_varsList } = cfg;

      if (!varsList && !w_varsList) continue;
      if (!varsList.length && !w_varsList.length) continue;

      if (varsList?.some((x) => x.inputRow?.Formula)){
        const formulas = {} as {
            [alias: string]: string
        };
        varsList.forEach((x) => {
            if (x.inputRow?.Formula && (x.inputRow?.Alias || x.inputRow?.Comando)) {
              formulas[x.inputRow.Alias! || x.inputRow.Comando!] = x.inputRow.Formula;
            }
        });
        drisFormulas.push([row.DRI_ID, formulas]);
      }
    } catch (err) { logger.error(err); }
  }
  return drisFormulas;
}

export function parseDriConfig(row: { VARSCFG: string, TIMEZONE_ID?: number, CURRFW_VERS?: string }): DriConfig {
  if (!row.VARSCFG) return undefined;
  const cfg = row.VARSCFG && jsonTryParse<DriVarsConfig>(row.VARSCFG);
  const { application, protocol, varsList, w_varsList, driConfigs, automationList } = cfg;

  if (!varsList && !w_varsList) return undefined;
  if (!varsList.length && !w_varsList.length) return undefined;

  const machines: DriConfig['machines'] = [];
  for (const varinfo of varsList) {
    if (!varinfo.address) continue;
    let machine = machines.find(x => x.id === varinfo.address.machine);
    if (!machine) {
      machine = {
        id: varinfo.address.machine,
        vars: [],
      };
      machines.push(machine);
    }
    machine.vars.push({ name: varinfo.name });
  }

  return {
    application,
    protocol,
    varsList,
    w_varsList,
    driConfigs,
    machines,
    TIMEZONE_ID: row.TIMEZONE_ID,
    CURRFW_VERS: row.CURRFW_VERS,
    automationList,
  };
}

export function parseDriConfigWithEco(row: {
  VARSCFG: string
  ENABLE_ECO: number
  ECO_CFG: string
  ECO_OFST_START: number
  ECO_OFST_END: number
  ECO_INT_TIME: number
  DAT_BEGAUT: string
  TIMEZONE_ID: number
  CURRFW_VERS: string
}): DriConfig {
  const driCfg = parseDriConfig(row);
  if (!driCfg) return undefined;

  const ecoModeCfg = row.DAT_BEGAUT ? {
    ENABLE_ECO: row.ENABLE_ECO,
    ECO_CFG: row.ECO_CFG,
    ECO_OFST_START: row.ECO_OFST_START,
    ECO_OFST_END: row.ECO_OFST_END,
    ECO_INT_TIME: row.ECO_INT_TIME,
  } : undefined;

  return {
    ...driCfg,
    ecoModeCfg,
  };
}

export function getDrisCfgFormulas(driCfg: DriConfig) {
  // const driCfg = tryGetDriCfg(driId);
  if (!driCfg) return undefined;
  const formulas = {} as {
      [alias: string]: string
  };
  if (driCfg.varsList?.some((x) => x.inputRow?.Formula)){
    driCfg.varsList.forEach((x) => {
        if (x.inputRow?.Formula && (x.inputRow?.Alias || x.inputRow?.Comando)) formulas[x.inputRow.Alias || x.inputRow.Comando] = x.inputRow.Formula;
    });
    return formulas;
  }
  return undefined;
}

/* Carrega do banco e retorna a config do DRI */
export async function loadDriCfg(driId: string, clientId: number, unitId: number, skipSchedule?: boolean) {
  if (!driId) return undefined;
  const { drisCfg } = await loadDrisCfg({
    skipSchedule,
    clientIds: clientId ? [clientId] : undefined,
    unitIds: unitId ? [unitId] : undefined,
    devIds: driId ? [driId] : undefined,
  });
  return drisCfg[driId];
}

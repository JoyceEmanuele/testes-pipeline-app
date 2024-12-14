import type { API_External } from './httpApiRouter'
import falhaRep from './extServices/falhaRep'
import * as faultDetection from './faultDetection'
import * as dacData from '../srcCommon/helpers/dacData'
import sqldb from '../srcCommon/db' 
import { DetectedFaultInfo, FullProg_v4 } from '../srcCommon/types'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import { FaultsConfig } from './dacHealth'
import { DayProg } from '../srcCommon/helpers/scheduleData'
import { API_Internal as ApiInternal } from "./api-interface";
import { logger } from '../srcCommon/helpers/logger'

let updateTokens = {} as {
  [clientIp: string]: {
    token: string,
    dacs: { [dacId: string]: string }
    duts: { [dutId: string]: string }
  }
};

export const dev_getFrListUpdates: API_External['/dev/get-fr-list-updates'] = async function (reqParams, session, extra) {
  if ((session && session.user) === 'intel-server') { /* OK */ }
  else {
    throw Error('Invalid credentials').HttpStatus(403);
  }

  return dev_getFrListUpdates_internal(reqParams, null, extra);
}
export const dev_getFrListUpdates_internal: ApiInternal['/diel-internal/health/dev/get-fr-list-updates'] = async function (reqParams, _nosession, extra) {
  const clientIp = extra.req.ip;
  let oldDacs = null;
  let oldDuts = null;
  if (reqParams.update_token && updateTokens[clientIp] && updateTokens[clientIp].token === reqParams.update_token) {
    oldDacs = updateTokens[clientIp].dacs;
    oldDuts = updateTokens[clientIp].duts;
  }
  else {
    delete updateTokens[clientIp];
  }
  const [
    {listUpdates: dacUpdates, newDacs, removed: removed_dacs},
    {listUpdates: dutUpdates, newDuts, removed: removed_duts}
  ] = await Promise.all([getDacFRListUpdates(oldDacs), getDutFRListUpdates(oldDuts)]);
  
  const update_token = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 23) + '-0300';
  updateTokens[clientIp] = {
    token: update_token,
    dacs: newDacs,
    duts: newDuts,
  };
  return {
    dacs: dacUpdates,
    duts: dutUpdates,
    removed_dacs,
    removed_duts,
    update_token: update_token,
  }
}

export const dev_getFrListUpdatesV2: API_External['/dev/get-fr-list-updates-v2'] = async function (reqParams, session) {
  if ((session && session.user) === 'intel-server') { /* OK */ }
  else {
    throw Error('Invalid credentials').HttpStatus(403);
  }

  return dev_getFrListUpdatesV2_internal(reqParams);
}

export const dev_getFrListUpdatesV2_internal: ApiInternal['/diel-internal/health/dev/get-fr-list-updates-v2'] = async function (reqParams) {
  const [
    {listUpdates: dacUpdates, removed: removed_dacs, maxLastCfgModif: latestDacModif},
    {listUpdates: dutduoUpdates, removed: removed_dutsduo, maxLastCfgModif: latestDutduoModif},
    {listUpdates: dutAutUpdates, removed: removed_dutsAut, maxLastCfgModif: latestDutAutModif},
    {listUpdates: damUpdates, removed: removed_dams, maxLastCfgModif: latestDamModif}
  ] = await Promise.all([getDacFRListUpdatesV2(reqParams.update_token), getDutDuoFRListUpdatesV2(reqParams.update_token), getDutFRListUpdatesV2(reqParams.update_token), getDamFRListUpdatesV2(reqParams.update_token)]);
  const latestDacModifTime = Date.parse(latestDacModif);
  const latestDutAutModifTime = Date.parse(latestDutAutModif);
  const latestDamModifTime = Date.parse(latestDamModif);
  const latestDutduoModifTime = Date.parse(latestDutduoModif);

  const latestModif = Math.max(latestDacModifTime, latestDutAutModifTime, latestDamModifTime, latestDutduoModifTime);
  const update_token = (latestDacModif || latestDutAutModif || latestDamModif || latestDutduoModif)
    ? new Date(latestModif).toISOString()
    : new Date().toISOString();

  
  // Percorre a lista de dacs
  for (const dacId in dacUpdates) {
    const dac = await sqldb.DACS_DEVICES.getBasicInfo({
      DAC_ID: dacUpdates[dacId].DAC_ID,
    });

    if(dac.UNIT_ID) {
      const unit = await sqldb.CLUNITS.getUnitBasicInfo({
        UNIT_ID: dac.UNIT_ID,
      });

      
      if(unit.PRODUCTION == 0) {
        //remove o dac da lista de dacs
        dacUpdates.splice(Number(dacId), 1);
      }
    }
  }
  
  return {
    dacs: dacUpdates,
    duts_aut: dutAutUpdates,
    dutsduo: dutduoUpdates,
    dams: damUpdates,
    removed_dacs,
    removed_duts_aut: removed_dutsAut,
    removed_dutsduo,
    removed_dams,
    update_token: update_token,
  }
}

/**
 * @swagger
 * /dev/falha-repentina-detectada:
 *   post:
 *     summary: Notifica backend de nova falha
 *     description: Notifica backend de nova falha
 *     tags:
 *       - HEALTH
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Requisição de informações do DAC
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             devId:
 *               type: string
 *               description: ID do dispositivo
 *               required: true
 *             timestamp:
 *               type: string
 *               description: Timestamp da detecção
 *               required: true
 *             fault_id:
 *               type: string
 *               description: ID da falha
 *               required: true
 *             name:
 *               type: string
 *               description: Nome legível da falha
 *               required: true
 *             gravity:
 *               type: string
 *               description: Gravidade da falha ('Yellow', 'Orange' e 'Red')
 *               required: true
 *             approval_type:
 *               type: string
 *               description: Tipo de aprovação, se automática ou manual
 *               required: true
 *             rise:
 *               type: boolean
 *               description: True se essa falha for a primeira de uma sequência de falhas iguais
 *               required: true
 *             restab:
 *               type: boolean
 *               description: True se essa notificação for o restabelecimento de uma falha já ocorrida
 *               required: true
 *     responses:
 *       200:
 *         description: Informações do DAC
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operação bem sucedida
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno do servidor
 */
export const dev_falhaDetectada: API_External['/dev/falha-repentina-detectada'] = async function (reqParams, session) {

  await dac_falhaRepentinaDetectadaV2(reqParams, session);

  return {"success" : true}
}

export const dac_falhaRepentinaDetectadaV2: API_External['/dac/falha-repentina-detectada-v2'] = async function (reqParams, session) {
  if ((session && session.user) === 'intel-server') {
    // OK
  }
  else { throw Error('INVALID DATA, invalid credentials').HttpStatus(400) }

  return dac_falhaRepentinaDetectadaV2_internal(reqParams);
}
export const dac_falhaRepentinaDetectadaV2_internal: ApiInternal['/diel-internal/health/dac/falha-repentina-detectada-v2'] = async function (reqParams) {
  if (!reqParams.devId) throw Error('INVALID DATA, missing devId').HttpStatus(400)
  if (!reqParams.fault_id || !reqParams.name || !reqParams.gravity) throw Error('INVALID DATA, missing fault').HttpStatus(400)
  if (reqParams.restab == null) throw Error('INVALID DATA, missing restab').HttpStatus(400)
  if (reqParams.rise == null) throw Error('INVALID DATA, missing rise').HttpStatus(400)
  if (!reqParams.approval_type) throw Error('INVALID DATA, missing approval type').HttpStatus(400)

  let faultLevel;
  switch (reqParams.gravity) {
    case "Green":
      faultLevel = 100;
      break
    case "Yellow":
      faultLevel = 75;
      break
    case "Orange":
      faultLevel = 50;
      break
    case "Red":
      faultLevel = 25;
      break;
    default:
      throw Error('INVALID DATA, invalid health level').HttpStatus(400)
  }

  const autoApprove = reqParams.approval_type === "FULL_AUTO" 
    || reqParams.approval_type === "AUTO_FAULT_ONLY" && !reqParams.restab
    || reqParams.approval_type === "AUTO_RESTAB_ONLY" && reqParams.restab;

  const faultInfo: DetectedFaultInfo = {
    faultId: reqParams.fault_id,
    faultName: reqParams.name,
    faultLevel: faultLevel,
    condDesc: null,
    rise: reqParams.rise,
    restab: reqParams.restab,
    autoApprove 
  };

  await faultDetection.checkFault(faultInfo, reqParams.devId, '[FR]');

  return {"success" : true}
}

export const dac_falhaInstalacaoDetectada: API_External['/dac/falha-instalacao-detectada'] = async function (_reqParams, session) {
  
  if ((session && session.user) === 'intel-server') {
    // OK
  }
  else { throw Error('INVALID DATA, invalid credentials').HttpStatus(400) }

  return dac_falhaInstalacaoDetectada_internal(_reqParams);
}
export const dac_falhaInstalacaoDetectada_internal: ApiInternal['/diel-internal/health/dac/falha-instalacao-detectada'] = async function (_reqParams) {
  //TODO: add logic for Telegram notifications or whatever else. This is just reserving the endpoint name.

  return {success : true}
}

async function getDacFRListUpdates(oldDacs:{ [dacId: string]: string }|null) {
  const list = await sqldb.DACS_DEVICES.getExtraInfoList({}, {});
  const newDacs = {} as { [dacId: string]: string };
  const removed = [];
  const listUpdates = [] as {
    DAC_ID: string
    DAC_TYPE: string
    DAC_APPL: string
    FLUID_TYPE: string
    hasAutomation: boolean
    isVrf: boolean
    P0Psuc: boolean
    P1Psuc: boolean
    P0Pliq: boolean
    P1Pliq: boolean
    P0mult: number
    P0ofst: number
    P1mult: number
    P1ofst: number
    T0_T1_T2: string
    ignoreFaults: string
    groupChillerCount: number
    groupId: number
  }[];

  const chillerCounts = list.reduce((grouped, obj) => {
    const machineId = obj.GROUP_ID;
    if (!grouped[machineId]) {
      grouped[machineId] = 0;
    }
    grouped[machineId] += (obj.DAC_APPL === "chiller") ? 1 : 0;
    return grouped;
  }, {} as { [groupId : number] : number }); //grouping configs by GROUP_ID

  for (const row of list) {
    const cfg = parseDacRow(row, true);
    if (!cfg) {
      continue;
    }
    const dacId = row.DAC_ID;
    const machineId = row.GROUP_ID;
    const dacCfg = {
      groupChillerCount: chillerCounts[machineId],
      groupId: machineId,
      ...cfg
    };
    newDacs[dacId] = `${dacCfg.DAC_TYPE}|${dacCfg.DAC_APPL}|${dacCfg.FLUID_TYPE}|${dacCfg.hasAutomation}|${dacCfg.isVrf}|${dacCfg.P0Psuc}|${dacCfg.P1Psuc}|${dacCfg.P0Pliq}|${dacCfg.P1Pliq}|${dacCfg.P0mult}|${dacCfg.P0ofst}|${dacCfg.P1mult}|${dacCfg.P1ofst}|${dacCfg.T0_T1_T2}|${dacCfg.ignoreFaults}|${dacCfg.groupChillerCount}`;
    if (oldDacs && oldDacs[dacId] && (oldDacs[dacId] === newDacs[dacId])) {
      // no need to update
    } else {
      listUpdates.push(dacCfg);
    }
  }
  if (oldDacs) {
    for (const dacId of Object.keys(oldDacs)) {
      if (!newDacs[dacId]) {
        removed.push(dacId);
      }
    }
  }
  return {listUpdates, newDacs, removed};
}

async function getDacFRListUpdatesV2(date: string) {
  const list = await sqldb.DACS_DEVICES.getExtraInfoList({ LAST_CFG_MODIF: date }, { faultscfg: true });
  const newDacs = {} as { [dacId: string]: string };
  const removed = [] as any[];
  const listUpdates = [] as {
    DAC_ID: string
    DAC_TYPE: string
    DAC_APPL: string
    FLUID_TYPE: string
    hasAutomation: boolean
    isVrf: boolean
    P0Psuc: boolean
    P1Psuc: boolean
    P0Pliq: boolean
    P1Pliq: boolean
    P0mult: number
    P0ofst: number
    P1mult: number
    P1ofst: number
    T0_T1_T2: string
    ignoreFaults: string
    groupChillerCount: number
    groupId: number
    virtualL1: boolean
    faultConfigs: {
      psucOffset: number,
    }
  }[];

  const chillerCounts = list.reduce((grouped, obj) => {
    const machineId = obj.GROUP_ID;
    if (!grouped[machineId]) {
      grouped[machineId] = 0;
    }
    grouped[machineId] += (obj.DAC_APPL === "chiller") ? 1 : 0;
    return grouped;
  }, {} as { [groupId : number] : number }); //grouping configs by GROUP_ID

  let maxLastCfgModif: string;

  for (const row of list) {
    const cfg = parseDacRow(row, false);
    if (!cfg) {
      continue;
    }
    if (row.LAST_CFG_MODIF > maxLastCfgModif) maxLastCfgModif = row.LAST_CFG_MODIF;
    const machineId = row.GROUP_ID;
    let psucSensor = "";
    if (cfg.P0Psuc) {
      psucSensor = row.P0_SENSOR;
    }
    else if (cfg.P1Psuc) {
      psucSensor = row.P1_SENSOR;
    }
    const hasOffset = ["PWS_A1B1000_LG23106","Sensor-Breno","HollyKell","ADD_SPT-001_REFAT","ADD_SPT-001",].includes(psucSensor);
    const faultConfigs = { psucOffset: hasOffset ? -1 : 0 };
  
    const dacCfg = {
      groupChillerCount: chillerCounts[machineId],
      groupId: machineId,
      faultConfigs,
      ...cfg
    };
    listUpdates.push(dacCfg);
  }

  return {listUpdates, newDacs, removed, maxLastCfgModif};
}

function parseDacRow(row:{
  DAC_ID: string
  CLIENT_ID: number
  UNIT_ID: number
  GROUP_ID: number
  FLUID_TYPE: string
  T0_T1_T2: string
  P0_POSITN: string
  P0_SENSOR: string
  P1_POSITN: string
  P1_SENSOR: string
  P0_OFST: number
  P1_OFST: number
  P0_MULT_QUAD: number
  P0_MULT_LIN: number
  P1_MULT_QUAD: number
  P1_MULT_LIN: number  
  DAC_COMIS: string
  DAT_BEGMON: string
  DAC_APPL: string
  DAC_TYPE: string
  FAULTS_DATA: string
  FAULTSCFG: string
  DAM_DISABLED: number
  SELECTED_L1_SIM?: string
}, comis: boolean) {
  if (comis === true && row.DAC_COMIS !== '1') return null;
  const hwCfg = dacData.dacHwCfg(row.DAC_ID, row);
  const faultsCfg = row.FAULTSCFG && jsonTryParse<FaultsConfig>(row.FAULTSCFG);
  return {
    DAC_ID: row.DAC_ID,
    DAC_TYPE: row.DAC_TYPE,
    DAC_APPL: row.DAC_APPL,
    FLUID_TYPE: row.FLUID_TYPE,
    hasAutomation: hwCfg.hasAutomation,
    isVrf: hwCfg.isVrf,
    P0Psuc: hwCfg.P0Psuc,
    P1Psuc: hwCfg.P1Psuc,
    P0Pliq: hwCfg.P0Pliq,
    P1Pliq: hwCfg.P1Pliq,
    P0mult: hwCfg.P0multLin,
    P0multLin: hwCfg.P0multLin,
    P0multQuad: hwCfg.P0multQuad,
    P0ofst: hwCfg.P0ofst,
    P1mult: hwCfg.P1multLin,
    P1multLin: hwCfg.P1multLin,
    P1multQuad: hwCfg.P1multQuad,
    P1ofst: hwCfg.P1ofst,
    T0_T1_T2: JSON.stringify((hwCfg.TsensRename || null) && [hwCfg.TsensRename.T0, hwCfg.TsensRename.T1, hwCfg.TsensRename.T2]),
    ignoreFaults: (faultsCfg && faultsCfg.ignore && faultsCfg.ignore.length && JSON.stringify(faultsCfg.ignore)) || undefined,
    virtualL1: hwCfg.simulateL1
  };
}

async function getDutFRListUpdates(oldDuts: {[dutId: string]: string} | null) {
  const list = await sqldb.MACHINES.getMachinesAutInfo({});
  let newDuts = {} as typeof oldDuts;
  const removed = [] as string[];
  const listUpdates = [] as {
    programming: {
      mon?: DayProg,
      tue?: DayProg,
      wed?: DayProg,
      thu?: DayProg,
      fri?: DayProg,
      sat?: DayProg,
      sun?: DayProg,
      exceptions: { [date: string] : DayProg }
    },
    minTemperature: number,
    maxTemperature: number,
    groupId: number,
    devId: string,
    application: string,
  }[];

  for (const row of list) {
    const dutId = row.DUT_ID;
    
    const dutCfg = parseDutRow(row);
    if (!dutCfg) {
      continue;
    }

    newDuts[dutId] = `${dutCfg.programming}|${dutCfg.minTemperature}|${dutCfg.maxTemperature}|${dutCfg.groupId}|${dutCfg.devId}`;
    if (oldDuts && oldDuts[dutId] && (oldDuts[dutId] === newDuts[dutId])) {
      // no need to update
    } else {
      listUpdates.push(dutCfg);
    }
  }
  if (oldDuts) {
    for (const dutId of Object.keys(oldDuts)) {
      if (!newDuts[dutId]) {
        removed.push(dutId);
      }
    }
  }

  return {listUpdates, newDuts, removed};
}

async function getDutFRListUpdatesV2(date: string) {
  const list = await sqldb.MACHINES.getMachinesAutInfo({ LAST_CFG_MODIF: date });
  let newDuts = {};
  const removed = [] as string[];
  const listUpdates = [] as {
    programming: {
      mon?: DayProg,
      tue?: DayProg,
      wed?: DayProg,
      thu?: DayProg,
      fri?: DayProg,
      sat?: DayProg,
      sun?: DayProg,
      exceptions: { [date: string] : DayProg }
    },
    minTemperature?: number,
    maxTemperature?: number,
    groupId: number,
    devId: string,
    setpoint: number | null,
    application: string
  }[];

  let maxLastCfgModif: string;

  for (const row of list) {
    const dutCfg = parseDutRow(row);
    if (!dutCfg) {
      continue;
    }
    if (row.LAST_CFG_MODIF > maxLastCfgModif) maxLastCfgModif = row.LAST_CFG_MODIF;
    listUpdates.push(dutCfg);
  }

  return {listUpdates, newDuts, removed, maxLastCfgModif};
}

async function getDutDuoFRListUpdatesV2(date: string) {
  const listDutDuo = await sqldb.DUTS_DUO.getDutsDuoListFancoilFR({ LAST_CFG_MODIF: date });
  let newDuts = {};
  const removed = [] as string[];
  const listUpdates = [] as {
    programming: {
      mon?: DayProg,
      tue?: DayProg,
      wed?: DayProg,
      thu?: DayProg,
      fri?: DayProg,
      sat?: DayProg,
      sun?: DayProg,
      exceptions: { [date: string] : DayProg }
    },
    minTemperature?: number,
    maxTemperature?: number,
    groupId: number,
    devId: string,
    setpoint: number | null,
    application: string
  }[];

  let maxLastCfgModif: string;

  for (const row of listDutDuo) {
    const dutCfg = parseDutRow(row);
    if (!dutCfg) {
      continue;
    }
    if (row.LAST_CFG_MODIF > maxLastCfgModif) maxLastCfgModif = row.LAST_CFG_MODIF;
    listUpdates.push(dutCfg);
  }

  return {listUpdates, newDuts, removed, maxLastCfgModif};
}

function parseDutRow(row: {
  GROUP_ID: number
  CLIENT_ID: number
  DUT_ID: string
  TUSEMIN?: number
  TUSEMAX?: number
  USEPERIOD?: string
  SETPOINT: number | null
  APPLICATION: string | null
}) {
  if (!row.GROUP_ID || !row.CLIENT_ID || !row.DUT_ID) {
    return null;
  }

  const prog = jsonTryParse<FullProg_v4>(row.USEPERIOD);
  
  if (prog && prog.week) {
    for (const x of Object.values(prog.week)) {
      if (x.start.length === 5) { // 00:00
        x.start = x.start.concat(":00");
      }
      if (x.end.length === 5) {
        x.end = x.end.concat(":00");
      }
    }
  }

  return {
    programming: {
      exceptions: prog?.exceptions ?? {},
      ...(prog?.week ?? {})
    },
    minTemperature: row.TUSEMIN,
    maxTemperature: row.TUSEMAX,
    groupId: row.GROUP_ID,
    devId: row.DUT_ID,
    setpoint: row.SETPOINT,
    application: row.APPLICATION
  };
}

async function getDamFRListUpdatesV2(date: string) {
  const list = await sqldb.DAMS.getDamInfosFR({ LAST_CFG_MODIF: date });
  const removed = [] as string[];
  const listUpdates = [] as {
    damId: string,
    dacId: string,
    groupId: number,
  }[];

  let maxLastCfgModif: string;

  for (const row of list) {
    const damCfg = {
      damId: row.DAM_DEVICE_CODE,
      dacId: row.DEV_ID,
      groupId: row.GROUP_ID,
    };
    listUpdates.push(damCfg);
  }

  return {listUpdates, removed, maxLastCfgModif};
}

let warnFrTimeout: NodeJS.Timeout = null;
export function warnFRofChanges() {
  clearTimeout(warnFrTimeout);
  warnFrTimeout = setTimeout(() => {
    falhaRep['/inform-changes-dac']().catch(logger.error);
  }, 2000);
}

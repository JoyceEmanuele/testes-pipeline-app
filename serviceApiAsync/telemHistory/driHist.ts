import sqldb from '../../srcCommon/db'
import { processDriDay } from '../dayCompilers/dri';
import { processDutDay } from '../dayCompilers/dut';
import { API_private2 } from '../../srcCommon/types/api-private'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { mergeVarsCommomX, parseCompressedChartData, processReceivedHistoryDRI } from '../../srcCommon/helpers/chartDataFormats'
import { addDays_YMD } from '../../srcCommon/helpers/dates';
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { DriVarsConfig, SessionData } from '../../srcCommon/types';
import * as scheduleData from '../../srcCommon/helpers/scheduleData';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';

export const applicationType = {
  'carrier-ecosplit': 'CCN',
  'vav-bac-6000': 'VAV',
  'vav-bac-6000-amln': 'VAV',
  'vav-bac-2000': 'VAV',
  'fancoil-bac-6000': 'FANCOIL',
  'fancoil-bac-6000-amln': 'FANCOIL',
  'fancoil-bac-2000': 'FANCOIL',
  'chiller-carrier-30hxe': 'CHILLER_CARRIER_HX',
  'chiller-carrier-20gxe': 'CHILLER_CARRIER_HX',
  'chiller-carrier-30hxf': 'CHILLER_CARRIER_HX',
  'chiller-carrier-30xab': 'CHILLER_CARRIER_XA',
  'chiller-carrier-30xab-hvar': 'CHILLER_CARRIER_XA_HVAR'
} as {
  [type: string]: string,
}

export const chillerRoutes = {
  'HX':  `chiller_parameters/get-chiller-hx-parameters-hist`,
  'XA': `chiller_parameters/get-chiller-xa-parameters-hist`,
  'XA_HVAR': `chiller_parameters/get-chiller-xa-hvar-parameters-hist`,
} as {
  [type: string]: string,
}

export async function loadDriCfg(dev_id: string) {
  const row = await sqldb.DRIS.getExtraInfo({ driId: dev_id });
  const cfg = row.VARSCFG && jsonTryParse<DriVarsConfig>(row.VARSCFG);
  if (!cfg) return null;
  const { varsList, w_varsList } = cfg;

  if (!varsList && !w_varsList) return null;
  if (!varsList.length && !w_varsList.length) return null;

  let formulas = undefined as {
      [alias: string]: string
  };
  if (varsList?.some((x) => x.inputRow?.Formula)){
    formulas = {};
    varsList.forEach((x) => {
        if (x.inputRow?.Formula && (x.inputRow?.Alias || x.inputRow?.Comando)) formulas[x.inputRow.Alias || x.inputRow.Comando] = x.inputRow.Formula;
    });
  }

  return Object.assign(cfg, { formulas });
}

interface DriCompiledData {
  Setpoint: string;
  Status: string;
  Mode: string;
  DutTemp: string;
  ThermOn: string;
  Fanspeed: string;
  Lock: string;
  TempAmb: string;
  ValveOn: string;
  FanStatus: string;
  provision_error: boolean;
}

function formatCompiledData(reqParams: { selectedParams: string[] }, compiledData: DriCompiledData[]) {
  // @ts-ignore
  if (!compiledData) compiledData = [{}];
    
  if (!reqParams.selectedParams.includes('Setpoint')) compiledData.forEach(data => delete data.Setpoint);
  if (!reqParams.selectedParams.includes('Status')) compiledData.forEach(data => delete data.Status);
  if (!reqParams.selectedParams.includes('Mode')) compiledData.forEach(data => delete data.Mode);
  if (!reqParams.selectedParams.includes('DutTemp')) compiledData.forEach(data => delete data.DutTemp);
  if (!reqParams.selectedParams.includes('ThermOn')) compiledData.forEach(data => delete data.ThermOn);
  if (!reqParams.selectedParams.includes('Fanspeed')) compiledData.forEach(data => delete data.Fanspeed);
  if (!reqParams.selectedParams.includes('Lock')) compiledData.forEach(data => delete data.Lock);
  if (!reqParams.selectedParams.includes('TempAmb')) compiledData.forEach(data => delete data.TempAmb);
  if (!reqParams.selectedParams.includes('ValveOn')) compiledData.forEach(data => delete data.ValveOn);
  if (!reqParams.selectedParams.includes('FanStatus')) compiledData.forEach(data => delete data.FanStatus);

  return compiledData;
}

function parseCommonData(data: DriCompiledData) {
  return {
    Setpoint: (data.Setpoint && parseCompressedChartData(data.Setpoint)) || undefined,
    Status: (data.Status && parseCompressedChartData(data.Status)) || undefined,
    Mode: (data.Mode && parseCompressedChartData(data.Mode)) || undefined,
    DutTemp: (data.DutTemp && parseCompressedChartData(data.DutTemp)) || undefined,
  }
}

function parseVAVFancoilData(data: DriCompiledData) {
  return {
    ThermOn: (data.ThermOn && parseCompressedChartData(data.ThermOn)) || undefined,
    Fanspeed: (data.Fanspeed && parseCompressedChartData(data.Fanspeed)) || undefined,
    Lock: (data.Lock && parseCompressedChartData(data.Lock)) || undefined,
    TempAmb: (data.TempAmb && parseCompressedChartData(data.TempAmb)) || undefined,
    ValveOn: (data.ValveOn && parseCompressedChartData(data.ValveOn)) || undefined,
    FanStatus: (data.FanStatus && parseCompressedChartData(data.FanStatus)) || undefined,
  }
}

function parseDaysCompressedData(datas: any[], compiledData: DriCompiledData[]) {
  compiledData.forEach(data => {
    const compressedData = Object.assign(
      { provision_error: data.provision_error },
      parseCommonData(data),
      parseVAVFancoilData(data),
    )
    data && datas.push(compressedData);
  });
}

function calculateAxisLimits(parsedGraphData: ReturnType<typeof processReceivedHistoryDRI>[]) {
  let dataLimts = [] as any;
  function evaluateDataLimits(data: typeof parsedGraphData[0]) {
    if (data?.dataLimits?.maxTval != null)
        dataLimts.maxTval = (dataLimts.maxTval > data.dataLimits.maxTval ? (dataLimts.maxTval != null ? dataLimts.maxTval : data.dataLimits.maxTval) : data.dataLimits.maxTval)

    if (data?.dataLimits?.minTval != null)
      dataLimts.minTval = (dataLimts.minTval < data.dataLimits.minTval ? (dataLimts.minTval != null ? dataLimts.minTval : data.dataLimits.minTval) : data.dataLimits.minTval)
  }
  parsedGraphData?.forEach(data => {
    if (dataLimts.length <= 0) {
      dataLimts = data?.dataLimits;
    }
    else {
      evaluateDataLimits(data);
    }
  }
  )

  return dataLimts;
}

function getOperationModeValues(varsList: {
  c: number[];
  vs: (string | number)[][];
  L: (string | number)[][];
}, dri_type: string) {
  const operationModeValues = varsList.vs[2].map((modeValue, index) => {
    const statusValue = varsList.vs[1][index];
    const thermOnValue = varsList.vs[4][index];
    if(dri_type === 'FANCOIL'){
      // status: 0 -> MAQUINA DESLIGADA -> PLOT y: 0
      if (thermOnValue === 0) return 0;
      // mode: 0 -> MODO REFRIGERAÇÃO (COOL) -> PLOT y: 2
      else if (typeof modeValue === 'number' && modeValue === 0) return 2;
      // mode: 2 -> MODO VENTILAÇÂO (FAN) -> PLOT y: 1
      else if (typeof modeValue === 'number' && modeValue === 2) return 1;
    }else{
      // status: 0 -> MAQUINA DESLIGADA -> PLOT y: 0
      if (statusValue === 0) return 0;
      // mode: 1 -> MODO REFRIGERAÇÃO (COOL) -> PLOT y: 2
      else if (typeof modeValue === 'number' && modeValue === 1) return 2;
      // mode: 3 -> MODO VENTILAÇÂO (FAN) -> PLOT y: 1
      else if (typeof modeValue === 'number' && modeValue === 3) return 1;
    }
    return null;
  });
  return operationModeValues;
}

function getFancoilTempLimits(TUSEMAX: number[], TUSEMIN: number[], days: string[], driInf: { THERM_T_MAX: number, THERM_T_MIN: number }) {
  const compressionRate = 17280 / (days.length * days.length);

  for (let index = 0; index < days.length; index += 1) {

    for (let point = (index * compressionRate); point < ((index + 1) * compressionRate); point += 1) {
      TUSEMAX.push(driInf.THERM_T_MAX);
      TUSEMIN.push(driInf.THERM_T_MIN);
      
    }
  }
}

function getRTypeTempLimits(TUSEMAX: number[], TUSEMIN: number[], days: string[], driInf: { USEPERIOD: string, TUSEMIN: number, TUSEMAX: number }) {
  const roomSched = driInf.USEPERIOD && scheduleData.parseFullProgV4(driInf.USEPERIOD);
    const compressionRate = 17280 / (days.length * days.length);

    for (let index = 0; index < days.length; index += 1) {
      const day = days[index];
      const daySchedData = roomSched && scheduleData.getDayPeriod(roomSched, day);
      if (!daySchedData) continue;
      const commonIndexIni = daySchedData.indexIni * (compressionRate / 1440) + (compressionRate * (index));
      const commonIndexEnd = daySchedData.indexEnd * (compressionRate / 1440) + (compressionRate * (index));

      for (let point = (index * compressionRate); point < ((index + 1) * compressionRate); point += 1) {
        if (point < commonIndexIni || point > commonIndexEnd) {
          TUSEMAX.push(null);
          TUSEMIN.push(null);
        } else {
          TUSEMAX.push(driInf.TUSEMAX);
          TUSEMIN.push(driInf.TUSEMIN);
        }
      }
    }
}

function getTempLimits(
  dri_type: string,
  driInf: { THERM_T_MAX: number, THERM_T_MIN: number, TUSEMAX: number, TUSEMIN: number, USEPERIOD: string },
  varsList: {
    c: number[];
    vs: (string | number)[][];
    L: (string | number)[][];
  },
  days: string[],
  ) {
  const TUSEMAX = [] as number[];
  const TUSEMIN = [] as number[];

  if(dri_type === 'FANCOIL' && driInf?.THERM_T_MAX && driInf?.THERM_T_MIN && varsList.vs[0].length > 0){
    getFancoilTempLimits(TUSEMAX, TUSEMIN, days, driInf);
  } else if (driInf?.TUSEMAX || driInf?.TUSEMIN) {
    getRTypeTempLimits(TUSEMAX, TUSEMIN, days, driInf);
  }

  return { TUSEMAX, TUSEMIN };
}

async function checkPermissions(devId: string, session: SessionData) {
  if (!devId) throw Error('Invalid parameters! Missing driId').HttpStatus(400)
  const driInf = await sqldb.DRIS.getAssocInfo({ driId: devId });
  if (!driInf) throw Error('DRI não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, driInf.CLIENT_ID, driInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  return driInf;
}

function checkNumDays(numDays: number) {
  if (numDays !== undefined) {
    if ((numDays >= 1) && (numDays <= 15)) { } // OK
    else throw Error('O período aceitável é de 1 a 15 dias');
  }
}

/**
 * @swagger
 * /dri/get-day-charts-data-common:
 *   post:
 *     summary: Histórico do DRI por dia
 *     description: Retorna o histórico do DRI com uma mesma quantidade de pontos em cada tipo de dados em um intervalo de datas
 *     tags:
 *      - DriHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             driId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DRI
 *             dayYMD:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data inicial para o filtro YYYY-MM-DD
 *             selectedParams:
 *               required: true
 *               type: array
 *               description: Tipos de dados a serem retornados
 *               items:
 *                 type: string
 *                 default: ""
 *             numDays:
 *                required: false
 *                type: number
 *                default: null
 *                description: Quantidade de dias a ser filtrado
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commonX:
 *                   type: array
 *                   items:
 *                     type: number
 *                 vars:
 *                   type: any
 *                 limits:
 *                   type: object
 *                   items:
 *                     properties:
 *                       maxTval:
 *                         type: number
 *                       minTval:
 *                         type: number
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDayChartsDataCommon: API_private2['/dri/get-day-charts-data-common'] = async function (reqParams, session) {
  // # Verifica permissão
  const devId = reqParams.driId;
  const driInf = await checkPermissions(devId, session);
  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: session.user });
  const language = getLanguage(prefsUser[0]);

  const driCfg = await loadDriCfg(devId);
  const formulas = driCfg.formulas;

  let dayAux = reqParams.dayYMD;
  checkNumDays(reqParams.numDays);
  
  const days = [] as string[]
  for (let i = 0; i < reqParams.numDays; i++) {
    dayAux = addDays_YMD(reqParams.dayYMD, i);
    days.push(dayAux);
  }

  const dri_type = applicationType[driCfg.application];
  const dri_interval = Number(driCfg.driConfigs?.find((cfg) => cfg.protocol === 'interval')?.value) || undefined;

  // seleciona dados para cada dia do range
  async function compileData (day: string) {
    const driDayProcessed = await processDriDay({ motivo: `/dri/get-day-charts-data-common P1 ${session.user}`, driId: devId, driType: dri_type, driInterval: dri_interval, day, formulas });
    const dutDayProcessed = driInf.DUT_ID && await processDutDay({ motivo: `/dri/get-day-charts-data-common P2 ${session.user}`, dutId: driInf.DUT_ID, day, hType: "TelemetryCharts", dutExtInf: { RTYPE_ID: driInf.DUT_RTYPE, UNIT_ID: driInf.UNIT_ID } });
    return {
      Setpoint: driDayProcessed?.Setpoint,
      Status: driDayProcessed?.Status,
      Mode: driDayProcessed?.Mode,
      DutTemp: dutDayProcessed?.Temp,
      ThermOn: driDayProcessed?.ThermOn,
      Fanspeed: driDayProcessed?.Fanspeed,
      Lock: driDayProcessed?.Lock,
      TempAmb: driDayProcessed?.TempAmb,
      ValveOn: driDayProcessed?.ValveOn,
      FanStatus: driDayProcessed?.FanStatus,
      provision_error: driDayProcessed?.provision_error || dutDayProcessed?.provision_error,
    }
  }
  let compiledData = await Promise.all(days.map(day => compileData(day)));
  compiledData = compiledData.filter((x) => x != null);
  compiledData = formatCompiledData(reqParams, compiledData);

  let datas = [] as any[];
  parseDaysCompressedData(datas, compiledData);

  // Calcula todos valores de pontos X em horas para os dados recebidos
  let parsedGraphData = datas.map((data, i)=> processReceivedHistoryDRI(data, { varsCfg: JSON.parse(driInf.VARSCFG) }, i));

  let vars = {
    Setpoint: [], Status: [], Mode: [], DutTemp: [], ThermOn: [], Fanspeed: [], Lock: [], TempAmb: [], ValveOn: [], FanStatus: []
  } as any;

  // Calcula valores mínimo e máximo de eixos
  const dataLimts = calculateAxisLimits(parsedGraphData);

  let minTtick = Math.floor((dataLimts?.minTval - 1) / 5) * 5;
  if (minTtick > 0) minTtick = 0;

  parsedGraphData?.forEach(data => {
    vars.Setpoint = vars.Setpoint.concat(data?.parsedGraphData.Setpoint);
    vars.Status = vars.Status.concat(data?.parsedGraphData.Status);
    vars.Mode = vars.Mode.concat(data?.parsedGraphData.Mode);
    vars.DutTemp = vars.DutTemp.concat(data?.parsedGraphData.DutTemp);
    vars.ThermOn = vars.ThermOn.concat(data?.parsedGraphData.ThermOn);
    vars.Fanspeed = vars.Fanspeed.concat(data?.parsedGraphData.Fanspeed);
    vars.Lock = vars.Lock.concat(data?.parsedGraphData.Lock);
    vars.TempAmb = vars.TempAmb.concat(data?.parsedGraphData.TempAmb);
    vars.ValveOn = vars.ValveOn.concat(data?.parsedGraphData.ValveOn);
    vars.FanStatus = vars.FanStatus.concat(data?.parsedGraphData.FanStatus);
  });

  let cAux = [] as any[];
  let vAux = [] as any[];
  let LAux = [] as any[];
  let varList = [] as any[];

  // Une os dados de cada dia em um vetor por variável
  for (var propriedade in vars) {
    if (vars.hasOwnProperty(propriedade)) {
      vars[propriedade].map((data: any) => {
          cAux.push(data.x);
          vAux.push(data.y);
          LAux.push(data.L);
        }
      )
      varList.push({c: cAux, v: vAux, L: LAux});
      cAux = [];
      vAux = [];
      LAux = [];
    }
  }

  const list = mergeVarsCommomX(varList, reqParams.numDays);

  const operationModeValues = getOperationModeValues(list, dri_type);

  if(dri_type === 'FANCOIL'){
    list.vs[9] = list.vs[9].map((statusValue) => {
      // status !== 0 -> ventilador ligado (1) | status === 0 -> ventilador desligado (0)
      if(typeof statusValue === 'number' && statusValue === 0) return 0;
      else if(typeof statusValue === 'number') return 1;
      return null;
    });
  
  }

  const { TUSEMAX, TUSEMIN } = getTempLimits(dri_type, driInf, list, days);

  const valveOnName = dri_type === 'FANCOIL' ? t('sinalDeComandoParaValvula', language) : t('Status da válvula', language);

  return {
    commonX: list.c,
    vars: {
      Setpoint: {
        name: t('setpoint', language),
        y: list.vs[0],
        L: list.L[0],
      },
      Status: {
        name: t('status', language),
        y: list.vs[1],
        L: list.L[1],
      },
      Mode: {
        name: t('modoDeOperacao', language),
        y: list.vs[2],
        L: list.L[2],
      },
      DutTemp: {
        name: t('temperaturaDUT', language),
        y: list.vs[3],
        L: list.L[3],
      },
      ThermOn: {
        name: t('statusDoTermostato', language),
        y: list.vs[4],
        L: list.L[4],
      },
      Fanspeed: {
        name: t('velocidadeDaVentilacao', language),
        y: list.vs[5],
        L: list.L[5],
      },
      Lock: {
        name: t('bloqueio', language),
        y: list.vs[6],
        L: list.L[6],
      },
      TempAmb: {
        name: t('temperaturaAmbiente_label', language),
        y: list.vs[7],
        L: list.L[7],
      },
      ValveOn: {
        name: valveOnName,
        y: list.vs[8],
        L: list.vs[8],
      },
      FanStatus: {
        name: t('statusDoVentilador', language),
        y: list.vs[9],
        L: list.L[9],
      },
      TUSEMAX: {
        name: t('temperaturaMaxima', language),
        y: TUSEMAX,
        L: TUSEMAX,
      },
      TUSEMIN: {
        name: t('temperaturaMinima', language),
        y: TUSEMIN,
        L: TUSEMIN,
      },
      OperationMode: {
        name: t('modoDeOperacao', language),
        y: operationModeValues,
      },
    },
    limits: {
      maxTval: dataLimts.maxTval,
      minTval: dataLimts.minTval,
    },
  };
}

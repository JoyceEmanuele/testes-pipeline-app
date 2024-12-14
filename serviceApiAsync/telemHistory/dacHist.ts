import * as dacData from '../../srcCommon/helpers/dacData'
import sqldb from '../../srcCommon/db'
import * as dayCompiler from '../dayCompilers/dac'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi'
import { API_private2 } from '../../srcCommon/types/api-private'
import { API_Internal } from '../api-internal';
import * as httpApiRouter from '../httpApiRouter'
import { getPermissionsOnUnit, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { isTemporaryId } from '../../srcCommon/helpers/devInfo'
import { mergeEventsList, updateBoolY, mergeVarsCommomX, parseCompressedChartData, uncompressHistVec, processReceivedHistoryDAC, parseCompressedChartDataS2 } from '../../srcCommon/helpers/chartDataFormats'
import servConfig from '../../configfile';
import { prodApiPost } from '../extServices/prodApi'
import { addDays_YMD, timeToSeconds } from '../../srcCommon/helpers/dates';
import { DacHwCfg, FullHist_DAC, HistoryTypeDAC } from '../../srcCommon/types';
import { getPeriodsUseData } from '../dayCompilers/common';
import { logger } from '../../srcCommon/helpers/logger';
import { calculateDateByTimezone, getOffsetTimezone } from '../../srcCommon/helpers/timezones'
import { processDamDay } from '../dayCompilers/dam'
import { removeTransitory } from './damHist'
import { getTimezoneInfoByDev } from '../../srcCommon/db/sql/DEVICES';

/**
 * @swagger
 * /dac/get-recent-history:
 *   post:
 *     summary: Histórico recente do DAC
 *     description: Retorna o histórico recente do DAC dos últimos N milissegundos
 *     tags:
 *      - DacHist
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
 *             dacId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DAC
 *             intervalLength:
 *               required: true
 *               type: number
 *               default: null
 *               description: Quantidade de tempo em milissegundos que deseja buscar no histórico
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   items:
 *                     properties:
 *                       initialTimestamp:
 *                         type: string
 *                         description: Timestamp inicial
 *                       timeAxis:
 *                         type: array
 *                         description: Array com números do eixo de tempo
 *                         items:
 *                           type: number
 *                       Lcmp:
 *                         type: array
 *                         description: Array com valores de Sinal de Comando do compressor
 *                         items:
 *                           type: number
 *                       Levp:
 *                         type: array
 *                         description: Array com valores de Sinal de Comando da evaporadora
 *                         items:
 *                           type: number
 *                       Lcut:
 *                         type: array
 *                         description: Array com valores de Bloqueio de Comando
 *                         items:
 *                           type: number
 *                       Tamb:
 *                         type: array
 *                         description: Array com valores de Temperatura do Ambiênte
 *                         items:
 *                           type: number
 *                       Tsuc:
 *                         type: array
 *                         description: Array com valores de Temperatura de Sucção
 *                         items:
 *                           type: number
 *                       Tliq:
 *                         type: array
 *                         description: Array com valores de Temperatura do Líquido
 *                         items:
 *                           type: number
 *                       Psuc:
 *                         type: array
 *                         description: Array com valores de Pressão de Sucção
 *                         items:
 *                           type: number
 *                       Pliq:
 *                         type: array
 *                         description: Array com valores de Pressão do líquido
 *                         items:
 *                           type: number
 *                       Tsh:
 *                         type: array
 *                         description: Array com valores de Superaquecimento
 *                         items:
 *                           type: number
 *                       Tsc:
 *                         type: array
 *                         description: Array com valores de Subresfriamento
 *                         items:
 *                           type: number
 *       400:
 *         description: Parâmetro inválido!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getRecentHistory: API_private2['/dac/get-recent-history'] = async function (reqParams, session) {
  return httpApiRouter.externalRoutes['/dac/get-recent-history-v2']({
    ...reqParams,
    intervalLength_s: Math.round(reqParams.intervalLength / 1000),
  }, session);
}

const normalizeStartTimestamp = async (devInfo: { UNIT_ID: number }, deltaFromNowSeconds: number) => {
  const timezoneInfo = devInfo.UNIT_ID && await sqldb.CLUNITS.getTimezoneByUnit({ UNIT_ID: devInfo.UNIT_ID });
  let timezoneOffset = -3;
  let tsBegin = '';
  if (timezoneInfo) {
    timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET })
    tsBegin = new Date(Date.now() + timezoneOffset * 60 * 60 * 1000 - (deltaFromNowSeconds * 1000)).toISOString().substring(0, 19);
  } else {
    tsBegin = new Date(Date.now() - 3 * 60 * 60 * 1000 - (deltaFromNowSeconds * 1000)).toISOString().substring(0, 19)
  }

  return {tsBegin, timezoneOffset: timezoneInfo && timezoneOffset };
}

const parseCompiledChartData = (compiledData: Awaited<ReturnType<typeof rusthistApi['/comp-dac-v2']>>) => {
  return {
    Lcmp: parseCompressedChartData(compiledData.Lcmp) ?? undefined,
    Psuc: parseCompressedChartData(compiledData.Psuc) ?? undefined,
    Pliq: parseCompressedChartData(compiledData.Pliq) ?? undefined,
    Tamb: parseCompressedChartData(compiledData.Tamb) ?? undefined,
    Tsuc: parseCompressedChartData(compiledData.Tsuc) ?? undefined,
    Tliq: parseCompressedChartData(compiledData.Tliq) ?? undefined,
    Levp: parseCompressedChartData(compiledData.Levp) ?? undefined,
    Lcut: parseCompressedChartData(compiledData.Lcut) ?? undefined,
    Tsc: parseCompressedChartData(compiledData.Tsc) ?? undefined,
    Tsh: parseCompressedChartData(compiledData.Tsh) ?? undefined,
  };
}

const uncompressDacHist = (compData: ReturnType<typeof parseCompiledChartData>, tsBegin: string) => {
  const result = {
    initialTimestamp: tsBegin,
    timeAxis: [] as number[],
    Lcmp: uncompressHistVec(compData.Lcmp) || undefined,
    Levp: uncompressHistVec(compData.Levp) || undefined,
    Lcut: uncompressHistVec(compData.Lcut) || undefined,
    Tamb: uncompressHistVec(compData.Tamb) || undefined,
    Tsuc: uncompressHistVec(compData.Tsuc) || undefined,
    Tliq: uncompressHistVec(compData.Tliq) || undefined,
    Psuc: uncompressHistVec(compData.Psuc) || undefined,
    Pliq: uncompressHistVec(compData.Pliq) || undefined,
    Tsh: uncompressHistVec(compData.Tsh) || undefined,
    Tsc: uncompressHistVec(compData.Tsc) || undefined,
  };
  for (let i = 0; i < result.Lcmp.length; i++) {
    result.timeAxis.push(i);
  }
  return result;
}

/**
 * @swagger
 * /dac/get-recent-history-v2:
 *   post:
 *     summary: Histórico recente do DAC
 *     description: Retorna o histórico recente do DAC dos últimos N segundos
 *     tags:
 *      - DacHist
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
 *             dacId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DAC
 *             intervalLength_s:
 *               required: true
 *               type: number
 *               default: null
 *               description: Quantidade de tempo em segundos que deseja buscar no histórico
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   items:
 *                     properties:
 *                       initialTimestamp:
 *                         type: string
 *                         description: Timestamp inicial
 *                       timeAxis:
 *                         type: array
 *                         description: Array com números do eixo de tempo
 *                         items:
 *                           type: number
 *                       Lcmp:
 *                         type: array
 *                         description: Array com valores de Sinal de Comando do compressor
 *                         items:
 *                           type: number
 *                       Levp:
 *                         type: array
 *                         description: Array com valores de Sinal de Comando da evaporadora
 *                         items:
 *                           type: number
 *                       Lcut:
 *                         type: array
 *                         description: Array com valores de Bloqueio de Comando
 *                         items:
 *                           type: number
 *                       Tamb:
 *                         type: array
 *                         description: Array com valores de Temperatura do Ambiênte
 *                         items:
 *                           type: number
 *                       Tsuc:
 *                         type: array
 *                         description: Array com valores de Temperatura de Sucção
 *                         items:
 *                           type: number
 *                       Tliq:
 *                         type: array
 *                         description: Array com valores de Temperatura do Líquido
 *                         items:
 *                           type: number
 *                       Psuc:
 *                         type: array
 *                         description: Array com valores de Pressão de Sucção
 *                         items:
 *                           type: number
 *                       Pliq:
 *                         type: array
 *                         description: Array com valores de Pressão do líquido
 *                         items:
 *                           type: number
 *                       Tsh:
 *                         type: array
 *                         description: Array com valores de Superaquecimento
 *                         items:
 *                           type: number
 *                       Tsc:
 *                         type: array
 *                         description: Array com valores de Subresfriamento
 *                         items:
 *                           type: number
 *       400:
 *         description: Parâmetro inválido!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getRecentHistoryV2: API_private2['/dac/get-recent-history-v2'] = async function (reqParams, session) {
  // # Verifica permissão
  const dacId = reqParams.dacId
  if (!dacId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400)
  if (reqParams.intervalLength_s <= 0) {
    throw Error('Invalid interval!').HttpStatus(400)
  }
  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: dacId });
  if (!dacInf) throw Error('DAC desconhecido').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  
  let intervalLength_s = reqParams.intervalLength_s;
  
  const { tsBegin, timezoneOffset } = await normalizeStartTimestamp(dacInf, intervalLength_s);

  if (isTemporaryId(dacId)) {
    logger.info('no history for temporary DAC_ID', dacId)
    return {
      data: {
        initialTimestamp: tsBegin,
        timeAxis: [] as number[],
      }
    }
  }

  const permsG = getUserGlobalPermissions(session);
  const debug_L1_fancoil = (dacInf.DAC_APPL === 'fancoil') && (permsG.manageAllClientsUnitsAndDevs);

  if (servConfig.isTestServer && servConfig.prodApiForwarder.user) {
    return prodApiPost('/dac/get-recent-history-v2', reqParams).then((r) => r.data);
  }
  const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  const compiledData = await rusthistApi['/comp-dac-v2']({
    dev_id: dacId,
    ts_ini: tsBegin,
    interval_length_s: intervalLength_s + 60,
    isVrf: hwCfg.isVrf,
    calculate_L1_fancoil: hwCfg.calculate_L1_fancoil,
    debug_L1_fancoil,
    hasAutomation: hwCfg.hasAutomation,
    fluid_type: hwCfg.FLUID_TYPE,
    open_end: true,
    P0Psuc: hwCfg.P0Psuc,
    P1Psuc: hwCfg.P1Psuc,
    P0Pliq: hwCfg.P0Pliq,
    P1Pliq: hwCfg.P1Pliq,
    P0mult: hwCfg.P0multLin,
    P1mult: hwCfg.P1multLin,
    P0multLin: hwCfg.P0multLin,
    P0multQuad: hwCfg.P0multQuad,
    P1multLin: hwCfg.P1multLin,
    P1multQuad: hwCfg.P1multQuad,
    P0ofst: hwCfg.P0ofst,
    P1ofst: hwCfg.P1ofst,
    T0_T1_T2: hwCfg.TsensRename && [
      hwCfg.TsensRename.T0,
      hwCfg.TsensRename.T1,
      hwCfg.TsensRename.T2,
    ],
    virtualL1: hwCfg.simulateL1,
    timezoneOffset,
    L1CalcCfg: hwCfg.L1CalcCfg,
  }, `/dac/get-recent-history-v2 ${session.user}`);

  if (!compiledData.Lcmp) {
    logger.info(`no history found for dacId: ${dacId}`)
    return {
      data: {
        initialTimestamp: tsBegin,
        timeAxis: [] as number[],
      }
    }
  }

  const compData = parseCompiledChartData(compiledData);

  const result = uncompressDacHist(compData, tsBegin);

  logger.info('responding historicalData')
  return { data: result }
}

// TODO: acabar com demo client, o administrador vai adicionar ou remover o demo client pelo gerenciamento de usuários

/**
 * @swagger
 * /dac/get-usage-per-month:
 *   post:
 *     summary: Busca dados de índice de uso de um DAC
 *     description: Retorna o índice de uso de um DAC por mês
 *     tags:
 *      - DacHist
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
 *             dacId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DAC
 *             monthIni:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Mês de início para busca dos dados
 *             numMonths:
 *               required: true
 *               type: number
 *               default: null
 *               description: Número de meses à partir do mês inicial para busca de dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       periodYM:
 *                         type: string
 *                         description: Data em YYYY-MM
 *                       hoursOn:
 *                         type: number
 *                         description: Quantidade de horas ligado
 *                       energyCons:
 *                         type: number
 *                         description: Quantidade de energia consumida
 *                       hoursOff:
 *                         type: number
 *                         description: Quantidade de horas desligado
 *                       hoursBlocked:
 *                         type: number
 *                         description: Quantidade de horas bloqueadas
 *                       numDeparts:
 *                         type: number
 *                         description: Número de partida
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getEnergyConsumptionMonth: API_private2['/dac/get-energy-consumption-month'] = async function (reqParams, session) {
  if (!reqParams.dacId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400)
  if (!/^\d\d\d\d-\d\d$/.test(reqParams.monthIni)) throw Error('Invalid monthIni').HttpStatus(400)
  if (!reqParams.numMonths) throw Error('Invalid parameters! Missing numMonths').HttpStatus(400)

  // # Verifica permissão
  const dacInfoFull = await sqldb.DACS_DEVICES.getExtraInfoFull({ DAC_ID: reqParams.dacId });
  if (!dacInfoFull) throw Error('DAC not found').HttpStatus(400);
  const perms = await getPermissionsOnUnit(session, dacInfoFull.CLIENT_ID, dacInfoFull.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const months: {
    [month: string] : {
      periodYM: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number,
    }
  } = {};
  const dayNext = new Date(`${reqParams.monthIni}-01T00:00:00Z`);
  for (let i = 0; i < reqParams.numMonths; i++) {
    const periodYM = dayNext.toISOString().substring(0, 7);
    months[periodYM] = {
      periodYM: periodYM,
      hoursOn: 0,
      energyCons: 0,
      hoursOff: 0,
      hoursBlocked: 0,
      numDeparts: 0,
    }
    dayNext.setUTCMonth(dayNext.getUTCMonth() + 1);
  }

  if (!isTemporaryId(reqParams.dacId)) {
    const dacUse = await getPeriodsUseData(reqParams.dacId, reqParams.monthIni, dayNext.toISOString().substring(0, 10));

    for (const dayStats of dacUse) {
      const periodYM = dayStats.YMD.substring(0, 7);
      if (!months[periodYM]) continue;
      months[periodYM].hoursOn += dayStats.hoursOn;
      months[periodYM].hoursOff += dayStats.hoursOff;
      months[periodYM].hoursBlocked += dayStats.hoursBlocked;
      months[periodYM].numDeparts += dayStats.numDeparts;
    }
  }

  const list = Object.values(months);
  for (const monthStats of list) {
    monthStats.energyCons = monthStats.hoursOn * (dacInfoFull.DAC_KW || 0);
  }

  return { list };
}

/**
 * @swagger
 * /dac/get-usage-per-day:
 *   post:
 *     summary: Busca dados de índice de uso de um DAC
 *     description: Retorna o índice de uso de um DAC por dia
 *     tags:
 *      - DacHist
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
 *             dacId:
 *               required: true
 *               type: string
 *               default: ""
 *               description: ID do dispositivo DAC
 *             datIni:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Dia de início para busca dos dados
 *             numDays:
 *               required: true
 *               type: number
 *               default: null
 *               description: Número de dias à partir do dia inicial para busca de dados
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         description: Dia do consumo
 *                       hoursOn:
 *                         type: number
 *                         description: Quantidade de horas ligado
 *                       energyCons:
 *                         type: number
 *                         description: Quantidade de energia consumida
 *                       hoursOff:
 *                         type: number
 *                         description: Quantidade de horas desligado
 *                       hoursBlocked:
 *                         type: number
 *                         description: Quantidade de horas bloqueadas
 *                       numDeparts:
 *                         type: number
 *                         description: Número de partida
 *       400:
 *         description: Informação não encontrada!
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getEnergyConsumption: API_private2['/dac/get-energy-consumption'] = async function (reqParams, session) {
  // # Verifica permissão
  const dacId: string = reqParams.dacId
  if (!dacId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reqParams.datIni)) throw Error('Formato de data inválido, precisa ser AAAA-MM-DD').HttpStatus(400);
  if (dacId.startsWith('DAC21019_') || dacId.startsWith('DAC_')) { return { list: [] } } // no history for temporary DAC_ID
  const dacInfoFull = await sqldb.DACS_DEVICES.getExtraInfoFull({ DAC_ID: dacId });
  if (!dacInfoFull) throw Error('DAC not found').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, dacInfoFull.CLIENT_ID, dacInfoFull.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const list = await getDailyUsage({ dacId, datIni: reqParams.datIni, numDays: reqParams.numDays, DAC_KW: dacInfoFull.DAC_KW });

  return { list }
}

export const getDailyUsage: API_Internal['/diel-internal/api-async/getDailyUsage'] = async function(reqParams) {
  let { dacId, datIni, numDays, DAC_KW } = reqParams; // day = '2019-12-31'
  
  if ((numDays <= 0) || (numDays > 370)) return null;

  const dateIni = new Date(datIni + 'T00:00:00Z')

  const daysData: {
    [day: string] : {
      day: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number,
      meanT: number,
      maxT: number,
      minT: number,
    }
  } = {};
  const dayNext = new Date(dateIni.getTime())
  for (let i = 0; i < numDays; i++) {
    const day = dayNext.toISOString().substring(0, 10);
    daysData[day] = {
      day: day,
      hoursOn: 0,
      energyCons: 0,
      hoursOff: 0,
      hoursBlocked: 0,
      numDeparts: 0,
      meanT: 0,
      maxT: 0,
      minT: 0,
    }
    dayNext.setUTCDate(dayNext.getUTCDate() + 1);
  }

  if (!isTemporaryId(dacId)) {
    const dacUse = await getPeriodsUseData(dacId, datIni, dayNext.toISOString().substring(0, 10));

    for (const dayStats of dacUse) {
      const day = dayStats.YMD;
      if (!daysData[day]) continue;
      daysData[day].hoursOn += dayStats.hoursOn;
      daysData[day].hoursOff += dayStats.hoursOff;
      daysData[day].hoursBlocked += dayStats.hoursBlocked;
      daysData[day].numDeparts += dayStats.numDeparts;
      daysData[day].meanT = dayStats.meantp && dayStats.meantp.med;
      daysData[day].maxT = dayStats.meantp && dayStats.meantp.max;
      daysData[day].minT = dayStats.meantp && dayStats.meantp.min;
    }
  }

  const list = Object.values(daysData);
  for (const dayStats of list) {
    dayStats.energyCons = dayStats.hoursOn * (DAC_KW || 0);
  }

  return list;
}

export const getDayChartsData: API_private2['/dac/get-day-charts-data'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.day)) throw Error('Invalid day').HttpStatus(400)

  // # Verifica permissão
  const devId = reqParams.dacId
  if (!devId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400)
  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
  if (!dacInf) throw Error('DAC não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (isTemporaryId(devId)) {
    return {
      numDeparts: 0,
      hoursOn: 0,
      hoursOff: 0,
      hoursBlocked: 0,
    };
  }

  const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  const hType = "TelemetryCharts";

  let compiledData = await getTelemetryByAsset({ motivo: `/dac/get-day-charts-data ${session.user}`}, devId, [reqParams.day], hwCfg, hType, dacInf, false);
    
  if (!compiledData) compiledData = [{}];

  compiledData = compiledData.filter((x) => x != null);

  if (!reqParams.selectedParams.includes('Psuc')) compiledData.forEach(tel => delete tel.Psuc);
  if (!reqParams.selectedParams.includes('Pliq')) compiledData.forEach(tel => delete tel.Pliq);
  if (!reqParams.selectedParams.includes('Tamb')) compiledData.forEach(tel => delete tel.Tamb);
  if (!reqParams.selectedParams.includes('Tsuc')) compiledData.forEach(tel => delete tel.Tsuc);
  if (!reqParams.selectedParams.includes('Tliq')) compiledData.forEach(tel => delete tel.Tliq);
  if (!reqParams.selectedParams.includes('Lcmp')) compiledData.forEach(tel => delete tel.Lcmp);
  if (!reqParams.selectedParams.includes('Lcmp')) compiledData.forEach(tel => delete tel.L1raw);
  if (!reqParams.selectedParams.includes('Lcmp')) compiledData.forEach(tel => delete tel.L1fancoil);
  if (!reqParams.selectedParams.includes('Levp')) compiledData.forEach(tel => delete tel.Levp);
  if (!reqParams.selectedParams.includes('Lcut')) compiledData.forEach(tel => delete tel.Lcut);
  if (!reqParams.selectedParams.includes('Tsh')) compiledData.forEach(tel => delete tel.Tsh);
  if (!reqParams.selectedParams.includes('Tsc')) compiledData.forEach(tel => delete tel.Tsc);

  let faults = {} as { [faultName : string]: { v: number[], c: number[] } };
  compiledData.forEach((telemetry, i) =>{
    const startDaytime = i === 0 && telemetry.startSeconds != null && telemetry.startSeconds > 0;
    const endDaytime = i === telemetry.Lcmp?.length - 1 && telemetry.endSeconds != null && telemetry.endSeconds < 86400; 
    const betweenDevices = i > 0 && compiledData[i-1].endSeconds !== telemetry.startSeconds;
    let secondsToFillStart = startDaytime ? telemetry.startSeconds : 0;
    secondsToFillStart = betweenDevices ? telemetry.startSeconds - compiledData[i-1].endSeconds : secondsToFillStart;
    let secondsToFillEnd = endDaytime ? 86400 - telemetry.endSeconds : 0;
    let parseAux;
    if (telemetry.faults) {
      for (const [faultName, chart] of Object.entries(telemetry.faults)) {

        if (i === 0) {
          faults[faultName] = { v: [], c: []};
        }

        parseAux = (chart && parseCompressedChartData(chart, telemetry.startSeconds, telemetry.endSeconds)) || undefined
        if (startDaytime || betweenDevices){
          faults[faultName].v = faults[faultName].v.concat(null);
          faults[faultName].c = faults[faultName].c.concat(secondsToFillStart);
        }
        faults[faultName].v = parseAux != null ? faults[faultName].v.concat(parseAux.v) : faults[faultName].v;
        faults[faultName].c = parseAux != null ? faults[faultName].c.concat(parseAux.c) : faults[faultName].c;
        
        if (parseAux != null && endDaytime){
          faults[faultName].v = faults[faultName].v.concat(null);
          faults[faultName].c = faults[faultName].c.concat(secondsToFillEnd);
        }
      }
    }
  })
  const { Lcmp, Psuc, Pliq, Tamb, Tsuc, Tliq, Levp, Lcut, Tsc, Tsh, L1raw, L1fancoil, provision_error, numDeparts, hoursOn, hoursOff, hoursBlocked } = parseCompressedWithDat(compiledData);

  return {
    Lcmp,
    Psuc,
    Pliq,
    Tamb,
    Tsuc,
    Tliq,
    Levp,
    Lcut,
    Tsc,
    Tsh,
    L1raw,
    L1fancoil,
    numDeparts,
    hoursOn: Math.round(hoursOn * 1000) / 1000,
    hoursOff: Math.round(hoursOff * 1000) / 1000,
    hoursBlocked: Math.round(hoursBlocked * 1000) / 1000,
    provision_error,
    faults
  }
}

export const getChartsDataCommon: API_private2['/dac/get-charts-data-common'] = async function (reqParams, session) {
  // # Verifica permissão
  const devId = reqParams.dacId
  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P01`);
  if (!devId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400)
  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
  const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  const permsAdmin = getUserGlobalPermissions(session);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  reqParams.dayYMD = new Date(`${reqParams.dayYMD}Z`).toISOString().substring(0, 10);
  let dayAux = reqParams.dayYMD;
  reqParams.numDays = reqParams.numDays && Math.round(reqParams.numDays);
  const numDaysValid = reqParams.numDays && (reqParams.numDays >= 1) && (reqParams.numDays <= 15);
  if (!numDaysValid) {
    throw Error('O período aceitável é de 1 a 15 dias').HttpStatus(400);
  }

  const days = [] as string[]
  for (let i = 0; i < reqParams.numDays; i++) {
    dayAux = addDays_YMD(reqParams.dayYMD, i);
    days.push(dayAux);
  }

  const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  const permsG = getUserGlobalPermissions(session);
  const hType = "TelemetryCharts";

  const debug_L1_fancoil = (dacInf.DAC_APPL === 'fancoil') && (permsG.manageAllClientsUnitsAndDevs);

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P02`);

  // seleciona dados para cada dia do range 
  let compiledData = await getTelemetryByAsset(
    { motivo: `/dac/get-charts-data-common ${session.user}`},
    devId,
    days,
    hwCfg,
    hType,
    dacInf,
    debug_L1_fancoil
  );

  compiledData = compiledData.filter((x) => x != null);

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P03 ${!!compiledData}`);

  if (!compiledData) compiledData = [{}];

  if (!reqParams.selectedParams.includes('Psuc') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.Psuc);
  if (!reqParams.selectedParams.includes('Pliq')) compiledData.forEach(data => delete data.Pliq);
  if (!reqParams.selectedParams.includes('Tamb')) compiledData.forEach(data => delete data.Tamb);
  if (!reqParams.selectedParams.includes('Tsuc') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.Tsuc);
  if (!reqParams.selectedParams.includes('Tliq') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.Tliq);
  if (!reqParams.selectedParams.includes('Lcmp') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.Lcmp);
  if (!reqParams.selectedParams.includes('Lcmp') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.L1raw);
  if (!reqParams.selectedParams.includes('Lcmp') && !reqParams.selectedParams.includes('Icomp')) compiledData.forEach(data => delete data.L1fancoil);
  if (!reqParams.selectedParams.includes('Levp')) compiledData.forEach(data => delete data.Levp);
  if (!reqParams.selectedParams.includes('Lcut')) compiledData.forEach(data => delete data.Lcut);
  if (!reqParams.selectedParams.includes('Tsh')) compiledData.forEach(data => delete data.Tsh);
  if (!reqParams.selectedParams.includes('Tsc')) compiledData.forEach(data => delete data.Tsc);
  if (!reqParams.selectedParams.includes('SavedData')) compiledData.forEach(data => delete data.SavedData);
  
  const damAutomation = await sqldb.DACS_DEVICES.getDamAutomationFromDac({DEVICE_CODE: devId});
  let damData, parsedDamStateData;
  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P04`);
  if (damAutomation.DAM_AUTOMATION_CODE) {
    if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P05`);
    damData = await Promise.all(days.map(async (day) =>  {
      let damAutomationCode = damAutomation.DAM_AUTOMATION_CODE;
      // Verifica se há registro de histórico de movimentação de dispositivo que automatiza a máquina atualmente, para considerar outro dispositivo se necessário
      const automationInfo = await sqldb.AUTOM_GROUPS_HISTORY.getDevGroupToRealocationHistory({ DEV_ID: damAutomation.DAM_AUTOMATION_CODE });
      // Se o dispositivo automatiza mais de uma máquina, não utilizará essa estratégia
      if (automationInfo.length === 1) {
        const automDevs = await sqldb.AUTOM_GROUPS_HISTORY.getDevsToTelemetry({ GROUP_ID: automationInfo[0].GROUP_ID, dateStart: day, dateEnd: day })
        // Se houver mais de um dispositivo para o mesmo dia (dia que houve troca de dispositivo), foi decidido considerar apenas o mais recente para o dia.
        damAutomationCode = automDevs.length > 0 ? automDevs[automDevs.length - 1].DEV_ID : devId;
      }

      if (damAutomationCode != null) {
        const currDay = new Date(day);
        const currentAutomation = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: damAutomationCode});
        const firstProgrammingDate = currentAutomation?.FIRST_PROGRAMMING_DATE ? new Date(currentAutomation?.FIRST_PROGRAMMING_DATE) : null;
        if (firstProgrammingDate && currDay >= firstProgrammingDate) {
          return await processDamDay({ motivo: `/dac/get-charts-data-common P2 ${session.user}`, damId: damAutomationCode, day: day, unitId: dacInf.UNIT_ID })
        }
      }
      return {State: '*86400'};
    }));

    parsedDamStateData = damData.map((data) => (data.State && parseCompressedChartDataS2(data.State, ['Disabled', 'Ventilation', 'Condenser 1', 'Condenser 2', 'Enabled'])));    
    parsedDamStateData = parsedDamStateData.map((data) => ({...data, ...(data?.c && { c: data.c.map((v) => (v))})}));
  }
  // Realiza parse e compressão de cada dia
  let datas = [] as {
    Lcmp: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Psuc: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Pliq: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Tamb: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Tsuc: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Tliq: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Levp: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Lcut: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Tsc: Awaited<ReturnType<typeof parseCompressedChartData>>,
    Tsh: Awaited<ReturnType<typeof parseCompressedChartData>>,
    L1raw: Awaited<ReturnType<typeof parseCompressedChartData>>,
    L1fancoil: Awaited<ReturnType<typeof parseCompressedChartData>>,
    DamAutState: Awaited<ReturnType<typeof parseCompressedChartData>>,
    SavedData: Awaited<ReturnType<typeof parseCompressedChartData>>,
    provision_error: boolean,
  }[]
  let finalNumDeparts = [] as number[];

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P06`);

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    let telemetriesDay = compiledData.filter(data => data?.day === day);

    const DamAutState = parsedDamStateData ? Object.keys(parsedDamStateData[dayIdx]).length && parsedDamStateData[dayIdx] : null; 
    if (DamAutState) {
      removeTransitory(DamAutState);
    }

    const { Lcmp, Psuc, Pliq, Tamb, Tsuc, Tliq, Levp, Lcut, Tsc, Tsh, L1raw, L1fancoil, provision_error, numDeparts, SavedData } = parseCompressedWithDat(telemetriesDay);
    datas.push({
      Lcmp,
      Psuc,
      Pliq,
      Tamb,
      Tsuc,
      Tliq,
      Levp,
      Lcut,
      Tsc,
      Tsh,
      L1raw,
      L1fancoil,
      DamAutState,
      provision_error,
      SavedData,
    });
    finalNumDeparts.push(numDeparts);
  }


  // Calcula todos valores de pontos X em horas para os dados recebidos
  let parsedGraphData = datas.map((data, i)=> processReceivedHistoryDAC(data, reqParams.usePsi, i));
  let parsedFaults: {
    [faultName: string]: {
      x: number;
      y?: number;
      L?: number;
    }[]
  }[];

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P07`);

  let vars = {
    Lcmp: [] as { x: number; y?: number; L?: number; }[],
    Psuc: [] as { x: number; y?: number; L?: number; }[],
    Pliq: [] as { x: number; y?: number; L?: number; }[],
    Tamb: [] as { x: number; y?: number; L?: number; }[],
    Tsuc: [] as { x: number; y?: number; L?: number; }[],
    Tliq: [] as { x: number; y?: number; L?: number; }[],
    Levp: [] as { x: number; y?: number; L?: number; }[],
    Lcut: [] as { x: number; y?: number; L?: number; }[],
    Tsc: [] as { x: number; y?: number; L?: number; }[],
    Tsh: [] as { x: number; y?: number; L?: number; }[],
    L1raw: [] as { x: number; y?: number; L?: number; }[],
    L1fancoil: [] as { x: number; y?: number; L?: number; }[],
    DamAutState: [] as { x: number; y?: number; L?: number; }[],
    SavedData: [] as { x: number; y?: number; L?: number; }[],
  };

  if (debug_L1_fancoil) {
    vars.L1raw = [];
    vars.L1fancoil = [];
  }

  let boolLines = [] as { x: number; y?: number; L?: number; }[][]; 

  let dataLimits = {} as {
    maxPval?: null|number
    maxTval?: null|number
    minPval?: null|number
    minTval?: null|number
  };

  // Calcula valores mínimo e máximo de eixos
  parsedGraphData.forEach(data => {
    if (data.dataLimits.maxPval != null) {
      if (!dataLimits.maxPval || dataLimits.maxPval <= data.dataLimits.maxPval) {
        dataLimits.maxPval = data.dataLimits.maxPval;
      }
    }
    if (data.dataLimits.maxTval != null) {
      if (!dataLimits.maxTval || dataLimits.maxTval <= data.dataLimits.maxTval) {
        dataLimits.maxTval = data.dataLimits.maxTval;
      }
    }
    if (data.dataLimits.minPval != null) {
      if (!dataLimits.minPval || dataLimits.minPval >= data.dataLimits.minPval) {
        dataLimits.minPval = data.dataLimits.minPval;
      }
    }
    if (data.dataLimits.minTval != null) {
      if (!dataLimits.minTval || dataLimits.minTval >= data.dataLimits.minTval) {
        dataLimits.minTval = data.dataLimits.minTval;
      }
    }
  });

  let minTtick = Math.floor((dataLimits.minTval - 1) / 5) * 5;
  if (minTtick > 0) minTtick = 0;
  const L1start = (minTtick != null) ? (minTtick - 0) : 0;

  // Une os dados de cada dia por variável para facilitar lógica de união em único vetor
  parsedGraphData.forEach(data => {

      if (reqParams.hasAutomation && debug_L1_fancoil) {
        boolLines = [data.parsedGraphData.L1raw, data.parsedGraphData.L1fancoil, data.parsedGraphData.Lcut];
      }
      else if (reqParams.hasAutomation && !debug_L1_fancoil) {
        boolLines = [data.parsedGraphData.Levp, data.parsedGraphData.Lcut];
      }
      else if (!reqParams.hasAutomation && debug_L1_fancoil) {
        boolLines = [data.parsedGraphData.L1raw, data.parsedGraphData.L1fancoil];
      }
      else {
        boolLines = [data.parsedGraphData.Lcmp];
      }

      boolLines.push(data.parsedGraphData.SavedData);

      updateBoolY(boolLines, L1start);

      vars.Lcmp = vars.Lcmp.concat(data.parsedGraphData.Lcmp);
      vars.Psuc = vars.Psuc.concat(data.parsedGraphData.Psuc);
      vars.Pliq = vars.Pliq.concat(data.parsedGraphData.Pliq);
      vars.Tamb = vars.Tamb.concat(data.parsedGraphData.Tamb);
      vars.Tsuc = vars.Tsuc.concat(data.parsedGraphData.Tsuc);
      vars.Tliq = vars.Tliq.concat(data.parsedGraphData.Tliq);
      vars.Levp = vars.Levp.concat(data.parsedGraphData.Levp);
      vars.Lcut = vars.Lcut.concat(data.parsedGraphData.Lcut);
      vars.Tsc = vars.Tsc.concat(data.parsedGraphData.Tsc);
      vars.Tsh = vars.Tsh.concat(data.parsedGraphData.Tsh);
      vars.L1raw = vars.L1raw.concat(data.parsedGraphData.L1raw);
      vars.L1fancoil = vars.L1fancoil.concat(data.parsedGraphData.L1fancoil);
      vars.DamAutState = vars.DamAutState.concat(data.parsedGraphData.DamAutState);
      vars.SavedData = vars.SavedData.concat(data.parsedGraphData.SavedData);
    }
  )

  let cAux = [] as number[];
  let vAux = [] as number[];
  let LAux = [] as number[];
  let varList = [] as { c: number[], v: number[], L: number[] }[];

  // Une os dados de cada dia em um vetor por variável
  const varsNames = Object.keys(vars) as (keyof typeof vars)[];
  for (const propriedade of varsNames) {
    if (vars.hasOwnProperty(propriedade)) {
      vars[propriedade].map((data) => {
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

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: P08`);

  const list = mergeVarsCommomX(varList, reqParams.numDays);

  const yIcomp = [];
  // Se L1 off corrente não aparece
  // Corrente do Compressor = (Pressão atual - Pressão padrão do fluido) * Coef de correlação + Corrente máx[1 fase]
  // DeltaT = T_liq - T_suc
  // 4 - Tsuc
  // 5 - Tliq
  // 1 - Psuc
  // 0 - L1
  const assetInfo = await sqldb.ASSETS.getAssetInfo({DEV_ID: reqParams.dacId});

  let pressureDefault: number; 
  
  if (assetInfo?.FLUID_TYPE) {
    if (assetInfo.FLUID_TYPE.toLowerCase() === 'r410a' || assetInfo.FLUID_TYPE.toLowerCase() === 'r32') {
      pressureDefault = 7.5
    } else {
      pressureDefault = 3.5
    }
  } else {
    pressureDefault = 7.5
  }

  const maximumCurrent = assetInfo?.COMPRESSOR_NOMINAL_CURRENT;

  if (list.vs[4].length && list.vs[5].length && list.vs[1].length && list.vs[0].length && reqParams.selectedParams.includes("Icomp") && maximumCurrent) {
    for(let i = 0; i < list.vs[1].length; i++) {
      if (!list.vs[1][i] || list.vs[1][i] == null) {
        yIcomp.push(null);
        continue;
      }
      
      if (Number(list.vs[1][i]) < 1.3 || list.vs[0][i] === 0) {
        yIcomp.push(0);
        continue;
      }
      
      let PsucInBar = reqParams.usePsi ? Number(list.vs[1][i]) / 14.5037738 : Number(list.vs[1][i]);

      let Icomp = (PsucInBar - pressureDefault) * 1.69 + maximumCurrent;

      const delta = Icomp - maximumCurrent;

      if (delta > 0.07 * maximumCurrent) {
        Icomp = maximumCurrent * 1.07
      } else if (delta < -0.07 * maximumCurrent) {
        Icomp = maximumCurrent * 0.93
      }

      Icomp = Icomp * Math.sqrt(3);

      if (Math.ceil(Icomp) != null && list.L[0][i] === 1) {
        if (!dataLimits.minTval || dataLimits.minTval >= Math.ceil(Icomp)) {
          dataLimits.minTval = Math.ceil(Icomp);
        }
      }

      if (Math.ceil(Icomp) != null && list.L[0][i] === 1) {
        if (!dataLimits.maxTval || dataLimits.maxTval <= Math.ceil(Icomp)) {
          dataLimits.maxTval = Math.ceil(Icomp) + 2;
        }
      }

      yIcomp.push(list.L[0][i] === 1 ? Icomp.toFixed(2) : (list.vs[1][i] ? 0 : null ));
    }
  }

  const yVinsuf = [];
  const driAutomation = await sqldb.DACS_DEVICES.getDriAutomationFromDac({DEVICE_CODE: devId});
  if (driAutomation.DRI_AUTOMATION_CODE && (assetInfo?.INSUFFLATION_SPEED_INPUT || assetInfo?.INSUFFLATION_SPEED)) {
    const driChartData = await httpApiRouter.externalRoutes['/dri/get-day-charts-data-common']({driId: driAutomation.DRI_AUTOMATION_CODE, dayYMD: reqParams.dayYMD, numDays: reqParams.numDays, selectedParams: ['Setpoint', 'Status', 'Mode', 'DutTemp', 'ThermOn', 'Lock', 'TempAmb', 'ValveOn', 'FanStatus'],}, session);
    const operationMode = driChartData.vars['OperationMode']?.y;

    const currentAutomation = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: driAutomation.DRI_AUTOMATION_CODE});
    const firstProgrammingDate = currentAutomation?.FIRST_PROGRAMMING_DATE ? new Date(currentAutomation?.FIRST_PROGRAMMING_DATE) : null;
    if(firstProgrammingDate) {
      firstProgrammingDate.setHours(0, 0, 0, 0);
    }
    let firstProgAfterLastDay = false;
    let firstProgBetweenFirstAndLastDay = false;
    let showFrom = null;;
    const firstDay =  new Date(days[0]);
    const lastDay = new Date(days[days.length-1]);
    if (firstProgrammingDate && firstProgrammingDate >= lastDay) {
      firstProgAfterLastDay = true;
    }
    if (firstProgrammingDate && firstProgrammingDate >= firstDay && firstProgrammingDate < lastDay) {
      firstProgBetweenFirstAndLastDay = true;
      firstProgrammingDate.setHours(0, 0, 0, 0);
      firstDay.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(firstProgrammingDate.getTime() - firstDay.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const pointsByDay = Math.floor(operationMode.length/reqParams.numDays);
      showFrom = pointsByDay*diffDays;
    }

    if (operationMode && operationMode.length) {
      for (let i = 0; i < operationMode.length; i++) {
        if (!firstProgrammingDate || firstProgAfterLastDay) {
          yVinsuf.push(null);
          continue;
        }
        if (firstProgBetweenFirstAndLastDay) {
          if (showFrom && i < showFrom) {
            yVinsuf.push(null);
            continue;
          }
        }
        if (operationMode[i] !== 0 && operationMode[i] !== null) {
          const speed = assetInfo.INSUFFLATION_SPEED_INPUT || assetInfo.INSUFFLATION_SPEED;
  
          yVinsuf.push(speed);
          if (speed) {
            if (!dataLimits.minTval || dataLimits.minTval >= speed) {
              dataLimits.minTval = speed;
            }
          }
          if (speed) {
            if (!dataLimits.maxTval || dataLimits.maxTval <= speed) {
              dataLimits.maxTval = speed + 2;
            }
          }
        } else if (operationMode[i] === null) {
          yVinsuf.push(null);
        } else {
          yVinsuf.push(0);
        }
      }

    }
  } else if (list.vs.length > 12 && list.vs[12].length && (assetInfo?.INSUFFLATION_SPEED_INPUT || assetInfo?.INSUFFLATION_SPEED) && damAutomation.DAM_AUTOMATION_CODE) {
    for (let i = 0; i < list.vs[12].length; i++) {
      if (list.vs[12][i] !== 0 && list.vs[12][i] !== 1 && list.vs[12][i] !== null) {
        const speed = assetInfo.INSUFFLATION_SPEED_INPUT || assetInfo.INSUFFLATION_SPEED;

        yVinsuf.push(speed);
        if (speed) {
          if (!dataLimits.minTval || dataLimits.minTval >= speed) {
            dataLimits.minTval = speed;
          }
        }
        if (speed) {
          if (!dataLimits.maxTval || dataLimits.maxTval <= speed) {
            dataLimits.maxTval = speed + 2;
          }
        }
      } else if (list.vs[12][i] === null) {
        yVinsuf.push(null);
      } else {
        yVinsuf.push(0);
      }
    }
  }
  return {
    commonX: list.c,
    vars: {
      Tamb:{
        name: reqParams.isFanCoil ? 'Temperatura de ar de entrada' : 'Temperatura externa',
        y: list.vs[3],
        L: list.L[3],
      },
      Tsuc:{
        name: reqParams.isFanCoil ? 'Temperatura de saída de água' : 'Temperatura de sucção',
        y: reqParams.selectedParams.includes("Tsuc") ? list.vs[4] : [],
        L: reqParams.selectedParams.includes("Tsuc") ? list.L[4] : [],
      },
      Tliq:{
        name: reqParams.isFanCoil ? 'Temperatura de entrada de água' : 'Temperatura de líquido',
        y: reqParams.selectedParams.includes("Tliq") ? list.vs[5] : [],
        L: reqParams.selectedParams.includes("Tliq") ? list.L[5] : [],
      },
      Psuc:{
        name: reqParams.usePsi ? 'Pressão de sucção [PSI]' : 'Pressão de sucção [Bar]',
        y: reqParams.selectedParams.includes("Psuc") ? list.vs[1] : [],
        L: reqParams.selectedParams.includes("Psuc") ? list.L[1] : [],
      },
      Pliq:{
        name: reqParams.usePsi ? 'Pressão de líquido [PSI]' : 'Pressão de líquido [Bar]',
        y: list.vs[2],
        L: list.L[2],
      },
      Tsc:{
        name: 'Subresfriamento [ΔTºC]',
        y: list.vs[8],
        L: list.L[8],
      },
      Tsh:{
        name: 'Superaquecimento [ΔTºC]',
        y: list.vs[9],
        L: list.L[9],
      },
      Lcmp:{
        name: 'Sinal de comando',
        y: reqParams.selectedParams.includes("Lcmp") ? list.vs[0] : [],
        L: reqParams.selectedParams.includes("Lcmp") ? list.L[0] : [],
      },
      Levp:{
        name: 'Sinal de comando',
        y: list.vs[6],
        L: list.L[6],
      },
      Lcut:{
        name: 'Bloqueio de comando',
        y: list.vs[7],
        L: list.L[7],
      },
      L1raw: debug_L1_fancoil ? {
        name: 'Sinal de comando real',
        y: list.vs[10],
        L: list.L[10],
      } : undefined,
      L1fancoil: debug_L1_fancoil ? {
        name: 'Sinal de comando simulado',
        y: list.vs[11],
        L: list.L[11],
      } : undefined,
      // FEATURE DISPONIVEL APENAS PARA OS CLIENTES: BANCO DO BRASIL e DIEL ENERGIA
      ...((dacInf?.CLIENT_ID === 145 || dacInf?.CLIENT_ID === 1) && (assetInfo?.AST_ROLE === 1 || assetInfo?.AST_ROLE === 2) && {
        Icomp: {
          name: 'Corrente do Compressor',
          y: reqParams.selectedParams.includes("Icomp") ? yIcomp : [],
          L: reqParams.selectedParams.includes("Icomp") ? Array(yIcomp.length).fill(null) : [],
        }
      }),
      ...((dacInf?.CLIENT_ID === 145 || dacInf?.CLIENT_ID === 1) && (assetInfo?.AST_ROLE === 1 || assetInfo?.AST_ROLE === 2) && yVinsuf.length && (assetInfo?.INSUFFLATION_SPEED_INPUT || assetInfo?.INSUFFLATION_SPEED) && (damAutomation.DAM_AUTOMATION_CODE || driAutomation.DRI_AUTOMATION_CODE) && {
        Vinsuf: {
          name: 'Velocidade de Insuflamento',
          y: reqParams.selectedParams.includes("Vinsuf") ? yVinsuf : [],
          L: reqParams.selectedParams.includes("Vinsuf") ? Array(yVinsuf.length).fill(null) : [],
        }
      }),
      ...((permsAdmin.manageAllClientsUnitsAndDevs) && {
        SavedData: {
          name: 'Conexão do dispositivo',
          y: reqParams.selectedParams.includes("SavedData") ? list.vs[13] : [],
          L: reqParams.selectedParams.includes("SavedData") ? list.L[13] : [],
        }
      })
    },
    limts: { 
      maxPval: dataLimits.maxPval,
      maxTval: dataLimits.maxTval,
      minPval: dataLimits.minPval,
      minTval: dataLimits.minTval,
    },
    numDeparts: finalNumDeparts
  };
}

export const getDayConsumption: API_private2['/dac/get-day-consumption'] = async function (reqParams, session) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(reqParams.day)) throw Error('Invalid day').HttpStatus(400)

  // # Verifica permissão
  const devId = reqParams.dacId
  if (!devId) throw Error('Invalid parameters! Missing dacId').HttpStatus(400)
  const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
  const perms = await getPermissionsOnUnit(session, dacInf.CLIENT_ID, dacInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (isTemporaryId(devId)) {
    return {
      consumption: null,
      meanT: null,
      maxT: null,
      minT: null,
    };
  }

  const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);

  let compiledData = await dayCompiler.processDacDay({ motivo: `/dac/get-day-consumption ${session.user}`, dac: { devId, hwCfg }, day: reqParams.day, hType: "TelemetryCharts", dacExtInf: dacInf });
  if (!compiledData) compiledData = {};

  const Lcmp = (compiledData.Lcmp && parseCompressedChartData(compiledData.Lcmp)) || undefined;
  const Tamb = (compiledData.Tamb && parseCompressedChartData(compiledData.Tamb)) || undefined;
  const consumption = consumoPorHora(Lcmp);
  const { max, med, min } = maxMedMinPorHora(Tamb);

  return { consumption, meanT: med, maxT: max, minT: min };
}

export async function getTelemetryByAsset(rusthistDebug: { motivo: string }, devId: string, days: string[], hwCfg: DacHwCfg, hType: HistoryTypeDAC, dacInf: { GROUP_ID: number, DAC_APPL: string, UNIT_ID?: number }, debug_L1_fancoil?: boolean){
  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PB1`);
  // Checks if has DAT_ID, then consider hystoric dacs 
  const dacCurrentAsset = (await sqldb.ASSETS.getAssetByDeviceCode({DEVICE_CODE: devId}))?.ASSET_ID;
  const clientAssetDev = (await sqldb.ASSETS.getDevsHistoryAsset({ DEV_ID: devId }))?.filter((x) => x.DEV_ID != null && x.ASSET_ID == dacCurrentAsset); 

  const datesDev = [] as {
    day: string,
    devId: string,
    index: number,
    startSeconds: number|null,
    endSeconds: number|null,
  }[];

  // Lista de dispositivos a considerar na busca da telemetria
  if (clientAssetDev.length <= 1) {
    days.forEach((day, index) => {
      datesDev.push({
        day,
        devId: devId,
        index,
        startSeconds: null,
        endSeconds: null,
      });
    });
  }
  else {
    let devsFromDat: {
      DEV_ID: string,
      START_DATE: string
      END_DATE: string
      FULL_START_DATE: string
      FULL_END_DATE: string
    }[];
    let timezoneOffset = -3;
    const timezoneInfo = await getTimezoneInfoByDev({ devId: devId });
    if (timezoneInfo != null) {
      timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
    }
    if (clientAssetDev[0].ASSET_ROLE === 'CONDENSER') {
      devsFromDat = await sqldb.ASSETS.getDevsToTelemetryByCondenserId({CONDENSER_ID: clientAssetDev[0].DAT_INDEX, dateStart: days[0], dateEnd: days[days.length - 1], timezoneOffset});
    }
    else if (clientAssetDev[0].ASSET_ROLE === 'EVAPORATOR') {
      devsFromDat = await sqldb.ASSETS.getDevsToTelemetryByEvaporatorId({EVAPORATOR_ID: clientAssetDev[0].DAT_INDEX, dateStart: days[0], dateEnd: days[days.length - 1], timezoneOffset});
    }
    else {
      devsFromDat = await sqldb.ASSETS.getDevsToTelemetryByAssetHeatExchangerId({ASSET_HEAT_EXCHANGER_ID: clientAssetDev[0].DAT_INDEX, dateStart: days[0], dateEnd: days[days.length - 1], timezoneOffset});
    }
    days.forEach((day, index) => {
      const dayFirstHour = `${day} 00:00:00`;
      const dayFinalHour = `${day} 23:59:59`;
      const selectedToDate = devsFromDat.filter(dev => dev.START_DATE <= day && (dev.END_DATE >= day || dev.END_DATE === null));
      selectedToDate.forEach((selected) => {
        datesDev.push({
          day,
          devId: selected.DEV_ID,
          index,
          startSeconds: dayFirstHour >= selected.FULL_START_DATE ? null : timeToSeconds(selected.FULL_START_DATE),
          endSeconds: (selected.FULL_END_DATE == null || dayFinalHour <= selected.FULL_END_DATE) ? null : timeToSeconds(selected.FULL_END_DATE),
        });
      })
    });
  }

  if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: PB2`, JSON.stringify(datesDev));

  // seleciona dados para cada dia do range 
  let compiledData = [] as (FullHist_DAC&{
    day?: string,
    devId?: string,
    index?: number,
    startSeconds?: number,
    endSeconds?: number,
  })[];
  compiledData = await Promise.all(
    datesDev.map(info => dayCompiler.processDacDay({ motivo: rusthistDebug.motivo, dac: { devId: info.devId, hwCfg }, day: info.day, hType, dacExtInf: dacInf, debug_L1_fancoil }))
  );
  
  compiledData.forEach((item, index) => {
    if (devId === 'DAC403233418') console.log(`DBG-DAC403233418-2407: compiledData.forEach(${index})`, JSON.stringify(item));
    if (item !== null){
      compiledData[index]['day'] = datesDev[index].day;
      compiledData[index]['devId'] = datesDev[index].devId;
      compiledData[index]['index'] = datesDev[index].index;
      compiledData[index]['startSeconds'] = datesDev[index].startSeconds;
      compiledData[index]['endSeconds'] = datesDev[index].endSeconds;
    }
  })

  return compiledData;
}

function parseCompressedWithDat(telemetriesDay: Awaited<ReturnType<typeof  getTelemetryByAsset>>){
  let parseAux = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Lcmp = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Psuc = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Pliq = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Tamb = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Tsuc = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Tliq = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Levp = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Lcut = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Tsc = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let Tsh = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let L1raw = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let L1fancoil = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;
  let SavedData = {v: [], c: []} as Awaited<ReturnType<typeof parseCompressedChartData>>;

  let provision_error = false;
  let numDeparts = 0;
  let hoursOn = 0;
  let hoursOff = 0;
  let hoursBlocked = 0;
  telemetriesDay.forEach((telemetry, i) => {
    provision_error = provision_error || telemetry.provision_error;
    numDeparts = numDeparts + telemetry.numDeparts;
    hoursOn = hoursOn + telemetry.hoursOn;
    hoursOff = hoursOff + telemetry.hoursOff;
    hoursBlocked = hoursBlocked + telemetry.hoursBlocked;
    const startDaytime = i === 0 && telemetry.startSeconds != null && telemetry.startSeconds > 0;
    const endDaytime = i === telemetriesDay.length - 1 && telemetry.endSeconds != null && telemetry.endSeconds < 86400; 
    const betweenDevices = i > 0 && telemetriesDay[i-1].endSeconds !== telemetry.startSeconds;
    let secondsToFillStart = startDaytime ? telemetry.startSeconds : 0;
    secondsToFillStart = betweenDevices ? telemetry.startSeconds - telemetriesDay[i-1].endSeconds : secondsToFillStart;
    let secondsToFillEnd = endDaytime ? 86400 - telemetry.endSeconds : 0;

    parseAux = (telemetry.Lcmp && parseCompressedChartData(telemetry.Lcmp, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Lcmp.v = Lcmp.v.concat(null);
      Lcmp.c = Lcmp.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Lcmp.v = Lcmp.v.concat(parseAux.v);
      Lcmp.c = Lcmp.c.concat(parseAux.c);
    } else if (telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Lcmp.v = Lcmp.v.concat(null);
      Lcmp.c = Lcmp.c.concat(duration);
    }
    if (endDaytime){
      Lcmp.v = Lcmp.v.concat(null);
      Lcmp.c = Lcmp.c.concat(secondsToFillEnd);
    }

    
    parseAux = (telemetry.Psuc && parseCompressedChartData(telemetry.Psuc, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Psuc.v = Psuc.v.concat(null);
      Psuc.c = Psuc.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Psuc.v = Psuc.v.concat(parseAux.v);
      Psuc.c = Psuc.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Psuc.v = Psuc.v.concat(null);
      Psuc.c = Psuc.c.concat(duration);
    }
    if (endDaytime){
      Psuc.v = Psuc.v.concat(null);
      Psuc.c = Psuc.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Pliq && parseCompressedChartData(telemetry.Pliq, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Pliq.v = Pliq.v.concat(null);
      Pliq.c = Pliq.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Pliq.v = Pliq.v.concat(parseAux.v);
      Pliq.c = Pliq.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Pliq.v = Pliq.v.concat(null);
      Pliq.c = Pliq.c.concat(duration);
    }
    if (endDaytime){
      Pliq.v = Pliq.v.concat(null);
      Pliq.c = Pliq.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Tamb && parseCompressedChartData(telemetry.Tamb, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Tamb.v = Tamb.v.concat(null);
      Tamb.c = Tamb.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Tamb.v = Tamb.v.concat(parseAux.v);
      Tamb.c = Tamb.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Tamb.v = Tamb.v.concat(null);
      Tamb.c = Tamb.c.concat(duration);
    }
    if (endDaytime){
      Tamb.v = Tamb.v.concat(null);
      Tamb.c = Tamb.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Tsuc && parseCompressedChartData(telemetry.Tsuc, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Tsuc.v = Tsuc.v.concat(null);
      Tsuc.c = Tsuc.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Tsuc.v = Tsuc.v.concat(parseAux.v);
      Tsuc.c = Tsuc.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Tsuc.v = Tsuc.v.concat(null);
      Tsuc.c = Tsuc.c.concat(duration);
    }
    if (endDaytime){
      Tsuc.v = Tsuc.v.concat(null);
      Tsuc.c = Tsuc.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Tliq && parseCompressedChartData(telemetry.Tliq, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Tliq.v = Tliq.v.concat(null);
      Tliq.c = Tliq.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Tliq.v = Tliq.v.concat(parseAux.v);
      Tliq.c = Tliq.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Tliq.v = Tliq.v.concat(null);
      Tliq.c = Tliq.c.concat(duration);
    }
    if (endDaytime){
      Tliq.v = Tliq.v.concat(null);
      Tliq.c = Tliq.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Levp && parseCompressedChartData(telemetry.Levp, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Levp.v = Levp.v.concat(null);
      Levp.c = Levp.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Levp.v = Levp.v.concat(parseAux.v);
      Levp.c = Levp.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Levp.v = Levp.v.concat(null);
      Levp.c = Levp.c.concat(duration);
    }
    if (endDaytime){
      Levp.v = Levp.v.concat(null);
      Levp.c = Levp.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Lcut && parseCompressedChartData(telemetry.Lcut, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Lcut.v = Lcut.v.concat(null);
      Lcut.c = Lcut.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Lcut.v = Lcut.v.concat(parseAux.v);
      Lcut.c = Lcut.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Lcut.v = Lcut.v.concat(null);
      Lcut.c = Lcut.c.concat(duration);
    }
    if (endDaytime){
      Lcut.v = Lcut.v.concat(null);
      Lcut.c = Lcut.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Tsc && parseCompressedChartData(telemetry.Tsc, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Tsc.v = Tsc.v.concat(null);
      Tsc.c = Tsc.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Tsc.v = Tsc.v.concat(parseAux.v);
      Tsc.c = Tsc.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Tsc.v = Tsc.v.concat(null);
      Tsc.c = Tsc.c.concat(duration);
    }
    if (endDaytime){
      Tsc.v = Tsc.v.concat(null);
      Tsc.c = Tsc.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.Tsh && parseCompressedChartData(telemetry.Tsh, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      Tsh.v = Tsh.v.concat(null);
      Tsh.c = Tsh.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      Tsh.v = Tsh.v.concat(parseAux.v);
      Tsh.c = Tsh.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      Tsh.v = Tsh.v.concat(null);
      Tsh.c = Tsh.c.concat(duration);
    }
    if (endDaytime){
      Tsh.v = Tsh.v.concat(null);
      Tsh.c = Tsh.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.L1raw && parseCompressedChartData(telemetry.L1raw, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      L1raw.v = L1raw.v.concat(null);
      L1raw.c = L1raw.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      L1raw.v = L1raw.v.concat(parseAux.v);
      L1raw.c = L1raw.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      L1raw.v = L1raw.v.concat(null);
      L1raw.c = L1raw.c.concat(duration);
    }
    if (endDaytime){
      L1raw.v = L1raw.v.concat(null);
      L1raw.c = L1raw.c.concat(secondsToFillEnd);
    }
    
    parseAux = (telemetry.L1fancoil && parseCompressedChartData(telemetry.L1fancoil, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      L1fancoil.v = L1fancoil.v.concat(null);
      L1fancoil.c = L1fancoil.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      L1fancoil.v = L1fancoil.v.concat(parseAux.v);
      L1fancoil.c = L1fancoil.c.concat(parseAux.c);
    } else if (i === 0 && telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      L1fancoil.v = L1fancoil.v.concat(null);
      L1fancoil.c = L1fancoil.c.concat(duration);
    }
    if (endDaytime){
      L1fancoil.v = L1fancoil.v.concat(null);
      L1fancoil.c = L1fancoil.c.concat(secondsToFillEnd);
    }

    parseAux = (telemetry.SavedData && parseCompressedChartData(telemetry.SavedData, telemetry.startSeconds, telemetry.endSeconds)) || undefined;
    if (startDaytime || betweenDevices){
      SavedData.v = SavedData.v.concat(null);
      SavedData.c = SavedData.c.concat(secondsToFillStart);
    }
    if (parseAux) {
      SavedData.v = SavedData.v.concat(parseAux.v);
      SavedData.c = SavedData.c.concat(parseAux.c);
    } else if (telemetry.startSeconds === null && telemetry.endSeconds != null) {
      const duration = telemetry.endSeconds - telemetry.startSeconds;
      SavedData.v = SavedData.v.concat(null);
      SavedData.c = SavedData.c.concat(duration);
    }
    if (endDaytime){
      SavedData.v = SavedData.v.concat(null);
      SavedData.c = SavedData.c.concat(secondsToFillEnd);
    }
  });

  return {
    Lcmp, Psuc, Pliq, Tamb, Tsuc, Tliq, Levp, Lcut, Tsc, Tsh, L1raw, L1fancoil, provision_error, numDeparts, hoursOn, hoursOff, hoursBlocked, SavedData
  };
}

export function consumoPorHora (Lcmp: { v: number[], c: number[] }) {
  const nHoras = {
    v: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
    c: [3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600],
  };
  const list = mergeEventsList([Lcmp, nHoras]);

  const cons = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  for (let i = 0; i < list.c.length; i++) {
    const l1 = list.vs[0][i];
    if (l1 !== 1) continue;
    const nHora = list.vs[1][i] as number;
    if (nHora == null) continue;
    cons[nHora] += list.c[i];
  }

  return cons;
}

function maxMedMinPorHora (Tp: { v: number[], c: number[] }) {
  const nHoras = {
    v: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
    c: [3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600],
  };
  const list = mergeEventsList([Tp, nHoras]);

  const max: number[] = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
  const min: number[] = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
  const med: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const count: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  for (let i = 0; i < list.c.length; i++) {
    const val = list.vs[0][i] as number;
    if (val == null) continue;
    const nHora = list.vs[1][i] as number;
    if (nHora == null) continue;
    if ((max[nHora] == null) || (val > max[nHora])) max[nHora] = val;
    if ((min[nHora] == null) || (val < min[nHora])) min[nHora] = val;
    med[nHora] += val;
    count[nHora]++;
  }
  for (let nHora = 0; nHora < 24; nHora++) {
    med[nHora] = (count[nHora] || null) && (Math.round((med[nHora] / count[nHora]) * 10) / 10);
  }

  return { max, med, min };
}


async function asyncPool<T>(poolLimit: number, array: T[], iteratorFn: (item: T) => Promise<void>): Promise<void> {
  const executing = new Set<Promise<void>>(); // Set to store the executing promises

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    executing.add(p);

    // When the number of executing promises reaches the poolLimit, wait for one of them to complete
    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }

    // Remove completed promises from the set of executing promises
    p.then(() => executing.delete(p)).catch(() => executing.delete(p));
  }

  // Wait for all remaining promises to complete
  await Promise.all(executing);
}

export function formatDate(date: Date): string {
  const pad = (val: number) => (val < 10 ? '0' : '') + val;
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function getSixMonthsAgo(): string {
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return formatDate(sixMonthsAgo);
}

function getCurrentDateFormatted(): string {
  return formatDate(new Date());
}

export const updateHistoryDacL1Psuc: API_private2['/dac/update-history-psuc-virtual'] = async function (reqParams, session) {
  logger.info('/dac/update-history-psuc-virtual Starting history update task', reqParams);
  const dateInit = reqParams.dateInit || getSixMonthsAgo();
  const dateFinish = reqParams.dateFinish || getCurrentDateFormatted();

  // Check if the provided dates are valid
  if (new Date(dateInit) > new Date(dateFinish)) {
    throw Error('Invalid date range!').HttpStatus(400);
  }

  // Fetch all DACs with virtual L1 and pressure, retrieving data from at most 6 months ago
  const info = await sqldb.L1_SOURCE.getAllDacsL1VirtualPsuc({ 
    dayInit: dateInit, 
    dayFinish: dateFinish, 
    CLIENT_NAME: reqParams.CLIENT_NAME, 
    UNIT_ID: reqParams.UNIT_ID,
    CITY_ID: reqParams.CITY_ID,
    STATE_NAME: reqParams.STATE_NAME,
    DACS_ID: reqParams.dacsId,
    last_calculated_date: reqParams.last_calculated_date
  });

  if (!info) {
    logger.error('/dac/update-history-psuc-virtual info is empty', reqParams)
  }

  // Function to process each device
  const processDevice = async (device: any) => {
    const devId = device.DEVICE_CODE;
    const data = device.YMD;

    // Retrieve additional DAC information
    const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId });
    const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
    if (!hwCfg) return; // If no hardware configuration is found, proceed to the next device

    // Remove cache data for the specified period
    await sqldb.cache_cond_tel.w_deleteFromPeriod({
      devId,
      startDate: data,
      endDate: data + 1
    }, '');

    const hType = "TelemetryCharts";

    logger.info('/dac/update-history-psuc-virtual Starting getTelemetryByAsset')
    // Obtain telemetry data for the device
    try {
      await getTelemetryByAsset(
        { motivo: '/dac/get-charts-data-common' },
        devId,
        [data],
        hwCfg,
        hType,
        dacInf,
        false
      );
    } catch(e) {}
  };

  // Call the asyncPool function with a limit of 15 simultaneous tasks, applying the processDevice function to each item in the info list
  await asyncPool(5, info, processDevice);
}

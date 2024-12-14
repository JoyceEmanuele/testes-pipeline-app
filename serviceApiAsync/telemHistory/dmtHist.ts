import sqldb from '../../srcCommon/db'
import { API_private2 } from '../../srcCommon/types/api-private'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { mergeVarsCommomX, parseCompressedChartData, processReceivedHistoryDMT } from '../../srcCommon/helpers/chartDataFormats'
import { addDays_YMD } from '../../srcCommon/helpers/dates';
import { processDmtDay } from '../dayCompilers/dmt';
import { SessionData } from '../../srcCommon/types';

const getRealNobreakFeedback = (electricNetwork: number, nobreak: number) => {
  if(electricNetwork === 1 && (nobreak === 0 || nobreak === 1)) return 2; // Rede Elétrica
  if(electricNetwork === 0 && nobreak === 1) return 1; // Bateria
  if(electricNetwork === 0 && nobreak === 0) return 0; // Desligado
  return null
};

const getTimeUsingBattery = (yAux: number[], commonX: number[]) => {
  let hoursSum = 0;
  let formattedTime = "00:00";
  if(!yAux.length) return {formattedTime, hoursSum};

  let batteryStarted = false;
  let batteryStartedIdx = null;
  if(yAux[0] === 1 && yAux[1] === 1){
    batteryStarted = true;
    batteryStartedIdx = 0;
  }

  for(let i = 1; i < yAux.length-1; i++) {
    if(yAux[i] === 1 && yAux[i-1] !== 1) {
      batteryStarted = true;
      batteryStartedIdx = i;
    }
    if(batteryStarted && yAux[i] === 1 && yAux[i+1] !== 1){
      batteryStarted = false;
      hoursSum += (commonX[i] - commonX[batteryStartedIdx]);
      batteryStartedIdx = null;
    }
  }
  
  if(batteryStarted && yAux[yAux.length-1] === 1){
    hoursSum += (commonX[yAux.length-1] - commonX[batteryStartedIdx]);
  }

  formattedTime = `${String(Math.trunc(hoursSum)).padStart(2, '0')}:${String(Math.trunc((hoursSum - Math.trunc(hoursSum))*60)).padStart(2, '0')}`;

  return {formattedTime, hoursSum};
};

const getCompiledDaysData = async (days: string[], devCode: string, user: string) => {
  // seleciona dados para cada dia do range
  async function compileData (day: string) {
    const dmtDayProcessed = await processDmtDay({ motivo: `/dmt/get-day-charts-data-common P1 ${user}`, dmtCode: devCode, day });
    return {
      F1: dmtDayProcessed?.F1,
      F2: dmtDayProcessed?.F2,
      F3: dmtDayProcessed?.F3,
      F4: dmtDayProcessed?.F4,
      provision_error: dmtDayProcessed?.provision_error
    }
  }
  let compiledData = await Promise.all(days.map(day => compileData(day)));
  compiledData = compiledData.filter((x) => x != null);

  let datas = [] as {[key: string]: {v: number[], c: number[]} | boolean}[];
  compiledData.forEach(data => {
    data && datas.push(
    {
      F1: (data.F1 && parseCompressedChartData(data.F1)) || undefined,
      F2: (data.F2 && parseCompressedChartData(data.F2)) || undefined,
      F3: (data.F3 && parseCompressedChartData(data.F3)) || undefined,
      F4: (data.F4 && parseCompressedChartData(data.F4)) || undefined,
      provision_error: data.provision_error,
    })
  }
  )

  return datas;
}

const getIllumConsumption = async (illumInfo: Awaited<ReturnType<typeof sqldb.ILLUMINATIONS.getIllumination>>, hoursSum: number) => {
  let consumption = hoursSum || hoursSum === 0 ? 0 : null;
  if (hoursSum && illumInfo.GRID_CURRENT && illumInfo.GRID_VOLTAGE) {
    const pot = illumInfo.GRID_CURRENT * illumInfo.GRID_VOLTAGE;
    consumption = (pot * hoursSum)/1000;
  }
  return consumption;
}

const getNobreaksChartData = async (devCode: string, list: {c: number[], vs: number[][], L: number[][]}) => {
  const dmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: devCode});
  if (!dmt) throw Error('DMT não encontrado').HttpStatus(400)

  const nobreakPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: dmt.ID });
  const eletricCircuitPort = await sqldb.DMTS_NOBREAK_CIRCUITS.getDmtUsedPorts({DMT_ID: dmt.ID });
  if(eletricCircuitPort.length != 1) throw Error('Rede elétrica do DMT não encontrada').HttpStatus(400)
  if(!eletricCircuitPort[0].PORT) throw Error('Porta de Rede elétrica do DMT não definida').HttpStatus(400)

  const eletricCircuitFeedback = `F${eletricCircuitPort[0].PORT}`;
  //@ts-ignore
  const nobreakFeedbacks = nobreakPorts.map((port) => {
    if(port.PORT) {
      return { feedback: `F${port.PORT}`, nobreakId: port.NOBREAK_ID}
    }
  });

  const feedbackIdx = {"F1": 0, "F2": 1, "F3": 2, "F4": 3} as {[key: string]: number};
  const varsAdapted: any = {};
  const eletricalNetworkFeedback = list.vs[feedbackIdx[eletricCircuitFeedback]];
  for(const nobreak of nobreakFeedbacks) {
    const yAux = list.vs[feedbackIdx[nobreak.feedback]].map((value, idx) => getRealNobreakFeedback(eletricalNetworkFeedback[idx], value));

    const formattedTime = getTimeUsingBattery(yAux, list.c);

    const nobreakInfo = await sqldb.NOBREAKS.getNobreak({ID: nobreak.nobreakId});

    varsAdapted[nobreak.nobreakId] = {
      nobreakId: nobreak.nobreakId,
      feedback: nobreak.feedback,
      timeUsingBattery: formattedTime,
      name: nobreakInfo.NAME,
      datCode: nobreakInfo.DAT_CODE,
      dmtCode: nobreakInfo.DMT_CODE,
      y: yAux
    }
  }

  return varsAdapted;
}

const getUtilitiesChartData = async (devCode: string, list: {c: number[], vs: number[][], L: number[][]}) => {
  const dmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: devCode});
  if (!dmt) throw Error('DMT não encontrado').HttpStatus(400)

  const nobreakPorts = await sqldb.DMTS_NOBREAKS.getDmtUsedPorts({DMT_ID: dmt.ID });
  const illuminationsPorts = await sqldb.DMTS_ILLUMINATIONS.getDmtUsedPorts({DMT_ID: dmt.ID });
  const eletricCircuitPort = await sqldb.DMTS_NOBREAK_CIRCUITS.getDmtUsedPorts({DMT_ID: dmt.ID });
  if(nobreakPorts.length && eletricCircuitPort.length !== 1) throw Error('Rede elétrica do DMT não encontrada').HttpStatus(400)
  if(nobreakPorts.length && !eletricCircuitPort[0].PORT) throw Error('Porta de Rede elétrica do DMT não definida').HttpStatus(400)

  const eletricCircuitFeedback = `F${eletricCircuitPort[0].PORT}`;
  //@ts-ignore
  const nobreakFeedbacks = nobreakPorts.map((port) => {
    if(port.PORT) {
      return { feedback: `F${port.PORT}`, nobreakId: port.NOBREAK_ID}
    }
    return { nobreakId: port.NOBREAK_ID}
  });

  //@ts-ignore
  const illuminationFeedbacks = illuminationsPorts.map((port) => {
    if(port.PORT) {
      return { feedback: `F${port.PORT}`, illumId: port.ILLUMINATION_ID}
    }
    return { illumId: port.ILLUMINATION_ID}
  });
  
  const feedbackIdx = {"F1": 0, "F2": 1, "F3": 2, "F4": 3} as {[key: string]: number};
  const varsAdapted: {
    [key: string] : {
      utilityId: number;
      feedback: string;
      timeUsingBattery: string;
      name: string;
      datCode?: string;
      dmtCode: string;
      utilityType: 'Nobreak' | 'Illumination';
      y: number[];
      consumption?: number;
    }
  } = {};
  const eletricalNetworkFeedback = list.vs[feedbackIdx[eletricCircuitFeedback]];
  for(const nobreak of nobreakFeedbacks) {
    let yAux = Array(list.vs[0].length).fill(null);
    if (nobreak?.feedback){
      yAux = list.vs[feedbackIdx[nobreak.feedback]].map((value, idx) => getRealNobreakFeedback(eletricalNetworkFeedback[idx], value));
    }

    const { formattedTime } = getTimeUsingBattery(yAux, list.c);

    const nobreakInfo = await sqldb.NOBREAKS.getNobreak({ID: nobreak.nobreakId});

    varsAdapted[`Nobreak-${nobreak.nobreakId}`] = {
      utilityId: nobreak.nobreakId,
      feedback: nobreak?.feedback,
      timeUsingBattery: formattedTime,
      name: nobreakInfo.NAME,
      datCode: nobreakInfo.DAT_CODE,
      dmtCode: nobreakInfo.DMT_CODE,
      utilityType: 'Nobreak',
      y: yAux
    }
  }
  for(const illum of illuminationFeedbacks) {
    let yAux = Array(list.vs[0].length).fill(null);
    if (illum?.feedback){
      yAux = list.vs[feedbackIdx[illum.feedback]];
    }

    const {formattedTime, hoursSum} = getTimeUsingBattery(yAux, list.c);

    const illumInfo = await sqldb.ILLUMINATIONS.getIllumination({ID: illum.illumId});
    const consumption = await getIllumConsumption(illumInfo, hoursSum);

    varsAdapted[`Illumination-${illum.illumId}`] = {
      utilityId: illum.illumId,
      feedback: illum?.feedback,
      name: illumInfo.NAME,
      dmtCode: illumInfo.DMT_CODE,
      timeUsingBattery: formattedTime,
      consumption,
      utilityType: 'Illumination',
      y: yAux
    }
  }
  return varsAdapted;
}

const getDmtChartsDataCommon = async (reqParams: { dmtCode: string; dayYMD: string; numDays?: number }, session: SessionData) => {
  // # Verifica permissão
  const devCode = reqParams.dmtCode
  if (!devCode) throw Error('Invalid parameters! Missing dmtCode').HttpStatus(400)
  const dmtInf = await sqldb.DMTS.getBasicInfo({ DMT_CODE: devCode });
  if (!dmtInf) throw Error('DMT não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dmtInf.CLIENT_ID, dmtInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  let dayAux = reqParams.dayYMD;
  if (reqParams.numDays === undefined) throw Error('Missing numDays');

  const days = [] as string[]
  for (let i = 0; i < reqParams.numDays; i++) {
    dayAux = addDays_YMD(reqParams.dayYMD, i);
    days.push(dayAux);
  }


  const datas = await getCompiledDaysData(days, devCode, session.user);

  // Calcula todos valores de pontos X em horas para os dados recebidos
  let parsedGraphData = datas.map((data, i)=> processReceivedHistoryDMT(data, i));

  let vars = {
    F1: [], F2: [], F3: [], F4: []
  } as {[key: string] : {x: number , y?: number, L?: number }[]};

  parsedGraphData?.forEach(data => {
    vars.F1 = vars.F1.concat(data.parsedGraphData.F1);
    vars.F2 = vars.F2.concat(data.parsedGraphData.F2);
    vars.F3 = vars.F3.concat(data.parsedGraphData.F3);
    vars.F4 = vars.F4.concat(data.parsedGraphData.F4);
  });

  let cAux = [] as any[];
  let vAux = [] as any[];
  let LAux = [] as any[];
  let varList = [] as any[];

  for (const property in vars) {
    if (vars.hasOwnProperty(property)) {
      vars[property].forEach((data: {x: number , y?: number, L?: number }) => {
          cAux.push(data.x);
          LAux.push(data.L);
          vAux.push(data.y);
        }
      )
      varList.push({c: cAux, v: vAux, L: LAux});

      cAux = []; LAux = []; vAux = [];
    }
  }


  const list = mergeVarsCommomX(varList, reqParams.numDays) as {c: number[], vs: number[][], L: number[][]};

  return {devCode, list};
}

/**
 * @swagger
 * /dmt/get-utilities-charts-data:
 *   post:
 *     summary: Índice de Uso do DMT/Nobreak/Iluminação
 *     description: Retorna o índice de uso do DMT com uma mesma quantidade de pontos em cada tipo de dados em um intervalo de datas
 *     tags:
 *      - DmtHist
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
 *             dmtCode:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Código do dispositivo DMT
 *             dayYMD:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data inicial para o filtro YYYY-MM-DD
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
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDayChartsDataV2: API_private2['/dmt/get-utilities-charts-data'] = async function (reqParams, session) {
  
  const {devCode, list} = await getDmtChartsDataCommon(reqParams, session);

  const varsAdapted = await getUtilitiesChartData(devCode, list);

  return {
    commonX: list.c,
    vars: varsAdapted,
  };
}


/**
 * @swagger
 * /dmt/get-nobreaks-charts-data:
 *   post:
 *     summary: Índice de Uso do DMT/Nobreak
 *     description: Retorna o índice de uso do DMT com uma mesma quantidade de pontos em cada tipo de dados em um intervalo de datas
 *     tags:
 *      - DmtHist
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
 *             dmtCode:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Código do dispositivo DMT
 *             dayYMD:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data inicial para o filtro YYYY-MM-DD
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
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDayChartsData: API_private2['/dmt/get-nobreaks-charts-data'] = async function (reqParams, session) {
  const {devCode, list} = await getDmtChartsDataCommon(reqParams, session);

  const varsAdapted = await getNobreaksChartData(devCode, list);
  
  return {
    commonX: list.c,
    vars: varsAdapted,
  };
}
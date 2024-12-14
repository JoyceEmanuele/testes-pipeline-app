import { CompiledHistoryVar, CompiledHistoryVar2 } from "../types";

export function uncompressHistVec (data: CompiledHistoryVar): number[] {
  if (!data) return null;
  const uncompressed: number[] = [];
  for (let b = 0; b < data.c.length; b++) {
    for (let j = 0; j < data.c[b]; j++) {
      uncompressed.push(data.v[b]);
    }
  }
  return uncompressed;
}

export function uncompressValue (cval: CompiledHistoryVar) {
  if (!cval) return null
  if (!cval.v.length) return []
  let n = cval.v.length
  let ip = 0
  let c = cval.c[ip]
  let v = cval.v[ip]
  const vals = []
  while (ip < n && c > 0) {
    vals.push(v)
    if (--c <= 0) {
      if (++ip >= n) {
        break
      }
      c = cval.c[ip]
      v = cval.v[ip]
    }
  }
  return vals
}

export function parseCompressedChartData (vec: string, cInferiorLimit?: number, cUpperLimit?: number) { // '*200,3.5*300,2,2*30,*100'
  if (!vec) return { v: [], c: [] }
  const rV: number[] = []
  const rC: number[] = []
  const groups = vec.split(',')

  let cAccumulated = 0;
  let cAccumulatedPrev = 0;
  let insideRange = false;
  let insideRangePrev = false;
  let enterAndOut = false;
  let insertTelemetry = false;

  for (const item of groups) {    
    const vc = item.split('*')
    const v = vc[0] ? Number(vc[0]) : null
    let c = Number(vc[1] || 1)

    insertTelemetry = false;
    cAccumulated = cAccumulated + c;

    // Caso o próximo valor de c faça entrar e sair do range. cInferiorLimit não necessáriamente precisa ter valor para que isso ocorra
    enterAndOut = cAccumulated >= cInferiorLimit && cAccumulatedPrev <= cInferiorLimit && cUpperLimit != null && cAccumulated > cUpperLimit;
    
    insideRange = (cInferiorLimit == null || cAccumulated >= cInferiorLimit) && (cUpperLimit == null || cAccumulated <= cUpperLimit);

    if (enterAndOut){
      c = cUpperLimit - (cInferiorLimit != null ? cInferiorLimit : 0);
      insertTelemetry = true;
    }
    else if (insideRange){
      const cTernary = (cInferiorLimit == null ? c : cAccumulated - cInferiorLimit);
      c = insideRangePrev ? c : cTernary;
      insertTelemetry = true;
    }
    else if (insideRangePrev){
      // Caso estava dentro do range e nesta iteração saiu
      c = cUpperLimit - cAccumulatedPrev;
      insertTelemetry = true;
    }

    insideRangePrev = insideRange;
    cAccumulatedPrev = cAccumulated;

    if (insertTelemetry){
      const vL = rV.length
      if (vL && rV[vL - 1] === v) rC[vL - 1] += c
      else {
        if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) { rV[vL - 1] = rV[vL - 2] }
        rV.push(v)
        rC.push(c)
      }
    }
  }
  const vL = rV.length
  if (vL >= 2 && rV[0]      == null && rC[0]      <= 15) rV[0]      = rV[1]
  if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) rV[vL - 1] = rV[vL - 2]
  return { v: rV, c: rC }
}


export function parseCompressedChartDataS (vec: string) { // '*200,3.5*300,2,2*30,*100'
  if (!vec) return { v: [], c: [] }
  const rV: string[] = []
  const rC: number[] = []
  const groups = vec.split(',')
  for (const item of groups) {
    const vc = item.split('*')
    const v = vc[0] || null
    const c = Number(vc[1] || 1)
    const vL = rV.length
    if (vL && rV[vL - 1] === v) rC[vL - 1] += c
    else {
      if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) { rV[vL - 1] = rV[vL - 2] }
      rV.push(v)
      rC.push(c)
    }
  }
  const vL = rV.length
  if (vL >= 2 && rV[0]      == null && rC[0]      <= 15) rV[0]      = rV[1]
  if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) rV[vL - 1] = rV[vL - 2]
  return { v: rV, c: rC }
}

export function parseCompressedChartDataS2 (vec: string, initLabels: string[]) { // '*200,3.5*300,2,2*30,*100'
  if (!vec) return { v: [], c: [], labels: [] };
  const labels: string[] = [null, ...initLabels];
  const rV: number[] = [];
  const rC: number[] = [];
  const groups = vec.split(',');
  for (const item of groups) {
    const vc = item.split('*');
    const vs = vc[0];
    let v: number = null;
    if (vs) {
      v = labels.indexOf(vs);
      if (v < 0) {
        labels.push(vs);
        v = labels.length - 1;
      }
    }
    const c = Number(vc[1] || 1);
    const vL = rV.length;
    if (vL && rV[vL - 1] === v) rC[vL - 1] += c;
    else {
      if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) { rV[vL - 1] = rV[vL - 2] }
      rV.push(v);
      rC.push(c);
    }
  }
  const vL = rV.length;
  if (vL >= 2 && rV[0]      == null && rC[0]      <= 15) rV[0]      = rV[1];
  if (vL >= 2 && rV[vL - 1] == null && rC[vL - 1] <= 15) rV[vL - 1] = rV[vL - 2];
  return { v: rV, c: rC, labels };
}

// function genChartData ({ v, c }) {
//   const chartData = []
//   let x = 0
//   let lastV = null
//   for (let i = 0; i < v.length; i++) {
//     if (i === 0 || v[i] !== lastV) chartData.push({ x, y: v[i] })
//     x += c[i]
//     lastV = v[i]
//   }
//   if (v.length) chartData.push({ x, y: v[v.length - 1] })
//   return chartData
// }

export function convertStringHistory (data: { v: string[], c: number[] }, initLabels: string[]) {
  if (!data) return { v: [], c: [], labels: [] };
  const labels: string[] = [null, ...initLabels];
  const rV: number[] = [];
  for (const vs of data.v) {
    let v: number = null;
    if (vs) {
      v = labels.indexOf(vs);
      if (v < 0) {
        labels.push(vs);
        v = labels.length - 1;
      }
    }
    rV.push(v);
  }
  return { v: rV, c: data.c, labels };
}

export function mergeEventsList (varList: CompiledHistoryVar2[]) {
  // Garantir que não tenha nenhum elemento null no varList
  for (let i = 0; i < varList.length; i++) {
    if (!varList[i]) {
      varList[i] = { c: [], v: [] };
    }
  }

  const dur = [] as number[]; // vetor c final, equivalente ao eixo x comum a todas as variáveis
  const vals = [] as (number|string)[][]; // cada índice contém o vetor de valores da variável
  const p = [] as number[]; // índice no vetor v (e c) de cada variável
  const v = [] as (number|string)[]; // valor de cada variável no ponto atual do algoritmo
  const c = [] as number[]; // quantos segundos cada variável vai permanecer com o valor atual

  for (let i = 0; i < varList.length; i++) {
    vals.push([]);
    if (varList[i].v.length > 0) {
      p.push(0);
      v.push(varList[i].v[0]);
      c.push(varList[i].c[0]);
    } else {
      p.push(0);
      v.push(null);
      c.push(0);
    }
  }

  while (c.some(_c => _c)) {
    const step = Math.min(...c.filter(_c => _c)); // quantos segundos até alguma variável mudar de valor
    // o filter acima é para ignorar as variáveis que não têm mais valor no seu vetor, por exemplo as vazias
    dur.push(step); // step = quantos segundos todas as variáveis vão permanecer com os mesmos valores
    for (let i = 0; i < varList.length; i++) {
      vals[i].push(v[i]); // coloca o valor atual de cada variável no vetor vals
      if (c[i]) c[i] -= step; // desconta do vetor c a quantidade de segundos já contabilizada
      if (!c[i]) { // pelo menos uma das variáveis vai ter zerado esse contador
        // e aí incrementa o p dela, coloca o próximo valor em v e a duração em c
        if (p[i] < (varList[i].v.length - 1)) { p[i]++; v[i] = varList[i].v[p[i]]; c[i] = varList[i].c[p[i]]; }
        else { v[i] = null; }
      }
    }
  }

  return { c: dur, vs: vals };
}

export function mergeVarsCommomX (varList: CompiledHistoryVar2[], numDays: number) {
  for (let i = 0; i < varList.length; i++) {
    if (!varList[i]) {
      varList[i] = { c: [], v: [], L: [] };
    }
  }

  const dur = [] as number[];
  const vals = [] as (number|string)[][];
  const LValues = [] as (number|string)[][];
  let xInsert = 0;

  for (let i = 0; i < varList.length; i++) {
    vals.push([]);
    LValues.push([]);
  }

  // Cria array com pontos X em horas com intervalo de 0.00138888888 (5 segundos) vezes dias de filtragem ao quadrado (17280 pontos para um único dia)
  // para que a cada novo dia do range diminua a quantidade de pontos, diminuindo a lentidão na plotagem do gráfico quando o span de dias é alto
  while(xInsert <= numDays * 24){ 
    dur.push(xInsert);
    xInsert = xInsert + (0.00138888888 * (numDays * numDays));
  }

  // Para cada ponto X, seleciona o no vetor c original o X mais próximo de valor igual ou abaixo para selecionar o último valor y 
  // para este ponto
  for (let i = 0; i < dur.length; i++) {

      for (let j = 0; j < varList.length; j++) {
        if (varList[j].c.length > 0)
        {
          let filterList = varList[j].c.filter((element) => element <= dur[i]);
          let valueXReal = filterList[filterList.length - 1];
          let indexReal = varList[j].c.lastIndexOf(valueXReal);
          vals[j].push(varList[j].v[indexReal]);
          if (varList[j].L && varList[j].L.length > 0) LValues[j].push(varList[j].L[indexReal]);
        }
      }
  }

  return { c: dur, vs: vals, L: LValues };
}

export function processReceivedHistoryDAC(dataHistory: any, usePsi: boolean, index: number) {
  if (usePsi) {
    if (dataHistory.Psuc) {
      const { v } = dataHistory.Psuc;
      for (let i = 0; i < v.length; i++) {
        if (v[i] != null) v[i] *= 14.50377;
      }
    }
    if (dataHistory.Pliq) {
      const { v } = dataHistory.Pliq;
      for (let i = 0; i < v.length; i++) {
        if (v[i] != null) v[i] *= 14.50377;
      }
    }
  }

  // @ts-ignore
  const limitsTemp = { min: null as number, max: null as number };
  // @ts-ignore
  const limitsPres = { min: null as number, max: null as number };
  const parsedGraphData = {
    // @ts-ignore
    Lcmp: formatArrHistory(dataHistory.Lcmp, index, null, true),
    // @ts-ignore
    L1raw: formatArrHistory(dataHistory.L1raw, index, null, true),
    // @ts-ignore
    L1fancoil: formatArrHistory(dataHistory.L1fancoil, index, null, true),
    // @ts-ignore
    Psuc: formatArrHistory(dataHistory.Psuc, index, limitsPres),
    // @ts-ignore
    Pliq: formatArrHistory(dataHistory.Pliq, index, limitsPres),
    // @ts-ignore
    Tamb: formatArrHistory(dataHistory.Tamb, index, limitsTemp),
    // @ts-ignore
    Tsuc: formatArrHistory(dataHistory.Tsuc, index, limitsTemp),
    // @ts-ignore
    Tliq: formatArrHistory(dataHistory.Tliq, index, limitsTemp),
    // @ts-ignore
    Levp: formatArrHistory(dataHistory.Levp, index, null, true),
    // @ts-ignore
    Lcut: formatArrHistory(dataHistory.Lcut, index, null, true, true),
    // @ts-ignore
    Tsc: formatArrHistory(dataHistory.Tsc, index, limitsTemp),
    // @ts-ignore
    Tsh: formatArrHistory(dataHistory.Tsh, index, limitsTemp),
    // @ts-ignore
    DamAutState: formatArrHistory(dataHistory.DamAutState, index, null, false, false),
    // @ts-ignore
    SavedData: formatArrHistory(dataHistory.SavedData, index, null, true),
  };

  const dataLimits = {
    minTval: limitsTemp.min,
    maxTval: limitsTemp.max,
    minPval: limitsPres.min,
    maxPval: limitsPres.max,
  };

  return { parsedGraphData, dataLimits };
}

export function formatArrHistory(dataVectors: { v: number[], c: number[] }, index: number, limits?: { min: number, max: number }, isBool01?: boolean, invertBool?: boolean) {
  const chartData: { x: number, y?: number, L?: number }[] = [];
  if (!dataVectors) return chartData;
  const { v, c } = dataVectors;
  // if (!v.length) return chartData
  let x = 0 + (24 * index)
  // let last = null
  // chartData.push(last = { x, y: v[0] })
  for (let i = 0; i < v.length; i++) {
    // if (last.y == null && v[i] != null) { chartData.push({ x, y: v[i] }) }
    chartData.push(isBool01 ? invertBool ? { x, L: invBool(v[i]) } : { x, L: v[i] } : { x, y: v[i] });
    x += c[i] / 3600;
    // chartData.push(last = { x, y: v[i] })
    chartData.push(isBool01 ? invertBool ? { x, L: invBool(v[i]) } : { x, L: v[i] } : { x, y: v[i] });
    if (limits != null && v[i] != null) {
      if (limits.max == null || v[i] > limits.max) limits.max = v[i];
      if (limits.min == null || v[i] < limits.min) limits.min = v[i];
    }
  }
  // @ts-ignore
  let xFinal = 24;
  if (x < (24 * index)) {
    xFinal = 24 + (24 * index);
    chartData.push({ x: xFinal, y: null });
  };
  return chartData;
}

function invBool(v: number) {
  return v === 1 ? 0 : v === 0 ? 1 : v;
}

export function updateBoolY(varsList: { L?: number, y?: number|null }[][], L1start: number) {
  const ticksValues: [number[]] = [[0, 0]];
  let index = 0;
  for (const lineData of varsList) {
    const tick_0 = Math.round((L1start - 5 + 0.5) * 10) / 10;
    const tick_1 = Math.round((L1start - 5 + 2.6) * 10) / 10;
    if (index === 0) ticksValues.shift();
    ticksValues.push([tick_0, tick_1]);
    for (let i = 0; i < lineData.length; i++) {
      if (lineData[i]) {
        if (lineData[i].L === 1) lineData[i].y = tick_1;
        else if (lineData[i].L === 0) lineData[i].y = tick_0;
      }
    }
    L1start -= 5;
    index++;
  }
  return ticksValues;
}

export function processReceivedHistoryDUT(websocketHistory: any, rawLimits = false, index: number) {
  const limitsTemp = rawLimits ? { min: 4, max: 6 } : { min: 10, max: 35 };
  const limitsHum = { min: 10, max: 90 };
  const limitsCO2 = { min: 0, max: 2800 };
  const limitsTVOC = { min: 0, max: 1300 };
  const parsedGraphData = {
    Temperature: formatArrHistory(websocketHistory.Temperature, index, limitsTemp),
    Temperature_1: formatArrHistory(websocketHistory.Temperature_1, index, limitsTemp),
    Humidity: formatArrHistory(websocketHistory.Humidity, index, limitsHum),
    eCO2: formatArrHistory(websocketHistory.eCO2, index, limitsCO2),
    TVOC: formatArrHistory(websocketHistory.TVOC, index, limitsTVOC),
    L1: formatArrHistory(websocketHistory.L1, index),
  };

  let axisInfo;
  if (rawLimits) {
    const tempLimits = [limitsTemp.min, limitsTemp.max];
    const humLimits = [limitsHum.min, limitsHum.max];
    const co2Limits = [limitsCO2.min, limitsCO2.max];
    const TVOCLimits = [limitsTVOC.min, limitsTVOC.max];
    axisInfo = {
      tempLimits,
      humLimits,
      co2Limits,
      TVOCLimits,
    };
  } else {
    const tempLimits = [(Math.ceil(limitsTemp.min / 5 - 0.999) * 5 - 5), (Math.trunc(limitsTemp.max / 5 + 0.999) * 5 + 5)];
    const tempTicks = [] as number[];
    for (let t = tempLimits[0]; t <= tempLimits[1]; t += 5) {
      tempTicks.push(t);
    }

    const humLimits = [(Math.ceil(limitsHum.min / 10 - 0.999) * 10 - 10), (Math.trunc(limitsHum.max / 10 + 0.999) * 10 + 10)];
    const humTicks = [] as number[];
    for (let t = humLimits[0]; t <= humLimits[1]; t += 10) {
      humTicks.push(t);
    }

    const co2Limits = [(Math.ceil(limitsCO2.min / 200 - 0.999) * 200), (Math.trunc(limitsCO2.max / 200 + 0.999) * 200 + 200)];
    const co2Ticks = [] as number[];
    for (let t = co2Limits[0]; t <= co2Limits[1]; t += 200) {
      co2Ticks.push(t);
    }
    const TVOCLimits = [(Math.ceil(limitsTVOC.min / 200) * 200), (Math.trunc(limitsTVOC.max / 200 + 0.999) * 200 + 200)];
    const TVOCTicks = [] as number[];
    for (let t = TVOCLimits[0]; t <= TVOCLimits[1]; t += 200) {
      TVOCTicks.push(t);
    }

    axisInfo = {
      tempLimits, tempTicks, humLimits, humTicks, co2Limits, co2Ticks, TVOCLimits, TVOCTicks,
    };
  }

  return { parsedGraphData, axisInfo };
}

export function processReceivedHistoryDRI(comprHistory: any, devInfo: any, index: number) {
  let limitsSetpoint = { min: 0, max: 0 };
  if (devInfo.varsCfg.application === 'carrier-ecosplit') {
    limitsSetpoint = { min: 17, max: 25 };
  }
  if (devInfo.varsCfg.application.startsWith('vav') || devInfo.varsCfg.application.startsWith('fancoil')) {
    limitsSetpoint = { min: 15, max: 30 };
  }
  if (limitsSetpoint.min === 0 && limitsSetpoint.max === 0) {
    return null;
  }

  const parsedGraphData = {
    Setpoint: formatArrHistory(comprHistory.Setpoint, index, limitsSetpoint),
    Status: formatArrHistory(comprHistory.Status, index),
    Mode: formatArrHistory(comprHistory.Mode, index),
    DutTemp: formatArrHistory(comprHistory.DutTemp, index, limitsSetpoint),
    ThermOn: formatArrHistory(comprHistory.ThermOn, index),
    Fanspeed: formatArrHistory(comprHistory.Fanspeed, index),
    Lock: formatArrHistory(comprHistory.Lock, index),
    TempAmb: formatArrHistory(comprHistory.TempAmb, index, limitsSetpoint),
    ValveOn: formatArrHistory(comprHistory.ValveOn, index),
    FanStatus: formatArrHistory(comprHistory.FanStatus, index),
  } as {
    Setpoint: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    Status: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    Mode: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    DutTemp: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    OperationMode: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    ThermOn: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    Fanspeed: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    Lock: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    TempAmb: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    ValveOn: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    FanStatus: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
  };

  const dataLimits = {
    minTval: limitsSetpoint.min,
    maxTval: limitsSetpoint.max,
  };
  
  return { parsedGraphData, dataLimits };
}

export function processReceivedHistoryDMT(comprHistory: any,index: number) {

  const parsedGraphData = {
    L1: formatArrHistory(comprHistory.L1, index),
    F1: formatArrHistory(comprHistory.F1, index),
    F2: formatArrHistory(comprHistory.F2, index),
    F3: formatArrHistory(comprHistory.F3, index),
    F4: formatArrHistory(comprHistory.F4, index),
    F5: formatArrHistory(comprHistory.F5, index),
  } as {
    L1: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    F1: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    F2: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    F3: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    F4: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
    F5: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[],
  };
  
  return { parsedGraphData };
}

export function processReceivedHistoryDAL(comprHistory: any,index: number) {
  const parsedGraphData = {
    Relays: comprHistory.Relays?.map((r: { v: number[], c: number[] }) => formatArrHistory(r, index)) || [],
    Feedback: comprHistory.Feedback?.map((f: { v: number[], c: number[] }) => formatArrHistory(f, index)) || [],
  } as {
    Relays: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[][],
    Feedback: {
      x: number;
      y?: number | null;
      L?: number | null;
    }[][]
  };
  
  return { parsedGraphData };
}
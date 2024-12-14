import { SessionData } from '../srcCommon/types'
import * as httpApiRouter from './httpApiRouter'
import { API_private2 } from '../srcCommon/types/api-private'
import * as fs from 'fs'
import * as path from 'path'
import * as uuid from 'uuid'
import { getTempDataByStationCodeAndDate } from './extServices/weatherData'

let criouPasta = false;
export const analiseIntegradaExport: API_private2['/analise-integrada-export'] = async function (reqParams, session, { res }) {
  const nextDay = new Date(reqParams.day + 'T00:00:00Z');
  nextDay.setDate(nextDay.getDate() + 1);

  const selectedVars: { title: string, list: ChartDataPoint[] }[] = []
  if (reqParams.dacsTamb) {
    for (const dacId of reqParams.dacsTamb) {
      const list = await fetchTamb(dacId, reqParams.day, session);
      selectedVars.push({ title: `${dacId} (Tamb) [°C]`, list });
    }
  }
  if (reqParams.dacsL1) {
    for (const dacId of reqParams.dacsL1) {
      const list = await fetchLcmp(dacId, reqParams.day, session);
      selectedVars.push({ title: `${dacId} (L1)`, list });
    }
  }
  if (reqParams.dutsTemp) {
    for (const dutId of reqParams.dutsTemp) {
      const list = await fetchRoomTemp(dutId, reqParams.day, session);
      selectedVars.push({ title: `Temperatura ${dutId} [°C]`, list });
    }
  }
  if (reqParams.unitsPower) {
    for (const unitId of reqParams.unitsPower) {
      const list = await fetchActivePower(unitId, reqParams.day, session);
      selectedVars.push({ title: `Potência [kW]`, list });
    }
  }
  if (reqParams.tempInmet) {
    for (const station of reqParams.tempInmet) {
      const list = await fetchStationTemperatures(station.GROUP_ID, reqParams.day);
      selectedVars.push({ title: `Temperatura Externa - Inmet - Estação ${station.GROUP_NAME}`, list });
    }
  }

  const tempFileName = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 10) + '-' + uuid.v4() + '.csv';
  const tempFolder = (process.cwd() || '') + '/tmp';
  if ((!criouPasta) && (tempFolder !== '/tmp')) {
    fs.mkdirSync(tempFolder, { recursive: true });
    criouPasta = true;
  }
  const filePath = path.join(tempFolder, tempFileName);
  const fd = fs.openSync(filePath, 'a');
  compileAsCSV(selectedVars, fd);
  fs.closeSync(fd);

  // const normName = UNIT_NAME.normalize('NFD').replace(/[^\u0020-\u007A]/g, '').replace(/[\/\\\:\*\>\<\?]/g, '')
  const downloadFileName = `Análise - ${reqParams.day}.csv`

  // return { filePath, fileName: downloadFileName }

  res.append('Access-Control-Expose-Headers', 'content-disposition, filename')
  res.append('filename', downloadFileName)
  res.append('Content-Type', `text/csv`);
  res.status(200).download(filePath, downloadFileName)

  return res;
}

function compileAsCSV (selectedVars: { title: string, list: ChartDataPoint[] }[], fd: number) {
  // const strParts = []

  fs.writeSync(fd, `Tempo [s]`)
  const vs = selectedVars.map(x => {
    fs.writeSync(fd, `;${x.title}`)
    return { list: x.list, i: 0, y: '', next: <ChartDataPoint>null };
  })
  // const vs = [ { list: [ { x: 3, y: 100 }, ] }, ]
  for (const p of vs) {
    p.i = 0
    p.y = ';'
    p.next = p.list ? p.list[0] : null;
  }

  const totalLength = 24 * 60 * 60 + 1
  for (let s = 0; s < totalLength; s++) {
    // strParts.push(`\n${s}`)
    fs.writeSync(fd, `\n${s}`)
    const x = s / 3600
    for (const p of vs) {
      if (!p.next) { p.y = ';'; }
      while (p.next && x >= p.next.x) {
        p.y = ((p.next.y == null || (<any>p.next.y) === 'null') ? ';' : `;${p.next.y}`.replace('.', ','));
        p.next = p.list[++p.i];
      }
      // strParts.push(p.y)
      fs.writeSync(fd, p.y)
    }
  }

  // return strParts
}

async function fetchLcmp (dacId: string, day: string, session: SessionData) {
  const params = {
    dacId: dacId,
    selectedParams: ['Lcmp'],
    day
  }
  const websocketHistory = await httpApiRouter.externalRoutes['/dac/get-day-charts-data'](params, session)
  //   const { v } = websocketHistory.L1
  //   for (let i = 0; i < v.length; i++) {
  //     if (v[i] === 1) v[i] = -10
  //     else if (v[i] === 0) v[i] = -15
  //     else v[i] = null
  //   }
  const chartDataVector = formatArrHistory(websocketHistory.Lcmp)
  return chartDataVector
}

async function fetchTamb (dacId: string, day: string, session: SessionData) {
  const params = {
    dacId: dacId,
    selectedParams: ['Tamb'],
    day
  }
  const websocketHistory = await httpApiRouter.externalRoutes['/dac/get-day-charts-data'](params, session)
  const chartDataVector = formatArrHistory(websocketHistory.Tamb)
  return chartDataVector
}

async function fetchRoomTemp (dutId: string, day: string, session: SessionData) {
  const params = {
    devId: dutId,
    selectedParams: ['Temperature'],
    day
  }
  const websocketHistory = await httpApiRouter.externalRoutes['/dut/get-day-charts-data'](params, session)
  const chartDataVector = formatArrHistory(websocketHistory.Temperature)
  return chartDataVector
}

async function fetchActivePower (unitId: number, day: string, session: SessionData) {
  const params = { UNIT_ID: unitId, day: day }
  const response = await httpApiRouter.externalRoutes['/get-unit-energy-consumption'](params, session)
  if (response.list != null) {
    for (const point of response.list) {
      if (point.y != null) {
        point.y = Math.round(point.y / 100) / 10
      }
    }
  }
  const chartDataVector = response.list
  return chartDataVector
}

async function fetchStationTemperatures (stationId: string, day: string) {
  const response = await getTempDataByStationCodeAndDate(stationId, day, true);
  const refTs = new Date(`${day}T00:00:00Z`).getTime();
  const list = response.map((measure) => {
    const measureTs = new Date(`${measure.timestamp.substring(0, 19)}Z`).getTime();
    return {
      x: Math.round((measureTs - refTs) / 60 / 60) / 1000,
      y: measure.TEM_INS ? parseFloat(measure.TEM_INS) : null,
    };
  });
  return list;
}

interface VarDataVectors {
  v: number[]
  c: number[]
}
interface ChartDataPoint {
  x: number
  y: number
}

function formatArrHistory (dataVectors: VarDataVectors) {
  const chartData: ChartDataPoint[] = []
  if (!dataVectors) return chartData
  const { v, c } = dataVectors
  let x = 0
  for (let i = 0; i < v.length; i++) {
    chartData.push({ x, y: v[i] })
    x += c[i] / 3600
    chartData.push({ x, y: v[i] })
  }
  if (x < 24) chartData.push({ x: 24, y: null })
  return chartData
}

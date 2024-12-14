import * as fs from 'node:fs'
import * as fsPromises from 'node:fs/promises';
import { spawn } from 'node:child_process'
import { unitReportGen2 } from './unitReportGen'
import { healthIndexes, possibleCauses } from '../helpers/healthTypes'
import sqldb from '../db'
import configfile from '../../configfile'
import * as dielServices from '../dielServices'
import { logger } from '../helpers/logger';

export interface UnitDbInfo {
  UNIT_NAME: string
  UNIT_ID: number
  CLIENT_NAME: string
  CLIENT_ID: number
  CITY_NAME: string,
  STATE_ID: string,
  pathUnitRepNoExt: string
  pathClientReps: string
  s3Key: string
  pdfGenerated: boolean
  dacs?: { MACHINE_NAME: string, DAC_ID: string, HLEVEL: string }[]
  duts?: { ROOM_NAME: string, DEV_ID: string, T_MED: string, T_LEVEL: string }[]
  dams?: { MACHINE_NAME: string, DAM_ID: string }[]
}

export function deleteDirectory(osPath: string) {
  return fsPromises.rm(osPath, { recursive: true, force: true });
}

export function createNormNames (unitsList: { UNIT_ID: number, UNIT_NAME: string }[]) {
  const normNames: string[] = []
  let repeats = false
  for (const unit of unitsList) {
    const normName = unit.UNIT_NAME.normalize('NFD').replace(/[^\u0020-\u007A]/g, '').replace(/[\/\\\:\*\>\<\?]/g, '').replace(/\.+/g, '.');
    if (normNames.includes(normName)) { repeats = true; }
    normNames.push(normName);
  }
  if (repeats) {
    for (let i = 0; i < unitsList.length; i++) {
      const unit = unitsList[i];
      normNames[i] = `(${unit.UNIT_ID}) ${normNames[i]}`;
    }
  }
  return normNames;
}

export function getWeekReportPeriod () {
  const timezoneOffset = 3 * 60 * 60 * 1000
  const now = new Date(Date.now() - timezoneOffset)
  const lastSundayDistance = ((now.getDay() === 0) ? 7 : now.getDay())
  const lastSunday = new Date(now.getTime() - lastSundayDistance * 24 * 60 * 60 * 1000)
  const mondayBefore = new Date(lastSunday.getTime() - 6 * 24 * 60 * 60 * 1000)
  const numDays = 7;
  const daysList = [];
  const cursor = new Date(mondayBefore);
  for (let i = 0; i < numDays; i++) {
    daysList.push(cursor.toISOString().substring(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    todayDate: now.toISOString().substring(0, 10),
    periodIni: mondayBefore.toISOString().substring(0, 10),
    periodEnd: lastSunday.toISOString().substring(0, 10),
    numDays,
    daysList,
  }
}

function getTodayReportPeriod () {
  const timezoneOffset = 3 * 60 * 60 * 1000
  const now = new Date(Date.now() - timezoneOffset)
  const periodEndD = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  const periodIniD = new Date(periodEndD.getTime() - 6 * 24 * 60 * 60 * 1000)
  const numDays = 7;
  const daysList = [];
  const cursor = new Date(periodIniD);
  for (let i = 0; i < numDays; i++) {
    daysList.push(cursor.toISOString().substring(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    todayDate: now.toISOString().substring(0, 10),
    periodIni: periodIniD.toISOString().substring(0, 10),
    periodEnd: periodEndD.toISOString().substring(0, 10),
    numDays,
    daysList,
  }
}

export async function generateUnitReport (reqParams: {
  clientId: number
  unitId: number
  pathUnitRepNoExt: string
  pathClientReps: string
  last7days?: boolean,
  language?: string
}, debugTemplate?: string): Promise<{
  CLIENT_ID: number
  UNIT_ID: number
  UNIT_NAME: string
  today: string
  repPath: string
  dacs: { MACHINE_NAME: string, DAC_ID: string, HLEVEL: string }[]
  duts: { ROOM_NAME: string, DEV_ID: string, T_MED: string, T_LEVEL: string }[]
  dams: { MACHINE_NAME: string, DAM_ID: string }[]
}> {
  if (!reqParams.clientId) throw Error('Invalid clientId!').HttpStatus(500)
  if (!reqParams.unitId) throw Error('Invalid unitId!').HttpStatus(500)

  const qPars: Parameters<typeof sqldb.CLUNITS.getUnitReportInfo>[0] = {
    clientId: reqParams.clientId,
    unitId: reqParams.unitId,
  };
  const { pathUnitRepNoExt, pathClientReps } = reqParams;

  if (!fs.existsSync(pathClientReps)) {
    fs.mkdirSync(pathClientReps, { recursive: true })
  }

  const unitInfo = await sqldb.CLUNITS.getUnitReportInfo(qPars)
  if (!unitInfo) {
    logger.info('Invalid unit or client!', qPars)
    throw Error('Invalid unit or client!').HttpStatus(400)
  }
  if (unitInfo.CLIENT_ID !== reqParams.clientId) throw Error('Invalid clientId!').HttpStatus(500)
  if (unitInfo.UNIT_ID !== reqParams.unitId) throw Error('Invalid unitId!').HttpStatus(500)

  const { todayDate, periodIni, periodEnd, numDays, daysList } = reqParams.last7days ? getTodayReportPeriod() : getWeekReportPeriod();

  const dacs = await getHealthReportInfo(qPars.clientId, qPars.unitId, periodIni, numDays)

  const [
    dutsList,
    damsList,
    machinesList,
  ] = await Promise.all([
    sqldb.DUTS.buildDevsListSentence({ clientIds: [qPars.clientId], unitIds: qPars.unitId && [qPars.unitId] }, {}),
    sqldb.DAMS.getDamsList({ clientIds: [qPars.clientId], unitIds: (qPars.unitId && [qPars.unitId]) || undefined }, { includeDacs: true }),
    sqldb.MACHINES.getMachinesList({ UNIT_ID: qPars.unitId, CLIENT_IDS: [qPars.clientId] }),
  ]);

  let CONSUMO_GREENANT: number = null;
  if (unitInfo.GA_METER) {
    try {
      const list = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/get_unit_power_consumption', { dayStart: periodIni, dayEndInc: periodEnd, greenantMeterId: unitInfo.GA_METER });
      CONSUMO_GREENANT = 0;
      for (const row of list) {
        CONSUMO_GREENANT += (row.consumedEnergy || 0) / 1000;
      }
    } catch (err) {
      logger.error(err);
      CONSUMO_GREENANT = null;
    }
  }

  const duts: {
    ROOM_NAME: string
    DEV_ID: string
    RTYPE_NAME: string
    T_RANGE: string
    T_LEVEL: string
    T_MED: string
    T_MAX: string
    T_MIN: string
  }[] = [];
  for (const row of dutsList) {
    if (!(row.ISVISIBLE)) continue;
    const dutStats = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDutDaySimpleStats', { devId: row.DEV_ID, dateIni: periodIni, numDays, progObrigatoria: true, motivo: `generateUnitReport` });
    let T_LEVEL = 'neutral';
    let T_RANGE = '-';
    if (dutStats && dutStats.med != null) {
      if ((row.TUSEMIN != null) && (row.TUSEMAX != null)) {
        T_RANGE = `${row.TUSEMIN}°C a ${row.TUSEMAX}°C`;
        if (dutStats.med > row.TUSEMAX) T_LEVEL = 'high';
        else if (dutStats.med < row.TUSEMIN) T_LEVEL = 'low';
        else if (dutStats.med >= row.TUSEMIN && dutStats.med <= row.TUSEMAX) T_LEVEL = 'good';
      }
    }
    duts.push(Object.assign(row, {
      T_RANGE,
      T_MED: (dutStats && dutStats.med != null) ? `${dutStats.med}°C` : '-',
      T_MAX: (dutStats && dutStats.max != null) ? `${dutStats.max}°C` : '-',
      T_MIN: (dutStats && dutStats.min != null) ? `${dutStats.min}°C` : '-',
      T_LEVEL,
    }));
  }
  
  let numDams = 0;
  const dams = damsList.map(row => {
    if (!row.AS_DAC) { numDams++; }
    const damMachines = machinesList.filter(machine => machine.DEV_AUT === row.DAM_ID);
    return Object.assign(row, {
      MACHINE_NAME: damMachines.map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null,
    });
  })

  const clientInfo = {
    CLIENT_NAME: unitInfo.CLIENT_NAME,
    CITY_STATE: `${unitInfo.CITY_NAME} - ${unitInfo.STATE_ID}`,
    UNIT: unitInfo.UNIT_NAME,
    UNIT_NAME: unitInfo.UNIT_NAME,
    SITUATION: 'Ativo',
    PERIOD: `${periodIni.substring(8,10)}/${periodIni.substring(5,7)}/${periodIni.substring(0,4)} - ${periodEnd.substring(8,10)}/${periodEnd.substring(5,7)}/${periodEnd.substring(0,4)}`,
    NUMDEVS: String(dacs.length + duts.length + numDams),
    CONSUMO_GREENANT,
    TARIFA_KWH: unitInfo.TARIFA_KWH,
    duts,
    dacs,
    daysList,
  }

  const languageUser = reqParams.language? reqParams.language : 'pt';
  const htmlV2 = unitReportGen2(clientInfo, languageUser, debugTemplate);
  fs.writeFileSync(`${pathUnitRepNoExt}.html`, htmlV2, 'utf-8')
  await runHtmlToPdfConverter(pathUnitRepNoExt);

  const outInfo = {
    CLIENT_ID: unitInfo.CLIENT_ID,
    UNIT_ID: unitInfo.UNIT_ID,
    UNIT_NAME: unitInfo.UNIT_NAME,
    periodIni: periodIni,
    periodEnd: periodEnd,
    today: todayDate,
    repPath: `${pathUnitRepNoExt}.pdf`,
    dacs,
    duts,
    dams,
  }
  return outInfo
}

async function getHealthReportInfo (clientId: number, unitId: number, periodIni: string, numDays: number) {
  const queryResults = await sqldb.CLUNITS.getHealthReportInfo({ clientId, unitId })
  let lastMachineId = null
  let machineDevIndex = 0

  const list = [];
  for (const rowRaw of queryResults) {
    if (rowRaw.CLIENT_ID !== clientId) throw Error('Invalid dac client!').HttpStatus(500)
    if (rowRaw.UNIT_ID !== unitId) throw Error('Invalid dac unit!').HttpStatus(500)

    if (rowRaw.MACHINE_ID !== lastMachineId) machineDevIndex = 0;
    lastMachineId = rowRaw.MACHINE_ID;
    machineDevIndex++;
    if (!rowRaw.DAC_NAME) { rowRaw.DAC_NAME = `Condensadora ${machineDevIndex}`; }
    const row = Object.assign(rowRaw, {
      LEVEL_DESC: '',
      HLEVEL: '',
      POSS_CAUSES: '',
      MEAN_USE: '',
      LAUDO: '',
      CONSUMO_KWH: 0,
      USAGE_HISTORY: [] as {
        dayDesc: string,
        hoursOnText: string,
        hoursOnPerc: string,
      }[],
    })

    if (row.H_INDEX == null) {
      row.H_INDEX = 0
      row.H_DESC = 'Sem informação'
      row.P_CAUSES = null
    }

    row.LEVEL_DESC = healthIndexes[String(row.H_INDEX)].titulo
    switch (row.H_INDEX) {
      case 25: {
        row.HLEVEL = '1';
        break;
      }
      case 50: {
        row.HLEVEL = '2';
        break;
      }
      case 75: {
        row.HLEVEL = '3';
        break;
      }
      case 100: {
        row.HLEVEL = '4';
        break;
      }
      case 4: {
        row.HLEVEL = 'disab';
        break;
      }
      default: {
        row.HLEVEL = '0';
        break;
      }
    }

    if (row.P_CAUSES) {
      row.POSS_CAUSES = row.P_CAUSES.split(',').map(id => (possibleCauses[id] && possibleCauses[id].text)).filter(x => !!x).map(x => `- ${x}`).join(' <br> ')
    }
    row.MEAN_USE = 'desconhecido'
    if (periodIni && numDays) {
      let mean = 0
      const dailyUse = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDailyUsage', { dacId: row.DAC_ID, datIni: periodIni, numDays, DAC_KW: row.MACHINE_KW });

      const usageHistory = dailyUse.filter(dayStats => {
          if (dayStats.hoursOn == null) { return false }
          return true
        })
        .map(dayStats => {
          const hoursOn = String(Math.trunc(dayStats.hoursOn)).padStart(2, '0')
          const minutesOn = String(Math.round((dayStats.hoursOn % 1) * 60)).padStart(2, '0')
          return {
            dayDesc: `${hoursOn}:${minutesOn} no dia ${dayStats.day.substring(8, 10)}/${dayStats.day.substring(5, 7)}`,
            hoursOnText: `${hoursOn}:${minutesOn}`,
            hoursOnPerc: Math.min(100, Math.round((dayStats.hoursOn || 0) / 24 * 100)).toString(),
          }
        })
      let consumption = 0;
      for (const dayStats of dailyUse) {
        consumption += dayStats.energyCons || 0;
        if (row.MACHINE_APPLICATION === 'ar-condicionado') {
          const weekDay = new Date(dayStats.day + 'T00:00:00Z').getUTCDay()
          if (weekDay === 0 || weekDay === 6) { // Ignore SUN and SAT
            continue
          }
          mean += (dayStats.hoursOn / 5)
        } else {
          mean += (dayStats.hoursOn / 7)
        }
      }
      mean = Math.round(mean * 60) / 60
      const hours = String(Math.trunc(mean)).padStart(2, '0')
      const minutes = String(Math.round((mean % 1) * 60)).padStart(2, '0')
      row.MEAN_USE = `${hours}:${minutes} por dia`
      row.USAGE_HISTORY = usageHistory;
      row.CONSUMO_KWH = consumption;
    }
    row.LAUDO = row.H_DESC
    if (row.LAUDO === healthIndexes['25'].laudo) row.LAUDO = '';
    if (row.LAUDO === healthIndexes['50'].laudo) row.LAUDO = '';
    if (row.LAUDO === healthIndexes['75'].laudo) row.LAUDO = '';
    if (row.LAUDO === healthIndexes['100'].laudo) row.LAUDO = '';

    list.push(row);
  }

  return list
}

export function runHtmlToPdfConverter (pathUnitRepNoExt: string) {
  return new Promise((resolve, reject) => {
    const proc = spawn(configfile.chromiumExecutable, [
      '--headless',
      '--disable-gpu',
      `--print-to-pdf=${pathUnitRepNoExt}.pdf`,
      `file://${pathUnitRepNoExt}.html`
    ])
    let promiseFinished = false

    const consoleMessages: { channel: string, message: string }[] = [];

    proc.stdout.on('data', (data) => {
      consoleMessages.push({ channel: 'stdout', message: String(data) })
      logger.info(`stdout: ${data}`)
    })

    proc.stderr.on('data', (data) => {
      consoleMessages.push({ channel: 'stderr', message: String(data) })
      data = data?.toString();
      if (data?.includes('bytes written to file')) {
        logger.info(`stderr: ${data}`)
      }
      else {
        logger.error(`stderr: ${data}`)
      }
    })

    proc.on('close', (code) => {
      logger.info(`child process exited with code ${code}`)
      if (!promiseFinished) {
        promiseFinished = true
        if (code != 0) reject(code)
        else resolve(consoleMessages)
      }
    })

    proc.on('error', (err) => {
      if (!promiseFinished) {
        promiseFinished = true
        reject(err)
      } else {
        logger.info(err)
      }
    })
  })
}

import sqldb from '../db'
import { addDays_YMD } from './dates'
import { mergeEventsList, parseCompressedChartData, parseCompressedChartDataS } from './chartDataFormats'
import { getDamDaySchedChart_s } from './scheduleData'
import { CompiledHistoryVar2 } from '../types'
import * as dielServices from '../dielServices'
import * as dacData from './dacData'
import { logger } from './logger'
import { getTimezoneByUnit } from '../db/sql/CLUNITS'
import { getOffsetDevCode, getOffsetTimezone } from './timezones'
import { getTimezoneInfoByDev } from '../db/sql/DEVICES';

export async function calculateUnitAutomSavings(unitId: number, dayStart: string, dayNext: string, daysList: string[], user: string) {
  const effectiveHours = {} as {
    [dacId: string]: {
      [day: string]: {
        // eco: number
        // vent: number
        totalEst: number
      }
    }
  };

  const x = true;
  if (x) {
    return { hoursBlocked: effectiveHours };
  }

  const damAutomatedDacs = {} as {
    [damId: string]: {
      [groupId: string]: string[]
    }
  };
  const dutAutomatedDacs = {} as {
    [dutId: string]: {
      [groupId: string]: string[]
    }
  };
  
  const dacsRows = await sqldb.DACS_DEVICES.getAutomatedDacs({ unitId });
  for (const row of dacsRows) {
    if (row.DEV_AUT) {
      if (!damAutomatedDacs[row.DEV_AUT]) damAutomatedDacs[row.DEV_AUT] = {};
      const groupId = row.MACHINE_ID.toString();
      if (!damAutomatedDacs[row.DEV_AUT][groupId]) damAutomatedDacs[row.DEV_AUT][groupId] = [];
      damAutomatedDacs[row.DEV_AUT][groupId].push(row.DAC_ID);
    }
    else if (row.DUT_ID) {
      if (!dutAutomatedDacs[row.DUT_ID]) dutAutomatedDacs[row.DUT_ID] = {};
      const groupId = row.MACHINE_ID.toString();
      if (!dutAutomatedDacs[row.DUT_ID][groupId]) dutAutomatedDacs[row.DUT_ID][groupId] = [];
      dutAutomatedDacs[row.DUT_ID][groupId].push(row.DAC_ID);
    }
  }

  const damIds = Object.keys(damAutomatedDacs);
  if (damIds.length > 0) {
    
    const damsProgs = await sqldb.DAMS.getListWithProgFU({ damIds }, { includeDacs: true });
    
    const damsEcoEvents = await getDamEcoHist(dayStart, dayNext, damIds);
    const damsStateHist = await getAutomHist(dayStart, dayNext, damIds, unitId);

    for (const [damId, damGroups] of Object.entries(damAutomatedDacs)) {
      const ecoEvents = damsEcoEvents[damId] || {};
      const damProgRow = damsProgs.find(dam => dam.DAM_ID === damId);
      // TODO: fill the gaps
      for (const groupDacs of Object.values(damGroups)) {
        if (!groupDacs.length) continue;

        const dacsL1 = await getDacsL1Hist(dayStart, dayNext, groupDacs, { motivo: `calculateUnitAutomSavings P1 ${user}` });
        for (const day of daysList) {
          const damCmdHist = ecoEvents[day];
          const stateHist = damsStateHist[damId] && damsStateHist[damId][day];
          const { schedChart, daySched } = getDamDaySchedChart_s(damProgRow && damProgRow.LASTPROG, day);
          if (!daySched) { continue; }

          const varsList: CompiledHistoryVar2[] = [
            schedChart,
            stateHist && stateHist.Mode,
            stateHist && stateHist.State,
            damCmdHist,
          ]
          for (const dacId of groupDacs) {
            const dacL1Hist = dacsL1[dacId] && dacsL1[dacId][day];
            varsList.push(dacL1Hist);
          }

          const asEventsList = mergeEventsList(varsList);
          const events_c = asEventsList.c;
          const events_prog = asEventsList.vs[0] as string[];
          const events_Mode = asEventsList.vs[1] as string[];
          const events_State = asEventsList.vs[2] as string[];
          const events_ecoCmd = asEventsList.vs[3] as string[];
          const events_L1s = asEventsList.vs.slice(4) as number[][];

          const statsCounters = [] as {
            time_off: number
            time_C1: number
            time_C2: number
            cond1_hit: number
            cond1_miss: number
            cond2_hit: number
            cond2_miss: number
            isC1: boolean
            isC2: boolean
          }[];
          for (let iD = 0; iD < groupDacs.length; iD++) {
            statsCounters.push({
              time_off: 0,
              time_C1: 0,
              time_C2: 0,
              cond1_hit: 0,
              cond1_miss: 0,
              cond2_hit: 0,
              cond2_miss: 0,
              isC1: null,
              isC2: null,
            })
          }
          let timeDamOffline = 0;

          for (let iR = 0; iR < events_c.length; iR++) {
            const rowDuration = events_c[iR];
            const rowProg = events_prog[iR];
            const rowMode = events_Mode[iR];
            const rowState = events_State[iR];
            const rowEcoCmd = events_ecoCmd[iR];

            if (!rowState) timeDamOffline += rowDuration;
            else timeDamOffline = 0;

            for (let iD = 0; iD < groupDacs.length; iD++) {
              const dacStats = statsCounters[iD];
              const dacL1 = events_L1s[iD][iR];
              if (rowProg === 'allow') {
                if (rowMode === 'Auto') {
                  if (dacL1 === 1) {
                    // disabledRow = 'Ligado';
                  } else if (dacL1 === 0) {
                    dacStats.time_off += rowDuration;
                  } else {
                    if (rowState === 'Enabled') {
                      // disabledRow = 'Ligado';
                    }
                    else if (rowState === 'Ventilation') {
                      dacStats.time_off += rowDuration;
                    }
                    else if (rowState === 'Disabled') {
                      dacStats.time_off += rowDuration;
                    }
                    else if (rowState === 'Condenser 1') {
                      dacStats.time_C1 += rowDuration;
                    }
                    else if (rowState === 'Condenser 2') {
                      dacStats.time_C2 += rowDuration;
                    }
                    else {
                      // disabledRow = 'Ignorado [State]';
                    }
                  }
                } else {
                  // disabledRow = 'Ignorado [Mode]';
                }
              }

              // if (['Condenser 1', 'Condenser 2'].includes(rowState) || ((!rowState) && ['Condenser 1', 'Condenser 2'].includes(rowEcoCmd))) {
              if (rowEcoCmd) {
                if (rowProg && (rowProg !== 'allow')) { } // rowSavingDet = 'Ignorado [Prog]';
                else if (rowState && (rowState !== rowEcoCmd)) { } // rowSavingDet = 'Ignorado [State]';
                else if (rowMode && (rowMode !== 'Auto')) { } // rowSavingDet = 'Ignorado [Mode]';
                else if (timeDamOffline >= 20*60) { } // rowSavingDet = 'Ignorado [Offl]';
                else {
                  if (rowState === 'Condenser 1') {
                    if (dacL1 === 1) { dacStats.cond1_hit += rowDuration; }
                    else { dacStats.cond1_miss += rowDuration; }
                  }
                  else if (rowState === 'Condenser 2') {
                    if (dacL1 === 1) { dacStats.cond2_hit += rowDuration; }
                    else { dacStats.cond2_miss += rowDuration; }
                  }
                };
              }
            }
          }

          identifyConds(statsCounters);

          for (let iD = 0; iD < groupDacs.length; iD++) {
            const dacId = groupDacs[iD];
            const dacStats = statsCounters[iD];
            let tempoDesligado = dacStats.time_off;
            if (!dacStats.isC1) tempoDesligado += dacStats.time_C1;
            if (!dacStats.isC2) tempoDesligado += dacStats.time_C2;
            const FU = (damProgRow && damProgRow.FU_NOM) || 0.6;
            if (!effectiveHours[dacId]) { effectiveHours[dacId] = {}; }
            if (daySched.type === 'allow') {
              const hoursAllowed = (daySched.indexEnd - daySched.indexIni + 1) / 60;
              const expectHoursOff = hoursAllowed * (1 - FU);
              const savingsHours = ((tempoDesligado / 3600) - expectHoursOff);
              // (savingsHours * dacInfo.potNominal * unitInfo.averageTariff).toFixed(2)
              effectiveHours[dacId][day] = {
                totalEst: (savingsHours > 0) ? (Math.round(savingsHours * 1000) / 1000) : 0,
              };
            } else {
              effectiveHours[dacId][day] = {
                totalEst: 0,
              };
            }
          }
        }
      }
    }
  }

  const dutIds = Object.keys(dutAutomatedDacs);
  if (dutIds.length > 0) {
    const dutsProgs = await sqldb.AUTOM_EVAP.getListWithProgFU({ dutIds });

    const dutsStateHist = await getAutomHist(dayStart, dayNext, dutIds, unitId);

    for (const [dutId, dutGroups] of Object.entries(dutAutomatedDacs)) {
      const dutProgRow = dutsProgs.find(x => x.DUT_ID === dutId);
      // TODO: fill the gaps
      for (const groupDacs of Object.values(dutGroups)) {
        if (!groupDacs.length) continue;
        
        const dacsL1 = await getDacsL1Hist(dayStart, dayNext, groupDacs, { motivo: `calculateUnitAutomSavings P2 ${user}` });
        for (const day of daysList) {
          const stateHist = dutsStateHist[dutId] && dutsStateHist[dutId][day];
          const { schedChart, daySched } = getDamDaySchedChart_s(dutProgRow && dutProgRow.LASTPROG, day);

          const varsList: CompiledHistoryVar2[] = [
            schedChart,
            stateHist && stateHist.Mode,
            stateHist && stateHist.State,
          ]
          for (const dacId of groupDacs) {
            const dacL1Hist = dacsL1[dacId] && dacsL1[dacId][day];
            varsList.push(dacL1Hist);
          }

          const asEventsList = mergeEventsList(varsList);
          const events_c = asEventsList.c;
          const events_prog = asEventsList.vs[0] as string[];
          const events_Mode = asEventsList.vs[1] as string[];
          const events_State = asEventsList.vs[2] as string[];
          const events_L1s = asEventsList.vs.slice(3) as number[][];

          const statsCounters = [] as {
            time_off: number
          }[];
          for (let iD = 0; iD < groupDacs.length; iD++) {
            statsCounters.push({
              time_off: 0,
            })
          }

          for (let iR = 0; iR < events_c.length; iR++) {
            const rowDuration = events_c[iR];
            const rowProg = events_prog[iR];
            const rowMode = events_Mode[iR];
            const rowState = events_State[iR];

            for (let iD = 0; iD < groupDacs.length; iD++) {
              const dacStats = statsCounters[iD];
              const dacL1 = events_L1s[iD][iR];
              if (rowProg === 'allow') {
                if (rowMode === 'Auto') {
                  if (dacL1 === 1) {
                    // disabledRow = 'Ligado';
                  } else if (dacL1 === 0) {
                    dacStats.time_off += rowDuration;
                  } else {
                    if (rowState === 'Enabled') {
                      // disabledRow = 'Ligado';
                    }
                    else if (rowState === 'Ventilation') {
                      dacStats.time_off += rowDuration;
                    }
                    else if (rowState === 'Disabled') {
                      dacStats.time_off += rowDuration;
                    }
                    else {
                      // disabledRow = 'Ignorado [State]';
                    }
                  }
                } else {
                  // disabledRow = 'Ignorado [Mode]';
                }
              }
            }
          }

          for (let iD = 0; iD < groupDacs.length; iD++) {
            const dacId = groupDacs[iD];
            const dacStats = statsCounters[iD];
            let tempoDesligado = dacStats.time_off;
            const FU = (dutProgRow && dutProgRow.FU_NOM) || 0.6;
            if (daySched && daySched.type === 'allow') {
              const hoursAllowed = (daySched.indexEnd - daySched.indexIni + 1) / 60;
              const expectHoursOff = hoursAllowed * (1 - FU);
              const savingsHours = ((tempoDesligado / 3600) - expectHoursOff);
              // (savingsHours * dacInfo.potNominal * unitInfo.averageTariff).toFixed(2)
              if (!effectiveHours[dacId]) { effectiveHours[dacId] = {}; }
              effectiveHours[dacId][day] = {
                totalEst: (savingsHours > 0) ? (Math.round(savingsHours * 1000) / 1000) : 0,
              };
              (effectiveHours[dacId][day] as any).eco = effectiveHours[dacId][day].totalEst; // TODO: remove this line, used temporarily for compatibility
            }
          }
        }
      }

    }
  }

  return {
    hoursBlocked: effectiveHours
  };
}

function identifyConds (dacsInfo: {
  cond1_hit: number
  cond1_miss: number
  cond2_hit: number
  cond2_miss: number
  isC1: boolean
  isC2: boolean
}[]) {
  if (dacsInfo.length === 1) {
    dacsInfo[0].isC1 = true;
    dacsInfo[0].isC2 = false;
    return;
  }

  let cond1_hits = 0;
  let cond2_hits = 0;
  for (const dac of dacsInfo) {
    cond1_hits += dac.cond1_hit;
    cond2_hits += dac.cond2_hit;
  }

  let cond1: { cond1_hit: number } = null;
  let cond2: { cond2_hit: number } = null;

  if (cond2_hits > cond1_hits) {
    for (const dac of dacsInfo) {
      if ((cond2 == null) || (dac.cond2_hit > cond2.cond2_hit)) {
        cond2 = dac;
      }
    }
    for (const dac of dacsInfo) {
      if (dac === cond2) continue;
      if ((cond1 == null) || (dac.cond1_hit > cond1.cond1_hit)) {
        cond1 = dac;
      }
    }
  } else {
    for (const dac of dacsInfo) {
      if ((cond1 == null) || (dac.cond1_hit > cond1.cond1_hit)) {
        cond1 = dac;
      }
    }
    for (const dac of dacsInfo) {
      if (dac === cond1) continue;
      if ((cond2 == null) || (dac.cond2_hit > cond2.cond2_hit)) {
        cond2 = dac;
      }
    }
  }

  for (const dac of dacsInfo) {
    dac.isC1 = (dac === cond1);
    dac.isC2 = (dac === cond2);
  }
}

async function getAutomHist (dayStart: string, dayNext: string, devIds: string[], unitId: number) {
  const automHist = {} as {
    [devId: string]: {
      [day: string]: {
        State: { v: string[], c: number[] },
        Mode: { v: string[], c: number[] },
      }
    }
  };
  if (devIds.length > 0) {
    let timezoneOffset = -3;
    const timezoneInfo = await getTimezoneByUnit({ UNIT_ID: unitId });
    if (timezoneInfo) {
      timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
    }
    const damsHistCache = await sqldb.cache_cond_tel.getBasicCharts({
      devIds: devIds,
      dayStart,
      dayNext,
      timezoneOffset
    });
    for (const row of damsHistCache) {
      const payload = JSON.parse(row.chartsBas || '{}')||{};
      if (!automHist[row.devId]) automHist[row.devId] = {};
      if (payload.Mode && payload.Mode.includes('AUTO')) { payload.Mode = payload.Mode.replace(/AUTO/g, "Auto"); }
      automHist[row.devId][row.YMD] = {
        State: parseCompressedChartDataS(payload.State),
        Mode: parseCompressedChartDataS(payload.Mode),
      };
    }
  }
  return automHist;
}

export async function getDamEcoHist (dayStart: string, dayNext: string, damIds: string[]) {
  const damsEcoEvents = {} as {
    [damId: string]: {
      [day: string]: {
        v: string[]
        c: number[]
      }
    }
  };
  for (const damId of damIds) {
    const commandsHistory = await sqldb.ECOCMDHIST.getList({
      devId: damId,
      dayStart,
      dayNext,
    });
    if (!commandsHistory.length) continue;

    const eventsPerDay = {} as {
      [day: string]: {
        start: number;
        end: number;
        mode: string;
      }[]
    }
    for (const row of commandsHistory) {
      const d = new Date(row.ts + 'Z');
      const start = ((d.getUTCHours() * 60) + d.getUTCMinutes()) * 60 + d.getUTCSeconds();
      const end = start + (row.duration * 60);
      const day = row.ts.substr(0, 10);
      const mode = row.mode;

      if (!eventsPerDay[day]) eventsPerDay[day] = [];
      const dayList = eventsPerDay[day];

      if (dayList.length === 0) {
        if (start !== 0) {
          dayList.push({ start: 0, end: start, mode: null });
        }
        dayList.push({ start, end, mode });
        continue;
      }

      const lastEvent = dayList[dayList.length - 1];
      if (start <= lastEvent.end) {
        if (lastEvent.mode === mode) {
          lastEvent.end = end;
        } else {
          lastEvent.end = start;
          dayList.push({ start, end, mode });
        }
      } else {
        dayList.push({ start: lastEvent.end, end: start, mode: null });
        dayList.push({ start, end, mode });
      }
    }
    let offset = await getOffsetDevCode(damId)
    const today = new Date(Date.now() + offset * 60 * 60 * 1000).toISOString().substr(0, 10);
    damsEcoEvents[damId] = {};
    for (const [day, events] of Object.entries(eventsPerDay)) {
      if (events.length > 0) {
        if (day < today) {
          const lastEventOfDay = events[events.length - 1];
          if (lastEventOfDay.end < 86400) {
            events.push({ start: lastEventOfDay.end, end: 86400, mode: null });
          }
        } else if (day === today) {
          const lastEventOfDay = events[events.length - 1];
          const nowshifted = new Date(Date.now() + offset * 60 * 60 * 1000);
          const nowindex = nowshifted.getUTCHours() * 60 * 60 + nowshifted.getUTCMinutes() * 60 + nowshifted.getUTCSeconds();
          if (lastEventOfDay.end < nowindex) {
            events.push({ start: lastEventOfDay.end, end: nowindex, mode: null });
          }
          else if (lastEventOfDay.start < nowindex && lastEventOfDay.end > nowindex) {
            lastEventOfDay.end = nowindex;
          }
        }
      }
      damsEcoEvents[damId][day] = { v: [], c: [] };
      const dayData = damsEcoEvents[damId][day];
      for (const item of events) {
        const duration = item.end - item.start;
        if (!duration) continue;
        dayData.v.push(item.mode);
        dayData.c.push(duration);
      }
    }
  }
  return damsEcoEvents;
}

export async function getDacsL1Hist (dayStart: string, dayEnd: string, dacIds: string[], rusthistDebug: { motivo: string }) {
  const dacsL1 = {} as {
    [dacId: string]: {
      [day: string]: {
        v: number[]
        c: number[]
        hoursOn?: number
        periodLcmp?: number
      }
    }
  };
  const datIniD = new Date(dayStart + 'T00:00:00Z');
  const datFinD = new Date(dayEnd + 'T00:00:00Z');
  const diffDays = Math.round((datFinD.getTime() - datIniD.getTime()) / (1000 * 60 * 60 * 24));

  const days = [] as string[]
  for (let i = 0; i < diffDays; i++) {
    const dayAux = addDays_YMD(dayStart, i);
    days.push(dayAux);
  }

  const L1sHistory = [] as {
    chartsBas: 
      {
        Lcmp: string
      }
    cstats: 
      {
        numDeparts: number
        hoursOn: number
        hoursOff: number
        hoursBlocked: number
        startLcmp: number
        endLcmp: number
      },
    devId: string
    YMD: string
  }[];

  const devsWithDate = [] as {devId: string, day: string}[];
  days.forEach(day => {
    dacIds.forEach(devId => {
      devsWithDate.push({ devId, day });
    })
  })
  // processDacDay to all dacs
  let compiledData = await Promise.all(
    devsWithDate.map(async (dev) => {
      let dacIdToTelemetry = dev.devId;

      // Verifica se há registro de histórico de movimentação de dispositivo, para considerar outro se necessário
      const asset = await sqldb.ASSETS.getDevsHistoryAsset({ DEV_ID: dev.devId });
      if (asset.length > 1) {
        let timezoneOffset = -3;
        const timezoneInfo = await getTimezoneInfoByDev({ devId: dev.devId });
        if (timezoneInfo != null) {
          timezoneOffset = getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET });
        }
        let devsAsset;
        if (asset[0].ASSET_ROLE === 'CONDENSER') {
          devsAsset = await sqldb.ASSETS.getDevsToTelemetryByCondenserId({CONDENSER_ID: asset[0].DAT_INDEX, dateStart: dayStart, dateEnd: dayStart, timezoneOffset});
        }
        else if (asset[0].ASSET_ROLE === 'EVAPORATOR') {
          devsAsset = await sqldb.ASSETS.getDevsToTelemetryByEvaporatorId({EVAPORATOR_ID: asset[0].DAT_INDEX, dateStart: dayStart, dateEnd: dayStart, timezoneOffset});
        }
        else {
          devsAsset = await sqldb.ASSETS.getDevsToTelemetryByAssetHeatExchangerId({ASSET_HEAT_EXCHANGER_ID: asset[0].DAT_INDEX, dateStart: dayStart, dateEnd: dayStart, timezoneOffset});
        }
        // Se houver mais de um dispositivo para o mesmo dia (dia que houve troca de dispositivo), foi decidido considerar apenas o mais recente para o dia.
        dacIdToTelemetry = devsAsset.length > 0 ? devsAsset[devsAsset.length - 1].DEV_ID : dacIdToTelemetry;
      }

      // Configuração do DAC atual
      const dacInf = await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: dev.devId })
      const hwCfg = dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
      const returnObject = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: rusthistDebug.motivo, dac: { devId: dacIdToTelemetry, hwCfg }, day: dev.day, hType: 'L1-Charts&Stats', dacExtInf: dacInf, debug_L1_fancoil: (dacInf.DAC_APPL === 'fancoil') });
      return {...returnObject, devId: dev.devId, date: dev.day };
    })
  )
  .catch((perr) => {
    logger.error(`Error para processar dados de DAC: ${perr}`);
    return [];
  }) as (Awaited<ReturnType<dielServices.ApiInternal_ApiAsync['/diel-internal/api-async/processDacDay']>>&({ devId: string, date: string }))[];
  
  // Fill L1sHistory to iterate
  compiledData.forEach((data) => {
    L1sHistory.push(
      {
        chartsBas: 
          {
            Lcmp: data.Lcmp || ''
          }, 
        cstats: 
          {
            numDeparts: data.numDeparts || null, 
            hoursOn: data.hoursOn || null,
            hoursOff: data.hoursOff || null,
            hoursBlocked: data.hoursBlocked || null,
            startLcmp: data.startLcmp || null,
            endLcmp: data.endLcmp || null
          },
        devId: data.devId,
        YMD: data.date
      })
  })
  
  for (const row of L1sHistory) {
    if (!dacsL1[row.devId]) dacsL1[row.devId] = {};
    dacsL1[row.devId][row.YMD] = parseCompressedChartData(row.chartsBas.Lcmp);
    dacsL1[row.devId][row.YMD].hoursOn = row.cstats.hoursOn;
    if (row.cstats.startLcmp != null && row.cstats.endLcmp != null) {
      dacsL1[row.devId][row.YMD].periodLcmp = Math.round((row.cstats.endLcmp - row.cstats.startLcmp) / 3600 * 1000) / 1000;
    }
  }
  return dacsL1;
}

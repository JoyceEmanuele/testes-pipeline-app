import sqldb from '../srcCommon/db'
import { createXlsx } from '../srcCommon/helpers/parseXlsx'
import { formataDiasTrabalhadosParaPlanilhas, getListDates } from '../srcCommon/helpers/dates'
import xlsx from 'node-xlsx';
import { formattedHourTelemetry } from '../srcCommon/helpers/dates'
import * as httpApiRouter from './httpApiRouter'
import { API_private2 } from '../srcCommon/types/api-private'
import * as fs from 'fs'
import * as uuid from 'uuid'
import servConfig from '../configfile'
import * as httpRouter from './apiServer/httpRouter'
import * as sendEmail from '../srcCommon/extServices/sendEmail'
import rusthistApi from '../srcCommon/dielServices/rusthistApi'
import * as dielServices from '../srcCommon/dielServices'
import * as dacData from '../srcCommon/helpers/dacData'
import * as brokersMonitor from '../srcCommon/dielServices/brokersMonitor'
import { typedWarn } from '../srcCommon/helpers/eventWarn'
import { logger } from '../srcCommon/helpers/logger'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'
import { getDaysList2_YMD } from '../srcCommon/helpers/dates'
import { returnActualDate } from '../srcCommon/helpers/dates'
import { getUserGlobalPermissions } from '../srcCommon/helpers/permissionControl'
import { buildEmailFirstLogin } from './auth/users'
import { buildEmailForgotPassword } from './auth/login'
import { buildGenericNotificationEmail } from '../srcCommon/helpers/templateFiles'
import { getLanguage, t } from '../srcCommon/helpers/i18nextradution'
import * as connectSql from '../srcCommon/db/connectSql'
import { saveOperationLog } from '../srcCommon/db/dbModifLog'
import { dbLogger } from '../srcCommon/helpers/logger'
import { getDmaTotalDayUsageHistory } from '../srcCommon/helpers/dmaData';
import { calculateLaagerUsageHistoryByDay, calculateAverageUsageHistory } from '../srcCommon/extServices/laagerApi';
import { splitChunks } from '../srcCommon/helpers/splitArray';


export const exportDutsMeanTemperatures: API_private2['/devtools/export-duts-mean-temperatures'] = async function (reqParams, session, { res }) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);

  if (!reqParams.clientIds) throw Error('Faltou informar os clientes').HttpStatus(400);
  if (!reqParams.dayStart) {
    reqParams.dayStart = new Date(Date.now() - 3 * (60 * 60 * 1000) - 31 * (24 * 60 * 60 * 1000)).toISOString().substring(0, 10);
  }

  const list = await sqldb.DUTS.getListExportMeanTp({
    clientIds: reqParams.clientIds,
    dayStartYMD: reqParams.dayStart,
  });

  const data: any[][] = [
    [
      'UNIT_ID',
      'devId',
      'Dia',
      'med',
      'min',
      'max',
      'horas',
    ]
  ];

  for (const row of list) {
    let { med, min, max, secI, secF } = JSON.parse(row.meantp);
    const horas = ((secI != null) && (secF != null)) ? (Math.round((secF - secI + 1) / 60 / 60 * 10) / 10) : '';
    if (med == null) med = '';
    if (min == null) min = '';
    if (max == null) max = '';
    // console.log(`${row.UNIT_NAME}\t${row.devId}\t${row.YMD}\t${med}\t${min}\t${max}\t${horas}`);
    data.push([
      row.UNIT_NAME || '',
      row.devId || '',
      row.YMD || '',
      med || '',
      min || '',
      max || '',
      horas || '',
    ]);
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `Temperaturas.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

function calculateAverageTemperatures(promise: any, reqParams: { telemetriaFilter: string }) {
  const mediaNoIntervalo = {
    quantidadeTelem: 0,
    soma: 0,
    nulos: 0,
  };
  const arrayTemp: number[] = [];
  // calculando a media com o auxilio da variavel mediaNoIntervalo para contar quantas telemetrias foram contadas para fazer a divisão
  promise.value.Temperature.y.forEach((item: number, index: number) => {
    if (index === 0) {
      arrayTemp.push(item == null ? 0 : item);
    } else if (index % (Number(reqParams.telemetriaFilter) * 60 / 5) === 0) {
      let media = mediaNoIntervalo.soma / (mediaNoIntervalo.quantidadeTelem - mediaNoIntervalo.nulos)
      if (isNaN(media) || media == null) {
        media = 0;
      }
      arrayTemp.push(Number(media.toFixed(2)));
      mediaNoIntervalo.quantidadeTelem = 0;
      mediaNoIntervalo.soma = 0;
      mediaNoIntervalo.nulos = 0;
    } else {
      if (item == null) {
        mediaNoIntervalo.nulos += 1;
      }
      mediaNoIntervalo.quantidadeTelem += 1;
      mediaNoIntervalo.soma += item;
    }
  })
  return arrayTemp;
}

type TUsageData = {
  clientName: string,
  unitName: string,
  namb: string,
  telemetry: number[],
  temperature: number[],
  typeAmbHour: {},
  dut: string,
  day: string
}

function formatingSheetsDataExportDutsTemperatures( reqParams: { dutsInfo: {[k: string]: {
  clientName: string;
  unitName: string;
  name: string;
  work: {
      [k: string]: string;
  }
  }}, duts: string[] }, usageData: TUsageData[]) {
    const sheets: { name: string, data: any[][], options: {} }[] = [];
    let data: any[][] = [
      [
        'Cliente',
        'Unidade',
        'Nome do ambiente',
        'DUT',
        'Data Telemetria',
        'Hora Telemetria',
        'Temperatura',
        'Horario de funcionamento do ambiente',
      ]
    ];
  
    let anterior = reqParams.duts[0]; /// pegando o nome do primeiro ambiente da lista de duts enviado pelo front;
    let contador = 0;
    usageData.forEach((row, index) => {
      let newDut = row.dut;
      let nameAmb = reqParams.dutsInfo[anterior].name ? reqParams.dutsInfo[anterior].name.replace('/', '-') : reqParams.dutsInfo[anterior].name;
      try {
        if (anterior !== newDut) { 
          contador += 1;
          sheets.push({ name: `${contador} - ${nameAmb?.slice(0,25)}`, data, options: {}});
          data = [[
            'Cliente',
            'Unidade',
            'Nome do ambiente',
            'DUT',
            'Data Telemetria',
            'Hora Telemetria',
            'Temperatura',
            'Horario de funcionamento do ambiente',
          ]];
        }
        row.telemetry.forEach((telem, index) => {
          data.push([
            row.clientName,
            row.unitName,
            row.namb,
            row.dut,
            row.day,
            formattedHourTelemetry(telem),
            row.temperature[index],
            row.typeAmbHour,
          ]);
        })
        if ((reqParams.duts.length === 1 && usageData.length - 1 === index) || usageData.length - 1 === index ) {
          contador += 1;
          sheets.push({ name: `${contador} - ${nameAmb?.slice(0,25)}`, data, options: {}});
        }
        anterior = row.dut;
      }
      catch(err) {
        logger.error({
          message: 'Error export duts telemetry',
          devId: row.dut,
          nameAmb: nameAmb,
          stack: (err as Error).stack
        })
      }
    });
    return sheets;
}

function formatingSheetsDataExportWatersUsages( reqParams: {
  clientName: string,
  unitName: string,
  periodUsage: number,
  history: {
    information_date: string,
    usage: number,
    devId: string,
    estimatedUsage?: boolean
  }[],
}) {
    const sheets: { name: string, data: any[][], options: {} }[] = [];
    let data: any[][] = [
      [
        'Cliente',
        'Unidade',
        'Tipo do Dispositivo',
        'Código do Dispositivo',
        'Data do Consumo',
        'Consumo',
      ]
    ];

    reqParams.history.forEach((row) => {
      data.push([
        reqParams.clientName,
        reqParams.unitName,
        row.devId.startsWith('DMA') ? 'Diel' : 'Laager',
        row.devId,
        row.information_date,
        row.usage,
      ]);
    });
    data.push([
      '',
      '',
      '',
      '',
      'Consumo do Periodo',
      reqParams.periodUsage,
    ]);
    sheets.push({ name: 'Medicao Mensal', data, options: {}});
    return sheets;
}


function dealWithPromiseExportDutsTemperatures( reqParams: {
  dutsInfo: {
      [k: string]: {
          clientName: string;
          unitName: string;
          name: string;
          work: {
              [k: string]: string;
          };
      };
  };
  duts: string[];
  telemetriaFilter: string;
}, listDates: string[], dutsTemperatures: PromiseSettledResult<{
  commonX: number[];
  Temperature: {
      y: number[];
  };
}>[] ) {
    const usageData: TUsageData[]  = [];
    // ------------------------------------------ pegar nome id do dut sem precisar fazer uma nova requisiçao
    const days: { [k: number]: string } = {
      0: 'mon',
      1: 'tue',
      2: 'wed',
      3: 'thu',
      4: 'fri',
      5: 'sat',
      6: 'sun'
    };

  const dutIndex = {
    index: 0,
    req: 0,
  };
  dutsTemperatures.forEach((promise) => {
    // se a promisse for sucedida vai ser formatado o horario de funcionamento e a temperatura será calculada a media.
    if (promise.status === 'fulfilled') {
      if (dutIndex.req === listDates.length) {
        dutIndex.index = dutIndex.index + 1;
        dutIndex.req = 0;
      }

      const arrayTemp: number[] = calculateAverageTemperatures(promise, { telemetriaFilter: reqParams.telemetriaFilter })

      /// pegando a data e formatando.
      const dayOfWeek = new Date(listDates[dutIndex.req]).getDay();
      const keyDut = reqParams.duts[dutIndex.index];
      
      let horas = ''
      if (reqParams.dutsInfo[keyDut] && reqParams.dutsInfo[keyDut].work && reqParams.dutsInfo[keyDut].work[days[dayOfWeek]]){
        horas = formataDiasTrabalhadosParaPlanilhas(reqParams.dutsInfo[keyDut].work[days[dayOfWeek]])
      }
      const data = {
        clientName: reqParams.dutsInfo[keyDut].clientName,
        unitName: reqParams.dutsInfo[keyDut].unitName,
        dut: keyDut,
        namb: reqParams.dutsInfo[keyDut].name,
        telemetry: promise.value.commonX.filter((item: number, index: number) => index % (Number(reqParams.telemetriaFilter) * 60 / 5) === 0), //filtrar na quantidade de tempo solicitado
        temperature: arrayTemp,
        typeAmbHour: horas,
        day: listDates[dutIndex.req],
      };
      usageData.push(data);
      dutIndex.req = dutIndex.req + 1;
    } else if (promise.status === 'rejected') {
      if (dutIndex.req === listDates.length) { dutIndex.index = dutIndex.index + 1; dutIndex.req = 0 }
      dutIndex.req = dutIndex.req + 1
    }
  })
  return usageData;
}

export const exportDutsTemperatures: API_private2['/devtools/export-duts-temperatures'] = async function (reqParams, session, { res }) {
  // Verificações básicas
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!reqParams.duts) throw Error('DUTs não informados');
  if (!reqParams.dayEnd || !reqParams.dayStart) throw Error('Erro data');

  // PEGANDO LISTA DE DATAS 
  const listDates: string[] = getListDates({ dayStart: reqParams.dayStart, dayEnd: reqParams.dayEnd })

  // --------------------------------------
  const promises: Promise<{
    commonX: number[]
    Temperature: { y: number[]; }
  }>[] = [];

  reqParams.duts.forEach((devId) => {
    listDates.forEach((dates) => {
      const params = {
        devId,
        selectedParams: ['Temperature'],
        day: dates,
        numDays: 1,
      };
      promises.push(httpApiRouter.externalRoutes['/dut/get-day-charts-data-commonX'](params, session));
    });
  });
  // ------------------------------------------ resolvendo todas as promises e as telemetrias pelo tempo requisitado
  const dutsTemperatures = await Promise.allSettled(promises);

  const usageData: TUsageData[]  = dealWithPromiseExportDutsTemperatures({dutsInfo: reqParams.dutsInfo, duts: reqParams.duts, telemetriaFilter: reqParams.telemetriaFilter}, listDates, dutsTemperatures);

  //// -------------------------------------------------tratando os dados e transformando as telemetrias em abas do excel

  const sheets: { name: string, data: any[][], options: {} }[] = formatingSheetsDataExportDutsTemperatures({ dutsInfo: reqParams.dutsInfo, duts: reqParams.duts} , usageData)
  
  const buffer = xlsx.build(sheets);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `Medicoes_de_medias_de_temperatura_${reqParams.telemetriaFilter}-minutos.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
};

httpRouter.privateRoutes['/devtools/export-dacs-info'] = async function (reqParams, session, { res }) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllClientsUnitsAndDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const list = await sqldb.DACS_DEVICES.getListInfoExport();

  const { devsSystemInfo } = await dielServices.realtimeInternalApi('/diel-internal/realtime/getDevsSystemInfo', {
    devIds: (list.length <= 500) ? list.map((x) => x.DAC_ID) : undefined,
  });

  const data: any[][] = [
    [
      'STATE_ID',
      'CITY_NAME',
      'CLIENT_NAME',
      'UNIT_NAME',
      'MACHINE_NAME',
      'DAC_ID',
      'DAC_NAME',
      'MACHINE_BRAND',
      'ASSET_MODEL',
      'ASSET_CAPACITY_POWER',
      'ASSET_CAPACITY_UNIT',
      'MACHINE_KW',
      'MACHINE_COP',
      'MACHINE_FLUID_TYPE',
      'MACHINE_APPLICATION',
      'MACHINE_TYPE',
      'DAC_COMIS',
      'DAM_DISABLED',
      'P0_POSITN',
      'P0_SENSOR',
      'P1_POSITN',
      'P1_SENSOR',
      'WIFI',
    ]
  ];
  for (const row of list) {
    const lastRssiMsg = devsSystemInfo[row.DAC_ID];
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    data.push([
      row.STATE_ID,
      row.CITY_NAME,
      row.CLIENT_NAME,
      row.UNIT_NAME,
      row.MACHINE_NAME,
      row.DAC_ID,
      row.DAC_NAME,
      row.MACHINE_BRAND,
      row.ASSET_MODEL,
      row.ASSET_CAPACITY_POWER,
      row.ASSET_CAPACITY_UNIT,
      row.MACHINE_KW,
      row.MACHINE_COP,
      row.MACHINE_FLUID_TYPE,
      row.MACHINE_APPLICATION,
      row.MACHINE_TYPE,
      row.DAC_COMIS,
      row.DAM_DISABLED,
      row.P0_POSITN,
      row.P0_SENSOR,
      row.P1_POSITN,
      row.P1_SENSOR,
      rssiDesc(RSSI),
    ]);
  }
  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `DACs.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer); // .download(`DACs.xlsx`, `DACs.xlsx`)
  return res;
}

function rssiDesc(RSSI: number) {
  if (!(RSSI < 0)) return '-';
  if (RSSI > -50) return 'Excelente';
  if (RSSI > -60) return 'Bom';
  if (RSSI > -70) return 'Regular';
  return 'Ruim';
}

function checkRowList(row: number | string) {
  return (row == null) ? '' : row;
}

httpRouter.privateRoutes['/devtools/export-duts-info'] = async function (reqParams, session, { res }) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllClientsUnitsAndDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const machinesList = await sqldb.MACHINES.getMachinesList({});

  const list = await sqldb.DUTS.getListInfoExport();

  const { devsSystemInfo } = await dielServices.realtimeInternalApi('/diel-internal/realtime/getDevsSystemInfo', {
    devIds: (list.length <= 500) ? list.map((x) => x.DEV_ID) : undefined,
  });

  const data: any[][] = [
    [
      'CLIENT_NAME',
      'STATE_ID',
      'CITY_NAME',
      'UNIT_NAME',
      'DEV_ID',
      'AUT_DISABLED',
      'TSETPOINT',
      'CTRLOPER',
      'TMIN',
      'TMAX',
      'LTCRIT',
      'PORTCFG',
      'LTINF',
      'WIFI',
      'ROOM_NAME',
      'GROUP_NAME',
    ]
  ];
  for (const row of list) {
    const machinesNames = machinesList.filter((machine) => (machine.DUT_ID === row.DEV_ID)).map(machine => machine.MACHINE_NAME).join(', ') || null;
    const lastRssiMsg = devsSystemInfo[row.DEV_ID];
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    data.push([
      row.CLIENT_NAME,
      row.STATE_ID,
      row.CITY_NAME,
      row.UNIT_NAME,
      row.DEV_ID,
      row.AUT_DISABLED,
      checkRowList(row.TSETPOINT),
      checkRowList(row.CTRLOPER),
      checkRowList(row.TUSEMIN),
      checkRowList(row.TUSEMAX),
      checkRowList(row.LTCRIT),
      checkRowList(row.PORTCFG),
      checkRowList(row.LTINF),
      rssiDesc(RSSI),
      row.ROOM_NAME,
      machinesNames,
    ]);
  }
  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `DUTs.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/devtools/export-dams-info'] = async function (reqParams, session, { res }) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageAllClientsUnitsAndDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const machinesList = await sqldb.MACHINES.getMachinesList({});

  const list = await sqldb.DAMS.getListInfoExport();

  const { devsSystemInfo } = await dielServices.realtimeInternalApi('/diel-internal/realtime/getDevsSystemInfo', {
    devIds: (list.length <= 500) ? list.map((x) => x.DAM_ID) : undefined,
  });

  const data: any[][] = [
    [
      'CLIENT_NAME',
      'STATE_ID',
      'CITY_NAME',
      'UNIT_NAME',
      'DAM_ID',
      'GROUP_NAME',
      'WIFI',
    ]
  ];
  for (const row of list) {
    const machinesNames = machinesList.filter((machine) => (machine.DEV_AUT === row.DAM_ID)).map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null;
    const lastRssiMsg = devsSystemInfo[row.DAM_ID];
    const RSSI = lastRssiMsg && (lastRssiMsg.AP_CON_RSSI || lastRssiMsg.WIFI_STA_RSSI) || undefined;
    data.push([
      row.CLIENT_NAME,
      row.STATE_ID,
      row.CITY_NAME,
      row.UNIT_NAME,
      row.DAM_ID,
      machinesNames,
      rssiDesc(RSSI),
    ]);
  }
  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `DAMs.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/devtools/run-command'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (reqParams.command === 'checkOtaQueue') {
    const response = await dielServices.bgtasksInternalApi('/diel-internal/bgtasks/checkOtaQueue', {});
    logger.info('DBG', '/devtools/run-command', 'finalizando', JSON.stringify(reqParams).substring(0, 1000));
    return JSON.stringify(response);
  }

  if (!session.permissions.isMasterUser) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  // if (reqParams.command === 'generateUnitReports') {
  //   const clients = await healthReport.listRequiredReports()
  //   await healthReport.generateRequiredReports(clients)
  //   logger.info('DBG', '/devtools/run-command', 'finalizando')
  //   return 'DONE ' + reqParams.command;
  // }

  // if (reqParams.command === 'previewUnitReportsGenRequest') {
  //   const clients = await healthReport.listRequiredReports()
  //   logger.info('DBG', '/devtools/run-command', 'finalizando')
  //   return JSON.stringify({ clients });
  // }

  // if (reqParams.command === 'sendUnitReportsProd') {
  //   const clients = await healthReport.listRequiredReports(reqParams.users)
  //   if (!reqParams.ignoreGeneration) {
  //     await healthReport.generateRequiredReports(clients)
  //   }
  //   if (reqParams.onlyTo || reqParams.ignore) {
  //     await healthReport.sendReportsByEmail(clients, {
  //       onlyTo: reqParams.onlyTo,
  //       ignore: reqParams.ignore,
  //       reqUser: session.user,
  //     });
  //   } else {
  //     return 'ERROR: precisa incluir onlyTo ou ignore';
  //   }
  //   logger.info('DBG', '/devtools/run-command', 'finalizando')
  //   return 'DONE ' + reqParams.command;
  // }

  if (reqParams.command === 'sendTypedWarn') {
    // sendTypedWarn{"type":"MONIT_BROKERS","desc":"Teste de notificação"}
    if (!reqParams.type) throw Error('Sem type').HttpStatus(400);
    if (!reqParams.desc) throw Error('Sem desc').HttpStatus(400);
    typedWarn(reqParams.type, reqParams.desc);
    logger.info('DBG', '/devtools/run-command', 'finalizando')
    return 'DONE ' + reqParams.command;
  }

  if (reqParams.command === 'processDutDay') {
    // processDutDay{"dutId":"xxx","day":"xxx"}
    const dutInf = reqParams.dutId && await sqldb.DUTS.getFreshDevInfo({ devId: reqParams.dutId });
    if (!dutInf) throw Error('DUT não encontrado').HttpStatus(400);
    await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: `devtools ${session.user}`, dutId: reqParams.dutId, day: reqParams.day, hType: "StatsT", dutExtInf: dutInf });
    logger.info('DBG', '/devtools/run-command', 'finalizando')
    return 'DONE ' + reqParams.command;
  }

  if (reqParams.command === 'processDacDay') {
    // processDacDay{"dacId":"","day":"","histType":"Stats-L1-Tamb"} | "L1-Charts&Stats"
    const dacInf = reqParams.dacId && await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: reqParams.dacId });
    const hwCfg = dacInf && dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
    if (!hwCfg) throw Error('Sem hwCfg').HttpStatus(400);
    const dac = { devId: dacInf.DAC_ID, hwCfg }
    await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: `devtools ${session.user}`, dac, day: reqParams.day, hType: reqParams.histType, dacExtInf: dacInf });
    logger.info('DBG', '/devtools/run-command', 'finalizando')
    return 'DONE ' + reqParams.command;
  }

  if (reqParams.command === 'clearRustHistCache') {
    // clearRustHistCache{"before":"YYYY-MM-DD"}
    if (!reqParams.before) {
      reqParams.before = new Date(Date.now() - 3 * 60 * 60 * 1000 - 3 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10);
    }

    logger.info('limpar cache de históricos anteriores a:', reqParams.before);
    const resp = await rusthistApi['/clear-cache']({ before: reqParams.before }, `/devtools/run-command ${session.user}`);

    logger.info('DBG', '/devtools/run-command', 'finalizando')
    return JSON.stringify(resp);
  }

  // if (reqParams.command === 'updateDacsHealthDurations') {
  //   await dacHealth.updateDacsHealthDurations();
  //   logger.info('DBG', '/devtools/run-command', 'finalizando')
  //   return 'DONE ' + reqParams.command;
  // }

  // if ((reqParams.command === 'sendUnitReportExample') && (reqParams.clientId)) {
  //   // sendUnitReportExample{"clientId":21}
  //   const client = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: reqParams.clientId });
  //   const users = [
  //     {
  //       NOME: 'Carlos',
  //       SOBRENOME: 'Langoni',
  //       EMAIL: 'carlos.langoni@dielenergia.com',
  //       UNITREP: 'WEEK',
  //       UNITREPFILT: (reqParams.UNITREPFILT || null) as string, // 'UNITS:10,11'
  //       CLIENT_ID: client.CLIENT_ID,
  //       CLIENT_NAME: client.NAME,
  //     },
  //   ];
  //   for (const extraUser of (reqParams.users || [])) {
  //     users.push({
  //       NOME: extraUser.NOME || '',
  //       SOBRENOME: extraUser.SOBRENOME || '',
  //       EMAIL: extraUser.EMAIL || 'x@x.x',
  //       UNITREP: 'WEEK',
  //       UNITREPFILT: (reqParams.UNITREPFILT || null) as string, // 'UNITS:10,11'
  //       CLIENT_ID: client.CLIENT_ID,
  //       CLIENT_NAME: client.NAME,
  //     });
  //   }
  //   const clients = await healthReport.listRequiredReports(users);
  //   await healthReport.generateRequiredReports(clients);
  //   await healthReport.sendReportsByEmail(clients, { reqUser: session.user });
  //   logger.info('DBG', '/devtools/run-command', 'finalizando')
  //   return 'DONE ' + reqParams.command;
  // }

  if (reqParams.command === 'sendEmailsTemplateExample') {
    // sendEmailsTemplateExample{"users":[{"NOME":"abc","EMAIL":"...@domain"}]}
    const users = [
      {
        NOME: 'Carlos Langoni',
        EMAIL: 'carlos.langoni@dielenergia.com',
      },
    ];
    for (const extraUser of (reqParams.users || [])) {
      users.push({
        NOME: extraUser.NOME || extraUser.EMAIL,
        EMAIL: extraUser.EMAIL || 'x@x.x',
      });
    }

    for (const user of users) {
      const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: user.EMAIL });
      const idioma = getLanguage(prefsUser[0])
      {
        const { subject, emailBody } = buildEmailForgotPassword({
          USER_ID: user.EMAIL,
          token: uuid.v4(),
          IDIOMA: idioma
        });
        await sendEmail.simple({ user: session.user }, [user.EMAIL], subject, emailBody);
      }
      {
        const { subject, emailBody } = buildEmailFirstLogin({
          LINK: `${servConfig.frontPwResetUrl}?token=${uuid.v4()}`,
          USER: user.EMAIL,
          PASSWORD: 'segredo',
        });
        await sendEmail.simple({ user: session.user }, [user.EMAIL], subject, emailBody);
      }
      {
        const { emailBody } = buildGenericNotificationEmail({
          DATEINFO: returnActualDate(false, idioma),
          COLOR_HEX: '#FFB800',
          ICON_PNG: 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png',
          NOTIFICATION: t('voceTemUmaNovaNotificacaoMaiusculo', idioma),
          USER_NAME: (user.NOME || '-'),
          EMAIL_MESSAGE: `${t('verficamosIndiceDeSaudeMaquina', idioma)} <b>${'SPLITÃO'}</b>, ${t('naUnidade', idioma)} <b>${'Filial 01'}</b>, ${t('encontraSeEm', idioma)} <span style="color:#ed193f">${t('riscoIminente', idioma)}</span>.`
        });
        const subject = `${t('notificacao.notificacao', idioma)} - Plataforma Celsius 360`;
        await sendEmail.simple({ user: session.user }, [user.EMAIL], subject, emailBody);
      }
    }
    logger.info('DBG', '/devtools/run-command', 'finalizando')
    return 'DONE ' + reqParams.command;
  }

  if (reqParams.command === 'terminateServer') {
    process.exit(0);
  }

  if (reqParams.command === 'ManualQueries') {
    const list = JSON.parse(fs.readFileSync('./manualQueries.json', 'utf8'));
    for (const { sentence, qPars } of list) {
      if ((!qPars) || (!sentence)) throw Error('Conteúdo inválido no arquivo de queries').HttpStatus(400);
      await saveOperationLog('ASSETS_HEALTH_HIST', sentence, qPars, session.user);
      dbLogger('ASSETS_HEALTH_HIST', sentence, qPars, session.user);
      await connectSql.execute(sentence, qPars);
    }
    return `Executado: ${list.length}`;
  }

  if (reqParams.command === 'sendTelegramNotification') {
    await dielServices.telegramInternalApi('/diel-internal/telegram/send-message-to', {
      phoneNumber: reqParams.phoneNumber,
      msgText: reqParams.msgText,
    });
    return 'DONE ' + reqParams.command;
  }

  logger.info('DBG', '/devtools/run-command', 'finalizando')
  return 'NOTHING'
}

httpRouter.privateRoutes['/devtools/processDacDay'] = async function (reqParams, session) {
  throw Error('Desativado!').HttpStatus(403);
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!servConfig.isProductionServer) throw Error('Invalid configuration!').HttpStatus(400);
  if (servConfig.isTestServer) throw Error('Invalid configuration!').HttpStatus(400);

  if (!reqParams.dacId) throw Error('Missing parameter "dacId"').HttpStatus(400);
  if (!reqParams.dayYMD) throw Error('Missing parameter "dayYMD"').HttpStatus(400);
  if (!reqParams.histType) throw Error('Missing parameter "histType"').HttpStatus(400);

  const dacInf = reqParams.dacId && await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: reqParams.dacId });
  const hwCfg = dacInf && dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  if (!hwCfg) throw Error('Sem hwCfg').HttpStatus(400);
  const dac = { devId: dacInf.DAC_ID, hwCfg }

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: `devtools ${session.user}`, dac, day: reqParams.dayYMD, hType: reqParams.histType as any, dacExtInf: { GROUP_ID: dacInf.GROUP_ID, DAC_APPL: dacInf.DAC_APPL, UNIT_ID: reqParams.unitId || dacInf.UNIT_ID  }});
}
httpRouter.privateRoutes['/devtools/processDutDay'] = async function (reqParams, session) {
  throw Error('Desativado!').HttpStatus(403);
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!servConfig.isProductionServer) throw Error('Invalid configuration!').HttpStatus(400);
  if (servConfig.isTestServer) throw Error('Invalid configuration!').HttpStatus(400);

  if (!reqParams.dutId) throw Error('Missing parameter "dutId"').HttpStatus(400);
  if (!reqParams.dayYMD) throw Error('Missing parameter "dayYMD"').HttpStatus(400);
  if (!reqParams.histType) throw Error('Missing parameter "histType"').HttpStatus(400);

  const dutInf = reqParams.dutId && await sqldb.DUTS.getFreshDevInfo({ devId: reqParams.dutId });
  if (!dutInf) throw Error('DUT não encontrado').HttpStatus(400);

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDutDay', { motivo: `devtools ${session.user}`, dutId: reqParams.dutId, day: reqParams.dayYMD, hType: reqParams.histType as any, dutExtInf: { RTYPE_ID: dutInf.RTYPE_ID, UNIT_ID: reqParams.unitId || dutInf.UNIT_ID } });
}
httpRouter.privateRoutes['/devtools/processDamDay'] = async function (reqParams, session) {
  throw Error('Desativado!').HttpStatus(403);
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!servConfig.isProductionServer) throw Error('Invalid configuration!').HttpStatus(400);
  if (servConfig.isTestServer) throw Error('Invalid configuration!').HttpStatus(400);

  if (!reqParams.damId) throw Error('Missing parameter "damId"').HttpStatus(400);
  if (!reqParams.dayYMD) throw Error('Missing parameter "dayYMD"').HttpStatus(400);

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDamDay', { motivo: `devtools ${session.user}`, damId: reqParams.damId, day: reqParams.dayYMD, unitId: reqParams.unitId });
}
httpRouter.privateRoutes['/devtools/processDriDay'] = async function (reqParams, session) {
  throw Error('Desativado!').HttpStatus(403);
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!servConfig.isProductionServer) throw Error('Invalid configuration!').HttpStatus(400);
  if (servConfig.isTestServer) throw Error('Invalid configuration!').HttpStatus(400);

  if (!reqParams.driId) throw Error('Missing parameter "driId"').HttpStatus(400);
  if (!reqParams.driType) throw Error('Missing parameter "driType').HttpStatus(400);
  if (!reqParams.dayYMD) throw Error('Missing parameter "dayYMD"').HttpStatus(400);

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDriDay', { motivo: `devtools ${session.user}`, driId: reqParams.driId, driType: reqParams.driType, driInterval: reqParams.driInterval, day: reqParams.dayYMD });
}

httpRouter.privateRoutes['/devtools/processDmaDay'] = async function (reqParams, session) {
  throw Error('Desativado!').HttpStatus(403);
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!servConfig.isProductionServer) throw Error('Invalid configuration!').HttpStatus(400);
  if (servConfig.isTestServer) throw Error('Invalid configuration!').HttpStatus(400);

  if (!reqParams.dmaId) throw Error('Missing parameter "dmaId"').HttpStatus(400);
  if (!reqParams.dayYMD) throw Error('Missing parameter "dayYMD"').HttpStatus(400);

  return dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `devtools ${session.user}`, dmaId: reqParams.dmaId, day: reqParams.dayYMD, unitId: reqParams.unitId });
}

httpRouter.privateRoutes['/devtools/send-email'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  const rgxEmailDiel = /^[\w\d][\w\d\.]+@dielenergia\.com$/;
  if (!rgxEmailDiel.test(session.user)) throw Error('Usuário com email não permitido').HttpStatus(400);
  if (!reqParams.emailBodyHtml) throw Error('Missing parameter "emailBodyHtml"').HttpStatus(400);
  if (!reqParams.subject) throw Error('Missing parameter "subject"').HttpStatus(400);

  const rgxEmail = /^[\w\d][\w\d\.-]+@[\w\d][\w\d\.-]+$/;
  let copias = (reqParams.cc instanceof Array) ? reqParams.cc.map(x => String(x)).filter(x => !!x && rgxEmail.test(x)) : [];
  if (copias.length === 0) copias = undefined;

  try {
    await sendEmail.simple({ user: session.user }, [session.user], String(reqParams.subject), String(reqParams.emailBodyHtml));
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}

httpRouter.privateRoutes['/devtools/brokers-monitor-hist-v1'] = async function (reqParams, session) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);

  const historyData = await brokersMonitor.api["/status-charts-v1"](reqParams.dayYMD);

  const commonx = [];
  const records = [];
  for (const line of historyData.split('\n')) {
    if (!line) continue;
    const [time, payload] = line.split('\t');
    const p = jsonTryParse<any>(payload);
    if (!p) continue;
    const daySecond = Number(time.substring(0, 2)) * 60 * 60 + Number(time.substring(3, 5)) * 60 + Number(time.substring(6, 8));
    if ((daySecond >= 0) && (daySecond <= 24 * 60 * 60)) { /* OK */ }
    else { continue; }
    delete p.devs_conn; // Não é necessário para este endpoint
    commonx.push(daySecond);
    records.push(p);
  }

  return { commonx, records };
}

httpRouter.privateRoutes['/devtools/brokers-monitor-disconnected-devs'] = async function (reqParams, session, { res }) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);

  const tsStart = new Date(new Date(reqParams.tsStart).getTime() - 3 * 60 * 60 * 1000);
  const tsEnd = new Date(new Date(reqParams.tsEnd).getTime() - 3 * 60 * 60 * 1000);
  const dayStart = tsStart.toISOString().substring(0, 10);
  const dayEnd = tsEnd.toISOString().substring(0, 10);
  const tStart = tsStart.toISOString().substring(11, 19);
  const tEnd = tsEnd.toISOString().substring(11, 19);

  const daysList = getDaysList2_YMD(dayStart, dayEnd);
  if (daysList.length === 1) { /* OK */ }
  else if (daysList.length === 2) { /* OK */ }
  else { throw Error('Período inválido').HttpStatus(400); }

  const disconnectedIds: Set<string> = new Set();
  for (const day of daysList) {
    const historyData1 = await brokersMonitor.api["/status-charts-v1"](day, (day === dayStart) ? tStart : undefined, (day === dayEnd) ? tEnd : undefined);
    const historyData2 = await brokersMonitor.api2["/status-charts-v1"](day, (day === dayStart) ? tStart : undefined, (day === dayEnd) ? tEnd : undefined);
    const historyData = []
      .concat(historyData1.split('\n'))
      .concat(historyData2.split('\n'))
      .sort();
    for (const line of historyData) {
      if (!line) continue;
      const [time, payload] = line.split('\t');
      const record = jsonTryParse<{
        // interval: number
        // est_conn: number
        // brokers_stats: {
        //   conn_arr: number
        //   conn_closed: number
        //   est_conn: number
        //   tls_err: number
        //   subscr: number
        //   pub_brtodv: number
        //   pub_others: number
        // }[]
        devs_conn: {
          [dev_id: string]: number
        }
      }>(payload);
      if (!record.devs_conn) continue;
      for (const [devId, connStatus] of Object.entries(record.devs_conn)) {
        if (connStatus < 0) disconnectedIds.add(devId);
        else if (connStatus > 0) disconnectedIds.delete(devId);
      }
    }
  }

  const data: any[][] = [
    [
      'CLIENT_NAME',
      'STATE_ID',
      'CITY_NAME',
      'UNIT_NAME',
      'DEV_ID',
      'SIMCARD',
    ]
  ];

  const listDbSims = await sqldb.SIMCARDS.getList({});

  const chunks = splitChunks(Array.from(disconnectedIds), 100);
  for (const devIds of chunks) {
    const devsList = await sqldb.DEVICES.getDevsList({ devIds });
    for (const devId of devIds) {
      const row = devsList.find((x) => x.DEV_ID === devId);
      const iccids = (row && row.UNIT_ID && listDbSims.filter((x) => x.UNIT === row.UNIT_ID).map((x) => x.ICCID)) || [];
      data.push([
        (row && row.CLIENT_NAME) || '',
        (row && row.STATE_ID) || '',
        (row && row.CITY_NAME) || '',
        (row && row.UNIT_NAME) || '',
        devId,
        iccids.join(', ') || '',
      ]);
    }
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `Disconnected.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}


export const exportWaterUsages: API_private2['/devtools/export-waters-usages'] = async function (reqParams, session, { res }) {
  // Verificações básicas
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!reqParams.unitId) throw Error('unitId não informados');
  if (!reqParams.dayEnd || !reqParams.dayStart) throw Error('Erro data');

  const waterInfo = await sqldb.WATERS.getWaterInfoByUnit({UNIT_ID: reqParams.unitId});
  const isDma = waterInfo && waterInfo.DEVICE_CODE && waterInfo.DEVICE_CODE.includes('DMA');

  let period_usage = 0;
  let historyResult = [] as {
    information_date: string,
    usage: number,
    devId: string,
    estimatedUsage?: boolean
  }[];
  if (waterInfo && waterInfo.DEVICE_CODE) {
    let dmaIds = [] as { 
      ID: number,
      DMA_ID: string,
      START_DATE: string,
      END_DATE: string,
      UNIT_ID: number,
    }[];
    let laagerIds = [] as { 
      ID: number,
      LAAGER_ID: string,
      START_DATE: string,
      END_DATE: string,
      UNIT_ID: number,
    }[];
    

    if (isDma) {
      const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: waterInfo.DEVICE_CODE });
      if (!dmaInf.HYDROMETER_MODEL) throw Error('Modelo do hidrômetro não cadastrado.');
      if(dmaInf.UNIT_ID) { 
        dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: reqParams.dayStart, dateEnd: reqParams.dayEnd })
        laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: dmaInf.UNIT_ID, dateStart: reqParams.dayStart, dateEnd: reqParams.dayEnd })
      
        const litersPerPulse = Number(dmaInf.HYDROMETER_MODEL.substring(
          dmaInf.HYDROMETER_MODEL.indexOf("(") + 1, 
          dmaInf.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);
      
        if(!litersPerPulse) throw Error("Não foi encontrado a quantidade de litros por pulso");
      
        const dateList = getDaysList2_YMD(reqParams.dayStart, reqParams.dayEnd);
      
        for(const date of dateList){
          let historyDevDmas = dmaIds.length ? dmaIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []
          let historyDevLaager = laagerIds.length ? laagerIds.filter((dev) => new Date(dev.START_DATE) <= new Date(date) && (new Date(dev.END_DATE) >= new Date(date) || dev.END_DATE === null)) : []
      
          if (historyDevDmas.length && historyDevDmas[historyDevDmas.length - 1].DMA_ID){
            //se tem dma no histórico, calculo o consumo
            const dataHistory = await getDmaTotalDayUsageHistory(historyDevDmas[historyDevDmas.length - 1].DMA_ID, date, period_usage, { motivo: `/dma/get-usage-history ${session.user}`}, historyResult, dmaInf.UNIT_ID,);
            period_usage = dataHistory.period_usage;
            historyResult = dataHistory.history;
          } else if(historyDevLaager.length && historyDevLaager[historyDevLaager.length - 1].LAAGER_ID){
            //se tem disp laager no histórico, calculo o consumo
            const dataHistory = await calculateLaagerUsageHistoryByDay(historyDevLaager[historyDevLaager.length - 1].LAAGER_ID, date, period_usage, historyResult);
            period_usage = dataHistory.period_usage;
            historyResult = dataHistory.history;
          } else {
            // se não tem histórico de associação, calcula o do dispositivo atual
            const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: `/dma/get-usage-history ${session.user}`, dmaId: waterInfo.DEVICE_CODE, day: date, unitId: dmaInf.UNIT_ID });
      
            let data = compiledData && compiledData["TelemetryList"] ? compiledData?.TelemetryList : [];
      
            let sum = 0;
            data.forEach((e) => {
              sum += e.pulses
            });
            sum *= litersPerPulse;
            period_usage += sum;
            historyResult.push({"information_date": date, "usage": sum, "devId": waterInfo.DEVICE_CODE});
          }
        }
      }
    }
    else {
      let unLaager = waterInfo.DEVICE_CODE;
      const meterSimpleInf = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: unLaager });
      if (meterSimpleInf.UNIT_ID) {
        dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: meterSimpleInf.UNIT_ID, dateStart: reqParams.dayStart, dateEnd: reqParams.dayEnd })
        laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: meterSimpleInf.UNIT_ID, dateStart: reqParams.dayStart, dateEnd: reqParams.dayEnd })
      }

      const { periodUsage, history } = await calculateAverageUsageHistory({unit_id: waterInfo.DEVICE_CODE, start_date: reqParams.dayStart, end_date: reqParams.dayEnd}, dmaIds, laagerIds, meterSimpleInf, unLaager, session)
      historyResult = history;
      period_usage = periodUsage;
    }
  }
  else {
    return res;
  }

  const sheets: { name: string, data: any[][], options: {} }[] = formatingSheetsDataExportWatersUsages({
    clientName: waterInfo.CLIENT_NAME, unitName: waterInfo.UNIT_NAME, periodUsage: period_usage, history: historyResult
  });
  
  const buffer = xlsx.build(sheets);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('filename', `Medicoes_de_Agua.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
};

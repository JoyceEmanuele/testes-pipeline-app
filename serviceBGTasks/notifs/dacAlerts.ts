import sqldb from '../../srcCommon/db'
import * as dielServices from '../../srcCommon/dielServices'
import { parseNotificationFilter } from '../../srcCommon/helpers/notifications'
import * as dacData from '../../srcCommon/helpers/dacData'
import { formatArrHistory, parseCompressedChartData } from '../../srcCommon/helpers/chartDataFormats'
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { returnActualDate } from '../../srcCommon/helpers/dates'
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import { logger } from '../../srcCommon/helpers/logger';

type NotifDacOn = {
  groupName: string,
  dacId: string,
  onDuration: string,
  unitId: number,
  unitName: string,
  onlineHist: { firstOnTime: string, lastOnTime: string }[]
}

export async function checkDacTimeOutOfBounds() {
  // Função que roda às 01:00 e busca no histórico de telemetrias para saber se o dispositivo funcionou fora do horário
  const rusthistDebug = { motivo: 'DacUseTimeAlerts' };

  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['COMP_TIME'], condOps: ['D>', 'D<'] });

  for (const notif of notifsList) {
    const devsFilter = parseNotificationFilter(notif.FILT_DEVS, notif.CLIENT_ID);
    if (!devsFilter) continue;
    const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dac' });

    const devRows: NotifDacOn[] = []

    for(const { DEV_ID, UNIT_ID } of devsList) {
      const { groupName, unitName, onlineHist } = notif.COND_OP === 'D>' ? await notifAfterTime(notif.COND_VAL + ":00", DEV_ID, rusthistDebug) : await notifBeforeTime(notif.COND_VAL + ":00", DEV_ID, rusthistDebug);
      if (onlineHist.length === 0) continue;
      const onDuration = sumTimes(onlineHist);
      devRows.push({
        dacId: DEV_ID,
        onDuration,
        unitId: UNIT_ID,
        groupName,
        unitName,
        onlineHist
      })
    }
    
    if (devRows.length === 0) continue;
    const user = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: notif.CREATED_BY });
    const prefs = getLanguage(user[0])
    const [protoTypeHead, bp_row, bp_foot] = templateFiles.notifEmailCompOutOfTime().split('<!-- SPLIT -->');
    const pluralTreatment = `${devRows.length > 1 ? t('asCondensadorasNasRespectivasUnidadesListadasAbaixoEstavamLigadas', prefs) : t('aCondensadoraNaRespectivaUnidadeListadaAbaixoEstavaLigada', prefs)}`
    const notifMessage = `${t('verificamosQue', prefs)} ${pluralTreatment} ${notif.COND_OP === 'D>' ? t('depois', prefs) : t('antes', prefs)} ${prefs === 'pt'? 'das' : '' } <strong>${notif.COND_VAL}h</strong> ${t('notificacao.doDia', prefs)} ${returnActualDate(true, prefs).split(t('as',prefs))[0]}`

    const { firstOnTime, lastOnTime } = timeOfChecking(devRows);

    const htmlRows = devRows.map(({ dacId, groupName, unitId, onDuration, unitName }) => (
      bp_row
        .replace(/\$UNIT_LINK\$/g, `https://dap.dielenergia.com/analise/unidades/${unitId}`)
        .replace(/\$UNIT_NAME\$/g, unitName)
        .replace(/\$GROUP_NAME\$/g, groupName)
        .replace(/\$DAC_LINK\$/g, `https://dap.dielenergia.com/analise/dispositivo/${dacId}/historico`)
        .replace(/\$ON_TIME\$/g, onDuration.substring(0, 5) + 'h')
    ))
    const bp_head = protoTypeHead
      .replace(/\$DATE_TIME\$/, `${returnActualDate(true, prefs).split(t('as', prefs))[0]} ${t('de', prefs)} ${firstOnTime.substring(0, 5) }h ${t('as', prefs)} ${lastOnTime.substring(0, 5)}h`)
      .replace(/\$TITLE_MESSAGE\$/, `${devRows.length > 1 ? t('condensadorasLigadasMaiuscula', prefs) : t('condensadoraLigadasMaiuscula', prefs)} ${notif.COND_OP === 'D>' ? t('depoisMaiusculo', prefs) : t('ANTES', prefs)} ${ prefs === 'pt'? 'DAS' : '' } ${notif.COND_VAL}H`)
      .replace(/\$NOTIF_MESSAGE\$/, notifMessage)
      .replace(/\#OLA\#/g, t('ola', prefs))
      .replace(/\#NOTIFICACOES\#/g, t('notificacoes', prefs))
      .replace(/\#UNIDADES\#/g, t('unidades', prefs))
      .replace(/\#COMPRESSOR_DA_MAQUINA\#/g, t('compressorDaMaquina', prefs))
      .replace(/\#TEMPO_LIGADO\#/g, t('tempoLigado', prefs))

    const foot = bp_foot
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', prefs))
      .replace(/\#EQUIPE\#/g, t('equipe', prefs))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', prefs))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', prefs))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', prefs))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', prefs))
    
    const emailBody =
      bp_head +
      htmlRows.join('\n') +
      foot;

    const notifId = notif.NOTIF_ID;
    const devId = `NOTIF:${notif.NOTIF_ID}`;
    const clientId = notif.CLIENT_ID;
    const details = {
      html: emailBody,
      text: "", // TODO: criar uma mensagem para enviar a notificação por Telegram
      subject: `Plataforma Celsius 360 - ${ t('notificacaoDe', prefs)} ${devRows.length > 1 ? t('condensadorasLigadas', prefs) : t('condensadoraLigada', prefs)} ${notif.COND_OP === 'D>' ? t('aposAs', prefs) : t('antesDas', prefs)} ${notif.COND_VAL}h`,
    };
    
    sendNotification(notifId, devId, clientId, details, null);
  }
}

function timeFormater(hour: number) {
  const numDays = Math.floor(hour / 24);
  const hh = Math.floor(Math.abs(hour)) - 24 * numDays;
  const min = Math.floor((Math.abs(hour) * 60) % 60);
  const ss = Math.floor((Math.abs(hour) * 60 * 60) % 60);

  return `${String(hh).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

async function getLastDayDacHist(devId: string, rusthistDebug: { motivo: string }) {
  const formattedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const dacInf =  await sqldb.DACS_DEVICES.getExtraInfo({ DAC_ID: devId});
  const hwCfg = dacInf && dacData.dacHwCfg(dacInf.DAC_ID, dacInf);
  const data = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDacDay', { motivo: rusthistDebug.motivo, dac: { devId, hwCfg }, day: formattedYesterday, hType: 'L1-Charts&Stats', dacExtInf: dacInf });
  const compressedData = parseCompressedChartData(data.Lcmp);
  const formatedData = formatArrHistory(compressedData, 0);

  return formatedData.map((data) => ( { x: data.x, L: data.L, y: data.y, groupName: dacInf.GROUP_NAME ? dacInf.GROUP_NAME : '-', UNIT_NAME: dacInf.UNIT_NAME } ))
}

function getTimeDiff(startTime: string, endTime: string) {
  const time1 = new Date(`03/03/2023 ${startTime}`)
  const time2 = new Date(`03/03/2023 ${endTime}`)
  
  let msec = time2.getTime() - time1.getTime(); // ordem importa
  
  let hh = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  let mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;
  let ss = Math.floor(msec / 1000);
  msec -= ss * 1000;

  const timeDiff = (hh < 10 ? "0" + hh : hh) + ":"+ (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);
  return timeDiff;
}

function checkTime(time: string, cond_val: string) {
  const time1 = new Date(`03/03/2023 ${time}`)
  const time2 = new Date(`03/03/2023 ${cond_val}`)
  let msec = time2.getTime() - time1.getTime();
  
  return msec >= 0 ? true : false;
}

async function notifAfterTime (COND_VAL: string, devId: string, rusthistDebug: { motivo: string }) {
  const dacHistDay = await getLastDayDacHist(devId, rusthistDebug);
  let firstOnTime = '';
  let lastOnTime = '';
  const onlineHist = [];

  const filterBeforeCondVal = dacHistDay.filter((dev) => checkTime(timeFormater(dev.x), COND_VAL))
  const lastCommand = filterBeforeCondVal[filterBeforeCondVal.length -1]

  if (!filterBeforeCondVal.length && dacHistDay.length) {
    logger.error({ devId, COND_VAL, firstPoint: dacHistDay?.[0]?.x, message: 'Sem pontos no histórico antes de COND_VAL' });
  } 

  for (const dev of dacHistDay) {
    // se o último comando for 1, significa que a máquina ainda está ligada
    if (lastCommand.y === 1 && onlineHist.length < 1) {
      firstOnTime = COND_VAL;
    }
  
    // procura comando ligar depois do tempo COND_VAL
    if (dev.y === 1 && firstOnTime === '') {
      if (!checkTime(timeFormater(dev.x), COND_VAL)) firstOnTime = timeFormater(dev.x);
    }

    // verifica quando a máquina desligou depois de ligada
    if (dev.y === 0  && firstOnTime.length > 0 && lastOnTime === '') {
      if (!checkTime(timeFormater(dev.x), COND_VAL)) {
        lastOnTime = timeFormater(dev.x);
      }
    }

    // se ambos estiverem preenchidos, adiciona a lista de horário em que ligou
    if (firstOnTime.length > 0 && lastOnTime.length > 0) {
      onlineHist.push({
        firstOnTime,
        lastOnTime
      })
      firstOnTime = '';
      lastOnTime = '';
    }
  }

  // se lastOntime estiver vazio e firstOnTime preenchido, a máquila ligou e não desligou no dia
  if (lastOnTime === '' && firstOnTime.length > 0) onlineHist.push({ firstOnTime, lastOnTime: '23:59:59' })

  return { onlineHist, groupName: dacHistDay[0]?.groupName || '-', unitName: dacHistDay[0]?.UNIT_NAME || '-' };
}

async function notifBeforeTime(COND_VAL: string, devId: string, rusthistDebug: { motivo: string }) {
  let firstOnTime = '';
  let lastOnTime = '';
  const onlineHist = [];

  const dacHistDay = await getLastDayDacHist(devId, rusthistDebug);

  for (const dev of dacHistDay) {
    // buscar por comando ligado antes do valor setado
    if (dev.y === 1 && firstOnTime === '') {
      if (checkTime(timeFormater(dev.x), COND_VAL)) firstOnTime = timeFormater(dev.x);
    }

    // verifica se a máquina desligou depois de ligado
    if (dev.y === 0  && firstOnTime.length > 0) {
      if (checkTime(timeFormater(dev.x), COND_VAL)) {
        lastOnTime = timeFormater(dev.x)
      }
    }

    if (firstOnTime.length > 0 && lastOnTime.length > 0) {
      onlineHist.push({
        firstOnTime,
        lastOnTime
      })
      firstOnTime = '';
      lastOnTime = '';
    }
  }
  
  // máquina não desligou
  if (firstOnTime.length > 0 && lastOnTime === '') {
    lastOnTime = COND_VAL;
    onlineHist.push({
      firstOnTime,
      lastOnTime
    })
  }
  
  return { onlineHist, groupName: dacHistDay[0]?.groupName || '-', unitName: dacHistDay[0]?.UNIT_NAME || '-'};
}

interface OnTime {
  firstOnTime: string,
  lastOnTime: string
}

function sumTimes(onTimes: OnTime[]) {
  const results = onTimes.map((time) => getTimeDiff(time.firstOnTime, time.lastOnTime))
  
  let time = 0;

  for (const result of results) {
    const time1 = new Date(`03/03/2023 00:00:00`)
    const time2 = new Date(`03/03/2023 ${result}`)
  
    let msec = time2.getTime() - time1.getTime();
    time += msec;
  }

  let hh = Math.floor(time / 1000 / 60 / 60);
  time -= hh * 1000 * 60 * 60;
  let mm = Math.floor(time / 1000 / 60);
  time -= mm * 1000 * 60;
  let ss = Math.floor(time / 1000);
  time -= ss * 1000;

  return (hh < 10 ? "0" + hh : hh) + ":"+ (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss);
}

const timeOfChecking = (rows: NotifDacOn[]) => {
  const timesObject = []
  for (const dev of rows) {
    let firstOnTime = '23:59:59';
    let lastOnTime = '00:00:00';
    for(const time of dev.onlineHist) {

      if (checkTime(time.firstOnTime, firstOnTime)) {
        firstOnTime = time.firstOnTime;
      }

      if (checkTime(lastOnTime, time.lastOnTime)) {
        lastOnTime = time.lastOnTime;
      }

    }
    timesObject.push({
      firstOnTime,
      lastOnTime
    })
  }

  let firstOnTime = '23:59:59';
  let lastOnTime = '00:00:00';
  for (const time of timesObject) {
    if (checkTime(time.firstOnTime, firstOnTime)) {
      firstOnTime = time.firstOnTime;
    }

    if (checkTime(lastOnTime, time.lastOnTime)) {
      lastOnTime = time.lastOnTime;
    }
  }

  return { firstOnTime, lastOnTime }
}

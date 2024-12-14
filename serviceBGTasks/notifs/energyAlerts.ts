import sqldb from '../../srcCommon/db'
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import { logger } from '../../srcCommon/helpers/logger';
import rusthistApi from '../../srcCommon/dielServices/rusthistApi';
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { t, getLanguage } from '../../srcCommon/helpers/i18nextradution';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as drisCfgLoader from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';
import { EnergyAlertCondPars, EnergyCards, loadEnergyNotifs } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';
import { apiMainService } from '../../serviceApiAsync/extServices/mainServiceApi';

const weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface AlertDetectionECPH {
  notifId: number
  unitName: string
  unitId: number
  clientId: number
  energyMeter: { ENERGY_DEVICE_ID: string, ESTABLISHMENT_NAME: string }
  condOper: string
  limit: number
  consumption: number
  hour: string
};

async function sendECPHInstantNotif(params: AlertDetectionECPH) {
  const {
    notifId, unitName, unitId, clientId, energyMeter, condOper, limit, consumption, hour,
  } = params;
  if (!condOper) return;
  const condOpts = {
    '<': 'menorQue',
    '>': 'maiorQue',
  } as { [opt: string]: string }
  const notifDetails = {
    html: `#VERIFICAMOS_QUE# #CONSUMO_DE_ENERGIA_DA_UNIDADE# <a style="text-decoration: underline; font-weight: bold; color: inherit;" href="https://dap.dielenergia.com/analise/unidades/energyEfficiency/${unitId}">$UNIT_NAME$,</a> #MEDIDO_PELO# <b>$ENERGY_DEVICE_ID$,</b> #FOI_S# <b>$COND$ $LIMIT$kWh #POR_PELO_MENOS_UMA_HORA# #A_PARTIR_DAS# $HOUR$h.</b>`,
    text: `#OLA#, <b>$USER_NAME$</b>\n\n#VERIFICAMOS_QUE# #CONSUMO_DE_ENERGIA_DA_UNIDADE# <a href="https://dap.dielenergia.com/analise/unidades/energyEfficiency/${unitId}">$UNIT_NAME$</a>, #MEDIDO_PELO# <b>$ENERGY_DEVICE_ID$</b>, #FOI_S# <b>$COND$ $LIMIT$kWh #POR_PELO_MENOS_UMA_HORA# #A_PARTIR_DAS# $HOUR$h.</b>\n\n#ATENCIOSAMENTE#,\n#EQUIPE# <b>Diel Energia</b>`
  };
  const emailBody = templateFiles.genericNotificationEmail();
  const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notifId });
  const idioma = getLanguage(prefsUser[0]);
  notifDetails.text = notifDetails.text
    .replace(/\#OLA\#/g, t('ola', idioma))
    .replace(/\#VERIFICAMOS_QUE\#/g, t('verificamosQue', idioma))
    .replace(/\#CONSUMO_DE_ENERGIA_DA_UNIDADE\#/g, t('consumoDeEnergiaDaUnidade', idioma))
    .replace(/\#MEDIDO_PELO\#/g, t('medidoPelo', idioma))
    .replace(/\#FOI_S\#/g, t('foiSingular', idioma))
    .replace(/\$COND\$/g, t(condOpts[condOper], idioma))
    .replace(/\#POR_PELO_MENOS_UMA_HORA\#/g,t('porPeloMenosUmaHora', idioma))
    .replace(/\#A_PARTIR_DAS\#/g,t('aPartirDas', idioma))
    .replace(/\$ENERGY_DEVICE_ID\$/g, energyMeter.ESTABLISHMENT_NAME || energyMeter.ENERGY_DEVICE_ID || '-')
    .replace(/\$UNIT_NAME\$/g, unitName || '-')
    .replace(/\$LIMIT\$/g, limit.toString().replace('.', ','))
    .replace(/\$HOUR\$/g, hour)
    .replace(/\#ATENCIOSAMENTE\#/g,t('atenciosamente', idioma))
    .replace(/\#EQUIPE\#/g,t('equipe', idioma))
  notifDetails.html = emailBody
    .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
    .replace(/\$DATEINFO\$/g, returnActualDate(false))
    .replace(/\$COLOR_HEX\$/g, '#FFB800')
    .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')
    .replace(/\$NOTIFICATION\$/g, t('consumoDeEnergiaPorHora', idioma))
    .replace(/\$EMAIL_MESSAGE\$/g, notifDetails.html)
    .replace(/\#VERIFICAMOS_QUE\#/g, t('verificamosQue', idioma))
    .replace(/\#CONSUMO_DE_ENERGIA_DA_UNIDADE\#/g, t('consumoDeEnergiaDaUnidade', idioma))
    .replace(/\#MEDIDO_PELO\#/g, t('medidoPelo', idioma))
    .replace(/\#FOI_S\#/g, t('foiSingular', idioma))
    .replace(/\$ENERGY_DEVICE_ID\$/g, energyMeter.ESTABLISHMENT_NAME || energyMeter.ENERGY_DEVICE_ID || '-')
    .replace(/\$UNIT_NAME\$/g, unitName || '-')
    .replace(/\$COND\$/g, t(condOpts[condOper], idioma))
    .replace(/\#POR_PELO_MENOS_UMA_HORA\#/g,t('porPeloMenosUmaHora', idioma))
    .replace(/\#A_PARTIR_DAS\#/g,t('aPartirDas', idioma))
    .replace(/\$LIMIT\$/g, limit.toString().replace('.', ','))
    .replace(/\$HOUR\$/g, hour)
    .replace(/\#OLA\#/g, t('ola', idioma))
    .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
    .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
    .replace(/\#EQUIPE\#/g, t('equipe', idioma))
    .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
    .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
    .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))

  sendNotification(notifId, energyMeter.ENERGY_DEVICE_ID, clientId, notifDetails);
  const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: notifId });
  const userIds = dests.map(dest => dest.USER_ID);
  const dateDetection = new Date(Date.now()).toISOString()
  
  try {
    await apiMainService["POST /mainservice/notifications/create-notification-energy"]({
      detections : [{
        unitId: unitId,
        consumption: consumption,
        dateDetection: dateDetection,
      }],
      destinataryIds: userIds,
      setpoint: limit,
      isGreater: condOper === '>',
      isInstantaneous: true,
    });
  } catch (err) {
    logger.error(err);
  }
}

const checkEnergyConsumptionPerHour = async () => {
  // Iniciando rotina para verificação de notificação de consumo de energia por hora.

  const energyDevices = await sqldb.ENERGY_DEVICES_INFO.getList({
    manufacturers: ['Diel Energia'],
  }, {});
  const { energyCardsByNotif, notifsByDev } = await loadEnergyNotifs();
  const { drisCfg } = await drisCfgLoader.loadDrisCfg();

  const now = Date.now();
  const nowTS = new Date(now - 3 * 60 * 60 * 1000);
  const weekDay = weekDays[nowTS.getUTCDay()] as 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';
  const limit24h = now - 24 * 60 * 60 * 1000;

  for (const dev of energyDevices) {
    try {
      const devNotif = notifsByDev[dev.ENERGY_DEVICE_ID];
      if (!devNotif) continue;
      for (const row of devNotif) {
        const notifCondPars = energyCardsByNotif.get(row.NOTIF_ID);
        if (!notifCondPars?.energyCards) continue;
        for (const card of notifCondPars.energyCards) {
          if (!Number(card.limiarInput)) continue;
          const limiar = Number(card.limiarInput);
          if (card.detected && card.detected[dev.ENERGY_DEVICE_ID]) continue;

          if (!card.selectedDays[weekDay]) continue;

          const currentHour = nowTS.toISOString().substring(11, 16);
          const schedule = card.schedulesList.find((x) => currentHour >= x.start && currentHour < x.end);
          if (!schedule) continue;

          const devLastMessage = schedule.lastMessages && schedule.lastMessages[dev.ENERGY_DEVICE_ID];
          if (devLastMessage && devLastMessage > limit24h) continue;

          const startDate = new Date(nowTS.toISOString().substring(0, 10) + `T${schedule.start}Z`);
          const hoursDiff = Math.floor((nowTS.getTime() - startDate.getTime()) / 3600000);
          startDate.setUTCHours(startDate.getUTCHours() + hoursDiff);

          const driCfg = drisCfg[dev.ENERGY_DEVICE_ID];
          const formulas = drisCfgLoader.getDrisCfgFormulas(driCfg);
          const result = await rusthistApi['/energy-query']({
            energy_device_id: dev.ENERGY_DEVICE_ID,
            manufacturer: dev.MANUFACTURER,
            serial: dev.SERIAL ?? '',
            model: dev.MODEL,
            start_time: startDate.toISOString().substring(0, 19),
            end_time: nowTS.toISOString().substring(0, 19),
            formulas,
            params: ['en_at_tri', 'erro'],
          }, 'ENERGY-ECPH');
          const filteredData = result.data.filter((tel) => tel.en_at_tri && !tel.erro);
          if (filteredData.length === 0) continue;

          const cons = (filteredData[filteredData.length - 1].en_at_tri - filteredData[0].en_at_tri);
          if (!cons) continue;

          // Condições de Detecção de Notificação
          if (
            (card.condOper === '>' && (cons > limiar))
            ||
            (card.condOper === '<' && (cons < limiar))
          ) {
              if (card.instant && !card.endOfDay) {
                // Notificação instantânea
                if (!schedule.lastMessages) schedule.lastMessages = {};
                schedule.lastMessages[dev.ENERGY_DEVICE_ID] = now;
                sendECPHInstantNotif({
                  notifId: row.NOTIF_ID,
                  unitName: dev.UNIT_NAME,
                  unitId: dev.UNIT_ID,
                  clientId: dev.CLIENT_ID,
                  energyMeter: { ESTABLISHMENT_NAME: dev.ESTABLISHMENT_NAME, ENERGY_DEVICE_ID: dev.ENERGY_DEVICE_ID },
                  condOper: card.condOper,
                  limit: limiar,
                  consumption: cons,
                  hour: nowTS.toISOString().substring(11, 16),
                });
              }
              if (card.endOfDay && !card.instant) {
                // Prepara para notificação no final do dia
                if (!card.detected) card.detected = {};
                card.detected[dev.ENERGY_DEVICE_ID] = {
                  name: dev.ESTABLISHMENT_NAME,
                  time: nowTS.toISOString(),
                  cons: cons.toFixed(2),
                  unitName: dev.UNIT_NAME,
                  unitId: dev.UNIT_ID,
                }
              }

              await sqldb.NOTIFSCFG.w_updateNotifCondPars({
                NOTIF_ID: row.NOTIF_ID,
                COND_PARS: JSON.stringify(notifCondPars)
              }, '[ENERGY-ECPH]');
          }
        }
      }
    } catch (err) {
      logger.error({
        message: `ENERGY-ECPH NOTIF ERROR: msg: ${err}`,
        stack: (err as Error).stack,
        devId: dev.ENERGY_DEVICE_ID,
      })
    }
  }
}

export function startService() {
  recurrentTasks.runLoop({
    taskName: "ENERGY-ECPH",
    initialDelay_ms: 8 * 60 * 1000,
    iterationPause_ms: 15 * 60 * 1000,
  }, checkEnergyConsumptionPerHour);
}

interface UnitDetectedDevs {
  [unitId: number]: {
    name: string
    detectedDevs: {
      name: string
      cons: string
      time: string
    }[]
  }
}

async function generate_EOD_ECPH_Notif(notifId: number, card: { condOper: string, limiarInput: string }, unitsDevs: UnitDetectedDevs) {
  const condOpts = {
    '<': 'menorQue',
    '>': 'maiorQue',
  } as { [opt: string]: string }

  const emailFullBody = templateFiles.notifEmailEnergyConsumptionPerHourEOD();
  const [protoTypeHead, bp_row, bp_foot] = emailFullBody.split('<!-- SPLIT -->');
  const rows = Object.entries(unitsDevs).map(([unitId, info]) => {
    const showMeters = info.detectedDevs.length > 1;

    const [
      r_unitInfo, r_meterInfo, r_unitCons, r_meterCons, r_unitStartHour, r_meterStartHour,
    ] = bp_row.split('<!-- METER_SPLIT -->');

    let text = `⬜<a href="https://dap.dielenergia.com/analise/unidades/energyEfficiency/${unitId}">${info.name.length > 10 ? info.name.substring(0, 6) + '...' : info.name}</a>`

    let meterInfo = '';
    let meterCons = '';
    let meterStartHour = '';

    if (showMeters) {
        (info.detectedDevs as UnitDetectedDevs[number]['detectedDevs']).forEach((dev, index) => {
          meterInfo += r_meterInfo
            .replace(/\$BORDER_HEIGHT\$/g, index !== (info.detectedDevs.length - 1) ? '100%' : '45%')
            .replace(/\$METER\$/g, dev.name)
          meterCons += r_meterCons
            .replace(/\$METER_CONS\$/g, `<div style="margin: auto 0;"><b>${dev.cons.replace('.', ',')}</b>&nbsp;kWh</div>`)
          meterStartHour += r_meterStartHour
            .replace(/\$METER_HORA_INICIAL\$/g, `<div style="margin: auto 0;"><b>${dev.time.substring(11, 16)}h</b></div>`)

          text += `\n▫️${dev.name.length > 10 ? dev.name.substring(0, 6) + '...' : dev.name}  🔌<b>${dev.cons.replace('.', ',')}</b>kWh  🕒${dev.time.substring(11, 16)}h`
      })
    } else {
      text += `  🔌<b>${info.detectedDevs[0].cons.replace('.', ',')}</b>kWh  🕒${info.detectedDevs[0].time.substring(11, 16)}h`
    }

    const row = r_unitInfo + meterInfo + r_unitCons + meterCons + r_unitStartHour + meterStartHour;

    return {
      html: row
        .replace(/\$UNIT_LINK\$/g, `https://dap.dielenergia.com/analise/unidades/energyEfficiency/${unitId}`)
        .replace(/\$UNIT_NAME\$/g, info.name)
        .replace(/\$UNIT_CONS\$/g, showMeters ? '' : `<div style"margin: auto 0;"><b>${info.detectedDevs[0].cons.replace('.', ',')}</b>&nbsp;kWh</div>`)
        .replace(/\$UNIT_HORA_INICIAL\$/g, showMeters ? '' : `<div style="margin: auto 0;"><b>${info.detectedDevs[0].time.substring(11, 16)}h</b></div>`),
      text,
    }
  })

  const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notifId });
  const idioma = getLanguage(prefsUser[0]);

  const emailMessage = `#VERIFICAMOS_QUE#<b>, #NAS_ULTIMAS_24H#,</b> #CONSUMO_DE_ENERGIA_DAS_UNIDADES_LISTADAS_ABAIXO_FOI# <b>$COND$ $LIMIT$kWh #POR_PELO_MENOS_UMA_HORA#.</b>`
    .replace(/\#VERIFICAMOS_QUE\#/g, t('verificamosQue', idioma))
    .replace(/\#NAS_ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
    .replace(/\#CONSUMO_DE_ENERGIA_DAS_UNIDADES_LISTADAS_ABAIXO_FOI\#/g, t('consumoDeEnergiaDasUnidadesListadasAbaixoFoi', idioma))
    .replace(/\$COND\$/g, t(condOpts[card.condOper], idioma))
    .replace(/\$LIMIT\$/g, card.limiarInput.replace('.', ','))
    .replace(/\#POR_PELO_MENOS_UMA_HORA\#/g, t('porPeloMenosUmaHora', idioma))

  const emailBody =
    protoTypeHead
      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma).split(t('as', idioma))[0])
      .replace(/\#CONSUMO_DE_ENERGIA_POR_HORA\#/g, t('consumoDeEnergiaPorHora', idioma))
      .replace(/\#NOTIF_MENSAGEM\#/g, emailMessage)
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#UNIDADE\#/g, t('unidade', idioma))
      .replace(/\#CONSUMO_POR_HORA\#/g, t('consumoPorHora', idioma))
      .replace(/\#HORA_INICIAL\#/g, t('horaInicial', idioma))
    +
    rows.map((row) => row.html).join('\n')
    +
    bp_foot
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma));

  const text = `#OLA# <b>$USER_NAME$</b>\n\n#VERIFICAMOS_QUE#, <b>#NAS_ULTIMAS_24H#,</b> #CONSUMO_DE_ENERGIA_DAS_UNIDADES_LISTADAS_ABAIXO_FOI# <b>$COND$ $LIMIT$kWh #POR_PELO_MENOS_UMA_HORA#.</b>\n\n${rows.map((row) => row.text).join('\n\n')}\n\n#ATENCIOSAMENTE#,\n#EQUIPE# <b>Diel Energia</b>`
    .replace(/\#OLA\#/g, t('ola', idioma))
    .replace(/\#VERIFICAMOS_QUE\#/g, t('verificamosQue', idioma))
    .replace(/\#NAS_ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
    .replace(/\#CONSUMO_DE_ENERGIA_DAS_UNIDADES_LISTADAS_ABAIXO_FOI\#/g, t('consumoDeEnergiaDasUnidadesListadasAbaixoFoi', idioma))
    .replace(/\$COND\$/g, t(condOpts[card.condOper], idioma))
    .replace(/\$LIMIT\$/g, card.limiarInput.replace('.', ','))
    .replace(/\#POR_PELO_MENOS_UMA_HORA\#/g, t('porPeloMenosUmaHora', idioma))
    .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
    .replace(/\#EQUIPE\#/g, t('equipe', idioma))

  return { html: emailBody, text };
}

export const compile_EndOfDay_ECPH_Notif = async () => {
  // Função que roda no fim do dia para enviar notificações sobre detecções de alertas feitas pela "checkEnergyConsumptionPerHour"
  // Pega no banco todas as notificações configuradas (para temperatura fora dos limites)
  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['ENERGY'], condOps: ['ECPH'] });

  for (const notif of notifsList) {
    try {
      const condPars = jsonTryParse<EnergyAlertCondPars>(notif.COND_PARS);
      const energyCards = condPars?.energyCards;
      if (!energyCards) continue;
      for (const card of energyCards) {
        const detectedDevs = card.detected;
        if (!detectedDevs) continue;

        const units = {} as UnitDetectedDevs
        for (const [devId, info] of Object.entries(detectedDevs)) {
          if (!units[info.unitId]) units[info.unitId] = { name: info.unitName, detectedDevs: [] };
          units[info.unitId].detectedDevs.push({
            name: info.name || devId,
            cons: info.cons,
            time: info.time,
          });
        }
        const notifDetails = await generate_EOD_ECPH_Notif(notif.NOTIF_ID, card, units);
        sendNotification(notif.NOTIF_ID, `NOTIF:${notif.NOTIF_ID}`, notif.CLIENT_ID, notifDetails);
        sendCompileFeedEnergy(notif.NOTIF_ID, units, card);            

        //Após o envio reseta os dispositivos detectados
        delete card.detected;
        await sqldb.NOTIFSCFG.w_updateNotifCondPars({
          NOTIF_ID: notif.NOTIF_ID,
          COND_PARS: JSON.stringify({ energyCards })
        }, '[ENERGY-ECPH-EOD]');
      }
    } catch (err) {
      logger.error(`ENERGY-ECPH-EOD NOTIF ERROR: msg: ${err}`);
    }
  }
}

const sendCompileFeedEnergy = async (notifId: number, units: UnitDetectedDevs, card: EnergyCards) => { 
  const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: notifId });   
  const userIds = dests.map(dest => dest.USER_ID);
  const  detections = [] as {
    unitId: number,
    dateDetection: string,
    consumption: number,
  }[]
  Object.entries(units).forEach(async ([unitId, info]) => {
    const showMeters = info.detectedDevs.length > 1;
    if (showMeters) {  
      (info.detectedDevs as UnitDetectedDevs[number]['detectedDevs']).forEach((dev, index) => {
      const date = new Date(dev.time)
      date.setHours(date.getHours() + 3)
      const dateDetection = date.toISOString()       
        detections.push({
          unitId: parseInt(unitId),
          dateDetection: dateDetection,
          consumption: parseFloat(dev.cons),
        });
      });
    } else {
      const date = new Date(info.detectedDevs[0].time);
      date.setHours(date.getHours() + 3)
      const dateDetection = date.toISOString()  
      detections.push({
        unitId: parseInt(unitId),
        dateDetection: dateDetection,
        consumption: parseFloat(info.detectedDevs[0].cons),
      });
    }           
  });
  if (detections.length > 0) {
    try {
      await apiMainService["POST /mainservice/notifications/create-notification-energy"]({
        detections,
        destinataryIds: userIds,
        setpoint: parseFloat(card.limiarInput),
        isGreater: card.condOper === '>',
        isInstantaneous: false,
      });
    } catch (err) {
      logger.error(err);
    }
  } 
}

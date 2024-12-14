import sqldb from '../../srcCommon/db'
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import { AlertDetection, CompiledStats_DAC } from '../../srcCommon/types';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import configfile from '../../configfile';
import { t, getLanguage } from '../../srcCommon/helpers/i18nextradution';
import { loadDayStatsNotifsForDev } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';

export async function onDacDayStats (dacId: string, dacStats: CompiledStats_DAC) {
  const dacDbData = await sqldb.DACS_DEVICES.getDacDetails({ DAC_ID: dacId });
  const devAlerts = await loadDayStatsNotifsForDev({
    devId: dacId,
    clientId: dacDbData.CLIENT_ID,
    unitId: dacDbData.UNIT_ID,
    machineId: dacDbData.MACHINE_ID,
  });
  if (!devAlerts) return;

  const detections: AlertDetection[] = [];

  let notificationText = 'voceTemUmaNovaNotificacao';

  if (devAlerts['NUM_DEPS >']) {
    for (const row of devAlerts['NUM_DEPS >']) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} NUM_DEPS ${dacStats.numDeparts} > ${row.value} = ${dacStats.numDeparts > row.value}`)
      }
      if (row.value != null && dacStats.numDeparts > row.value) {
        const notifDetails = {
          html: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #TEVE_NUMERO_PARTIDA# <span style="color:#ed193f">${dacStats.numDeparts}</span>.`,
          text: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #TEVE_NUMERO_PARTIDA# ${dacStats.numDeparts}.`,
        }
        detections.push({ notifId: row.NOTIF_ID, devId: dacId, details: notifDetails })
      }
    }
    notificationText = 'numeroExcessivoPartidasCondensadora';
  }
  if (devAlerts['NUM_DEPS <=']) {
    for (const row of devAlerts['NUM_DEPS <=']) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} NUM_DEPS ${dacStats.numDeparts} <= ${row.value} = ${dacStats.numDeparts <= row.value}`)
      }
      if (row.value != null && dacStats.numDeparts > 0 && dacStats.numDeparts <= row.value) {
        const notifDetails = {
          html: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #TEVE_NUMERO_PARTIDA# <span style="color:#ed193f">${dacStats.numDeparts}</span>.`,
          text: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #TEVE_NUMERO_PARTIDA# ${dacStats.numDeparts}.`,
        }
        detections.push({ notifId: row.NOTIF_ID, devId: dacId, details: notifDetails })
      }
    }
    notificationText = 'numeroMenorPartidasCondensadora';
  }
  if (devAlerts['COMP_DUR >']) {
    for (const row of devAlerts['COMP_DUR >']) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_DUR ${dacStats.hoursOn} > ${row.value} = ${dacStats.hoursOn > row.value}`)
      }
      if (row.value != null && dacStats.hoursOn > row.value) {
        const notifDetails = {
          html: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #FICOU_LIGADA_POR# <span style="color:#ed193f">${Math.round(dacStats.hoursOn * 100) / 100}</span> #HORAS#.`,
          text: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #FICOU_LIGADA_POR# ${Math.round(dacStats.hoursOn * 100) / 100} #HORAS#.`,
        }
        detections.push({ notifId: row.NOTIF_ID, devId: dacId, details: notifDetails })
      }
    }
    notificationText = 'condensadoraLigadaNumeroMenorHoras';
  }
  if (devAlerts['COMP_DUR <']) {
    for (const row of devAlerts['COMP_DUR <']) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_DUR ${dacStats.hoursOn} < ${row.value} = ${dacStats.hoursOn < row.value}`)
      }
      if (row.value != null && dacStats.hoursOn !== 0 && dacStats.hoursOn < row.value) {
        const notifDetails = {
          html: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #FICOU_LIGADA_POR# <span style="color:#ed193f">${Math.round(dacStats.hoursOn * 100) / 100}</span> #HORAS#.`,
          text: `#VERIFICAMOS_SUA_CONDESADORA_MAQUINA# $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #FICOU_LIGADA_POR# ${Math.round(dacStats.hoursOn * 100) / 100} #HORAS#.`,
        }
        detections.push({ notifId: row.NOTIF_ID, devId: dacId, details: notifDetails })
      }
    }
    notificationText = 'condensadoraLigadaNumeroExcessivoHoras';
  }

  if (detections.length) {
    const emailBody = templateFiles.genericNotificationEmail()
      .replace(/\$COLOR_HEX\$/g, '#FFB800')
      .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')

    for (const item of detections) {
      const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: item.notifId });
      const idioma = getLanguage(prefsUser[0]);
      item.details.text = item.details.text
        .replace(/\$MACHINE_NAME\$/g, dacDbData.MACHINE_NAME || '-')
        .replace(/\$UNIT_NAME\$/g, dacDbData.UNIT_NAME || '-')
        .replace(/\#VERIFICAMOS_SUA_CONDESADORA_MAQUINA\#/g, t('verificamosSuaCondensadoraMaquina', idioma))
        .replace(/\#FICOU_LIGADA_POR\#/g, t('ficouLigadaPor', idioma))
        .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
        .replace(/\#HORAS\#/g, t('horas', idioma))
        .replace(/\#TEVE_NUMERO_PARTIDA\#/g, t('teveUmNumeroDePartidasIgualA', idioma))

      item.details.html = emailBody
        .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma))
        .replace(/\$NOTIFICATION\$/g, t(notificationText, idioma))
        .replace(/\$EMAIL_MESSAGE\$/g, item.details.html)
        .replace(/\$MACHINE_NAME\$/g, dacDbData.MACHINE_NAME || '-')
        .replace(/\$UNIT_NAME\$/g, dacDbData.UNIT_NAME || '-')
        .replace(/\$UNIT_ID\$/g, String(dacDbData.UNIT_ID || 0))
        .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
        .replace(/\#OLA\#/g, t('ola', idioma))
        .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
        .replace(/\#EQUIPE\#/g, t('equipe', idioma))
        .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
        .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
        .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
        .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
        .replace(/\#VERIFICAMOS_SUA_CONDESADORA_MAQUINA\#/g, t('verificamosSuaCondensadoraMaquina', idioma))
        .replace(/\#FICOU_LIGADA_POR\#/g, t('ficouLigadaPor', idioma))
        .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
        .replace(/\#HORAS\#/g, t('horas', idioma))
        .replace(/\#TEVE_NUMERO_PARTIDA\#/g, t('teveUmNumeroDePartidasIgualA', idioma))

      sendNotification(item.notifId, item.devId, dacDbData.CLIENT_ID, item.details, null);
    }
  }
}

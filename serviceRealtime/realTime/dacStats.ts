import * as lastMessages from '../ramCaches/lastMessages'
import { TelemetryDAC, AlertDetection } from '../../srcCommon/types'
import sqldb from '../../srcCommon/db'
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import configfile from '../../configfile'
import { t } from '../../srcCommon/helpers/i18nextradution';
import { getLanguage } from '../../srcCommon/helpers/i18nextradution'
import * as ramCaches from '../ramCaches';

// RAM-CACHE
const lastTelemetryTs: Map<string,Date> = new Map();

export function updateStatistics (dacId: string, payload: TelemetryDAC, shiftedServerTime: Date) {
  const lastTelemetryDate = lastTelemetryTs.get(dacId);
  lastTelemetryTs.set(dacId, shiftedServerTime);
  const resetDayCounters = (!lastTelemetryDate) || (shiftedServerTime.getUTCDate() !== lastTelemetryDate.getUTCDate());

  checkDayTimeAlerts(dacId, payload, shiftedServerTime, resetDayCounters)
}

function checkDayTimeAlerts (dacId: string, payload: TelemetryDAC, shiftedServerTime: Date, resetDayCounters: boolean) {
  const devAlerts = ramCaches.NOTIFSCFG.tryGetDevUNotifs(dacId);
  let notificationText = 'voceTemUmaNovaNotificacao'
  if (!devAlerts) return;
  const detections: AlertDetection[] = [];

  try {   
    // Quando detecta o alarme, verifica na tabela se já foi inserido no dia
    if (resetDayCounters) {
      // Verificar se tem alertas configurados e salvar em "devAlerts.beforeTime" e "devAlerts.afterTime"
      ramCaches.NOTIFSCFG.configureTimeAlerts(dacId, shiftedServerTime, devAlerts);
    }
    if (payload.Lcmp && devAlerts.beforeTime != null && shiftedServerTime < devAlerts.beforeTime) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME ${shiftedServerTime.toISOString()} < ${devAlerts.beforeTime.toISOString()} = ${shiftedServerTime < devAlerts.beforeTime}`)
      }
      const details = {
        html: `#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA#  <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #ESTAVA_LIGADA_AS# <b style="color:#ed193f">${shiftedServerTime.toISOString().substr(11, 5)}</b>.`,
        text: `#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA#  $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTAVA_LIGADA_AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
      };
      notificationText = `condensadoraLigadaAntesDas ${shiftedServerTime.toISOString().substr(11, 5)}h`
      detections.push({ notifId: devAlerts.beforeTime_notifId, devId: dacId, details })
      delete devAlerts.beforeTime
    }
    if (payload.Lcmp && devAlerts.afterTime != null && shiftedServerTime > devAlerts.afterTime) {
      if (configfile.debugAlerts) {
        logger.info(`ALERT CHECK ${dacId} COMP_TIME ${shiftedServerTime.toISOString()} > ${devAlerts.afterTime.toISOString()} = ${shiftedServerTime > devAlerts.afterTime}`)
      }
      const details = {
        html: `#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA# <a href="https://dash.dielenergia.com/analise/dispositivo/${dacId}/informacoes"><b>$MACHINE_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>,  #ESTAVA_LIGADA_AS# <b style="color:#ed193f">${shiftedServerTime.toISOString().substr(11, 5)}</b>.`,
        text: `#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA# $MACHINE_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTAVA_LIGADA_AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
      };
      notificationText = `condensadoraLigadaAposAs ${shiftedServerTime.toISOString().substr(11, 5)}h`
      detections.push({ notifId: devAlerts.afterTime_notifId, devId: dacId, details })
      delete devAlerts.afterTime
      for (const row of devAlerts['COMP_TIME >']) {
        const afterTime = new Date(shiftedServerTime.toISOString().substr(0, 11) + row.value + ':00Z')
        if (afterTime < shiftedServerTime) continue
        if ((!devAlerts.afterTime) || (afterTime < devAlerts.afterTime)) {
          devAlerts.afterTime = afterTime
          devAlerts.afterTime_notifId = row.NOTIF_ID
        }
      }
      if (devAlerts.afterTime) {
        if (configfile.debugAlerts) {
          logger.info(`ALERT CHECK ${dacId} COMP_TIME after ${devAlerts.afterTime.toISOString()}`)
        }
      } else {
        if (configfile.debugAlerts) {
          logger.info(`ALERT CHECK ${dacId} COMP_TIME after => ended`)
        }
      }
    }
  } catch (error) {
    logger.error({
      msg: `msg: ${(error && (error as Error).message) || 'ERROR 400'} - dacId: ${dacId} - shiftedServerTime: ${shiftedServerTime} - devAlerts.beforeTime ${devAlerts.beforeTime} - devAlerts.afterTime ${devAlerts.afterTime}`,
      stack: (error as Error).stack
    });
    throw Error((error && (error as Error).message) || 'ERROR 400').HttpStatus(400);
  }

  if (detections.length) {
    Promise.resolve().then(async () => {
      const dacDbData = await sqldb.DACS_DEVICES.getDacDetails({ DAC_ID: dacId })
      const emailBody = templateFiles.genericNotificationEmail()
        .replace(/\$COLOR_HEX\$/g, '#FFB800')
        .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')

      for (const item of detections) {
        const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: item.notifId });
        const idioma = getLanguage(prefsUser[0]);
        const textNotification = notificationText.split(' ')
        const translateText = t(textNotification[0], idioma)
        const textNotificationData = textNotification[1]? textNotification[1] : ''
        
        item.details.text = item.details.text
          .replace(/\$MACHINE_NAME\$/g, dacDbData.MACHINE_NAME || '-')
          .replace(/\$UNIT_NAME\$/g, dacDbData.UNIT_NAME || '-')
          .replace(/\$UNIT_ID\$/g, String(dacDbData.UNIT_ID || '-'))
          .replace(/\#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA\#/g, t('verificamosSuaCondensadoraMaquina', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#ESTAVA_LIGADA_AS\#/g, t('estavaLigadaAs', idioma))

        item.details.html = emailBody
          .replace(/\$NOTIFICATION\$/g, translateText + ' ' + textNotificationData)
          .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma))
          .replace(/\$EMAIL_MESSAGE\$/g, item.details.html)
          .replace(/\$MACHINE_NAME\$/g, dacDbData.MACHINE_NAME || '-')
          .replace(/\$UNIT_NAME\$/g, dacDbData.UNIT_NAME || '-')
          .replace(/\$UNIT_ID\$/g, String(dacDbData.UNIT_ID || '-'))
          .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
          .replace(/\#OLA\#/g, t('ola', idioma))
          .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
          .replace(/\#EQUIPE\#/g, t('equipe', idioma))
          .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
          .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
          .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
          .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
          .replace(/\#VERIFICAMOS_QUE_CONDENSADORA_MAQUINA\#/g, t('verificamosSuaCondensadoraMaquina', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#ESTAVA_LIGADA_AS\#/g, t('estavaLigadaAs', idioma))

        sendNotification(item.notifId, item.devId, dacDbData.CLIENT_ID, item.details, null);
      }
    }).catch(logger.error)
  }
}

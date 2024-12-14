import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import { apiLaarger } from '../../srcCommon/extServices/laagerApi';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
// import * as ramCaches from '../ramCaches';
import sqldb from '../../srcCommon/db'
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import configfile from '../../configfile';
import { t, getLanguage } from '../../srcCommon/helpers/i18nextradution';
import { loadWaterNotifs } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';

interface AlertDetectionLaager {
  notifId: number
  laager: { UNIT_NAME: string, UN_LAAGER: string, CLIENT_ID: number }
  details: { text: string, html: string }
}

export function startService() {
  recurrentTasks.runLoop({
    taskName: "LAAGER-ALERTS",
    initialDelay_ms: 8 * 60 * 1000,
    iterationPause_ms: 10 * 60 * 1000,
  }, checkLaagerAlerts);
}

async function checkLaagerAlerts() {
  const now = Date.now();
  const unitsWithLaagerIntgr = await sqldb.LAAGER.getListWithUnitInfo({});
  const date = new Date(now - 3 * 60 * 60 * 1000 - 20 * 60 * 1000).toISOString(); //Adjust time zone and gets past 20 minutes
  const limit24h = now - 24 * 60 * 60 * 1000;

  const alertsList = await apiLaarger['GET /alarmes/historico.json:data:pagina:limite'](date, 0, 100);

  const detections: AlertDetectionLaager[] = [];

  const {notifsByClient: waterNotifs} = await loadWaterNotifs(false);

  unitsWithLaagerIntgr.forEach(async (unit) => {
    const notif = waterNotifs[unit.UNIT_ID] || [];

    for (const row of notif) {
      if (row.lastNotifSent > limit24h) continue;
      const alert = alertsList.find((alert) => alert.customer_id === unit.LAAGER_CODE && alert.description === 'Leakage possible');

      if (alert) {
        if (configfile.debugAlerts) {
          logger.info(`ALERT CHECK UNIT ${unit.UNIT_ID} LAAGER METER ${alert.customer_id} WITH LEAKAGE POSSIBLE`)
        }
        const notifDetails = {
          html: `#VERIFICAMOS_MEDIDOR_AGUA# <b>$UN_LAAGER$</b>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/${unit.UNIT_ID}"><b>$UNIT_NAME$</b></a>, #DETECTOU_POSSIVEL_VAZAMENTO#, #AS# ${alert.triggered_at.split(' ')[1]}.`,
          text: `#VERIFICAMOS_MEDIDOR_AGUA# $UN_LAAGER$, #NA_UNIDADE# $UNIT_NAME$, #DETECTOU_POSSIVEL_VAZAMENTO#, #AS# ${alert.triggered_at.split(' ')[1]}.`,
        };
        detections.push({ notifId: row.NOTIF_ID,
          laager: { UNIT_NAME: unit.UNIT_NAME, UN_LAAGER: unit.LAAGER_CODE, CLIENT_ID: unit.CLIENT_ID },
          details: notifDetails,
        })
        row.lastNotifSent = now;
      }
    }
  })

  if (detections && detections.length > 0) {
    Promise.resolve().then(async () => {
      const emailBody = templateFiles.genericNotificationEmail()
        .replace(/\$COLOR_HEX\$/g, '#2D81FF')
        .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')

      for (const item of detections) {
        const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: item.notifId });
        const idioma = getLanguage(prefsUser[0]);
        item.details.text = item.details.text
          .replace(/\$UN_LAAGER\$/g, item.laager.UN_LAAGER || '-')
          .replace(/\$UNIT_NAME\$/g, item.laager.UNIT_NAME || '-')
          .replace(/\#AS\#/g, t('as', idioma))
          .replace(/\#DETECTOU_POSSIVEL_VAZAMENTO\#/g, t('detectouPossivelVazamentoAgua', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosMedidorDeAgua', idioma))

        item.details.html = emailBody
          .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma))
          .replace(/\$NOTIFICATION\$/g, t('possivelVazementoAguaNaUnidade', idioma))
          .replace(/\$EMAIL_MESSAGE\$/g, item.details.html)
          .replace(/\$UN_LAAGER\$/g, item.laager.UN_LAAGER || '-')
          .replace(/\$UNIT_NAME\$/g, item.laager.UNIT_NAME || '-')
          .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
          .replace(/\#OLA\#/g, t('ola', idioma))
          .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
          .replace(/\#EQUIPE\#/g, t('equipe', idioma))
          .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
          .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
          .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
          .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
          .replace(/\#AS\#/g, t('as', idioma))
          .replace(/\#DETECTOU_POSSIVEL_VAZAMENTO\#/g, t('detectouPossivelVazamentoAgua', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#VERIFICAMOS_MEDIDOR_AGUA\#/g, t('verificamosMedidorDeAgua', idioma))


        sendNotification(item.notifId, item.laager.UNIT_NAME, item.laager.CLIENT_ID, item.details, now);
      }
    }).catch(logger.error)
  }
}

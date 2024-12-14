import sqldb from '../srcCommon/db'
import { sendNotification } from '../srcCommon/helpers/userNotifs';
import { healthIndexes } from '../srcCommon/helpers/healthTypes'
import * as templateFiles from '../srcCommon/helpers/templateFiles';
import { returnActualDate } from '../srcCommon/helpers/dates';
import * as eventWarn from '../srcCommon/helpers/eventWarn';
import { t, getLanguage } from '../srcCommon/helpers/i18nextradution';
import { loadHealthNotifsForDev } from '../srcCommon/helpers/ramcacheLoaders/notifsLoader';
import { apiMainService } from '../serviceApiAsync/extServices/mainServiceApi';
import { logger } from '../srcCommon/helpers/logger';

interface DevInfoProps {
    ASSET_NAME: string;
    ASSET_ID: number;
    UNIT_ID: number;
    CLIENT_ID: number;
    UNIT_NAME: string;
    MACHINE_ID: number;
    MACHINE_NAME: string;
    CLIENT_NAME: string;
}

const getNotifReqs = (devAlerts: Awaited<ReturnType<typeof loadHealthNotifsForDev>>, prevIndex: number, newIndex: number) => {
  const notifReqs: Set<number> = new Set();
  if ((!!devAlerts['HEALTH_IDX <=R']) && newIndex === 25 && prevIndex !== 25) {
    for (const notifReq of devAlerts['HEALTH_IDX <=R']) {
      notifReqs.add(notifReq.NOTIF_ID);
    }
  }
  if ((!!devAlerts['HEALTH_IDX <=O']) && newIndex <= 50 && prevIndex > newIndex) {
    for (const notifReq of devAlerts['HEALTH_IDX <=O']) {
      notifReqs.add(notifReq.NOTIF_ID);
    }
  }
  if ((!!devAlerts['HEALTH_IDX !=G']) && newIndex !== 100 && newIndex !== prevIndex) {
    for (const notifReq of devAlerts['HEALTH_IDX !=G']) {
      notifReqs.add(notifReq.NOTIF_ID);
    }
  }
  if ((!!devAlerts['HEALTH_IDX <<<']) && (prevIndex - newIndex) > 30) {
    for (const notifReq of devAlerts['HEALTH_IDX <<<']) {
      notifReqs.add(notifReq.NOTIF_ID);
    }
  }
  if ((!!devAlerts['HEALTH_IDX ^']) && newIndex > prevIndex) {
    for (const notifReq of devAlerts['HEALTH_IDX ^']) {
      notifReqs.add(notifReq.NOTIF_ID);
    }
  }
  return notifReqs;
}

export async function onHealthChange (pars: {
  devId: string,
  prevIndex: number,
  newIndex: number,
  newReport: string
  clientId: number,
  unitId: number,
  machineId: number,
}) {
  const { devId, prevIndex, newIndex, newReport } = pars;
  const hIndexesAreValid = (newIndex >= 25) && (prevIndex >= 25);
  if (!hIndexesAreValid) return;
  const devAlerts = await loadHealthNotifsForDev({
    devId: devId,
    clientId: pars.clientId,
    unitId: pars.unitId,
    machineId: pars.machineId,
  });
  if (!devAlerts) return;

  const notifReqs: Set<number> = getNotifReqs(devAlerts, prevIndex, newIndex);

  if (notifReqs.size > 0) {
    const htmlProperties = getEmailHtmlProperties(newIndex);
    if (!htmlProperties) {
      eventWarn.typedWarn('UNEXPECTED', `WARN108 - Novo índice de saúde desconhecido: ${newIndex}`);
      return;
    }
    const healthStatusTitle = (healthIndexes[String(newIndex)] || {}).titulo || '-'
    const devInfo = await sqldb.DEVICES.getDevDetails({ DEV_ID: devId })

    for (const notifId of notifReqs) {
      const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notifId });
      const idioma = getLanguage(prefsUser[0]);
      const emailBody = templateFiles.genericNotificationEmail()
      .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma))
      .replace(/\$ICON_PNG\$/g, htmlProperties.icon)
      .replace(/\$COLOR_HEX\$/g, htmlProperties.color)
      .replace(/\$NOTIFICATION\$/g, t(htmlProperties.notification, idioma))
      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))

      const notifDetails = {
      html: emailBody.replace(/\$EMAIL_MESSAGE\$/g, `${t('verificamosIndiceDeSaudeMaquina', idioma)} <a href="https://dash.dielenergia.com/analise/dispositivo/${devId}/informacoes"><b>${devInfo.MACHINE_NAME}</b></a>, ${t('naUnidade', idioma)} <a href="https://dash.dielenergia.com/analise/unidades/${devInfo.UNIT_ID}"><b>${devInfo.UNIT_NAME}</b></a>, ${t('encontraSeEm', idioma)} <b style="color:${htmlProperties.color}">${healthStatusTitle}</b>.`),
      text: `${t('verificamosIndiceDeSaudeMaquina', idioma)} ${devInfo.MACHINE_NAME}, ${t('naUnidade', idioma)} ${devInfo.UNIT_NAME}, ${t('encontraSeEm', idioma)} ${healthStatusTitle}.`,
    }
      sendNotification(notifId, devId, devInfo.CLIENT_ID, notifDetails, null);
      await sendFeedNotifMachineHealth(notifId, devId, devInfo, htmlProperties.healthIndex, newReport);
    }
  }
}

const getEmailHtmlProperties = (newIndex: number) => {
  let htmlProperties;
  if (newIndex === 25) {
    htmlProperties = {
      color: '#E00030',
      icon:  'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/health1.png',
      notification:  'maquinaEmManutencaoUrgente',
      healthIndex: 1,
    };
  } else if (newIndex === 50) {
    htmlProperties = {
      color: '#FF4B00',
      icon:  'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/health2.png',
      notification:  'maquinaEmRiscoEminente',
      healthIndex: 2,
    };
  } else if (newIndex === 75) {
    htmlProperties = {
      notification: 'maquinaForaDeEspecificacao',
      color: '#fac53f',
      icon: 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/health3.png',
      healthIndex: 3,
    };
  } else if (newIndex === 100) {
    htmlProperties = {
      color: '#5AB365',
      icon:  'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/health4.png',
      notification:  'maquinaRecuperadaSistemaReestabelecido',
      healthIndex: 4,
    };
  }
  return htmlProperties;
}

const sendFeedNotifMachineHealth = async (notifId: number, devId: string, devInfo: DevInfoProps, healthIndex: number, report: string) => { 
  const dests = await sqldb.NOTIFDESTS.getDests({ NOTIF_ID: notifId });   
  const userIds = dests.map(dest => dest.USER_ID); 
  const dateDetection = new Date(Date.now()).toISOString()

  try {
    await apiMainService["POST /mainservice/notifications/create-notification-machine-health-index"]({
      detections: [
        {
          unitId: devInfo.UNIT_ID,
          dateDetection: dateDetection,
          machineName: devInfo.MACHINE_NAME,
          machineId: devInfo.MACHINE_ID,
          assetName: devInfo.ASSET_NAME,
          assetId: devInfo.ASSET_ID,
          deviceCode: devId,
          report: report
        }
      ],
      destinataryIds: userIds,
      isInstantaneous: true,
      healthIndex: healthIndex
    });
  } catch (err) {
    logger.error(err);
  }
}
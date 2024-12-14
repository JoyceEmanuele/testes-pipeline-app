import sqldb from '../../srcCommon/db'
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import configfile from '../../configfile';
import { t, getLanguage } from '../../srcCommon/helpers/i18nextradution';

export const sendNotificationSchedule = async () => {
  const notifications = await sqldb.NOTIF_SCHEDULE.w_selectGetNotifTimestampNull('[SYSTEM]');
  const emailBody = templateFiles.notifEmailDiariaAmbiente()
        .replace(/\$COLOR_HEX\$/g, '#FFB800')
        .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')

  // Cria um objeto para agrupar as notificações pelo Notif_id
  const notificationsGroup: {
    [notifId: number]: Array<{
      NOTIF_ID: number;
      DEV_ID: string;
      COND_VAL_MAX: string;
      UNIT_NAME?: string;
      ROOM_NAME?: string;
      TIMESTAMP_INI?: string;
      ID: number;
      UNIT_ID: number;
    }>
  } = {};

  if (configfile.debugAlerts) {
    logger.info(`ALERT CHECK ${notifications.length} NOTIFICAÇÕES`)
  }

  notifications.forEach((item) => {
    const notifId = item.NOTIF_ID;

    // Verificar se o 'notif_id' já existe no objeto 'dadosAgrupados'
    if (!notificationsGroup[notifId]) {
      // Se não existir, criar uma nova entrada com um array vazio
      notificationsGroup[notifId] = [];
    }

    // Adicionar o objeto atual ao array correspondente ao 'notif_id'
    notificationsGroup[notifId].push(item);
  });

  if (configfile.debugAlerts) {
    logger.info(`ALERT CHECK ${Object.keys(notificationsGroup).length} NOTIFICAÇÕES AGRUPADAS`)
  }

  for (const notification of Object.values(notificationsGroup)) {
    const notificationTelegram = notification.sort((a, b) => {
      if (a.UNIT_NAME && b.UNIT_NAME) {
        return a.UNIT_NAME.localeCompare(b.UNIT_NAME);
      }
      return 0;
    });

    const data = await sqldb.NOTIFSCFG.getNotifData({ notifId: notification[0].NOTIF_ID });
    if (data.COND_OP === 'D>' && data.COND_VAR === 'DUT_CO2') {
      const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notification[0].NOTIF_ID });
      const idioma = getLanguage(prefsUser[0]);

      const notifDetails = {
        html: `#VERIFICAMOS_NIVE_CO2_AMBIENTE# <a href="https://dash.dielenergia.com/analise/dispositivo/${notification[0].DEV_ID}/informacoes"><b>$ROOM_NAME$</b></a>, #NA_UNIDADE#<a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #ESTA_MAIOR_LIMITE_ESTABELECIDO# <span style="color:#ed193f">${notification[0].COND_VAL_MAX}ppm</span>.`,
        text: `<b>#OLA#, $USER_NAME$</b>\n\n#VERIFICAMOS#, <b>#ULTIMAS_24H#</b>, #O_NIVEL# #CO2# #ESTEVE_MAIOR# <b>#ACIMA_DO_LIMITE#</b> #AMBIENTES_ABAIXO#:$DATA$`,
      }

      let unitNamePrev = '';

      notifDetails.text = notifDetails.text
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#VERIFICAMOS\#/g, t('verificamosQue', idioma))
      .replace(/\#ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
      .replace(/\#AMBIENTES_ABAIXO\#/g, t('nosAmbientesListadosAbaixo', idioma))
      .replace(/\#ESTEVE_MAIOR\#/g, t('esteveMaiorQueOLimiteEstabelecidoDe', idioma))
      .replace(/\#CO2\#/g, t('notificacao.co2', idioma))
      .replace(/\#O_NIVEL\#/g, t('notificacao.oNivelDe', idioma))
      .replace(/\#ACIMA_DO_LIMITE\#/g, 
        data.COND_VAL > data.COND_SECONDARY_VAL ? `${data.COND_VAL}ppm` : `${data.COND_SECONDARY_VAL}ppm`
      )
      .replace(/\$DATA\$/g, notificationTelegram.map((item) => {
        if (item.UNIT_NAME !== unitNamePrev) {
          unitNamePrev = item.UNIT_NAME;
          return `\n\n◻ <a href="https://dap.dielenergia.com/analise/unidades/${item.UNIT_ID}">${item.UNIT_NAME}</a>
          ▫ <a href="https://dap.dielenergia.com/analise/unidades/${item.UNIT_ID}">${item.ROOM_NAME}</a> - ☁ ${item.COND_VAL_MAX}ppm - 🕒 ${item.TIMESTAMP_INI}`
        } else {
          return `
          ▫ <a href="https://dap.dielenergia.com/analise/unidades/${item.UNIT_ID}">${item.ROOM_NAME}</a> - ☁ ${item.COND_VAL_MAX}ppm - 🕒 ${item.TIMESTAMP_INI}`
        }
      }).join(''))

      notifDetails.html = emailBody
      .replace(/\$DATE\$/g, returnActualDate(false, idioma))
      .replace(/\#UNIDADE\#/g, t('unidade', idioma))
      .replace(/\#AMBIENTE\#/g, t('ambiente', idioma))
      .replace(/\#AFERICAO\#/g, t('afericao', idioma))
      .replace(/\#HORA_INI\#/g, t('horaInicial', idioma))

      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
      .replace(/\#AS\#/g, t('as', idioma))

      .replace(/\#AMBIENTES_ABAIXO\#/g, t('nosAmbientesListadosAbaixo', idioma))
      .replace(/\#ACIMA_DO_LIMITE\#/g, 
        data.COND_VAL > data.COND_SECONDARY_VAL ? `${data.COND_VAL}ppm` : `${data.COND_SECONDARY_VAL}ppm`
      )
      .replace(/\#ESTEVE_MAIOR\#/g, t('esteveMaiorQueOLimiteEstabelecidoDe', idioma))
      .replace(/\#CO2\#/g, t('notificacao.co2', idioma))
      .replace(/\#O_NIVEL\#/g, t('notificacao.oNivelDe', idioma))
      .replace(/\$UNIT_NAME\$/g, notification.map(
        (item) => `<p>${item.UNIT_NAME}</p>`
      ).join(''))

        .replace(/\$TABLE_INFO\$/g, notification.map(
        (item) => `
        <tr style="border-bottom: 1px solid #ABABAB;">
          <td style="text-decoration: underline; padding: 10px 0;">
          <p>
            <a style="color: inherit;" href="$DUT_LINK$">
              ${item.ROOM_NAME}
            </a>
          </p>
        </td>
        <td style="text-decoration: underline; padding: 10px 0">
          <p>
            <a style="color: inherit;" href="$UNIT_LINK$">
              ${item.UNIT_NAME}
            </a>
          </p>
        </td>
        <td style="color: red; padding: 10px 0">
          <p>
            ${item.COND_VAL_MAX}ppm
          </p>
        </td>
        <td style="padding: 10px 0">
          <p>${item.TIMESTAMP_INI}</p>
        </td>
        </tr>
      `
      .replace(/\$UNIT_LINK\$/g, `https://dap.dielenergia.com/analise/unidades/${item.UNIT_ID}`)
      .replace(/\$DUT_LINK\$/g, `https://dap.dielenergia.com/analise/dispositivo/${item.DEV_ID}/historico`)
        ).join(''))

      .replace(/\#AMBIENTE_ACIMA_DO_LIMITE\#/g, t('ambientesCO2AcimaLimiteEstabelecido', idioma))
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#VERIFICAMOS\#/g, t('verificamosQue', idioma))
      .replace(/\#ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
      .replace(/\#ACIMA_DO_LIMITE\#/g, t('estaMaiorLimiteEstabelecido', idioma))

      await sqldb.NOTIF_SCHEDULE.w_update({
        NOTIF_ID: notification[0].NOTIF_ID,
        TIMESTAMP_END: new Date().toISOString(),
      },'[SYSTEM]')
      sendNotification(notification[0].NOTIF_ID, notification[0].DEV_ID, data.CLIENT_ID, notifDetails);
    }
  }
}

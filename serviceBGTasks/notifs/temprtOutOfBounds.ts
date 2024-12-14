import sqldb from '../../srcCommon/db'
import * as dielServices from '../../srcCommon/dielServices';
import { parseNotificationFilter } from '../../srcCommon/helpers/notifications';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import servconfig from "../../configfile";
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';

export async function checkTempOutOfBoundsNotifs() {
  // Pega no banco todas as notificações configuradas (para temperatura fora dos limites)
  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['DUT_T'], condOps: ['DUT<>DUT'] });

  // A verificação é feita depois que o dia termina, ou seja, para o dia de ontem
  const formattedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString().substring(0, 10);

  // O Map a seguir guarda as informações dos DUTs, que podem ser usados por mais de um item do "notifsList"
  interface DutData {
    UNIT_ID: number
    CLIENT_NAME: string
    DEV_ID: string
    UNIT_NAME: string
    ROOM_NAME: string
    TUSEMIN: number
    TUSEMAX: number
  }
  const dutsStats: Map<string, {
    dutStats: {
      accTacima?: number;
      accTabaixo?: number;
    }
    dutData: DutData
  }> = new Map();

  for (const notif of notifsList) {
    // Para cada notificação configurada, pega a lista de DUTs monitorados
    const devsFilter = parseNotificationFilter(notif.FILT_DEVS, notif.CLIENT_ID);
    if (!devsFilter) continue;

    const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dut' });
    const minLimit = ((notif.COND_VAL && Number(notif.COND_VAL)) || 0) * 60; // em segundos

    // Passar pela lista de dispositivos e identificar os que devem entrar no relatório
    const dutsOutBounds = [] as {
      direction: 'above'|'below',
      time: number,
      dutData: DutData,
    }[];
    for (const dut of devsList) {
      // Se já tiver buscado os dados deste DUT, não precisa buscar de novo
      if (!dutsStats.has(dut.DEV_ID)) {
        const dutData = await sqldb.DUTS.getDutDetails({ DEV_ID: dut.DEV_ID });
        const dutStats = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/getDutDaySimpleStats', { devId: dut.DEV_ID, dateIni: formattedYesterday, numDays: 1, progObrigatoria: true, motivo: `checkTempOutOfBoundsNotifs` });
        dutsStats.set(dut.DEV_ID, { dutData, dutStats });
      }
      const { dutData, dutStats } = dutsStats.get(dut.DEV_ID);
      if ((dutStats.accTacima > 0) && (dutStats.accTacima >= minLimit)) {
        dutsOutBounds.push({ direction: 'above', time: dutStats.accTacima, dutData });
      }
      if ((dutStats.accTabaixo > 0) && (dutStats.accTabaixo >= minLimit)) {
        dutsOutBounds.push({ direction: 'below', time: dutStats.accTabaixo, dutData });
      }
    }

    // Se não tiver nenhum ambiente para incluir na notificação, passa para a próxima.
    if (dutsOutBounds.length === 0) continue;

    const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: notif.CREATED_BY })
    const idioma = getLanguage(prefsUser[0])
    const convertedDateToLL = returnActualDate(true, idioma);
    // Criar o código HTML das linhas da tabela de DUTs
    const [bp_head, bp_row, bp_foot] = templateFiles.notifEmailTemprtOutOfBounds().split('<!-- SPLIT -->');
    const htmlRows = dutsOutBounds
      .sort((a, b) => {
        // Primeiro todos os alertas de temperatura acima dos limites e depois os alertas com temperatura abaixo dos limites
        if ((a.direction === 'above') && (b.direction === 'below')) return -1;
        if ((a.direction === 'below') && (b.direction === 'above')) return 1;
        // Ordenado da duração maior à menor
        if (a.time > b.time) return -1;
        if (a.time < b.time) return 1;
        // Ordena por unidade, ambiente, dev_id
        if (a.dutData.UNIT_NAME > b.dutData.UNIT_NAME) return 1;
        if (a.dutData.UNIT_NAME < b.dutData.UNIT_NAME) return -1;
        if (a.dutData.ROOM_NAME > b.dutData.ROOM_NAME) return 1;
        if (a.dutData.ROOM_NAME < b.dutData.ROOM_NAME) return -1;
        if (a.dutData.DEV_ID > b.dutData.DEV_ID) return -1;
        if (a.dutData.DEV_ID < b.dutData.DEV_ID) return 1;
        return 0;
      })
      .map(({ direction, time, dutData }) =>
        bp_row
          .replace(/\$UNIT_LINK\$/g, `${servconfig.frontUrls.base}/analise/unidades/${dutData.UNIT_ID}`)
          .replace(/\$UNIT_NAME\$/g, formatStringLength(dutData.UNIT_NAME))
          .replace(/\$T_COLOR\$/g, (direction === "above") ? "#E00030" : "#2D81FF")
          .replace(/\$DUT_LINK\$/g, `${servconfig.frontUrls.base}/analise/dispositivo/${dutData.DEV_ID}/informacoes`)
          .replace(/\$ROOM_NAME\$/g, dutData.ROOM_NAME)
          .replace(/\$T_ERR_COND\$/g, (direction === "above") ? `>${dutData.TUSEMAX}°C` : `<${dutData.TUSEMIN}°C`)
          .replace(/\$T_RANGE\$/g, `${dutData.TUSEMIN}°C ${t('a', idioma)} ${dutData.TUSEMAX}°C`)
          .replace(/\$TIME_COUNT\$/g, formatStringLength(secondsToHms(time)))
      );

    const emailHeader = bp_head
      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\$DATE\$/g, (convertedDateToLL || '-'))
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#UNIDADE\#/g, t('unidade', idioma))
      .replace(/\#AFERICAO\#/g, t('afericao', idioma))
      .replace(/\#DURACAO_ACUMULADA\#/g, t('duracaoAcumulada', idioma))
      .replace(/\#VERIFICAMOS_QUE\#/g, t('verificamosQue', idioma))
      .replace(/\#NAS_ULTIMAS_24H\#/g, t('nasUltimas24h', idioma))
      .replace(/\#TEMPERATURA_AMBIENTE_FORA_LIMITES\#/g, t('temperaturaDosAmbientesForaDosLimites', idioma))
      .replace(/\#TEMPERATURA_FORA_LIMITES_ESTABELECIDOS\#/g, t('temperaturaForaLimitesEstabelecidos', idioma))
      .replace(/\#DE_MEIANOITE_AS_ONZE\#/g, t('deMeiaNoiteAsOnze', idioma))
      .replace(/\#AMBIENTE\#/g, t('ambiente', idioma))
      .replace(/\#LIMITES\#/g, t('limites', idioma))

    const bpFoot = bp_foot
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))

    const emailBody =
    emailHeader +
    htmlRows.join('\n') +
    bpFoot;

    const notifId = notif.NOTIF_ID;
    const devId = `NOTIF:${notif.NOTIF_ID}`;
    const clientId = notif.CLIENT_ID;
    const details = {
      html: emailBody,
      text: "", // TODO: criar uma mensagem para enviar a notificação por Telegram
    };

    sendNotification(notifId, devId, clientId, details, null);
  }
}

function formatStringLength(str: string) {
  if (!str) return "-";

  return str.length <= 20 ? str : `${str.substring(0, 20)}...`;
}

function secondsToHms(seconds: number): null | string {
  if (seconds === 0) return null;

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const hDisplay = h > 0 ? `${h}h` : "";
  const mDisplay = m > 0 ? `${m}min` : "";

  return `${hDisplay}${mDisplay}`;
}

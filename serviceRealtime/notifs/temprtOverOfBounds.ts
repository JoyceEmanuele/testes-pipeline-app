import sqldb from '../../srcCommon/db'
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import servconfig from "../../configfile";
import { AlertDetection} from '../../srcCommon/types';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { returnActualDate } from '../../srcCommon/helpers/dates';

export async function checkTempOverOfBoundsNotifs(alert: AlertDetection, currentDate: string, tempCondVal: number, minLimit: number) {
  const { notifId, devId } = alert;

  function formatStringLength(str: string) {
    if (!str) return "-";
    return str.length <= 20 ? str : `${str.substring(0, 20)}...`;
  }
  
  const dutData = await sqldb.DUTS.getDutDetails({ DEV_ID: devId });
  const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notifId });
  const idioma = getLanguage(prefsUser[0]);
  const convertedDateToLL = returnActualDate(false, idioma);

  const emailBody = templateFiles.notifEmailTempOverOfBounds();

  const details = {
    html: emailBody
      .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
      .replace(/\$DATE\$/g, (convertedDateToLL || '-'))
      .replace(/\$TIME\$/g, currentDate)
      .replace(/\$UNIT_LINK\$/g, `${servconfig.frontUrls.base}/analise/unidades/${dutData.UNIT_ID}`)
      .replace(/\$UNIT_NAME\$/g, formatStringLength(dutData.UNIT_NAME))
      .replace(/\$DUT_LINK\$/g, `${servconfig.frontUrls.base}/analise/dispositivo/${dutData.DEV_ID}/informacoes`)
      .replace(/\$ROOM_NAME\$/g, dutData.ROOM_NAME)
      .replace(/\$T_ERR_COND\$/g, `>${tempCondVal}°C`)
      .replace(/\$MIN_LIMIT\$/g, `${minLimit}min`)
      .replace(/\$T_RANGE\$/g, `${dutData.TUSEMIN}°C a ${dutData.TUSEMAX}°C`)
      .replace(/\#AS\#/g, t('as', idioma))
      .replace(/\#OLA\#/g, t('ola', idioma))
      .replace(/\#DURACAO_ACUMULADA\#/g, t('duracaoAcumulada', idioma))
      .replace(/\#UNIDADE\#/g, t('unidade', idioma))
      .replace(/\#AMBIENTE\#/g, t('ambiente', idioma))
      .replace(/\#TEMPERATURA_AMBIENTE_ACIMA_LIMITE\#/g, t('temperaturaAmbienteAcimaDoLimite', idioma))
      .replace(/\#LIMITES\#/g, t('limites', idioma))
      .replace(/\#AFERICAO\#/g, t('afericao', idioma))
      .replace(/\#VERIFICAMOS_QUE_TEMPERATURA\#/g, t('verificamosQueTemperaturaAmbienteListadoAbaixo', idioma))
      .replace(/\#ACIMA_DO_LIMITE\#/g, t('acimaDoLimite', idioma))
      .replace(/\#ESTABELECIDO_DURANTE_O_HORARIO\#/g, t('estabelecidoDuranteOHorarioFuncionamento', idioma))
      .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
      .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
      .replace(/\#EQUIPE\#/g, t('equipe', idioma))
      .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
      .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
      .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
      .replace(/\#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE\#/g, t('verificamosTemperaturaAmbiente', idioma))
      .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
      .replace(/\#ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMaiorLimiteEstabelecidoDe', idioma))
      .replace(/\#AS\#/g, t('as', idioma))
      .replace(/\#VERIFICAMOS_NIVE_CO2_AMBIENTE\#/g, t('verificamoNivelCO2Ambiente', idioma))
      .replace(/\#ESTA_MAIOR_LIMITE_ESTABELECIDO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
      .replace(/\#ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
      .replace(/\#ESTA_MENOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMenorQueLimiteEstabelecidoDe', idioma)),

    text: alert.details.text
      .replace(/\$ROOM_NAME\$/g, dutData.ROOM_NAME)
      .replace(/\$UNIT_NAME\$/g, dutData.UNIT_NAME)
      .replace(/\#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE\#/g, t('verificamosTemperaturaAmbiente', idioma))
      .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
      .replace(/\#ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMaiorLimiteEstabelecidoDe', idioma))
      .replace(/\#AS\#/g, t('as', idioma))
      .replace(/\#VERIFICAMOS_NIVE_CO2_AMBIENTE\#/g, t('verificamoNivelCO2Ambiente', idioma))
      .replace(/\#ESTA_MAIOR_LIMITE_ESTABELECIDO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
      .replace(/\#ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
      .replace(/\#ESTA_MENOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMenorQueLimiteEstabelecidoDe', idioma))
  };

  sendNotification(notifId, devId, dutData.CLIENT_ID, details, null);
}

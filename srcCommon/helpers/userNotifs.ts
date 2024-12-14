import * as sendEmail from '../extServices/sendEmail'
import sqldb from '../../srcCommon/db'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse'
import * as dielServices from '../../srcCommon/dielServices'
import { logger } from '../../srcCommon/helpers/logger';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import i18next from '../../srcCommon/i18n';

interface NotifOption {
  label: string
  value: string
  unit: string
  unit2?: string
  describe: (val: string) => string
}
interface NotifType {
  name: string
  ops: NotifOption[]
  type: string
}
interface NotifsInfo {
  HEALTH_IDX: NotifType
  COMP_DUR: NotifType
  NUM_DEPS: NotifType
  COMP_TIME: NotifType
  [k:string]: NotifType
}

export function getNotifTypes(req?: boolean): NotifsInfo {
  return {
    HEALTH_IDX: {
      name: 'notificacao.indiceSaude',
      ops: [
        { label: 'notificacao.saudeFicarVermelho',            value: '<=R',  unit: null, describe: (val) => !req? `Índice de saúde ficar vermelho` : 'notificacao.indiceFicarVermelho' },
        { label: 'notificacao.saudeFicarVermelhoOuLaranja', value: '<=O',  unit: null, describe: (val) => !req? `Índice de saúde ficar vermelho ou laranja` : 'notificacao.indiceFicarVermelhoOuLaranja' },
        { label: 'notificacao.saudeForDiferenteVerde',    value: '!=G',  unit: null, describe: (val) => !req? `Índice de saúde for diferente de verde`: 'notificacao.indiceDiferenteVerde' },
        { label: 'notificacao.saudeDescerAbruptamente',       value: '<<<', unit: null, describe: (val) => !req? `Índice de saúde descer abruptamente`: 'notificacao.indiceDescerAbruptamente' },
        { label: 'notificacao.sauderSeRecuperar',              value: '^',   unit: null, describe: (val) => !req? `Índice de saúde se recuperar`: 'notificacao.indiceSeRecuperar' }
      ],
      type: 'saude'
    },
    COMP_DUR: {
      name: 'notificacao.compressorFicarLigadoPor',
      ops: [
        { label: 'notificacao.maisQue',  value: '>', unit: 'hs', describe: (val) => !req? `Compressor ficar ligado por mais que ${val} horas`: 'notificacao.compressorFicarLigadoMaisQue' },
        { label: 'notificacao.menosQue', value: '<', unit: 'hs', describe: (val) => !req? `Compressor ficar ligado por menos que ${val} horas` : 'notificacao.compressorFicarLigadoMenosQue' }
      ],
      type: 'uso'
    },
    NUM_DEPS: {
      name: 'notificacao.numeroPartidasNoDiaFor',
      ops: [
        { label: 'notificacao.maiorQue',      value: '>',  unit: 'Quantidade', describe: (val) => !req? `Número de partidas no dia for maior que ${val}` : 'notificacao.numeroPartidasDiaForMaiorQue' },
        { label: 'notificacao.menorOuIgual', value: '<=', unit: 'Quantidade', describe: (val) => !req? `Número de partidas no dia for menor ou igual a ${val}` : 'notificacao.numeroPartidasDiaForMenorOuIgual' }
      ],
      type: 'uso'
    },
    COMP_TIME: {
      name: 'notificacao.compressorEstiverLigado',
      ops: [
        { label: 'notificacao.depoisDeNotificacaoCritica', value: '>', unit: 'HH:mm', describe: (val) => !req? `Compressor estiver ligado depois de ${val}` : 'notificacao.compressorEstiverLigadoDepoisDe' },
        { label: 'notificacao.antesDeNotificacaoCritica',  value: '<', unit: 'HH:mm', describe: (val) => !req? `Compressor estiver ligado antes de ${val}` : 'notificacao.compressorEstiverLigadoAntesDe' },
        { label: 'notificacao.depoisDeNotificacaoDiaria', value: 'D>', unit: 'HH:mm', describe: (val) => !req? `Compressor estiver ligado depois de ${val}` : 'notificacao.compressorEstiverLigadoDepoisDe' },
        { label: 'notificacao.antesDeNotificacaoDiaria',  value: 'D<', unit: 'HH:mm', describe: (val) => !req? `Compressor estiver ligado antes de ${val}` : 'notificacao.compressorEstiverLigadoAntesDe' }
      ],
      type: 'uso'
    },
    DUT_T: {
      name: 'notificacao.temperaturaAmbiente',
      ops: [
        { label: 'notificacao.estiverForaLimitesDiaria', value: 'DUT<>DUT', unit: 'notificacao.duraçãoMinimaAcumuladaMin', describe: (val) => !req? `Temperatura do ambiente estiver fora dos limites`: 'notificacao.temperaturaAmbienteForaDosLimites' },
        { label: 'notificacao.estiverAcimaLimiteCritica', value: 'T>T', unit: 'notificacao.offsetLimiteSuperiorTemperatura', unit2: 'notificacao.duraçãoMinimaAcumuladaMin', describe: (val) => !req? `Temperatura de Ambiente acima do limite estabelecido` : 'notificacao.temperaturaAmbienteAcimaDosLimites' },
      ],
      type: 'room'
    },
    DUT_CO2: {
      name: 'notificacao.nivelCO2',
      ops: [
        { label: 'notificacao.estiverAcimaLimite', value: '>', unit: null, describe: (val) => !req? `Nível de CO2 estiver acima do limite` : 'notificacao.nivelCO2AcimaLimite' },
        //acima do limite usado no reporte diário
        { label: 'notificacao.estiverAcimaLimiteDiario', value: 'D>', unit: null, describe: (val) => !req? `Nível de CO2 estiver acima do limite` : 'notificacao.nivelCO2AcimaLimite' },
      ],
      type: 'room'
    },
    WATER: {
      name: 'notificacao.agua',
      ops: [
        { label: 'notificacao.possivelVazamento', value: '-', unit: null, describe: (val) => !req? `Medidor identificou vazamento de água` : 'notificacao.medidorIndentificouVazamentoAgua' },
      ],
      type: 'water'
    },
    VRF_COOLAUT: {
      name: 'notificacao.algumVRF',
      ops: [
        { label: 'notificacao.tiverAlerta', value: '-', unit: null, describe: (val) => !req? `Tiver alerta em algum VRF` : 'notificacao.tiverAlertaAlgumVRF' },
      ],
      type: 'vrf'
    },
    ENERGY: {
      name: 'Energia',
      ops: [
        { label: 'Consumo de Energia por Dia', value: 'ECPD', unit: null, describe: (val) => 'Consumo de Energia por Dia' },
        { label: 'Consumo de Energia por Hora', value: 'ECPH', unit: null, describe: (val) => 'Consumo de Energia por Hora' },
        { label: 'Potência Ativa', value: 'AP', unit: null, describe: (val) => 'Potência Ativa' }
      ],
      type: 'energy'
    },
    // Estiver sem rede
    // Algum dos sensores estiver enviando 0 (falha no sensor)
  }
}

export function sendNotification (notifId: number, devId: string, clientId: number, details: { text: string, html: string, subject?: string }, now?: number) {
  // now = Date.now();
  Promise.resolve().then(async () => {
    const [
      row,
      dests,
    ] = await Promise.all([
      sqldb.NOTIFSCFG.select1({ notifId }),
      sqldb.NOTIFDESTS.getDests({ NOTIF_ID: notifId }),
    ]);
    if (!row) return;
    // Confere se o cliente que configurou a notificação é o mesmo do dispositivo que está gerando o alerta
    if (row.CLIENT_ID !== clientId) return;

    if (row.COND_VAR === 'WATER') {
      logger.info({
        msg: `[DEBUG AGUA] sendNotification ${devId} - Horário: ${new Date(now).toISOString()}`,
        row
      });
    }

    if (now && devId) {
      // Se tiver menos de 24h que a mesma notificação foi enviada, não envia de novo.
      const limit24h = now - 24 * 60 * 60 * 1000;
      const notifData = jsonTryParse<{
        lastMessage?: number, // Esta propriedade não é mais usada e vai ser removida
        lastMessages?: { [devId: string]: number }
      }>(row.NOTIF_DATA) || {};
      if (notifData.lastMessages && notifData.lastMessages[devId] > limit24h) {
        // Tem menos de 24h que uma notificação desta foi enviada para o mesmo dispositivo
        if (row.COND_VAR === 'WATER') {
          logger.info({
            msg: `[DEBUG AGUA] Tem menos de 24h que uma notificação desta foi enviada para o mesmo dispositivo ${devId} - Horário: ${new Date(now).toISOString()}`,
            row
          });
        }
        return;
      }
      if (!notifData.lastMessages) notifData.lastMessages = {};
      notifData.lastMessages[devId] = now; // Registra que agora está sendo enviada para este dispositivo
      for (const [id, ts] of Object.entries(notifData.lastMessages)) {
        // Remove entradas com mais de 24h
        const dentroPrazo = ts > limit24h;
        if (!dentroPrazo) {
          delete notifData.lastMessages[id];
        }
      }
      delete notifData.lastMessage;
      await sqldb.NOTIFSCFG.w_updateNotifData({ NOTIF_ID: notifId, NOTIF_DATA: JSON.stringify(notifData) }, '[SYSTEM]');
    }

    const emailBody = details.html.replace(/\$USER_NAME\$/g, (row.CLIENT_NAME || '-'));
    const telegramText = details.text.replace(/\$USER_NAME\$/g, (row.CLIENT_NAME || '-'));

    logger.info(` /!\\ ALERT ${devId} ${row.COND_VAR} ${row.COND_OP} ${row.COND_VAL} ${row.COND_SECONDARY_VAL && row.COND_SECONDARY_VAL} || '' }. ${telegramText || ''}`)

    const notifData = row.COND_VAR && getNotifTypes(true)[row.COND_VAR];
    const opData = notifData && notifData.ops.find(op => op.value === row.COND_OP)
    
    for (const dest of dests) {
      try {
        const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: notifId });
        const idioma = getLanguage(prefsUser[0]);
        const notifName = opData && opData.describe(row.COND_VAL);
        const translateNotifName = i18next.t(notifName, {lng: idioma, val: row.COND_VAL});
        const subject = details.subject ? details.subject : `${t('notificacao.notificacao', idioma)} - ${translateNotifName || 'Diel Energia'}`;
        
        if ((dest.NOTIFSBY === 'telegram') && dest.PHONENB) {
          await dielServices.telegramInternalApi('/diel-internal/telegram/send-message-to', {
            phoneNumber: dest.PHONENB,
            msgText: telegramText,
          }).catch(logger.error);
        } else if ((dest.NOTIFSBY === 'email and telegram') && dest.PHONENB) {
          await dielServices.telegramInternalApi('/diel-internal/telegram/send-message-to', {
            phoneNumber: dest.PHONENB,
            msgText: telegramText,
          }).catch(logger.error);
          await sendEmail.simple({ user: '[SYSTEM]' }, [dest.USER_ID], subject, emailBody).catch(logger.error);
        } else {
          await sendEmail.simple({ user: '[SYSTEM]' }, [dest.USER_ID], subject, emailBody).catch(logger.error);
        }
      } catch (err) {
        logger.error(err);
      }
    }
  }).catch(logger.error)
}

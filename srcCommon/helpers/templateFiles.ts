import * as fs from 'node:fs';
import * as path from 'node:path';
import { t } from '../helpers/i18nextradution'

export function genericNotificationEmail() {
  return fs.readFileSync(path.resolve(`./assets/Notification.html`), 'utf-8');
}

export function notifEmailTemprtOutOfBounds() {
  return fs.readFileSync(path.resolve(`./assets/NotificacaoForaDosLimites.html`), 'utf-8');
}

export function notifEmailTempOverOfBounds() {
  return fs.readFileSync(path.resolve(`./assets/NotificacaoAcimaDosLimites.html`), 'utf-8');
}

export function notifEmailCompOutOfTime() {
  return fs.readFileSync(path.resolve(`./assets/CompressorLigadoForaDosLimites.html`), 'utf-8');
}

export function notifEmailEnergyConsumptionPerHourEOD() {
  return fs.readFileSync(path.resolve(`./assets/ConsumoDeEnergiaPorHoraEOD.html`), 'utf-8');
}

export function notifEmailRelatorioVazamentoDiario() {
  return fs.readFileSync(path.resolve(`./assets/RelatorioVazamentoDiario.html`), 'utf-8');
}

export function notifEmailDiariaAmbiente() {
  return fs.readFileSync(path.resolve(`./assets/NotificacaoDiariaAmbiente.html`), 'utf-8');
}

export function buildGenericNotificationEmail(info: {
  DATEINFO: string // returnActualDate(false)
  COLOR_HEX: string // '#FFB800'
  ICON_PNG: string // 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png'
  NOTIFICATION: string // 'POSSÍVEL VAZAMENTO DE ÁGUA NA UNIDADE'
  USER_NAME: string
  EMAIL_MESSAGE: string // Em html
  IDIOMA?: string
}) {
  if(!info.IDIOMA) {
    info.IDIOMA = 'pt'
  }

  const emailBody = genericNotificationEmail()
    .replace(/\$DATEINFO\$/g, info.DATEINFO)
    .replace(/\$COLOR_HEX\$/g, info.COLOR_HEX)
    .replace(/\$ICON_PNG\$/g, info.ICON_PNG)
    .replace(/\$NOTIFICATION\$/g, info.NOTIFICATION)
    .replace(/\$USER_NAME\$/g, info.USER_NAME)
    .replace(/\$EMAIL_MESSAGE\$/g, info.EMAIL_MESSAGE)
    .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', info.IDIOMA))
    .replace(/\#OLA\#/g, t('ola', info.IDIOMA))
    .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', info.IDIOMA))
    .replace(/\#EQUIPE\#/g, t('equipe', info.IDIOMA))
    .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', info.IDIOMA))
    .replace(/\#CONTATAR_EM\#/g, t('contatarEm', info.IDIOMA))
    .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', info.IDIOMA))
    .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', info.IDIOMA))
  return { emailBody };
}

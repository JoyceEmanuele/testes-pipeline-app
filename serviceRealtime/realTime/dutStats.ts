import { AlertDetection, DetectionSchedule, TelemetryDUT } from '../../srcCommon/types';
import * as ramCaches from '../ramCaches';
import { sendNotification } from '../../srcCommon/helpers/userNotifs';
import * as checkOverOfBounds from '../notifs/temprtOverOfBounds';
import sqldb from '../../srcCommon/db'
import * as templateFiles from '../../srcCommon/helpers/templateFiles';
import { logger } from '../../srcCommon/helpers/logger';
import { returnActualDate } from '../../srcCommon/helpers/dates';
import configfile from '../../configfile';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';

// RAM-CACHE
const lastTelemetries: { [dutId: string]: { ts: Date, Temperature: number} } = {};

export async function updateStatistics (devId: string, payload: TelemetryDUT, shiftedServerTime: Date) {
  let notificationText = 'voceTemUmaNovaNotificacao';
  let hexColor = '#FFB800';
  const now = Date.now();
  const RTYPE_ID = ramCaches.DUTS.tryGetDutRTypeId(devId);
  let rtypeSched;
  if (!RTYPE_ID) {
    rtypeSched = { current: null, TUSEMIN: null }
  }
  else {
    rtypeSched = ramCaches.ROOMTYPES.tryGetRTypeSched(RTYPE_ID);
  }

  const devAlerts = ramCaches.NOTIFSCFG.tryGetDevUNotifs(devId);

  if (!rtypeSched || !rtypeSched.current) return;
  if (!devAlerts) return;
  const { current, TUSEMAX, TUSEMIN, CO2MAX } = rtypeSched;

  const detections: AlertDetection[] = [];

  let detectionSchedule: DetectionSchedule[] = [];

  let lastTelemetryInfo = lastTelemetries[devId];
  const lastTelemetryDate = lastTelemetryInfo?.ts;
  const lastTelemetryTemperature = lastTelemetryInfo?.Temperature;
  if (!lastTelemetryInfo) {
    lastTelemetryInfo = lastTelemetries[devId] = { ts: shiftedServerTime, Temperature: payload.Temperature };
  }
  lastTelemetryInfo.ts = shiftedServerTime;
  lastTelemetryInfo.Temperature = payload.Temperature;

  let delta = (lastTelemetryDate && (shiftedServerTime.getTime() - lastTelemetryDate.getTime())) || 0;
  if (delta > 15000) delta = 15000; // Usually DUTs send telemetry every 5s
  if (!(delta > 0)) delta = 0;
  const dayChanged = lastTelemetryDate && (shiftedServerTime.getUTCDate() !== lastTelemetryDate.getUTCDate());

  if ((dayChanged || !lastTelemetryDate) && devAlerts['DUT_T T<>T']) {
    for (const row of devAlerts['DUT_T T<>T']) {
      ;(<any>row).accT = 0;
    }
  }

  if (devAlerts['DUT_CO2 >'] && (payload.eCO2 != null) && (CO2MAX != null)) {
    const nowShifted = (now - 3 * 60 * 60 * 1000)
    const shiftedIndex = (nowShifted % (24 * 60 * 60 * 1000)) / 1000 / 60
    if (current.indexIni && (shiftedIndex < (current.indexIni))) { } // don't check
    else if (current.indexEnd && (shiftedIndex > current.indexEnd)) { } // don't check
    else {
      const limit24h = now - 24 * 60 * 60 * 1000
      if (CO2MAX != null && payload.eCO2 > CO2MAX) {
        for (const row of devAlerts['DUT_CO2 >']) {
          if (row.lastNotifSent > limit24h) continue
          if (!(<any>row).accT) { (<any>row).accT = 0; }
          if ((<any>row).accT > (10 * 60 * 1000)) {
            if (configfile.debugAlerts) {
              logger.info(`ALERT CHECK ${devId} DUT_CO2 ${payload.eCO2} > ${CO2MAX}`)
            }
            notificationText = 'ambienteCO2AcimaLimiteEstabelecido';
            const notifDetails = {
              html: `#VERIFICAMOS_NIVE_CO2_AMBIENTE# <a href="https://dash.dielenergia.com/analise/dispositivo/${devId}/informacoes"><b>$ROOM_NAME$</b></a>, #NA_UNIDADE#<a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #ESTA_MAIOR_LIMITE_ESTABELECIDO# <span style="color:#ed193f">${CO2MAX}ppm</span>, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
              text: `#VERIFICAMOS_NIVE_CO2_AMBIENTE# $ROOM_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTA_MAIOR_LIMITE_ESTABELECIDO# ${CO2MAX}ppm, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
            };
            detections.push({ notifId: row.NOTIF_ID, devId, details: notifDetails })
            row.lastNotifSent = now
          } else {
            (<any>row).accT += delta;
          }
        }
      }
    }
  }

  if (devAlerts['DUT_CO2 D>'] && (payload.eCO2 != null) && (CO2MAX != null)) {
    const nowShifted = (now - 3 * 60 * 60 * 1000)
    const shiftedIndex = (nowShifted % (24 * 60 * 60 * 1000)) / 1000 / 60
    if (current.indexIni && (shiftedIndex < (current.indexIni))) { } // don't check
    else if (current.indexEnd && (shiftedIndex > current.indexEnd)) { } // don't check
    else {
      const limit24h = now - 24 * 60 * 60 * 1000
      if (CO2MAX != null && payload.eCO2 > CO2MAX) {
        for (const row of devAlerts['DUT_CO2 D>']) {
          if (row.lastNotifSent > limit24h) continue
          if (!(<any>row).accT) { (<any>row).accT = 0; }
          if ((<any>row).accT > (10 * 60 * 1000)) {
            if (configfile.debugAlerts) {
              logger.info(`ALERT CHECK ${devId} DUT_CO2 ${payload.eCO2} D> ${CO2MAX}`)
            }
            detectionSchedule.push({ notifId: row.NOTIF_ID, devId, cond: CO2MAX.toString(), init: `${new Date().getHours().toString()}h` })
            row.lastNotifSent = now
          } else {
            (<any>row).accT += delta;
          }
        }
      }
    }
  }

  if (devAlerts['DUT_T T<>T'] && (payload.Temperature != null) && ((TUSEMAX != null) || (TUSEMIN != null))) {
    const nowShifted = (now - 3 * 60 * 60 * 1000)
    const shiftedIndex = (nowShifted % (24 * 60 * 60 * 1000)) / 1000 / 60
    if (current.indexIni && (shiftedIndex < (current.indexIni))) { } // don't check
    else if (current.indexEnd && (shiftedIndex > current.indexEnd)) { } // don't check
    else {
      const limit24h = now - 24 * 60 * 60 * 1000
      if (TUSEMAX != null && payload.Temperature > TUSEMAX) {
        for (const row of devAlerts['DUT_T T<>T']) {
          if (row.lastNotifSent > limit24h) continue
          if (!(<any>row).accT) { (<any>row).accT = 0; }
          if ((<any>row).accT > (10 * 60 * 1000)) {
            if (configfile.debugAlerts) {
              logger.info(`ALERT CHECK ${devId} DUT_T ${payload.Temperature} > ${TUSEMAX}`)
            }
            notificationText = 'temperaturaAmbienteAcimaLimiteEstabelecido'
            hexColor = '#E00030';
            const notifDetails = {
              html: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# <a href="https://dash.dielenergia.com/analise/dispositivo/${devId}/informacoes"><b>$ROOM_NAME$</b></a>, #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO# <span style="color:#ed193f">${TUSEMAX}°C</span>, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
              text: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# $ROOM_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO# ${TUSEMAX}°C, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
            };
            detections.push({ notifId: row.NOTIF_ID, devId, details: notifDetails })
            row.lastNotifSent = now
          } else {
            (<any>row).accT += delta;
          }
        }
      }
      if (TUSEMIN != null && payload.Temperature < TUSEMIN) {
        for (const row of devAlerts['DUT_T T<>T']) {
          if (row.lastNotifSent > limit24h) continue
          if (!(<any>row).accT) { (<any>row).accT = 0; }
          if ((<any>row).accT > (10 * 60 * 1000)) {
            if (configfile.debugAlerts) {
              logger.info(`ALERT CHECK ${devId} DUT_T ${payload.Temperature} < ${TUSEMIN}`)
            }
            notificationText = 'temperaturaAmbienteAbaixoLimiteEstabeliecido'
            const notifDetails = {
              html: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# <a href="https://dash.dielenergia.com/analise/dispositivo/${devId}/informacoes"><b>$ROOM_NAME$</b></a>,  #NA_UNIDADE# <a href="https://dash.dielenergia.com/analise/unidades/$UNIT_ID$"><b>$UNIT_NAME$</b></a>, #ESTA_MENOR_QUE_LIMITE_ESTABELECIDO# <span style="color:#ed193f">${TUSEMIN}°C</span>, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
              text: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# $ROOM_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTA_MENOR_QUE_LIMITE_ESTABELECIDO# ${TUSEMIN}°C, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`,
            };
            detections.push({ notifId: row.NOTIF_ID, devId, details: notifDetails })
            row.lastNotifSent = now
          } else {
            (<any>row).accT += delta;
          }
        }
      }
    }
  }

  if (devAlerts['DUT_T T>T'] && (payload.Temperature != null) && ((TUSEMAX != null))) {
    let singleDetection: AlertDetection;
    let tempCondVal = 0;
    let minLimit = 0;

    for (const cond of devAlerts['DUT_T T>T']) {
      let value = cond.COND_VAL ? parseInt(cond.COND_VAL) : 0;
      let value2 =  cond.COND_SECONDARY_VAL ? parseInt(cond.COND_SECONDARY_VAL) : 0;
      // valida se o valor da condição é NaN ou menor igual a 0
      tempCondVal = isNaN(value) || value <= 0 ? TUSEMAX : TUSEMAX + value;
      minLimit = value2 <= 0 ?  0 :  value2;

      const currentDate = shiftedServerTime.toISOString().substr(11, 5);
      const nowShifted = (now - 3 * 60 * 60 * 1000)
      const shiftedIndex = (nowShifted % (24 * 60 * 60 * 1000)) / 1000 / 60



      if (current.indexIni && (shiftedIndex < (current.indexIni))) { } // don't check
      else if (current.indexEnd && (shiftedIndex > current.indexEnd)) { } // don't check
      else {
        if (!(<any>cond).isCondNotification) { (<any>cond).isCondNotification = false; }
        if (!(<any>cond).accT) { (<any>cond).accT = 0; }
        if ((payload.Temperature > tempCondVal && lastTelemetryTemperature <= tempCondVal) || (<any>cond).isCondNotification) {
          if (payload.Temperature <= tempCondVal) {
            (<any>cond).isCondNotification = false;
            (<any>cond).accT = 0;
          }
          else {
            (<any>cond).isCondNotification = true;
            notificationText = 'temperaturaAmbienteAcimaDoLimite'
            hexColor = '#E00030';
            if ((<any>cond).accT > (minLimit * 60 * 1000)) {
              (<any>cond).isCondNotification = false;
              (<any>cond).accT = 0; 
              if (configfile.debugAlerts) {
                logger.info(`ALERT CHECK ${devId} DUT_T ${payload.Temperature} > ${tempCondVal}`);
              }
              const notifDetails = {
                html: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# <a href="https://dash.dielenergia.com/analise/dispositivo/${devId}/informacoes"><b>$ROOM_NAME$</b></a>, #NA_UNIDADE# $UNIT_NAME$, #ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO# .`,
                text: `#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE# $ROOM_NAME$, #NA_UNIDADE# $UNIT_NAME$, #ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO# ${TUSEMAX}°C, #AS# ${shiftedServerTime.toISOString().substr(11, 5)}.`
              };
              singleDetection = { notifId: cond.NOTIF_ID, devId, details: notifDetails };
              checkOverOfBounds.checkTempOverOfBoundsNotifs(singleDetection, currentDate, tempCondVal, minLimit);
            } else {
              (<any>cond).accT += delta;
            }
          }
        }
      }
    }
  }

  if (detections && detections.length > 0) {
    Promise.resolve().then(async () => {
      const dutInfo = await sqldb.DUTS.getDutDetails({ DEV_ID: devId });
      const emailBody = templateFiles.genericNotificationEmail()
        .replace(/\$COLOR_HEX\$/g, hexColor)
        .replace(/\$ICON_PNG\$/g, 'https://dl-dielenergia-com.s3.sa-east-1.amazonaws.com/imgs/warning.png')

      for (const item of detections) {
        const prefsUser = await sqldb.NOTIFDESTS.getPrefsUser({ NOTIF_ID: item.notifId });
        const idioma = getLanguage(prefsUser[0]);
        item.details.text = item.details.text
          .replace(/\$ROOM_NAME\$/g, dutInfo.ROOM_NAME || '-')
          .replace(/\$UNIT_NAME\$/g, dutInfo.UNIT_NAME || '-')
          .replace(/\$UNIT_ID\$/g, String(dutInfo.UNIT_ID || '-'))
          .replace(/\#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE\#/g, t('verificamosTemperaturaAmbiente', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMaiorLimiteEstabelecidoDe', idioma))
          .replace(/\#AS\#/g, t('as', idioma))
          .replace(/\#VERIFICAMOS_NIVE_CO2_AMBIENTE\#/g, t('verificamoNivelCO2Ambiente', idioma))
          .replace(/\#ESTA_MAIOR_LIMITE_ESTABELECIDO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
          .replace(/\#ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO\#/g, t('esteveAcimaLimiteEstabelecidoDuranteHorarioFuncionamento', idioma))
          .replace(/\#ESTA_MENOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMenorQueLimiteEstabelecidoDe', idioma))

        item.details.html = emailBody
          .replace(/\$NOTIFICATION\$/g, t(notificationText, idioma))
          .replace(/\$DATEINFO\$/g, returnActualDate(false, idioma))
          .replace(/\$EMAIL_MESSAGE\$/g, item.details.html)
          .replace(/\$ROOM_NAME\$/g, dutInfo.ROOM_NAME || '-')
          .replace(/\$UNIT_NAME\$/g, dutInfo.UNIT_NAME || '-')
          .replace(/\$UNIT_ID\$/g, String(dutInfo.UNIT_ID || '-'))
          .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', idioma))
          .replace(/\#OLA\#/g, t('ola', idioma))
          .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', idioma))
          .replace(/\#EQUIPE\#/g, t('equipe', idioma))
          .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', idioma))
          .replace(/\#CONTATAR_EM\#/g, t('contatarEm', idioma))
          .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', idioma))
          .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', idioma))
          .replace(/\#VERIFICAMOS_QUE_TEMPERATURA_AMBIENTE\#/g, t('verificamosTemperaturaAmbiente', idioma))
          .replace(/\#NA_UNIDADE\#/g, t('naUnidade', idioma))
          .replace(/\#ESTA_MAIOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMaiorLimiteEstabelecidoDe', idioma))
          .replace(/\#AS\#/g, t('as', idioma))
          .replace(/\#VERIFICAMOS_NIVE_CO2_AMBIENTE\#/g, t('verificamoNivelCO2Ambiente', idioma))
          .replace(/\#ESTA_MAIOR_LIMITE_ESTABELECIDO\#/g, t('estaMaiorQueLimiteEstabelecidoDe', idioma))
          .replace(/\#ESTEVE_ACIMA_LIMITE_ESTABELECIDO_FUNCIONAMENTO\#/g, t('esteveAcimaLimiteEstabelecidoDuranteHorarioFuncionamento', idioma))
          .replace(/\#ESTA_MENOR_QUE_LIMITE_ESTABELECIDO\#/g, t('estaMenorQueLimiteEstabelecidoDe', idioma))

        sendNotification(item.notifId, item.devId, dutInfo.CLIENT_ID, item.details, now);
      }
    }).catch(logger.error)
  }

  if (detectionSchedule && detectionSchedule.length > 0) {
    Promise.resolve().then(async () => {
      for (const schedule of detectionSchedule) {
        const dutInfo = await sqldb.DUTS.getDutDetails({ DEV_ID: devId });

        await sqldb.NOTIF_SCHEDULE.w_insert({
          NOTIF_ID: schedule.notifId,
          DEV_ID: schedule.devId,
          COND_VAL_MAX: schedule.cond,
          UNIT_ID: dutInfo.UNIT_ID,
          ROOM_NAME: dutInfo.ROOM_NAME,
          TIMESTAMP_INI: schedule.init
        })
      }
    }).catch(logger.error)
  }
}

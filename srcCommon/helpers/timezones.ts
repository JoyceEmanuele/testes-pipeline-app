import * as momentTimezone from 'moment-timezone';
import sqldb from '../../srcCommon/db'
import { logger } from 'elastic-apm-node';
import { sendDevCommand_CommandWithTimezone } from '../iotMessages/devsCommands';
import { getSignalOffset } from '../../serviceApiAsync/crossData/timezones';
import { ramCaches_TIMEZONES_updateTimezoneId } from '../../serviceApiAsync/realTime/eventHooks';

export function calculateDateByTimezone(reqParams: { DATE?: string, TIMEZONE_ID?: number, TIMEZONE_AREA?: string, TIMEZONE_OFFSET?: number }) {
  const { DATE, TIMEZONE_ID, TIMEZONE_AREA, TIMEZONE_OFFSET } = reqParams;

  if (DATE && TIMEZONE_ID && TIMEZONE_AREA && TIMEZONE_OFFSET !== null) {
    const utcDate = momentTimezone.utc(DATE);

    const localDate = momentTimezone.tz(utcDate, TIMEZONE_AREA);

    const isDST = localDate.isDST();

    if (isDST) {
      localDate.utcOffset(TIMEZONE_OFFSET + 1); // Adiciona uma hora ao offset se estiver em horário de verão
    } else {
      localDate.utcOffset(TIMEZONE_OFFSET); // Adiciona o offset normal se não estiver em horário de verão
    }

    return localDate.format('YYYY-MM-DDTHH:mm:ss');
  }

  //Para dispositivos que não tem Cliente/Unidade, então não tem timezone definido
  return momentTimezone(DATE).format('YYYY-MM-DDTHH:mm:ss');
}

export const getOffsetTimezone = (reqParams: { TIMEZONE_ID?: number, TIMEZONE_AREA?: string, TIMEZONE_OFFSET?: number }) => {

  const { TIMEZONE_AREA, TIMEZONE_OFFSET } = reqParams;
  let offset = 0;

  if (TIMEZONE_AREA && TIMEZONE_OFFSET !== null) {
    momentTimezone.tz.setDefault('Etc/UTC');

    const isDST = momentTimezone.tz(TIMEZONE_AREA).isDST();

    if (isDST) {
      offset = TIMEZONE_OFFSET + 1; // Adiciona uma hora ao offset se estiver em horário de verão
    } else {
      offset = TIMEZONE_OFFSET; // Adiciona o offset normal se não estiver em horário de verão
    }
    return offset;
  }

  return offset;
}

async function calculateTimeByTimezone(reqParams: { TIME: string, TIMEZONE_ID: number }) {
  const timezoneInfo = reqParams.TIMEZONE_ID ? await sqldb.TIME_ZONES.getTimezone({ TIMEZONE_ID: reqParams.TIMEZONE_ID }) : null;

  if (timezoneInfo && reqParams.TIME) {
    momentTimezone.tz.setDefault('Etc/UTC');

    const utcDateTime = momentTimezone.utc(reqParams.TIME, 'HH:mm');

    const localDateTime = momentTimezone.tz(utcDateTime, timezoneInfo.area);

    const isDST = localDateTime.isDST();

    if (isDST) {
      localDateTime.utcOffset(timezoneInfo.offset + 1); // Adiciona uma hora ao offset se estiver em horário de verão
    } else {
      localDateTime.utcOffset(timezoneInfo.offset); // Adiciona o offset normal se não estiver em horário de verão
    }

    const formattedTime = localDateTime.format('HH:mm');

    return formattedTime;
  }

  return reqParams.TIME;
}

export async function sendCommandToDeviceWithConfigTimezone({ userId, devId, devCode }: { userId: string, devId?: number, devCode?: string }) {
  if (!userId || (!devCode && !devId)) throw Error('');
  let infoTimezone: Awaited<ReturnType<typeof sqldb.DEVICES.getInfoTimezone>>;
  try {
    if (!devCode && devId) {
      infoTimezone = await sqldb.DEVICES.getInfoTimezone({ devId });
    }
    if (devCode && !devId) {
      infoTimezone = await sqldb.DEVICES.getInfoTimezone({ devCode });
    }
    if (!infoTimezone) throw Error(`Dispositivo não encontrado para enviar configurações de offset. ${devCode} ${devId} ${userId}`).HttpStatus(403);
    ramCaches_TIMEZONES_updateTimezoneId(infoTimezone.DEV_ID, infoTimezone.TIMEZONE_ID);
    sendDevCommand_CommandWithTimezone(infoTimezone.DEV_ID, userId, infoTimezone.TIMEZONE_POSIX);
  } catch (err) {
    logger.error(`Erro ao buscar informações do dispositivo para enviar configurações de offset. ${devCode} ${devId} ${userId} ${err}`);
    throw Error(`Erro ao buscar informações do dispositivo para enviar configurações de offset. ${devCode} ${devId} ${userId} ${err}`).HttpStatus(500);
  }
}

export async function returnInfoTimezonePosix(devCode: string) {
  let posix = 'BRT3'
  const infoTimezone = await sqldb.DEVICES.getInfoTimezone({ devCode });
  if (infoTimezone) {
    posix = infoTimezone.TIMEZONE_POSIX;
  }
  return posix;
}

export function calculateTimeByTimezoneOfUnitProg(timestamp: string, gmt: number) {
  const newOffset = getSignalOffset(Number(gmt));
  const localDateTime = momentTimezone.tz(timestamp, `Etc/GMT${newOffset}`); /// pego o horario  e transformo na data com o timezone;
  const saoPauloLocalTime = localDateTime.clone().tz(`Etc/GMT0`).format('YYYY-MM-DD HH:mm ZZ'); //// transformo data do offset que quero.
  return saoPauloLocalTime;
}
export async function getOffsetDevCode(devCode: string) {
  let offset = -3;
  const infoTimezone = await sqldb.DEVICES.getInfoTimezone({ devCode: devCode });
  if (infoTimezone) offset = infoTimezone.TIME_ZONE_OFFSET
  return offset;
}

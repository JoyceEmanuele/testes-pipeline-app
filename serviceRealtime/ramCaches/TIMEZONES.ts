import { logger } from '../../srcCommon/helpers/logger';
import * as timezoneLoader from '../../srcCommon/helpers/ramcacheLoaders/timezoneLoader';
import * as momentTimezone from 'moment-timezone';

let deviceTimezoneInfo: {
  [deviceCode: string]: {
    idTimezone: number, // Id da tabela de Timezones
    lastHour: string, // última hora que foi enviado o comando para o dispositivo sincronizar através da função checkTelemetrySync;
  }
} = {};

let tableTimezone: {
  [idTimezone: string]: {
    timezoneArea: string,
    posix: string, // formato enviado para o dispositivo
    offset: number
  }
} = {};

export function tryGetDeviceInfoTimezone(deviceCode: string) {
  if (deviceTimezoneInfo[deviceCode]) {
    return deviceTimezoneInfo[deviceCode];
  }
  return {
      idTimezone: 31,
      lastHour: momentTimezone().format("YYYY/MM/DD HH:mm:ss"),
  };
}

export function tryGetTableInfoTimezone(idTimezone: string) {
  if (tableTimezone[idTimezone]) {
    return tableTimezone[idTimezone];
  }
  return {
    timezoneArea: 'America/Sao_Paulo',
    posix: tableTimezone["31"]?.posix || 'BRT3',
    offset: -3,
  };
}

export function updatePosixTableTimezone({ idTimezone, posix }: { idTimezone: string, posix: string }) {
  if (tableTimezone[idTimezone]) {
    tableTimezone[idTimezone].posix = posix;
  } else {
    logger.error(`Timezone with code id ${idTimezone} does not exist.`);
  }
}

export function updateTimezoneId({ deviceCode, timezoneId }: { deviceCode: string, timezoneId: number }) {
  if (deviceTimezoneInfo[deviceCode]) {
    deviceTimezoneInfo[deviceCode].idTimezone = timezoneId;
  } else {
    deviceTimezoneInfo[deviceCode] = {
      idTimezone: timezoneId,
      lastHour: momentTimezone().format("YYYY/MM/DD HH:mm:ss"),
    }
  }
}

export function updateLastHour({ deviceCode, lastHour }: { deviceCode: string, lastHour: string }) {
  if (deviceTimezoneInfo[deviceCode]) {
    deviceTimezoneInfo[deviceCode].lastHour = lastHour;
  } else {
    logger.error(`Device with code ${deviceCode} does not exist.`);
  }
};

export function deleteTimezoneDeviceInfo({ deviceCode }: { deviceCode: string }) {
  if (deviceTimezoneInfo[deviceCode]) {
    delete deviceTimezoneInfo[deviceCode];
  } else {
    logger.error(`Delete Timezone Cache Error - Device with code ${deviceCode} does not exist.`);
  }
}

export async function loadTimezoneDevices(reqParams?: {}) {
  deviceTimezoneInfo = await timezoneLoader.loaderDevicesTimezone();
}

export async function loadTableTimezone(reqParams?: {}) {
  tableTimezone = await timezoneLoader.loaderTableTimezone();
}

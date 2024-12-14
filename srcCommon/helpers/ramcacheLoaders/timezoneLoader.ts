import sqldb from '../../db'
import * as momentTimezone from 'moment-timezone';

export async function loaderDevicesTimezone() {
  const timezones = await sqldb.TIME_ZONES.getTimezonesOfDevices();
  let deviceTimezoneInfo: {
    [deviceCode: string]: {
      idTimezone: number, // Id da tabela de Timezones
      lastHour: string, // última hora que foi enviado o comando para o dispositivo sincronizar através da função checkTelemetrySync;
    }
  } = {};
  for (const timezoneDevice of timezones) {
    deviceTimezoneInfo[timezoneDevice.DEVICE_CODE] = {
      idTimezone: timezoneDevice.TIMEZONE_ID,
      lastHour: momentTimezone().format("YYYY/MM/DD HH:mm:ss"),
    }
  }
  return deviceTimezoneInfo;
}

export async function loaderTableTimezone() {
  const table = await sqldb.TIME_ZONES.getTableTimezone();
  let tableTimezone: {
    [idTimezone: string]: {
      timezoneArea: string,
      posix: string,
      offset: number
    }
  } = {};
  for (const timezone of table) {
    tableTimezone[timezone.id.toString()] = {
      timezoneArea: timezone.area,
      posix: timezone.posix,
      offset: timezone.offset,
    }
  }
  return tableTimezone;
}
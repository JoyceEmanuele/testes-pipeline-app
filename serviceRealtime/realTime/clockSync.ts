import configfile from "../../configfile";
import { sendSyncTimestamp } from "../../srcCommon/iotMessages/devsCommands";
import * as eventWarn from '../../srcCommon/helpers/eventWarn';
import * as ramCaches from '../ramCaches';
import * as momentTimezone from 'moment-timezone';
import { calculateDateByTimezone } from "../../srcCommon/helpers/timezones";

export function checkTelemetrySync(timestamp: string, devId: string, topic: string) {
  if (!timestamp) return;
  if (!devId) return;
  if (devId === configfile.DEV_EXCLUDE_TIMEZONE) return;
  const dateSistem = momentTimezone();
  const deviceInfoTimezone = ramCaches.TIMEZONES.tryGetDeviceInfoTimezone(devId);
  const timestampToDate = momentTimezone(timestamp);
  if (deviceInfoTimezone) {
    const timezoneInfo = ramCaches.TIMEZONES.tryGetTableInfoTimezone(deviceInfoTimezone.idTimezone.toString());
    const lastDateSendCommand = momentTimezone(deviceInfoTimezone.lastHour, "YYYY/MM/DD HH:mm:ss");
    const utcDate = new Date().toISOString();
    const now = momentTimezone(calculateDateByTimezone({ DATE: utcDate, TIMEZONE_AREA: timezoneInfo.timezoneArea, TIMEZONE_OFFSET: timezoneInfo.offset, TIMEZONE_ID: deviceInfoTimezone.idTimezone  })); // pegando horario atual no local indicado
    if ((dateSistem.diff(lastDateSendCommand, 'minutes') > 2) && Math.abs(now.valueOf() - timestampToDate.valueOf()) > 30000) { // se tiver passado 2 minutos do ultimo envio e a diferença do tempo for de 30s; 
      sendSyncTimestamp(devId, true, true, '[SYSTEM]', timezoneInfo.posix);
      ramCaches.TIMEZONES.updateLastHour({deviceCode: devId, lastHour: dateSistem.format("YYYY/MM/DD HH:mm:ss")});
      const shouldBe = now.format('YYYY/MM/DD HH:mm:ss');
      const error_s = Math.abs(now.valueOf() - timestampToDate.valueOf()) / 1000;
      eventWarn.devTimestampError('wrong time', devId, topic, { devId, timestamp, shouldBe, error_s });
    }
  }
}

export function getDevIdFromSyncRequest(payload: string): string {
  // sync: "SYNC DAC3-c2914A"
  if (payload.startsWith("SYNC ")) {
    return payload.substring(5); // 'SYNC '.length
  }
  if (payload.startsWith("TIME ")) {
    return payload.substring(5); // 'TIME '.length
  }
  return null;
}

export { sendSyncTimestamp };

import { API_Internal } from '../api-internal';
import { getFull_deviceLastTs, getFull_lastMessages } from '../ramCaches/lastMessages';

export const getDevicesLastTelemetries: API_Internal['/diel-internal/realtime/getDevicesLastTelemetries'] = async function (reqParams) {
  const lastMessages = getFull_lastMessages();
  if (!reqParams.devIds) {
    return { lastMessages };
  }
  const filtered: typeof lastMessages = {};
  for (const devId of reqParams.devIds) {
    filtered[devId] = lastMessages[devId];
  }
  return { lastMessages: filtered };
}

export const getDevicesLastTS: API_Internal['/diel-internal/realtime/getDevicesLastTS'] = async function (reqParams) {
  const deviceLastTs = getFull_deviceLastTs();
  if (!reqParams.devIds) {
    return { deviceLastTs };
  }
  const filtered: typeof deviceLastTs = {};
  for (const devId of reqParams.devIds) {
    filtered[devId] = deviceLastTs[devId];
  }
  return { deviceLastTs: filtered };
}

import * as dielServices from '../dielServices';
import * as devInfo from '../helpers/devInfo';
import { DriConfig } from './driData';

type DevsLastMessages = ReturnType<dielServices.ApiInternal_RealtimeRust['/diel-internal/realtime-rs/getDevicesLastTelemetries']>;
export type { DevsLastMessages };

export async function loadLastTelemetries_dac(filter: { devIds?: string[] }) {
  const { lastMessages, lastDacTelemetry } = await loadLastTelemetries(filter);
  return { lastMessages, lastDacTelemetry };
}

export async function loadLastTelemetries_dut(filter: { devIds?: string[] }) {
  const { lastMessages, lastDutTelemetry, lastDutAutTelemetry } = await loadLastTelemetries(filter);
  return { lastMessages, lastDutTelemetry, lastDutAutTelemetry };
}

export async function loadLastTelemetries_dam(filter: { devIds?: string[] }) {
  const { lastMessages, lastDamTelemetry } = await loadLastTelemetries(filter);
  return { lastMessages, lastDamTelemetry };
}

export async function loadLastTelemetries_dri(filter: { devIds?: string[] }) {
  const { lastMessages, lastDriTelemetry } = await loadLastTelemetries(filter);
  return { lastMessages, lastDriTelemetry };
}

export async function loadLastTelemetries(filter: { devIds?: string[] }) {
  let lastMessages: DevsLastMessages['lastMessages'] = {};
  if ((!filter.devIds) || (filter.devIds.length > 0)) {
    const { lastMessages: realLastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: filter.devIds });
    lastMessages = realLastMessages;
  }

  return {
    lastMessages,
    lastDacTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDac(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDamTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDam(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDutTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDut(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDutAutTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDutAut(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDriTelemetry(devId: string, driCfg: DriConfig) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDri(lastCommInfo, driCfg) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDriTelemetry_raw(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDri_raw(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDmaTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDma(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDmtTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDmt(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    lastDalTelemetry(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const lastTelemetry = devInfo.lastTelemetryAsDal(lastCommInfo) || undefined;
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
    },
    connectionStatus(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
      return status;
    },
    lastTS(devId: string) {
      const lastCommInfo = this.lastMessages[devId];
      return lastCommInfo?.ts;
    },
  }
}

export async function loadLastMessagesTimes(filter: { devIds?: string[] }) {
  let deviceLastTs: {
    [devId: string]: number;
  } = {};
  if ((!filter.devIds) || (filter.devIds.length > 0)) {
    const { deviceLastTs: realDeviceLastTs } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTS', { devIds: filter.devIds });
    deviceLastTs = realDeviceLastTs;
  }

  return {
    deviceLastTs,
    connectionStatus(devId: string) {
      const lastTs = this.deviceLastTs[devId];
      const status = (lastTs && devInfo.calculateStatus(lastTs, Date.now())) || undefined;
      return status;
    },
    lastTS(devId: string) {
      const lastTs = this.deviceLastTs[devId];
      return lastTs;
    },
  };
}

export async function loadDeviceConnectionStatus(devId: string) {
  const { deviceLastTs } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTS', { devIds: [devId] });
  const lastTs = deviceLastTs[devId];
  const status = (lastTs && devInfo.calculateStatus(lastTs, Date.now())) || undefined;
  return { status, lastTs };
}

async function loadLastDacTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDac(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
async function loadLastDamTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDam(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
export async function loadLastDutTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDut(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
async function loadLastDutAutTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDutAut(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
async function loadLastDriTelemetry(devId: string, driCfg: DriConfig) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDri(lastCommInfo, driCfg) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
async function loadLastDmaTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDma(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
export async function loadLastDmtTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDmt(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}
async function loadLastDalTelemetry(devId: string) {
  const { lastMessages } = await dielServices.realtimeRustInternalApi('/diel-internal/realtime-rs/getDevicesLastTelemetries', { devIds: [devId] });
  const lastCommInfo = lastMessages[devId];
  const lastTelemetry = devInfo.lastTelemetryAsDal(lastCommInfo) || undefined;
  const status = (lastCommInfo && devInfo.calculateStatus(lastCommInfo?.ts, Date.now())) || undefined;
  return { lastTelemetry, status, lastMessageTS: lastCommInfo?.ts };
}

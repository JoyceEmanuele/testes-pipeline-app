import * as damData from "../../srcCommon/helpers/damData";

let lastMessages: {
  [devId: string]: {
    ts: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
    telemetry?: any // último JSON que chegou em tópico 'data/...'
  }
} = {};

export function onDamTelemetry(devId: string, payload: any) {
  let devLastMessages = lastMessages[devId];

  if (devLastMessages) {
    devLastMessages.ts = Date.now();
    devLastMessages.telemetry = payload;
  } else {
    devLastMessages = lastMessages[devId] = {
      ts: Date.now(),
      telemetry: payload,
    };
  }
}

export const lastDamTelemetry = function (devId: string) {
  const lastCommInfo = lastMessages[devId];
  const telemetry = lastCommInfo?.telemetry;
  const lastTelemetry = (telemetry && damData.processRawTelemetry(telemetry)) || undefined;
  return {
    lastTelemetry,
    lastMessageTS: lastCommInfo?.ts,
  };
}

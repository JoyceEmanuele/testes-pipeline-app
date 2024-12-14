import * as eventWarn from '../helpers/eventWarn';
import * as iotMessageListener from './iotMessageListener';
import { TelemetryPackRawDutAut } from '../types/devicesMessages';
import { logger } from '../helpers/logger';

export type IotMessageEvents = {
  onMessageAny: null | ((payload: string, topic: string) => void)
  onOldSyncMessage: null | ((payload: string, topic: string) => void)
  onNeedCheckTelemetrySync: null | ((timestamp: string, devId: string, topic: string) => void)

  onDapEvent: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlAll: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataAll: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlSync: null | ((iotMsg: ReceivedIotMessage) => void)
  onUnhandledDataTopic: null | ((iotMsg: ReceivedIotMessage) => void)

  onDataDAC: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDUT: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDAM: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDAL: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDMA: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDMT: null | ((iotMsg: ReceivedIotMessage) => void)
  onDataDRI: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDAC: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDUT: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDAM: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDAL: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDMA: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDMT: null | ((iotMsg: ReceivedIotMessage) => void)
  onControlDRI: null | ((iotMsg: ReceivedIotMessage) => void)
};

type ReceivedIotMessage = {
  payload: any
  topic: string

  // shiftedServerTime?: Date
  payloadShiftedTs?: Date
  wasOffline?: boolean
};

let eventsCallbacks: IotMessageEvents|null = null;
export function setEventsCallbacks(cbs: IotMessageEvents) {
  eventsCallbacks = cbs;
}

export function iotMessageReceived (topic: string, payloadStr: string) {
  eventsCallbacks?.onMessageAny?.(payloadStr, topic);

  // O tópico "sync" era usado antigamente, o payload não tem formato JSON
  if (topic === 'sync') {
    try {
      eventsCallbacks?.onOldSyncMessage?.(payloadStr, topic);
    } catch(err) { logger.error(err); }
    return;
  }

  // O "payload" até este ponto era string, a partir daqui "payload" agora é um objeto JSON
  let payload: { dev_id: string };
  try {
    payload = JSON.parse(payloadStr);
  } catch (err) {
    logger.error(err);
    eventWarn.topicError('Error parsing JSON', topic, String(payloadStr), err);
    return
  }

  if (!payload.dev_id) {
    const devIdFromTopic = getDevIdFromTopic(topic);
    if (devIdFromTopic) {
      payload.dev_id = devIdFromTopic;
    }
  }

  if ((!payload.dev_id) || (typeof payload.dev_id !== 'string')) {
    eventWarn.topicError('Payload sem dev_id', topic, payload);
    return;
  }

  // TODO: muitos serviços vão querer usar só alguns dev_ids, e o realtime vai querer todos. Aqui parece um bom lugar para economizar processamento.

  topic = removeIdFromTopic(topic, payload.dev_id);

  try {
    if (topic.startsWith('data/')) {
      messageOnData(topic, payload);
    }
    else if (topic.startsWith('control/')) {
      messageOnControl({
        topic,
        payload,
      });
    }
    else if (topic.startsWith('dapevent/')) {
      eventsCallbacks?.onDapEvent?.({
        topic,
        payload,
      });
    }
    else {
      eventWarn.topicError('Unknown topic', topic, payload);
    }
  } catch (err) {
    logger.error(err);
  }
}

function messageOnControl(iotMsg: ReceivedIotMessage) {
  eventsCallbacks?.onControlAll?.(iotMsg);
  const devId = iotMsg.payload.dev_id;
  const topic = iotMsg.topic;

  if (iotMsg.payload.msgtype === 'SYNC') {
    eventsCallbacks?.onControlSync?.(iotMsg);
    return;
  }

  if (topic === 'control/dac') {
    eventsCallbacks?.onControlDAC?.(iotMsg);
    iotMessageListener.dacControlReceived(iotMsg.payload);
    return;
  }

  if (topic === 'control/dut') {
    if (devId.startsWith('DUT')) {
      eventsCallbacks?.onControlDUT?.(iotMsg);
      iotMessageListener.dutControlReceived(iotMsg.payload);
      return;
    }
    if (devId.startsWith('DMA')) {
      eventsCallbacks?.onControlDMA?.(iotMsg);
      iotMessageListener.dmaControlReceived(iotMsg.payload);
      return;
    }
    if (devId.startsWith('DMT')) {
      eventsCallbacks?.onControlDMT?.(iotMsg);
      iotMessageListener.dmtControlReceived(iotMsg.payload);
      return;
    }
  }

  if (topic === 'control/dam') {
    if (devId.startsWith('DAM')) {
      eventsCallbacks?.onControlDAM?.(iotMsg);
      iotMessageListener.damControlReceived(iotMsg.payload);
      return;
    }
    if (devId.startsWith('DAL')) {
      eventsCallbacks?.onControlDAL?.(iotMsg);
      iotMessageListener.dalControlReceived(iotMsg.payload);
      return;
    }
  }

  if (topic === 'control/dri') {
    eventsCallbacks?.onControlDRI?.(iotMsg);
    iotMessageListener.driControlReceived(iotMsg.payload);
    return;
  }

  if (topic === 'control/dal') {
    eventsCallbacks?.onControlDAL?.(iotMsg);
    iotMessageListener.dalControlReceived(iotMsg.payload);
    return;
  }

  if (topic === 'control/dma') {
    eventsCallbacks?.onControlDMA?.(iotMsg);
    iotMessageListener.dmaControlReceived(iotMsg.payload);
    return;
  }

  if (topic === 'control/dmt') {
    eventsCallbacks?.onControlDMT?.(iotMsg);
    iotMessageListener.dmtControlReceived(iotMsg.payload);
    return;
  }

  eventWarn.topicError('Unknown topic/device-type', topic, iotMsg.payload);
}

function messageOnData(topic: string, payload: any): void {
  const devId = payload.dev_id;

  if (!payload.timestamp) {
    eventWarn.devError('No timestamp', devId, topic, payload);
    return;
  }
  const shiftedServerTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
  let payloadShiftedTs = new Date(payload.timestamp + 'Z')
  const clockDelta = payloadShiftedTs.getTime() - shiftedServerTime.getTime();

  eventsCallbacks?.onNeedCheckTelemetrySync?.(payload.timestamp, devId, topic);

  if (clockDelta > 10 * 60 * 1000) payloadShiftedTs = shiftedServerTime;
  if (clockDelta < -7 * 24 * 60 * 60 * 1000) payloadShiftedTs = shiftedServerTime;
  if (payload.timestamp.length > 19) payload.timestamp = payload.timestamp.substr(0, 19);

  const iotMsg: ReceivedIotMessage = {
    topic,
    payload,
    payloadShiftedTs
  };

  eventsCallbacks?.onDataAll?.(iotMsg);

  if (topic === 'data/dac') {
    eventsCallbacks?.onDataDAC?.(iotMsg);
    // iotMessageListener.dacTelemetryReceived(iotMsg.payload);
    return;
  }

  if (topic === 'data/dut') {
    if (devId.startsWith("DUT")) {
      eventsCallbacks?.onDataDUT?.(iotMsg);
      if ((iotMsg.payload as TelemetryPackRawDutAut).Mode) {
        iotMessageListener.dutAutTelemetryReceived(iotMsg.payload);
      } else {
        // iotMessageListener.dutTelemetryReceived(iotMsg.payload);
      }
      return;
    }
    if (devId.startsWith("DMA")) {
      eventsCallbacks?.onDataDMA?.(iotMsg);
      // iotMessageListener.dmaTelemetryReceived(iotMsg.payload);
      return;
    }
    if (devId.startsWith("DMT")) {
      eventsCallbacks?.onDataDMT?.(iotMsg);
      // iotMessageListener.dmtTelemetryReceived(iotMsg.payload);
      return;
    }
  }

  if (topic === 'data/dam') {
    if (devId.startsWith("DAM")) {
      eventsCallbacks?.onDataDAM?.(iotMsg);
      iotMessageListener.damTelemetryReceived(iotMsg.payload);
      return;
    }
    if (devId.startsWith("DAL")) {
      eventsCallbacks?.onDataDAL?.(iotMsg);
      iotMessageListener.dalTelemetryReceived(iotMsg.payload);
      return;
    }
  }

  if (topic === 'data/dri') {
    eventsCallbacks?.onDataDRI?.(iotMsg);
    // iotMessageListener.driTelemetryReceived(iotMsg.payload);
    return;
  }

  if (topic === 'data/dal') {
    eventsCallbacks?.onDataDAL?.(iotMsg);
    iotMessageListener.dalTelemetryReceived(iotMsg.payload);
    return;
  }

  if (topic === 'data/dma') {
    eventsCallbacks?.onDataDMA?.(iotMsg);
    // iotMessageListener.dmaTelemetryReceived(iotMsg.payload);
    return;
  }

  if (topic === 'data/dmt') {
    eventsCallbacks?.onDataDMT?.(iotMsg);
    // iotMessageListener.dmtTelemetryReceived(iotMsg.payload);
    return;
  }

  eventsCallbacks?.onUnhandledDataTopic?.(iotMsg);
  eventWarn.topicError('Unknown topic/device-type', topic, iotMsg.payload);
}

const getDevIdFromTopic = (topic: string) => {
  let devIdFromTopic = null;
  const topicSplitted = topic.split('/');
  if (topicSplitted.length >= 3 && topicSplitted[2].length === 12) {
    devIdFromTopic = topicSplitted[2];
  }

  return devIdFromTopic;
}

const removeIdFromTopic = (topic: string, devId: string) => {
  if ((topic.length > devId.length) && topic.endsWith(devId) && (topic[topic.length - devId.length - 1] === '/')) {
    // Tópicos no formato "data/dut/DUT12345" são convertidos para o formato "data/dut"
    return topic.substring(0, topic.length - devId.length - 1);
  }
  return topic;
}

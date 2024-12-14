import { logger } from '../helpers/logger';
import * as eventWarn from '../helpers/eventWarn';
import * as iotMessageListener from './iotMessageListener';
import { TelemetryPackRawDutAut } from '../types/devicesMessages';

export function iotMessageReceived (topic: string, payload: any) {
  // O tópico "sync" era usado antigamente, o payload não tem formato JSON
  if (topic === 'sync') {
    return;
  }

  // O "payload" até este ponto era string, a partir daqui "payload" agora é um objeto JSON
  try {
    payload = JSON.parse(payload);
  } catch (err) {
    logger.error(err);
    eventWarn.topicError('Error parsing JSON', topic, String(payload), err);
    return
  }

  if ((!payload.dev_id) || (typeof payload.dev_id !== 'string')) {
    eventWarn.topicError('Payload sem dev_id', topic, payload);
    return;
  }
  const devId = payload.dev_id;
  if ((topic.length > devId.length) && topic.endsWith(devId) && (topic[topic.length - devId.length - 1] === '/')) {
    // Tópicos no formato "data/dut/DUT12345" são convertidos para o formato "data/dut"
    topic = topic.substring(0, topic.length - devId.length - 1);
  }

  try {
    if (topic.startsWith('data/')) {
      messageOnData(topic, payload);
    }
    else if (topic.startsWith('control/')) {
      messageOnControl(topic, payload);
    }
    else {
      eventWarn.topicError('Unknown topic', topic, payload);
    }
  } catch (err) {
    logger.error(err);
  }
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

  if (clockDelta > 10 * 60 * 1000) payloadShiftedTs = shiftedServerTime;
  if (clockDelta < -7 * 24 * 60 * 60 * 1000) payloadShiftedTs = shiftedServerTime;
  if (payload.timestamp.length > 19) payload.timestamp = payload.timestamp.substr(0, 19);

  if (topic === 'data/dac') {
    // iotMessageListener.dacTelemetryReceived(payload, payloadShiftedTs).catch(eventWarn.checkUnexpectedError);
    return;
  }

  if (topic === 'data/dut') {
    if (devId.startsWith("DUT")) {
      if ((payload as TelemetryPackRawDutAut).Mode) {
        iotMessageListener.dutAutTelemetryReceived(payload)
      } else {
        // iotMessageListener.dutTelemetryReceived(payload, payloadShiftedTs).catch(eventWarn.checkUnexpectedError);
      }
      return;
    }
    if (devId.startsWith("DMA")) {
      // iotMessageListener.dmaTelemetryReceived(payload, payloadShiftedTs).catch(eventWarn.checkUnexpectedError);
      return;
    }
    if (devId.startsWith("DMT")) {
      // iotMessageListener.dmtTelemetryReceived(payload, payloadShiftedTs).catch(eventWarn.checkUnexpectedError);
      return;
    }
    eventWarn.topicError('Unknown topic/device-type', topic, payload);
    return;
  }

  if (topic === 'data/dam') {
    if (devId.startsWith("DAM")) {
      iotMessageListener.damTelemetryReceived(payload);
      return;
    }
    if (devId.startsWith("DAL")) {
      iotMessageListener.dalTelemetryReceived(payload);
      return;
    }
    eventWarn.topicError('Unknown topic/device-type', topic, payload);
    return;
  }

  if (topic === 'data/dri') {
    // iotMessageListener.driTelemetryReceived(payload, payloadShiftedTs).catch(eventWarn.checkUnexpectedError);
    return;
  }

  if (topic === 'data/dal') {
    iotMessageListener.dalTelemetryReceived(payload);
    return;
  }

  if (topic === 'data/dma') {
    // iotMessageListener.dmaTelemetryReceived(payload);
    return;
  }

  if (topic === 'data/dmt') {
    // iotMessageListener.dmtTelemetryReceived(payload);
    return;
  }

  eventWarn.topicError('Unknown topic', topic, payload);
}

function messageOnControl(topic: string, payload: any) {
  const devId = payload.dev_id;

  if (payload.msgtype === 'SYNC') {
    return;
  }

  if (topic === 'control/dac') {
    iotMessageListener.dacControlReceived(payload);
    return;
  }

  if (topic === 'control/dut') {
    if (devId.startsWith('DUT')) {
      iotMessageListener.dutControlReceived(payload);
      return;
    }
    if (devId.startsWith('DMA')) {
      iotMessageListener.dmaControlReceived(payload);
      return;
    }
    if (devId.startsWith('DMT')) {
      iotMessageListener.dmtControlReceived(payload);
      return;
    }
  }

  if (topic === 'control/dam') {
    if (devId.startsWith('DAM')) {
      iotMessageListener.damControlReceived(payload);
      return;
    }
    if (devId.startsWith('DAL')) {
      iotMessageListener.dalControlReceived(payload);
      return;
    }
  }

  if (topic === 'control/dri') {
    iotMessageListener.driControlReceived(payload);
    return;
  }

  if (topic === 'control/dal') {
    iotMessageListener.dalControlReceived(payload);
    return;
  }

  if (topic === 'control/dma') {
    iotMessageListener.dmaControlReceived(payload);
    return;
  }

  if (topic === 'control/dmt') {
    iotMessageListener.dmtControlReceived(payload);
    return;
  }

  eventWarn.topicError('Unknown topic/device-type', topic, payload);
}

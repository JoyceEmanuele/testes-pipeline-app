import * as eventWarn from '../../srcCommon/helpers/eventWarn';
import { logger, ctrlLogger } from '../../srcCommon/helpers/logger';
import * as lastMessages from '../ramCaches/lastMessages';
import * as ramCaches from '../ramCaches';
import * as devsControlMessages from '../devsControlMessages'
import * as dacTelemetry from '../dac/dacTelemetry'
import * as damTelemetry from '../dam/damTelemetry'
import * as dutTelemetry from '../dut/dutTelemetry'
import * as dmaTelemetry from '../dma/dmaTelemetry'
import * as driTelemetry from '../dri/driTelemetry'
import * as dmtTelemetry from '../dmt/dmtTelemetry'
import * as dalTelemetry from '../dal/dalTelemetry'
import * as devTools from '../devTools'
import * as devJustSeen from '../realTime/devJustSeen'
import { checkTelemetrySync, getDevIdFromSyncRequest, sendSyncTimestamp } from '../realTime/clockSync'
import logSubscribers from './logSubscribers';
import { IotMessageEvents } from '../../srcCommon/iotMessages/topicRouter';
import { TopicType } from '../../srcCommon/types';

export const rtcb: IotMessageEvents = {
  onMessageAny(payload, topic) { // onEveryMessage
    // Existe uma função nas ferramentas de desenvolvimento para visualizar todas as mensagens de um dispositivo
    try {
      devTools.iotMessageReceived(topic, payload)
    } catch (err) {
      logger.error(err);
    }
  },
  onOldSyncMessage (payload, topic) {
    // O tópico "sync" era usado antigamente, o payload não tem formato JSON
    const devId = getDevIdFromSyncRequest(payload);
    if (devId) {
      logSubscribers.log_dev_ctrl(
        devId,
        topic,
        payload
      );
      const deviceInfoTimezone = ramCaches.TIMEZONES.tryGetDeviceInfoTimezone(devId);
      const timezoneInfo = ramCaches.TIMEZONES.tryGetTableInfoTimezone(deviceInfoTimezone.idTimezone.toString());
      sendSyncTimestamp(devId, true, false, '[SYSTEM]', timezoneInfo.posix);
    }
  },
  onNeedCheckTelemetrySync (timestamp, devId, topic) {
    checkTelemetrySync(timestamp, devId, topic);
  },

  onUnhandledDataTopic(iotMsg) {
    lastMessages.onDataMessage(iotMsg.payload.dev_id, iotMsg.payload, null);
  },
  onControlSync(iotMsg) {
    try {
      if (iotMsg.payload.dev_id) {
        const deviceInfoTimezone = ramCaches.TIMEZONES.tryGetDeviceInfoTimezone(iotMsg.payload.dev_id);
        const timezoneInfo = ramCaches.TIMEZONES.tryGetTableInfoTimezone(deviceInfoTimezone.idTimezone.toString());
        sendSyncTimestamp(iotMsg.payload.dev_id, false, true, '[SYSTEM]', iotMsg.payload.GMT);
        sendSyncTimestamp(iotMsg.payload.dev_id, true, false, '[SYSTEM]', timezoneInfo.posix);
      }
    } catch(err) { logger.error(err); }
  },

  onDapEvent: null, // Tópico usado pelo API-Server para avisar os iotrelays que algum dispositivo mudou a configuração
  
  onDataAll(iotMsg) {
    const { wasOffline } = lastMessages.onDataMessage(iotMsg.payload.dev_id, iotMsg.payload, iotMsg.topic.substring(5 /* "data/".length */) as TopicType);
    iotMsg.wasOffline = wasOffline;
  },
  onControlAll(iotMsg) {
    ctrlLogger(iotMsg.payload.dev_id, iotMsg.payload);
    const { wasOffline } = lastMessages.onControlMessage(iotMsg.payload.dev_id, iotMsg.payload);
    iotMsg.wasOffline = wasOffline;
  
    logSubscribers.log_dev_ctrl(
      iotMsg.payload.dev_id,
      iotMsg.topic,
      iotMsg.payload
    );
  },

  onControlDAC(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dac', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DAC(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDUT(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dut', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DUT(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDAM(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dam', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DAM(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDAL(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dal', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DAM(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDMA(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dma', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DMA(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDMT(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dmt', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DMT(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },
  onControlDRI(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dri', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then(() => devsControlMessages.controlMessageReceived_DRI(iotMsg.payload)
      .catch(eventWarn.checkUnexpectedError));
  },

  onDataDAC(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dac', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && dacTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDUT(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dut', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && dutTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDAM(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dam', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && damTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDAL(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dal', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && dalTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDMA(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dma', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && dmaTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDMT(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dmt', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && dmtTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
  onDataDRI(iotMsg) {
    devJustSeen.receivedDevMsg(iotMsg.payload.dev_id, 'dri', iotMsg.wasOffline, iotMsg.payload.bt_id || null, iotMsg.payload.MAC)
      .then((devReady) => devReady && driTelemetry.telemetryReceived(iotMsg.payload, iotMsg.payloadShiftedTs))
      .catch(eventWarn.checkUnexpectedError);
  },
};

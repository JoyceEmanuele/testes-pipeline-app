import { logger } from '../../srcCommon/helpers/logger';
import { onDutTelemetry } from '../realTime/ecoMode';
import { IotMessageEvents } from '../../srcCommon/iotMessages/topicRouter';

export const rtcb: IotMessageEvents = {
  onDataDUT(iotMsg) {
    onDutTelemetry(iotMsg.payload?.dev_id, iotMsg.payload, iotMsg.payloadShiftedTs)
      .catch(logger.error);
  },

  onMessageAny: null,
  onOldSyncMessage: null,
  onNeedCheckTelemetrySync: null,
  onUnhandledDataTopic: null,
  onControlSync: null,
  onDataAll: null,
  onControlAll: null,
  onControlDAC: null,
  onControlDUT: null,
  onControlDAM: null,
  onControlDAL: null,
  onControlDMA: null,
  onControlDMT: null,
  onControlDRI: null,
  onDataDAC: null,
  onDataDAM: null,
  onDataDMA: null,
  onDataDMT: null,
  onDataDRI: null,
  onDataDAL: null,
  onDapEvent: null,
};
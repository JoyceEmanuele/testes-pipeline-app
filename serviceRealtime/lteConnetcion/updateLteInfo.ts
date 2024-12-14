import { DevLTEDebugSystemInfo } from "../../srcCommon/types/devicesMessages";
import sqldb from '../../srcCommon/db'

export const updateLTENetwork = async (payload: DevLTEDebugSystemInfo) => {
  if (payload.LTE_ICCID || payload.LTE_NETWORK || payload.LTE_OPERATOR || payload.LTE_RSRP) {
    await sqldb.DEVICES.w_updateInfo({
      DEVICE_CODE: payload.dev_id,
      LTE_ICCID: payload.LTE_ICCID,
      LTE_NETWORK: payload.LTE_NETWORK,
      LTE_OPERATOR: payload.LTE_OPERATOR,
      LTE_RSRP: payload.LTE_RSRP,
  }, '[SYSTEM]');
  }
};

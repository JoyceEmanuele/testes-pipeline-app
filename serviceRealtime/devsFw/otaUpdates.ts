import sqldb from '../../srcCommon/db'
import { DevOtaConfirmation, ControlMsgFirmwareVersion } from '../../srcCommon/types/devicesMessages'
import { confirmOtaFwVersion } from '../../srcCommon/iotMessages/devsCommands'
import { logger } from '../../srcCommon/helpers/logger';
import * as dielServices from '../../srcCommon/dielServices'
import configfile from '../configfile'

/** Salva no banco de dados que o dispositivo recebeu o aviso de OTA */
export async function deviceReceivedOtaCommand (payload: DevOtaConfirmation) {
  if (payload.ota_command.path && payload.ota_command.path.startsWith('/ota-check-cert')) {
    return;
  }
  await sqldb.DEVFWVERS.w_update({
    DEV_ID: payload.dev_id,
    TARGFW_RCVDATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    TARGFW_RCVPATH: payload.ota_command.path || null,
  }, '[SYSTEM]');
}

/** Salva no banco de dados a versão atual do dispositivo, e se necessário envia a mensagem de confirmação de OTA para o firmware */
export async function deviceInformedFwVersion (payload: ControlMsgFirmwareVersion) {
  let CURRFW_VLDSENT: string = undefined;
  if (payload.firmware_status === "Pending" || payload.firmware_status === undefined) {
    if (!configfile.devicesReadOnlyMode) {
      confirmOtaFwVersion(payload.dev_id, '[SYSTEM]');
    }
    CURRFW_VLDSENT = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300';
  }
  await sqldb.DEVFWVERS.w_insertIgnore({
    DEV_ID: payload.dev_id,
    HW_TYPE: payload.hardware_type,
  }, null);
  await sqldb.DEVFWVERS.w_update({
    DEV_ID: payload.dev_id,
    HW_TYPE: payload.hardware_type,
    CURRFW_VERS: payload.firmware_version || null,
    CURRFW_MSG: JSON.stringify(payload),
    CURRFW_DATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    CURRFW_VLDSENT,
  }, null);
}

/** Quando o dispositivo fica online o DAP chama esta função para verificar se precisa enviar atualização de firmware */
export async function checkDevNeedOta (devId: string) {
  try {
    if (configfile.devicesReadOnlyMode) return;
    const devInf = await sqldb.DEVFWVERS.getDevFwInfo({ devId });
    if (!devInf) return;
    if (!devInf.TARGFW_REQDATE) return;
    if (devInf.TARGFW_RCVDATE > devInf.TARGFW_REQDATE) return;
    await dielServices.bgtasksInternalApi('/diel-internal/bgtasks/addDeviceToOtaQueue', { devId });
  } catch (err) { logger.error(err); }
}

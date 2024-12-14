import * as iotMessageListener from '../iotMessages/iotMessageListener'
import { ControlMsgFirmwareVersion } from '../types/devicesMessages'
import { sendOtaCommand } from '../iotMessages/devsCommands'
import { logger } from '../../srcCommon/helpers/logger'

export async function getCurrentFirmwareVersion (devId: string, userId: string) {
  if (!devId) throw Error('There was an error! Missing devId.').HttpStatus(400)
  if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(devId)) logger.info(`DBG-DUO-P06 ${devId}`);

  const promise = iotMessageListener.waitForDevControl((payload) => {
    if ((payload && payload.dev_id) !== devId) return false;
    if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(devId)) logger.info(`DBG-DUO-P07 ${devId}`);
    if ((<any>payload).firmware_version) {
      return true
    }
    return false
  }, 5000)
  sendOtaCommand(devId, { ['version-request']: 1 }, userId)
  return <Promise<ControlMsgFirmwareVersion>>promise
}

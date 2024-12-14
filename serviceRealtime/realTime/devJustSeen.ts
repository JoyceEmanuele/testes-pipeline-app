import {
  ChangeType,
  RecHealthData,
} from '../../srcCommon/types';
import * as otaUpdates from '../devsFw/otaUpdates';
import sqldb from '../../srcCommon/db';
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse';
import { checkDevPendingSched } from '../../srcCommon/helpers/automationControl';
import { checkUnexpectedError } from '../../srcCommon/helpers/eventWarn';
import { isTemporaryId } from '../../srcCommon/helpers/devInfo';
import { logger } from '../../srcCommon/helpers/logger'
import { sendDmaCommand_mode } from '../../srcCommon/iotMessages/devsCommands';
import { now_shiftedTS_s } from '../../srcCommon/helpers/dates';
import { verifyMacDevice } from '../devsMac/macUpdates';
import { ramCaches_TIMEZONES_updateTimezoneId } from '../../serviceApiAsync/realTime/eventHooks';

// RAM-CACHE
let devWasChecked: {
  [devId: string]: { checked: boolean, hasMac: boolean}
} = {};

async function isManufactuerDev (devId: string): Promise<number> {
  if (devId.length !== 'DEV122331999'.length) return null;
  const row = await sqldb.MANUFACT_DEVS.getInfo({ DEV_ID: devId }).catch((err) => {
    logger.error(err);
    return null;
  });
  return row && row.CLIENT_ID;
}

type FreshData = Awaited<ReturnType<typeof sqldb.DEVICES.getDevPreLoadInfo>>;
export type DevTopics = 'dac'|'dut'|'dam'|'dri'|'dma'| 'dmt'|'dal';

const isDac = (devId: string, topic: DevTopics) => (topic === 'dac') && (devId.startsWith('DAC') || devId.toUpperCase().startsWith('DAC'));
const isDut = (devId: string, topic: DevTopics) => (topic === 'dut') && devId.startsWith('DUT');
const isDma = (devId: string, topic: DevTopics) => (topic === 'dut' || topic === 'dma') && devId.startsWith('DMA');
const isDam = (devId: string, topic: DevTopics) => (topic === 'dam') && devId.startsWith('DAM');
const isDutAut = (devId: string, topic: DevTopics) => isDut(devId, topic) && (devId > 'DUT3') && (devId < 'DUT9');
const isDri = (devId: string, topic: DevTopics) => (topic === 'dri') && devId.startsWith('DRI');
const isDmt = (devId: string, topic: DevTopics) => (topic === 'dut' || topic === 'dmt') && devId.startsWith('DMT');
const isDal = (devId: string, topic: DevTopics) => (topic === 'dam' || topic === 'dal') && devId.startsWith('DAL');

async function checkJustSeenDac (devId: string, topic: DevTopics, freshData: FreshData, insertedDevice: number) {
  if (isDac(devId, topic) && !(freshData && freshData.AS_DAC)) {
    logger.info(`Inserting new device ${devId} into DACS_DEVICES`);
    const { insertId: dacDeviceId } =  await sqldb.DACS_DEVICES.w_insertIgnore({ DEVICE_ID: insertedDevice }, '[SYSTEM]');
    await sqldb.L1_SOURCE.w_insertOrUpdate({ DAC_DEVICE_ID: dacDeviceId, SELECTED_L1_SIM: "virtual" }, '[SYSTEM]');
  }
}

async function checkJustSeenDam (devId: string, topic: DevTopics, freshData: FreshData, insertedDevice: number) {
  if (isDam(devId, topic) && !(freshData && freshData.AS_DAM)) {
    logger.info(`Inserting new device ${devId} into DAMS`);
    await sqldb.DAMS_DEVICES.w_insertIgnore({ DEVICE_ID: insertedDevice, FW_MODE: 'S', DISAB: null }, '[SYSTEM]');
    // await loadDamInfo(devId, true);
  }
}

async function checkJustSeenDma (devId: string, topic: DevTopics, freshData: FreshData) {
  if(isDma(devId, topic) && !(freshData && freshData.AS_DMA)){
    logger.info(`Configurando modo de operação do ${devId}`);
    sendDmaCommand_mode(devId, 1, '[SYSTEM]');
    logger.info(`Inserting new device ${devId} into DMAS`);
    await sqldb.DEVICES.w_insertIgnore({ DEVICE_CODE: devId }, '[SYSTEM]');
    ramCaches_TIMEZONES_updateTimezoneId(devId, 31);
    const device = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: devId });
    const unit = await sqldb.DEVICES_UNITS.getUnitByDevId({ DEVICE_ID: device.ID });
    const water = unit && await sqldb.WATERS.getWaterInfoByUnit({ UNIT_ID: unit.UNIT_ID });
    await sqldb.DMAS_DEVICES.w_insertIgnore({ DEVICE_ID: device.ID, WATER_ID: water && water.ID }, '[SYSTEM]');
  }
}

async function checkJustSeenDut (devId: string, topic: DevTopics, freshData: FreshData, insertedDeviceId: number) {
  if (isDut(devId, topic) && !(freshData && freshData.AS_DUT)) {
    logger.info(`Inserting new device ${devId} into DUTS_DEVICES`);
    await sqldb.DUTS_DEVICES.w_insertIgnore({DEVICE_ID: insertedDeviceId}, '[SYSTEM]');  
  }
}

async function checkJustSeenDri (devId: string, topic: DevTopics, freshData: FreshData, insertedDeviceId: number) {
  if (isDri(devId, topic) && !(freshData && freshData.AS_DRI)) {
    logger.info(`Inserting new device ${devId} into DRIS`);
    await sqldb.DRIS_DEVICES.w_insertIgnore({DEVICE_ID: insertedDeviceId}, '[SYSTEM]');
  }
}

async function checkJustSeenDmt (devId: string, topic: DevTopics, insertedDeviceId: number) {
  const freshDmt = await sqldb.DMTS.getIdByCode({DEVICE_CODE: devId});
  if (isDmt(devId, topic) && !freshDmt) {
    logger.info(`Inserting new device ${devId} into DMTS`);
    await sqldb.DMTS.w_insertIgnore({ DEVICE_ID: insertedDeviceId }, '[SYSTEM]');
  }
}

async function checkJustSeenDal (devId: string, topic: DevTopics, insertedDeviceId: number) {
  const freshDal = await sqldb.DALS.getIdByCode({ DEVICE_CODE: devId });
  if (isDal(devId, topic) && !freshDal) {
    logger.info(`Inserting new device ${devId} into DALS`);
    await sqldb.DALS.w_insertIgnore({ DEVICE_ID: insertedDeviceId }, '[SYSTEM]');
  }
}

export const insertNewDev = async (devId: string, topic: DevTopics, MAC?: string) => {
  let insertedDevice = {} as {affectedRows: number, insertId: number};

  if (!isTemporaryId(devId)) {
    const freshData = await sqldb.DEVICES.getDevPreLoadInfo({ DEV_ID: devId });

    if (!freshData) {
      const clientId = await isManufactuerDev(devId);
      logger.info(`Inserting new device ${devId} into DEVICES`);

      devWasChecked[devId] = { checked: true, hasMac: !!MAC };

      insertedDevice = await sqldb.DEVICES.w_insertIgnore({
        DEVICE_CODE: devId.toUpperCase(),
        DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19),
        MAC,
      }, '[SYSTEM]');

      ramCaches_TIMEZONES_updateTimezoneId(devId.toUpperCase(), 31);

      if (clientId != null) {
        await sqldb.DEVICES_CLIENTS.w_insertIgnore({ DEVICE_ID: insertedDevice.insertId, CLIENT_ID: clientId }, '[SYSTEM]');
      }
    }
    await checkJustSeenDac(devId, topic, freshData, insertedDevice.insertId);
    await checkJustSeenDam(devId, topic, freshData, insertedDevice.insertId);
    await checkJustSeenDma(devId, topic, freshData);
    await checkJustSeenDut(devId, topic, freshData, insertedDevice.insertId);
    await checkJustSeenDri(devId, topic, freshData, insertedDevice.insertId);
    // await checkJustSeenEnergy(devId, topic, freshData);
    await checkJustSeenDmt(devId, topic, insertedDevice.insertId);
    await checkJustSeenDal(devId, topic, insertedDevice.insertId);
  }

  return true;
}

export function receivedDevMsg (devId: string, topic: 'dac'|'dut'|'dam'|'dri'|'dma'|'dmt'|'dal', wasOffline: boolean, btId: string|null, MAC: string): Promise<boolean> {
  const devChecked = devWasChecked[devId];
  const changeMac = (devChecked && devChecked.checked && !devChecked.hasMac && MAC);

  if (changeMac) {
    devWasChecked[devId] = { checked: true, hasMac: true };
    verifyMacDevice(devId, MAC).then((_res) => {
    }).catch((err) => {
      devWasChecked[devId] = { checked: true, hasMac: false };
      checkUnexpectedError({ error: err, changeMac, stack: err.stack });
    });
  }

  const devCheckDone = devWasChecked[devId]?.checked === true;
  if (devCheckDone && !wasOffline) return Promise.resolve(true);
  const devBeingChecked = (devWasChecked[devId]?.checked === false);
  if (devBeingChecked) return Promise.resolve(false);
  devWasChecked[devId] = { checked: false, hasMac: false };
  return checkJustSeenDev(devId, topic, btId, MAC)
    .then(() => true);
}

async function checkJustSeenDev (devId: string, topic: DevTopics, btId: string, MAC: string): Promise<void> {
  try {
    await insertNewDev(devId, topic, MAC);
    devWasChecked[devId] = { checked: true, hasMac: !!MAC };
  } catch(err) {
    devWasChecked[devId] = null;
    logger.error(err);
  }

  try {
    await afterCheckedJustSeenDev(devId, topic, btId);
  } catch(err) {
    logger.error(err);
  }
}

export async function afterCheckedJustSeenDev (devId: string, topic: DevTopics, btId: string): Promise<void> {
  if (btId) {
    await sqldb.DEVICES.w_updateInfo({ DEVICE_CODE: devId, BT_ID: btId }, '[SYSTEM]')
  }

  otaUpdates.checkDevNeedOta(devId);
  // Se DAM, verificar se precisa atualizar a programação
  if (isDam(devId, topic) || isDutAut(devId, topic)) {
    checkDevPendingSched(devId, '[SYSTEM]');
  }

  if (isDac(devId, topic) || isDut(devId, topic)) {
    // verificar no banco de dados se tem dados de saúde para dispositivo que estava offline
    const dacInf = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: devId });
    const recHealth = dacInf && dacInf.H_OFFL && jsonTryParse<RecHealthData>(dacInf.H_OFFL);
    
    // só altera a saúde de volta para a anterior se no momento a saúde ainda estiver "offline"
    if (recHealth && dacInf.H_INDEX === 2) {
      logger.info(`Recovering health index for ${devId} from ${dacInf.H_DESC} to ${recHealth.H_DESC}`)
      const userId = '[SYSTEM]';
      const { insertId } = await sqldb.MSGTOSERVICE.w_insert({
        DEST: 'health',
        ORIG: 'realtime',
        MSG: JSON.stringify({
          msgtype: 'setDacHealthStatus',
          DAC_ID: devId,
          H_INDEX: recHealth.H_INDEX,
          H_DESC: recHealth.H_DESC,
          P_CAUSES: recHealth.P_CAUSES,
          H_OFFL: null,
          CT_ID: ChangeType.BackOnline,
          userId,
        }),
        DAT_SEND: now_shiftedTS_s(),
      }, userId);
    }
  }
}

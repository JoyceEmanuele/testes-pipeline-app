import sqldb from '../../srcCommon/db'
import { DriMsg_GetVarsConfig } from '../../srcCommon/types/devicesMessages';
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import * as devsCommands from '../../srcCommon/iotMessages/devsCommands';
import * as crc32 from 'crc-32';
import { logger } from '../../srcCommon/helpers/logger'
import { DriVarsConfig } from '../../srcCommon/types'
import { parseDriVarsCfg, MINIMUM_AUTOMATION_VERSION, isApplicationAutomationByVarsCfg } from '../../srcCommon/dri/driInfo';
import { sendDriAutomationCommands } from './driAutomationInfo';
import { compareVersions, parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion';
import * as dielServices from '../../srcCommon/dielServices';

function sendCommandByAlias(driId: string, driCfg: DriVarsConfig, alias: string, value: string, sendConfigs: boolean): string {
  const command = driCfg.w_varsList.find((item) => item.address?.alias?.includes(alias))?.address;

  if (command) {
    const configCommand = JSON.stringify({
      ...command,
      value,
    });
    sendConfigs && devsCommands.sendDriVarConfig(driId, configCommand, '[SYSTEM]');
    return configCommand;
  }
  return '';
}

function setVavAndFancoilTime(driId: string, driCfg: DriVarsConfig, sendConfigs: boolean, needSendCommands: boolean) {
  let transmission = '';
  if (!driCfg.application.startsWith('vav') && !driCfg.application.startsWith('fancoil') || !needSendCommands) {
    return transmission;
  }

  const unshiftedNow = new Date();
  const now = new Date(unshiftedNow.getTime() - 3 * 60 * 60 * 1000);

  transmission += sendCommandByAlias(driId, driCfg, 'hours', now.getUTCHours().toString().padStart(2, '0'), sendConfigs);
  transmission += sendCommandByAlias(driId, driCfg, 'minutes', now.getUTCMinutes().toString().padStart(2, '0'), sendConfigs);
  transmission += sendCommandByAlias(driId, driCfg, 'weekday', (now.getUTCDay() || 7).toString(), sendConfigs);

  return transmission;
}

function calculateCRC16(buffer: number[]) {
  let crc = 0xFFFF;
  for (const byte of buffer) {
      crc ^= byte;
      for (let i = 8; i !== 0; i--) {
          if ((crc & 0x0001) !== 0) {
              crc >>= 1;
              crc ^= 0xA001;
          } else {
              crc >>= 1;
          }
      }
  }
  return [(crc & 0xFF), (crc >> 8)];
}

function addCRCToValues(values: number[]) {
  const crc = calculateCRC16(values);
  return values.concat(crc);
}

async function sendCommandsMeterETE30(driId: string, varsCfg: DriVarsConfig) {
  if (!varsCfg?.varsList.length || !['abb-ete-30', 'abb-ete-50'].some((x) => x === varsCfg.application)) {
    return;
  }
  const addressId = varsCfg.varsList[0]?.address?.id;

  await new Promise(resolve => setTimeout(resolve, 5000));
  const energyMeterField = {
    protocol: 'write-uart',
    values: addCRCToValues([addressId, 69, 0, 76, 0, 1, 4])
  };
  const energyMeterReset = {
    protocol: 'write-uart',
    values: addCRCToValues([addressId, 72])
  };
  devsCommands.sendDriVarConfig(driId, JSON.stringify(energyMeterField), '[SYSTEM]');
  devsCommands.sendDriVarConfig(driId, JSON.stringify(energyMeterReset), '[SYSTEM]');
}

function sendDriConfigCommands(driId: string, driConfigs: DriVarsConfig['driConfigs'], sendConfigs: boolean): string {
  let transmission = '';
  for (const cfgItem of driConfigs) {
    // {"protocol":"serial_mode","value":1|2} // 1: rs-485, 2: rs-232
    const configData = JSON.stringify(cfgItem);
    sendConfigs && devsCommands.sendDriVarConfig(driId, configData, '[SYSTEM]');
    transmission += configData;
  }
  return transmission;
}

function sendDriVarsCommands(driId: string, varsList: DriVarsConfig['varsList'], sendConfigs: boolean): string {
  let transmission = '';
  for (const varItem of varsList) {
    // {"protocol":"read-modbus-tcp","ip":"192.168.137.1",id:1,"function":4,"address":2}
    if (!varItem.address) continue;
    const varAddress = JSON.stringify(varItem.address);
    sendConfigs && devsCommands.sendDriVarConfig(driId, varAddress, '[SYSTEM]');
    transmission += varAddress;  }
  return transmission;
}

async function setBac6000AmlnValveType(driId: string, varsCfg: DriVarsConfig, sendConfigs: boolean): Promise<string> {
  let transmission = '';

  if (!varsCfg.application.endsWith('bac-6000-amln')) {
    return transmission;
  }

  const driValues = await (varsCfg.application.startsWith('fancoil') ?
    sqldb.FANCOILS.getDriFancoil({ FANCOIL_ID: driId })
    : sqldb.VAVS.getDriVav({ VAV_ID: driId }));

  const setValveTypeCommand = varsCfg.w_varsList.find((item) => item.address?.alias?.includes('set-valve-type')).address;
  const configData = JSON.stringify({ ...setValveTypeCommand, value: driValues.VALVE_TYPE === 'PROPORTIONAL' ? '1' : '0' });

  if (sendConfigs) {
    devsCommands.sendDriVarConfig(driId, configData, '[SYSTEM]');
  }

  transmission += configData;

  return transmission;
}

function sendCarrierEcosplitCommand(driId: string, sendConfigs: boolean): string {
  const cmd = {
    protocol: 'ccn_mode',
    value: 1
  };
  const readCommand = JSON.stringify(cmd);
  sendConfigs && devsCommands.sendDriVarConfig(driId, readCommand, '[SYSTEM]');
  return readCommand;
}

function sendHashCommand(driId: string, transmission: string): void {
  let hash = crc32.str(transmission);

  if (hash < 0) hash += 0x100000000;
  const hashMsg = `{"protocol":"hash","value":"${hash}"}`;
  devsCommands.sendDriVarConfig(driId, hashMsg, '[SYSTEM]');
}

async function sendSchedulerCommand(driId: string, varsCfg: DriVarsConfig, currentVersion: string): Promise<void> {
  const versionNumber = parseFirmwareVersion(currentVersion);
  if (compareVersions(versionNumber, MINIMUM_AUTOMATION_VERSION, false) < 0 || !isApplicationAutomationByVarsCfg(varsCfg)) {
    return;
  }

  await dielServices.apiAsyncInternalApi('/diel-internal/api-async/sendDriCurrentSchedules', { DRI_ID: driId });
}

async function updateDriLastConfigSent(driId: string) {
  const driDeviceInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: driId });
  if (driDeviceInfo) {
    await sqldb.DRIS_DEVICES.w_updateInfo({
      ID: driDeviceInfo.DRI_DEVICE_ID,
      LASTCFGSEND: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    }, '[SYSTEM]');
  }
}

export async function driGetVarsConfig(params: { driId: string, sendConfigs: boolean }) {
  try {
    const { driId, sendConfigs } = params;
    let fullTransmission = '';
    const driInf = await sqldb.DRIS.getBasicInfo({ driId });    
    const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId: driId});

    // Pegar lista de entidades, ordenar por ID, processar o VARSCFG de cada uma
    const varsCfg = parseDriVarsCfg(driInf && driInf.VARSCFG);

    const parsedVersion = parseFirmwareVersion(fwInfo.CURRFW_VERS);
    const hasSaveCfgCmd  = compareVersions(parsedVersion, { vMajor: 4, vMinor: 5, vPatch: 5}, false) >= 0;

    if (varsCfg) {
      fullTransmission += sendDriConfigCommands(driId, varsCfg.driConfigs || [], sendConfigs);
      fullTransmission += sendDriVarsCommands(driId, varsCfg.varsList || [], sendConfigs);

      if (varsCfg.protocol === 'carrier-ecosplit') {
        const transmission = sendCarrierEcosplitCommand(driId, sendConfigs);
        fullTransmission += transmission;
      }

      fullTransmission += setVavAndFancoilTime(driId, varsCfg, sendConfigs, !hasSaveCfgCmd);
      fullTransmission += await setBac6000AmlnValveType(driId, varsCfg, sendConfigs);
      fullTransmission += await sendDriAutomationCommands(driInf.DRI_DEVICE_ID, driId, varsCfg, fwInfo.CURRFW_VERS, sendConfigs);
    }

    sendHashCommand(driId, fullTransmission);
    sendConfigs && await sendSchedulerCommand(driId, varsCfg, fwInfo.CURRFW_VERS);
    
    if (driInf && sendConfigs) {
      await sendCommandsMeterETE30(driId, varsCfg);
      await updateDriLastConfigSent(driId);
    }
  } catch (err) {
    logger.error(err);
    eventWarn.typedWarn('UNHANDLED', `driGetVarsConfig\n` + String(err));
  }
}

export async function onMsgDriGetVarsConfig(driId: string, payload: DriMsg_GetVarsConfig) {
  try {
    await driGetVarsConfig({ driId, sendConfigs: true });
  } catch (err) {
    logger.error(err);
    eventWarn.typedWarn('UNHANDLED', `onMsgDriGetVarsConfig\n` + String(err));
  }
}

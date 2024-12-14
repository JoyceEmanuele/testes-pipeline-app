import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import sqldb from '../../srcCommon/db'
import { ControlMsgFirmwareVersion } from '../../srcCommon/types/devicesMessages'
import { getCurrentFirmwareVersion } from '../../srcCommon/devsFw/devFwVersion'
import * as dielServices from '../../srcCommon/dielServices'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse'
import { parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion'
import { getUserGlobalPermissions, getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'
import { API_External } from '../httpApiRouter'
import { getVersionslist } from '../../srcCommon/helpers/fetchFirmwareS3'

export const commandOta: API_External['/dev/command-ota'] = async function (reqParams, session) {
  let { list: allFWfiles, fwFamilies } = await getVersionslist(); // Firmware files in AWS S3
  const firmware = reqParams.path && allFWfiles.find(item => item.path === reqParams.path);
  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400);
  if (!firmware?.path) throw Error('There was an error! Missing fwPath.').HttpStatus(400);
  const devId = reqParams.devId;

  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares) { /* OK */ }
  else if (perms.sendOtaProd && (firmware?.fwType === 'prod')) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403)

  // Check if can update
  const result = await checkCanUpdate(reqParams.devId, firmware);

  if (result.canUpdate) {
    await sqldb.DEVFWVERS.w_update({
      DEV_ID: devId,
      TARGFW_REQDATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
      TARGFW_REQVERS: firmware.path,
    }, session.user);
    await dielServices.bgtasksInternalApi('/diel-internal/bgtasks/addDeviceToOtaQueue', { devId });
  }

  return result.outMsg;
}

export const requestFirmwareInfo: API_External['/dev/request-firmware-info'] = async function (reqParams, session) {
  const devInfo = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.devId });
  if (!devInfo) { throw Error('Device not found').HttpStatus(400) }
  const perms = getUserGlobalPermissions(session);
  const permsClient = await getPermissionsOnClient(session, devInfo.CLIENT_ID);

  if (perms.manageFirmwares || perms.sendOtaProd || permsClient.canEditProgramming) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)
  return getCurrentFirmwareVersion(reqParams.devId, session.user)
}

// As regras abaixo foram criadas a partir da tarefa: https://app.clickup.com/t/86a2272bp
async function checkCanUpdate(devId: string, wantedFwInfo: {
  path: string
  fwFamily: string
  fwVers: string
  versionNumber?: {
    vMajor: number
    vMinor: number
    vPatch: number
    vExtra?: string
  }
}) {
  const devFwRow = await sqldb.DEVFWVERS.getDevFwInfo({ devId });
  const currFwInfo = devFwRow.CURRFW_MSG && jsonTryParse<ControlMsgFirmwareVersion>(devFwRow.CURRFW_MSG);
  if (!currFwInfo) {
    return { canUpdate: false, outMsg: `Não pode atualizar ${devId} pois não temos informação sobre a versão de firmware atual` };
  }
  const currMajor = parseFirmwareVersion(currFwInfo.firmware_version)?.vMajor || null;
  const newMajor = wantedFwInfo.versionNumber?.vMajor || null;
  if (!newMajor) {
    return { canUpdate: false, outMsg: `Não pode atualizar ${devId} pois não temos informação sobre a versão major do firmware solicitado` };
  }

  // Restrição pelo DEVID e coluna. Dispositivos só devem ser capazes de atualizar suas versões de acordo com a coluna certa com as iniciais igual ao DEVID.
  // "fwFamily" é a pasta (do S3) que contém o arquivo de firmware e é também o nome da coluna na tela de firmwares.
  if ((wantedFwInfo.fwFamily.length === 4) && devId.toLowerCase().startsWith(wantedFwInfo.fwFamily.toLowerCase())) {
    // OK, caso padrão
  } else if ((wantedFwInfo.fwFamily === 'dut') && ['DUT0', 'DUT1', 'DUT2'].includes(devId.toUpperCase().substring(0, 4))) {
    // OK, dispositivos com o DEVID iniciado em DUT0, DUT1 e DUT2 podem receber firmware da coluna DUT 
  } else if ((wantedFwInfo.fwFamily === 'dma0') && ['DMA1'].includes(devId.toUpperCase().substring(0, 4))) {
    // OK, dispositivos com DEVID iniciado em DMA1 podem receber versões de firmware da coluna DMA0
  } else {
    return { canUpdate: false, outMsg: `Não pode atualizar ${devId} pois a pasta do firmware (${wantedFwInfo.path}) não corresponde ao dev_id` };
  }

  // Legado tem formato: "1_3_4"
  // Refatorado tem formato: "v3.2.0", "v4.1.1-1-g21fcc67-dirty", "d80e580-dirty", "085427f"
  // Observei que atualmente versão major 1 e 2 é sempre legado, refatorado é a partir de versão major 3.
  const newIsLegacy = wantedFwInfo.fwVers.includes('_');
  const newIsRefactor = !newIsLegacy;

  // Não é permitido atualização de versão de uma major para outra; tanto downgrade quanto upgrade (ex: 2.x.x para 3.x.x ou vice versa)
  // Compatibilidade de Versões de major. Versões de firmware na linha 2_x_x, v3.x.x ou v4.x.x só podem receber versões da mesma linha.
  if (newMajor === currMajor) {
    // OK, caso padrão
  } else if ((currMajor === 1) && (newMajor === 2) && ['DAC2', 'DAC3', 'DAC4'].includes(devId.toUpperCase().substring(0, 4))) {
    // OK, dispositivos com o DEVID iniciado em DAC2, DAC3 e DAC4 E versão de firmware 1_x_x podem receber versões de firmware na linha 2_x_x
    // Antes esta regra se aplicava também a: 'dut', 'dut3', 'dam2', 'dam3'
  } else if ((!currMajor) && newIsRefactor) {
    // OK, dispositivos sem versão (tageados) podem atualizar apenas para versão que seja refatorada
  } else {
    return { canUpdate: false, outMsg: `Não pode atualizar ${devId} mudando da versão ${currFwInfo.firmware_version} para ${wantedFwInfo.fwVers}` };
  }

  return { canUpdate: true, outMsg: 'SAVED' };
}

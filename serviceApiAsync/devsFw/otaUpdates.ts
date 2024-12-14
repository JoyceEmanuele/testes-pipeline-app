import * as path from 'path'
import { TLSSocket } from 'tls'
import * as httpRouter from '../apiServer/httpRouter'
import type { ApiResps } from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import { getVersionslist } from '../../srcCommon/helpers/fetchFirmwareS3'
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import configfile from '../../configfile'
import { getUploadedFile } from '../apiServer/getMultiparFiles'
import { ControlMsgFirmwareVersion } from '../../srcCommon/types/devicesMessages'
import jsonTryParse from '../../srcCommon/helpers/jsonTryParse'
import { checkCertificate } from '../../srcCommon/helpers/network/checkTls'
import { fetch_firmware_file, sendToS3 } from '../../srcCommon/s3/connectS3';
import { logger } from '../../srcCommon/helpers/logger';
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm'
import { parseFirmwareVersion } from '../../srcCommon/helpers/fwVersion'
import { ExtraRouteParams } from '../../srcCommon/types/backendTypes'
import detailedError from '../../srcCommon/helpers/detailedError'

const firmwareBins = {} as {
  [fwPath: string]: {
    s3FetchPromise: Promise<Buffer>
    blob: Buffer
    clients: number
  }
}

export function contabilizarDownloadsAtivos() {
  let total = 0;
  for (const { clients } of Object.values(firmwareBins)) {
    total += clients;
  }
  return total;
}

// Estas rotas aparentemente não são mais usadas
httpRouter.publicRoutes['/ota/:hw_type/:hardware_revision/:current_version/:dev_id'] =
httpRouter.publicRoutes['/ota/:hw_type/:hardware_revision/:current_version'] =
httpRouter.publicRoutes['/ota'] =
httpRouter.publicRoutes['/ota-get/:fw_type/:hardware_revision/:wanted_version'] =
httpRouter.publicRoutes['/ota-for-dev/:dev_id/:hardware_revision/:current_version'] =
httpRouter.publicRoutes['/ota-for-dev/:dev_id'] = async function (reqParams, nosession, extra) {
  logger.info(`DBG-OTA ${extra.req.originalUrl} ${JSON.stringify(reqParams)}`);
  if (configfile.isProductionServer !== true) throw Error('OTA is disabled').HttpStatus(403);
  const { req, res } = extra;

  if (contabilizarDownloadsAtivos() >= 50) {
    logger.error('403: Too many parallel downloads', req.originalUrl)
    res.status(403).send(`403: Too many parallel downloads`);
    return res;
  }

  // Dispositivo informa o próprio tipo de hardware e versão atual e pergunta se tem atualização
  // O dispositivo solicita uma versão específica de firmware.
  // O dispositivo fala quem ele é e pede o firmware.

  if (!reqParams.dev_id) throw Error('Missing dev_id').HttpStatus(400);

  checkClientCertificateInfo(req, reqParams);

  try {
    verificarPermissaoDownloadOta(req, reqParams);
  } catch(err) {
    logger.error(err);
    logger.error('403: No OTA auth - socket.authorized', JSON.stringify(req.gwData), JSON.stringify(reqParams), req.originalUrl);
    res.status(403).send(`403: No OTA auth`);
    return res;
  }

  const devFwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: reqParams.dev_id });

  if (!devFwInfo.TARGFW_REQVERS) throw Error('No FW for this devId').HttpStatus(404);

  // firmwarePath = "prod/dac2/1_5_2.bin" "test/dut3/v3.0.0-5-g817af2b3-dirty.bin"
  // const firmwarePath = await find_newest_fw('prod', reqParams.hardware_revision, reqParams.current_version);
  // const firmwarePath = `${reqParams.fw_type}/${reqParams.hardware_revision}/${reqParams.wanted_version}.bin`;
  const firmwarePath = devFwInfo.TARGFW_REQVERS;

  let fwBin = firmwareBins[firmwarePath];
  if (!fwBin) {
    firmwareBins[firmwarePath] = fwBin = {
      s3FetchPromise: fetch_firmware_file(firmwarePath),
      blob: null,
      clients: 0,
    };
  }

  try {
    fwBin.clients++;
    if ((!fwBin.blob) && (fwBin.s3FetchPromise == null)) {
      fwBin.s3FetchPromise = fetch_firmware_file(firmwarePath);
    }
    if (fwBin.s3FetchPromise != null) {
      fwBin.blob = await fwBin.s3FetchPromise
        .catch((err) => {
          fwBin.s3FetchPromise = null;
          logger.info(`ERR-OTA-104 ${firmwarePath} ${err}`);
          throw err;
        })
        .then((r) => {
          fwBin.s3FetchPromise = null;
          return r;
        });
    }
    if (!fwBin.blob) throw Error(`Firmware not found: ${firmwarePath}`).HttpStatus(500);
    logger.info(`Sending OTA ${reqParams.dev_id} ${firmwarePath}`);
    await sqldb.DEVFWVERS.w_update({
      DEV_ID: reqParams.dev_id,
      TARGFW_SENDDATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300',
      TARGFW_SENDPATH: firmwarePath,
    }, '[unknown]');
    res.writeHead(200);
    res.on('finish', () => {
      logger.info(`Finished OTA ${reqParams.dev_id} ${firmwarePath}`);
    });
    res.on('error', (err) => {
      logger.info(`Error OTA ${reqParams.dev_id} ${firmwarePath}`);
      logger.error(err);
    });
    res.end(fwBin.blob);
    logger.info(`Ended OTA ${reqParams.dev_id} ${firmwarePath}`);
  } catch (err) {
    logger.error(`Error OTA ${reqParams.dev_id} ${firmwarePath}`);
    logger.error(err);
    res.status(500).send('Could not send firmware');
  }

  fwBin.clients--;
  if (fwBin.clients <= 0) {
    delete firmwareBins[firmwarePath];
  }

  return res;
}

function checkClientCertificateInfo(req: ExtraRouteParams['req'], reqParams: { dev_id?: string }) {
  // Se o dispositivo tiver enviado certificado de cliente, verifica as informações

  try {
    const cert = req.gwData?.tls?.cert;
    if (cert) {
      checkCertificate(cert, 'CERT_EXP_OTA', `Dev OTA ${reqParams.dev_id || ''}`);
    }
  } catch (err) { logger.error(err) }

  try {
    const cert = (req.socket as TLSSocket).getPeerCertificate();
    if (cert?.fingerprint) {
      delete cert.raw;
      checkCertificate(cert, 'CERT_EXP_OTA', `Dev OTA ${reqParams.dev_id || ''}`);
    }
  } catch (err) { logger.error(err) }
}

function verificarPermissaoDownloadOta(req: ExtraRouteParams['req'], reqParams: { token?: string }) {
  if (req.gwData?.tls?.authorized) {
    return true;
  }

  if (req.socket && (req.socket as TLSSocket).authorized) {
    return true;
  }

  if (reqParams.token && reqParams.token === configfile.otaConfig.token) {
    return true;
  }

  throw detailedError("No valid OTA authentication", 403);
}

httpRouter.privateRoutes['/get-firmware-file/:fwStage/:fwFamily/:fileName'] = async function (reqParams, session, extra) {
  if (configfile.isProductionServer !== true) throw Error('Not authorized').HttpStatus(403);

  if (!reqParams.fwStage) throw Error('Missing fwStage').HttpStatus(400);
  if (!reqParams.fwFamily) throw Error('Missing fwFamily').HttpStatus(400);
  if (!reqParams.fileName) throw Error('Missing fileName').HttpStatus(400);

  if (!['prod', 'test'].includes(reqParams.fwStage)) throw Error('Invalid fwStage: ' + reqParams.fwStage).HttpStatus(400);
  if (!/^[A-Za-z][A-Za-z0-9]{2,}$/.test(reqParams.fwFamily)) throw Error('Invalid fwFamily: ' + reqParams.fwFamily).HttpStatus(400);
  if (/^v(\d+)\.(\d+)\.(\d+)(-[-a-zA-Z0-9]+)?\.bin$/.test(reqParams.fileName)) { } // OK, new format
  else if (/^(\d+)_(\d+)_(\d+)\.bin$/.test(reqParams.fileName)) { } // OK, old format
  else throw Error('File name should be like "v1.0.0.bin" but it was: ' + reqParams.fileName).HttpStatus(400);

  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares) { } // OK
  else if (perms.sendOtaProd && reqParams.fwStage === 'prod') { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const s3Path = path.join(reqParams.fwStage, reqParams.fwFamily, reqParams.fileName);
  const buffer = await fetch_firmware_file(s3Path);

  const { res } = extra;
  
  if (buffer) {
    logger.info('Sending OTA', s3Path)
    res.writeHead(200)
    res.end(buffer)
  } else {
    res.status(400).send('No firmware found')
    logger.error('400 - No firmware found')
  }

  return res;
}

httpRouter.privateRoutes['/devs/get-firmware-versions-v2'] = async function (reqParams, session) {
  // Linhas adicionadas temporariamente em 2024-FEV para compatibilidade. Devem ser removidas em breve.
  if ((reqParams as any).hwRevs) reqParams.fwFamilies = (reqParams as any).hwRevs;
  if ((reqParams as any).fwTypes) reqParams.fwStages = (reqParams as any).fwTypes;

  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares) { /* OK */ }
  else if (perms.sendOtaProd) {
    reqParams.fwStages = ['prod'];
  }
  else throw Error('Permission denied!').HttpStatus(403)

  function sorter (a: { date: string }, b: { date: string }) {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  }

  let { list: allFWfiles, fwFamilies } = await getVersionslist(); // Firmware files in AWS S3

  if (reqParams.fwStages instanceof Array) {
    allFWfiles = allFWfiles.filter((item) => reqParams.fwStages.includes(item.fwType));
  }
  if (reqParams.fwFamilies instanceof Array) {
    allFWfiles = allFWfiles.filter((item) => reqParams.fwFamilies.includes(item.fwFamily));
  }

  const fwsMeta1 = await sqldb.FIRMWARES.getList({});
  const fwsMeta2: { [path: string]: (typeof fwsMeta1)[0] } = {};
  for (const fwMeta of fwsMeta1) {
    fwsMeta2[fwMeta.S3_PATH] = fwMeta;
  }

  for (const fw of allFWfiles) {
    if (fwsMeta2[fw.path]) {
      fw.date = new Date(fwsMeta2[fw.path].DAT_UPLOAD.substr(0, 19) + '-0300').toISOString();
    }
    if (!fw.versionNumber) {
      fw.versionNumber = {
        vMajor: 0,
        vMinor: 0,
        vPatch: 0,
      };
    }
  }

  return {
    list: allFWfiles.sort(sorter),
    // hwTypes: hwRevs.sort(),
    fwHwRevs: fwFamilies,
  }
}

httpRouter.privateRoutes['/devs/get-registered-firmware-versions'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403)

  const fwLists = await sqldb.FIRMWARES.getList({ deviceType: reqParams?.deviceType })

  const list: ApiResps['/devs/get-registered-firmware-versions']['list'] = fwLists.map((x) => ({
    date: x.DAT_UPLOAD,
    fwFamily: x.HW_REV,
    fwVers: x.FW_VERS,
    versionNumber: parseFirmwareVersion(x.FW_VERS),
  }))

  return { list }

}

httpRouter.privateRoutes['/devs/get-devs-fwinfo'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares || perms.sendOtaProd) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const rows = await sqldb.DEVFWVERS.getList();
  const list = [];
  for (const row of rows) {
    try {
      const fwInfo = (row.CURRFW_MSG && jsonTryParse<ControlMsgFirmwareVersion>(row.CURRFW_MSG)) || undefined;
      // const { lastFwReqVers } = analyzeFwVersion(row);
      const nVers = (fwInfo && parseFirmwareVersion(fwInfo.firmware_version)) || undefined;
      const versionNumber = nVers || {
        vMajor: 0,
        vMinor: 0,
        vPatch: 0,
      };
      list.push({
        devId: row.DEV_ID,
        fwInfo,
        versionNumber,
        TARGFW_REQDATE: row.TARGFW_REQDATE,
        TARGFW_RCVDATE: row.TARGFW_RCVDATE,
      });
    } catch (err) { logger.error(err) }
  }

  return { list };
}

httpRouter.privateRoutes['/devs/get-devs-fwinfo-v2'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageFirmwares && !perms.sendOtaProd) throw Error('Permission denied!').HttpStatus(403); 

  const rows = await sqldb.DEVFWVERS.getList_v2({});
  const machinesNames = await getDevsMachineName();
  // const machinesList = await sqldb.MACHINES.getMachinesList({});
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DEV_ID) : undefined,
  });

  const list: ApiResps['/devs/get-devs-fwinfo-v2']['list'] = [];
  for (const row of rows) {
    try {
      const fwInfo = (row.CURRFW_MSG && jsonTryParse<ControlMsgFirmwareVersion>(row.CURRFW_MSG)) || undefined;
      const versionNumber = (fwInfo && parseFirmwareVersion(fwInfo.firmware_version)) || undefined;
      const status = lastMessagesTimes.connectionStatus(row.DEV_ID) || 'OFFLINE';
      const machineName = machinesNames[row.DEV_ID] || null;
      // const machineName = machinesList.filter((machine) => ((machine.DEV_AUT === row.DEV_ID) || (machine.DUT_ID === row.DEV_ID))).map(machine => machine.MACHINE_NAME || machine.ILLUMINATION_NAME).join(', ') || null;

      list.push({
        DEV_ID: row.DEV_ID,
        STATE_ID: row.STATE_ID,
        CITY_NAME: row.CITY_NAME,
        UNIT_NAME: row.UNIT_NAME,
        UNIT_ID: row.UNIT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        OTAPROCSTATUS: row.OTAPROCSTATUS,
        FWVERSSTATUS: row.FWVERSSTATUS,
        machineName,
        status,
        fwInfo: fwInfo && {
          hardware_type: fwInfo.hardware_type,
          firmware_version: fwInfo.firmware_version,
          last_update_result: fwInfo.last_update_result,
        },
        versionNumber,
      });
    } catch (err) { logger.error(err) }
  }

  return { list };
}

async function getDevsMachineName() {
  const machinesList = await sqldb.MACHINES.getMachinesList({});
  const machinesNames: {
    [dev_id: string]: string
  } = {};
  for (const machine of machinesList) {
    const machineName = machine.MACHINE_NAME || machine.ILLUMINATION_NAME;
    if (!machineName) continue;
    if (machine.DEV_AUT) {
      if (!machinesNames[machine.DEV_AUT]) machinesNames[machine.DEV_AUT] = machineName;
      else machinesNames[machine.DEV_AUT] += ', ' + machineName;
    }
    if (machine.DUT_ID) {
      if (!machinesNames[machine.DUT_ID]) machinesNames[machine.DUT_ID] = machineName;
      else machinesNames[machine.DUT_ID] += ', ' + machineName;
    }
  }
  return machinesNames;
}

httpRouter.privateRoutes['/devs/upload-new-firmware-version'] = async function (_reqParams, session, { req, res }) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const file = await getUploadedFile(req, res);
  const body = req.body as typeof _reqParams;
  const fwStage = body.fwStage;
  const fwFamily = body.fwFamily?.toLowerCase();
  const fileName = body.fileName?.toLowerCase();

  if (!file) throw Error('Missing file').HttpStatus(400);
  if (!fwStage) throw Error('Missing fwStage').HttpStatus(400);
  if (!fwFamily) throw Error('Missing fwFamily').HttpStatus(400);
  if (!fileName) throw Error('Missing fileName').HttpStatus(400);

  if (!['prod', 'test'].includes(fwStage)) throw Error('Invalid fwStage: ' + fwStage).HttpStatus(400);
  if (!/^[A-Za-z][A-Za-z0-9]{2,}$/.test(fwFamily)) throw Error('Invalid fwFamily: ' + fwFamily).HttpStatus(400);
  if (/^v(\d+)\.(\d+)\.(\d+)(-[-a-zA-Z0-9]+)?\.bin$/.test(fileName)) { } // OK, new format
  else if (/^(\d+)_(\d+)_(\d+)\.bin$/.test(fileName)) { } // OK, old format
  else throw Error('File name should be like "v1.0.0.bin" but it was: ' + fileName).HttpStatus(400);

  const S3_PATH = path.join(fwStage, fwFamily, fileName);
  await sendToS3(configfile.firmwareBucket, S3_PATH, file);
  await sqldb.FIRMWARES.w_insert({
    S3_PATH,
    HW_REV: fwFamily,
    FW_VERS: fileName.substring(0, fileName.length - '.bin'.length),
    DAT_UPLOAD: new Date().toISOString(),
  }, session.user)

  return 'UPLOADED'
}

httpRouter.publicRoutes['/ota-check-cert/:devId'] = async function (reqParams, nosession, extra) {
  if (!reqParams.devId) throw Error('Missing devId').HttpStatus(400);

  const { req, res } = extra;
  if (req.socket && (req.socket as TLSSocket).authorized) { } // OK
  else {
    eventWarn.otaCertUnauth(reqParams);
    res.status(403).send(`403: No cert auth`);
    logger.error('403: No cert auth - socket.authorized', req.socket && (req.socket as TLSSocket).authorized)
    return res;
  }

  const devFwInfo = await sqldb.DEVFWVERS.getDevFwInfo({ devId: reqParams.devId });
  // const cert = (req.socket as TLSSocket).getPeerCertificate();
  // delete cert.raw;
  const cert = req.gwData && req.gwData.tls && req.gwData.tls.cert;

  try {
    checkCertificate(cert, 'CERT_EXP_OTA', `Dev OTA ${reqParams.devId}`);
  } catch (err) { logger.error(err) }

  await sqldb.DEVFWVERS.w_update({
    DEV_ID: reqParams.devId,
    CERT_CHKDATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + '-0300',
    CERT_CURRFW: devFwInfo.CURRFW_VERS,
    CERT_DATA: JSON.stringify(cert),
  }, '[unknown]');
  res.status(500).send('No firmware to send')

  return res;
}

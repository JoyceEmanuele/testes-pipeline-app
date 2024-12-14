import * as tls from 'tls';
import configfile from '../../configfile'
import * as httpRouter from '../apiServer/httpRouter'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import { sendOtaCommand } from '../../srcCommon/iotMessages/devsCommands';
import { logger } from '../../srcCommon/helpers/logger';
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';

httpRouter.privateRoutes['/request-dev-cert-check'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (perms.manageFirmwares || perms.sendOtaProd) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  if (!reqParams.devId) throw Error('There was an error! Missing devId.').HttpStatus(400)

  const promise = iotMessageListener.waitForDevControl((payload) => {
    if ((payload && payload.dev_id) !== reqParams.devId) return false
    if ((<any>payload).ota_command) return true
    return false
  }, 5000)
  sendOtaCommand(reqParams.devId, {
    ['new-version']: {
      host: configfile.otaConfig.host,
      port: configfile.otaConfig.port,
      path: `/ota-check-cert/${reqParams.devId}` // ?token=${configfile.otaConfig.token}
    }
  }, session.user)
  await promise;

  return 'SENT'
}

function example () {
  const socket = tls.connect({
    host: 'medium.com',
    port: 443,
    servername: 'medium.com'
  }, () => {
    const peerCertificate = socket.getPeerCertificate();
    logger.info(peerCertificate);
    socket.destroy();
  });
  socket.on('error', err => {
    logger.info('Error: ' + err.message);
  });
  socket.on('close', () => {});
  // { subject:
  //   …,
  //   valid_from: ‘Jun 1 00:00:00 2017 GMT’,
  //   valid_to: ‘Aug 30 12:00:00 2019 GMT’,
  //   …
  // }
}

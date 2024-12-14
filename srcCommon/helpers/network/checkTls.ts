import * as tls from 'tls';
import * as net from 'net';
import * as fs from 'fs';
import * as eventWarn from '../eventWarn'
import { logger } from '../logger';

export function checkLocalCertificates (dontUseTls: boolean, publicCert: string, caCert: string) {
  logger.info('checkLocalCertificates');
  const tlsEnabled = !dontUseTls;

  if (tlsEnabled) {
    try {
      checkCertificate(parseCertificateFile(publicCert), 'CERT_EXP_FILE', 'httpServer.publicCert'); // servConfig.httpServer.publicCert
    } catch (err) {
      if (dontUseTls) {
        logger.warn(err);
      }
      else throw err;
    }
  }

  if (tlsEnabled || caCert) {
    try {
      checkCertificate(parseCertificateFile(caCert), 'CERT_EXP_FILE', 'otaConfig.caCert'); // servConfig.otaConfig.caCert
    } catch (err) {
      if (dontUseTls) {
        logger.warn(err);
      }
      else throw err;
    }
  }
}

function parseCertificateFile (path: string) {
  try {
    const certContent = fs.readFileSync(path, 'utf-8');
    const secureContext = tls.createSecureContext({ cert: certContent });
    const secureSocket = new tls.TLSSocket(new net.Socket(), { secureContext });
    const cert = secureSocket.getCertificate() as tls.PeerCertificate;
    secureSocket.destroy();
    return cert;
  } catch (err) {
    logger.error(err);
    logger.error(path);
    return null;
  }
}

export function checkCertificate (cert: { valid_to: string, fingerprint: string }, type: eventWarn.WarnTypes, desc: string, silent?: boolean) {
  if (!cert) {
    logger.error(Error('Invalid certificate data [E48] ' + type + ' ' + desc));
    return;
  }
  if (!cert.valid_to) {
    logger.info(cert);
    logger.error(Error('Invalid certificate data [E49] ' + type + ' ' + desc));
    return;
  }
  const date = new Date(cert.valid_to);
  const daysLeft = Math.floor((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 30) {
    eventWarn.typedWarn(type, `${desc} ${date.toISOString().substr(0, 10)}`);
  }
  if (!silent) {
    logger.info(` - days ${daysLeft} ${desc}:`, new Date(cert.valid_to).toISOString().substr(0, 19)); // , JSON.stringify(cert.subject), JSON.stringify(cert.issuer)
  }
}

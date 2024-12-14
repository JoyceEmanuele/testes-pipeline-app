import * as apmAuth from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceAuth {
  public startElasticAuth(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmAuth.start({
        serviceName: 'DAP-Auth',
        serverUrl: configfile.APM_ELASTIC,
        environment: configfile.APM_ENV,
        verifyServerCert: false,
        apiRequestSize: "10mb",
        usePathAsTransactionName: true,
        captureBody: 'all',
      })
    } catch (error) {
      logger.info(error)
    }
  }
  public setCustomUserApmAuth(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmAuth.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    
    } catch (error) {
      logger.info(error)
    }
  }
}

export const apmServiceAuth = new ApmServiceAuth();

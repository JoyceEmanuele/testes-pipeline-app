import * as apmRealtime from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceRealtime {
  public startElasticRealtime(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmRealtime.start({
        serviceName: 'DAP-Realtime',
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
  public setCustomUserApmRealtime(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmRealtime.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    
    } catch (error) {
      logger.info(error)
    }
  }
}

export const apmServiceRealtime = new ApmServiceRealtime();

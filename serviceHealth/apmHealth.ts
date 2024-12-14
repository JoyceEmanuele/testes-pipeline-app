import * as apmHealth from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceHealth {
  public startElasticHealth(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmHealth.start({
        serviceName: 'DAP-Health',
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

  public setCustomUserApmHealth(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmHealth.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    
    } catch (error) {
      logger.info(error)
    }
  }

}

export const apmServiceHealth = new ApmServiceHealth();

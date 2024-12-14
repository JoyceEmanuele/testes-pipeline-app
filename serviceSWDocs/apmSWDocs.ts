import * as apmSWDocs from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceSWDocs {
  public startElasticSWDocs(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmSWDocs.start({
        serviceName: 'DAP-SWDocs',
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

  public setCustomUserApmSWDocs(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmSWDocs.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    
    } catch (error) {
      logger.info(error)
    }
  }
}

export const apmServiceSWDocs = new ApmServiceSWDocs();

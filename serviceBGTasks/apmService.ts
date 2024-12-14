import * as apm from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmService {
  public startElastic(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apm.start({
        serviceName: 'DAP-BGTasks',
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
  public setCustomUserApm(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apm.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    
    } catch (error) {
      logger.info(error)
    }
  }
}

export const apmService = new ApmService();

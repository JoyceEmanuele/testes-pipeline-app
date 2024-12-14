import * as apmApiAsync from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceApiAsync {
  public startElasticApiAsync(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmApiAsync.start({
        serviceName: 'DAP-ApiAsync',
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
  public setCustomUserApmApiAsync(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmApiAsync.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });
    } catch (error) {
      logger.info(error)
    }
  }
}

export const apmServiceApiAsync = new ApmServiceApiAsync();

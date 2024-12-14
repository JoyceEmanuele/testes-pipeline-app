import * as apmTelegram from 'elastic-apm-node';
import { logger } from '../srcCommon/helpers/logger';
import configfile from "../configfile";

class ApmServiceTelegram {
  public startElasticTelegram(): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmTelegram.start({
        serviceName: 'DAP-Telegram',
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
  public setCustomUserApmTelegram(
    nome: string, clients: string, perfil: string
  ): void {
    try {
      if ((!configfile.APM_ELASTIC) && (!configfile.isProductionServer)) return;
      apmTelegram.setUserContext({
        id: nome ,
        username: clients,
        email: perfil,
      });

    }
    catch (error) {
      logger.info(error)
    }
  }
}

export const apmServiceTelegram = new ApmServiceTelegram();

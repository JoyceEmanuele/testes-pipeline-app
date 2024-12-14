import { apmService } from './apmService';
apmService.startElastic();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import * as http from "node:http";
import configfile from "./configfile";
import configfileGlobal from "../configfile";
import * as httpApiRouter from "./httpApiRouter";
import { logger } from "../srcCommon/helpers/logger";
import * as recurrentTasks from '../srcCommon/helpers/recurrentTasks'
import * as schedTurning from './rooms/schedTurning'
import * as dacHealth from "./dac/dacHealth";
import * as emailSender from './backgroundTasks/emailSender'
import * as energyAlerts_rt from './notifs/energyAlerts'
import * as dmaAlerts from './notifs/dmaAlerts';
import * as ecoLocal from './dam/ecoLocal';
import * as laagerAlerts from './notifs/laagerAlerts';
import * as fwMonitor from './devsFw/fwMonitor'
import * as coolAutomation from './integrations/coolAutomation';
import * as dayCompiler from './telemHistory/dayCompiler'
import * as cacheCleaner from './telemHistory/cacheCleaner'
import * as ness from './integrations/ness'
import * as dutAutomation from './dut/dutAutomation'
import * as ecoModeMigrations from './ecoMode/migrations';
import * as healthReport from './unitReport/healthReport';
import * as temprtOutOfBounds from './notifs/temprtOutOfBounds';
import * as dacAlerts from './notifs/dacAlerts';
import * as laager from './integrations/laager';
import * as greenAnt from './integrations/greenAnt';
import * as savings from './telemHistory/savings';
import * as automation from './supervisorAutomation/automation'
import * as brokerMQTT from "../srcCommon/iotMessages/brokerMQTT";

const serviceName = 'bgtasks';

async function init () {
  // Conecta ao broker MQTT
  logger.info('Conectando ao broker MQTT...');
  brokerMQTT.connectService(configfileGlobal.mqttBroker, !configfileGlobal.isProductionServer);

  initBackgroundTasks();
  initHttpServers();
}

function initBackgroundTasks() {
  // Revezamento de programação dos DUTs (para a Vivo)
  recurrentTasks.runAtHour({
    taskName: "REVEZ-PROG",
    atHour: 0,
    initialDelay_ms: 42412,
    runAtStart: true,
  }, schedTurning.checkUpdateRoomsSchedSwitch);

  // Fila de envio de comandos de OTA para os dispositivos
  fwMonitor.startService();

  // Migração de modo de operação do DAM quando atualiza o firmware
  ecoModeMigrations.startTaskEcoLocMigr();

  // Migração de modo de operação do DAM quando atualiza o firmware
  ecoModeMigrations.startTaskDamEcoMigr();

  // Fila de envio de emails
  emailSender.startService();

  // Alertas de água
  if (configfileGlobal.isProductionServer) {
    dmaAlerts.startService();
    laagerAlerts.startService();
  }

  // Verificação de consumo de energia por hora
  energyAlerts_rt.startService();

  // Multiprogramação DUT
  dutAutomation.startServiceMultiProg();

  // Reenviar programações erradas detectadas pelo supervisor
  // DESATIVADO TEMPORARIAMENTE PARA CORREÇÃO  DE DUPLICAÇÃO NO BANCO
  // automation.startServiceResendProgramming(); 

  // Cadastro de exceções anuais nos DUTs
  dutAutomation.startServiceAnnualExcepts();

  // Alterações de saúde baseadas em timeouts (recém instalado, operando corretamente, offline)
  dacHealth.startServiceDacHealth();

  // Alertas da CoolAutomation
  if (configfileGlobal.coolautApi || configfileGlobal.isProductionServer) {
    coolAutomation.startCoolautAlertsChecker();
  }

  // No fim do dia envia alertas sobre consumo de energia por hora detectados durante o dia
  recurrentTasks.runAtHour({ atHour: 1, taskName: "ENERGY-ECPH-EOD" }, async () => {
    await energyAlerts_rt.compile_EndOfDay_ECPH_Notif();
  });

  if (configfileGlobal.isProductionServer) {
    // Compilação diária de histórico de telemetrias
    dayCompiler.startService();
    cacheCleaner.weeklyService();
    // Verificação de status online da NESS
    ness.startNessCheckerService();
  }
  // Desabilitando temporariamente a geração de relatórios semanais

  if (configfileGlobal.isProductionServer) {
    // Geração das prévia dos relatórios semanais
    recurrentTasks.runAtHour({ atWeekDay: 2, atHour: 2, taskName: "RELT-SEM-1" }, async () => {
      await healthReport.taskPreviewReports();
    });
    // Geração e envio dos relatórios semanais
    recurrentTasks.runAtHour({ atWeekDay: 2, atHour: 7, taskName: "RELT-SEM-2" }, async () => {
      await healthReport.taskGenerateSendReports();
    });
  }

  // Alerta de temperatura fora dos limites para DUT
  recurrentTasks.runAtHour({ atHour: 1, taskName: "ALERT-DUT-TFdL" }, async () => {
    await temprtOutOfBounds.checkTempOutOfBoundsNotifs();
  });

  // Busca no histórico de telemetrias para saber se o dispositivo funcionou fora do horário
  recurrentTasks.runAtHour({ atHour: 1, taskName: "DAC-TIME-USE-NOTIF" }, async () => {
    await dacAlerts.checkDacTimeOutOfBounds();
  });

  // Salva status GreenAnt no banco
  recurrentTasks.runAtHour({ atHour: 3, taskName: 'DAILY-03:00-GREENANT' }, async (opts) => {
    await greenAnt.saveInDataBaseStatus();
  });

  // Compila economia de energia gerada por automação das unidades
  recurrentTasks.runAtHour({ atHour: 3, taskName: 'DAILY-03:00-AUTOMSAVINGS' }, async (opts) => {
    await savings.compileUnitsAutomationSavings();
  });

  // Busca dados de consumo da API da Laager e salva no nosso banco
  recurrentTasks.runAtHour({ atHour: 0, taskName: "LAAGER-HIST" }, async () => {
    await laager.getAllUnitsData();
  });
}

function initHttpServers() {
  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  {
    http
      .createServer(httpApiRouter.createInternalApi())
      .listen(configfile.httpPortListenInternalServices, () => {
        logger.info(`HTTP server (${serviceName}/internal) started on port ${configfile.httpPortListenInternalServices}`);
      });
  }
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

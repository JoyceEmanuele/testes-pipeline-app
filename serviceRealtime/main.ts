import { apmServiceRealtime } from './apmRealtime';
apmServiceRealtime.startElasticRealtime();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import * as http from "node:http";
import * as https from "node:https";
import * as fs from "node:fs";
import * as net from "node:net";
import configfile from "./configfile";
import configfileGlobal from "../configfile";
import * as httpApiRouter from "./httpApiRouter";
import * as webSocketServer from "./apiServer/webSocketServer";
import { logger } from "../srcCommon/helpers/logger";
import * as brokerMQTT from "../srcCommon/iotMessages/brokerMQTT";
import * as lastMessages from "./ramCaches/lastMessages";
import * as rtStatusToFront from "./devsStatus/rtStatusToFront";
import * as dbUpdateService from "./devsStatus/dbUpdateService";
import * as recurrentTasks from '../srcCommon/helpers/recurrentTasks'
import * as usersNotifs from './notifs/usersNotifs'
import * as checkManualMode from './realTime/checkManualMode';
import * as checkRealtime from './realTime/checkRealtime';
import * as ramCaches from './ramCaches';
import * as eventWarn from '../srcCommon/helpers/eventWarn'
import * as statistics from '../srcCommon/helpers/monitoring/statistics'
import * as sqldb from '../srcCommon/db/connectMysql'
import { getIntegrLaagerInstallationDateNull, updateDispsInstallationDate } from '../srcCommon/db/sql/LAAGER';
import * as topicRouter from '../srcCommon/iotMessages/topicRouter';
import * as iotMessageReceived from './iotMessages/iotMessageReceived';

const serviceName = 'realtime';

function printMemoryUsage () {
  const memInfo = process.memoryUsage()
  memInfo.rss = Math.round(memInfo.rss / 1000 / 1000 * 100) / 100
  memInfo.heapTotal = Math.round(memInfo.heapTotal / 1000 / 1000 * 100) / 100
  memInfo.heapUsed = Math.round(memInfo.heapUsed / 1000 / 1000 * 100) / 100
  memInfo.external = Math.round(memInfo.external / 1000 / 1000 * 100) / 100
  logger.info(`MEMORY ` + JSON.stringify(memInfo))
  if (configfileGlobal.isTestServer) return;
  if (memInfo.heapUsed > 3000) {
    eventWarn.highRamUsage(`heap ${memInfo.heapUsed} MB`);
  }
  if (memInfo.heapUsed > 6000) {
    logger.info(`/!\\ It seems there is a memory leak. Finish process! /!\\`)
    process.exit(3)
  }
}

function startMemoryMonitor () {
  setTimeout(() => {
    printMemoryUsage()
    setInterval(printMemoryUsage, 5 * 60 * 1000 + Math.round(Math.random() * 1000))
  }, 10000 + Math.round(Math.random() * 1000))
}

async function init () {
  if (configfileGlobal.isProductionServer) {
    logger.info(`
      ---------------------
      | PRODUCTION SERVER |
      ---------------------
    `)
  } else {
    logger.info(`
      #######
      # DEV #
      #######
    `)
  }

  startMemoryMonitor();

  // Quando tiver alteração de status ONLINE/OFFLINE avisar para os clientes websocket inscritos
  lastMessages.setListenerForStatusChange(rtStatusToFront.sendStatusChange);
  dbUpdateService.setListenerForStatusChange(rtStatusToFront.sendStatusChange);

  await verificarConexaoBancoDeDados();
  await prepararDados();

  // Registro das últimas mensagens recebidas dos dispositivos
  await lastMessages.startSavingService();

  // Conecta ao broker MQTT
  logger.info('Conectando ao broker MQTT...');
  brokerMQTT.connectService(configfileGlobal.mqttBroker, !configfileGlobal.isProductionServer);
  topicRouter.setEventsCallbacks(iotMessageReceived.rtcb);

  initHttpServers();

  initBackgroundTasks();
}

async function prepararDados() {
  logger.info('Verificando se há algum dispositivo da Laager Com InstallationDate nulo...');
  const integrLaagerList = await getIntegrLaagerInstallationDateNull().catch((err) => {
    logger.error(err);
    return [];
  });
  if (integrLaagerList.length) {
    await updateDispsInstallationDate(integrLaagerList).catch((err) => {
      logger.error(err);
    });
  }

  logger.info('Pre-loading DEVs information...');
  await preLoadRamCache();

  logger.info('Finalizando as inicializações...');
}

async function verificarConexaoBancoDeDados() {
  // Verifica conexão com o MySQL
  logger.info('Verificando o SQL...');
  await sqldb.query('SELECT 1').catch((err) => {
    logger.error('Could not connect to SQL', err)
    throw Error('Could not connect to SQL')
  })
}

function initBackgroundTasks() {
  if (!configfile.devicesReadOnlyMode) {
    checkRealtime.startService();
    checkManualMode.startService();
  }
  dbUpdateService.startServiceCheckAlive();
  statistics.startStatisticsService();
  recurrentTasks.runLoop({
    taskName: 'devsRealTime',
    initialDelay_ms: 4 * 60 * 1000,
    iterationPause_ms: 4 * 60 * 1000,
    hideIterationsLog: true,
  }, checkRealtime.devsRealTime);

  recurrentTasks.runAtHour({ atHour: 1, taskName: 'SEND-NOTIFS-SCHEDULE' }, async () => {
    await usersNotifs.sendNotificationSchedule();
  });

  recurrentTasks.runAtHour({ atHour: 0, taskName: 'DAY-CHANGE-RT' }, async () => {
    ramCaches.ROOMTYPES.onDayChange();
    ramCaches.DAMS.onDayChange();
    ramCaches.AUTOM_EVAP.onDayChange();
  });
}

async function preLoadRamCache() {
  await ramCaches.DEVACS.loadDacsDbInfo()
  await ramCaches.DUTS.loadDutRoomTypes()
  await ramCaches.ROOMTYPES.loadRtypesScheds()
  await ramCaches.TIMEZONES.loadTimezoneDevices()
  await ramCaches.TIMEZONES.loadTableTimezone()
  await ramCaches.DAMS.loadDamsScheds()
  await ramCaches.AUTOM_EVAP.loadDutsScheds()
  await ramCaches.DEVGROUPS.loadAutomationRefs()
  await ramCaches.DAMS.loadDamsEcoCfg()
  await ramCaches.NOTIFSCFG.updateAllUserNotifs()
  await ramCaches.DRIS.loadDrisCfg()
  await ramCaches.DAMS.loadDamsThermostat()
}

function initHttpServers() {
  // Inicializa o servidor HTTP de requisições externas (usuários)
  {
    const server = http
      .createServer(httpApiRouter.createExternalApi());
    webSocketServer.attatchWss(server);
    server
      .listen(configfile.httpPortListenExternalUsers, () => {
        logger.info(`HTTP server (${serviceName}/external) started on port ${configfile.httpPortListenExternalUsers}`);
      });
  }

  // Inicializa o servidor WebSocket (over HTTP) de requisições externas (usuários)
  if (configfile.publicWebSocket) {
    let server: https.Server|http.Server = null;
    if (configfile.publicWebSocket.disableTls === true) {
      server = http.createServer(httpApiRouter.createExternalWsApi());
    } else {
      // with TLS
      const options: https.ServerOptions = {
        cert: fs.readFileSync(configfile.publicWebSocket.publicCert),
        key: fs.readFileSync(configfile.publicWebSocket.privateKey),
      };
      server = https.createServer(options, httpApiRouter.createExternalWsApi());
    }
    webSocketServer.attatchWss(server);
    server.listen(configfile.publicWebSocket.listenPort || 0, () => {
      const address = server.address() as net.AddressInfo;
      logger.info(`HTTP-WS server (${serviceName}-ws/external) started on port ${address.port}`);
    });
  }

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

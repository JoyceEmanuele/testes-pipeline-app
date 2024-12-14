import { apmServiceApiAsync } from './apmApiAsync';
apmServiceApiAsync.startElasticApiAsync();

(Error.prototype as any).HttpStatus = function (status: number) { this.Status = status; return this };
(Error.prototype as any).DebugInfo = function (info: any) { this.debugInfo = info; return this };
(Error.prototype as any).Details = function (status: number, pars: { errorCode: string, frontDebug?: any, debugInfo?: any }) {
  return Object.assign(this, { Status: status }, pars || {});
};

import { startHttpServer } from "../srcCommon/helpers/network/httpTools";
import * as httpApiRouter from "./httpApiRouter";
import { logger } from "../srcCommon/helpers/logger";
import configfile from "./configfile";
import configfileGlobal from "../configfile";
import * as recurrentTasks from '../srcCommon/helpers/recurrentTasks'
import * as googleApi from '../srcCommon/extServices/googleApi'

import './unitReport/healthReport'
import './crossData/overviewData'
import './crossData/manufacturerDev'
import './dutInfo'
import './damInfo'
import './notifs/dacAlerts'
import './notifs/energyAlerts'
import './auth/users'
import './dacInfo'
import './dri/driInfo'
import './dutAutomation'
import './dri/driAutomation'
import './telemHistory/dmaHist'
import './clientData/clients'
import './clientData/units_getUnitsListPage'
import './clientData/units_getEnvironmentsListPage'
import './dutInfo_getDutsList'
import './dri/driInfo_getDriVavsList'
import './crossData/dacCities'
import './crossData/timezones'
import './devsPictures'
import './automationControl'
import './crossData/devsSensors'
import './extServices/linkSolutionsAPI'
import './clientData/associations'
import './clientData/roomTypes'
import './clientData/rooms'
import './crossData/holidays'
import './batchInputs/dacs'
import './batchInputs/duts'
import './batchInputs/dams'
import './batchInputs/units'
import './batchInputs/roomtypes'
import './batchInputs/common'
import './telemHistory/nessDutHist'
import './telemHistory/devsLogs'
import * as brokerMQTT from "../srcCommon/iotMessages/brokerMQTT";
import './visitaTecnica/vtInfo'
import './visitaTecnica/vtExecution'
import './extServices/ness'
import './integrations/integrsList'
import './integrations/integrInfo'
import './integrations/coolAutomation'
import './extServices/laagerApi'
import './invoices/invoices'
import './energyHist'
import './energyInfo'
import './devsFw/otaUpdates'
import './clientData/distributors'
import './clientData/baselines/baselineValues'
import './clientData/baselines/baselines'
import './baselineTemplates'
import './auth/redirAuth'
import './extServices/fourDocsApi'
import './deviceSimulator/deviceSimulator'
import './painel/simcards'
import './extServices/laagerApi'
import './heatExchanger';
import './dmt/dmtInfo';
import './devices/devicesList';
import './rateModels/rateCicles';
import './rateModels/rateModels';
import './clientData/accessDistributors';
import './dal/dalInfo';
import './environments/environmentsList';
import './damIllumination/damIlluminationInfo';
import './devTools';
import './unit/groundPlansUnit';
import './mainService/mainService'
import './mainService/units'
import './permissions/unit';
import './analise/machines';

const serviceName = "api-async";

async function init () {
  {
    const portInternal = process.argv.find((x) => x.startsWith('--port-internal='));
    if (portInternal) {
      configfile.httpPortListenInternalServices = Number(portInternal.split('=')[1]);
    }
    const portExternal = process.argv.find((x) => x.startsWith('--port-external='));
    if (portExternal) {
      configfile.httpPortListenExternalUsers = Number(portExternal.split('=')[1]);
    }
    const portHaproxyAgent = process.argv.find((x) => x.startsWith('--port-haproxy-agent='));
    if (portHaproxyAgent) {
      configfile.httpPortListenHaproxyAgent = Number(portHaproxyAgent.split('=')[1]);
    }
  }

  // Inicializa o servidor HTTP de requisições externas (usuários)
  const externalApiPort = await startHttpServer(`${serviceName}/external`, httpApiRouter.createExternalApi(), configfile.httpPortListenExternalUsers || null);

  // Inicializa o servidor HTTP de requisições internas (micro-serviços)
  const internalApiPort = await startHttpServer(`${serviceName}/internal`, httpApiRouter.createInternalApi(), configfile.httpPortListenInternalServices || null);

  recurrentTasks.runAtHour({ atHour: 0, taskName: 'DAILY-00:00-ONDAYCHANGE' }, async () => {
    googleApi.onDayChange();
  });

  // startTaskCpuUsage();
  // if (configfile.httpPortListenHaproxyAgent) {
  //   startServiceHaproxyAgent(configfile.httpPortListenHaproxyAgent);
  // }
  // startServiceUdpReport('api-async-' + internalApiPort);

  // Conecta ao broker MQTT
  logger.info('Conectando ao broker MQTT...');
  brokerMQTT.connectService(configfileGlobal.mqttBroker, !configfileGlobal.isProductionServer);
}

init().catch((err) => {
  logger.error(err);
  setTimeout(() => { process.exit(-1); }, 2000);
});

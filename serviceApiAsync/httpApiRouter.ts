import { apmServiceApiAsync } from './apmApiAsync';

import * as express from "express";
import { ErrorDetails } from "../srcCommon/helpers/detailedError";
import { SessionData } from "../srcCommon/types";
import { ExtraRouteParams } from "../srcCommon/types/backendTypes";
import type { API_private2 as API_External } from "../srcCommon/types/api-private";
export type { API_private2 as API_External } from "../srcCommon/types/api-private";
import type { API_Internal } from "./api-internal";
import { dielMultipartSimParser } from "../srcCommon/helpers/multipartDiel";
import * as overviewData from "./crossData/overviewData";
import * as dayCompilerDAC from "./dayCompilers/dac";
import * as dayCompilerDUT from "./dayCompilers/dut";
import * as dayCompilerDAM from "./dayCompilers/dam";
import * as dayCompilerDRI from "./dayCompilers/dri";
import * as dayCompilerDMA from "./dayCompilers/dma";
import * as dayCompilerDMT from "./dayCompilers/dmt";
import * as dayCompilerDAL from "./dayCompilers/dal";
import * as dacHist from "./telemHistory/dacHist";
import * as dutHist from "./telemHistory/dutHist";
import * as damHist from "./telemHistory/damHist";
import * as driHist from "./telemHistory/driHist";
import * as dmtHist from "./telemHistory/dmtHist";
import * as dalHist from "./telemHistory/dalHist";
import * as dmaHist from "./telemHistory/dmaHist";
import * as savings from "./telemHistory/savings";
import * as laagerHist from "./telemHistory/laagerHist";
import * as analiseIntegrada from "./analiseIntegrada";
import * as devTools from "./devTools";
import * as dutInfo from "./dutInfo";
import * as devsUpdates from "./devsFw/devsUpdates";
import * as greenAnt from "./integrations/greenAnt";
import * as weatherData from "./weatherData/weatherData";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import { acessLog, onNewReq, onReqEnd, logger } from "../srcCommon/helpers/logger";
import { saveLogRequest, saveLogRequestError } from "../srcCommon/db/dbModifLog";
import nameClients from "../srcCommon/helpers/clientApm";
import * as httpRouter from "./apiServer/httpRouter";
import * as i18nextMiddleware from "i18next-http-middleware";
import i18next from '../srcCommon/i18n';
import * as swaggerJsDoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from "./swagger/swaggerConfig";
import configfileGlobal from '../configfile';
import configfileServiceGateway from '../serviceGateway/configfile';
import { onReqPublicApiHttps } from '../srcCommon/helpers/gateway/httpApiRedirect';
import * as driInfo from './dri/driInfo';

export const externalRoutes: {
  [Route in keyof API_External]: (reqParams: Parameters<API_External[Route]>[0], session: SessionData, extra?: ExtraRouteParams) => ReturnType<API_External[Route]>;
} = {
  ['/automation-overview-card']: overviewData.automationOverviewCard,
  ['/health-overview-card']: overviewData.healthOverviewCard,
  ['/overview-card-rooms']: overviewData.overviewCardRooms,
  ['/overview-rooms-list']: overviewData.overviewRoomsList,
  ['/dac/get-recent-history']: dacHist.getRecentHistory,
  ['/dac/get-recent-history-v2']: dacHist.getRecentHistoryV2,
  ['/dac/get-usage-per-month']: dacHist.getEnergyConsumptionMonth,
  ['/dac/get-energy-consumption-month']: dacHist.getEnergyConsumptionMonth,
  ['/dac/get-day-charts-data']: dacHist.getDayChartsData,
  ['/dac/get-charts-data-common']: dacHist.getChartsDataCommon,
  ['/dac/get-day-consumption']: dacHist.getDayConsumption,
  ['/dac/get-energy-consumption']: dacHist.getEnergyConsumption,
  ['/dac/get-usage-per-day']: dacHist.getEnergyConsumption,
  ['/analise-integrada-export']: analiseIntegrada.analiseIntegradaExport,
  ['/get-autom-day-charts-data']: damHist.getAutomDayChartsData,
  ['/dri/get-day-charts-data-common']: driHist.getDayChartsDataCommon,
  ['/dut/get-day-charts-data']: dutHist.getDayChartsData,
  ['/dut/get-day-charts-data-commonX']: dutHist.getDayChartsDataCommonX,
  ['/dut/get-usage-per-day']: dutHist.getDutDuoUsagePerDay,
  ['/dut/get-usage-per-month']: dutHist.getDutDuoUsagePerMonth,
  ['/dut/get-day-stats']: dutHist.getDayStats,
  ['/dut/get-day-consumption']: dutHist.getDutDuoConsumptionPerDay,
  ['/dut/get-duts-duo-energy-efficiency']: dutHist.getDutsDuoEnergyEfficiency,
  ['/calculate-ecomode-savings']: savings.calculateEcomodeSavings,
  ['/unit-ecomode-savings']: savings.unitEcomodeSavings,
  ['/unit-automation-savings']: savings.unitAutomationSavings,
  ['/units-automation-savings']: savings.unitsAutomationSavings,
  ['/get-unit-energy-consumption']: greenAnt.getUnitEnergyConsumption,
  ['/get-unit-energy-consumption-commonX']: greenAnt.getUnitEnergyConsumptionCommonX,
  ['/get-unit-energy-consumption-byDay']: greenAnt.getUnitEnergyConsumptionByDay,
  ['/get-units-energy-consumption-byDay']: greenAnt.getUnitsEnergyConsumptionByDay,
  ['/get-weather-stations-near-unit']: weatherData.getWeatherStationsNearUnit,
  ['/get-weather-data-near-unit']: weatherData.getWeatherDataNearUnit,
  ['/get-weather-data-near-unit-commonX-v2']: weatherData.getWeatherDataNearUnitCommonXv2,
  ['/devtools/export-duts-temperatures']: devTools.exportDutsTemperatures,
  ['/devtools/export-duts-mean-temperatures']: devTools.exportDutsMeanTemperatures,
  ['/energy-efficiency-overview-card']: overviewData.energyEfficiencyOverviewCard,
  ['/dmt/get-nobreaks-charts-data']: dmtHist.getDayChartsData,
  ['/dmt/get-utilities-charts-data']: dmtHist.getDayChartsDataV2,
  ['/dal/get-illuminations-charts-data']: dalHist.getDayChartsData,
  ['/laager/get-daily-usage-history']: laagerHist.getDailyUsageHistory,
  ['/laager/get-meter-mean-history']: laagerHist.getMeterMeanHistory,
  ['/devtools/export-waters-usages']: devTools.exportWaterUsages,
  ['/dev/command-ota']: devsUpdates.commandOta,
  ['/dev/request-firmware-info']: devsUpdates.requestFirmwareInfo,
  ['/dac/update-history-psuc-virtual']: dacHist.updateHistoryDacL1Psuc
};

export const internalRoutes: API_Internal = {
  ['/diel-internal/api-async/processDacDay']: dayCompilerDAC.processDacDay,
  ['/diel-internal/api-async/processDutDay']: dayCompilerDUT.processDutDay,
  ['/diel-internal/api-async/processDamDay']: dayCompilerDAM.processDamDay,
  ['/diel-internal/api-async/processDriDay']: dayCompilerDRI.processDriDay,
  ['/diel-internal/api-async/processDmaDay']: dayCompilerDMA.processDmaDay,
  ['/diel-internal/api-async/processDmtDay']: dayCompilerDMT.processDmtDay,
  ['/diel-internal/api-async/processDalDay']: dayCompilerDAL.processDalDay,
  ['/diel-internal/api-async/get_unit_power_consumption']: greenAnt.get_unit_power_consumption,
  ['/diel-internal/api-async/getDutDaySimpleStats']: dutHist.getDutDaySimpleStats,
  ['/diel-internal/api-async/getDailyUsage']: dacHist.getDailyUsage,
  ['/diel-internal/api-async/getDmaDayUsage']: dmaHist.getDmaDayUsage,
  ['/diel-internal/api-async/getDmaMeanHistory']: dmaHist.getDmaMeanHistory,
  ['/diel-internal/api-async/updateDutInfoSchedule']: dutInfo.updateDutInfoSchedule,
  ['/diel-internal/api-async/sendDriCurrentSchedules']: driInfo.sendDriCurrentSchedules,
};

export type RouteCallback = (
  reqParams: { [k:string]: any },
  session?: SessionData,
  extra?: {
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  }
) => Promise<string|Object|express.Response>

async function confApm (user: string, perfil: string) {
  if(user  != undefined){
    const clients = await nameClients(user)
    const clientsString: string = clients.join(", ");
    apmServiceApiAsync.setCustomUserApmApiAsync(user, clientsString, perfil);
  }
  else {
    apmServiceApiAsync.setCustomUserApmApiAsync("(no session)", "(no session)", "(no session)");
  }
}

export function asSafeRoute (handlerFunction: RouteCallback) {
  return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    let reqId: string;
    try {
      const reqParams = Object.assign({}, req.query || {}, req.params || {}, req.body || {});
      reqId = configfileGlobal.logUdpPort && onNewReq(req.path, req.session?.user, JSON.stringify(reqParams).substring(0, 1000));
      const response = await handlerFunction(reqParams, req.session, { req, res, next })
      reqId && onReqEnd(reqId);
      if (response === res) {
        // Already responded
      }
      else if (typeof response === 'object') {
        res.status(200).json(response)
      }
      else if (response != null) {
        res.status(200).send(String(response))
      } else {
        throw new Error('Route with empty response').HttpStatus(500);
      }
    } catch (err) {
      reqId && onReqEnd(reqId);
      next(err);
    }
  }
}

const expressErrorHandler: express.ErrorRequestHandler = function (err, req, res, _next) {
  try {
    const user = (req.session && req.session.user) || "(no session)";
    if (req.body && req.body.password) req.body.password = "****";
    if (req.query && req.query.password) req.query.password = "****";
    const dbgPars = JSON.stringify({
      params: req.params,
      query: req.query,
      body: req.body,
    });
    if (req.session && err) {
      saveLogRequestError(
        req.originalUrl,
        req.session && req.session.user,
        err.Status,
        err.message ||
          (err.response &&
            err.response.data &&
            err.response.data.toString &&
            err.response.data.toString())
      );
    }
    logger.error({
      message: `[API-ASYNC] There was an error processing route ${req.originalUrl}`,
      url: req.originalUrl,
      user: user,
      parameters: dbgPars,
      err: err
    });
  } catch (err2) {
    logger.error(err2);
  }
  try {
    const detailedError: ErrorDetails = err && err.detailedError;
    if (detailedError) {
      logger.error(err);
      res.status(detailedError.httpStatus).json({
        messageToUser: err.message,
      });
    } else {
      const debugInfo = err && err.debugInfo;
      if (debugInfo) {
        delete err.debugInfo;
      }
      if (err && err.Status) {
        logger.error(err);
        if (err.errorCode) {
          res.status(err.Status).json({
            errorCode: err.errorCode,
            errorDebug: err.frontDebug,
            errorMessage: err.errorMessage || err.message,
          });
        } else {
          res.status(err.Status).send(err.message);
        }
        if (debugInfo) logger.info(JSON.stringify(debugInfo));
      } else {
        if (err && err.isAxiosError) {
          delete err.request;
          if (err.response) {
            delete err.response.request;
            delete err.response.config;
          }
        }

        if (err) {
          // logger.error({
          //   message: 'There was an error processing route',
          //   url: req.originalUrl,
          //   user: req.session?.user,
          //   err: err
          // });
          logger.error(err);
          logger.error(`url: ${req.originalUrl} - user: ${req.session && req.session.user} - error: ${JSON.stringify(err)}`);
        }

        res.status(500).send("Unhandled error!");
        eventWarn.typedWarn("UNHANDLED", `${req.originalUrl}\n` + String(err));
      }
    }
  } catch (err2) {
    logger.error(err2);
  }
};

export function createExternalApi() {
  const app = express();

  acessLog(app);
  app.use(i18nextMiddleware.handle(i18next))
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.set('Access-Control-Allow-Methods', 'POST,GET');
    res.set('Access-Control-Allow-Headers', 'content-type, authorization');
    if (req.method === 'OPTIONS') {
      res.end();
      return;
    }
    if (req.originalUrl === '/') { res.end('hello'); return; }
    next();
  });

  app.use((req, res, next) => onReqPublicApiHttps(req, res, next, configfileServiceGateway));
  app.use(dielMultipartSimParser);

  const jsonParserNormal = express.json();
  const jsonParserBigFiles = express.json({ limit: '200mb' });
  const routesCustomMiddleware = ['/add-client-unified-batch', '/unit/export-real-time'];
  app.use((req, res, next) => {
    if (routesCustomMiddleware.includes(req.url)) {
      jsonParserBigFiles(req, res, next);
    } else {
      jsonParserNormal(req, res, next);
    }
  });

  const swaggerDocs = swaggerJsDoc(swaggerConfig);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  for (const [route, callback] of Object.entries(httpRouter.publicRoutes)) {
    const handlerFunction = asSafeRoute(callback);
    app.post(route, handlerFunction);
    app.get(route, handlerFunction);
  }

  app.use((req, res, next) => {
    if (req.session) {
      next();
    } else {
      res.status(401).end('Unauthorized access');
    }
  });

  app.use((req, _res, next) => {
    saveLogRequest(
      req.originalUrl,
      req.session && req.session.user,
      Object.assign({}, req.query || {}, req.params || {}, req.body || {})
    );
    const userName: string = req.session?.user;
    const perString: string = req.session?.permissions.PER_CLIENT.flatMap((item: { p: any; }) => item.p).join(', ');
    confApm(userName,perString);
    next();
  });
  for (const [route, callback] of Object.entries(externalRoutes)) {
    const handlerFunction = asSafeRoute(callback as any);
    app.all(route, handlerFunction);
  }
  for (const [route, callback] of Object.entries(httpRouter.privateRoutes)) {
    const handlerFunction = asSafeRoute(callback);
    app.all(route, handlerFunction);
  }
  for (const [route, callback] of Object.entries(
    httpRouter.privateRoutesDeprecated
  )) {
    const handlerFunction = asSafeRoute(callback);
    app.post(route, handlerFunction);
    app.get(route, handlerFunction);
  }

  app.use((req, res) => res.status(404).send('Not found: ' + req.originalUrl));

  app.use(expressErrorHandler);

  return app;
}

export function createInternalApi () {
  const app = express();

  acessLog(app);

  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') { res.end(); return; }
    if (req.originalUrl === '/') { res.end('hello'); return; }
    next();
  });

  app.use(express.json());

  for (const [route, callback] of Object.entries(internalRoutes)) {
    const handlerFunction = asSafeRoute(callback as any);
    app.all(route, handlerFunction);
  }
  app.use((req, res) => res.status(404).send('Not found: ' + req.originalUrl));

  app.use(expressErrorHandler);

  return app;
}

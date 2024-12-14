import { apmServiceHealth } from './apmHealth';

import * as express from "express";
import { ErrorDetails } from "../srcCommon/helpers/detailedError";
import { SessionData } from "../srcCommon/types";
import { ExtraRouteParams } from '../srcCommon/types/backendTypes';
import type { API_serviceHealth as API_External } from "../srcCommon/types/api-private";
export type { API_serviceHealth as API_External } from "../srcCommon/types/api-private";
import { API_Internal } from "./api-interface";
import { dielMultipartSimParser } from "../srcCommon/helpers/multipartDiel";
import * as dacHealth from "./dacHealth";
import * as assetHealth from "./assetHealth"
import * as dacRTchecks from "./dacRTchecks";
import { acessLog, logger } from "../srcCommon/helpers/logger";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import { saveLogRequest, saveLogRequestError } from "../srcCommon/db/dbModifLog";
import nameClients from "../srcCommon/helpers/clientApm";

export const externalRoutes: {
  [Route in keyof API_External]: (reqParams: Parameters<API_External[Route]>[0], session: SessionData, extra: ExtraRouteParams) => ReturnType<API_External[Route]>;
} = {
  ['/faults/get-fault-codes']: dacHealth.faults_getFaultCodes,
  ['/dac/get-health-status']: dacHealth.dac_getHealthStatus,
  ['/dac/save-health-info']: dacHealth.dac_saveHealthInfo,
  ['/dac/save-observation-info']: dacHealth.dac_saveObservationInfo,
  ['/dac/edit-observation-info']: dacHealth.dac_editObservationInfo,
  ['/dac/detected-fault-confirmation']: dacHealth.dac_detectedFaultConfirmation,
  ['/get-dacs-faults']: dacHealth.getDacsFaults,
  ['/export-dacs-faults']: dacHealth.exportDacsFaults,
  ['/dac/falha-repentina-detectada-v2']: dacRTchecks.dac_falhaRepentinaDetectadaV2,
  ['/dev/get-fr-list-updates']: dacRTchecks.dev_getFrListUpdates,
  ['/dev/get-fr-list-updates-v2']: dacRTchecks.dev_getFrListUpdatesV2,
  ['/dev/falha-repentina-detectada']: dacRTchecks.dev_falhaDetectada,
  ['/dac/get-health-hist']: dacHealth.dac_getHealthHist,
  ['/delete-dac-health-hist']: dacHealth.deleteDacHealthHist,
  ['/dac/get-observation']: dacHealth.dac_getObservation,
  ['/delete-dac-observation']: dacHealth.deleteDacObservation,
  ['/dac/get-installation-faults']: dacHealth.dac_getInstallationFaults,
  ['/dac/falha-instalacao-detectada']: dacRTchecks.dac_falhaInstalacaoDetectada,
  ['/ignore-fault-check']: dacHealth.ignoreFaultCheck,
  ['/dac/get-fr-history']: dacHealth.dac_getFrHistory,
  ['/dac/get-fault-descs']: dacHealth.dac_getFaultDescs,
  ['/dac/enable-faults-dac']: dacHealth.dac_getEnableFaultsDac,
  ['/dac/enable-faults']: dacHealth.dac_postEnableFaults,
  ['/dac/get-enable-faults-all']: dacHealth.dac_getEnableFaultsAll,
  ['/asset/get-health-status']: assetHealth.getAssetHealthStatus,
  ['/asset/save-health-info']: assetHealth.assetSaveHealthInfo,
  ['/asset/get-health-hist']: assetHealth.assetHealthHist,
  ['/asset/delete-health-hist']: assetHealth.deleteHealthHist,
  ['/asset/list-enabled-faults']: assetHealth.assetListEnabledFaults,
  ['/asset/enable-faults']: assetHealth.assetEnableFaults,
  ['/asset/save-observation-info']: assetHealth.assetSaveObs,
  ['/asset/edit-observation-info']: assetHealth.assetEditObs,
  ['/asset/get-observation']: assetHealth.assetGetObs,
  ['/asset/delete-observation']: assetHealth.assetDeleteObs,
  ['/dev/get-faults']: assetHealth.getDevsFaults,
};

export const internalRoutes: API_Internal = {
  '/diel-internal/health/setDacHealthStatus': dacHealth.setDacHealthStatus,
  '/diel-internal/health/getDacHIndex': dacHealth.getDacHIndex,
  '/diel-internal/health/dac/falha-repentina-detectada-v2': dacRTchecks.dac_falhaRepentinaDetectadaV2_internal,
  '/diel-internal/health/dac/falha-instalacao-detectada': dacRTchecks.dac_falhaInstalacaoDetectada_internal,
  '/diel-internal/health/dev/get-fr-list-updates': dacRTchecks.dev_getFrListUpdates_internal,
  '/diel-internal/health/dev/get-fr-list-updates-v2': dacRTchecks.dev_getFrListUpdatesV2_internal,
  '/diel-internal/health/dac/get-health-hist': dacHealth.dac_getHealthHist_internal,
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
    apmServiceHealth.setCustomUserApmHealth(user, clientsString, perfil);
  }
  else {
    apmServiceHealth.setCustomUserApmHealth("(no session)", "(no session)", "(no session)");
  }
}

export function asSafeRoute (handlerFunction: RouteCallback) {
  return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const startTS = Date.now();
      const reqParams = Object.assign({}, req.query || {}, req.params || {}, req.body || {});
      const response = await handlerFunction(reqParams, req.session, { req, res, next })
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
    } catch (err) { next(err); }
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
      message: `[HEALTH] There was an error processing route ${req.originalUrl}`,
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
          logger.error({
            message: `[HEALTH] There was an error processing route ${req.originalUrl}`,
            url: req.originalUrl,
            user: req.session?.user,
            err: err
          });
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

  app.use(dielMultipartSimParser);
  app.use(express.json());

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

    confApm(userName, perString);
    next();
  });
  for (const [route, callback] of Object.entries(externalRoutes)) {
    const handlerFunction = asSafeRoute(callback as any);
    app.all(route, handlerFunction);
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

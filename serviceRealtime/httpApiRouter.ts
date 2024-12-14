import { apmServiceRealtime } from './apmRealtime';

import * as express from "express";
import { ErrorDetails } from "../srcCommon/helpers/detailedError";
import { SessionData } from "../srcCommon/types";
import type { API_Internal, InternalRequestSession } from "./api-internal";
import type { API_serviceRealtime as API_External } from "../srcCommon/types/api-private";
export type { API_serviceRealtime as API_External } from "../srcCommon/types/api-private";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import { acessLog, logger } from "../srcCommon/helpers/logger";
import { saveLogRequest, saveLogRequestError } from "../srcCommon/db/dbModifLog";
import { ExtraRouteParams } from "../srcCommon/types/backendTypes";
import { dielMultipartSimParser } from "../srcCommon/helpers/multipartDiel";
import * as lastTelemetries from "./internalApi/lastTelemetries";
import * as ramCaches from "./ramCaches";
import * as devsSystemDebug from "./ramCaches/devsSystemDebug";
import * as dmaInfo from "./dma/dmaInfo";
import * as devTools from "./devTools";
import * as serversStatus from "./realTime/serversStatus";
import nameClients from "../srcCommon/helpers/clientApm";
import { TLSSocket } from "tls";
import { getReqClientIP, ipIsLAN } from '../srcCommon/helpers/network/ipTools';

const externalRoutes: {
  [Route in keyof API_External]: (reqParams: Parameters<API_External[Route]>[0], session: SessionData, extra: ExtraRouteParams) => ReturnType<API_External[Route]>;
} = {
  ['/dma/set-sampling-period']: dmaInfo.setSamplingPeriod,
  ['/realtime/devtools/publish_dev_cmd']: devTools.publish_dev_cmd,
  ['/realtime/devtools/get_uNotifs']: devTools.get_uNotifs,
  ['/realtime/devtools/buildCoolAutNotifs']: devTools.buildCoolAutNotifs,
};

const internalRoutes: API_Internal = {
  ['/diel-internal/realtime/getDevicesLastTelemetries']: lastTelemetries.getDevicesLastTelemetries,
  ['/diel-internal/realtime/getDevicesLastTS']: lastTelemetries.getDevicesLastTS,
  ['/diel-internal/realtime/getDevsSystemInfo']: devsSystemDebug.getDevsSystemInfo,
  ['/diel-internal/realtime/triggerRamCacheUpdate']: ramCaches.triggerRamCacheUpdate,
  ['/diel-internal/realtime/setServerStatus_broker2dynamo']: serversStatus.setServerStatus_broker2dynamo,
  ['/diel-internal/realtime/setServerStatus_brokersGateway']: serversStatus.setServerStatus_brokersGateway,
  ['/diel-internal/realtime/setServerStatus_iotRelay']: serversStatus.setServerStatus_iotRelay,
  ['/diel-internal/realtime/getServersList']: serversStatus.getServersList,
};

type RouteCallback = (
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
    apmServiceRealtime.setCustomUserApmRealtime(user, clientsString, perfil);
  }
  else {
    apmServiceRealtime.setCustomUserApmRealtime("(no session)", "(no session)", "(no session)");
  }
}

export function asSafeRoute (handlerFunction: RouteCallback) {
  return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
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
      message: `[REALTIME] There was an error processing route ${req.originalUrl}`,
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
            message: `[REALTIME] There was an error processing route ${req.originalUrl}`,
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

    if (
      req.socket &&
      (req.socket as TLSSocket).authorized &&
      !req.get("Authorization")
    ) {
      saveLogRequest(
        req.originalUrl,
        "(tls)",
        Object.assign({}, req.query || {}, req.params || {}, req.body || {})
      );
    }

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

    confApm(userName,perString);
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

    const session = buildSessionForInternalRequest(req);
    if (!ipIsLAN(session.clientIP)) {
      res.status(403).send('Forbidden origin IP');
      return;
    }
    Object.assign(req, { session });

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

export function createExternalWsApi() {
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

  app.use((req, res) => res.status(404).send('Not found: ' + req.originalUrl));

  app.use(expressErrorHandler);

  return app;
}

function buildSessionForInternalRequest(req: express.Request): InternalRequestSession {
  const { clientIP } = getReqClientIP(req);

  return {
    clientIP,
  };
}

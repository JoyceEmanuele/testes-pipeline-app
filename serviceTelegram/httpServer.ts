import { apmServiceTelegram } from './apmTelegram';

import * as express from "express";
import { ErrorDetails } from "../srcCommon/helpers/detailedError";
import { logger, acessLog } from "../srcCommon/helpers/logger";
import { API_Internal } from "./api-interface";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import { saveLogRequestError } from "../srcCommon/db/dbModifLog";
import * as tgClient from "./tgClient";

const internalRoutes: API_Internal = {
  '/diel-internal/telegram/send-message-to': tgClient.sendMessageTo,
  '/diel-internal/telegram/send-message-to-multiple': tgClient.sendMessageToMultiple,
  '/health_check': tgClient.health_check,
};

type RouteCallback = (
  reqParams: { [k:string]: any },
  session?: void,
  extra?: {
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  }
) => Promise<string|Object|express.Response>

function asSafeRoute (handlerFunction: RouteCallback) {
  return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const reqParams = Object.assign({}, req.query || {}, req.params || {}, req.body || {});
      const response = await handlerFunction(reqParams, null, { req, res, next });
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
      message: `[TELEGRAM] There was an error processing route ${req.originalUrl}`,
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
            message: `[TELEGRAM] There was an error processing route ${req.originalUrl}`,
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

export function createInternalApi() {
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

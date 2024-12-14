import { apmServiceAuth } from './apmAuth';

import * as express from "express";
import { ErrorDetails } from "../srcCommon/helpers/detailedError";
import { SessionData } from "../srcCommon/types";
import type { API as API_Internal } from "./internal-api-def";
import * as login from "./login";
import { logger, acessLog } from "../srcCommon/helpers/logger";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import { saveLogRequestError } from "../srcCommon/db/dbModifLog";
import nameClients from "../srcCommon/helpers/clientApm";

export const internalRoutes: {
  [Route in keyof API_Internal]: (body: Parameters<API_Internal[Route]>[0]) => Promise<ReturnType<API_Internal[Route]>>;
} = {
  ['/diel-internal/auth/check-auth-header']: (body) => login.processHttpAuth(body.authHeader),
  ['/diel-internal/auth/check-user-password']: (body) => login.checkUserPassword(body),
  ['/diel-internal/auth/generate-jwt-token']: async (body) => { const token = await login.saveJwtSession(body.user, body.fakeProfile); return { token }; },
  ['/diel-internal/auth/get-user-session']: async (body) => login.authAndGetSession(body),
  ['/diel-internal/auth/impersonate']: async (body) => login.impersonate(body),
  ['/diel-internal/auth/craft-token']: async (body) => login.craftToken(body),
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
    apmServiceAuth.setCustomUserApmAuth(user, clientsString,perfil);
  }
  else {
    apmServiceAuth.setCustomUserApmAuth("(no session)", "(no session)", "(no session)");
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
        const responseObj = JSON.parse(JSON.stringify(response));
        const userName: string = responseObj.session?.user;
        const perString: string = responseObj.session?.permissions.PER_CLIENT.flatMap((item: { p: any; }) => item.p).join(', ');

        await confApm(userName,perString);
        
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
      message: `[AUTH] There was an error processing route ${req.originalUrl}`,
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
            message: `[AUTH] There was an error processing route ${req.originalUrl}`,
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
    if (req.method === 'OPTIONS') {
      res.end();
      return;
    }
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

import * as express from "express";
import { ErrorDetails } from "../detailedError";
import { SessionData, InternalRequestSession } from "../../types";
import * as eventWarn from "../eventWarn";
import { acessLog, logger } from "../logger";
import { saveLogRequest, saveLogRequestError } from "../../db/dbModifLog";
import { getReqClientIP, ipIsLAN } from './ipTools';
import { dielMultipartSimParser } from "../multipartDiel";
import * as i18nextMiddleware from "i18next-http-middleware";
import i18next from '../../i18n';
import nameClients from "../clientApm";

type RouteCallback = (
  reqParams: any, // { [k:string]: any },
  session?: any, // SessionData|InternalRequestSession,
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

function getErrorHandler(serviceName: string): express.ErrorRequestHandler {
  return function (err, req, res, _next) {
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
        message: `[${serviceName}] There was an error processing route ${req.originalUrl}`,
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
            //   message: `[${serviceName}] There was an error processing route ${req.originalUrl}`,
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
}

export function createInternalApi(
  serviceName: string,
  internalRoutes: { [path: string]: RouteCallback },
) {
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

  app.use(getErrorHandler(serviceName));

  return app;
}

export function createExternalApi(
  serviceName: string,
  publicRoutes: { [path: string]: RouteCallback },
  privateRoutes: { [path: string]: RouteCallback },
  apmService?: { setCustomUserApmApiAsync: (user: string, clientsString: string, perfil: string) => void },
) {
  const app = express();

  acessLog(app);
  app.use(i18nextMiddleware.handle(i18next));
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

  // const swaggerDocs = swaggerJsDoc(swaggerConfig);
  // app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  for (const [route, callback] of Object.entries(publicRoutes)) {
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

  async function confApm (session?: SessionData) {
    try {
      const user: string = session?.user;
      const perfil: string = session?.permissions.PER_CLIENT.flatMap((item: { p: any; }) => item.p).join(', ');
      if (user != undefined) {
        const clients = await nameClients(user)
        const clientsString: string = clients.join(", ");
        apmService.setCustomUserApmApiAsync(user, clientsString, perfil);
      }
      else {
        apmService.setCustomUserApmApiAsync("(no session)", "(no session)", "(no session)");
      }
    } catch(err) { logger.error(err); }
  }

  app.use((req, _res, next) => {
    saveLogRequest(
      req.originalUrl,
      req.session && req.session.user,
      Object.assign({}, req.query || {}, req.params || {}, req.body || {})
    );
    confApm(req.session);
    next();
  });

  for (const [route, callback] of Object.entries(privateRoutes)) {
    const handlerFunction = asSafeRoute(callback);
    app.all(route, handlerFunction);
  }

  app.use((req, res) => res.status(404).send('Not found: ' + req.originalUrl));

  app.use(getErrorHandler(serviceName));

  return app;
}

function buildSessionForInternalRequest(req: express.Request): InternalRequestSession {
  const { clientIP } = getReqClientIP(req);

  return {
    clientIP,
  };
}

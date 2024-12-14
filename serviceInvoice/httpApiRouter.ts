import { apmServiceInvoice } from './apmInvoice'
import * as express from "express";
import * as eventWarn from "../srcCommon/helpers/eventWarn";
import {
  saveInvoiceLogRequest,
  saveInvoiceLogRequestError,
} from "../srcCommon/db/dbModifLog";
import { logger, acessLog } from "../srcCommon/helpers/logger";
import { SessionData } from '../srcCommon/types'
import API_invoice from '../srcCommon/types/api-invoice'
import nameClients from "../srcCommon/helpers/clientApm";

export const invoiceRoutes: API_invoice = <any>{};

export type RouteCallback = (
  reqParams: {[k:string]:any},
  session: SessionData,
  extra?: {
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  }
) => Promise<string|Object|express.Response>

async function confApm (user: string, perfil: string) {
  if(user  != undefined){
    apmServiceInvoice.setCustomUserApmInvoice(user, user, perfil);
  }
  else {
    apmServiceInvoice.setCustomUserApmInvoice("(no session)", "(no session)", "(no session)");
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

const expressInvoiceErrorHandler: express.ErrorRequestHandler = function (
  err,
  req,
  res,
  _next
) {
  try {
    const user = (req.session && req.session.user) || "(no session)";
    const dbgPars = JSON.stringify({
      params: req.params,
      query: req.query,
      body: req.body,
    });
    if (err) {
      saveInvoiceLogRequestError(
        req.originalUrl,
        "[4docs]",
        err.Status,
        err.message ||
          (err.response &&
            err.response.data &&
            err.response.data.toString &&
            err.response.data.toString())
      );
    }
    logger.error({
      message: `[INVOICE] There was an error processing route ${req.originalUrl}`,
      url: req.originalUrl,
      user: user,
      parameters: dbgPars,
      err: err
    });
  } catch (err2) {
    logger.error(err2);
  }
  try {
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
          message: `[INVOICE] There was an error processing route ${req.originalUrl}`,
          url: req.originalUrl,
          user: req.session?.user,
          err: err
        });
      }
      res.status(500).send("Unhandled error!");
      eventWarn.typedWarn("UNHANDLED", `${req.originalUrl}\n` + String(err));
    }
  } catch (err2) {
    logger.error(err2);
  }
};

export function createExternalApi() {
  const app = express();

  acessLog(app);

  app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", req.get("origin") || "*");
    res.set("Access-Control-Allow-Methods", "POST,GET,PATCH");
    res.set("Access-Control-Allow-Headers", "Content-Type, authorization");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }

    next();
  });

  app.use(express.json({ limit: "200mb" }));

  app.get("/hello", (_req, res) => res.send("hello world"));

  app.use((req, _res, next) => {
    saveInvoiceLogRequest(
      req.originalUrl,
      "[4docs]",
      Object.assign({}, req.query || {}, req.params || {}, req.body || {})
    );
    confApm("[4docs]","[4docs]");
    next();
  });

  for (const [route, callback] of Object.entries(invoiceRoutes)) {
    const handlerFunction = asSafeRoute(callback);
    app.post(route, handlerFunction);
    app.get(route, handlerFunction);
    app.patch(route, handlerFunction);
  }
  app.use((req, res) => res.status(404).send("Not found: " + req.originalUrl));

  app.use(expressInvoiceErrorHandler);

  return app;
}

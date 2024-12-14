import * as express from "express";
import * as fs from "fs";
import { authEndpoint, authMiddleware, loginPage } from "./auth";
import { logger, acessLog } from "../srcCommon/helpers/logger";

const expressErrorHandler: express.ErrorRequestHandler = function (err, req, _res, _next) {
  logger.error({
    message: `[SW-DOCS] There was an error processing route ${req.originalUrl}`,
    url: req.originalUrl,
    err: err
  });
};

export function createExternalApi() {
  const app = express();

  acessLog(app);

  app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", req.get("origin") || "*");
    res.set("Access-Control-Allow-Methods", "POST,GET");
    res.set("Access-Control-Allow-Headers", "Content-Type, authorization");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }
    next();
  });

  app.get("/hello", (_req, res) => res.send("hello world"));
  app.get("/login", loginPage);
  app.post("/auth", express.json(), authEndpoint);
  app.use(authMiddleware);

  if (fs.existsSync('./serviceSWDocs/servedpages')) {
    app.use(express.static('./serviceSWDocs/servedpages'));
  } else {
    app.get("/", (_req, res) => res.send("Nada aqui"));
  }

  app.use((req, res) => res.status(404).send("Not found: " + req.originalUrl));

  app.use(expressErrorHandler);

  return app;
}

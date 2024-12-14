import * as morgan from "morgan";
import * as path from "path";
import * as rfs from "rotating-file-stream";
import * as winston from "winston";
import 'winston-daily-rotate-file';
import configfile from '../../configfile'
import * as dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import * as recurrentTasks from './recurrentTasks';

const logger_winston = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "API-Server" },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "log", "app-%DATE%.log"),
      level: "info",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: 10,
    })
  ],
});

const instancia = Math.round(Math.random() * 1000);
export function debugLog(...pars: any[]) {
  console.log('DBGLOG[]', instancia, ...pars);
}

export const logger = {
  info(...pars: any[]) {
    console.info(...pars);
    (logger_winston as any).info(...pars);
  },
  error(...pars: any[]) {
    console.error(...pars);
    (logger_winston as any).error(...pars);
  },
  warn(...pars: any[]) {
    console.warn(...pars);
    (logger_winston as any).warn(...pars);
  },
  log(...pars: any[]) {
    console.log(...pars);
    (logger_winston as any).log(...pars);
  },
};

const databaseLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "API-Server" },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "log", "db-%DATE%.log"),
      level: "info",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: 10,
    })
  ],
});

const commandLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "API-Server" },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "log", "cmd-%DATE%.log"),
      level: "info",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: 10,
    })
  ],
});

const controlLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {},
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "log", "control-%DATE%.log"),
      level: "info",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "200m",
      maxFiles: 10,
    })
  ],
});

const admErrorLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {},
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "log", "admerror-%DATE%.log"),
      level: "info",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "200m",
      maxFiles: 10,
    })
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (!configfile.isProductionServer) {
  databaseLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    })
  );

  commandLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    })
  );
}

export function dbLogger (table: string, sentence: string, qPars: {}, user: string) {
  databaseLogger.info({
    table: table,
    sentence: sentence,
    qPars: qPars,
    user: user
  })
}

export function cmdLogger (devId: string, user: string, payload: {}, date: string) {
  commandLogger.info({
    devId: devId,
    user: user,
    payload: payload,
    date: date,
  })
}

export function ctrlLogger (devId: string, payload: {}) {
  controlLogger.info({
    devId: devId,
    payload: payload
  })
}

export function admLogger (msg: string) {
  console.log(msg);
  admErrorLogger.info({
    msg,
  });
}

export function acessLog(app: any) {
  const setResponseBody = (req: any, res: any, next: any) => {
    const oldWrite = res.write,
      oldEnd = res.end,
      chunks: any = [];

    res.write = function (chunk: any) {
      chunks.push(Buffer.from(chunk));
      oldWrite.apply(res, arguments);
    };

    res.end = function (chunk: any) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      if (res.statusCode && (res.statusCode >= 400) && (res.statusCode < 600)) {
        const body = Buffer.concat(chunks).toString("utf8");
        res.__custombody__ = body;
      } else {
        res.__custombody__ = '';
      }
      oldEnd.apply(res, arguments);
    };
    next();
  };

  const pad = (num: number) => (num > 9 ? "" : "0") + num;
  const fileNameGenerator = (time: any, index: any) => {
    if (!time) return "access.log";

    const year = time.getFullYear()
    const month = pad(time.getMonth() + 1);
    const day = pad(time.getDate());

    return `access-${year}-${month}-${day}-${index}.log`;
  };

  // create a rotating write stream
  const accessLogStream = rfs.createStream(fileNameGenerator, {
    interval: '1d', // rotate every 1 days
    maxFiles: 10,
    size: '250M', // rotates the file when size exceeds 250 MegaBytes
    path: path.join(process.cwd(), "log"),
  });

  morgan.token("user", (req: any, res: any) => {
    return req.session?.user ? req.session.user : "no_session";
  });

  morgan.token("remoteAddr", (req: any, res: any) => {
    return req.headers['x-forwarded-for'] || String(req.socket.remoteAddress);
  });

  morgan.token("requestBody", (req: any, res: any) => {
    let newReq = { ...req}; // clone req

    if (newReq.body?.password) newReq.body.password = "****";

    return newReq.body ? JSON.stringify(newReq.body) : "no_req_body";
  });

  morgan.token("responseBody", function (req: any, res: any) {
    return res["__custombody__"] ? res["__custombody__"] : "no_res_body";
  });

  app.use(setResponseBody);

  // setup the logger
  app.use(
    morgan(
      ":remoteAddr :user :date[iso] :method :url HTTP/:http-version :status ':requestBody' ':responseBody' :res[content-length] :response-time ':user-agent'",
      {
        stream: accessLogStream,
      }
    )
  );
}

const udpLogClient: dgram.Socket = configfile.logUdpPort ? dgram.createSocket('udp4') : null;
function logUdp(msg: string) {
  if (!configfile.logUdpPort) return;
  /* if (msg.length > 1300) msg = msg.substring(0, 1300) + '...'; */
  udpLogClient.send(Buffer.from(msg), configfile.logUdpPort, '127.0.0.1', (_err) => {});
}

function generateReqId(path: string, user: string) {
  return `${new Date().toISOString()}§${Math.floor(Math.random() * 100000)}§${path}§${user}`;
}

const onGoingReqs: Set<string> = new Set();
export function onNewReq(path: string, user: string, reqParams: string): string {
  if (!configfile.logUdpPort) {
      return null;
  }

  // logUdp(`${reqId}§§C§§${JSON.stringify(reqParams)}`);

  if (onGoingReqs.size >= 1000) {
      // Provavelmente tem erro nesta contagem
      return null;
  }

  const reqId = generateReqId(path, user);
  onGoingReqs.add(reqId);

  return reqId;
}

export function onReqEnd(reqId: string) {
  if (!reqId) return;
  // logUdp(`${reqId}§§F§§${new Date().toISOString()}`);
  onGoingReqs.delete(reqId);
}

export function startServiceUdpReport(instanceId: string) {
  const header = `@STATS@${instanceId}\n`;

  recurrentTasks.runLoop({
      iterationPause_ms: 3000,
      taskName: 'UDP-REPORT',
      hideIterationsLog: true,
      subExecTimeFromPause: false,
      initialDelay_ms: 2000,
  }, async (opts) => {
      try {
        if (!udpLogClient) return;

        const udpReport = header + Array.from(onGoingReqs).join('\n');

        udpLogClient.send(Buffer.from(udpReport), configfile.logUdpPort, '127.0.0.1', (_err) => {});
      } catch(err) {
        logger.error(err);
        opts.logBackgroundTask(err?.toString());
      }
  });
}

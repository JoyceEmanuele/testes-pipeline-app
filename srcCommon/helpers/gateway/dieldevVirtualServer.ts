import * as http from 'node:http';

type ConfigFile = {
  dieldevDefaultLink: string
  dieldevLinks?: {
    [path: string]: string
  }
};

export function convertLink(req: http.IncomingMessage, configfile: ConfigFile) {
  if (configfile.dieldevLinks?.[req.url]) {
    return configfile.dieldevLinks[req.url];
  } else {
    return configfile.dieldevDefaultLink.replace('$DEVID$', req.url.substring(1));
  }
  // res.writeHead(302, { location });
  // res.end();
}

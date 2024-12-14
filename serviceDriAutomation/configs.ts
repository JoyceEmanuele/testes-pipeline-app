import * as fs from 'node:fs';
import * as path from 'node:path';
import * as configfile_example from './configfile_example.json';
import { logger } from '../srcCommon/helpers/logger';

export const serviceName = __dirname.split(path.sep).pop();

// This line is just to raise an error if the "configfile_example.json" is not in sync with the interface "ConfigFile".
const _check: ConfigFile = configfile_example;

export interface ConfigFile {
  serviceDriAutomation: {
    httpPortListenInternalServices: number
  }
};

let configfile: ConfigFile = JSON.parse(fs.readFileSync(`./${serviceName}/configfile_example.json`, 'utf8'));

if (fs.existsSync(`./${serviceName}/configfile.json`)) {
  configfile = JSON.parse(fs.readFileSync(`./${serviceName}/configfile.json`, 'utf8'));
} else {
  logger.warn('The configfile.json is missing, will use configfile_example.json');
}

if (!configfile.serviceDriAutomation) throw Error("There is something wrong with the configfile");

export default configfile.serviceDriAutomation;

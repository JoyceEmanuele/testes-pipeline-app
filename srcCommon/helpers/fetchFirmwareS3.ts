import configfile from '../../configfile'
import { compareVersions, parseFirmwareVersion } from './fwVersion';
import { listS3folderContents } from '../../srcCommon/s3/connectS3';
import { logger } from '../../srcCommon/helpers/logger';

function is_version_latter(versionA: string, versionB: string) {
  const versionA_split = parseFirmwareVersion(versionA);
  const versionB_split = parseFirmwareVersion(versionB);
  return compareVersions(versionA_split, versionB_split, true);
}

/*
    Searches AWS S3 for the firmware's latest version and returns a promise to a buffer containing it.
    Params :
        version_data : object containing type (dac/dut/dm1/dm4) and hardware revision (currently, dac2/dac3/dut)
        current version : firmware version of the device that sent the request
*/
async function find_newest_fw (fw_type: string, hardware_revision: string, current_version: string) {
  const s3_prefix = `${fw_type}/${hardware_revision}/`
  let newest_version: string = null;
  const object_list = await listS3folderContents(configfile.firmwareBucket, s3_prefix);
  for (const obj of object_list) {
    if (is_version_latter(obj.Key, newest_version||current_version) > 0) {
      newest_version = obj.Key;
    }
  }
  return newest_version;
}

export async function getVersionslist () {
  const allS3objs = await listS3folderContents(configfile.firmwareBucket, ''); // 'prod/'

  const pathRegex = /^([^\/]+)\/([^\/]+)\/([^\/]+).bin$/;
  const folderRegex = /^([^\/]+)\/([^\/]+)\/$/;

  const list = [] as {
    path: string // /prod/dac4/1_4_2.bin
    date: string
    fwType: 'prod'|'test'
    fwFamily: string // 'dam3'|'dri0'
    fwVers: string // '1_4_2'|'v3.2.3'|'v3.1.1-2-ga795bd1'
    versionNumber?: { vMajor: number, vMinor: number, vPatch: number, vExtra?: string }
  }[];
  const fwFamilies: string[] = [];
  for (const obj of allS3objs) {
    if (obj.Key.endsWith('/')) {
      const [, fwStage, fwFamily] = obj.Key.match(folderRegex) || [];
      if (fwFamily && !fwFamilies.includes(fwFamily)) {
        fwFamilies.push(fwFamily);
      }
      continue;
    }
    const [, fwStage, fwFamily, fwVers] = obj.Key.match(pathRegex) || [];
    if (!fwVers) { logger.info(`Invalid FW: '${obj.Key}'`); continue; }
    const versionNumber = parseFirmwareVersion(fwVers) || undefined;
    list.push({
      path: obj.Key,
      date: obj.LastModified.toISOString(),
      fwType: fwStage as 'prod'|'test',
      fwFamily,
      fwVers,
      versionNumber,
      // A linha abaixo é temporária (para compatibilidade) e deve sair do código em breve. Adicionada em 2024-FEV.
      ...{ hwRev: fwFamily, hwType: fwFamily.substring(0, 3) as 'dac'|'dam'|'dut'|'dri' },
    })
  }
  return { list, fwFamilies };
}

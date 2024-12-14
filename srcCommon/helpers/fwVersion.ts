export interface VersionNumber {
  vMajor: number
  vMinor: number
  vPatch: number
  vExtra?: string
}

export function parseFirmwareVersion(str: string): VersionNumber {
  // S3 path:  '/prod/dac4/0_1_2.bin'
  // 'v3.0.0'
  // 'v3.0.0-5-g817af2b3-dirty'
  if (!str) return null;
  str = str.trim();
  const lastBar = str.lastIndexOf('/');
  const folder = (lastBar >= 0) ? str.substring(0, lastBar + 1) : null;
  if (folder) str = str.substring(folder.length);
  const isDotBin = str.toLowerCase().endsWith('.bin');
  if (isDotBin) str = str.substring(0, str.length - 4);
  const match = str.match(/^v?(\d+)\.(\d+)\.(\d+)(-[-a-zA-Z0-9]+)?$/) || str.match(/^(\d+)_(\d+)_(\d+)$/);
  if (!match) return null;
  const [, vMajor, vMinor, vPatch, vExtra] = match;
  return {
    vMajor: Number(vMajor),
    vMinor: Number(vMinor),
    vPatch: Number(vPatch),
    vExtra,
  };
}

export function compareVersions(versionA: VersionNumber, versionB: VersionNumber, onlyCleanVersion: boolean) {
  // Não compara versões não oficiais
  if (!versionA || versionA.vMajor == null || versionA.vMinor == null || versionA.vPatch == null) {
    return null;
  }
  if (!versionB || versionB.vMajor == null || versionB.vMinor == null || versionB.vPatch == null) {
    return null;
  }

  if (onlyCleanVersion && (versionA.vExtra || versionB.vExtra)) return null;

  if (versionA.vMajor > versionB.vMajor) return 1;
  if (versionA.vMajor < versionB.vMajor) return -1;
  if (versionA.vMinor > versionB.vMinor) return 1;
  if (versionA.vMinor < versionB.vMinor) return -1;
  if (versionA.vPatch > versionB.vPatch) return 1;
  if (versionA.vPatch < versionB.vPatch) return -1;
  return 0;
}

export function versionIsAtLeast(version: VersionNumber, vMajor: number, vMinor: number, vPatch: number): boolean {
  if (!version) return false;
  if (version.vMajor > vMajor) return true;
  if ((version.vMajor === vMajor) && (version.vMinor > vMinor)) return true;
  if ((version.vMajor === vMajor) && (version.vMinor === vMinor) && (version.vPatch >= vPatch)) return true;
  return false;
}

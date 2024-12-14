import sqldb from '../../srcCommon/db'

export async function verifyMacDevice (devId: string, MAC?: string) {
    if (MAC == null) return;

    let deviceInfo = await sqldb.DEVICES.getMacDevice({ DEVICE_CODE: devId });

    if (deviceInfo && deviceInfo?.MAC == MAC) return;

    if (deviceInfo) await sqldb.DEVICES.w_updateInfo({ ID: deviceInfo.ID, DEVICE_CODE: devId, MAC }, '[SYSTEM]');
    else throw Error(`Not found deviceInfo. Didn't find device ${devId}`).HttpStatus(400);
}

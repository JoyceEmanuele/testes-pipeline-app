import { BinaryRouteResponse, ExtraRouteParams } from './backendTypes';

type SessionData = void;

export default interface API_public {
  ['/login']: (reqParams: { token?: string, user?: string, password?: string }, session: SessionData) => Promise<{
    token: string,
    user: string,
    name: string,
    lastName: string,
    isMasterUser?: boolean,
    permissions: UserPermissions,
    prefs: string,
    notifsby: 'email'|'telegram'|'email and telegram',
    phonenb: string,
  }>
  ['/login/forgot']: (reqParams: { user: string }, session: SessionData) => Promise<string>
  ['/login/reset']: (reqParams: {
    token: string,
    pass: string,
  }, session: SessionData) => Promise<string>
  ['/ota/:hw_type/:hardware_revision/:current_version/:dev_id']: (reqParams: {
    token?: string
    hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota/:hw_type/:hardware_revision/:current_version']: (reqParams: {
    token?: string
    hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota']: (reqParams: {
    token?: string
    hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota-get/:fw_type/:hardware_revision/:wanted_version']: (reqParams: {
    token?: string
    _hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota-for-dev/:dev_id']: (reqParams: {
    token?: string
    _hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota-for-dev/:dev_id/:hardware_revision/:current_version']: (reqParams: {
    token?: string
    _hw_type?: string,
    fw_type?: string,
    hardware_revision?: string,
    current_version?: string,
    wanted_version?: string,
    dev_id?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/ota-check-cert/:devId']: (reqParams: {
    devId: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/unsubscribe/faults/:token']: (reqParams: { token: string }, session: SessionData) => Promise<string>
  ['/unsubscribe/faults']: (reqParams: { token: string }, session: SessionData) => Promise<string>
  ['/diel-site-our-numbers']: (reqParams: {}, session: SessionData) => Promise<{
    connectedDevices: number,
    monitoredTRs: number,
    monitoredMachines: number,
    automatedTRs: number,
    automatedMachines: number,
  }>
// eslint-disable-next-line semi
}

type ProfilePerClient = '[U]'|'[C]'|'[M]'|'[T]'|'[MN]'|'[I]'|'[CP]';
interface UserPermissions {
  MANAGE_ALL_CLIENTS_AND_DACS?: boolean
  PER_CLIENT: { clientId: number, p: ProfilePerClient[] }[]
  PER_UNIT?: { clientId: number, units: number[], p: ProfilePerClient[] }[]
  ALTER_SYSTEM_PARS?: boolean
  VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS?: boolean
  MANAGE_UNOWNED_DEVS?: boolean
  HEALTH_MANAGEMENT?: boolean
  isUserManut?: boolean
  isParceiroValidador?: boolean
  isAdminSistema?: boolean
  isInstaller?: boolean
}

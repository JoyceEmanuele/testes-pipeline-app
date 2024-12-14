import { ExtraRouteParams } from '../srcCommon/types/backendTypes';

export type ApiInternalParams = {
  [Route in keyof ApiInternal]: Parameters<ApiInternal[Route]>[0];
};

type ApiInternalResps = {
  [Route in keyof ApiInternal]: Awaited<ReturnType<ApiInternal[Route]>>;
};

export type API_Internal = {
  [Route in keyof ApiInternal]: (reqParams: ApiInternalParams[Route], session?: void, extra?: ExtraRouteParams) => Promise<ApiInternalResps[Route]>;
};

interface ApiInternal {
  // ['/diel-internal/serviceName/functionName']: (reqParams: {}) => {},
  ['/diel-internal/serviceDriAutomation/triggerLoadDrisCfg']: (reqParams: {}) => {},
}

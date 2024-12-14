export type { API_private2 as API_External } from "../../srcCommon/types/api-private";
import API_public from '../../srcCommon/types/api-public'
import { API_private1, API_private2 } from '../../srcCommon/types/api-private'
import API_private_deprecated from '../../srcCommon/types/api-deprecated'

export const publicRoutes: API_public = <any>{};
export const privateRoutes: API_private1 = <any>{};
export const privateRoutesDeprecated: API_private_deprecated = <any>{};

type API = API_public & API_private1;
export type ApiResps = {
  [Route in keyof API]: Awaited<ReturnType<API[Route]>>;
};
type APIFull = API_public & API_private1 & API_private2 & API_private_deprecated;
export type ApiParams = {
  [Route in keyof APIFull]: Parameters<APIFull[Route]>[0];
};

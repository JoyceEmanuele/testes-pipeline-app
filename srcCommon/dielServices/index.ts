import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import configfile from '../../configfile';
import { logger } from '../../srcCommon/helpers/logger';
import type {
  API_serviceHealth as ApiExternal_Health,
  API_private2 as ApiExternal_ApiAsync,
} from '../types/api-private';
import type { ApiInternal as ApiInternal_Health } from '../../serviceHealth/api-interface';
import type { API as ApiInternal_Auth } from '../../serviceAuth/internal-api-def';
import type { ApiInternal as ApiInternal_Telegram } from '../../serviceTelegram/api-interface';
import type { ApiInternal as ApiInternal_ApiAsync } from '../../serviceApiAsync/api-internal';
import type { ApiInternal as ApiInternal_Realtime } from '../../serviceRealtime/api-internal';
import type { ApiInternal as ApiInternal_RealtimeRust } from '../../serviceRealtime/api-internal-rust';
import type { ApiInternal as ApiInternal_BGTasks } from '../../serviceBGTasks/api-internal';
import type { API_Internal as ApiInternal_EcoModeDam } from '../../serviceEcoModeDam/api-internal';
import type { API_Internal as ApiInternal_DriAutomation } from '../../serviceDriAutomation/api-internal';

export type { ApiInternal_Realtime, ApiInternal_ApiAsync, ApiInternal_RealtimeRust };

function checkAxiosError (err: any, route: string): AxiosResponse {
  if (err && err.isAxiosError) {
    const errA = err as AxiosError;
    delete errA.request;
    if (errA.response) {
      delete errA.response.request;
      delete errA.response.config;
    }
    logger.error(errA);

    const httpStatus = (errA.response && errA.response.status) || 500;
    const respData = errA.response && errA.response.data as { errorMessage: string, errorCode: string, frontDebug?: any };
    throw Error((respData && respData.errorMessage) || `erro ao buscar informações do serviço [${route}]`)
      .Details(httpStatus, {
        errorCode: (respData && respData.errorCode) || 'EXT_API_DIELSERVICE',
        frontDebug: (respData && respData.frontDebug) || undefined,
      });
  }
  throw err;
}

async function apiPostRaw<T extends {}>(baseURL: string, authHeader: string, route: string, body: T|undefined|null|void) {
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL,
    headers: {},
    url: route,
    // timeout: 10 * 60 * 1000,
  };
  if (authHeader) {
    config.headers!['Authorization'] = authHeader;
  }
  if (body) {
    config.data = body;
    config.headers!['Content-Type'] = 'application/json; charset=UTF-8';
  }
  return axios(config).catch((err) => checkAxiosError(err, route));
}

export async function authInternalApi<Endpoint extends keyof ApiInternal_Auth>(route: Endpoint, body: Parameters<ApiInternal_Auth[Endpoint]>[0]): Promise<ReturnType<ApiInternal_Auth[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function asyncExternalApi<Endpoint extends keyof ApiExternal_ApiAsync>(authHeader: string, route: Endpoint, body: Parameters<ApiExternal_ApiAsync[Endpoint]>[0]): Promise<ReturnType<ApiExternal_ApiAsync[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.publicExternalUrl, authHeader, route, body)
    .then((r) => r.data);
}

export async function healthExternalApi<Endpoint extends keyof ApiExternal_Health>(authHeader: string, route: Endpoint, body: Parameters<ApiExternal_Health[Endpoint]>[0]): Promise<ReturnType<ApiExternal_Health[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.publicExternalUrl, authHeader, route, body)
    .then((r) => r.data);
}

export async function healthInternalApi<Endpoint extends keyof ApiInternal_Health>(route: Endpoint, body: Parameters<ApiInternal_Health[Endpoint]>[0]): Promise<ReturnType<ApiInternal_Health[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function telegramInternalApi<Endpoint extends keyof ApiInternal_Telegram>(route: Endpoint, body: Parameters<ApiInternal_Telegram[Endpoint]>[0]): Promise<ReturnType<ApiInternal_Telegram[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function apiAsyncInternalApi<Endpoint extends keyof ApiInternal_ApiAsync>(route: Endpoint, body: Parameters<ApiInternal_ApiAsync[Endpoint]>[0]): Promise<ReturnType<ApiInternal_ApiAsync[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function realtimeInternalApi<Endpoint extends keyof ApiInternal_Realtime>(route: Endpoint, body: Parameters<ApiInternal_Realtime[Endpoint]>[0]): Promise<ReturnType<ApiInternal_Realtime[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function realtimeRustInternalApi<Endpoint extends keyof ApiInternal_RealtimeRust>(route: Endpoint, body: Parameters<ApiInternal_RealtimeRust[Endpoint]>[0]): Promise<ReturnType<ApiInternal_RealtimeRust[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function bgtasksInternalApi<Endpoint extends keyof ApiInternal_BGTasks>(route: Endpoint, body: Parameters<ApiInternal_BGTasks[Endpoint]>[0]): Promise<ReturnType<ApiInternal_BGTasks[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function ecoModeDamInternalApi<Endpoint extends keyof ApiInternal_EcoModeDam>(route: Endpoint, body: Parameters<ApiInternal_EcoModeDam[Endpoint]>[0]): Promise<ReturnType<ApiInternal_EcoModeDam[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}

export async function driAutomationInternalApi<Endpoint extends keyof ApiInternal_DriAutomation>(route: Endpoint, body: Parameters<ApiInternal_DriAutomation[Endpoint]>[0]): Promise<ReturnType<ApiInternal_DriAutomation[Endpoint]>> {
  return apiPostRaw(configfile.serviceGateway.privateInternalUrl, null, route, body)
    .then((r) => r.data);
}
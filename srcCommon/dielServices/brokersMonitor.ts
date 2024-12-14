import axios, { AxiosRequestConfig } from 'axios';
import servConfig from '../../configfile'

async function apiPost (route: string, body: any) {
  const config: AxiosRequestConfig = {
    method: 'POST',
    baseURL: servConfig.serversMonitor.baseURL,
    url: route,
    data: body,
    headers: {},
  };
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios(config);
}

export const api = {
  ['/status-charts-v1']: async function (day: string, t_start?: string, t_end?: string) {
    const response = await apiPost('/status-charts-v1', { day, t_start, t_end });
    return response.data as string;
  },
}

async function apiPost2 (route: string, body: any) {
  const config: AxiosRequestConfig = {
    method: 'POST',
    baseURL: 'http://10.0.16.13:46882', // Tempariamente adicionado como valor fixo no código
    url: route,
    data: body,
    headers: {},
  };
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios(config);
}

export const api2 = {
  ['/status-charts-v1']: async function (day: string, t_start?: string, t_end?: string) {
    const response = await apiPost2('/status-charts-v1', { day, t_start, t_end });
    return response.data as string;
  },
}

import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import servConfig from '../../configfile';

import { logger } from '../../srcCommon/helpers/logger';

let authToken = null as string;

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações da API de produção').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_DASHDIEL' });
  }
  throw err;
}

async function getToken () {
  const body = {
    user: servConfig.prodApiForwarder.user,
    password: servConfig.prodApiForwarder.password,
  };
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: servConfig.prodApiForwarder.url,
    url: '/login',
    headers: {},
    data: body,
  };
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  const response = await axios(config);
  return `Bearer ${response.data.token}`;
}

export async function prodApiPost (route: string, body: any) {
  if (servConfig.isProductionServer) {
    throw Error('prodApiPost chamado pela API de produção');
  }
  if (!authToken) {
    authToken = await getToken();
  }
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: servConfig.prodApiForwarder.url,
    url: route,
    headers: {
      'Authorization': authToken,
    },
    data: body,
  };
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios(config)
    .catch(checkAxiosError);
}

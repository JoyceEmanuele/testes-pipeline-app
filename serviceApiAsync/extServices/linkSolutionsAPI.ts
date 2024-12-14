import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import servConfig from '../../configfile';
import { logger } from '../../srcCommon/helpers/logger';

interface SessionData {
  token: string
}

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações da Link Solutions').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_LMS_HTTP' });
  }
  throw err;
}

async function apiGet (session: SessionData, route: string) {
  const config: AxiosRequestConfig = {
    method: 'GET',
    baseURL: servConfig.lsmApi.baseURL,
    url: route,
    headers: {},
  };
  if (session && session.token) config.headers['Authorization'] = `JWT ${session.token}`;
  return axios(config)
  .catch(checkAxiosError);
}

async function apiPost (session: SessionData, route: string, body: any) {
  const config: AxiosRequestConfig = {
    method: 'POST',
    baseURL: servConfig.lsmApi.baseURL,
    url: route,
    data: body,
    headers: {},
  };
  if (session && session.token) config.headers['Authorization'] = `JWT ${session.token}`;
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios(config)
  .catch(checkAxiosError);
}

const apiLSM = {
  ['POST /api/token-auth/']: (body: { username: string, password: string }) => apiPost(null, `/api/token-auth/`, body).then(response => {
    return response.data as {
      token: string
    }
  }),

  ['GET /partners/sims']: async function (offset: number, limit: number) {
    const { token } = await apiLSM['POST /api/token-auth/']({ username: servConfig.lsmApi.username, password: servConfig.lsmApi.password });
    const session: SessionData = { token };
    const response = await apiGet(session, `/partners/sims` + (offset ? `?offset=${offset}&limit=${limit}` : ''));
    // HTTP/1.1 206 Partial Content
    // Accept-Ranges: records
    // Content-Range: records 0:100/121
    // ?offset=100&limit=200
    return {
      contentRange: (response.headers['content-range'] || response.headers['Content-Range']) as string,
      list: response.data as {
        id: number
        soldplan__consumption_f: string
        line__total_f: string
        iccid: string
        status__name: string
        soldplan__name: string
        last_conn: string // "2021-12-31T23:59:59"
        last_disc: string // "2021-12-31T23:59:59"
      }[]
    }
  },

  ['POST /partners/async/calls']: async function (action: 'reset', identificador: 'iccid'|'msisdn'|'line__id'|'simcard__id', ids: (string|number)[]) {
    const { token } = await apiLSM['POST /api/token-auth/']({ username: servConfig.lsmApi.username, password: servConfig.lsmApi.password });
    const session: SessionData = { token };
    const response = await apiPost(session, `/partners/async/calls?action=${action}&key=${identificador}`, JSON.stringify(ids));
    return response.data as {
      iccid: string // '89551111111111111111'
      operator__name: string // 'Vivo'
      action__name: string // 'Desconexão forçada'
      call__id: number // 158
      line__id: number // 123456
      action__id: number // 1
      operator__id: number // 1
      msisdn: string // '5583111111111'
      simcard__id: number // 123456
      batch__id: number // 126
      call__requested: string // '2019-12-04T13:57:13.782673'
    }[]
  },
}

export async function getLsmSimsList() {
  let list = [] as {
    id: number
    soldplan__consumption_f: string
    line__total_f: string
    iccid: string
    status__name: string
    soldplan__name: string
    last_conn: string
    last_disc: string
  }[];

  let offset = 0;
  let limit = 100;
  while (true) {
    const response = await apiLSM['GET /partners/sims'](offset, limit);

    list = list.concat(response.list);

    if ((response.list.length > 0) && response.contentRange) {
      const [, first, count, total] = response.contentRange.match(/^ *records (\d+):(\d+)\/(\d+)$/) || [];
      offset = Number(first) + Number(count);
      const totalN = Number(total);
      limit = offset + 100;
      if ((offset === list.length) && offset < totalN) {
        continue;
      }
    }
    break;
  }

  return list;
}

export function sendResetRequest(iccid: string) {
  return apiLSM['POST /partners/async/calls']('reset', 'iccid', [iccid]);
}

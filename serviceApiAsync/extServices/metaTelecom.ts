import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import * as xml2js from 'xml2js';
import servConfig from '../../configfile';
import { logger } from '../../srcCommon/helpers/logger';

export interface API {
  ['login']: (body: {
    // function: 'login'
    // output_type: 'xml' // 'xml'|'json'|'html'
    // company: 'metatelecom'
    admin: string // '12345678'
    adminpwd: string // 'secret'
  }) => {
    "login": {
      "response": [{
        "errorcode": [string] // "0" = sucesso, "178" = senha incorreta
        "login": [string] // "12345678"
        "sessionid": [string] // "98765432"
        "owner": [string] // "clientestotais"
      }]
    }
  }

  ['refreshid']: (body: {
    sessionid: string // "98765432"
  }) => {
    "refreshid": {
      "response": [{
        "errorcode": [string] // "0" = sucesso, "37" = sessionid expirou
      }]
    }
  }

  ['getalluserservices']: (body: {
    // function: 'getalluserservices'
    // output_type: 'xml' // 'xml'|'json'|'html'
    // company: 'metatelecom'
    login: string // '12345678'
    sessionid: string // '98765432'
    servicetype: '20'
    pincarrier: string // '200' = Vivo
    ini: number // '1'
    total: number // '211'
  }) => {
    "getalluserservices": {
      "response": [{
        "errorcode": [string] // "0" = sucesso
        "login": [string] // "12345678"
        "stats": [string]
        "syntax": [string]
        "service": string[]
        "currency": [string] // "BR$"
      }]
    }
  }
}
export type ApiResps = {
  [Route in keyof API]: ReturnType<API[Route]>;
};
export type ApiParams = {
  [Route in keyof API]: Parameters<API[Route]>[0];
};

async function apiReq<Key extends keyof API> (func: Key, body: ApiParams[Key]): Promise<ApiResps[Key]> {
  (body as any).function = func;
  (body as any).output_type = 'xml';
  (body as any).company = 'metatelecom';
  const config: AxiosRequestConfig = {
    method: 'POST',
    baseURL: 'http://www.parlacom.net/cgi-bin/parla',
    url: '/?u=a',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: Object.entries(body).map(([key, val]) => {
      return`${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    }).join('&'),
  };

  let response: AxiosResponse;
  try {
    response = await axios(config);
  } catch (err: any) {
    if (err && err.isAxiosError) {
      const errA = err as AxiosError;
      delete errA.request;
      if (errA.response) {
        delete errA.response.request;
        delete errA.response.config;
      }
      logger.error(errA);
      throw Error('erro ao buscar informações da API da META').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_META' });
    }
    logger.error(err);
    throw err;
  }

  response.data = await new Promise((resolve, reject) => {
    xml2js.parseString(response.data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const apiResponse = response.data && response.data[func] && response.data[func].response;
  const errorcode = apiResponse && apiResponse.length === 1 && apiResponse[0].errorcode;
  if (errorcode && errorcode.length === 1 && errorcode[0] === '0') {
    return response.data;
  } else {
    throw response.data;
  }
}

const sessionidKeeper = {
  sessionid: null as null|string,
  runningRequest: null as null|Promise<string>,
  sessionTS: null as null|number,
}

const apiMETA = {
  ['login']: async (body: ApiParams['login']) => {
    const response = await apiReq('login', body);
    if (response.login.response[0].sessionid.length === 1) { /* OK */ }
    else throw Error('Resposta inválida da META: login.sessionid');
    const sessionid = response.login.response[0].sessionid[0];
    return { sessionid };
  },

  ['refreshid']: async (body: ApiParams['refreshid']) => {
    try {
      if (!body.sessionid) return false;
      const response = await apiReq('refreshid', body);
      if (response.refreshid.response[0].errorcode.length === 1) { /* OK */ }
      else throw Error('Resposta inválida da META: refreshid.errorcode');
      const errorcode = response.refreshid.response[0].errorcode[0];
      if (errorcode !== '0') return false;
      return true;
    } catch (err) {
      return false;
    }
  },

  ['getalluserservices']: async (body: ApiParams['getalluserservices']) => {
    const response = await apiReq('getalluserservices', body);
    if (response.getalluserservices.response[0].stats.length === 1) { /* OK */ }
    else throw Error('Resposta inválida da META: getalluserservices.stats');
    const stats = response.getalluserservices.response[0].stats[0];
    if (response.getalluserservices.response[0].syntax.length === 1) { /* OK */ }
    else throw Error('Resposta inválida da META: getalluserservices.syntax');
    const syntax = response.getalluserservices.response[0].syntax[0];
    if (response.getalluserservices.response[0].currency.length === 1) { /* OK */ }
    else throw Error('Resposta inválida da META: getalluserservices.currency');
    const currency = response.getalluserservices.response[0].currency[0];
    const service = response.getalluserservices.response[0].service;

    const maxRegs = body.total - body.ini;
    if (service.length >= maxRegs) throw Error('A listagem da Meta Telecom pode estar incompleta!').HttpStatus(500);

    const headers = syntax.split('|');
    const positions = {
      iccid: headers.indexOf('ICCID'),
      online: headers.indexOf('Online'),
      operadora: headers.indexOf('Operadora'),
      mensalidade: headers.indexOf('Mensalidade'),
      reset: headers.indexOf('Reset'),
      descPlano: headers.indexOf('Desc Plano'),
      ultimaConexao: headers.indexOf('ultima conexao'),
      saldo: headers.indexOf('Saldo'),
    };

    return {
      stats,
      service: service.map((row) => {
        const cols = row.split('|');
        return {
          iccid: positions.iccid >= 0 ? cols[positions.iccid] : undefined,
          online: positions.online >= 0 ? cols[positions.online] : undefined,
          operadora: positions.operadora >= 0 ? cols[positions.operadora] : undefined,
          mensalidade: (positions.mensalidade >= 0 && cols[positions.mensalidade]) ? Number(cols[positions.mensalidade]) : undefined,
          reset: (positions.reset >= 0 && cols[positions.reset]) ? Number(cols[positions.reset]) : undefined,
          descPlano: positions.descPlano >= 0 ? cols[positions.descPlano] : undefined,
          ultimaConexao: positions.ultimaConexao >= 0 ? cols[positions.ultimaConexao] : undefined,
          saldo: (positions.saldo >= 0 && cols[positions.saldo]) ? Number(cols[positions.saldo].replace(/,/g, '')) : undefined,
        };
      }),
    };
  }
};

async function authenticateDiel () {
  if (!sessionidKeeper.runningRequest) {
    sessionidKeeper.runningRequest = Promise.resolve().then(async () => {
      const response = await apiMETA['login']({
        admin: servConfig.metaTelecomApi.userId,
        adminpwd: servConfig.metaTelecomApi.password,
      });
      return response.sessionid;
    });
  }
  try {
    const sessionid = await sessionidKeeper.runningRequest;
    sessionidKeeper.runningRequest = null;
    return sessionid;
  } catch (err) {
    logger.error(err);
    sessionidKeeper.runningRequest = null;
    throw err;
  }
}

export async function getalluserservices() {
  const refreshid = apiMETA['refreshid']({ sessionid: sessionidKeeper.sessionid });
  if (!sessionidKeeper.sessionid || !await refreshid) {
    sessionidKeeper.sessionid = await authenticateDiel();
  }

  return apiMETA['getalluserservices']({
    login: servConfig.metaTelecomApi.userId,
    sessionid: sessionidKeeper.sessionid,
    servicetype: "20",
    pincarrier: "200",
    ini: 1,
    total: 1000,
  })
}

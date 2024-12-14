import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import configfile from '../../configfile';
import { logger } from '../helpers/logger';

interface SessionData {
  token: string
}

function isGreenAntDisabled() {
  return (!configfile.isProductionServer) && (!configfile.greenantApi);
}

function checkCookies (response: AxiosResponse, session: SessionData) {
  if (response.headers && (response.headers['set-cookie'] instanceof Array) && response.headers['set-cookie'].length > 0 && session) {
    let cookies = session.token && session.token.split(';') || [];
    for (let cookie of response.headers['set-cookie']) {
      cookie = cookie.substr(0, cookie.indexOf(';')) || cookie;
      if (!cookie) { continue; }
      const iEq = cookie.indexOf('=');
      if (!(iEq > 0)) { continue; }
      const name = cookie.substr(0, iEq).trim();
      const value = cookie.substr(iEq + 1).trim();
      cookies = cookies.filter(x => !x.startsWith(`${name}=`))
      if (value) cookies.push(`${name}=${value}`);
    }
    session.token = cookies.join(';');
  }
  return response;
}

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações da GreenAnt').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_GREENANT_HTTP' });
  }
  throw err;
}

async function gaApiGet (session: SessionData, route: string) {
  if (!session.token) { throw Error('No access to GreenAnt API').HttpStatus(400).DebugInfo(session) }
  const config: AxiosRequestConfig = {
    method: 'get',
    baseURL: configfile.greenantApi.url,
    url: route,
    headers: { 'cookie': session.token },
    // headers: session && session.tokenGreenAnt && { 'Authorization': `JWT ${session.tokenGreenAnt}` },
  };
  return axios(config).then((r) => checkCookies(r, session))
  .catch(checkAxiosError);
}
async function gaApiPostPublic (route: string, body: any, outCookies?: SessionData) {
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: configfile.greenantApi.url,
    url: route,
    data: body,
  };
  return axios(config).then((r) => outCookies ? checkCookies(r, outCookies) : r)
  .catch(checkAxiosError);
}

const apiGA = {
  ['POST /login']: (body: { email: string, password: string }, session: SessionData) => gaApiPostPublic(`/login`, body, session).then(response => {
    return response.data as {
      message: string,
      user: {
        email: string,
        createdAt: string,
        id: number
      },
      token: string,
      expiresIn: string,
    }
  }),

  ['GET /meters/:id/measurements']: async function (id: number, startDate: string, endDate: string, resolution = 'hour') {
    // endDate=2020-01-31
    // resolution=day
    // startDate=2020-01-01
    if (isGreenAntDisabled()) {
      logger.warn('GreenAnt access is disabled');
      return { measurement: [] };
    }
    const session: SessionData = { token: null };
    await apiGA['POST /login']({ email: configfile.greenantApi.user, password: configfile.greenantApi.password }, session);
    const response = await gaApiGet(session, `/meters/${id}/measurements/?dataSourceId=${id}&endDate=${endDate}&meterId=${id}&resolution=${resolution}&startDate=${startDate}`)
    return response.data as {
      measurement: {
        date:string,
        activeEnergy:number,
        cepa:number,
        cepb:number,
        cepc:number,
        injectedEnergy:number,
        consumedEnergy:number,
        peak?: {
          cepa:number,
          cepb:number,
          cepc:number,
          activeEnergy:number,
          injectedEnergy:number,
          consumedEnergy:number,
          invoice: {
            value:number,
            activeEnergy:number,
            currency:string,
            tariff:number,
            flag: { value:number, flag:string },
            date:string
          }
        },
        offPeak?: {
          cepa:number,
          cepb:number,
          cepc:number,
          activeEnergy:number,
          injectedEnergy:number,
          consumedEnergy:number,
          invoice: {
            value:number,
            activeEnergy:number,
            currency:string,
            tariff:number,
            flag: { value:number, flag:string },
            date:string
          }
        },
        intermediatePeak?: {
          cepa:number,
          cepb:number,
          cepc:number,
          activeEnergy:number,
          injectedEnergy:number,
          consumedEnergy:number,
          invoice: {
            value:number,
            activeEnergy:number,
            currency:string,
            tariff:number,
            flag: { value:number, flag:string },
            date:string
          }
        },
        invoices: {
          tariffTypeName:string,
          mainTariff:boolean,
          tariffInstanceId:number,
          value:number,
          currency:string,
          flag:{value:number,flag:string},
          taxes:{icms:number,pis:number,cofins:number},
          date:string
        }[],
        invoice?: {
          tariffTypeName:string,
          mainTariff:boolean,
          tariffInstanceId:number,
          value:number,
          currency:string,
          flag:{value:number,flag:string},
          taxes:{icms:number,pis:number,cofins:number},
          date:string
          tariff:number,
        },
        accumulatedEnergy:number
      }[]
    }
  },

  ['GET /meters/:id/powers']: async function (id: number, startDate: string, endDate: string, resolution = 'minute') {
    if (isGreenAntDisabled()) {
      logger.warn('GreenAnt access is disabled');
      return { powers: [] };
    }
    const session: SessionData = { token: null };
    await apiGA['POST /login']({ email: configfile.greenantApi.user, password: configfile.greenantApi.password }, session);
    const response = await gaApiGet(session, `/meters/${id}/powers?endDate=${endDate}&meterId=${id}&resolution=${resolution}&startDate=${startDate}`)
    return response.data as {
      powers: {
        date: string,
        maxActivePower: number,
        avgActivePower: number,
        minActivePower: number,
        maxActivePowerA: number,
        avgActivePowerA: number,
        minActivePowerA: number,
        maxActivePowerB: number,
        avgActivePowerB: number,
        minActivePowerB: number,
        maxActivePowerC: number,
        avgActivePowerC: number,
        minActivePowerC: number,
        maxReactivePower: number,
        avgReactivePower: number,
        minReactivePower: number,
        maxReactivePowerA: number,
        avgReactivePowerA: number,
        minReactivePowerA: number,
        maxReactivePowerB: number,
        avgReactivePowerB: number,
        minReactivePowerB: number,
        maxReactivePowerC: number,
        avgReactivePowerC: number,
        minReactivePowerC: number,
        maxPF: number,
        PF: number,
        minPF: number,
      }[]
    }
  },

  ['GET /meters']: async function (_meterType?: string) {
    if (isGreenAntDisabled()) {
      logger.warn('GreenAnt access is disabled');
      return { meters: [] };
    }
    const session: SessionData = { token: null };
    await apiGA['POST /login']({ email: configfile.greenantApi.user, password: configfile.greenantApi.password }, session);
    const response = await gaApiGet(session, `/meters`)
    return response.data as {
      meters: {
          label: string,
          uid: string,
          formatedAddress: string,
          street: string,
          district: string,
          city: string,
          state: string,
          country: string,
          zipCode: string,
          lat: string,
          lng: string,
          timeZone: string,
          inspectionDay: number,
          active: boolean,
          id: number,
          createdAt: string,
          updatedAt: string,
          organizationId: number,
          contractId: number,
          goal: number,
          people: number,
          meterId: number,
          consumptionPhases: string,
          meterTypeId: number,
          generationMeterUid: number,
          generationMeterContractId: number,
          meterType?: {
            id: number,
            label: string,
            description: string,
            hasRealtime: boolean
          }
        }[],
    }
  },

  ['GET /datasources']: async function () {
    if (isGreenAntDisabled()) {
      logger.warn('GreenAnt access is disabled');
      return { dataSources: [] };
    }
    const session: SessionData = { token: null };
    await apiGA['POST /login']({ email: configfile.greenantApi.user, password: configfile.greenantApi.password }, session);
    const response = await gaApiGet(session, `/datasources`)
    return response.data as {
      dataSources: {
        id: number,
        organizationName: string,
        organizationId: number,
        label: string,
        type: string,
        uid?: string,
        city?: string,
        state?: string,
        lat?: string,
        lng?: string,
        active?: boolean,
        goal?: number,
        hasRealtime?: boolean,
        activeInstallationId?: string,
      }[]
    }
  },
}

export { apiGA };

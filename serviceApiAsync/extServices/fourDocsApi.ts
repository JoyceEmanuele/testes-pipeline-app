import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { logger } from '../../srcCommon/helpers/logger';
import servConfig from '../../configfile';
import sqldb from '../../srcCommon/db'
import * as httpRouter from '../apiServer/httpRouter';
import { getUnitsWithInvoice} from '../invoices/invoices'
import { isBirthdate, isCNPJ, isCPF, isEmail, isUsername } from '../../srcCommon/helpers/validateData';
import { SessionData } from '../../srcCommon/types';
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';

interface SessionDataFourDocs {
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
    throw Error('erro ao buscar informações da Four Docs').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_FOUR_DOCS_HTTP' });
  }
  throw err;
}

async function fourDocsApiPostPublic (route: string, auth: any, outToken?: SessionDataFourDocs) {
  const config: AxiosRequestConfig = {
    method: 'post',
    baseURL: servConfig.fourDocsApi.url + route,
    auth: auth,
    data: "grant_type="+ servConfig.fourDocsApi.grant_type
  };
  return axios(config).then((r) => {
    if (outToken) {
      outToken.token = r.data.access_token
    }
    return r
  })
  .catch(checkAxiosError);
}

async function fourDocsApiGet (session: SessionDataFourDocs, route: string) {
  if (!session.token) { throw Error('No access to fourDocs API').HttpStatus(400).DebugInfo(session) }
  const config: AxiosRequestConfig = {
    method: 'get',
    baseURL: servConfig.fourDocsApi.url,
    url: route,
    headers: session && session.token && { 'Authorization': `Bearer ${session.token}`, 'Accept': 'application/json' },
  };
  return axios(config)
  .catch(checkAxiosError);
}

async function fourDocsApiPut (session: SessionDataFourDocs, route: string, body: any) {
  if (!session.token) { throw Error('No access to fourDocs API').HttpStatus(400).DebugInfo(session) }
  const config: AxiosRequestConfig = {
    method: 'put',
    baseURL: servConfig.fourDocsApi.url,
    url: route,
    headers: session && session.token && { 'Authorization': `Bearer ${session.token}`, 'Accept': 'application/json' },
    data: body,
  };
  return axios(config)
  .catch(checkAxiosError);
}

export const apiFourDocs = {
  ['POST /login']: (
    auth: {username: string, password: string }, 
    session: SessionDataFourDocs) => fourDocsApiPostPublic('/oauth2/token', auth, session).then(response => {  
    return response.data as {
      access_token: string,
      token_type: string,
    }
    
  }),

  ['GET /bot/login_data']: async function () {
    const session: SessionDataFourDocs = { token: null };
    await apiFourDocs['POST /login']({
      username: servConfig.fourDocsApi.username,
      password: servConfig.fourDocsApi.password
    },
      session);

    const response = await fourDocsApiGet(session, '/bot/login_data')
    if (!response) { return null; }
    return response.data as {
      providers: {
        name: string
        cnpjs: string[]
        access_points: string[]
      }[]
      access_points: {
        name: string
        providers: string[]
        methods: {
          grouping: string
          required: string[]
          optional: string[]
        }[]
      }[]
    };
  },

  ['PUT /bot/location/save']: async function (body: any) {
    const session: SessionDataFourDocs = { token: null };
    await apiFourDocs['POST /login']({
      username: servConfig.fourDocsApi.username,
      password: servConfig.fourDocsApi.password
    }, session);
    const response = await fourDocsApiPut(session, '/bot/location/save', body)
    return response.data
  },
}

httpRouter.privateRoutes['/four-docs/get-login-data'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }
  const loginData = await apiFourDocs['GET /bot/login_data']();
  if (!loginData){
    throw Error('Houve erro ao se conectar com a api da Four Docs').HttpStatus(500);
  }
  return { list: loginData };
}

async function prepareData(items: {
  UNIT_ID: number;
  DISTRIBUTOR_ID: number;
  ADDITIONAL_DISTRIBUTOR_INFO: string;
  CONSUMER_UNIT: string;
  LOGIN: string;
  LOGIN_EXTRA: string;
  PASSWORD: string;
  STATUS: string;
  STATUS_UPDATED_DATE: string;
}[]) {
  const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
  const yearsToDecrease = Math.floor(servConfig.fourDocsApi.monthsForHistory / 12);
  const monthsToDecrease = servConfig.fourDocsApi.monthsForHistory % 12;
  const dateNow = new Date();
  const dateDecreaseMonth = new Date(dateNow.getFullYear(), dateNow.getMonth() - monthsToDecrease, 1);
  const monthBegin = `${dateDecreaseMonth.getUTCFullYear() - yearsToDecrease}-${zeroPad(dateDecreaseMonth.getUTCMonth() + 1, 2)}`

  const data = [] as {
    provider: string
    access_point: string
    location_number: string
    login: string
    password: string
    group: string
    monthBegin: string
    monthEnd: string
    callbackURL: string
    clientData: {
        invoiceAuthToken: string
        unitId: number
    }
    email: string
    cnpj: string
    cpf: string
    username: string
    birthdate: string
  }[];

  await Promise.all(items.map(async function(item) {
    const provider = (await sqldb.ACCESS_DISTRIBUTORS.getExtraInfo({UNIT_ID: item.UNIT_ID})).DISTRIBUTOR_TAG
    const group = (await sqldb.CLUNITS.getClientNameByUnitId({UNIT_ID: item.UNIT_ID})).NAME
    const decrypted  = CryptoJS.TripleDES.decrypt(item.PASSWORD, servConfig.secretPassphraseTripleDES);
    data.push({
      provider: provider,
      access_point: item.ADDITIONAL_DISTRIBUTOR_INFO,
      location_number: item.CONSUMER_UNIT,
      login: item.LOGIN,
      password: decrypted.toString(CryptoJS.enc.Utf8),
      group: group,
      monthBegin: monthBegin,
      monthEnd: null,
      callbackURL: servConfig.invoiceConfig.serverUrl + "/invoice/upload-invoice",
      clientData: {
        invoiceAuthToken: servConfig.invoiceConfig.authToken,
        unitId: item.UNIT_ID
      },
      email:     isEmail(item.LOGIN)     ? item.LOGIN : isEmail(item.LOGIN_EXTRA)     ? item.LOGIN_EXTRA : null,
      cnpj:      isCNPJ(item.LOGIN)      ? item.LOGIN : isCNPJ(item.LOGIN_EXTRA)      ? item.LOGIN_EXTRA : null,
      cpf:       isCPF(item.LOGIN)       ? item.LOGIN : isCPF(item.LOGIN_EXTRA)       ? item.LOGIN_EXTRA : null,
      username:  isUsername(item.LOGIN)  ? item.LOGIN : isUsername(item.LOGIN_EXTRA)  ? item.LOGIN_EXTRA : null,
      birthdate: isBirthdate(item.LOGIN) ? item.LOGIN : isBirthdate(item.LOGIN_EXTRA) ? item.LOGIN_EXTRA : null,
    });
  }));
  return data;
}

async function setReceivedInvoices(session:SessionData){

  const unitsWithInvoice = await getUnitsWithInvoice();

  const dateNow = new Date();
  const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
  const dateUpdated = `${dateNow .getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)} ${zeroPad(dateNow.getUTCHours(), 2)}:${zeroPad(dateNow.getUTCMinutes(), 2)}:${zeroPad(dateNow.getUTCSeconds(), 2)}`

  for (const unit of unitsWithInvoice){
    await sqldb.ACCESS_DISTRIBUTORS.w_updateInfo({ UNIT_ID: Number(unit), STATUS: "Recebido faturas", STATUS_UPDATED_DATE: dateUpdated }, session.user);
  }
}

export async function addEnergyCredentials(session: SessionData) {

  await setReceivedInvoices(session);

  await apiFourDocs['GET /bot/login_data']();

  const items = await sqldb.ACCESS_DISTRIBUTORS.getInfoNotSend({STATUS: "Enviado"})
  const data = await prepareData(items);

  const response = await apiFourDocs['PUT /bot/location/save']({items: data});

  const dateNow = new Date();
  const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
  const dateUpdated = `${dateNow .getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)} ${zeroPad(dateNow.getUTCHours(), 2)}:${zeroPad(dateNow.getUTCMinutes(), 2)}:${zeroPad(dateNow.getUTCSeconds(), 2)}`

  await Promise.all(
    response.map(async (responseItem:any, i: number) => {
      if (responseItem.id === null){
        await sqldb.ACCESS_DISTRIBUTORS.w_updateInfo({UNIT_ID: data[i].clientData.unitId, STATUS: "Erro no envio", STATUS_UPDATED_DATE: dateUpdated }, session.user);
      }
      else{
        await sqldb.ACCESS_DISTRIBUTORS.w_updateInfo({UNIT_ID: data[i].clientData.unitId, STATUS: "Enviado", STATUS_UPDATED_DATE: dateUpdated }, session.user);
      }
    })
  )
  return true;
}

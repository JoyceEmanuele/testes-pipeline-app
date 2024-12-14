import * as fs from 'fs';
import * as https from 'https';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import configfile from '../../configfile';
import { logger } from 'elastic-apm-node';
import { SessionData } from '../../srcCommon/types';
export interface DataKiteSIMItem {
  icc: string;
  imsi: string;
  msisdn: string;
  alias: string;
  simModel: string;
  simType: string;
  gprsStatus: {
    status: number;
  };
  ipStatus: {
    status: number;
  };
  advancedSupervision: boolean;
  consumptionDaily: {
    voice: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
    sms: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
    data: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
  };
  consumptionMonthly: {
    voice: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
    sms: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
    data: {
      limit: number;
      value: number;
      thrReached: number;
      enabled: boolean;
    };
  };
  expenseMonthly: {
    voiceOver: {
      limit: string;
      value: string;
      thrReached: string;
      enabled: boolean;
    };
    smsOver: {
      limit: string;
      value: string;
      thrReached: string;
      enabled: boolean;
    };
    dataOver: {
      limit: string;
      value: string;
      thrReached: string;
      enabled: boolean;
    };
    totalOver: {
      limit: string;
      value: string;
      thrReached: string;
      enabled: boolean;
    };
    voiceFee: string;
    smsFee: string;
    dataFee: string;
    totalFee: string;
    other: string;
    total: string;
    voiceGroupWarning: boolean;
    smsGroupWarning: boolean;
    dataGroupWarning: boolean;
    totalGroupWarning: boolean;
  };
  provisionDate: string;
  shippingDate: string;
  activationDate: string;
  supervisionGroup: string;
  orderNumber: string;
  postalCode: string;
  country: string;
  operator: string;
  lteEnabled: boolean;
  manufacturerOrderNumber: string;
  chargingType: string;
  qci: number;
  serviceProviderCommercialId: string;
  serviceProviderCommercialName: string;
  serviceProviderEnablerId: string;
  serviceProviderEnablerName: string;
  customerName: string;
  lifeCycleStatus: string;
  billingAccountName: string;
  servicePackId: string;
  commercialGroupId: string;
  customerCurrency: string;
  customerCurrencyName: string;
  legacy: boolean;
  logistics: string;
  subscriptionId: string;
  customerID: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  ip: string;
  billingAccount: string;
  commModuleManufacturer: string;
  commModuleModel: string;
  supplServices: {
    vpn: boolean;
    location: boolean;
    dca: boolean;
    dim: boolean;
    advancedSupervision: boolean;
  };
  sgsnIP: string;
  ggsnIP: string;
  servicePack: string;
  staticIp: string;
  commercialGroup: string;
  subscriptionType: string;
  apn: string;
  masterId: string;
  masterName: string;
  customerId: string;
  aggregatorId: string;
  aggregatorName: string;
  staticApnIndex: number;
  apn0: string;
  apn1: string;
  apn2: string;
  apn3: string;
  apn4: string;
  apn5: string;
  apn6: string;
  apn7: string;
  apn8: string;
  apn9: string;
  staticIpAddress0: string;
  staticIpAddress1: string;
  staticIpAddress2: string;
  staticIpAddress3: string;
  staticIpAddress4: string;
  staticIpAddress5: string;
  staticIpAddress6: string;
  staticIpAddress7: string;
  staticIpAddress8: string;
  staticIpAddress9: string;
  basicServices: {
    voiceOriginatedHome: boolean;
    voiceOriginatedRoaming: boolean;
    voiceOriginatedInternational: boolean;
    voiceTerminatedHome: boolean;
    voiceTerminatedRoaming: boolean;
    smsOriginatedHome: boolean;
    smsOriginatedRoaming: boolean;
    smsOriginatedInternational: boolean;
    smsTerminatedHome: boolean;
    smsTerminatedRoaming: boolean;
    dataHome: boolean;
    dataRoaming: boolean;
  };
}

export interface RouteSimsV2TypeVivo extends DataKiteSIMItem {
  iccid: string
  client: number
  clientName: string
  unit: number
  unitName: string
  accessPoint: string
  modem: string
  accessPointMAC: string
  repeaterMAC: string
  associationDate: string
  cityId: number
  stateId: number
}
export interface GsmSubscriptionData {
  subscriptionData: DataKiteSIMItem[]
}

function createAgentToValidateCertificate() {
  return new https.Agent({
    cert: fs.readFileSync(configfile.KiteApi.cert),
    key: fs.readFileSync(configfile.KiteApi.key),
  }); 
}

function checkAxiosError (err: any): AxiosResponse {
  if (err?.isAxiosError) {
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

async function apiGet (route: string, httpsAgent: https.Agent) {
  const config: AxiosRequestConfig = {
    method: 'GET',
    baseURL: configfile.KiteApi.url,
    url: route,
    headers: {},
    httpsAgent,
  };
  return axios(config)
  .catch(checkAxiosError);
}

async function apiPut (route: string, body: any,  httpsAgent: https.Agent) {
  const config: AxiosRequestConfig = {
    method: 'PUT',
    baseURL: configfile.KiteApi.url,
    url: route,
    data: body,
    headers: {},
    httpsAgent,
  };
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios(config)
  .catch(checkAxiosError);
}

const ApiVivoKite = {
  ['PUT /Inventory/v11/r12/sim/icc:${icc}/networkReset']: async function (icc: string, body: any,  httpsAgent: https.Agent) {
    const response = await apiPut(`/Inventory/v11/r12/sim/icc:${icc}/networkReset`, body, httpsAgent);
    return response.data as { result: boolean }
  },
  ['GET /Inventory/v11/r12/sim']: async function (maxBatchSize: number, startIndex: number, httpsAgent: https.Agent) {
    const response = await apiGet(`/Inventory/v11/r12/sim?maxBatchSize=${maxBatchSize}&startIndex=${startIndex}`, httpsAgent);
    // HTTP/1.1 206 Partial Content
    // Accept-Ranges: records
    // Content-Range: records 0:100/121
    // ?startIndex=0 & maxBatchSize=1000
    return response.data as GsmSubscriptionData;
  },
}

export async function getListSimsKiteVivo() {
  try {
    const httpsAgent = createAgentToValidateCertificate();
    if (httpsAgent !== null && httpsAgent !== undefined) {
      let offset = 0;
      let limit = 1000;
      let listVivoSimsApiReturn: DataKiteSIMItem[] = [];
      while (true) {
        const { subscriptionData } = await ApiVivoKite['GET /Inventory/v11/r12/sim'](limit, offset, httpsAgent);
        listVivoSimsApiReturn = listVivoSimsApiReturn.concat(subscriptionData);
        if (subscriptionData.length === 1000) {
          offset += limit + 1;
          continue;
        }
        break;
      }
      return listVivoSimsApiReturn;
    }
    return null;
  } catch (err) {
    logger.error(`Erro ao buscar SIM's pela API da Kite`);
    throw new Error(`Erro ao buscar SIM's  ${err}`).HttpStatus(500);
  } 
}

export async function resetNetworkVivo(icc: string, session: SessionData) {
  try {
    const httpsAgent = createAgentToValidateCertificate();
    if (httpsAgent !== null && httpsAgent !== undefined) {
      const { result } = await ApiVivoKite['PUT /Inventory/v11/r12/sim/icc:${icc}/networkReset'](icc, {"network2g3g": true, "network4g": true}, httpsAgent);
      return result;
    }
    return false;
  } catch (err) {
    logger.error(`Erro ao resetar o SIM ${icc} pela API da Kite`, session);
    throw new Error(`Erro ao resetar o SIM ${err}`).HttpStatus(500);
  }  
}

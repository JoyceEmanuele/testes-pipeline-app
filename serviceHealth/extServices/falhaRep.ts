import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import servConfig from "../../configfile";

import { logger } from "../../srcCommon/helpers/logger";

function checkAxiosError(err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error("erro ao buscar informações do falha-repentina")
      .HttpStatus(500)
      .DebugInfo({ errorCode: "EXT_API_FALHAREP" });
  }
  throw err;
}

async function apiPost(route: string, body: any) {
  const config: AxiosRequestConfig = {
    method: "post",
    baseURL: `http://${servConfig.faultsRep.host}:${servConfig.faultsRep.port}`,
    url: route,
    data: body,
  };
  return axios(config).catch(checkAxiosError);
}

async function apiGet(route: string, body: any) {
  const config: AxiosRequestConfig = {
    method: "GET",
    baseURL: `http://${servConfig.faultsRep.host}:${servConfig.faultsRep.port}`,
    url: route,
    headers: {},
    data: body,
  };
  return axios(config).catch(checkAxiosError);
}

export default {
  ["/inform-changes-dac"]: (body = {}) =>
    apiPost(`/inform-changes-dac`, body).then((response) => {
      return response.data as {};
    }),
  ["/fault-feedback"]: (body: {
    dev_id: string;
    notif_type: "DETECT" | "RESTAB",
    fault_id: string;
    state: "APPROVED" | "REJECTED";
    update_first_detect: boolean;
  }) =>
    apiPost("/fault-feedback", body).then((response) => {
      return response.data as {};
    }),
  ["/falhas-instalacao"]: (body: {
    dev_id?: string;
    fault_name?: string;
    start_time?: string;
    end_time?: string;
    notif_type?: "Detect" | "Return";
  }) =>
    apiPost("/falhas-instalacao", body).then((response) => {
      return response.data as {
        falhas?: {
          [devId: string]: {
            [faultName: string]: {
              fault_name: string;
              dev_id: string;
              fault_time: string;
              notif_type: "Detect" | "Return";
            }[];
          };
        };
        error?: string;
      };
    }),
  ["/new-fault"]: (body: {
    dev_id: string;
    fault_id: string;
    restab: boolean;
  }) =>
    apiPost("/new-fault", body).then((response) => {
      return response.data as {};
    }),
  ["/definitions-fault"]: () =>
    apiGet("/definitions-fault", null).then((response) => {
      return response.data as {
        defs: {
          approval_type: string;
          fault_id: string;
          gravity: string;
          name: string;
        }[];
      };
    }),
  ["/detected-faults"]: async () => {
    const response = await apiGet("/detected-faults", null);
    return response.data as {
      list: {
        dev_id: string
        faults: {
          fault_id: string
          first_det: number
          last_det: number
          last_restab: number
        }[]
      }[]
    };
  },
  ["/detected-faults/dev"]: async (body: { dev_id: string }) => {
    const response = await apiGet(`/detected-faults/${body.dev_id}`, null);
    return response.data as {
      list: {
        fault_id: string
        first_det: number
        last_det: number
        last_restab: number
      }[]
    };
  },
  ['/fr-history']: (body: {
    dev_id?: string,
    start_time?: string,
    end_time?: string,
    fault_id?: string,
  }) => apiGet('/fr-history', body).then(response => {
    return response.data as {
      history?: {
        detected_fault_id: number,
        timestamp: string,
        dev_id: string,
        rise: boolean,
        approved: boolean | null,
        source: "Endpoint" | "FR"
        restab: boolean,
        fault_id: string,
        name: string,
        gravity: string,
        approval_type: string,
        permanence_detected: boolean
      }[],
      error?: string,
    }
  }),
  ["/detected-faults/list-dacs"]: (body: {
    dacs_id: string[];
  }) =>
    apiPost("/detected-faults/list-dacs", body).then((response) => {
      return response.data as {
        list: [
          {
            dac_id: string;
            fault: string;
            first_detected: string;
            last_detected: string;
          }
        ]
      };
    }),
  ["/enabled-faults"]: (body: {
    dev_id: string,
    fault_id: string,
    enabled: boolean,
    description: string,
    user: string,
    client: string,
    unit: string,
    unit_id: number,
  }) => apiPost("/enabled-faults", body).then((response) => {
    return response.data as {};
  }),
  ["/enabled-faults/list-dac"]: (body: {
    dev_id: string,
  }) => apiPost("/enabled-faults/list-dac", body).then((response) => {
    return response.data as {
      list: [
        {
          id: number,
          dev_id: string,
          fault_id: string,
          enabled: boolean,
          description: string,
          user: string,
          client: string,
          unit: string,
          unit_id: number,
          timestamp: string,
        }
      ]
    }
  }),
  ["/enabled-faults/list-all"]: () => apiGet("/enabled-faults/list-all", null).then((response) => {
    return response.data as {
      list:
        {
          id: number,
          dev_id: string,
          fault_id: string,
          enabled: boolean,
          description: string,
          user: string,
          client: string,
          unit: string,
          unit_id: number,
          timestamp: string,
        }[]
    }
  }),
};

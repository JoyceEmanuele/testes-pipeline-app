import axios, { AxiosResponse, AxiosRequestConfig, Method } from "axios";
import { logger } from "../../srcCommon/helpers/logger";
import servConfig from "../../configfile";
import { Machine, Simulation } from "../../srcCommon/types/machine";
import { SessionData } from "../../srcCommon/types";

function checkAxiosError(err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error("erro ao buscar informações do Device Simulator")
      .HttpStatus(500)
      .DebugInfo({ errorCode: "EXT_API_DEVICE_SIMULATOR_HTTP" });
  }
  throw err;
}

async function deviceSimulatorApi(
  route: string,
  method: Method,
  body?: any,
  parameters?: any
) {
  const config: AxiosRequestConfig = {
    method: method,
    baseURL: servConfig.deviceSimulatorAPI + route,
    data: body,
    params: parameters,
  };
  return axios(config).catch(checkAxiosError);
}

const apiDeviceSimulator = {
  ["POST /simulation"]: async function (simulation: Simulation, user: SessionData) {
    const response = await deviceSimulatorApi("/simulation", "post", {
      name: simulation.name,
      dacRecurrences: simulation.dacRecurrences,
      dutRecurrences: simulation.dutRecurrences,
      damRecurrences: simulation.damRecurrences,
      dynamoSource: simulation.dynamoSource,
      user: user.user,
      burstData: simulation.burstData,
      syncRecurrences: simulation.syncRecurrences,
    });
    return response.data;
  },
  ["GET /simulation"]: async function () {
    const response = await deviceSimulatorApi("/simulation", "get");
    return response.data;
  },
  ["DELETE /simulation"]: async function (simulationId: string, user: SessionData) {
    const response = await deviceSimulatorApi(
      `/simulation/${simulationId}`,
      "delete"
    );
    return response.data;
  },
  ["PUT /workerStart"]: async function (simulationId: string, user: SessionData) {
    const response = await deviceSimulatorApi("/worker", "put", {
      machineId: simulationId.toString(),
      command: "START",
    });
    return response.data;
  },
};

export { apiDeviceSimulator };

import * as httpRouter from "../apiServer/httpRouter";
import { apiDeviceSimulator } from "../extServices/deviceSimulatorAPI";

httpRouter.privateRoutes["/device-simulator/newSimulation"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  return apiDeviceSimulator["POST /simulation"](reqParams, session);
};

httpRouter.privateRoutes["/device-simulator/listSimulations"] = async function (_reqParams, session) {
  if (!session.permissions.isAdminSistema) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  return apiDeviceSimulator["GET /simulation"]();
};

httpRouter.privateRoutes["/device-simulator/deleteSimulation"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  return apiDeviceSimulator["DELETE /simulation"](reqParams.machineId, session);
};

httpRouter.privateRoutes["/device-simulator/startSimulation"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  return apiDeviceSimulator["PUT /workerStart"](reqParams.machineId, session);
};

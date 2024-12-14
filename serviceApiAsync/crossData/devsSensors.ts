import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import * as dacInfo from '../dacInfo'
import { logger } from '../../srcCommon/helpers/logger'

httpRouter.privateRoutes['/config/add-pressure-sensor'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  const sensorQPars = {
    SENSOR_ID: reqParams.SENSOR_ID,
    SENSOR_NAME: reqParams.SENSOR_NAME ?? null,
  };
  try {
    await sqldb.SENSORS.w_insert(sensorQPars, session.user);
  }
  catch (err) {
    if ((err as any).code === "ER_DUP_ENTRY") {
      throw new Error("Sensor already exists").HttpStatus(400);
    }
    else {
      logger.error(err);
      throw err;
    }
  }
  const res = await sqldb.SENSORS.getInfo({ SENSOR_ID: reqParams.SENSOR_ID });
  return res;
}

httpRouter.privateRoutes['/config/delete-pressure-sensor'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  await sqldb.SENSOR_FIRMWARE_CURVES.w_deleteAllSensor({ SENSOR_ID: reqParams.SENSOR_ID }, session.user);
  await dacInfo.removingSensor({ SENSOR_ID: reqParams.SENSOR_ID }, session.user);
  const { affectedRows } = await sqldb.SENSORS.w_deleteRow({ SENSOR_ID: reqParams.SENSOR_ID }, { DEVACS: true }, session.user);
  return `DELETED ${affectedRows}`
}

httpRouter.privateRoutes['/config/edit-pressure-sensor'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  if (reqParams.SENSOR_ID != null) {
    await sqldb.SENSORS.w_update({
      SENSOR_ID: reqParams.SENSOR_ID,
      SENSOR_NAME: reqParams.SENSOR_NAME,
    }, session.user);
  };

  return await sqldb.SENSORS.getInfo({ SENSOR_ID: reqParams.SENSOR_ID });
}

httpRouter.privateRoutes['/config/get-pressure-sensors'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  const list = await sqldb.SENSORS.getList();
  return { list };
}

httpRouter.privateRoutes['/config/add-pressure-curve'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403);
  const sensor = await sqldb.SENSORS.getInfo({ SENSOR_ID: reqParams.SENSOR_ID });
  if (!sensor) throw Error("Sensor does not exist").HttpStatus(400);

  const { insertId } =  await sqldb.SENSOR_FIRMWARE_CURVES.w_insert( {
    SENSOR_ID: sensor.SENSOR_ID,
    MIN_FW_VERSION: reqParams.MIN_FIRMWARE_VERSION,
    MULT_QUAD: reqParams.MULT_QUAD,
    MULT_LIN: reqParams.MULT_LIN,
    OFST: reqParams.OFST,
  }, session.user);

  return await sqldb.SENSOR_FIRMWARE_CURVES.getInfo({ ID: insertId }, session.user)
    .then(x => ({ MIN_FIRMWARE_VERSION: x.MIN_FW_VERSION, ...x }));
}

httpRouter.privateRoutes["/config/delete-pressure-curve"] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403);
  let { affectedRows } = await sqldb.SENSOR_FIRMWARE_CURVES.w_delete({ ID: reqParams.CURVE_ID }, session.user);
  return `DELETED ${affectedRows}`;
}

httpRouter.privateRoutes["/config/edit-pressure-curve"] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403);
  await sqldb.SENSOR_FIRMWARE_CURVES.w_update({
    ID: reqParams.ID,
    MIN_FW_VERSION: reqParams.MIN_FIRMWARE_VERSION,
    MULT_QUAD: reqParams.MULT_QUAD,
    MULT_LIN: reqParams.MULT_LIN,
    OFST: reqParams.OFST,
    SENSOR_ID: reqParams.SENSOR_ID,
  }, session.user);

  return await sqldb.SENSOR_FIRMWARE_CURVES.getInfo({ ID: reqParams.ID }, session.user)
    .then(info => ({ MULT: info.MULT_LIN, MIN_FIRMWARE_VERSION: info.MIN_FW_VERSION, ...info }))
}

httpRouter.privateRoutes["/config/get-pressure-curves"] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403);
  const list = await sqldb.SENSOR_FIRMWARE_CURVES.getList({}, session.user);
  return { list: list.map(info => ({ MULT: info.MULT_LIN, MIN_FIRMWARE_VERSION: info.MIN_FW_VERSION, ...info })) } 
}
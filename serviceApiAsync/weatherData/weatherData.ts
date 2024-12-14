import { API_private2 } from '../../srcCommon/types/api-private'
import sqldb from '../../srcCommon/db'
import { getFacilityTempData, getFacilityNearestStation } from '../extServices/weatherData'
import { mergeVarsCommomX } from '../../srcCommon/helpers/chartDataFormats';
import { addDays_YMD, sumDaysXAxis } from '../../srcCommon/helpers/dates';
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';

function bodyValidation (body: { latitude: string, longitude: string, cityName: string, state: string, startDate: string, endDate: string }) {
  const { cityName, state, startDate, endDate } = body
  if (!cityName) {
    throw Error('A propriedade \'cityName\' não está presente no body do request')
      .HttpStatus(422)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  } else if (!state) {
    throw Error('A propriedade \'state\' não está presente no body do request')
      .HttpStatus(422)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  } else if (!startDate) {
    throw Error('A propriedade \'startDate\' não está presente no body do request')
      .HttpStatus(422)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  } else if (!endDate) {
    throw Error('A propriedade \'endDate\' não está presente no body do request')
      .HttpStatus(422)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  } else if (new Date(startDate) > new Date(endDate)) {
    throw Error('A propriedade \'startDate\' deve possuir uma data anterior à \'endDate\'')
      .HttpStatus(422)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  }
}

// httpRouter.privateRoutesDeprecated['/weather_data'] = async function (body, session) {
//   const { latitude, longitude, cityName, startDate, endDate, state } = body
//   bodyValidation(body)
//   const coord = { lat: parseFloat(latitude), lon: parseFloat(longitude) }
//   const data = await getFacilityTempData(coord, cityName, startDate, endDate, state)
//   return data;
// }

/**
 * @swagger
 * /get-weather-stations-near-unit:
 *   post:
 *     summary: Obter estações meteorológicas próximas a uma unidade
 *     description: Retorna a lista de estações meteorológicas próximas à unidade especificada pelo ID. É necessário ter permissão para visualizar dispositivos na unidade.
 *     tags:
 *       - Weather
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: ID da unidade
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             unitId:
 *               type: integer
 *               description: ID da unidade
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de estações meteorológicas obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   description: Lista de estações meteorológicas próximas
 *                   items:
 *                     type: object
 *                     properties:
 *                       stationName:
 *                         type: string
 *                         description: Nome da estação meteorológica
 *                       distance:
 *                         type: number
 *                         description: Distância em quilômetros entre a unidade e a estação meteorológica
 *       400:
 *         description: Parâmetros inválidos ou faltando
 *       403:
 *         description: Permissão negada
 */

export const getWeatherStationsNearUnit: API_private2['/get-weather-stations-near-unit'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Invalid properties. Missing unitId.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const coord = { lat: parseFloat(unitInfo.LAT), lon: parseFloat(unitInfo.LON) }

  const list = await getFacilityNearestStation(coord, unitInfo.CITY_NAME, unitInfo.STATE_ID).catch((err) => { logger.error(err); }) || [];

  return { list };
}

export const getWeatherDataNearUnit: API_private2['/get-weather-data-near-unit'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Invalid properties. Missing unitId.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  const coord = { lat: parseFloat(unitInfo.LAT), lon: parseFloat(unitInfo.LON) }
  const weatherData = await getFacilityTempData(coord, unitInfo.CITY_NAME, reqParams.dayYMD, unitInfo.STATE_ID);

  const list = [];
  for (let i = 0; i < weatherData.estacao.length; i++) {
    list.push({
      CD_ESTACAO: weatherData.estacao[i].CD_ESTACAO,
      DC_NOME: weatherData.estacao[i].DC_NOME,
      measures: weatherData.medidas[i],
    });
  }

  return { list };
}

export const getWeatherDataNearUnitCommonXv2: API_private2['/get-weather-data-near-unit-commonX-v2'] = async function (reqParams, session) {
  if (!reqParams.unitId) { throw Error('Invalid properties. Missing unitId.').HttpStatus(400); }
  if (!reqParams.numDays) { throw Error('"numDays" required').HttpStatus(400); }
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unitId });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (reqParams.numDays !== undefined) {
    if ((reqParams.numDays < 1) || (reqParams.numDays > 15)) {
      throw Error('O período aceitável é de 1 a 15 dias').HttpStatus(400);
    }
  }

  const days = [] as string[]
  for (let i = 0; i < reqParams.numDays; i++) {
    const dayAux = addDays_YMD(reqParams.dayYMD, i);
    days.push(dayAux);
  }

  const coord = { lat: parseFloat(unitInfo.LAT), lon: parseFloat(unitInfo.LON) };
  const weatherData : Array<{[key: string]: Array<{x: number, y: number}>}> = await Promise.all(days.map(async (day, index) => {
    const {estacao, medidas} = await getFacilityTempData(coord, unitInfo.CITY_NAME, day, unitInfo.STATE_ID);

    const measures = medidas.map((measure) => measure.map(({ TEM_INS, timestamp, xH }) => ({
      x: sumDaysXAxis(xH || parseFloat(timestamp.slice(11, 13)), index),
      y: TEM_INS ? parseFloat(TEM_INS) : null,
    })));

    const measuresByStation: {[key: string]: Array<{x: number, y: number}>} = {};
    estacao.forEach((k, i) => {measuresByStation[k.DC_NOME] = measures[i]});

    return measuresByStation;
  }));

  let cAux : {[key: string]: Array<number>} = {};
  let vAux : {[key: string]: Array<number>} = {};
  const varList = [] as any[];

  // Une os dados de cada dia em um vetor por variável
  for (let i = 0; i < weatherData.length; i++) { // dia
    for (let [key, value] of Object.entries(weatherData[i])) { // estação
      if(reqParams.stations && !reqParams.stations.includes(key)) continue;
      if(!cAux.hasOwnProperty(key)) cAux[key] = [];
      if(!vAux.hasOwnProperty(key)) vAux[key] = [];

      weatherData[i][key].forEach(({ x }) => cAux[key].push(x));
      weatherData[i][key].forEach(({ y }) => vAux[key].push(y));
    }
  }

  const stations = Object.keys(cAux);
  for(let key of stations){
    varList.push({
      c: cAux[key],
      v: vAux[key]
    })
  };


  //Calcula o eixo X comum
  const list = mergeVarsCommomX(varList, reqParams.numDays);

  const commonX = list.c as number[];

  const stationsTemps : {[key: string]: any}= {} 
  for(let i = 0; i < stations.length; i++){
    const currStation = stations[i];
    const temperatures = { y: list.vs[i].map((y) => y != null ? Number(y) : null) };
    const tempLimits = [Math.min(...temperatures.y), Math.max(...temperatures.y)];
    stationsTemps[currStation] = {
      temperatures, tempLimits
    }
  };

  return {
    commonX,
    stationsTemps
  };
}

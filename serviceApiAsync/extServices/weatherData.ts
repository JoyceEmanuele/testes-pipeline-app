import axios from 'axios'
import servConfig from '../../configfile';
import { addDays_YMD } from '../../srcCommon/helpers/dates';

import * as cities from '../weatherData/cities.json'
import * as stations from '../weatherData/stations.json'

import { logger } from '../../srcCommon/helpers/logger';

async function getClosestStation (cityId: string) {
  const response = await axios.get(`https://apiprevmet3.inmet.gov.br/estacao/proxima/${cityId}`);
  return response.data as {
    estacao: {
      UF: string
      CODIGO: string
      LONGITUDE: string
      REGIAO: string
      DISTANCIA_EM_KM: string
      NOME: string
      LATITUDE: string
      GEOCODE: string
    },
    dados: {
      DC_NOME: string
      PRE_INS: string
      TEM_SEN: string
      VL_LATITUDE: string
      PRE_MAX: string
      UF: string
      RAD_GLO: string
      PTO_INS: string
      TEM_MIN: string
      VL_LONGITUDE: string
      UMD_MIN: string
      PTO_MAX: string
      VEN_DIR: string
      DT_MEDICAO: string
      CHUVA: string
      PRE_MIN: string
      UMD_MAX: string
      VEN_VEL: string
      PTO_MIN: string
      TEM_MAX: string
      VEN_RAJ: string
      TEM_INS: string
      UMD_INS: string
      CD_ESTACAO: string
      HR_MEDICAO: string
    }
  };
}

async function getStationData (startDate: string, endDate: string, stationCode: string) {
  const token = servConfig.inmetApi.token;
  const response = await axios.get(`https://apitempo.inmet.gov.br/token/estacao/${startDate}/${endDate}/${stationCode}/${token}`);
  if (!(response.data instanceof Array)) { logger.info('DBG52', `https://apitempo.inmet.gov.br/estacao/${startDate}/${endDate}/${stationCode}`); logger.info(response); }
  return response.data as {
    DC_NOME: string
    PRE_INS: string
    TEM_SEN: string
    VL_LATITUDE: string
    PRE_MAX: string
    UF: string
    RAD_GLO: string
    PTO_INS: string
    TEM_MIN: string
    VL_LONGITUDE: string
    UMD_MIN: string
    PTO_MAX: string
    VEN_DIR: string
    DT_MEDICAO: string
    CHUVA: string
    PRE_MIN: string
    UMD_MAX: string
    VEN_VEL: string
    PTO_MIN: string
    TEM_MAX: string
    VEN_RAJ: string
    TEM_INS: string
    UMD_INS: string
    CD_ESTACAO: string
    HR_MEDICAO: string
  }[];
}

function deg2rad (deg: number) {
  return deg * (Math.PI / 180)
}

// Haversine Formula
function getDistanceFromLatLonInKm (
  coordFacility: { lat: number, lon: number },
  coordStation: { lat: number, lon: number },
  ) {
  const R = 6371 // Radius of the Earth in km
  const dLat = deg2rad(coordStation.lat - coordFacility.lat) // Latitude difference in radians
  const dLon = deg2rad(coordStation.lon - coordFacility.lon) // Longitude difference in radians
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(coordFacility.lat)) * Math.cos(deg2rad(coordStation.lat)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const d = R * c // Distance in km
  return d
}

function wordWithoutAccents (word: string) {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function createRegex(word: string) {
  return new RegExp(`\\b${word}\\b`, 'gi')
}

async function getCityClosestStation (formattedCityName: string, state: string) {
  try {
    const re = createRegex(formattedCityName)
    const cityData = cities.find((city) => wordWithoutAccents(city.nome).match(re) && city.microrregiao.mesorregiao.UF.sigla === state)
    const cityClosestStation = await getClosestStation(cityData.id);
    return cityClosestStation.estacao
  } catch (error) {
    logger.error('Erro ao buscar a cidade ou não existe, verificar nome da cidade e sigla do estado', error);
    throw Error('Erro ao buscar a cidade ou não existe, verificar nome da cidade e sigla do estado')
      .HttpStatus(404)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  }
}

export async function getFacilityNearestStation (coord: { lat: number, lon: number }, cityName: string, state: string) {
  // Remove words' accents
  const formattedCityName = wordWithoutAccents(cityName)
  // Regex expression to match city names
  const re = createRegex(formattedCityName)
  let cityStations = stations.filter((station) => station['DC_NOME'].match(re) && station['SG_ESTADO'] === state)

  if (cityStations.length < 1) {
    const cityClosestStation = await getCityClosestStation(formattedCityName, state)
    const re = createRegex(wordWithoutAccents(cityClosestStation['NOME']))
    cityStations = stations
      .filter((station) => station['DC_NOME'].match(re))
      .map((station) => {
        return {
          ...station,
          DISTANCIA_EM_KM: cityClosestStation['DISTANCIA_EM_KM']
        }
      })
  }

  if (!coord || !coord.lat || !coord.lon) return cityStations

  const stationDistances = cityStations.map((station) => {
    const coordStation = {
      lat: parseFloat(station['VL_LATITUDE']),
      lon: parseFloat(station['VL_LONGITUDE']),
    }
    return getDistanceFromLatLonInKm(coord, coordStation)
  })

  const shortestDistance = Math.min(...stationDistances)
  const shortestDistanceIndex = stationDistances.indexOf(shortestDistance)

  return [{
    ...cityStations[shortestDistanceIndex],
    DISTANCIA_EM_KM: `${shortestDistance.toFixed(2)} Km`,
  }]
}

export async function getTempDataByStationCodeAndDate (stationCode: string, dayYMD: string, includeNext: boolean) {
  let nextMeasureDate: string;
  let tempMeasures;
  let refTs: number;
  try {
    const endDate = addDays_YMD(dayYMD, 1);
    nextMeasureDate = `${endDate}T00:00:00`;
    tempMeasures = await getStationData(dayYMD, endDate, stationCode);
    refTs = new Date(`${dayYMD}T00:00:00Z`).getTime();
  } catch (err) {
    logger.error('Erro ao buscar os dados. Certifique-se de que a data está no formato AAAA-MM-DD', err);
    throw Error('Erro ao buscar os dados. Certifique-se de que a data está no formato AAAA-MM-DD')
      .HttpStatus(400)
      .DebugInfo({ errorCode: 'EXT_API_WEATHER_HTTP' });
  }
  const list = tempMeasures.map((item) => {
    const timestampUTC = new Date(`${item.DT_MEDICAO}T${item.HR_MEDICAO.substring(0, 2)}:${item.HR_MEDICAO.substring(2, 4)}Z`);
    const timestamp = new Date(timestampUTC.getTime() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300';
    const measureTs = new Date(`${timestamp.substring(0, 19)}Z`).getTime();
    return {
      TEM_INS: item.TEM_INS,
      HR_MEDICAO: item.HR_MEDICAO,
      timestamp,
      xH: Math.round((measureTs - refTs) / 60 / 60) / 1000,
    };
  }).filter((item) => (item.timestamp.startsWith(dayYMD) || (includeNext && item.timestamp.startsWith(nextMeasureDate))));
  return list;
}

export async function getFacilityTempData (
  coord: { lat: number, lon: number },
  cityName: string,
  dayYMD: string,
  state: string,
  ){
  const stationsFound = await getFacilityNearestStation(coord, cityName, state)
  const data = await Promise.all(stationsFound.map(({ CD_ESTACAO }) => {
    return getTempDataByStationCodeAndDate(CD_ESTACAO, dayYMD, true);
  }))
  return {
    estacao: stationsFound,
    medidas: data,
  }
}

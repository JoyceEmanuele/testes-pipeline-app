import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import servconfig from '../../configfile';
import { logger } from '../helpers/logger';

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao acessar API do Google').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_GOOGLE_HTTP' });
  }
  throw err;
}

// Not the best practice, but it works
let addressGeoBuffer: { [address: string]: GeocodeResponse } = {};
export function onDayChange () {
  addressGeoBuffer = {};
}

export async function convertAddressToGeo (address: string) {
  // 1600+Amphitheatre+Parkway,+Mountain+View,+CA
  if (addressGeoBuffer[address]) return addressGeoBuffer[address];
  const config: AxiosRequestConfig = {
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/geocode/json?key=${servconfig.googleApi.apikey}&address=${encodeURIComponent(address)}`,
  };
  return axios(config).catch(checkAxiosError)
  .then((response) => {
    addressGeoBuffer[address] = response.data;
    return response.data as GeocodeResponse;
  });
}

export interface GeocodeResponse {
  status: string // "OK"
  results: {
    address_components: {
      long_name: string,
      short_name: string,
      types: string[],
    }[],
    //  {
    //     "long_name" : "1600",
    //     "short_name" : "1600",
    //     "types" : [ "street_number" ]
    //  },
    //  {
    //     "long_name" : "Amphitheatre Parkway",
    //     "short_name" : "Amphitheatre Pkwy",
    //     "types" : [ "route" ]
    //  },
    //  {
    //     "long_name" : "Mountain View",
    //     "short_name" : "Mountain View",
    //     "types" : [ "locality", "political" ]
    //  },
    //  {
    //     "long_name" : "Santa Clara County",
    //     "short_name" : "Santa Clara County",
    //     "types" : [ "administrative_area_level_2", "political" ]
    //  },
    //  {
    //     "long_name" : "California",
    //     "short_name" : "CA",
    //     "types" : [ "administrative_area_level_1", "political" ]
    //  },
    //  {
    //     "long_name" : "United States",
    //     "short_name" : "US",
    //     "types" : [ "country", "political" ]
    //  },
    //  {
    //     "long_name" : "94043",
    //     "short_name" : "94043",
    //     "types" : [ "postal_code" ]
    //  }
    formatted_address: string, // "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    geometry: {
      location: {
        lat: number, // 37.42224290000001,
        lng: number, // -122.0840133
      },
      location_type: string, // "ROOFTOP",
      viewport: {
        northeast: {
          lat: number, // 37.42359188029151,
          lng: number, // -122.0826643197085
        },
        southwest: {
          lat: number, // 37.42089391970851,
          lng: number, // -122.0853622802915
        },
      }
    },
    place_id: string, // "ChIJVYBZP-Oxj4ARls-qJ_G3tgM",
    plus_code: {
      compound_code: string, // "CWC8+V9 Mountain View, CA, USA",
      global_code: string, // "849VCWC8+V9"
    },
    types: string[], // [ "street_address" ]
  }[],
}

import * as httpRouter from '../apiServer/httpRouter'
import * as units from '../clientData/units'
import * as users from '../auth/users'
import sqldb from '../../srcCommon/db'
import { getAllowedUnitsView } from '../../srcCommon/helpers/permissionControl'
import { SessionData } from '../../srcCommon/types'

httpRouter.privateRoutes['/dac/get-cities-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
  }

  const list = await sqldb.CITY.select1({
    stateId: reqParams.stateId,
    clientIds: reqParams.clientIds,
  });
  return { list }
}

httpRouter.privateRoutes['/dac/search-city-info'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)

  const sqlitedb = require('better-sqlite3')('cidades_v2.sqlite', {})
  const idSearch = reqParams.id.normalize('NFD').toLowerCase().replace(/ /g, '-').replace(/[^-^\u0061-\u007A]/g, "")
  let sentence = `SELECT * FROM CITY WHERE CITY_ID LIKE '%${idSearch}%'`
    
  if (reqParams.state) sentence += ` AND STATE_NAME = '${reqParams.state.split("'").join("''")}' `
  sentence += ' LIMIT 50'
  const list = sqlitedb.prepare(sentence).all()
  sqlitedb.close()
  return { list }
}

export async function searchCityInfo (cityId: string) {
  const sqlitedb = require('better-sqlite3')('cidades_v2.sqlite', {})
  let sentence = `SELECT CITY_ID, COUNTRY_NAME, COUNTRY_LAT, COUNTRY_LON, STATE_CODE, STATE_NAME, STATE_LAT, STATE_LON, CITY_NAME, CITY_LAT, CITY_LON FROM CITY WHERE CITY_ID = '${cityId}' `
  const list: {
    CITY_ID: string,
    COUNTRY_NAME: string,
    COUNTRY_LAT: string,
    COUNTRY_LON: string,
    STATE_CODE: string,
    STATE_NAME: string,
    STATE_LAT: string,
    STATE_LON: string
    CITY_NAME: string,
    CITY_LAT: string,
    CITY_LON: string,
  }[] = sqlitedb.prepare(sentence).all();
  sqlitedb.close()
  return list;
}

function verifyReqParamsAddNewCity(reqParams: httpRouter.ApiParams['/dac/add-new-city'], session: SessionData) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  
  if (!reqParams.LAT || !Number(reqParams.LAT)) throw Error('Latitude da Cidade inválida').HttpStatus(400);
  if (!reqParams.LON || !Number(reqParams.LON)) throw Error('Longitude da Cidade inválida').HttpStatus(400);

  if (!reqParams.STATE_NAME) throw Error('Estado inválido').HttpStatus(400);
  if (!reqParams.STATE_LAT || !Number(reqParams.STATE_LAT)) throw Error('Latitude do Estado inválida').HttpStatus(400);
  if (!reqParams.STATE_LON || !Number(reqParams.STATE_LON)) throw Error('Longitude do Estado inválida').HttpStatus(400);

  if (!reqParams.COUNTRY_NAME) throw Error('País inválido').HttpStatus(400);
  if (!reqParams.COUNTRY_LAT || !Number(reqParams.COUNTRY_LAT)) throw Error('Latitude do País inválida').HttpStatus(400);
  if (!reqParams.COUNTRY_LON || !Number(reqParams.COUNTRY_LON)) throw Error('Longitude do País inválida').HttpStatus(400);
}

httpRouter.privateRoutes['/dac/add-new-city'] = async function (reqParams, session) {
  
  verifyReqParamsAddNewCity(reqParams, session);

  const cityId = createCityId({
    STATE_ID: reqParams.STATE_CODE,
    CITY_NAME: reqParams.NAME,
  });
  if (!cityId) throw Error('Não foi possível criar o ID da cidade').HttpStatus(500);

  const country = await sqldb.COUNTRY.getCountry({ COUNTRY_NAME: reqParams.COUNTRY_NAME });

  if (!country) {
    await sqldb.COUNTRY.w_insert({ COUNTRY_NAME: reqParams.COUNTRY_NAME, COUNTRY_LAT: reqParams.COUNTRY_LAT, COUNTRY_LON: reqParams.COUNTRY_LON }, session.user);
    const countryInfo = await sqldb.COUNTRY.getCountry({ COUNTRY_NAME: reqParams.COUNTRY_NAME })

    await sqldb.STATEREGION.w_insert({ STATE_CODE: reqParams.STATE_CODE, STATE_NAME: reqParams.STATE_NAME, STATE_LAT: reqParams.STATE_LAT, STATE_LON: reqParams.STATE_LON, COUNTRY_ID: countryInfo.id}, session.user);
    const stateInfo = await sqldb.STATEREGION.getState({ STATE_NAME: reqParams.STATE_NAME, COUNTRY_ID: countryInfo.id });

    await verifyInsertNewCity(cityId, reqParams.NAME, stateInfo.id, reqParams.LAT, reqParams.LON, session.user);
  } else {
    const state = await sqldb.STATEREGION.getState({ STATE_NAME: reqParams.STATE_NAME, COUNTRY_ID: country.id });
    if (!state) {
      await sqldb.STATEREGION.w_insert({ STATE_CODE: reqParams.STATE_CODE, STATE_NAME: reqParams.STATE_NAME, STATE_LAT: reqParams.STATE_LAT, STATE_LON: reqParams.STATE_LON, COUNTRY_ID: country.id}, session.user);
      const stateInfo = await sqldb.STATEREGION.getState({ STATE_NAME: reqParams.STATE_NAME, COUNTRY_ID: country.id });
      // TODO: verificar se retornou um stateInfo

      await verifyInsertNewCity(cityId, reqParams.NAME, stateInfo.id, reqParams.LAT, reqParams.LON, session.user);
    } else {
      await verifyInsertNewCity(cityId, reqParams.NAME, state.id, reqParams.LAT, reqParams.LON, session.user);
    }
  }
  return 'OK'
}

async function verifyInsertNewCity(CITY_ID: string, NAME: string, STATE_ID: number, LAT: string, LON: string, user: string) {
  const city = await sqldb.CITY.getCity({ CITY_ID });
  if (city) {
    throw Error('Cidade já cadastrada').HttpStatus(400)
  }

  await sqldb.CITY.w_insert({
    CITY_ID: CITY_ID,
    NAME: NAME,
    STATE_ID: STATE_ID,
    LAT: LAT,
    LON: LON,
  }, user)
}


httpRouter.privateRoutes['/dac/get-states-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
  }


  const admPars = {
    full: (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) && (!reqParams.clientId) && (!reqParams.clientIds) && (reqParams.full),
  }

  const results = await sqldb.STATEREGION.selectStates({ clientIds: reqParams.clientIds }, admPars);
  return { list: results }
}

httpRouter.privateRoutes['/dac/get-countries-list'] = async function (reqParams, session) {
  if (reqParams.clientId) { reqParams.clientIds = [reqParams.clientId]; }
  delete reqParams.clientId;
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: _notused } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
  }


  const admPars = {
    full: (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) && (!reqParams.clientId) && (!reqParams.clientIds) && (reqParams.full),
  }

  const results = await sqldb.COUNTRY.selectCountries({ clientIds: reqParams.clientIds }, admPars);
  return { list: results }
}

httpRouter.privateRoutes['/dac/remove-city'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  if (!reqParams.cityId) throw Error('Invalid parameters! Missing cityId.').HttpStatus(400)

  await units.removingCity({ CITY_ID: reqParams.cityId }, session.user);
  await users.removingCity({ CITY_ID: reqParams.cityId }, session.user);
  const { affectedRows } = await sqldb.CITY.w_deleteRow({ cityId: reqParams.cityId }, { CLUNITS: true, DASHUSERS: true }, session.user);

  return 'DELETED ' + affectedRows
}

httpRouter.privateRoutes['/dac/edit-city'] = async function (reqParams, session) {
  if (!session.permissions.ALTER_SYSTEM_PARS) throw Error('Permission denied!').HttpStatus(403)
  if (!reqParams.cityId) throw Error('Invalid parameters! Missing cityId.').HttpStatus(400)
  const { affectedRows } = await sqldb.CITY.w_update({ ...reqParams, CITY_ID: reqParams.cityId }, session.user)
  return 'UPDATED ' + affectedRows
}

function getNormalizedCityName (name: string) {
  if (!name) return name;
  // \u0030-\u0039 \u0061-\u007A
  name = name.trim().normalize('NFD').toLowerCase().replace(/ /g, '-').replace(/[^-a-z0-9]/g, "");
  name = name.replace(/-+/g, "-");
  name = name.replace(/^-+/, "");
  name = name.replace(/-+$/, "");
  return name;
}

export function createCityId (reqParams: { STATE_ID: string, CITY_NAME: string }): string {
  const state = getNormalizedCityName(reqParams.STATE_ID);
  const city = getNormalizedCityName(reqParams.CITY_NAME);
  if (!state) throw Error('Estado inválido').HttpStatus(400)
  if (!city) throw Error('Nome de cidade inválido').HttpStatus(400)
  const cityId = state && city && `${state}-${city}`;
  if (!cityId) throw Error('Não foi possível criar o ID da cidade').HttpStatus(500)
  return cityId;
}

function capitalize (name: string) {
  return name.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()).replace(/[^0-9a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ]/g, (c) => c.toUpperCase())
}

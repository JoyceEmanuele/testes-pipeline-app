import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { createCityId, searchCityInfo } from '../crossData/dacCities'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import * as googleApi from '../../srcCommon/extServices/googleApi'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'

export const inputColumns = {
  UNIT_NAME: { label: 'Nome', example: 'Filial Laranjeiras' },
  UNIT_CODE_CELSIUS: { label: 'Código da Unidade Celsius', example: '1' },
  UNIT_CODE_API: { label: 'Código da Unidade API', example:'1' },
  COUNTRY_NAME: { label: 'País', example: 'Brasil' },
  STATE_ID: { label: 'Sigla do Estado', example: 'BA' },
  CITY_NAME: { label: 'Cidade', example: 'Salvador' },
  LATLONG: { label: 'Latitude e Longitude', example: '-12.984281103010751, -38.50524452809755' },
  PRODUCTION: { label: 'Status da unidade', example: 'Em instalação' },
  TIMEZONE_AREA: { label: 'Fuso Horário(IANA)', example: 'America/Sao_Paulo'},
  CONSTRUCTED_AREA: { label: 'Área construída', example: '200'},
}

httpRouter.privateRoutes['/check-client-units-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const units = await parseFileRows(file);

  const _existingItems = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [clientId] });
  const existingItems = _existingItems.map(x => getNormalized(x.UNIT_NAME));
  const list = [];
  for (let i = 0; i < units.length; i++) {
    const row = units[i];
    list.push(await parseInputRow(row, `${i}/${Date.now()}`, existingItems))
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-units-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.units) throw Error('Missing parameter: units').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const _existingItems = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const existingItems = _existingItems.map(x => getNormalized(x.UNIT_NAME));
  const existingCities: string[] = [];

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.units) {
    try {
      const checked = await parseInputRow(row, row.key, existingItems);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      // Verificar se já existe registro com esse nome
      const normName = getNormalized(checked.UNIT_NAME);
      if (existingItems.includes(normName)) {
        ignored.push({ key: checked.key, reason: 'Já existe uma unidade com o mesmo nome' });
        continue;
      }

      // Adicionar a cidade se não existir
      let cityId: string = null;
      if (checked.STATE_ID && checked.CITY_NAME) {
        cityId = createCityId({
          STATE_ID: checked.STATE_ID,
          CITY_NAME: checked.CITY_NAME,
        });
        if (!cityId) throw Error('Não foi possível criar o ID da cidade').HttpStatus(500)
        if (!existingCities.includes(cityId)) {
          const city = await sqldb.CITY.getCity({ CITY_ID: cityId });
          if (!city) {
            const citiesInfo = await searchCityInfo(cityId);
            if (citiesInfo.length === 1) {
              await addCountryStateCity(citiesInfo[0].CITY_ID, citiesInfo[0].COUNTRY_NAME, citiesInfo[0].COUNTRY_LAT, citiesInfo[0].COUNTRY_LON, citiesInfo[0].STATE_CODE, citiesInfo[0].STATE_NAME, citiesInfo[0].CITY_NAME, citiesInfo[0].CITY_LAT, citiesInfo[0].CITY_LON, citiesInfo[0].STATE_LAT, citiesInfo[0].STATE_LON, session.user);
              existingCities.push(cityId);
            } else if (citiesInfo.length === 0) {
              ignored.push({ key: checked.key, reason: 'Nenhuma cidade encontrada com esse nome' });
              continue;
            } else {
              ignored.push({ key: checked.key, reason: 'Não foi possível identificar os dados da cidade' });
              continue;
            }
          } 
        }
      }

      // Verifica e altera os valores do status da unidade para true ou false
      let status = false;
      if (checked.PRODUCTION.toLocaleLowerCase() === 'em produção') {
        status = true;
      } else if (checked.PRODUCTION.toLocaleLowerCase() === 'em instalação') {
        status = false;
      }
      const timezoneInfo = await sqldb.TIME_ZONES.getTimezone({ TIMEZONE_AREA: checked.TIMEZONE_AREA});
      if (!timezoneInfo) {
        ignored.push({ key: checked.key, reason: 'Fuso Horário não encontrado' });
        continue;
      }

      existingItems.push(normName);
      const addedItem = await httpRouter.privateRoutes['/dac/add-client-unit']({
        CLIENT_ID: reqParams.CLIENT_ID,
        UNIT_NAME: checked.UNIT_NAME,
        CITY_ID: cityId,
        LAT: checked.LATLONG && checked.LATLONG.split(',')[0].trim(),
        LON: checked.LATLONG && checked.LATLONG.split(',')[1].trim(),
        PRODUCTION: status,
        TIMEZONE_ID: timezoneInfo.id,
        EXTRA_DATA: (checked.extras && JSON.stringify(checked.extras)) || null,
      }, session);
      added.push({ key: row.key });
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }

  return { added, ignored };
}

async function addCountryStateCity(CID: string, COUNTRY_NAME: string, COUNTRY_LAT: string, COUNTRY_LON: string, STATE_CODE: string, STATE_NAME: string, NAME: string, LAT: string, LON: string, STATE_LAT: string, STATE_LON: string, user: string){
  const country = await sqldb.COUNTRY.getCountry({ COUNTRY_NAME: COUNTRY_NAME });

  if (!country) {
    await sqldb.COUNTRY.w_insert({ COUNTRY_NAME: COUNTRY_NAME, COUNTRY_LAT: COUNTRY_LAT, COUNTRY_LON: COUNTRY_LON }, user);
    const countryInfo = await sqldb.COUNTRY.getCountry({ COUNTRY_NAME: COUNTRY_NAME })

    await sqldb.STATEREGION.w_insert({ STATE_NAME: STATE_NAME, STATE_CODE: STATE_CODE, STATE_LAT: STATE_LAT, STATE_LON: STATE_LON, COUNTRY_ID: countryInfo.id}, user);
    const stateInfo = await sqldb.STATEREGION.getState({ STATE_NAME: STATE_NAME, COUNTRY_ID: countryInfo.id });

    await sqldb.CITY.w_insert({
      CITY_ID: CID,
      NAME: NAME,
      STATE_ID: stateInfo.id,
      LAT: LAT,
      LON: LON,
    }, user)

  } else {
    const state = await sqldb.STATEREGION.getState({ STATE_NAME: STATE_NAME, COUNTRY_ID: country.id });
    if (!state) {
      await sqldb.STATEREGION.w_insert({ STATE_NAME: STATE_NAME, STATE_CODE: STATE_CODE, STATE_LAT: STATE_LAT, STATE_LON: STATE_LON, COUNTRY_ID: country.id}, user);
      const stateInfo = await sqldb.STATEREGION.getState({ STATE_NAME: STATE_NAME, COUNTRY_ID: country.id });

      await sqldb.CITY.w_insert({
        CITY_ID: CID,
        NAME: NAME,
        STATE_ID: stateInfo.id,
        LAT: LAT,
        LON: LON,
      }, user)

    } else {
      await sqldb.CITY.w_insert({
        CITY_ID: CID,
        NAME: NAME,
        STATE_ID: state.id,
        LAT: LAT,
        LON: LON,
      }, user)
    }
  }
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-units-batch']>[0]['units'][0];
async function parseInputRow (inRow: TableRow, key: string, existingItems: string[]) {
  const checked: TableRow = {
    key,
    UNIT_NAME: null,
    COUNTRY_NAME: null,
    STATE_ID: null,
    CITY_NAME: null,
    LATLONG: null,
    PRODUCTION: null,
    TIMEZONE_AREA: null,
    extras: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.UNIT_NAME = inRow.UNIT_NAME || null;
    if (!checked.UNIT_NAME) errors.push({ message: 'É necessário informar o nome da unidade' });

    // Verificar se já existe registro com esse nome
    const normName = getNormalized(checked.UNIT_NAME);
    if (existingItems.includes(normName)) {
      errors.push({ message: 'Já existe uma unidade com o mesmo nome' });
    }

    checked.COUNTRY_NAME = inRow.COUNTRY_NAME || null;
    checked.STATE_ID = inRow.STATE_ID || null;
    checked.CITY_NAME = inRow.CITY_NAME || null;
    checked.PRODUCTION = inRow.PRODUCTION || null;
    checked.TIMEZONE_AREA = inRow.TIMEZONE_AREA || null;
    checked.extras = inRow.extras || null;

    if (checked.STATE_ID) {
      //Para o BRASIL e para o Estados Unidos isso é válido
      if (checked.STATE_ID.length === 2) {
        checked.STATE_ID = checked.STATE_ID.toUpperCase();
      } else {
        errors.push({ message: `Sigla do estado inválida: ${checked.STATE_ID}` });
        checked.STATE_ID = null;
      }
    }
    if ((checked.STATE_ID || checked.CITY_NAME) && !checked.COUNTRY_NAME) errors.push({ message: `Faltou o nome do País` });
    if (checked.CITY_NAME && !checked.STATE_ID) errors.push({ message: `Cidade definida sem estado: ${checked.CITY_NAME}` });
    if (checked.STATE_ID && !checked.CITY_NAME) errors.push({ message: `Faltou o nome da cidade` });

    let addressCity: string = null;
    if (checked.STATE_ID && checked.CITY_NAME) {
      const cityId = createCityId({
        STATE_ID: checked.STATE_ID,
        CITY_NAME: checked.CITY_NAME,
      });
      if (!cityId) {
        errors.push({ message: `Não foi possível criar o ID da cidade` });
      } else {
        const city = await sqldb.CITY.getCity({ CITY_ID: cityId });
        if (city) {
          addressCity = `${city.name}, ${city.state}`;
        if(city.country.toLocaleLowerCase() !== checked.COUNTRY_NAME.toLocaleLowerCase()){
          errors.push({ message: `A cidade ${checked.CITY_NAME} não pertence ao país ${checked.COUNTRY_NAME}` });
        }
        } else {
          const citiesInfo = await searchCityInfo(cityId);
          if (citiesInfo.length === 1) {
            if (citiesInfo[0].COUNTRY_NAME.toLocaleLowerCase() !== checked.COUNTRY_NAME.toLocaleLowerCase()) {
              errors.push({ message: `A cidade ${checked.CITY_NAME} não pertence ao país ${checked.COUNTRY_NAME}`})
            }
            addressCity = `${citiesInfo[0].CITY_NAME}, ${citiesInfo[0].STATE_NAME}`;
          } else {
            errors.push({ message: `Cidade inválida` });
          }
        }
      }
    }

    if (inRow.LATLONG) {
      const latlong = inRow.LATLONG.split(',').map(x => Number(x.trim()));
      if ((latlong.length === 2) && isFinite(latlong[0]) && isFinite(latlong[1])) {
        checked.LATLONG = latlong.join(', ');
      } else {
        errors.push({ message: `Erro interpretando as coordenadas: ${inRow.LATLONG}` });
      }
    }

    if ((!inRow.LATLONG) && addressCity && checked.extras && checked.extras.length > 0) {
      const itemAddress = checked.extras.find(item => item[0] === 'Endereço');
      if (itemAddress && itemAddress[1]) {
        const address = `${itemAddress[1]}, ${addressCity}`;
        try {
          const geoCode = await googleApi.convertAddressToGeo(address);
          if (geoCode && geoCode.status === 'OK' && geoCode.results.length > 0) {
            const itemCoords = geoCode.results.find(x => (x.geometry && x.geometry.location && x.geometry.location.lat != null));
            if (itemCoords) {
              checked.LATLONG = `${itemCoords.geometry.location.lat}, ${itemCoords.geometry.location.lng}`;
            }
          }
        } catch (err) {
          logger.error(err);
        }
      }
    }

    if (!checked.TIMEZONE_AREA) errors.push({ message: 'É necessário informar o Fuso Horário'})

  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { ...checked, errors }
}

async function parseFileRows (file: Buffer) {
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines.map(row => row.map(col => (col || '').toString()));

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_COUNTRY_NAME = headers.indexOf(inputColumns.COUNTRY_NAME.label);
  const col_STATE_ID = headers.indexOf(inputColumns.STATE_ID.label);
  const col_CITY_NAME = headers.indexOf(inputColumns.CITY_NAME.label);
  const col_LATLONG = headers.indexOf(inputColumns.LATLONG.label);
  const col_PRODUCTION = headers.indexOf(inputColumns.PRODUCTION.label);
  const col_TIMEZONE_AREA = headers.indexOf(inputColumns.TIMEZONE_AREA.label);
  if (col_UNIT_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_NAME.label}`).HttpStatus(400);
  if (col_COUNTRY_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.COUNTRY_NAME.label}`).HttpStatus(400);
  if (col_STATE_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.STATE_ID.label}`).HttpStatus(400);
  if (col_CITY_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.CITY_NAME.label}`).HttpStatus(400);
  if (col_LATLONG < 0) throw Error(`Coluna não encontrada: ${inputColumns.LATLONG.label}`).HttpStatus(400);
  if (col_PRODUCTION < 0) throw Error(`Coluna não encontrada: ${inputColumns.PRODUCTION.label}`).HttpStatus(400);
  if (col_TIMEZONE_AREA < 0) throw Error(`Coluna não encontrada: ${inputColumns.TIMEZONE_AREA.label}`).HttpStatus(400);
  const knownColumns = [
    col_UNIT_NAME,
    col_COUNTRY_NAME,
    col_STATE_ID,
    col_CITY_NAME,
    col_LATLONG,
    col_PRODUCTION,
    col_TIMEZONE_AREA
  ];
  const extraColumns: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if ((!knownColumns.includes(i)) && headers[i]) { extraColumns.push(i) }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    const extras = extraColumns.map(i => [headers[i], cols[i]]);
    tableRows.push({
      key: `${i}/${Date.now()}`,
      UNIT_NAME: cols[col_UNIT_NAME],
      COUNTRY_NAME: cols[col_COUNTRY_NAME],
      STATE_ID: cols[col_STATE_ID],
      CITY_NAME: cols[col_CITY_NAME],
      LATLONG: cols[col_LATLONG],
      PRODUCTION: cols[col_PRODUCTION],
      TIMEZONE_AREA: cols[col_TIMEZONE_AREA],
      extras,
    });
  }

  return tableRows;
}

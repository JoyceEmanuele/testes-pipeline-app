import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'

import { logger } from '../../srcCommon/helpers/logger';
import { addEnergyCredentials, apiFourDocs } from '../extServices/fourDocsApi';
import { getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl';
import * as CryptoJS from 'crypto-js';
import servConfig from '../../configfile'

export const inputColumns = {
  UNIT_ID: { label: 'Codigo Unidade', example: '1000' },
  CONSUMER_UNIT: { label: 'Unidade Consumidora', example: '400038520' },
  DISTRIBUTOR_NAME: { label: 'Distribuidora', example: 'enel_rj' },
  ADDITIONAL_DISTRIBUTOR_INFO: {label: "Informação Adicional da Distribuidora", example: "bt_cpfl"},
  LOGIN: { label: 'Login da Distribuidora', example: 'faturas_energia@dielenergia.comb' },
  PASSWORD: { label: 'Senha', example: '12345678' },
  LOGIN_EXTRA: { label: 'Login Extra', example: '1234' },
  BASELINE_TEMPLATE: { label: 'Template de Baseline', example: 'Manual'},
  JANUARY_PRICE: { label: 'Janeiro R$', example: '1000'},
  JANUARY_KWH: { label: 'Janeiro kwh', example: '1000'},
  FEBRUARY_PRICE: { label: 'Fevereiro R$', example: '1000'},
  FEBRUARY_KWH: { label: 'Fevereiro kwh', example: '1000'},
  MARCH_PRICE: { label: 'Marco R$', example: '1000'},
  MARCH_KWH: { label: 'Marco kwh', example: '1000'},
  APRIL_PRICE: { label: 'Abril R$', example: '1000'},
  APRIL_KWH: { label: 'Abril kwh', example: '1000'},
  MAY_PRICE: { label: 'Maio R$', example: '1000'},
  MAY_KWH: { label: 'Maio kwh', example: '1000'},
  JUNE_PRICE: { label: 'Junho R$', example: '1000'},
  JUNE_KWH: { label: 'Junho kwh', example: '1000'},
  JULLY_PRICE: { label: 'Julho R$', example: '1000'},
  JULLY_KWH: { label: 'Julho kwh', example: '1000'},
  AUGUST_PRICE: { label: 'Agosto R$', example: '1000'},
  AUGUST_KWH: { label: 'Agosto kwh', example: '1000'},
  SEPTEMBER_PRICE: { label: 'Setembro R$', example: '1000'},
  SEPTEMBER_KWH: { label: 'Setembro kwh', example: '1000'},
  OCTOBER_PRICE: { label: 'Outubro R$', example: '1000'},
  OCTOBER_KWH: { label: 'Outubro kwh', example: '1000'},
  NOVEMBER_PRICE: { label: 'Novembro R$', example: '1000'},
  NOVEMBER_KWH: { label: 'Novembro kwh', example: '1000'},
  DECEMBER_PRICE: { label: 'Dezembro R$', example: '1000'},
  DECEMBER_KWH: { label: 'Dezembro kwh', example: '1000'},
}

httpRouter.privateRoutes['/check-client-invoices-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const units = await parseFileRows(file);

  const list = [];
  for (let i = 0; i < units.length; i++) {
    const row = units[i];
    list.push(await parseInputRow(clientId, row, `${i}/${Date.now()}`))
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-invoices-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.invoices) throw Error('Missing parameter: invoices').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const dateNow = new Date();
  const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
  const date = `${dateNow .getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)} ${zeroPad(dateNow.getUTCHours(), 2)}:${zeroPad(dateNow.getUTCMinutes(), 2)}:${zeroPad(dateNow.getUTCSeconds(), 2)}`

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.invoices) {
    try {
      const checked = await parseInputRow(reqParams.CLIENT_ID, row, row.key);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const existingDistributor = await sqldb.DISTRIBUTORS.getExtraInfo({DISTRIBUTOR_TAG: checked.DISTRIBUTOR_NAME})
      const accessDistributor = await sqldb.ACCESS_DISTRIBUTORS.getExtraInfo({ UNIT_ID: checked.UNIT_ID});
      const encrypted = CryptoJS.TripleDES.encrypt(checked.PASSWORD, servConfig.secretPassphraseTripleDES);
      if (accessDistributor) {
        await sqldb.ACCESS_DISTRIBUTORS.w_updateInfo({
          UNIT_ID: checked.UNIT_ID,
          DISTRIBUTOR_ID: existingDistributor.DISTRIBUTOR_ID,
          ADDITIONAL_DISTRIBUTOR_INFO: checked.ADDITIONAL_DISTRIBUTOR_INFO,
          CONSUMER_UNIT: checked.CONSUMER_UNIT,
          LOGIN: checked.LOGIN,
          PASSWORD: encrypted.toString(),
          LOGIN_EXTRA: checked.LOGIN_EXTRA,
          STATUS: "Não enviado",
          STATUS_UPDATED_DATE: date,
        }, session.user)
      }

      else {
        const { insertId } = await sqldb.ACCESS_DISTRIBUTORS.w_insert({
          UNIT_ID: checked.UNIT_ID,
          DISTRIBUTOR_ID: existingDistributor.DISTRIBUTOR_ID,
          ADDITIONAL_DISTRIBUTOR_INFO: checked.ADDITIONAL_DISTRIBUTOR_INFO,
          CONSUMER_UNIT: checked.CONSUMER_UNIT,
          LOGIN: checked.LOGIN,
          PASSWORD: encrypted.toString(),
          LOGIN_EXTRA: checked.LOGIN_EXTRA,
          STATUS: "Não enviado",
          STATUS_UPDATED_DATE: date,
          ENCRYPTED_PASSWORD: true,
        }, session.user);
      }

      if (checked.BASELINE_TEMPLATE) {
        const templates = await sqldb.BASELINE_TEMPLATES.getAllBaselineTemplates();
        const templateSelected = templates.find(template => template.BASELINE_TEMPLATE_DESCRIPTION === checked.BASELINE_TEMPLATE);

        const baseline = await sqldb.BASELINES.getExtraInfo({UNIT_ID: checked.UNIT_ID});

        let baselineId = 0;

        if (baseline) {
          await sqldb.BASELINES.w_updateInfo({
            BASELINE_ID: baseline.BASELINE_ID,
            UNIT_ID: checked.UNIT_ID,
            BASELINE_TEMPLATE_ID: templateSelected.BASELINE_TEMPLATE_ID
          }, session.user);
          baselineId = baseline.BASELINE_ID;
        }
        else {
          const { insertId } = await sqldb.BASELINES.w_insert({
            UNIT_ID: checked.UNIT_ID,
            BASELINE_TEMPLATE_ID: templateSelected.BASELINE_TEMPLATE_ID
          }, session.user);
          baselineId = insertId;
        }

        if (templateSelected.BASELINE_TEMPLATE_TAG === 'manual') {
          const valuesBaselineValues = [] as {
            BASELINE_MONTH: number,
            BASELINE_KWH: number,
            BASELINE_PRICE: number,
          }[];

          valuesBaselineValues.push({ BASELINE_MONTH: 1, BASELINE_KWH: checked.JANUARY_KWH, BASELINE_PRICE: checked.JANUARY_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 2, BASELINE_KWH: checked.FEBRUARY_KWH, BASELINE_PRICE: checked.FEBRUARY_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 3, BASELINE_KWH: checked.MARCH_KWH, BASELINE_PRICE: checked.MARCH_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 4, BASELINE_KWH: checked.APRIL_KWH, BASELINE_PRICE: checked.APRIL_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 5, BASELINE_KWH: checked.MAY_KWH, BASELINE_PRICE: checked.MAY_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 6, BASELINE_KWH: checked.JUNE_KWH, BASELINE_PRICE: checked.JUNE_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 7, BASELINE_KWH: checked.JULLY_KWH, BASELINE_PRICE: checked.JULLY_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 8, BASELINE_KWH: checked.AUGUST_KWH, BASELINE_PRICE: checked.AUGUST_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 9, BASELINE_KWH: checked.SEPTEMBER_KWH, BASELINE_PRICE: checked.SEPTEMBER_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 10, BASELINE_KWH: checked.OCTOBER_KWH, BASELINE_PRICE: checked.OCTOBER_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 11, BASELINE_KWH: checked.NOVEMBER_KWH, BASELINE_PRICE: checked.NOVEMBER_PRICE });
          valuesBaselineValues.push({ BASELINE_MONTH: 12, BASELINE_KWH: checked.DECEMBER_KWH, BASELINE_PRICE: checked.DECEMBER_PRICE });

          await httpRouter.privateRoutes['/clients/set-baseline-values']({
            CLIENT_ID: reqParams.CLIENT_ID,
            UNIT_ID: checked.UNIT_ID,
            BASELINE_ID: baselineId,
            baselineValues: valuesBaselineValues
          }, session);
        }
      }

      added.push({ key: row.key, sendToFourDocs: false});
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }

  let addedEnergyCredentials = false;
  addedEnergyCredentials = await addEnergyCredentials(session);

  for (const row of reqParams.invoices) {
    if (addedEnergyCredentials){
      try {
        const updatedInfo = (await sqldb.ACCESS_DISTRIBUTORS.getExtraInfo({ UNIT_ID: row.UNIT_ID})).STATUS;

        let sendToFourdDocs:boolean = (updatedInfo === 'Enviado' || updatedInfo === 'Recebido faturas' );

        const add = added.find((item) => item.key === row.key);
        add.sendToFourDocs = sendToFourdDocs;

      } catch (err){
        logger.error("Houve um problema ao recuparar a unidade")
      }
    }
  }

  return { added, ignored };
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-invoices-batch']>[0]['invoices'][0];
async function parseInputRow (clientId: number, inRow: TableRow, key: string) {
  const checked: TableRow = {
    key,
    UNIT_ID: null,
    CONSUMER_UNIT: null,
    DISTRIBUTOR_NAME: null,
    ADDITIONAL_DISTRIBUTOR_INFO: null,
    LOGIN: null,
    PASSWORD: null,
    LOGIN_EXTRA: null,
    BASELINE_TEMPLATE: null,
    JANUARY_PRICE: null,
    JANUARY_KWH: null,
    FEBRUARY_PRICE: null,
    FEBRUARY_KWH: null,
    MARCH_PRICE: null,
    MARCH_KWH: null,
    APRIL_PRICE: null,
    APRIL_KWH: null,
    MAY_PRICE: null,
    MAY_KWH: null,
    JUNE_PRICE: null,
    JUNE_KWH: null,
    JULLY_PRICE: null,
    JULLY_KWH: null,
    AUGUST_PRICE: null,
    AUGUST_KWH: null,
    SEPTEMBER_PRICE: null,
    SEPTEMBER_KWH: null,
    OCTOBER_PRICE: null,
    OCTOBER_KWH: null,
    NOVEMBER_PRICE: null,
    NOVEMBER_KWH: null,
    DECEMBER_PRICE: null,
    DECEMBER_KWH: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.UNIT_ID = inRow.UNIT_ID || null;
    if (!checked.UNIT_ID) errors.push({ message: 'É necessário informar o código da unidade' });

    const existingItem = await sqldb.CLUNITS.getUnitInfo({ CLIENT_ID: clientId, UNIT_ID: inRow.UNIT_ID});
    if (!existingItem) errors.push({ message: 'É necessário informar o código de uma unidade pertencente ao cliente' });

    checked.CONSUMER_UNIT = inRow.CONSUMER_UNIT || null;
    checked.DISTRIBUTOR_NAME = inRow.DISTRIBUTOR_NAME || null;
    checked.ADDITIONAL_DISTRIBUTOR_INFO = inRow.ADDITIONAL_DISTRIBUTOR_INFO || null;
    checked.LOGIN = inRow.LOGIN || null;
    checked.PASSWORD = inRow.PASSWORD || null;
    checked.LOGIN_EXTRA = inRow.LOGIN_EXTRA || null;
    checked.LOGIN_EXTRA = inRow.LOGIN_EXTRA || null;
    checked.BASELINE_TEMPLATE = inRow.BASELINE_TEMPLATE || null;
    checked.JANUARY_PRICE = inRow.JANUARY_PRICE || null;
    checked.JANUARY_KWH = inRow.JANUARY_KWH || null;
    checked.FEBRUARY_PRICE = inRow.FEBRUARY_PRICE || null;
    checked.FEBRUARY_KWH = inRow.FEBRUARY_KWH || null;
    checked.MARCH_PRICE = inRow.MARCH_PRICE || null;
    checked.MARCH_KWH = inRow.MARCH_KWH || null;
    checked.APRIL_PRICE = inRow.APRIL_PRICE || null;
    checked.APRIL_KWH = inRow.APRIL_KWH || null;
    checked.MAY_PRICE = inRow.MAY_PRICE || null;
    checked.MAY_KWH  = inRow.MAY_KWH  || null;
    checked.JUNE_PRICE = inRow.JUNE_PRICE || null;
    checked.JUNE_KWH = inRow.JUNE_KWH || null;
    checked.JULLY_PRICE = inRow.JULLY_PRICE || null;
    checked.JULLY_KWH = inRow.JULLY_KWH || null;
    checked.AUGUST_PRICE = inRow.AUGUST_PRICE || null;
    checked.AUGUST_KWH = inRow.AUGUST_KWH || null;
    checked.SEPTEMBER_PRICE = inRow.SEPTEMBER_PRICE || null;
    checked.SEPTEMBER_KWH = inRow.SEPTEMBER_KWH || null;
    checked.OCTOBER_PRICE = inRow.OCTOBER_PRICE || null;
    checked.OCTOBER_KWH = inRow.OCTOBER_KWH || null;
    checked.NOVEMBER_PRICE = inRow.NOVEMBER_PRICE || null;
    checked.NOVEMBER_KWH = inRow.NOVEMBER_KWH || null;
    checked.DECEMBER_PRICE = inRow.DECEMBER_PRICE || null;
    checked.DECEMBER_KWH = inRow.DECEMBER_KWH || null;

    if (!checked.DISTRIBUTOR_NAME) errors.push({ message: `Faltou o nome da distribuidora` });

    const existingDistributor = await sqldb.DISTRIBUTORS.getExtraInfo({DISTRIBUTOR_TAG: inRow.DISTRIBUTOR_NAME})
    checked.DISTRIBUTOR_NAME = existingDistributor ? existingDistributor.DISTRIBUTOR_TAG : null;

    if (!checked.DISTRIBUTOR_NAME) errors.push({ message: `Distribuidora não encontrada` });

    if (!checked.LOGIN) errors.push({ message: `Faltou o login de acesso à distribuidora` });
    if (!checked.PASSWORD) errors.push({ message: `Faltou a senha de acesso à distribuidora` });

    if (checked.BASELINE_TEMPLATE) {
      const templates = await sqldb.BASELINE_TEMPLATES.getAllBaselineTemplates();
      const template = templates.find(item => item.BASELINE_TEMPLATE_DESCRIPTION === checked.BASELINE_TEMPLATE);

      if (!template) {
        errors.push({ message: `Template não encontrado!` });
      }
      else if (checked.BASELINE_TEMPLATE === 'Manual' && (!checked.JANUARY_KWH || !checked.FEBRUARY_KWH || !checked.MARCH_KWH || !checked.APRIL_KWH ||
          !checked.MAY_KWH || !checked.JUNE_KWH || !checked.JULLY_KWH || !checked.AUGUST_KWH ||
          !checked.SEPTEMBER_KWH || !checked.OCTOBER_KWH || !checked.NOVEMBER_KWH || !checked.DECEMBER_KWH)) {
            errors.push({ message: `Para template de baseline Manual é necessário informar todos baseline de KWH` });
          }
    }

    const loginData = await apiFourDocs['GET /bot/login_data']();

    if (existingDistributor) {
      const accessPoints = (loginData.providers.find((provider) => provider.name === existingDistributor.DISTRIBUTOR_TAG)).access_points;
      if (accessPoints.length === 0 && checked.ADDITIONAL_DISTRIBUTOR_INFO) errors.push({ message: `Essa distribuidora não necessita de informação adicional` });
      if ( accessPoints.length > 0 && !(accessPoints.includes(checked.ADDITIONAL_DISTRIBUTOR_INFO))) errors.push({ message: `Informação adicional da distribuidora inválida` });
    }

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
  const col_UNIT_ID = headers.indexOf(inputColumns.UNIT_ID.label);
  const col_CONSUMER_UNIT = headers.indexOf(inputColumns.CONSUMER_UNIT.label);
  const col_DISTRIBUTOR_NAME = headers.indexOf(inputColumns.DISTRIBUTOR_NAME.label);
  const col_ADDITIONAL_DISTRIBUTOR_INFO = headers.indexOf(inputColumns.ADDITIONAL_DISTRIBUTOR_INFO.label);
  const col_LOGIN = headers.indexOf(inputColumns.LOGIN.label);
  const col_PASSWORD = headers.indexOf(inputColumns.PASSWORD.label);
  const col_LOGIN_EXTRA = headers.indexOf(inputColumns.LOGIN_EXTRA.label);
  const col_BASELINE_TEMPLATE = headers.indexOf(inputColumns.BASELINE_TEMPLATE.label);
  const col_JANUARY_PRICE = headers.indexOf(inputColumns.JANUARY_PRICE.label);
  const col_JANUARY_KWH = headers.indexOf(inputColumns.JANUARY_KWH.label);
  const col_FEBRUARY_PRICE = headers.indexOf(inputColumns.FEBRUARY_PRICE.label);
  const col_FEBRUARY_KWH = headers.indexOf(inputColumns.FEBRUARY_KWH.label);
  const col_MARCH_PRICE = headers.indexOf(inputColumns.MARCH_PRICE.label);
  const col_MARCH_KWH = headers.indexOf(inputColumns.MARCH_KWH.label);
  const col_APRIL_PRICE = headers.indexOf(inputColumns.APRIL_PRICE.label);
  const col_APRIL_KWH = headers.indexOf(inputColumns.APRIL_KWH.label);
  const col_MAY_PRICE = headers.indexOf(inputColumns.MAY_PRICE.label);
  const col_MAY_KWH  = headers.indexOf(inputColumns.MAY_KWH .label);
  const col_JUNE_PRICE = headers.indexOf(inputColumns.JUNE_PRICE.label);
  const col_JUNE_KWH = headers.indexOf(inputColumns.JUNE_KWH.label);
  const col_JULLY_PRICE = headers.indexOf(inputColumns.JULLY_PRICE.label);
  const col_JULLY_KWH = headers.indexOf(inputColumns.JULLY_KWH.label);
  const col_AUGUST_PRICE = headers.indexOf(inputColumns.AUGUST_PRICE.label);
  const col_AUGUST_KWH = headers.indexOf(inputColumns.AUGUST_KWH.label);
  const col_SEPTEMBER_PRICE = headers.indexOf(inputColumns.SEPTEMBER_PRICE.label);
  const col_SEPTEMBER_KWH = headers.indexOf(inputColumns.SEPTEMBER_KWH.label);
  const col_OCTOBER_PRICE = headers.indexOf(inputColumns.OCTOBER_PRICE.label);
  const col_OCTOBER_KWH = headers.indexOf(inputColumns.OCTOBER_KWH.label);
  const col_NOVEMBER_PRICE = headers.indexOf(inputColumns.NOVEMBER_PRICE.label);
  const col_NOVEMBER_KWH = headers.indexOf(inputColumns.NOVEMBER_KWH.label);
  const col_DECEMBER_PRICE = headers.indexOf(inputColumns.DECEMBER_PRICE.label);
  const col_DECEMBER_KWH = headers.indexOf(inputColumns.DECEMBER_KWH.label);

  if (col_UNIT_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_ID.label}`).HttpStatus(400);
  if (col_CONSUMER_UNIT < 0) throw Error(`Coluna não encontrada: ${inputColumns.CONSUMER_UNIT.label}`).HttpStatus(400);
  if (col_LOGIN < 0) throw Error(`Coluna não encontrada: ${inputColumns.LOGIN.label}`).HttpStatus(400);
  if (col_DISTRIBUTOR_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.DISTRIBUTOR_NAME.label}`).HttpStatus(400);
  if (col_PASSWORD < 0) throw Error(`Coluna não encontrada: ${inputColumns.PASSWORD.label}`).HttpStatus(400);
  if (col_LOGIN_EXTRA < 0) throw Error(`Coluna não encontrada: ${inputColumns.LOGIN_EXTRA.label}`).HttpStatus(400);

  const knownColumns = [
    col_UNIT_ID,
    col_CONSUMER_UNIT,
    col_LOGIN,
    col_DISTRIBUTOR_NAME,
    col_ADDITIONAL_DISTRIBUTOR_INFO,
    col_PASSWORD,
    col_LOGIN_EXTRA,
    col_BASELINE_TEMPLATE,
    col_JANUARY_PRICE,
    col_JANUARY_KWH,
    col_FEBRUARY_PRICE,
    col_FEBRUARY_KWH,
    col_MARCH_PRICE,
    col_MARCH_KWH,
    col_APRIL_PRICE,
    col_APRIL_KWH,
    col_MAY_PRICE,
    col_MAY_KWH ,
    col_JUNE_PRICE,
    col_JUNE_KWH,
    col_JULLY_PRICE,
    col_JULLY_KWH,
    col_AUGUST_PRICE,
    col_AUGUST_KWH,
    col_SEPTEMBER_PRICE,
    col_SEPTEMBER_KWH,
    col_OCTOBER_PRICE,
    col_OCTOBER_KWH,
    col_NOVEMBER_PRICE,
    col_NOVEMBER_KWH,
    col_DECEMBER_PRICE,
    col_DECEMBER_KWH,
  ];
  const extraColumns: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if ((!knownColumns.includes(i)) && headers[i]) { extraColumns.push(i) }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    tableRows.push({
      key: `${i}/${Date.now()}`,
      UNIT_ID: Number(cols[col_UNIT_ID]),
      CONSUMER_UNIT: cols[col_CONSUMER_UNIT],
      DISTRIBUTOR_NAME: cols[col_DISTRIBUTOR_NAME],
      ADDITIONAL_DISTRIBUTOR_INFO: cols[col_ADDITIONAL_DISTRIBUTOR_INFO],
      LOGIN: cols[col_LOGIN],
      PASSWORD: cols[col_PASSWORD],
      LOGIN_EXTRA: cols[col_LOGIN_EXTRA],
      BASELINE_TEMPLATE: cols[col_BASELINE_TEMPLATE],
      JANUARY_PRICE: Number(cols[col_JANUARY_PRICE]),
      JANUARY_KWH: Number(cols[col_JANUARY_KWH]),
      FEBRUARY_PRICE: Number(cols[col_FEBRUARY_PRICE]),
      FEBRUARY_KWH: Number(cols[col_FEBRUARY_KWH]),
      MARCH_PRICE: Number(cols[col_MARCH_PRICE]),
      MARCH_KWH: Number(cols[col_MARCH_KWH]),
      APRIL_PRICE: Number(cols[col_APRIL_PRICE]),
      APRIL_KWH: Number(cols[col_APRIL_KWH]),
      MAY_PRICE: Number(cols[col_MAY_PRICE]),
      MAY_KWH : Number(cols[col_MAY_KWH ]),
      JUNE_PRICE: Number(cols[col_JUNE_PRICE]),
      JUNE_KWH: Number(cols[col_JUNE_KWH]),
      JULLY_PRICE: Number(cols[col_JULLY_PRICE]),
      JULLY_KWH: Number(cols[col_JULLY_KWH]),
      AUGUST_PRICE: Number(cols[col_AUGUST_PRICE]),
      AUGUST_KWH: Number(cols[col_AUGUST_KWH]),
      SEPTEMBER_PRICE: Number(cols[col_SEPTEMBER_PRICE]),
      SEPTEMBER_KWH: Number(cols[col_SEPTEMBER_KWH]),
      OCTOBER_PRICE: Number(cols[col_OCTOBER_PRICE]),
      OCTOBER_KWH: Number(cols[col_OCTOBER_KWH]),
      NOVEMBER_PRICE: Number(cols[col_NOVEMBER_PRICE]),
      NOVEMBER_KWH: Number(cols[col_NOVEMBER_KWH]),
      DECEMBER_PRICE: Number(cols[col_DECEMBER_PRICE]),
      DECEMBER_KWH: Number(cols[col_DECEMBER_KWH])
    });
  }

  return tableRows;
}

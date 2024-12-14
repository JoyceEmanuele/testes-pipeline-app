import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import { checkNumber } from './dacs'
import sqldb from '../../srcCommon/db'
import { getUploadedFile } from '../apiServer/getMultiparFiles'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'

export const inputColumns = {
  RTYPE_NAME: { label: 'Nome', example: 'Escritório' },
  TUSEMIN: { label: 'T min °C', example: '21' },
  TUSEMAX: { label: 'T max °C', example: '25' },
  mon: { label: 'seg', example: '08:00 - 18:30' },
  tue: { label: 'ter', example: '8:00-18:30' },
  wed: { label: 'qua', example: '8:00 a 18:30' },
  thu: { label: 'qui', example: '08:00 – 18:30' },
  fri: { label: 'sex', example: '08:00-18:30' },
  sat: { label: 'sab', example: '7:10 às 11:30' },
  sun: { label: 'dom', example: '' },
}

httpRouter.privateRoutes['/check-client-roomtypes-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) {
    // OK
  }
  else if (session.permissions.MANAGE_UNOWNED_DEVS) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const rtypes = await parseFileRows(file);

  const _existingItems = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [clientId] });
  const existingItems = _existingItems.map(x => getNormalized(x.UNIT_NAME));
  const list = [];
  for (let i = 0; i < rtypes.length; i++) {
    const row = rtypes[i];
    list.push(await parseInputRow(row, `${i}/${Date.now()}`, existingItems))
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-roomtypes-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.rtypes) throw Error('Missing parameter: rtypes').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const _existingItems = await sqldb.ROOMTYPES.getRoomTypesList({ CLIENT_ID: reqParams.CLIENT_ID });
  const existingItems = _existingItems.map(x => getNormalized(x.RTYPE_NAME));

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.rtypes) {
    try {
      const checked = parseInputRow(row, row.key, existingItems);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      // Verificar se já existe registro com esse nome
      const normName = getNormalized(checked.RTYPE_NAME);
      if (existingItems.includes(normName)) {
        ignored.push({ key: checked.key, reason: 'Já existe um tipo de ambiente com o mesmo nome' });
        continue;
      }

      existingItems.push(normName);
      const addedItem = await httpRouter.privateRoutes['/clients/add-new-roomtype']({
        RTYPE_NAME: checked.RTYPE_NAME,
        CLIENT_ID: reqParams.CLIENT_ID,
        TUSEMIN: checked.TUSEMIN ? Number(checked.TUSEMIN) : null,
        TUSEMAX: checked.TUSEMAX ? Number(checked.TUSEMAX) : null,
        workPeriods: {
          // "00:00-23:59;allow"
          mon: checked.mon ? `${checked.mon};allow` : null,
          tue: checked.tue ? `${checked.tue};allow` : null,
          wed: checked.wed ? `${checked.wed};allow` : null,
          thu: checked.thu ? `${checked.thu};allow` : null,
          fri: checked.fri ? `${checked.fri};allow` : null,
          sat: checked.sat ? `${checked.sat};allow` : null,
          sun: checked.sun ? `${checked.sun};allow` : null,
        },
      }, session);
      added.push({ key: row.key });
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }

  return { added, ignored };
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-roomtypes-batch']>[0]['rtypes'][0];
function parseInputRow (inRow: TableRow, key: string, existingItems: string[]) {
  const checked: TableRow = {
    key,
    RTYPE_NAME: null,
    TUSEMIN: null,
    TUSEMAX: null,
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.RTYPE_NAME = inRow.RTYPE_NAME || null;
    if (!checked.RTYPE_NAME) errors.push({ message: 'É necessário informar o nome da tipo de ambiente' })

    // Verificar se já existe registro com esse nome
    const normName = getNormalized(checked.RTYPE_NAME);
    if (existingItems.includes(normName)) {
      errors.push({ message: 'Já existe um tipo de ambiente com o mesmo nome' });
    }

    if (inRow.TUSEMIN) {
      const nInfo = checkNumber(inRow.TUSEMIN);
      if (!nInfo) {
        errors.push({ message: 'Temperatura mínima inválida' });
      } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
        checked.TUSEMIN = nInfo.numI.replace(',', '.');
      } else {
        errors.push({ message: 'Temperatura mínima inválida' });
      }
    }
    if (inRow.TUSEMAX) {
      const nInfo = checkNumber(inRow.TUSEMAX);
      if (!nInfo) {
        errors.push({ message: 'Temperatura máxima inválida' });
      } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
        checked.TUSEMAX = nInfo.numI.replace(',', '.');
      } else {
        errors.push({ message: 'Temperatura máxima inválida' });
      }
    }

    if (inRow.mon) {
      checked.mon = normTimeSpan(inRow.mon) || null;
      if (!checked.mon) errors.push({ message: 'Horário inválido (segunda)' });
    }
    if (inRow.tue) {
      checked.tue = normTimeSpan(inRow.tue) || null;
      if (!checked.tue) errors.push({ message: 'Horário inválido (terça)' });
    }
    if (inRow.wed) {
      checked.wed = normTimeSpan(inRow.wed) || null;
      if (!checked.wed) errors.push({ message: 'Horário inválido (quarta)' });
    }
    if (inRow.thu) {
      checked.thu = normTimeSpan(inRow.thu) || null;
      if (!checked.thu) errors.push({ message: 'Horário inválido (quinta)' });
    }
    if (inRow.fri) {
      checked.fri = normTimeSpan(inRow.fri) || null;
      if (!checked.fri) errors.push({ message: 'Horário inválido (sexta)' });
    }
    if (inRow.sat) {
      checked.sat = normTimeSpan(inRow.sat) || null;
      if (!checked.sat) errors.push({ message: 'Horário inválido (sábado)' });
    }
    if (inRow.sun) {
      checked.sun = normTimeSpan(inRow.sun) || null;
      if (!checked.sun) errors.push({ message: 'Horário inválido (domingo)' });
    }
  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { key, ...checked, errors }
}

function parseTimeSpan (userInput: string): { startHM: string, endHM: string } {
  const matched = (userInput || '').trim().match(/^(\d\d?):(\d\d)[^\d]+(\d\d?):(\d\d)$/);
  if (!matched) return null;
  let [, startH, startM, endH, endM] = matched;
  const n_startH = Number(startH);
  const n_startM = Number(startM);
  const n_endH = Number(endH);
  const n_endM = Number(endM);
  if (!isFinite(n_startH)) return null;
  if (!isFinite(n_startM)) return null;
  if (!isFinite(n_endH)) return null;
  if (!isFinite(n_endM)) return null;
  if (n_startH > 23) return null;
  if (n_startM > 59) return null;
  if (n_endH > 23) return null;
  if (n_endM > 59) return null;
  const startHM = `${startH.padStart(2,'0')}:${startM}`;
  const endHM = `${endH.padStart(2,'0')}:${endM}`;
  return { startHM, endHM };
}
function normTimeSpan (userInput: string) {
  const tData = parseTimeSpan(userInput);
  if (!tData) return null;
  return `${tData.startHM}-${tData.endHM}`;
}

async function parseFileRows (file: Buffer) {
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines.map(row => row.map(col => (col || '').toString()));

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_RTYPE_NAME = headers.indexOf(inputColumns.RTYPE_NAME.label);
  const col_TUSEMIN = headers.indexOf(inputColumns.TUSEMIN.label);
  const col_TUSEMAX = headers.indexOf(inputColumns.TUSEMAX.label);
  const col_mon = headers.indexOf(inputColumns.mon.label);
  const col_tue = headers.indexOf(inputColumns.tue.label);
  const col_wed = headers.indexOf(inputColumns.wed.label);
  const col_thu = headers.indexOf(inputColumns.thu.label);
  const col_fri = headers.indexOf(inputColumns.fri.label);
  const col_sat = headers.indexOf(inputColumns.sat.label);
  const col_sun = headers.indexOf(inputColumns.sun.label);
  if (col_RTYPE_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.RTYPE_NAME.label}`).HttpStatus(400);
  if (col_TUSEMIN < 0) throw Error(`Coluna não encontrada: ${inputColumns.TUSEMIN.label}`).HttpStatus(400);
  if (col_TUSEMAX < 0) throw Error(`Coluna não encontrada: ${inputColumns.TUSEMAX.label}`).HttpStatus(400);
  if (col_mon < 0) throw Error(`Coluna não encontrada: ${inputColumns.mon.label}`).HttpStatus(400);
  if (col_tue < 0) throw Error(`Coluna não encontrada: ${inputColumns.tue.label}`).HttpStatus(400);
  if (col_wed < 0) throw Error(`Coluna não encontrada: ${inputColumns.wed.label}`).HttpStatus(400);
  if (col_thu < 0) throw Error(`Coluna não encontrada: ${inputColumns.thu.label}`).HttpStatus(400);
  if (col_fri < 0) throw Error(`Coluna não encontrada: ${inputColumns.fri.label}`).HttpStatus(400);
  if (col_sat < 0) throw Error(`Coluna não encontrada: ${inputColumns.sat.label}`).HttpStatus(400);
  if (col_sun < 0) throw Error(`Coluna não encontrada: ${inputColumns.sun.label}`).HttpStatus(400);

  for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].map(x => x.trim());
      tableRows.push({
        key: `${i}/${Date.now()}`,
        RTYPE_NAME: cols[col_RTYPE_NAME],
        TUSEMIN: cols[col_TUSEMIN],
        TUSEMAX: cols[col_TUSEMAX],
        mon: cols[col_mon],
        tue: cols[col_tue],
        wed: cols[col_wed],
        thu: cols[col_thu],
        fri: cols[col_fri],
        sat: cols[col_sat],
        sun: cols[col_sun],
    });
  }

  return tableRows;
}

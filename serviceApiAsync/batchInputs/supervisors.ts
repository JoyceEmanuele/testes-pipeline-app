import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization';
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient } from '../../srcCommon/helpers/permissionControl'

export const inputColumns = {
  USER_ID: { label: 'Email do Usuário', example: 'usuario@email.com' },
  UNIT_NAME: { label: 'Nome Unidade', example: 'Filial Laranjeiras' },
}

httpRouter.privateRoutes['/check-client-supervisors-batch'] = async function (_reqParams, session, { req, res }) {
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

  const supervisors = parseFileRows(file);

  const { list: usersList } = await httpRouter.privateRoutes['/users/list-users']({
    CLIENT_ID: clientId,
    includeAdmins: false,
  }, session);

  const opts = await availableOptions(session, clientId);
  const list = [];
  for (let i = 0; i < supervisors.length; i++) {
    const row = supervisors[i];
    row.USER_ID = row.USER_ID.toLowerCase();
    list.push(await parseInputRow(row, `${i}/${Date.now()}`, opts, clientId, usersList));
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-supervisors-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.supervisors) throw Error('Missing parameter: supervisors').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const opts = await availableOptions(session, reqParams.CLIENT_ID);
  const { list: usersList } = await httpRouter.privateRoutes['/users/list-users']({
    CLIENT_ID: reqParams.CLIENT_ID,
    includeAdmins: false,
  }, session);

  const added = [] as { key: string }[];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.supervisors) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID, usersList);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const addedItem = await httpRouter.privateRoutes['/clients/set-unit-supervisors']({
        USER_ID: checked.USER_ID,
        UNIT_ID: checked.UNIT_ID,
        isBatch: true,
      }, session);
      added.push({ key: row.key })
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }

  return { added, ignored };
}


interface AvailableOptions {
  units:   { value: number, label: string, norms: string[] }[]
  groups:   { value: number, label: string, norms: string[], unit: number }[]
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-supervisors-batch']>[0]['supervisors'][0];
async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number, usersList: { USER: string }[]) {
  const checked: TableRow = {
    key,
    USER_ID: null,
    UNIT_NAME: null,
  }
  const errors = [] as { message: string }[];
  let unitId: number = null;

  try {
    checked.USER_ID = null;
    if (!inRow.USER_ID) errors.push({ message: 'É necessário informar o ID do Usuário (email)' });

    // const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAM_ID });
    // if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId && !(currentDevInfo.PERMS_C || '').includes(PROFILECODES.EMPRESA.Fabricante)) {
    //   errors.push({ message: `Dispositivo já associado a outro cliente` });
    // }

    if (inRow.USER_ID) {
      const found = usersList.find((user) => user.USER === inRow.USER_ID);
      if (!found) {
        errors.push({ message: 'Usuário inválido' });
      } else {
        checked.USER_ID = inRow.USER_ID;
      }
    }

    if (inRow.UNIT_NAME) {
      const asNorm = getNormalized(inRow.UNIT_NAME)
      const found = opts.units.filter(x1 => x1.norms.some(x2 => x2.includes(asNorm)));
      if (found.length !== 1) {
        errors.push({ message: 'Unidade inválida' });
      } else {
        checked.UNIT_NAME = inRow.UNIT_NAME;
        unitId = found[0].value;
      }
    }
  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { key, ...checked, UNIT_ID: unitId, errors }
}


async function availableOptions (session: SessionData, clientId: number): Promise<AvailableOptions> {
  const opts = await httpRouter.privateRoutes['/dev/dev-info-combo-options']({
    CLIENT_ID: clientId,
    units: true,
    groups: true,
  }, session);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    groups: opts.groups.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
  }
}

function parseFileRows (file: Buffer) {
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines.map(row => row.map(col => (col || '').toString()));

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_USER_ID = headers.indexOf(inputColumns.USER_ID.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  if (col_USER_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.USER_ID.label}`).HttpStatus(400);
  if (col_UNIT_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_NAME.label}`).HttpStatus(400);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    tableRows.push({
      key: `${i}/${Date.now()}`,
      USER_ID: cols[col_USER_ID],
      UNIT_NAME: cols[col_UNIT_NAME],
    });
  }

  return tableRows;
}
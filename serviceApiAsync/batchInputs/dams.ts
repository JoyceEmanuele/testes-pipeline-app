import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, PROFILECODES } from '../../srcCommon/helpers/permissionControl'
import axios from 'axios'
import { uploadDamImage } from '../devsPictures'

export const inputColumns = {
  DAM_ID: { label: 'ID DAM', exampleList: ['DAM311110000', 'DAM311110000'] },
  UNIT_NAME: { label: 'Unidade', exampleList: ['Filial Laranjeiras', 'Filial Laranjeiras' ] },
  AUT_GROUP: { label: 'Automatiza a máquina', exampleList: ['Split Recepção', 'Split Recepção'] },
  EXT_THERM_CFG: { label: 'Localização de Termostato/Controlador (DAM3)', exampleList: ['', 'Em paralelo'] },
  PHOTO_1: { label: 'Foto 1', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_2: { label: 'Foto 2', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_3: { label: 'Foto 3', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_4: { label: 'Foto 4', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_5: { label: 'Foto 5', exampleList: ['https://s3.amazonaws.com/...'] },
}

httpRouter.privateRoutes['/check-client-dams-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageDevs) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const dams = await parseFileRows(file);

  const opts = await availableOptions(session, clientId);
  const list = [];
  for (let i = 0; i < dams.length; i++) {
    const row = dams[i];
    list.push(await parseInputRow(row, `${i}/${Date.now()}`, opts, clientId));
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-dams-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.dams) throw Error('Missing parameter: dams').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageDevs) { } // OK
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const clientUnits = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const opts = await availableOptions(session, reqParams.CLIENT_ID);

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.dams) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAM_ID });
      if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== reqParams.CLIENT_ID) {
        if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
          // OK, dispositivo está associado a um fabricante
        } else {
          ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outro cliente' });
          continue;
        }
      }

      let UNIT_IDs = null;
      if (row.UNIT_NAME) {
        const normUnitName = getNormalized(row.UNIT_NAME);
        UNIT_IDs = clientUnits.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
        if (UNIT_IDs.length !== 1) {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
          continue;
        } else {
          const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.DAM_ID })
          if (currentDevInfo && currentDevInfo.UNIT_ID && UNIT_IDs[0].UNIT_ID !== currentDevInfo.UNIT_ID) {
            ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outra unidade deste cliente' });
            continue;
          }
        }
      }

      let machines = undefined;
      if (row.AUT_GROUP) {
        if (UNIT_IDs.length !== 1) {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
          continue;
        }
        const unitId = UNIT_IDs[0].UNIT_ID;
        const normGroupName = getNormalized(row.AUT_GROUP);
        machines = clientMachines.filter((row) => (row.UNIT_ID === unitId) && (getNormalized(row.MACHINE_NAME || row.ILLUMINATION_NAME) === normGroupName));
        if (machines.length !== 1) {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
          continue;
        }
      }

      if (row.PHOTO_1 != null && row.DAM_ID) {
        checked.PHOTO_1 = row.PHOTO_1 || null;
        const image = await axios.get(checked.PHOTO_1, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDamImage(image, row.DAM_ID, session, reqParams)
      }

      if (row.PHOTO_2 != null && row.DAM_ID) {
        checked.PHOTO_2 = row.PHOTO_2 || null;
        const image = await axios.get(checked.PHOTO_2, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDamImage(image, row.DAM_ID, session, reqParams)
      }

      if (row.PHOTO_3 != null && row.DAM_ID) {
        checked.PHOTO_3 = row.PHOTO_3 || null;
        const image = await axios.get(checked.PHOTO_3, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDamImage(image, row.DAM_ID, session, reqParams)
      }

      if (row.PHOTO_4 != null && row.DAM_ID) {
        checked.PHOTO_4 = row.PHOTO_4 || null;
        const image = await axios.get(checked.PHOTO_4, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDamImage(image, row.DAM_ID, session, reqParams)
      }

      if (row.PHOTO_5 != null && row.DAM_ID) {
        checked.PHOTO_5 = row.PHOTO_5 || null;
        const image = await axios.get(checked.PHOTO_5, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDamImage(image, row.DAM_ID, session, reqParams)
      }

      const addedItem = await httpRouter.privateRoutes['/dam/set-dam-info']({
        CLIENT_ID: reqParams.CLIENT_ID,
        DAM_ID: checked.DAM_ID,
        UNIT_ID: UNIT_IDs && UNIT_IDs[0].UNIT_ID,
        groups: machines && ([machines[0].MACHINE_ID.toString()] || [machines[0].ILLUMINATION_ID.toString()]),
        EXT_THERM_CFG: checked.EXT_THERM_CFG || undefined,
      }, session);
      added.push({ key: row.key });
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

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-dams-batch']>[0]['dams'][0];
async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number) {
  const checked: TableRow = {
    key,
    DAM_ID: null,
    UNIT_NAME: null,
    AUT_GROUP: null,
    EXT_THERM_CFG: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.DAM_ID = inRow.DAM_ID || null;
    if (!checked.DAM_ID) errors.push({ message: 'É necessário informar o ID do DAM' });

    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAM_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `Dispositivo já associado a outro cliente` });
      }
    }

    let unitId: number = null;
    if (inRow.UNIT_NAME) {
      const asNorm = getNormalized(inRow.UNIT_NAME)
      const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: 'Unidade inválida' });
      } else {
        checked.UNIT_NAME = inRow.UNIT_NAME;
        unitId = found[0].value;
      }
    }

    if (inRow.AUT_GROUP) {
      if (unitId) {
        const asNorm = getNormalized(inRow.AUT_GROUP)
        const found = opts.groups.filter(x1 => (x1.unit === unitId) && x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: 'Máquina não encontrada na unidade' });
        } else {
          checked.AUT_GROUP = inRow.AUT_GROUP;
        }
      } else if (inRow.UNIT_NAME) {
        errors.push({ message: 'Máquina não encontrada na unidade' });
      } else {
        errors.push({ message: 'Máquina não encontrada na unidade' });
      }
    }

    if (inRow.EXT_THERM_CFG) {
      const asNorm = getNormalized(inRow.EXT_THERM_CFG);
      if (asNorm === getNormalized('Desabilitado') || asNorm === 'd') checked.EXT_THERM_CFG = 'D';
      else if (asNorm === getNormalized('Em série') || asNorm === 's') checked.EXT_THERM_CFG = 'S';
      else if (asNorm === getNormalized('Em paralelo') || asNorm === 'p') checked.EXT_THERM_CFG = 'P';
      else {
        errors.push({ message: 'Tipo de ligação do termostato não encontrado' });
      }
    }

    if (inRow.PHOTO_1 !== undefined) checked.PHOTO_1 = inRow.PHOTO_1 || null;

    if (inRow.PHOTO_2 !== undefined) checked.PHOTO_2 = inRow.PHOTO_2 || null;

    if (inRow.PHOTO_3 !== undefined) checked.PHOTO_3 = inRow.PHOTO_3 || null;

    if (inRow.PHOTO_4 !== undefined) checked.PHOTO_4 = inRow.PHOTO_4 || null;

    if (inRow.PHOTO_5 !== undefined) checked.PHOTO_5 = inRow.PHOTO_5 || null;
  
  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { key, ...checked, errors }
}

function parseFileRows (file: Buffer) {
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines.map(row => row.map(col => (col || '').toString()));

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_DAM_ID = headers.indexOf(inputColumns.DAM_ID.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_AUT_GROUP = headers.indexOf(inputColumns.AUT_GROUP.label);
  const col_EXT_THERM_CFG = headers.indexOf(inputColumns.EXT_THERM_CFG.label);
  const col_PHOTO_1 = headers.indexOf(inputColumns.PHOTO_1.label);
  const col_PHOTO_2 = headers.indexOf(inputColumns.PHOTO_2.label);
  const col_PHOTO_3 = headers.indexOf(inputColumns.PHOTO_3.label);
  const col_PHOTO_4 = headers.indexOf(inputColumns.PHOTO_4.label);
  const col_PHOTO_5 = headers.indexOf(inputColumns.PHOTO_5.label);


  if (col_DAM_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.DAM_ID.label}`).HttpStatus(400);
  if (col_UNIT_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_NAME.label}`).HttpStatus(400);
  if (col_AUT_GROUP < 0) throw Error(`Coluna não encontrada: ${inputColumns.AUT_GROUP.label}`).HttpStatus(400);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    tableRows.push({
      key: `${i}/${Date.now()}`,
      DAM_ID: cols[col_DAM_ID],
      UNIT_NAME: cols[col_UNIT_NAME],
      AUT_GROUP: cols[col_AUT_GROUP],
      EXT_THERM_CFG: cols[col_EXT_THERM_CFG],
      PHOTO_1: cols[col_PHOTO_1],
      PHOTO_2: cols[col_PHOTO_2],
      PHOTO_3: cols[col_PHOTO_3],
      PHOTO_4: cols[col_PHOTO_4],
      PHOTO_5: cols[col_PHOTO_5],
    });
  }

  return tableRows;
}

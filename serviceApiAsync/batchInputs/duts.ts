import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import { AMB, DUT_PLACEMENT_ERROR, INS, PLACEMENT, DUO } from '../../srcCommon/helpers/dutsStrings'
import parseXlsx, { createXlsx } from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, PROFILECODES } from '../../srcCommon/helpers/permissionControl'
import axios from 'axios'
import { uploadDutImage } from '../devsPictures';
import configfile from '../../configfile';

export const inputColumns = {
  DUT_ID: { label: 'ID DUT', example: 'DUT311110000' },
  ROOM_NAME: { label: 'Nome do Ambiente', example: 'Gerência' },
  UNIT_NAME: { label: 'Unidade', example: 'Filial Laranjeiras' },
  RTYPE_NAME: { label: 'Tipo de Ambiente', example: 'Escritório' },
  AUTOM_CFG: { label: 'Automação (S/N/Relé)', example: 'S' },
  MCHN_BRAND: { label: 'Marca', example: 'TRANE' },
  MCHN_MODEL: { label: 'Modelo', example: 'Intellipak II' },
  // AUT_GROUP: { label: 'Automatiza a máquina', example: 'Split Recepção' },
  MONIT_MACHINE: { label: 'Monitora a máquina', example: 'Split Recepção' },
  PLACEMENT: { label: `Posicionamento (${INS}/${AMB}/${DUO})`, example: `${INS}/${AMB}/${DUO}` },
  PHOTO_1: { label: 'Foto 1', example: 'https://s3.amazonaws.com/...' },
  PHOTO_2: { label: 'Foto 2', example: 'https://s3.amazonaws.com/...' },
  PHOTO_3: { label: 'Foto 3', example: 'https://s3.amazonaws.com/...' },
  PHOTO_4: { label: 'Foto 4', example: 'https://s3.amazonaws.com/...' },
  PHOTO_5: { label: 'Foto 5', example: 'https://s3.amazonaws.com/...' },}

httpRouter.privateRoutes['/check-client-duts-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const { tableRows, tableCols } = await parseFileRows(file);

  const opts = await availableOptions(session, clientId);
  const list = [];
  for (const row of tableRows) {
    list.push(await parseInputRow(row, row.key, opts, clientId));
  }

  return { list, tableCols };
}

httpRouter.privateRoutes['/add-client-duts-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.duts) throw Error('Missing parameter: duts').HttpStatus(400)
  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const clientRoomTypes = await sqldb.ROOMTYPES.getRoomTypesList({ CLIENT_ID: reqParams.CLIENT_ID });
  let clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const clientUnits = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  let opts = await availableOptions(session, reqParams.CLIENT_ID);

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.duts) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DUT_ID });
      if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== reqParams.CLIENT_ID) {
        if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
          // OK, dispositivo está associado a um fabricante
        } else {
          ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outro cliente' });
          continue;
        }
      }

      let UNIT_ID: number = undefined;
      if (row.UNIT_NAME !== undefined) {
        UNIT_ID = null;
        if (row.UNIT_NAME) {
          const normUnitName = getNormalized(row.UNIT_NAME);
          const UNIT_IDs = clientUnits.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
          if (UNIT_IDs.length !== 1) {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
            continue;
          } else {
            const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.DUT_ID })
            if (currentDevInfo && currentDevInfo.UNIT_ID && UNIT_IDs[0].UNIT_ID !== currentDevInfo.UNIT_ID) {
              ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outra unidade deste cliente' });
              continue;
            }
          }
          UNIT_ID = UNIT_IDs[0].UNIT_ID;
        }
      }
      let RTYPE_IDs = null;
      if (row.RTYPE_NAME) {
        const normRTypeName = getNormalized(row.RTYPE_NAME);
        RTYPE_IDs = clientRoomTypes.filter((row) => (getNormalized(row.RTYPE_NAME) === normRTypeName));
        if (RTYPE_IDs.length !== 1) {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de ambiente' });
          continue;
        }
      }

      let MACHINE_ID = undefined;
      if (row.MONIT_MACHINE !== undefined) {
        MACHINE_ID = null;
        if (row.MONIT_MACHINE) {
          if (!UNIT_ID) {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
            continue;
          }
          const normGroupName = getNormalized(row.MONIT_MACHINE);
          let MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normGroupName));
          if (MACHINE_IDs.length === 1) { } // OK
          else if (MACHINE_IDs.length === 0) {
            await httpRouter.privateRoutes['/dac/add-new-group']({
              CLIENT_ID: reqParams.CLIENT_ID,
              UNIT_ID: UNIT_ID,
              GROUP_NAME: row.MONIT_MACHINE,
            }, session);
            clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
            MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normGroupName));
            if (MACHINE_IDs.length !== 1) {
              ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a máquina' });
              continue;
            }
          }
          else {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
            continue;
          }
          MACHINE_ID = MACHINE_IDs[0].MACHINE_ID;
        }
      }

      // Adicionar a marca se não existir
      if (checked.MCHN_BRAND) {
        const asNorm = getNormalized(checked.MCHN_BRAND)
        let found = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length === 0) {
          await sqldb.AV_OPTS.w_insert({
            OPT_TYPE: 'BRAND',
            OPT_ID: `marca-${asNorm}`,
            OPT_LABEL: checked.MCHN_BRAND,
            TAGS: null,
          }, session.user);
          opts = await availableOptions(session, reqParams.CLIENT_ID);
          found = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNorm));
          if (found.length !== 1) {
            ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a marca' });
            continue;
          }
        }
        if (found.length === 1) {
          checked.MCHN_BRAND = found[0].value;
        } else {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar marca' });
          continue;
        }
      }
     
      const results = await sqldb.DUTS_DEVICES_IMAGES.getList({ devId: row.DUT_ID })
      const urlPrefix = `${configfile.filesBucket.url}/${configfile.filesBucket.imagesBucketPath}`
      const list = results.map(row => (urlPrefix + row.FILENAME))

      if (list.length && list.length > 0 && (row.PHOTO_1 || row.PHOTO_2 || row.PHOTO_3 || row.PHOTO_4 || row.PHOTO_5)) {
        for (const image of list) {
          const filePathIndex = image.lastIndexOf(configfile.filesBucket.imagesBucketPath)
          const qPars2 = { 
            DEV_ID: row.DUT_ID,
            FILENAME: image.substr(filePathIndex + configfile.filesBucket.imagesBucketPath.length)
          }
          await sqldb.DUTS_DEVICES_IMAGES.w_deleteRow(qPars2, session.user)
        }
      }

      if (row.PHOTO_1 != null && row.DUT_ID) {
        checked.PHOTO_1 = row.PHOTO_1 || null;
        const image = await axios.get(checked.PHOTO_1, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDutImage(image, row.DUT_ID, session, reqParams)
      }

      if (row.PHOTO_2 != null && row.DUT_ID) {
        checked.PHOTO_2 = row.PHOTO_2 || null;
        const image = await axios.get(checked.PHOTO_2, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDutImage(image, row.DUT_ID, session, reqParams)
      }

      if (row.PHOTO_3 != null && row.DUT_ID) {
        checked.PHOTO_3 = row.PHOTO_3 || null;
        const image = await axios.get(checked.PHOTO_3, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDutImage(image, row.DUT_ID, session, reqParams)
      }

      if (row.PHOTO_4 != null && row.DUT_ID) {
        checked.PHOTO_4 = row.PHOTO_4 || null;
        const image = await axios.get(checked.PHOTO_4, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDutImage(image, row.DUT_ID, session, reqParams)
      }

      if (row.PHOTO_5 != null && row.DUT_ID) {
        checked.PHOTO_5 = row.PHOTO_5 || null;
        const image = await axios.get(checked.PHOTO_5, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDutImage(image, row.DUT_ID, session, reqParams)
      }
      await httpRouter.privateRoutes['/dut/set-dut-info']({
        CLIENT_ID: reqParams.CLIENT_ID,
        DEV_ID: checked.DUT_ID,
        UNIT_ID: UNIT_ID,
        ROOM_NAME: checked.ROOM_NAME,
        RTYPE_ID: RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID,
        PLACEMENT: checked.PLACEMENT,
        USE_IR: (checked.AUTOM_CFG === 'N') ? 0 : ((checked.AUTOM_CFG === 'RELÉ') ? 0 : 1),
        PORTCFG: (checked.AUTOM_CFG === 'N') ? 'IR' : ((checked.AUTOM_CFG === 'RELÉ') ? 'RELAY' : 'IR'),
        MCHN_BRAND: checked.MCHN_BRAND,
        MCHN_MODEL: checked.MCHN_MODEL,
        groups: MACHINE_ID && [MACHINE_ID.toString()],
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
  rtypes:   { RTYPE_ID: number, RTYPE_NAME: string, norms: string[] }[]
  groups:   { value: number, label: string, norms: string[], unit: number }[]
  brands:  { value: string, label: string, norms: string[] }[]
}

async function availableOptions (session: SessionData, clientId: number): Promise<AvailableOptions> {
  const opts = await httpRouter.privateRoutes['/dev/dev-info-combo-options']({
    CLIENT_ID: clientId,
    units: true,
    rtypes: true,
    groups: true,
    brands: true,
  }, session);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    rtypes: opts.rtypes.map(x => ({ ...x, norms: [getNormalized(x.RTYPE_NAME)] })),
    groups: opts.groups.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    brands: opts.brands.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
  }
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-duts-batch']>[0]['duts'][0];
async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number) {
  const checked: TableRow = {
    key,
    DUT_ID: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.DUT_ID = inRow.DUT_ID || null;

    if (!checked.DUT_ID) errors.push({ message: 'É necessário informar o ID do DUT' });
    if (checked.DUT_ID && inRow.DUT_ID.length !== 12) errors.push({ message: 'É necessário um ID do DUT válido' });

    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DUT_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `Dispositivo já associado a outro cliente` });
      }
    }

    if (inRow.ROOM_NAME !== undefined) checked.ROOM_NAME = inRow.ROOM_NAME || null;
    if (inRow.MCHN_BRAND !== undefined) checked.MCHN_BRAND = inRow.MCHN_BRAND || null;
    if (inRow.MCHN_MODEL !== undefined) checked.MCHN_MODEL = inRow.MCHN_MODEL || null;

    if (inRow.UNIT_NAME !== undefined) {
      checked.UNIT_NAME = null;
      if (inRow.UNIT_NAME) {
        const asNorm = getNormalized(inRow.UNIT_NAME)
        const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: `Unidade inválida: ${inRow.UNIT_NAME}` });
        } else {
          checked.UNIT_NAME = inRow.UNIT_NAME;
        }
      }
    }
    if (inRow.RTYPE_NAME !== undefined) {
      checked.RTYPE_NAME = null;
      if (inRow.RTYPE_NAME) {
        const asNorm = getNormalized(inRow.RTYPE_NAME)
        const found = opts.rtypes.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: 'Tipo de ambiente inválido' });
        } else {
          checked.RTYPE_NAME = inRow.RTYPE_NAME;
        }
      }
    }
    if (inRow.MCHN_BRAND !== undefined) {
      checked.MCHN_BRAND = (inRow.MCHN_BRAND && inRow.MCHN_BRAND.trim()) || null;
      if (checked.MCHN_BRAND) {
        const asNorm = getNormalized(checked.MCHN_BRAND)
        const found = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length === 1) { } // OK
        else if (found.length === 0) { } // OK, will be added
        else {
          errors.push({ message: `Não foi possível identificar a marca` });
        }
      }
    }

    if (inRow.AUTOM_CFG !== undefined) {
      checked.AUTOM_CFG = null;
      if (['S'].includes(inRow.AUTOM_CFG && inRow.AUTOM_CFG.toUpperCase())) checked.AUTOM_CFG = 'S';
      else if (['RELE', 'RELÉ'].includes(inRow.AUTOM_CFG && inRow.AUTOM_CFG.toUpperCase())) checked.AUTOM_CFG = 'RELÉ';
      else if (['N','',null,undefined].includes(inRow.AUTOM_CFG && inRow.AUTOM_CFG.toUpperCase())) checked.AUTOM_CFG = 'N';
      else {
        errors.push({ message: 'A automação será habilitada' });
        checked.AUTOM_CFG = 'S';
      }
    }

    if (inRow.MONIT_MACHINE !== undefined) {
      checked.MONIT_MACHINE = inRow.MONIT_MACHINE || null;
      if (checked.MONIT_MACHINE && !checked.UNIT_NAME) {
        checked.MONIT_MACHINE = null;
        errors.push({ message: 'É necessário informar a unidade da máquina' });
      }
    }

    /*
      Verifica se o posicionamento do DUT é válido - "INS", "AMB" ou "DUO".
      Caso não seja, atribui o valor padrão - "AMB" - e adiciona uma nova mensagem de erro.
    */
    if (inRow.PLACEMENT !== undefined) {
      const inRowToUpperCase = inRow.PLACEMENT && inRow.PLACEMENT.toUpperCase();
      const isPlacementValid = inRowToUpperCase === INS || inRowToUpperCase === AMB || inRowToUpperCase === DUO;
      if (!isPlacementValid) {
        errors.push({ message: DUT_PLACEMENT_ERROR });
        checked.PLACEMENT = AMB;
      } else {
        checked.PLACEMENT = inRowToUpperCase;
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
  const lines = parseXlsx(file);
  if (lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => (x || '').toString().trim());
  const col_DUT_ID = headers.indexOf(inputColumns.DUT_ID.label);
  const col_ROOM_NAME = headers.indexOf(inputColumns.ROOM_NAME.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_RTYPE_NAME = headers.indexOf(inputColumns.RTYPE_NAME.label);
  const col_AUTOM_CFG = headers.indexOf(inputColumns.AUTOM_CFG.label);
  const col_MCHN_BRAND = headers.indexOf(inputColumns.MCHN_BRAND.label);
  const col_MCHN_MODEL = headers.indexOf(inputColumns.MCHN_MODEL.label);
  const col_MONIT_MACHINE = headers.indexOf(inputColumns.MONIT_MACHINE.label);
  const col_PLACEMENT = headers.indexOf(inputColumns.PLACEMENT.label);
  const col_PHOTO_1 = headers.indexOf(inputColumns.PHOTO_1.label);
  const col_PHOTO_2 = headers.indexOf(inputColumns.PHOTO_2.label);
  const col_PHOTO_3 = headers.indexOf(inputColumns.PHOTO_3.label);
  const col_PHOTO_4 = headers.indexOf(inputColumns.PHOTO_4.label);
  const col_PHOTO_5 = headers.indexOf(inputColumns.PHOTO_5.label);



  if (col_DUT_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.DUT_ID.label}`).HttpStatus(400);
  const tableCols = ['DUT_ID'];
  if (col_ROOM_NAME >= 0) tableCols.push('ROOM_NAME');
  if (col_UNIT_NAME >= 0) tableCols.push('UNIT_NAME');
  if (col_RTYPE_NAME >= 0) tableCols.push('RTYPE_NAME');
  if (col_AUTOM_CFG >= 0) tableCols.push('AUTOM_ENABLE');
  if (col_MCHN_BRAND >= 0) tableCols.push('MCHN_BRAND');
  if (col_MCHN_MODEL >= 0) tableCols.push('MCHN_MODEL');
  if (col_MONIT_MACHINE >= 0) tableCols.push('MONIT_MACHINE');
  if (col_PLACEMENT >= 0) tableCols.push(PLACEMENT);
  if (col_PHOTO_1 >= 0) tableCols.push('PHOTO_1');
  if (col_PHOTO_2 >= 0) tableCols.push('PHOTO_2');
  if (col_PHOTO_3 >= 0) tableCols.push('PHOTO_3');
  if (col_PHOTO_4 >= 0) tableCols.push('PHOTO_4');
  if (col_PHOTO_5 >= 0) tableCols.push('PHOTO_5');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    tableRows.push({
      key: `${i}/${Date.now()}`,
      DUT_ID: getCellValue(cols, col_DUT_ID),
      ROOM_NAME: getCellValue(cols, col_ROOM_NAME),
      UNIT_NAME: getCellValue(cols, col_UNIT_NAME),
      RTYPE_NAME: getCellValue(cols, col_RTYPE_NAME),
      AUTOM_CFG: getCellValue(cols, col_AUTOM_CFG) as 'S'|'N'|'RELÉ',
      MCHN_BRAND: getCellValue(cols, col_MCHN_BRAND),
      MCHN_MODEL: getCellValue(cols, col_MCHN_MODEL),
      MONIT_MACHINE: getCellValue(cols, col_MONIT_MACHINE),
      PLACEMENT: getCellValue(cols, col_PLACEMENT),
      PHOTO_1: getCellValue(cols, col_PHOTO_1),
      PHOTO_2: getCellValue(cols, col_PHOTO_2),
      PHOTO_3: getCellValue(cols, col_PHOTO_3),
      PHOTO_4: getCellValue(cols, col_PHOTO_4),
      PHOTO_5: getCellValue(cols, col_PHOTO_5),
    });
  }

  return { tableRows, tableCols };
}

export function getCellValue (cols: any[], index: number) {
  if (index < 0) return undefined;
  if (index > cols.length) return null;
  return (cols[index] || '').toString().trim() || null;
}

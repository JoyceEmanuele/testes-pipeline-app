import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx, { createXlsx } from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, PROFILECODES } from '../../srcCommon/helpers/permissionControl'
import axios from 'axios';
import { uploadDacImage } from '../devsPictures'

export const inputColumns = {
  DAC_ID: { label: 'ID DAC', example: 'DAC411110000' },
  UNIT_NAME: { label: 'Unidade', example: 'Filial Laranjeiras' },
  GROUP_NAME: { label: 'Máquina', example: 'Split Recepção' },
  AUTOM_ENABLE: { label: 'Automação (S/N)', example: 'S' },
  DAC_APPL: { label: 'Aplicação', example: 'Ar condicionado' },
  FLUID_TYPE: { label: 'Fluido', example: 'R410A' },
  P0_SENSOR: { label: 'Sensor P0', example: 'HDS35' },
  P0_POSITN: { label: 'P0', example: 'Psuc' },
  P1_SENSOR: { label: 'Sensor P1', example: '' },
  P1_POSITN: { label: 'P1', example: '' },
  DAC_TYPE: { label: 'Tipo de Equipamento', example: 'Split piso teto' },
  CAPACITY_PWR: { label: 'Capacidade Frigorífica', example: '36000' },
  CAPACITY_UNIT: { label: 'Unidade da Cap.Frig.', example: 'BTU/h' },
  DAC_COP: { label: 'COP', example: '3.5' },
  DAC_KW: { label: 'Potência nominal [kW]', example: '12' },
  DAC_ENV: { label: 'Ambiente', example: 'Comum' },
  DAC_BRAND: { label: 'Marca', example: 'Elgin' },
  DAC_MODEL: { label: 'Modelo', example: '2TTK0518G1000AA' },
  DAC_DESC: { label: 'Descrição', example: 'Evaporadora alterada' },
  DAC_NAME: { label: 'Nome da condensadora', example: 'Condensadora 10' },
  DAC_MODIF: { label: 'Houve modificação (S/N)', example: 'N' },
  DAC_COMIS: { label: 'Comissionado (S/N)', example: 'S' },
  PHOTO_1: { label: 'Foto 1', example: 'https://s3.amazonaws.com/...' },
  PHOTO_2: { label: 'Foto 2', example: 'https://s3.amazonaws.com/...' },
  PHOTO_3: { label: 'Foto 3', example: 'https://s3.amazonaws.com/...' },
  PHOTO_4: { label: 'Foto 4', example: 'https://s3.amazonaws.com/...' },
  PHOTO_5: { label: 'Foto 5', example: 'https://s3.amazonaws.com/...' },
}

httpRouter.privateRoutes['/check-client-dacs-batch'] = async function (_reqParams, session, { req, res }) {
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
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    list.push(await parseInputRow(row, row.key, opts, clientId));
  }

  return { list, tableCols };
}

httpRouter.privateRoutes['/export-client-dacs-batch-input'] = async function (reqParams, session, { res }) {
  const clientId = reqParams.CLIENT_ID && Number(reqParams.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const unitId = reqParams.UNIT_ID && Number(reqParams.UNIT_ID);
  if (!unitId) throw Error('Missing parameter: UNIT_ID').HttpStatus(400);
  const unitInfo = unitId && await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: unitId, CLIENT_ID: clientId });
  if (!unitInfo) throw Error('Unidade não encontrada').HttpStatus(400);

  const dacsList = await sqldb.DACS_DEVICES.getListBatchInput({ unitIds: [unitId] });

  const data: (string|number)[][] = [
    [
      inputColumns.DAC_ID.label,
      inputColumns.UNIT_NAME.label,
      inputColumns.GROUP_NAME.label,
      inputColumns.AUTOM_ENABLE.label,
      inputColumns.DAC_APPL.label,
      inputColumns.FLUID_TYPE.label,
      inputColumns.P0_SENSOR.label,
      inputColumns.P0_POSITN.label,
      inputColumns.P1_SENSOR.label,
      inputColumns.P1_POSITN.label,
      inputColumns.DAC_TYPE.label,
      inputColumns.CAPACITY_PWR.label,
      inputColumns.CAPACITY_UNIT.label,
      inputColumns.DAC_COP.label,
      inputColumns.DAC_KW.label,
      inputColumns.DAC_ENV.label,
      inputColumns.DAC_BRAND.label,
      inputColumns.DAC_MODEL.label,
      inputColumns.DAC_DESC.label,
      inputColumns.DAC_NAME.label,
      inputColumns.DAC_MODIF.label,
      inputColumns.DAC_COMIS.label,
      inputColumns.PHOTO_1.label,
      inputColumns.PHOTO_2.label,
      inputColumns.PHOTO_3.label,
      inputColumns.PHOTO_4.label,
      inputColumns.PHOTO_5.label,

    ]
  ];
  for (const row of dacsList) {
    data.push([
      row.DAC_ID, // { label: 'ID DAC', example: 'DAC411110000' },
      row.UNIT_NAME, // { label: 'Unidade', example: 'Filial Laranjeiras' },
      row.MACHINE_NAME, // { label: 'Máquina', example: 'Split Recepção' },
      (row.AS_DAM || '') && (row.AUTOM_DISAB ? 'N' : 'S'), // { label: 'Automação (S/N)', example: 'S' }, // USE_RELAY ((checked.AUTOM_ENABLE === 'N') ? 0 : 1)
      row.MACHINE_APPLICATION, // { label: 'Aplicação', example: 'Ar condicionado' },
      row.MACHINE_FLUID_TYPE, // { label: 'Fluido', example: 'R410A' },
      row.P0_SENSOR, // { label: 'Sensor P0', example: 'HDS35' },
      row.P0_POSITN, // { label: 'P0', example: 'Psuc' },
      row.P1_SENSOR, // { label: 'Sensor P1', example: '' },
      row.P1_POSITN, // { label: 'P1', example: '' },
      row.MACHINE_TYPE, // { label: 'Tipo de Equipamento', example: 'Split piso teto' },
      row.ASSET_CAPACITY_POWER, // { label: 'Capacidade Frigorífica', example: '36000' },
      row.ASSET_CAPACITY_UNIT, // { label: 'Unidade da Cap.Frig.', example: 'BTU/h' },
      row.MACHINE_COP, // { label: 'COP', example: '3.5' },
      row.MACHINE_KW, // { label: 'Potência nominal [kW]', example: '12' },
      row.DAC_ENV, // { label: 'Ambiente', example: 'Comum' },
      row.MACHINE_BRAND, // { label: 'Marca', example: 'Elgin' },
      row.ASSET_MODEL, // { label: 'Modelo', example: '2TTK0518G1000AA' },
      row.DAC_DESC, // { label: 'Descrição', example: 'Evaporadora alterada' },
      row.DAC_NAME, // { label: 'Nome da condensadora', example: 'Condensadora 10' },
      (row.DAC_MODIF === '1') ? 'S' : (row.DAC_MODIF === '0') ? 'N' : '', // { label: 'Houve modificação (S/N)', example: 'N' }, // ((checked.DAC_MODIF === 'N') ? '0' : (checked.DAC_MODIF === 'S') ? '1' : undefined)
      (row.DAC_COMIS === '1') ? 'S' : (row.DAC_COMIS === '0') ? 'N' : '', // { label: 'Comissionado (S/N)', example: 'S' }, // ((checked.DAC_COMIS === 'N') ? '0' : (checked.DAC_COMIS === 'S') ? '1' : undefined)
    ]);
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('Content-Disposition', 'attachment; filename="Maquinas.xlsx"');
  res.append('filename', `Maquinas.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/add-client-dacs-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.dacs) throw Error('Missing parameter: dacs').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  let clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const clientUnits = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  let opts = await availableOptions(session, reqParams.CLIENT_ID);

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.dacs) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID);
      
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }
    
      const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAC_ID });
      if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== reqParams.CLIENT_ID) {
        if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
          // OK, dispositivo está associado a um fabricante
        } else {
          ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outro cliente' });
          continue;
        }
      }

      let UNIT_ID: number = undefined;
      if (checked.UNIT_NAME !== undefined) {
        UNIT_ID = null;
        if (checked.UNIT_NAME) {
          const normUnitName = getNormalized(checked.UNIT_NAME);
          const UNIT_IDs = clientUnits.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
          if (UNIT_IDs.length !== 1) {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
            continue;
          } else {
            const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.DAC_ID })
            if (currentDevInfo && currentDevInfo.UNIT_ID && UNIT_IDs[0].UNIT_ID !== currentDevInfo.UNIT_ID) {
              ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outra unidade deste cliente' });
              continue;
            }
          }
          UNIT_ID = UNIT_IDs[0].UNIT_ID;
        }
      }
      let MACHINE_ID = undefined;
      if (checked.GROUP_NAME !== undefined) {
        MACHINE_ID = null;
        if (checked.GROUP_NAME) {
          if (!UNIT_ID) {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
            continue;
          }
          const normGroupName = getNormalized(checked.GROUP_NAME);
          let MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normGroupName));
          if (MACHINE_IDs.length === 0) {
            await httpRouter.privateRoutes['/dac/add-new-group']({
              CLIENT_ID: reqParams.CLIENT_ID,
              UNIT_ID: UNIT_ID,
              GROUP_NAME: checked.GROUP_NAME,
            }, session);
            clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
            MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normGroupName));
            if (MACHINE_IDs.length !== 1) {
              ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a máquina' });
              continue;
            }
          }
          if (MACHINE_IDs.length === 1) {
            MACHINE_ID = MACHINE_IDs[0].MACHINE_ID;
          }
          else {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
            continue;
          }
        }
      }

      // Adicionar a marca se não existir
      if (checked.DAC_BRAND) {
        const asNorm = getNormalized(checked.DAC_BRAND)
        let found = opts.brands.filter(x1 => (x1.value === checked.DAC_BRAND) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length === 0) {
          await sqldb.AV_OPTS.w_insert({
            OPT_TYPE: 'BRAND',
            OPT_ID: `marca-${asNorm}`,
            OPT_LABEL: checked.DAC_BRAND,
            TAGS: null,
          }, session.user);
          opts = await availableOptions(session, reqParams.CLIENT_ID);
          found = opts.brands.filter(x1 => (x1.value === checked.DAC_BRAND) || x1.norms.some(x2 => x2 === asNorm));
          if (found.length !== 1) {
            ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a marca' });
            continue;
          }
        }
        if (found.length === 1) {
          checked.DAC_BRAND = found[0].value;
        } else {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar marca' });
          continue;
        }
      }

      const nInfo_DAC_COP = checked.DAC_COP && checkNumber(checked.DAC_COP);
      const nInfo_DAC_KW = checked.DAC_KW && checkNumber(checked.DAC_KW);
      const nInfo_CAPACITY_PWR = checked.CAPACITY_PWR && checkNumber(checked.CAPACITY_PWR);

      const l1Sim = (checked.DAC_APPL === 'fancoil') ? 'fancoil' : 'virtual'; 

      const addedItem = await httpRouter.privateRoutes['/dac/set-dac-info']({
        CLIENT_ID: reqParams.CLIENT_ID,
        DAC_ID: checked.DAC_ID,
        UNIT_ID: UNIT_ID,
        GROUP_ID: MACHINE_ID,
        USE_RELAY: checked.AUTOM_ENABLE && ((checked.AUTOM_ENABLE === 'N') ? 0 : 1),
        DAC_DESC: checked.DAC_DESC,
        DAC_NAME: checked.DAC_NAME,
        DAC_MODEL: checked.DAC_MODEL,
        CAPACITY_PWR:  nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
        CAPACITY_UNIT:  checked.CAPACITY_UNIT,
        DAC_COP: nInfo_DAC_COP && Number(nInfo_DAC_COP.numI),
        DAC_KW:  nInfo_DAC_KW && Number(nInfo_DAC_KW.numI),
        FLUID_TYPE: checked.FLUID_TYPE,
        DAC_APPL: checked.DAC_APPL,
        DAC_TYPE: checked.DAC_TYPE,
        DAC_ENV: checked.DAC_ENV,
        DAC_BRAND: checked.DAC_BRAND,
        DAC_MODIF: checked.DAC_MODIF && ((checked.DAC_MODIF === 'N') ? '0' : (checked.DAC_MODIF === 'S') ? '1' : undefined),
        DAC_COMIS: checked.DAC_COMIS && ((checked.DAC_COMIS === 'N') ? '0' : (checked.DAC_COMIS === 'S') ? '1' : undefined),
        P0_POSITN: checked.P0_POSITN,
        P1_POSITN: checked.P1_POSITN,
        P0_SENSOR: checked.P0_SENSOR,
        P1_SENSOR: checked.P1_SENSOR,
        SELECTED_L1_SIM: l1Sim,
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
  fluids:  { value: string, label: string, norms: string[] }[]
  applics: { value: string, label: string, norms: string[] }[]
  types:   { value: string, label: string, norms: string[] }[]
  envs:    { value: string, label: string, norms: string[] }[]
  brands:  { value: string, label: string, norms: string[] }[]
  psens:   { value: string, label: string, norms: string[] }[]
}

async function availableOptions (session: SessionData, clientId: number): Promise<AvailableOptions> {
  const opts = await httpRouter.privateRoutes['/dev/dev-info-combo-options']({
    CLIENT_ID: clientId,
    units: true,
    fluids: true,
    applics: true,
    types: true,
    envs: true,
    brands: true,
    psens: true,
  }, session);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    fluids: opts.fluids.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    applics: opts.applics.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    types: opts.types.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    envs: opts.envs.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    brands: opts.brands.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    psens: opts.psens.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
  }
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-dacs-batch']>[0]['dacs'][0];

async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number) {
  const checked: TableRow = {
    key,
    DAC_ID: null,
    // UNIT_NAME: null,
    // GROUP_NAME: null,
    // AUTOM_ENABLE: null,
    // DAC_APPL: null,
    // FLUID_TYPE: null,
    // P0_SENSOR: null,
    // P1_SENSOR: null,
    // P0_POSITN: null,
    // P1_POSITN: null,
    // DAC_TYPE: null,
    // CAPACITY_PWR: null,
    // CAPACITY_UNIT: null,
    // DAC_COP: null,
    // DAC_KW: null,
    // DAC_ENV: null,
    // DAC_BRAND: null,
    // DAC_MODEL: null,
    // DAC_DESC: null,
    // DAC_NAME: null,
    // DAC_MODIF: null,
    // DAC_COMIS: null,
  };

  const errors = [] as { message: string }[];

  try {
    checked.DAC_ID = inRow.DAC_ID || null;
    if (!checked.DAC_ID) errors.push({ message: 'É necessário informar o ID do DAC' });

    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAC_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `Dispositivo já associado a outro cliente` });
      }
    }
    if (!currentDevInfo) {
      errors.push({ message: `Dispositivo não registrado no sistema` });
    }

    if (inRow.DAC_BRAND !== undefined) checked.DAC_BRAND = inRow.DAC_BRAND || null;
    if (inRow.DAC_MODEL !== undefined) checked.DAC_MODEL = inRow.DAC_MODEL || null;
    if (inRow.DAC_DESC !== undefined) checked.DAC_DESC = inRow.DAC_DESC || null;
    if (inRow.DAC_NAME !== undefined) checked.DAC_NAME = inRow.DAC_NAME || null;

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
    if (inRow.FLUID_TYPE !== undefined) {
      checked.FLUID_TYPE = null;
      if (inRow.FLUID_TYPE) {
        const asNorm = getNormalized(inRow.FLUID_TYPE)
        const found = opts.fluids.filter(x1 => (x1.value === inRow.FLUID_TYPE) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: `Opção de fluido inválida: ${inRow.FLUID_TYPE}` });
        } else {
          checked.FLUID_TYPE = found[0].value;
        }
      }
    }
    if (inRow.DAC_APPL !== undefined) {
      checked.DAC_APPL = null;
      if (inRow.DAC_APPL) {
        const asNorm = getNormalized(inRow.DAC_APPL)
        const found = opts.applics.filter(x1 => (x1.value === inRow.DAC_APPL || x1.label === inRow.DAC_APPL || x1.norms.some(x2 => x2 === asNorm)));
        if (found.length !== 1) {
          errors.push({ message: `Aplicação inválida: ${inRow.DAC_APPL}` });
        } else {
          checked.DAC_APPL = found[0].value;
        }
      }
    }
    if (inRow.DAC_TYPE !== undefined) {
      checked.DAC_TYPE = null;
      if (inRow.DAC_TYPE) {
        const asNorm = getNormalized(inRow.DAC_TYPE)
        const found = opts.types.filter(x1 => (x1.value === inRow.DAC_TYPE || x1.label === inRow.DAC_TYPE || x1.norms.some(x2 => x2 === asNorm)));
        if (found.length !== 1) {
          errors.push({ message: `Tipo de equipamento inválido: ${inRow.DAC_TYPE}` });
        } else {
          checked.DAC_TYPE = found[0].value;
        }
      }
    }
    if (inRow.DAC_ENV !== undefined) {
      checked.DAC_ENV = null;
      if (inRow.DAC_ENV) {
        const asNorm = getNormalized(inRow.DAC_ENV)
        const found = opts.envs.filter(x1 => (x1.value === inRow.DAC_ENV) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: `Opção de ambiente inválida: ${inRow.DAC_ENV}` });
        } else {
          checked.DAC_ENV = found[0].value;
        }
      }
    }
    if (inRow.DAC_BRAND !== undefined) {
      checked.DAC_BRAND = (inRow.DAC_BRAND && inRow.DAC_BRAND.trim()) || null;
      if (checked.DAC_BRAND) {
        const asNorm = getNormalized(checked.DAC_BRAND)
        const found = opts.brands.filter(x1 => (x1.value === checked.DAC_BRAND) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length === 1) { } // OK
        else if (found.length === 0) { } // OK, will be added
        else {
          errors.push({ message: `Não foi possível identificar a marca` });
        }
      }
    }

    if ((inRow.P0_SENSOR !== undefined) || (inRow.P0_POSITN !== undefined) || (inRow.P1_SENSOR !== undefined) || (inRow.P1_POSITN !== undefined)) {
      checked.P0_SENSOR = null;
      checked.P0_POSITN = null;
      checked.P1_SENSOR = null;
      checked.P1_POSITN = null;
      if (inRow.P0_SENSOR || inRow.P0_POSITN) {
        let warnedError = false;
        if (inRow.P0_SENSOR) {
          const asNorm = getNormalized(inRow.P0_SENSOR)
          const found = opts.psens.filter(x1 => (x1.value === inRow.P0_SENSOR) || x1.norms.some(x2 => x2 === asNorm));
          if (found.length !== 1) {
            errors.push({ message: `Sensor de pressão em P0 não reconhecido: ${inRow.P0_SENSOR}` });
            warnedError = true;
          } else {
            checked.P0_SENSOR = found[0].value;
          }
        }
        if (inRow.P0_POSITN) {
          const asNorm = getNormalized(inRow.P0_POSITN)
          if (asNorm === 'pliq') { checked.P0_POSITN = 'Pliq' }
          if (asNorm === 'psuc') { checked.P0_POSITN = 'Psuc' }
          else {
            errors.push({ message: `Posição de P0 inválida: ${inRow.P0_POSITN}` });
            warnedError = true;
          }
        }
        if ((!checked.P0_SENSOR) || (!checked.P0_POSITN)) {
          if (!warnedError) errors.push({ message: `Informações incompletas de P0` });
          // checked.P0_SENSOR = null;
          // checked.P0_POSITN = null;
        }
      }
      if (inRow.P1_SENSOR || inRow.P1_POSITN) {
        let warnedError = false;
        if (inRow.P1_SENSOR) {
          const asNorm = getNormalized(inRow.P1_SENSOR)
          const found = opts.psens.filter(x1 => (x1.value === inRow.P1_SENSOR) || x1.norms.some(x2 => x2 === asNorm));
          if (found.length !== 1) {
            errors.push({ message: `Sensor de pressão em P1 não reconhecido: ${inRow.P1_SENSOR}` });
            warnedError = true;
          } else {
            checked.P1_SENSOR = found[0].value;
          }
        }
        if (inRow.P1_POSITN) {
          const asNorm = getNormalized(inRow.P1_POSITN)
          if (asNorm === 'pliq') { checked.P1_POSITN = 'Pliq' }
          if (asNorm === 'psuc') { checked.P1_POSITN = 'Psuc' }
          else {
            errors.push({ message: `Posição de P1 inválida: ${inRow.P1_POSITN}` });
            warnedError = true;
          }
        }
        if ((!checked.P1_SENSOR) || (!checked.P1_POSITN)) {
          if (!warnedError) errors.push({ message: `Informações incompletas de P1` });
          // checked.P1_SENSOR = null;
          // checked.P1_POSITN = null;
        }
      }
    }

    if (inRow.AUTOM_ENABLE !== undefined) {
      checked.AUTOM_ENABLE = null;
      if (['S'].includes(inRow.AUTOM_ENABLE && inRow.AUTOM_ENABLE.toUpperCase())) checked.AUTOM_ENABLE = 'S';
      else if (['N','',null,undefined].includes(inRow.AUTOM_ENABLE && inRow.AUTOM_ENABLE.toUpperCase())) checked.AUTOM_ENABLE = 'N';
      else {
        errors.push({ message: 'A automação será habilitada' });
        checked.AUTOM_ENABLE = 'S';
      }
    }

    if (inRow.DAC_MODIF !== undefined) {
      checked.DAC_MODIF = null;
      if (['S'].includes(inRow.DAC_MODIF && inRow.DAC_MODIF.toUpperCase())) checked.DAC_MODIF = 'S';
      else if (['N','',null,undefined].includes(inRow.DAC_MODIF && inRow.DAC_MODIF.toUpperCase())) checked.DAC_MODIF = 'N';
      else {
        errors.push({ message: 'Opção inválida no campo "Modificado"' });
      }
    }

    if (inRow.DAC_COMIS !== undefined) {
      checked.DAC_COMIS = null;
      if (['S'].includes(inRow.DAC_COMIS && inRow.DAC_COMIS.toUpperCase())) checked.DAC_COMIS = 'S';
      else if (['N','',null,undefined].includes(inRow.DAC_COMIS && inRow.DAC_COMIS.toUpperCase())) checked.DAC_COMIS = 'N';
      else {
        errors.push({ message: 'Opção inválida no campo "Comissionado"' });
      }
    }

    if (inRow.DAC_COP !== undefined) {
      checked.DAC_COP = null;
      if (inRow.DAC_COP) {
        const nInfo = checkNumber(inRow.DAC_COP);
        if (!nInfo) {
          errors.push({ message: 'COP inválido' });
        } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
          checked.DAC_COP = nInfo.numI.replace(',', '.');
        } else {
          errors.push({ message: 'COP inválido' });
        }
      }
    }

    if (inRow.DAC_KW !== undefined) {
      checked.DAC_KW = null;
      if (inRow.DAC_KW) {
        const nInfo = checkNumber(inRow.DAC_KW);
        if (!nInfo) {
          errors.push({ message: 'Potência nominal inválida' });
        } else if (nInfo.unidade && nInfo.unidade.toLowerCase() !== 'kw') {
          errors.push({ message: 'Unidade da potência nominal inválida. Precisa ser "kW"' });
        }
        else if (nInfo.noSeparator || (nInfo.numSeps === 1)) {
          checked.DAC_KW = nInfo.numI.replace(',', '.');
        }
        else {
          errors.push({ message: 'Não foi possível interpretar a potência nominal' });
        }
      }
    }

    if (inRow.CAPACITY_PWR !== undefined) {
      checked.CAPACITY_PWR = null;
      if (inRow.CAPACITY_PWR) {
        const nInfo = checkNumber(inRow.CAPACITY_PWR);
        if (!nInfo) {
          errors.push({ message: 'Capacidade frigorífica inválida' });
        } else {
          if (nInfo.unidade) {
            errors.push({ message: 'Capacidade frigorífica inválida' });
          } else {
            const unidade = getNormalized(inRow.CAPACITY_UNIT || nInfo.unidade);
            if (['hp'].includes(unidade)) {
              if (nInfo.noSeparator || (nInfo.numSeps === 1)) { checked.CAPACITY_PWR = nInfo.numI.replace(',', '.'); checked.CAPACITY_UNIT = 'HP'; }
              else { errors.push({ message: 'Não foi possível interpretar a capacidade frigorífica' }) }
            }
            else if (['tr'].includes(unidade)) {
              if (nInfo.noSeparator || (nInfo.numSeps === 1)) { checked.CAPACITY_PWR = nInfo.numI.replace(',', '.'); checked.CAPACITY_UNIT = 'TR'; }
              else { errors.push({ message: 'Não foi possível interpretar a capacidade frigorífica' }) }
            }
            else if (['kw'].includes(unidade)) {
              if (nInfo.noSeparator || (nInfo.numSeps === 1)) { checked.CAPACITY_PWR = nInfo.numI.replace(',', '.'); checked.CAPACITY_UNIT = 'kW'; }
              else { errors.push({ message: 'Não foi possível interpretar a capacidade frigorífica' }) }
            }
            else if (['btu-hr','btu-h','btu','btuhr','btuh'].includes(unidade)) {
              // TODO: para BTU, verificar que é maior que 1000, ignorando a pontuação de milhar
              if (nInfo.noSeparator || nInfo.looks1sepBtu) { checked.CAPACITY_PWR = nInfo.numI.replace(/[\.,]/, ''); checked.CAPACITY_UNIT = 'BTU/hr'; }
              else { errors.push({ message: 'Não foi possível interpretar a capacidade frigorífica' }) }
            }
            else {
              errors.push({ message: 'Capacidade frigorífica com unidade desconhecida' });
            }
          }
        }
      }
    }

    if (inRow.GROUP_NAME !== undefined) {
      checked.GROUP_NAME = inRow.GROUP_NAME || null;
      if (checked.GROUP_NAME && !checked.UNIT_NAME) {
        checked.GROUP_NAME = null;
        errors.push({ message: 'É necessário informar a unidade da máquina' });
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

export function checkNumber (input: string) {
  // TODO: para todos os números, se tiver . e , conferir se os da esquerda são milhares e o único da direita é decimal(inRow.PHOTO_1)
  if (!input) return null;
  const matched = input.match(/^([\d,\.]+)( *([^ ]+))?$/)
  if (!matched) return null;
  const [, numI,, unidade] = matched;
  const seps = [];
  for (let i = 0; i < numI.length; i++) {
    if (numI[i] >= '0' && numI[i] <= '9') { } // digit
    else { seps.push(numI[i]) }
  }
  const tokens = numI.split(/([^\d]+)/);
  const noSeparator = (seps.length === 0);
  const looks1sepBtu = (seps.length === 1) && (!!numI.match(/^\d+[\.,]\d\d\d$/)) && (tokens[0].length <= 3);
  // const looks1sepDec = (seps.length === 1) && (!!numI.match(/^\d+[\.,]\d*$/)) && (tokens[2].length !== 3);
  return { numI, unidade, noSeparator, looks1sepBtu, numSeps: seps.length };
}

function parseFileRows (file: Buffer) {
  const lines = parseXlsx(file);
  if (lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => (x || '').toString().trim());
  const col_DAC_ID = headers.indexOf(inputColumns.DAC_ID.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_GROUP_NAME = headers.indexOf(inputColumns.GROUP_NAME.label);
  const col_AUTOM_ENABLE = headers.indexOf(inputColumns.AUTOM_ENABLE.label);
  const col_DAC_APPL = headers.indexOf(inputColumns.DAC_APPL.label);
  const col_FLUID_TYPE = headers.indexOf(inputColumns.FLUID_TYPE.label);
  const col_P0_SENSOR = headers.indexOf(inputColumns.P0_SENSOR.label);  
  const col_P1_SENSOR = headers.indexOf(inputColumns.P1_SENSOR.label);
  const col_P0_POSITN = headers.indexOf(inputColumns.P0_POSITN.label);
  const col_P1_POSITN = headers.indexOf(inputColumns.P1_POSITN.label);
  const col_DAC_TYPE = headers.indexOf(inputColumns.DAC_TYPE.label);
  const col_CAPACITY_PWR = headers.indexOf(inputColumns.CAPACITY_PWR.label);
  const col_CAPACITY_UNIT = headers.indexOf(inputColumns.CAPACITY_UNIT.label);
  const col_DAC_COP = headers.indexOf(inputColumns.DAC_COP.label);
  const col_DAC_KW = headers.indexOf(inputColumns.DAC_KW.label);
  const col_DAC_ENV = headers.indexOf(inputColumns.DAC_ENV.label);
  const col_DAC_BRAND = headers.indexOf(inputColumns.DAC_BRAND.label);
  const col_DAC_MODEL = headers.indexOf(inputColumns.DAC_MODEL.label);
  const col_DAC_DESC = headers.indexOf(inputColumns.DAC_DESC.label);
  const col_DAC_NAME = headers.indexOf(inputColumns.DAC_NAME.label);
  const col_DAC_MODIF = headers.indexOf(inputColumns.DAC_MODIF.label);
  const col_DAC_COMIS = headers.indexOf(inputColumns.DAC_COMIS.label);
  const col_PHOTO_1 = headers.indexOf(inputColumns.PHOTO_1.label);
  const col_PHOTO_2 = headers.indexOf(inputColumns.PHOTO_2.label);
  const col_PHOTO_3 = headers.indexOf(inputColumns.PHOTO_3.label);
  const col_PHOTO_4 = headers.indexOf(inputColumns.PHOTO_4.label);
  const col_PHOTO_5 = headers.indexOf(inputColumns.PHOTO_5.label);

  if (col_DAC_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.DAC_ID.label}`).HttpStatus(400);
  const tableCols = ['DAC_ID'];
  if (col_UNIT_NAME >= 0) tableCols.push('UNIT_NAME');
  if (col_GROUP_NAME >= 0) tableCols.push('GROUP_NAME');
  if (col_AUTOM_ENABLE >= 0) tableCols.push('AUTOM_ENABLE');
  if (col_DAC_APPL >= 0) tableCols.push('DAC_APPL');
  if (col_FLUID_TYPE >= 0) tableCols.push('FLUID_TYPE');
  if (col_P0_SENSOR >= 0) tableCols.push('P0_SENSOR');
  if (col_P1_SENSOR >= 0) tableCols.push('P1_SENSOR');
  if (col_P0_POSITN >= 0) tableCols.push('P0_POSITN');
  if (col_P1_POSITN >= 0) tableCols.push('P1_POSITN');
  if (col_DAC_TYPE >= 0) tableCols.push('DAC_TYPE');
  if (col_CAPACITY_PWR >= 0) tableCols.push('CAPACITY_PWR');
  if (col_CAPACITY_UNIT >= 0) tableCols.push('CAPACITY_UNIT');
  if (col_DAC_COP >= 0) tableCols.push('DAC_COP');
  if (col_DAC_KW >= 0) tableCols.push('DAC_KW');
  if (col_DAC_ENV >= 0) tableCols.push('DAC_ENV');
  if (col_DAC_BRAND >= 0) tableCols.push('DAC_BRAND');
  if (col_DAC_MODEL >= 0) tableCols.push('DAC_MODEL');
  if (col_DAC_DESC >= 0) tableCols.push('DAC_DESC');
  if (col_DAC_NAME >= 0) tableCols.push('DAC_NAME');
  if (col_DAC_MODIF >= 0) tableCols.push('DAC_MODIF');
  if (col_DAC_COMIS >= 0) tableCols.push('DAC_COMIS');
  if (col_PHOTO_1 >= 0) tableCols.push('PHOTO_1');
  if (col_PHOTO_2 >= 0) tableCols.push('PHOTO_2');
  if (col_PHOTO_3 >= 0) tableCols.push('PHOTO_3');
  if (col_PHOTO_4 >= 0) tableCols.push('PHOTO_4');
  if (col_PHOTO_5 >= 0) tableCols.push('PHOTO_5');


  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    tableRows.push({
      key: `${i}/${Date.now()}`,
      DAC_ID: getCellValue(cols, col_DAC_ID),
      AUTOM_ENABLE: getCellValue(cols, col_AUTOM_ENABLE) as 'S'|'N',
      UNIT_NAME: getCellValue(cols, col_UNIT_NAME),
      GROUP_NAME: getCellValue(cols, col_GROUP_NAME),
      DAC_APPL: getCellValue(cols, col_DAC_APPL),
      FLUID_TYPE: getCellValue(cols, col_FLUID_TYPE),
      P0_SENSOR: getCellValue(cols, col_P0_SENSOR),
      P1_SENSOR: getCellValue(cols, col_P1_SENSOR),
      P0_POSITN: getCellValue(cols, col_P0_POSITN),
      P1_POSITN: getCellValue(cols, col_P1_POSITN),
      DAC_TYPE: getCellValue(cols, col_DAC_TYPE),
      CAPACITY_PWR: getCellValue(cols, col_CAPACITY_PWR),
      CAPACITY_UNIT: getCellValue(cols, col_CAPACITY_UNIT),
      DAC_COP: getCellValue(cols, col_DAC_COP),
      DAC_KW: getCellValue(cols, col_DAC_KW),
      DAC_ENV: getCellValue(cols, col_DAC_ENV),
      DAC_BRAND: getCellValue(cols, col_DAC_BRAND),
      DAC_MODEL: getCellValue(cols, col_DAC_MODEL),
      DAC_DESC: getCellValue(cols, col_DAC_DESC),
      DAC_NAME: getCellValue(cols, col_DAC_NAME),
      DAC_MODIF: getCellValue(cols, col_DAC_MODIF),
      DAC_COMIS: getCellValue(cols, col_DAC_COMIS),
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
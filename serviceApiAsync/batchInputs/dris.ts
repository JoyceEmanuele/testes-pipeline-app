import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, PROFILECODES } from '../../srcCommon/helpers/permissionControl'
import axios from 'axios'
import { uploadDriImage } from '../devsPictures'
import { setMachineCurrentAutomation } from '../clientData/machines'

export const inputColumns = {
  UNIT_NAME: { 
    label: 'Unidade',
    exampleList: ['RJ001', 'RJ002', 'RJ003', 'RJ004', 'RJ004', 'RJ005', 'RJ006', 'RJ007'],
  },
  APPLICATION: {
    label: 'Aplicação',
    exampleList: ['Carrier ECOSPLIT', 'Medidor de Energia', 'Medidor de Energia', 'Medidor de Energia', 'Medidor de Energia', 'VAV', 'VAV', 'Fancoil'],
  },
  DRI_ID: {
    label: 'ID DRI',
    exampleList: ['DRI001220001', 'DRI001220002', 'DRI001220003', 'DRI001220004', 'DRI001220005', 'DRI001220006', 'DRI001220007', 'DRI001220008'],
  },
  GROUP: {
    label: 'Máquina',
    exampleList: ['Splitão - Salão de Vendas', '', '', '', '', 'Máquina VAV 1', 'Máquina VAV 2', 'Máquina Fancoil 1'],
  },
  ROOM: {
    label: 'Ambiente Monitorado VAV',
    exampleList: ['', '', '', '', '', 'Corredor VAV', 'Sala VAV', 'Sala Fancoil']
  },
  ENERGY_METER_SERIAL: {
    label: 'N. Série Medidor',
    exampleList: ['', '2021130', '16040885', '12011176', '42013479', '', '', ''],
  },
  ENERGY_METER_MODEL: {
    label: 'Modelo Medidor',
    exampleList: ['', 'ET330', 'Nexus II', 'ETE-30', 'EM210', '', '', ''],
  },
  THERM_MANUF: {
    label: 'Fabricante do Termostato',
    exampleList: ['', '', '', '', '', 'Beca Smart', 'Beca Smart', 'Beca Smart'],
  },
  THERM_MODEL: {
    label: 'Modelo do Termostato',
    exampleList: ['', '', '', '', '', 'BAC-2000', 'BAC-6000', 'BAC-6000 AMLN']
  },
  VALVE_MANUF: {
    label: 'Fabricante do Atuador',
    exampleList: ['', '', '', '', '', 'Trox', 'Belimo', 'Trox'],
  },
  VALVE_MODEL: {
    label: 'Modelo do Atuador',
    exampleList: ['', '', '', '', '', 'M466ES3', 'M466ES3', 'M466ES3'],
  },
  VALVE_TYPE: {
    label: 'Tipo do Atuador',
    exampleList: ['', '', '', '', '', 'Válvula Proporcional 0-10V', 'Válvula Proporcional 0-10V', 'Válvula Fixa On-Off'],
  },
  BOX_MANUF: {
    label: 'Fabricante da Caixa VAV',
    exampleList: ['', '', '', '', '', 'Trox', 'Belimo', ''],
  },
  BOX_MODEL: {
    label: 'Modelo da Caixa VAV',
    exampleList: ['', '', '', '', '', 'TVZ D-250', 'TVZ D-250', ''],
  },
  FANCOIL_MANUF: {
    label: 'Fabricante do Fancoil',
    exampleList: ['', '', '', '', '', '', '', 'Air Quality'],
  },
  FANCOIL_MODEL: {
    label: 'Modelo do Fancoil',
    exampleList: ['', '', '', '', '', '', '', 'ILQ-S-15-V3-ESQ'],
  },
  TC_CAPACITY: {
    label: 'Capacidade TC (A)',
    exampleList: ['', '200', '', '', '200', '', '', ''],
  },
  INSTALLATION_TYPE: {
    label: 'Tipo de Instalação Elétrica',
    exampleList: ['', 'Rede Bifásica', '', '', 'Rede Bifásica', '', '', ''],
  },
  TELEMETRY_INTERVAL: {
    label: 'Intervalo de Envio (s)',
    exampleList: ['10', '60', '60', '60', '60', '15', '15', '60'],
  },
  PHOTO_1: { label: 'Foto 1', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_2: { label: 'Foto 2', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_3: { label: 'Foto 3', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_4: { label: 'Foto 4', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_5: { label: 'Foto 5', exampleList: ['https://s3.amazonaws.com/...'] },
}

httpRouter.privateRoutes['/check-client-dris-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const reqParams = req.body;
  const clientId = Number(reqParams.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { /* OK */ }
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403)

  const dris = parseFileRows(file);

  const opts = await availableOptions(session, clientId);
  const list = [];
  for (let i = 0; i < dris.length; i++) {
    const row = dris[i];
    list.push(await parseInputRow(row, `${i}/${Date.now()}`, opts, clientId));
  }

  return { list };
}

httpRouter.privateRoutes['/add-client-dris-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.dris) throw Error('Missing parameter: dris').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageDevs) { /* OK */ }
  else if (session.permissions.MANAGE_UNOWNED_DEVS) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403)

  const opts = await availableOptions(session, reqParams.CLIENT_ID);

  const added = [] as httpRouter.ApiResps['/add-client-dris-batch']['added'];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.dris) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      if (getNormalized(checked.APPLICATION) === getNormalized('Medidor de Energia')) {
        await httpRouter.privateRoutes['/energy/set-energy-info']({
          SERIAL: checked.ENERGY_METER_SERIAL,
          MANUFACTURER: 'Diel Energia',
          MODEL: checked.ENERGY_METER_MODEL,
          DRI_ID: checked.DRI_ID,
          CLIENT_ID: reqParams.CLIENT_ID,
          UNIT_ID: checked.UNIT_ID,
        }, session);

        added.push({ key: row.key, driId: checked.DRI_ID, driCfg: { application: checked.APPLICATION, meterModel: checked.ENERGY_METER_MODEL, telemetryInterval: checked.TELEMETRY_INTERVAL, capacityTc: checked.TC_CAPACITY, installationType: checked.INSTALLATION_TYPE }});
      }
      if (getNormalized(checked.APPLICATION) === getNormalized('Carrier ECOSPLIT')) {
        await httpRouter.privateRoutes['/dri/set-dri-info']({
          DRI_ID: checked.DRI_ID,
          UNIT_ID: checked.UNIT_ID,
          CLIENT_ID: reqParams.CLIENT_ID,
        }, session);
        const driInfo = await sqldb.DRIS.getBasicInfo({driId: checked.DRI_ID});
        await setMachineCurrentAutomation(checked.GROUP_ID, checked.DRI_ID, session.user);
        if (checked.GROUP) await sqldb.DRIS_AUTOMATIONS.w_insert({ MACHINE_ID: checked.GROUP_ID, DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, session.user);

        added.push({ key: row.key, driId: checked.DRI_ID, driCfg: { application: checked.APPLICATION, telemetryInterval: checked.TELEMETRY_INTERVAL }});
      }
      if (getNormalized(checked.APPLICATION) === getNormalized('VAV')) {
        await httpRouter.privateRoutes['/dri/set-dri-info']({
          DRI_ID: checked.DRI_ID,
          UNIT_ID: checked.UNIT_ID,
          CLIENT_ID: reqParams.CLIENT_ID,
        }, session);
        const driInfo = await sqldb.DRIS.getBasicInfo({driId: checked.DRI_ID});
        await setMachineCurrentAutomation(checked.GROUP_ID, checked.DRI_ID, session.user);
        if (checked.GROUP) await await sqldb.DRIS_AUTOMATIONS.w_insert({ MACHINE_ID: checked.GROUP_ID, DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, session.user);

        await httpRouter.privateRoutes['/dri/update-dri-vav']({
          VAV_ID: checked.DRI_ID,
          THERM_MANUF: checked.THERM_MANUF,
          THERM_MODEL: checked.THERM_MODEL,
          VALVE_MANUF: checked.VALVE_MANUF,
          VALVE_MODEL: checked.VALVE_MODEL,
          BOX_MANUF: checked.BOX_MANUF,
          BOX_MODEL: checked.BOX_MODEL,
          ROOM_NAME: checked.ROOM,
        }, session);

        added.push({ key: row.key, driId: checked.DRI_ID, driCfg: { application: checked.APPLICATION, vavModel: checked.THERM_MODEL, telemetryInterval: checked.TELEMETRY_INTERVAL } });
      }
  
      if (row.PHOTO_1 != null && row.DRI_ID) {
        checked.PHOTO_1 = row.PHOTO_1 || null;
        const image = await axios.get(checked.PHOTO_1, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDriImage(image, row.DRI_ID, session, reqParams)
      }

      if (row.PHOTO_2 != null && row.DRI_ID) {
        checked.PHOTO_2 = row.PHOTO_2 || null;
        const image = await axios.get(checked.PHOTO_2, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDriImage(image, row.DRI_ID, session, reqParams)
      }

      if (row.PHOTO_3 != null && row.DRI_ID) {
        checked.PHOTO_3 = row.PHOTO_3 || null;
        const image = await axios.get(checked.PHOTO_3, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDriImage(image, row.DRI_ID, session, reqParams)
      }

      if (row.PHOTO_4 != null && row.DRI_ID) {
        checked.PHOTO_4 = row.PHOTO_4 || null;
        const image = await axios.get(checked.PHOTO_4, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDriImage(image, row.DRI_ID, session, reqParams)
      }

      if (row.PHOTO_5 != null && row.DRI_ID) {
        checked.PHOTO_5 = row.PHOTO_5 || null;
        const image = await axios.get(checked.PHOTO_5, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadDriImage(image, row.DRI_ID, session, reqParams)
      }

    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }

  return { added, ignored };
}

interface AvailableOptions {
  units: { value: number, label: string, norms: string[] }[]
  groups: { value: number, label: string, norms: string[], unit: number }[]
  energyModels: { MODEL_ID: number, MANUFACTURER_ID: number, NAME: string, norms: string[] }[]
  vavs: { value: string, label: string, type: string, norms: string[] }[]
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-dris-batch']>[0]['dris'][0];
async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number) {
  const checked: TableRow = {
    key,
    UNIT_NAME: null,
    APPLICATION: null,
    DRI_ID: null,
    GROUP: null,
    ROOM: null,
    ENERGY_METER_SERIAL: null,
    ENERGY_METER_MODEL: null,
    THERM_MANUF: null,
    THERM_MODEL: null,
    VALVE_MANUF: null,
    VALVE_MODEL: null,
    BOX_MANUF: null,
    BOX_MODEL: null,
    TC_CAPACITY: null,
    INSTALLATION_TYPE: null,
    TELEMETRY_INTERVAL: null,
  }
  const errors = [] as { message: string }[];
  let unitId: number = null;
  let groupId: number;

  try {
    checked.DRI_ID = inRow.DRI_ID || null;
    if (!checked.DRI_ID) errors.push({ message: 'É necessário informar o ID do DRI' });

    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DRI_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `Dispositivo já associado a outro cliente` });
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

    if (inRow.APPLICATION) {
      if (['Carrier ECOSPLIT', 'Medidor de Energia', 'VAV'].map((x) => getNormalized(x)).includes(getNormalized(inRow.APPLICATION))) {
        checked.APPLICATION = inRow.APPLICATION;
      } else {
        errors.push({ message: 'Aplicação não disponível para upload em planilha' });
      }
    }

    if ([getNormalized('Carrier ECOSPLIT'), getNormalized('VAV')].includes(getNormalized(checked.APPLICATION))) {
      if (!inRow.GROUP) errors.push({ message: 'Máquina não informada' });
      else if (unitId) {
        const asNorm = getNormalized(inRow.GROUP)
        const found = opts.groups.filter(x1 => (x1.unit === unitId) && x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: 'Máquina não encontrada na unidade' });
        } else {
          checked.GROUP = inRow.GROUP;
          groupId = found[0].value;
        }
      } else if (inRow.UNIT_NAME) {
        errors.push({ message: 'Máquina não encontrada na unidade' });
      } else {
        errors.push({ message: 'Máquina não encontrada na unidade' });
      }
      if (getNormalized(checked.APPLICATION) === getNormalized('VAV')) {
        if (!inRow.ROOM) errors.push({ message: 'Ambiente monitorado não informado' });
        checked.ROOM = inRow.ROOM;
        if (inRow.THERM_MANUF) {
          const asNorm = getNormalized(inRow.THERM_MANUF);
          const found = opts.vavs.find((opt) => opt.type === 'THERM_MANUF' && opt.norms.some((norm) => norm === asNorm));
          if (found) checked.THERM_MANUF = found.label;
          else errors.push({ message: 'Opção de fabricante de termostato VAV não encontrada' });
        }
        if (['BAC-2000', 'BAC-6000'].includes(inRow.THERM_MODEL)) {
          checked.THERM_MODEL = inRow.THERM_MODEL;
        } else errors.push({ message: 'Opção de modelo de termostato VAV não encontrada' });
        if (inRow.VALVE_MANUF) {
          const asNorm = getNormalized(inRow.VALVE_MANUF);
          const found = opts.vavs.find((opt) => opt.type === 'VALVE_MANUF' && opt.norms.some((norm) => norm === asNorm));
          if (found) checked.VALVE_MANUF = found.label;
          else errors.push({ message: 'Opção de fabricante de atuador VAV não encontrada' });
        }
        checked.VALVE_MODEL = inRow.VALVE_MODEL;
        if (inRow.BOX_MANUF) {
          const asNorm = getNormalized(inRow.BOX_MANUF);
          const found = opts.vavs.find((opt) => opt.type === 'BOX_MANUF' && opt.norms.some((norm) => norm === asNorm));
          if (found) checked.BOX_MANUF = found.label;
          else errors.push({ message: 'Opção de fabricante de caixa VAV não encontrada' });
        }
        checked.BOX_MODEL = inRow.BOX_MODEL;
      }
    }

    if (getNormalized(checked.APPLICATION) === getNormalized('Medidor de Energia')) {
      if (inRow.ENERGY_METER_SERIAL) {
        checked.ENERGY_METER_SERIAL = inRow.ENERGY_METER_SERIAL;
      }
      if (inRow.ENERGY_METER_MODEL && opts.energyModels.find((model) => model.norms.includes(getNormalized(inRow.ENERGY_METER_MODEL)))) {
        checked.ENERGY_METER_MODEL = inRow.ENERGY_METER_MODEL;
      } else errors.push({ message: 'Modelo não informado ou não encontrado para a aplicação "Medidor de Energia"' });

      if (inRow.TC_CAPACITY && Number(inRow.TC_CAPACITY)) {
        checked.TC_CAPACITY = inRow.TC_CAPACITY;
      }

      if (inRow.INSTALLATION_TYPE) {
        checked.INSTALLATION_TYPE = inRow.INSTALLATION_TYPE;
      }
    }

    if (inRow.TELEMETRY_INTERVAL && Number(inRow.TELEMETRY_INTERVAL)) checked.TELEMETRY_INTERVAL = inRow.TELEMETRY_INTERVAL

    if (inRow.PHOTO_1 !== undefined) checked.PHOTO_1 = inRow.PHOTO_1 || null;

    if (inRow.PHOTO_2 !== undefined) checked.PHOTO_2 = inRow.PHOTO_2 || null;

    if (inRow.PHOTO_3 !== undefined) checked.PHOTO_3 = inRow.PHOTO_3 || null;

    if (inRow.PHOTO_4 !== undefined) checked.PHOTO_4 = inRow.PHOTO_4 || null;

    if (inRow.PHOTO_5 !== undefined) checked.PHOTO_5 = inRow.PHOTO_5 || null;
  
  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { key, ...checked, UNIT_ID: unitId, GROUP_ID: groupId, errors }
}


async function availableOptions (session: SessionData, clientId: number): Promise<AvailableOptions> {
  const opts = await httpRouter.privateRoutes['/dev/dev-info-combo-options']({
    CLIENT_ID: clientId,
    units: true,
    groups: true,
    vavs: true,
  }, session);

  const energyOpts = await httpRouter.privateRoutes['/energy/get-energy-combo-opts']({}, session);
  const dielManufInfo = energyOpts.manufacturersList.find((x) => x.NAME === 'Diel Energia');
  const filteredModels = energyOpts.modelsList.filter((x) => x.MANUFACTURER_ID === dielManufInfo.MANUFACTURER_ID);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    groups: opts.groups.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    energyModels: filteredModels.map(x => ({ ...x, norms: [getNormalized(x.NAME)] })),
    vavs: opts.vavs.map((x) => ({ ...x, norms: [getNormalized(x.label)] })),
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
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_APPLICATION = headers.indexOf(inputColumns.APPLICATION.label);
  const col_DRI_ID = headers.indexOf(inputColumns.DRI_ID.label);
  const col_GROUP = headers.indexOf(inputColumns.GROUP.label);
  const col_ROOM = headers.indexOf(inputColumns.ROOM.label);
  const col_ENERGY_METER_SERIAL = headers.indexOf(inputColumns.ENERGY_METER_SERIAL.label);
  const col_ENERGY_METER_MODEL = headers.indexOf(inputColumns.ENERGY_METER_MODEL.label);
  const col_THERM_MANUF = headers.indexOf(inputColumns.THERM_MANUF.label);
  const col_THERM_MODEL = headers.indexOf(inputColumns.THERM_MODEL.label);
  const col_VALVE_MANUF = headers.indexOf(inputColumns.VALVE_MANUF.label);
  const col_VALVE_MODEL = headers.indexOf(inputColumns.VALVE_MODEL.label);
  const col_BOX_MANUF = headers.indexOf(inputColumns.BOX_MANUF.label);
  const col_BOX_MODEL = headers.indexOf(inputColumns.BOX_MODEL.label);
  const col_TC_CAPACITY = headers.indexOf(inputColumns.TC_CAPACITY.label);
  const col_INSTALLATION_TYPE = headers.indexOf(inputColumns.INSTALLATION_TYPE.label);
  const col_TELEMETRY_INTERVAL = headers.indexOf(inputColumns.TELEMETRY_INTERVAL.label);
  const col_PHOTO_1 = headers.indexOf(inputColumns.PHOTO_1.label);
  const col_PHOTO_2 = headers.indexOf(inputColumns.PHOTO_2.label);
  const col_PHOTO_3 = headers.indexOf(inputColumns.PHOTO_3.label);
  const col_PHOTO_4 = headers.indexOf(inputColumns.PHOTO_4.label);
  const col_PHOTO_5 = headers.indexOf(inputColumns.PHOTO_5.label);

  if (col_UNIT_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_NAME.label}`).HttpStatus(400);
  if (col_APPLICATION < 0) throw Error(`Coluna não encontrada: ${inputColumns.APPLICATION.label}`).HttpStatus(400);
  if (col_DRI_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.DRI_ID.label}`).HttpStatus(400);
  if (col_GROUP < 0) throw Error(`Coluna não encontrada: ${inputColumns.GROUP.label}`).HttpStatus(400);
  if (col_ENERGY_METER_SERIAL < 0) throw Error(`Coluna não encontrada: ${inputColumns.ENERGY_METER_SERIAL.label}`).HttpStatus(400);
  if (col_ENERGY_METER_MODEL < 0) throw Error(`Coluna não encontrada: ${inputColumns.ENERGY_METER_MODEL.label}`).HttpStatus(400);
  if (col_THERM_MANUF < 0) throw Error(`Coluna não encontrada: ${inputColumns.THERM_MANUF.label}`).HttpStatus(400);
  if (col_THERM_MODEL < 0) throw Error(`Coluna não encontrada: ${inputColumns.THERM_MODEL.label}`).HttpStatus(400);
  if (col_VALVE_MANUF < 0) throw Error(`Coluna não encontrada: ${inputColumns.VALVE_MANUF.label}`).HttpStatus(400);
  if (col_VALVE_MODEL < 0) throw Error(`Coluna não encontrada: ${inputColumns.VALVE_MODEL.label}`).HttpStatus(400);
  if (col_BOX_MANUF < 0) throw Error(`Coluna não encontrada: ${inputColumns.BOX_MANUF.label}`).HttpStatus(400);
  if (col_BOX_MODEL < 0) throw Error(`Coluna não encontrada: ${inputColumns.BOX_MODEL.label}`).HttpStatus(400);
  if (col_TC_CAPACITY < 0) throw Error(`Coluna não encontrada: ${inputColumns.TC_CAPACITY.label}`).HttpStatus(400);
  if (col_INSTALLATION_TYPE < 0) throw Error(`Coluna não encontrada: ${inputColumns.INSTALLATION_TYPE.label}`).HttpStatus(400);
  if (col_TELEMETRY_INTERVAL < 0) throw Error(`Coluna não encontrada: ${inputColumns.TELEMETRY_INTERVAL.label}`).HttpStatus(400);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    tableRows.push({
      key: `${i}/${Date.now()}`,
      UNIT_NAME: cols[col_UNIT_NAME],
      APPLICATION: cols[col_APPLICATION],
      DRI_ID: cols[col_DRI_ID],
      GROUP: cols[col_GROUP],
      ROOM: cols[col_ROOM],
      ENERGY_METER_SERIAL: cols[col_ENERGY_METER_SERIAL],
      ENERGY_METER_MODEL: cols[col_ENERGY_METER_MODEL],
      THERM_MANUF: cols[col_THERM_MANUF],
      THERM_MODEL: cols[col_THERM_MODEL],
      VALVE_MANUF: cols[col_VALVE_MANUF],
      VALVE_MODEL: cols[col_VALVE_MODEL],
      BOX_MANUF: cols[col_BOX_MANUF],
      BOX_MODEL: cols[col_BOX_MODEL],
      TC_CAPACITY: cols[col_TC_CAPACITY],
      INSTALLATION_TYPE: cols[col_INSTALLATION_TYPE],
      TELEMETRY_INTERVAL: cols[col_TELEMETRY_INTERVAL],
      PHOTO_1: cols[col_PHOTO_1],
      PHOTO_2: cols[col_PHOTO_2],
      PHOTO_3: cols[col_PHOTO_3],
      PHOTO_4: cols[col_PHOTO_4],
      PHOTO_5: cols[col_PHOTO_5],
    });
  }

  return tableRows;
}

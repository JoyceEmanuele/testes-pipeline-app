import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx, { createXlsx } from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, getUserGlobalPermissions, PROFILECODES } from '../../srcCommon/helpers/permissionControl'
import axios from 'axios'
import { newUploadAssetImage, uploadMachineImage } from '../devsPictures'
import { realocateManufacturerDevice } from '../clientData/machines'
import servConfig from '../../configfile'
import * as s3Helper from '../../srcCommon/s3/connectS3'

export const inputColumns = {
  UNIT_NAME: { 
    label: 'Unidade', 
    example: 'Filial Laranjeiras', 
    exampleList: ['Filial Laranjeiras', 'Filial Laranjeiras', '', 'Filial Laranjeiras', 'Filial Laranjeiras', 'Filial Laranjeiras', 'Filial Laranjeiras', '', 'Filial Laranjeiras', '', 'Filial Laranjeiras', '', 'Filial Laranjeiras'] 
  },
  GROUP_ID: {
    label: 'ID da Máquina',
    example: '1111',
    exampleList: ['1111', '1111', '', '2222', '2222', '2222', '2222', '', '2222', '', '3333', '', '4444']
  },
  GROUP_NAME: {
    label: 'Máquina',
    example: 'Split Piso Teto Recepcao',
    exampleList: ['Split Piso Teto Recepcao', 'Split Piso Teto Recepcao', '', 'Splitão 15TR', 'Splitão 15TR', 'Splitão 15TR', 'Splitão 15TR', '', 'Splitão 15TR', '', 'Self 10TR', '', 'Rooftop 25TR']
  },
  INSTALLATION_DATE: { label: 
    'Máquina Instalada em', 
    example: '01/01/2022', 
    exampleList: ['01/01/2022', '01/01/2022', '', '01/01/2022', '01/01/2022', '01/01/2022', '01/01/2022', '', '01/01/2022', '', '01/01/2022', '', '01/01/2022'] 
  },
  MCHN_APPL: { 
    label: 'Aplicação', 
    example: 'Ar Condicionado', 
    exampleList: ['Ar Condicionado', 'Ar Condicionado', '', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', '', 'Ar Condicionado', '', 'Ar Condicionado', '', 'Ar Condicionado']
  },
  GROUP_TYPE: { 
    label: 'Tipo de Equipamento', 
    example: 'Split piso teto', 
    exampleList: ['Split piso teto', 'Split piso teto', '', 'Splitão', 'Splitão', 'Splitão', 'Splitão', '', 'Splitão', '', 'Self', '', 'Rooftop',]
  },
  MCHN_BRAND: { 
    label: 'Fabricante', 
    example: 'York', 
    exampleList: ['York', 'York', '', 'Hitachi', 'Hitachi', 'Hitachi', 'Hitachi', '', 'Hitachi', '', 'Carrier', '', 'Carrier']
  },
  FLUID_TYPE: { 
    label: 'Fluido', 
    example: 'R410A', 
    exampleList: ['R410A', 'R410A', '', 'R410A', 'R410A', 'R410A', 'R410A', '', 'R410A', '', 'R407C', '', 'R407C']
  },
  PHOTO_1: { label: 'Foto 1', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_2: { label: 'Foto 2', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_3: { label: 'Foto 3', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_4: { label: 'Foto 4', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_5: { label: 'Foto 5', exampleList: ['https://s3.amazonaws.com/...'] },
  DEV_AUTOM_ID: { 
    label: 'Dispositivo de Automação', 
    example: 'DAM301220000', 
    exampleList: ['DAM301220000', 'DAM301220000', '', 'DAM301220001', 'DAM301220001', 'DAM301220001', 'DAM301220001', '', 'DUT301220000', '', 'DAM301220002', '', 'DAM301220003'] 
  },
  DUT_ID: { 
    label: 'DUT de Referência',
    example: 'DUT122220000', 
    exampleList: ['DUT301220000', 'DUT301220000', '', 'DUT301220001', 'DUT301220001', 'DUT301220001', 'DUT301220001', '', '', '', 'DUT301220002', '', 'DUT301220003'] 
  },
  DAT_ID: { 
    label: 'ID Ativo', 
    example: 'DAT122220000', 
    exampleList: ['DAT122220000', 'DAT122220001', '', 'DAT122220003', 'DAT122220004', 'DAT122220005', 'DAT122220006', '', 'DAT122220007', '', 'DAT122220008', '', 'DAT122220009']
  },
  AST_DESC: { 
    label: 'Nome do Ativo',
    example: 'Split Piso Teto Recepção - CD01', 
    exampleList: ['Split Piso Teto Recepção - CD01', 'Split Piso Teto Recepção - EV01', '', 'Splitão 15TR - CD01', 'Splitão 15TR - CD02', 'Splitão 15TR - Trocador', 'Splitão 15TR - Ventilador', '', 'Splitão 15TR - EV01', '', 'Self 10TR', '', 'Rooftop 25TR'] 
  },
  INSTALLATION_LOCATION: {
    label: 'Local de Instalação',
    example: 'Sala A',
    exampleList: ['Sala de reunião', 'Sala de reunião', '', 'Salão A', 'Salão A', 'Salão A', 'Salão A', '', 'Salão A', '', 'Salão B', '', 'Salão C',]
  },
  AST_ROLE_NAME: { 
    label: 'Função',
    example: 'Condensadora',
    exampleList: ['Condensadora', 'Evaporadora', '', 'Condensadora', 'Condensadora', 'Evaporadora', 'Evaporadora', '', 'Evaporadora', '', 'Condensadora', '', 'Condensadora']
  },
  MCHN_MODEL: {
    label: 'Modelo',
    example: '2TTK0518G1000AA',
    exampleList: ['2TTK0518G1000AA', '2TTK0518G1000AB', '', 'RAP075', 'RAP075', 'RTC150', 'RVT150', '', 'RVT150', '', '40BR12', '', '50TC25']
  },
  CAPACITY_PWR: { 
    label: 'Capacidade Frigorífica',
    example: '36000',
    exampleList: ['36000', '-', '', '90000', '90000', '-', '-', '', '-', '', '120000', '', '280000']
  },
  CAPACITY_UNIT: {
    label: 'Unidade da Cap.Frig.',
    example: 'BTU/h', 
    exampleList: ['BTU/h', 'BTU/h', '', 'BTU/h', 'BTU/h', 'BTU/h', 'BTU/h', '', 'BTU/h', '', 'BTU/h', '', 'BTU/h']
  },
  MCHN_KW: { 
    label: 'Potência Nominal do Ativo [kW]', 
    example: '12', 
    exampleList: ['12', '-', '', '12', '12', '-', '-', '20', '-', '', '', '50']
  },
  DEV_ID: { 
    label: 'Dispositivo Diel associado ao ativo', 
    example: 'DAC401220000', 
    exampleList: ['DAC401220000', '-', '', 'DAC401220001', 'DAC401220002', '-', '-', '', 'DUT301220000 (INS/DUO)', '', 'DAC401220003', '', 'DAC401220004']
  },
  DAC_COMIS: {
    label: 'Comissionado (S/N)',
    example: 'S', 
    exampleList: ['S', 'N']
  },
  PHOTO_6: { label: 'Foto 6', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_7: { label: 'Foto 7', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_8: { label: 'Foto 8', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_9: { label: 'Foto 9', exampleList: ['https://s3.amazonaws.com/...'] },
  PHOTO_10: { label: 'Foto 10', exampleList: ['https://s3.amazonaws.com/...'] },
}


/*
Sempre que adicionar novas funcionalidades na planilha, atualizar o guia da planilha no S3.
*/

httpRouter.privateRoutes['/get-assets-sheet-manual'] = async function (reqParams, session , { res }) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) throw Error('Permission denied!').HttpStatus(403);
  try {
    const key = 'documents/GuiaPreliminarDaPlanilhaDeAtivos.pdf'
    const object = await s3Helper.getItemS3(servConfig.filesBucketPrivate, key);

    res.attachment(key);
    const fileStream = object.Body;
    res.contentType("application/pdf");
    fileStream.pipe(res);
  }
  catch(err){
    logger.info('Error getting pdf' + err.toString());
    throw Error('Error getting pdf').HttpStatus(500);
  }

  return res;
}


httpRouter.privateRoutes['/check-client-assets-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const body = req.body;
  const clientId = Number(body.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const { tableRows, tableCols } = parseFileRows(file);

  const opts = await availableOptions(session, clientId);
  const list = [];

  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    const isEmptyRow = Object.keys(row).every(value => value === 'key' || row[value as keyof TableRow] == null);
    if (!isEmptyRow) {
      list.push(await parseInputRow(row, row.key, opts, clientId));
    }
  }

  return { list, tableCols };
}

httpRouter.privateRoutes['/export-client-assets-batch-input'] = async function (reqParams, session, { res }) {
  const clientId = reqParams.CLIENT_ID && Number(reqParams.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const unitId = reqParams.UNIT_ID && Number(reqParams.UNIT_ID);
  if (!unitId) throw Error('Missing parameter: UNIT_ID').HttpStatus(400);
  const unitInfo = unitId && await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: unitId, CLIENT_ID: clientId });
  if (!unitInfo) throw Error('Unidade não encontrada').HttpStatus(400);

  const assetsList = await sqldb.ASSETS.getListBatchInput({ unitIds: [unitId] });

  const data: (string|number)[][] = [
    [
      inputColumns.UNIT_NAME.label,
      inputColumns.GROUP_ID.label,
      inputColumns.GROUP_NAME.label,
      inputColumns.INSTALLATION_DATE.label,
      inputColumns.MCHN_APPL.label,
      inputColumns.GROUP_TYPE.label,
      inputColumns.MCHN_BRAND.label,
      inputColumns.FLUID_TYPE.label,
      inputColumns.DEV_AUTOM_ID.label,
      inputColumns.DUT_ID.label,
      inputColumns.DAT_ID.label,
      inputColumns.AST_DESC.label,
      inputColumns.INSTALLATION_LOCATION.label,
      inputColumns.AST_ROLE_NAME.label,
      inputColumns.MCHN_MODEL.label,
      inputColumns.CAPACITY_PWR.label,
      inputColumns.CAPACITY_UNIT.label,
      inputColumns.MCHN_KW.label,
      inputColumns.DEV_ID.label,
    ]
  ];
  for (const row of assetsList) {
    const devsFromAsset = await sqldb.ASSETS.getDevsClientAssets({DAT_ID: row.DAT_CODE})
    data.push([
      row.UNIT_NAME,
      row.MACHINE_ID,
      row.MACHINE_NAME,
      row.MACHINE_INSTALLATION_DATE,
      row.MACHINE_APPLICATION,
      row.MACHINE_TYPE,
      row.MACHINE_BRAND,
      row.MACHINE_FLUID_TYPE,
      row.MACHINE_DEV_AUT,
      row.MACHINE_DUT_ID,
      row.DAT_CODE,
      row.ASSET_NAME,
      row.ASSET_ROLE_NAME,
      row.ASSET_INSTALLATION_LOCATION,
      row.ASSET_MODEL,
      row.ASSET_CAPACITY_POWER,
      row.ASSET_CAPACITY_UNIT,
      row.MACHINE_KW,
      devsFromAsset.length > 0 ? devsFromAsset[0].DEV_ID : null,
    ]);

    for (let i = 1; i < devsFromAsset.length; i++){
      data.push([
        row.UNIT_NAME,
        row.MACHINE_ID,
        row.MACHINE_NAME,
        row.MACHINE_INSTALLATION_DATE,
        row.MACHINE_APPLICATION,
        row.MACHINE_TYPE,
        row.MACHINE_BRAND,
        row.MACHINE_FLUID_TYPE,
        row.MACHINE_DEV_AUT,
        row.MACHINE_DUT_ID,
        row.DAT_CODE,
        row.ASSET_NAME,
        row.ASSET_INSTALLATION_LOCATION,
        row.ASSET_ROLE_NAME,
        row.ASSET_MODEL,
        row.ASSET_CAPACITY_POWER,
        row.ASSET_CAPACITY_UNIT,
        row.MACHINE_KW,
        devsFromAsset[i].DEV_ID,
      ]);
    }
  }

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('Content-Disposition', 'attachment; filename="Maquinas.xlsx"');
  res.append('filename', `Maquinas.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

httpRouter.privateRoutes['/add-client-assets-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.assets) throw Error('Missing parameter: assets').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  let clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const clientUnits = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  let opts = await availableOptions(session, reqParams.CLIENT_ID);

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.assets) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DAT_ID });
      if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== reqParams.CLIENT_ID) {
        if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
          // OK, dispositivo está associado a um fabricante
        } else {
          ignored.push({ key: checked.key, reason: 'Datid já associado a outro cliente' });
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
          }
          UNIT_ID = UNIT_IDs[0].UNIT_ID;
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

      // Adicione tipo de grupo se não existir
      if (checked.GROUP_TYPE) {
        const asNorm = getNormalized(checked.GROUP_TYPE)
        let found = opts.types.filter(x1 => (x1.value === checked.GROUP_TYPE) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length === 0) {
          await sqldb.AV_OPTS.w_insert({
            OPT_TYPE: 'TIPO',
            OPT_ID: `tipo-${asNorm}`,
            OPT_LABEL: checked.GROUP_TYPE,
            TAGS: null,
          }, session.user);
          opts = await availableOptions(session, reqParams.CLIENT_ID);
          found = opts.types.filter(x1 => (x1.value === checked.GROUP_TYPE) || x1.norms.some(x2 => x2 === asNorm));
          if (found.length !== 1) {
            ignored.push({ key: checked.key, reason: 'Não foi possível adicionar o tipo de máquina' });
            continue;
          }
        }
        if (found.length === 1) {
          checked.GROUP_TYPE = found[0].value;
        } else {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de máquina' });
          continue;
        }
      }

      let MACHINE_ID = undefined;
      //Validando se existe o ID da máquina
      let MACHINE_IDs = null;
      if (checked.GROUP_ID) {
        MACHINE_IDs = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: [Number(checked.GROUP_ID)] });
        if (MACHINE_IDs.length === 0) {
          ignored.push({ key: checked.key, reason: 'Não foi possível encontrar a máquina correspondente a esse ID' });
        }
      }

      if (row.GROUP_NAME !== undefined) {
        if (row.GROUP_NAME) {
          if (!UNIT_ID) {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
            continue;
          }
          const normMachineName = getNormalized(row.GROUP_NAME);
          let MACHINE_NAMEs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normMachineName));

          if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
            MACHINE_IDs = [MACHINE_NAMEs[0]];
          }

          let devAut = undefined;

          let installationFormatted = undefined;
   
          if (row.DEV_AUTOM_ID){
            devAut = row.DEV_AUTOM_ID;
          }

          if (row.INSTALLATION_DATE){
            installationFormatted = `${row.INSTALLATION_DATE.substring(6,10)}-${row.INSTALLATION_DATE.substring(3,5)}-${row.INSTALLATION_DATE.substring(0,2)}`
          }

          // Associar dispositivo à unidade caso seja fabricante
          await realocateManufacturerDevice(
            reqParams.CLIENT_ID,
            UNIT_ID,
            {
              DEV_AUT: devAut || null,
            },
            session);
          
          
          if (MACHINE_IDs != null && MACHINE_IDs?.length === 1) {
            MACHINE_ID = MACHINE_IDs[0].MACHINE_ID;
            await httpRouter.privateRoutes['/clients/edit-group']({
              GROUP_ID: Number(MACHINE_ID),
              GROUP_NAME: row.GROUP_NAME,
              REL_DEV_AUT: devAut,
              REL_DUT_ID: row.DUT_ID,
              INSTALLATION_DATE: installationFormatted,
              GROUP_TYPE: row.GROUP_TYPE,
              BRAND: row.MCHN_BRAND,
              FLUID_TYPE: row.FLUID_TYPE,
              MCHN_APPL: row.MCHN_APPL,
            }, session);
          }
          //Validar se o MACHINE_ID não existe e se o nome também não existe
          else if (MACHINE_IDs == null && MACHINE_NAMEs.length === 0) {
            const inserted = await httpRouter.privateRoutes['/dac/add-new-group']({
              CLIENT_ID: reqParams.CLIENT_ID,
              UNIT_ID: UNIT_ID,
              GROUP_NAME: row.GROUP_NAME,
              INSTALLATION_DATE: installationFormatted,
              MCHN_APPL: row.MCHN_APPL,
              GROUP_TYPE: row.GROUP_TYPE,
              BRAND: row.MCHN_BRAND,
              FLUID_TYPE: row.FLUID_TYPE,
              REL_DUT_ID: devAut && devAut.startsWith('DUT') ? devAut : row.DUT_ID,
              DEV_AUT: devAut,
            }, session);
            MACHINE_ID = inserted.GROUP_ID;
            clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
            MACHINE_IDs = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: [Number(MACHINE_ID)] });            

            if (MACHINE_ID == null || MACHINE_ID == undefined) {
              ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a máquina' });
              continue;
            }
          }
          else if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
            ignored.push({ key: checked.key, reason: 'Já existe uma máquina com esse nome na unidade' });
          }

          else {
            ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
            continue;
          }
        }
      }

      // Upload group column
      if (row.PHOTO_1 != null && MACHINE_ID) {
        checked.PHOTO_1 = row.PHOTO_1 || null;
        const image = await axios.get(checked.PHOTO_1, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadMachineImage(image, MACHINE_ID, session, reqParams)
      }
      if (row.PHOTO_2 != null && MACHINE_ID) {
        checked.PHOTO_2 = row.PHOTO_2 || null;
        const image = await axios.get(checked.PHOTO_2, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadMachineImage(image, MACHINE_ID, session, reqParams)
      }
      if (row.PHOTO_3 != null && MACHINE_ID) {
        checked.PHOTO_3 = row.PHOTO_3 || null;
        const image = await axios.get(checked.PHOTO_3, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadMachineImage(image, MACHINE_ID, session, reqParams)
      }
      if (row.PHOTO_4 != null && MACHINE_ID) {
        checked.PHOTO_4 = row.PHOTO_4 || null;
        const image = await axios.get(checked.PHOTO_4, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadMachineImage(image, MACHINE_ID, session, reqParams)
      }
      if (row.PHOTO_5 != null && MACHINE_ID) {
        checked.PHOTO_5 = row.PHOTO_5 || null;
        const image = await axios.get(checked.PHOTO_5, { responseType: 'arraybuffer' }).then((res) => res.data)
        await uploadMachineImage(image, MACHINE_ID, session, reqParams)
      }

      // Upload dat column

      if (row.DAT_ID) {

        const assetInfo = await sqldb.ASSETS.getAssetByDatCode({ DAT_CODE: row.DAT_ID });
        if (!assetInfo) throw Error('Asset not found').HttpStatus(400);
  
        if (row.PHOTO_6 != null && row.DAT_ID) {
          checked.PHOTO_6 = row.PHOTO_6 || null;
          const image = await axios.get(checked.PHOTO_6, { responseType: 'arraybuffer' }).then((res) => res.data)
          await newUploadAssetImage(image, assetInfo.ASSET_ID, session, reqParams)
        }
  
        if (row.PHOTO_7 != null && row.DAT_ID) {
          checked.PHOTO_7 = row.PHOTO_7 || null;
          const image = await axios.get(checked.PHOTO_7, { responseType: 'arraybuffer' }).then((res) => res.data)
          await newUploadAssetImage(image, assetInfo.ASSET_ID, session, reqParams)
        }
  
        if (row.PHOTO_8 != null && row.DAT_ID) {
          checked.PHOTO_8 = row.PHOTO_8 || null;
          const image = await axios.get(checked.PHOTO_8, { responseType: 'arraybuffer' }).then((res) => res.data)
          await newUploadAssetImage(image, assetInfo.ASSET_ID, session, reqParams)
        }
  
        if (row.PHOTO_9 != null && row.DAT_ID) {
          checked.PHOTO_9 = row.PHOTO_9 || null;
          const image = await axios.get(checked.PHOTO_9, { responseType: 'arraybuffer' }).then((res) => res.data)
          await newUploadAssetImage(image, assetInfo.ASSET_ID, session, reqParams)
        }
  
        if (row.PHOTO_10 != null && row.DAT_ID) {
          checked.PHOTO_10 = row.PHOTO_10 || null;
          const image = await axios.get(checked.PHOTO_10, { responseType: 'arraybuffer' }).then((res) => res.data)
          await newUploadAssetImage(image, assetInfo.ASSET_ID, session, reqParams)
        }
      }
      
      const nInfo_MCHN_KW = checked.MCHN_KW && checkNumber(checked.MCHN_KW);
      const nInfo_CAPACITY_PWR = checked.CAPACITY_PWR && checkNumber(checked.CAPACITY_PWR);
      const allRoles = await sqldb.VTMACHINETYPES.getAllMachineTypes();

      const roleAux = allRoles.find(role => role.NAME === checked.AST_ROLE_NAME);

      // Se for diferente de iluminação deve tentar adicionar ativo independente de ter preenchido DAT_ID, para forçar erro
      if (checked.DAT_ID || checked.MCHN_APPL !== 'iluminacao') {
        const currentAssetInfo = await sqldb.ASSETS.getBasicInfo({ DAT_CODE: checked.DAT_ID });
  
        if (currentAssetInfo) { }
        else {
          if (checked.DEV_ID?.startsWith('DUT')) {
            const [dutId, placement] = checked.DEV_ID.split(' ');
            if (dutId?.length !== 12) {
              ignored.push({ key: row.key, reason: 'DUT ID do Dispositivo Diel associado ao ativo inválido' });
              continue;
            }
            const placementType = placement?.match(/INS|DUO/gi)[0];
            if (!placementType) {
              ignored.push({ key: row.key, reason: 'Posicionamento do DUT Dispositivo Diel associado ao ativo inválido' });
              continue;
            }
            await httpRouter.privateRoutes['/dut/set-dut-info']({
              DEV_ID: dutId,
              CLIENT_ID: reqParams.CLIENT_ID,
              UNIT_ID: UNIT_ID,
              PLACEMENT: placementType as 'INS'|'DUO',
              groups: MACHINE_ID && [MACHINE_ID.toString()],
            }, session);
          }

          const addedItem = await httpRouter.privateRoutes['/clients/add-new-asset']({
            DAT_ID: checked.DAT_ID,
            AST_DESC: checked.AST_DESC,
            INSTALLATION_LOCATION: checked.INSTALLATION_LOCATION,
            CAPACITY_PWR: nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
            CAPACITY_UNIT: checked.CAPACITY_UNIT,
            CLIENT_ID: reqParams.CLIENT_ID,
            GROUP_ID: MACHINE_ID,
            MCHN_KW: nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
            MCHN_MODEL: checked.MCHN_MODEL,
            UNIT_ID: UNIT_ID,
            AST_ROLE: roleAux.ID,
            DEV_ID: checked.DEV_ID?.startsWith('DUT') ? checked.DEV_ID.split(' ')[0] : checked.DEV_ID,
          }, session);
        }
  
        if (checked.DEV_ID?.startsWith('DAC')){
          await httpRouter.privateRoutes['/dac/set-dac-info']({
            DAC_ID: checked.DEV_ID,
            GROUP_ID: MACHINE_ID,
            CLIENT_ID: reqParams.CLIENT_ID,
            UNIT_ID: UNIT_ID,
            SELECTED_L1_SIM: "virtual",
          }, session)
        }
      }
      added.push({ key: row.key });
    } catch (err) {
      logger.error(err);
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
  roles:  { value: string, label: string, norms: string[] }[]
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
    roles: true,
  }, session);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    fluids: opts.fluids.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    applics: opts.applics.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    types: opts.types.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    envs: opts.envs.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    brands: opts.brands.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    roles: opts.roles.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
  }
}

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-assets-batch']>[0]['assets'][0];
async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number) {
  const checked: TableRow = {
    key,
    DAT_ID: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.DAT_ID = inRow.DAT_ID || null;
    checked.GROUP_NAME = inRow.GROUP_NAME || null;
    checked.UNIT_NAME = inRow.UNIT_NAME || null;
    
    if (inRow.MCHN_APPL !== undefined) {
      checked.MCHN_APPL = null;
      if (inRow.MCHN_APPL) {
        const asNorm = getNormalized(inRow.MCHN_APPL)
        const found = opts.applics.filter(x1 => (x1.value === inRow.MCHN_APPL) || x1.norms.some(x2 => x2 === asNorm));
        if (found.length !== 1) {
          errors.push({ message: `Aplicação inválida: ${inRow.MCHN_APPL}` });
        } else {
          checked.MCHN_APPL = found[0].value;
        }
      }
    }

    if (!checked.DAT_ID && checked.MCHN_APPL !== 'iluminacao') errors.push({ message: 'É necessário informar o ID do Ativo' });
    if (!checked.GROUP_NAME) errors.push({ message: 'É necessário informar o Nome da Máquina' });
    if (!checked.UNIT_NAME) errors.push({ message: 'É necessário informar o Nome da Unidade' });

    if (inRow.GROUP_ID === '-') inRow.GROUP_ID = null;
    if (inRow.MCHN_BRAND === '-') inRow.MCHN_BRAND = null;
    if (inRow.MCHN_MODEL === '-') inRow.MCHN_MODEL = null;
    if (inRow.AST_DESC === '-') inRow.AST_DESC = null;
    if (inRow.INSTALLATION_DATE === '-') inRow.INSTALLATION_DATE = null;
    if (inRow.AST_ROLE_NAME === '-') inRow.AST_ROLE_NAME = null;
    if (inRow.INSTALLATION_LOCATION === '-') inRow.INSTALLATION_LOCATION = null;
    if (inRow.DEV_AUTOM_ID === '-') inRow.DEV_AUTOM_ID = null;
    if (inRow.DUT_ID === '-') inRow.DUT_ID= null;
    if (inRow.DEV_ID === '-') inRow.DEV_ID = null;
    if (inRow.DAC_COMIS === '-') inRow.DAC_COMIS = null;
    if (inRow.CAPACITY_PWR === '-') inRow.CAPACITY_PWR = null;
    if (inRow.MCHN_KW === '-') inRow.MCHN_KW = null;

    if (inRow.GROUP_ID !== undefined) checked.GROUP_ID = inRow.GROUP_ID || null;
    if (inRow.MCHN_BRAND !== undefined) checked.MCHN_BRAND = inRow.MCHN_BRAND || null;
    if (inRow.MCHN_MODEL !== undefined) checked.MCHN_MODEL = inRow.MCHN_MODEL || null;
    if (inRow.AST_DESC !== undefined) checked.AST_DESC = inRow.AST_DESC || null;
    if (inRow.INSTALLATION_DATE !== undefined) checked.INSTALLATION_DATE = inRow.INSTALLATION_DATE || null;
    if (inRow.AST_ROLE_NAME !== undefined) checked.AST_ROLE_NAME = inRow.AST_ROLE_NAME || null;
    if (inRow.INSTALLATION_LOCATION !== undefined) checked.INSTALLATION_LOCATION = inRow.INSTALLATION_LOCATION || null;
    if (inRow.DEV_AUTOM_ID !== undefined) checked.DEV_AUTOM_ID = inRow.DEV_AUTOM_ID || null;
    if (inRow.DUT_ID !== undefined) checked.DUT_ID = inRow.DUT_ID || null;
    if (inRow.DEV_ID !== undefined) checked.DEV_ID = inRow.DEV_ID || null;
    if (inRow.DAC_COMIS !== undefined) checked.DAC_COMIS = inRow.DAC_COMIS || null;

    if (inRow.PHOTO_1 !== undefined) checked.PHOTO_1 = inRow.PHOTO_1 || null;
    if (inRow.PHOTO_2 !== undefined) checked.PHOTO_2 = inRow.PHOTO_2 || null;
    if (inRow.PHOTO_3 !== undefined) checked.PHOTO_3 = inRow.PHOTO_3 || null;
    if (inRow.PHOTO_4 !== undefined) checked.PHOTO_4 = inRow.PHOTO_4 || null;
    if (inRow.PHOTO_5 !== undefined) checked.PHOTO_5 = inRow.PHOTO_5 || null;
    if (inRow.PHOTO_6 !== undefined) checked.PHOTO_6 = inRow.PHOTO_6 || null;
    if (inRow.PHOTO_7 !== undefined) checked.PHOTO_7 = inRow.PHOTO_7 || null;
    if (inRow.PHOTO_8 !== undefined) checked.PHOTO_8 = inRow.PHOTO_8 || null;
    if (inRow.PHOTO_9 !== undefined) checked.PHOTO_9 = inRow.PHOTO_9 || null;
    if (inRow.PHOTO_10 !== undefined) checked.PHOTO_10 = inRow.PHOTO_10 || null;

    if (inRow.GROUP_NAME && inRow.GROUP_NAME.length > 250) errors.push({message: "O Nome da Máquina não pode ter mais de 250 caracteres."})

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
    if (inRow.GROUP_TYPE !== undefined) {
      checked.GROUP_TYPE = null;
      if (inRow.GROUP_TYPE) {
        const asNormGroup = getNormalized(inRow.GROUP_TYPE)
        const foundGroup = opts.types.filter(x1 => (x1.value === inRow.GROUP_TYPE) || x1.norms.some(x2 => x2 === asNormGroup));
        if (foundGroup.length !== 1) {
          errors.push({ message: `Tipo de máquina inválida: ${inRow.GROUP_TYPE}` });
        } else {
          checked.GROUP_TYPE = foundGroup[0].value;
        }
      }
    }

    // Group id para validação de dispositivos
    const clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [clientId] });
    const normMachineName = getNormalized(inRow.GROUP_NAME);
    const asNorm = getNormalized(inRow.UNIT_NAME)
    const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
    const unitId = found.length > 0 ? found[0].value : null;
    const MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === unitId) && (getNormalized(row2.MACHINE_NAME) === normMachineName));
    const machineIdCurrent = MACHINE_IDs.length > 0 ? MACHINE_IDs[0].MACHINE_ID : null;

    if (inRow.DEV_ID != null) {
      if (inRow.DEV_ID.startsWith('DAC')) {
        const dev = await sqldb.DACS_DEVICES.getBasicInfo({DAC_ID: inRow.DEV_ID});
        if (!dev) {
          errors.push({ message: 'Dispositivo não cadastrado!' });
        }
        else {
          if (dev.MACHINE_ID){
            if (dev.MACHINE_ID !== machineIdCurrent) {
              errors.push({ message: 'Dispositivo já associado à uma outra máquina!' });
            }
          }
        }
      }
      if (inRow.DEV_ID.startsWith('DUT')) {
        const [dutId, placement] = inRow.DEV_ID.split(' ');
        if (dutId?.length !== 12 || !placement) {
          errors.push({ message: 'Formato DUT ID do Dispositivo Diel associado ao ativo inválido' });
        }
      }
    }

    if (inRow.DEV_AUTOM_ID != null) {
      const dutAut = inRow.DEV_AUTOM_ID.includes('DUT') ? inRow.DEV_AUTOM_ID : undefined;
      const damAut = inRow.DEV_AUTOM_ID.includes('DAM') ? inRow.DEV_AUTOM_ID : undefined;
      const driAut = inRow.DEV_AUTOM_ID.includes('DRI') ? inRow.DEV_AUTOM_ID : undefined;
      const dev = await sqldb.DEVICES.getBasicInfo({devId: inRow.DEV_AUTOM_ID});

      if (!dev){
        errors.push({ message: 'Dispositivo de automação não cadastrado!' });
      }
      if (driAut) { } 
      else{
        const machine = await sqldb.MACHINES.getListWithDamDut({ DEV_AUT: damAut, DUT_ID: dutAut }, {});
  
        if (machine.length > 0) {
          if (machine[0].MACHINE_ID !== machineIdCurrent) {
            errors.push({ message: 'Dispositivo de automação já associado à uma outra máquina!' });
          }
        }
      }
    }

    if (inRow.DUT_ID != null){
      const dev = await sqldb.DEVICES.getBasicInfo({devId: inRow.DUT_ID});

      if (!dev){
        errors.push({ message: 'DUT de referência não cadastrado!' });
      }
    }

    if (checked.MCHN_APPL !== 'iluminacao') {
      if (!inRow.AST_ROLE_NAME) errors.push({ message: 'A função do equipamento não foi fornecida.' });
      if (!inRow.AST_DESC) errors.push({ message: 'A descrição do ativo não foi fornecida.' });
    }


    if (inRow.AST_ROLE_NAME !== undefined) {
      checked.AST_ROLE_NAME = null;
      if (inRow.AST_ROLE_NAME) {
        const asNormRole = getNormalized(inRow.AST_ROLE_NAME)
        const foundRole = opts.roles.filter(x1 => (x1.value === inRow.AST_ROLE_NAME) || x1.norms.some(x2 => x2 === asNormRole));
        if (foundRole.length !== 1) {
          errors.push({ message: `Função de equipamento inválida: ${inRow.AST_ROLE_NAME}` });
        } else {
          checked.AST_ROLE_NAME = foundRole[0].label;
        }
      }
    }

    if (inRow.MCHN_BRAND !== undefined) {
      checked.MCHN_BRAND = (inRow.MCHN_BRAND && inRow.MCHN_BRAND.trim()) || null;
      if (checked.MCHN_BRAND) {
        const asNormBrand = getNormalized(checked.MCHN_BRAND)
        const foundBrand = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNormBrand));
        if (foundBrand.length === 1) {
          // OK
        }
        else if (foundBrand.length === 0) {
          // OK, will be added
        }
        else {
          errors.push({ message: `Não foi possível identificar a marca` });
        }
      }
    }

    if (inRow.MCHN_KW !== undefined) {
      checked.MCHN_KW = null;
      if (inRow.MCHN_KW) {
        const nInfo = checkNumber(inRow.MCHN_KW);
        if (!nInfo) {
          errors.push({ message: 'Potência nominal inválida' });
        } else if (nInfo.unidade && nInfo.unidade.toLowerCase() !== 'kw') {
          errors.push({ message: 'Unidade da potência nominal inválida. Precisa ser "kW"' });
        }
        else if (nInfo.noSeparator || (nInfo.numSeps === 1)) {
          checked.MCHN_KW = nInfo.numI.replace(',', '.');
        }
        else {
          errors.push({ message: 'Não foi possível interpretar a potência nominal' });
        }
      }
    }

    if (inRow.DUT_ID != null && inRow.DEV_AUTOM_ID!= null){
      if (inRow.DEV_AUTOM_ID.includes('DUT') && (inRow.DUT_ID !== inRow.DEV_AUTOM_ID)){
        errors.push({message: 'O dispositivo de automação não pode ser diferente do DUT de referência' });
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

  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }

  return { key, ...checked, errors }
}

export function checkNumber (input: string) {
  // TODO: para todos os números, se tiver . e , conferir se os da esquerda são milhares e o único da direita é decimal
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
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_GROUP_NAME = headers.indexOf(inputColumns.GROUP_NAME.label);
  const col_GROUP_ID = headers.indexOf(inputColumns.GROUP_ID.label);
  const col_INSTALLATION_DATE = headers.indexOf(inputColumns.INSTALLATION_DATE.label);
  const col_MCHN_APPL = headers.indexOf(inputColumns.MCHN_APPL.label);
  const col_GROUP_TYPE = headers.indexOf(inputColumns.GROUP_TYPE.label);
  const col_MCHN_BRAND = headers.indexOf(inputColumns.MCHN_BRAND.label);
  const col_FLUID_TYPE = headers.indexOf(inputColumns.FLUID_TYPE.label);
  const col_DEV_AUTOM_ID = headers.indexOf(inputColumns.DEV_AUTOM_ID.label);
  const col_DUT_ID = headers.indexOf(inputColumns.DUT_ID.label);
  const col_DAT_ID = headers.indexOf(inputColumns.DAT_ID.label);
  const col_AST_DESC = headers.indexOf(inputColumns.AST_DESC.label);
  const col_AST_ROLE_NAME = headers.indexOf(inputColumns.AST_ROLE_NAME.label);
  const col_INSTALLATION_LOCATION = headers.indexOf(inputColumns.INSTALLATION_LOCATION.label);
  const col_MCHN_MODEL = headers.indexOf(inputColumns.MCHN_MODEL.label);
  const col_CAPACITY_PWR = headers.indexOf(inputColumns.CAPACITY_PWR.label);
  const col_CAPACITY_UNIT = headers.indexOf(inputColumns.CAPACITY_UNIT.label);
  const col_MCHN_KW = headers.indexOf(inputColumns.MCHN_KW.label);
  const col_DEV_ID = headers.indexOf(inputColumns.DEV_ID.label);
  const col_DAC_COMIS = headers.indexOf(inputColumns.DAC_COMIS.label);
  const col_PHOTO_1 = headers.indexOf(inputColumns.PHOTO_1.label);
  const col_PHOTO_2 = headers.indexOf(inputColumns.PHOTO_2.label);
  const col_PHOTO_3 = headers.indexOf(inputColumns.PHOTO_3.label);
  const col_PHOTO_4 = headers.indexOf(inputColumns.PHOTO_4.label);
  const col_PHOTO_5 = headers.indexOf(inputColumns.PHOTO_5.label);
  const col_PHOTO_6 = headers.indexOf(inputColumns.PHOTO_6.label);
  const col_PHOTO_7 = headers.indexOf(inputColumns.PHOTO_7.label);
  const col_PHOTO_8 = headers.indexOf(inputColumns.PHOTO_8.label);
  const col_PHOTO_9 = headers.indexOf(inputColumns.PHOTO_9.label);
  const col_PHOTO_10 = headers.indexOf(inputColumns.PHOTO_10.label);

  if (col_UNIT_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.UNIT_NAME.label}`).HttpStatus(400);
  if (col_GROUP_NAME < 0) throw Error(`Coluna não encontrada: ${inputColumns.GROUP_NAME.label}`).HttpStatus(400);
  const tableCols = ['UNIT_NAME', 'GROUP_NAME', 'DAT_ID', 'AST_DESC'];
  if (col_GROUP_ID >= 0) tableCols.push('GROUP_ID');
  if (col_INSTALLATION_DATE >= 0) tableCols.push('INSTALLATION_DATE');
  if (col_MCHN_APPL >= 0) tableCols.push('MCHN_APPL');
  if (col_GROUP_TYPE >= 0) tableCols.push('GROUP_TYPE');
  if (col_MCHN_BRAND >= 0) tableCols.push('MCHN_BRAND');
  if (col_FLUID_TYPE >= 0) tableCols.push('FLUID_TYPE');
  if (col_PHOTO_1 >= 0) tableCols.push('PHOTO_1');
  if (col_PHOTO_2 >= 0) tableCols.push('PHOTO_2');
  if (col_PHOTO_3 >= 0) tableCols.push('PHOTO_3');
  if (col_PHOTO_4 >= 0) tableCols.push('PHOTO_4');
  if (col_PHOTO_5 >= 0) tableCols.push('PHOTO_5');
  if (col_DEV_AUTOM_ID >= 0) tableCols.push('DEV_AUTOM_ID');
  if (col_DUT_ID >= 0) tableCols.push('DUT_ID');
  if (col_AST_DESC >= 0) tableCols.push('AST_DESC');
  if (col_AST_ROLE_NAME >= 0) tableCols.push('AST_ROLE_NAME');
  if (col_INSTALLATION_LOCATION >= 0) tableCols.push('INSTALLATION_LOCATION');
  if (col_MCHN_MODEL >= 0) tableCols.push('MCHN_MODEL');
  if (col_CAPACITY_PWR >= 0) tableCols.push('CAPACITY_PWR');
  if (col_CAPACITY_UNIT >= 0) tableCols.push('CAPACITY_UNIT');
  if (col_MCHN_KW >= 0) tableCols.push('MCHN_KW');
  if (col_DEV_ID >= 0) tableCols.push('DEV_ID');
  if (col_DAC_COMIS >= 0) tableCols.push('DAC_COMIS');
  if (col_PHOTO_6 >= 0) tableCols.push('PHOTO_6');
  if (col_PHOTO_7 >= 0) tableCols.push('PHOTO_7');
  if (col_PHOTO_8 >= 0) tableCols.push('PHOTO_8');
  if (col_PHOTO_9 >= 0) tableCols.push('PHOTO_9');
  if (col_PHOTO_10 >= 0) tableCols.push('PHOTO_10');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    tableRows.push({
      key: `${i}/${Date.now()}`,
      UNIT_NAME: getCellValue(cols, col_UNIT_NAME),
      GROUP_NAME: getCellValue(cols, col_GROUP_NAME),
      GROUP_ID: getCellValue(cols, col_GROUP_ID),
      INSTALLATION_DATE: getCellValue(cols, col_INSTALLATION_DATE),
      MCHN_APPL: getCellValue(cols, col_MCHN_APPL),
      GROUP_TYPE: getCellValue(cols, col_GROUP_TYPE),
      MCHN_BRAND: getCellValue(cols, col_MCHN_BRAND),
      FLUID_TYPE: getCellValue(cols, col_FLUID_TYPE),
      PHOTO_1: getCellValue(cols, col_PHOTO_1),
      PHOTO_2: getCellValue(cols, col_PHOTO_2),
      PHOTO_3: getCellValue(cols, col_PHOTO_3),
      PHOTO_4: getCellValue(cols, col_PHOTO_4),
      PHOTO_5: getCellValue(cols, col_PHOTO_5),
      DEV_AUTOM_ID: getCellValue(cols, col_DEV_AUTOM_ID),
      DUT_ID: getCellValue(cols, col_DUT_ID),
      DAT_ID: getCellValue(cols, col_DAT_ID),
      AST_DESC: getCellValue(cols, col_AST_DESC),
      AST_ROLE_NAME: getCellValue(cols, col_AST_ROLE_NAME),
      INSTALLATION_LOCATION: getCellValue(cols, col_INSTALLATION_LOCATION),
      MCHN_MODEL: getCellValue(cols, col_MCHN_MODEL),
      CAPACITY_PWR: getCellValue(cols, col_CAPACITY_PWR),
      CAPACITY_UNIT: getCellValue(cols, col_CAPACITY_UNIT),
      MCHN_KW: getCellValue(cols, col_MCHN_KW),
      DEV_ID: getCellValue(cols, col_DEV_ID),
      DAC_COMIS: getCellValue(cols, col_DAC_COMIS),
      PHOTO_6: getCellValue(cols, col_PHOTO_6),
      PHOTO_7: getCellValue(cols, col_PHOTO_7),
      PHOTO_8: getCellValue(cols, col_PHOTO_8),
      PHOTO_9: getCellValue(cols, col_PHOTO_9),
      PHOTO_10: getCellValue(cols, col_PHOTO_10),
    });
  }

  return { tableRows, tableCols };
}

export function getCellValue (cols: any[], index: number) {
  if (index < 0) return undefined;
  if (index > cols.length) return null;
  return (cols[index] || '').toString().trim() || null;
}

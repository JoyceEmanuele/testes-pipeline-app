import { getUploadedFile } from '../apiServer/getMultiparFiles'
import * as httpRouter from '../apiServer/httpRouter'
import { getNormalized } from '../../srcCommon/helpers/textNormalization'
import sqldb from '../../srcCommon/db'
import parseXlsx from '../../srcCommon/helpers/parseXlsx'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getPermissionsOnClient, PROFILECODES } from '../../srcCommon/helpers/permissionControl'

export const inputColumns = {
  METER_ID: { label: 'ID do Medidor', exampleList: ['DMA008220090', '08220090'] },
  UNIT_NAME: { label: 'Unidade', exampleList: ['Filial Laranjeiras', 'TAMOIO 123'] },
  SUPPLIER: { label: 'Fabricante', exampleList: ['Diel Energia', 'Laager'] },
  HYDROMETER_MODEL: { label: 'Hidrômetro', exampleList: ['Elster S120 (1 L/pulso)', 'Elster S120 (1 L/pulso)'] },
  INSTALLATION_LOCATION: { label: 'Local de Instalação', exampleList: ['Próximo à caixa d\'agua', 'Em série com o hidrômetro da unidade'] },
  INSTALLATION_DATE: { label: 'Data de Instalação', exampleList: ['17/10/2022', '20/10/2022'] },
  TOTAL_CAPACITY: { label: 'Capacidade Total dos Reservatórios (L)', exampleList: ['2000', '1000'] },
  QUANTITY_OF_RESERVOIRS: { label: 'Total de Reservatórios', exampleList: ['2', '1'] },
}

export const hydrometerModels = ['Elster S120 (1 L/pulso)', 'ZENNER ETKD-P-N (10 L/pulso)', 'ZENNER MTKD-AM-I (10 L/pulso)', 
    'Saga Unijato US-1.5 (1 L/pulso)', 'Saga Unijato US-3.0 (1 L/pulso)', 'Saga Unijato US-5.0 (1 L/pulso)'];
    

httpRouter.privateRoutes['/check-client-dmas-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);

  const reqParams = req.body;
  const clientId = Number(reqParams.CLIENT_ID);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const { tableRows, tableCols } = await parseFileRows(file);

  const opts = await availableOptions(session, clientId);

  const { list: metersList } = await httpRouter.privateRoutes['/laager/get-meters-list']({}, session );
  const { list: allAssociatedMeters } = await httpRouter.privateRoutes['/get-integrations-list/water']({}, session);

  const meters = allAssociatedMeters.filter((meter) => meter.supplier !== 'Diel')
  const associatedMetersId = meters.map((meter) => meter.dataSource);
  const disassociatedMeters = metersList.filter((meter) => !associatedMetersId.includes(meter.customer_id));
  const laagerFreeMeters = disassociatedMeters.map((meter) => 
     meter.customer_id 
  );


  const list = [];
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    list.push(await parseInputRow(row, row.key, opts, clientId, laagerFreeMeters, allAssociatedMeters, session));
  }

  return { list, tableCols };
}


httpRouter.privateRoutes['/add-client-dmas-batch'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.dmas) throw Error('Missing parameter: dmas').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)

  const clientUnits = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  let opts = await availableOptions(session, reqParams.CLIENT_ID);

  const { list: metersList } = await httpRouter.privateRoutes['/laager/get-meters-list']({}, session );
  const { list: allAssociatedMeters } = await httpRouter.privateRoutes['/get-integrations-list/water']({}, session);

  const meters = allAssociatedMeters.filter((meter) => meter.supplier !== 'Diel')
  const associatedMetersId = meters.map((meter) => meter.dataSource);
  const disassociatedMeters = metersList.filter((meter) => !associatedMetersId.includes(meter.customer_id));
  const laagerFreeMeters = disassociatedMeters.map((meter) => 
     meter.customer_id 
  );

  const added = [];
  const ignored: { key: string, reason: string }[] = [];
  for (const row of reqParams.dmas) {
    try {
      const checked = await parseInputRow(row, row.key, opts, reqParams.CLIENT_ID, laagerFreeMeters, allAssociatedMeters, session);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      if(row.METER_ID && row.METER_ID.startsWith("DMA")){
        const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.METER_ID });
        if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== reqParams.CLIENT_ID) {
          if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
            // OK, dispositivo está associado a um fabricante
          } else {
            ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outro cliente' });
            continue;
          }
        }
      }else if(row.METER_ID){

        if(!laagerFreeMeters.includes(row.METER_ID)){
          ignored.push({key: checked.key, reason: `Dispositivo Laager não existe ou já está associado a outro cliente`})
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
            const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.METER_ID })
            if (currentDevInfo && currentDevInfo.UNIT_ID && UNIT_IDs[0].UNIT_ID !== currentDevInfo.UNIT_ID) {
              ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outra unidade deste cliente' });
              continue;
            }
          }

        // validar se unidade ja tem dispositivo associado (1 por unidade)
          const data  = await sqldb.CLUNITS.getUnitIdByUnitName({UNIT_NAME: row.UNIT_NAME, CLIENT_ID: reqParams.CLIENT_ID});
          if(data && data.UNIT_ID){
            const meters = allAssociatedMeters.filter((meter)=> meter.UNIT_ID === data.UNIT_ID);
            if(meters.length !== 0){
              ignored.push({key: checked.key, reason: `Unidade já possui um medidor de água associado`});
              continue;
            }
          }

          UNIT_ID = UNIT_IDs[0].UNIT_ID;
        }
      }
      let installationFormatted = undefined;
      if (row.INSTALLATION_DATE){
        installationFormatted = `${row.INSTALLATION_DATE.substring(6,10)}-${row.INSTALLATION_DATE.substring(3,5)}-${row.INSTALLATION_DATE.substring(0,2)}`;
      }
      if (installationFormatted !== undefined) checked.INSTALLATION_DATE = installationFormatted || null;

      if(row.METER_ID.startsWith("DMA")){
        const addedItem = await httpRouter.privateRoutes['/dma/set-dma-info']({
          CLIENT_ID: reqParams.CLIENT_ID,
          DMA_ID: checked.METER_ID,
          UNIT_ID: UNIT_ID,
          UNIT_NAME: checked.UNIT_NAME,
          HYDROMETER_MODEL: checked.HYDROMETER_MODEL,
          INSTALLATION_LOCATION: checked.INSTALLATION_LOCATION,
          INSTALLATION_DATE: checked.INSTALLATION_DATE,
          TOTAL_CAPACITY: Number(checked.TOTAL_CAPACITY),
          QUANTITY_OF_RESERVOIRS: Number(checked.QUANTITY_OF_RESERVOIRS),
  
        }, session);
      }else{

        const data  = await sqldb.CLUNITS.getUnitIdByUnitName({UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: reqParams.CLIENT_ID});
        if(data && data.UNIT_ID){
          
          await httpRouter.privateRoutes['/laager/set-meter-info']({
            unitId: data.UNIT_ID,
            meterId: checked.METER_ID,
            hydrometerModel: checked.HYDROMETER_MODEL,
            installationLocation: checked.INSTALLATION_LOCATION,
            installationDate: checked.INSTALLATION_DATE,
            totalCapacity: Number(checked.TOTAL_CAPACITY),
            quantityOfReservoirs: Number(checked.QUANTITY_OF_RESERVOIRS),
          }, session)
        }
      }


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

type TableRow = Parameters<typeof httpRouter.privateRoutes['/add-client-dmas-batch']>[0]['dmas'][0];
type Meters = {
  STATE_ID: number// Estado
  STATE_NAME: string
  CITY_ID: string 
  CITY_NAME: string // cidade
  CLIENT_ID: number // Cliente
  CLIENT_NAME: string // Cliente
  UNIT_ID: number // unidade
  UNIT_NAME: string // unidade
  machineName: string // máquina
  roomName: string // ambiente
  vertical: string // vertical (energia, hvac, água)
  supplier: 'Diel'|'NESS'|'GreenAnt'|'CoolAutomation'|'Laager'
  dataSource: string // fonte de dado (ID-GreenAnt)
  integrId: string
  equipType: string // Tipo (físico, virtual)
  method: string // método (MQTT, api, bucket)
  status: string // status
}[];

async function parseInputRow (inRow: TableRow, key: string, opts: AvailableOptions, clientId: number, laagerFreeMeters:string[], allAssociatedMeters:Meters, session: SessionData) {
  const checked: TableRow = {
    key,
    METER_ID: null,
  }
  const errors = [] as { message: string }[];

  try {
    checked.METER_ID = inRow.METER_ID || null;

    if(inRow.METER_ID && inRow.METER_ID.startsWith("DMA")){
      const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.METER_ID });
      if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
        if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
          // OK, dispositivo está associado a um fabricante
        } else {
          errors.push({ message: `DMA já associado a outro cliente` });
        }
      }
    }else if(inRow.METER_ID){

      if(!laagerFreeMeters.includes(inRow.METER_ID)){
        errors.push({message: `Dispositivo Laager não existe ou já está associado a outro cliente`})
      }
    }

    if (inRow.HYDROMETER_MODEL !== undefined) checked.HYDROMETER_MODEL = inRow.HYDROMETER_MODEL || null;
    if (inRow.SUPPLIER !== undefined) checked.SUPPLIER = inRow.SUPPLIER || null;
    if (inRow.INSTALLATION_LOCATION !== undefined) checked.INSTALLATION_LOCATION = inRow.INSTALLATION_LOCATION || null;
    if (inRow.TOTAL_CAPACITY !== undefined) checked.TOTAL_CAPACITY = inRow.TOTAL_CAPACITY || null;
    if (inRow.QUANTITY_OF_RESERVOIRS !== undefined) checked.QUANTITY_OF_RESERVOIRS = inRow.QUANTITY_OF_RESERVOIRS || null;

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

        // validar se unidade ja tem dispositivo associado (1 por unidade)
        const data  = await sqldb.CLUNITS.getUnitIdByUnitName({UNIT_NAME: inRow.UNIT_NAME, CLIENT_ID: clientId});
        if(data && data.UNIT_ID){
          const meters = allAssociatedMeters.filter((meter)=> meter.UNIT_ID === data.UNIT_ID);
          if(meters.length !== 0){
            errors.push({message: `Unidade já possui um medidor de água associado`});
          }
        }else{
          errors.push({message: `Não foi possível identificar a unidade`});
        }

      }
    }
    

    if (inRow.HYDROMETER_MODEL !== undefined) {
      if (hydrometerModels.map((x) => getNormalized(x)).includes(getNormalized(inRow.HYDROMETER_MODEL))) {
        checked.HYDROMETER_MODEL = inRow.HYDROMETER_MODEL;
      } else {
        errors.push({ message: 'Modelo de hidrômetro não informado ou não encontrado para o DMA' });
      }
    }

    if (inRow.SUPPLIER !== undefined) {
      if (['Diel Energia', 'Laager'].map((x) => getNormalized(x)).includes(getNormalized(inRow.HYDROMETER_MODEL))) {
        checked.HYDROMETER_MODEL = inRow.HYDROMETER_MODEL;
      } else {
        errors.push({ message: 'Fabricante do medidor de água não encontrado' });
      }
    }


    if (inRow.QUANTITY_OF_RESERVOIRS !== undefined) {
      if (Number(inRow.QUANTITY_OF_RESERVOIRS) >= 0) {
        checked.QUANTITY_OF_RESERVOIRS = inRow.QUANTITY_OF_RESERVOIRS;
      } else {
        errors.push({ message: 'A quantidade de reservatórios não pode ser negativa.' });
      }
    }

    if (inRow.TOTAL_CAPACITY !== undefined) {
      if (Number(inRow.TOTAL_CAPACITY) >= 0) {
        checked.TOTAL_CAPACITY = inRow.TOTAL_CAPACITY;
      } else {
        errors.push({ message: 'A capacidade total não pode ser negativa.' });
      }
    }

    if (inRow.INSTALLATION_DATE !== undefined) checked.INSTALLATION_DATE = inRow.INSTALLATION_DATE|| null;

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
  const col_METER_ID = headers.indexOf(inputColumns.METER_ID.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_HYDROMETER_MODEL = headers.indexOf(inputColumns.HYDROMETER_MODEL.label);
  const col_INSTALLATION_LOCATION = headers.indexOf(inputColumns.INSTALLATION_LOCATION.label);
  const col_INSTALLATION_DATE = headers.indexOf(inputColumns.INSTALLATION_DATE.label);
  const col_TOTAL_CAPACITY = headers.indexOf(inputColumns.TOTAL_CAPACITY.label);
  const col_QUANTITY_OF_RESERVOIRS = headers.indexOf(inputColumns.QUANTITY_OF_RESERVOIRS.label);

  if (col_METER_ID < 0) throw Error(`Coluna não encontrada: ${inputColumns.METER_ID.label}`).HttpStatus(400);
  const tableCols = ['METER_ID'];
  if (col_UNIT_NAME >= 0) tableCols.push('UNIT_NAME');
  if (col_HYDROMETER_MODEL >= 0) tableCols.push('HYDROMETER_MODEL');
  if (col_INSTALLATION_LOCATION >= 0) tableCols.push('INSTALLATION_LOCATION');
  if (col_INSTALLATION_DATE >= 0) tableCols.push('INSTALLATION_DATE');
  if (col_TOTAL_CAPACITY >= 0) tableCols.push('TOTAL_CAPACITY');
  if (col_QUANTITY_OF_RESERVOIRS >= 0) tableCols.push('QUANTITY_OF_RESERVOIRS');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if(!getCellValue(cols, col_METER_ID) && !getCellValue(cols, col_UNIT_NAME) && !getCellValue(cols, col_HYDROMETER_MODEL) 
    && !getCellValue(cols, col_INSTALLATION_LOCATION) && !getCellValue(cols, col_INSTALLATION_DATE) && 
    !getCellValue(cols, col_TOTAL_CAPACITY) && !getCellValue(cols, col_QUANTITY_OF_RESERVOIRS)) continue;
    tableRows.push({
      key: `${i}/${Date.now()}`,
      METER_ID: getCellValue(cols, col_METER_ID),
      UNIT_NAME: getCellValue(cols, col_UNIT_NAME),
      HYDROMETER_MODEL: getCellValue(cols, col_HYDROMETER_MODEL),
      INSTALLATION_LOCATION: getCellValue(cols, col_INSTALLATION_LOCATION),
      INSTALLATION_DATE: getCellValue(cols, col_INSTALLATION_DATE),
      TOTAL_CAPACITY: getCellValue(cols, col_TOTAL_CAPACITY),
      QUANTITY_OF_RESERVOIRS: getCellValue(cols, col_QUANTITY_OF_RESERVOIRS),
    });
  }

  return { tableRows, tableCols };
}

export function getCellValue (cols: any[], index: number) {
  if (index < 0) return undefined;
  if (index > cols.length) return null;
  return (cols[index] || '').toString().trim() || null;
}

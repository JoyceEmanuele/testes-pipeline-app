import * as httpRouter from '../apiServer/httpRouter';
import { getAllowedUnitsView, canSeeDevicesWithoutProductionUnit } from '../../srcCommon/helpers/permissionControl';
import sqldb from '../../srcCommon/db';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';

/**
 * @swagger
 * /devices/get-devices-list:
 *   post:
 *     summary: Listar Dispostivos
 *     description: Listar algumas informações dos dispositivos.
 *     tags:
 *       - Devices
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Filtros dos dispositivos
 *         schema:
 *           type: object
 *           properties:
 *             clientIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs dos Clientes
 *               default: []
 *               required: false
 *             unitIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: IDs das Unidades
 *               default: []
 *               required: false
 *             device:
 *               type: string
 *               description: Dispositivos que devem ser retornados ('all'| 'dac' | 'dal' | 'dam' | 'dma' | 'dmt' | 'dri' | 'dut')
 *               default: ""
 *               required: false
 *             cityIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs das Cidades para filtragem
 *               default: []
 *               required: false
 *             stateIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs dos Estados para filtragem
 *               default: []
 *               required: false
 *             searchTerms:
 *               type: array
 *               items:
 *                 type: string
 *               description: Termos para filtragem
 *               default: []
 *               required: false
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *               description: Status para filtragem
 *               default: []
 *               required: false
 *     responses:
 *       200:
 *         description: Array com as informações dos dispositivos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   description: Array com as informações dos dispositivos
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       STATE:
 *                         type: string
 *                         description: Estado em que a unidade do dispositivo se localiza
 *                       CITY_NAME:
 *                         type: string
 *                         description: Cidade em que a unidade do dispositivo se localiza
 *                       CLIENT_ID:
 *                         type: number
 *                         description: ID do Cliente
 *                       CLIENT_NAME:
 *                         type: string
 *                         description: Nome do Cliente
 *                       UNIT_ID:
 *                         type: number
 *                         description: ID do Unidade
 *                       UNIT_NAME:
 *                         type: string
 *                         description: Nome da Unidade
 *                       DEVICE:
 *                         type: string
 *                         description: Tipo do Dispositivo
 *                       DEVICE_CODE:
 *                         type: string
 *                         description: Código do Dispositivo
 *                       STATUS:
 *                         type: string
 *                         description: Status do Dispositivo
 *                       ASSOCIATED:
 *                         type: boolean
 *                         description: Se o dispositivo está associado ou não a uma unidade
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/devices/get-devices-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    const returnCanSeeDevicesWithoutProductionUnit = await canSeeDevicesWithoutProductionUnit(reqParams.clientIds);
    if (returnCanSeeDevicesWithoutProductionUnit) { reqParams.INCLUDE_INSTALLATION_UNIT = true; }
  }
  const qPars = {
    CLIENT_IDS: reqParams.clientIds,
    UNIT_IDS: reqParams.unitIds,
    device: reqParams.device,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
    INCLUDE_UNOWED_DEVS: session.permissions.MANAGE_UNOWNED_DEVS,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
  } as {
    CLIENT_IDS?: number[],
    UNIT_IDS?: number[],
    device?: 'all'| 'dac' | 'dal' | 'dam' | 'dma' | 'dmt' | 'dri' | 'dut',
    INCLUDE_INSTALLATION_UNIT?: boolean,
    INCLUDE_UNOWED_DEVS?: boolean,
  };
  const devsList = [] as {
    STATE: string
    STATE_ID: number
    CITY_NAME: string
    CITY_ID: string
    CLIENT_ID: number
    CLIENT_NAME: string
    UNIT_ID: number
    UNIT_NAME: string
    DEVICE: 'DAC' | 'DAL' | 'DAM' | 'DMA' | 'DMT' | 'DRI' | 'DUT',
    DEVICE_CODE: string
    STATUS: string
    ASSOCIATED: boolean
    MAC?: string
  }[];

  const rows = await sqldb.DEVICES.getDevicesList(qPars);
  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (rows.length <= 500) ? rows.map((x) => x.DEVICE_CODE) : undefined,
  });

  for (const row of rows) {
    const connectionStatus = lastMessagesTimes.connectionStatus(row.DEVICE_CODE) || 'OFFLINE';
    if (reqParams.status && !reqParams.status.includes(connectionStatus)) { continue; }
    if (reqParams.searchTerms && reqParams.searchTerms.length > 0) {
      let shouldNotInclude = false;
      for (const searchTerm of reqParams.searchTerms) {
        if (row.STATE_ID && row.STATE_ID.toString().toLowerCase().includes(searchTerm)) { continue; }
        if (row.CITY_NAME && row.CITY_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.UNIT_NAME && row.UNIT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.CLIENT_NAME && row.CLIENT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (row.DEVICE_CODE && row.DEVICE_CODE.toLowerCase().includes(searchTerm)) { continue; }
        if (connectionStatus && connectionStatus.toLowerCase().includes(searchTerm)) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }

    devsList.push({
      STATE: row.STATE,
      STATE_ID: row.STATE_ID,
      CITY_NAME: row.CITY_NAME,
      CITY_ID: row.CITY_ID,
      CLIENT_ID: row.CLIENT_ID,
      CLIENT_NAME: row.CLIENT_NAME,
      UNIT_ID: row.UNIT_ID,
      UNIT_NAME: row.UNIT_NAME,
      DEVICE: row.TYPE,
      DEVICE_CODE: row.DEVICE_CODE,
      STATUS: connectionStatus,
      ASSOCIATED: !!row.CLIENT_ID,
      MAC: row.MAC,
    });
  }

  return {list: devsList};
}

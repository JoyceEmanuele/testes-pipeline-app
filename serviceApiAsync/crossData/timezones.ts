import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'
import { getOffsetTimezone, sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones';
import { SessionData } from '../../srcCommon/types';
import { logger } from 'elastic-apm-node';
import { ramCaches_TIMEZONES_updatePosixTimezone } from '../realTime/eventHooks';
import * as damEcoEventHooks from '../ecoModeDam/eventHooks'
import * as driAutomationEventHooks from '../driAutomation/eventHooks'

/**
 * @swagger
 * /get-timezones-list:
 *   post:
 *     summary: Timezones
 *     description: Retorna uma lista de fusos horários
 *     tags:
 *       - Timezones
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Lista de fusos horários
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do fuso horário
 *                       area:
 *                         type: string
 *                         description: Área do fuso horário no padrão IANA
 *                 
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/get-timezones-list'] = async function (reqParams, session) {
  const list = await sqldb.TIME_ZONES.selectTimeZones();
  return { list }
}

/**
 * @swagger
 * /get-timezones-list-with-offset:
 *   post:
 *     summary: Timezones
 *     description: Retorna uma lista de fusos horários
 *     tags:
 *       - Timezones
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Lista de fusos horários
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do fuso horário
 *                       area:
 *                         type: string
 *                         description: Área do fuso horário no padrão IANA
 *                       offset:
 *                         type: number
 *                         description: Offset do fuso horário
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/get-timezones-list-with-offset'] = async function (_reqParams, _session) {
  const list = await sqldb.TIME_ZONES.selectTimeZonesWithOffset();
  return { list }
}

/**
 * @swagger
 * /get-timezone-offset-by-devId:
 *   post:
 *     summary: Retorna um Offset em Horas
 *     description: Retorna o offset de um fuso horário a partir do ID de um dispositivo
 *     tags:
 *       - Timezones
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: ID do dispositivo
 *         schema:
 *           type: object
 *           properties:
 *             devId:
 *               type: string
 *               description: Id do dispositivo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Offset
 *         content:
 *           application/json:
 *             schema:
 *               type: number
 *               description: Offset do fuso horário em horas    
 *       400:
 *         description: Faltando parâmetros obrigatórios      
 *       500:
 *         description: Erro interno do servidor
 */
export async function getTimezoneOffsetByDevId(reqParams: { devId: string }, session: SessionData) {
  if (!reqParams?.devId) throw Error('INVALID DATA, missing devId').HttpStatus(400);

  const timezoneInfo = await sqldb.DEVICES.getTimezoneInfoByDev({ devId: reqParams.devId });

  const offsetInfo = timezoneInfo ? getOffsetTimezone({ TIMEZONE_ID: timezoneInfo.TIMEZONE_ID, TIMEZONE_AREA: timezoneInfo.TIMEZONE_AREA, TIMEZONE_OFFSET: timezoneInfo.TIMEZONE_OFFSET }) : 0
  return offsetInfo;
}

httpRouter.privateRoutes['/get-timezone-offset-by-devId'] = getTimezoneOffsetByDevId;

function getOccorenceMonth(date: Date, dayWeek: number) {
  const dayInitial = date.getDate();
  let occorence = 1;
  for (let dateDay = 1; dateDay < dayInitial; dateDay++){
    date.setDate(dateDay);
    let numberDay = date.getDay();
    if (numberDay === dayWeek) {
      occorence++;
    }
  }
  return occorence;
}

/**
 * @swagger
 * /timezone/set-posix:
 *   post:
 *     summary: Altera um posix presente em um timezone de acordo com a data do horario de verão e envia comandos para o dispositivo
 *     description: Altera um posix presente em um timezone de acordo com a data do horario de verão e envia comandos para o dispositivo
 *     tags:
 *       - Timezones
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: ID do dispositivo
 *         schema:
 *           type: object
 *           properties:
 *             dateInitial:
 *               type: string
 *               description: data inicial do horario de verão
 *               default: ""
 *               required: true
 *             dateFinial:
 *               type: string
 *               description: data final do horario de verão
 *               default: ""
 *               required: true
 *             hourInitial:
 *               type: string
 *               description: horario no formato "00:00"
 *               default: ""
 *               required: true
 *             hourFinal:
 *               type: string
 *               description: horario no formato "00:00"
 *               default: ""
 *               required: true
 *             areas:
 *               type: array
 *               items:
 *                 type: number
 *     responses:
 *       200:
 *         description: retorna ok
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios      
 *       500:
 *         description: Erro interno do servidor
 */

export function getSignalOffset(offset: number) {
  let newOffset;
  if (offset) {
    const sinal = Math.sign(offset);
    newOffset = sinal === 1 ? `-${offset}` : Math.abs(offset).toString();
  }
  return newOffset;
}

export async function setPosixRoute(reqParams: { dateInitial: string, dateFinal: string, hourInitial: string, hourFinal: string, areas: number[] }, session: SessionData) {
  if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  if (!reqParams.dateInitial || !reqParams.dateFinal || !reqParams.areas.length) throw Error('Missing params').HttpStatus(400);
  try {
    for (const areaId of reqParams.areas) {
      let newPosix: string;
      let newOffset: string;
      const infoTimezone = await sqldb.TIME_ZONES.getTimezoneAllInfo({ TIMEZONE_ID: areaId });
      if (!infoTimezone) {
        throw Error('Timezone não encontrado').HttpStatus(400);
      }
      newOffset = getSignalOffset(infoTimezone.offset);
      if (infoTimezone.abreviation_zone && infoTimezone.dst_abreviation) {
        newPosix = `${infoTimezone.abreviation_zone}${newOffset}${infoTimezone.dst_abreviation}`
      }
      if (infoTimezone.abreviation_zone && !infoTimezone.dst_abreviation) {
        newPosix = `${infoTimezone.abreviation_zone}${newOffset}${infoTimezone.abreviation_zone}`
      }
      const dateI = new Date(reqParams.dateInitial);
      const dateF = new Date(reqParams.dateFinal);
      const ocorrenceI = getOccorenceMonth(dateI, dateI.getDay());
      const ocorrenceF = getOccorenceMonth(dateF, dateF.getDay());
      newPosix += `,M${dateI.getMonth()}.${ocorrenceI}.${dateI.getDay()}/${reqParams.hourInitial}:00`
      newPosix += `,M${dateF.getMonth()}.${ocorrenceF}.${dateF.getDay()}/${reqParams.hourFinal}:00`
      ramCaches_TIMEZONES_updatePosixTimezone(areaId.toString(), newPosix);
      await sqldb.TIME_ZONES.setPosixTimezone({ POSIX: newPosix, ID: areaId });
    }
    await getDevicesOfUnitAndSetTimezone({timezoneIds: reqParams.areas}, session);
  } catch (err) {
    logger.error("Erro ao adicionar horario de verão.", err, reqParams, session.user);
    throw Error(`Erro ao adicionar horario de verão. ${err}`).HttpStatus(500);
  }
  return 'OK';
}

httpRouter.privateRoutes['/timezone/set-posix'] = setPosixRoute;

export async function getDevicesOfUnitAndSetTimezone(qPars: {timezoneIds: number[], unitId?: number }, session: SessionData) {
  const devices = await sqldb.CLUNITS.getListDevicesUnitsWithTimezone({ TIMEZONES_IDS: qPars.timezoneIds, UNIT_ID: qPars.unitId });
  let hasDam = false;
  let hasDri = false;
  for (const device of devices) {
    await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devCode: device.DEVICE_CODE });
    hasDam = hasDam || device.DEVICE_CODE.startsWith('DAM');
    hasDri = hasDri || device.DEVICE_CODE.startsWith('DRI');
  }

  // Update eco config because new timezone
  if (hasDam) {
    await damEcoEventHooks.ramCaches_DAMS_loadDamsEcoCfg();
  }
  if (hasDri) {
    await driAutomationEventHooks.ramCaches_DRIS_loadDrisCfg();
  }
}
import sqldb from '../../srcCommon/db';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import { sendDmaCommand } from '../../srcCommon/iotMessages/devsCommands';
import * as webSocketServer from '../apiServer/webSocketServer'
import * as WebSocket from 'ws'
import { API_External } from '../httpApiRouter';

export const setSamplingPeriod: API_External ['/dma/set-sampling-period'] = async function (reqParams, session) {
  if (!reqParams.dmaId) throw Error('There was an error!\nInvalid properties. Missing .dmaId.').HttpStatus(400);
  if (!reqParams.samplingPeriod) throw Error('There was an error!\nInvalid properties. Missing samplingPeriod.').HttpStatus(400);

  if (reqParams.dmaId.length !== 12) throw Error('Id do DMA inválido').HttpStatus(400);
  const dmaBasicInfo = await sqldb.DMAS_DEVICES.getBasicInfo({DEVICE_CODE: reqParams.dmaId});
  const perms = await getPermissionsOnUnit(session, dmaBasicInfo.CLIENT_ID, dmaBasicInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)
  
  if(webSocketServer.wss && webSocketServer.wss.clients){
    const list = [];
    for (const ws of webSocketServer.wss.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue
      if (ws.realTimeDMAs && ws.realTimeDMAs.includes(reqParams.dmaId)) { } // OK
      else continue
  
      list.push(ws)
    }

    if((list.length === 0 && reqParams.samplingPeriod === 900) || (list.length === 1 && reqParams.samplingPeriod === 10)) {
      sendDmaCommand(reqParams.dmaId, reqParams.samplingPeriod, session.user);
      return {msg: `COMMAND SENT - CURRENT SAMPLE PERIOD ${reqParams.samplingPeriod}`};
    }
  }

  return {msg: `CANNOT SEND COMMAND NOW - ANOTHER USER IN DMA REAL TIME SCREEN`};
}

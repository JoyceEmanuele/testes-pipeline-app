import * as webSocketServer from '../apiServer/webSocketServer';

export function sendStatusChange (devId: string, status: string) {
  const usersList = webSocketServer.getSubscribedUsers(devId);
  const devStatusMsg = {
    dev_id: devId,
    status: status,
  }
  for (const ws of usersList) {
    ws.send(JSON.stringify({ type: 'devOnlineStatus', data: devStatusMsg }))
  }
}

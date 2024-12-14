import sqldb from '../../srcCommon/db'
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import { logger } from '../../srcCommon/helpers/logger';
import { loadLastMessagesTimes } from '../../srcCommon/helpers/devsLastComm'
import { checkRoomSchedTurning } from '../../srcCommon/rooms/schedTurning';

export async function checkUpdateRoomsSchedSwitch () {
  // Rodar essa verificação quando o servidor for iniciado e quando houver mudança de dia
  try {
    // Pegar a lista de ROOMs com sched definida
    const roomsList = await sqldb.ROOMS.getRoomsList({});
    const lastComms = await loadLastMessagesTimes({});
    for (const roomRow of roomsList) {
      await checkRoomSchedTurning({ roomId: roomRow.ROOM_ID, userId: '[SCHED_TURN]', lastComms });
    }
  } catch (err) {
    logger.error(err);
    eventWarn.typedWarn('SCHED_TURN', String(err));
  }
}

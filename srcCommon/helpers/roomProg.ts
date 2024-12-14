import jsonTryParse from "./jsonTryParse"
import { logger } from "./logger"
import { FullProg_v4, checkFullProgV4 } from "./scheduleData"

export interface RoomSchedConfig {
  progs: {
    ON: FullProg_v4
    OFF: FullProg_v4
  }
  schedTurn: {
    numDays: number
    datRef: string // "YYYY-MM-DD"
    devs: {
      [devId: string]: ('ON'|'OFF')[]
    }
  }
}

export function parseRoomSchedConfig (ROOM_PROGS: string): RoomSchedConfig {
  return (ROOM_PROGS && jsonTryParse<RoomSchedConfig>(ROOM_PROGS)) || null;
}

export function checkRoomProgValid (roomProg: RoomSchedConfig): [string, number?] {
  if (!roomProg.progs) return ['No progs'];
  if (!roomProg.progs.ON) return ['No progs.ON'];
  if (!roomProg.progs.OFF) return ['No progs.OFF'];
  if (!roomProg.schedTurn) return ['No schedTurn'];
  if (!roomProg.schedTurn.numDays) return ['No schedTurn.numDays'];
  if (!roomProg.schedTurn.devs) return ['No schedTurn.devs'];
  if (!roomProg.schedTurn.datRef) return ['No schedTurn.datRef'];
  if (!new Date(roomProg.schedTurn.datRef + 'Z').getTime()) return ['Invalid schedTurn.datRef'];
  let numPeriods = -1;
  for (const [devId, periodsOrder] of Object.entries(roomProg.schedTurn.devs)) {
    if (!(periodsOrder instanceof Array)) return ['Invalid room prog [49]'];
    if (numPeriods < 0) numPeriods = periodsOrder.length;
    if (periodsOrder.length !== numPeriods) return ['Invalid room prog [51]'];
  }
  if (numPeriods === 0) return ['Invalid room prog [53]'];
  // Menor do que zero é permitido porque significa que a programação foi definida mas ainda não associou nenhum dispositivo ao ambiente
  try {
    roomProg.progs.ON = checkFullProgV4(roomProg.progs.ON);
    roomProg.progs.OFF = checkFullProgV4(roomProg.progs.OFF);
  } catch (err) {
    logger.error(err);
    return [String((err as Error))];
  }
  return [null, numPeriods];
}

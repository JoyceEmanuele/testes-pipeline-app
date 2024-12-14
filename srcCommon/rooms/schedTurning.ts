import sqldb from '../db'
import * as scheduleData from '../helpers/scheduleData'
import * as automationControl from '../helpers/automationControl'
import * as eventWarn from '../helpers/eventWarn'
import { today_shiftedYMD_s } from '../helpers/dates'
import { logger } from '../helpers/logger';
import { collectFullDutProg } from '../dut/dutSchedule'
import { RoomSchedConfig, checkRoomProgValid, parseRoomSchedConfig } from '../helpers/roomProg'
import { loadLastMessagesTimes } from '../helpers/devsLastComm'

type DevicesStatus = Awaited<ReturnType<typeof loadLastMessagesTimes>>;

export async function checkRoomSchedTurning(reqParams: {
  roomId: number,
  userId: string,
  lastComms: DevicesStatus|null,
}): Promise<boolean> {
  const { roomId, userId } = reqParams;
  try {
    const roomInf = await sqldb.ROOMS.getRoomInfo({ ROOM_ID: roomId });
    const roomProg = parseRoomSchedConfig(roomInf.ROOM_PROGS);
    if (!roomProg) return true;

    // Para cada um, conferir se tem os 2 scheds, se tem DUT associado, se os vetores estão preenchidos, e se todos têm o mesmo tamanho.
    const [progError, numPeriods] = checkRoomProgValid(roomProg);
    if (progError) {
      eventWarn.typedWarn('SCHED_TURN', progError);
      return false;
    }
    if (!(numPeriods > 0)) return true;
    if (Object.keys(roomProg.schedTurn.devs).length === 0) return true;

    // Identifica o index do período atual
    const today = new Date(today_shiftedYMD_s() + 'Z');
    const refDay = new Date(roomProg.schedTurn.datRef + 'Z');
    if (refDay > today) return true; // not yet started
    const diasPassados = Math.round((today.getTime()- refDay.getTime()) / 1000 / 60 / 60 / 24);
    const indexPeriodo = ((Math.floor(diasPassados/roomProg.schedTurn.numDays) % numPeriods) + numPeriods) % numPeriods;

    // Confere se os DUTs estão com a programação certa para o dia de hoje
    const dutsList = await sqldb.DUTS.getListInRoom({ ROOM_ID: roomId });
    const lastComms = reqParams.lastComms || await loadLastMessagesTimes({
      devIds: dutsList.map((dut) => dut.DUT_ID),
    });
    const devError = await checkUpdateDutsProg(roomProg, dutsList, indexPeriodo, userId, lastComms);
    if (devError) {
      if (devError.includes("didn't get prog update") && devError.endsWith("Device is OFFLINE.")) {
        // Nesse caso não gera alerta.
      } else {
        eventWarn.typedWarn('SCHED_TURN', `[${roomId}] ${devError}`);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error(err);
    if (err && err.errorCode === 'WAIT_DEV_TIMEOUT') { } // Ignorar se for DEV não respondeu
    else eventWarn.typedWarn('SCHED_TURN', err.toString());
    return false;
  }
}

type RoomDUT = {
  DUT_ID: string;
  LASTPROG: string;
  DISAB: number;
};

async function checkUpdateDutsProg (roomProg: RoomSchedConfig, dutsList: RoomDUT[], indexPeriodo: number, userId: string, lastComms: DevicesStatus): Promise<string> {
  // Busca a lista de DUTs que estão neste ROOM e confere se todos estão na lista de sched-switch
  for (const dut of dutsList) {
    if (!roomProg.schedTurn.devs[dut.DUT_ID]) { return "DUT without prog defined"; }
    if (dut.DISAB !== 0) { return "DUT with disabled automation"; }
  }

  // Compara a última programação informada pelo DUT com a programação desejada pelo sched da ROOM
  const prog_ON = roomProg.progs.ON;
  for (const dut of dutsList) {
    const expectedProg = roomProg.schedTurn.devs[dut.DUT_ID][indexPeriodo];
    switch (expectedProg) {
      case "OFF": continue; // check ON first
      case "ON": break; // OK, will check
      default: return "Invalid DUT expected prog";
    }
    const lastProg = scheduleData.parseFullProgV4(dut.LASTPROG);
    const commands = automationControl.adjustSchedule(prog_ON, lastProg, true, dut.DISAB);
    if (commands.length === 0) continue; // DUT has already the desired prog
    await automationControl.updateDesiredProgDUT(dut.DUT_ID, prog_ON, userId);
    await automationControl.sendDevSchedule(dut.DUT_ID, commands, userId, 'revezamento de programação');
  }
  // Garante que todos que deveriam estar com prog ON estão mesmo
  for (const dut of dutsList) {
    const currentProg = await collectFullDutProg({ devId: dut.DUT_ID, userId });
    const expectedProg = roomProg.schedTurn.devs[dut.DUT_ID][indexPeriodo];
    switch (expectedProg) {
      case "OFF": continue; // check ON first
      case "ON": break; // OK, will check
      default: return "Invalid DUT expected prog";
    }
    const commands = automationControl.adjustSchedule(prog_ON, currentProg, true, dut.DISAB);
    if (commands.length !== 0) {
      const onlineStatus = lastComms.connectionStatus(dut.DUT_ID);
      return `${dut.DUT_ID} didn't get prog update to ON. Device is ${onlineStatus}.`;
    }
  }

  // Só verifica os scheds de OFF depois de garantir que os dispositivos estão com o sched de ON
  const prog_OFF = roomProg.progs.OFF;
  for (const dut of dutsList) {
    const expectedProg = roomProg.schedTurn.devs[dut.DUT_ID][indexPeriodo];
    switch (expectedProg) {
      case "ON": continue; // already checked
      case "OFF": break; // OK, will check
      default: return "Invalid DUT expected prog";
    }
    const lastProg = scheduleData.parseFullProgV4(dut.LASTPROG);
    const commands = automationControl.adjustSchedule(prog_OFF, lastProg, true, dut.DISAB);
    if (commands.length === 0) continue; // DUT has already the desired prog
    await automationControl.updateDesiredProgDUT(dut.DUT_ID, prog_OFF, userId);
    await automationControl.sendDevSchedule(dut.DUT_ID, commands, userId, 'revezamento de programação');
  }
  // Garante que todos que deveriam estar com prog OFF estão mesmo
  for (const dut of dutsList) {
    const currentProg = await collectFullDutProg({ devId: dut.DUT_ID, userId });
    const expectedProg = roomProg.schedTurn.devs[dut.DUT_ID][indexPeriodo];
    switch (expectedProg) {
      case "ON": continue; // already checked
      case "OFF": break; // OK, will check
      default: return "Invalid DUT expected prog";
    }
    const commands = automationControl.adjustSchedule(prog_OFF, currentProg, true, dut.DISAB);
    if (commands.length !== 0) {
      const onlineStatus = lastComms.connectionStatus(dut.DUT_ID);
      return `${dut.DUT_ID} didn't get prog update to OFF. Device is ${onlineStatus}.`;
    }
  }

  return null;
}
